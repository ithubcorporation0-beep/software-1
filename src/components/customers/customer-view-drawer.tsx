"use client";

import * as React from "react";
import {
  X,
  Building2,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Edit,
  Printer,
  Copy,
  Check,
  ExternalLink,
  FileText,
  User,
} from "lucide-react";
import { Customer } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CustomerViewDrawerProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onEdit?: (customer: Customer) => void;
}

export function CustomerViewDrawer({
  open,
  onClose,
  customer,
  onEdit,
}: CustomerViewDrawerProps) {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !customer) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatPKR = (amount: number | null | undefined) => {
    const num = amount ?? 0;
    return `Rs. ${num.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const initials = (customer.company_name || customer.name || "C")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isRetailer = customer.customer_type === "B2C" || customer.customer_type === "Retailer";
  const taxRateHint = isRetailer
    ? "Retailer governed under Section 236H (Active Filer: 0.5% | Non-Filer: 1.0%)"
    : "Wholesale / Distributor governed under Section 236G (Active Filer: 0.1% | Non-Filer: 0.2%)";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-background border-l border-border shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-250"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 text-sm shadow-2xs">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold truncate text-foreground">
                  {customer.company_name || customer.name}
                </h2>
                <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                  {customer.customer_code}
                </Badge>
                <Badge
                  className={cn(
                    "text-xs font-semibold",
                    customer.status === "Active"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
                  )}
                >
                  {customer.status === "Active" ? "Active" : "Disabled"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isRetailer ? "Retailer (Section 236H)" : "WS / Distributor (Section 236G)"} •{" "}
                {customer.customer_group || "General Group"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(customer);
                }}
                className="gap-1.5 h-8 text-xs font-medium cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit</span>
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* FBR Statutory Compliance Card (3 UNAZ Indicators) */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <h3 className="text-sm font-semibold text-foreground">
                  FBR Active Taxpayer (ATL) Statutory Verification
                </h3>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                NTN: {customer.ntn_number || customer.tax_number || "Unregistered"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{taxRateHint}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Indicator 1 */}
              <div className="rounded-lg border bg-card/80 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                  Sales Tax Reg Type
                </span>
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold",
                    (customer.sales_tax_reg_type || "Unregistered") === "Registered"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-500/15 text-red-700 dark:text-red-400"
                  )}
                >
                  {customer.sales_tax_reg_type || "Unregistered"}
                </span>
              </div>

              {/* Indicator 2 */}
              <div className="rounded-lg border bg-card/80 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                  Sales Tax ATL
                </span>
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold",
                    (customer.sales_tax_atl || "Inactive") === "Active" || (customer.sales_tax_atl || "").includes("Active")
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-500/15 text-red-700 dark:text-red-400"
                  )}
                >
                  {customer.sales_tax_atl || "Inactive"}
                </span>
              </div>

              {/* Indicator 3 */}
              <div className="rounded-lg border bg-card/80 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                  Income Tax ATL
                </span>
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold",
                    (customer.income_tax_atl || "Inactive") === "Active" || (customer.income_tax_atl || "").includes("Active")
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-500/15 text-red-700 dark:text-red-400"
                  )}
                >
                  {customer.income_tax_atl || "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Balances Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-1 shadow-2xs">
              <span className="text-[11px] font-medium text-muted-foreground block">Customer Balance</span>
              <p className="text-base font-bold text-foreground tabular-nums">
                {formatPKR(customer.total_spend || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-1 shadow-2xs">
              <span className="text-[11px] font-medium text-muted-foreground block">Advance Balance</span>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatPKR(customer.advance_balance || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-1 shadow-2xs">
              <span className="text-[11px] font-medium text-muted-foreground block">Credit Limit</span>
              <p className="text-base font-bold text-foreground tabular-nums">
                {formatPKR(customer.credit_limit || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-1 shadow-2xs">
              <span className="text-[11px] font-medium text-muted-foreground block">Opening Balance</span>
              <p className="text-base font-bold text-muted-foreground tabular-nums">
                {formatPKR(customer.opening_balance || 0)}
              </p>
            </div>
          </div>

          {/* Contact & Identification Grid */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Contact & Identification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Contact Person:</span>
                <p className="font-semibold text-foreground">{customer.contact_person || customer.name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Email:</span>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-foreground truncate">{customer.email || "Not specified"}</p>
                  {customer.email && (
                    <button
                      onClick={() => copyToClipboard(customer.email!, "email")}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Copy email"
                    >
                      {copiedField === "email" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Mobile / Phone:</span>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-foreground">{customer.mobile_number || customer.phone || "Not specified"}</p>
                  {(customer.mobile_number || customer.phone) && (
                    <button
                      onClick={() => copyToClipboard(customer.mobile_number || customer.phone!, "phone")}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Copy phone"
                    >
                      {copiedField === "phone" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">CNIC Number:</span>
                <p className="font-mono font-medium text-foreground">{customer.cnic_number || "—"}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">NTN Number:</span>
                <p className="font-mono font-medium text-foreground">{customer.ntn_number || customer.tax_number || "—"}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">STRN Number:</span>
                <p className="font-mono font-medium text-foreground">{customer.strn_number || "—"}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Payment Terms:</span>
                <p className="font-medium text-foreground">{customer.payment_terms || "Due on Receipt"}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Carried By:</span>
                <p className="font-medium text-foreground">{customer.carried_by || "—"}</p>
              </div>
            </div>
          </div>

          {/* Addresses: Billing & Shipping Side by Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Billing Address */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>Billing Address</span>
              </div>
              <div className="text-xs text-foreground/90 space-y-0.5 leading-relaxed">
                <p className="font-bold text-foreground text-sm">{customer.billing_name || customer.company_name || customer.name}</p>
                <p>{customer.billing_address || customer.address || "No address provided"}</p>
                {customer.address_line_2 && <p>{customer.address_line_2}</p>}
                <p>
                  {[customer.city, customer.state, customer.zip_code].filter(Boolean).join(", ")}
                </p>
                <p className="font-medium text-muted-foreground">{customer.country || "Pakistan"}</p>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                <span>Shipping Address</span>
              </div>
              <div className="text-xs text-foreground/90 space-y-0.5 leading-relaxed">
                <p className="font-bold text-foreground text-sm">
                  {customer.shipping_name || customer.billing_name || customer.company_name || customer.name}
                </p>
                <p>{customer.shipping_address || customer.billing_address || customer.address || "Same as billing address"}</p>
                {customer.shipping_address_line_2 && <p>{customer.shipping_address_line_2}</p>}
                <p>
                  {[
                    customer.shipping_city || customer.city,
                    customer.shipping_state || customer.state,
                    customer.shipping_zip_code || customer.zip_code,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="font-medium text-muted-foreground">{customer.shipping_country || customer.country || "Pakistan"}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span>Internal Notes</span>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {customer.notes}
              </p>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Created: {new Date(customer.created_at).toLocaleDateString()}</span>
            <span>Last Modified: {new Date(customer.updated_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-border bg-card/60 backdrop-blur-sm flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </Button>

          <Button variant="default" size="sm" onClick={onClose} className="px-5 text-xs font-medium cursor-pointer">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
