import * as React from "react";
import { Users } from "lucide-react";
import { ContentLayout } from "@/components/layout/content-layout";
import { ComingSoonModule } from "@/components/shared/coming-soon-module";

export default function CrmPage() {
  return (
    <ContentLayout>
      <ComingSoonModule
        moduleName="CRM & Commercial Accounts"
        moduleCode="CRM"
        targetPhase="Phase 2"
        icon={Users}
        description="Enterprise customer directory, account executives, lifetime valuation metrics, and opportunity pipeline management."
        plannedFeatures={[
          "B2B Enterprise Account Profiles and credit limit governance",
          "Commercial contact hierarchy and stakeholder directory",
          "Opportunity sales pipeline stages (Lead, Prospect, Won, Lost)",
          "Customer lifetime value (LTV) and order history aggregations",
          "Interaction timeline logs and meeting activity records",
        ]}
        schemaRef="supabase/migrations/20261010000000_init_erp_schema.sql (accounts, contacts)"
      />
    </ContentLayout>
  );
}
