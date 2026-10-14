import * as React from "react";
import { ContentLayout } from "@/components/layout/content-layout";
import { ExploreModulesDashboard } from "@/components/dashboard/explore-modules-dashboard";
import { getDashboardTelemetry } from "@/lib/dashboard/server";
import { getCurrentUser } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const companyId = DEFAULT_COMPANY_ID;

  let dashboardData;
  try {
    dashboardData = await getDashboardTelemetry(companyId);
  } catch {
    dashboardData = null;
  }

  const {
    metrics,
    company = { name: "Business Solutions Tax Consultants", plan: "ENTERPRISE" },
  } = dashboardData || {};

  return (
    <ContentLayout>
      <ExploreModulesDashboard
        metrics={metrics}
        companyName={company.name || "Business Solutions Tax Consultants"}
        userDisplayName="BSTC"
      />
    </ContentLayout>
  );
}
