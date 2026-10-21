import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitInvoiceToFbrAction,
  getInvoiceFbrPreviewAction,
  cancelFbrInvoiceAction,
} from "@/app/(erp)/sales/actions";
import { getCompanyFbrSettings } from "@/lib/fbr-settings";
import {
  recordTaxpayerVerification,
  getTaxpayerVerificationHistory,
} from "@/lib/fbr-taxpayer-service";
import { recordAuditLog } from "@/lib/audit/server";
import * as authServer from "@/lib/auth/server";
import { ForbiddenError } from "@/lib/auth/server";

// Mock Supabase Server Client
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

describe("FBR Security & Cross-Tenant Isolation Suite", () => {
  const companyAlpha = "tenant-alpha-1111-1111-1111";
  const companyBravo = "tenant-bravo-2222-2222-2222";

  const userAlpha = {
    id: "user-alpha-uuid",
    email: "operator@alpha.example.com",
    full_name: "Alpha Operator",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userBravo = {
    id: "user-bravo-uuid",
    email: "operator@bravo.example.com",
    full_name: "Bravo Operator",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const platformSuperAdmin = {
    id: "super-admin-uuid",
    email: "platform-admin@ithub.corp",
    full_name: "Platform Super Admin",
    is_super_admin: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Cross-Tenant Invoice Access & Submission Safeguards", () => {
    it("strictly blocks user of Company Alpha from previewing an invoice of Company Bravo", async () => {
      // Mock session as userAlpha
      mockGetUser.mockResolvedValue({ data: { user: userAlpha } });

      // Mock memberships check: userAlpha has membership in Alpha, but NOT in Bravo
      mockFrom.mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: userAlpha, error: null }),
              }),
            }),
          };
        }
        if (table === "memberships") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                return {
                  eq: vi.fn().mockImplementation((col2: string, val2: string) => {
                    return {
                      eq: vi.fn().mockImplementation((col3: string, val3: string) => {
                        // If querying for companyBravo, userAlpha is NOT a member
                        return {
                          single: vi.fn().mockResolvedValue({ data: null, error: { message: "No row found" } }),
                        };
                      }),
                    };
                  }),
                };
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      // Calling preview for Company Bravo should fail closed with ForbiddenError
      await expect(
        getInvoiceFbrPreviewAction(companyBravo, "inv-bravo-001")
      ).rejects.toThrow(ForbiddenError);
    });

    it("strictly blocks user of Company Alpha from submitting an invoice of Company Bravo to FBR", async () => {
      // Mock session as userAlpha
      mockGetUser.mockResolvedValue({ data: { user: userAlpha } });

      mockFrom.mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: userAlpha, error: null }),
              }),
            }),
          };
        }
        if (table === "memberships") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not a member" } }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      await expect(
        submitInvoiceToFbrAction(companyBravo, "inv-bravo-001")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("2. Granular Role & Permission Safeguards", () => {
    it("blocks an active user lacking 'invoices:delete' permission from cancelling an FBR invoice", async () => {
      mockGetUser.mockResolvedValue({ data: { user: userAlpha } });

      // User has membership in companyAlpha, but role only has 'invoices:view'
      mockFrom.mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: userAlpha, error: null }),
              }),
            }),
          };
        }
        if (table === "memberships") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: "mem-1",
                        company_id: companyAlpha,
                        user_id: userAlpha.id,
                        status: "ACTIVE",
                        company: { id: companyAlpha, name: "Alpha Traders Ltd", status: "ACTIVE" },
                        role: {
                          id: "role-viewer",
                          code: "viewer",
                          role_permissions: [
                            { permission: { code: "invoices:view" } },
                          ],
                        },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      await expect(
        cancelFbrInvoiceAction(companyAlpha, "inv-alpha-001", "Customer requested cancellation")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("3. Platform Administrator Credential Isolation Rule", () => {
    it("does not reveal tenant credentials to a platform administrator without direct tenant membership", async () => {
      // Mock company_settings in DB
      mockFrom.mockImplementation((table: string) => {
        if (table === "company_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    features: {
                      fbr: {
                        enabled: true,
                        environment: "sandbox",
                        sellerNtn: "1234567-8",
                        integratorName: "Pakistan Revenue Automation Limited (PRAL)",
                      },
                    },
                  },
                }),
              }),
            }),
          };
        }
        if (table === "memberships") {
          // Platform super admin does NOT have a row in companyAlpha
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      // Call getCompanyFbrSettings passing platformSuperAdmin
      const overview = await getCompanyFbrSettings(companyAlpha, platformSuperAdmin);

      // Verify that credentials status is restricted and NOT exposed
      expect(overview.credentialsStatus.hasClientId).toBe(false);
      expect(overview.credentialsStatus.hasClientSecret).toBe(false);
      expect(overview.credentialsStatus.maskedClientId).toContain("Restricted (Direct Tenant Membership Required)");
      expect(overview.credentialsStatus.tokenUrl).toBe("[RESTRICTED]");
    });
  });

  describe("4. Data Minimization & Sensitive Data Retention Safeguards", () => {
    it("strictly prevents plain-text retention of 13-digit CNIC in persistent taxpayer history", async () => {
      let savedSettingsPayload: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === "company_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { features: {} },
                }),
              }),
            }),
            update: vi.fn().mockImplementation((payload: any) => {
              savedSettingsPayload = payload;
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      const rawCnic = "42101-1234567-1";
      await recordTaxpayerVerification(companyAlpha, {
        idType: "CNIC",
        rawIdentifier: rawCnic,
        formattedIdentifier: rawCnic,
        validFormat: true,
        status: "Active",
      });

      expect(savedSettingsPayload).not.toBeNull();
      const history = savedSettingsPayload.features.fbr_taxpayer_history;
      expect(history).toHaveLength(1);

      // Verify rawIdentifier is NOT stored as the plain 13-digit CNIC
      expect(history[0].rawIdentifier).not.toBe(rawCnic);
      expect(history[0].rawIdentifier).toBe("42101-*******-1");
      expect(history[0].maskedIdentifier).toBe("42101-*******-1");
    });

    it("ensures history retrieval sanitizes all identifier fields across the tenant", async () => {
      vi.spyOn(authServer, "requireCompanyMembership").mockResolvedValue({
        company: { id: companyAlpha },
        role: "admin",
        user: userAlpha,
      } as any);

      mockFrom.mockImplementation((table: string) => {
        if (table === "company_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    features: {
                      fbr_taxpayer_history: [
                        {
                          id: "ver-1",
                          companyId: companyAlpha,
                          idType: "CNIC",
                          rawIdentifier: "42101-9999999-3",
                          formattedIdentifier: "42101-9999999-3",
                          maskedIdentifier: "42101-*******-3",
                          status: "Active",
                        },
                      ],
                    },
                  },
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      const records = await getTaxpayerVerificationHistory(companyAlpha);
      expect(records).toHaveLength(1);
      expect(records[0].rawIdentifier).toBe("42101-*******-3");
      expect(records[0].formattedIdentifier).toBe("42101-*******-3");
    });
  });
});
