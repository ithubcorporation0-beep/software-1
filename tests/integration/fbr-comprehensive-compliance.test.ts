import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateTaxId,
  maskTaxIdentifier,
} from "@/lib/fbr-validation";
import {
  verifyFbrTaxpayer,
  recordTaxpayerVerification,
  getTaxpayerVerificationHistory,
} from "@/lib/fbr-taxpayer-service";
import {
  getCompanyFbrSettings,
  testFbrConnection,
  deriveEffectiveStatus,
} from "@/lib/fbr-settings";
import {
  getFbrEndpoints,
  validateInvoiceForFbr,
  constructFbrInvoicePayload,
  submitInvoiceToFbrService,
  reconcileInvoiceFbrStatusService,
} from "@/lib/fbr-service";
import { recordAuditLog } from "@/lib/audit/server";
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

describe("Comprehensive FBR Compliance & Diagnostics Suite (13 Core Scenarios)", () => {
  const companyAlpha = "00000000-0000-0000-0000-000000000001";
  const companyBravo = "00000000-0000-0000-0000-000000000002";
  const invoiceId1 = "11111111-1111-1111-1111-111111111111";

  const userAlpha = {
    id: "user-alpha",
    email: "alpha@example.com",
    is_super_admin: false,
  };

  const validInvoiceDoc = {
    id: invoiceId1,
    company_id: companyAlpha,
    invoice_number: "INV-2026-9001",
    issue_date: "2026-10-21",
    due_date: "2026-11-21",
    subtotal: 10000,
    discount_total: 0,
    tax_rate: 18,
    tax_total: 1800,
    grand_total: 11800,
    currency: "PKR",
    status: "Sent",
    fbr_status: "PENDING",
    customer: {
      id: "cust-1",
      name: "Standard Retailers Ltd",
      tax_number: "7654321-8",
      customer_type: "b2b",
    },
    items: [
      {
        id: "item-1",
        description: "Cloud ERP Server Instance",
        quantity: 2,
        unit_price: 5000,
        tax_pct: 18,
        tax_amount: 1800,
        line_total: 11800,
        discount_amount: 0,
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.FBR_CLIENT_ID;
    delete process.env.FBR_CLIENT_SECRET;
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Valid and invalid identifier formats
  // --------------------------------------------------------------------------
  describe("Scenario 1: Valid and invalid identifier formats", () => {
    it("accepts valid 13-digit CNIC and valid Modulo-11 NTN", () => {
      const cnic = validateTaxId("16101-5419566-3");
      expect(cnic.isValid).toBe(true);
      expect(cnic.type).toBe("CNIC");
      expect(cnic.formatted).toBe("16101-5419566-3");

      const ntn = validateTaxId("7654321-8");
      expect(ntn.isValid).toBe(true);
      expect(ntn.type).toBe("NTN");
      expect(ntn.formatted).toBe("7654321-8");
    });

    it("rejects invalid length, non-numeric characters, and check digit mismatches", () => {
      const badLen = validateTaxId("12345");
      expect(badLen.isValid).toBe(false);
      expect(badLen.errorMessage).toBeDefined();

      const nonNum = validateTaxId("16101-ABC-3");
      expect(nonNum.isValid).toBe(false);

      const badCheckDigit = validateTaxId("7654321-0");
      expect(badCheckDigit.isValid).toBe(false);
      expect(badCheckDigit.errorMessage).toContain("Expected check digit was 8");
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Manual versus automated verification
  // --------------------------------------------------------------------------
  describe("Scenario 2: Manual versus automated verification", () => {
    it("distinguishes manual portal verification from automated gateway checks", async () => {
      let savedRecord: any = null;
      mockFrom.mockImplementation((table: string) => {
        if (table === "company_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { features: {} } }),
              }),
            }),
            update: vi.fn().mockImplementation((payload) => {
              savedRecord = payload.features.fbr_taxpayer_history[0];
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      // 1. Record a manual portal verification
      await recordTaxpayerVerification(companyAlpha, {
        idType: "CNIC",
        rawIdentifier: "16101-5419566-3",
        source: "MANUAL_PORTAL",
        status: "Active (Manual Verification)",
        referenceNumber: "FBR-MANUAL-VER-9988",
        verifiedBy: "Compliance Officer",
      });

      expect(savedRecord).not.toBeNull();
      expect(savedRecord.source).toBe("MANUAL_PORTAL");
      expect(savedRecord.referenceNumber).toBe("FBR-MANUAL-VER-9988");
      expect(savedRecord.source).not.toBe("AUTOMATED_GATEWAY");
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Missing credentials
  // --------------------------------------------------------------------------
  describe("Scenario 3: Missing credentials", () => {
    it("safely disables real submissions with informative alert when credentials are not configured", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "invoices") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: validInvoiceDoc, error: null }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      const result = await submitInvoiceToFbrService(companyAlpha, invoiceId1);
      expect(result.success).toBe(false);
      expect(result.status).toBe("REJECTED");
      expect(result.message).toContain("Real FBR submissions are disabled: Authorized gateway credentials");
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Invalid credentials
  // --------------------------------------------------------------------------
  describe("Scenario 4: Invalid credentials", () => {
    it("handles 401 Unauthorized from FBR OAuth server and records sanitized failure", async () => {
      process.env.FBR_CLIENT_ID = "bad_client_id";
      process.env.FBR_CLIENT_SECRET = "bad_client_secret";

      mockGetUser.mockResolvedValue({ data: { user: userAlpha } });

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
                        integratorName: "PRAL",
                        sellerNtn: "1234567-8",
                      },
                    },
                  },
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (table === "profiles") {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: userAlpha }) }) }) };
        }
        if (table === "memberships") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        status: "ACTIVE",
                        company: { id: companyAlpha, name: "Alpha Corp", status: "ACTIVE" },
                        role: { code: "admin", role_permissions: [{ permission: { code: "settings:edit" } }] },
                      },
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      });

      // Mock OAuth endpoint returning 401
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "invalid_client", error_description: "Client authentication failed for bad_client_id" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const testResult = await testFbrConnection(companyAlpha);
      expect(testResult.success).toBe(false);
      expect(testResult.status).toBe("Connection Error");
      expect(testResult.message).toContain("Connection Error");
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Network failures and timeouts
  // --------------------------------------------------------------------------
  describe("Scenario 5: Network failures and timeouts", () => {
    it("marks invoice status as UNKNOWN when dispatch encounters a network timeout", async () => {
      process.env.FBR_CLIENT_ID = "valid_client";
      process.env.FBR_CLIENT_SECRET = "valid_secret";

      let updatedFbrStatus: string | null = null;
      mockFrom.mockImplementation((table: string) => {
        if (table === "invoices") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: validInvoiceDoc, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockImplementation((payload) => {
              if (payload.fbr_status) updatedFbrStatus = payload.fbr_status;
              return { eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      // Mock Validate API passing, but Submit API timing out
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("token")) {
          return { ok: true, status: 200, json: async () => ({ access_token: "tok-123", expires_in: 3600 }) };
        }
        if (url.includes("validate")) {
          return { ok: true, status: 200, json: async () => ({ status: "SUCCESS", valid: true }) };
        }
        if (url.includes("submit")) {
          const abortError = new Error("The operation was aborted");
          abortError.name = "AbortError";
          throw abortError;
        }
        throw new Error(`Unexpected call to ${url}`);
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await submitInvoiceToFbrService(companyAlpha, invoiceId1);
      expect(result.success).toBe(false);
      expect(result.status).toBe("UNKNOWN");
      expect(result.message).toContain("Submission Network Timeout");
      expect(updatedFbrStatus).toBe("UNKNOWN");
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Invoice validation and tax totals
  // --------------------------------------------------------------------------
  describe("Scenario 6: Invoice statutory validation and tax totals reconciliation", () => {
    it("catches arithmetic discrepancies between line items and whole invoice totals", () => {
      const mismatchedInvoice = {
        invoice: {
          invoice_number: "INV-2026-9002",
          issue_date: "2026-10-21",
          subtotal: 10000,
          tax_rate: 18,
          tax_total: 1800,
          grand_total: 15000, // Should be 11800
        },
        customer: {
          name: "Retail Traders",
          tax_number: "7654321-8",
        },
        items: [
          {
            id: "i-1",
            description: "Server",
            quantity: 2,
            unit_price: 5000,
            tax_pct: 18,
            tax_amount: 1800,
            line_total: 11800,
          },
        ],
        sellerNtn: "1234567-8",
      };

      const { isValid, checks } = validateInvoiceForFbr(mismatchedInvoice);
      expect(isValid).toBe(false);

      const totalCheck = checks.find((c) => c.ruleId === "totals_arithmetic_consistency");
      expect(totalCheck?.passed).toBe(false);
      expect(totalCheck?.message).toContain("Invoice totals reconciliation error");
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Provider rejection
  // --------------------------------------------------------------------------
  describe("Scenario 7: Provider rejection", () => {
    it("halts submission when FBR Validate API returns statutory rejections", async () => {
      process.env.FBR_CLIENT_ID = "valid_client";
      process.env.FBR_CLIENT_SECRET = "valid_secret";

      mockFrom.mockImplementation((table: string) => {
        if (table === "invoices") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: validInvoiceDoc, error: null }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("token")) {
          return { ok: true, status: 200, json: async () => ({ access_token: "tok-123", expires_in: 3600 }) };
        }
        if (url.includes("validate")) {
          return {
            ok: false,
            status: 422,
            json: async () => ({
              status: "FAIL",
              errors: ["Seller STRN registration expired", "HS Code 8471.3020 tariff suspended"],
            }),
          };
        }
        throw new Error(`Submit must not be called`);
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await submitInvoiceToFbrService(companyAlpha, invoiceId1);
      expect(result.success).toBe(false);
      expect(result.status).toBe("REJECTED");
      expect(result.errors).toContain("Seller STRN registration expired");
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Duplicate submissions
  // --------------------------------------------------------------------------
  describe("Scenario 8: Duplicate submissions", () => {
    it("blocks submission of an invoice already cleared with an official IRN", async () => {
      const alreadyClearedDoc = {
        ...validInvoiceDoc,
        fbr_status: "ACCEPTED",
        fbr_irn: "IRN-CLEARED-99887766",
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "invoices") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: alreadyClearedDoc, error: null }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      const result = await submitInvoiceToFbrService(companyAlpha, invoiceId1);
      expect(result.success).toBe(false);
      expect(result.status).toBe("ACCEPTED");
      expect(result.message).toContain("Duplicate Submission Blocked");
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Unknown submission outcomes & reconciliation
  // --------------------------------------------------------------------------
  describe("Scenario 9: Unknown submission outcomes & reconciliation", () => {
    it("blocks automatic re-submission when an invoice is in UNKNOWN state and requires reconciliation", async () => {
      const unknownDoc = {
        ...validInvoiceDoc,
        fbr_status: "UNKNOWN",
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "invoices") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: unknownDoc, error: null }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      const result = await submitInvoiceToFbrService(companyAlpha, invoiceId1);
      expect(result.success).toBe(false);
      expect(result.status).toBe("UNKNOWN");
      expect(result.message).toContain("Uncertain Outcome Blocked");
    });

    it("successfully reconciles an UNKNOWN invoice back to ACCEPTED when inquiry returns cleared IRN", async () => {
      process.env.FBR_CLIENT_ID = "valid_client";
      process.env.FBR_CLIENT_SECRET = "valid_secret";

      const unknownDoc = {
        ...validInvoiceDoc,
        fbr_status: "UNKNOWN",
      };

      let reconciledStatus: string | null = null;
      mockFrom.mockImplementation((table: string) => {
        if (table === "invoices") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: unknownDoc, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockImplementation((payload) => {
              if (payload.fbr_status) reconciledStatus = payload.fbr_status;
              return { eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("token")) {
          return { ok: true, status: 200, json: async () => ({ access_token: "tok-123", expires_in: 3600 }) };
        }
        // Reconciliation status endpoint
        return {
          ok: true,
          status: 200,
          json: async () => ({
            found: true,
            status: "ACCEPTED",
            fbr_irn: "IRN-RECONCILED-998811",
          }),
        };
      });
      vi.stubGlobal("fetch", mockFetch);

      const reconcileResult = await reconcileInvoiceFbrStatusService(companyAlpha, invoiceId1);
      expect(reconcileResult.success).toBe(true);
      expect(reconcileResult.status).toBe("ACCEPTED");
      expect(reconcileResult.data?.fbr_irn).toBe("IRN-RECONCILED-998811");
      expect(reconciledStatus).toBe("ACCEPTED");
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Tenant isolation
  // --------------------------------------------------------------------------
  describe("Scenario 10: Tenant isolation", () => {
    it("ensures invoice lookup strictly enforces company tenant boundary", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "invoices") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col1, val1) => {
                return {
                  eq: vi.fn().mockImplementation((col2, val2) => {
                    // If querying for companyBravo with invoiceId1, return null
                    if (val2 === companyBravo) {
                      return { single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }) };
                    }
                    return { single: vi.fn().mockResolvedValue({ data: validInvoiceDoc, error: null }) };
                  }),
                };
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      // Calling for companyBravo with invoice of companyAlpha fails closed
      const result = await submitInvoiceToFbrService(companyBravo, invoiceId1);
      expect(result.success).toBe(false);
      expect(result.message).toContain("was not found in company tenant");
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 11: Unauthorized access
  // --------------------------------------------------------------------------
  describe("Scenario 11: Unauthorized access", () => {
    it("fails closed with 403 Forbidden when caller lacks membership in company", async () => {
      mockGetUser.mockResolvedValue({ data: { user: userAlpha } });

      mockFrom.mockImplementation((table: string) => {
        if (table === "profiles") {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: userAlpha }) }) }) };
        }
        if (table === "memberships") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: { message: "No active membership" } }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      // Importing and testing action level permission check
      const { submitInvoiceToFbrAction } = await import("@/app/(erp)/sales/actions");
      await expect(submitInvoiceToFbrAction(companyBravo, invoiceId1)).rejects.toThrow(ForbiddenError);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Sandbox / production separation
  // --------------------------------------------------------------------------
  describe("Scenario 12: Sandbox / production separation", () => {
    it("resolves distinct endpoint routes and statuses for sandbox versus production", () => {
      const sandboxEndpoints = getFbrEndpoints("sandbox");
      const prodEndpoints = getFbrEndpoints("production");

      expect(sandboxEndpoints.validateUrl).toContain("sandbox");
      expect(sandboxEndpoints.submitUrl).toContain("sandbox");

      expect(prodEndpoints.validateUrl).not.toContain("sandbox");
      expect(prodEndpoints.submitUrl).not.toContain("sandbox");

      // Verify status derivation
      const sandboxStatus = deriveEffectiveStatus(
        { enabled: true, environment: "sandbox", integratorName: "PRAL", lastTestStatus: "SUCCESS" },
        { hasClientId: true, hasClientSecret: true, maskedClientId: "pral••••", hasSellerNtn: true, tokenUrl: "", validateUrl: "", submitUrl: "", inquiryUrl: "" }
      );
      expect(sandboxStatus).toBe("Sandbox Connected");

      const prodStatus = deriveEffectiveStatus(
        { enabled: true, environment: "production", integratorName: "PRAL", lastTestStatus: "SUCCESS" },
        { hasClientId: true, hasClientSecret: true, maskedClientId: "pral••••", hasSellerNtn: true, tokenUrl: "", validateUrl: "", submitUrl: "", inquiryUrl: "" }
      );
      expect(prodStatus).toBe("Production Connected");
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 13: Secret leakage in logs and responses
  // --------------------------------------------------------------------------
  describe("Scenario 13: Secret leakage in logs and responses", () => {
    it("ensures national IDs, client secrets, and passwords are never retained in plain text", async () => {
      let loggedPayload: any = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === "audit_logs") {
          return {
            insert: vi.fn().mockImplementation((payload) => {
              loggedPayload = payload;
              return { error: null };
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      });

      await recordAuditLog({
        companyId: companyAlpha,
        action: "security.test_redaction",
        resource: "test",
        details: {
          clientSecret: "fbr_super_secret_key_12345",
          password: "my_plaintext_password",
          cnic: "42101-1234567-1",
          safeAttribute: "Public Organization Name",
        },
      });

      expect(loggedPayload).not.toBeNull();
      const details = loggedPayload.details;
      expect(details.clientSecret).toBe("[REDACTED]");
      expect(details.password).toBe("[REDACTED]");
      expect(details.cnic).toBe("[REDACTED]");
      expect(details.safeAttribute).toBe("Public Organization Name");
    });
  });
});
