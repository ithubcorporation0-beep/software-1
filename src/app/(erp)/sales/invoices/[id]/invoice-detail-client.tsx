"use client";

import * as React from "react";
import Link from "next/link";
import {
  Printer,
  Mail,
  Share2,
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  Building2,
  DollarSign,
  Info,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Invoice, Payment, Customer } from "@/types/database.types";
import { recordPaymentAction, voidPaymentAction } from "../../actions";

interface InvoiceDetailClientProps {
  companyId: string;
  invoice: Invoice;
  customer?: Customer | null;
  companyDetails: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    taxInformation?: string;
    currency: string;
  };
  initialPayments: Payment[];
}

export function InvoiceDetailClient({
  companyId,
  invoice,
  customer,
  companyDetails,
  initialPayments,
}: InvoiceDetailClientProps) {
  const [payments, setPayments] = React.useState<Payment[]>(initialPayments);
  const [invState, setInvState] = React.useState<Invoice>(invoice);

  // Modals & Handlers
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [showEmailModal, setShowEmailModal] = React.useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = React.useState(false);
  const [showVoidModal, setShowVoidModal] = React.useState(false);
  const [selectedPaymentForVoid, setSelectedPaymentForVoid] = React.useState<Payment | null>(null);
  const [voidReason, setVoidReason] = React.useState("");

  const [isPending, startTransition] = React.useTransition();
  const [notification, setNotification] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Payment Form
  const [paymentForm, setPaymentForm] = React.useState({
    amount: invState.amount_due,
    paymentMethod: "Bank Transfer" as const,
    transactionReference: "",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const handlePrint = () => {
    window.print();
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await recordPaymentAction(companyId, {
        invoiceId: invState.id,
        amount: paymentForm.amount,
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes,
      });

      if (res.success && res.data) {
        setNotification({ text: res.message || "Payment recorded.", type: "success" });
        setPayments([res.data, ...payments]);
        const newPaid = invState.amount_paid + res.data.amount;
        const newDue = Math.max(0, invState.grand_total - newPaid);
        setInvState({
          ...invState,
          amount_paid: newPaid,
          amount_due: newDue,
          status: newDue <= 0.001 ? "Paid" : "Partially Paid",
        });
        setShowPaymentModal(false);
      } else {
        setNotification({ text: res.message || "Payment failed.", type: "error" });
      }
    });
  };

  const handleVoidPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForVoid || !voidReason.trim()) return;
    startTransition(async () => {
      const res = await voidPaymentAction(companyId, selectedPaymentForVoid.id, voidReason);
      if (res.success) {
        setNotification({ text: res.message || "Payment voided.", type: "success" });
        const updatedPayments = payments.map((p) =>
          p.id === selectedPaymentForVoid.id
            ? { ...p, status: "Voided" as const, void_reason: voidReason }
            : p
        );
        setPayments(updatedPayments);

        const newPaid = Math.max(0, invState.amount_paid - selectedPaymentForVoid.amount);
        const newDue = Math.max(0, invState.grand_total - newPaid);
        setInvState({
          ...invState,
          amount_paid: newPaid,
          amount_due: newDue,
          status: newPaid > 0 ? "Partially Paid" : "Sent",
        });
        setShowVoidModal(false);
        setVoidReason("");
      } else {
        setNotification({ text: res.message || "Void failed.", type: "error" });
      }
    });
  };

  // WhatsApp message generation
  const cleanPhone = (customer?.whatsapp || customer?.phone || "").replace(/[^0-9]/g, "");
  const whatsAppMessage = `Hello ${customer?.name || "Customer"}, here is your commercial invoice ${invState.invoice_number} from ${companyDetails.name}.\n\nTotal Due: $${invState.amount_due.toFixed(2)} ${companyDetails.currency}\nDue Date: ${invState.due_date}\n\nPlease remit payment to our corporate account. Thank you for your business!`;
  const whatsAppUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsAppMessage)}` : "";

  return (
    <div className="space-y-6">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/sales">
            <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Sales Hub
            </Button>
          </Link>
          <span className="text-sm font-mono text-muted-foreground font-medium">
            Invoice #{invState.invoice_number}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="border-border hover:bg-muted text-foreground"
          >
            <Printer className="h-4 w-4 mr-1.5 text-primary" />
            Print / PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailModal(true)}
            className="border-border hover:bg-muted text-foreground"
          >
            <Mail className="h-4 w-4 mr-1.5 text-indigo-500" />
            Send Email
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWhatsAppModal(true)}
            className="border-border hover:bg-muted text-foreground"
          >
            <Share2 className="h-4 w-4 mr-1.5 text-emerald-600" />
            Share WhatsApp
          </Button>

          {invState.amount_due > 0 && invState.status !== "Cancelled" && (
            <Button
              size="sm"
              onClick={() => {
                setPaymentForm({
                  ...paymentForm,
                  amount: invState.amount_due,
                });
                setShowPaymentModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm"
            >
              <CreditCard className="h-4 w-4 mr-1.5" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3 rounded-md flex items-center justify-between text-sm print:hidden ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <span>{notification.text}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Printable Invoice Card */}
      <div className="bg-white text-neutral-900 rounded-xl p-8 shadow-xl max-w-4xl mx-auto border border-neutral-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none">
        {/* Header: Company & Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-neutral-200 pb-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-lg">
                IT
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                {companyDetails.name}
              </h2>
            </div>
            <div className="mt-3 text-xs text-neutral-600 space-y-0.5">
              {companyDetails.address && <p>{companyDetails.address}</p>}
              {companyDetails.email && <p>Email: {companyDetails.email}</p>}
              {companyDetails.phone && <p>Phone: {companyDetails.phone}</p>}
              {companyDetails.taxInformation && (
                <p className="font-semibold text-neutral-700">Tax ID: {companyDetails.taxInformation}</p>
              )}
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-xs uppercase font-extrabold tracking-widest text-sky-600">
              Commercial Invoice
            </span>
            <h1 className="text-3xl font-black font-mono mt-1 text-neutral-900">
              {invState.invoice_number}
            </h1>
            <div className="mt-2 flex sm:justify-end gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                invState.status === "Paid"
                  ? "bg-emerald-100 text-emerald-800"
                  : invState.status === "Partially Paid"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-sky-100 text-sky-800"
              }`}>
                {invState.status}
              </span>
            </div>
          </div>
        </div>

        {/* Client Bill To & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b border-neutral-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Billed To
            </span>
            <h3 className="text-base font-bold text-neutral-900 mt-1">
              {customer?.name || "Valued Corporate Client"}
            </h3>
            {customer?.company_name && (
              <p className="text-sm font-semibold text-neutral-700">{customer.company_name}</p>
            )}
            <div className="mt-1 text-xs text-neutral-600 space-y-0.5">
              {customer?.address && <p>{customer.address}</p>}
              {(customer?.city || customer?.country) && (
                <p>{[customer?.city, customer?.country].filter(Boolean).join(", ")}</p>
              )}
              {customer?.tax_number && <p className="font-medium">Tax Number: {customer.tax_number}</p>}
              {customer?.email && <p>Email: {customer.email}</p>}
              {customer?.phone && <p>Phone: {customer.phone}</p>}
            </div>
          </div>

          <div className="sm:text-right space-y-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Invoice Date
              </span>
              <p className="text-sm font-semibold text-neutral-800">{invState.issue_date}</p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Payment Due Date
              </span>
              <p className="text-sm font-bold text-rose-600">{invState.due_date}</p>
            </div>
            {invState.sales_order_id && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Sales Order Ref
                </span>
                <p className="text-xs font-mono text-neutral-700">{invState.sales_order_id}</p>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-neutral-900 text-xs uppercase tracking-wider text-neutral-800">
                <th className="py-2.5 font-bold">Item Description</th>
                <th className="py-2.5 text-center font-bold">Qty</th>
                <th className="py-2.5 text-right font-bold">Unit Price</th>
                <th className="py-2.5 text-right font-bold">Tax</th>
                <th className="py-2.5 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {(invState.items || []).map((it, idx) => (
                <tr key={idx}>
                  <td className="py-3 font-medium text-neutral-900">
                    {it.description}
                  </td>
                  <td className="py-3 text-center text-neutral-700 font-mono">
                    {it.quantity}
                  </td>
                  <td className="py-3 text-right text-neutral-700 font-mono">
                    ${it.unit_price.toFixed(2)}
                  </td>
                  <td className="py-3 text-right text-neutral-600 font-mono text-xs">
                    {it.tax_pct > 0 ? `${it.tax_pct}%` : "0%"}
                  </td>
                  <td className="py-3 text-right font-bold text-neutral-900 font-mono">
                    ${it.line_total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 border-t border-neutral-200 pt-6">
          <div className="text-xs text-neutral-600 max-w-sm space-y-2">
            <div>
              <span className="font-bold uppercase tracking-wider text-neutral-700">Payment Terms</span>
              <p className="mt-0.5">{invState.terms || "Net 30 calendar days."}</p>
            </div>
            {invState.notes && (
              <div>
                <span className="font-bold uppercase tracking-wider text-neutral-700">Remittance Notes</span>
                <p className="mt-0.5">{invState.notes}</p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-2 text-sm">
            <div className="flex justify-between py-1 text-neutral-600">
              <span>Subtotal</span>
              <span className="font-mono font-medium">${invState.subtotal.toFixed(2)}</span>
            </div>

            {invState.discount_total > 0 && (
              <div className="flex justify-between py-1 text-emerald-700">
                <span>Discount</span>
                <span className="font-mono font-medium">-${invState.discount_total.toFixed(2)}</span>
              </div>
            )}

            {invState.tax_total > 0 && (
              <div className="flex justify-between py-1 text-neutral-600">
                <span>Sales Tax</span>
                <span className="font-mono font-medium">+${invState.tax_total.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-t-2 border-neutral-900 font-bold text-base text-neutral-900">
              <span>Grand Total</span>
              <span className="font-mono">${invState.grand_total.toFixed(2)} {companyDetails.currency}</span>
            </div>

            <div className="flex justify-between py-1 text-emerald-700 font-medium text-xs">
              <span>Total Paid</span>
              <span className="font-mono">${invState.amount_paid.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-2 border-t border-neutral-200 font-bold text-base text-neutral-900 bg-neutral-50 px-2 rounded">
              <span>Remaining Due</span>
              <span className={`font-mono ${invState.amount_due > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                ${invState.amount_due.toFixed(2)} {companyDetails.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-neutral-200 text-center text-xs text-neutral-500">
          <p>Thank you for doing business with {companyDetails.name}. All accounts are subject to commercial credit agreements.</p>
        </div>
      </div>

      {/* Payment History Ledger on Detail Page (Hidden when printing) */}
      <div className="max-w-4xl mx-auto print:hidden">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="p-4 border-b border-border">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Recorded Payment Ledger for this Invoice
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Audit-compliant transaction history with reversal capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No payments recorded yet for this invoice.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider font-semibold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Payment #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-emerald-600 dark:text-emerald-400">{p.payment_number}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{p.payment_date}</td>
                        <td className="py-2.5 px-3 text-foreground font-medium">{p.payment_method}</td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">{p.transaction_reference || "—"}</td>
                        <td className="py-2.5 px-3">
                          {p.status === "Completed" ? (
                            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 text-[10px]">
                              Voided
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {p.status === "Completed" ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">+${p.amount.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground line-through font-mono">${p.amount.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {p.status === "Completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPaymentForVoid(p);
                                setShowVoidModal(true);
                              }}
                              className="h-6 px-2 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Void
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-xl rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Record Payment
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground">Payment Amount ($) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={invState.amount_due}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Remaining due: ${invState.amount_due.toFixed(2)}. Overpayments are prevented.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Payment Method *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                  className="w-full mt-1 bg-background border border-input rounded-md p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Payment Date *</label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
                  Record Ledger Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMAIL INTEGRATION MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-xl rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Mail className="h-5 w-5 text-indigo-500" />
                Dispatch Invoice via Email
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Email Provider Not Configured
              </div>
              <p>
                Direct transactional email delivery requires configuring a corporate SMTP server or verified Resend API key in <strong>Company Settings &rarr; Integrations</strong>.
              </p>
              <p>
                In the meantime, you can export the printable PDF or share via WhatsApp to deliver the invoice securely.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowEmailModal(false)}
              >
                Close
              </Button>
              <Link href="/settings">
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  Configure Email in Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP SHARING MODAL */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-xl rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Share2 className="h-5 w-5 text-emerald-600" />
                Share Invoice via WhatsApp
              </h3>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-foreground">
              <p className="text-muted-foreground">
                Send invoice summary and payment instructions directly to customer mobile:
              </p>

              <div className="bg-muted/50 p-3 rounded border border-border font-mono text-[11px] text-foreground whitespace-pre-line">
                {whatsAppMessage}
              </div>

              {cleanPhone ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Customer WhatsApp number detected: +{cleanPhone}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>No international phone recorded for this customer. Copy text to send manually.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(whatsAppMessage);
                  setNotification({ text: "Invoice message copied to clipboard.", type: "success" });
                  setShowWhatsAppModal(false);
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy Message
              </Button>

              {whatsAppUrl && (
                <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Open WhatsApp Web
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VOID PAYMENT MODAL */}
      {showVoidModal && selectedPaymentForVoid && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-xl rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Ban className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                Void Financial Transaction
              </h3>
              <button
                onClick={() => setShowVoidModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Reversing payment <strong className="text-foreground">{selectedPaymentForVoid.payment_number}</strong> (${selectedPaymentForVoid.amount.toFixed(2)}).
              This transaction will be marked as Voided and the invoice balance due will be increased back.
            </p>

            <form onSubmit={handleVoidPayment} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground">Reason for Voiding *</label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Check bounced or customer payment reversed..."
                  className="w-full mt-1 bg-background border border-input rounded-md p-2 text-xs text-foreground h-24 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowVoidModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !voidReason.trim()} className="bg-rose-600 hover:bg-rose-500 text-white font-medium">
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
