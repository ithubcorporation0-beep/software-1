"use client";

import * as React from "react";
import { User, Shield, Moon, Sun, LogOut, Check } from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { Badge } from "@/components/ui/badge";

export function UserMenu() {
  const [isDark, setIsDark] = React.useState(true);

  React.useEffect(() => {
    // Sync initial theme
    if (document.documentElement.classList.contains("dark")) {
      setIsDark(true);
    } else {
      // Default to dark mode for ERP obsidian theme
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <button
          className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="User profile and system settings"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-xs border border-primary/30">
            EA
          </div>
          <div className="hidden text-left md:block">
            <div className="text-xs font-medium text-foreground">ERP Architect</div>
            <div className="text-[10px] text-muted-foreground">Admin Console</div>
          </div>
        </button>
      </DropdownTrigger>
      <DropdownContent align="right" className="w-56 p-1">
        <div className="px-2 py-2">
          <div className="text-xs font-semibold text-foreground">Lead Systems Engineer</div>
          <div className="text-[11px] text-muted-foreground truncate">lead@ithub-enterprise.com</div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Badge variant="outline" className="text-[9px] h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              <Shield className="mr-0.5 h-2.5 w-2.5" />
              Super Admin
            </Badge>
          </div>
        </div>
        <DropdownSeparator />
        <DropdownItem onClick={toggleTheme}>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
            </div>
            {isDark && <Check className="h-3 w-3 text-primary" />}
          </div>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem
          onClick={() => {
            alert("Phase 1 Foundation Session: Active in Local Development");
          }}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Profile Settings (Phase 4)</span>
          </div>
        </DropdownItem>
        <DropdownItem
          onClick={() => {
            alert("Session Management is managed in Phase 1 via local foundation context.");
          }}
        >
          <div className="flex items-center gap-2 text-destructive">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </div>
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
