"use client";

import * as React from "react";
import { Bell, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { Dropdown, DropdownTrigger, DropdownContent } from "@/components/ui/dropdown";
import { Badge } from "@/components/ui/badge";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "info" | "success" | "warning";
}

const initialNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Phase 1 Foundation Active",
    message: "Next.js App Router shell and design system tokens initialized.",
    time: "Just now",
    type: "success",
  },
  {
    id: "notif-2",
    title: "System Telemetry Ready",
    message: "Design tokens, accessibility focus rings, and RBAC contracts loaded.",
    time: "10m ago",
    type: "info",
  },
];

export function NotificationsPopover() {
  const [notifications] = React.useState<NotificationItem[]>(initialNotifications);

  return (
    <Dropdown>
      <DropdownTrigger>
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {notifications.length}
          </span>
        </button>
      </DropdownTrigger>
      <DropdownContent align="right" className="w-80 p-0 shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Notifications</span>
            <Badge variant="outline" className="text-[10px] h-4">
              {notifications.length} active
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground">System Audit</span>
        </div>

        <div className="max-h-64 divide-y overflow-y-auto">
          {notifications.map((n) => (
            <div key={n.id} className="p-3 text-xs transition-colors hover:bg-muted/40">
              <div className="flex items-start gap-2">
                {n.type === "success" && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                )}
                {n.type === "info" && (
                  <Info className="h-4 w-4 shrink-0 text-sky-500 mt-0.5" />
                )}
                {n.type === "warning" && (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-foreground">{n.title}</div>
                  <p className="mt-0.5 text-muted-foreground leading-snug">{n.message}</p>
                  <span className="mt-1 block text-[10px] text-muted-foreground/70 font-mono">
                    {n.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-2 text-center bg-muted/20">
          <span className="text-[10px] text-muted-foreground">
            Notification stream active for current session
          </span>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
