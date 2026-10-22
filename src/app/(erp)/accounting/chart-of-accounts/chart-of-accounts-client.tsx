"use client";

import * as React from "react";
import {
  Landmark,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Upload,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { Account, AccountType } from "@/types/database.types";
import { AddAccountDialog } from "@/components/accounting/add-account-dialog";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ChartOfAccountsClientProps {
  initialAccounts: Account[];
  companyId: string;
}

export function ChartOfAccountsClient({
  initialAccounts,
  companyId,
}: ChartOfAccountsClientProps) {
  const [accounts, setAccounts] = React.useState<Account[]>(initialAccounts);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [collapsedParents, setCollapsedParents] = React.useState<Record<string, boolean>>({});

  // Modals state
  const [isAddAccountOpen, setIsAddAccountOpen] = React.useState(false);
  const [selectedRegisterAccount, setSelectedRegisterAccount] = React.useState<Account | null>(null);
  const [editAccount, setEditAccount] = React.useState<Account | null>(null);

  const toggleExpand = (id: string) => {
    setCollapsedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpandAll = () => {
    setCollapsedParents({});
  };

  const handleCollapseAll = () => {
    const collapsed: Record<string, boolean> = {};
    accounts.forEach((acc) => {
      if (!acc.parent_id && (parentMap[acc.id] || []).length > 0) {
        collapsed[acc.id] = true;
      }
    });
    setCollapsedParents(collapsed);
  };

  const handleAccountCreated = (newAccount: Account) => {
    setAccounts((prev) => [...prev, newAccount].sort((a, b) => a.code.localeCompare(b.code)));
  };

  const handleToggleStatus = async (account: Account) => {
    try {
      const res = await fetch("/api/accounting/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          action: "toggle_active",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to toggle status");
        return;
      }
      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, is_active: !a.is_active } : a))
      );
    } catch (err: any) {
      alert(err.message || "Network error");
    }
  };

  // Build hierarchy: root accounts and child sub-accounts
  const parentMap = React.useMemo(() => {
    const map: Record<string, Account[]> = {};
    accounts.forEach((acc) => {
      if (acc.parent_id) {
        if (!map[acc.parent_id]) map[acc.parent_id] = [];
        map[acc.parent_id].push(acc);
      }
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => a.code.localeCompare(b.code));
    });
    return map;
  }, [accounts]);

  // Filter accounts
  const filteredAccounts = React.useMemo(() => {
    return accounts.filter((acc) => {
      if (!includeInactive && !acc.is_active) return false;

      // Filter by type tabs
      if (typeFilter === "BALANCE_SHEET") {
        if (!["Asset", "Liability", "Equity"].includes(acc.account_type)) return false;
      } else if (typeFilter === "PROFIT_LOSS") {
        if (!["Revenue", "Expense"].includes(acc.account_type)) return false;
      } else if (typeFilter === "BANK") {
        if (acc.account_type !== "Asset" || !acc.name.toLowerCase().includes("bank") && acc.sub_type !== "Checking" && acc.sub_type !== "Savings") {
          return false;
        }
      } else if (typeFilter !== "ALL" && acc.account_type !== typeFilter) {
        return false;
      }

      // Search match
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const codeMatch = acc.code.toLowerCase().includes(query);
        const nameMatch = acc.name.toLowerCase().includes(query);
        const subTypeMatch = acc.sub_type?.toLowerCase().includes(query);
        const taxMatch = acc.tax_line?.toLowerCase().includes(query);
        return codeMatch || nameMatch || subTypeMatch || taxMatch;
      }

      return true;
    });
  }, [accounts, searchTerm, typeFilter, includeInactive]);

  // Hierarchical display: Group subheadings immediately under their parent heading
  const displayAccounts = React.useMemo(() => {
    if (searchTerm.trim()) {
      return filteredAccounts;
    }

    const result: Account[] = [];
    const processedIds = new Set<string>();

    const rootAccounts = filteredAccounts.filter((a) => !a.parent_id);
    rootAccounts.forEach((parent) => {
      result.push(parent);
      processedIds.add(parent.id);

      const children = parentMap[parent.id] || [];
      const isCollapsed = !!collapsedParents[parent.id];

      // Mark all known children as recognized belonging to this parent
      children.forEach((child) => {
        processedIds.add(child.id);
      });

      if (!isCollapsed) {
        children.forEach((child) => {
          if (filteredAccounts.some((f) => f.id === child.id)) {
            result.push(child);
          }
        });
      }
    });

    // Fallback for any truly orphan sub-accounts (parent_id not in accounts)
    filteredAccounts.forEach((acc) => {
      if (!processedIds.has(acc.id)) {
        result.push(acc);
      }
    });

    return result;
  }, [filteredAccounts, parentMap, collapsedParents, searchTerm]);

  const parentAccountsCount = React.useMemo(
    () => accounts.filter((a) => !a.parent_id).length,
    [accounts]
  );
  const subAccountsCount = React.useMemo(
    () => accounts.filter((a) => !!a.parent_id).length,
    [accounts]
  );
  const hasSubAccounts = subAccountsCount > 0;
  const isAnyCollapsed = Object.keys(collapsedParents).some((k) => collapsedParents[k]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Account Code",
      "Account Name",
      "Account Type",
      "Sub Type",
      "Tax Line",
      "Currency",
      "Balance",
      "Status",
    ];
    const rows = filteredAccounts.map((a) => [
      `"${a.code}"`,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.account_type}"`,
      `"${a.sub_type || ""}"`,
      `"${a.tax_line || ""}"`,
      `"${a.currency || "PKR"}"`,
      `"${(a.balance ?? 0).toFixed(2)}"`,
      `"${a.is_active ? "Active" : "Inactive"}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chart_of_accounts_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group stats
  const totalCount = accounts.length;
  const activeCount = accounts.filter((a) => a.is_active).length;

  return (
    <div className="space-y-3">
      {/* Desktop Toolbar & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-[#d0d7de] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Landmark className="h-5 w-5 text-[#0078d4]" />
              Chart of Accounts (COA)
            </h1>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
              {parentAccountsCount} Headings · {subAccountsCount} Subheadings · {activeCount} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            QuickBooks Enterprise double-entry general ledger accounts and Pakistani tax mapping.
          </p>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddAccountOpen(true)}
            className="inline-flex items-center gap-1.5 rounded bg-[#0078d4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#006bbd] shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4]"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Account</span>
          </button>

          {hasSubAccounts && (
            <button
              type="button"
              onClick={isAnyCollapsed ? handleExpandAll : handleCollapseAll}
              className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
              title={isAnyCollapsed ? "Expand all subheadings" : "Collapse all subheadings"}
            >
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>{isAnyCollapsed ? "Expand All" : "Collapse All"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            title="Print Account Register"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-white p-2.5 rounded-lg border border-[#d0d7de] text-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "All Accounts" },
            { id: "BALANCE_SHEET", label: "Balance Sheet" },
            { id: "PROFIT_LOSS", label: "Profit & Loss" },
            { id: "BANK", label: "Bank & Cash" },
            { id: "Asset", label: "Assets" },
            { id: "Liability", label: "Liabilities" },
            { id: "Equity", label: "Equity" },
            { id: "Revenue", label: "Revenue" },
            { id: "Expense", label: "Expenses" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                typeFilter === tab.id
                  ? "bg-[#0078d4] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Inactive Toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-[#0078d4] focus:ring-[#0078d4]"
            />
            <span className="text-[11px] whitespace-nowrap">Include Inactive</span>
          </label>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search code, name, tax..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0078d4] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Desktop Register Table */}
      <div className="overflow-x-auto rounded-lg border border-[#d0d7de] bg-white shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-bold uppercase tracking-wider text-slate-600 select-none">
              <th className="py-2.5 px-3 w-24">Code</th>
              <th className="py-2.5 px-3">Account Name</th>
              <th className="py-2.5 px-3 w-28">Type</th>
              <th className="py-2.5 px-3">Detail Type</th>
              <th className="py-2.5 px-3">Tax Line / Reporting</th>
              <th className="py-2.5 px-2 w-16 text-center">Curr</th>
              <th className="py-2.5 px-3 w-32 text-right">Balance</th>
              <th className="py-2.5 px-2 w-20 text-center">Status</th>
              <th className="py-2.5 px-3 w-28 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {displayAccounts.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <Landmark className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-sm text-slate-700">No accounts found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Try adjusting your search terms or filter selection.
                  </p>
                </td>
              </tr>
            ) : (
              displayAccounts.map((acc) => {
                const subAccounts = parentMap[acc.id] || [];
                const hasSubs = subAccounts.length > 0;
                const isCollapsed = !!collapsedParents[acc.id];

                return (
                  <tr
                    key={acc.id}
                    className={`hover:bg-[#f0f9ff]/70 transition-colors ${
                      !acc.is_active ? "opacity-60 bg-slate-50" : acc.parent_id ? "bg-slate-50/40" : ""
                    }`}
                  >
                    {/* Account Code */}
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">
                      {acc.code}
                    </td>

                    {/* Account Name with indentation if sub-account */}
                    <td className="py-2 px-3 font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {acc.parent_id ? (
                          <span className="text-slate-400 font-mono text-sm ml-4 select-none">↳</span>
                        ) : hasSubs ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(acc.id)}
                            className="p-0.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200/60 transition-colors"
                            title={isCollapsed ? "Expand subheadings" : "Collapse subheadings"}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="w-3.5" />
                        )}
                        <span className={acc.parent_id ? "text-slate-700 font-medium" : "font-bold text-slate-900"}>
                          {acc.name}
                        </span>
                        {hasSubs && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-semibold text-[#0078d4] border border-blue-200/60">
                            {subAccounts.length} {subAccounts.length === 1 ? "subheading" : "subheadings"}
                          </span>
                        )}
                        {acc.parent_id && (
                          <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-medium text-slate-500 border border-slate-200">
                            Sub-account
                          </span>
                        )}
                        {acc.is_system && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-semibold text-slate-500 border border-slate-200">
                            CORE
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Account Type Badge */}
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          acc.account_type === "Asset"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : acc.account_type === "Liability"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : acc.account_type === "Equity"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : acc.account_type === "Revenue"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {acc.account_type}
                      </span>
                    </td>

                    {/* Detail Type */}
                    <td className="py-2 px-3 text-slate-600 truncate max-w-xs">
                      {acc.sub_type || "—"}
                    </td>

                    {/* Tax Line */}
                    <td className="py-2 px-3 text-slate-600 truncate max-w-xs">
                      {acc.tax_line || "Standard"}
                    </td>

                    {/* Currency */}
                    <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600">
                      {acc.currency || "PKR"}
                    </td>

                    {/* Current Balance */}
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                      {new Intl.NumberFormat("en-PK", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(acc.balance ?? 0)}
                    </td>

                    {/* Status */}
                    <td className="py-2 px-2 text-center">
                      {acc.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRegisterAccount(acc)}
                          className="rounded px-2 py-1 text-[11px] font-semibold text-[#0078d4] hover:bg-blue-50 transition-colors"
                          title="View General Ledger Register"
                        >
                          Register
                        </button>

                        {!acc.is_system && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(acc)}
                            className="rounded px-1.5 py-1 text-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          >
                            {acc.is_active ? "Inactivate" : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add New Account Dialog */}
      <AddAccountDialog
        open={isAddAccountOpen}
        onOpenChange={setIsAddAccountOpen}
        existingAccounts={accounts}
        onAccountCreated={handleAccountCreated}
      />

      {/* Account Register Modal */}
      {selectedRegisterAccount && (
        <Dialog
          open={!!selectedRegisterAccount}
          onOpenChange={(open) => !open && setSelectedRegisterAccount(null)}
          className="max-w-4xl p-0 overflow-hidden border-[#343e47] bg-[#f8fafc]"
        >
          <div className="flex h-12 items-center justify-between border-b border-[#343e47] bg-[#1e252b] px-4 text-white">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#0078d4]" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Account Register: {selectedRegisterAccount.code} — {selectedRegisterAccount.name}
              </span>
            </div>
            <span className="rounded bg-[#0078d4]/20 border border-[#0078d4]/40 px-2 py-0.5 text-[10px] font-mono text-[#38bdf8]">
              {selectedRegisterAccount.account_type}
            </span>
          </div>

          <div className="p-4 space-y-3 bg-white">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Account Code</span>
                <span className="font-mono font-bold text-slate-800">{selectedRegisterAccount.code}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Detail Sub-Type</span>
                <span className="font-semibold text-slate-800">{selectedRegisterAccount.sub_type || "Standard"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Currency</span>
                <span className="font-mono font-bold text-slate-800">{selectedRegisterAccount.currency || "PKR"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Current Balance</span>
                <span className="font-mono font-bold text-emerald-700">
                  {new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2 }).format(selectedRegisterAccount.balance ?? 0)}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Ref / Voucher</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Debit</th>
                    <th className="py-2 px-3 text-right">Credit</th>
                    <th className="py-2 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2 px-3 font-mono">
                      {selectedRegisterAccount.opening_balance_date || "2026-07-01"}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500">OB-0001</td>
                    <td className="py-2 px-3 font-medium">Opening Balance Setup</td>
                    <td className="py-2 px-3 text-right font-mono">
                      {selectedRegisterAccount.account_type === "Asset" || selectedRegisterAccount.account_type === "Expense"
                        ? new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2 }).format(selectedRegisterAccount.opening_balance ?? 0)
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {selectedRegisterAccount.account_type === "Liability" || selectedRegisterAccount.account_type === "Equity" || selectedRegisterAccount.account_type === "Revenue"
                        ? new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2 }).format(selectedRegisterAccount.opening_balance ?? 0)
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2 }).format(selectedRegisterAccount.balance ?? 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedRegisterAccount(null)}
                className="rounded bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                Close Register
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
