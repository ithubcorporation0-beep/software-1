"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminAccessDenied({ userEmail }: { userEmail?: string }) {
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
          Your user account (<code className="font-mono text-destructive">{userEmail || "current user"}</code>) does not possess IT HUB Platform Super Administrator credentials.
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
