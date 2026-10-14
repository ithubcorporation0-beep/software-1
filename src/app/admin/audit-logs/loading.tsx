import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAuditLogsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-52 rounded-md" />
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
        <div className="border-b border-border/80 bg-muted/40 p-3 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="divide-y divide-border/40">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 rounded-md" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
