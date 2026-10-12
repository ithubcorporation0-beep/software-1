import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { CrmClient } from "./crm-client";
import { getCustomers, getLeads } from "@/lib/crm/server";
import { getCompanyMembers } from "@/lib/users/server";
import { requireCompanyMembership } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function CrmPage() {
  const companyId = DEFAULT_COMPANY_ID;

  let membershipContext;
  try {
    membershipContext = await requireCompanyMembership(companyId);
  } catch {
    membershipContext = null;
  }

  // Load real tenant data
  const [customersResult, leadsResult, members] = await Promise.all([
    getCustomers(companyId, { page: 1, pageSize: 50 }).catch(() => ({
      data: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    })),
    getLeads(companyId).catch(() => ({ leads: [], totalPipelineValue: 0 })),
    getCompanyMembers(companyId).catch(() => []),
  ]);

  return (
    <ContentLayout>
      <PageHeader
        title="CRM & Commercial Accounts"
        description="Enterprise client directory, lead pipeline, follow-up touchpoints, and commercial customer history."
        breadcrumbs={[
          { label: "CRM & Customers" }
        ]}
      />

      <CrmClient
        companyId={companyId}
        initialCustomers={customersResult.data}
        initialLeads={leadsResult.leads}
        totalCustomers={customersResult.total}
        totalPipelineValue={leadsResult.totalPipelineValue}
        members={members}
      />
    </ContentLayout>
  );
}
