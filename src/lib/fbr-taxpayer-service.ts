import { validateTaxId, maskTaxIdentifier, TaxIdValidationResult } from "./fbr-validation";
import { getFbrAccessToken } from "./fbr-api";
import { createClient } from "./supabase/server";
import { recordAuditLog } from "./audit/server";
import { requireCompanyMembership } from "./auth/server";
import {
  TaxpayerVerificationRecord,
  TaxpayerVerificationSource,
  TaxpayerAtlStatus,
  FbrThreeIndicators,
  SalesTaxRegTypeStatus,
  SalesTaxAtlStatus,
  IncomeTaxAtlStatus,
} from "./fbr-types";

export interface FbrTaxpayerVerificationResult {
  success: boolean;
  validFormat: boolean;
  idType: "CNIC" | "NTN" | "STRN" | "UNKNOWN";
  rawId: string;
  formattedId: string;
  maskedId: string;
  isFiler: boolean;
  atlStatus: TaxpayerAtlStatus;
  indicators: FbrThreeIndicators;
  verificationSource: TaxpayerVerificationSource;
  fbrGatewayConfigured: boolean;
  verifiedOnline: boolean;
  verifiedAt: string;
  verifiedBy?: string;
  referenceNumber?: string;
  notes?: string;
  province?: string;
  gender?: "Male" | "Female";
  businessName?: string;
  registrationDate?: string;
  message: string;
  detail?: string;
  taxSection: string;
  activeRate: string;
  nonFilerRate: string;
  officialVerification: {
    smsInstruction: string;
    portalUrl: string;
    irisUrl: string;
    incomeTaxAtlUrl: string;
    salesTaxAtlUrl: string;
  };
}

/**
 * Verifies a Pakistani CNIC or NTN for FBR ATL (Active Taxpayer List) compliance.
 *
 * CRITICAL TRUTHFULNESS RULES:
 * 1. A valid identifier format confirms legal syntax only — it is NOT proof of Active Taxpayer status.
 * 2. Never mark a taxpayer Active or Inactive solely because an API request failed or is unconfigured.
 * 3. Never invent verification results or claim manual verifications originated from an API.
 * 4. All log entries and audit events mask sensitive national identifiers.
 */
export async function verifyFbrTaxpayer(
  input: string,
  customerType: string = "Retailer",
  companyId?: string,
  verifiedBy?: string
): Promise<FbrTaxpayerVerificationResult> {
  const validation: TaxIdValidationResult = validateTaxId(input);
  const now = new Date().toISOString();
  const maskedId = maskTaxIdentifier(validation.cleaned || input, validation.type);

  const officialVerification = {
    smsInstruction:
      validation.type === "CNIC"
        ? `Income Tax: SMS "ATL ${validation.cleaned}" to 9966 | Sales Tax: SMS "ST ${validation.cleaned}" to 9966`
        : `Income Tax: SMS "ATL ${validation.cleaned.slice(0, 7)}" to 9966 | Sales Tax: SMS "ST ${validation.cleaned.slice(0, 7)}" to 9966`,
    portalUrl: "https://e.fbr.gov.pk/esbn/Service.aspx?PID=TaxpayerVerification",
    irisUrl: "https://iris.fbr.gov.pk/",
    incomeTaxAtlUrl: "https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169",
    salesTaxAtlUrl: "https://www.fbr.gov.pk/atl-sales-tax/163223",
  };

  const isRetailer = customerType === "Retailer";
  const taxSection = isRetailer ? "Section 236H" : "Section 236G";
  const activeRate = isRetailer ? "0.5% (Active Filer)" : "0.1% (Active Filer)";
  const nonFilerRate = isRetailer ? "1.0% (Non-Filer 2x Penalty)" : "0.2% (Non-Filer 2x Penalty)";

  // 1. If format is invalid, immediately reject
  if (!validation.isValid) {
    const errorIndicators: FbrThreeIndicators = {
      salesTaxRegType: {
        status: "Unable to Verify",
        details: validation.errorMessage || "Invalid identifier syntax",
      },
      salesTaxAtl: {
        status: "Unable to Verify",
        details: validation.errorMessage || "Invalid identifier syntax",
      },
      incomeTaxAtl: {
        status: "Unable to Verify",
        isFiler: false,
        details: validation.errorMessage || "Invalid identifier syntax",
      },
    };

    const errorResult: FbrTaxpayerVerificationResult = {
      success: false,
      validFormat: false,
      idType: validation.type,
      rawId: validation.raw,
      formattedId: validation.formatted,
      maskedId,
      isFiler: false,
      atlStatus: "Format Error",
      indicators: errorIndicators,
      verificationSource: "FORMAT_VALIDATED_ONLY",
      fbrGatewayConfigured: Boolean(process.env.FBR_CLIENT_ID && process.env.FBR_CLIENT_SECRET),
      verifiedOnline: false,
      verifiedAt: now,
      verifiedBy,
      message: validation.errorMessage || `Invalid tax identifier: ${input}.`,
      detail:
        "Pakistani tax law requires a valid 13-digit CNIC (for individuals/sole proprietors) or a 7-8 digit NTN (for corporate businesses). Check digits and lengths must match NADRA/FBR specifications.",
      taxSection,
      activeRate,
      nonFilerRate,
      officialVerification,
    };

    if (companyId) {
      await recordTaxpayerVerification(companyId, {
        idType: validation.type,
        rawIdentifier: validation.raw,
        formattedIdentifier: validation.formatted,
        maskedIdentifier: maskedId,
        validFormat: false,
        status: "Format Error",
        isFiler: false,
        indicators: errorIndicators,
        source: "FORMAT_VALIDATED_ONLY",
        verifiedAt: now,
        verifiedBy,
        notes: validation.errorMessage,
      }).catch(() => null);
    }

    return errorResult;
  }

  // 2. Check if real FBR OAuth credentials are configured in environment
  const fbrClientId = process.env.FBR_CLIENT_ID?.trim();
  const fbrClientSecret = process.env.FBR_CLIENT_SECRET?.trim();
  const fbrGatewayConfigured = Boolean(
    fbrClientId &&
    fbrClientSecret &&
    !fbrClientId.includes("placeholder") &&
    !fbrClientSecret.includes("your-fbr")
  );

  if (fbrGatewayConfigured) {
    try {
      const accessToken = await getFbrAccessToken();
      const inquiryEndpoint =
        process.env.FBR_ATL_INQUIRY_URL?.trim() ||
        "https://api.fbr.gov.pk/taxpayer/atl-inquiry";

      const fbrRes = await fetch(
        `${inquiryEndpoint}?tax_number=${encodeURIComponent(validation.cleaned)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (fbrRes.ok) {
        const data = await fbrRes.json();
        const isFiler =
          data.atl_status === "Active" ||
          data.status === "ACTIVE" ||
          data.is_active_taxpayer === true;

        const isSalesRegistered = Boolean(
          data.strn || data.sales_tax_registration_type || data.is_sales_tax_registered
        );

        const salesTaxRegStatus: SalesTaxRegTypeStatus =
          data.sales_tax_registration_type || (isSalesRegistered ? "Registered" : "Unregistered");

        const salesTaxAtlStatus: SalesTaxAtlStatus =
          data.sales_tax_atl === "Active" || data.sales_tax_active === true
            ? "Verified Active"
            : data.sales_tax_atl === "Inactive" || data.sales_tax_active === false
            ? "Verified Inactive"
            : isSalesRegistered
            ? "Verified Active"
            : "Not Registered";

        const incomeTaxAtlStatus: IncomeTaxAtlStatus = isFiler
          ? "Verified Active"
          : "Verified Inactive";

        const indicators: FbrThreeIndicators = {
          salesTaxRegType: {
            status: salesTaxRegStatus,
            strn: data.strn || undefined,
            category: data.category || undefined,
            details: isSalesRegistered
              ? `Registered Sales Tax Entity (STRN: ${data.strn || "On File"})`
              : "No Sales Tax Registration found on FBR database",
          },
          salesTaxAtl: {
            status: salesTaxAtlStatus,
            details: `Sales Tax Active Taxpayer Status: ${salesTaxAtlStatus}`,
          },
          incomeTaxAtl: {
            status: incomeTaxAtlStatus,
            isFiler,
            details: `Income Tax Active Taxpayer Status: ${incomeTaxAtlStatus}`,
          },
        };

        const result: FbrTaxpayerVerificationResult = {
          success: true,
          validFormat: true,
          idType: validation.type,
          rawId: validation.raw,
          formattedId: validation.formatted,
          maskedId,
          isFiler,
          atlStatus: isFiler ? "Active" : "Inactive",
          indicators,
          verificationSource: "AUTOMATED_GATEWAY",
          fbrGatewayConfigured: true,
          verifiedOnline: true,
          verifiedAt: now,
          verifiedBy: verifiedBy || "Automated Gateway",
          province: validation.province,
          gender: validation.gender,
          businessName: data.taxpayer_name || data.business_name,
          registrationDate: data.registration_date,
          message: isFiler
            ? `Verified via live FBR Gateway: ${validation.formatted} is currently an Active Filer on ATL.`
            : `FBR Live Gateway Record: ${validation.formatted} is listed as Inactive / Non-Filer on ATL. Non-filer tax rates apply.`,
          detail: `Tax withholding under ${taxSection}: ${isFiler ? activeRate : nonFilerRate}.`,
          taxSection,
          activeRate,
          nonFilerRate,
          officialVerification,
        };

        if (companyId) {
          await recordTaxpayerVerification(companyId, {
            idType: validation.type,
            rawIdentifier: validation.cleaned,
            formattedIdentifier: validation.formatted,
            maskedIdentifier: maskedId,
            validFormat: true,
            status: isFiler ? "Active" : "Inactive",
            isFiler,
            indicators,
            source: "AUTOMATED_GATEWAY",
            verifiedAt: now,
            verifiedBy: verifiedBy || "Automated Gateway",
            taxpayerName: data.taxpayer_name || data.business_name,
            notes: "Verified via live FBR PRAL Gateway",
          }).catch(() => null);
        }

        return result;
      } else {
        // HTTP error from FBR API - Never assume Active or Inactive!
        const apiErrorIndicators: FbrThreeIndicators = {
          salesTaxRegType: {
            status: "Unable to Verify",
            details: `FBR Gateway returned HTTP ${fbrRes.status}. Taxpayer status is UNCONFIRMED.`,
          },
          salesTaxAtl: {
            status: "Unable to Verify",
            details: "Automated verification service error. Status not assumed.",
          },
          incomeTaxAtl: {
            status: "Unable to Verify",
            isFiler: false,
            details: "Automated verification service error. Status not assumed.",
          },
        };

        const apiErrorResult: FbrTaxpayerVerificationResult = {
          success: false,
          validFormat: true,
          idType: validation.type,
          rawId: validation.raw,
          formattedId: validation.formatted,
          maskedId,
          isFiler: false,
          atlStatus: "API Connection Error",
          indicators: apiErrorIndicators,
          verificationSource: "AUTOMATED_GATEWAY",
          fbrGatewayConfigured: true,
          verifiedOnline: false,
          verifiedAt: now,
          verifiedBy,
          message: `FBR Gateway returned HTTP ${fbrRes.status}. Taxpayer status is UNCONFIRMED.`,
          detail:
            "The automated FBR inquiry service failed to return a valid response. Taxpayer status has NOT been marked Active or Inactive. Please perform manual verification via FBR portal or SMS 9966.",
          taxSection,
          activeRate,
          nonFilerRate,
          officialVerification,
        };

        if (companyId) {
          await recordTaxpayerVerification(companyId, {
            idType: validation.type,
            rawIdentifier: validation.cleaned,
            formattedIdentifier: validation.formatted,
            maskedIdentifier: maskedId,
            validFormat: true,
            status: "API Connection Error",
            isFiler: false,
            indicators: apiErrorIndicators,
            source: "AUTOMATED_GATEWAY",
            verifiedAt: now,
            verifiedBy,
            notes: `FBR Gateway returned HTTP ${fbrRes.status}`,
          }).catch(() => null);
        }

        return apiErrorResult;
      }
    } catch (err: any) {
      // Network/Timeout exception - Never mark Active or Inactive!
      const errorMsg = err?.message || "Connection timeout";
      const networkErrorIndicators: FbrThreeIndicators = {
        salesTaxRegType: {
          status: "Unable to Verify",
          details: `Connection error: ${errorMsg}`,
        },
        salesTaxAtl: {
          status: "Unable to Verify",
          details: "Network failure. Status not assumed. Please verify manually.",
        },
        incomeTaxAtl: {
          status: "Unable to Verify",
          isFiler: false,
          details: "Network failure. Status not assumed. Please verify manually.",
        },
      };

      const apiErrorResult: FbrTaxpayerVerificationResult = {
        success: false,
        validFormat: true,
        idType: validation.type,
        rawId: validation.raw,
        formattedId: validation.formatted,
        maskedId,
        isFiler: false,
        atlStatus: "API Connection Error",
        indicators: networkErrorIndicators,
        verificationSource: "AUTOMATED_GATEWAY",
        fbrGatewayConfigured: true,
        verifiedOnline: false,
        verifiedAt: now,
        verifiedBy,
        message: `FBR Gateway connection error: ${errorMsg}. Taxpayer status is UNCONFIRMED.`,
        detail:
          "Unable to establish connection with the FBR PRAL API server. Status was NOT assumed. Please verify manually via official FBR portal or SMS 9966.",
        taxSection,
        activeRate,
        nonFilerRate,
        officialVerification,
      };

      if (companyId) {
        await recordTaxpayerVerification(companyId, {
          idType: validation.type,
          rawIdentifier: validation.cleaned,
          formattedIdentifier: validation.formatted,
          maskedIdentifier: maskedId,
          validFormat: true,
          status: "API Connection Error",
          isFiler: false,
          indicators: networkErrorIndicators,
          source: "AUTOMATED_GATEWAY",
          verifiedAt: now,
          verifiedBy,
          notes: `Network error: ${errorMsg}`,
        }).catch(() => null);
      }

      return apiErrorResult;
    }
  }

  // 3. Format is valid, but Live Automated Gateway is not configured.
  // Explicitly state format is confirmed, but ATL status is UNVERIFIED / PENDING.
  const pendingIndicators: FbrThreeIndicators = {
    salesTaxRegType: {
      status: "Pending",
      details: "Syntax valid; pending inquiry via official FBR portal or SMS 9966",
    },
    salesTaxAtl: {
      status: "Pending",
      details: "Pending official inquiry via FBR Sales Tax ATL portal or SMS 9966",
    },
    incomeTaxAtl: {
      status: "Pending",
      isFiler: false,
      details: "Pending official inquiry via FBR Income Tax ATL portal or SMS 9966",
    },
  };

  const unverifiedResult: FbrTaxpayerVerificationResult = {
    success: true,
    validFormat: true,
    idType: validation.type,
    rawId: validation.raw,
    formattedId: validation.formatted,
    maskedId,
    isFiler: false,
    atlStatus: "Format Validated (ATL Unverified)",
    indicators: pendingIndicators,
    verificationSource: "FORMAT_VALIDATED_ONLY",
    fbrGatewayConfigured: false,
    verifiedOnline: false,
    verifiedAt: now,
    verifiedBy,
    province: validation.province,
    gender: validation.gender,
    message: `Valid ${validation.type} format confirmed (${validation.formatted}${
      validation.province ? ` — ${validation.province}` : ""
    }${validation.gender ? `, ${validation.gender}` : ""}).`,
    detail:
      "A valid format is NOT proof of Active Filer status. Automated FBR Gateway API is not configured in environment. Please verify via official FBR portal or SMS 9966, then record manual verification.",
    taxSection,
    activeRate,
    nonFilerRate,
    officialVerification,
  };

  if (companyId) {
    await recordTaxpayerVerification(companyId, {
      idType: validation.type,
      rawIdentifier: validation.cleaned,
      formattedIdentifier: validation.formatted,
      maskedIdentifier: maskedId,
      validFormat: true,
      status: "Format Validated (ATL Unverified)",
      isFiler: false,
      indicators: pendingIndicators,
      source: "FORMAT_VALIDATED_ONLY",
      verifiedAt: now,
      verifiedBy,
      notes: "Format verified; ATL unverified pending manual check",
    }).catch(() => null);
  }

  return unverifiedResult;
}

/**
 * Records a manual verification entry performed by an authorized operator.
 * Preserves clear distinction between automated API results and human portal/SMS verifications.
 */
export async function recordManualTaxpayerVerification(
  companyId: string,
  params: {
    taxNumber: string;
    source: "MANUAL_PORTAL" | "MANUAL_SMS";
    status?: "Active" | "Inactive";
    salesTaxRegType?: SalesTaxRegTypeStatus;
    salesTaxAtl?: SalesTaxAtlStatus;
    incomeTaxAtl?: IncomeTaxAtlStatus;
    referenceNumber?: string;
    notes?: string;
    operatorName?: string;
    customerType?: string;
  }
): Promise<{ success: boolean; data?: TaxpayerVerificationRecord; error?: string }> {
  const validation = validateTaxId(params.taxNumber);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.errorMessage || "Invalid tax identifier format",
    };
  }

  const maskedIdentifier = maskTaxIdentifier(validation.cleaned, validation.type);
  const now = new Date().toISOString();
  const isFiler = params.incomeTaxAtl ? params.incomeTaxAtl === "Verified Active" : params.status === "Active";

  const resolvedSalesReg: SalesTaxRegTypeStatus =
    params.salesTaxRegType || (isFiler ? "Registered" : "Unregistered");
  const resolvedSalesAtl: SalesTaxAtlStatus =
    params.salesTaxAtl || (isFiler ? "Verified Active" : "Verified Inactive");
  const resolvedIncomeAtl: IncomeTaxAtlStatus =
    params.incomeTaxAtl || (isFiler ? "Verified Active" : "Verified Inactive");

  const indicators: FbrThreeIndicators = {
    salesTaxRegType: {
      status: resolvedSalesReg,
      details: "Recorded via manual verification check",
    },
    salesTaxAtl: {
      status: resolvedSalesAtl,
      details: "Recorded via manual verification check",
    },
    incomeTaxAtl: {
      status: resolvedIncomeAtl,
      isFiler,
      details: "Recorded via manual verification check",
    },
  };

  const status: TaxpayerAtlStatus = isFiler ? "Active" : "Inactive";

  const record: TaxpayerVerificationRecord = {
    id: `ver-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    companyId,
    idType: validation.type,
    rawIdentifier: validation.cleaned,
    formattedIdentifier: validation.formatted,
    maskedIdentifier,
    validFormat: true,
    status,
    isFiler,
    indicators,
    source: params.source,
    verifiedAt: now,
    verifiedBy: params.operatorName || "Authorized Operator",
    referenceNumber: params.referenceNumber?.trim() || undefined,
    notes: params.notes?.trim() || (params.source === "MANUAL_PORTAL" ? "Verified via FBR e-Portal" : "Verified via 9966 SMS"),
    province: validation.province,
    gender: validation.gender,
    officialLinks: {
      portalUrl: "https://e.fbr.gov.pk/esbn/Service.aspx?PID=TaxpayerVerification",
      irisUrl: "https://iris.fbr.gov.pk/",
      smsInstruction: `Send SMS: "ATL ${validation.type === "CNIC" ? validation.cleaned : validation.cleaned.slice(0, 7)}" to 9966`,
    },
  };

  const saved = await recordTaxpayerVerification(companyId, record);

  await recordAuditLog({
    action: "taxpayer_verification.manual_recorded",
    resource: "taxpayer",
    resourceId: maskedIdentifier,
    details: {
      idType: validation.type,
      maskedIdentifier,
      source: params.source,
      status,
      indicators,
      referenceNumber: params.referenceNumber || null,
      operator: params.operatorName || "Authorized Operator",
    },
  }).catch(() => null);

  return { success: true, data: saved };
}

/**
 * Appends a taxpayer verification record to the company's persistent history in company_settings.
 */
export async function recordTaxpayerVerification(
  companyId: string,
  record: Partial<TaxpayerVerificationRecord>
): Promise<TaxpayerVerificationRecord> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("company_settings")
    .select("features")
    .eq("company_id", companyId)
    .maybeSingle();

  const features =
    existing?.features && typeof existing.features === "object" && !Array.isArray(existing.features)
      ? (existing.features as Record<string, any>)
      : {};

  const existingHistory: TaxpayerVerificationRecord[] = Array.isArray(features.fbr_taxpayer_history)
    ? features.fbr_taxpayer_history
    : [];

  const maskedId =
    record.maskedIdentifier ||
    maskTaxIdentifier(record.rawIdentifier || record.formattedIdentifier || "", record.idType);

  const completeRecord: TaxpayerVerificationRecord = {
    id: record.id || `ver-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    companyId,
    idType: record.idType || "UNKNOWN",
    // Avoid unnecessary retention of raw CNIC/NTN numbers: store masked representation only
    rawIdentifier: maskedId,
    formattedIdentifier: record.formattedIdentifier
      ? maskTaxIdentifier(record.formattedIdentifier, record.idType)
      : maskedId,
    maskedIdentifier: maskedId,
    validFormat: Boolean(record.validFormat),
    status: record.status || "Format Validated (ATL Unverified)",
    isFiler: Boolean(record.isFiler),
    indicators: record.indicators,
    source: record.source || "FORMAT_VALIDATED_ONLY",
    verifiedAt: record.verifiedAt || new Date().toISOString(),
    verifiedBy: record.verifiedBy,
    referenceNumber: record.referenceNumber,
    notes: record.notes,
    taxpayerName: record.taxpayerName,
    province: record.province,
    gender: record.gender,
  };

  // Prepend to history, keeping maximum 100 most recent records
  const updatedHistory = [completeRecord, ...existingHistory].slice(0, 100);

  await supabase
    .from("company_settings")
    .update({
      features: {
        ...features,
        fbr_taxpayer_history: updatedHistory,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);

  return completeRecord;
}

/**
 * Retrieves the verification history for a company with masked identifiers.
 * Enforces tenant isolation.
 */
export async function getTaxpayerVerificationHistory(
  companyId: string
): Promise<TaxpayerVerificationRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_settings")
    .select("features")
    .eq("company_id", companyId)
    .maybeSingle();

  const features =
    data?.features && typeof data.features === "object" && !Array.isArray(data.features)
      ? (data.features as Record<string, any>)
      : {};

  const history: TaxpayerVerificationRecord[] = Array.isArray(features.fbr_taxpayer_history)
    ? features.fbr_taxpayer_history
    : [];

  // Ensure identifiers in history remain strictly masked
  return history.map((item) => ({
    ...item,
    rawIdentifier: item.maskedIdentifier || maskTaxIdentifier(item.rawIdentifier, item.idType),
    formattedIdentifier:
      item.maskedIdentifier || maskTaxIdentifier(item.formattedIdentifier || item.rawIdentifier, item.idType),
  }));
}
