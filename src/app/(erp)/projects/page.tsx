import * as React from "react";
import { Briefcase } from "lucide-react";
import { ContentLayout } from "@/components/layout/content-layout";
import { ComingSoonModule } from "@/components/shared/coming-soon-module";

export default function ProjectsPage() {
  return (
    <ContentLayout>
      <ComingSoonModule
        moduleName="Projects & PMO Portfolio"
        moduleCode="PRJ"
        targetPhase="Phase 3"
        icon={Briefcase}
        description="Strategic capital initiatives, engineering milestones, budget commitments, and deliverable tracking."
        plannedFeatures={[
          "Capital project portfolio tracking with target delivery timelines",
          "Committed expenditure vs actual budget burn monitoring",
          "Work breakdown structure (WBS) and milestone deliverables",
          "Project risk registers and stakeholder sign-off approvals",
          "Gantt velocity curves and critical path analysis",
        ]}
        schemaRef="supabase/migrations/20261010000000_init_erp_schema.sql (projects, project_milestones)"
      />
    </ContentLayout>
  );
}
