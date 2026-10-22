import * as React from "react";
import { Metadata } from "next";
import { ContentLayout } from "@/components/layout/content-layout";
import { CustomerLedgerClient } from "./customer-ledger-client";
import { getCustomers } from "@/lib/crm/server";
import { getCustomerLedger } from "@/lib/crm/customer-payments";
import { requireCompanyMembership } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Customer Ledger Statement | UNAZ ERP",
  description: "Account receivables ledger statement, running balances, debits, and credits.",
};

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function CustomerLedgerPage() {
  const companyId = DEFAULT_COMPANY_ID;

  try {
    await requireCompanyMembership(companyId);
  } catch {
    // Non-blocking
  }

  const [customersRes, initialLedger] = await Promise.all([
    getCustomers(companyId, { page: 1, pageSize: 200 }).catch(() => ({ data: [] })),
    getCustomerLedger(companyId).catch(() => ({
      customer: null,
      entries: [],
      totalDebit: 0,
      totalCredit: 0,
      closingBalance: 0,
    })),
  ]);

  return (
    <ContentLayout>
      <CustomerLedgerClient
        companyId={companyId}
        customers={customersRes.data || []}
        initialLedger={initialLedger}
      />
    </ContentLayout>
  );
}
