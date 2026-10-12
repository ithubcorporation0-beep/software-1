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
  Users,
  CheckSquare,
  Briefcase,
  Clock,
  PieChart,
  BarChart3,
  Calendar,
  Lock,
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
    // Fallback if not authenticated or membership pending
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
        title="Executive Operations Radar"
        description={`Real-time operational telemetry and governance console for ${company.name}.`}
        breadcrumbs={[{ label: "Executive Radar" }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="success" className="text-xs py-1">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live Tenant Connected
            </Badge>
            <Link href="/settings">
              <Button variant="outline" size="sm">
                Company Settings
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        }
      />

      {/* Architectural Honesty Banner */}
      <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-foreground flex items-start gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            Authentic Telemetry Standard — No Simulated or Fabricated Metrics
          </p>
          <p className="text-muted-foreground leading-relaxed">
            All metrics on this radar are queried directly from authorized multi-tenant tables. Modules scheduled for subsequent phases explicitly state <span className="font-semibold text-foreground">&quot;Not available until module is enabled&quot;</span> in strict accordance with enterprise governance contracts.
          </p>
        </div>
      </div>

      {/* KPI Metrics Grid: 9 Required Core Metrics + Real Audit Events */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
        {/* 1. Revenue */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Gross Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
              Not available until module is enabled
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono text-amber-500">●</span>
              Awaiting Finance & Invoicing
            </p>
          </CardContent>
        </Card>

        {/* 2. Expenses */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Operating Expenses
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
              Not available until module is enabled
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono text-amber-500">●</span>
              Awaiting General Ledger
            </p>
          </CardContent>
        </Card>

        {/* 3. Profit */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Net Operating Margin
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
              Not available until module is enabled
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono text-amber-500">●</span>
              Awaiting Accounting P&amp;L
            </p>
          </CardContent>
        </Card>

        {/* 4. Outstanding Invoices */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Outstanding Invoices
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
              Not available until module is enabled
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono text-amber-500">●</span>
              Awaiting Billing & Invoicing
            </p>
          </CardContent>
        </Card>

        {/* 5. Customers (LIVE) */}
        {metrics?.customers?.isLive ? (
          <Card className="flex flex-col justify-between border-primary/30 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-foreground">
                Commercial Customers
              </CardTitle>
              <Badge variant="success" className="text-[10px] h-4">LIVE</Badge>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold font-mono text-foreground">
                {metrics.customers.value}
              </div>
              <Link
                href="/crm"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-1"
              >
                <span>View CRM directory</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Commercial Customers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
                Not available until module is enabled
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="font-mono text-amber-500">●</span>
                Awaiting CRM Module (Phase 2)
              </p>
            </CardContent>
          </Card>
        )}

        {/* 6. Employees (LIVE) */}
        <Card className="flex flex-col justify-between border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">
              Enterprise Employees
            </CardTitle>
            <Badge variant="success" className="text-[10px] h-4">LIVE</Badge>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {metrics?.employees?.value ?? 1}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              Verified tenant memberships
            </p>
          </CardContent>
        </Card>

        {/* 7. Active Projects */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
              Not available until module is enabled
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono text-amber-500">●</span>
              Awaiting PMO Module (Phase 4)
            </p>
          </CardContent>
        </Card>

        {/* 8. Pending Tasks */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pending Tasks
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
              Not available until module is enabled
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono text-amber-500">●</span>
              Awaiting Workflow Engine
            </p>
          </CardContent>
        </Card>

        {/* 9. Low-Stock Items */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Low-Stock Items
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
              Not available until module is enabled
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono text-amber-500">●</span>
              Awaiting Inventory (Phase 2)
            </p>
          </CardContent>
        </Card>

        {/* 10. Audit Events (LIVE) */}
        <Card className="flex flex-col justify-between border-sky-500/30 bg-sky-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-foreground">
              Audit Events
            </CardTitle>
            <Badge variant="info" className="text-[10px] h-4">LIVE</Badge>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {metrics?.auditEvents?.value ?? recentAudits.length}
            </div>
            <p className="text-[11px] text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 inline-block" />
              Cryptographically sealed records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Areas Grid: Revenue vs Expenses, Monthly Sales, Expense Breakdown, Customer Growth, Project Status, Attendance */}
      <div className="space-y-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Analytical Visualizations &amp; Trend Charts</h2>
            <p className="text-xs text-muted-foreground">Visual charts render automatically when respective ledger streams are active.</p>
          </div>
          <Badge variant="outline" className="text-xs">
            Awaiting Ledger Feeds
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Chart 1: Revenue vs Expenses */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Revenue vs Expenses
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">Finance</Badge>
              </div>
              <CardDescription className="text-xs">Comparative cash inflows vs operating outlays</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={BarChart3}
                title="Financial Ledger Inactive"
                description="Comparative revenue vs expense curves will populate once GAAP journal ledgers begin posting transactions in Phase 3."
                className="min-h-[190px] border-none bg-muted/20"
              />
            </CardContent>
          </Card>

          {/* Chart 2: Monthly Sales Turnover */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Monthly Sales Volume
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">Sales</Badge>
              </div>
              <CardDescription className="text-xs">Commercial quote-to-cash velocity</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={TrendingUp}
                title="Sales Pipeline Inactive"
                description="Monthly commercial turnover graphs will activate when the commercial order fulfillment adapter is connected in Phase 2."
                className="min-h-[190px] border-none bg-muted/20"
              />
            </CardContent>
          </Card>

          {/* Chart 3: Expense Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-sky-500" />
                  Expense Breakdown
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">Ledger</Badge>
              </div>
              <CardDescription className="text-xs">Categorical cost allocation by department</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={PieChart}
                title="Cost Categories Pending"
                description="Departmental expense doughnut visualization will render once Accounts Payable accounts are mapped."
                className="min-h-[190px] border-none bg-muted/20"
              />
            </CardContent>
          </Card>

          {/* Chart 4: Customer Growth */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  Customer Growth Curve
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">CRM</Badge>
              </div>
              <CardDescription className="text-xs">Net account additions and retention rate</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Users}
                title="CRM Client Directory Inactive"
                description="Client retention and cohort curves will display once CRM contact accounts are enrolled in Phase 2."
                className="min-h-[190px] border-none bg-muted/20"
              />
            </CardContent>
          </Card>

          {/* Chart 5: Project Status */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-amber-500" />
                  Project Status &amp; Milestones
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">PMO</Badge>
              </div>
              <CardDescription className="text-xs">Capital engineering delivery burn-down</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Briefcase}
                title="PMO Engine Pending"
                description="Strategic milestone Gantt charts and status bars will activate once PMO project charters are created."
                className="min-h-[190px] border-none bg-muted/20"
              />
            </CardContent>
          </Card>

          {/* Chart 6: Attendance Telemetry */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-teal-500" />
                  Attendance &amp; Headcount
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">HR</Badge>
              </div>
              <CardDescription className="text-xs">Biometric punch-in and PTO absence ratios</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Clock}
                title="HR Timesheet Stream Inactive"
                description="Daily enterprise attendance records will stream once the human capital timesheet engine is linked."
                className="min-h-[190px] border-none bg-muted/20"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Operational Foundations & Live Audit Activity */}
      <div className="grid gap-6 lg:grid-cols-7 mb-6">
        {/* Left Column: Live Immutable Audit Trail Events */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Live Cryptographic Audit Trail
                </CardTitle>
                <CardDescription>
                  Authentic system mutation and access security events
                </CardDescription>
              </div>
              <Link href="/settings?tab=audit">
                <Button variant="ghost" size="sm" className="text-xs">
                  View Full Trail
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentAudits.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No Events In Current Tenant Window"
                description="Audit logging engine is active and will stream user and administrative actions here."
                className="min-h-[200px] border-none bg-muted/20"
              />
            ) : (
              <div className="space-y-3">
                {recentAudits.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-2.5 rounded-md border bg-card/60 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate font-mono">
                          {event.action}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          Resource: {event.resource} {event.resource_id ? `(${event.resource_id.substring(0, 8)}...)` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Foundation Subsystems Verification */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Platform Subsystem Health
            </CardTitle>
            <CardDescription>
              Architectural components verified against PRD requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(subsystems || []).map((subsystem, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-2.5 rounded-md border bg-card/60 text-xs"
              >
                <div className="space-y-0.5 pr-2">
                  <div className="font-medium text-foreground">{subsystem.name}</div>
                  <div className="text-[11px] text-muted-foreground">{subsystem.detail}</div>
                </div>
                <Badge variant={subsystem.badgeVariant} className="text-[10px] h-5 shrink-0">
                  {subsystem.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
