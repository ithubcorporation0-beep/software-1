"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Receipt,
  Banknote,
  Landmark,
  Package,
  FileCheck2,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  FileText,
  CreditCard,
  BookOpen,
  ArrowRightLeft,
  Briefcase,
  UserCheck,
  Lock,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface SubNavItem {
  title: string;
  href: string;
  badge?: string;
  sectionHeader?: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: SubNavItem[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const desktopNavigationConfig: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Customers & Sales",
    items: [
      {
        title: "Customers Center",
        href: "/account/customers",
        icon: Users,
        children: [
          { sectionHeader: "Directories & Lists", title: "Customer Directory & Accounts", href: "/account/customers" },
          { sectionHeader: "Directories & Lists", title: "Add New Customer Record", href: "/account/customers" },
          { sectionHeader: "Directories & Lists", title: "Customer Groups & Credit Tiers", href: "/account/customer-groups" },
          { sectionHeader: "Directories & Lists", title: "Trade Categories & Terms", href: "/account/customer-categories" },
          { sectionHeader: "Directories & Lists", title: "Lead Center & Sales Pipeline", href: "/crm" },
          { sectionHeader: "Receivables & Payments", title: "Customer Payments & Receipts", href: "/account/customer-payments" },
          { sectionHeader: "Receivables & Payments", title: "Receive Payments (Cash/Bank)", href: "/account/customer-payments" },
          { sectionHeader: "Receivables & Payments", title: "Due Invoices & Batch Settlement", href: "/account/customer-payments/due-batch" },
          { sectionHeader: "Ledgers & Aging Reports", title: "Customer Ledger Statements", href: "/account/reports/customer-ledger" },
          { sectionHeader: "Ledgers & Aging Reports", title: "A/R Aging Summary Report", href: "/account/reports/customer-report" },
          { sectionHeader: "Ledgers & Aging Reports", title: "Customer Balance Detail", href: "/account/reports/customer-report" },
        ],
      },
      {
        title: "Invoices & Sales",
        href: "/sales",
        icon: ShoppingCart,
        children: [
          { sectionHeader: "Sales Transactions", title: "Sales Invoices (A/R)", href: "/sales" },
          { sectionHeader: "Sales Transactions", title: "Sales Receipts & Cash Counter", href: "/sales" },
          { sectionHeader: "Sales Transactions", title: "Estimates, Quotes & Proposals", href: "/sales" },
          { sectionHeader: "Sales Transactions", title: "Sales Orders Pipeline", href: "/sales" },
          { sectionHeader: "Sales Transactions", title: "Credit Notes & Returns", href: "/sales" },
          { sectionHeader: "Reports & Schedules", title: "Sales by Customer Summary", href: "/sales" },
          { sectionHeader: "Reports & Schedules", title: "Sales by Item & Service", href: "/sales" },
          { sectionHeader: "Reports & Schedules", title: "Recurring Scheduled Invoices", href: "/sales" },
        ],
      },
    ],
  },
  {
    title: "Suppliers & Payables",
    items: [
      {
        title: "Vendors & Bills",
        href: "/finance",
        icon: Banknote,
        children: [
          { sectionHeader: "Suppliers & Orders", title: "Vendor Center & Suppliers", href: "/finance" },
          { sectionHeader: "Suppliers & Orders", title: "Add New Supplier Profile", href: "/finance" },
          { sectionHeader: "Suppliers & Orders", title: "Purchase Orders (PO)", href: "/inventory" },
          { sectionHeader: "Bills & Disbursements", title: "Enter Bills (A/P)", href: "/finance" },
          { sectionHeader: "Bills & Disbursements", title: "Pay Bills & Disburse Funds", href: "/finance" },
          { sectionHeader: "Bills & Disbursements", title: "Direct Operating Expenses", href: "/finance" },
          { sectionHeader: "Bills & Disbursements", title: "Write Checks & Bank Outflows", href: "/modules/accounting" },
          { sectionHeader: "Bills & Disbursements", title: "Vendor Credits & Refunds", href: "/finance" },
          { sectionHeader: "Payables & Aging", title: "A/P Aging Summary", href: "/finance" },
          { sectionHeader: "Payables & Aging", title: "Unpaid Bills Detail", href: "/finance" },
          { sectionHeader: "Payables & Aging", title: "Vendor Balance Detail", href: "/finance" },
        ],
      },
    ],
  },
  {
    title: "Banking & Cash",
    items: [
      {
        title: "Banking Center",
        href: "/modules/accounting",
        icon: Landmark,
        children: [
          { sectionHeader: "Banking Operations", title: "Bank Accounts & Registers", href: "/accounting/chart-of-accounts" },
          { sectionHeader: "Banking Operations", title: "Reconcile Bank Statements", href: "/modules/accounting" },
          { sectionHeader: "Banking Operations", title: "Transfer Funds Between Accounts", href: "/modules/accounting" },
          { sectionHeader: "Banking Operations", title: "Record Deposits & Undeposited", href: "/modules/accounting" },
          { sectionHeader: "Banking Operations", title: "Write Checks & Payment Vouchers", href: "/modules/accounting" },
          { sectionHeader: "Cash Flow & Audit", title: "General Ledger Cash Register", href: "/accounting/chart-of-accounts" },
          { sectionHeader: "Cash Flow & Audit", title: "Statement of Cash Flows", href: "/reports" },
          { sectionHeader: "Cash Flow & Audit", title: "Cash Flow Monitor & Forecast", href: "/reports" },
        ],
      },
    ],
  },
  {
    title: "Accounting & Ledger",
    items: [
      {
        title: "General Ledger & COA",
        href: "/modules/accounting",
        icon: BookOpen,
        children: [
          { sectionHeader: "Chart of Accounts & Registers", title: "Chart of Accounts (COA)", href: "/accounting/chart-of-accounts" },
          { sectionHeader: "Chart of Accounts & Registers", title: "Account Registers (Balance Sheet)", href: "/accounting/chart-of-accounts" },
          { sectionHeader: "Chart of Accounts & Registers", title: "General Ledger Detail Report", href: "/modules/accounting" },
          { sectionHeader: "Journal Entries & Audit", title: "Make General Journal Entries (JV)", href: "/modules/accounting" },
          { sectionHeader: "Journal Entries & Audit", title: "Trial Balance Summary & Detail", href: "/modules/accounting" },
          { sectionHeader: "Journal Entries & Audit", title: "Fixed Asset Register & Depreciation", href: "/accounting/chart-of-accounts" },
          { sectionHeader: "Journal Entries & Audit", title: "Closing Books & Period Locking", href: "/settings" },
          { sectionHeader: "Journal Entries & Audit", title: "Adjusting Journal Entries", href: "/modules/accounting" },
        ],
      },
    ],
  },
  {
    title: "Inventory & Items",
    items: [
      {
        title: "Items & Inventory",
        href: "/inventory",
        icon: Package,
        children: [
          { sectionHeader: "Items Catalog", title: "Items & Services Master List", href: "/inventory" },
          { sectionHeader: "Items Catalog", title: "Add New Inventory Item", href: "/inventory" },
          { sectionHeader: "Items Catalog", title: "Add New Professional Service", href: "/inventory" },
          { sectionHeader: "Stock Control & Valuation", title: "Inventory Quantity Adjustments", href: "/inventory" },
          { sectionHeader: "Stock Control & Valuation", title: "Stock Valuation & Quantities", href: "/inventory" },
          { sectionHeader: "Stock Control & Valuation", title: "Low Stock & Reorder Level Alerts", href: "/inventory" },
          { sectionHeader: "Stock Control & Valuation", title: "Physical Inventory Worksheet", href: "/inventory" },
        ],
      },
    ],
  },
  {
    title: "Tax & FBR Compliance",
    items: [
      {
        title: "FBR Digital Invoicing",
        href: "/settings?tab=fbr",
        icon: FileCheck2,
        badge: "FBR",
        children: [
          { sectionHeader: "FBR Digital Invoicing", title: "FBR Digital Invoicing Hub", href: "/settings?tab=fbr" },
          { sectionHeader: "FBR Digital Invoicing", title: "Verify Active Taxpayer (ATL)", href: "/account/customers" },
          { sectionHeader: "FBR Digital Invoicing", title: "Production Transmission & Audit", href: "/settings?tab=fbr" },
          { sectionHeader: "Statutory Tax Registers", title: "Sales Tax Registers (Annexure-C 18%)", href: "/reports" },
          { sectionHeader: "Statutory Tax Registers", title: "Provincial Services Tax (SRB/PRA)", href: "/reports" },
          { sectionHeader: "Statutory Tax Registers", title: "Withholding Tax Ledger (Sec 153)", href: "/reports" },
          { sectionHeader: "Statutory Tax Registers", title: "Payroll Withholding Ledger (Sec 149)", href: "/reports" },
        ],
      },
    ],
  },
  {
    title: "Reports & Financials",
    items: [
      {
        title: "Report Center",
        href: "/reports",
        icon: BarChart3,
        children: [
          { sectionHeader: "Company & Financial", title: "Profit & Loss (P&L Standard)", href: "/reports" },
          { sectionHeader: "Company & Financial", title: "Balance Sheet Standard", href: "/reports" },
          { sectionHeader: "Company & Financial", title: "Statement of Cash Flows", href: "/reports" },
          { sectionHeader: "Company & Financial", title: "Trial Balance (Debit / Credit)", href: "/modules/accounting" },
          { sectionHeader: "Receivables & Sales", title: "Customer Ledger Statements", href: "/account/reports/customer-ledger" },
          { sectionHeader: "Receivables & Sales", title: "A/R Aging Summary Report", href: "/account/reports/customer-report" },
          { sectionHeader: "Receivables & Sales", title: "Sales & Invoicing Analysis", href: "/sales" },
          { sectionHeader: "Payables & Purchases", title: "A/P Aging Summary", href: "/finance" },
          { sectionHeader: "Payables & Purchases", title: "Vendor Ledger Statements", href: "/finance" },
          { sectionHeader: "Tax & Compliance", title: "FBR Sales Tax Return Register", href: "/reports" },
          { sectionHeader: "Tax & Compliance", title: "Withholding Tax Deductions Report", href: "/reports" },
        ],
      },
    ],
  },
  {
    title: "Staff & Payroll",
    items: [
      {
        title: "Personnel Center",
        href: "/payroll",
        icon: CreditCard,
        children: [
          { sectionHeader: "Employees & Directory", title: "Employee Directory & Profiles", href: "/hr" },
          { sectionHeader: "Employees & Directory", title: "Add New Employee Profile", href: "/hr" },
          { sectionHeader: "Payroll & Compensation", title: "Run Monthly Payroll Batches", href: "/payroll" },
          { sectionHeader: "Payroll & Compensation", title: "Salary Pay Slips & Advice", href: "/payroll" },
          { sectionHeader: "Payroll & Compensation", title: "Payroll Tax Withholding (Sec 149)", href: "/payroll" },
          { sectionHeader: "Time & Attendance", title: "Attendance & Time Records", href: "/hr" },
          { sectionHeader: "Time & Attendance", title: "Leave Entitlements & Approvals", href: "/hr" },
        ],
      },
    ],
  },
  {
    title: "Administration & Settings",
    items: [
      {
        title: "Company & Users",
        href: "/settings",
        icon: Settings,
        children: [
          { sectionHeader: "Access & Security", title: "Users & Roles (RBAC Permissions)", href: "/modules/user-management" },
          { sectionHeader: "Access & Security", title: "Audit Trail & Activity Logs", href: "/admin/audit-logs" },
          { sectionHeader: "Company Preferences", title: "Company Settings & Fiscal Year", href: "/settings" },
          { sectionHeader: "Company Preferences", title: "Company Workspaces & Tenants", href: "/admin/companies" },
          { sectionHeader: "Company Preferences", title: "System Preferences & Numbering", href: "/settings" },
        ],
      },
    ],
  },
];

export const navigationConfig = desktopNavigationConfig;

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>({
    "Customers Center": true,
    "General Ledger & COA": true,
  });

  const toggleMenu = (title: string) => {
    setExpandedMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside
      aria-label="Desktop Accounting Navigation"
      className={cn(
        "flex h-screen flex-col border-r border-[#2d3742] bg-[#1a2026] text-[#cbd5e1] select-none transition-all duration-200 z-30 shrink-0",
        collapsed ? "w-14" : "w-64",
        className
      )}
    >
      {/* Enterprise Workspace Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#2d3742] px-3 bg-[#151a1f]">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2.5 overflow-hidden transition-all",
            collapsed && "justify-center w-full"
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#0078d4] text-white font-bold text-xs tracking-wider shadow-sm">
            IT
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold tracking-tight text-white truncate">
                IT-HUB ERP
              </span>
              <span className="text-[10px] text-[#94a3b8] flex items-center gap-1 truncate font-medium">
                <Building2 className="h-2.5 w-2.5 shrink-0 text-[#64748b]" />
                Enterprise Edition
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-1.5 py-2 space-y-3 custom-desktop-scrollbar">
        {desktopNavigationConfig.map((section) => (
          <div key={section.title} className="space-y-0.5">
            {!collapsed && (
              <h4 className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                {section.title}
              </h4>
            )}
            <nav className="space-y-0.5" aria-label={section.title}>
              {section.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || (item.href !== "/settings" && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;

                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = !!expandedMenus[item.title];
                const isChildActive =
                  hasChildren &&
                  item.children!.some(
                    (c) =>
                      pathname === c.href ||
                      (c.href !== "/" && c.href !== "/settings" && pathname.startsWith(`${c.href}/`))
                  );
                const isItemActive = isActive || isChildActive;

                if (hasChildren && !collapsed) {
                  return (
                    <div key={item.title} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => toggleMenu(item.title)}
                        className={cn(
                          "w-full group flex items-center justify-between rounded px-2 py-1.5 text-xs font-medium transition-colors outline-none text-left",
                          isItemActive
                            ? "bg-[#252c34] text-white font-semibold"
                            : "text-[#cbd5e1] hover:bg-[#252c34] hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 transition-colors",
                              isItemActive ? "text-[#38bdf8]" : "text-[#94a3b8] group-hover:text-white"
                            )}
                          />
                          <span className="truncate">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.badge && (
                            <span className="rounded bg-[#0284c7]/20 border border-[#0284c7]/40 px-1 py-0 text-[9px] font-semibold text-[#38bdf8]">
                              {item.badge}
                            </span>
                          )}
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 text-[#64748b] transition-transform duration-150",
                              isExpanded && "rotate-180 text-[#94a3b8]"
                            )}
                          />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="pl-3.5 pr-1 space-y-0.5 pt-0.5 border-l border-[#2d3742] ml-3.5">
                          {item.children!.map((child, idx) => {
                            const isCurrentChild =
                              child.href === "/"
                                ? pathname === "/"
                                : pathname === child.href;
                            const showHeader =
                              child.sectionHeader &&
                              (idx === 0 || item.children![idx - 1].sectionHeader !== child.sectionHeader);

                            return (
                              <React.Fragment key={child.title + idx}>
                                {showHeader && (
                                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#94a3b8]/70 pt-2 pb-0.5 px-2 select-none border-t border-[#2d3742]/40 first:border-t-0 first:pt-1">
                                    {child.sectionHeader}
                                  </div>
                                )}
                                <Link
                                  href={child.href}
                                  prefetch={true}
                                  className={cn(
                                    "block rounded px-2 py-1 text-[11px] transition-colors truncate",
                                    isCurrentChild
                                      ? "bg-[#0078d4] text-white font-semibold shadow-xs"
                                      : "text-[#94a3b8] hover:text-white hover:bg-[#252c34]"
                                  )}
                                >
                                  {child.title}
                                </Link>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    title={collapsed ? item.title : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2 rounded px-2 py-1.5 text-xs font-medium transition-colors outline-none",
                      isActive
                        ? "bg-[#0078d4] text-white font-semibold shadow-xs"
                        : "text-[#cbd5e1] hover:bg-[#252c34] hover:text-white",
                      collapsed && "justify-center px-1.5 py-1.5"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors",
                        isActive ? "text-white" : "text-[#94a3b8] group-hover:text-white"
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.title}</span>}

                    {!collapsed && item.badge && (
                      <span className="ml-auto rounded bg-[#0284c7]/20 border border-[#0284c7]/40 px-1 py-0 text-[9px] font-semibold text-[#38bdf8]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer / Collapse Toggle */}
      <div className="border-t border-[#2d3742] p-2 text-xs bg-[#151a1f]">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-1.5 text-[10px] text-[#94a3b8] truncate px-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="truncate font-medium">Enterprise Cloud RLS</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded text-[#94a3b8] hover:bg-[#252c34] hover:text-white transition-colors",
              collapsed && "w-full"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
