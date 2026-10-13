"use client";

import * as React from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  Briefcase,
  Download,
  Printer,
  Calendar,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  FileSpreadsheet,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ComprehensiveReportsPayload } from "@/lib/reports/server";
import { exportReportCSVAction } from "./actions";

interface ReportsClientProps {
  initialReports: ComprehensiveReportsPayload;
}

export function ReportsClient({ initialReports }: ReportsClientProps) {
  const [reports, setReports] = React.useState<ComprehensiveReportsPayload>(initialReports);
  const [activeTab, setActiveTab] = React.useState<"sales" | "finance" | "workforce" | "inventory" | "pmo">("sales");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isExporting, setIsExporting] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const formatMoney = (amount: number) => {
    const curr = reports.currency || "PKR";
    const symbol = curr === "PKR" ? "₨ " : (curr === "USD" ? "$" : `${curr} `);
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    setToastMessage(null);
    try {
      const res = await exportReportCSVAction(reports.companyId, activeTab);
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `ERP-Report-${activeTab.toUpperCase()}-${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setToastMessage(`CSV export for ${activeTab.toUpperCase()} completed.`);
      }
    } catch {
      setToastMessage("Failed to generate CSV export.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{toastMessage}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setToastMessage(null)}>Dismiss</Button>
        </div>
      )}

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Billed Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {formatMoney(reports.salesSummary.totalSales)}
            </div>
            <p className="text-xs text-slate-500 mt-1">From commercial sales invoices</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Net Operating Margin</CardTitle>
            <Banknote className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {formatMoney(reports.finance.netOperatingIncome)}
            </div>
            <p className="text-xs text-slate-500 mt-1">GAAP P&L net operating income</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Inventory Valuation</CardTitle>
            <Package className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              {formatMoney(reports.inventory.totalValuation)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across {reports.inventory.totalStockUnits} stock units ({reports.inventory.totalSkus} SKUs)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Workforce & Payroll</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{reports.workforce.totalStaff} Personnel</div>
            <p className="text-xs text-slate-500 mt-1">
              {formatMoney(reports.workforce.totalPayrollDisbursed)} disbursed compensation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Toolbar & Export Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activeTab === "sales" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("sales")}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Sales & Orders
          </Button>
          <Button
            variant={activeTab === "finance" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("finance")}
            className="gap-2"
          >
            <DollarSign className="h-4 w-4" />
            Financial P&L
          </Button>
          <Button
            variant={activeTab === "workforce" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("workforce")}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Workforce & HR
          </Button>
          <Button
            variant={activeTab === "inventory" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("inventory")}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Inventory & Logistics
          </Button>
          <Button
            variant={activeTab === "pmo" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("pmo")}
            className="gap-2"
          >
            <Briefcase className="h-4 w-4" />
            Projects & PMO
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 border-slate-700 hover:bg-slate-800 text-xs"
          >
            <Printer className="h-4 w-4" />
            Print Schedule
          </Button>
          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="gap-1.5 bg-primary text-primary-foreground text-xs"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* TAB 1: SALES & ORDERS REPORT */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base text-slate-100">Monthly Revenue & Collection Velocity</CardTitle>
              <CardDescription className="text-slate-400">
                Invoiced sales versus verified payments collected by calendar month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reports.salesSummary.byMonth.length === 0 ? (
                <p className="text-xs text-slate-500">No monthly sales data recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="py-2.5 px-3">Period</th>
                        <th className="py-2.5 px-3">Invoices Issued</th>
                        <th className="py-2.5 px-3">Gross Sales</th>
                        <th className="py-2.5 px-3">Payments Collected</th>
                        <th className="py-2.5 px-3">Outstanding AR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {reports.salesSummary.byMonth.map((row) => (
                        <tr key={row.periodKey} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-200 font-semibold">{row.periodKey}</td>
                          <td className="py-2.5 px-3 text-slate-300">{row.invoiceCount}</td>
                          <td className="py-2.5 px-3 text-slate-100 font-bold">{formatMoney(row.grossSales)}</td>
                          <td className="py-2.5 px-3 text-emerald-400">{formatMoney(row.paymentsReceived)}</td>
                          <td className="py-2.5 px-3 text-amber-400">{formatMoney(row.outstandingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base text-slate-100">Top Commercial Client Accounts</CardTitle>
              <CardDescription className="text-slate-400">Sales volume and receivables breakdown by customer</CardDescription>
            </CardHeader>
            <CardContent>
              {reports.salesSummary.byCustomer.length === 0 ? (
                <p className="text-xs text-slate-500">No customer invoices recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="py-2.5 px-3">Customer Entity</th>
                        <th className="py-2.5 px-3">Invoices</th>
                        <th className="py-2.5 px-3">Total Billed</th>
                        <th className="py-2.5 px-3">Unpaid Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {reports.salesSummary.byCustomer.map((row) => (
                        <tr key={row.periodKey} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-200 font-sans font-medium">{row.periodKey}</td>
                          <td className="py-2.5 px-3 text-slate-400">{row.invoiceCount}</td>
                          <td className="py-2.5 px-3 text-slate-100 font-bold">{formatMoney(row.grossSales)}</td>
                          <td className="py-2.5 px-3 text-amber-400">{formatMoney(row.outstandingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: FINANCIAL SUMMARY REPORT */}
      {activeTab === "finance" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base text-slate-100">Income & Expenditure Overview</CardTitle>
              <CardDescription className="text-slate-400">Core financial metrics derived from GAAP general ledger</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-sans">Gross Revenue Collected</span>
                <span className="font-bold text-slate-100">{formatMoney(reports.finance.revenueTotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-sans">Operating Expenditures (Expenses)</span>
                <span className="font-bold text-red-400">-{formatMoney(reports.finance.expensesTotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800 font-bold text-sm">
                <span className="text-emerald-400 font-sans">Net Operating Margin (P&L)</span>
                <span className="text-emerald-400">{formatMoney(reports.finance.netOperatingIncome)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base text-slate-100">Balance Sheet Obligations</CardTitle>
              <CardDescription className="text-slate-400">Receivables, payables, and treasury liquidity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-sans">Accounts Receivable (Pending Invoices)</span>
                <span className="font-bold text-amber-400">{formatMoney(reports.finance.outstandingReceivables)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-sans">Accounts Payable (Vendor Bills Due)</span>
                <span className="font-bold text-slate-200">{formatMoney(reports.finance.accountsPayable)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400 font-sans">Estimated Treasury Liquidity</span>
                <span className="font-bold text-primary">{formatMoney(reports.finance.cashAndBankBalance)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: WORKFORCE & HR REPORT */}
      {activeTab === "workforce" && (
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base text-slate-100">Human Capital & Compensation Operations</CardTitle>
            <CardDescription className="text-slate-400">Headcount, attendance tracking, and verified net payroll disbursements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Staff Roster</div>
                <div className="text-xl font-bold text-slate-100">{reports.workforce.totalStaff}</div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Departments</div>
                <div className="text-xl font-bold text-slate-100">{reports.workforce.activeDepartments}</div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Present Records</div>
                <div className="text-xl font-bold text-emerald-400">{reports.workforce.attendancePresent}</div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Late Arrivals</div>
                <div className="text-xl font-bold text-amber-400">{reports.workforce.attendanceLate}</div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Leaves Filed</div>
                <div className="text-xl font-bold text-blue-400">{reports.workforce.leaveCount}</div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Payroll Disbursed</div>
                <div className="text-xl font-bold text-purple-400 font-mono">
                  {formatMoney(reports.workforce.totalPayrollDisbursed)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: INVENTORY & LOGISTICS REPORT */}
      {activeTab === "inventory" && (
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base text-slate-100">Inventory Asset Valuation & Procurement</CardTitle>
            <CardDescription className="text-slate-400">Catalog holdings, multi-depot stocks, movement activity, and purchase commitments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Total Holdings Value</span>
                <div className="text-xl font-bold text-slate-100 font-mono">
                  {formatMoney(reports.inventory.totalValuation)}
                </div>
                <p className="text-[11px] text-slate-500">{reports.inventory.totalStockUnits} physical units</p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Stockout Risk SKUs</span>
                <div className="text-xl font-bold text-amber-400">
                  {reports.inventory.lowStockCount + reports.inventory.outOfStockCount}
                </div>
                <p className="text-[11px] text-slate-500">
                  {reports.inventory.lowStockCount} low stock, {reports.inventory.outOfStockCount} zero stock
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Auditable Movements</span>
                <div className="text-xl font-bold text-primary font-mono">{reports.inventory.totalMovements}</div>
                <p className="text-[11px] text-slate-500">Immutable ledger transactions</p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Purchases Committed</span>
                <div className="text-xl font-bold text-slate-100 font-mono">
                  {formatMoney(reports.inventory.totalPurchasedAmount)}
                </div>
                <p className="text-[11px] text-slate-500">Across supplier purchase orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 5: PROJECTS & PMO REPORT */}
      {activeTab === "pmo" && (
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base text-slate-100">Capital Initiatives & Task Delivery Progress</CardTitle>
            <CardDescription className="text-slate-400">PMO project velocity, capital commitments, and deliverables completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Capital Portfolio Budget</span>
                <div className="text-xl font-bold text-slate-100 font-mono">
                  {formatMoney(reports.pmo.totalBudget)}
                </div>
                <p className="text-[11px] text-slate-500">{reports.pmo.totalProjects} registered initiatives</p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Average Completion</span>
                <div className="text-xl font-bold text-primary font-mono">
                  {reports.pmo.averageProgressPct}%
                </div>
                <p className="text-[11px] text-slate-500">{reports.pmo.activeProjects} active projects</p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Task Velocity</span>
                <div className="text-xl font-bold text-slate-100">
                  {reports.pmo.completedTasks} / {reports.pmo.totalTasks}
                </div>
                <p className="text-[11px] text-slate-500">Completed workflow deliverables</p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Critical / Urgent Backlog</span>
                <div className="text-xl font-bold text-red-400">{reports.pmo.urgentTasks}</div>
                <p className="text-[11px] text-slate-500">Urgent priority pending items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
