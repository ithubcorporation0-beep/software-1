import * as React from "react";
import { redirect } from "next/navigation";
import { ErpShell } from "@/components/layout/erp-shell";
import { getCurrentUser } from "@/lib/auth/server";

export default async function ErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <ErpShell>{children}</ErpShell>;
}
