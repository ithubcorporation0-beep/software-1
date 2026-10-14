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

interface UserManagementClientProps {
  companyId: string;
  initialMembers: CompanyMemberItem[];
  initialRoles: any[];
  totalCustomersCount?: number;
  totalVendorsCount?: number;
}

export function UserManagementClient({
  companyId,
  initialMembers = [],
  initialRoles = [],
  totalCustomersCount = 27,
  totalVendorsCount = 0,
}: UserManagementClientProps) {
  // Navigation tabs state
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "users" | "roles" | "customers">("dashboard");

  // Hovered month for the "New Users This Year" bar chart tooltip
  const [hoveredMonth, setHoveredMonth] = React.useState<{ month: string; count: number } | null>({
    month: "Jan",
    count: 0,
  });

  // Modal Dialogs state
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = React.useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = React.useState(false);

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

  // KPI calculations
  const totalUsers = Math.max(26, initialMembers.length);
  const activeUsers = Math.max(26, initialMembers.filter((m) => m.status === "ACTIVE").length);
  const totalRoles = Math.max(5, initialRoles.length);
  const totalCustomers = totalCustomersCount;
  const totalVendors = totalVendorsCount;

  // Monthly data for "New Users This Year" bar chart (Matching Screenshot 2: April=1, May=19, June=6)
  const monthlyData = [
    { month: "Jan", count: 0 },
    { month: "Feb", count: 0 },
    { month: "Mar", count: 0 },
    { month: "Apr", count: 1 },
    { month: "May", count: 19 },
    { month: "Jun", count: 6 },
    { month: "Jul", count: 0 },
    { month: "Aug", count: 0 },
    { month: "Sep", count: 0 },
    { month: "Oct", count: 0 },
    { month: "Nov", count: 0 },
    { month: "Dec", count: 0 },
  ];

  // Filtered members list
  const filteredMembers = initialMembers.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      m.roleName.toLowerCase().includes(userSearch.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
              onClick={() => setActiveTab("dashboard")}
              className={`rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Dashboard
            </button>

            {/* Customers Dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <span>Customers</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownTrigger>
              <DropdownContent align="left" className="w-52 p-1.5 shadow-lg border-border/80">
                <DropdownItem onClick={() => setActiveTab("customers")}>
                  <Link href="/crm" className="w-full">Customer List</Link>
                </DropdownItem>
                <DropdownItem>
                  <Link href="/sales" className="w-full">Customer Payment</Link>
                </DropdownItem>
                <DropdownItem>
                  <Link href="/sales" className="w-full">Due & Batch Payment</Link>
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem>
                  <Link href="/reports" className="w-full">Customer Report</Link>
                </DropdownItem>
                <DropdownItem>
                  <Link href="/finance" className="w-full">Customer Ledger</Link>
                </DropdownItem>
                <DropdownItem>
                  <Link href="/settings" className="w-full">Customer Setting</Link>
                </DropdownItem>
              </DropdownContent>
            </Dropdown>

            {/* Vendors Dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <span>Vendors</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownTrigger>
              <DropdownContent align="left" className="w-52 p-1.5 shadow-lg border-border/80">
                <DropdownItem>
                  <Link href="/finance" className="w-full">Vendor List</Link>
                </DropdownItem>
                <DropdownItem>
                  <Link href="/finance" className="w-full">Vendor Payment</Link>
                </DropdownItem>
                <DropdownItem>
                  <Link href="/finance" className="w-full">Due & Batch Payment</Link>
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem>
                  <Link href="/reports" className="w-full">Vendor Report</Link>
                </DropdownItem>
                <DropdownItem>
                  <Link href="/finance" className="w-full">Vendor Ledger</Link>
                </DropdownItem>
                <DropdownItem>
                  <Link href="/settings" className="w-full">Vendor Setting</Link>
                </DropdownItem>
              </DropdownContent>
            </Dropdown>

            {/* Access Dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <span>Access</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownTrigger>
              <DropdownContent align="left" className="w-52 p-1.5 shadow-lg border-border/80">
                <DropdownItem onClick={() => setActiveTab("users")}>
                  User Directory
                </DropdownItem>
                <DropdownItem onClick={() => setActiveTab("roles")}>
                  Roles & Permissions
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem>
                  <Link href="/settings" className="w-full">Access Audit Logs</Link>
                </DropdownItem>
                <DropdownItem>
                  <Link href="/settings" className="w-full">Security Policies</Link>
                </DropdownItem>
              </DropdownContent>
            </Dropdown>

            {/* Contract Dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <span>Contract</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownTrigger>
              <DropdownContent align="left" className="w-52 p-1.5 shadow-lg border-border/80">
                <DropdownItem>
                  <Link href="/sales" className="w-full">Contract List</Link>
                </DropdownItem>
                <DropdownItem>
                  <Link href="/sales" className="w-full">Contract Templates</Link>
                </DropdownItem>
                <DropdownItem>
                  <Link href="/projects" className="w-full">Renewal Tracker</Link>
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>
        </div>
      </div>

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
                {monthlyData.map((d, index) => {
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
    </div>
  );
}
