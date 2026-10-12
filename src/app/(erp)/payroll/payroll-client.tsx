"use client";

import * as React from "react";
import {
  CreditCard,
  Plus,
  Search,
  Download,
  Printer,
  CheckCircle2,
  Lock,
  AlertTriangle,
  RotateCcw,
  Building,
  User,
  ShieldAlert,
  ChevronRight,
  Sliders,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  PayrollRun,
  PayrollItem,
  PayrollSettings,
  Profile,
} from "@/types/database.types";
import {
  createPayrollRunAction,
  updatePayrollItemAction,
  approvePayrollRunAction,
  finalizePayrollRunAction,
  reversePayrollRunAction,
  updatePayrollSettingsAction,
  confirmStatutoryRulesAction,
  exportPayrollCSVAction,
} from "./actions";

interface PayrollClientProps {
  companyId: string;
  currentUser: Profile;
  runs: PayrollRun[];
  items: PayrollItem[];
  settings: PayrollSettings;
  canManage: boolean;
  canApprove: boolean;
  canFinalize: boolean;
}

export function PayrollClient({
  companyId,
  runs,
  items,
  settings,
  canManage,
  canApprove,
  canFinalize,
}: PayrollClientProps) {
  const [activeTab, setActiveTab] = React.useState<"runs" | "slips" | "policy">("runs");
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Modals & Selection
  const [isNewRunModalOpen, setIsNewRunModalOpen] = React.useState(false);
  const [selectedRun, setSelectedRun] = React.useState<PayrollRun | null>(runs[0] || null);
  const [selectedItemForEdit, setSelectedItemForEdit] = React.useState<PayrollItem | null>(null);
  const [selectedItemForSlip, setSelectedItemForSlip] = React.useState<PayrollItem | null>(null);
  const [reversalRunId, setReversalRunId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Keep selectedRun updated with latest props
  React.useEffect(() => {
    if (selectedRun) {
      const updated = runs.find((r) => r.id === selectedRun.id);
      if (updated) setSelectedRun(updated);
    }
  }, [runs, selectedRun]);

  const activeRunItems = React.useMemo(() => {
    if (!selectedRun) return [];
    return items.filter((i) => i.payroll_run_id === selectedRun.id);
  }, [items, selectedRun]);

  const filteredItems = React.useMemo(() => {
    return items.filter(
      (i) =>
        i.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.department_name && i.department_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [items, searchQuery]);

  // Key KPI metrics
  const totalFinalizedNet = React.useMemo(() => {
    return runs
      .filter((r) => r.status === "Finalized")
      .reduce((sum, r) => sum + r.total_net, 0);
  }, [runs]);

  const activePendingCycles = React.useMemo(() => {
    return runs.filter((r) => r.status === "Draft" || r.status === "Approved").length;
  }, [runs]);

  const handleCreateRun = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createPayrollRunAction(companyId, formData);
      if (res.success) {
        setSuccessMessage("Payroll run created successfully as Draft.");
        setIsNewRunModalOpen(false);
      } else {
        setErrorMessage(res.error || "Failed to create payroll run");
      }
    });
  };

  const handleApproveRun = (runId: string) => {
    if (!confirm("Are you sure you want to approve this payroll cycle? This will lock it for final disbursement.")) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await approvePayrollRunAction(companyId, runId);
      if (res.success) {
        setSuccessMessage("Payroll run approved successfully.");
      } else {
        setErrorMessage(res.error || "Failed to approve payroll run");
      }
    });
  };

  const handleFinalizeRun = (runId: string) => {
    if (!confirm("Finalizing this run will make it IMMUTABLE and post journal entries to the General Ledger. Proceed?")) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await finalizePayrollRunAction(companyId, runId);
      if (res.success) {
        setSuccessMessage("Payroll run finalized and posted to General Ledger.");
      } else {
        setErrorMessage(res.error || "Failed to finalize payroll run");
      }
    });
  };

  const handleReverseRun = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reversalRunId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await reversePayrollRunAction(companyId, reversalRunId, formData);
      if (res.success) {
        setSuccessMessage("Payroll run reversed successfully with offsetting journal entries.");
        setReversalRunId(null);
      } else {
        setErrorMessage(res.error || "Failed to reverse payroll run");
      }
    });
  };

  const handleUpdateItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItemForEdit) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updatePayrollItemAction(companyId, selectedItemForEdit.id, formData);
      if (res.success) {
        setSuccessMessage("Payroll line updated.");
        setSelectedItemForEdit(null);
      } else {
        setErrorMessage(res.error || "Failed to update payroll item");
      }
    });
  };

  const handleExportCSV = async (runId: string) => {
    startTransition(async () => {
      const res = await exportPayrollCSVAction(companyId, runId);
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `payroll-${selectedRun?.run_number || runId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setErrorMessage(res.error || "Failed to export payroll CSV");
      }
    });
  };

  const handleConfirmStatutory = () => {
    if (!confirm("Confirm statutory deduction rules and overtime multipliers as authorized by your certified payroll specialist?")) return;
    startTransition(async () => {
      const res = await confirmStatutoryRulesAction(companyId);
      if (res.success) {
        setSuccessMessage("Statutory and tax policy confirmed for production.");
      } else {
        setErrorMessage(res.error || "Failed to confirm statutory rules");
      }
    });
  };

  const formatMoney = (amount: number, currency: string = settings.currency) => {
    return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-indigo-600" />
            Payroll & Compensation Controls
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Controlled monthly compensation cycles, itemized salary slips, statutory policies, and double-entry ledger settlement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button
              onClick={() => setIsNewRunModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Payroll Run
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Operation Error: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Success: </span>
            {successMessage}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Finalized Disbursed
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {formatMoney(totalFinalizedNet)}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            General Ledger posted
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Cycles in Flight
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
            {activePendingCycles}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Draft or awaiting approval
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Pay Stubs Generated
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {items.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Employee self-service available
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Statutory & Tax Policy
          </div>
          <div className="mt-2">
            {settings.statutory_rules_confirmed ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Specialist Confirmed
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                <ShieldAlert className="h-3 w-3 mr-1" />
                Pending Client Approval
              </Badge>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Formula: Net = Basic + Allw + Bon + OT - Ded - Tax - Adv
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("runs")}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "runs"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Payroll Cycles & Runs ({runs.length})
          </button>
          <button
            onClick={() => setActiveTab("slips")}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "slips"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Salary Slips & Ledger ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("policy")}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "policy"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Statutory & Tax Policy
          </button>
        </nav>
      </div>

      {/* Tab 1: Payroll Cycles & Runs */}
      {activeTab === "runs" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of Runs */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Payroll Cycles
            </h3>

            {runs.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 text-sm">
                No payroll cycles generated yet. Click "New Payroll Run" to start.
              </div>
            ) : (
              <div className="space-y-2">
                {runs.map((r) => {
                  const isSelected = selectedRun?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRun(r)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {r.run_number}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            r.status === "Finalized"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                              : r.status === "Approved"
                              ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                              : r.status === "Reversed"
                              ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                          }
                        >
                          {r.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Period: {r.period_start} → {r.period_end}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Disbursement: {r.pay_date} • {r.employee_count} Staff
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                        <span>Net Pay:</span>
                        <span>{formatMoney(r.total_net)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Run Detail Card */}
          <div className="lg:col-span-2 space-y-4">
            {selectedRun ? (
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {selectedRun.run_number}
                      </h2>
                      <Badge
                        variant="outline"
                        className={
                          selectedRun.status === "Finalized"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                            : selectedRun.status === "Approved"
                            ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                            : selectedRun.status === "Reversed"
                            ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                        }
                      >
                        {selectedRun.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Cycle Period: {selectedRun.period_start} to {selectedRun.period_end} • Pay Date: {selectedRun.pay_date}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportCSV(selectedRun.id)}
                      className="flex items-center gap-1.5"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>

                    {/* State Actions */}
                    {selectedRun.status === "Draft" && canApprove && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveRun(selectedRun.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                        disabled={isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve Run
                      </Button>
                    )}

                    {selectedRun.status === "Approved" && canFinalize && (
                      <Button
                        size="sm"
                        onClick={() => handleFinalizeRun(selectedRun.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                        disabled={isPending}
                      >
                        <Lock className="h-4 w-4" />
                        Finalize & Post to GL
                      </Button>
                    )}

                    {selectedRun.status === "Finalized" && canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReversalRunId(selectedRun.id)}
                        className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1.5"
                        disabled={isPending}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Traceable Reversal
                      </Button>
                    )}
                  </div>
                </div>

                {/* Summary Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Total Basic:</span>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{formatMoney(selectedRun.total_basic)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Allowances:</span>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{formatMoney(selectedRun.total_allowances)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Bonus:</span>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{formatMoney(selectedRun.total_bonus)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Overtime:</span>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{formatMoney(selectedRun.total_overtime)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Deductions:</span>
                    <p className="font-semibold text-rose-600 dark:text-rose-400 text-sm">-{formatMoney(selectedRun.total_deductions)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Tax (Manual):</span>
                    <p className="font-semibold text-rose-600 dark:text-rose-400 text-sm">-{formatMoney(selectedRun.total_tax)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Advances:</span>
                    <p className="font-semibold text-rose-600 dark:text-rose-400 text-sm">-{formatMoney(selectedRun.total_advance)}</p>
                  </div>
                  <div>
                    <span className="text-indigo-600 font-bold dark:text-indigo-400">Total Net Pay:</span>
                    <p className="font-bold text-indigo-700 dark:text-indigo-300 text-base">{formatMoney(selectedRun.total_net)}</p>
                  </div>
                </div>

                {selectedRun.status === "Reversed" && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                    <span className="font-bold">Reversal Audit Trail: </span>
                    {selectedRun.reversal_reason || "Reversed by authorized administrator."}
                  </div>
                )}

                {/* Items in this run */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Itemized Employee Compensation ({activeRunItems.length})
                    </h4>
                    {selectedRun.status === "Draft" && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        * In Draft: Click any staff row to adjust line additions or deductions.
                      </span>
                    )}
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Staff Code / Name</th>
                          <th className="p-3">Department</th>
                          <th className="p-3">Basic</th>
                          <th className="p-3">Allowances</th>
                          <th className="p-3">Bonus</th>
                          <th className="p-3">OT</th>
                          <th className="p-3">Deductions</th>
                          <th className="p-3">Tax</th>
                          <th className="p-3">Advance</th>
                          <th className="p-3">Net Pay</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {activeRunItems.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="p-4 text-center text-slate-500">
                              No employees enrolled in this cycle.
                            </td>
                          </tr>
                        ) : (
                          activeRunItems.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <td className="p-3 font-medium text-slate-900 dark:text-white">
                                <div>{item.employee_name}</div>
                                <div className="text-[10px] text-slate-400">{item.employee_code}</div>
                              </td>
                              <td className="p-3 text-slate-500">{item.department_name || "N/A"}</td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">{item.basic_salary.toFixed(2)}</td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">{item.allowances.toFixed(2)}</td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">{item.bonus.toFixed(2)}</td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">{item.overtime.toFixed(2)}</td>
                              <td className="p-3 text-rose-600">-{item.deductions.toFixed(2)}</td>
                              <td className="p-3 text-rose-600">-{item.tax.toFixed(2)}</td>
                              <td className="p-3 text-rose-600">-{item.advance.toFixed(2)}</td>
                              <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">
                                {formatMoney(item.net_salary)}
                              </td>
                              <td className="p-3 text-right space-x-1 whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedItemForSlip(item)}
                                  className="h-7 px-2 text-slate-600 hover:text-indigo-600"
                                  title="View Salary Slip"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </Button>
                                {selectedRun.status === "Draft" && canManage && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedItemForEdit(item)}
                                    className="h-7 px-2"
                                  >
                                    Edit
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 text-sm">
                Select a payroll cycle on the left to inspect itemized employee lines.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Salary Slips & Ledger */}
      {activeTab === "slips" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredItems.length} slips across all payroll cycles
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Staff Code / Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Basic Salary</th>
                  <th className="p-3">Allowances</th>
                  <th className="p-3">Bonus</th>
                  <th className="p-3">Deductions</th>
                  <th className="p-3">Net Pay</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Pay Stub</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      No matching salary slip records found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 font-medium text-slate-900 dark:text-white">
                        <div>{item.employee_name}</div>
                        <div className="text-[10px] text-slate-400">{item.employee_code}</div>
                      </td>
                      <td className="p-3 text-slate-500">{item.department_name || "N/A"}</td>
                      <td className="p-3 text-slate-500">{item.designation || "N/A"}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{item.basic_salary.toFixed(2)}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{item.allowances.toFixed(2)}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{item.bonus.toFixed(2)}</td>
                      <td className="p-3 text-rose-600">-{item.deductions.toFixed(2)}</td>
                      <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">
                        {formatMoney(item.net_salary)}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={
                            item.status === "Finalized"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : item.status === "Approved"
                              ? "bg-blue-50 text-blue-700 border-blue-300"
                              : "bg-slate-100 text-slate-700"
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedItemForSlip(item)}
                          className="h-7 px-2.5 text-xs flex items-center gap-1 ml-auto"
                        >
                          <Printer className="h-3 w-3" />
                          View Slip
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Statutory & Tax Policy */}
      {activeTab === "policy" && (
        <div className="max-w-4xl space-y-6">
          {/* Statutory Policy Disclaimer Banner */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900 text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Statutory Tax & Labor Law Policy Compliance Notice
            </div>
            <p className="text-xs leading-relaxed">
              This financial ERP system adheres to strict audit governance: it does not invent local income-tax rates, statutory withholdings, or labor overtime formulas. All statutory rules remain marked unconfirmed until the client’s qualified payroll specialist verifies them.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-indigo-600" />
              Tenant Compensation & Accounting Rules
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Operating Currency
                </label>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm font-semibold">
                  {settings.currency} (Default)
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Tax Calculation Mode
                </label>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm font-semibold">
                  {settings.tax_calculation_mode} (Configurable)
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Standard Working Days / Month
                </label>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm font-semibold">
                  {settings.standard_working_days_per_month} Days
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Overtime Multiplier Rate
                </label>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm font-semibold">
                  {settings.default_overtime_hourly_multiplier.toFixed(2)}x Normal Hourly Rate
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  General Ledger Posting
                </label>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Auto-post balanced double entry on Finalize (Account 5030 / 2100)
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Statutory Rules Approval Status
                </label>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm font-semibold">
                  {settings.statutory_rules_confirmed ? (
                    <span className="text-emerald-600 font-bold">Confirmed by Payroll Specialist</span>
                  ) : (
                    <span className="text-amber-600 font-bold">Unconfirmed / Pending Client Verification</span>
                  )}
                </div>
              </div>
            </div>

            {canManage && !settings.statutory_rules_confirmed && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <Button
                  onClick={handleConfirmStatutory}
                  className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
                  disabled={isPending}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Statutory Policy for Client
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: New Payroll Run */}
      {isNewRunModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Generate New Payroll Cycle
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compiles salary records for all active employees for the selected period. Duplicate runs for the same period are prevented.
            </p>

            <form onSubmit={handleCreateRun} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Period Start Date *
                </label>
                <input
                  name="periodStart"
                  type="date"
                  required
                  defaultValue={new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Period End Date *
                </label>
                <input
                  name="periodEnd"
                  type="date"
                  required
                  defaultValue={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0]}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Disbursement Date *
                </label>
                <input
                  name="payDate"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cycle Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Monthly regular payroll cycle..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewRunModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isPending}
                >
                  Generate Cycle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Line Item (Draft only) */}
      {selectedItemForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Adjust Compensation: {selectedItemForEdit.employee_name} ({selectedItemForEdit.employee_code})
            </h3>
            <p className="text-xs text-slate-500">
              Formula: Net = Basic + Allowances + Bonus + OT − Deductions − Tax − Advances
            </p>

            <form onSubmit={handleUpdateItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Basic Salary</label>
                  <input
                    name="basicSalary"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedItemForEdit.basic_salary}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Allowances</label>
                  <input
                    name="allowances"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedItemForEdit.allowances}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Bonus</label>
                  <input
                    name="bonus"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedItemForEdit.bonus}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Overtime Pay</label>
                  <input
                    name="overtime"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedItemForEdit.overtime}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-rose-600">Deductions</label>
                  <input
                    name="deductions"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedItemForEdit.deductions}
                    className="w-full p-2 rounded border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800 text-rose-600"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-rose-600">Income Tax (Manual)</label>
                  <input
                    name="tax"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedItemForEdit.tax}
                    className="w-full p-2 rounded border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800 text-rose-600"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-rose-600">Advance Recovery</label>
                  <input
                    name="advance"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedItemForEdit.advance}
                    className="w-full p-2 rounded border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800 text-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Adjustment Reason / Notes</label>
                <input
                  name="notes"
                  type="text"
                  defaultValue={selectedItemForEdit.notes || ""}
                  placeholder="Reason for line adjustment..."
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setSelectedItemForEdit(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 text-white" disabled={isPending}>
                  Save Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Traceable Reversal */}
      {reversalRunId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Traceable Payroll Reversal
            </h3>
            <p className="text-xs text-slate-500">
              Reversing a finalized cycle will mark the run as Reversed and post an offsetting reversal journal entry to General Ledger.
            </p>

            <form onSubmit={handleReverseRun} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory Reversal Justification *
                </label>
                <textarea
                  name="reversalReason"
                  required
                  minLength={5}
                  rows={3}
                  placeholder="State specific audit justification for reversing this cycle..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setReversalRunId(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white" disabled={isPending}>
                  Execute Reversal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Printable Salary Slip / Pay Stub */}
      {selectedItemForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
            {/* Pay Stub Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="h-6 w-6 text-indigo-600" />
                  CONFIDENTIAL SALARY SLIP
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Itemized Payroll Disbursement Voucher
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-xs font-semibold">
                  {selectedItemForSlip.status}
                </Badge>
                <div className="text-xs text-slate-400 mt-1">
                  Slip Ref: {selectedItemForSlip.id.substring(0, 14)}
                </div>
              </div>
            </div>

            {/* Employee & Cycle Details */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Staff Name</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedItemForSlip.employee_name}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Staff Code</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedItemForSlip.employee_code}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Department</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedItemForSlip.department_name || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Designation</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedItemForSlip.designation || "N/A"}</span>
              </div>
              {selectedItemForSlip.bank_name && (
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block text-[10px]">Bank Details</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedItemForSlip.bank_name} ({selectedItemForSlip.bank_account_number})
                  </span>
                </div>
              )}
            </div>

            {/* Earnings & Deductions Breakdown */}
            <div className="grid grid-cols-2 gap-6">
              {/* Earnings */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b pb-1">
                  Gross Earnings
                </h4>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-500">Basic Salary:</span>
                  <span className="font-semibold">{formatMoney(selectedItemForSlip.basic_salary)}</span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-500">Allowances:</span>
                  <span className="font-semibold">{formatMoney(selectedItemForSlip.allowances)}</span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-500">Bonus:</span>
                  <span className="font-semibold">{formatMoney(selectedItemForSlip.bonus)}</span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-500">Overtime:</span>
                  <span className="font-semibold">{formatMoney(selectedItemForSlip.overtime)}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 border-t font-bold text-slate-900 dark:text-white">
                  <span>Gross Pay:</span>
                  <span>
                    {formatMoney(
                      selectedItemForSlip.basic_salary +
                        selectedItemForSlip.allowances +
                        selectedItemForSlip.bonus +
                        selectedItemForSlip.overtime
                    )}
                  </span>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b pb-1">
                  Deductions & Withholdings
                </h4>
                <div className="flex justify-between text-xs py-1 text-rose-600">
                  <span>General Deductions:</span>
                  <span>-{formatMoney(selectedItemForSlip.deductions)}</span>
                </div>
                <div className="flex justify-between text-xs py-1 text-rose-600">
                  <span>Income Tax (Manual):</span>
                  <span>-{formatMoney(selectedItemForSlip.tax)}</span>
                </div>
                <div className="flex justify-between text-xs py-1 text-rose-600">
                  <span>Advance Salary:</span>
                  <span>-{formatMoney(selectedItemForSlip.advance)}</span>
                </div>
                <div className="flex justify-between text-xs py-1.5 border-t font-bold text-rose-600">
                  <span>Total Deductions:</span>
                  <span>
                    -{formatMoney(
                      selectedItemForSlip.deductions + selectedItemForSlip.tax + selectedItemForSlip.advance
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Salary Highlight */}
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  Net Salary Disbursed
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Direct deposit / check settlement
                </p>
              </div>
              <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
                {formatMoney(selectedItemForSlip.net_salary)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 print:hidden">
              <Button variant="outline" onClick={() => setSelectedItemForSlip(null)}>
                Close
              </Button>
              <Button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Print Pay Stub
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
