"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users2,
  FileClock,
  ArrowLeft,
  Shield,
  ChevronLeft,
  ChevronRight,
  Server,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AdminSidebarProps {
  className?: string;
  pendingCount?: number;
}

export function AdminSidebar({ className, pendingCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  const navItems = [
    {
      title: "Platform Overview",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: "Company Approvals",
      href: "/admin/companies",
      icon: Building2,
      badge: pendingCount > 0 ? `${pendingCount} PENDING` : undefined,
      badgeVariant: "warning" as const,
    },
    {
      title: "Global User Directory",
      href: "/admin/users",
      icon: Users2,
    },
    {
      title: "Platform Audit Trail",
      href: "/admin/audit-logs",
      icon: FileClock,
    },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-slate-950 text-slate-100 transition-all duration-300 relative z-30 select-none shadow-xl",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Brand & Super Admin Identity Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-3 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950">
        <Link
          href="/admin"
          className={cn(
            "flex items-center gap-2.5 min-w-0 transition-opacity hover:opacity-90",
            collapsed && "justify-center w-full"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-md shadow-indigo-500/20 text-white">
            <Shield className="h-5 w-5" />
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5 truncate">
                IT-HUB ROOT
                <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-mono">
                  SaaS
                </Badge>
              </span>
              <span className="text-[10px] text-indigo-400 font-mono font-medium truncate">
                Super Admin Console
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        <div>
          {!collapsed && (
            <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Platform Governance
            </div>
          )}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.title : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.title}</span>}

                  {!collapsed && item.badge && (
                    <Badge
                      variant="warning"
                      className="ml-auto text-[9px] px-1.5 py-0 h-4 uppercase font-bold font-mono tracking-wide"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System Health Status Indicator */}
        {!collapsed && (
          <div className="mx-1 rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-indigo-400" />
                Cluster Status
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Nominal
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              PostgreSQL Multi-Tenant RLS &amp; Server-Enforced Isolation Active.
            </p>
          </div>
        )}
      </div>

      {/* Footer Switch Back to ERP & Collapse Toggle */}
      <div className="border-t border-slate-800/80 p-2 bg-slate-950/80 space-y-2">
        <Link
          href="/"
          title={collapsed ? "Exit to Tenant ERP" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white",
            collapsed && "justify-center px-2"
          )}
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-slate-400" />
          {!collapsed && <span className="truncate font-semibold">Exit to Tenant ERP</span>}
        </Link>

        <div className="flex items-center justify-between pt-1">
          {!collapsed && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono px-1">
              <Activity className="h-3 w-3 text-indigo-400 shrink-0" />
              <span>v2.4 Production</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors",
              collapsed && "w-full"
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
