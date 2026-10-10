"use client";

import * as React from "react";
import { Menu, Search, Command, Building2, Globe } from "lucide-react";
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
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Left Side: Mobile toggle + Workspace Context */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Open mobile navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1 text-xs">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">IT-HUB Corp</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Global Primary
              </span>
            </div>
            <Badge variant="outline" className="hidden lg:inline-flex text-[10px] h-5">
              Production Tenant #01
            </Badge>
          </div>
        </div>

        {/* Center: Global Search Entry Point */}
        <div className="flex flex-1 justify-center px-4 max-w-md">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-muted/40 px-3 text-xs text-muted-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Search all ERP modules"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Search modules, accounts, commands...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
              <Command className="h-2.5 w-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right Side: Notifications + User Profile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationsPopover />
          <div className="h-4 w-px bg-border hidden sm:block" />
          <UserMenu />
        </div>
      </header>

      {/* Modals */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
