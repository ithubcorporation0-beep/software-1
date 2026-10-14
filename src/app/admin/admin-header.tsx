"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  LogOut,
  Moon,
  Sun,
  Check,
  Building,
  Radio,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface AdminHeaderProps {
  userEmail?: string;
  userName?: string;
}

export function AdminHeader({
  userEmail = "admin@platform.corp",
  userName = "Platform Super Admin",
}: AdminHeaderProps) {
  const router = useRouter();
  const [isDark, setIsDark] = React.useState(true);

  React.useEffect(() => {
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Left side: Context badge */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400">
          <ShieldAlert className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <span>Platform Root Authority</span>
          <span className="text-muted-foreground/60 hidden sm:inline">|</span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline-flex items-center gap-1 font-mono">
            <Radio className="h-2.5 w-2.5 text-emerald-500 animate-pulse" />
            Live Cluster Oversight
          </span>
        </div>
      </div>

      {/* Right side: Quick Links, Theme, Admin Profile & Exit */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-xs h-8 gap-1.5 hidden md:flex text-muted-foreground hover:text-foreground">
            <Building className="h-3.5 w-3.5" />
            <span>Workspace View</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="h-8 w-8 p-0"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>

        <div className="h-4 w-px bg-border/80 hidden sm:block" />

        {/* Profile Pill */}
        <div className="flex items-center gap-2 pl-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs shadow-sm">
            SA
          </div>
          <div className="hidden text-left lg:block">
            <div className="text-xs font-semibold text-foreground truncate max-w-[150px]">
              {userName}
            </div>
            <div className="text-[10px] text-indigo-400 font-mono truncate max-w-[150px]">
              {userEmail}
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          title="Sign Out"
        >
          <LogOut className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}
