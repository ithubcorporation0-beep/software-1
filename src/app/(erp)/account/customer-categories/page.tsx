import * as React from "react";
import { Metadata } from "next";
import { ContentLayout } from "@/components/layout/content-layout";
import { CustomerCategoriesClient } from "./customer-categories-client";
import { getCustomerGroups, getCustomerCategories } from "@/lib/crm/customer-settings";
import { getCustomers } from "@/lib/crm/server";
import { requireCompanyMembership } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Customer Categories | IT-HUB ERP",
  description: "Organize customers by priority tiers, commercial classifications, and tax treatment.",
};

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function CustomerCategoriesPage() {
  const companyId = DEFAULT_COMPANY_ID;

  try {
    await requireCompanyMembership(companyId);
  } catch {
    // Non-blocking fallback
  }

  const [categories, groups, customersResult] = await Promise.all([
    getCustomerCategories(companyId).catch(() => []),
    getCustomerGroups(companyId).catch(() => []),
    getCustomers(companyId, { page: 1, pageSize: 1 }).catch(() => ({ total: 0 })),
  ]);

  return (
    <ContentLayout>
      <CustomerCategoriesClient
        companyId={companyId}
        initialCategories={categories}
        totalCustomers={customersResult.total}
        totalGroups={groups.length}
      />
    </ContentLayout>
  );
}
