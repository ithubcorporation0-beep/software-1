"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Receipt,
  Clock,
  ShoppingCart,
  Layers,
  Briefcase,
  FileText,
  UserCheck,
  Handshake,
  ArrowUpRight,
  LayoutGrid,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  Activity,
  CheckCircle2,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ModuleCardItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const MODULES_CONFIG: ModuleCardItem[] = [
  {
    id: "user-management",
    title: "User Management",
    description: "Manage users, roles and permissions",
    href: "/modules/user-management",
    icon: Users,
    iconBg: "bg-blue-50 dark:bg-blue-950/60",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "sales-invoice",
    title: "Sales Invoice",
    description: "Manage quotes, invoices and customer orders",
    href: "/sales",
    icon: Receipt,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "activities",
    title: "Activities",
    description: "Open and manage this module",
    href: "/notifications",
    icon: Clock,
    iconBg: "bg-purple-50 dark:bg-purple-950/60",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "purchase",
    title: "Purchase",
    description: "Manage purchases, bills and expenses",
    href: "/finance",
    icon: ShoppingCart,
    iconBg: "bg-amber-50 dark:bg-amber-950/60",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "product-service",
    title: "Product & Service",
    description: "Track inventory, stock levels and movements",
    href: "/inventory",
    icon: Layers,
    iconBg: "bg-sky-50 dark:bg-sky-950/60",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "project",
    title: "Project",
    description: "Plan, track and deliver projects on time",
    href: "/projects",
    icon: Briefcase,
    iconBg: "bg-teal-50 dark:bg-teal-950/60",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "accounting",
    title: "Accounting",
    description: "Manage accounts, journal entries and financials",
    href: "/finance",
    icon: FileText,
    iconBg: "bg-indigo-50 dark:bg-indigo-950/60",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "hrm",
    title: "Hrm",
    description: "Manage employees, payroll and HR activities",
    href: "/hr",
    icon: UserCheck,
    iconBg: "bg-pink-50 dark:bg-pink-950/60",
    iconColor: "text-pink-600 dark:text-pink-400",
  },
  {
    id: "crm",
    title: "CRM",
    description: "Track leads, deals and the sales pipeline",
    href: "/crm",
    icon: Handshake,
    iconBg: "bg-blue-50 dark:bg-blue-950/60",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
];

interface CalendarEvent {
  date: number; // day of month
  title: string;
  type: "tax" | "payroll" | "audit" | "meeting";
}

const SAMPLE_EVENTS: CalendarEvent[] = [
  { date: 5, title: "Client Monthly Retainer Run", type: "meeting" },
  { date: 10, title: "Sales Tax Return Prep", type: "tax" },
  { date: 14, title: "Quarterly Audit Review", type: "audit" },
  { date: 20, title: "Payroll Ledger Sign-off", type: "payroll" },
  { date: 28, title: "Vendor AP Clearing", type: "meeting" },
];

interface ExploreModulesDashboardProps {
  metrics?: any;
  companyName?: string;
  userDisplayName?: string;
}

export function ExploreModulesDashboard({
  metrics,
  companyName = "Business Solutions Tax Consultants",
  userDisplayName = "BSTC",
}: ExploreModulesDashboardProps) {
  // Calendar state initialized to October 2026 matching the screenshot
  const [currentDate, setCurrentDate] = React.useState(new Date(2026, 9, 14));
  const [viewMode, setViewMode] = React.useState<"month" | "week" | "day">("month");
  const [selectedDay, setSelectedDay] = React.useState<number>(14);
  const [showTelemetry, setShowTelemetry] = React.useState<boolean>(false);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = currentDate.getFullYear();
  const currentMonthIndex = currentDate.getMonth();
  const currentMonthName = monthNames[currentMonthIndex];

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 9, 14));
    setSelectedDay(14);
  };

  // Calendar days generation
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonthIndex, 1).getDay(); // 0 is Sunday
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const leadingBlanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Greeting Banner (Matches Screenshot 1) */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 shadow-xs">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Good afternoon, {userDisplayName} <span className="inline-block animate-pulse">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Welcome to <strong className="text-foreground font-semibold">{companyName}</strong>. Here&apos;s your business at a glance.
            </p>
          </div>
        </div>

        {/* Date Pill (Top Right) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200/90 dark:border-blue-900/80 bg-blue-50/70 dark:bg-blue-950/40 px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 shadow-xs">
            <CalendarIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Wednesday, 14 October 2026</span>
          </div>
        </div>
      </div>

      {/* 2. Explore Modules Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Explore Modules
          </h2>
          <span className="rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
            {MODULES_CONFIG.length} modules
          </span>
        </div>

        {/* 9-Module Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
          {MODULES_CONFIG.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.id}
                href={mod.href}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${mod.iconBg} ${mod.iconColor} shadow-2xs transition-transform duration-200 group-hover:scale-105`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="rounded-full p-1 text-blue-500/70 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Calendar Section (Matches Screenshot 1) */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        {/* Calendar Header with Icon */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Calendar
          </h2>
        </div>

        {/* Calendar Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Left Controls: < > Today */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-xs"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="rounded-lg bg-slate-700 hover:bg-slate-800 text-white px-3 h-8 text-xs font-semibold transition-colors shadow-xs ml-1"
            >
              Today
            </button>
          </div>

          {/* Center Title: Month Year */}
          <div className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            {currentMonthName} {currentYear}
          </div>

          {/* Right Mode Toggle: Month | Week | Day */}
          <div className="flex items-center rounded-lg border border-border/80 p-0.5 bg-muted/40 self-end sm:self-auto">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === "month"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === "week"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === "day"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Day
            </button>
          </div>
        </div>

        {/* Month View Grid */}
        {viewMode === "month" && (
          <div className="pt-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border/60 pb-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-2">
              {/* Empty leading slots */}
              {leadingBlanks.map((b) => (
                <div key={`blank-${b}`} className="min-h-[70px] sm:min-h-[90px] rounded-lg bg-muted/10 p-1.5 opacity-40" />
              ))}

              {/* Day cells */}
              {daysArray.map((day) => {
                const isToday = day === 14 && currentMonthIndex === 9 && currentYear === 2026;
                const isSelected = selectedDay === day;
                const events = SAMPLE_EVENTS.filter((e) => e.date === day);

                return (
                  <div
                    key={`day-${day}`}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[70px] sm:min-h-[90px] rounded-xl border p-1.5 sm:p-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isToday
                        ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-1 ring-blue-500"
                        : isSelected
                        ? "border-primary/60 bg-muted/30"
                        : "border-border/60 hover:border-border hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${
                          isToday
                            ? "bg-blue-600 text-white"
                            : "text-foreground"
                        }`}
                      >
                        {day}
                      </span>
                      {events.length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      )}
                    </div>

                    {/* Events list */}
                    <div className="mt-1 space-y-1">
                      {events.map((ev, idx) => (
                        <div
                          key={idx}
                          className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View Placeholder */}
        {viewMode === "week" && (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
            <CalendarClock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="font-semibold text-foreground">Week View Active</p>
            <p className="mt-1">Displaying scheduled fiscal deadlines and milestone deliverables for the current week.</p>
          </div>
        )}

        {/* Day View Placeholder */}
        {viewMode === "day" && (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
            <p className="font-semibold text-foreground">Day Schedule: October {selectedDay}, 2026</p>
            <p className="mt-1">No pending operational blocks. All system sync tasks operational.</p>
          </div>
        )}
      </div>

      {/* 4. Secondary Telemetry Toggle (Keeps full business intelligence accessible) */}
      <div className="pt-2">
        <button
          onClick={() => setShowTelemetry((prev) => !prev)}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>{showTelemetry ? "Hide" : "View"} Executive Financial Telemetry</span>
        </button>

        {showTelemetry && (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 mt-4 animate-in fade-in-0 duration-200">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Gross Revenue
                </CardTitle>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-1">
                <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                  {metrics?.revenue?.value ?? "₨ 0.00"}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Total payments received</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Operating Expenses
                </CardTitle>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-1">
                <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                  {metrics?.expenses?.value ?? "₨ 0.00"}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Approved claims & ledger</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Net Operating Margin
                </CardTitle>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Activity className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-1">
                <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                  {metrics?.profit?.value ?? "₨ 0.00"}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">P&L operational balance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Accounts Receivable
                </CardTitle>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-1">
                <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                  {metrics?.outstandingInvoices?.value ?? "₨ 0.00"}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Outstanding balances</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
