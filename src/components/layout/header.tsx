"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Search, Command, Building2, Globe, Clock } from "lucide-react";
import { NotificationsPopover } from "./notifications-popover";
import { UserMenu } from "./user-menu";
import { GlobalSearchDialog } from "./global-search-dialog";
import { MobileNav } from "./mobile-nav";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Keyboard shortcut Ctrl+K / Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        {/* Left Side: Mobile toggle + Workspace Context */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open mobile navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-xs">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-xs sm:text-sm text-foreground tracking-tight leading-none">
                Business Solutions Tax Consultants
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Center: Global Search Entry Point */}
        <div className="flex flex-1 justify-center px-4 max-w-sm sm:max-w-md">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-8 w-full items-center justify-between rounded-md border border-input/80 bg-background px-3 text-xs text-muted-foreground transition-all hover:bg-muted/40 hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search all ERP modules"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">Search customers, invoices, products...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Command className="h-2.5 w-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right Side: Activities Clock + Notifications + User Profile Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Link
            href="/notifications"
            prefetch={true}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Recent Activities"
            aria-label="Recent Activities"
          >
            <Clock className="h-4 w-4" />
          </Link>
          <NotificationsPopover />
          <div className="h-4 w-px bg-border/80 hidden sm:block" />
          <UserMenu />
        </div>
      </header>

      {/* Modals */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
