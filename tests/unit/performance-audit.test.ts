import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDashboardTelemetry } from "@/lib/dashboard/server";
import { getInvoices, getPayments, getSalesOrders, getQuotations, resetMemorySalesStore } from "@/lib/sales/server";
import {
  getExpenses,
  getAccounts,
  getJournalEntries,
  getProfitLossReport,
  getBalanceSheetReport,
  getCashFlowReport,
  getARAgingReport,
  getAPAgingReport,
  initializeCompanyChartOfAccounts,
  resetMemoryFinanceStore,
} from "@/lib/finance/server";
import { getCustomers, getLeads } from "@/lib/crm/server";
import { getCompanySettings } from "@/lib/company/server";

const { mockRequireUser, mockRequirePermission, mockRequireCompanyMembership } = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockRequireCompanyMembership: vi.fn(),
}));

vi.mock("@/lib/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/server")>();
  return {
    ...actual,
    requireUser: () => mockRequireUser(),
    requirePermission: (companyId: string, perm: string, user?: any) =>
      mockRequirePermission(companyId, perm, user),
    requireCompanyMembership: (companyId: string, user?: any) =>
      mockRequireCompanyMembership(companyId, user),
  };
});

const mockFrom = vi.fn();
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: "rpc mock" } });
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

vi.mock("@/lib/audit/server", () => ({
  recordAuditLog: vi.fn().mockResolvedValue({}),
}));

describe("Performance Diagnostic & Latency Audit", () => {
  const companyId = "00000000-0000-0000-0000-000000000001";
  const user = {
    id: "user-bench-99",
    email: "bench@test.local",
    full_name: "Bench Marker",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    resetMemorySalesStore();
    resetMemoryFinanceStore();
    mockRequireUser.mockResolvedValue(user);
    mockRequirePermission.mockResolvedValue({
      membership: { id: "m1", company_id: companyId, user_id: user.id },
      role: { id: "r1", name: "Admin", code: "admin" },
      company: { id: companyId, name: "IT-HUB Benchmark Corp" },
      permissions: ["*"],
    });
    mockRequireCompanyMembership.mockResolvedValue({
      membership: { id: "m1", company_id: companyId, user_id: user.id },
      role: { id: "r1", name: "Admin", code: "admin" },
      company: { id: companyId, name: "IT-HUB Benchmark Corp" },
      permissions: ["*"],
    });
  });

  it("measures chart of accounts initialization and deduplication", async () => {
    const t0 = performance.now();
    const accounts1 = await initializeCompanyChartOfAccounts(companyId);
    const d0 = performance.now() - t0;

    const t1 = performance.now();
    const accounts2 = await initializeCompanyChartOfAccounts(companyId);
    const d1 = performance.now() - t1;

    console.log(`[PERF AUDIT] initializeCompanyChartOfAccounts (first call): ${d0.toFixed(3)}ms`);
    console.log(`[PERF AUDIT] initializeCompanyChartOfAccounts (second call): ${d1.toFixed(3)}ms`);
    expect(accounts1.length).toBeGreaterThanOrEqual(18);
    expect(accounts2.length).toBeGreaterThanOrEqual(18);
  });

  it("measures full financial statement generation pipeline (8 parallel reports)", async () => {
    const t0 = performance.now();
    const [expenses, accounts, entries, pl, bs, cf, ar, ap] = await Promise.all([
      getExpenses(companyId),
      getAccounts(companyId),
      getJournalEntries(companyId),
      getProfitLossReport(companyId, {}),
      getBalanceSheetReport(companyId),
      getCashFlowReport(companyId, {}),
      getARAgingReport(companyId),
      getAPAgingReport(companyId),
    ]);
    const d0 = performance.now() - t0;

    console.log(`[PERF AUDIT] Full 8-report financial suite latency: ${d0.toFixed(3)}ms`);
    expect(expenses).toBeDefined();
    expect(accounts.length).toBeGreaterThanOrEqual(18);
    expect(pl).toBeDefined();
    expect(bs).toBeDefined();
    expect(d0).toBeLessThan(150);
  });

  it("measures commercial sales and invoicing pipeline latency", async () => {
    const t0 = performance.now();
    const [invoices, orders, quotations, payments] = await Promise.all([
      getInvoices(companyId, { limit: 25 }),
      getSalesOrders(companyId),
      getQuotations(companyId),
      getPayments(companyId),
    ]);
    const d0 = performance.now() - t0;

    console.log(`[PERF AUDIT] Sales 4-stream pipeline latency: ${d0.toFixed(3)}ms`);
    expect(invoices).toBeDefined();
    expect(orders).toBeDefined();
    expect(d0).toBeLessThan(100);
  });

  it("measures CRM accounts and leads pipeline latency", async () => {
    const t0 = performance.now();
    const [customers, leads] = await Promise.all([
      getCustomers(companyId, { page: 1, pageSize: 25 }),
      getLeads(companyId),
    ]);
    const d0 = performance.now() - t0;

    console.log(`[PERF AUDIT] CRM 2-stream pipeline latency: ${d0.toFixed(3)}ms`);
    expect(customers.data).toBeDefined();
    expect(leads.leads).toBeDefined();
    expect(d0).toBeLessThan(50);
  });
});
