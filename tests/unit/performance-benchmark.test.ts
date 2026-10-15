import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDashboardTelemetry } from "@/lib/dashboard/server";
import { getInvoices, getPayments, createInvoice, recordPayment } from "@/lib/sales/server";
import { getExpenses, createExpense } from "@/lib/finance/server";
import { requireCompanyMembership } from "@/lib/auth/server";
import { resetMemorySalesStore } from "@/lib/sales/server";
import { resetMemoryFinanceStore } from "@/lib/finance/server";

import { getSuperAdminMetrics } from "@/lib/super-admin/server";
import { syncSystemNotifications, getUserNotifications } from "@/lib/notifications/server";
import { clearAllTestCaches } from "@/lib/cache/tagged-cache";
import { resetCompanySummaries } from "@/lib/summaries/company-summaries";

const { mockRequireUser, mockRequirePermission, mockRequireCompanyMembership, mockRequireSuperAdmin } = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockRequireCompanyMembership: vi.fn(),
  mockRequireSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/server")>();
  return {
    ...actual,
    requireUser: () => mockRequireUser(),
    requireSuperAdmin: () => mockRequireSuperAdmin(),
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

describe("Phase 1: Performance Diagnostics & Latency Baseline", () => {
  const companyId = "00000000-0000-0000-0000-000000000001";
  const user = {
    id: "user-benchmark-01",
    email: "bench@ithub.test",
    full_name: "Bench Marker",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    clearAllTestCaches();
    resetCompanySummaries();
    resetMemorySalesStore();
    resetMemoryFinanceStore();
    mockRpc.mockResolvedValue({ data: null, error: { message: "rpc fallback" } });
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

  it("measures dashboard telemetry baseline with multi-entity processing", async () => {
    // Seed 30 invoices and expenses to simulate realistic tenant state
    for (let i = 1; i <= 30; i++) {
      await createInvoice(
        companyId,
        {
          customerId: `cust-${i % 5}`,
          issueDate: "2026-10-01",
          dueDate: "2026-10-31",
          items: [
            { description: `Item A${i}`, quantity: 2, unitPrice: 500, discountPct: 0, taxPct: 0 },
            { description: `Item B${i}`, quantity: 1, unitPrice: 1000, discountPct: 5, taxPct: 10 },
          ],
        },
        user
      );
      await createExpense(
        companyId,
        {
          category: "Utilities",
          amount: 250,
          date: "2026-10-02",
          vendor: `Vendor ${i}`,
          paymentMethod: "Bank Transfer",
          description: `Operational expense ${i}`,
        },
        user
      );
    }

    const start = performance.now();
    const telemetry = await getDashboardTelemetry(companyId);
    const durationMs = performance.now() - start;

    expect(telemetry.company.id).toBe(companyId);
    expect(telemetry.metrics.revenue).toBeDefined();
    expect(telemetry.metrics.expenses).toBeDefined();
    expect(telemetry.recentInvoices.length).toBeLessThanOrEqual(5);

    console.log(`[BASELINE FALLBACK BENCHMARK] getDashboardTelemetry took: ${durationMs.toFixed(2)}ms for 30 invoices/expenses`);
    expect(durationMs).toBeGreaterThanOrEqual(0);
  });

  it("measures ultra-fast consolidated atomic RPC telemetry path", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        metrics: {
          memberCount: 8,
          auditCount: 142,
          customerCount: 35,
          revenueTotal: 750000,
          outstandingTotal: 125000,
          expensesTotal: 180000,
          activeProjectsCount: 12,
          pendingTasksCount: 28,
          lowStockCount: 3,
        },
        recentInvoices: [
          { id: "inv-1", invoice_number: "INV-1001", grand_total: 50000, status: "Sent" },
        ],
        recentAudits: [
          { id: "aud-1", action: "auth.login", created_at: new Date().toISOString() },
        ],
      },
      error: null,
    });

    const start = performance.now();
    const telemetry = await getDashboardTelemetry(companyId);
    const durationMs = performance.now() - start;

    expect(telemetry.metrics.revenue.value).toContain("750,000.00");
    expect(telemetry.metrics.expenses.value).toContain("180,000.00");
    expect(telemetry.metrics.profit.value).toContain("570,000.00");
    expect(telemetry.metrics.customers.value).toBe(35);
    expect(telemetry.metrics.employees.value).toBe(8);

    console.log(`[OPTIMIZED ATOMIC RPC BENCHMARK] getDashboardTelemetry took: ${durationMs.toFixed(2)}ms (< 5ms target)`);
    expect(durationMs).toBeLessThan(100);
  });

  it("measures ultra-fast consolidated atomic Super Admin RPC metrics path", async () => {
    mockRequireSuperAdmin.mockResolvedValue({
      id: "super-user-01",
      email: "super@ithub.test",
      is_super_admin: true,
    });

    mockRpc.mockResolvedValueOnce({
      data: {
        totalCompanies: 24,
        pendingApprovals: 3,
        activeCompanies: 19,
        suspendedCompanies: 1,
        rejectedCompanies: 1,
        totalUsers: 148,
        recentlyActiveUsers: 92,
        pendingRequests: [{ id: "comp-p1", name: "Pending Corp", status: "PENDING" }],
        recentAuditLogs: [{ id: "aud-p1", action: "super_admin.approve" }],
      },
      error: null,
    });

    const start = performance.now();
    const metrics = await getSuperAdminMetrics();
    const durationMs = performance.now() - start;

    expect(metrics.totalCompanies).toBe(24);
    expect(metrics.pendingApprovals).toBe(3);
    expect(metrics.activeCompanies).toBe(19);
    expect(metrics.totalUsers).toBe(148);
    expect(metrics.recentlyActiveUsers).toBe(92);

    console.log(`[OPTIMIZED SUPER ADMIN ATOMIC RPC BENCHMARK] getSuperAdminMetrics took: ${durationMs.toFixed(2)}ms (< 5ms target)`);
    expect(durationMs).toBeLessThan(100);
  });

  it("verifies notification scanner 15-minute throttle eliminates redundant table scans", async () => {
    // First call may scan
    const firstRun = await syncSystemNotifications(companyId, { force: true });
    expect(firstRun).toBeGreaterThanOrEqual(0);

    // Second immediate call MUST be throttled (returns 0 in < 1ms without querying any module)
    const start = performance.now();
    const secondRun = await syncSystemNotifications(companyId);
    const durationMs = performance.now() - start;

    expect(secondRun).toBe(0);
    console.log(`[NOTIFICATION THROTTLE BENCHMARK] Second sync took: ${durationMs.toFixed(3)}ms (0ms throttled)`);
    expect(durationMs).toBeLessThan(5);
  });
});

