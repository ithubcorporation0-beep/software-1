"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { navigationConfig } from "./sidebar";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation"
      className="fixed inset-0 z-50 flex md:hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative z-50 flex h-full w-72 flex-col bg-card shadow-2xl animate-in slide-in-from-left duration-200 border-r">
        {/* Drawer Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              IT
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-foreground block">
                IT-HUB ERP
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Building2 className="h-2.5 w-2.5" /> Mobile Navigation
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Close navigation drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Content */}
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
                      onClick={onClose}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <Badge variant="neutral" className="text-[9px] h-4">
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

        {/* Drawer Footer */}
        <div className="border-t p-3 text-[11px] text-muted-foreground bg-muted/20">
          <span className="font-semibold text-foreground block">IT HUB ERP Enterprise</span>
          <span className="text-[10px] text-muted-foreground">Multi-Tenant Cloud RLS Active</span>
        </div>
      </div>
    </div>
  );
}
