import * as React from "react";
import { redirect } from "next/navigation";
import { requireSuperAdmin, getCurrentUser } from "@/lib/auth/server";
import { getSuperAdminMetrics } from "@/lib/super-admin/server";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { AdminAccessDenied } from "./access-denied";

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
    return <AdminAccessDenied userEmail={currentUser.email} />;
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
