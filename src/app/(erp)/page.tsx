import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  DollarSign,
  Activity,
  ArrowRight,
  Users,
  CheckSquare,
  Briefcase,
  ShieldCheck,
  Building2,
  Clock,
  AlertTriangle,
  Receipt,
  Layers,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLayout } from "@/components/layout/content-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getDashboardTelemetry } from "@/lib/dashboard/server";
import { getCurrentUser } from "@/lib/auth/server";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const companyId = DEFAULT_COMPANY_ID;

  let dashboardData;
  try {
    dashboardData = await getDashboardTelemetry(companyId);
  } catch (err) {
    dashboardData = null;
  }

  const { metrics, recentAudits, subsystems, company } = dashboardData || {
    company: { name: "IT-HUB Global Technologies Corp", plan: "ENTERPRISE" },
    metrics: null,
    recentAudits: [],
    subsystems: [],
  };

  return (
    <ContentLayout>
      <PageHeader
        title="Executive Overview"
        description={`Real-time operational summary, live financial ledger, and governance telemetry for ${company.name}.`}
        breadcrumbs={[{ label: "Overview" }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs py-1 border-border/80 bg-background">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              Tenant Active
            </Badge>
            <Link href="/sales">
              <Button size="sm" className="h-8 text-xs">
                <Receipt className="mr-1.5 h-3.5 w-3.5" />
                Invoices
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Reports
              </Button>
            </Link>
          </div>
        }
      />

      {/* Primary Financial KPIs Bar (4 Cards) */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        {/* 1. Gross Revenue */}
        <Link href="/sales" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Gross Revenue
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                {metrics?.revenue?.value ?? "$0.00"}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Total payments received</span>
                <span className="text-primary font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Sales <ArrowRight className="h-3 w-3" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 2. Operating Expenditures */}
        <Link href="/finance" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Operating Expenses
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                {metrics?.expenses?.value ?? "$0.00"}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Approved claims &amp; ledger</span>
                <span className="text-primary font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Finance <ArrowRight className="h-3 w-3" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 3. Net Margin */}
        <Link href="/finance" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Net Operating Margin
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Activity className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                {metrics?.profit?.value ?? "$0.00"}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>P&amp;L operational balance</span>
                <span className="text-primary font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  P&amp;L <ArrowRight className="h-3 w-3" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 4. Accounts Receivable */}
        <Link href="/sales" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Accounts Receivable
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                {metrics?.outstandingInvoices?.value ?? "$0.00"}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Outstanding invoice balances</span>
                <span className="text-primary font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Collect <ArrowRight className="h-3 w-3" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Secondary Operational Metrics Strip (5 Compact Cards) */}
      <div className="grid gap-3.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-5">
        {/* Customers */}
        <Link href="/crm" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Customers</span>
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="mt-1.5 text-lg font-bold font-mono text-foreground">
                {metrics?.customers?.value ?? 0}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">Active directory accounts</div>
            </CardContent>
          </Card>
        </Link>

        {/* Personnel */}
        <Link href="/hr" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Personnel</span>
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="mt-1.5 text-lg font-bold font-mono text-foreground">
                {metrics?.employees?.value ?? 1}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">Verified tenant roster</div>
            </CardContent>
          </Card>
        </Link>

        {/* Active Projects */}
        <Link href="/projects" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">PMO Projects</span>
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="mt-1.5 text-lg font-bold font-mono text-foreground">
                {metrics?.activeProjects?.value ?? 0}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">Active initiatives</div>
            </CardContent>
          </Card>
        </Link>

        {/* Pending Tasks */}
        <Link href="/projects" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Open Tasks</span>
                <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="mt-1.5 text-lg font-bold font-mono text-foreground">
                {metrics?.pendingTasks?.value ?? 0}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">Kanban deliverables</div>
            </CardContent>
          </Card>
        </Link>

        {/* Low Stock SKUs */}
        <Link href="/inventory" className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Low Stock SKUs</span>
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="mt-1.5 text-lg font-bold font-mono text-foreground flex items-center gap-1.5">
                <span>{metrics?.lowStockItems?.value ?? 0}</span>
                {Number(metrics?.lowStockItems?.value ?? 0) > 0 && (
                  <Badge variant="warning" className="text-[9px] px-1 py-0 h-4 font-semibold">
                    Alert
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">Stockout risk SKUs</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Operational Split: Left Activity & Shortcuts | Right System Health & Governance */}
      <div className="grid gap-5 lg:grid-cols-7 mb-6">
        {/* Left Column (4/7 width): Recent Audit Activity + Quick Actions */}
        <div className="lg:col-span-4 space-y-5">
          {/* Quick Module Shortcuts */}
          <Card>
            <CardHeader className="py-3.5 px-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Quick Operations
                </CardTitle>
                <span className="text-[11px] text-muted-foreground">Frequent workflows</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <Link href="/sales" className="flex items-center gap-2 p-2.5 rounded-md border border-border/80 bg-muted/20 hover:bg-muted/60 transition-colors text-xs font-medium">
                <Receipt className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">Invoicing</span>
              </Link>
              <Link href="/crm" className="flex items-center gap-2 p-2.5 rounded-md border border-border/80 bg-muted/20 hover:bg-muted/60 transition-colors text-xs font-medium">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">CRM Clients</span>
              </Link>
              <Link href="/finance" className="flex items-center gap-2 p-2.5 rounded-md border border-border/80 bg-muted/20 hover:bg-muted/60 transition-colors text-xs font-medium">
                <DollarSign className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">Expenses &amp; GL</span>
              </Link>
              <Link href="/hr" className="flex items-center gap-2 p-2.5 rounded-md border border-border/80 bg-muted/20 hover:bg-muted/60 transition-colors text-xs font-medium">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">Attendance</span>
              </Link>
              <Link href="/projects" className="flex items-center gap-2 p-2.5 rounded-md border border-border/80 bg-muted/20 hover:bg-muted/60 transition-colors text-xs font-medium">
                <Briefcase className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">Project Kanban</span>
              </Link>
              <Link href="/inventory" className="flex items-center gap-2 p-2.5 rounded-md border border-border/80 bg-muted/20 hover:bg-muted/60 transition-colors text-xs font-medium">
                <Package className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">Inventory Stock</span>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Governance & Audit Trail */}
          <Card>
            <CardHeader className="py-3.5 px-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    Live Activity &amp; Audit Trail
                  </CardTitle>
                </div>
                <Link href="/settings">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                    View All Logs
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentAudits.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No Audit Events In Window"
                  description="Tenant activity and administrative operations will log here automatically."
                  className="min-h-[160px] border-none"
                />
              ) : (
                <div className="divide-y divide-border/60">
                  {recentAudits.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground font-mono text-xs">
                            {event.action}
                          </span>
                          <span className="text-muted-foreground ml-2 text-[11px] truncate">
                            {event.resource} {event.resource_id ? `(${event.resource_id.substring(0, 8)}...)` : ""}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-3">
                        {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (3/7 width): Platform Subsystems & Governance Summary */}
        <div className="lg:col-span-3 space-y-5">
          {/* Tenant Governance Summary */}
          <Card>
            <CardHeader className="py-3.5 px-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Tenant Boundary Status
                </CardTitle>
                <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                  Compliant
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Workspace Tenant</span>
                <span className="font-semibold text-foreground truncate max-w-[180px]">{company.name}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Database Security</span>
                <span className="font-medium text-foreground">PostgreSQL Row-Level Security</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Isolation Architecture</span>
                <span className="font-medium text-foreground">Fail-Closed Tenant Isolation</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subscription Tier</span>
                <Badge variant="neutral" className="text-[10px] uppercase font-bold">{company.plan}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Subsystems Health List */}
          <Card>
            <CardHeader className="py-3.5 px-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Subsystem Verification
                </CardTitle>
                <span className="text-[10px] text-muted-foreground font-mono">{subsystems.length} Modules</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[360px] overflow-y-auto divide-y divide-border/60">
              {(subsystems || []).map((subsystem, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-3 text-xs hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-0.5 pr-2 min-w-0">
                    <div className="font-medium text-foreground truncate">{subsystem.name}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">{subsystem.detail}</div>
                  </div>
                  <Badge variant={subsystem.badgeVariant} className="text-[10px] h-4 shrink-0 font-semibold">
                    {subsystem.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </ContentLayout>
  );
}
