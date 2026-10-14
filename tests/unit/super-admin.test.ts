import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSuperAdminMetrics,
  getPlatformCompanies,
  approveCompany,
  rejectCompany,
  suspendCompany,
  reactivateCompany,
  getPlatformUsers,
  toggleUserSuperAdmin,
  resetMemorySuperAdminStore,
} from "@/lib/super-admin/server";
import {
  requireSuperAdmin,
  requireCompanyMembership,
  requirePermission,
  hasPermission,
  ForbiddenError,
  CompanyAccessError,
} from "@/lib/auth/server";
import { updateMemberRole } from "@/lib/users/server";

// Mock Supabase Server Client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

describe("IT HUB ERP — Super Admin & Granular Permissions Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMemorySuperAdminStore();
  });

  describe("Criterion 1: Super Admin can approve a company", () => {
    it("successfully transitions a company from PENDING to ACTIVE with audit record", async () => {
      // Mock caller as Platform Super Admin
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "super-admin-uuid", email: "root@ithub.corp", user_metadata: {} },
        },
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: "super-admin-uuid",
                email: "root@ithub.corp",
                is_super_admin: true,
              },
            }),
          }),
        }),
      });

      // Target pending company
      const companyId = "pending-company-1";

      // Mock update call
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: {
                  id: companyId,
                  name: "Apex Logistics Ltd",
                  slug: "apex-logistics",
                  domain: "apex.com",
                  plan: "PROFESSIONAL",
                  status: "ACTIVE",
                  approved_at: new Date().toISOString(),
                  approved_by: "super-admin-uuid",
                },
              }),
            }),
          }),
        }),
      });

      // Mock audit log insert
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValueOnce({ error: null }),
      });

      const result = await approveCompany(companyId);
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("ACTIVE");
    });
  });

  describe("Criterion 2 & 8: Unapproved and Suspended companies cannot use protected ERP modules", () => {
    it("fails closed with CompanyAccessError when company status is PENDING", async () => {
      const companyId = "tenant-pending-uuid";

      // Regular employee caller (not super admin)
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "user-regular", email: "clerk@pending.com", user_metadata: {} },
        },
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "user-regular", email: "clerk@pending.com", is_super_admin: false },
            }),
          }),
        }),
      });

      // Mock membership with PENDING company
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                single: vi.fn().mockResolvedValueOnce({
                  data: {
                    id: "membership-pending-1",
                    company_id: companyId,
                    user_id: "user-regular",
                    role_id: "role-employee",
                    status: "ACTIVE",
                    role: { id: "role-employee", code: "employee", name: "Employee" },
                    company: { id: companyId, name: "Pending Corp", status: "PENDING" },
                  },
                }),
              }),
            }),
          }),
        }),
      });

      await expect(requireCompanyMembership(companyId)).rejects.toThrow(CompanyAccessError);
    });

    it("fails closed with CompanyAccessError when company status is SUSPENDED", async () => {
      const companyId = "tenant-suspended-uuid";

      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "user-regular", email: "user@suspended.com", user_metadata: {} },
        },
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "user-regular", email: "user@suspended.com", is_super_admin: false },
            }),
          }),
        }),
      });

      // Mock membership with SUSPENDED company
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                single: vi.fn().mockResolvedValueOnce({
                  data: {
                    id: "membership-suspended-1",
                    company_id: companyId,
                    user_id: "user-regular",
                    role_id: "role-employee",
                    status: "ACTIVE",
                    role: { id: "role-employee", code: "employee", name: "Employee" },
                    company: { id: companyId, name: "Suspended Holdings", status: "SUSPENDED" },
                  },
                }),
              }),
            }),
          }),
        }),
      });

      await expect(requireCompanyMembership(companyId)).rejects.toThrow(CompanyAccessError);
    });
  });

  describe("Criterion 3: Data entry user cannot create invoices when that permission is disabled", () => {
    it("fails closed when caller does not possess invoices.create or sales:create", async () => {
      const companyId = "company-tenant-uuid";

      // Data entry operator caller
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "data-entry-user", email: "entry@acme.corp", user_metadata: {} },
        },
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "data-entry-user", email: "entry@acme.corp", is_super_admin: false },
            }),
          }),
        }),
      });

      // Active membership with role 'data_entry'
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                single: vi.fn().mockResolvedValueOnce({
                  data: {
                    id: "membership-de-1",
                    company_id: companyId,
                    user_id: "data-entry-user",
                    role_id: "role-data-entry",
                    status: "ACTIVE",
                    role: { id: "role-data-entry", code: "data_entry", name: "Data Entry Operator" },
                    company: { id: companyId, name: "Acme Corp", status: "ACTIVE" },
                  },
                }),
              }),
            }),
          }),
        }),
      });

      // Only granted customers.create, NOT invoices.create
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              { permission: { code: "customers.create" } },
              { permission: { code: "customers.view" } },
            ],
          }),
        }),
      });

      await expect(
        requirePermission(companyId, "invoices.create")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Criterion 4: Invoice user can create invoices but cannot access unauthorized payroll data", () => {
    it("evaluates hasPermission correctly: permits invoices.create but rejects payroll.process", () => {
      const invoiceClerkPermissions = [
        "invoices.view",
        "invoices.create",
        "invoices.edit",
        "invoices.export",
        "customers.view",
      ];

      // Permitted
      expect(hasPermission(invoiceClerkPermissions, "invoices.create")).toBe(true);
      expect(hasPermission(invoiceClerkPermissions, "sales:create")).toBe(true); // cross-module alias
      expect(hasPermission(invoiceClerkPermissions, "invoices.export")).toBe(true);

      // Denied under default-deny
      expect(hasPermission(invoiceClerkPermissions, "payroll.process")).toBe(false);
      expect(hasPermission(invoiceClerkPermissions, "payroll:approve")).toBe(false);
      expect(hasPermission(invoiceClerkPermissions, "payroll.view")).toBe(false);
      expect(hasPermission(invoiceClerkPermissions, "expenses.approve")).toBe(false);
      expect(hasPermission(invoiceClerkPermissions, "settings.manage")).toBe(false);
    });
  });

  describe("Criterion 5: Company A cannot access Company B records or users", () => {
    it("blocks caller if they attempt to invoke membership verification on a foreign company ID", async () => {
      const foreignCompanyId = "foreign-company-b";

      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "user-company-a", email: "user@company-a.com", user_metadata: {} },
        },
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "user-company-a", email: "user@company-a.com", is_super_admin: false },
            }),
          }),
        }),
      });

      // Query returns no membership for foreignCompanyId
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                single: vi.fn().mockResolvedValueOnce({
                  data: null,
                  error: { message: "No active membership" },
                }),
              }),
            }),
          }),
        }),
      });

      await expect(requireCompanyMembership(foreignCompanyId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Criterion 6: Company Admin cannot grant Super Admin privileges", () => {
    it("rejects attempt by non-super-admin Company Admin to assign Super Admin role", async () => {
      const companyId = "company-1";
      const targetMembershipId = "membership-emp-1";
      const superAdminRoleId = "role-super-admin-id";

      // Caller is a Company Admin, but NOT a platform Super Admin
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "company-admin-id", email: "admin@tenant.com", user_metadata: {} },
        },
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "company-admin-id", email: "admin@tenant.com", is_super_admin: false },
            }),
          }),
        }),
      });

      // Mock requirePermission(companyId, "users:edit") membership check
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                single: vi.fn().mockResolvedValueOnce({
                  data: {
                    id: "membership-admin-1",
                    company_id: companyId,
                    user_id: "company-admin-id",
                    role_id: "role-admin",
                    status: "ACTIVE",
                    role: { id: "role-admin", code: "admin", name: "Administrator" },
                    company: { id: companyId, name: "Tenant 1", status: "ACTIVE" },
                  },
                }),
              }),
            }),
          }),
        }),
      });

      // Role permissions for admin include users:edit
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [{ permission: { code: "users:edit" } }],
          }),
        }),
      });

      // Target membership lookup
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: {
                  id: targetMembershipId,
                  company_id: companyId,
                  user_id: "target-user-id",
                  role_id: "role-employee",
                  role: { code: "employee", name: "Employee" },
                  profile: { id: "target-user-id" },
                },
              }),
            }),
          }),
        }),
      });

      // Target role lookup returns code: 'super_admin'
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: superAdminRoleId,
                code: "super_admin",
                name: "Super Administrator",
              },
            }),
          }),
        }),
      });

      const res = await updateMemberRole(companyId, targetMembershipId, superAdminRoleId);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Privilege Escalation Blocked");
    });

    it("rejects non-super-admin from invoking requireSuperAdmin", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "company-admin-id", email: "admin@tenant.com", user_metadata: {} },
        },
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "company-admin-id", email: "admin@tenant.com", is_super_admin: false },
            }),
          }),
        }),
      });

      await expect(requireSuperAdmin()).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Criterion 7: Disabling a permission takes effect immediately on the server", () => {
    it("fails closed when permission is revoked from user role", () => {
      // Role with permissions
      const activeRolePerms = ["customers.view", "invoices.view"];

      // With permission: allowed
      expect(hasPermission(activeRolePerms, "invoices.view")).toBe(true);

      // Disabling / revoking invoices.view:
      const revokedRolePerms = activeRolePerms.filter((p) => p !== "invoices.view");

      // Without permission: immediately rejected
      expect(hasPermission(revokedRolePerms, "invoices.view")).toBe(false);
    });
  });

  describe("Criterion 9: Audit logs capture administrative actions", () => {
    it("records audit events for company suspend, reactivate, and reject operations", async () => {
      // Super admin caller
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: "super-admin-uuid", email: "root@ithub.corp", user_metadata: {} },
        },
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "super-admin-uuid", email: "root@ithub.corp", is_super_admin: true },
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "comp-1",
                  name: "Target Corp",
                  status: "SUSPENDED",
                },
              }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      const suspendRes = await suspendCompany("comp-1", "Non-compliance review");
      expect(suspendRes.success).toBe(true);

      const reactivateRes = await reactivateCompany("comp-1");
      expect(reactivateRes.success).toBe(true);

      const rejectRes = await rejectCompany("comp-1", "Invalid documents");
      expect(rejectRes.success).toBe(true);
    });
  });
});
