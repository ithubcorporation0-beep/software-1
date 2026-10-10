import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  details?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this view. Please try again or contact your system administrator.",
  onRetry,
  className,
  details,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{message}</p>
      {details && (
        <pre className="mt-3 max-w-md overflow-x-auto rounded bg-muted/60 p-2 text-left font-mono text-xs text-muted-foreground border">
          {details}
        </pre>
      )}
      {onRetry && (
        <div className="mt-5">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry Operation
          </Button>
        </div>
      )}
    </div>
  );
}
