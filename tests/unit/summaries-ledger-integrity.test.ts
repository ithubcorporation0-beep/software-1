import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCompanySummary,
  updateCompanySummaryIncremental,
  rebuildCompanySummaries,
  resetCompanySummaries,
} from "@/lib/summaries/company-summaries";
import {
  getCachedCompanyData,
  revalidateCompanyTag,
  clearAllTestCaches,
} from "@/lib/cache/tagged-cache";
import { resetMemorySalesStore, createInvoice, recordPayment } from "@/lib/sales/server";
import { resetMemoryFinanceStore, createExpense } from "@/lib/finance/server";
import { resetMemoryCRMStore, createCustomer } from "@/lib/crm/server";
import type { Profile } from "@/types/database.types";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "fallback" } }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "fallback" } }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));

describe("Pre-calculated Summaries & Tagged Cache Multi-Tenant Integrity", () => {
  const companyA = "tenant-a-111111";
  const companyB = "tenant-b-222222";

  const adminA: Profile = {
    id: "admin-user-a",
    email: "admin@companya.com",
    full_name: "Admin Company A",
    is_super_admin: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const adminB: Profile = {
    id: "admin-user-b",
    email: "admin@companyb.com",
    full_name: "Admin Company B",
    is_super_admin: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetCompanySummaries();
    clearAllTestCaches();
    resetMemorySalesStore();
    resetMemoryFinanceStore();
    resetMemoryCRMStore();
  });

  it("should initialize default zero summary if no data exists", async () => {
    const summary = await getCompanySummary(companyA);
    expect(summary.companyId).toBe(companyA);
    expect(summary.revenueTotal).toBe(0);
    expect(summary.expensesTotal).toBe(0);
    expect(summary.netMargin).toBe(0);
    expect(summary.outstandingTotal).toBe(0);
    expect(summary.paidInvoicesTotal).toBe(0);
    expect(summary.activeCustomersCount).toBe(0);
    expect(typeof summary.lastUpdatedAt).toBe("string");
  });

  it("should incrementally update summary metrics with decimal-safe arithmetic", async () => {
    await updateCompanySummaryIncremental(companyA, {
      revenueDelta: 1500.5,
      outstandingDelta: 1500.5,
      activeCustomersDelta: 2,
    });

    let summary = await getCompanySummary(companyA);
    expect(summary.revenueTotal).toBe(1500.5);
    expect(summary.outstandingTotal).toBe(1500.5);
    expect(summary.activeCustomersCount).toBe(2);
    expect(summary.netMargin).toBe(1500.5);

    // Apply expense
    await updateCompanySummaryIncremental(companyA, {
      expensesDelta: 400.25,
    });

    summary = await getCompanySummary(companyA);
    expect(summary.expensesTotal).toBe(400.25);
    expect(summary.netMargin).toBe(1100.25);

    // Record partial payment
    await updateCompanySummaryIncremental(companyA, {
      outstandingDelta: -500.5,
    });

    summary = await getCompanySummary(companyA);
    expect(summary.outstandingTotal).toBe(1000.0);
  });

  it("strictly guarantees multi-tenant isolation: Company A mutations never affect Company B", async () => {
    await updateCompanySummaryIncremental(companyA, {
      revenueDelta: 50000,
      expensesDelta: 12000,
      activeCustomersDelta: 10,
    });

    const summaryA = await getCompanySummary(companyA);
    const summaryB = await getCompanySummary(companyB);

    expect(summaryA.revenueTotal).toBe(50000);
    expect(summaryA.expensesTotal).toBe(12000);
    expect(summaryA.activeCustomersCount).toBe(10);
    expect(summaryA.netMargin).toBe(38000);

    // Company B must remain untouched at 0
    expect(summaryB.revenueTotal).toBe(0);
    expect(summaryB.expensesTotal).toBe(0);
    expect(summaryB.activeCustomersCount).toBe(0);
    expect(summaryB.netMargin).toBe(0);
  });

  it("rebuildCompanySummaries reconciles summary perfectly with actual transactions", async () => {
    // 1. Create customers for company A and B
    await createCustomer(
      companyA,
      {
        name: "Acme Corp",
        email: "contact@acme.com",
        phone: "+92 300 1234567",
        status: "Active",
      },
      adminA
    );

    // 2. Create invoice for company A
    await createInvoice(
      companyA,
      {
        customerId: "cust-1",
        issueDate: "2026-10-15",
        dueDate: "2026-10-30",
        items: [
          {
            description: "Consulting Services",
            quantity: 10,
            unitPrice: 1000,
          },
        ],
      },
      adminA
    );

    // 3. Create expense for company A
    await createExpense(
      companyA,
      {
        category: "Software",
        amount: 2500,
        date: "2026-10-15",
        vendor: "Vercel Inc",
        paymentMethod: "Credit Card",
        description: "Cloud hosting subscription",
        approvalStatus: "Submitted",
      },
      adminA
    );

    // Rebuild summaries from real records
    const reconciled = await rebuildCompanySummaries(companyA);
    expect(reconciled.companyId).toBe(companyA);
    expect(reconciled.revenueTotal).toBe(10000);
    expect(reconciled.expensesTotal).toBe(2500);
    expect(reconciled.netMargin).toBe(7500);
    expect(reconciled.outstandingTotal).toBe(10000);
    expect(reconciled.activeCustomersCount).toBe(1);

    // Verify Company B remains isolated
    const summaryB = await getCompanySummary(companyB);
    expect(summaryB.revenueTotal).toBe(0);
    expect(summaryB.expensesTotal).toBe(0);
  });

  it("tagged cache invalidates only the specific tenant namespace", async () => {
    let callCountA = 0;
    let callCountB = 0;

    const fetchA = async () => {
      callCountA++;
      return { config: "tenantA-v1" };
    };

    const fetchB = async () => {
      callCountB++;
      return { config: "tenantB-v1" };
    };

    // First calls populate cache
    const resA1 = await getCachedCompanyData(companyA, "settings", fetchA);
    const resB1 = await getCachedCompanyData(companyB, "settings", fetchB);
    expect(resA1.config).toBe("tenantA-v1");
    expect(resB1.config).toBe("tenantB-v1");
    expect(callCountA).toBe(1);
    expect(callCountB).toBe(1);

    // Subsequent calls read from cache
    await getCachedCompanyData(companyA, "settings", fetchA);
    await getCachedCompanyData(companyB, "settings", fetchB);
    expect(callCountA).toBe(1);
    expect(callCountB).toBe(1);

    // Invalidate company A only
    await revalidateCompanyTag(companyA, "settings");

    // Company A should re-fetch; Company B must stay cached!
    await getCachedCompanyData(companyA, "settings", fetchA);
    expect(callCountA).toBe(2);

    await getCachedCompanyData(companyB, "settings", fetchB);
    expect(callCountB).toBe(1); // Still cached!
  });
});
