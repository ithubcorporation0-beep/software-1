"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { User, Shield, Moon, Sun, LogOut, Check, ShieldAlert } from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export function UserMenu() {
  const router = useRouter();
  const [isDark, setIsDark] = React.useState(true);
  const [userName, setUserName] = React.useState<string>("ERP Lead");
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState<boolean>(false);

  React.useEffect(() => {
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }

    // Check if client session exists
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setUserEmail(data.user.email || null);
          setUserName(
            data.user.user_metadata?.full_name ||
              (data.user.email ? data.user.email.split("@")[0] : "ERP Member")
          );
          supabase
            .from("profiles")
            .select("is_super_admin")
            .eq("id", data.user.id)
            .single()
            .then(({ data: profile }) => {
              if (profile?.is_super_admin) {
                setIsSuperAdmin(true);
              }
            });
        }
      });
    } catch {
      // In offline / mock development
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
    <Dropdown>
      <DropdownTrigger>
        <button
          className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="User profile and system settings"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-xs border border-primary/30 uppercase">
            {userName.slice(0, 2)}
          </div>
          <div className="hidden text-left md:block">
            <div className="text-xs font-medium text-foreground">{userName}</div>
            <div className="text-[10px] text-muted-foreground">Admin Console</div>
          </div>
        </button>
      </DropdownTrigger>
      <DropdownContent align="right" className="w-56 p-1">
        <div className="px-2 py-2">
          <div className="text-xs font-semibold text-foreground">{userName}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {userEmail || "lead@ithub-enterprise.com"}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[9px] h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            >
              <Shield className="mr-0.5 h-2.5 w-2.5" />
              Verified Session
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
        {isSuperAdmin && (
          <>
            <DropdownItem
              onClick={() => {
                router.push("/admin");
              }}
            >
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                <span>Super Admin Console</span>
              </div>
            </DropdownItem>
            <DropdownSeparator />
          </>
        )}
        <DropdownItem
          onClick={() => {
            router.push("/settings");
          }}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Profile & Security</span>
          </div>
        </DropdownItem>
        <DropdownItem onClick={handleSignOut}>
          <div className="flex items-center gap-2 text-destructive">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </div>
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
