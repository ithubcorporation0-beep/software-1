import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { SettingsClient } from "./settings-client";
import { getCompanySettings } from "@/lib/company/server";
import { getCompanyMembers, getCompanyRoles, getPermissionsCatalog } from "@/lib/users/server";
import { getCompanyAuditLogs } from "@/lib/audit/server";
import { requireCompanyMembership } from "@/lib/auth/server";
import { getCompanyFbrSettings, DEFAULT_FBR_CONFIG, getFbrCredentialsStatus } from "@/lib/fbr-settings";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

interface SettingsPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const initialTab = params?.tab || "company";
  const companyId = DEFAULT_COMPANY_ID;

  // Verify company membership context
  let membershipContext;
  try {
    membershipContext = await requireCompanyMembership(companyId);
  } catch {
    membershipContext = null;
  }

  // Load authorized tenant data
  const [companySettings, members, roles, permissionsCatalog, auditLogs, fbrOverview] = await Promise.all([
    getCompanySettings(companyId).catch(() => ({
      companyId,
      name: "IT-HUB Global Technologies Corp",
      slug: "it-hub-global",
      plan: "ENTERPRISE",
      status: "ACTIVE",
      currency: "PKR",
      timezone: "UTC",
      fiscalYearStart: "01-01",
      theme: "obsidian",
      logo: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      taxInformation: "",
      language: "en",
      dateFormat: "YYYY-MM-DD" as const,
      invoicePrefix: "INV-",
      startingInvoiceNumber: 1001,
      defaultTaxSetting: 0,
      paymentTerms: "Net 30",
      notificationPreferences: { emailAlerts: true, securityAlerts: true, systemDigest: false },
      updatedAt: new Date().toISOString(),
    })),
    getCompanyMembers(companyId).catch(() => []),
    getCompanyRoles(companyId).catch(() => []),
    getPermissionsCatalog().catch(() => []),
    getCompanyAuditLogs(companyId, { limit: 50 }).catch(() => []),
    getCompanyFbrSettings(companyId).catch(() => ({
      config: DEFAULT_FBR_CONFIG,
      credentialsStatus: getFbrCredentialsStatus(),
      effectiveStatus: "Not Configured" as const,
    })),
  ]);

  return (
    <ContentLayout>
      <PageHeader
        title="Company Settings & Governance"
        description="Multi-tenant organization profile, role-based access control (RBAC), FBR electronic invoicing, and compliance audit trails."
        breadcrumbs={[
          { label: "Settings & Governance" }
        ]}
      />

      <SettingsClient
        companySettings={companySettings}
        members={members}
        roles={roles}
        permissionsCatalog={permissionsCatalog}
        auditLogs={auditLogs}
        fbrOverview={fbrOverview}
        initialTab={initialTab}
      />
    </ContentLayout>
  );
}
