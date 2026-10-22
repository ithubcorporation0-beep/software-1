"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  Plus,
  Search,
  Download,
  Printer,
  Eye,
  Trash2,
  Calendar,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  List,
  LayoutGrid,
  Building,
  Loader2,
  X,
} from "lucide-react";
import { CustomerPayment, Customer, CustomerPaymentStatus, CustomerPaymentType } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  createCustomerPaymentAction,
  updateCustomerPaymentStatusAction,
  deleteCustomerPaymentAction,
} from "@/app/(erp)/account/customers/actions";

export interface CustomerPaymentsClientProps {
  companyId: string;
  initialPayments: CustomerPayment[];
  customers: Customer[];
}

export function CustomerPaymentsClient({
  companyId,
  initialPayments,
  customers,
}: CustomerPaymentsClientProps) {
  const [payments, setPayments] = React.useState<CustomerPayment[]>(initialPayments);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");

  // Feedback Toast
  const [feedback, setFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(null);
  React.useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3500);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Modals
  const [selectedPayment, setSelectedPayment] = React.useState<CustomerPayment | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [formCustomerId, setFormCustomerId] = React.useState(customers[0]?.id || "");
  const [formAmount, setFormAmount] = React.useState("");
  const [formDate, setFormDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [formType, setFormType] = React.useState<CustomerPaymentType>("Against Invoices");
  const [formMethod, setFormMethod] = React.useState("Bank Transfer");
  const [formRef, setFormRef] = React.useState("");
  const [formNotes, setFormNotes] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  // Filtered Payments
  const filteredPayments = React.useMemo(() => {
    return payments.filter((p) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchNumber = p.payment_number.toLowerCase().includes(q);
        const matchCustomer = p.customer_name.toLowerCase().includes(q);
        const matchRef = (p.reference_number || "").toLowerCase().includes(q);
        if (!matchNumber && !matchCustomer && !matchRef) return false;
      }
      if (typeFilter !== "ALL" && p.payment_type !== typeFilter) return false;
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      return true;
    });
  }, [payments, search, typeFilter, statusFilter]);

  // Metrics
  const totalReceived = React.useMemo(() => {
    return payments.filter((p) => p.status === "Cleared").reduce((s, p) => s + p.payment_amount, 0);
  }, [payments]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId) {
      setFormError("Please select a customer.");
      return;
    }
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Please enter a valid payment amount.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const selectedCust = customers.find((c) => c.id === formCustomerId);
      const res = await createCustomerPaymentAction(companyId, {
        customer_id: formCustomerId,
        customer_name: selectedCust?.name,
        payment_date: formDate,
        payment_amount: amt,
        payment_type: formType,
        payment_method: formMethod,
        reference_number: formRef,
        notes: formNotes,
      });

      if (res.success && res.data) {
        setPayments((prev) => [res.data!, ...prev]);
        setIsRecordModalOpen(false);
        setFormAmount("");
        setFormRef("");
        setFormNotes("");
        setFeedback({ message: `Payment ${res.data.payment_number} recorded successfully.`, type: "success" });
      } else {
        setFormError(res.error || "Failed to record payment.");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (payment: CustomerPayment) => {
    if (!confirm(`Are you sure you want to delete payment receipt '${payment.payment_number}'?`)) return;

    try {
      const res = await deleteCustomerPaymentAction(companyId, payment.id);
      if (res.success) {
        setPayments((prev) => prev.filter((p) => p.id !== payment.id));
        setFeedback({ message: `Payment ${payment.payment_number} removed.`, type: "success" });
        if (selectedPayment?.id === payment.id) setSelectedPayment(null);
      } else {
        setFeedback({ message: res.error || "Could not delete payment.", type: "error" });
      }
    } catch (err: any) {
      setFeedback({ message: err.message || "Failed to delete payment.", type: "error" });
    }
  };

  const handleExportCsv = () => {
    const headers = ["Payment Number", "Customer", "Date", "Amount (PKR)", "Type", "Method", "Reference", "Status"];
    const rows = filteredPayments.map((p) => [
      p.payment_number,
      `"${p.customer_name.replace(/"/g, '""')}"`,
      p.payment_date,
      p.payment_amount,
      p.payment_type,
      p.payment_method,
      `"${(p.reference_number || "").replace(/"/g, '""')}"`,
      p.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer_payments_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Accounts & Commercial</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-xs font-medium text-muted-foreground">UNAZ ERP Receipts</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
              <CreditCard className="h-6 w-6 text-primary" />
              Customer Payments
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/account/customer-payments/due-batch">
              <Button variant="outline" size="sm" className="gap-2 h-9 text-xs">
                <Layers className="h-3.5 w-3.5" />
                Due & Batch Payment
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-2 h-9 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={() => setIsRecordModalOpen(true)}
              className="gap-2 h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Record Payment
            </Button>
          </div>
        </div>

        {/* Quick Filter & Search Bar matching Image 1 */}
        <div className="mt-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search payments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">All Types</option>
              <option value="Against Invoices">Against Invoices</option>
              <option value="Advance Payment">Advance Payment</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="Cleared">Cleared</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* List / Grid view switcher matching Image 1 */}
            <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Table / Grid Content */}
      <main className="p-6">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-16 border rounded-2xl bg-card border-dashed">
            <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-foreground">No Customer Payments Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No payment transactions match the active search criteria or filters.
            </p>
            <Button
              size="sm"
              onClick={() => setIsRecordModalOpen(true)}
              className="mt-4 gap-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Record First Payment
            </Button>
          </div>
        ) : viewMode === "list" ? (
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1.5 cursor-pointer">
                      <span>PAYMENT NUMBER</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">CUSTOMER NAME</th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1.5 cursor-pointer">
                      <span>PAYMENT DATE</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">AMOUNT</th>
                  <th className="py-3 px-4">PAYMENT TYPE</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-medium">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-left font-semibold"
                      >
                        {p.payment_number}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {p.customer_name}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {p.payment_date}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                      Rs {p.payment_amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] font-medium border",
                          p.payment_type === "Advance Payment"
                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                        )}
                      >
                        {p.payment_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] font-medium border",
                          p.status === "Cleared"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                        )}
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelectedPayment(p)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="View Voucher"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedPayment(p)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Print Receipt"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePayment(p)}
                          className="p-1.5 rounded-md hover:bg-rose-50 text-muted-foreground hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Payment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPayments.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-all cursor-pointer"
                onClick={() => setSelectedPayment(p)}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {p.payment_number}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {p.status}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground truncate">{p.customer_name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Date: {p.payment_date}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{p.payment_type}</span>
                  <span className="font-mono font-bold text-sm text-foreground">
                    Rs {p.payment_amount.toLocaleString("en-PK")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Record Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Record Customer Payment</h3>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Customer */}
              <div className="space-y-1">
                <label className="font-medium text-foreground">Customer Account *</label>
                <select
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-ring"
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company_name ? `(${c.company_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Amount (PKR) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Payment Date *</label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
              </div>

              {/* Payment Type & Method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Payment Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium"
                  >
                    <option value="Against Invoices">Against Invoices</option>
                    <option value="Advance Payment">Advance Payment</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Payment Method</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Online Transfer">Online Transfer</option>
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div className="space-y-1">
                <label className="font-medium text-foreground">Reference / Cheque #</label>
                <Input
                  type="text"
                  placeholder="e.g. HBL-TRX-1092 or Cheque # 88291"
                  value={formRef}
                  onChange={(e) => setFormRef(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-medium text-foreground">Notes / Description</label>
                <Input
                  type="text"
                  placeholder="Optional transaction remarks..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRecordModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="gap-2 bg-primary text-primary-foreground font-semibold"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Record Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Voucher / Receipt Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl rounded-2xl bg-background border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Customer Payment Voucher</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Voucher
                </Button>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Voucher Body (Printable Receipt format) */}
            <div className="p-6 space-y-6 text-xs" id="printable-voucher">
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-bold text-foreground">OFFICIAL PAYMENT RECEIPT</h2>
                  <p className="text-muted-foreground text-[11px] mt-0.5">IT-HUB ERP • Financial & Tax Operations</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                    {selectedPayment.payment_number}
                  </span>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Date: {selectedPayment.payment_date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Received From</span>
                  <p className="font-semibold text-sm text-foreground mt-0.5">{selectedPayment.customer_name}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Amount Paid</span>
                  <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Rs {selectedPayment.payment_amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-b border-border pb-4">
                <div>
                  <span className="text-muted-foreground block">Payment Type</span>
                  <span className="font-medium text-foreground">{selectedPayment.payment_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Payment Method</span>
                  <span className="font-medium text-foreground">{selectedPayment.payment_method}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Reference / Cheque</span>
                  <span className="font-mono font-medium text-foreground">{selectedPayment.reference_number || "None"}</span>
                </div>
              </div>

              {selectedPayment.notes && (
                <div>
                  <span className="text-muted-foreground block">Transaction Notes</span>
                  <p className="text-foreground mt-1 bg-muted/20 p-2.5 rounded-lg border border-border/60">
                    {selectedPayment.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-end pt-8 text-[11px] text-muted-foreground">
                <div className="border-t border-border/80 pt-1 w-36 text-center">
                  <span>Prepared By</span>
                </div>
                <div className="border-t border-border/80 pt-1 w-36 text-center">
                  <span>Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
