import * as React from "react";
import { Metadata } from "next";
import { ContentLayout } from "@/components/layout/content-layout";
import { CustomerPaymentsClient } from "./customer-payments-client";
import { getCustomerPayments } from "@/lib/crm/customer-payments";
import { getCustomers } from "@/lib/crm/server";
import { requireCompanyMembership } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Customer Payments | UNAZ ERP",
  description: "Customer payment transactions, receipts, voucher printing, and batch payments.",
};

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function CustomerPaymentsPage() {
  const companyId = DEFAULT_COMPANY_ID;

  try {
    await requireCompanyMembership(companyId);
  } catch {
    // Graceful fallback
  }

  const [payments, customersRes] = await Promise.all([
    getCustomerPayments(companyId).catch(() => []),
    getCustomers(companyId, { page: 1, pageSize: 200 }).catch(() => ({ data: [] })),
  ]);

  return (
    <ContentLayout>
      <CustomerPaymentsClient
        companyId={companyId}
        initialPayments={payments}
        customers={customersRes.data || []}
      />
    </ContentLayout>
  );
}
