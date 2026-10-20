"use client";

import * as React from "react";
import {
  AlertCircle,
  RotateCcw,
  Home,
  Clock,
  AlertOctagon,
  XCircle,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("IT-HUB ERP Application Error:", error);
  }, [error]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const isPending = error.message?.includes("Registration Pending:");
  const isSuspended = error.message?.includes("Account Suspended:");
  const isRejected = error.message?.includes("Registration Rejected:");
  const isPermissionDenied = error.message?.includes("Access Denied: Missing required permission");

  if (isPending) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-amber-500/30 m-6 shadow-lg max-w-lg mx-auto">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-4 animate-pulse">
          <Clock className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Organization Registration Under Review
        </h2>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Your company account has been registered and is waiting for IT HUB Super Administrator verification. Protected ERP modules are locked on the server until approval is issued.
        </p>
        <div className="mt-4 rounded-lg bg-muted/60 p-3 text-left font-mono text-[11px] text-amber-600 dark:text-amber-400 border border-amber-500/20 w-full">
          {error.message}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button variant="default" size="sm" onClick={() => reset()} className="bg-amber-600 hover:bg-amber-700 text-white">
            <RotateCcw className="mr-2 h-4 w-4" />
            Check Approval Status
          </Button>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-destructive/30 m-6 shadow-lg max-w-lg mx-auto">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertOctagon className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Company Account Suspended
        </h2>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Platform administration has suspended access for this organization. All operational modules, database transactions, and user logins are restricted.
        </p>
        <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-left font-mono text-[11px] text-destructive border border-destructive/20 w-full">
          {error.message}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-destructive/30 m-6 shadow-lg max-w-lg mx-auto">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <XCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Registration Rejected
        </h2>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          The registration for this company was not approved by IT HUB Super Administration.
        </p>
        <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-left font-mono text-[11px] text-destructive border border-destructive/20 w-full">
          {error.message}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (isPermissionDenied) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-border/80 m-6 shadow-sm max-w-lg mx-auto">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Authorization Restriction
        </h2>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Your role does not possess authorization to perform this operation. The platform enforces a default-deny policy. Contact your Company Administrator to request an updated role assignment.
        </p>
        <div className="mt-4 rounded-lg bg-muted/60 p-3 text-left font-mono text-[11px] text-muted-foreground border w-full">
          {error.message}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Link href="/">
            <Button variant="default" size="sm">
              <Home className="mr-2 h-4 w-4" />
              Return to Workspace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-card rounded-lg border border-destructive/20 m-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground">
        Platform Rendering Interrupted
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An unexpected exception was caught by the route error boundary. The underlying transaction has been safely contained.
      </p>
      {error.message && (
        <pre className="mt-4 max-w-lg overflow-x-auto rounded border bg-muted/60 p-2.5 text-left font-mono text-xs text-muted-foreground whitespace-pre-wrap">
          {error.message}
          {error.digest ? `\nServer Digest Reference: ${error.digest}` : ""}
        </pre>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="default" size="sm" onClick={() => reset()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Retry Operation
        </Button>
        <Link href="/">
          <Button variant="outline" size="sm">
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Sign In Again
          </Button>
        </Link>
      </div>
    </div>
  );
}
