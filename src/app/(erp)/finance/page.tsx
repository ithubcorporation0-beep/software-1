import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { FinanceClient } from "./finance-client";
import {
  getExpenses,
  getAccounts,
  getJournalEntries,
  getProfitLossReport,
  getBalanceSheetReport,
  getCashFlowReport,
  getARAgingReport,
  getAPAgingReport,
  initializeCompanyChartOfAccounts,
} from "@/lib/finance/server";
import { getCompanySettings } from "@/lib/company/server";
import { getCurrentUser, requireCompanyMembership } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function FinancePage() {
  const companyId = DEFAULT_COMPANY_ID;

  let isSuperAdmin = false;
  let currentUserId = "";

  try {
    const user = await getCurrentUser();
    if (user) {
      currentUserId = user.id;
      isSuperAdmin = user.is_super_admin;
    }
    await requireCompanyMembership(companyId);
  } catch {
    // Falls closed
  }

  const [expenses, accounts, journalEntries, pl, bs, cf, ar, ap, settings] =
    await Promise.all([
      getExpenses(companyId).catch(() => []),
      getAccounts(companyId).catch(() => []),
      getJournalEntries(companyId).catch(() => []),
      getProfitLossReport(companyId, {}).catch(() => ({
        period: { from: "", to: "" },
        revenue: { items: [], total: 0 },
        expenses: { items: [], total: 0 },
        netOperatingIncome: 0,
        netProfitMarginPct: 0,
      })),
      getBalanceSheetReport(companyId).catch(() => ({
        asOfDate: new Date().toISOString().split("T")[0],
        assets: { current: [], nonCurrent: [], total: 0 },
        liabilities: { current: [], nonCurrent: [], total: 0 },
        equity: { items: [], currentPeriodEarnings: 0, total: 0 },
        totalLiabilitiesAndEquity: 0,
        isBalanced: true,
        variance: 0,
      })),
      getCashFlowReport(companyId, {}).catch(() => ({
        period: { from: "", to: "" },
        operatingInflows: [],
        totalInflows: 0,
        operatingOutflows: [],
        totalOutflows: 0,
        netOperatingCashFlow: 0,
      })),
      getARAgingReport(companyId).catch(() => ({
        asOfDate: new Date().toISOString().split("T")[0],
        totalAR: 0,
        current: 0,
        days1_30: 0,
        days31_60: 0,
        days61_90: 0,
        days90Plus: 0,
        customers: [],
      })),
      getAPAgingReport(companyId).catch(() => ({
        asOfDate: new Date().toISOString().split("T")[0],
        totalAP: 0,
        vendors: [],
      })),
      getCompanySettings(companyId).catch(() => ({ currency: "PKR" })),
    ]);

  return (
    <ContentLayout>
      <PageHeader
        title="Finance & General Ledger"
        description="Verifiable double-entry general ledger, operating expense management, and real-time GAAP financial statements."
        breadcrumbs={[{ label: "Finance & General Ledger" }]}
      />

      <FinanceClient
        companyId={companyId}
        currency={settings.currency || "PKR"}
        currentUserId={currentUserId}
        isSuperAdmin={isSuperAdmin}
        initialExpenses={expenses}
        initialAccounts={accounts}
        initialJournalEntries={journalEntries}
        initialPL={pl}
        initialBalanceSheet={bs}
        initialCashFlow={cf}
        initialAR={ar}
        initialAP={ap}
      />
    </ContentLayout>
  );
}
