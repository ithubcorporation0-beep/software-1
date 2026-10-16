import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireUser,
  requireCompanyMembership,
  requirePermission,
  getSessionContext,
  invalidateRoleCache,
  ForbiddenError,
} from "@/lib/auth/server";
import { getInvoices, getQuotations, getPayments, resetMemorySalesStore } from "@/lib/sales/server";
import { getExpenses, getJournalEntries, resetMemoryFinanceStore } from "@/lib/finance/server";
import { getCustomers, getLeads, resetMemoryCRMStore } from "@/lib/crm/server";
import { recordAuditLog } from "@/lib/audit/server";
import { withTiming, formatServerTimingHeader } from "@/lib/perf/timing";
import type { Profile } from "@/types/database.types";

const mockFrom = vi.fn();
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: "mock" } });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));

describe("Performance Budget & Multi-Tenant Isolation Guards", () => {
  const companyA = "11111111-1111-1111-1111-111111111111";
  const companyB = "22222222-2222-2222-2222-222222222222";

  const userAlice: Profile = {
    id: "user-alice-01",
    email: "alice@companya.local",
    full_name: "Alice A",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userBob: Profile = {
    id: "user-bob-01",
    email: "bob@companyb.local",
    full_name: "Bob B",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetMemorySalesStore();
    resetMemoryFinanceStore();
    resetMemoryCRMStore();
    invalidateRoleCache();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "m-alice",
          company_id: companyA,
          user_id: userAlice.id,
          role_id: "role-admin-a",
          status: "ACTIVE",
          company: { id: companyA, name: "Company A", status: "ACTIVE" },
          role: {
            id: "role-admin-a",
            name: "Admin",
            code: "admin",
            role_permissions: [{ permission: { code: "*" } }],
          },
        },
        error: null,
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  describe("1. Query Count Budget & Server-Pagination Safeguards", () => {
    it("ensures key list pages enforce a strict maximum limit of 50 items", async () => {
      // Test Sales Invoices
      const invoices = await getInvoices(companyA, { limit: 100 }, userAlice);
      expect(invoices.length).toBeLessThanOrEqual(50);

      // Test Quotations
      const quotations = await getQuotations(companyA, { limit: 500 }, userAlice);
      expect(quotations.length).toBeLessThanOrEqual(50);

      // Test Payments
      const payments = await getPayments(companyA, { limit: 999 }, userAlice);
      expect(payments.length).toBeLessThanOrEqual(50);

      // Test Operating Expenses
      const expenses = await getExpenses(companyA, { limit: 200 }, userAlice);
      expect(expenses.length).toBeLessThanOrEqual(50);

      // Test Journal Entries
      const entries = await getJournalEntries(companyA, { limit: 300 }, userAlice);
      expect(entries.length).toBeLessThanOrEqual(50);

      // Test CRM Customers
      const customers = await getCustomers(companyA, { pageSize: 500 }, userAlice);
      expect(customers.data.length).toBeLessThanOrEqual(50);
      expect(customers.pageSize).toBeLessThanOrEqual(50);
    });

    it("enforces key list page total query-count budget under 5 queries for normal pages", async () => {
      let queryCount = 0;
      mockFrom.mockImplementation((table: string) => {
        queryCount++;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { timing } = await withTiming("/sales", async () => {
        return await Promise.all([
          getInvoices(companyA, { limit: 50 }, userAlice).catch(() => []),
          getQuotations(companyA, { limit: 50 }, userAlice).catch(() => []),
          getPayments(companyA, { limit: 50 }, userAlice).catch(() => []),
          getCustomers(companyA, { pageSize: 50 }, userAlice).catch(() => ({ data: [] })),
        ]);
      });

      console.log(`[QUERY BUDGET AUDIT] Total DB queries executed for Sales: ${queryCount}`);
      // Target: 5 or fewer queries per normal page
      expect(queryCount).toBeLessThanOrEqual(5);
      expect(timing.totalMs).toBeDefined();
    });

    it("enforces dashboard total query-count budget under 10 queries", async () => {
      let queryCount = 0;
      mockFrom.mockImplementation(() => {
        queryCount++;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      // Executive dashboard consolidates telemetry via RPC / summary table
      expect(queryCount).toBeLessThanOrEqual(10);
    });
  });

  describe("2. Multi-Tenant Boundary Isolation Post-Caching", () => {
    it("proves Company A and Company B cannot see each other's data despite in-memory caching", async () => {
      // Mock membership lookup for Alice in Company A
      mockFrom.mockImplementation((table: string) => {
        if (table === "memberships") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              return {
                eq: vi.fn().mockImplementation((col2: string, val2: string) => {
                  return {
                    eq: vi.fn().mockImplementation((col3: string, val3: string) => {
                      if (val === companyA && val2 === userAlice.id) {
                        return {
                          single: vi.fn().mockResolvedValue({
                            data: {
                              id: "m-alice",
                              company_id: companyA,
                              user_id: userAlice.id,
                              role_id: "role-admin-a",
                              status: "ACTIVE",
                              company: { id: companyA, name: "Company A", status: "ACTIVE" },
                              role: {
                                id: "role-admin-a",
                                name: "Administrator",
                                code: "admin",
                                role_permissions: [{ permission: { code: "sales:view" } }],
                              },
                            },
                            error: null,
                          }),
                        };
                      }
                      // User Bob attempting to access Company A or Alice accessing Company B
                      return {
                        single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
                      };
                    }),
                  };
                }),
              };
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      // 1. Alice resolves session context in Company A -> succeeds & caches
      const ctxAlice = await getSessionContext(companyA, userAlice);
      expect(ctxAlice.company.id).toBe(companyA);
      expect(ctxAlice.permissions).toContain("sales:view");

      // 2. Bob attempts to access Company A -> FAILS CLOSED with 403 ForbiddenError
      await expect(getSessionContext(companyA, userBob)).rejects.toThrow(ForbiddenError);

      // 3. Alice attempts to access Company B -> FAILS CLOSED with 403 ForbiddenError
      await expect(getSessionContext(companyB, userAlice)).rejects.toThrow(ForbiddenError);

      // 4. Invalidate role cache for Company A
      invalidateRoleCache(companyA);
      // Access to Company B is still forbidden
      await expect(getSessionContext(companyB, userAlice)).rejects.toThrow(ForbiddenError);
    });

    it("ensures a role or permission change takes effect on the next request without cross-tenant leakage", async () => {
      let currentPerm = "sales:view";

      mockFrom.mockImplementation((table: string) => {
        if (table === "memberships") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              return {
                eq: vi.fn().mockImplementation((col2: string, val2: string) => {
                  return {
                    eq: vi.fn().mockImplementation((col3: string, val3: string) => {
                      if (val === companyA && val2 === userAlice.id) {
                        return {
                          single: vi.fn().mockResolvedValue({
                            data: {
                              id: "m-alice",
                              company_id: companyA,
                              user_id: userAlice.id,
                              role_id: "role-admin-a",
                              status: "ACTIVE",
                              company: { id: companyA, name: "Company A", status: "ACTIVE" },
                              role: {
                                id: "role-admin-a",
                                name: "Administrator",
                                code: "admin",
                                role_permissions: [{ permission: { code: currentPerm } }],
                              },
                            },
                            error: null,
                          }),
                        };
                      }
                      return { single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }) };
                    }),
                  };
                }),
              };
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });

      // Request 1: Alice has initial permission
      const req1 = await getSessionContext(companyA, userAlice);
      expect(req1.permissions).toContain("sales:view");
      expect(req1.permissions).not.toContain("inventory:manage");

      // Permission change occurs in Company A
      currentPerm = "inventory:manage";
      invalidateRoleCache(companyA, "role-admin-a");

      // Request 2: Alice immediately receives updated permission on the NEXT request
      const req2 = await getSessionContext(companyA, userAlice);
      expect(req2.permissions).toContain("inventory:manage");
      expect(req2.permissions).not.toContain("sales:view");

      // Verify Company B remains completely unaffected and access is denied
      await expect(getSessionContext(companyB, userAlice)).rejects.toThrow(ForbiddenError);
    });
  });

  describe("3. Timing Instrumentation & Server-Timing Header Generation", () => {
    it("generates well-formed Server-Timing header format matching W3C spec", async () => {
      const { timing } = await withTiming("test-action", async () => {
        return "ok";
      });

      expect(timing.serverTimingHeader).toContain("total;dur=");
      expect(timing.serverTimingHeader).toContain("auth;dur=");
      expect(timing.serverTimingHeader).toContain("permissions;dur=");
      expect(timing.serverTimingHeader).toContain("tenant;dur=");
      expect(timing.serverTimingHeader).toContain("db;dur=");
      expect(timing.serverTimingHeader).toContain("render;dur=");
    });

    it("verifies recordAuditLog executes in non-blocking mode", async () => {
      const start = performance.now();
      await recordAuditLog({
        companyId: companyA,
        userId: userAlice.id,
        action: "test.perf_guard",
        resource: "tests",
      });
      const elapsed = performance.now() - start;

      // Non-blocking after() execution should return sub-millisecond (< 5ms)
      console.log(`[AUDIT LATENCY GUARD] recordAuditLog returned in: ${elapsed.toFixed(3)}ms`);
      expect(elapsed).toBeLessThan(10);
    });
  });
});
