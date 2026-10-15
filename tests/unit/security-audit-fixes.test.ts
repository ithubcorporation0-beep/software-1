import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimiter } from "@/lib/auth/rate-limiter";
import { validatePasswordPolicy } from "@/lib/validation/password";
import { sanitizeCSVCell, sanitizeCSVRow } from "@/lib/utils/csv-sanitizer";
import { sanitizeRedirectPath } from "@/lib/auth/redirect";
import { verifyAdminSessionToken, verifyAdminCredentials } from "@/lib/auth/admin-session";
import { updateMemberRole } from "@/lib/users/server";
import { reviewLeaveRequest, createHREmployee, submitLeaveRequest, resetMemoryHRStore, memoryHRStore } from "@/lib/hr/server";
import { getPayrollRunById, createPayrollRun, resetMemoryPayrollStore, memoryPayrollStore } from "@/lib/payroll/server";
import { createCustomer, getCustomers, getCustomerById, resetMemoryTenantStore } from "@/lib/crm/server";
import { createInvoice, getInvoices, getInvoiceById, resetMemorySalesStore } from "@/lib/sales/server";
import type { Profile } from "@/types/database.types";

const { mockRequireUser, mockRequirePermission, mockRequireCompanyMembership, mockRecordAuditLog } = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockRequireCompanyMembership: vi.fn(),
  mockRecordAuditLog: vi.fn(),
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
    getCurrentUser: () => mockRequireUser(),
  };
});

vi.mock("@/lib/audit/server", () => ({
  recordAuditLog: (...args: any[]) => mockRecordAuditLog(...args),
  recordSecurityAuditLog: vi.fn().mockResolvedValue(undefined),
  checkSecurityAnomalies: vi.fn().mockResolvedValue(undefined),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "rpc pending" } }),
  })),
}));

describe("Security Audit Remediation Suite", () => {
  const companyId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimiter();
    resetMemoryTenantStore();
    resetMemorySalesStore();
    resetMemoryHRStore();
    resetMemoryPayrollStore();

    // Default supabase mock returning errors to trigger the resilient in-memory fallback
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "table pending" } }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "table pending" } }),
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: null, error: { message: "table pending" } }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: null, error: { message: "table pending" } }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: "table pending" } }),
            }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
  });

  describe("1. Password Policy Enforcement", () => {
    it("rejects short passwords (< 10 chars)", () => {
      const res = validatePasswordPolicy("Short1!");
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("at least 10 characters"))).toBe(true);
    });

    it("rejects passwords lacking uppercase, numbers, or symbols", () => {
      const res1 = validatePasswordPolicy("alllowercasewithdigits123");
      expect(res1.valid).toBe(false);
      expect(res1.errors.some((e) => e.includes("uppercase letter"))).toBe(true);

      const res2 = validatePasswordPolicy("AllLettersWithoutDigits!");
      expect(res2.valid).toBe(false);
      expect(res2.errors.some((e) => e.includes("number"))).toBe(true);

      const res3 = validatePasswordPolicy("AllLettersAndDigits1234");
      expect(res3.valid).toBe(false);
      expect(res3.errors.some((e) => e.includes("special character"))).toBe(true);
    });

    it("accepts robust enterprise-grade passwords", () => {
      const res = validatePasswordPolicy("Enterprise@2026Secure!");
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });
  });

  describe("2. CSV Formula Injection Neutralization", () => {
    it("neutralizes dangerous spreadsheet formula prefixes (=, +, -, @, tab, CR)", () => {
      expect(sanitizeCSVCell("=SUM(A1:A10)")).toContain("'=SUM(A1:A10)");
      expect(sanitizeCSVCell("+cmd|' /C calc'!A0")).toContain("'+cmd|' /C calc'!A0");
      expect(sanitizeCSVCell("-2+3*cmd|' /C calc'!A0")).toContain("'-2+3*cmd|' /C calc'!A0");
      expect(sanitizeCSVCell("@SUM(1+1)")).toContain("'@SUM(1+1)");
      expect(sanitizeCSVCell("\tMALICIOUS")).toContain("'\tMALICIOUS");
      expect(sanitizeCSVCell("\rMALICIOUS")).toContain("'\rMALICIOUS");
    });

    it("preserves standard numbers, safe strings, and null/undefined values", () => {
      expect(sanitizeCSVCell(1250.5)).toBe("1250.5");
      expect(sanitizeCSVCell("Standard Corp Ltd")).toBe("Standard Corp Ltd");
      expect(sanitizeCSVCell(null)).toBe("");
      expect(sanitizeCSVCell(undefined)).toBe("");
    });

    it("sanitizes an entire row into safe CSV format", () => {
      const row = ["Acme", "=cmd|' /C calc'!A0", 5000, "@alert()"];
      const csv = sanitizeCSVRow(row);
      expect(csv).toContain('"\'=cmd|\' /C calc\'!A0"');
      expect(csv).toContain('"\'@alert()"');
    });
  });

  describe("3. Open Redirect Prevention", () => {
    it("allows valid relative local paths", () => {
      expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
      expect(sanitizeRedirectPath("/sales/invoices?id=123")).toBe("/sales/invoices?id=123");
      expect(sanitizeRedirectPath("/settings/security")).toBe("/settings/security");
    });

    it("rejects external URLs, protocol-relative paths, and javascript URIs", () => {
      expect(sanitizeRedirectPath("https://evil.attacker.com")).toBe("/");
      expect(sanitizeRedirectPath("http://evil.attacker.com/steal")).toBe("/");
      expect(sanitizeRedirectPath("//evil.attacker.com")).toBe("/");
      expect(sanitizeRedirectPath("javascript:alert(document.cookie)")).toBe("/");
      expect(sanitizeRedirectPath("data:text/html,<script>alert(1)</script>")).toBe("/");
      expect(sanitizeRedirectPath("   ")).toBe("/");
    });
  });

  describe("4. Sliding-Window Rate Limiting", () => {
    it("allows requests under the rate limit and blocks requests exceeding it", () => {
      const key = "ip-test-rate-limit";
      const limit = 3;
      const windowMs = 5000;

      // 1st request
      const r1 = checkRateLimit(key, limit, windowMs);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      // 2nd request
      const r2 = checkRateLimit(key, limit, windowMs);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      // 3rd request
      const r3 = checkRateLimit(key, limit, windowMs);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      // 4th request (should be throttled)
      const r4 = checkRateLimit(key, limit, windowMs);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe("5. Administrative Backdoor Removal & Timing-Safe Verification", () => {
    it("rejects legacy hardcoded backdoor passwords", () => {
      const result1 = verifyAdminCredentials("admin@ithub-enterprise.com", "Admin@123");
      expect(result1).toBe(false);

      const result2 = verifyAdminCredentials("admin@ithub-enterprise.com", "admin123");
      expect(result2).toBe(false);
    });

    it("rejects tampered or forged administrative session tokens", () => {
      expect(verifyAdminSessionToken("forged.fake.token")).toBeNull();
      expect(verifyAdminSessionToken("")).toBeNull();
      expect(verifyAdminSessionToken(undefined)).toBeNull();
    });
  });

  describe("6. Separation of Duties: Self-Approval Blocking", () => {
    it("blocks an approver from approving their own leave request", async () => {
      const approverId = "user-manager-123";
      const approverUser: Profile = {
        id: approverId,
        email: "manager@tenant.corp",
        full_name: "Manager User",
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockRequireUser.mockResolvedValue(approverUser);
      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-approver", user_id: approverId },
        role: { code: "manager" },
        permissions: ["leave.approve", "hr.leave_approve", "leave.request", "hr.create"],
      });

      // Create employee linked to approver
      const emp = await createHREmployee(
        companyId,
        {
          fullName: "Manager User",
          email: "manager@tenant.corp",
          position: "Engineering Manager",
          joiningDate: "2024-01-01",
        },
        approverUser
      );
      // Link user_id to approver
      const storedEmp = memoryHRStore.employees.find((e) => e.id === emp.id);
      if (storedEmp) {
        storedEmp.user_id = approverId;
      }

      // Submit leave request for approver
      const leave = await submitLeaveRequest(
        companyId,
        {
          employeeId: emp.id,
          leaveType: "Casual",
          startDate: "2026-11-01",
          endDate: "2026-11-05",
          reason: "Personal leave",
        },
        approverUser
      );

      // Approver attempts to approve their own request
      await expect(
        reviewLeaveRequest(
          companyId,
          leave.id,
          { status: "Approved" },
          approverUser
        )
      ).rejects.toThrow(/Separation of duties violation.*cannot approve their own leave request/i);
    });
  });

  describe("7. Privilege Escalation: Self-Role Modification & Admin Elevation", () => {
    it("blocks a user from modifying their own role", async () => {
      const callerId = "user-caller-123";
      const callerUser: Profile = {
        id: callerId,
        email: "caller@tenant.corp",
        full_name: "Caller Admin",
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockRequireUser.mockResolvedValue(callerUser);
      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-caller", user_id: callerId },
        role: { code: "admin" },
        permissions: ["users:manage"],
      });
      mockRequireCompanyMembership.mockResolvedValue({
        membership: { id: "m-caller", user_id: callerId },
        role: { code: "admin" },
        company: { id: companyId },
        permissions: ["users:manage"],
      });

      // 1. Target membership lookup (belongs to caller!)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: {
                  id: "mem-caller-target",
                  user_id: callerId, // Matches caller!
                  company_id: companyId,
                  role: { code: "admin" },
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      // 2. Target role lookup
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: "role-new-uuid",
                code: "super_admin",
                name: "Super Administrator",
              },
              error: null,
            }),
          }),
        }),
      });

      const res = await updateMemberRole(companyId, "mem-caller-target", "role-new-uuid");
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/You cannot modify your own role/i);
    });

    it("blocks a non-admin manager from assigning the admin role", async () => {
      const callerId = "manager-user-uuid";
      const callerUser: Profile = {
        id: callerId,
        email: "manager@tenant.corp",
        full_name: "Manager User",
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockRequireUser.mockResolvedValue(callerUser);
      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-manager", user_id: callerId },
        role: { code: "manager" },
        permissions: ["users:manage"],
      });
      mockRequireCompanyMembership.mockResolvedValue({
        membership: { id: "m-manager", user_id: callerId },
        role: { code: "manager" },
        company: { id: companyId },
        permissions: ["users:manage"],
      });

      // 1. Target membership lookup
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: {
                  id: "mem-target-subordinate",
                  user_id: "other-user-uuid",
                  company_id: companyId,
                  role: { code: "employee" },
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      // 2. Target role lookup (returns admin role)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: "role-admin-uuid",
                code: "admin",
                name: "Administrator",
                is_system: true,
              },
              error: null,
            }),
          }),
        }),
      });

      const res = await updateMemberRole(companyId, "mem-target-subordinate", "role-admin-uuid");
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Only Administrators can grant Admin privileges/i);
    });
  });

  describe("8. Customer Portal Data Scoping (IDOR Prevention)", () => {
    it("scopes customer-role users strictly to their own customer profile", async () => {
      const customerUser: Profile = {
        id: "cust-user-uuid",
        email: "client@externalcorp.com",
        full_name: "External Client",
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create two customers in the store
      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-staff" },
        role: { code: "manager" },
        permissions: ["crm:create", "crm:view"],
      });
      mockRequireUser.mockResolvedValue(customerUser);

      await createCustomer(companyId, {
        name: "My Company Client",
        email: "client@externalcorp.com",
        customerType: "B2B",
      });
      await createCustomer(companyId, {
        name: "Victim Competitor",
        email: "victim@competitor.com",
        customerType: "Enterprise",
      });

      // Now query as the customer portal user
      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-cust", user_id: customerUser.id },
        role: { code: "customer" },
        permissions: ["crm:view"],
      });

      const res = await getCustomers(companyId, {}, customerUser);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].email).toBe("client@externalcorp.com");
    });

    it("blocks a customer-role user from viewing another customer's ID (IDOR)", async () => {
      const customerUser: Profile = {
        id: "cust-user-uuid",
        email: "client@externalcorp.com",
        full_name: "External Client",
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-staff" },
        role: { code: "manager" },
        permissions: ["crm:create", "crm:view"],
      });
      mockRequireUser.mockResolvedValue(customerUser);

      const victim = await createCustomer(companyId, {
        name: "Victim Competitor",
        email: "victim@competitor.com",
        customerType: "Enterprise",
      });

      // Customer attempts to open victim's record
      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-cust", user_id: customerUser.id },
        role: { code: "customer" },
        permissions: ["crm:view"],
      });

      const res = await getCustomerById(companyId, victim.data!.id, customerUser);
      expect(res).toBeNull();
    });

    it("blocks a customer-role user from viewing another customer's invoice (IDOR)", async () => {
      const staffUser: Profile = {
        id: "staff-uuid",
        email: "staff@company.com",
        full_name: "Staff Member",
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const customerUser: Profile = {
        id: "cust-user-uuid",
        email: "client@externalcorp.com",
        full_name: "External Client",
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-staff" },
        role: { code: "manager" },
        permissions: ["crm:create", "sales:create", "sales:view"],
      });
      mockRequireUser.mockResolvedValue(staffUser);

      const otherCustomer = await createCustomer(companyId, {
        name: "Other Client",
        email: "other@corporation.com",
        customerType: "B2B",
      });

      const invRes = await createInvoice(
        companyId,
        {
          customerId: otherCustomer.data!.id,
          issueDate: "2026-10-15",
          dueDate: "2026-11-15",
          items: [{ description: "Consulting", quantity: 1, unitPrice: 5000 }],
        },
        staffUser
      );

      expect(invRes.success).toBe(true);
      expect(invRes.data?.id).toBeDefined();

      // Customer attempts to view other customer's invoice
      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-cust", user_id: customerUser.id },
        role: { code: "customer" },
        permissions: ["sales:view"],
      });

      const res = await getInvoiceById(companyId, invRes.data!.id, customerUser);
      expect(res).toBeNull();
    });
  });

  describe("9. Sensitive Payroll & Bank Data Masking", () => {
    it("masks employee bank account details when user lacks sensitive HR permissions", async () => {
      const managerUser: Profile = {
        id: "manager-uuid",
        email: "manager@corp.local",
        full_name: "HR Manager",
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const auditorUser: Profile = {
        id: "auditor-uuid",
        email: "auditor@corp.local",
        full_name: "Auditor User",
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create an employee with bank details
      memoryHRStore.employees.push({
        id: "emp-bank-test",
        company_id: companyId,
        user_id: "emp-user-uuid",
        employee_id: "EMP-2001",
        full_name: "Jane Doe",
        avatar_url: null,
        email: "jane@corp.local",
        phone: "+1-555-0101",
        cnic: "42101-1234567-1",
        department_id: "dept-eng",
        department_name: "Engineering",
        position: "Staff Engineer",
        joining_date: "2024-01-15",
        salary: 150000.0,
        bank_name: "Meezan Bank",
        bank_account_title: "Jane Doe",
        bank_account_number: "PK36MEZN0001234567890123",
        emergency_contact_name: "Parent",
        emergency_contact_relation: "Mother",
        emergency_contact_phone: "+1-555-0199",
        employment_status: "Active",
        documents: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockRequireUser.mockResolvedValue(managerUser);
      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-manager" },
        role: { code: "manager" },
        permissions: ["payroll.write", "payroll.admin"],
      });

      // Create a payroll run with standard dummy data
      const created = await createPayrollRun(
        companyId,
        {
          periodStart: "2026-10-01",
          periodEnd: "2026-10-31",
          payDate: "2026-10-31",
        },
        managerUser
      );
      const runId = created.run.id;

      // Auditor without employees:view_sensitive attempts to view
      mockRequireUser.mockResolvedValue(auditorUser);
      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-auditor" },
        role: { code: "auditor" },
        permissions: ["payroll.read", "payroll:view"], // NO employees:view_sensitive
      });

      const fetched = await getPayrollRunById(companyId, runId, auditorUser);
      expect(fetched).not.toBeNull();
      expect(fetched?.items.length).toBeGreaterThan(0);
      const bank = fetched?.items[0]?.bank_account_number;
      expect(bank).toMatch(/^[•*]+/);
    });
  });

  describe("10. Concurrency & Race Condition Safeguards", () => {
    it("executes simultaneous concurrent rate limit evaluations accurately", async () => {
      const key = "ip-concurrent-test";
      const limit = 5;
      const windowMs = 5000;

      // Fire 10 simultaneous requests
      const promises = Array.from({ length: 10 }).map(() =>
        Promise.resolve(checkRateLimit(key, limit, windowMs))
      );
      const results = await Promise.all(promises);

      const allowedCount = results.filter((r) => r.allowed).length;
      const blockedCount = results.filter((r) => !r.allowed).length;

      expect(allowedCount).toBe(5);
      expect(blockedCount).toBe(5);
    });
  });
});
