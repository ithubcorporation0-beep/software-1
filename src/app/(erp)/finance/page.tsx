import * as React from "react";
import { DollarSign } from "lucide-react";
import { ContentLayout } from "@/components/layout/content-layout";
import { ComingSoonModule } from "@/components/shared/coming-soon-module";

export default function FinancePage() {
  return (
    <ContentLayout>
      <ComingSoonModule
        moduleName="Finance & General Ledger"
        moduleCode="FIN"
        targetPhase="Phase 3"
        icon={DollarSign}
        description="Double-entry chart of accounts, journal entries, balance sheets, accounts receivable/payable, and cash flow."
        plannedFeatures={[
          "Standard double-entry General Ledger with GAAP compliance",
          "Chart of Accounts (Assets, Liabilities, Equity, Revenue, COGS, OpEx)",
          "Real-time Balance Sheet and Profit & Loss (P&L) generation",
          "Accounts Receivable (A/R) aging and Accounts Payable (A/P) scheduling",
          "Multi-currency transaction reconciliations and treasury bank feeds",
        ]}
        schemaRef="supabase/migrations/20261010000000_init_erp_schema.sql (chart_of_accounts, journal_entries)"
      />
    </ContentLayout>
  );
}
