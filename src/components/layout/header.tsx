"use client";

import * as React from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  Command,
  Building2,
  Clock,
  Plus,
  Users,
  FileText,
  Landmark,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { NotificationsPopover } from "./notifications-popover";
import { UserMenu } from "./user-menu";
import { GlobalSearchDialog } from "./global-search-dialog";
import { MobileNav } from "./mobile-nav";
import { DesktopMenuBar } from "./desktop-menu-bar";
import { QuickCreateDialog } from "./quick-create-dialog";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Keyboard shortcuts: Ctrl+K for search, Alt+N for quick create
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setQuickCreateOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="sticky top-0 z-20 flex flex-col w-full shadow-xs">
      {/* 1. Top Classic Desktop Menu Bar (File, Edit, View, Lists, Company...) */}
      <DesktopMenuBar
        onOpenSearch={() => setSearchOpen(true)}
        onOpenQuickCreate={() => setQuickCreateOpen(true)}
      />

      {/* 2. Main Desktop Accounting Toolbar Strip */}
      <header className="flex h-12 w-full items-center justify-between border-b border-[#d0d7de] bg-[#f6f8fa] px-3 lg:px-4 text-xs select-none">
        {/* Left Side: Mobile toggle + Company & Tenant Info */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded p-1 text-slate-600 hover:bg-slate-200 md:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
            aria-label="Open mobile navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#0078d4] text-white shadow-xs">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-xs text-slate-900 tracking-tight">
                  Business Solutions Tax Consultants
                </span>
                <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-700 border border-emerald-300">
                  PROD
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                <span>FY 2026-27</span>
                <span>•</span>
                <span className="text-slate-600">PKR Base</span>
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-300 hidden md:block mx-1" />

          {/* Quick Create (+ New) Button */}
          <button
            type="button"
            onClick={() => setQuickCreateOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded bg-[#0078d4] px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-[#006bbd] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4]"
            title="Create transaction (Alt+N)"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ New</span>
          </button>
        </div>

        {/* Center: Desktop Global Search Bar */}
        <div className="flex flex-1 justify-center px-3 max-w-sm sm:max-w-md">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-7 w-full items-center justify-between rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0078d4]"
            aria-label="Search all ERP modules"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate text-[11px]">Search accounts, invoices, customers...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-100 px-1 py-0.2 font-mono text-[9px] font-medium text-slate-600">
              <Command className="h-2 w-2" /> K
            </kbd>
          </button>
        </div>

        {/* Right Side: Quick Modules Shortcuts + Notifications + User Menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Quick Module Icons */}
          <div className="hidden xl:flex items-center gap-1 pr-1 border-r border-slate-300 mr-1">
            <Link
              href="/account/customers"
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              title="Customer Center"
            >
              <Users className="h-3.5 w-3.5 text-[#0078d4]" />
              <span>Customers</span>
            </Link>
            <Link
              href="/sales"
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              title="Invoices"
            >
              <FileText className="h-3.5 w-3.5 text-[#0078d4]" />
              <span>Invoices</span>
            </Link>
            <Link
              href="/accounting/chart-of-accounts"
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              title="Chart of Accounts"
            >
              <Landmark className="h-3.5 w-3.5 text-[#0078d4]" />
              <span>COA</span>
            </Link>
            <Link
              href="/reports"
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              title="Reports"
            >
              <BarChart3 className="h-3.5 w-3.5 text-[#0078d4]" />
              <span>Reports</span>
            </Link>
          </div>

          <Link
            href="/notifications"
            prefetch={true}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            title="Recent Activities"
            aria-label="Recent Activities"
          >
            <Clock className="h-3.5 w-3.5" />
          </Link>
          <NotificationsPopover />
          <div className="h-3.5 w-px bg-slate-300 hidden sm:block" />
          <UserMenu />
        </div>
      </header>

      {/* Dialogs */}
      <QuickCreateDialog open={quickCreateOpen} onOpenChange={setQuickCreateOpen} />
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </div>
  );
}
