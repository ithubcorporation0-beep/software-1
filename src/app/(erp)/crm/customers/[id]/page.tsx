import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { CustomerDetailClient } from "./customer-detail-client";
import { getCustomerById } from "@/lib/crm/server";
import { requireCompanyMembership, getCurrentUser, getUserMemberships } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let companyId = DEFAULT_COMPANY_ID;
  if (!user.is_super_admin) {
    const memberships = await getUserMemberships(user.id);
    if (!memberships.length) {
      notFound();
    }
    companyId = memberships[0].company_id;
  }

  await requireCompanyMembership(companyId, user);

  const detail = await getCustomerById(companyId, id, user).catch(() => null);

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
