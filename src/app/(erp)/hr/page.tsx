import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { HRClient } from "./hr-client";
import {
  getHREmployees,
  getDepartments,
  getHRAttendance,
  getHRLeaves,
  getHRWorkdaySettings,
  getHRAttendanceSummaryReport,
  initializeCompanyHR,
  canViewSensitiveHR,
} from "@/lib/hr/server";
import { getCompanySettings } from "@/lib/company/server";
import { getCurrentUser, requireCompanyMembership } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function HrPage() {
  const companyId = DEFAULT_COMPANY_ID;

  let canViewSensitive = false;
  let currentUser: any = null;

  try {
    currentUser = await getCurrentUser();
    const context = await requireCompanyMembership(companyId, currentUser || undefined);
    if (currentUser) {
      canViewSensitive = canViewSensitiveHR({
        user: currentUser,
        permissions: context.permissions,
      });
    }
  } catch {
    // Falls closed
  }

  await initializeCompanyHR(companyId).catch(() => {});

  const [employees, departments, attendance, leaves, settings, summary, companySettings] =
    await Promise.all([
      getHREmployees(companyId, {}, currentUser).catch(() => []),
      getDepartments(companyId).catch(() => []),
      getHRAttendance(companyId).catch(() => []),
      getHRLeaves(companyId, {}, currentUser).catch(() => []),
      getHRWorkdaySettings(companyId).catch(() => ({
        company_id: companyId,
        workday_start: "09:00:00",
        workday_end: "18:00:00",
        timezone: "UTC",
        grace_period_minutes: 15,
        half_day_hours: 4.0,
        allow_overnight_shifts: false,
        updated_at: new Date().toISOString(),
      })),
      getHRAttendanceSummaryReport(companyId).catch(() => ({
        date: new Date().toISOString().split("T")[0],
        totalEmployees: 0,
        presentCount: 0,
        lateCount: 0,
        halfDayCount: 0,
        earlyDepartureCount: 0,
        absentCount: 0,
        onLeaveCount: 0,
        attendanceRatePct: 0,
      })),
      getCompanySettings(companyId).catch(() => ({ currency: "USD" })),
    ]);

  return (
    <ContentLayout>
      <PageHeader
        title="Human Resources & Workforce"
        description="Employee personnel directory, sensitive record protection, shift attendance, and leave management."
        breadcrumbs={[{ label: "Human Resources" }]}
      />

      <HRClient
        companyId={companyId}
        currency={companySettings.currency || "USD"}
        canViewSensitive={canViewSensitive}
        initialEmployees={employees}
        initialDepartments={departments}
        initialAttendance={attendance}
        initialLeaves={leaves}
        initialSettings={settings}
        initialSummary={summary}
      />
    </ContentLayout>
  );
}
