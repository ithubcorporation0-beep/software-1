import * as React from "react";
import { ContentLayout } from "@/components/layout/content-layout";
import { UserManagementClient } from "./user-management-client";
import { getCompanyMembers, getCompanyRoles } from "@/lib/users/server";
import { getCustomers } from "@/lib/crm/server";
import { getCurrentUser } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export const metadata = {
  title: "User Management | Business Solutions Tax Consultants",
  description: "Manage users, access roles, customer directories, and permission matrices.",
};

export default async function UserManagementPage() {
  const user = await getCurrentUser();
  const companyId = DEFAULT_COMPANY_ID;

  // Load authorized tenant members, roles, and customers in parallel
  const [members, roles, customersResult] = await Promise.all([
    getCompanyMembers(companyId).catch(() => []),
    getCompanyRoles(companyId).catch(() => []),
    getCustomers(companyId, { page: 1, pageSize: 1 }).catch(() => ({
      data: [],
      total: 0,
      page: 1,
      pageSize: 1,
      totalPages: 1,
    })),
  ]);

  return (
    <ContentLayout>
      <UserManagementClient
        companyId={companyId}
        initialMembers={members}
        initialRoles={roles}
        totalCustomersCount={customersResult.total || 0}
        totalVendorsCount={0}
      />
    </ContentLayout>
  );
}
