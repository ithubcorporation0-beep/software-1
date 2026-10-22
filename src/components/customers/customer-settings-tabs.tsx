"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FolderTree, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomerSettingsTabsProps {
  className?: string;
  customersCount?: number;
  groupsCount?: number;
  categoriesCount?: number;
}

export function CustomerSettingsTabs({
  className,
  customersCount,
  groupsCount,
  categoriesCount,
}: CustomerSettingsTabsProps) {
  const pathname = usePathname();

  const tabs = [
    {
      title: "Customers",
      href: "/account/customers",
      icon: Users,
      count: customersCount,
      active: pathname === "/account/customers" || pathname.startsWith("/account/customers/"),
    },
    {
      title: "Customer Groups",
      href: "/account/customer-groups",
      icon: FolderTree,
      count: groupsCount,
      active: pathname === "/account/customer-groups" || pathname.startsWith("/account/customer-groups/"),
    },
    {
      title: "Customer Categories",
      href: "/account/customer-categories",
      icon: Tags,
      count: categoriesCount,
      active: pathname === "/account/customer-categories" || pathname.startsWith("/account/customer-categories/"),
    },
  ];

  return (
    <div className={cn("border-b border-border/60 bg-muted/20 backdrop-blur-xs px-2 pt-2", className)}>
      <nav className="flex space-x-2" aria-label="Customer Sub-navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "group flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all duration-150 select-none",
                tab.active
                  ? "border-primary text-primary font-semibold shadow-2xs"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  tab.active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span>{tab.title}</span>
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    tab.active
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
