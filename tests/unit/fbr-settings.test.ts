import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deriveEffectiveStatus,
  getFbrCredentialsStatus,
  DEFAULT_FBR_CONFIG,
  DEFAULT_FBR_OVERVIEW,
  FbrCompanyConfig,
  FbrCredentialsStatus,
} from "@/lib/fbr-settings";

describe("FBR Settings State Engine & Credential Diagnostics", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("accurately derives 'Not Configured' when integration is disabled", () => {
    const config: FbrCompanyConfig = {
      ...DEFAULT_FBR_CONFIG,
      enabled: false,
    };
    const creds: FbrCredentialsStatus = {
      hasClientId: false,
      maskedClientId: "Not Configured",
      hasClientSecret: false,
      hasSellerNtn: false,
      tokenUrl: "https://api.fbr.gov.pk/oauth2/token",
      validateUrl: "https://api.fbr.gov.pk/invoices/validate",
      submitUrl: "https://api.fbr.gov.pk/invoices/submit",
      inquiryUrl: "https://api.fbr.gov.pk/taxpayer/atl-inquiry",
    };

    expect(deriveEffectiveStatus(config, creds)).toBe("Not Configured");
  });

  it("accurately derives 'Awaiting Provider' when enabled but integrator name is missing", () => {
    const config: FbrCompanyConfig = {
      ...DEFAULT_FBR_CONFIG,
      enabled: true,
      integratorName: "",
    };
    const creds: FbrCredentialsStatus = {
      hasClientId: true,
      maskedClientId: "pral••••••••9901",
      hasClientSecret: true,
      hasSellerNtn: true,
      tokenUrl: "https://api.fbr.gov.pk/oauth2/token",
      validateUrl: "https://api.fbr.gov.pk/invoices/validate",
      submitUrl: "https://api.fbr.gov.pk/invoices/submit",
      inquiryUrl: "https://api.fbr.gov.pk/taxpayer/atl-inquiry",
    };

    expect(deriveEffectiveStatus(config, creds)).toBe("Awaiting Provider");
  });

  it("accurately derives 'Awaiting Credentials' when enabled with provider but missing secrets", () => {
    const config: FbrCompanyConfig = {
      ...DEFAULT_FBR_CONFIG,
      enabled: true,
      integratorName: "Pakistan Revenue Automation Limited (PRAL)",
    };
    const creds: FbrCredentialsStatus = {
      hasClientId: false,
      maskedClientId: "Not Configured",
      hasClientSecret: false,
      hasSellerNtn: false,
      tokenUrl: "https://api.fbr.gov.pk/oauth2/token",
      validateUrl: "https://api.fbr.gov.pk/invoices/validate",
      submitUrl: "https://api.fbr.gov.pk/invoices/submit",
      inquiryUrl: "https://api.fbr.gov.pk/taxpayer/atl-inquiry",
    };

    expect(deriveEffectiveStatus(config, creds)).toBe("Awaiting Credentials");
  });

  it("accurately derives 'Sandbox Not Tested' when credentials exist but no test has been executed", () => {
    const config: FbrCompanyConfig = {
      ...DEFAULT_FBR_CONFIG,
      enabled: true,
      environment: "sandbox",
      integratorName: "Pakistan Revenue Automation Limited (PRAL)",
      lastTestStatus: null,
    };
    const creds: FbrCredentialsStatus = {
      hasClientId: true,
      maskedClientId: "pral••••••••9901",
      hasClientSecret: true,
      hasSellerNtn: true,
      tokenUrl: "https://api.fbr.gov.pk/oauth2/token",
      validateUrl: "https://api.fbr.gov.pk/invoices/validate",
      submitUrl: "https://api.fbr.gov.pk/invoices/submit",
      inquiryUrl: "https://api.fbr.gov.pk/taxpayer/atl-inquiry",
    };

    expect(deriveEffectiveStatus(config, creds)).toBe("Sandbox Not Tested");
  });

  it("accurately derives 'Connection Error' when the latest test failed", () => {
    const config: FbrCompanyConfig = {
      ...DEFAULT_FBR_CONFIG,
      enabled: true,
      environment: "sandbox",
      integratorName: "PRAL",
      lastTestStatus: "FAILED",
      lastTestMessage: "FBR Server returned HTTP 503",
    };
    const creds: FbrCredentialsStatus = {
      hasClientId: true,
      maskedClientId: "pral••••••••9901",
      hasClientSecret: true,
      hasSellerNtn: true,
      tokenUrl: "https://api.fbr.gov.pk/oauth2/token",
      validateUrl: "https://api.fbr.gov.pk/invoices/validate",
      submitUrl: "https://api.fbr.gov.pk/invoices/submit",
      inquiryUrl: "https://api.fbr.gov.pk/taxpayer/atl-inquiry",
    };

    expect(deriveEffectiveStatus(config, creds)).toBe("Connection Error");
  });

  it("accurately derives 'Sandbox Connected' when sandbox test succeeded", () => {
    const config: FbrCompanyConfig = {
      ...DEFAULT_FBR_CONFIG,
      enabled: true,
      environment: "sandbox",
      integratorName: "PRAL",
      lastTestStatus: "SUCCESS",
      lastTestedAt: new Date().toISOString(),
    };
    const creds: FbrCredentialsStatus = {
      hasClientId: true,
      maskedClientId: "pral••••••••9901",
      hasClientSecret: true,
      hasSellerNtn: true,
      tokenUrl: "https://api.fbr.gov.pk/oauth2/token",
      validateUrl: "https://api.fbr.gov.pk/invoices/validate",
      submitUrl: "https://api.fbr.gov.pk/invoices/submit",
      inquiryUrl: "https://api.fbr.gov.pk/taxpayer/atl-inquiry",
    };

    expect(deriveEffectiveStatus(config, creds)).toBe("Sandbox Connected");
  });

  it("accurately derives 'Production Pending Approval' when production is selected but not yet verified in production", () => {
    const config: FbrCompanyConfig = {
      ...DEFAULT_FBR_CONFIG,
      enabled: true,
      environment: "production",
      integratorName: "PRAL",
      lastTestStatus: null,
    };
    const creds: FbrCredentialsStatus = {
      hasClientId: true,
      maskedClientId: "pral••••••••9901",
      hasClientSecret: true,
      hasSellerNtn: true,
      tokenUrl: "https://api.fbr.gov.pk/oauth2/token",
      validateUrl: "https://api.fbr.gov.pk/invoices/validate",
      submitUrl: "https://api.fbr.gov.pk/invoices/submit",
      inquiryUrl: "https://api.fbr.gov.pk/taxpayer/atl-inquiry",
    };

    expect(deriveEffectiveStatus(config, creds)).toBe("Production Pending Approval");
  });

  it("accurately derives 'Production Connected' when production test succeeds", () => {
    const config: FbrCompanyConfig = {
      ...DEFAULT_FBR_CONFIG,
      enabled: true,
      environment: "production",
      integratorName: "PRAL",
      lastTestStatus: "SUCCESS",
      lastTestedAt: new Date().toISOString(),
    };
    const creds: FbrCredentialsStatus = {
      hasClientId: true,
      maskedClientId: "pral••••••••9901",
      hasClientSecret: true,
      hasSellerNtn: true,
      tokenUrl: "https://api.fbr.gov.pk/oauth2/token",
      validateUrl: "https://api.fbr.gov.pk/invoices/validate",
      submitUrl: "https://api.fbr.gov.pk/invoices/submit",
      inquiryUrl: "https://api.fbr.gov.pk/taxpayer/atl-inquiry",
    };

    expect(deriveEffectiveStatus(config, creds)).toBe("Production Connected");
  });

  it("masks client ID without leaking plaintext secrets in getFbrCredentialsStatus", () => {
    vi.stubEnv("FBR_CLIENT_ID", "pral_prod_secret_id_9988");
    vi.stubEnv("FBR_CLIENT_SECRET", "super_secret_raw_pass_key_1234");
    vi.stubEnv("FBR_SELLER_NTN", "1234567-8");

    const status = getFbrCredentialsStatus();
    expect(status.hasClientId).toBe(true);
    expect(status.hasClientSecret).toBe(true);
    expect(status.hasSellerNtn).toBe(true);
    expect(status.maskedClientId).toBe("pral••••••••9988");
    expect((status as any).clientSecret).toBeUndefined();
  });
});
