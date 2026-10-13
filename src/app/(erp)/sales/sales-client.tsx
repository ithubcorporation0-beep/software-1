"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  ShoppingCart,
  Receipt,
  CreditCard,
  Plus,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  Trash2,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Eye,
  Send,
  Printer,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type {
  Quotation,
  SalesOrder,
  Invoice,
  Payment,
  Customer,
  InvoiceStatus,
  QuotationStatus,
  SalesOrderStatus,
} from "@/types/database.types";
import {
  createQuotationAction,
  convertQuotationToSalesOrderAction,
  createSalesOrderAction,
  convertSalesOrderToInvoiceAction,
  createInvoiceAction,
  recordPaymentAction,
  voidPaymentAction,
} from "./actions";

interface SalesClientProps {
  companyId: string;
  currency: string;
  initialInvoices: Invoice[];
  initialSalesOrders: SalesOrder[];
  initialQuotations: Quotation[];
  initialPayments: Payment[];
  customers: Customer[];
}

export function SalesClient({
  companyId,
  currency,
  initialInvoices,
  initialSalesOrders,
  initialQuotations,
  initialPayments,
  customers,
}: SalesClientProps) {
  const [activeTab, setActiveTab] = React.useState<"invoices" | "orders" | "quotations" | "payments" | "overview">("invoices");

  const formatMoney = (amount: number) => {
    const symbol = currency === "PKR" ? "₨ " : (currency === "USD" ? "$" : `${currency} `);
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter & Search States
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Notifications & Loadings
  const [isPending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modals
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = React.useState(false);
  const [showCreateQuoteModal, setShowCreateQuoteModal] = React.useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = React.useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = React.useState<Invoice | null>(null);
  const [showVoidPaymentModal, setShowVoidPaymentModal] = React.useState(false);
  const [selectedPaymentForVoid, setSelectedPaymentForVoid] = React.useState<Payment | null>(null);
  const [voidReason, setVoidReason] = React.useState("");

  // Invoice Form State
  const [invoiceForm, setInvoiceForm] = React.useState({
    customerId: customers[0]?.id || "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    notes: "",
    terms: "Net 30. Wire transfer instructions provided upon request.",
    items: [{ description: "", quantity: 1, unitPrice: 0, taxPct: 0, discountPct: 0 }],
  });

  // Quotation Form State
  const [quoteForm, setQuoteForm] = React.useState({
    customerId: customers[0]?.id || "",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    notes: "",
    terms: "Quotation valid for 30 calendar days.",
    items: [{ description: "", quantity: 1, unitPrice: 0, taxPct: 0, discountPct: 0 }],
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = React.useState({
    amount: 0,
    paymentMethod: "Bank Transfer" as const,
    transactionReference: "",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Calculate Metrics
  const totalInvoiced = initialInvoices.reduce((acc, inv) => acc + inv.grand_total, 0);
  const totalPaid = initialInvoices.reduce((acc, inv) => acc + inv.amount_paid, 0);
  const totalReceivables = initialInvoices.reduce((acc, inv) => acc + inv.amount_due, 0);
  const totalActiveOrders = initialSalesOrders.filter((o) => o.status !== "Cancelled" && o.status !== "Invoiced").length;

  // Filtered Invoices
  const filteredInvoices = initialInvoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Orders
  const filteredOrders = initialSalesOrders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Quotations
  const filteredQuotations = initialQuotations.filter((q) => {
    const matchesSearch =
      q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Payments
  const filteredPayments = initialPayments.filter((p) => {
    return (
      p.payment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.transaction_reference && p.transaction_reference.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Handlers
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.customerId) {
      setMessage({ text: "Please select a client customer.", type: "error" });
      return;
    }
    startTransition(async () => {
      const res = await createInvoiceAction(companyId, invoiceForm);
      if (res.success) {
        setMessage({ text: res.message || "Invoice generated.", type: "success" });
        setShowCreateInvoiceModal(false);
      } else {
        setMessage({ text: res.message || "Creation failed.", type: "error" });
      }
    });
  };

  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.customerId) {
      setMessage({ text: "Please select a client customer.", type: "error" });
      return;
    }
    startTransition(async () => {
      const res = await createQuotationAction(companyId, quoteForm);
      if (res.success) {
        setMessage({ text: res.message || "Quotation generated.", type: "success" });
        setShowCreateQuoteModal(false);
      } else {
        setMessage({ text: res.message || "Creation failed.", type: "error" });
      }
    });
  };

  const handleConvertQuote = (quoteId: string) => {
    startTransition(async () => {
      const res = await convertQuotationToSalesOrderAction(companyId, quoteId);
      if (res.success) {
        setMessage({ text: res.message || "Quotation converted to Sales Order.", type: "success" });
      } else {
        setMessage({ text: res.message || "Conversion failed.", type: "error" });
      }
    });
  };

  const handleConvertOrder = (orderId: string) => {
    startTransition(async () => {
      const res = await convertSalesOrderToInvoiceAction(companyId, orderId);
      if (res.success) {
        setMessage({ text: res.message || "Order converted to Commercial Invoice.", type: "success" });
      } else {
        setMessage({ text: res.message || "Conversion failed.", type: "error" });
      }
    });
  };

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentForm({
      amount: inv.amount_due,
      paymentMethod: "Bank Transfer",
      transactionReference: "",
      paymentDate: new Date().toISOString().split("T")[0],
      notes: `Payment for ${inv.invoice_number}`,
    });
    setShowRecordPaymentModal(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;
    startTransition(async () => {
      const res = await recordPaymentAction(companyId, {
        invoiceId: selectedInvoiceForPayment.id,
        amount: paymentForm.amount,
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes,
      });
      if (res.success) {
        setMessage({ text: res.message || "Payment recorded.", type: "success" });
        setShowRecordPaymentModal(false);
      } else {
        setMessage({ text: res.message || "Payment recording failed.", type: "error" });
      }
    });
  };

  const handleVoidPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForVoid || !voidReason.trim()) return;
    startTransition(async () => {
      const res = await voidPaymentAction(companyId, selectedPaymentForVoid.id, voidReason);
      if (res.success) {
        setMessage({ text: res.message || "Payment voided.", type: "success" });
        setShowVoidPaymentModal(false);
        setVoidReason("");
      } else {
        setMessage({ text: res.message || "Void failed.", type: "error" });
      }
    });
  };

  const getInvoiceStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "Paid":
        return <Badge variant="success">Paid</Badge>;
      case "Partially Paid":
        return <Badge variant="warning">Partially Paid</Badge>;
      case "Sent":
        return <Badge variant="info">Sent</Badge>;
      case "Overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "Cancelled":
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const getOrderStatusBadge = (status: SalesOrderStatus) => {
    switch (status) {
      case "Invoiced":
        return <Badge variant="info">Invoiced</Badge>;
      case "Confirmed":
        return <Badge variant="info">Confirmed</Badge>;
      case "In Production":
        return <Badge variant="warning">In Production</Badge>;
      case "Delivered":
        return <Badge variant="success">Delivered</Badge>;
      case "Cancelled":
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Commercial Sales &amp; Invoicing
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            End-to-end sales lifecycle: Quotation → Sales Order → Invoice → Payment Ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateQuoteModal(true)}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5 text-primary" />
            New Quotation
          </Button>

          <Button
            size="sm"
            onClick={() => setShowCreateInvoiceModal(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Alert Notifications */}
      {message && (
        <div
          className={`p-3 rounded-md flex items-center justify-between text-xs ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase tracking-wider text-muted-foreground">Total Invoiced</CardDescription>
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-1.5 font-mono">
              <DollarSign className="h-4 w-4 text-primary" />
              {totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Across {initialInvoices.length} commercial invoices
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase tracking-wider text-muted-foreground">Collected Revenue</CardDescription>
            <CardTitle className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Realized cash flow to date
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase tracking-wider text-muted-foreground">Outstanding Receivables</CardDescription>
            <CardTitle className="text-xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-mono">
              <Clock className="h-4 w-4 text-amber-500" />
              {totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Pending customer collections
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase tracking-wider text-muted-foreground">Active Sales Orders</CardDescription>
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-1.5 font-mono">
              <ShoppingCart className="h-4 w-4 text-primary" />
              {totalActiveOrders}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Pending production or delivery
          </CardContent>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-border/80">
        <button
          onClick={() => { setActiveTab("invoices"); setStatusFilter("ALL"); }}
          className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "invoices"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="h-3.5 w-3.5" />
          Invoices ({initialInvoices.length})
        </button>

        <button
          onClick={() => { setActiveTab("orders"); setStatusFilter("ALL"); }}
          className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "orders"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Sales Orders ({initialSalesOrders.length})
        </button>

        <button
          onClick={() => { setActiveTab("quotations"); setStatusFilter("ALL"); }}
          className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "quotations"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Quotations ({initialQuotations.length})
        </button>

        <button
          onClick={() => { setActiveTab("payments"); setStatusFilter("ALL"); }}
          className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "payments"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Payment Ledger ({initialPayments.length})
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>

        {activeTab === "invoices" && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {["ALL", "Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: INVOICES */}
      {activeTab === "invoices" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3.5">Invoice #</th>
                  <th className="py-2.5 px-3.5">Customer</th>
                  <th className="py-2.5 px-3.5">Dates</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Total</th>
                  <th className="py-2.5 px-3.5 text-right">Balance Due</th>
                  <th className="py-2.5 px-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500">
                      No invoices found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-medium text-primary">
                        <Link href={`/sales/invoices/${inv.id}`} className="hover:underline flex items-center gap-1">
                          {inv.invoice_number}
                          <ChevronRight className="h-3 w-3 opacity-60" />
                        </Link>
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-foreground">
                        {inv.customer?.name || "Corporate Customer"}
                        {inv.customer?.company_name && (
                          <span className="block text-[11px] text-muted-foreground font-normal">
                            {inv.customer.company_name}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-xs text-muted-foreground">
                        <span>Issued: {inv.issue_date}</span>
                        <span className="block text-[11px]">Due: {inv.due_date}</span>
                      </td>
                      <td className="py-2.5 px-3.5">{getInvoiceStatusBadge(inv.status)}</td>
                      <td className="py-2.5 px-3.5 text-right font-medium font-mono text-foreground">
                        {formatMoney(inv.grand_total)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-medium font-mono">
                        {inv.amount_due > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">{formatMoney(inv.amount_due)}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">{formatMoney(0)}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link href={`/sales/invoices/${inv.id}`}>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                          </Link>

                          {inv.amount_due > 0 && inv.status !== "Cancelled" && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenPayment(inv)}
                              className="h-7 px-2 text-xs"
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: SALES ORDERS */}
      {activeTab === "orders" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3.5">Order #</th>
                  <th className="py-2.5 px-3.5">Customer</th>
                  <th className="py-2.5 px-3.5">Order Date</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Grand Total</th>
                  <th className="py-2.5 px-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No sales orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-medium text-primary">
                        {ord.order_number}
                      </td>
                      <td className="py-2.5 px-3.5 text-foreground font-medium">
                        {ord.customer?.name || "Corporate Customer"}
                      </td>
                      <td className="py-2.5 px-3.5 text-muted-foreground text-xs">
                        {ord.order_date}
                      </td>
                      <td className="py-2.5 px-3.5">{getOrderStatusBadge(ord.status)}</td>
                      <td className="py-2.5 px-3.5 text-right font-medium font-mono text-foreground">
                        {formatMoney(ord.grand_total)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        {ord.status !== "Invoiced" && ord.status !== "Cancelled" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConvertOrder(ord.id)}
                            disabled={isPending}
                            className="h-7 text-xs"
                          >
                            <Receipt className="h-3.5 w-3.5 mr-1 text-primary" />
                            Generate Invoice
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {ord.status === "Invoiced" ? "Invoiced" : "Closed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: QUOTATIONS */}
      {activeTab === "quotations" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3.5">Quote #</th>
                  <th className="py-2.5 px-3.5">Customer</th>
                  <th className="py-2.5 px-3.5">Dates</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Amount</th>
                  <th className="py-2.5 px-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No quotations found.
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((q) => (
                    <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-medium text-primary">
                        {q.quotation_number}
                      </td>
                      <td className="py-2.5 px-3.5 text-foreground font-medium">
                        {q.customer?.name || "Corporate Customer"}
                      </td>
                      <td className="py-2.5 px-3.5 text-xs text-muted-foreground">
                        <span>Issued: {q.issue_date}</span>
                        <span className="block text-[11px]">Expires: {q.expiry_date}</span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <Badge variant="outline">{q.status}</Badge>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-medium font-mono text-foreground">
                        {formatMoney(q.grand_total)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        {q.status !== "Converted" && q.status !== "Declined" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConvertQuote(q.id)}
                            disabled={isPending}
                            className="h-7 text-xs"
                          >
                            <ShoppingCart className="h-3.5 w-3.5 mr-1 text-primary" />
                            Convert to SO
                          </Button>
                        )}
                        {q.status === "Converted" && (
                          <span className="text-xs text-muted-foreground">Converted</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: PAYMENT LEDGER */}
      {activeTab === "payments" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3.5">Payment #</th>
                  <th className="py-2.5 px-3.5">Date</th>
                  <th className="py-2.5 px-3.5">Method</th>
                  <th className="py-2.5 px-3.5">Reference</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Amount</th>
                  <th className="py-2.5 px-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No payments recorded in ledger.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {p.payment_number}
                      </td>
                      <td className="py-2.5 px-3.5 text-xs text-muted-foreground">{p.payment_date}</td>
                      <td className="py-2.5 px-3.5 text-foreground font-medium">{p.payment_method}</td>
                      <td className="py-2.5 px-3.5 font-mono text-xs text-muted-foreground">
                        {p.transaction_reference || "—"}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {p.status === "Completed" ? (
                          <Badge variant="success">Completed</Badge>
                        ) : (
                          <Badge variant="destructive">Voided</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-medium font-mono">
                        {p.status === "Completed" ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{formatMoney(p.amount)}</span>
                        ) : (
                          <span className="text-muted-foreground line-through">{formatMoney(p.amount)}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        {p.status === "Completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPaymentForVoid(p);
                              setShowVoidPaymentModal(true);
                            }}
                            className="h-7 px-2 text-xs text-rose-400 border-rose-900 hover:bg-rose-950/40"
                          >
                            <Ban className="h-3 w-3 mr-1" />
                            Void
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* CREATE INVOICE MODAL */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border/80 rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Generate Commercial Invoice
              </h3>
              <button
                onClick={() => setShowCreateInvoiceModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-foreground">Client Customer *</label>
                  <select
                    value={invoiceForm.customerId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customerId: e.target.value })}
                    className="w-full mt-1 bg-background border border-input rounded-md p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company_name ? `(${c.company_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Issue Date *</label>
                  <Input
                    type="date"
                    value={invoiceForm.issueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })}
                    className="mt-1 h-9 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Due Date *</label>
                  <Input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="mt-1 h-9 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Payment Terms</label>
                  <Input
                    value={invoiceForm.terms}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, terms: e.target.value })}
                    placeholder="e.g. Net 30"
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invoice Line Items</span>
                  <button
                    type="button"
                    onClick={() =>
                      setInvoiceForm({
                        ...invoiceForm,
                        items: [
                          ...invoiceForm.items,
                          { description: "", quantity: 1, unitPrice: 0, taxPct: 0, discountPct: 0 },
                        ],
                      })
                    }
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <Plus className="h-3 w-3" /> Add Line
                  </button>
                </div>

                {invoiceForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/30 p-2 rounded border border-border/80">
                    <div className="col-span-5">
                      <Input
                        placeholder="Item description / SKU"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...invoiceForm.items];
                          updated[idx].description = e.target.value;
                          setInvoiceForm({ ...invoiceForm, items: updated });
                        }}
                        className="h-8 text-xs bg-background"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...invoiceForm.items];
                          updated[idx].quantity = parseFloat(e.target.value) || 1;
                          setInvoiceForm({ ...invoiceForm, items: updated });
                        }}
                        className="h-8 text-xs bg-background"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const updated = [...invoiceForm.items];
                          updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                          setInvoiceForm({ ...invoiceForm, items: updated });
                        }}
                        className="h-8 text-xs bg-background"
                        required
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      {invoiceForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = invoiceForm.items.filter((_, i) => i !== idx);
                            setInvoiceForm({ ...invoiceForm, items: updated });
                          }}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Notes / Remittance Instructions</label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  placeholder="Additional client notes or bank wire details..."
                  className="w-full mt-1 bg-background border border-input rounded-md p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/80">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateInvoiceModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  Issue Commercial Invoice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE QUOTATION MODAL */}
      {showCreateQuoteModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border/80 rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Draft Price Quotation
              </h3>
              <button
                onClick={() => setShowCreateQuoteModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-foreground">Prospect / Customer *</label>
                  <select
                    value={quoteForm.customerId}
                    onChange={(e) => setQuoteForm({ ...quoteForm, customerId: e.target.value })}
                    className="w-full mt-1 bg-background border border-input rounded-md p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company_name ? `(${c.company_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Issue Date *</label>
                  <Input
                    type="date"
                    value={quoteForm.issueDate}
                    onChange={(e) => setQuoteForm({ ...quoteForm, issueDate: e.target.value })}
                    className="mt-1 h-9 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Expiry Date *</label>
                  <Input
                    type="date"
                    value={quoteForm.expiryDate}
                    onChange={(e) => setQuoteForm({ ...quoteForm, expiryDate: e.target.value })}
                    className="mt-1 h-9 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Terms &amp; Conditions</label>
                  <Input
                    value={quoteForm.terms}
                    onChange={(e) => setQuoteForm({ ...quoteForm, terms: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 pt-2 border-t border-border/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quotation Items</span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuoteForm({
                        ...quoteForm,
                        items: [
                          ...quoteForm.items,
                          { description: "", quantity: 1, unitPrice: 0, taxPct: 0, discountPct: 0 },
                        ],
                      })
                    }
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <Plus className="h-3 w-3" /> Add Line
                  </button>
                </div>

                {quoteForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/30 p-2 rounded border border-border/80">
                    <div className="col-span-5">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...quoteForm.items];
                          updated[idx].description = e.target.value;
                          setQuoteForm({ ...quoteForm, items: updated });
                        }}
                        className="h-8 text-xs bg-background"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...quoteForm.items];
                          updated[idx].quantity = parseFloat(e.target.value) || 1;
                          setQuoteForm({ ...quoteForm, items: updated });
                        }}
                        className="h-8 text-xs bg-background"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const updated = [...quoteForm.items];
                          updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                          setQuoteForm({ ...quoteForm, items: updated });
                        }}
                        className="h-8 text-xs bg-background"
                        required
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      {quoteForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = quoteForm.items.filter((_, i) => i !== idx);
                            setQuoteForm({ ...quoteForm, items: updated });
                          }}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/80">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateQuoteModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  Issue Quotation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showRecordPaymentModal && selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border/80 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Record Customer Payment
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Invoice: {selectedInvoiceForPayment.invoice_number} • Remaining Due: {formatMoney(selectedInvoiceForPayment.amount_due)}
                </p>
              </div>
              <button
                onClick={() => setShowRecordPaymentModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground">Payment Amount ({currency === "PKR" ? "₨" : currency}) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedInvoiceForPayment.amount_due}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 h-9 text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400"
                  required
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Overpayment protection is active. Max payable: {formatMoney(selectedInvoiceForPayment.amount_due)}.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Payment Method *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      paymentMethod: e.target.value as any,
                    })
                  }
                  className="w-full mt-1 bg-background border border-input rounded-md p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  <option value="Bank Transfer">Bank Wire / ACH</option>
                  <option value="Card">Corporate Credit Card</option>
                  <option value="Cash">Cash Receipt</option>
                  <option value="Online Payment">Online Payment Gateway</option>
                  <option value="Other">Other / Check</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Transaction Reference</label>
                <Input
                  placeholder="e.g. WIRE-89420 or Check #301"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Payment Date *</label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/80">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRecordPaymentModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  Record Ledger Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOID PAYMENT MODAL */}
      {showVoidPaymentModal && selectedPaymentForVoid && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border/80 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Ban className="h-4 w-4 text-destructive" />
                Void Financial Transaction
              </h3>
              <button
                onClick={() => setShowVoidPaymentModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              You are reversing payment <strong className="text-foreground">{selectedPaymentForVoid.payment_number}</strong> of{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatMoney(selectedPaymentForVoid.amount)}</strong>. This transaction will not be deleted; it will be marked as Voided and the linked invoice balance will be restored.
            </p>

            <form onSubmit={handleVoidPayment} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground">Reason for Voiding *</label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Check bounced, chargeback, or entered against wrong client account..."
                  className="w-full mt-1 bg-background border border-input rounded-md p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-24"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/80">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowVoidPaymentModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !voidReason.trim()} variant="destructive">
                  Confirm Transaction Void
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
