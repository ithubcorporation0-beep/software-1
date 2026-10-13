"use client";

import * as React from "react";
import { Bell, CheckCircle2, Info, AlertTriangle, Trash2, CheckCheck } from "lucide-react";
import { Dropdown, DropdownTrigger, DropdownContent } from "@/components/ui/dropdown";
import { Badge } from "@/components/ui/badge";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "info" | "success" | "warning";
  read: boolean;
  category: "Security" | "Governance" | "System" | "Sales" | "Inventory" | "Projects";
}

export function NotificationsPopover() {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

  // Fetch live notifications on mount
  React.useEffect(() => {
    let mounted = true;
    import("@/app/(erp)/notifications/actions")
      .then(({ fetchNotificationsAction }) => {
        fetchNotificationsAction(DEFAULT_COMPANY_ID)
          .then((res) => {
            if (!mounted) return;
            if (res.success && Array.isArray(res.data)) {
              const mapped: NotificationItem[] = res.data.map((item: any) => ({
                id: item.id,
                title: item.title,
                message: item.message,
                time: item.created_at
                  ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Recently",
                type: item.type === "low_stock" || item.type === "overdue_invoice" ? "warning" : "info",
                read: Boolean(item.read),
                category: (item.category as any) || "System",
              }));
              setNotifications(mapped);
            }
          })
          .catch(() => {});
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    import("@/app/(erp)/notifications/actions")
      .then(({ markNotificationReadAction }) => {
        markNotificationReadAction(DEFAULT_COMPANY_ID, id).catch(() => {});
      })
      .catch(() => {});
  };

  const toggleReadStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
    import("@/app/(erp)/notifications/actions")
      .then(({ markNotificationReadAction }) => {
        markNotificationReadAction(DEFAULT_COMPANY_ID, id).catch(() => {});
      })
      .catch(() => {});
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    import("@/app/(erp)/notifications/actions")
      .then(({ markAllNotificationsReadAction }) => {
        markAllNotificationsReadAction(DEFAULT_COMPANY_ID).catch(() => {});
      })
      .catch(() => {});
  };

  const clearRead = () => {
    setNotifications((prev) => prev.filter((n) => !n.read));
  };

  const filtered = filter === "unread"
    ? notifications.filter((n) => !n.read)
    : notifications;

  return (
    <Dropdown>
      <DropdownTrigger>
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </DropdownTrigger>
      <DropdownContent align="right" className="w-80 sm:w-96 p-0 shadow-xl border bg-popover text-popover-foreground">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 ? (
              <Badge variant="info" className="text-[10px] h-4">
                {unreadCount} unread
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-4 text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                All read
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[10px] text-primary hover:underline font-medium flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded px-2 py-0.5 font-medium transition-colors ${
                filter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`rounded px-2 py-0.5 font-medium transition-colors ${
                filter === "unread" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
          {notifications.some((n) => n.read) && (
            <button
              type="button"
              onClick={clearRead}
              className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              title="Clear read notifications"
            >
              <Trash2 className="h-3 w-3" />
              Clear read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-72 divide-y overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                <Bell className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-foreground">
                {filter === "unread" ? "No unread notifications" : "No notifications"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {filter === "unread"
                  ? "You're all caught up with your unread alerts."
                  : "All systems and alerts are up to date."}
              </p>
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-3 text-xs transition-colors cursor-pointer ${
                  n.read ? "bg-background hover:bg-muted/40" : "bg-primary/5 hover:bg-primary/10"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {n.type === "success" && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  )}
                  {n.type === "info" && (
                    <Info className="h-4 w-4 shrink-0 text-sky-500 mt-0.5" />
                  )}
                  {n.type === "warning" && (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-semibold text-foreground truncate">{n.title}</div>
                      <Badge variant="outline" className="text-[9px] h-3.5 shrink-0">
                        {n.category}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-muted-foreground leading-snug">{n.message}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground/70">
                      <span className="font-mono">{n.time}</span>
                      <button
                        type="button"
                        onClick={(e) => toggleReadStatus(n.id, e)}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {n.read ? "Mark unread" : "Mark read"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-2 bg-muted/20 flex items-center justify-between px-3 text-[10px] text-muted-foreground">
          <span>System Alerts & Activity</span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
