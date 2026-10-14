import { z } from "zod";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";

export const companySettingsSchema = z.object({
  name: z.string().trim().min(2, "Company name must be at least 2 characters").max(100),
  logo: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid corporate email").optional().or(z.literal("")),
  website: z.string().trim().max(255).optional().or(z.literal("")),
  taxInformation: z.string().trim().max(50).optional().or(z.literal("")),
  currency: z.string().trim().length(3, "Currency must be a 3-letter ISO code").default("PKR"),
  timezone: z.string().trim().min(1, "Timezone is required").default("UTC"),
  language: z.string().trim().min(2).max(10).default("en"),
  dateFormat: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]).default("YYYY-MM-DD"),
  invoicePrefix: z.string().trim().min(1).max(10).default("INV-"),
  startingInvoiceNumber: z.coerce.number().int().min(1).default(1001),
  defaultTaxSetting: z.coerce.number().min(0).max(100).default(0),
  paymentTerms: z.string().trim().min(1).default("Net 30"),
  notificationPreferences: z.object({
    emailAlerts: z.boolean().default(true),
    securityAlerts: z.boolean().default(true),
    systemDigest: z.boolean().default(false),
  }).default({
    emailAlerts: true,
    securityAlerts: true,
    systemDigest: false,
  }),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;

export interface CompanyExtendedSettings extends CompanySettingsInput {
  companyId: string;
  slug: string;
  plan: string;
  status: string;
  fiscalYearStart: string;
  theme: string;
  updatedAt: string;
  updatedBy?: string | null;
}

/**
 * Retrieves company profile and operational settings.
 * Fails closed if the caller does not possess `settings:view` or Super Admin privileges.
 * Deduplicated per-request via React cache().
 */
export const getCompanySettings = cache(
  async function getCompanySettings(companyId: string): Promise<CompanyExtendedSettings> {
    await requirePermission(companyId, "settings:view");

  const supabase = await createClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (companyError || !company) {
    throw new Error(`Company ${companyId} not found`);
  }

  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  const features = (settings?.features && typeof settings.features === "object" && !Array.isArray(settings.features))
    ? (settings.features as Record<string, any>)
    : {};

  return {
    companyId: company.id,
    name: company.name,
    slug: company.slug,
    plan: company.plan,
    status: company.status,
    currency: settings?.currency || "PKR",
    timezone: settings?.timezone || "UTC",
    fiscalYearStart: settings?.fiscal_year_start || "01-01",
    theme: settings?.theme || "obsidian",
    logo: features.logo || "",
    address: features.address || "",
    phone: features.phone || "",
    email: features.email || "",
    website: features.website || "",
    taxInformation: features.taxInformation || "",
    language: features.language || "en",
    dateFormat: features.dateFormat || "YYYY-MM-DD",
    invoicePrefix: features.invoicePrefix || "INV-",
    startingInvoiceNumber: features.startingInvoiceNumber ?? 1001,
    defaultTaxSetting: features.defaultTaxSetting ?? 0,
    paymentTerms: features.paymentTerms || "Net 30",
    notificationPreferences: {
      emailAlerts: features.notificationPreferences?.emailAlerts ?? true,
      securityAlerts: features.notificationPreferences?.securityAlerts ?? true,
      systemDigest: features.notificationPreferences?.systemDigest ?? false,
    },
    updatedAt: settings?.updated_at || company.updated_at,
    updatedBy: settings?.updated_by || null,
  };
});

/**
 * Updates company profile and extended settings.
 * Validates every change and authorizes with `settings:edit`.
 * Emits immutable audit log with sanitized change set.
 */
export async function updateCompanySettings(
  companyId: string,
  rawData: unknown
): Promise<{ success: boolean; data?: CompanyExtendedSettings; error?: string; errors?: Record<string, string[]> }> {
  const user = await requireUser();
  await requirePermission(companyId, "settings:edit", user);

  const parsed = companySettingsSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed: please review the highlighted fields",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const valid = parsed.data;
  const supabase = await createClient();
  const now = new Date().toISOString();

  // 1. Update company record (e.g. legal company name)
  const { error: companyUpdateError } = await supabase
    .from("companies")
    .update({
      name: valid.name,
      updated_at: now,
    })
    .eq("id", companyId);

  if (companyUpdateError) {
    return { success: false, error: companyUpdateError.message };
  }

  // 2. Fetch existing settings to preserve unrecognized features
  const { data: existingSettings } = await supabase
    .from("company_settings")
    .select("features")
    .eq("company_id", companyId)
    .maybeSingle();

  const existingFeatures = (existingSettings?.features && typeof existingSettings.features === "object" && !Array.isArray(existingSettings.features))
    ? (existingSettings.features as Record<string, any>)
    : {};

  const updatedFeatures = {
    ...existingFeatures,
    logo: valid.logo || "",
    address: valid.address || "",
    phone: valid.phone || "",
    email: valid.email || "",
    website: valid.website || "",
    taxInformation: valid.taxInformation || "",
    language: valid.language,
    dateFormat: valid.dateFormat,
    invoicePrefix: valid.invoicePrefix,
    startingInvoiceNumber: valid.startingInvoiceNumber,
    defaultTaxSetting: valid.defaultTaxSetting,
    paymentTerms: valid.paymentTerms,
    notificationPreferences: valid.notificationPreferences,
  };

  // 3. Upsert company_settings
  const { error: settingsError } = await supabase
    .from("company_settings")
    .upsert({
      company_id: companyId,
      currency: valid.currency.toUpperCase(),
      timezone: valid.timezone,
      features: updatedFeatures,
      updated_at: now,
      updated_by: user.id,
    }, { onConflict: "company_id" });

  if (settingsError) {
    return { success: false, error: settingsError.message };
  }

  // 4. Record audit log
  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "company.settings_update",
    resource: "company_settings",
    resourceId: companyId,
    details: {
      name: valid.name,
      currency: valid.currency,
      timezone: valid.timezone,
      invoicePrefix: valid.invoicePrefix,
      startingInvoiceNumber: valid.startingInvoiceNumber,
      defaultTaxSetting: valid.defaultTaxSetting,
      paymentTerms: valid.paymentTerms,
      updatedFields: Object.keys(valid),
    },
  });

  const updated = await getCompanySettings(companyId);
  return { success: true, data: updated };
}
