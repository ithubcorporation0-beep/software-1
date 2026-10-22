import * as React from "react";
import { Metadata } from "next";
import { ContentLayout } from "@/components/layout/content-layout";
import { CustomerReportClient } from "./customer-report-client";
import { getCustomers } from "@/lib/crm/server";
import { getCustomerPayments } from "@/lib/crm/customer-payments";
import { requireCompanyMembership } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Customer Intelligence & Receivables Report | IT-HUB ERP",
  description: "Customer accounts aging analysis, total balances, collections, and credit utilization.",
};

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function CustomerReportPage() {
  const companyId = DEFAULT_COMPANY_ID;

  try {
    await requireCompanyMembership(companyId);
  } catch {
    // Non-blocking
  }

  const [customersRes, payments] = await Promise.all([
    getCustomers(companyId, { page: 1, pageSize: 200 }).catch(() => ({ data: [] })),
    getCustomerPayments(companyId).catch(() => []),
  ]);

  return (
    <ContentLayout>
      <CustomerReportClient
        companyId={companyId}
        customers={customersRes.data || []}
        payments={payments}
      />
    </ContentLayout>
  );
}
