"use client";

import * as React from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error to client-side diagnostics
    console.error("IT-HUB ERP Application Error:", error);
  }, [error]);

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
        <pre className="mt-4 max-w-lg overflow-x-auto rounded border bg-muted/60 p-2.5 text-left font-mono text-xs text-muted-foreground">
          {error.message}
        </pre>
      )}
      <div className="mt-6 flex items-center gap-3">
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
      </div>
    </div>
  );
}
