import * as React from "react";
import { Metadata } from "next";
import { getAccounts } from "@/lib/finance/server";
import { getCurrentUser } from "@/lib/auth/server";
import { ChartOfAccountsClient } from "./chart-of-accounts-client";
import { Account } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Chart of Accounts | IT HUB ERP Enterprise",
  description: "QuickBooks Enterprise double-entry Chart of Accounts, sub-account registers, and FBR tax mapping.",
};

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function ChartOfAccountsPage() {
  const user = await getCurrentUser();
  const companyId = DEFAULT_COMPANY_ID;

  let accounts: Account[] = [];
  try {
    accounts = await getAccounts(companyId);
  } catch (err) {
    accounts = [];
  }

  return (
    <div className="w-full">
      <ChartOfAccountsClient initialAccounts={accounts} companyId={companyId} />
    </div>
  );
}
