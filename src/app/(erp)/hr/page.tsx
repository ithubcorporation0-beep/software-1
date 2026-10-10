import * as React from "react";
import { UserCheck } from "lucide-react";
import { ContentLayout } from "@/components/layout/content-layout";
import { ComingSoonModule } from "@/components/shared/coming-soon-module";

export default function HrPage() {
  return (
    <ContentLayout>
      <ComingSoonModule
        moduleName="Human Resources & Staff Directory"
        moduleCode="HR"
        targetPhase="Phase 4"
        icon={UserCheck}
        description="Employee profiles, organizational department hierarchies, onboarding workflows, leave tracking, and compliance records."
        plannedFeatures={[
          "Enterprise employee master database with employment status tags",
          "Department structure and managerial reporting lines",
          "Paid time off (PTO) request and approval workflows",
          "Onboarding and offboarding task checklists",
          "Compliance document storage and performance review cycles",
        ]}
        schemaRef="supabase/migrations/20261010000000_init_erp_schema.sql (employees, departments)"
      />
    </ContentLayout>
  );
}
