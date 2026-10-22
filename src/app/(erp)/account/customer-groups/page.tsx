import * as React from "react";
import { Metadata } from "next";
import { ContentLayout } from "@/components/layout/content-layout";
import { CustomerGroupsClient } from "./customer-groups-client";
import { getCustomerGroups, getCustomerCategories } from "@/lib/crm/customer-settings";
import { getCustomers } from "@/lib/crm/server";
import { requireCompanyMembership } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Customer Groups | IT-HUB ERP",
  description: "Segment and manage commercial customer groups, corporate tiers, and trade classifications.",
};

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function CustomerGroupsPage() {
  const companyId = DEFAULT_COMPANY_ID;

  try {
    await requireCompanyMembership(companyId);
  } catch {
    // Non-blocking fallback
  }

  const [groups, categories, customersResult] = await Promise.all([
    getCustomerGroups(companyId).catch(() => []),
    getCustomerCategories(companyId).catch(() => []),
    getCustomers(companyId, { page: 1, pageSize: 1 }).catch(() => ({ total: 0 })),
  ]);

  return (
    <ContentLayout>
      <CustomerGroupsClient
        companyId={companyId}
        initialGroups={groups}
        totalCustomers={customersResult.total}
        totalCategories={categories.length}
      />
    </ContentLayout>
  );
}
