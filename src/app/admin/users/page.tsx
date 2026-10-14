import * as React from "react";
import { getPlatformUsers } from "@/lib/super-admin/server";
import { UsersClient } from "./users-client";

export const metadata = {
  title: "Global User Directory | IT HUB Super Admin",
  description: "Cross-tenant platform user roster and super administrator privilege governance.",
};

interface AdminUsersPageProps {
  searchParams?: Promise<{
    search?: string;
    page?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const params = await searchParams;
  const search = params?.search || "";
  const page = Number(params?.page || 1);

  let data;
  try {
    data = await getPlatformUsers({
      search,
      page,
      pageSize: 15,
    });
  } catch {
    data = { users: [], total: 0, page: 1, totalPages: 1 };
  }

  return (
    <UsersClient
      initialUsers={data.users}
      total={data.total}
      page={data.page}
      totalPages={data.totalPages}
      currentSearch={search}
    />
  );
}
