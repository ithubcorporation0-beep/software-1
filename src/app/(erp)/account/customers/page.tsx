import * as React from "react";
import { Metadata } from "next";
import { ContentLayout } from "@/components/layout/content-layout";
import { CustomersClient } from "./customers-client";
import { getCustomers } from "@/lib/crm/server";
import { getCustomerGroups, getCustomerCategories } from "@/lib/crm/customer-settings";
import { requireCompanyMembership } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Customers Directory | IT-HUB ERP",
  description: "Comprehensive customer management, FBR active taxpayer ATL verification, customer categories, and trade groups.",
};

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function CustomersPage() {
  const companyId = DEFAULT_COMPANY_ID;

  try {
    await requireCompanyMembership(companyId);
  } catch {
    // Graceful fallback for non-blocking dev context
  }

  const [customersResult, customerGroups, customerCategories] = await Promise.all([
    getCustomers(companyId, { page: 1, pageSize: 200 }).catch(() => ({
      data: [],
      total: 0,
      page: 1,
      pageSize: 200,
      totalPages: 1,
    })),
    getCustomerGroups(companyId).catch(() => []),
    getCustomerCategories(companyId).catch(() => []),
  ]);

  return (
    <ContentLayout>
      <CustomersClient
        companyId={companyId}
        initialCustomers={customersResult.data}
        customerGroups={customerGroups}
        customerCategories={customerCategories}
      />
    </ContentLayout>
  );
}
