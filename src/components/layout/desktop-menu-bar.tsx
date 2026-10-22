"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Command,
  Building2,
  Users,
  CreditCard,
  Receipt,
  BookOpen,
  PieChart,
  ShieldCheck,
  HelpCircle,
  LogOut,
  Settings,
  Printer,
  ChevronDown,
  Check,
  Layers,
  Sparkles,
} from "lucide-react";

interface MenuItem {
  label: string;
  href?: string;
  onClick?: () => void;
  shortcut?: string;
  divider?: boolean;
  disabled?: boolean;
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export function DesktopMenuBar({
  onOpenSearch,
  onOpenQuickCreate,
}: {
  onOpenSearch: () => void;
  onOpenQuickCreate: () => void;
}) {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);
  const menuContainerRef = React.useRef<HTMLDivElement>(null);

  // Close menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menus: MenuCategory[] = [
    {
      title: "File",
      items: [
        { label: "New Company / Workspace", href: "/admin/companies", shortcut: "Ctrl+N" },
        { label: "Company Settings & Preferences", href: "/settings", shortcut: "Ctrl+," },
        { label: "Print Active Screen", onClick: () => window.print(), shortcut: "Ctrl+P", divider: true },
        { label: "Export System Audit Trail", href: "/admin/audit-logs", divider: true },
        { label: "Close Window / Return to Dashboard", href: "/", shortcut: "Esc" },
        {
          label: "Exit / Sign Out",
          onClick: async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
          },
        },
      ],
    },
    {
      title: "Edit",
      items: [
        { label: "Search ERP Records...", onClick: onOpenSearch, shortcut: "Ctrl+K" },
        { label: "Quick Create Transaction...", onClick: onOpenQuickCreate, shortcut: "Alt+N", divider: true },
        { label: "Preferences & System Configuration", href: "/settings" },
        { label: "Notification Settings", href: "/notifications" },
      ],
    },
    {
      title: "View",
      items: [
        { label: "Dashboard Overview", href: "/", shortcut: "Ctrl+1" },
        { label: "Sales & Invoicing", href: "/sales", shortcut: "Ctrl+2" },
        { label: "Customer Center", href: "/account/customers", shortcut: "Ctrl+3" },
        { label: "Expenses & Vendor Bills", href: "/finance", shortcut: "Ctrl+4" },
        { label: "Chart of Accounts (COA)", href: "/accounting/chart-of-accounts", shortcut: "Ctrl+5", divider: true },
        { label: "Refresh Application Cache", onClick: () => window.location.reload(), shortcut: "F5" },
      ],
    },
    {
      title: "Lists",
      items: [
        { label: "Chart of Accounts", href: "/accounting/chart-of-accounts" },
        { label: "Customer Directory", href: "/account/customers" },
        { label: "Customer Groups & Setup", href: "/account/customer-groups" },
        { label: "Trade Categories Setup", href: "/account/customer-categories" },
        { label: "Product & Inventory Item List", href: "/inventory", divider: true },
        { label: "Vendor / Supplier List", href: "/finance" },
        { label: "Employee & Personnel List", href: "/hr" },
        { label: "Fixed Assets Register", href: "/accounting/chart-of-accounts" },
      ],
    },
    {
      title: "Company",
      items: [
        { label: "Company Information & Logo", href: "/settings" },
        { label: "Chart of Accounts", href: "/accounting/chart-of-accounts" },
        { label: "Make General Journal Entries (JV)", href: "/modules/accounting", divider: true },
        { label: "Users & Roles (RBAC Permissions)", href: "/modules/user-management" },
        { label: "Payroll & Compensation Runs", href: "/payroll" },
        { label: "Staff Attendance & Leave", href: "/hr" },
        { label: "Reminders & Alerts", href: "/notifications" },
      ],
    },
    {
      title: "Customers",
      items: [
        { label: "Customer Center", href: "/account/customers" },
        { label: "Create Sales Invoices", href: "/sales", shortcut: "Ctrl+I" },
        { label: "Receive Payments", href: "/account/customer-payments" },
        { label: "Enter Sales Receipts", href: "/sales" },
        { label: "Create Estimates / Quotes", href: "/sales" },
        { label: "Due & Batch Clearance", href: "/account/customer-payments/due-batch", divider: true },
        { label: "Customer Ledger Statement", href: "/account/reports/customer-ledger" },
        { label: "Customer Receivables & Aging Report", href: "/account/reports/customer-report" },
        { label: "Customer Groups & Categories", href: "/account/customer-groups" },
        { label: "Lead Center (CRM)", href: "/crm" },
      ],
    },
    {
      title: "Vendors",
      items: [
        { label: "Vendor Center", href: "/finance" },
        { label: "Enter Bills (A/P)", href: "/finance" },
        { label: "Pay Bills & Disburse Funds", href: "/finance" },
        { label: "Record Direct Expense", href: "/finance" },
        { label: "Create Purchase Orders", href: "/inventory", divider: true },
        { label: "Accounts Payable (A/P) Aging", href: "/finance" },
        { label: "Pay FBR Sales Tax / Withholding", href: "/settings?tab=fbr" },
      ],
    },
    {
      title: "Banking",
      items: [
        { label: "Write Checks / Disburse Payment", href: "/modules/accounting" },
        { label: "Transfer Funds Between Accounts", href: "/modules/accounting" },
        { label: "Reconcile Bank Accounts", href: "/modules/accounting" },
        { label: "Bank Account Registers", href: "/accounting/chart-of-accounts", divider: true },
        { label: "Statement of Cash Flows", href: "/reports" },
      ],
    },
    {
      title: "Reports",
      items: [
        { label: "Report Center Overview", href: "/reports" },
        { label: "Company & Financial: Profit & Loss (P&L)", href: "/reports" },
        { label: "Company & Financial: Balance Sheet Standard", href: "/reports" },
        { label: "Company & Financial: Statement of Cash Flows", href: "/reports" },
        { label: "Company & Financial: Trial Balance", href: "/modules/accounting", divider: true },
        { label: "Customers & Receivables: Aging Summary", href: "/account/reports/customer-report" },
        { label: "Customers & Receivables: Ledger Statements", href: "/account/reports/customer-ledger" },
        { label: "Vendors & Payables: A/P Aging Summary", href: "/finance" },
        { label: "Sales & Invoicing Analysis", href: "/sales", divider: true },
        { label: "FBR Digital Invoicing Audit Trail", href: "/settings?tab=fbr" },
      ],
    },
    {
      title: "Window",
      items: [
        { label: "Close All / Return to Dashboard", href: "/" },
        { label: "Customer Center Screen", href: "/account/customers" },
        { label: "Sales & Invoicing Screen", href: "/sales" },
        { label: "Chart of Accounts Register Screen", href: "/accounting/chart-of-accounts" },
        { label: "Accounting & Ledger Screen", href: "/modules/accounting" },
        { label: "Finance & Expenses Screen", href: "/finance" },
        { label: "Inventory Warehouse Screen", href: "/inventory" },
      ],
    },
    {
      title: "Help",
      items: [
        { label: "IT HUB ERP User Manual", href: "https://ipv6.fbr.gov.pk/di-technical-assistance/173967/174202" },
        { label: "FBR Technical Assistance & Documentation", href: "https://www.fbr.gov.pk/di-technical-assistance/173967/173970" },
        { label: "FBR Licensed Integrator Directory", href: "https://fbr.gov.pk/list-of-license-interprator/173967/173971", divider: true },
        { label: "Keyboard Shortcuts Guide (Ctrl+K, Alt+N, Esc)", onClick: onOpenSearch },
        { label: "About IT HUB ERP Enterprise v0.1.0", href: "/settings" },
      ],
    },
  ];

  const handleMenuClick = (title: string) => {
    setActiveMenu((prev) => (prev === title ? null : title));
  };

  const handleMenuMouseEnter = (title: string) => {
    if (activeMenu !== null) {
      setActiveMenu(title);
    }
  };

  return (
    <div
      ref={menuContainerRef}
      className="hidden lg:flex items-center bg-[#252c33] text-[#e2e8f0] border-b border-[#1a2026] text-[11px] font-medium select-none z-30"
    >
      <div className="flex items-center">
        {menus.map((menu) => {
          const isOpen = activeMenu === menu.title;
          return (
            <div key={menu.title} className="relative">
              <button
                type="button"
                onClick={() => handleMenuClick(menu.title)}
                onMouseEnter={() => handleMenuMouseEnter(menu.title)}
                className={`px-2.5 py-1 transition-colors hover:bg-[#343e47] hover:text-white ${
                  isOpen ? "bg-[#343e47] text-white shadow-inner" : "text-[#cbd5e1]"
                }`}
              >
                {menu.title}
              </button>

              {isOpen && (
                <div className="absolute left-0 top-full mt-0 w-72 rounded-b-md border border-[#3b4651] bg-[#1e252b] py-1 shadow-xl z-50 animate-in fade-in-0 duration-75 text-xs">
                  {menu.items.map((item, idx) => {
                    return (
                      <React.Fragment key={idx}>
                        {item.href ? (
                          <Link
                            href={item.href}
                            onClick={() => setActiveMenu(null)}
                            className="flex items-center justify-between px-3 py-1.5 text-[#e2e8f0] hover:bg-[#0078d4] hover:text-white transition-colors cursor-pointer group"
                          >
                            <span className="truncate">{item.label}</span>
                            {item.shortcut && (
                              <span className="text-[10px] text-[#94a3b8] group-hover:text-white/80 font-mono ml-3">
                                {item.shortcut}
                              </span>
                            )}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenu(null);
                              item.onClick?.();
                            }}
                            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[#e2e8f0] hover:bg-[#0078d4] hover:text-white transition-colors cursor-pointer group"
                          >
                            <span className="truncate">{item.label}</span>
                            {item.shortcut && (
                              <span className="text-[10px] text-[#94a3b8] group-hover:text-white/80 font-mono ml-3">
                                {item.shortcut}
                              </span>
                            )}
                          </button>
                        )}
                        {item.divider && <div className="my-1 border-t border-[#343e47]" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
