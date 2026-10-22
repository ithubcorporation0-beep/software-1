"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Trash2,
  MoreHorizontal,
  Eye,
  Edit,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Building2,
  Mail,
  Phone,
  ArrowUpDown,
  X,
} from "lucide-react";
import { Customer, CustomerGroup, CustomerCategory, CustomerStatus } from "@/types/database.types";
import { CustomerSettingsTabs } from "@/components/customers/customer-settings-tabs";
import { CustomerViewDrawer } from "@/components/customers/customer-view-drawer";
import { CustomerImportModal } from "@/components/customers/customer-import-modal";
import { CreateCustomerModal } from "@/components/customers/create-customer-modal";
import {
  toggleCustomerStatusAction,
  bulkDeleteCustomersAction,
  deleteCustomerAccountAction,
  exportCustomersCsvAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CustomersClientProps {
  companyId: string;
  initialCustomers: Customer[];
  customerGroups: CustomerGroup[];
  customerCategories: CustomerCategory[];
}

export function CustomersClient({
  companyId,
  initialCustomers,
  customerGroups,
  customerCategories,
}: CustomersClientProps) {
  const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [groupFilter, setGroupFilter] = React.useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");

  // Modals & Drawers State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [viewCustomer, setViewCustomer] = React.useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false);

  // User feedback toast
  const [feedback, setFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(null);

  React.useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Filtering logic
  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      // Search term
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchesName = (c.name || "").toLowerCase().includes(s);
        const matchesCompany = (c.company_name || "").toLowerCase().includes(s);
        const matchesCode = (c.customer_code || "").toLowerCase().includes(s);
        const matchesEmail = (c.email || "").toLowerCase().includes(s);
        const matchesPhone = (c.mobile_number || c.phone || "").toLowerCase().includes(s);
        const matchesTax = (c.tax_number || c.ntn_number || c.cnic_number || "").toLowerCase().includes(s);
        if (!matchesName && !matchesCompany && !matchesCode && !matchesEmail && !matchesPhone && !matchesTax) {
          return false;
        }
      }

      // Status
      if (statusFilter !== "ALL") {
        if (statusFilter === "Active" && c.status !== "Active") return false;
        if (statusFilter === "Disabled" && c.status !== "Inactive" && c.status !== "Archived") return false;
      }

      // Group
      if (groupFilter !== "ALL") {
        if ((c.customer_group || "").toLowerCase() !== groupFilter.toLowerCase()) return false;
      }

      // Category
      if (categoryFilter !== "ALL") {
        if ((c.customer_category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }

      // Customer Type
      if (typeFilter !== "ALL") {
        if (typeFilter === "Retailer" && c.customer_type !== "B2C" && c.customer_type !== "Retailer") return false;
        if (typeFilter === "Wholesale" && c.customer_type !== "Wholesale" && c.customer_type !== "WS / Distributor") return false;
      }

      return true;
    });
  }, [customers, search, statusFilter, groupFilter, categoryFilter, typeFilter]);

  // Toggle selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredCustomers.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle Customer Status
  const handleToggleStatus = async (customer: Customer) => {
    const nextStatus = customer.status === "Active" ? "Inactive" : "Active";
    setCustomers((prev) =>
      prev.map((c) => (c.id === customer.id ? { ...c, status: nextStatus } : c))
    );

    const res = await toggleCustomerStatusAction(companyId, customer.id, nextStatus);
    if (res.success) {
      setFeedback({
        message: `Customer ${customer.company_name || customer.name} is now ${nextStatus === "Active" ? "Active" : "Disabled"}.`,
        type: "success",
      });
    } else {
      // Revert on failure
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, status: customer.status } : c))
      );
      setFeedback({ message: res.error || "Failed to update status", type: "error" });
    }
  };

  // Delete Single Customer
  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete customer '${customer.company_name || customer.name}'?`)) {
      return;
    }

    const res = await deleteCustomerAccountAction(companyId, customer.id);
    if (res.success) {
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      setSelectedIds((prev) => prev.filter((id) => id !== customer.id));
      setFeedback({ message: "Customer deleted successfully.", type: "success" });
    } else {
      setFeedback({ message: res.error || "Failed to delete customer.", type: "error" });
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected customer(s)?`)) {
      return;
    }

    const res = await bulkDeleteCustomersAction(companyId, selectedIds);
    if (res.success) {
      setCustomers((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
      setSelectedIds([]);
      setFeedback({ message: res.message || "Selected customers deleted.", type: "success" });
    } else {
      setFeedback({ message: res.error || "Failed to delete selected customers.", type: "error" });
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    setIsExportDropdownOpen(false);
    const res = await exportCustomersCsvAction(companyId);
    if (res.success && res.data) {
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `unaz_customers_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setFeedback({ message: "Customers exported to CSV successfully.", type: "success" });
    } else {
      setFeedback({ message: res.error || "Export failed", type: "error" });
    }
  };

  const handlePrint = () => {
    setIsExportDropdownOpen(false);
    window.print();
  };

  const formatPKR = (val: number | null | undefined) => {
    const num = val ?? 0;
    return `Rs. ${num.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold animate-in slide-in-from-bottom-4 duration-200 border",
            feedback.type === "success"
              ? "bg-emerald-600 text-white border-emerald-700"
              : "bg-rose-600 text-white border-rose-700"
          )}
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Header & Breadcrumbs matching UNAZ layout */}
      <div className="px-6 py-5 border-b border-border/80 bg-card/40 backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
            <span>Accounting</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Customers</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Customers</span>
            <Badge variant="secondary" className="font-mono text-xs font-semibold px-2">
              {customers.length}
            </Badge>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Bulk Delete */}
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="gap-1.5 h-9 text-xs font-semibold shadow-2xs cursor-pointer animate-in fade-in"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </Button>
          )}

          {/* Import CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportOpen(true)}
            className="gap-1.5 h-9 text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Import CSV</span>
          </Button>

          {/* Export Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportDropdownOpen((prev) => !prev)}
              className="gap-1.5 h-9 text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Export</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>

            {isExportDropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-44 rounded-xl border border-border bg-popover p-1 shadow-lg z-30 animate-in zoom-in-95 duration-150"
                onMouseLeave={() => setIsExportDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-muted cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-blue-500" />
                  <span>Print / PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Create Customer Button */}
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 h-9 text-xs font-bold shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Customer</span>
          </Button>
        </div>
      </div>

      {/* Sub-Navigation Tabs: Customers | Customer Groups | Customer Categories */}
      <CustomerSettingsTabs
        customersCount={customers.length}
        groupsCount={customerGroups.length}
        categoriesCount={customerCategories.length}
      />

      {/* Search & Filter Bar */}
      <div className="p-6 pb-2 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Live Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers by name, code, mobile, NTN..."
              className="pl-9 text-xs h-9 bg-card"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Disabled">Disabled</option>
            </select>

            {/* Customer Group Filter */}
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">All Groups</option>
              {customerGroups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>

            {/* Customer Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {customerCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Customer Trade Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">All Customer Types</option>
              <option value="Retailer">Retailer (236H)</option>
              <option value="Wholesale">WS / Distributor (236G)</option>
            </select>

            {(search || statusFilter !== "ALL" || groupFilter !== "ALL" || categoryFilter !== "ALL" || typeFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setGroupFilter("ALL");
                  setCategoryFilter("ALL");
                  setTypeFilter("ALL");
                }}
                className="h-9 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 px-6 pb-6">
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground select-none">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredCustomers.length > 0 &&
                        selectedIds.length === filteredCustomers.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-input text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Contact Person</th>
                  <th className="py-3 px-3">FBR Statutory Status</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Group</th>
                  <th className="py-3 px-3 text-right">Customer Balance</th>
                  <th className="py-3 px-3 text-right">Advance Balance</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Users className="h-8 w-8 text-muted-foreground/40" />
                        <p className="font-semibold text-foreground">No customers found</p>
                        <p className="text-xs max-w-sm text-muted-foreground">
                          {search || statusFilter !== "ALL"
                            ? "Try adjusting your search criteria or clearing filters."
                            : "Get started by adding your first customer or importing from CSV."}
                        </p>
                        {!search && statusFilter === "ALL" && (
                          <Button
                            size="sm"
                            onClick={() => setIsCreateOpen(true)}
                            className="mt-2 text-xs gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Create Customer</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const isSelected = selectedIds.includes(customer.id);
                    const initials = (customer.company_name || customer.name || "C")
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    const isFiler =
                      customer.sales_tax_atl === "Active" ||
                      customer.income_tax_atl === "Active" ||
                      customer.sales_tax_reg_type === "Registered";

                    return (
                      <tr
                        key={customer.id}
                        className={cn(
                          "hover:bg-muted/30 transition-colors group",
                          isSelected && "bg-primary/5"
                        )}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRow(customer.id)}
                            className="rounded border-input text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>

                        {/* Customer Avatar & Name */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 text-xs shadow-2xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewCustomer(customer)}
                                  className="font-bold text-foreground hover:text-primary transition-colors truncate text-left cursor-pointer"
                                >
                                  {customer.company_name || customer.name}
                                </button>
                                {customer.customer_type === "Wholesale" && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                    236G
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground font-mono">
                                <span>{customer.customer_code}</span>
                                {customer.ntn_number && (
                                  <span>• NTN: {customer.ntn_number}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Person */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {customer.contact_person || customer.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {customer.mobile_number || customer.phone || customer.email || "—"}
                            </p>
                          </div>
                        </td>

                        {/* FBR 3 Indicators */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <span
                                className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono",
                                  customer.sales_tax_reg_type === "Registered"
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                    : "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400"
                                )}
                                title="Sales Tax Registration Type"
                              >
                                {customer.sales_tax_reg_type || "Unregistered"}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono",
                                  customer.income_tax_atl === "Active" || (customer.income_tax_atl || "").includes("Active")
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                    : "bg-red-500/15 text-red-700 dark:text-red-400"
                                )}
                                title="Income Tax ATL"
                              >
                                IT: {customer.income_tax_atl === "Active" ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3">
                          <Badge variant="outline" className="font-medium text-[11px] px-2 py-0.5">
                            {customer.customer_category || "Standard"}
                          </Badge>
                        </td>

                        {/* Group */}
                        <td className="py-3.5 px-3">
                          <Badge variant="secondary" className="font-medium text-[11px] px-2 py-0.5">
                            {customer.customer_group || "General"}
                          </Badge>
                        </td>

                        {/* Customer Balance */}
                        <td className="py-3.5 px-3 text-right font-bold tabular-nums text-foreground">
                          {formatPKR(customer.total_spend || 0)}
                        </td>

                        {/* Advance Balance */}
                        <td className="py-3.5 px-3 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatPKR(customer.advance_balance || 0)}
                        </td>

                        {/* Status Switch (Active vs Disabled Toggle) */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(customer)}
                            className={cn(
                              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20",
                              customer.status === "Active" ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
                            )}
                            role="switch"
                            aria-checked={customer.status === "Active"}
                            title={`Click to ${customer.status === "Active" ? "disable" : "enable"}`}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                                customer.status === "Active" ? "translate-x-4" : "translate-x-0"
                              )}
                            />
                          </button>
                        </td>

                        {/* Row Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Detail Report */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewCustomer(customer)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="View Customer Dossier"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingCustomer(customer)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Edit Customer"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCustomer(customer)}
                              className="h-7 w-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
                              title="Delete Customer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div className="px-6 py-3.5 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
            <span>
              Showing <strong className="text-foreground">{filteredCustomers.length}</strong> of{" "}
              <strong className="text-foreground">{customers.length}</strong> total customers
            </span>
            <div className="flex items-center gap-4 text-[11px]">
              <span>
                Active:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {customers.filter((c) => c.status === "Active").length}
                </strong>
              </span>
              <span>
                Disabled:{" "}
                <strong className="text-muted-foreground">
                  {customers.filter((c) => c.status !== "Active").length}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer View Dossier Drawer */}
      <CustomerViewDrawer
        open={!!viewCustomer}
        onClose={() => setViewCustomer(null)}
        customer={viewCustomer}
        onEdit={(cust) => setEditingCustomer(cust)}
      />

      {/* Create Customer Modal */}
      <CreateCustomerModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        companyId={companyId}
        onCustomerCreated={(newCust) => {
          setCustomers((prev) => [newCust, ...prev]);
          setFeedback({ message: `Customer ${newCust.name} successfully registered.`, type: "success" });
        }}
      />

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <CreateCustomerModal
          open={!!editingCustomer}
          onOpenChange={(open) => !open && setEditingCustomer(null)}
          companyId={companyId}
          onCustomerCreated={(updated) => {
            setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setEditingCustomer(null);
            setFeedback({ message: "Customer profile updated successfully.", type: "success" });
          }}
        />
      )}

      {/* Import CSV Modal */}
      <CustomerImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        companyId={companyId}
        onImportComplete={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
