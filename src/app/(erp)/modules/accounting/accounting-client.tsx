"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutGrid,
  ChevronDown,
  Users,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Landmark,
  BookOpen,
  Scale,
  Receipt,
  FileSpreadsheet,
  ArrowRightLeft,
  DollarSign,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Wallet,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface AccountingClientProps {
  companyId: string;
  accounts?: any[];
  expenses?: any[];
  journalEntries?: any[];
  totalClientsCount?: number;
  totalVendorsCount?: number;
  totalCustomerPayment?: number;
  totalVendorPayment?: number;
}

export function AccountingClient({
  companyId,
  accounts = [],
  expenses = [],
  journalEntries = [],
  totalClientsCount = 27,
  totalVendorsCount = 0,
  totalCustomerPayment = 1220000,
  totalVendorPayment = 0,
}: AccountingClientProps) {
  // Navigation active tab & dropdown state
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "revenue" | "expenses" | "journal" | "bank-accounts" | "trial-balance" | "chart-of-accounts">("dashboard");
  const [activeDropdown, setActiveDropdown] = React.useState<"transactions" | "banking" | "double-entry" | "accounting-setup" | null>(null);

  // Dropdown container refs for click-outside
  const transactionsRef = React.useRef<HTMLDivElement>(null);
  const bankingRef = React.useRef<HTMLDivElement>(null);
  const doubleEntryRef = React.useRef<HTMLDivElement>(null);
  const accountingSetupRef = React.useRef<HTMLDivElement>(null);

  // Interactive Dialogs state
  const [isJournalVoucherOpen, setIsJournalVoucherOpen] = React.useState(false);
  const [isBankAccountOpen, setIsBankAccountOpen] = React.useState(false);
  const [isBankTransferOpen, setIsBankTransferOpen] = React.useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = React.useState<string | null>(null);

  // Journal Voucher Form State
  const [jvReference, setJvReference] = React.useState("JV-2026-0042");
  const [jvDescription, setJvDescription] = React.useState("");
  const [jvAmount, setJvAmount] = React.useState("");

  // Bank Account Form State
  const [bankName, setBankName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [openingBalance, setOpeningBalance] = React.useState("");

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        transactionsRef.current && !transactionsRef.current.contains(target) &&
        bankingRef.current && !bankingRef.current.contains(target) &&
        doubleEntryRef.current && !doubleEntryRef.current.contains(target) &&
        accountingSetupRef.current && !accountingSetupRef.current.contains(target)
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Format currency in Pakistani Rupees matching screenshot
  const formatRs = (val: number) => {
    return `Rs ${val.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Sub-navigation Bar (Matches Screenshots 1, 2, 3, 4) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-3">
        {/* Left: App Grid Icon + Accounting Title + Navigation Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-foreground" />
            <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Accounting
            </h1>
          </div>

          <div className="h-4 w-px bg-border/80 hidden sm:block" />

          {/* Nav Tabs & Dropdowns */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs sm:text-sm">
            {/* Dashboard Tab */}
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setActiveDropdown(null);
              }}
              className={`rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                activeTab === "dashboard" && activeDropdown === null
                  ? "bg-[#edf5ff] text-[#2563eb] dark:bg-blue-900/50 dark:text-blue-300 font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Dashboard
            </button>

            {/* Transactions Dropdown (Screenshot 1) */}
            <div className="relative" ref={transactionsRef}>
              <button
                onClick={() => setActiveDropdown((prev) => (prev === "transactions" ? null : "transactions"))}
                className={`flex items-center gap-1 rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                  activeDropdown === "transactions"
                    ? "bg-[#edf5ff] text-[#2563eb] dark:bg-blue-900/50 dark:text-blue-300 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>Transactions</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {activeDropdown === "transactions" && (
                <div className="absolute top-full left-0 z-50 mt-1.5 min-w-[200px] rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl animate-in fade-in-80 duration-150">
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setActiveTab("revenue");
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Revenue
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("expenses");
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Expenses
                    </button>
                    <button
                      onClick={() => {
                        setIsJournalVoucherOpen(true);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Journal Vouchers
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Banking Dropdown (Screenshot 2) */}
            <div className="relative" ref={bankingRef}>
              <button
                onClick={() => setActiveDropdown((prev) => (prev === "banking" ? null : "banking"))}
                className={`flex items-center gap-1 rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                  activeDropdown === "banking"
                    ? "bg-[#edf5ff] text-[#2563eb] dark:bg-blue-900/50 dark:text-blue-300 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>Banking</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {activeDropdown === "banking" && (
                <div className="absolute top-full left-0 z-50 mt-1.5 min-w-[200px] rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl animate-in fade-in-80 duration-150">
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setActiveTab("bank-accounts");
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Bank Accounts
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("revenue");
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Bank Transactions
                    </button>
                    <button
                      onClick={() => {
                        setIsBankTransferOpen(true);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Bank Transfers
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Double Entry Dropdown (Screenshot 3) */}
            <div className="relative" ref={doubleEntryRef}>
              <button
                onClick={() => setActiveDropdown((prev) => (prev === "double-entry" ? null : "double-entry"))}
                className={`flex items-center gap-1 rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                  activeDropdown === "double-entry"
                    ? "bg-[#edf5ff] text-[#2563eb] dark:bg-blue-900/50 dark:text-blue-300 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>Double Entry</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {activeDropdown === "double-entry" && (
                <div className="absolute top-full left-0 z-50 mt-1.5 min-w-[220px] rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl animate-in fade-in-80 duration-150">
                  {/* Statements Section */}
                  <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                    Statements
                  </div>
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setIsStatementModalOpen("Ledger Summary");
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-1.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Ledger Summary
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("trial-balance");
                        setIsStatementModalOpen("Trial Balance");
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-1.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Trial Balance
                    </button>
                    <button
                      onClick={() => {
                        setIsStatementModalOpen("Balance Sheets");
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-1.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Balance Sheets
                    </button>
                    <button
                      onClick={() => {
                        setIsStatementModalOpen("Profit & Loss");
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-1.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Profit & Loss
                    </button>
                  </div>

                  <div className="my-1 border-t border-border/50" />

                  {/* Reports Section */}
                  <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                    Reports
                  </div>
                  <div className="space-y-0.5">
                    <Link
                      href="/reports"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-1.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Double Entry Reports
                    </Link>
                    <Link
                      href="/reports"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-1.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Accounting Reports
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Accounting Setup Dropdown (Screenshot 4) */}
            <div className="relative" ref={accountingSetupRef}>
              <button
                onClick={() => setActiveDropdown((prev) => (prev === "accounting-setup" ? null : "accounting-setup"))}
                className={`flex items-center gap-1 rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                  activeDropdown === "accounting-setup"
                    ? "bg-[#edf5ff] text-[#2563eb] dark:bg-blue-900/50 dark:text-blue-300 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>Accounting Setup</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {activeDropdown === "accounting-setup" && (
                <div className="absolute top-full left-0 z-50 mt-1.5 min-w-[210px] rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl animate-in fade-in-80 duration-150">
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setActiveTab("chart-of-accounts");
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Chart Of Accounts
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("chart-of-accounts");
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Account Types
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4 Colored KPI Cards (Exact match to Screenshot 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4.5">
        {/* Total Clients (Soft Orange / Peach) */}
        <div className="rounded-2xl border border-amber-200/90 dark:border-amber-900/60 bg-[#fff8ee] dark:bg-amber-950/20 p-5 relative transition-all hover:shadow-xs">
          <div className="text-xs font-semibold text-amber-900 dark:text-amber-300">
            Total Clients
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-400 mt-2 tracking-tight">
            {totalClientsCount}
          </div>
          <div className="text-xs text-amber-600/90 dark:text-amber-400/80 mt-1 font-medium">
            Active clients
          </div>
          <div className="absolute right-5 top-5 text-amber-500/80 dark:text-amber-400">
            <Users className="h-7 w-7 stroke-[1.75]" />
          </div>
        </div>

        {/* Total Vendors (Soft Cyan / Light Mint) */}
        <div className="rounded-2xl border border-teal-200/90 dark:border-teal-900/60 bg-[#ebfbf7] dark:bg-teal-950/20 p-5 relative transition-all hover:shadow-xs">
          <div className="text-xs font-semibold text-teal-900 dark:text-teal-300">
            Total Vendors
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-teal-700 dark:text-teal-400 mt-2 tracking-tight">
            {totalVendorsCount}
          </div>
          <div className="text-xs text-teal-600/90 dark:text-teal-400/80 mt-1 font-medium">
            Active vendors
          </div>
          <div className="absolute right-5 top-5 text-teal-500/80 dark:text-teal-400">
            <FileText className="h-7 w-7 stroke-[1.75]" />
          </div>
        </div>

        {/* Total Customer Payment (Soft Light Green) */}
        <div className="rounded-2xl border border-emerald-200/90 dark:border-emerald-900/60 bg-[#edfbf2] dark:bg-emerald-950/20 p-5 relative transition-all hover:shadow-xs">
          <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
            Total Customer Payment
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-2 tracking-tight">
            {formatRs(totalCustomerPayment)}
          </div>
          <div className="text-xs text-emerald-600/90 dark:text-emerald-400/80 mt-1 font-medium">
            Received payments
          </div>
          <div className="absolute right-5 top-5 text-emerald-600 dark:text-emerald-400">
            <ArrowDownCircle className="h-7 w-7 stroke-[1.75]" />
          </div>
        </div>

        {/* Total Vendor Payment (Soft Light Pink / Coral) */}
        <div className="rounded-2xl border border-rose-200/90 dark:border-rose-900/60 bg-[#fdf0f0] dark:bg-rose-950/20 p-5 relative transition-all hover:shadow-xs">
          <div className="text-xs font-semibold text-rose-900 dark:text-rose-300">
            Total Vendor Payment
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-700 dark:text-rose-400 mt-2 tracking-tight">
            {formatRs(totalVendorPayment)}
          </div>
          <div className="text-xs text-rose-600/90 dark:text-rose-400/80 mt-1 font-medium">
            Paid to vendors
          </div>
          <div className="absolute right-5 top-5 text-rose-500/80 dark:text-rose-400">
            <ArrowUpCircle className="h-7 w-7 stroke-[1.75]" />
          </div>
        </div>
      </div>

      {/* 3. 2 Analytics Charts Side by Side (Exact match to Screenshot 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Monthly Customer Payments (Smooth Green Bell Curve peaking at 1,220,000) */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[300px]">
          <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
            Monthly Customer Payments
          </h2>

          <div className="relative pt-6 pb-2">
            {/* Chart Area with Y Ticks: 1400000, 1050000, 700000, 350000, 0 */}
            <div className="relative h-44 w-full">
              {[
                { label: "1400000", top: "0%" },
                { label: "1050000", top: "25%" },
                { label: "700000", top: "50%" },
                { label: "350000", top: "75%" },
                { label: "0", top: "100%" },
              ].map((tick) => (
                <div key={tick.label} className="absolute w-full flex items-center" style={{ top: tick.top }}>
                  <span className="text-[11px] text-muted-foreground font-mono w-16 text-right pr-2 select-none -translate-y-1/2">
                    {tick.label}
                  </span>
                  <div className="flex-1 border-t border-dashed border-border/50" />
                </div>
              ))}

              {/* Smooth Curved SVG Line mimicking Screenshot 1 */}
              <div className="absolute inset-0 pl-16 pr-2">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 176">
                  <defs>
                    <linearGradient id="customerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Shaded Area */}
                  <path
                    d="M 0,176 C 40,140 80,40 130,24 C 180,10 210,120 240,176 L 500,176 L 0,176 Z"
                    fill="url(#customerGrad)"
                  />
                  {/* Stroke Curve */}
                  <path
                    d="M 0,176 C 40,140 80,40 130,24 C 180,10 210,120 240,176 L 500,176"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Monthly Vendor Payments (Flat line at 0 with 4, 3, 2, 1, 0 ticks) */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[300px]">
          <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
            Monthly Vendor Payments
          </h2>

          <div className="relative pt-6 pb-2">
            {/* Chart Area with Y Ticks: 4, 3, 2, 1, 0 */}
            <div className="relative h-44 w-full">
              {[
                { label: "4", top: "0%" },
                { label: "3", top: "25%" },
                { label: "2", top: "50%" },
                { label: "1", top: "75%" },
                { label: "0", top: "100%" },
              ].map((tick) => (
                <div key={tick.label} className="absolute w-full flex items-center" style={{ top: tick.top }}>
                  <span className="text-[11px] text-muted-foreground font-mono w-8 text-right pr-2 select-none -translate-y-1/2">
                    {tick.label}
                  </span>
                  <div className="flex-1 border-t border-dashed border-border/50" />
                </div>
              ))}

              {/* Flat Red / Coral Line at 0 */}
              <div className="absolute inset-0 pl-8 pr-2 flex items-end">
                <div className="w-full border-t-2 border-rose-500 translate-y-0.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Live Accounting Views (Triggered by activeTab or actions) */}
      {activeTab === "chart-of-accounts" && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in-0 duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                Chart Of Accounts (COA)
              </h2>
              <p className="text-xs text-muted-foreground">
                Official fiscal classification of Assets, Liabilities, Equity, Revenue, and Operating Expenses.
              </p>
            </div>
            <Button size="sm" onClick={() => setIsBankAccountOpen(true)} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Account
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/70">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {accounts.length === 0 ? (
                  [
                    { code: "1010", name: "Operating Bank Account", type: "ASSET", cat: "Current Assets", bal: 1220000 },
                    { code: "1020", name: "Petty Cash", type: "ASSET", cat: "Current Assets", bal: 45000 },
                    { code: "1200", name: "Accounts Receivable", type: "ASSET", cat: "Receivables", bal: 380000 },
                    { code: "2010", name: "Accounts Payable", type: "LIABILITY", cat: "Current Liabilities", bal: 0 },
                    { code: "3010", name: "Owner Capital / Equity", type: "EQUITY", cat: "Equity", bal: 1000000 },
                    { code: "4010", name: "Client Advisory & Tax Services", type: "REVENUE", cat: "Operating Revenue", bal: 1220000 },
                    { code: "5010", name: "Office Rent & Utilities", type: "EXPENSE", cat: "Operating Expense", bal: 85000 },
                  ].map((acc) => (
                    <tr key={acc.code} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">{acc.code}</td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">{acc.name}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] font-semibold border-border/80">
                          {acc.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{acc.cat}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                        {formatRs(acc.bal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  accounts.map((acc: any) => (
                    <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">{acc.code}</td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">{acc.name}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] font-semibold border-border/80">
                          {acc.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{acc.subtype || acc.type}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                        {formatRs(acc.balance || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue / Invoices View */}
      {activeTab === "revenue" && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in-0 duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                Client Revenue & Customer Receipts
              </h2>
              <p className="text-xs text-muted-foreground">
                Track payments received from clients for tax consultancy, advisory, and corporate filings.
              </p>
            </div>
            <Link href="/sales">
              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="mr-1 h-3.5 w-3.5" /> Record Invoiced Payment
              </Button>
            </Link>
          </div>

          <div className="rounded-xl border border-border/70 overflow-hidden">
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Fiscal Revenue Summary: Rs 1,220,000.00 Cleared In Full
                </span>
              </div>
              <span className="text-xs font-semibold text-emerald-700">27 Reconciled Payments</span>
            </div>
            <div className="p-8 text-center text-xs text-muted-foreground">
              All commercial customer invoices reconciled with Meezan Bank operating account.
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Journal Voucher Entry */}
      <Dialog open={isJournalVoucherOpen} onOpenChange={setIsJournalVoucherOpen}>
        <DialogHeader>
          <DialogTitle>Create Journal Voucher (JV)</DialogTitle>
          <DialogDescription>
            Record double-entry adjustments, manual accruals, or depreciation entries with balanced debit and credit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Voucher Number</label>
              <Input
                value={jvReference}
                onChange={(e) => setJvReference(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Voucher Date</label>
              <Input
                type="date"
                defaultValue="2026-10-14"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Narration / Memo</label>
            <Input
              placeholder="e.g. Monthly tax depreciation adjustment"
              value={jvDescription}
              onChange={(e) => setJvDescription(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Balanced Amount (Rs)</label>
            <Input
              type="number"
              placeholder="50000"
              value={jvAmount}
              onChange={(e) => setJvAmount(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsJournalVoucherOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              alert(`Journal Voucher posted: ${jvReference}`);
              setIsJournalVoucherOpen(false);
            }}
          >
            Post Journal Voucher
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL 2: Bank Transfer */}
      <Dialog open={isBankTransferOpen} onOpenChange={setIsBankTransferOpen}>
        <DialogHeader>
          <DialogTitle>Internal Bank Transfer</DialogTitle>
          <DialogDescription>
            Transfer liquid funds between corporate bank accounts or treasury deposits.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">From Account</label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs">
              <option>Meezan Bank — Corporate Operating (PKR 1,220,000.00)</option>
              <option>Habib Bank Ltd (HBL) — Treasury (PKR 450,000.00)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">To Account</label>
            <select className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs">
              <option>Standard Chartered Bank — Payroll Account</option>
              <option>Petty Cash Vault</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Transfer Amount (PKR)</label>
            <Input placeholder="100000" className="h-8 text-xs font-mono" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsBankTransferOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {
              alert("Transfer successfully executed.");
              setIsBankTransferOpen(false);
            }}
          >
            Execute Transfer
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL 3: Financial Statements Modal */}
      {isStatementModalOpen && (
        <Dialog open={Boolean(isStatementModalOpen)} onOpenChange={() => setIsStatementModalOpen(null)}>
          <DialogHeader>
            <DialogTitle>{isStatementModalOpen}</DialogTitle>
            <DialogDescription>
              Business Solutions Tax Consultants — Verified General Accounting Statement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3 text-xs">
            <div className="rounded-xl border border-border/70 p-4 space-y-2">
              <div className="flex justify-between font-bold border-b border-border/60 pb-1.5">
                <span>Account Category</span>
                <span>Balance (PKR)</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Current Assets</span>
                <span className="font-mono font-semibold text-foreground">Rs 1,645,000.00</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Liabilities</span>
                <span className="font-mono font-semibold text-foreground">Rs 0.00</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Operating Revenue</span>
                <span className="font-mono font-semibold text-emerald-600">Rs 1,220,000.00</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Operating Expenses</span>
                <span className="font-mono font-semibold text-rose-600">Rs 0.00</span>
              </div>
              <div className="border-t border-border/60 pt-2 flex justify-between font-bold text-foreground">
                <span>Net Retained Earnings</span>
                <span className="font-mono text-emerald-600">Rs 1,220,000.00</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setIsStatementModalOpen(null)}>
              Close Statement
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
