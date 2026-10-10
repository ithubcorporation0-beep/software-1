import * as React from "react";
import { BarChart3 } from "lucide-react";
import { ContentLayout } from "@/components/layout/content-layout";
import { ComingSoonModule } from "@/components/shared/coming-soon-module";

export default function ReportsPage() {
  return (
    <ContentLayout>
      <ComingSoonModule
        moduleName="Reports & Audit Intelligence"
        moduleCode="REP"
        targetPhase="Phase 4"
        icon={BarChart3}
        description="Comprehensive audit-ready financial schedules, inventory valuation exports, and operations compliance reporting."
        plannedFeatures={[
          "Inventory asset valuation schedules with WAC costing breakdown",
          "Immutable stock movement and cycle-count discrepancy ledgers",
          "Financial profit and loss (P&L) statements with CSV and PDF export",
          "Custom query builder with automated scheduled email dispatches",
          "Cryptographic audit log verification and change history inspect",
        ]}
        schemaRef="supabase/migrations/20261010000000_init_erp_schema.sql (audit_logs)"
      />
    </ContentLayout>
  );
}
