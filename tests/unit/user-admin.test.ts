import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  inviteCompanyUser,
  updateMemberRole,
  toggleMemberStatus,
  deleteCustomRole,
} from "@/lib/users/server";

// Mock auth server functions
const mockRequireUser = vi.fn();
const mockRequirePermission = vi.fn();

vi.mock("@/lib/auth/server", () => ({
  requireUser: () => mockRequireUser(),
  requirePermission: (companyId: string, perm: string, user?: any) => mockRequirePermission(companyId, perm, user),
}));

// Mock audit server
vi.mock("@/lib/audit/server", () => ({
  recordAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// Mock Supabase
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: mockFrom,
  })),
}));

describe("User Administration & Privilege Escalation Protection", () => {
  const companyId = "company-tenant-uuid";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Privilege Escalation Guards", () => {
    it("blocks a non-super-admin from assigning the Super Admin role", async () => {
      // Caller is normal tenant admin, not platform super admin
      mockRequireUser.mockResolvedValueOnce({
        id: "admin-user",
        email: "admin@tenant.local",
        is_super_admin: false,
      });

      mockRequirePermission.mockResolvedValueOnce({
        membership: { id: "m-1" },
        role: { code: "admin" },
        permissions: ["users:invite"],
      });

      // Target role is super_admin
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: "00000000-0000-0000-0000-000000000001",
                code: "super_admin",
                name: "Super Admin",
                is_system: true,
              },
            }),
          }),
        }),
      });

      const res = await inviteCompanyUser(companyId, {
        email: "newperson@tenant.local",
        fullName: "New Person",
        roleId: "00000000-0000-0000-0000-000000000001",
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Privilege Escalation Blocked: Only Super Admins can assign the Super Admin role/i);
    });
  });

  describe("2. Last Administrator Protection", () => {
    it("prevents demoting the last active administrator for the company", async () => {
      mockRequireUser.mockResolvedValueOnce({
        id: "admin-1",
        email: "admin@tenant.local",
        is_super_admin: false,
      });

      mockRequirePermission.mockResolvedValueOnce({
        membership: { id: "m-1" },
        role: { code: "admin" },
        permissions: ["users:edit"],
      });

      // 1. Target membership lookup (current role is Admin)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: {
                  id: "target-mem",
                  user_id: "admin-1",
                  role_id: "role-admin",
                  role: { id: "role-admin", code: "admin" },
                  profile: { id: "admin-1", is_super_admin: false },
                },
              }),
            }),
          }),
        }),
      });

      // 2. Target new role lookup (demoting to Employee)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "role-emp", code: "employee", name: "Employee" },
            }),
          }),
        }),
      });

      // 3. Active admins count query (only 1 active admin)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockResolvedValueOnce({
              data: [{ id: "target-mem", role: { code: "admin" } }],
            }),
          }),
        }),
      });

      const res = await updateMemberRole(companyId, "target-mem", "role-emp");

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Cannot demote the last active Administrator/i);
    });

    it("prevents suspending the last active administrator for the company", async () => {
      mockRequireUser.mockResolvedValueOnce({
        id: "admin-1",
        email: "admin@tenant.local",
        is_super_admin: false,
      });

      mockRequirePermission.mockResolvedValueOnce({
        membership: { id: "m-1" },
        role: { code: "admin" },
        permissions: ["users:edit"],
      });

      // 1. Target membership lookup (is admin)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: {
                  id: "target-mem",
                  user_id: "admin-1",
                  role: { code: "admin" },
                },
              }),
            }),
          }),
        }),
      });

      // 2. Active admins count query (only 1 active admin)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockResolvedValueOnce({
              data: [{ id: "target-mem", role: { code: "admin" } }],
            }),
          }),
        }),
      });

      const res = await toggleMemberStatus(companyId, "target-mem", "SUSPENDED");

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Cannot suspend the last active Administrator/i);
    });
  });

  describe("3. System Role Governance", () => {
    it("rejects deleting built-in system roles", async () => {
      mockRequireUser.mockResolvedValueOnce({
        id: "super-1",
        is_super_admin: true,
      });

      mockRequirePermission.mockResolvedValueOnce({
        membership: { id: "m-1" },
        role: { code: "super_admin" },
        permissions: ["roles:delete"],
      });

      // Role lookup returns system role (is_system: true)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: "sys-role-1",
                name: "Admin",
                code: "admin",
                is_system: true,
              },
            }),
          }),
        }),
      });

      const res = await deleteCustomRole(companyId, "sys-role-1");

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Built-in system roles cannot be deleted/i);
    });
  });
});
