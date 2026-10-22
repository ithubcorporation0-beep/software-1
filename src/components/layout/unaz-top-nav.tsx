"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Users,
  CreditCard,
  Layers,
  FileBarChart,
  BookOpen,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  Building,
  FileText,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SubNavItem {
  title: string;
  href: string;
  icon?: any;
  description?: string;
}

export const customerSubNav: SubNavItem[] = [
  {
    title: "Customer List",
    href: "/account/customers",
    icon: Users,
    description: "Directory of commercial clients, tax statuses & balances",
  },
  {
    title: "Customer Payment",
    href: "/account/customer-payments",
    icon: CreditCard,
    description: "Payment receipts, clearance status & voucher printing",
  },
  {
    title: "Due & Batch Payment",
    href: "/account/customer-payments/due-batch",
    icon: Layers,
    description: "Bulk batch settlements & overdue balance clearing",
  },
  {
    title: "Customer Report",
    href: "/account/reports/customer-report",
    icon: FileBarChart,
    description: "Aging analysis, sales turnover & receivables report",
  },
  {
    title: "Customer Ledger",
    href: "/account/reports/customer-ledger",
    icon: BookOpen,
    description: "Full debit/credit running account balance statement",
  },
  {
    title: "Customer Setting",
    href: "/account/customer-groups",
    icon: Settings,
    description: "Customer groups, categories & classification tags",
  },
];

export function UnazTopNav() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isCustomerActive =
    pathname.startsWith("/account/customers") ||
    pathname.startsWith("/account/customer-") ||
    pathname.includes("customer-ledger") ||
    pathname.includes("customer-report") ||
    pathname.startsWith("/crm");

  return (
    <nav
      ref={dropdownRef}
      className="hidden lg:flex items-center gap-1 text-xs font-medium"
      aria-label="UNAZ ERP Navigation"
    >
      {/* User Management */}
      <Link
        href="/modules/user-management"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors",
          pathname.startsWith("/modules/user-management")
            ? "bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
        <span>User Management</span>
      </Link>

      {/* Dashboard */}
      <Link
        href="/"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors",
          pathname === "/"
            ? "bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
      >
        <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Dashboard</span>
      </Link>

      {/* Customers Dropdown (Matching Image 1 UNAZ) */}
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(openDropdown === "customers" ? null : "customers")}
          onMouseEnter={() => setOpenDropdown("customers")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all border font-medium text-xs",
            isCustomerActive || openDropdown === "customers"
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold shadow-xs"
              : "text-foreground/80 hover:text-foreground hover:bg-muted/60 border-transparent"
          )}
          aria-expanded={openDropdown === "customers"}
        >
          <span>Customers</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200 opacity-70",
              openDropdown === "customers" && "rotate-180"
            )}
          />
        </button>

        {openDropdown === "customers" && (
          <div
            onMouseLeave={() => setOpenDropdown(null)}
            className="absolute left-0 top-full mt-1.5 w-60 rounded-xl bg-popover/95 border border-border shadow-xl backdrop-blur-md p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {customerSubNav.map((sub) => {
              const isSubActive = pathname === sub.href;
              const Icon = sub.icon;
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  onClick={() => setOpenDropdown(null)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                    isSubActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold"
                      : "text-foreground/85 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="flex-1">{sub.title}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Vendors Dropdown */}
      <Link
        href="/inventory"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
      >
        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Vendors</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Link>

      {/* Reports */}
      <Link
        href="/reports"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors",
          pathname.startsWith("/reports")
            ? "bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
      >
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Reports</span>
      </Link>
    </nav>
  );
}
