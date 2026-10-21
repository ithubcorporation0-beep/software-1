/**
 * FBR Taxpayer Verification Provider Adapter
 *
 * Clean server-side integration layer supporting the three independent FBR verification checks:
 * 1. Sales Tax Registration Type (checkSalesTaxRegistration)
 * 2. Sales Tax Active Taxpayer List (checkSalesTaxATL)
 * 3. Income Tax Active Taxpayer List (checkIncomeTaxATL)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Application method names, NOT claimed FBR endpoints.
 * - Keeps all credentials server-side; zero secrets leaked to the client bundle.
 * - Enforces company permissions and tenant isolation via requireCompanyMembership.
 * - Masks sensitive national identifiers in all logging and audit trails.
 * - Never fabricates fake active responses; returns truthful Pending/Manual statuses when unconfigured.
 */

import { validateTaxId, maskTaxIdentifier } from "./fbr-validation";
import { getFbrAccessToken } from "./fbr-api";
import { requireCompanyMembership } from "./auth/server";
import {
  TaxpayerVerificationSource,
  SalesTaxRegTypeStatus,
  SalesTaxAtlStatus,
  IncomeTaxAtlStatus,
  FbrThreeIndicators,
} from "./fbr-types";

export type TaxIdentifierType = "CNIC" | "NTN" | "STRN" | "UNKNOWN";

export interface SalesTaxRegCheckResult {
  success: boolean;
  status: SalesTaxRegTypeStatus;
  strn?: string;
  category?: string;
  source: TaxpayerVerificationSource;
  verifiedAt: string;
  referenceNumber?: string;
  details: string;
  officialPortalUrl: string;
}

export interface SalesTaxAtlCheckResult {
  success: boolean;
  status: SalesTaxAtlStatus;
  source: TaxpayerVerificationSource;
  verifiedAt: string;
  referenceNumber?: string;
  details: string;
  officialPortalUrl: string;
  smsInstruction: string;
}

export interface IncomeTaxAtlCheckResult {
  success: boolean;
  status: IncomeTaxAtlStatus;
  isFiler: boolean;
  source: TaxpayerVerificationSource;
  verifiedAt: string;
  referenceNumber?: string;
  details: string;
  officialPortalUrl: string;
  smsInstruction: string;
  withholdingTaxSection: string;
  activeRate: string;
  nonFilerRate: string;
}

export interface FbrProviderAdapterOptions {
  companyId?: string;
  authenticatedUserId?: string;
  customEndpoint?: string;
}

/**
 * Server-Side FBR Provider Adapter
 */
export class FbrTaxpayerProviderAdapter {
  private companyId?: string;
  private isMembershipVerified: boolean = false;

  constructor(private options: FbrProviderAdapterOptions = {}) {
    this.companyId = options.companyId;
  }

  /**
   * Enforces server-side tenant isolation if a companyId was provided.
   * Fails closed (403 Forbidden) if user is not a verified active member.
   */
  public async ensureTenantPermission(): Promise<void> {
    if (this.companyId && !this.isMembershipVerified) {
      await requireCompanyMembership(this.companyId);
      this.isMembershipVerified = true;
    }
  }

  /**
   * Checks whether real FBR/PRAL OAuth credentials exist in server environment.
   */
  public isGatewayConfigured(): boolean {
    const clientId = process.env.FBR_CLIENT_ID?.trim();
    const clientSecret = process.env.FBR_CLIENT_SECRET?.trim();
    return Boolean(
      clientId &&
      clientSecret &&
      !clientId.includes("placeholder") &&
      !clientId.includes("your-fbr")
    );
  }

  /**
   * 1. Check Sales Tax Registration Type (Sales Tax Act 1990)
   * Internal application method determining whether the entity is registered for sales tax,
   * holds an STRN, or is an exempt/unregistered entity.
   */
  public async checkSalesTaxRegistration(
    identifierType: TaxIdentifierType,
    identifier: string
  ): Promise<SalesTaxRegCheckResult> {
    await this.ensureTenantPermission();
    const now = new Date().toISOString();
    const validation = validateTaxId(identifier);

    if (!validation.isValid) {
      return {
        success: false,
        status: "Unable to Verify",
        source: "FORMAT_VALIDATED_ONLY",
        verifiedAt: now,
        details: validation.errorMessage || "Invalid identifier syntax",
        officialPortalUrl: "https://iris.fbr.gov.pk/",
      };
    }

    // If live FBR gateway is configured, perform server-side authenticated inquiry
    if (this.isGatewayConfigured()) {
      try {
        const token = await getFbrAccessToken();
        const endpoint =
          process.env.FBR_ATL_INQUIRY_URL?.trim() ||
          "https://api.fbr.gov.pk/taxpayer/atl-inquiry";

        const res = await fetch(
          `${endpoint}?tax_number=${encodeURIComponent(validation.cleaned)}&service=sales_tax_reg`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
          }
        );

        if (res.status === 429) {
          return {
            success: false,
            status: "Unable to Verify",
            source: "AUTOMATED_GATEWAY",
            verifiedAt: now,
            details: "FBR verification service rate limit exceeded (HTTP 429). Please wait before retrying or verify via official IRIS portal.",
            officialPortalUrl: "https://iris.fbr.gov.pk/",
          };
        }

        if (res.status === 404) {
          return {
            success: false,
            status: "Not Found",
            source: "AUTOMATED_GATEWAY",
            verifiedAt: now,
            details: "Tax identifier was not found on official FBR Sales Tax registration records.",
            officialPortalUrl: "https://iris.fbr.gov.pk/",
          };
        }

        if (!res.ok) {
          return {
            success: false,
            status: "Unable to Verify",
            source: "AUTOMATED_GATEWAY",
            verifiedAt: now,
            details: `FBR service returned HTTP ${res.status}. A service error is NOT proof of inactive status; please verify via official portal or SMS 9966.`,
            officialPortalUrl: "https://iris.fbr.gov.pk/",
          };
        }

        const data = await res.json();
        const isExplicitlyUnregistered =
          data.sales_tax_registration_type === "Unregistered" ||
          data.sales_tax_registration_type === "Not Registered" ||
          data.is_sales_tax_registered === false;

        const isRegistered =
          !isExplicitlyUnregistered &&
          Boolean(
            data.strn ||
              data.is_sales_tax_registered ||
              (data.sales_tax_registration_type && data.sales_tax_registration_type !== "Unregistered")
          );

        const status: SalesTaxRegTypeStatus =
          data.sales_tax_registration_type || (isRegistered ? "Registered" : "Unregistered");

        return {
          success: true,
          status,
          strn: data.strn || undefined,
          category: data.category || undefined,
          source: "AUTOMATED_GATEWAY",
          verifiedAt: now,
          referenceNumber: data.reference_number || undefined,
          details: isRegistered
            ? `Registered Sales Tax Entity (STRN: ${data.strn || "On File"})`
            : "No Sales Tax Registration found on official FBR records",
          officialPortalUrl: "https://iris.fbr.gov.pk/",
        };
      } catch (err: any) {
        console.warn(
          `[FBR PROVIDER ADAPTER] Sales Tax Reg query network issue for ${maskTaxIdentifier(
            validation.cleaned,
            validation.type
          )}:`,
          err.message
        );
        const isTimeout = err.name === "TimeoutError" || err.message?.toLowerCase().includes("timeout") || err.message?.toLowerCase().includes("aborted");
        return {
          success: false,
          status: "Unable to Verify",
          source: "AUTOMATED_GATEWAY",
          verifiedAt: now,
          details: `FBR gateway connection failed (${isTimeout ? "Request timed out" : "Network error"}). A failed connection is NOT proof of inactive status; please verify via official portal or SMS 9966.`,
          officialPortalUrl: "https://iris.fbr.gov.pk/",
        };
      }
    }

    // Default / Unconfigured Gateway: Return truthful Pending status with official portal guide
    return {
      success: true,
      status: "Pending",
      source: "FORMAT_VALIDATED_ONLY",
      verifiedAt: now,
      details: "Format validated. Awaiting live registration inquiry via FBR IRIS Portal.",
      officialPortalUrl: "https://iris.fbr.gov.pk/",
    };
  }

  /**
   * 2. Check Sales Tax Active Taxpayer List (Sales Tax ATL)
   * Internal application method verifying monthly sales tax return filing standing.
   */
  public async checkSalesTaxATL(
    identifierType: TaxIdentifierType,
    identifier: string
  ): Promise<SalesTaxAtlCheckResult> {
    await this.ensureTenantPermission();
    const now = new Date().toISOString();
    const validation = validateTaxId(identifier);

    const smsInstruction =
      validation.type === "CNIC"
        ? `SMS "ST ${validation.cleaned}" to 9966`
        : `SMS "ST ${validation.cleaned.slice(0, 7)}" to 9966`;

    if (!validation.isValid) {
      return {
        success: false,
        status: "Unable to Verify",
        source: "FORMAT_VALIDATED_ONLY",
        verifiedAt: now,
        details: validation.errorMessage || "Invalid identifier syntax",
        officialPortalUrl: "https://www.fbr.gov.pk/atl-sales-tax/163223",
        smsInstruction,
      };
    }

    if (this.isGatewayConfigured()) {
      try {
        const token = await getFbrAccessToken();
        const endpoint =
          process.env.FBR_ATL_INQUIRY_URL?.trim() ||
          "https://api.fbr.gov.pk/taxpayer/atl-inquiry";

        const res = await fetch(
          `${endpoint}?tax_number=${encodeURIComponent(validation.cleaned)}&service=sales_tax_atl`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
          }
        );

        if (res.status === 429) {
          return {
            success: false,
            status: "Unable to Verify",
            source: "AUTOMATED_GATEWAY",
            verifiedAt: now,
            details: "FBR verification service rate limit reached (HTTP 429). Please wait before retrying or use the official Sales Tax ATL portal.",
            officialPortalUrl: "https://www.fbr.gov.pk/atl-sales-tax/163223",
            smsInstruction,
          };
        }

        if (res.status === 404) {
          return {
            success: false,
            status: "Not Found",
            source: "AUTOMATED_GATEWAY",
            verifiedAt: now,
            details: "Tax identifier was not found on official FBR Sales Tax records.",
            officialPortalUrl: "https://www.fbr.gov.pk/atl-sales-tax/163223",
            smsInstruction,
          };
        }

        if (!res.ok) {
          return {
            success: false,
            status: "Unable to Verify",
            source: "AUTOMATED_GATEWAY",
            verifiedAt: now,
            details: `FBR service returned HTTP ${res.status}. A service error is NOT proof of inactive status; please verify via official portal or SMS 9966.`,
            officialPortalUrl: "https://www.fbr.gov.pk/atl-sales-tax/163223",
            smsInstruction,
          };
        }

        const data = await res.json();
        let status: SalesTaxAtlStatus = "Not Registered";

        if (data.sales_tax_atl === "Active" || data.sales_tax_active === true) {
          status = "Verified Active";
        } else if (data.sales_tax_atl === "Inactive" || data.sales_tax_active === false) {
          status = "Verified Inactive";
        } else if (data.sales_tax_exempt === true) {
          status = "Exempt";
        }

        return {
          success: true,
          status,
          source: "AUTOMATED_GATEWAY",
          verifiedAt: now,
          referenceNumber: data.reference_number || undefined,
          details: `FBR Sales Tax ATL Status: ${status}`,
          officialPortalUrl: "https://www.fbr.gov.pk/atl-sales-tax/163223",
          smsInstruction,
        };
      } catch (err: any) {
        console.warn(
          `[FBR PROVIDER ADAPTER] Sales Tax ATL query network issue for ${maskTaxIdentifier(
            validation.cleaned,
            validation.type
          )}:`,
          err.message
        );
        const isTimeout = err.name === "TimeoutError" || err.message?.toLowerCase().includes("timeout") || err.message?.toLowerCase().includes("aborted");
        return {
          success: false,
          status: "Unable to Verify",
          source: "AUTOMATED_GATEWAY",
          verifiedAt: now,
          details: `FBR gateway connection failed (${isTimeout ? "Request timed out" : "Network error"}). A failed connection is NOT proof of inactive status; please verify via official portal or SMS 9966.`,
          officialPortalUrl: "https://www.fbr.gov.pk/atl-sales-tax/163223",
          smsInstruction,
        };
      }
    }

    return {
      success: true,
      status: "Pending",
      source: "FORMAT_VALIDATED_ONLY",
      verifiedAt: now,
      details: "Format validated. Verify current return standing via SMS to 9966 or FBR Sales Tax ATL page.",
      officialPortalUrl: "https://www.fbr.gov.pk/atl-sales-tax/163223",
      smsInstruction,
    };
  }

  /**
   * 3. Check Income Tax Active Taxpayer List (Income Tax ATL)
   * Internal application method verifying annual income tax return filing status and
   * calculating withholding tax rates under Sections 236H / 236G.
   */
  public async checkIncomeTaxATL(
    identifierType: TaxIdentifierType,
    identifier: string,
    customerType: "Retailer" | "WS / Distributor" = "Retailer"
  ): Promise<IncomeTaxAtlCheckResult> {
    await this.ensureTenantPermission();
    const now = new Date().toISOString();
    const validation = validateTaxId(identifier);

    const isRetailer = customerType === "Retailer";
    const withholdingTaxSection = isRetailer ? "Section 236H" : "Section 236G";
    const activeRate = isRetailer ? "0.5% (Active Filer)" : "0.1% (Active Filer)";
    const nonFilerRate = isRetailer ? "1.0% (Non-Filer 2x Penalty)" : "0.2% (Non-Filer 2x Penalty)";

    const smsInstruction =
      validation.type === "CNIC"
        ? `SMS "ATL ${validation.cleaned}" to 9966`
        : `SMS "ATL ${validation.cleaned.slice(0, 7)}" to 9966`;

    if (!validation.isValid) {
      return {
        success: false,
        status: "Unable to Verify",
        isFiler: false,
        source: "FORMAT_VALIDATED_ONLY",
        verifiedAt: now,
        details: validation.errorMessage || "Invalid identifier syntax",
        officialPortalUrl:
          "https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169",
        smsInstruction,
        withholdingTaxSection,
        activeRate,
        nonFilerRate,
      };
    }

    if (this.isGatewayConfigured()) {
      try {
        const token = await getFbrAccessToken();
        const endpoint =
          process.env.FBR_ATL_INQUIRY_URL?.trim() ||
          "https://api.fbr.gov.pk/taxpayer/atl-inquiry";

        const res = await fetch(
          `${endpoint}?tax_number=${encodeURIComponent(validation.cleaned)}&service=income_tax_atl`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
          }
        );

        if (res.status === 429) {
          return {
            success: false,
            status: "Unable to Verify",
            isFiler: false,
            source: "AUTOMATED_GATEWAY",
            verifiedAt: now,
            details: "FBR verification service rate limit reached (HTTP 429). Please wait before retrying or use the official Income Tax ATL portal.",
            officialPortalUrl:
              "https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169",
            smsInstruction,
            withholdingTaxSection,
            activeRate,
            nonFilerRate,
          };
        }

        if (res.status === 404) {
          return {
            success: false,
            status: "Not Found",
            isFiler: false,
            source: "AUTOMATED_GATEWAY",
            verifiedAt: now,
            details: "Tax identifier was not found on official FBR Income Tax records.",
            officialPortalUrl:
              "https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169",
            smsInstruction,
            withholdingTaxSection,
            activeRate,
            nonFilerRate,
          };
        }

        if (!res.ok) {
          return {
            success: false,
            status: "Unable to Verify",
            isFiler: false,
            source: "AUTOMATED_GATEWAY",
            verifiedAt: now,
            details: `FBR service returned HTTP ${res.status}. A service error is NOT proof of inactive status; please verify via official portal or SMS 9966.`,
            officialPortalUrl:
              "https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169",
            smsInstruction,
            withholdingTaxSection,
            activeRate,
            nonFilerRate,
          };
        }

        const data = await res.json();
        const isFiler =
          data.atl_status === "Active" ||
          data.status === "ACTIVE" ||
          data.is_active_taxpayer === true;

        const status: IncomeTaxAtlStatus = isFiler ? "Verified Active" : "Verified Inactive";

        return {
          success: true,
          status,
          isFiler,
          source: "AUTOMATED_GATEWAY",
          verifiedAt: now,
          referenceNumber: data.reference_number || undefined,
          details: isFiler
            ? `Active Filer verified on FBR ATL database. Standard ${withholdingTaxSection} (${activeRate}) applied.`
            : `Inactive / Non-Filer record confirmed on FBR ATL. Non-filer penalty (${nonFilerRate}) applies.`,
          officialPortalUrl:
            "https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169",
          smsInstruction,
          withholdingTaxSection,
          activeRate,
          nonFilerRate,
        };
      } catch (err: any) {
        console.warn(
          `[FBR PROVIDER ADAPTER] Income Tax ATL query network issue for ${maskTaxIdentifier(
            validation.cleaned,
            validation.type
          )}:`,
          err.message
        );
        const isTimeout = err.name === "TimeoutError" || err.message?.toLowerCase().includes("timeout") || err.message?.toLowerCase().includes("aborted");
        return {
          success: false,
          status: "Unable to Verify",
          isFiler: false,
          source: "AUTOMATED_GATEWAY",
          verifiedAt: now,
          details: `FBR gateway connection failed (${isTimeout ? "Request timed out" : "Network error"}). A failed connection is NOT proof of inactive status; please verify via official portal or SMS 9966.`,
          officialPortalUrl:
            "https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169",
          smsInstruction,
          withholdingTaxSection,
          activeRate,
          nonFilerRate,
        };
      }
    }

    return {
      success: true,
      status: "Pending",
      isFiler: false,
      source: "FORMAT_VALIDATED_ONLY",
      verifiedAt: now,
      details:
        "Valid format confirmed. Format validity is NOT proof of Active Filer status. Please check via SMS 9966 or FBR ATL portal.",
      officialPortalUrl:
        "https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169",
      smsInstruction,
      withholdingTaxSection,
      activeRate,
      nonFilerRate,
    };
  }

  /**
   * Orchestrator: Executes the three checks independently and compiles the composite result.
   */
  public async verifyAllThreeChecks(
    identifier: string,
    customerType: "Retailer" | "WS / Distributor" = "Retailer"
  ): Promise<{
    salesTaxReg: SalesTaxRegCheckResult;
    salesTaxAtl: SalesTaxAtlCheckResult;
    incomeTaxAtl: IncomeTaxAtlCheckResult;
    indicators: FbrThreeIndicators;
  }> {
    await this.ensureTenantPermission();
    const validation = validateTaxId(identifier);
    const idType = validation.type;

    // Execute the three verification checks independently
    const [salesTaxReg, salesTaxAtl, incomeTaxAtl] = await Promise.all([
      this.checkSalesTaxRegistration(idType, identifier),
      this.checkSalesTaxATL(idType, identifier),
      this.checkIncomeTaxATL(idType, identifier, customerType),
    ]);

    const indicators: FbrThreeIndicators = {
      salesTaxRegType: {
        status: salesTaxReg.status,
        strn: salesTaxReg.strn,
        category: salesTaxReg.category,
        details: salesTaxReg.details,
      },
      salesTaxAtl: {
        status: salesTaxAtl.status,
        details: salesTaxAtl.details,
      },
      incomeTaxAtl: {
        status: incomeTaxAtl.status,
        isFiler: incomeTaxAtl.isFiler,
        details: incomeTaxAtl.details,
      },
    };

    return {
      salesTaxReg,
      salesTaxAtl,
      incomeTaxAtl,
      indicators,
    };
  }
}

/**
 * Factory creating an initialized FbrTaxpayerProviderAdapter instance.
 */
export function getTaxpayerProviderAdapter(
  companyId?: string,
  options?: Omit<FbrProviderAdapterOptions, "companyId">
): FbrTaxpayerProviderAdapter {
  return new FbrTaxpayerProviderAdapter({
    companyId,
    ...options,
  });
}
