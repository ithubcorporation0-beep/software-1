import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  FbrTaxpayerProviderAdapter,
  getTaxpayerProviderAdapter,
} from "@/lib/fbr-provider-adapter";
import * as fbrApi from "@/lib/fbr-api";
import * as authServer from "@/lib/auth/server";

describe("FBR Taxpayer Verification Provider Adapter Suite", () => {
  const mockCompanyId = "00000000-0000-0000-0000-000000000001";
  const validCnic = "16101-5419566-3";
  const validNtn = "7654321-8";
  const invalidId = "161015419561411"; // 15 digits (invalid)

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.FBR_CLIENT_ID;
    delete process.env.FBR_CLIENT_SECRET;
    delete process.env.FBR_ATL_INQUIRY_URL;
  });

  describe("Tenant Security & Permission Enforcement", () => {
    it("enforces company membership when companyId is supplied to adapter", async () => {
      const membershipSpy = vi.spyOn(authServer, "requireCompanyMembership").mockResolvedValue({
        membership: {} as any,
        role: {} as any,
        company: {} as any,
        permissions: ["*"],
      });

      const adapter = getTaxpayerProviderAdapter(mockCompanyId);
      await adapter.checkIncomeTaxATL("CNIC", validCnic);

      expect(membershipSpy).toHaveBeenCalledTimes(1);
      expect(membershipSpy).toHaveBeenCalledWith(mockCompanyId);
    });

    it("does not trigger requireCompanyMembership when companyId is omitted for general validation", async () => {
      const membershipSpy = vi.spyOn(authServer, "requireCompanyMembership");
      const adapter = new FbrTaxpayerProviderAdapter();
      await adapter.checkIncomeTaxATL("CNIC", validCnic);

      expect(membershipSpy).not.toHaveBeenCalled();
    });
  });

  describe("Check 1: Sales Tax Registration Type (checkSalesTaxRegistration)", () => {
    it("returns Unable to Verify when identifier format is invalid", async () => {
      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkSalesTaxRegistration("CNIC", invalidId);

      expect(res.success).toBe(false);
      expect(res.status).toBe("Unable to Verify");
      expect(res.details).toContain("must be 13 digits");
      expect(res.officialPortalUrl).toBe("https://iris.fbr.gov.pk/");
    });

    it("returns truthful Pending status with official IRIS portal link when gateway is unconfigured", async () => {
      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkSalesTaxRegistration("CNIC", validCnic);

      expect(res.success).toBe(true);
      expect(res.status).toBe("Pending");
      expect(res.source).toBe("FORMAT_VALIDATED_ONLY");
      expect(res.officialPortalUrl).toBe("https://iris.fbr.gov.pk/");
      expect(res.details).toContain("Awaiting live registration inquiry via FBR IRIS Portal");
    });

    it("invokes live provider API when credentials configured and parses registered sales tax status", async () => {
      process.env.FBR_CLIENT_ID = "live_client_id_123";
      process.env.FBR_CLIENT_SECRET = "live_client_secret_456";
      vi.spyOn(fbrApi, "getFbrAccessToken").mockResolvedValue("mock_bearer_token");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          sales_tax_registration_type: "Registered",
          strn: "0102030405060",
          category: "Wholesaler / Distributor",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkSalesTaxRegistration("NTN", validNtn);

      expect(res.success).toBe(true);
      expect(res.status).toBe("Registered");
      expect(res.strn).toBe("0102030405060");
      expect(res.category).toBe("Wholesaler / Distributor");
      expect(res.source).toBe("AUTOMATED_GATEWAY");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Check 2: Sales Tax Active Taxpayer List (checkSalesTaxATL)", () => {
    it("returns Unable to Verify on invalid syntax", async () => {
      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkSalesTaxATL("CNIC", invalidId);

      expect(res.success).toBe(false);
      expect(res.status).toBe("Unable to Verify");
      expect(res.smsInstruction).toBeDefined();
    });

    it("returns truthful Pending status with official Sales Tax ATL link and SMS instructions when unconfigured", async () => {
      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkSalesTaxATL("NTN", validNtn);

      expect(res.success).toBe(true);
      expect(res.status).toBe("Pending");
      expect(res.officialPortalUrl).toBe("https://www.fbr.gov.pk/atl-sales-tax/163223");
      expect(res.smsInstruction).toContain("9966");
      expect(res.details).toContain("SMS to 9966 or FBR Sales Tax ATL page");
    });

    it("invokes live provider API and distinguishes Active vs Inactive sales tax filers", async () => {
      process.env.FBR_CLIENT_ID = "live_client_id_123";
      process.env.FBR_CLIENT_SECRET = "live_client_secret_456";
      vi.spyOn(fbrApi, "getFbrAccessToken").mockResolvedValue("mock_bearer_token");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          sales_tax_atl: "Active",
          sales_tax_active: true,
          reference_number: "FBR-ST-ATL-2026",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkSalesTaxATL("NTN", validNtn);

      expect(res.success).toBe(true);
      expect(res.status).toBe("Verified Active");
      expect(res.referenceNumber).toBe("FBR-ST-ATL-2026");
      expect(res.source).toBe("AUTOMATED_GATEWAY");
    });
  });

  describe("Check 3: Income Tax Active Taxpayer List (checkIncomeTaxATL)", () => {
    it("computes Section 236H rates for Retailer classification", async () => {
      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkIncomeTaxATL("CNIC", validCnic, "Retailer");

      expect(res.withholdingTaxSection).toBe("Section 236H");
      expect(res.activeRate).toContain("0.5%");
      expect(res.nonFilerRate).toContain("1.0%");
      expect(res.smsInstruction).toContain("ATL");
      expect(res.smsInstruction).toContain("9966");
      expect(res.officialPortalUrl).toContain("active-taxpayer-list-income-tax");
    });

    it("computes Section 236G rates for Wholesaler classification", async () => {
      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkIncomeTaxATL("NTN", validNtn, "WS / Distributor");

      expect(res.withholdingTaxSection).toBe("Section 236G");
      expect(res.activeRate).toContain("0.1%");
      expect(res.nonFilerRate).toContain("0.2%");
    });

    it("never claims Active Filer status merely because format is valid", async () => {
      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkIncomeTaxATL("CNIC", validCnic);

      expect(res.isFiler).toBe(false);
      expect(res.status).toBe("Pending");
      expect(res.details).toContain("NOT proof of Active Filer status");
    });

    it("verifies Active Filer via live provider response when credentials exist", async () => {
      process.env.FBR_CLIENT_ID = "live_client_id_123";
      process.env.FBR_CLIENT_SECRET = "live_client_secret_456";
      vi.spyOn(fbrApi, "getFbrAccessToken").mockResolvedValue("mock_bearer_token");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          atl_status: "Active",
          is_active_taxpayer: true,
          reference_number: "FBR-INC-2026-99",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new FbrTaxpayerProviderAdapter();
      const res = await adapter.checkIncomeTaxATL("CNIC", validCnic, "Retailer");

      expect(res.success).toBe(true);
      expect(res.status).toBe("Verified Active");
      expect(res.isFiler).toBe(true);
      expect(res.referenceNumber).toBe("FBR-INC-2026-99");
      expect(res.details).toContain("Active Filer verified on FBR ATL database");
    });
  });

  describe("Safeguards Against False Inactive / False Unregistered Claims", () => {
    beforeEach(() => {
      process.env.FBR_CLIENT_ID = "live_client_id_123";
      process.env.FBR_CLIENT_SECRET = "live_client_secret_456";
      vi.spyOn(fbrApi, "getFbrAccessToken").mockResolvedValue("mock_bearer_token");
    });

    it("handles HTTP 429 rate limit as Unable to Verify, never as Inactive or Unregistered", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new FbrTaxpayerProviderAdapter();

      const regRes = await adapter.checkSalesTaxRegistration("NTN", validNtn);
      expect(regRes.status).toBe("Unable to Verify");
      expect(regRes.status).not.toBe("Unregistered");
      expect(regRes.details).toContain("rate limit exceeded (HTTP 429)");

      const stAtlRes = await adapter.checkSalesTaxATL("NTN", validNtn);
      expect(stAtlRes.status).toBe("Unable to Verify");
      expect(stAtlRes.status).not.toBe("Verified Inactive");
      expect(stAtlRes.details).toContain("rate limit reached (HTTP 429)");

      const incAtlRes = await adapter.checkIncomeTaxATL("NTN", validNtn);
      expect(incAtlRes.status).toBe("Unable to Verify");
      expect(incAtlRes.status).not.toBe("Verified Inactive");
      expect(incAtlRes.isFiler).toBe(false);
      expect(incAtlRes.details).toContain("rate limit reached (HTTP 429)");
    });

    it("handles HTTP 404 as Not Found, never as false Inactive", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new FbrTaxpayerProviderAdapter();

      const regRes = await adapter.checkSalesTaxRegistration("NTN", validNtn);
      expect(regRes.status).toBe("Not Found");
      expect(regRes.details).toContain("not found");

      const stAtlRes = await adapter.checkSalesTaxATL("NTN", validNtn);
      expect(stAtlRes.status).toBe("Not Found");
      expect(stAtlRes.status).not.toBe("Verified Inactive");

      const incAtlRes = await adapter.checkIncomeTaxATL("NTN", validNtn);
      expect(incAtlRes.status).toBe("Not Found");
      expect(incAtlRes.status).not.toBe("Verified Inactive");
      expect(incAtlRes.isFiler).toBe(false);
    });

    it("handles HTTP 500 server error as Unable to Verify with explicit notice that failure is NOT proof of inactive status", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new FbrTaxpayerProviderAdapter();

      const res = await adapter.checkIncomeTaxATL("CNIC", validCnic);
      expect(res.status).toBe("Unable to Verify");
      expect(res.status).not.toBe("Verified Inactive");
      expect(res.details).toContain("A service error is NOT proof of inactive status");
      expect(res.officialPortalUrl).toBeDefined();
      expect(res.smsInstruction).toBeDefined();
    });

    it("handles network timeout / AbortError as Unable to Verify without marking inactive", async () => {
      const timeoutErr = new Error("The operation was aborted due to timeout");
      timeoutErr.name = "TimeoutError";

      const mockFetch = vi.fn().mockRejectedValue(timeoutErr);
      vi.stubGlobal("fetch", mockFetch);

      const adapter = new FbrTaxpayerProviderAdapter();

      const res = await adapter.checkSalesTaxATL("CNIC", validCnic);
      expect(res.status).toBe("Unable to Verify");
      expect(res.status).not.toBe("Verified Inactive");
      expect(res.details).toContain("Request timed out");
      expect(res.details).toContain("A failed connection is NOT proof of inactive status");
      expect(res.smsInstruction).toContain("9966");
    });
  });

  describe("Composite Orchestration (verifyAllThreeChecks)", () => {
    it("executes the three checks independently and returns structured indicators conforming to FbrThreeIndicators", async () => {
      const adapter = new FbrTaxpayerProviderAdapter();
      const result = await adapter.verifyAllThreeChecks(validCnic, "Retailer");

      expect(result.salesTaxReg).toBeDefined();
      expect(result.salesTaxAtl).toBeDefined();
      expect(result.incomeTaxAtl).toBeDefined();

      expect(result.indicators.salesTaxRegType.status).toBe("Pending");
      expect(result.indicators.salesTaxAtl.status).toBe("Pending");
      expect(result.indicators.incomeTaxAtl.status).toBe("Pending");
      expect(result.indicators.incomeTaxAtl.isFiler).toBe(false);
    });
  });
});

