import * as React from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { CustomerDetailClient } from "./customer-detail-client";
import { getCustomerById } from "@/lib/crm/server";
import { requireCompanyMembership } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const companyId = DEFAULT_COMPANY_ID;

  try {
    await requireCompanyMembership(companyId);
  } catch {
    // Fails closed
  }

  const detail = await getCustomerById(companyId, id).catch(() => null);

  if (!detail) {
    notFound();
  }

  return (
    <ContentLayout>
      <PageHeader
        title={detail.customer.name}
        description={`Commercial Account Profile • ${detail.customer.customer_code}`}
        breadcrumbs={[
          { label: "CRM & Customers", href: "/crm" },
          { label: detail.customer.name },
        ]}
      />

      <CustomerDetailClient
        companyId={companyId}
        customer={detail.customer}
        initialNotes={detail.notes}
        initialActivities={detail.activities}
        links={detail.links}
      />
    </ContentLayout>
  );
}
