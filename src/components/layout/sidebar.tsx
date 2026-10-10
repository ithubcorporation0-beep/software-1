"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Briefcase,
  DollarSign,
  CreditCard,
  UserCheck,
  BarChart3,
  Settings,
  Building2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  phase?: string;
  isCurrentPhase?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigationConfig: NavSection[] = [
  {
    title: "Core Overview",
    items: [
      {
        title: "Executive Radar",
        href: "/",
        icon: LayoutDashboard,
        isCurrentPhase: true,
      },
    ],
  },
  {
    title: "Operations & Commerce",
    items: [
      {
        title: "Inventory & Stock",
        href: "/inventory",
        icon: Package,
        phase: "Phase 2",
      },
      {
        title: "CRM & Accounts",
        href: "/crm",
        icon: Users,
        phase: "Phase 2",
      },
      {
        title: "Sales Orders",
        href: "/sales",
        icon: ShoppingCart,
        phase: "Phase 2",
      },
      {
        title: "Projects & PMO",
        href: "/projects",
        icon: Briefcase,
        phase: "Phase 3",
      },
    ],
  },
  {
    title: "Finance & Capital",
    items: [
      {
        title: "Finance & Ledger",
        href: "/finance",
        icon: DollarSign,
        phase: "Phase 3",
      },
      {
        title: "Payroll Engine",
        href: "/payroll",
        icon: CreditCard,
        phase: "Phase 3",
      },
    ],
  },
  {
    title: "Human Capital",
    items: [
      {
        title: "HR & Directory",
        href: "/hr",
        icon: UserCheck,
        phase: "Phase 4",
      },
    ],
  },
  {
    title: "Intelligence & Admin",
    items: [
      {
        title: "Reports & Audits",
        href: "/reports",
        icon: BarChart3,
        phase: "Phase 4",
      },
      {
        title: "System Settings",
        href: "/settings",
        icon: Settings,
        phase: "Phase 4",
      },
    ],
  },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Sidebar Navigation"
      className={cn(
        "flex h-screen w-64 flex-col border-r bg-card text-card-foreground select-none",
        className
      )}
    >
      {/* Workspace Context Switcher Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
            IT
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              IT-HUB ERP
            </span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3 inline" /> Global Enterprise
            </span>
          </div>
        </div>
        <div className="text-muted-foreground">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigationConfig.map((section) => (
          <div key={section.title} className="space-y-1">
            <h4 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {section.title}
            </h4>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group flex items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      <span className="truncate">{item.title}</span>
                    </div>

                    {item.isCurrentPhase ? (
                      <Badge
                        variant="neutral"
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-4 uppercase font-semibold",
                          isActive
                            ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        )}
                      >
                        v1.0
                      </Badge>
                    ) : item.phase ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1 py-0 h-4 border text-muted-foreground",
                          isActive && "border-primary-foreground/30 text-primary-foreground"
                        )}
                      >
                        {item.phase}
                      </Badge>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Tenant / Build Metadata */}
      <div className="border-t p-3 text-[11px] text-muted-foreground bg-muted/20">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Phase 1 Foundation</span>
          <span className="font-mono text-[10px] text-muted-foreground">v0.1.0-alpha</span>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground/80">
          Clean Modular Architecture
        </p>
      </div>
    </aside>
  );
}
