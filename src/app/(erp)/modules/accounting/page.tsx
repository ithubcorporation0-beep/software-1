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
import { getPayments } from "@/lib/sales/server";
import { getCurrentUser } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export const metadata = {
  title: "Accounting | Business Solutions Tax Consultants",
  description: "Comprehensive financial accounting, double-entry ledger, bank reconciliation, and fiscal statements.",
};

export default async function AccountingPage() {
  const user = await getCurrentUser();
  const companyId = DEFAULT_COMPANY_ID;

  // Fetch live accounts, expenses, journal entries, payments, and clients
  const [accounts, expenses, journalEntries, payments, customersResult] = await Promise.all([
    getAccounts(companyId).catch(() => []),
    getExpenses(companyId).catch(() => []),
    getJournalEntries(companyId).catch(() => []),
    getPayments(companyId, { limit: 100 }).catch(() => []),
    getCustomers(companyId, { page: 1, pageSize: 1 }).catch(() => ({
      data: [],
      total: 0,
      page: 1,
      pageSize: 1,
      totalPages: 1,
    })),
  ]);

  const totalCustomerPayment = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <ContentLayout>
      <AccountingClient
        companyId={companyId}
        accounts={accounts}
        expenses={expenses}
        journalEntries={journalEntries}
        totalClientsCount={customersResult.total || 0}
        totalVendorsCount={0}
        totalCustomerPayment={totalCustomerPayment}
        totalVendorPayment={0}
      />
    </ContentLayout>
  );
}
