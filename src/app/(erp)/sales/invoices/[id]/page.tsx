import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { ContentLayout } from "@/components/layout/content-layout";
import { PageHeader } from "@/components/layout/page-header";
import { InvoiceDetailClient } from "./invoice-detail-client";
import { getInvoiceById, getPayments } from "@/lib/sales/server";
import { getCustomerById } from "@/lib/crm/server";
import { getCompanySettings } from "@/lib/company/server";
import { requireCompanyMembership, getCurrentUser, getUserMemberships } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoicePageProps) {
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

  const invoice = await getInvoiceById(companyId, id, user);
  if (!invoice) {
    notFound();
  }

  const [customerDetail, companySettings, payments] = await Promise.all([
    getCustomerById(companyId, invoice.customer_id).catch(() => null),
    getCompanySettings(companyId).catch(() => ({
      name: "IT-HUB Global Technologies Corp",
      address: "100 Innovation Way, Suite 400",
      email: "finance@ithub-enterprise.com",
      phone: "+1 (800) 555-0199",
      taxInformation: "US-EIN-98-3829104",
      currency: "USD",
    })),
    getPayments(companyId, { invoiceId: invoice.id }).catch(() => []),
  ]);

  return (
    <ContentLayout>
      <div className="print:hidden">
        <PageHeader
          title={`Invoice ${invoice.invoice_number}`}
          description="Detailed commercial billing statement, line items, and payment reconciliation."
          breadcrumbs={[
            { label: "Sales & Invoicing", href: "/sales" },
            { label: invoice.invoice_number },
          ]}
        />
      </div>

      <InvoiceDetailClient
        companyId={companyId}
        invoice={invoice}
        customer={customerDetail?.customer || invoice.customer || null}
        companyDetails={{
          name: companySettings.name,
          address: companySettings.address,
          email: companySettings.email,
          phone: companySettings.phone,
          taxInformation: companySettings.taxInformation,
          currency: invoice.currency || companySettings.currency || "USD",
        }}
        initialPayments={payments}
      />
    </ContentLayout>
  );
}
