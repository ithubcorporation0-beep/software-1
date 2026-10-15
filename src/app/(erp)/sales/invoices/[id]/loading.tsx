import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function InvoiceDetailLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in-50 duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Main Invoice Card Skeleton */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/40 pb-6">
          <div className="flex flex-col sm:flex-row justify-between gap-6">
            <div className="space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="space-y-2 sm:text-right">
              <Skeleton className="h-6 w-24 sm:ml-auto" />
              <Skeleton className="h-4 w-32 sm:ml-auto" />
              <Skeleton className="h-4 w-40 sm:ml-auto" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Bill To & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-border/40">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>

          {/* Line items table skeleton */}
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border/60">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between py-3 border-b border-border/30">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-4">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between pt-2 border-t">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
