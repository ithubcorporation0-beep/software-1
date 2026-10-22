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
          { title: "Customer Directory", href: "/account/customers" },
          { title: "Customer Payments & Receipts", href: "/account/customer-payments" },
          { title: "Due & Batch Clearance", href: "/account/customer-payments/due-batch" },
          { title: "Customer Ledger Statements", href: "/account/reports/customer-ledger" },
          { title: "A/R Aging & Receivables Report", href: "/account/reports/customer-report" },
          { title: "Customer Groups & Setup", href: "/account/customer-groups" },
          { title: "Trade Categories Setup", href: "/account/customer-categories" },
          { title: "Lead Center & CRM", href: "/crm" },
        ],
      },
      {
        title: "Invoices & Sales",
        href: "/sales",
        icon: ShoppingCart,
        children: [
          { title: "Sales Invoices (A/R)", href: "/sales" },
          { title: "Sales Receipts", href: "/sales" },
          { title: "Estimates & Quotations", href: "/sales" },
          { title: "Sales Orders Pipeline", href: "/sales" },
          { title: "Credit Notes & Returns", href: "/sales" },
        ],
      },
    ],
  },
  {
    title: "Suppliers & Expenses",
    items: [
      {
        title: "Vendors & Bills",
        href: "/finance",
        icon: Banknote,
        children: [
          { title: "Vendor Center (Suppliers)", href: "/finance" },
          { title: "Enter Bills (A/P)", href: "/finance" },
          { title: "Pay Bills & Disburse Funds", href: "/finance" },
          { title: "Direct Operational Expenses", href: "/finance" },
          { title: "Purchase Orders (PO)", href: "/inventory" },
          { title: "Vendor Credits & Refunds", href: "/finance" },
          { title: "A/P Aging & Payables Summary", href: "/finance" },
        ],
      },
    ],
  },
  {
    title: "Accounting",
    items: [
      {
        title: "General Ledger & COA",
        href: "/modules/accounting",
        icon: Landmark,
        children: [
          { title: "Chart of Accounts (COA)", href: "/accounting/chart-of-accounts" },
          { title: "Make Journal Entries (JV)", href: "/modules/accounting" },
          { title: "Bank Reconciliations", href: "/modules/accounting" },
          { title: "Transfer Funds Between Accounts", href: "/modules/accounting" },
          { title: "Write Checks & Disburse Funds", href: "/modules/accounting" },
          { title: "Account Registers", href: "/accounting/chart-of-accounts" },
        ],
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      {
        title: "Items & Inventory",
        href: "/inventory",
        icon: Package,
        children: [
          { title: "Items & Services List", href: "/inventory" },
          { title: "Inventory Adjustments", href: "/inventory" },
          { title: "Stock Valuation & Quantities", href: "/inventory" },
          { title: "Low Stock & Reorder Alerts", href: "/inventory" },
        ],
      },
    ],
  },
  {
    title: "Tax & FBR",
    items: [
      {
        title: "FBR Digital Invoicing",
        href: "/settings?tab=fbr",
        icon: FileCheck2,
        badge: "FBR",
        children: [
          { title: "FBR Digital Invoicing Hub", href: "/settings?tab=fbr" },
          { title: "Verify Active Taxpayer (ATL)", href: "/account/customers" },
          { title: "Sales Tax Return Registers (18%)", href: "/reports" },
          { title: "Provincial Services Tax (SRB/PRA)", href: "/reports" },
          { title: "Withholding Tax Ledger (Sec 153)", href: "/reports" },
          { title: "Production FBR Sync & Audit", href: "/settings?tab=fbr" },
        ],
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        title: "Report Center",
        href: "/reports",
        icon: BarChart3,
        children: [
          { title: "Financial: Profit & Loss (P&L)", href: "/reports" },
          { title: "Financial: Balance Sheet Standard", href: "/reports" },
          { title: "Financial: Statement of Cash Flows", href: "/reports" },
          { title: "Financial: Trial Balance", href: "/modules/accounting" },
          { title: "Customers: A/R Aging Summary", href: "/account/reports/customer-report" },
          { title: "Customers: Customer Ledger Statements", href: "/account/reports/customer-ledger" },
          { title: "Vendors: A/P Aging Summary", href: "/finance" },
          { title: "Sales & Invoicing Analysis", href: "/sales" },
        ],
      },
    ],
  },
  {
    title: "Personnel & Payroll",
    items: [
      {
        title: "Staff & Payroll",
        href: "/payroll",
        icon: CreditCard,
        children: [
          { title: "Employee Directory & Profiles", href: "/hr" },
          { title: "Run Payroll & Disburse Salaries", href: "/payroll" },
          { title: "Attendance & Time Records", href: "/hr" },
          { title: "Leave Approvals & Tracking", href: "/hr" },
        ],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Company & Users",
        href: "/settings",
        icon: Settings,
        children: [
          { title: "Users & Roles (RBAC)", href: "/modules/user-management" },
          { title: "Company Settings & Fiscal Year", href: "/settings" },
          { title: "Audit Trail & Security Logs", href: "/admin/audit-logs" },
          { title: "Company Workspaces & Tenants", href: "/admin/companies" },
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
                          {item.children!.map((child) => {
                            const isCurrentChild =
                              child.href === "/"
                                ? pathname === "/"
                                : pathname === child.href;
                            return (
                              <Link
                                key={child.title}
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
