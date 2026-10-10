import * as React from "react";
import { Settings } from "lucide-react";
import { ContentLayout } from "@/components/layout/content-layout";
import { ComingSoonModule } from "@/components/shared/coming-soon-module";

export default function SettingsPage() {
  return (
    <ContentLayout>
      <ComingSoonModule
        moduleName="System Settings & Governance"
        moduleCode="SET"
        targetPhase="Phase 4"
        icon={Settings}
        description="Multi-tenant organization profile, role-based access control (RBAC), API integrations, and security policies."
        plannedFeatures={[
          "Organization legal entities and fiscal tax year definitions",
          "Fine-grained RBAC role creator and custom permission assignments",
          "SSO / SAML 2.0 and Multi-Factor Authentication (MFA) enforcement",
          "Webhooks, REST API keys, and third-party logistics connectors",
          "Automated cloud backup schedules and disaster recovery protocols",
        ]}
        schemaRef="supabase/migrations/20261010000000_init_erp_schema.sql (tenants, roles, permissions)"
      />
    </ContentLayout>
  );
}
