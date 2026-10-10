import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  DollarSign,
  Activity,
  Layers,
  Database,
  ShieldCheck,
  ArrowRight,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function DashboardPage() {
  return (
    <ContentLayout>
      <PageHeader
        title="Executive Operations Radar"
        description="High-level enterprise telemetry, inventory velocity, and capital distribution overview."
        breadcrumbs={[{ label: "Executive Radar" }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="success" className="text-xs py-1">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Phase 1 Shell Active
            </Badge>
          </div>
        }
      />

      {/* Architectural Honesty Banner */}
      <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-foreground flex items-start gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            Phase 1 Foundation Operational — Zero Simulated Business Data
          </p>
          <p className="text-muted-foreground leading-relaxed">
            In compliance with enterprise architecture standards, this dashboard presents authentic skeleton and placeholder contracts. Real metric values will stream automatically once Phase 2 inventory and commerce data adapters are connected.
          </p>
        </div>
      </div>

      {/* KPI Metrics Grid with Authentic Skeleton States */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Stock Valuation
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <div className="flex items-center text-[11px] text-muted-foreground">
                <span className="font-mono text-amber-500 mr-1.5">●</span>
                Awaiting Phase 2 inventory sync
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Commercial Turnover
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-7 w-28" />
              <div className="flex items-center text-[11px] text-muted-foreground">
                <span className="font-mono text-amber-500 mr-1.5">●</span>
                Awaiting sales ledger stream
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Open Commercial Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-7 w-20" />
              <div className="flex items-center text-[11px] text-muted-foreground">
                <span className="font-mono text-amber-500 mr-1.5">●</span>
                Fulfillment queue inactive
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Catalog SKUs Monitored
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-7 w-24" />
              <div className="flex items-center text-[11px] text-muted-foreground">
                <span className="font-mono text-amber-500 mr-1.5">●</span>
                Catalog database pending
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid: Velocity Chart Skeleton + System Status */}
      <div className="grid gap-6 lg:grid-cols-7 mb-6">
        {/* Left Column: Velocity Chart Placeholder */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Movement Velocity & Flow Curves
                </CardTitle>
                <CardDescription>
                  Inbound supplier receipts vs. outbound customer shipments
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">
                Contract Ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Activity}
              title="Telemetry Awaiting Live Stream"
              description="Real-time SVG velocity curves and warehouse throughput graphs will activate once transaction ledgers begin logging movements in Phase 2."
              className="min-h-[260px] border-none bg-muted/20"
              action={
                <Link href="/inventory">
                  <Button variant="outline" size="sm">
                    View Inventory Spec
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>

        {/* Right Column: Foundation Status Checklist */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Phase 1 Engineering Verification
            </CardTitle>
            <CardDescription>
              Core platform subsystem health
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center justify-between p-2.5 rounded-md border bg-card/60 text-xs">
              <div className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-emerald-500" />
                <span className="font-medium text-foreground">Next.js App Router Shell</span>
              </div>
              <Badge variant="success" className="text-[10px] h-5">Verified</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md border bg-card/60 text-xs">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="font-medium text-foreground">Design System & WCAG Tokens</span>
              </div>
              <Badge variant="success" className="text-[10px] h-5">Verified</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md border bg-card/60 text-xs">
              <div className="flex items-center gap-2.5">
                <Database className="h-4 w-4 text-sky-500" />
                <span className="font-medium text-foreground">PostgreSQL / Supabase Schema</span>
              </div>
              <Badge variant="info" className="text-[10px] h-5">Drafted</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md border bg-card/60 text-xs">
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-foreground">Operational Modules (10/10)</span>
              </div>
              <Badge variant="warning" className="text-[10px] h-5">Phased</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Skeleton Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">System Activity Ledger</CardTitle>
              <CardDescription>Immutable transaction records and user events</CardDescription>
            </div>
            <span className="text-xs text-muted-foreground font-mono">0 events recorded</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center justify-between py-2 border-b text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
