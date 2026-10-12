import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateNetSalary,
  roundCurrency,
  createPayrollRun,
  getPayrollRuns,
  getPayrollRunById,
  updatePayrollItem,
  approvePayrollRun,
  finalizePayrollRun,
  reversePayrollRun,
  getEmployeeSalarySlips,
  getPaySlipData,
  getPayrollSettings,
  updatePayrollSettings,
  confirmStatutoryPayrollRules,
  exportPayrollRunToCSV,
  resetMemoryPayrollStore,
  memoryPayrollStore,
  DuplicatePayrollPeriodError,
  PayrollTransitionError,
  ImmutablePayrollError,
  PayrollAccessDeniedError,
} from "@/lib/payroll/server";
import { memoryHRStore, resetMemoryHRStore } from "@/lib/hr/server";
import { memoryFinanceStore, resetMemoryFinanceStore } from "@/lib/finance/server";
import type { Profile } from "@/types/database.types";

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

const COMPANY_A = "11111111-1111-1111-1111-111111111111";
const COMPANY_B = "22222222-2222-2222-2222-222222222222";

// Mock profiles for testing without real PII
const adminUserA: Profile = {
  id: "user-admin-a",
  email: "admin@companya.com",
  full_name: "Admin User",
  avatar_url: null,
  is_super_admin: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const employeeUserA1: Profile = {
  id: "user-emp-a1",
  email: "alice@companya.com",
  full_name: "Alice Smith",
  avatar_url: null,
  is_super_admin: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const employeeUserA2: Profile = {
  id: "user-emp-a2",
  email: "bob@companya.com",
  full_name: "Bob Jones",
  avatar_url: null,
  is_super_admin: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const unauthorizedUser: Profile = {
  id: "user-unauth",
  email: "intern@companya.com",
  full_name: "Intern User",
  avatar_url: null,
  is_super_admin: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("Payroll Subsystem Unit Tests", () => {
  beforeEach(() => {
    resetMemoryPayrollStore();
    resetMemoryHRStore();
    resetMemoryFinanceStore();
    vi.clearAllMocks();

    mockRequireUser.mockResolvedValue(adminUserA);
    mockRequirePermission.mockImplementation(async (companyId: string, perm: string, user?: any) => {
      const u = user || adminUserA;
      if (u.id === unauthorizedUser.id) {
        throw new PayrollAccessDeniedError(
          "Access Denied: You do not have permission to view sensitive compensation and payroll records."
        );
      }
      if (u.id === employeeUserA1.id || u.id === employeeUserA2.id) {
        return {
          membership: { id: `m-${u.id}` },
          role: { name: "Employee" },
          company: { id: companyId, name: "Company" },
          permissions: ["payroll.read"],
        };
      }
      return {
        membership: { id: "m-admin" },
        role: { name: "Admin" },
        company: { id: companyId, name: "Company" },
        permissions: ["*"],
      };
    });

    // Seed dummy HR employees for Company A (No real PII used)
    memoryHRStore.employees.push(
      {
        id: "emp-a1",
        company_id: COMPANY_A,
        user_id: employeeUserA1.id,
        employee_id: "EMP-1001",
        full_name: "Alice Smith",
        avatar_url: null,
        email: "alice@companya.com",
        phone: "+1-555-0101",
        cnic: "42101-1234567-1",
        department_id: "dept-eng",
        department_name: "Engineering",
        position: "Senior Software Engineer",
        joining_date: "2024-01-15",
        salary: 6000.0,
        bank_name: "Operating Bank",
        bank_account_title: "Alice Smith",
        bank_account_number: "PK99BOAP12345678",
        emergency_contact_name: "Parent",
        emergency_contact_relation: "Mother",
        emergency_contact_phone: "+1-555-0199",
        documents: [],
        employment_status: "Active",
        created_by: adminUserA.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "emp-a2",
        company_id: COMPANY_A,
        user_id: employeeUserA2.id,
        employee_id: "EMP-1002",
        full_name: "Bob Jones",
        avatar_url: null,
        email: "bob@companya.com",
        phone: "+1-555-0102",
        cnic: "42101-9876543-2",
        department_id: "dept-mkt",
        department_name: "Marketing",
        position: "Marketing Manager",
        joining_date: "2024-03-01",
        salary: 4500.0,
        bank_name: "Operating Bank",
        bank_account_title: "Bob Jones",
        bank_account_number: "PK99BOAP87654321",
        emergency_contact_name: "Spouse",
        emergency_contact_relation: "Wife",
        emergency_contact_phone: "+1-555-0198",
        documents: [],
        employment_status: "Active",
        created_by: adminUserA.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  });

  // --------------------------------------------------------------------------
  // 1. PRD Formula & Decimal-Safe Rounding
  // --------------------------------------------------------------------------
  describe("PRD Net Salary Formula & Decimal-Safe Arithmetic", () => {
    it("computes Net Salary correctly: Basic + Allowances + Bonus + OT - Deductions - Tax - Advances", () => {
      const calc = calculateNetSalary({
        basicSalary: 5000.0,
        allowances: 600.0,
        bonus: 400.0,
        overtime: 250.0,
        deductions: 150.0,
        tax: 500.0,
        advance: 300.0,
      });

      // Gross = 5000 + 600 + 400 + 250 = 6250
      expect(calc.grossEarnings).toBe(6250.0);
      // Reductions = 150 + 500 + 300 = 950
      expect(calc.totalReductions).toBe(950.0);
      // Net = 6250 - 950 = 5300
      expect(calc.netSalary).toBe(5300.0);
    });

    it("handles decimal-safe precision without floating-point artifacts", () => {
      const calc = calculateNetSalary({
        basicSalary: 3333.33,
        allowances: 166.67,
        bonus: 0.1,
        overtime: 0.2, // 0.1 + 0.2 precision test
        deductions: 50.0,
        tax: 100.0,
        advance: 0.0,
      });

      // Gross = 3333.33 + 166.67 + 0.10 + 0.20 = 3500.30
      expect(calc.grossEarnings).toBe(3500.3);
      expect(calc.totalReductions).toBe(150.0);
      expect(calc.netSalary).toBe(3350.3);
    });

    it("supports dollar mode rounding when configured", () => {
      expect(roundCurrency(1234.56, "dollar")).toBe(1235);
      expect(roundCurrency(1234.49, "dollar")).toBe(1234);
      expect(roundCurrency(1234.567, "cent")).toBe(1234.57);
    });

    it("prevents impossible negative net salary distributions", () => {
      expect(() => {
        calculateNetSalary({
          basicSalary: 1000.0,
          deductions: 800.0,
          tax: 300.0, // Total reductions = 1100 > 1000
        });
      }).toThrow(/Negative net salary error/);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Duplicate Run Prevention & Cycle Creation
  // --------------------------------------------------------------------------
  describe("Payroll Cycle Creation & Duplicate Period Prevention", () => {
    it("creates a draft payroll run compiling active employees", async () => {
      const { run, items } = await createPayrollRun(
        COMPANY_A,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
          notes: "October regular cycle",
        },
        adminUserA
      );

      expect(run.status).toBe("Draft");
      expect(run.employee_count).toBe(2);
      expect(run.total_basic).toBe(10500.0); // 6000 + 4500
      expect(run.total_net).toBe(10500.0);
      expect(items.length).toBe(2);
      expect(items[0].status).toBe("Draft");
    });

    it("prevents duplicate active payroll runs for the exact same period", async () => {
      await createPayrollRun(
        COMPANY_A,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
        },
        adminUserA
      );

      await expect(
        createPayrollRun(
          COMPANY_A,
          {
            periodStart: "2026-10-01",
            periodEnd: "2026-10-31",
            payDate: "2026-10-31",
          },
          adminUserA
        )
      ).rejects.toThrow(DuplicatePayrollPeriodError);
    });

    it("rejects invalid period where periodEnd is before periodStart", async () => {
      await expect(
        createPayrollRun(
          COMPANY_A,
          {
            periodStart: "2026-10-31",
            periodEnd: "2026-10-01",
            payDate: "2026-10-31",
          },
          adminUserA
        )
      ).rejects.toThrow(/Period end date cannot precede period start date/);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Line Adjustments & Run Recalculation
  // --------------------------------------------------------------------------
  describe("Draft Line Item Adjustments & Totals Recalculation", () => {
    it("updates line allowances and recalculates run totals", async () => {
      const { run, items } = await createPayrollRun(
        COMPANY_A,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
        },
        adminUserA
      );

      const aliceItem = items.find((i) => i.employee_name === "Alice Smith")!;
      const updatedAlice = await updatePayrollItem(
        COMPANY_A,
        aliceItem.id,
        {
          bonus: 500.0,
          overtime: 200.0,
          deductions: 100.0,
        },
        adminUserA
      );

      // Alice basic 6000 + 500 + 200 - 100 = 6600
      expect(updatedAlice.net_salary).toBe(6600.0);

      const refreshed = await getPayrollRunById(COMPANY_A, run.id, adminUserA);
      // Run: Alice (6600) + Bob (4500) = 11100
      expect(refreshed?.run.total_net).toBe(11100.0);
      expect(refreshed?.run.total_bonus).toBe(500.0);
      expect(refreshed?.run.total_overtime).toBe(200.0);
      expect(refreshed?.run.total_deductions).toBe(100.0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Controlled State Machine: Draft -> Approved -> Finalized
  // --------------------------------------------------------------------------
  describe("State Transition Workflow & Accounting Posting", () => {
    it("transitions from Draft to Approved, then to Finalized", async () => {
      const { run } = await createPayrollRun(
        COMPANY_A,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
        },
        adminUserA
      );

      // 1. Approve
      const approved = await approvePayrollRun(COMPANY_A, run.id, adminUserA);
      expect(approved.status).toBe("Approved");
      expect(approved.approved_by).toBe(adminUserA.id);

      // 2. Finalize
      const finalized = await finalizePayrollRun(COMPANY_A, run.id, adminUserA);
      expect(finalized.status).toBe("Finalized");
      expect(finalized.finalized_by).toBe(adminUserA.id);
      expect(finalized.journal_entry_id).toBeDefined();

      // Check double-entry journal entry was posted in memoryFinanceStore
      const je = memoryFinanceStore.journalEntries.find((j) => j.id === finalized.journal_entry_id);
      expect(je).toBeDefined();
      expect(je?.status).toBe("Posted");
      expect(je?.total_debit).toBe(10500.0);
      expect(je?.total_credit).toBe(10500.0); // Balanced!
    });

    it("prevents direct finalization of a Draft run without approval", async () => {
      const { run } = await createPayrollRun(
        COMPANY_A,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
        },
        adminUserA
      );

      await expect(finalizePayrollRun(COMPANY_A, run.id, adminUserA)).rejects.toThrow(
        PayrollTransitionError
      );
    });

    it("enforces immutability: rejects editing items on a Finalized run", async () => {
      const { run, items } = await createPayrollRun(
        COMPANY_A,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
        },
        adminUserA
      );

      await approvePayrollRun(COMPANY_A, run.id, adminUserA);
      await finalizePayrollRun(COMPANY_A, run.id, adminUserA);

      await expect(
        updatePayrollItem(COMPANY_A, items[0].id, { bonus: 100 }, adminUserA)
      ).rejects.toThrow(ImmutablePayrollError);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Traceable Reversal Process
  // --------------------------------------------------------------------------
  describe("Traceable Payroll Reversal & Offsetting Ledger Entry", () => {
    it("reverses a finalized run with mandatory justification and creates an offsetting journal entry", async () => {
      const { run } = await createPayrollRun(
        COMPANY_A,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
        },
        adminUserA
      );

      await approvePayrollRun(COMPANY_A, run.id, adminUserA);
      const finalized = await finalizePayrollRun(COMPANY_A, run.id, adminUserA);

      // Reversal
      const reversed = await reversePayrollRun(
        COMPANY_A,
        run.id,
        { reversalReason: "Discovered miscalculated sales commission tier across staff" },
        adminUserA
      );

      expect(reversed.status).toBe("Reversed");
      expect(reversed.reversal_reason).toBe(
        "Discovered miscalculated sales commission tier across staff"
      );
      expect(reversed.reversed_by).toBe(adminUserA.id);

      // Check reversing journal entry was posted
      const revEntry = memoryFinanceStore.journalEntries.find(
        (j) => j.reversal_of_id === finalized.journal_entry_id
      );
      expect(revEntry).toBeDefined();
      expect(revEntry?.description).toContain("Reversal of Payroll Run");
    });

    it("rejects reversal with empty or insufficient justification", async () => {
      const { run } = await createPayrollRun(
        COMPANY_A,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
        },
        adminUserA
      );

      await approvePayrollRun(COMPANY_A, run.id, adminUserA);
      await finalizePayrollRun(COMPANY_A, run.id, adminUserA);

      await expect(
        reversePayrollRun(COMPANY_A, run.id, { reversalReason: "Bad" }, adminUserA)
      ).rejects.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // 6. Sensitive Compensation & Salary Slip Permissions
  // --------------------------------------------------------------------------
  describe("Sensitive Compensation Access & Salary Slip Controls", () => {
    it("allows employees to view their own salary slip", async () => {
      const { items } = await createPayrollRun(
        COMPANY_A,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
        },
        adminUserA
      );

      const aliceItem = items.find((i) => i.employee_name === "Alice Smith")!;
      const slipData = await getPaySlipData(COMPANY_A, aliceItem.id, employeeUserA1);

      expect(slipData.item.employee_name).toBe("Alice Smith");
      expect(slipData.calculation.netSalary).toBe(6000.0);
    });

    it("denies an employee from viewing another employee's salary slip", async () => {
      const { items } = await createPayrollRun(
        COMPANY_A,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
        },
        adminUserA
      );

      const aliceItem = items.find((i) => i.employee_name === "Alice Smith")!;

      // Bob Jones tries to view Alice Smith's salary slip
      await expect(getPaySlipData(COMPANY_A, aliceItem.id, employeeUserA2)).rejects.toThrow(
        PayrollAccessDeniedError
      );
    });

    it("denies unauthorized users from viewing payroll runs", async () => {
      await expect(getPayrollRuns(COMPANY_A, {}, unauthorizedUser)).rejects.toThrow(
        PayrollAccessDeniedError
      );
    });
  });

  // --------------------------------------------------------------------------
  // 7. Statutory & Policy Confirmation Workflow
  // --------------------------------------------------------------------------
  describe("Statutory Rules Confirmation Workflow", () => {
    it("starts with unconfirmed statutory rules and marks confirmed upon authorization", async () => {
      const settingsBefore = await getPayrollSettings(COMPANY_A, adminUserA);
      expect(settingsBefore.statutory_rules_confirmed).toBe(false);

      const settingsAfter = await confirmStatutoryPayrollRules(COMPANY_A, adminUserA);
      expect(settingsAfter.statutory_rules_confirmed).toBe(true);
      expect(settingsAfter.statutory_rules_confirmed_by).toBe(adminUserA.id);
    });
  });

  // --------------------------------------------------------------------------
  // 8. CSV Export & Multi-Tenant Boundary Isolation
  // --------------------------------------------------------------------------
  describe("CSV Export & Cross-Tenant Boundary Isolation", () => {
    it("exports payroll run summary as RFC-compliant CSV", async () => {
      const { run } = await createPayrollRun(
        COMPANY_A,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
        },
        adminUserA
      );

      const csv = await exportPayrollRunToCSV(COMPANY_A, run.id, adminUserA);
      expect(csv).toContain("Employee Code,Employee Name,Department");
      expect(csv).toContain("Alice Smith");
      expect(csv).toContain("Bob Jones");
    });

    it("strictly isolates payroll runs between Company A and Company B", async () => {
      await createPayrollRun(
        COMPANY_A,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
        },
        adminUserA
      );

      // Query Company B
      const runsB = await getPayrollRuns(COMPANY_B, {}, adminUserA);
      expect(runsB.length).toBe(0);
    });
  });
});
