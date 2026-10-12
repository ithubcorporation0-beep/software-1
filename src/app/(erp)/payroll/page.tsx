import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { PayrollClient } from "./payroll-client";
import {
  getPayrollRuns,
  getEmployeeSalarySlips,
  getPayrollSettings,
  initializeCompanyPayroll,
  canAccessPayroll,
} from "@/lib/payroll/server";
import { getCurrentUser, requireCompanyMembership } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function PayrollPage() {
  const companyId = DEFAULT_COMPANY_ID;

  let currentUser: any = null;
  let canManage = false;
  let canApprove = false;
  let canFinalize = false;

  try {
    currentUser = await getCurrentUser();
    const context = await requireCompanyMembership(companyId, currentUser || undefined);
    if (currentUser) {
      canManage = canAccessPayroll({ user: currentUser, permissions: context.permissions });
      canApprove =
        currentUser.is_super_admin ||
        context.permissions.includes("*") ||
        context.permissions.includes("payroll.approve") ||
        context.permissions.includes("payroll.admin");
      canFinalize =
        currentUser.is_super_admin ||
        context.permissions.includes("*") ||
        context.permissions.includes("payroll.finalize") ||
        context.permissions.includes("payroll.admin");
    }
  } catch {
    // Falls closed
  }

  await initializeCompanyPayroll(companyId).catch(() => {});

  const [runs, items, settings] = await Promise.all([
    getPayrollRuns(companyId, {}, currentUser).catch(() => []),
    getEmployeeSalarySlips(companyId, undefined, currentUser).catch(() => []),
    getPayrollSettings(companyId, currentUser).catch(() => ({
      company_id: companyId,
      currency: "USD",
      tax_calculation_mode: "Manual" as const,
      statutory_rules_confirmed: false,
      statutory_rules_confirmed_by: null,
      statutory_rules_confirmed_at: null,
      default_overtime_hourly_multiplier: 1.0,
      overtime_rate_confirmed: false,
      standard_working_days_per_month: 22,
      round_to_nearest: "cent" as const,
      auto_post_to_accounting: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
  ]);

  return (
    <ContentLayout>
      <PageHeader
        title="Payroll & Compensation Cycles"
        description="Controlled monthly payroll processing, salary slips, statutory rules, and general ledger settlement."
      />
      <PayrollClient
        companyId={companyId}
        currentUser={currentUser}
        runs={runs}
        items={items}
        settings={settings}
        canManage={canManage}
        canApprove={canApprove}
        canFinalize={canFinalize}
      />
    </ContentLayout>
  );
}
