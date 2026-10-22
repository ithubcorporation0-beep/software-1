"use client";

import * as React from "react";
import Link from "next/link";
import {
  Layers,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Search,
} from "lucide-react";
import { Customer } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { recordBatchPaymentsAction } from "@/app/(erp)/account/customers/actions";

export interface DueBatchClientProps {
  companyId: string;
  customers: Customer[];
}

interface DueCustomerItem {
  id: string;
  name: string;
  code: string;
  balance: number;
  paymentAmount: number;
  selected: boolean;
}

export function DueBatchClient({ companyId, customers }: DueBatchClientProps) {
  const [batchDate, setBatchDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = React.useState("Batch Settlement " + new Date().toISOString().split("T")[0]);
  const [search, setSearch] = React.useState("");
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(null);

  // Initialize due items from customers
  const [items, setItems] = React.useState<DueCustomerItem[]>(() => {
    return customers.map((c, i) => {
      // If customer has opening_balance or sample balance
      const bal = c.opening_balance || (i % 2 === 0 ? 85000 + i * 25000 : 45000 + i * 15000);
      return {
        id: c.id,
        name: c.name,
        code: c.customer_code,
        balance: bal,
        paymentAmount: 0,
        selected: false,
      };
    });
  });

  const handleSelectAll = (checked: boolean) => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        selected: checked,
        paymentAmount: checked ? it.balance : 0,
      }))
    );
  };

  const handleToggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const nextSelected = !it.selected;
          return {
            ...it,
            selected: nextSelected,
            paymentAmount: nextSelected ? it.balance : 0,
          };
        }
        return it;
      })
    );
  };

  const handleAmountChange = (id: string, val: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return {
            ...it,
            paymentAmount: val,
            selected: val > 0,
          };
        }
        return it;
      })
    );
  };

  const handleFillFullBalances = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        selected: true,
        paymentAmount: it.balance,
      }))
    );
    setFeedback({ message: "Full outstanding balances populated for all accounts.", type: "success" });
  };

  const filteredItems = React.useMemo(() => {
    return items.filter((it) => {
      if (overdueOnly && it.balance <= 0) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return it.name.toLowerCase().includes(q) || it.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, search, overdueOnly]);

  const selectedItems = items.filter((it) => it.selected && it.paymentAmount > 0);
  const totalBatchAmount = selectedItems.reduce((s, it) => s + it.paymentAmount, 0);

  const handleProcessBatch = async () => {
    if (selectedItems.length === 0) {
      setFeedback({ message: "No customers selected for batch clearance.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = selectedItems.map((it) => ({
        customer_id: it.id,
        customer_name: it.name,
        amount: it.paymentAmount,
        reference,
      }));

      const res = await recordBatchPaymentsAction(companyId, payload);
      if (res.success) {
        setFeedback({ message: `Successfully recorded ${res.data?.processedCount} batch payments.`, type: "success" });
        // Reset balances for selected
        setItems((prev) =>
          prev.map((it) => {
            if (it.selected) {
              return { ...it, balance: Math.max(0, it.balance - it.paymentAmount), paymentAmount: 0, selected: false };
            }
            return it;
          })
        );
      } else {
        setFeedback({ message: res.error || "Batch settlement failed", type: "error" });
      }
    } catch (err: any) {
      setFeedback({ message: err.message || "An error occurred", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border",
            feedback.type === "success"
              ? "bg-emerald-600 text-white border-emerald-700"
              : "bg-rose-600 text-white border-rose-700"
          )}
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-card/60 backdrop-blur-md px-6 py-5 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/account/customer-payments"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Customer Payments
              </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
              <Layers className="h-6 w-6 text-primary" />
              Customer Due & Batch Payment
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFillFullBalances}
              className="gap-2 h-9 text-xs"
            >
              Fill Full Balances
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting || selectedItems.length === 0}
              onClick={handleProcessBatch}
              className="gap-2 h-9 bg-primary text-primary-foreground font-semibold text-xs shadow-xs"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Record Batch Payments ({selectedItems.length})
            </Button>
          </div>
        </div>

        {/* Batch Config Controls */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/40 p-3.5 rounded-xl border border-border">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Batch Payment Date</label>
            <Input
              type="date"
              value={batchDate}
              onChange={(e) => setBatchDate(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Batch Reference</label>
            <Input
              type="text"
              placeholder="e.g. Bank Clearance Batch"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">Filter Accounts</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border">
              <span className="text-xs text-muted-foreground">Total Batch:</span>
              <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                Rs {totalBatchAmount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Table */}
      <main className="p-6">
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && filteredItems.every((it) => it.selected)}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-border"
                  />
                </th>
                <th className="py-3 px-4">CODE</th>
                <th className="py-3 px-4">CUSTOMER NAME</th>
                <th className="py-3 px-4 text-right">OUTSTANDING BALANCE</th>
                <th className="py-3 px-4 text-right w-48">PAYMENT AMOUNT (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "hover:bg-muted/30 transition-colors",
                    item.selected && "bg-blue-50/40 dark:bg-blue-950/20"
                  )}
                >
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => handleToggleItem(item.id)}
                      className="rounded border-border"
                    />
                  </td>
                  <td className="py-3 px-4 font-mono text-muted-foreground">
                    {item.code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-foreground">
                    {item.name}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                    Rs {item.balance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.paymentAmount || ""}
                      onChange={(e) => handleAmountChange(item.id, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-8 text-right font-mono text-xs w-full bg-background"
                    />
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
