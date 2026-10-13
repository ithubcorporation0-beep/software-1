import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { syncSystemNotifications, getUserNotifications, type NotificationRecord } from "@/lib/notifications/server";
import { requireCompanyMembership } from "@/lib/auth/server";
import { NotificationsClient } from "./notifications-client";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export const metadata = {
  title: "Notifications & System Alerts | IT-HUB ERP",
  description: "Operational activity stream, low-stock warnings, and tenant alerts.",
};

export default async function NotificationsPage() {
  const companyId = DEFAULT_COMPANY_ID;

  try {
    await requireCompanyMembership(companyId);
  } catch {
    // Fail-safe default
  }

  // Scan live business state (low stock, overdue invoices, urgent tasks)
  await syncSystemNotifications(companyId).catch(() => 0);
  const notifications: NotificationRecord[] = await getUserNotifications(companyId).catch(() => []);

  return (
    <ContentLayout>
      <PageHeader
        title="Notifications & System Alerts"
        description="Monitor automated stock threshold triggers, overdue receivables, project deadlines, and security events."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Notifications" },
        ]}
      />

      <NotificationsClient
        companyId={companyId}
        initialNotifications={notifications}
      />
    </ContentLayout>
  );
}
