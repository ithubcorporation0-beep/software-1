import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";
import { revalidateCompanyTag } from "@/lib/cache/tagged-cache";
import { getFbrAccessToken, clearFbrTokenCache } from "@/lib/fbr-api";

export * from "./fbr-types";
import {
  FbrCompanyConfig,
  FbrCredentialsStatus,
  FbrOnboardingStatus,
  FbrIntegrationOverview,
  DEFAULT_FBR_CONFIG,
} from "./fbr-types";

/**
 * Returns environment variable status for FBR integration without leaking sensitive values.
 */
export function getFbrCredentialsStatus(): FbrCredentialsStatus {
  const clientId = process.env.FBR_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.FBR_CLIENT_SECRET?.trim() || "";
  const sellerNtn = process.env.FBR_SELLER_NTN?.trim() || "";

  const isRealClientId = Boolean(
    clientId && !clientId.includes("placeholder") && !clientId.includes("your-fbr")
  );
  const isRealClientSecret = Boolean(
    clientSecret && !clientSecret.includes("placeholder") && !clientSecret.includes("your-fbr")
  );

  const maskedClientId = isRealClientId
    ? `${clientId.slice(0, 4)}••••••••${clientId.slice(-4)}`
    : "Not Configured";

  return {
    hasClientId: isRealClientId,
    maskedClientId,
    hasClientSecret: isRealClientSecret,
    hasSellerNtn: Boolean(sellerNtn),
    tokenUrl: process.env.FBR_TOKEN_URL || "https://api.fbr.gov.pk/oauth2/token",
    validateUrl: process.env.FBR_VALIDATE_URL || "https://api.fbr.gov.pk/invoices/validate",
    submitUrl: process.env.FBR_SUBMIT_URL || "https://api.fbr.gov.pk/invoices/submit",
    inquiryUrl: process.env.FBR_ATL_INQUIRY_URL || "https://api.fbr.gov.pk/taxpayer/atl-inquiry",
  };
}

/**
 * Derives the accurate, truthful FBR status based on live credentials, environment, and test logs.
 */
export function deriveEffectiveStatus(
  config: FbrCompanyConfig,
  creds: FbrCredentialsStatus
): FbrOnboardingStatus {
  // 1. Connection Error if the latest test failed
  if (config.lastTestStatus === "FAILED") {
    return "Connection Error";
  }

  // 2. Connected if latest test succeeded
  if (config.lastTestStatus === "SUCCESS") {
    return config.environment === "production" ? "Production Connected" : "Sandbox Connected";
  }

  // 3. Not Configured if integration is disabled and no credentials or tax identity provided
  if (!config.enabled && !config.sellerNtn && !creds.hasClientId) {
    return "Not Configured";
  }

  // 4. Awaiting Provider if enabled or configured but integrator provider name is missing
  if (!config.integratorName?.trim()) {
    return "Awaiting Provider";
  }

  // 5. Awaiting Credentials if provider is selected but API credentials are not yet sealed in env
  if (!creds.hasClientId || !creds.hasClientSecret) {
    return "Awaiting Credentials";
  }

  // 6. Credentials exist, but sandbox has not yet been verified
  if (config.environment === "sandbox") {
    return "Sandbox Not Tested";
  }

  // 7. Production environment selected with credentials, but awaiting live approval / production verification
  return "Production Pending Approval";
}

/**
 * Retrieves the company's FBR integration settings.
 */
export async function getCompanyFbrSettings(companyId: string): Promise<FbrIntegrationOverview> {
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

  const savedFbr = features.fbr || {};
  const config: FbrCompanyConfig = {
    ...DEFAULT_FBR_CONFIG,
    ...savedFbr,
    sellerNtn: savedFbr.sellerNtn || process.env.FBR_SELLER_NTN || "",
  };

  const credentialsStatus = getFbrCredentialsStatus();
  const effectiveStatus = deriveEffectiveStatus(config, credentialsStatus);

  return {
    config,
    credentialsStatus,
    effectiveStatus,
  };
}

/**
 * Saves company FBR integration settings.
 */
export async function updateCompanyFbrSettings(
  companyId: string,
  newFbrConfig: Partial<FbrCompanyConfig>
): Promise<{ success: boolean; data?: FbrCompanyConfig; error?: string }> {
  const user = await requireUser();
  await requirePermission(companyId, "settings:edit", user);

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

  const mergedFbr: FbrCompanyConfig = {
    ...DEFAULT_FBR_CONFIG,
    ...(features.fbr || {}),
    ...newFbrConfig,
  };

  const { error } = await supabase
    .from("company_settings")
    .update({
      features: {
        ...features,
        fbr: mergedFbr,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "settings.fbr_update",
    resource: "company_settings",
    resourceId: companyId,
    details: {
      environment: mergedFbr.environment,
      sellerNtn: mergedFbr.sellerNtn,
      onboardingStatus: mergedFbr.onboardingStatus,
    },
  });

  await revalidateCompanyTag(companyId, "settings");
  return { success: true, data: mergedFbr };
}

/**
 * Executes an actual live test of the FBR integration.
 * Validates OAuth authentication against PRAL/FBR endpoints and records sanitized results.
 */
export async function testFbrConnection(
  companyId: string
): Promise<{ success: boolean; status: FbrOnboardingStatus; message: string }> {
  const user = await requireUser();
  await requirePermission(companyId, "settings:edit", user);

  const creds = getFbrCredentialsStatus();
  const overview = await getCompanyFbrSettings(companyId);
  const now = new Date().toISOString();

  if (!creds.hasClientId || !creds.hasClientSecret) {
    const errorMsg =
      "Cannot test connection: FBR_CLIENT_ID and FBR_CLIENT_SECRET are not configured in environment variables (.env.local on local or Vercel Settings in production).";

    const updatedErrors = [
      { timestamp: now, message: errorMsg },
      ...(overview.config.recentErrors || []).slice(0, 4),
    ];

    await updateCompanyFbrSettings(companyId, {
      lastTestedAt: now,
      lastTestStatus: "FAILED",
      lastTestMessage: errorMsg,
      recentErrors: updatedErrors,
    });

    return {
      success: false,
      status: "Awaiting Credentials",
      message: errorMsg,
    };
  }

  try {
    clearFbrTokenCache();
    const token = await getFbrAccessToken();

    if (!token) {
      throw new Error("FBR authentication server returned an empty access token.");
    }

    const successMessage = `OAuth 2.0 token successfully acquired. Authenticated with ${overview.config.environment.toUpperCase()} gateway.`;

    await updateCompanyFbrSettings(companyId, {
      lastTestedAt: now,
      lastTestStatus: "SUCCESS",
      lastTestMessage: successMessage,
    });

    await recordAuditLog({
      companyId,
      userId: user.id,
      action: "settings.fbr_test_connection_success",
      resource: "fbr_gateway",
      details: { environment: overview.config.environment },
    });

    const newStatus: FbrOnboardingStatus =
      overview.config.environment === "production" ? "Production Connected" : "Sandbox Connected";

    return {
      success: true,
      status: newStatus,
      message: successMessage,
    };
  } catch (err: any) {
    const sanitizedError = (err.message || "Failed to communicate with FBR endpoint").replace(
      /[a-zA-Z0-9_\-]{20,}/g,
      "[REDACTED]"
    );

    const updatedErrors = [
      { timestamp: now, message: sanitizedError },
      ...(overview.config.recentErrors || []).slice(0, 4),
    ];

    await updateCompanyFbrSettings(companyId, {
      lastTestedAt: now,
      lastTestStatus: "FAILED",
      lastTestMessage: sanitizedError,
      recentErrors: updatedErrors,
    });

    await recordAuditLog({
      companyId,
      userId: user.id,
      action: "settings.fbr_test_connection_failed",
      resource: "fbr_gateway",
      details: { error: sanitizedError },
    });

    return {
      success: false,
      status: "Connection Error",
      message: `FBR Gateway Connection Error: ${sanitizedError}`,
    };
  }
}
