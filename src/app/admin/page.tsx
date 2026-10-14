import * as React from "react";
import { getSuperAdminMetrics } from "@/lib/super-admin/server";
import { OverviewClient } from "./overview-client";

export const metadata = {
  title: "Platform Overview | IT HUB Super Admin",
  description: "Cross-tenant multi-organization SaaS administrative management and security governance.",
};

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  let metrics;
  try {
    metrics = await getSuperAdminMetrics();
  } catch {
    metrics = {
      totalCompanies: 0,
      pendingApprovals: 0,
      activeCompanies: 0,
      suspendedCompanies: 0,
      rejectedCompanies: 0,
      totalUsers: 0,
      recentlyActiveUsers: 0,
      pendingRequests: [],
      recentAuditLogs: [],
    };
  }

  return <OverviewClient metrics={metrics} />;
}
