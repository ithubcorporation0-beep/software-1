"use client";

import * as React from "react";
import Link from "next/link";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-background text-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-6 border">
        <FileQuestion className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        404 — Page Not Found
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
        The requested ERP route does not exist or may have been relocated. All active and scheduled modules can be accessed from the primary sidebar navigation.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link href="/">
          <Button variant="default" size="sm">
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      <div className="mt-12 text-[11px] text-muted-foreground/70 font-mono">
        IT-HUB ERP • System Route Guard
      </div>
    </div>
  );
}
