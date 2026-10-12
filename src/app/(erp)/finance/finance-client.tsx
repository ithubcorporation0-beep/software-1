"use client";

import * as React from "react";
import {
  DollarSign,
  Receipt,
  BookOpen,
  PieChart,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  Printer,
  Eye,
  RotateCcw,
  Send,
  Building,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  FileCheck,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type {
  Expense,
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseApprovalStatus,
  Account,
  JournalEntry,
  ProfitLossReport,
  BalanceSheetReport,
  CashFlowReport,
  ARAgingReport,
  APAgingReport,
} from "@/types/database.types";
import {
  createExpenseAction,
  updateExpenseAction,
  submitExpenseAction,
  approveExpenseAction,
  rejectExpenseAction,
  createJournalEntryAction,
  reverseJournalEntryAction,
  getFinancialReportAction,
  exportFinancialReportCSVAction,
} from "./actions";

interface FinanceClientProps {
  companyId: string;
  currency: string;
  currentUserId: string;
  isSuperAdmin: boolean;
  initialExpenses: Expense[];
  initialAccounts: Account[];
  initialJournalEntries: JournalEntry[];
  initialPL: ProfitLossReport;
  initialBalanceSheet: BalanceSheetReport;
  initialCashFlow: CashFlowReport;
  initialAR: ARAgingReport;
  initialAP: APAgingReport;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Rent",
  "Utilities",
  "Salaries",
  "Marketing",
  "Transportation",
  "Office Supplies",
  "Software",
  "Equipment",
  "Other",
];

const PAYMENT_METHODS: ExpensePaymentMethod[] = [
  "Cash",
  "Bank Transfer",
  "Credit Card",
  "Check",
  "Other",
];

export function FinanceClient({
  companyId,
  currency,
  currentUserId,
  isSuperAdmin,
  initialExpenses,
  initialAccounts,
  initialJournalEntries,
  initialPL,
  initialBalanceSheet,
  initialCashFlow,
  initialAR,
  initialAP,
}: FinanceClientProps) {
  // Main Navigation Tabs
  const [activeTab, setActiveTab] = React.useState<"expenses" | "ledger" | "reports">("expenses");
  const [reportSubTab, setReportSubTab] = React.useState<
    "pl" | "balance_sheet" | "cash_flow" | "ar_aging" | "ap_aging" | "breakdown"
  >("pl");

  // Data States
  const [expenses, setExpenses] = React.useState<Expense[]>(initialExpenses);
  const [accounts, setAccounts] = React.useState<Account[]>(initialAccounts);
  const [journalEntries, setJournalEntries] = React.useState<JournalEntry[]>(initialJournalEntries);
  const [plReport, setPLReport] = React.useState<ProfitLossReport>(initialPL);
  const [bsReport, setBSReport] = React.useState<BalanceSheetReport>(initialBalanceSheet);
  const [cfReport, setCFReport] = React.useState<CashFlowReport>(initialCashFlow);
  const [arReport, setARReport] = React.useState<ARAgingReport>(initialAR);
  const [apReport, setAPReport] = React.useState<APAgingReport>(initialAP);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [periodPreset, setPeriodPreset] = React.useState<"month" | "quarter" | "year" | "all">("month");

  // Notifications & Async
  const [isPending, startTransition] = React.useTransition();
  const [notification, setNotification] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modals
  const [showCreateExpenseModal, setShowCreateExpenseModal] = React.useState(false);
  const [showRejectExpenseModal, setShowRejectExpenseModal] = React.useState(false);
  const [selectedExpenseForReject, setSelectedExpenseForReject] = React.useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

  const [showCreateJEModal, setShowCreateJEModal] = React.useState(false);
  const [showReverseJEModal, setShowReverseJEModal] = React.useState(false);
  const [selectedJEForReverse, setSelectedJEForReverse] = React.useState<JournalEntry | null>(null);
  const [reverseReason, setReverseReason] = React.useState("");

  const [viewingJE, setViewingJE] = React.useState<JournalEntry | null>(null);
  const [viewingReceiptUrl, setViewingReceiptUrl] = React.useState<string | null>(null);

  // Create Expense Form State
  const [expenseForm, setExpenseForm] = React.useState({
    category: "Office Supplies" as ExpenseCategory,
    amount: "",
    date: new Date().toISOString().split("T")[0],
    vendor: "",
    paymentMethod: "Bank Transfer" as ExpensePaymentMethod,
    description: "",
    receiptUrl: "",
    receiptName: "",
    submitDirectly: false,
  });

  // Create Journal Entry Form State
  const [jeForm, setJEForm] = React.useState({
    entryDate: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
    lines: [
      { accountId: accounts[0]?.id || "", description: "", debit: "", credit: "" },
      { accountId: accounts[1]?.id || "", description: "", debit: "", credit: "" },
    ],
  });

  // Calculate live debits & credits in JE form
  const totalFormDebits = jeForm.lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalFormCredits = jeForm.lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isJEBalanced = Math.abs(totalFormDebits - totalFormCredits) < 0.001 && totalFormDebits > 0;

  // Filtered Expenses
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.expense_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "ALL" || e.category === categoryFilter;
    const matchesStatus = statusFilter === "ALL" || e.approval_status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Auto-dismiss notifications
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handlers
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      setNotification({ text: "Please enter a valid expense amount.", type: "error" });
      return;
    }
    if (!expenseForm.vendor.trim()) {
      setNotification({ text: "Vendor name is required.", type: "error" });
      return;
    }
    if (!expenseForm.description.trim()) {
      setNotification({ text: "Description is required.", type: "error" });
      return;
    }

    startTransition(async () => {
      const res = await createExpenseAction(companyId, {
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        currency,
        date: expenseForm.date,
        vendor: expenseForm.vendor,
        paymentMethod: expenseForm.paymentMethod,
        description: expenseForm.description,
        receiptUrl: expenseForm.receiptUrl || null,
        receiptName: expenseForm.receiptName || null,
        approvalStatus: expenseForm.submitDirectly ? "Submitted" : "Draft",
      });

      if (res.success && res.data) {
        setExpenses([res.data, ...expenses]);
        setShowCreateExpenseModal(false);
        setExpenseForm({
          category: "Office Supplies",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          vendor: "",
          paymentMethod: "Bank Transfer",
          description: "",
          receiptUrl: "",
          receiptName: "",
          submitDirectly: false,
        });
        setNotification({ text: res.message || "Expense recorded.", type: "success" });
      } else {
        setNotification({ text: res.message || "Failed to record expense.", type: "error" });
      }
    });
  };

  const handleSubmitExpense = (expense: Expense) => {
    startTransition(async () => {
      const res = await submitExpenseAction(companyId, expense.id);
      if (res.success && res.data) {
        setExpenses(expenses.map((e) => (e.id === expense.id ? res.data : e)));
        setNotification({ text: res.message || "Expense submitted.", type: "success" });
      } else {
        setNotification({ text: res.message || "Failed to submit expense.", type: "error" });
      }
    });
  };

  const handleApproveExpense = (expense: Expense) => {
    // Check client-side separation of duties for immediate feedback
    if (expense.employee_id === currentUserId && !isSuperAdmin) {
      setNotification({
        text: "Separation of duties: You cannot approve your own expense submission. An authorized peer or administrator must approve it.",
        type: "error",
      });
      return;
    }

    startTransition(async () => {
      const res = await approveExpenseAction(companyId, expense.id);
      if (res.success && res.data) {
        setExpenses(expenses.map((e) => (e.id === expense.id ? res.data.expense : e)));
        setJournalEntries([res.data.journalEntry, ...journalEntries]);
        setNotification({ text: res.message || "Expense approved and posted to General Ledger.", type: "success" });
      } else {
        setNotification({ text: res.message || "Failed to approve expense.", type: "error" });
      }
    });
  };

  const handleRejectExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpenseForReject) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      setNotification({ text: "Please provide a valid rejection reason (min 3 characters).", type: "error" });
      return;
    }

    startTransition(async () => {
      const res = await rejectExpenseAction(companyId, selectedExpenseForReject.id, rejectionReason.trim());
      if (res.success && res.data) {
        setExpenses(expenses.map((e) => (e.id === selectedExpenseForReject.id ? res.data : e)));
        setShowRejectExpenseModal(false);
        setSelectedExpenseForReject(null);
        setRejectionReason("");
        setNotification({ text: res.message || "Expense rejected.", type: "success" });
      } else {
        setNotification({ text: res.message || "Failed to reject expense.", type: "error" });
      }
    });
  };

  const handleCreateJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJEBalanced) {
      setNotification({
        text: `Unbalanced journal entry! Debits ($${totalFormDebits.toFixed(2)}) must equal credits ($${totalFormCredits.toFixed(2)}).`,
        type: "error",
      });
      return;
    }

    startTransition(async () => {
      const lines = jeForm.lines
        .filter((l) => (parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0)
        .map((l) => ({
          accountId: l.accountId,
          description: l.description || jeForm.description,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        }));

      const res = await createJournalEntryAction(companyId, {
        entryDate: jeForm.entryDate,
        description: jeForm.description,
        reference: jeForm.reference || null,
        lines,
      });

      if (res.success && res.data) {
        setJournalEntries([res.data, ...journalEntries]);
        setShowCreateJEModal(false);
        setJEForm({
          entryDate: new Date().toISOString().split("T")[0],
          description: "",
          reference: "",
          lines: [
            { accountId: accounts[0]?.id || "", description: "", debit: "", credit: "" },
            { accountId: accounts[1]?.id || "", description: "", debit: "", credit: "" },
          ],
        });
        setNotification({ text: res.message || "Journal entry posted.", type: "success" });
      } else {
        setNotification({ text: res.message || "Failed to post journal entry.", type: "error" });
      }
    });
  };

  const handleReverseJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJEForReverse) return;
    if (!reverseReason.trim()) {
      setNotification({ text: "Reversal reason is required for auditable records.", type: "error" });
      return;
    }

    startTransition(async () => {
      const res = await reverseJournalEntryAction(companyId, selectedJEForReverse.id, reverseReason.trim());
      if (res.success && res.data) {
        setJournalEntries(
          journalEntries
            .map((je) => (je.id === selectedJEForReverse.id ? res.data.original : je))
            .concat(res.data.reversal)
        );
        setShowReverseJEModal(false);
        setSelectedJEForReverse(null);
        setReverseReason("");
        setNotification({ text: res.message || "Journal entry reversed.", type: "success" });
      } else {
        setNotification({ text: res.message || "Failed to reverse journal entry.", type: "error" });
      }
    });
  };

  const handleExportCSV = async (type: "profit_loss" | "balance_sheet" | "cash_flow" | "ar_aging" | "ap_aging" | "expenses") => {
    startTransition(async () => {
      const res = await exportFinancialReportCSVAction(companyId, type, {});
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${type}_report_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setNotification({ text: "Report CSV exported successfully.", type: "success" });
      } else {
        setNotification({ text: res.message || "Failed to export CSV.", type: "error" });
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm shadow-sm transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Quick Financial Overview Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Finance & General Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Double-entry accounting, verifiable general ledger, expense approvals, and real-time financial statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportCSV(activeTab === "expenses" ? "expenses" : (reportSubTab as any))}
            disabled={isPending}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowCreateJEModal(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Journal Entry
          </Button>

          <Button
            size="sm"
            onClick={() => setShowCreateExpenseModal(true)}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Receipt className="h-4 w-4" />
            Record Expense
          </Button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Net Operating Income (P&L)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>{currency} {plReport.netOperatingIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              {plReport.netOperatingIncome >= 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-rose-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              Margin: {plReport.netProfitMarginPct.toFixed(1)}% | Revenue: {currency} {plReport.revenue.total.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Operating Expenses (MTD)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>{currency} {plReport.expenses.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <Receipt className="h-5 w-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              {expenses.filter((e) => e.approval_status === "Approved").length} approved expenses posted
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Accounts Receivable (A/R)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>{currency} {arReport.totalAR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              {arReport.days90Plus > 0 ? (
                <span className="text-rose-500 font-medium">{currency} {arReport.days90Plus.toFixed(2)} overdue &gt;90d</span>
              ) : (
                "All customer invoices healthy"
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Accounts Payable (A/P)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>{currency} {apReport.totalAP.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <Building className="h-5 w-5 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              {apReport.vendors.length} vendors with outstanding obligations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-medium print:hidden">
        <button
          onClick={() => setActiveTab("expenses")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "expenses"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Receipt className="h-4 w-4" />
          Expenses ({expenses.length})
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "ledger"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          General Ledger ({journalEntries.length})
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "reports"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <PieChart className="h-4 w-4" />
          Financial Reports
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: EXPENSES & APPROVAL WORKFLOWS                                 */}
      {/* ==================================================================== */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          {/* Controls: Search, Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search vendor, description, or EXP #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted (Pending Review)</option>
                <option value="Approved">Approved (Posted)</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Expense #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      No expenses match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {exp.expense_number}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {exp.date}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {exp.vendor}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {exp.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {exp.description}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                        {exp.currency} {exp.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {exp.payment_method}
                      </td>
                      <td className="px-4 py-3">
                        {exp.receipt_url ? (
                          <button
                            onClick={() => setViewingReceiptUrl(exp.receipt_url || "")}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            Receipt
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {exp.approval_status === "Approved" && (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none">
                            Approved
                          </Badge>
                        )}
                        {exp.approval_status === "Submitted" && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-none">
                            Pending Review
                          </Badge>
                        )}
                        {exp.approval_status === "Draft" && (
                          <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
                            Draft
                          </Badge>
                        )}
                        {exp.approval_status === "Rejected" && (
                          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-none">
                            Rejected
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {exp.approval_status === "Draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSubmitExpense(exp)}
                              disabled={isPending}
                              className="h-7 text-xs px-2 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Send className="h-3 w-3" />
                              Submit
                            </Button>
                          )}

                          {exp.approval_status === "Submitted" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveExpense(exp)}
                                disabled={isPending}
                                className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Approve
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedExpenseForReject(exp);
                                  setShowRejectExpenseModal(true);
                                }}
                                disabled={isPending}
                                className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {exp.approval_status === "Rejected" && exp.rejection_reason && (
                            <span
                              title={`Rejection reason: ${exp.rejection_reason}`}
                              className="text-xs text-rose-500 italic cursor-help"
                            >
                              Reason: {exp.rejection_reason}
                            </span>
                          )}

                          {exp.journal_entry_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const je = journalEntries.find((j) => j.id === exp.journal_entry_id);
                                if (je) setViewingJE(je);
                              }}
                              className="h-7 text-xs px-2 text-slate-500 hover:text-slate-900"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Ledger
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
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: GENERAL LEDGER & BALANCED DOUBLE-ENTRY ENTRIES                */}
      {/* ==================================================================== */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Double-Entry Journal & General Ledger
              </h2>
              <p className="text-xs text-slate-500">
                All ledger postings enforce strict double-entry balance (Debits = Credits). Reversals are tracked as immutable audit history.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateJEModal(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Manual Journal Entry
            </Button>
          </div>

          {/* Journal Entries List */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Entry #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {journalEntries.map((je) => (
                  <tr key={je.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {je.entry_number}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {je.entry_date}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {je.description}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs uppercase">
                        {je.source_type || "manual"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-white">
                      ${je.total_debit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-white">
                      ${je.total_credit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {je.status === "Posted" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none">
                          Posted
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-none">
                          Reversed
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewingJE(je)}
                          className="h-7 text-xs px-2"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Inspect Lines
                        </Button>

                        {je.status === "Posted" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedJEForReverse(je);
                              setShowReverseJEModal(true);
                            }}
                            className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Reverse
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart of Accounts Reference */}
          <div className="space-y-3 pt-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Chart of Accounts (COA)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                        {acc.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {acc.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      {acc.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {acc.account_type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: FINANCIAL REPORTS & STATEMENTS                                */}
      {/* ==================================================================== */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* Sub Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={reportSubTab === "pl" ? "default" : "outline"}
                onClick={() => setReportSubTab("pl")}
                className="text-xs"
              >
                Profit & Loss
              </Button>
              <Button
                size="sm"
                variant={reportSubTab === "balance_sheet" ? "default" : "outline"}
                onClick={() => setReportSubTab("balance_sheet")}
                className="text-xs"
              >
                Balance Sheet
              </Button>
              <Button
                size="sm"
                variant={reportSubTab === "cash_flow" ? "default" : "outline"}
                onClick={() => setReportSubTab("cash_flow")}
                className="text-xs"
              >
                Cash Flow
              </Button>
              <Button
                size="sm"
                variant={reportSubTab === "ar_aging" ? "default" : "outline"}
                onClick={() => setReportSubTab("ar_aging")}
                className="text-xs"
              >
                A/R Aging
              </Button>
              <Button
                size="sm"
                variant={reportSubTab === "ap_aging" ? "default" : "outline"}
                onClick={() => setReportSubTab("ap_aging")}
                className="text-xs"
              >
                A/P Aging
              </Button>
              <Button
                size="sm"
                variant={reportSubTab === "breakdown" ? "default" : "outline"}
                onClick={() => setReportSubTab("breakdown")}
                className="text-xs"
              >
                Expense Breakdown
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportCSV(reportSubTab === "breakdown" ? "expenses" : (reportSubTab as any))}
              className="text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export {reportSubTab.toUpperCase()} CSV
            </Button>
          </div>

          {/* Qualified Accountant Disclaimer Alert */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">
                Certified Accountant Review Required Prior to Statutory Reporting
              </p>
              <p className="mt-1 leading-relaxed">
                These financial reports are compiled systematically from the double-entry general ledger and recorded operating transactions. Statutory tax returns, GAAP/IFRS disclosures, accrual adjustments, and depreciation schedules must be verified and signed off by the client’s designated CPA or certified accountant before official filing.
              </p>
            </div>
          </div>

          {/* Sub-Tab 1: Profit & Loss */}
          {reportSubTab === "pl" && (
            <Card className="bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl">Statement of Profit & Loss (Income Statement)</CardTitle>
                <CardDescription>
                  For the period: {plReport.period.from} to {plReport.period.to} | Accrual Basis
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Revenue Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Operating Revenue
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {plReport.revenue.items.length === 0 ? (
                      <div className="py-2 text-slate-400 italic">No revenue recorded in this period.</div>
                    ) : (
                      plReport.revenue.items.map((r) => (
                        <div key={r.code} className="py-2 flex items-center justify-between">
                          <span className="text-slate-800 dark:text-slate-200">
                            [{r.code}] {r.name}
                          </span>
                          <span className="font-mono font-medium">${r.amount.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                    <div className="py-3 flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>Total Revenue</span>
                      <span className="font-mono text-base">${plReport.revenue.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Expenses Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Operating Expenses
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {plReport.expenses.items.map((e) => (
                      <div key={e.category} className="py-2 flex items-center justify-between">
                        <span className="text-slate-800 dark:text-slate-200">
                          {e.category} ({e.percentage.toFixed(1)}%)
                        </span>
                        <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                          (${e.amount.toFixed(2)})
                        </span>
                      </div>
                    ))}
                    <div className="py-3 flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>Total Operating Expenses</span>
                      <span className="font-mono text-base text-rose-600 dark:text-rose-400">
                        (${plReport.expenses.total.toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Operating Income */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between font-bold text-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-900 dark:text-white">Net Operating Income</span>
                  <span
                    className={`font-mono text-xl ${
                      plReport.netOperatingIncome >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    ${plReport.netOperatingIncome.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub-Tab 2: Balance Sheet */}
          {reportSubTab === "balance_sheet" && (
            <Card className="bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Balance Sheet</CardTitle>
                    <CardDescription>As of: {bsReport.asOfDate}</CardDescription>
                  </div>
                  {bsReport.isBalanced ? (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none">
                      Balanced: Assets = Liabilities + Equity
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-none">
                      Variance: ${bsReport.variance.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6 text-sm">
                {/* Assets */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Assets
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bsReport.assets.current.map((a) => (
                      <div key={a.code} className="py-2 flex items-center justify-between">
                        <span>[{a.code}] {a.name}</span>
                        <span className="font-mono">${a.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="py-2.5 flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>Total Assets</span>
                      <span className="font-mono text-base">${bsReport.assets.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Liabilities */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Liabilities
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bsReport.liabilities.current.map((l) => (
                      <div key={l.code} className="py-2 flex items-center justify-between">
                        <span>[{l.code}] {l.name}</span>
                        <span className="font-mono">${l.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="py-2.5 flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>Total Liabilities</span>
                      <span className="font-mono text-base">${bsReport.liabilities.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Equity */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Equity
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bsReport.equity.items.map((eq) => (
                      <div key={eq.code} className="py-2 flex items-center justify-between">
                        <span>[{eq.code}] {eq.name}</span>
                        <span className="font-mono">${eq.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="py-2 flex items-center justify-between text-blue-600 dark:text-blue-400">
                      <span>Current Period Net Earnings</span>
                      <span className="font-mono">${bsReport.equity.currentPeriodEarnings.toFixed(2)}</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>Total Equity</span>
                      <span className="font-mono text-base">${bsReport.equity.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Accounting Equation Verification Footer */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between font-bold text-base border border-slate-200 dark:border-slate-700">
                  <span>Total Liabilities & Equity</span>
                  <span className="font-mono text-lg">${bsReport.totalLiabilitiesAndEquity.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub-Tab 3: Cash Flow Statement */}
          {reportSubTab === "cash_flow" && (
            <Card className="bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl">Direct Operating Cash Flow Statement</CardTitle>
                <CardDescription>Period: {cfReport.period.from} to {cfReport.period.to}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6 text-sm">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-600">
                    Operating Cash Inflows
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cfReport.operatingInflows.map((inf, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <span>{inf.name}</span>
                        <span className="font-mono text-emerald-600">+${inf.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="py-2.5 flex items-center justify-between font-bold">
                      <span>Total Inflows</span>
                      <span className="font-mono text-emerald-600">${cfReport.totalInflows.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-rose-600">
                    Operating Cash Outflows
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cfReport.operatingOutflows.map((out, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <span>{out.name}</span>
                        <span className="font-mono text-rose-600">-${out.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="py-2.5 flex items-center justify-between font-bold">
                      <span>Total Outflows</span>
                      <span className="font-mono text-rose-600">${cfReport.totalOutflows.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between font-bold text-base border border-slate-200 dark:border-slate-700">
                  <span>Net Operating Cash Flow</span>
                  <span
                    className={`font-mono text-lg ${
                      cfReport.netOperatingCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    ${cfReport.netOperatingCashFlow.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub-Tab 4: Accounts Receivable Aging */}
          {reportSubTab === "ar_aging" && (
            <Card className="bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl">Accounts Receivable (A/R) Aging Schedule</CardTitle>
                <CardDescription>As of: {arReport.asOfDate} | Aging buckets by invoice due date</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800 text-center">
                    <div className="text-xs text-slate-500">Current (0-30d)</div>
                    <div className="text-lg font-bold font-mono">${arReport.current.toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800 text-center">
                    <div className="text-xs text-slate-500">1-30 Days Past</div>
                    <div className="text-lg font-bold font-mono">${arReport.days1_30.toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800 text-center">
                    <div className="text-xs text-slate-500">31-60 Days Past</div>
                    <div className="text-lg font-bold font-mono">${arReport.days31_60.toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800 text-center">
                    <div className="text-xs text-slate-500">61-90 Days Past</div>
                    <div className="text-lg font-bold font-mono">${arReport.days61_90.toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 text-center border-rose-200">
                    <div className="text-xs font-semibold">90+ Days Past Due</div>
                    <div className="text-lg font-bold font-mono">${arReport.days90Plus.toFixed(2)}</div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-2.5">Customer</th>
                        <th className="px-4 py-2.5 text-right">Current</th>
                        <th className="px-4 py-2.5 text-right">1-30d</th>
                        <th className="px-4 py-2.5 text-right">31-60d</th>
                        <th className="px-4 py-2.5 text-right">61-90d</th>
                        <th className="px-4 py-2.5 text-right">90+d</th>
                        <th className="px-4 py-2.5 text-right font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {arReport.customers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                            No outstanding accounts receivable found.
                          </td>
                        </tr>
                      ) : (
                        arReport.customers.map((c) => (
                          <tr key={c.customerId}>
                            <td className="px-4 py-2 font-medium">{c.customerName}</td>
                            <td className="px-4 py-2 text-right font-mono">${c.current.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-mono">${c.days1_30.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-mono">${c.days31_60.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-mono">${c.days61_90.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-mono text-rose-600">${c.days90Plus.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-mono font-bold">${c.total.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub-Tab 5: Accounts Payable */}
          {reportSubTab === "ap_aging" && (
            <Card className="bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl">Accounts Payable (A/P) Vendor Obligations</CardTitle>
                <CardDescription>As of: {apReport.asOfDate}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-2.5">Vendor</th>
                        <th className="px-4 py-2.5 text-center">Unsettled Expense Count</th>
                        <th className="px-4 py-2.5 text-right font-bold">Total Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {apReport.vendors.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                            No unsettled accounts payable detected.
                          </td>
                        </tr>
                      ) : (
                        apReport.vendors.map((v) => (
                          <tr key={v.vendor}>
                            <td className="px-4 py-2.5 font-medium">{v.vendor}</td>
                            <td className="px-4 py-2.5 text-center">{v.expenseCount}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold">${v.total.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub-Tab 6: Expense Breakdown */}
          {reportSubTab === "breakdown" && (
            <Card className="bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl">Operating Expense Distribution</CardTitle>
                <CardDescription>Categorized operating expense analysis</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  {plReport.expenses.items.map((it) => (
                    <div key={it.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span>{it.category}</span>
                        <span>${it.amount.toFixed(2)} ({it.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(2, it.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: RECORD EXPENSE                                              */}
      {/* ==================================================================== */}
      {showCreateExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                Record Operating Expense
              </h3>
              <button
                onClick={() => setShowCreateExpenseModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category *
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })
                    }
                    className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Amount ({currency}) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Vendor *
                  </label>
                  <Input
                    placeholder="e.g. AWS, Office Depot, Landlord"
                    value={expenseForm.vendor}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Method *
                  </label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as ExpensePaymentMethod })
                    }
                    className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Receipt Attachment (URL / Ref)
                  </label>
                  <Input
                    placeholder="https://... or upload key"
                    value={expenseForm.receiptUrl}
                    onChange={(e) => setExpenseForm({ ...expenseForm, receiptUrl: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description / Purpose *
                </label>
                <textarea
                  rows={2}
                  placeholder="Business justification and itemized summary..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  required
                  className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="submitDirectly"
                  checked={expenseForm.submitDirectly}
                  onChange={(e) => setExpenseForm({ ...expenseForm, submitDirectly: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="submitDirectly" className="text-xs text-slate-600 dark:text-slate-300">
                  Submit immediately for review (otherwise save as Draft)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateExpenseModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isPending ? "Recording..." : "Save Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: REJECT EXPENSE                                              */}
      {/* ==================================================================== */}
      {showRejectExpenseModal && selectedExpenseForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" />
              Reject Expense {selectedExpenseForReject.expense_number}
            </h3>

            <p className="text-xs text-slate-500">
              Provide an auditable reason for rejecting this expense. The submitter will be notified.
            </p>

            <form onSubmit={handleRejectExpense} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Missing receipt, exceeds project budget, not an approved vendor..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRejectExpenseModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: CREATE BALANCED JOURNAL ENTRY                               */}
      {/* ==================================================================== */}
      {showCreateJEModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Post Balanced Journal Entry
              </h3>
              <button
                onClick={() => setShowCreateJEModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJournalEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={jeForm.entryDate}
                    onChange={(e) => setJEForm({ ...jeForm, entryDate: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Reference
                  </label>
                  <Input
                    placeholder="e.g. Bank Ref, Adjust-01"
                    value={jeForm.reference}
                    onChange={(e) => setJEForm({ ...jeForm, reference: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description *
                </label>
                <Input
                  placeholder="Audit reason / journal description"
                  value={jeForm.description}
                  onChange={(e) => setJEForm({ ...jeForm, description: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              {/* Dynamic Lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Journal Lines (Min 2)
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setJEForm({
                        ...jeForm,
                        lines: [
                          ...jeForm.lines,
                          { accountId: accounts[0]?.id || "", description: "", debit: "", credit: "" },
                        ],
                      })
                    }
                    className="h-7 text-xs"
                  >
                    + Add Line
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                  {jeForm.lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-5">
                        <select
                          value={line.accountId}
                          onChange={(e) => {
                            const newLines = [...jeForm.lines];
                            newLines[idx].accountId = e.target.value;
                            setJEForm({ ...jeForm, lines: newLines });
                          }}
                          className="w-full text-xs rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              [{a.code}] {a.name} ({a.account_type})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <Input
                          placeholder="Line note"
                          value={line.description}
                          onChange={(e) => {
                            const newLines = [...jeForm.lines];
                            newLines[idx].description = e.target.value;
                            setJEForm({ ...jeForm, lines: newLines });
                          }}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Debit $"
                          value={line.debit}
                          onChange={(e) => {
                            const newLines = [...jeForm.lines];
                            newLines[idx].debit = e.target.value;
                            if (e.target.value) newLines[idx].credit = "";
                            setJEForm({ ...jeForm, lines: newLines });
                          }}
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Credit $"
                          value={line.credit}
                          onChange={(e) => {
                            const newLines = [...jeForm.lines];
                            newLines[idx].credit = e.target.value;
                            if (e.target.value) newLines[idx].debit = "";
                            setJEForm({ ...jeForm, lines: newLines });
                          }}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Verification Bar */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  isJEBalanced
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                <span>
                  Total Debits: ${totalFormDebits.toFixed(2)} | Total Credits: ${totalFormCredits.toFixed(2)}
                </span>
                <span>
                  {isJEBalanced ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 className="h-4 w-4" /> Balanced Entry
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-600 font-bold">
                      <AlertTriangle className="h-4 w-4" /> Difference: $
                      {Math.abs(totalFormDebits - totalFormCredits).toFixed(2)}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateJEModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isJEBalanced || isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isPending ? "Posting..." : "Post to General Ledger"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: REVERSE JOURNAL ENTRY                                       */}
      {/* ==================================================================== */}
      {showReverseJEModal && selectedJEForReverse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-rose-600" />
              Reverse Journal Entry {selectedJEForReverse.entry_number}
            </h3>

            <p className="text-xs text-slate-500">
              Financial ledger postings cannot be deleted. This will create a traceable correcting entry that swaps all debits and credits, preserving audit history.
            </p>

            <form onSubmit={handleReverseJournalEntry} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reversal Reason *
                </label>
                <Input
                  placeholder="e.g. Entered in error, duplicate billing..."
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReverseJEModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Confirm Reversal Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: INSPECT JOURNAL ENTRY LINES                                 */}
      {/* ==================================================================== */}
      {viewingJE && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Journal Entry: {viewingJE.entry_number}
                </h3>
                <p className="text-xs text-slate-500">{viewingJE.description} ({viewingJE.entry_date})</p>
              </div>
              <button
                onClick={() => setViewingJE(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 uppercase font-semibold text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Account</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Debit</th>
                    <th className="px-3 py-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(viewingJE.lines || []).map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono font-medium">
                        [{l.account_code || "ACC"}] {l.account_name || ""}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{l.description}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {l.debit > 0 ? `$${l.debit.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {l.credit > 0 ? `$${l.credit.toFixed(2)}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setViewingJE(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 6: RECEIPT PREVIEW                                             */}
      {/* ==================================================================== */}
      {viewingReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-bold">Expense Receipt</h4>
              <button
                onClick={() => setViewingReceiptUrl(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center text-xs break-all">
              <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Receipt Reference:</p>
              <a
                href={viewingReceiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline font-mono"
              >
                {viewingReceiptUrl}
              </a>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setViewingReceiptUrl(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
