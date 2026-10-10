import * as React from "react";
import { CreditCard } from "lucide-react";
import { ContentLayout } from "@/components/layout/content-layout";
import { ComingSoonModule } from "@/components/shared/coming-soon-module";

export default function PayrollPage() {
  return (
    <ContentLayout>
      <ComingSoonModule
        moduleName="Payroll & Statutory Disbursements"
        moduleCode="PAY"
        targetPhase="Phase 3"
        icon={CreditCard}
        description="Automated monthly compensation cycles, tax withholdings, healthcare deductions, and bank ACH payment file generation."
        plannedFeatures={[
          "Configurable statutory tax deduction formulas and benefits withholding",
          "Automated monthly pay-run calculation runs with audit preview",
          "Itemized pay stub generation for employee self-service access",
          "Direct deposit NACHA / SEPA payment batch file generation",
          "Payroll expense journal entry dispatch into General Ledger",
        ]}
        schemaRef="supabase/migrations/20261010000000_init_erp_schema.sql (payroll_runs, pay_slips)"
      />
    </ContentLayout>
  );
}
