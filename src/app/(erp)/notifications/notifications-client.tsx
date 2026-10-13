"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  Search,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Package,
  ShoppingCart,
  Briefcase,
  Layers,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { NotificationRecord } from "@/lib/notifications/server";
import {
  fetchNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "./actions";

interface NotificationsClientProps {
  companyId: string;
  initialNotifications: NotificationRecord[];
}

export function NotificationsClient({
  companyId,
  initialNotifications,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = React.useState<NotificationRecord[]>(initialNotifications);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [isPending, startTransition] = React.useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await fetchNotificationsAction(companyId);
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    });
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    startTransition(async () => {
      await markNotificationReadAction(companyId, id);
    });
  };

  const handleToggleRead = (id: string, currentRead: boolean) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !currentRead } : n))
    );
    startTransition(async () => {
      await markNotificationReadAction(companyId, id);
    });
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      await markAllNotificationsReadAction(companyId);
    });
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeCategory === "all") return true;
    if (activeCategory === "unread") return !item.read;
    return item.category.toLowerCase() === activeCategory.toLowerCase();
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Inventory":
        return <Package className="h-4 w-4 text-amber-500" />;
      case "Sales":
        return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
      case "Projects":
        return <Briefcase className="h-4 w-4 text-sky-500" />;
      case "Security":
        return <ShieldCheck className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Telemetry & Action Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Unread Alerts</p>
              <p className="text-2xl font-bold font-mono tracking-tight text-foreground mt-0.5">
                {unreadCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Stream Items</p>
              <p className="text-2xl font-bold font-mono tracking-tight text-foreground mt-0.5">
                {notifications.length}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Inbox className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">System Health</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Monitoring
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <Card>
        <CardHeader className="p-4 pb-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by keyword, SKU, or invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="h-9 text-xs"
              >
                <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Mark all read
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isPending}
              className="h-9 text-xs"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              Scan Now
            </Button>
          </div>
        </CardHeader>

        {/* Category Filter Pills */}
        <div className="px-4 py-2 border-b bg-muted/20 flex flex-wrap gap-1.5 text-xs">
          {[
            { id: "all", label: `All (${notifications.length})` },
            { id: "unread", label: `Unread (${unreadCount})` },
            { id: "inventory", label: "Inventory" },
            { id: "sales", label: "Sales & Invoices" },
            { id: "projects", label: "Projects" },
            { id: "system", label: "System" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Bell}
                title={
                  activeCategory === "unread"
                    ? "No Unread Notifications"
                    : searchQuery
                    ? "No Matching Alerts"
                    : "All Systems Operational"
                }
                description={
                  activeCategory === "unread"
                    ? "You are completely caught up. All operational alerts and messages have been reviewed."
                    : searchQuery
                    ? `No notification messages match "${searchQuery}".`
                    : "There are currently no outstanding stockout warnings, overdue balances, or urgent deadlines."
                }
                className="border-none py-6"
              />
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredNotifications.map((notif) => {
                const isWarning =
                  notif.type === "low_stock" || notif.type === "overdue_invoice";

                return (
                  <div
                    key={notif.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition-colors ${
                      notif.read
                        ? "bg-card hover:bg-muted/30"
                        : "bg-primary/[0.03] hover:bg-primary/[0.06] border-l-2 border-l-primary"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">
                        {getCategoryIcon(notif.category)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-foreground">
                            {notif.title}
                          </span>
                          <Badge
                            variant={isWarning ? "warning" : "outline"}
                            className="text-[10px] h-4"
                          >
                            {notif.category}
                          </Badge>
                          {!notif.read && (
                            <Badge
                              variant="info"
                              className="text-[9px] h-3.5 px-1 bg-primary/20 text-primary border-transparent"
                            >
                              New
                            </Badge>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground/70">
                          <span className="font-mono">
                            {notif.created_at
                              ? new Date(notif.created_at).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "Recently"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {notif.link_url && (
                        <Link href={notif.link_url}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                          >
                            <span>Open</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleRead(notif.id, notif.read)}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {notif.read ? "Mark unread" : "Mark read"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
