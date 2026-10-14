import * as React from "react";
import { getPlatformCompanies } from "@/lib/super-admin/server";
import { CompaniesClient } from "./companies-client";

export const metadata = {
  title: "Company Approvals & Management | IT HUB Super Admin",
  description: "Review, approve, reject, suspend, and monitor tenant accounts across the platform.",
};

interface AdminCompaniesPageProps {
  searchParams?: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage({ searchParams }: AdminCompaniesPageProps) {
  const params = await searchParams;
  const status = params?.status || "ALL";
  const search = params?.search || "";
  const page = Number(params?.page || 1);

  let data;
  try {
    data = await getPlatformCompanies({
      status: status as any,
      search,
      page,
      pageSize: 15,
    });
  } catch {
    data = { companies: [], total: 0, page: 1, totalPages: 1 };
  }

  return (
    <CompaniesClient
      initialCompanies={data.companies}
      total={data.total}
      page={data.page}
      totalPages={data.totalPages}
      currentStatus={status}
      currentSearch={search}
    />
  );
}
