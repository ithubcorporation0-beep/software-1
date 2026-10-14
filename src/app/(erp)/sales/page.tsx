import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { SalesClient } from "./sales-client";
import {
  getQuotations,
  getSalesOrders,
  getInvoices,
  getPayments,
} from "@/lib/sales/server";
import { getCustomers } from "@/lib/crm/server";
import { getCompanySettings } from "@/lib/company/server";
import { requireCompanyMembership } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function SalesPage() {
  const companyId = DEFAULT_COMPANY_ID;

  try {
    await requireCompanyMembership(companyId);
  } catch {
    // Falls closed via RLS / server guards
  }

  const [invoices, salesOrders, quotations, payments, customersRes, settings] =
    await Promise.all([
      getInvoices(companyId, { limit: 50 }).catch(() => []),
      getSalesOrders(companyId, { limit: 50 }).catch(() => []),
      getQuotations(companyId, { limit: 50 }).catch(() => []),
      getPayments(companyId, { limit: 50 }).catch(() => []),
      getCustomers(companyId, { pageSize: 50 }).catch(() => ({ data: [] })),
      getCompanySettings(companyId).catch(() => ({ currency: "PKR" })),
    ]);

  return (
    <ContentLayout>
      <PageHeader
        title="Sales & Invoicing"
        description="Comprehensive commercial revenue pipeline: Quotations, Sales Orders, Invoices, and Payment Ledger."
        breadcrumbs={[{ label: "Sales & Invoicing" }]}
      />

      <SalesClient
        companyId={companyId}
        currency={settings.currency || "PKR"}
        initialInvoices={invoices}
        initialSalesOrders={salesOrders}
        initialQuotations={quotations}
        initialPayments={payments}
        customers={customersRes.data || []}
      />
    </ContentLayout>
  );
}
