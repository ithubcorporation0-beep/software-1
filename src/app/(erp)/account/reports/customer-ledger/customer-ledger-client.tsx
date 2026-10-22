"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowLeft,
  Printer,
  Download,
  Calendar,
  Building,
  Loader2,
  FileText,
} from "lucide-react";
import { Customer } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCustomerLedgerAction } from "@/app/(erp)/account/customers/actions";

export interface CustomerLedgerClientProps {
  companyId: string;
  customers: Customer[];
  initialLedger: any;
}

export function CustomerLedgerClient({
  companyId,
  customers,
  initialLedger,
}: CustomerLedgerClientProps) {
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>(
    initialLedger.customer?.id || customers[0]?.id || ""
  );
  const [ledgerData, setLedgerData] = React.useState<any>(initialLedger);
  const [isLoading, setIsLoading] = React.useState(false);
  const [startDate, setStartDate] = React.useState("2026-01-01");
  const [endDate, setEndDate] = React.useState(new Date().toISOString().split("T")[0]);

  const handleCustomerChange = async (id: string) => {
    setSelectedCustomerId(id);
    setIsLoading(true);
    try {
      const res = await getCustomerLedgerAction(companyId, id);
      if (res.success && res.data) {
        setLedgerData(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const currentCustomer = customers.find((c) => c.id === selectedCustomerId) || ledgerData.customer;

  const handleExportCsv = () => {
    const headers = ["Date", "Type", "Reference", "Description", "Debit (PKR)", "Credit (PKR)", "Running Balance (PKR)"];
    const rows = (ledgerData.entries || []).map((e: any) => [
      e.date,
      e.type,
      e.reference,
      `"${e.description.replace(/"/g, '""')}"`,
      e.debit,
      e.credit,
      e.balance,
    ]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer_ledger_${currentCustomer?.customer_code || "account"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
              <BookOpen className="h-6 w-6 text-primary" />
              Customer Ledger Statement
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-2 h-9 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => window.print()}
              className="gap-2 h-9 bg-primary text-primary-foreground font-semibold text-xs shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Statement
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/40 p-3.5 rounded-xl border border-border">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Select Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.customer_code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>
        </div>
      </header>

      {/* Main Ledger Content */}
      <main className="p-6 space-y-6" id="printable-statement">
        {/* Customer Account Summary Card */}
        {currentCustomer && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Account Holder</span>
              <p className="font-bold text-sm text-foreground mt-0.5">{currentCustomer.name}</p>
              <p className="text-xs text-muted-foreground">{currentCustomer.company_name || "Commercial Account"}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Invoiced (Debit)</span>
              <p className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 mt-0.5">
                Rs {(ledgerData.totalDebit || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Received (Credit)</span>
              <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                Rs {(ledgerData.totalCredit || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Closing Balance</span>
              <p
                className={cn(
                  "font-mono font-bold text-sm mt-0.5",
                  (ledgerData.closingBalance || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
                )}
              >
                Rs {(ledgerData.closingBalance || 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        {/* Ledger Table */}
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">TYPE</th>
                <th className="py-3 px-4">REFERENCE</th>
                <th className="py-3 px-4">DESCRIPTION</th>
                <th className="py-3 px-4 text-right">DEBIT (PKR)</th>
                <th className="py-3 px-4 text-right">CREDIT (PKR)</th>
                <th className="py-3 px-4 text-right">RUNNING BALANCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : (ledgerData.entries || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    No ledger records found for this customer.
                  </td>
                </tr>
              ) : (
                ledgerData.entries.map((e: any) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{e.date}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] font-medium border",
                          e.type === "Invoice"
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                            : e.type === "Payment"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}
                      >
                        {e.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-foreground">{e.reference}</td>
                    <td className="py-3 px-4 text-foreground">{e.description}</td>
                    <td className="py-3 px-4 text-right font-mono text-foreground">
                      {e.debit > 0 ? `Rs ${e.debit.toLocaleString("en-PK", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {e.credit > 0 ? `Rs ${e.credit.toLocaleString("en-PK", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                      Rs {e.balance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
