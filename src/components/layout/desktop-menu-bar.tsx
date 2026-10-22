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
        { label: "Company Settings", href: "/settings", shortcut: "Ctrl+," },
        { label: "Print Active Screen", onClick: () => window.print(), shortcut: "Ctrl+P", divider: true },
        { label: "Export System Audit Logs", href: "/admin/audit-logs", divider: true },
        { label: "Close Window / Back to Dashboard", href: "/", shortcut: "Esc" },
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
        { label: "Sales & Commercial Invoices", href: "/sales", shortcut: "Ctrl+2" },
        { label: "Customer Accounts Center", href: "/account/customers", shortcut: "Ctrl+3" },
        { label: "Expenses & Bills", href: "/finance", shortcut: "Ctrl+4" },
        { label: "Chart of Accounts (COA)", href: "/modules/accounting?tab=chart-of-accounts", shortcut: "Ctrl+5", divider: true },
        { label: "Refresh Application Cache", onClick: () => window.location.reload(), shortcut: "F5" },
      ],
    },
    {
      title: "Lists",
      items: [
        { label: "Chart of Accounts", href: "/modules/accounting?tab=chart-of-accounts" },
        { label: "Customer List", href: "/account/customers" },
        { label: "Customer Groups & Categories", href: "/account/customer-groups" },
        { label: "Product & Inventory Item List", href: "/inventory", divider: true },
        { label: "Vendor / Supplier List", href: "/finance" },
        { label: "Employee & Personnel List", href: "/hr" },
      ],
    },
    {
      title: "Company",
      items: [
        { label: "Company Information", href: "/settings" },
        { label: "Chart of Accounts", href: "/modules/accounting?tab=chart-of-accounts" },
        { label: "Make General Journal Entries", href: "/modules/accounting", divider: true },
        { label: "Users & Permissions (RBAC)", href: "/modules/user-management" },
        { label: "Payroll & Compensation Runs", href: "/payroll" },
        { label: "Staff Attendance & Leave", href: "/hr" },
        { label: "Reminders & Alerts", href: "/notifications" },
      ],
    },
    {
      title: "Customers",
      items: [
        { label: "Customer Center", href: "/account/customers" },
        { label: "Create Invoices", href: "/sales" },
        { label: "Receive Payments", href: "/account/customer-payments" },
        { label: "Due & Batch Clearance", href: "/account/customer-payments/due-batch" },
        { label: "Create Estimates / Quotes", href: "/sales", divider: true },
        { label: "Customer Ledger Statement", href: "/account/reports/customer-ledger" },
        { label: "Customer Receivables & Aging Report", href: "/account/reports/customer-report" },
      ],
    },
    {
      title: "Vendors",
      items: [
        { label: "Vendor Center", href: "/finance" },
        { label: "Record Expense / Bill", href: "/finance" },
        { label: "Purchase Orders", href: "/inventory" },
        { label: "Pay Bills & Disburse Funds", href: "/finance", divider: true },
        { label: "Accounts Payable (A/P) Aging", href: "/finance" },
      ],
    },
    {
      title: "Banking",
      items: [
        { label: "Write Checks / Disburse Payment", href: "/modules/accounting" },
        { label: "Transfer Funds Between Accounts", href: "/modules/accounting" },
        { label: "Bank Reconciliation", href: "/modules/accounting" },
        { label: "Account Register", href: "/modules/accounting?tab=chart-of-accounts", divider: true },
        { label: "Cash Flow Statement", href: "/reports" },
      ],
    },
    {
      title: "Reports",
      items: [
        { label: "Company & Financial: Profit & Loss", href: "/reports" },
        { label: "Company & Financial: Balance Sheet", href: "/reports" },
        { label: "Company & Financial: Statement of Cash Flows", href: "/reports", divider: true },
        { label: "Customers & Receivables: Aging Summary", href: "/account/reports/customer-report" },
        { label: "Customers & Receivables: Ledger Statements", href: "/account/reports/customer-ledger" },
        { label: "Sales & Invoicing Analysis", href: "/sales", divider: true },
        { label: "FBR Digital Invoicing Audit Trail", href: "/settings?tab=fbr" },
      ],
    },
    {
      title: "Window",
      items: [
        { label: "Close All / Dashboard", href: "/" },
        { label: "Customer Management Screen", href: "/account/customers" },
        { label: "Sales & Invoicing Screen", href: "/sales" },
        { label: "Accounting & Ledger Screen", href: "/modules/accounting" },
        { label: "Inventory Warehouse Screen", href: "/inventory" },
      ],
    },
    {
      title: "Help",
      items: [
        { label: "IT HUB ERP User Manual", href: "https://ipv6.fbr.gov.pk/di-technical-assistance/173967/174202" },
        { label: "FBR Technical Assistance & Documentation", href: "https://www.fbr.gov.pk/di-technical-assistance/173967/173970" },
        { label: "FBR Licensed Integrator Directory", href: "https://fbr.gov.pk/list-of-license-interprator/173967/173971", divider: true },
        { label: "Keyboard Shortcuts Guide (Ctrl+K, Esc)", onClick: onOpenSearch },
        { label: "About IT HUB ERP v0.1.0", href: "/settings" },
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
                <div className="absolute left-0 top-full mt-0 w-64 rounded-b-md border border-[#3b4651] bg-[#1e252b] py-1 shadow-xl z-50 animate-in fade-in-0 duration-75 text-xs">
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
