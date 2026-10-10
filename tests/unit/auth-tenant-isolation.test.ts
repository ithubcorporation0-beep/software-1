import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireUser,
  requireCompanyMembership,
  requirePermission,
  isSuperAdmin,
  AuthError,
  ForbiddenError,
} from "@/lib/auth/server";
import { Profile, Company, Role, Membership } from "@/types/database.types";

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

describe("Server-Side Authorization & Tenant Isolation (Fail-Closed)", () => {
  const companyA: Company = {
    id: "company-a-uuid",
    name: "Company A Corp",
    slug: "company-a",
    plan: "ENTERPRISE",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const companyB: Company = {
    id: "company-b-uuid",
    name: "Company B Ltd",
    slug: "company-b",
    plan: "PROFESSIONAL",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userAlice: Profile = {
    id: "user-alice-uuid",
    email: "alice@company-a.com",
    full_name: "Alice Engineer",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userSuperAdmin: Profile = {
    id: "user-super-uuid",
    email: "admin@platform.corp",
    full_name: "Global Platform Super Admin",
    is_super_admin: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const roleEmployee: Role = {
    id: "role-emp-uuid",
    name: "Employee",
    code: "employee",
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const roleManager: Role = {
    id: "role-mgr-uuid",
    name: "Manager",
    code: "manager",
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Unauthenticated Access Protection", () => {
    it("fails closed and rejects unauthenticated request with 401 AuthError", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error("No active session"),
      });

      await expect(requireUser()).rejects.toThrow(AuthError);
    });
  });

  describe("2. Multi-Tenant Membership Isolation (Company A vs Company B)", () => {
    it("allows Company A member to access Company A data", async () => {
      // Mock membership lookup in Company A
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: "mem-alice-a",
            company_id: companyA.id,
            user_id: userAlice.id,
            role_id: roleManager.id,
            status: "ACTIVE",
            company: companyA,
            role: roleManager,
          },
          error: null,
        }),
      });

      // Mock role permissions
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [
            { permission: { code: "inventory:view" } },
            { permission: { code: "inventory:create" } },
          ],
        }),
      });

      const context = await requireCompanyMembership(companyA.id, userAlice);
      expect(context.company.id).toBe(companyA.id);
      expect(context.permissions).toContain("inventory:view");
      expect(context.permissions).toContain("inventory:create");
    });

    it("STRICTLY REJECTS Company A user trying to access Company B (403 Forbidden)", async () => {
      // Mock membership lookup in Company B: NOT FOUND
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: "Row not found" },
        }),
      });

      await expect(requireCompanyMembership(companyB.id, userAlice)).rejects.toThrow(
        /does not possess verified membership/i
      );
    });

    it("rejects suspended membership in Company A (403 Forbidden)", async () => {
      // Mock membership lookup: status = 'SUSPENDED' (eq("status", "ACTIVE") returns null)
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: null,
          error: { message: "No active membership" },
        }),
      });

      await expect(requireCompanyMembership(companyA.id, userAlice)).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe("3. Granular Role & Permission Enforcement", () => {
    it("permits action when user role possesses the permission", async () => {
      // Mock membership lookup
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: "mem-alice-a",
            company_id: companyA.id,
            user_id: userAlice.id,
            role_id: roleManager.id,
            status: "ACTIVE",
            company: companyA,
            role: roleManager,
          },
          error: null,
        }),
      });

      // Mock role permissions
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [{ permission: { code: "inventory:create" } }],
        }),
      });

      const context = await requirePermission(companyA.id, "inventory:create", userAlice);
      expect(context.role.code).toBe("manager");
    });

    it("fails closed when user role lacks the required permission (403 Forbidden)", async () => {
      // Mock user Alice with Employee role
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: "mem-alice-a",
            company_id: companyA.id,
            user_id: userAlice.id,
            role_id: roleEmployee.id,
            status: "ACTIVE",
            company: companyA,
            role: roleEmployee,
          },
          error: null,
        }),
      });

      // Employee role has only inventory:view, not inventory:delete
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValueOnce({
          data: [{ permission: { code: "inventory:view" } }],
        }),
      });

      await expect(
        requirePermission(companyA.id, "inventory:delete", userAlice)
      ).rejects.toThrow(/missing required permission \[inventory:delete\]/i);
    });
  });

  describe("4. Super Admin Platform Oversight", () => {
    it("grants universal override across any company and permission for Super Admin", async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: companyB,
          error: null,
        }),
      });

      const context = await requirePermission(companyB.id, "finance:approve", userSuperAdmin);
      expect(context.role.code).toBe("super_admin");
      expect(context.permissions).toContain("*");
    });
  });
});
