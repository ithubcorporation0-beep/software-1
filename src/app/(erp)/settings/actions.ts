"use server";

import { revalidatePath } from "next/cache";
import { updateCompanySettings } from "@/lib/company/server";
import {
  inviteCompanyUser,
  updateMemberRole,
  toggleMemberStatus,
  createCustomRole,
  deleteCustomRole,
} from "@/lib/users/server";

export interface ActionState<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  data?: T;
}

/**
 * Server Action for saving company profile and fiscal settings.
 */
export async function saveCompanySettingsAction(
  companyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const rawData = {
      name: formData.get("name") as string,
      logo: (formData.get("logo") as string) || "",
      address: (formData.get("address") as string) || "",
      phone: (formData.get("phone") as string) || "",
      email: (formData.get("email") as string) || "",
      website: (formData.get("website") as string) || "",
      taxInformation: (formData.get("taxInformation") as string) || "",
      currency: (formData.get("currency") as string) || "PKR",
      timezone: (formData.get("timezone") as string) || "UTC",
      language: (formData.get("language") as string) || "en",
      dateFormat: (formData.get("dateFormat") as any) || "YYYY-MM-DD",
      invoicePrefix: (formData.get("invoicePrefix") as string) || "INV-",
      startingInvoiceNumber: Number(formData.get("startingInvoiceNumber") || 1001),
      defaultTaxSetting: Number(formData.get("defaultTaxSetting") || 0),
      paymentTerms: (formData.get("paymentTerms") as string) || "Net 30",
      notificationPreferences: {
        emailAlerts: formData.get("emailAlerts") === "on" || formData.get("emailAlerts") === "true",
        securityAlerts: formData.get("securityAlerts") === "on" || formData.get("securityAlerts") === "true",
        systemDigest: formData.get("systemDigest") === "on" || formData.get("systemDigest") === "true",
      },
    };

    const res = await updateCompanySettings(companyId, rawData);
    if (!res.success) {
      return {
        success: false,
        error: res.error || "Failed to update company settings",
        errors: res.errors,
      };
    }

    revalidatePath("/settings");
    revalidatePath("/");
    return {
      success: true,
      message: "Company profile and operating settings successfully updated.",
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected error occurred while saving settings",
    };
  }
}

/**
 * Server Action for inviting / assigning a new member.
 */
export async function inviteUserAction(
  companyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const email = formData.get("email") as string;
    const fullName = formData.get("fullName") as string;
    const roleId = formData.get("roleId") as string;

    const res = await inviteCompanyUser(companyId, { email, fullName, roleId });
    if (!res.success) {
      return { success: false, error: res.error || "Failed to invite user" };
    }

    revalidatePath("/settings");
    return {
      success: true,
      message: `User ${email} successfully invited and assigned to organization.`,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected error occurred while inviting user",
    };
  }
}

/**
 * Server Action for changing an existing member's role.
 */
export async function updateMemberRoleAction(
  companyId: string,
  membershipId: string,
  newRoleId: string
): Promise<ActionState> {
  try {
    const res = await updateMemberRole(companyId, membershipId, newRoleId);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to update role" };
    }

    revalidatePath("/settings");
    return {
      success: true,
      message: "Member role successfully updated.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update member role",
    };
  }
}

/**
 * Server Action for toggling user active / suspended status.
 */
export async function toggleMemberStatusAction(
  companyId: string,
  membershipId: string,
  newStatus: "ACTIVE" | "SUSPENDED"
): Promise<ActionState> {
  try {
    const res = await toggleMemberStatus(companyId, membershipId, newStatus);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to update member status" };
    }

    revalidatePath("/settings");
    return {
      success: true,
      message: `Member status updated to ${newStatus}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update member status",
    };
  }
}

/**
 * Server Action for creating a tenant custom role.
 */
export async function createCustomRoleAction(
  companyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const description = (formData.get("description") as string) || "";
    const permissionCodes = formData.getAll("permissionCodes") as string[];

    const res = await createCustomRole(companyId, {
      name,
      code,
      description,
      permissionCodes,
    });

    if (!res.success) {
      return { success: false, error: res.error || "Failed to create custom role" };
    }

    revalidatePath("/settings");
    return {
      success: true,
      message: `Custom role '${name}' successfully created with ${permissionCodes.length} permissions.`,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to create custom role",
    };
  }
}

/**
 * Server Action for deleting a tenant custom role.
 */
export async function deleteCustomRoleAction(
  companyId: string,
  roleId: string
): Promise<ActionState> {
  try {
    const res = await deleteCustomRole(companyId, roleId);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to delete custom role" };
    }

    revalidatePath("/settings");
    return {
      success: true,
      message: "Custom role successfully deleted.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to delete custom role",
    };
  }
}

import {
  updateCompanyFbrSettings,
  testFbrConnection,
  FbrCompanyConfig,
  FbrOnboardingStatus,
} from "@/lib/fbr-settings";

/**
 * Server Action for updating company FBR integration configuration.
 */
export async function saveFbrSettingsAction(
  companyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState<FbrCompanyConfig>> {
  try {
    const rawData = {
      enabled: formData.get("enabled") === "true" || formData.get("enabled") === "on",
      environment: (formData.get("environment") as "sandbox" | "production") || "sandbox",
      integratorName: (formData.get("integratorName") as string) || "PRAL (Pakistan Revenue Automation Limited)",
      sellerNtn: (formData.get("sellerNtn") as string) || "",
      sellerStrn: (formData.get("sellerStrn") as string) || "",
      posId: (formData.get("posId") as string) || "",
      enableDigitalInvoicing: formData.get("enableDigitalInvoicing") === "true" || formData.get("enableDigitalInvoicing") === "on",
      enableTaxpayerVerification: formData.get("enableTaxpayerVerification") === "true" || formData.get("enableTaxpayerVerification") === "on",
      onboardingStatus: (formData.get("onboardingStatus") as FbrOnboardingStatus) || "Not Configured",
    };

    const res = await updateCompanyFbrSettings(companyId, rawData);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to update FBR integration settings" };
    }

    revalidatePath("/settings");
    return {
      success: true,
      message: "FBR integration configuration saved successfully.",
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update FBR integration settings",
    };
  }
}

/**
 * Server Action for testing live connection to FBR gateway.
 */
export async function testFbrConnectionAction(companyId: string): Promise<ActionState> {
  try {
    const res = await testFbrConnection(companyId);
    revalidatePath("/settings");
    return {
      success: res.success,
      message: res.message,
      data: { status: res.status },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to test FBR connection",
    };
  }
}

import {
  verifyFbrTaxpayer,
  recordManualTaxpayerVerification,
  getTaxpayerVerificationHistory,
  FbrTaxpayerVerificationResult,
} from "@/lib/fbr-taxpayer-service";
import {
  TaxpayerVerificationRecord,
  SalesTaxRegTypeStatus,
  SalesTaxAtlStatus,
  IncomeTaxAtlStatus,
} from "@/lib/fbr-types";
import { getCurrentUser } from "@/lib/auth/server";

/**
 * Server Action for verifying a taxpayer (CNIC/NTN) via the FBR gateway or format check.
 */
export async function verifyTaxpayerAction(
  companyId: string,
  taxNumber: string,
  customerType: string = "Retailer"
): Promise<ActionState<FbrTaxpayerVerificationResult>> {
  try {
    const user = await getCurrentUser();
    const res = await verifyFbrTaxpayer(taxNumber, customerType, companyId, user?.email);
    revalidatePath("/settings");
    return {
      success: res.success,
      message: res.message,
      data: res,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to verify taxpayer",
    };
  }
}

/**
 * Server Action for recording an authorized manual verification entry with three indicators.
 */
export async function recordManualTaxpayerVerificationAction(
  companyId: string,
  payload: {
    taxNumber: string;
    source: "MANUAL_PORTAL" | "MANUAL_SMS";
    status?: "Active" | "Inactive";
    salesTaxRegType?: SalesTaxRegTypeStatus;
    salesTaxAtl?: SalesTaxAtlStatus;
    incomeTaxAtl?: IncomeTaxAtlStatus;
    referenceNumber?: string;
    notes?: string;
  }
): Promise<ActionState<TaxpayerVerificationRecord>> {
  try {
    const user = await getCurrentUser();
    const res = await recordManualTaxpayerVerification(companyId, {
      ...payload,
      operatorName: user?.email || "Authorized Operator",
    });

    if (!res.success || !res.data) {
      return { success: false, error: res.error || "Failed to record manual verification" };
    }

    revalidatePath("/settings");
    return {
      success: true,
      message: `Manual verification successfully recorded via ${payload.source}.`,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to record manual verification",
    };
  }
}

/**
 * Server Action for fetching recent taxpayer verification history for a tenant.
 */
export async function getTaxpayerVerificationHistoryAction(
  companyId: string
): Promise<ActionState<TaxpayerVerificationRecord[]>> {
  try {
    const history = await getTaxpayerVerificationHistory(companyId);
    return {
      success: true,
      data: history,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to load verification history",
      data: [],
    };
  }
}


