import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCompanySettings, updateCompanySettings } from "@/lib/company/server";
import { ForbiddenError } from "@/lib/auth/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

describe("Company Settings Server Service", () => {
  const companyId = "company-tenant-uuid";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Authorization & Permission Checks", () => {
    it("fails closed when caller does not possess settings:view permission", async () => {
      // Caller has standard employee role (no settings:view)
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "user-1", email: "user@tenant.local", user_metadata: {} },
        },
      });

      // Mock profiles lookup
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "user-1", email: "user@tenant.local", is_super_admin: false },
            }),
          }),
        }),
      });

      // Mock memberships lookup
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                single: vi.fn().mockResolvedValueOnce({
                  data: {
                    id: "membership-1",
                    company_id: companyId,
                    user_id: "user-1",
                    role_id: "role-employee",
                    status: "ACTIVE",
                    role: { id: "role-employee", code: "employee", name: "Employee" },
                    company: { id: companyId, name: "Acme Corp" },
                  },
                }),
              }),
            }),
          }),
        }),
      });

      // Mock role_permissions lookup returning only inventory:view
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [{ permission: { code: "inventory:view" } }],
          }),
        }),
      });

      await expect(getCompanySettings(companyId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe("2. Validation & Persistence", () => {
    it("rejects invalid ISO currency or empty company name with validation errors", async () => {
      // Super admin caller
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "admin-1", email: "admin@platform.corp", user_metadata: {} },
        },
      });

      // Mock profiles lookup for Super Admin
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: "admin-1", email: "admin@platform.corp", is_super_admin: true },
            }),
          }),
        }),
      });

      // Mock company lookup for super admin context
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: companyId, name: "Acme Corp" },
            }),
          }),
        }),
      });

      const result = await updateCompanySettings(companyId, {
        name: "A", // too short (min 2)
        currency: "INVALID", // too long (length 3 required)
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.name).toBeDefined();
      expect(result.errors?.currency).toBeDefined();
    });
  });
});
