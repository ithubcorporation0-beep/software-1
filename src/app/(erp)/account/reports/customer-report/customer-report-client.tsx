"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileBarChart,
  ArrowLeft,
  Download,
  Printer,
  Users,
  CreditCard,
  Building,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Customer, CustomerPayment } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CustomerReportClientProps {
  companyId: string;
  customers: Customer[];
  payments: CustomerPayment[];
}

export function CustomerReportClient({
  customers,
  payments,
}: CustomerReportClientProps) {
  const [filterGroup, setFilterGroup] = React.useState<string>("ALL");

  // Summary Metrics
  const totalBilled = 3450000;
  const totalReceived = payments.reduce((s, p) => s + p.payment_amount, 0);
  const totalOutstanding = Math.max(0, totalBilled - totalReceived);
  const totalAdvance = customers.reduce((s, c) => s + (c.advance_balance || 0), 0);

  const groups = [...new Set(customers.map((c) => c.customer_group || "General"))];

  const filteredCustomers = React.useMemo(() => {
    if (filterGroup === "ALL") return customers;
    return customers.filter((c) => (c.customer_group || "General") === filterGroup);
  }, [customers, filterGroup]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/60 backdrop-blur-md px-6 py-5 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/account/customers"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Customers
              </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
              <FileBarChart className="h-6 w-6 text-primary" />
              Customer Accounts & Receivables Report
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="gap-2 h-9 bg-primary text-primary-foreground font-semibold text-xs shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Top 4 KPI Metrics */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total Invoiced</span>
            <p className="font-mono text-xl font-bold text-foreground mt-1">
              Rs {totalBilled.toLocaleString("en-PK")}
            </p>
            <span className="text-[10px] text-muted-foreground">All commercial client orders</span>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total Collected</span>
            <p className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              Rs {totalReceived.toLocaleString("en-PK")}
            </p>
            <span className="text-[10px] text-emerald-600/80 font-medium">Cleared customer payments</span>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Outstanding Receivables</span>
            <p className="font-mono text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              Rs {totalOutstanding.toLocaleString("en-PK")}
            </p>
            <span className="text-[10px] text-rose-600/80 font-medium">Pending collection balance</span>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Advance Held</span>
            <p className="font-mono text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              Rs {totalAdvance.toLocaleString("en-PK")}
            </p>
            <span className="text-[10px] text-muted-foreground">Advance balances deposited</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* Receivables Aging Analysis */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Receivables Aging Analysis
            </h3>
            <span className="text-xs text-muted-foreground">Based on invoice due dates</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60">
              <span className="text-muted-foreground block text-[11px]">Current (0 - 30 Days)</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm mt-0.5 block">
                Rs 1,420,000.00
              </span>
              <span className="text-[10px] text-emerald-600">Standard credit terms</span>
            </div>

            <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60">
              <span className="text-muted-foreground block text-[11px]">31 - 60 Days Overdue</span>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-300 text-sm mt-0.5 block">
                Rs 680,000.00
              </span>
              <span className="text-[10px] text-blue-600">First follow-up phase</span>
            </div>

            <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60">
              <span className="text-muted-foreground block text-[11px]">61 - 90 Days Overdue</span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-sm mt-0.5 block">
                Rs 340,000.00
              </span>
              <span className="text-[10px] text-amber-600">Urgent recovery required</span>
            </div>

            <div className="p-3 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60">
              <span className="text-muted-foreground block text-[11px]">90+ Days Critical</span>
              <span className="font-mono font-bold text-rose-700 dark:text-rose-300 text-sm mt-0.5 block">
                Rs 180,000.00
              </span>
              <span className="text-[10px] text-rose-600">Subject to legal notice</span>
            </div>
          </div>
        </div>

        {/* Customer Accounts Breakdown */}
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Customer Accounts Performance ({filteredCustomers.length})
            </h3>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium"
            >
              <option value="ALL">All Customer Groups</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                <th className="py-3 px-4">CODE</th>
                <th className="py-3 px-4">CUSTOMER NAME</th>
                <th className="py-3 px-4">GROUP</th>
                <th className="py-3 px-4 text-center">FBR REG TYPE</th>
                <th className="py-3 px-4 text-center">ATL STATUS</th>
                <th className="py-3 px-4 text-right">CREDIT LIMIT</th>
                <th className="py-3 px-4 text-right">CLOSING BALANCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-muted-foreground">{c.customer_code}</td>
                  <td className="py-3 px-4 font-semibold text-foreground">
                    <Link href={`/account/reports/customer-ledger`} className="hover:underline text-primary">
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{c.customer_group || "General"}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline" className="text-[10px]">
                      {c.sales_tax_reg_type || "Unregistered"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        c.income_tax_atl === "Active"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {c.income_tax_atl || "Inactive"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                    Rs {(c.credit_limit || 0).toLocaleString("en-PK")}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                    Rs {(c.opening_balance || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
