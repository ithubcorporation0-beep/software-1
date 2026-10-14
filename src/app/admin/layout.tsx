import * as React from "react";
import { redirect } from "next/navigation";
import { requireSuperAdmin, getCurrentUser } from "@/lib/auth/server";
import { getSuperAdminMetrics } from "@/lib/super-admin/server";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Super Admin Platform Console | IT HUB ERP",
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/admin");
  }

  // Strictly enforce platform Super Admin privilege
  if (!currentUser.is_super_admin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="max-w-md w-full rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4 shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Access Denied: Super Admin Privileges Required
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your user account (<code className="font-mono text-destructive">{currentUser.email}</code>) does not possess IT HUB Platform Super Administrator credentials.
            Cross-tenant platform controls are isolated from individual tenant administrators.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/">
              <Button variant="default" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Return to Workspace
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let pendingCount = 0;
  try {
    const metrics = await getSuperAdminMetrics();
    pendingCount = metrics.pendingApprovals;
  } catch {
    // Non-blocking fallback
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Fixed Left Super Admin Sidebar */}
      <AdminSidebar className="hidden md:flex" pendingCount={pendingCount} />

      {/* Main Administrative Work Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader
          userName={currentUser.full_name}
          userEmail={currentUser.email}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/15 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
