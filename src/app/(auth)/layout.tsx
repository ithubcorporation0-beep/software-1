import * as React from "react";
import Link from "next/link";
import { Building2, ShieldCheck, Lock } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md text-base">
            IT
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            IT-HUB ERP
          </span>
        </Link>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Multi-Tenant Enterprise Security</span>
          <span>•</span>
          <Lock className="h-3.5 w-3.5 text-primary" />
          <span>PostgreSQL RLS Protected</span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Authorized personnel only. Access monitored by immutable audit logging.
        </p>
      </div>
    </div>
  );
}
