import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  FbrTaxpayerProviderAdapter,
  getTaxpayerProviderAdapter,
} from "@/lib/fbr-provider-adapter";
import {
  verifyFbrTaxpayer,
  recordTaxpayerVerification,
  getTaxpayerVerificationHistory,
} from "@/lib/fbr-taxpayer-service";
import * as fbrApi from "@/lib/fbr-api";
import * as authServer from "@/lib/auth/server";
import { ForbiddenError } from "@/lib/auth/server";

// Mock Supabase Server Client for audit persistence & tenant isolation tests
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/audit/server", () => ({
  recordAuditLog: vi.fn().mockResolvedValue({}),
}));

describe("Comprehensive FBR Taxpayer Verification Scenarios Suite", () => {
  const companyAlpha = "tenant-alpha-0000-0000-0000-000000000001";
  const companyBravo = "tenant-bravo-0000-0000-0000-000000000002";

  const userAlpha = {
    id: "user-alpha-id",
    email: "alpha.operator@test.pk",
  };

  const validCnic = "16101-5419566-3";
  const validNtn = "7654321-8";

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.FBR_CLIENT_ID;
    delete process.env.FBR_CLIENT_SECRET;
    delete process.env.FBR_ATL_INQUIRY_URL;
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 1: SUCCESSFUL RESULTS (VERIFIED ACTIVE & REGISTERED)
  // ---------------------------------------------------------------------------
  describe("Scenario 1: Successful Verification Results", () => {
    it("processes a compliant taxpayer with confirmed active standing across all 3 indicators", async () => {
      process.env.FBR_CLIENT_ID = "test_client_id_live";
      process.env.FBR_CLIENT_SECRET = "test_client_secret_live";
      vi.spyOn(fbrApi, "getFbrAccessToken").mockResolvedValue("mock_token_success");

      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("service=sales_tax_reg")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              status: "SUCCESS",
              sales_tax_registration_type: "Registered",
              strn: "0102030405060",
              category: "Wholesaler / Distributor",
              reference_number: "FBR-STR-2026-OK",
            }),
          };
        }
        if (url.includes("service=sales_tax_atl")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              status: "SUCCESS",
              sales_tax_atl: "Active",
              sales_tax_active: true,
              reference_number: "FBR-STATL-2026-OK",
            }),
          };
        }
        if (url.includes("service=income_tax_atl")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              status: "SUCCESS",
              atl_status: "Active",
              is_active_taxpayer: true,
              reference_number: "FBR-INC-2026-OK",
            }),
          };
        }
        return { ok: false, status: 404 };
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.verifyAllThreeChecks(validNtn, "WS / Distributor");

      // 1. Sales Tax Reg Type
      expect(res.salesTaxReg.success).toBe(true);
      expect(res.salesTaxReg.status).toBe("Registered");
      expect(res.salesTaxReg.strn).toBe("0102030405060");
      expect(res.salesTaxReg.category).toBe("Wholesaler / Distributor");
      expect(res.salesTaxReg.source).toBe("AUTOMATED_GATEWAY");

      // 2. Sales Tax ATL
      expect(res.salesTaxAtl.success).toBe(true);
      expect(res.salesTaxAtl.status).toBe("Verified Active");
      expect(res.salesTaxAtl.referenceNumber).toBe("FBR-STATL-2026-OK");
      expect(res.salesTaxAtl.source).toBe("AUTOMATED_GATEWAY");

      // 3. Income Tax ATL
      expect(res.incomeTaxAtl.success).toBe(true);
      expect(res.incomeTaxAtl.status).toBe("Verified Active");
      expect(res.incomeTaxAtl.isFiler).toBe(true);
      expect(res.incomeTaxAtl.withholdingTaxSection).toBe("Section 236G");
      expect(res.incomeTaxAtl.activeRate).toContain("0.1%");
      expect(res.incomeTaxAtl.source).toBe("AUTOMATED_GATEWAY");

      // Verification timestamp recorded
      expect(res.salesTaxReg.verifiedAt).toBeDefined();
      expect(res.salesTaxAtl.verifiedAt).toBeDefined();
      expect(res.incomeTaxAtl.verifiedAt).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: NEGATIVE RESULTS (CONFIRMED INACTIVE / NON-FILER)
  // ---------------------------------------------------------------------------
  describe("Scenario 2: Negative Results (Confirmed Inactive / Non-Filer)", () => {
    it("accurately handles a confirmed negative response from FBR without treating it as an error", async () => {
      process.env.FBR_CLIENT_ID = "test_client_id_live";
      process.env.FBR_CLIENT_SECRET = "test_client_secret_live";
      vi.spyOn(fbrApi, "getFbrAccessToken").mockResolvedValue("mock_token_negative");

      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("service=sales_tax_reg")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              status: "SUCCESS",
              sales_tax_registration_type: "Unregistered",
              is_sales_tax_registered: false,
            }),
          };
        }
        if (url.includes("service=sales_tax_atl")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              status: "SUCCESS",
              sales_tax_atl: "Inactive",
              sales_tax_active: false,
            }),
          };
        }
        if (url.includes("service=income_tax_atl")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              status: "SUCCESS",
              atl_status: "Inactive",
              is_active_taxpayer: false,
            }),
          };
        }
        return { ok: false, status: 404 };
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.verifyAllThreeChecks(validCnic, "Retailer");

      // 1. Sales Tax Reg Type
      expect(res.salesTaxReg.status).toBe("Unregistered");
      expect(res.salesTaxReg.details).toContain("No Sales Tax Registration found");

      // 2. Sales Tax ATL
      expect(res.salesTaxAtl.status).toBe("Verified Inactive");

      // 3. Income Tax ATL
      expect(res.incomeTaxAtl.status).toBe("Verified Inactive");
      expect(res.incomeTaxAtl.isFiler).toBe(false);
      // Double withholding tax applies to non-filers under Section 236H
      expect(res.incomeTaxAtl.details).toContain("Non-filer penalty (1.0% (Non-Filer 2x Penalty)) applies");
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: MISSING RECORDS (HTTP 404 NOT FOUND)
  // ---------------------------------------------------------------------------
  describe("Scenario 3: Missing Records (HTTP 404)", () => {
    it("handles missing records as Not Found and never marks them as false inactive", async () => {
      process.env.FBR_CLIENT_ID = "test_client_id_live";
      process.env.FBR_CLIENT_SECRET = "test_client_secret_live";
      vi.spyOn(fbrApi, "getFbrAccessToken").mockResolvedValue("mock_token_404");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.verifyAllThreeChecks(validNtn, "Retailer");

      // 404 must be reported as Not Found, never false inactive
      expect(res.salesTaxReg.status).toBe("Not Found");
      expect(res.salesTaxReg.status).not.toBe("Unregistered");

      expect(res.salesTaxAtl.status).toBe("Not Found");
      expect(res.salesTaxAtl.status).not.toBe("Verified Inactive");

      expect(res.incomeTaxAtl.status).toBe("Not Found");
      expect(res.incomeTaxAtl.status).not.toBe("Verified Inactive");
      expect(res.incomeTaxAtl.isFiler).toBe(false);

      // Official portal links remain accessible
      expect(res.salesTaxReg.officialPortalUrl).toBe("https://iris.fbr.gov.pk/");
      expect(res.salesTaxAtl.officialPortalUrl).toBe("https://www.fbr.gov.pk/atl-sales-tax/163223");
      expect(res.incomeTaxAtl.officialPortalUrl).toContain("active-taxpayer-list-income-tax");
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4: NETWORK FAILURES, TIMEOUTS, 5XX & 429
  // ---------------------------------------------------------------------------
  describe("Scenario 4: Network Failures, Timeouts, Server Errors & Rate Limits", () => {
    beforeEach(() => {
      process.env.FBR_CLIENT_ID = "test_client_id_live";
      process.env.FBR_CLIENT_SECRET = "test_client_secret_live";
      vi.spyOn(fbrApi, "getFbrAccessToken").mockResolvedValue("mock_token_network");
    });

    it("handles request timeouts as Unable to Verify and never as inactive", async () => {
      const timeoutErr = new Error("The operation was aborted due to timeout");
      timeoutErr.name = "TimeoutError";
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutErr));

      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkIncomeTaxATL("CNIC", validCnic);

      expect(res.success).toBe(false);
      expect(res.status).toBe("Unable to Verify");
      expect(res.status).not.toBe("Verified Inactive");
      expect(res.details).toContain("A failed connection is NOT proof of inactive status");
      expect(res.smsInstruction).toContain("9966");
    });

    it("handles 502/503 service outages as Unable to Verify and never as inactive", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      }));

      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkSalesTaxATL("CNIC", validCnic);

      expect(res.success).toBe(false);
      expect(res.status).toBe("Unable to Verify");
      expect(res.status).not.toBe("Verified Inactive");
      expect(res.details).toContain("A service error is NOT proof of inactive status");
    });

    it("handles 429 rate limits as Unable to Verify with explicit retry/portal advisory", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      }));

      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkSalesTaxRegistration("NTN", validNtn);

      expect(res.success).toBe(false);
      expect(res.status).toBe("Unable to Verify");
      expect(res.status).not.toBe("Unregistered");
      expect(res.details).toContain("rate limit exceeded (HTTP 429)");
      expect(res.officialPortalUrl).toBe("https://iris.fbr.gov.pk/");
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 5: UNAUTHORIZED REQUESTS & MISSING CREDENTIALS
  // ---------------------------------------------------------------------------
  describe("Scenario 5: Unauthorized Requests & Missing Credentials", () => {
    it("safely falls back to manual workflow without making unauthenticated outbound calls when credentials are missing", async () => {
      delete process.env.FBR_CLIENT_ID;
      delete process.env.FBR_CLIENT_SECRET;
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.verifyAllThreeChecks(validCnic, "Retailer");

      // No network calls made when credentials are unconfigured
      expect(fetchSpy).not.toHaveBeenCalled();

      // Truthful pending/unverified status with official links
      expect(res.indicators.salesTaxRegType.status).toBe("Pending");
      expect(res.indicators.salesTaxAtl.status).toBe("Pending");
      expect(res.indicators.incomeTaxAtl.status).toBe("Pending");
      expect(res.indicators.incomeTaxAtl.isFiler).toBe(false);

      expect(res.salesTaxReg.source).toBe("FORMAT_VALIDATED_ONLY");
      expect(res.salesTaxAtl.smsInstruction).toContain("9966");
      expect(res.incomeTaxAtl.smsInstruction).toContain("9966");
    });
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 6: MULTI-TENANT ISOLATION
  // ---------------------------------------------------------------------------
  describe("Scenario 6: Cross-Tenant Isolation Enforcement", () => {
    it("enforces tenant membership: blocks unauthorized company verification execution", async () => {
      // Mock requireCompanyMembership to throw ForbiddenError for user not in company
      vi.spyOn(authServer, "requireCompanyMembership").mockRejectedValue(
        new ForbiddenError("Access denied: You are not a member of this company")
      );

      const adapter = getTaxpayerProviderAdapter(companyBravo);

      await expect(adapter.verifyAllThreeChecks(validCnic)).rejects.toThrow(
        /Access denied: You are not a member of this company/
      );
    });

    it("isolates tenant verification audit records: Company Alpha cannot read Company Bravo records", async () => {
      mockGetUser.mockResolvedValue({ data: { user: userAlpha } });

      // Mock DB: When querying for Company Alpha, returns Alpha records. When querying for Bravo, returns only Bravo.
      const mockAlphaRecords = [
        {
          id: "rec-1",
          companyId: companyAlpha,
          maskedIdentifier: "16101-*******-3",
          rawIdentifier: "16101-*******-3",
          formattedIdentifier: "16101-*******-3",
          idType: "CNIC" as const,
          status: "Active" as const,
          source: "AUTOMATED_GATEWAY" as const,
          verifiedAt: new Date().toISOString(),
          validFormat: true,
          isFiler: true,
        },
      ];

      // Mock requireCompanyMembership to allow companyAlpha and reject companyBravo
      vi.spyOn(authServer, "requireCompanyMembership").mockImplementation(async (compId: string) => {
        if (compId === companyAlpha) {
          return { company: { id: companyAlpha }, role: "admin", user: userAlpha } as any;
        }
        throw new ForbiddenError("Access denied: You are not a member of this company");
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "company_settings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col: string, compId: string) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data:
                    compId === companyAlpha
                      ? { features: { fbr_taxpayer_history: mockAlphaRecords } }
                      : { features: {} },
                  error: null,
                }),
              })),
            }),
          };
        }
        return { select: vi.fn() };
      });

      // User Alpha fetching their own company history succeeds
      const alphaHistory = await getTaxpayerVerificationHistory(companyAlpha);
      expect(alphaHistory.length).toBe(1);
      expect(alphaHistory[0].maskedIdentifier).toBe("16101-*******-3");

      // User Alpha querying Company Bravo history is blocked by tenant security
      await expect(getTaxpayerVerificationHistory(companyBravo)).rejects.toThrow(
        /Access denied: You are not a member of this company/
      );
    });
  });
});
