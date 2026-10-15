import * as React from "react";
import { Suspense } from "react";
import { ContentLayout } from "@/components/layout/content-layout";
import { ExploreModulesDashboard } from "@/components/dashboard/explore-modules-dashboard";
import { getDashboardTelemetry } from "@/lib/dashboard/server";
import { getCurrentUser } from "@/lib/auth/server";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

async function DashboardTelemetryStreamer({ companyId }: { companyId: string }) {
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
    <ExploreModulesDashboard
      metrics={metrics}
      companyName={company.name || "Business Solutions Tax Consultants"}
      userDisplayName="BSTC"
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 rounded-xl bg-card/60 border p-6 flex flex-col justify-center gap-2">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  await getCurrentUser();
  const companyId = DEFAULT_COMPANY_ID;

  return (
    <ContentLayout>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardTelemetryStreamer companyId={companyId} />
      </Suspense>
    </ContentLayout>
  );
}
