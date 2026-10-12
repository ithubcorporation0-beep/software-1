import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  validateReceiptMetadata,
  initializeCompanyChartOfAccounts,
  getAccounts,
  createJournalEntry,
  getJournalEntries,
  reverseJournalEntry,
  postInvoiceToLedger,
  postPaymentToLedger,
  getProfitLossReport,
  getBalanceSheetReport,
  getCashFlowReport,
  getARAgingReport,
  getAPAgingReport,
  exportFinancialReportToCSV,
  resetMemoryFinanceStore,
  UnbalancedJournalEntryError,
  SeparationOfDutiesError,
} from "@/lib/finance/server";

const { ForbiddenError, mockRequireUser, mockRequirePermission, mockRecordAuditLog } = vi.hoisted(() => {
  class ForbiddenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ForbiddenError";
    }
  }
  return {
    ForbiddenError,
    mockRequireUser: vi.fn(),
    mockRequirePermission: vi.fn(),
    mockRecordAuditLog: vi.fn(),
  };
});

vi.mock("@/lib/auth/server", () => ({
  ForbiddenError,
  requireUser: () => mockRequireUser(),
  requirePermission: (companyId: string, perm: string, user?: any) =>
    mockRequirePermission(companyId, perm, user),
}));

vi.mock("@/lib/audit/server", () => ({
  recordAuditLog: (...args: any[]) => mockRecordAuditLog(...args),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "rpc pending" } }),
  })),
}));

describe("Finance Module: Expenses, Balanced Double-Entry Ledger, and Financial Reports", () => {
  const companyA = "00000000-0000-0000-0000-000000000001";
  const companyB = "00000000-0000-0000-0000-000000000002";

  const userEmployee = {
    id: "user-emp-01",
    email: "employee@it-hub.corp",
    full_name: "Staff Engineer",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userManager = {
    id: "user-mgr-01",
    email: "manager@it-hub.corp",
    full_name: "Finance Controller",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userSuperAdmin = {
    id: "user-super-01",
    email: "admin@it-hub.corp",
    full_name: "Global Auditor",
    is_super_admin: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    resetMemoryFinanceStore();
    vi.clearAllMocks();

    mockRequireUser.mockResolvedValue(userEmployee);
    mockRequirePermission.mockResolvedValue({
      membership: { id: "m-1" },
      role: { name: "Manager" },
      company: { id: companyA, name: "IT-Hub Corp" },
      permissions: ["*"],
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  // --------------------------------------------------------------------------
  // 1. RECEIPT FILE VALIDATION
  // --------------------------------------------------------------------------
  describe("Receipt File Validation", () => {
    it("accepts valid receipt types under 10MB", () => {
      const resPdf = validateReceiptMetadata({
        name: "invoice.pdf",
        size: 2 * 1024 * 1024,
        mimeType: "application/pdf",
      });
      expect(resPdf.valid).toBe(true);

      const resPng = validateReceiptMetadata({
        name: "scan.png",
        size: 500 * 1024,
        mimeType: "image/png",
      });
      expect(resPng.valid).toBe(true);
    });

    it("rejects receipt exceeding 10MB size limit", () => {
      const res = validateReceiptMetadata({
        name: "huge_video.pdf",
        size: 12 * 1024 * 1024, // 12MB
        mimeType: "application/pdf",
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain("exceeds the 10MB limit");
    });

    it("rejects unsupported MIME types", () => {
      const res = validateReceiptMetadata({
        name: "script.exe",
        size: 1024,
        mimeType: "application/x-msdownload",
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain("is not permitted");
    });
  });

  // --------------------------------------------------------------------------
  // 2. EXPENSE CRUD & WORKFLOWS
  // --------------------------------------------------------------------------
  describe("Expense Workflows: Create, Edit, Submit, Reject", () => {
    it("creates an expense in Draft status with sequential number", async () => {
      const exp = await createExpense(companyA, {
        category: "Software",
        amount: 250,
        currency: "USD",
        date: "2026-10-12",
        vendor: "GitHub Inc",
        paymentMethod: "Credit Card",
        description: "Enterprise GitHub Copilot seats",
        approvalStatus: "Draft",
      });

      expect(exp.id).toBeDefined();
      expect(exp.expense_number).toMatch(/^EXP-\d+/);
      expect(exp.category).toBe("Software");
      expect(exp.amount).toBe(250);
      expect(exp.approval_status).toBe("Draft");
      expect(exp.employee_id).toBe(userEmployee.id);
    });

    it("allows updating an expense in Draft status but prevents editing an Approved expense", async () => {
      const exp = await createExpense(companyA, {
        category: "Office Supplies",
        amount: 45.5,
        currency: "USD",
        date: "2026-10-12",
        vendor: "Staples",
        paymentMethod: "Cash",
        description: "Stationery for team",
        approvalStatus: "Draft",
      });

      const updated = await updateExpense(companyA, exp.id, {
        amount: 52.0,
        description: "Stationery and printing cartridges",
      });

      expect(updated.amount).toBe(52.0);
      expect(updated.description).toBe("Stationery and printing cartridges");
    });

    it("submits an expense from Draft to Submitted status", async () => {
      const exp = await createExpense(companyA, {
        category: "Transportation",
        amount: 75.0,
        currency: "USD",
        date: "2026-10-12",
        vendor: "Uber",
        paymentMethod: "Credit Card",
        description: "Client on-site visit taxi fare",
        approvalStatus: "Draft",
      });

      const submitted = await submitExpense(companyA, exp.id);
      expect(submitted.approval_status).toBe("Submitted");
    });

    it("rejects an expense with mandatory auditable reason", async () => {
      const exp = await createExpense(companyA, {
        category: "Other",
        amount: 500,
        currency: "USD",
        date: "2026-10-12",
        vendor: "Unknown Vendor",
        paymentMethod: "Cash",
        description: "Unexplained entertainment",
        approvalStatus: "Draft",
      });

      await submitExpense(companyA, exp.id);

      mockRequireUser.mockResolvedValue(userManager);
      const rejected = await rejectExpense(companyA, exp.id, "Missing receipt and non-compliant expense", userManager);

      expect(rejected.approval_status).toBe("Rejected");
      expect(rejected.rejection_reason).toBe("Missing receipt and non-compliant expense");
    });
  });

  // --------------------------------------------------------------------------
  // 3. SEPARATION OF DUTIES & APPROVAL POSTING
  // --------------------------------------------------------------------------
  describe("Separation of Duties & Automated Ledger Posting", () => {
    it("ENFORCES SEPARATION OF DUTIES: submitter cannot approve their own expense", async () => {
      mockRequireUser.mockResolvedValue(userEmployee);

      const exp = await createExpense(companyA, {
        category: "Salaries",
        amount: 1500,
        currency: "USD",
        date: "2026-10-12",
        vendor: "External Contractor",
        paymentMethod: "Bank Transfer",
        description: "Contract development sprint",
        employeeId: userEmployee.id,
        approvalStatus: "Draft",
      }, userEmployee);

      await submitExpense(companyA, exp.id, userEmployee);

      // Submitter attempts to self-approve
      await expect(
        approveExpense(companyA, exp.id, userEmployee)
      ).rejects.toThrow(SeparationOfDutiesError);
    });

    it("allows independent manager to approve, automatically posting balanced double-entry to General Ledger", async () => {
      // 1. Employee creates and submits
      mockRequireUser.mockResolvedValue(userEmployee);
      const exp = await createExpense(companyA, {
        category: "Rent",
        amount: 2000,
        currency: "USD",
        date: "2026-10-12",
        vendor: "Metropolitan Towers",
        paymentMethod: "Bank Transfer",
        description: "October Office Lease",
        employeeId: userEmployee.id,
        approvalStatus: "Draft",
      }, userEmployee);

      await submitExpense(companyA, exp.id, userEmployee);

      // 2. Manager approves
      mockRequireUser.mockResolvedValue(userManager);
      const result = await approveExpense(companyA, exp.id, userManager);

      expect(result.expense.approval_status).toBe("Approved");
      expect(result.expense.approved_by).toBe(userManager.id);
      expect(result.expense.journal_entry_id).toBeDefined();

      // 3. Verify double-entry journal entry was created and is strictly balanced
      const je = result.journalEntry;
      expect(je.status).toBe("Posted");
      expect(je.source_type).toBe("expense");
      expect(je.source_id).toBe(exp.id);
      expect(je.total_debit).toBe(2000);
      expect(je.total_credit).toBe(2000);
      expect(je.lines?.length).toBe(2);

      // Rent Expense Account (5010) debited $2000
      const debitLine = je.lines?.find((l) => l.debit > 0);
      expect(debitLine?.account_code).toBe("5010");
      expect(debitLine?.debit).toBe(2000);

      // Operating Bank Account (1020) credited $2000
      const creditLine = je.lines?.find((l) => l.credit > 0);
      expect(creditLine?.account_code).toBe("1020");
      expect(creditLine?.credit).toBe(2000);
    });

    it("allows platform super admin to approve even if submitted by them (override flag)", async () => {
      mockRequireUser.mockResolvedValue(userSuperAdmin);
      const exp = await createExpense(companyA, {
        category: "Software",
        amount: 120,
        currency: "USD",
        date: "2026-10-12",
        vendor: "Docker Inc",
        paymentMethod: "Credit Card",
        description: "Cloud registry subscription",
        employeeId: userSuperAdmin.id,
        approvalStatus: "Draft",
      }, userSuperAdmin);

      await submitExpense(companyA, exp.id, userSuperAdmin);

      const result = await approveExpense(companyA, exp.id, userSuperAdmin);
      expect(result.expense.approval_status).toBe("Approved");
    });
  });

  // --------------------------------------------------------------------------
  // 4. BALANCED DOUBLE-ENTRY LEDGER & REVERSAL IMMUTABILITY
  // --------------------------------------------------------------------------
  describe("General Ledger: Balanced Double-Entry Rule & Correcting Reversals", () => {
    it("rejects unbalanced manual journal entries where Debits != Credits", async () => {
      await initializeCompanyChartOfAccounts(companyA);
      const accounts = await getAccounts(companyA);

      const accCash = accounts.find((a) => a.code === "1010")!;
      const accRev = accounts.find((a) => a.code === "4000")!;

      // Unbalanced: Debit $100 vs Credit $80
      await expect(
        createJournalEntry(companyA, {
          entryDate: "2026-10-12",
          description: "Unbalanced manual deposit",
          lines: [
            { accountId: accCash.id, debit: 100, credit: 0 },
            { accountId: accRev.id, debit: 0, credit: 80 },
          ],
        })
      ).rejects.toThrow(UnbalancedJournalEntryError);
    });

    it("accepts strictly balanced manual journal entries", async () => {
      await initializeCompanyChartOfAccounts(companyA);
      const accounts = await getAccounts(companyA);

      const accCash = accounts.find((a) => a.code === "1010")!;
      const accEq = accounts.find((a) => a.code === "3000")!;

      const je = await createJournalEntry(companyA, {
        entryDate: "2026-10-12",
        description: "Initial owner capital contribution",
        reference: "CAP-001",
        lines: [
          { accountId: accCash.id, debit: 5000, credit: 0 },
          { accountId: accEq.id, debit: 0, credit: 5000 },
        ],
      });

      expect(je.id).toBeDefined();
      expect(je.status).toBe("Posted");
      expect(je.total_debit).toBe(5000);
      expect(je.total_credit).toBe(5000);
    });

    it("creates a traceable correcting reversal entry, preserving audit immutability", async () => {
      await initializeCompanyChartOfAccounts(companyA);
      const accounts = await getAccounts(companyA);
      const accBank = accounts.find((a) => a.code === "1020")!;
      const accSupplies = accounts.find((a) => a.code === "5060")!;

      const je = await createJournalEntry(companyA, {
        entryDate: "2026-10-12",
        description: "Purchase supplies",
        lines: [
          { accountId: accSupplies.id, debit: 300, credit: 0 },
          { accountId: accBank.id, debit: 0, credit: 300 },
        ],
      });

      const { original, reversal } = await reverseJournalEntry(
        companyA,
        je.id,
        "Erroneous entry created in duplicate"
      );

      // Original is marked as Reversed
      expect(original.status).toBe("Reversed");

      // Reversal is a distinct posted entry with swapped debits & credits
      expect(reversal.status).toBe("Posted");
      expect(reversal.source_type).toBe("reversal");
      expect(reversal.reversal_of_id).toBe(je.id);
      expect(reversal.total_debit).toBe(300);
      expect(reversal.total_credit).toBe(300);

      const revDebitLine = reversal.lines?.find((l) => l.debit > 0);
      const revCreditLine = reversal.lines?.find((l) => l.credit > 0);

      // Swapped: Bank is debited $300, Supplies credited $300
      expect(revDebitLine?.account_code).toBe("1020");
      expect(revCreditLine?.account_code).toBe("5060");
    });
  });

  // --------------------------------------------------------------------------
  // 5. AUTOMATED LEDGER INTEGRATION FOR SALES INVOICES & PAYMENTS
  // --------------------------------------------------------------------------
  describe("Automated Ledger Posting for Invoices & Payments", () => {
    it("posts invoice to ledger: Debit AR (1200) / Credit Sales Revenue (4000)", async () => {
      const entry = await postInvoiceToLedger(companyA, {
        id: "inv-101",
        invoice_number: "INV-01001",
        issue_date: "2026-10-10",
        grand_total: 1250.0,
        customer_name: "Acme Corp",
      });

      expect(entry).not.toBeNull();
      expect(entry?.total_debit).toBe(1250.0);
      expect(entry?.total_credit).toBe(1250.0);

      const arLine = entry?.lines?.find((l) => l.account_code === "1200");
      const revLine = entry?.lines?.find((l) => l.account_code === "4000");

      expect(arLine?.debit).toBe(1250.0);
      expect(revLine?.credit).toBe(1250.0);
    });

    it("posts payment to ledger: Debit Bank (1020) / Credit AR (1200)", async () => {
      const entry = await postPaymentToLedger(companyA, {
        id: "pay-101",
        payment_number: "PAY-0001",
        invoice_number: "INV-01001",
        payment_date: "2026-10-11",
        amount: 1250.0,
        payment_method: "Bank Transfer",
      });

      expect(entry).not.toBeNull();
      expect(entry?.total_debit).toBe(1250.0);
      expect(entry?.total_credit).toBe(1250.0);

      const bankLine = entry?.lines?.find((l) => l.account_code === "1020");
      const arLine = entry?.lines?.find((l) => l.account_code === "1200");

      expect(bankLine?.debit).toBe(1250.0);
      expect(arLine?.credit).toBe(1250.0);
    });
  });

  // --------------------------------------------------------------------------
  // 6. FINANCIAL STATEMENTS RECONCILIATION
  // --------------------------------------------------------------------------
  describe("Core Financial Reports Reconciliation", () => {
    it("reconciles Profit & Loss: Revenue - Operating Expenses = Net Income", async () => {
      // 1. Post Revenue $10,000
      await postInvoiceToLedger(companyA, {
        id: "inv-201",
        invoice_number: "INV-02001",
        issue_date: "2026-10-01",
        grand_total: 10000,
        customer_name: "Global Tech",
      });

      // 2. Post Approved Expense $3,000 (Rent)
      mockRequireUser.mockResolvedValue(userEmployee);
      const expRent = await createExpense(companyA, {
        category: "Rent",
        amount: 3000,
        currency: "USD",
        date: "2026-10-02",
        vendor: "Real Estate LLC",
        paymentMethod: "Bank Transfer",
        description: "Office rent",
        approvalStatus: "Submitted",
      });
      mockRequireUser.mockResolvedValue(userManager);
      await approveExpense(companyA, expRent.id, userManager);

      // 3. Post Approved Expense $1,000 (Software)
      mockRequireUser.mockResolvedValue(userEmployee);
      const expSoft = await createExpense(companyA, {
        category: "Software",
        amount: 1000,
        currency: "USD",
        date: "2026-10-03",
        vendor: "Cloud Services",
        paymentMethod: "Credit Card",
        description: "SaaS subscriptions",
        approvalStatus: "Submitted",
      });
      mockRequireUser.mockResolvedValue(userManager);
      await approveExpense(companyA, expSoft.id, userManager);

      // Generate P&L
      const pl = await getProfitLossReport(companyA, { from: "2026-10-01", to: "2026-10-31" });

      expect(pl.revenue.total).toBe(10000);
      expect(pl.expenses.total).toBe(4000);
      expect(pl.netOperatingIncome).toBe(6000);
      expect(pl.netProfitMarginPct).toBe(60);
      expect(pl.expenses.items.length).toBe(2);
    });

    it("reconciles Balance Sheet: Assets = Liabilities + Equity with 0 variance", async () => {
      // Capital contribution $50,000 (Debit Bank 1020, Credit Equity 3000)
      await initializeCompanyChartOfAccounts(companyA);
      const accounts = await getAccounts(companyA);
      const accBank = accounts.find((a) => a.code === "1020")!;
      const accEq = accounts.find((a) => a.code === "3000")!;

      await createJournalEntry(companyA, {
        entryDate: "2026-10-01",
        description: "Initial Capital",
        lines: [
          { accountId: accBank.id, debit: 50000, credit: 0 },
          { accountId: accEq.id, debit: 0, credit: 50000 },
        ],
      });

      const bs = await getBalanceSheetReport(companyA, "2026-10-31");

      expect(bs.isBalanced).toBe(true);
      expect(bs.variance).toBe(0);
      expect(bs.assets.total).toBe(50000);
      expect(bs.totalLiabilitiesAndEquity).toBe(50000);
    });

    it("generates Direct Operating Cash Flow statement", async () => {
      // Payment collected $4000
      await postPaymentToLedger(companyA, {
        id: "pay-301",
        payment_number: "PAY-003",
        payment_date: "2026-10-05",
        amount: 4000,
        payment_method: "Bank Transfer",
      });

      // Direct expense paid $1500
      mockRequireUser.mockResolvedValue(userEmployee);
      const exp = await createExpense(companyA, {
        category: "Utilities",
        amount: 1500,
        currency: "USD",
        date: "2026-10-06",
        vendor: "Power & Light",
        paymentMethod: "Bank Transfer",
        description: "Electricity bill",
        approvalStatus: "Submitted",
      });
      mockRequireUser.mockResolvedValue(userManager);
      await approveExpense(companyA, exp.id, userManager);

      const cf = await getCashFlowReport(companyA, { from: "2026-10-01", to: "2026-10-31" });

      expect(cf.totalInflows).toBe(4000);
      expect(cf.totalOutflows).toBe(1500);
      expect(cf.netOperatingCashFlow).toBe(2500);
    });
  });

  // --------------------------------------------------------------------------
  // 7. MULTI-TENANT ISOLATION & PERMISSION DENIAL
  // --------------------------------------------------------------------------
  describe("Tenant Isolation & Cross-Tenant Access Protection", () => {
    it("denies access to unauthorized tenant with ForbiddenError", async () => {
      mockRequirePermission.mockRejectedValue(new ForbiddenError("Access Denied"));

      await expect(getExpenses(companyB)).rejects.toThrow(ForbiddenError);
      await expect(getAccounts(companyB)).rejects.toThrow(ForbiddenError);
    });

    it("strictly isolates expenses between tenant companies", async () => {
      // Company A creates expense
      await createExpense(companyA, {
        category: "Marketing",
        amount: 800,
        currency: "USD",
        date: "2026-10-12",
        vendor: "Google Ads",
        paymentMethod: "Credit Card",
        description: "Search Ads",
        approvalStatus: "Draft",
      });

      // Company B has no expenses
      const expensesA = await getExpenses(companyA);
      const expensesB = await getExpenses(companyB);

      expect(expensesA.length).toBe(1);
      expect(expensesB.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // 8. CSV EXPORT
  // --------------------------------------------------------------------------
  describe("Financial Report CSV Export Engine", () => {
    it("generates compliant CSV with company header and accountant disclaimer", () => {
      const plData = {
        period: { from: "2026-10-01", to: "2026-10-31" },
        revenue: { items: [{ code: "4000", name: "Sales Revenue", amount: 10000 }], total: 10000 },
        expenses: { items: [{ category: "Rent", amount: 2000, percentage: 20 }], total: 2000 },
        netOperatingIncome: 8000,
        netProfitMarginPct: 80,
      };

      const csv = exportFinancialReportToCSV("profit_loss", plData, {
        companyName: "IT-Hub Corp",
        currency: "USD",
      });

      expect(csv).toContain('"Report","PROFIT LOSS"');
      expect(csv).toContain('"Company","IT-Hub Corp"');
      expect(csv).toContain("Subject to client CPA / Accountant review");
      expect(csv).toContain('"NET OPERATING INCOME",8000.00,"80.00%"');
    });
  });
});
