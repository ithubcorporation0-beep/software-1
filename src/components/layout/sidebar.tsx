"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Banknote,
  UserCheck,
  CreditCard,
  Briefcase,
  Package,
  BarChart3,
  Bell,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
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
        title: "Overview",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        title: "User Management",
        href: "/modules/user-management",
        icon: Users,
      },
      {
        title: "Notifications",
        href: "/notifications",
        icon: Bell,
      },
    ],
  },
  {
    title: "Commercial & CRM",
    items: [
      {
        title: "CRM",
        href: "/crm",
        icon: Users,
      },
      {
        title: "Sales and invoicing",
        href: "/sales",
        icon: ShoppingCart,
      },
    ],
  },
  {
    title: "Finance & Capital",
    items: [
      {
        title: "Accounting",
        href: "/modules/accounting",
        icon: Landmark,
      },
      {
        title: "Finance and expenses",
        href: "/finance",
        icon: Banknote,
      },
      {
        title: "Payroll",
        href: "/payroll",
        icon: CreditCard,
      },
    ],
  },
  {
    title: "Human Resources",
    items: [
      {
        title: "HR and attendance",
        href: "/hr",
        icon: UserCheck,
      },
    ],
  },
  {
    title: "Operations & PMO",
    items: [
      {
        title: "Projects and tasks",
        href: "/projects",
        icon: Briefcase,
      },
      {
        title: "Inventory and purchasing",
        href: "/inventory",
        icon: Package,
      },
    ],
  },
  {
    title: "Intelligence & Settings",
    items: [
      {
        title: "Reports",
        href: "/reports",
        icon: BarChart3,
      },
      {
        title: "Company settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      aria-label="Sidebar Navigation"
      className={cn(
        "flex h-screen flex-col border-r bg-card text-card-foreground select-none transition-all duration-200 z-30 shrink-0",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Workspace Context Switcher Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-3.5">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2.5 overflow-hidden transition-all",
            collapsed && "justify-center w-full"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs tracking-wider shadow-sm">
            IT
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold tracking-tight text-foreground truncate">
                IT-HUB ERP
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate font-medium">
                <Building2 className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                Global Enterprise
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
        {navigationConfig.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <h4 className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </h4>
            )}
            <nav className="space-y-0.5" aria-label={section.title}>
              {section.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                      collapsed && "justify-center px-2 py-2"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.title}</span>}

                    {!collapsed && item.badge && (
                      <Badge
                        variant="neutral"
                        className="ml-auto text-[10px] px-1.5 py-0 h-4 uppercase font-semibold"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Tenant / Collapse Toggle */}
      <div className="border-t p-2 text-xs bg-muted/20">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate px-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate font-medium">Enterprise Cloud</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
              collapsed && "w-full"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
