import * as React from "react";
import { Metadata } from "next";
import { ContentLayout } from "@/components/layout/content-layout";
import { DueBatchClient } from "./due-batch-client";
import { getCustomers } from "@/lib/crm/server";
import { requireCompanyMembership } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Due & Batch Payments | UNAZ ERP",
  description: "Bulk batch customer payment clearance and overdue receivables processing.",
};

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function DueBatchPage() {
  const companyId = DEFAULT_COMPANY_ID;

  try {
    await requireCompanyMembership(companyId);
  } catch {
    // Non-blocking
  }

  const customersRes = await getCustomers(companyId, { page: 1, pageSize: 200 }).catch(() => ({ data: [] }));

  return (
    <ContentLayout>
      <DueBatchClient companyId={companyId} customers={customersRes.data || []} />
    </ContentLayout>
  );
}
