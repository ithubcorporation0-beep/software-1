"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Critical Global Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-100 font-sans">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 mb-6 border border-rose-500/30">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Critical System Fault</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          A fatal rendering fault occurred at the application root. Please reload or restart the application shell.
        </p>
        <div className="mt-6">
          <Button
            variant="default"
            size="sm"
            onClick={() => reset()}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart Application Shell
          </Button>
        </div>
      </body>
    </html>
  );
}
