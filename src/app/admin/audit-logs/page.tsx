import * as React from "react";
import { getPlatformAuditLogs } from "@/lib/super-admin/server";
import { AuditLogsClient } from "./audit-logs-client";

export const metadata = {
  title: "Platform Audit Trail | IT HUB Super Admin",
  description: "Platform-wide compliance ledger and security event logging.",
};

interface AdminAuditLogsPageProps {
  searchParams?: Promise<{
    search?: string;
    action?: string;
    page?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage({ searchParams }: AdminAuditLogsPageProps) {
  const params = await searchParams;
  const search = params?.search || "";
  const action = params?.action || "ALL";
  const page = Number(params?.page || 1);

  let data;
  try {
    data = await getPlatformAuditLogs({
      search,
      action: action === "ALL" ? undefined : action,
      page,
      pageSize: 20,
    });
  } catch {
    data = { logs: [], total: 0, page: 1, totalPages: 1 };
  }

  return (
    <AuditLogsClient
      initialLogs={data.logs}
      total={data.total}
      page={data.page}
      totalPages={data.totalPages}
      currentSearch={search}
      currentAction={action}
    />
  );
}
