import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { ReportsClient } from "./reports-client";
import { getComprehensiveReports } from "@/lib/reports/server";
import { getCurrentUser } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function ReportsPage() {
  const companyId = DEFAULT_COMPANY_ID;
  let currentUser: any = null;

  try {
    currentUser = await getCurrentUser();
  } catch {
    // Falls closed
  }

  const reports = await getComprehensiveReports(companyId, {}, currentUser || undefined).catch(() => ({
    companyId,
    currency: "PKR",
    salesSummary: {
      byMonth: [],
      byCustomer: [],
      totalSales: 0,
    },
    finance: {
      revenueTotal: 0,
      expensesTotal: 0,
      netOperatingIncome: 0,
      outstandingReceivables: 0,
      accountsPayable: 0,
      cashAndBankBalance: 0,
    },
    workforce: {
      totalStaff: 0,
      attendancePresent: 0,
      attendanceLate: 0,
      leaveCount: 0,
      totalPayrollDisbursed: 0,
      activeDepartments: 0,
    },
    inventory: {
      totalSkus: 0,
      totalStockUnits: 0,
      totalValuation: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalMovements: 0,
      totalPurchasedAmount: 0,
    },
    pmo: {
      totalProjects: 0,
      activeProjects: 0,
      totalBudget: 0,
      averageProgressPct: 0,
      totalTasks: 0,
      completedTasks: 0,
      urgentTasks: 0,
    },
  }));

  return (
    <ContentLayout>
      <PageHeader
        title="Enterprise Intelligence & Reports"
        description="Consolidated sales, GAAP general ledger summaries, workforce compensation, stock valuation, and PMO velocity."
        breadcrumbs={[{ label: "Reports" }]}
      />

      <ReportsClient initialReports={reports} />
    </ContentLayout>
  );
}
