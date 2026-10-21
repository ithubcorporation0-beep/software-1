import { validateTaxId, TaxIdValidationResult } from "./fbr-validation";
import { getFbrAccessToken } from "./fbr-api";
import { createClient } from "./supabase/server";

export interface FbrTaxpayerVerificationResult {
  success: boolean;
  validFormat: boolean;
  idType: "CNIC" | "NTN" | "STRN" | "UNKNOWN";
  rawId: string;
  formattedId: string;
  isFiler: boolean;
  atlStatus: "Active" | "Inactive" | "Unregistered" | "Pending";
  fbrGatewayConfigured: boolean;
  verifiedOnline: boolean;
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
  };
}

/**
 * Verifies a Pakistani CNIC or NTN for FBR ATL (Active Taxpayer List) compliance.
 * Performs rigorous structural verification and queries the FBR Gateway or local tenant cache.
 */
export async function verifyFbrTaxpayer(
  input: string,
  customerType: string = "Retailer",
  companyId?: string
): Promise<FbrTaxpayerVerificationResult> {
  const validation: TaxIdValidationResult = validateTaxId(input);

  const officialVerification = {
    smsInstruction:
      validation.type === "CNIC"
        ? `Send SMS: "ATL ${validation.cleaned}" to 9966`
        : `Send SMS: "ATL ${validation.cleaned.slice(0, 7)}" to 9966`,
    portalUrl: "https://e.fbr.gov.pk/",
    irisUrl: "https://iris.fbr.gov.pk/",
  };

  const isRetailer = customerType === "Retailer";
  const taxSection = isRetailer ? "Section 236H" : "Section 236G";
  const activeRate = isRetailer ? "0.5% (Active Filer)" : "0.1% (Active Filer)";
  const nonFilerRate = isRetailer ? "1.0% (Non-Filer 2x Penalty)" : "0.2% (Non-Filer 2x Penalty)";

  // 1. If format is invalid, immediately reject without false positives
  if (!validation.isValid) {
    return {
      success: false,
      validFormat: false,
      idType: validation.type,
      rawId: validation.raw,
      formattedId: validation.formatted,
      isFiler: false,
      atlStatus: "Unregistered",
      fbrGatewayConfigured: Boolean(process.env.FBR_CLIENT_ID && process.env.FBR_CLIENT_SECRET),
      verifiedOnline: false,
      message: validation.errorMessage || `Invalid tax identifier: ${input}.`,
      detail:
        "Pakistani tax law requires a valid 13-digit CNIC (for individuals/sole proprietors) or a 7-8 digit NTN (for corporate businesses). Check digits and lengths must match NADRA/FBR specifications.",
      taxSection,
      activeRate,
      nonFilerRate,
      officialVerification,
    };
  }

  // 2. Check if local database already has this taxpayer recorded with verified ATL status
  let localCustomerMatch: any = null;
  if (companyId) {
    try {
      const supabase = await createClient();
      const dbPromise = supabase
        .from("customers")
        .select("id, name, company_name, sales_tax_atl, income_tax_atl, cnic_number, ntn_number")
        .eq("company_id", companyId)
        .or(`cnic_number.eq.${validation.cleaned},ntn_number.eq.${validation.cleaned},tax_number.eq.${validation.cleaned}`)
        .limit(1);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 1200)
      );

      const res: any = await Promise.race([dbPromise, timeoutPromise]);
      if (res?.data && res.data.length > 0) {
        localCustomerMatch = res.data[0];
      }
    } catch {
      // Database check optional if offline/unconnected
    }
  }

  // 3. Check if real FBR OAuth credentials are configured in environment
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

        return {
          success: true,
          validFormat: true,
          idType: validation.type,
          rawId: validation.raw,
          formattedId: validation.formatted,
          isFiler,
          atlStatus: isFiler ? "Active" : "Inactive",
          fbrGatewayConfigured: true,
          verifiedOnline: true,
          province: validation.province,
          gender: validation.gender,
          businessName: data.taxpayer_name || data.business_name,
          registrationDate: data.registration_date,
          message: isFiler
            ? `Verified via live FBR Gateway: ${validation.formatted} is currently an Active Filer on ATL.`
            : `FBR Live Gateway Alert: ${validation.formatted} is listed as Inactive/Non-Filer on ATL. Non-filer tax rates apply.`,
          detail: `Tax withholding under ${taxSection}: ${isFiler ? activeRate : nonFilerRate}.`,
          taxSection,
          activeRate,
          nonFilerRate,
          officialVerification,
        };
      }
    } catch {
      // FBR API live call failed or unconfigured endpoint, fallback gracefully
    }
  }

  // 4. If existing verified local customer record exists in ERP
  if (localCustomerMatch) {
    const isFiler =
      localCustomerMatch.sales_tax_atl === "Active" ||
      localCustomerMatch.income_tax_atl === "Active";

    return {
      success: true,
      validFormat: true,
      idType: validation.type,
      rawId: validation.raw,
      formattedId: validation.formatted,
      isFiler,
      atlStatus: isFiler ? "Active" : "Inactive",
      fbrGatewayConfigured,
      verifiedOnline: false,
      province: validation.province,
      gender: validation.gender,
      businessName: localCustomerMatch.company_name || localCustomerMatch.name,
      message: `Verified from ERP records: ${localCustomerMatch.name} (${validation.formatted}) has verified ${localCustomerMatch.sales_tax_atl || "Active"} status.`,
      detail: `Existing customer record matched. Applicable rate: ${isFiler ? activeRate : nonFilerRate}.`,
      taxSection,
      activeRate,
      nonFilerRate,
      officialVerification,
    };
  }

  // 5. Valid format, but Live FBR Gateway is not yet connected in .env
  return {
    success: true,
    validFormat: true,
    idType: validation.type,
    rawId: validation.raw,
    formattedId: validation.formatted,
    isFiler: false,
    atlStatus: "Pending",
    fbrGatewayConfigured: false,
    verifiedOnline: false,
    province: validation.province,
    gender: validation.gender,
    message: `Valid ${validation.type} format confirmed (${validation.formatted}${
      validation.province ? ` — ${validation.province}` : ""
    }${validation.gender ? `, ${validation.gender}` : ""}).`,
    detail:
      "FBR Gateway API is not currently connected in environment configuration. FBR does not offer an open public API without licensed PRAL credentials. Please verify official status via FBR SMS (9966) or e.fbr.gov.pk, then select Active or Inactive status.",
    taxSection,
    activeRate,
    nonFilerRate,
    officialVerification,
  };
}
