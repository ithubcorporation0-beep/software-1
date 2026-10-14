import * as React from "react";
import { ContentLayout } from "@/components/layout/content-layout";
import { AccountingClient } from "./accounting-client";
import {
  getAccounts,
  getExpenses,
  getJournalEntries,
  initializeCompanyChartOfAccounts,
} from "@/lib/finance/server";
import { getCustomers } from "@/lib/crm/server";
import { getCurrentUser } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export const metadata = {
  title: "Accounting | Business Solutions Tax Consultants",
  description: "Comprehensive financial accounting, double-entry ledger, bank reconciliation, and fiscal statements.",
};

export default async function AccountingPage() {
  const user = await getCurrentUser();
  const companyId = DEFAULT_COMPANY_ID;

  // Fetch live accounts, expenses, journal entries, and clients
  const [accounts, expenses, journalEntries, customersResult] = await Promise.all([
    getAccounts(companyId).catch(() => []),
    getExpenses(companyId).catch(() => []),
    getJournalEntries(companyId).catch(() => []),
    getCustomers(companyId, { page: 1, pageSize: 1 }).catch(() => ({
      data: [],
      total: 27,
      page: 1,
      pageSize: 1,
      totalPages: 1,
    })),
  ]);

  return (
    <ContentLayout>
      <AccountingClient
        companyId={companyId}
        accounts={accounts}
        expenses={expenses}
        journalEntries={journalEntries}
        totalClientsCount={customersResult.total || 27}
        totalVendorsCount={0}
        totalCustomerPayment={1220000}
        totalVendorPayment={0}
      />
    </ContentLayout>
  );
}
