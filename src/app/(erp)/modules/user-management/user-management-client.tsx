"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Users,
  Shield,
  UserCheck,
  ShoppingBag,
  ArrowRight,
  Plus,
  ChevronDown,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  MoreVertical,
  Building2,
  FileText,
  CreditCard,
  Settings,
  ShieldCheck,
  UserPlus,
  List,
  MoreHorizontal,
  RotateCw,
  Download,
  UserX,
  Key,
  Pencil,
  Trash2,
  Columns,
  ArrowUpDown,
  Lock,
  ChevronLeft,
  ChevronRight,
  LogIn,
  MessageSquare,
  User,
} from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";
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
import { CompanyMemberItem } from "@/lib/users/server";

interface CorporateUserItem {
  id: string;
  name: string;
  email: string;
  mobile: string;
  company: string;
  role: string;
  status: "Enabled" | "Disabled";
}

interface CorporateUserItem {
  id: string;
  name: string;
  email: string;
  mobile: string;
  company: string;
  role: string;
  status: "Enabled" | "Disabled";
}

interface UserManagementClientProps {
  companyId: string;
  initialMembers: CompanyMemberItem[];
  initialRoles: any[];
  totalCustomersCount?: number;
  totalVendorsCount?: number;
  initialTab?: "dashboard" | "access" | "users" | "roles" | "customers";
}

export function UserManagementClient({
  companyId,
  initialMembers = [],
  initialRoles = [],
  totalCustomersCount = 0,
  totalVendorsCount = 0,
  initialTab = "access",
}: UserManagementClientProps) {
  // Navigation tabs state
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "access" | "users" | "roles" | "customers">(initialTab);

  // Hovered month for the "New Users This Year" bar chart tooltip
  const [hoveredMonth, setHoveredMonth] = React.useState<{ month: string; count: number } | null>({
    month: "Jan",
    count: 0,
  });

  // Modal Dialogs state
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = React.useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = React.useState(false);

  // Active dropdown state ("customers" | "vendors" | "access" | "contract" | null)
  const [activeDropdown, setActiveDropdown] = React.useState<"customers" | "vendors" | "access" | "contract" | null>(null);
  const customersRef = React.useRef<HTMLDivElement>(null);
  const vendorsRef = React.useRef<HTMLDivElement>(null);
  const accessRef = React.useRef<HTMLDivElement>(null);
  const contractRef = React.useRef<HTMLDivElement>(null);

  // Additional dialogs for Vendor List and Child Companies
  const [isVendorModalOpen, setIsVendorModalOpen] = React.useState(false);
  const [isChildCompaniesOpen, setIsChildCompaniesOpen] = React.useState(false);

  const mappedInitialUsers = React.useMemo<CorporateUserItem[]>(() => {
    return initialMembers.map((m) => ({
      id: m.membershipId || m.userId,
      name: m.fullName || "User",
      email: m.email,
      mobile: "—",
      company: "Business Solutions Tax Consultants",
      role: m.roleName || (m.isSuperAdmin ? "Super Admin" : "Staff"),
      status: m.status === "ACTIVE" ? "Enabled" : "Disabled",
    }));
  }, [initialMembers]);

  // Access Directory states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
  const [openActionRowId, setOpenActionRowId] = React.useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = React.useState(false);
  const [isPageSizeOpen, setIsPageSizeOpen] = React.useState(false);
  const [accessSearch, setAccessSearch] = React.useState("");
  const [usersList, setUsersList] = React.useState<CorporateUserItem[]>(mappedInitialUsers);

  React.useEffect(() => {
    setUsersList(mappedInitialUsers);
  }, [mappedInitialUsers]);

  const [selectedUserForAction, setSelectedUserForAction] = React.useState<CorporateUserItem | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = React.useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = React.useState(false);
  const [editUserName, setEditUserName] = React.useState("");
  const [editUserEmail, setEditUserEmail] = React.useState("");
  const [editUserMobile, setEditUserMobile] = React.useState("");
  const [newPasswordValue, setNewPasswordValue] = React.useState("");

  const actionMenuRef = React.useRef<HTMLDivElement>(null);
  const exportRef = React.useRef<HTMLDivElement>(null);
  const pageSizeRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        customersRef.current && !customersRef.current.contains(target) &&
        vendorsRef.current && !vendorsRef.current.contains(target) &&
        accessRef.current && !accessRef.current.contains(target) &&
        contractRef.current && !contractRef.current.contains(target)
      ) {
        setActiveDropdown(null);
      }
      if (exportRef.current && !exportRef.current.contains(target)) {
        setIsExportOpen(false);
      }
      if (pageSizeRef.current && !pageSizeRef.current.contains(target)) {
        setIsPageSizeOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        // Only close if click is not inside any action toggle button
        const isActionBtn = (target as HTMLElement).closest('[title="Row Actions"]');
        if (!isActionBtn) {
          setOpenActionRowId(null);
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Form states
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserRole, setNewUserRole] = React.useState(initialRoles[0]?.id || "admin");
  const [newRoleName, setNewRoleName] = React.useState("");
  const [newRoleCode, setNewRoleCode] = React.useState("");
  const [newCustomerName, setNewCustomerName] = React.useState("");
  const [newCustomerEmail, setNewCustomerEmail] = React.useState("");

  // Search & Filter state for Users table
  const [userSearch, setUserSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "INVITED" | "SUSPENDED">("ALL");

  // Real KPI calculations from live database records
  const totalUsers = initialMembers.length;
  const activeUsers = initialMembers.filter((m) => m.status === "ACTIVE").length;
  const totalRoles = initialRoles.length;
  const totalCustomers = totalCustomersCount;
  const totalVendors = totalVendorsCount;

  // Monthly data for "New Users This Year" bar chart derived from member creation dates
  const monthlyData = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const counts = new Array(12).fill(0);
    initialMembers.forEach((m) => {
      if (m.createdAt) {
        const d = new Date(m.createdAt);
        if (!isNaN(d.getTime())) {
          counts[d.getMonth()] += 1;
        }
      }
    });
    return months.map((month, idx) => ({ month, count: counts[idx] }));
  }, [initialMembers]);

  // Filtered members list
  const filteredMembers = initialMembers.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      m.roleName.toLowerCase().includes(userSearch.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Corporate Users (Access Directory) calculations matching screenshot
  const filteredUsers = React.useMemo(() => {
    return usersList.filter((u) => {
      const q = accessSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.company.toLowerCase().includes(q) ||
        u.mobile.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.status.toLowerCase().includes(q)
      );
    });
  }, [usersList, accessSearch]);

  const totalResults = filteredUsers.length;
  const totalPages = Math.ceil(totalResults / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalResults);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);


  return (
    <div className="space-y-6 pb-12">
      {/* 1. Sub-navigation Bar (Matches Screenshot 2) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-3">
        {/* Left: App Grid Icon + Title + Navigation Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-foreground" />
            <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              User Management
            </h1>
          </div>

          <div className="h-4 w-px bg-border/80 hidden sm:block" />

          {/* Nav Tabs & Dropdowns */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs sm:text-sm">
            {/* Dashboard (Active Pill) */}
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

            {/* Customers Dropdown */}
            <div className="relative" ref={customersRef}>
              <button
                onClick={() => setActiveDropdown((prev) => (prev === "customers" ? null : "customers"))}
                className={`flex items-center gap-1 rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                  activeDropdown === "customers"
                    ? "bg-[#edf5ff] text-[#2563eb] dark:bg-blue-900/50 dark:text-blue-300 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>Customers</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {activeDropdown === "customers" && (
                <div className="absolute top-full left-0 z-50 mt-1.5 min-w-[210px] rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl animate-in fade-in-80 duration-150">
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setActiveTab("customers");
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Customer List
                    </button>
                    <Link
                      href="/sales"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Customer Payment
                    </Link>
                    <Link
                      href="/sales"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Due & Batch Payment
                    </Link>
                    <Link
                      href="/reports"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Customer Report
                    </Link>
                    <Link
                      href="/finance"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Customer Ledger
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Customer Setting
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Vendors Dropdown (Exact match to Screenshot 1) */}
            <div className="relative" ref={vendorsRef}>
              <button
                onClick={() => setActiveDropdown((prev) => (prev === "vendors" ? null : "vendors"))}
                className={`flex items-center gap-1 rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                  activeDropdown === "vendors"
                    ? "bg-[#edf5ff] text-[#2563eb] dark:bg-blue-900/50 dark:text-blue-300 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>Vendors</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {activeDropdown === "vendors" && (
                <div className="absolute top-full left-0 z-50 mt-1.5 min-w-[210px] rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl animate-in fade-in-80 duration-150">
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setIsVendorModalOpen(true);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Vendor List
                    </button>
                    <Link
                      href="/finance"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Vendor Payments
                    </Link>
                    <Link
                      href="/finance"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Due & Batch Payment
                    </Link>
                    <Link
                      href="/reports"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Vendor Report
                    </Link>
                    <Link
                      href="/finance"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Vendor Ledger
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Vendor Settings
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Access Dropdown (Exact match to Screenshot 2 & Screenshot 4) */}
            <div className="relative" ref={accessRef}>
              <button
                onClick={() => {
                  setActiveTab("access");
                  setActiveDropdown((prev) => (prev === "access" ? null : "access"));
                }}
                className={`flex items-center gap-1 rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                  activeTab === "access" || activeTab === "users" || activeDropdown === "access"
                    ? "bg-[#edf5ff] text-[#2563eb] dark:bg-blue-900/50 dark:text-blue-300 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>Access</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {activeDropdown === "access" && (
                <div className="absolute top-full left-0 z-50 mt-1.5 min-w-[200px] rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl animate-in fade-in-80 duration-150">
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setActiveTab("access");
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Users
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("roles");
                        setActiveDropdown(null);
                        setIsCreateRoleOpen(true);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Roles
                    </button>
                    <button
                      onClick={() => {
                        setIsChildCompaniesOpen(true);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Child Companies
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Contract Dropdown */}
            <div className="relative" ref={contractRef}>
              <button
                onClick={() => setActiveDropdown((prev) => (prev === "contract" ? null : "contract"))}
                className={`flex items-center gap-1 rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                  activeDropdown === "contract"
                    ? "bg-[#edf5ff] text-[#2563eb] dark:bg-blue-900/50 dark:text-blue-300 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>Contract</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {activeDropdown === "contract" && (
                <div className="absolute top-full left-0 z-50 mt-1.5 min-w-[200px] rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl animate-in fade-in-80 duration-150">
                  <div className="space-y-0.5">
                    <Link
                      href="/sales"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Contract List
                    </Link>
                    <Link
                      href="/sales"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Contract Templates
                    </Link>
                    <Link
                      href="/projects"
                      onClick={() => setActiveDropdown(null)}
                      className="block w-full rounded-xl px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Expiring Contracts
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side items: History, Messages, BSTC profile (Matching screenshot) */}
        <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
          <button
            title="Activity log"
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            title="Messages"
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 pl-2">
            <div className="h-7 w-7 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
              B
            </div>
            <span className="text-xs font-semibold text-foreground">BSTC</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* 2. MAIN VIEW CONTENT: Access Directory OR Dashboard */}
      {activeTab === "access" || activeTab === "users" ? (
        <div className="space-y-4">
          {/* Top Search & Action Toolbar (Exact match to screenshot) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search users input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={accessSearch}
                onChange={(e) => {
                  setAccessSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-1.5 h-9 text-xs rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>

            {/* Right toolbar controls */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {/* View toggle (List active / Grid) */}
              <div className="flex items-center bg-slate-100 dark:bg-muted p-0.5 rounded-xl border border-slate-200/80 dark:border-border">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "list"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="List View"
                >
                  <List className="h-4 w-4 stroke-[2.2]" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4 stroke-[2.2]" />
                </button>
              </div>

              {/* Page size dropdown (10 per page ▾) */}
              <div className="relative" ref={pageSizeRef}>
                <button
                  onClick={() => setIsPageSizeOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shadow-2xs"
                >
                  <span>{pageSize} per page</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {isPageSizeOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[130px] rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-1 shadow-lg animate-in fade-in-80 duration-150">
                    {[10, 25, 50].map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                          setIsPageSizeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                          pageSize === size
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 font-semibold"
                            : "text-foreground hover:bg-muted/60"
                        }`}
                      >
                        {size} per page
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Export dropdown (📥 Export ▾) */}
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setIsExportOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>Export</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {isExportOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-1 shadow-lg animate-in fade-in-80 duration-150">
                    <button
                      onClick={() => {
                        alert("Exporting corporate users list as CSV...");
                        setIsExportOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs rounded-lg font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => {
                        alert("Exporting corporate users list as Excel (.xlsx)...");
                        setIsExportOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs rounded-lg font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Export Excel
                    </button>
                    <button
                      onClick={() => {
                        alert("Exporting corporate users list as PDF...");
                        setIsExportOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs rounded-lg font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      Export PDF
                    </button>
                  </div>
                )}
              </div>

              {/* History / Refresh Button */}
              <button
                onClick={() => {
                  setAccessSearch("");
                  setCurrentPage(1);
                  setOpenActionRowId(null);
                }}
                className="p-2 h-9 w-9 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center transition-colors shadow-2xs"
                title="Reset & Refresh"
              >
                <RotateCw className="h-4 w-4" />
              </button>

              {/* + Create User Button */}
              <Button
                onClick={() => setIsAddUserOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl px-4 h-9 shadow-xs flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Create User</span>
              </Button>
            </div>
          </div>

          {/* Table Card (Matches screenshot layout) */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-border bg-white dark:bg-card shadow-2xs overflow-visible">
            <div className="overflow-x-auto min-h-[360px] overflow-y-visible">
              <table className="w-full text-left text-xs border-collapse">
                {/* Table Header */}
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-border/80 bg-[#f8fafc] dark:bg-muted/40">
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      AVATAR
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      COMPANY
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <div className="flex items-center gap-1 cursor-pointer select-none">
                        <span>NAME</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <div className="flex items-center gap-1 cursor-pointer select-none">
                        <span>EMAIL</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      MOBILE NO
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <div className="flex items-center gap-1 cursor-pointer select-none">
                        <span>ROLE</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <div className="flex items-center gap-1 cursor-pointer select-none">
                        <span>LOGIN STATUS</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                      ACTIONS
                    </th>
                    <th className="py-3 px-3 text-right">
                      <button
                        title="Toggle columns"
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-muted"
                      >
                        <Columns className="h-3.5 w-3.5" />
                      </button>
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100 dark:divide-border/60">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        {accessSearch ? (
                          <>No users found matching &ldquo;{accessSearch}&rdquo;</>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              No company members or users found in database
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Click &ldquo;Create User&rdquo; above to invite and add real users to this workspace.
                            </p>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const isMenuOpen = openActionRowId === user.id;

                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-muted/30 transition-colors"
                        >
                          {/* Avatar */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <User className="h-4 w-4 stroke-[2]" />
                            </div>
                          </td>

                          {/* Company */}
                          <td className="py-3 px-4 text-xs font-normal text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {user.company}
                          </td>

                          {/* Name */}
                          <td className="py-3 px-4 text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            {user.name}
                          </td>

                          {/* Email */}
                          <td className="py-3 px-4 text-xs font-normal text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {user.email}
                          </td>

                          {/* Mobile No */}
                          <td className="py-3 px-4 text-xs font-normal text-slate-700 dark:text-slate-200 font-mono whitespace-nowrap">
                            {user.mobile}
                          </td>

                          {/* Role */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {user.role}
                            </span>
                          </td>

                          {/* Login Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${
                                user.status === "Enabled"
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>

                          {/* Actions button with open popup */}
                          <td className="py-3 px-4 text-center relative whitespace-nowrap" colSpan={2}>
                            <button
                              onClick={() =>
                                setOpenActionRowId(isMenuOpen ? null : user.id)
                              }
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-muted transition-colors"
                              title="Row Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {/* Dropdown Menu (Exact match to screenshot!) */}
                            {isMenuOpen && (
                              <div
                                ref={actionMenuRef}
                                className="absolute right-4 top-10 z-50 min-w-[180px] rounded-xl border border-slate-200/90 dark:border-border bg-white dark:bg-card p-1.5 shadow-xl animate-in fade-in-80 duration-150 text-left"
                              >
                                <button
                                  onClick={() => {
                                    setUsersList((prev) =>
                                      prev.map((u) =>
                                        u.id === user.id
                                          ? {
                                              ...u,
                                              status:
                                                u.status === "Enabled"
                                                  ? "Disabled"
                                                  : "Enabled",
                                            }
                                          : u
                                      )
                                    );
                                    setOpenActionRowId(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors"
                                >
                                  <UserX className="h-4 w-4 text-amber-500" />
                                  <span>
                                    {user.status === "Enabled"
                                      ? "Disable Account"
                                      : "Enable Account"}
                                  </span>
                                </button>

                                <button
                                  onClick={() => {
                                    alert(`Switched session to ${user.name} (${user.email})`);
                                    setOpenActionRowId(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition-colors"
                                >
                                  <LogIn className="h-4 w-4 text-purple-500" />
                                  <span>Login As User</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedUserForAction(user);
                                    setNewPasswordValue("");
                                    setIsChangePasswordOpen(true);
                                    setOpenActionRowId(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors"
                                >
                                  <Key className="h-4 w-4 text-amber-500" />
                                  <span>Change Password</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedUserForAction(user);
                                    setIsPermissionsOpen(true);
                                    setOpenActionRowId(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                                >
                                  <Shield className="h-4 w-4 text-blue-500" />
                                  <span>Permissions</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedUserForAction(user);
                                    setEditUserName(user.name);
                                    setEditUserEmail(user.email);
                                    setEditUserMobile(user.mobile);
                                    setIsEditUserOpen(true);
                                    setOpenActionRowId(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                                >
                                  <Pencil className="h-4 w-4 text-blue-500" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Are you sure you want to delete user ${user.name}?`
                                      )
                                    ) {
                                      setUsersList((prev) =>
                                        prev.filter((u) => u.id !== user.id)
                                      );
                                    }
                                    setOpenActionRowId(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-500" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer (Exact match to screenshot: Showing 21 to 26 of 26 results) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200/80 dark:border-border/80 bg-white dark:bg-card">
              <div className="text-xs text-slate-500">
                Showing {totalResults === 0 ? 0 : startIndex + 1} to {endIndex} of{" "}
                {totalResults} results
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {/* Previous Button */}
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                {/* Page Number Buttons: 1, 2, 3 */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition-colors ${
                      currentPage === page
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "border border-slate-200 dark:border-border text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-muted"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Next Button */}
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 2. 4 Colored KPI Stat Cards (Exact match to Screenshot 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4.5">
            {/* Total Users (Soft Blue) */}
            <div className="rounded-2xl border border-blue-200/90 dark:border-blue-900/60 bg-[#f0f7ff] dark:bg-blue-950/20 p-5 relative transition-all hover:shadow-xs">
              <div className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                Total Users
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2 tracking-tight">
                {totalUsers}
              </div>
              <div className="text-xs text-blue-500/90 dark:text-blue-400/80 mt-1 font-medium">
                {activeUsers} active
              </div>
              <div className="absolute right-5 top-5 text-blue-400 dark:text-blue-500">
                <Users className="h-7 w-7 stroke-[1.75]" />
              </div>
            </div>

            {/* Total Roles (Soft Purple) */}
            <div className="rounded-2xl border border-purple-200/90 dark:border-purple-900/60 bg-[#fbf7ff] dark:bg-purple-950/20 p-5 relative transition-all hover:shadow-xs">
              <div className="text-xs font-semibold text-purple-900 dark:text-purple-300">
                Total Roles
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2 tracking-tight">
                {totalRoles}
              </div>
              <div className="text-xs text-purple-500/90 dark:text-purple-400/80 mt-1 font-medium">
                access control groups
              </div>
              <div className="absolute right-5 top-5 text-purple-400 dark:text-purple-500">
                <Shield className="h-7 w-7 stroke-[1.75]" />
              </div>
            </div>

            {/* Total Customers (Soft Green) */}
            <div className="rounded-2xl border border-emerald-200/90 dark:border-emerald-900/60 bg-[#f0fbf5] dark:bg-emerald-950/20 p-5 relative transition-all hover:shadow-xs">
              <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                Total Customers
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
                {totalCustomers}
              </div>
              <div className="text-xs text-emerald-500/90 dark:text-emerald-400/80 mt-1 font-medium">
                Customer records
              </div>
              <div className="absolute right-5 top-5 text-emerald-400 dark:text-emerald-500">
                <UserCheck className="h-7 w-7 stroke-[1.75]" />
              </div>
            </div>

            {/* Total Vendors (Soft Orange) */}
            <div className="rounded-2xl border border-amber-200/90 dark:border-amber-900/60 bg-[#fffbf0] dark:bg-amber-950/20 p-5 relative transition-all hover:shadow-xs">
              <div className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                Total Vendors
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2 tracking-tight">
                {totalVendors}
              </div>
              <div className="text-xs text-amber-500/90 dark:text-amber-400/80 mt-1 font-medium">
                Vendor records
              </div>
              <div className="absolute right-5 top-5 text-amber-400 dark:text-amber-500">
                <ShoppingBag className="h-7 w-7 stroke-[1.75]" />
              </div>
            </div>
          </div>

          {/* 3. 3 Quick Action Cards (Exact match to Screenshot 2) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* + Add New User */}
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="group flex items-center justify-between rounded-xl border border-border/80 bg-card p-4 text-left transition-all hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Add New User</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </button>

            {/* 🛡️ Create Role */}
            <button
              onClick={() => setIsCreateRoleOpen(true)}
              className="group flex items-center justify-between rounded-xl border border-border/80 bg-card p-4 text-left transition-all hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-purple-600 dark:text-purple-400 font-semibold text-sm">
                <Shield className="h-4 w-4 stroke-[2.5]" />
                <span>Create Role</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </button>

            {/* 👤+ Add Customer */}
            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="group flex items-center justify-between rounded-xl border border-border/80 bg-card p-4 text-left transition-all hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <UserPlus className="h-4 w-4 stroke-[2.5]" />
                <span>Add Customer</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          {/* 4. Analytics Section: Users by Role & New Users This Year (Exact match to Screenshot 2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Users by Role */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[300px]">
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                Users by Role
              </h2>

              <div className="flex flex-1 items-center justify-center py-10 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  No role distribution data yet
                </p>
              </div>
            </div>

            {/* Right: New Users This Year (Interactive Bar Chart with tooltip on Jan) */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[300px]">
              <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                New Users This Year
              </h2>

              {/* Chart Canvas */}
              <div className="relative pt-6 pb-2">
                {/* Horizontal Grid lines with Y-Axis Values: 19, 15, 10, 5, 0 */}
                <div className="relative h-44 w-full border-b border-border/60">
                  {/* Y Ticks & Guidelines */}
                  {[
                    { label: "19", top: "0%" },
                    { label: "15", top: "21%" },
                    { label: "10", top: "47%" },
                    { label: "5", top: "73%" },
                    { label: "0", top: "100%" },
                  ].map((tick) => (
                    <div key={tick.label} className="absolute w-full flex items-center" style={{ top: tick.top }}>
                      <span className="text-[11px] text-muted-foreground font-mono w-6 text-right pr-2 select-none -translate-y-1/2">
                        {tick.label}
                      </span>
                      <div className="flex-1 border-t border-border/40" />
                    </div>
                  ))}

                  {/* Bars Grid for the 12 months */}
                  <div className="absolute inset-0 pl-7 pr-2 flex items-end justify-between">
                    {monthlyData.map((d) => {
                      const maxVal = 19;
                      const heightPercent = maxVal > 0 ? (d.count / maxVal) * 100 : 0;
                      const isHovered = hoveredMonth?.month === d.month;

                      return (
                        <div
                          key={d.month}
                          onMouseEnter={() => setHoveredMonth(d)}
                          className="relative flex flex-col items-center flex-1 h-full justify-end cursor-pointer group"
                        >
                          {/* Active / Hover column highlight like in screenshot */}
                          {isHovered && (
                            <div className="absolute inset-x-0.5 top-0 bottom-0 bg-slate-200/50 dark:bg-slate-700/30 rounded-t-sm z-0" />
                          )}

                          {/* Tooltip Box when hovered (Screenshot has 'Jan count : 0' floating box) */}
                          {isHovered && (
                            <div className="absolute -top-12 z-20 whitespace-nowrap rounded-md border border-border/80 bg-background/95 px-2.5 py-1 text-center shadow-md backdrop-blur-xs">
                              <div className="text-[11px] font-bold text-foreground">{d.month}</div>
                              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                count : {d.count}
                              </div>
                            </div>
                          )}

                          {/* Bar fill */}
                          {d.count > 0 ? (
                            <div
                              style={{ height: `${Math.max(6, heightPercent)}%` }}
                              className="w-full max-w-[22px] rounded-t-sm bg-blue-600 transition-all duration-300 group-hover:bg-blue-500 z-10"
                            />
                          ) : (
                            <div className="h-0.5 w-full max-w-[22px] bg-transparent z-10" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* X-Axis Month Labels */}
                <div className="pl-7 pr-2 flex justify-between pt-2">
                  {monthlyData.map((d) => (
                    <button
                      key={d.month}
                      onClick={() => setHoveredMonth(d)}
                      className={`flex-1 text-center text-[11px] font-medium transition-colors ${
                        hoveredMonth?.month === d.month
                          ? "text-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d.month}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Live Interactive Member Management Table */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  Company Users Directory
                </h2>
                <p className="text-xs text-muted-foreground">
                  Manage accounts, roles, access permissions, and account statuses.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsAddUserOpen(true)}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add User
                </Button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or role..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                {(["ALL", "ACTIVE", "INVITED", "SUSPENDED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      statusFilter === st
                        ? "bg-blue-600 text-white"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Members Table */}
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/70">
                  <tr>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No members found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.membershipId} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                              {member.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{member.fullName}</div>
                              <div className="text-[11px] text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[10px] font-semibold border-border/80">
                            {member.roleName}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              member.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : member.status === "INVITED"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                                : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {member.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: Add New User */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogHeader>
          <DialogTitle>Add New Company User</DialogTitle>
          <DialogDescription>
            Invite a colleague or team member to access this workspace with tailored permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Full Name</label>
            <Input
              placeholder="e.g. Sarah Jenkins"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Email Address</label>
            <Input
              type="email"
              placeholder="s.jenkins@bstc.local"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Role</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {initialRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} ({role.code})
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsAddUserOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              alert(`User invited: ${newUserName} (${newUserEmail})`);
              setIsAddUserOpen(false);
            }}
          >
            Send Invitation
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL 2: Create Role */}
      <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
        <DialogHeader>
          <DialogTitle>Create Custom Role</DialogTitle>
          <DialogDescription>
            Define a custom access tier and assign granular permissions for this role.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Role Display Name</label>
            <Input
              placeholder="e.g. Senior Tax Auditor"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Role Code Identifier</label>
            <Input
              placeholder="e.g. tax_auditor"
              value={newRoleCode}
              onChange={(e) => setNewRoleCode(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsCreateRoleOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => {
              alert(`Role created: ${newRoleName}`);
              setIsCreateRoleOpen(false);
            }}
          >
            Create Role
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL 3: Add Customer */}
      <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
        <DialogHeader>
          <DialogTitle>Add New Customer Record</DialogTitle>
          <DialogDescription>
            Register a commercial client into the CRM and billing ledger.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Customer / Company Name</label>
            <Input
              placeholder="e.g. Apex Global Logistics Ltd"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Billing Email</label>
            <Input
              type="email"
              placeholder="accounts@apexlogistics.com"
              value={newCustomerEmail}
              onChange={(e) => setNewCustomerEmail(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsAddCustomerOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {
              alert(`Customer created: ${newCustomerName}`);
              setIsAddCustomerOpen(false);
            }}
          >
            Save Customer
          </Button>
        </DialogFooter>
      </Dialog>
      {/* MODAL 4: Child Companies */}
      <Dialog open={isChildCompaniesOpen} onOpenChange={setIsChildCompaniesOpen}>
        <DialogHeader>
          <DialogTitle>Child Companies & Branch Entities</DialogTitle>
          <DialogDescription>
            Multi-entity hierarchy, regional branches, and subsidiary corporate registrations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/60">
            <div className="p-3 bg-muted/20 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-foreground">BSTC Corporate Headquarters — Islamabad</div>
                <div className="text-[11px] text-muted-foreground">NTN: 8291048-1 • Principal Tax Advisory</div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                Active Head Office
              </Badge>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-foreground">BSTC Regional Advisory — Lahore</div>
                <div className="text-[11px] text-muted-foreground">NTN: 8291048-2 • Regional Audit Office</div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                Active Branch
              </Badge>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-foreground">BSTC Financial Services Ltd — Karachi</div>
                <div className="text-[11px] text-muted-foreground">NTN: 8291048-3 • Commercial Subsidiary</div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                Active Subsidiary
              </Badge>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsChildCompaniesOpen(false)}>
            Close
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              alert("Branch registration form ready.");
              setIsChildCompaniesOpen(false);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Child Entity
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL 5: Vendor Directory */}
      <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
        <DialogHeader>
          <DialogTitle>Vendor Directory & Commercial Suppliers</DialogTitle>
          <DialogDescription>
            Manage vendor records, procurement contracts, and accounts payable.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
            <ShoppingBag className="h-7 w-7 mx-auto mb-2 text-amber-500" />
            <p className="font-semibold text-foreground">No External Vendor Records Registered</p>
            <p className="mt-1">Add your utility suppliers, software vendors, and contractors to track bills and batch payments.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsVendorModalOpen(false)}>
            Close
          </Button>
          <Link href="/finance">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              Open Finance & Expenses
            </Button>
          </Link>
        </DialogFooter>
      </Dialog>

      {/* MODAL 6: Change Password */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Update login credentials for {selectedUserForAction?.name || "the user"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">User Email</label>
            <Input
              value={selectedUserForAction?.email || ""}
              disabled
              className="h-8 text-xs bg-muted/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">New Secure Password</label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={newPasswordValue}
              onChange={(e) => setNewPasswordValue(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsChangePasswordOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => {
              alert(`Password successfully updated for ${selectedUserForAction?.name}.`);
              setIsChangePasswordOpen(false);
            }}
          >
            Update Password
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL 7: Permissions */}
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogHeader>
          <DialogTitle>User Permissions</DialogTitle>
          <DialogDescription>
            Granular module and security permissions for {selectedUserForAction?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div className="rounded-xl border border-border/80 divide-y divide-border/60 p-2 text-xs">
            <div className="flex items-center justify-between p-2">
              <div>
                <div className="font-semibold text-foreground">Sales & Invoicing</div>
                <div className="text-[11px] text-muted-foreground">Create and manage client invoices</div>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-blue-600" />
            </div>
            <div className="flex items-center justify-between p-2">
              <div>
                <div className="font-semibold text-foreground">Customer Ledger</div>
                <div className="text-[11px] text-muted-foreground">View client balances and payment history</div>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-blue-600" />
            </div>
            <div className="flex items-center justify-between p-2">
              <div>
                <div className="font-semibold text-foreground">Accounting & Reports</div>
                <div className="text-[11px] text-muted-foreground">Access tax returns and audit reports</div>
              </div>
              <input type="checkbox" className="h-4 w-4 rounded accent-blue-600" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsPermissionsOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              alert(`Permissions updated for ${selectedUserForAction?.name}.`);
              setIsPermissionsOpen(false);
            }}
          >
            Save Permissions
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL 8: Edit User */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
          <DialogDescription>
            Update profile details for {selectedUserForAction?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Name</label>
            <Input
              value={editUserName}
              onChange={(e) => setEditUserName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Email</label>
            <Input
              value={editUserEmail}
              onChange={(e) => setEditUserEmail(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Mobile No</label>
            <Input
              value={editUserMobile}
              onChange={(e) => setEditUserMobile(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsEditUserOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              if (selectedUserForAction) {
                setUsersList((prev) =>
                  prev.map((u) =>
                    u.id === selectedUserForAction.id
                      ? {
                          ...u,
                          name: editUserName,
                          email: editUserEmail,
                          mobile: editUserMobile,
                        }
                      : u
                  )
                );
              }
              setIsEditUserOpen(false);
            }}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
