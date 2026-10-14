"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileClock,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { AuditLog } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface AuditLogsClientProps {
  initialLogs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
  currentSearch: string;
  currentAction: string;
}

export function AuditLogsClient({
  initialLogs,
  total,
  page,
  totalPages,
  currentSearch,
  currentAction,
}: AuditLogsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(currentSearch);
  const [inspectLog, setInspectLog] = React.useState<AuditLog | null>(null);

  const applyFilters = (newAction?: string, newSearch?: string, newPage?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    const actionVal = newAction !== undefined ? newAction : currentAction;
    const searchVal = newSearch !== undefined ? newSearch : search;
    const pageVal = newPage !== undefined ? newPage : 1;

    if (actionVal && actionVal !== "ALL") {
      params.set("action", actionVal);
    } else {
      params.delete("action");
    }

    if (searchVal && searchVal.trim()) {
      params.set("search", searchVal.trim());
    } else {
      params.delete("search");
    }

    if (pageVal > 1) {
      params.set("page", String(pageVal));
    } else {
      params.delete("page");
    }

    router.push(`/admin/audit-logs?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(currentAction, search, 1);
  };

  const commonActions = [
    { label: "All Events", value: "ALL" },
    { label: "Company Approvals", value: "company.approved" },
    { label: "Company Suspensions", value: "company.suspended" },
    { label: "Company Reactivations", value: "company.reactivated" },
    { label: "Company Rejections", value: "company.rejected" },
    { label: "Super Admin Toggles", value: "super_admin.toggled" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileClock className="h-5 w-5 text-indigo-500" />
          Platform-Wide Audit Trail &amp; Compliance Ledger
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Append-only, cryptographically verifiable ledger tracking cross-tenant administrative interventions and lifecycle state transitions.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
            {commonActions.map((act) => {
              const isSelected = (currentAction || "ALL") === act.value;
              return (
                <button
                  key={act.value}
                  onClick={() => applyFilters(act.value, search, 1)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {act.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search audit trail by action, resource type, user UUID, or company UUID..."
                className="pl-8 text-xs h-9"
              />
            </div>
            <Button type="submit" size="sm" variant="default" className="text-xs h-9 px-4">
              Filter
            </Button>
            {search && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  applyFilters(currentAction, "", 1);
                }}
                className="text-xs h-9"
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b border-border/80">
          <div className="flex items-center justify-between text-xs">
            <div className="font-semibold text-foreground">
              Total Audit Records: <span className="font-mono text-indigo-400">{total}</span>
            </div>
            <div className="text-muted-foreground font-mono">
              Page {page} of {Math.max(1, totalPages)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {initialLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Lock className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p>No audit log events match the active search criteria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Organization UUID</TableHead>
                  <TableHead>Details Summary</TableHead>
                  <TableHead className="text-right">Inspect</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.action.includes("approved") || log.action.includes("reactivated")
                            ? "success"
                            : log.action.includes("suspended") || log.action.includes("rejected")
                            ? "destructive"
                            : "outline"
                        }
                        className="text-[10px] font-mono"
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      {log.resource}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[140px]">
                      {log.company_id || "GLOBAL"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-xs">
                      {typeof log.details === "object"
                        ? JSON.stringify(log.details)
                        : String(log.details || "—")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setInspectLog(log)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="View Full Audit Payload"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/80 px-4 py-3 text-xs">
              <span className="text-muted-foreground">
                Showing page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => applyFilters(currentAction, search, page - 1)}
                  className="h-7 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => applyFilters(currentAction, search, page + 1)}
                  className="h-7 text-xs"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspect Modal */}
      <Dialog open={inspectLog !== null} onOpenChange={(open) => !open && setInspectLog(null)}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-indigo-500" />
            Audit Ledger Entry Details
          </DialogTitle>
          <DialogDescription className="text-xs">
            Immutable snapshot captured during server execution.
          </DialogDescription>
        </DialogHeader>
        {inspectLog && (
          <div className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 bg-muted/20 font-mono text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-bold font-sans">Event ID</span>
                <span className="text-foreground">{inspectLog.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-bold font-sans">Timestamp</span>
                <span className="text-foreground">{new Date(inspectLog.created_at).toISOString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-bold font-sans">Action</span>
                <span className="text-indigo-400 font-semibold">{inspectLog.action}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-bold font-sans">Resource</span>
                <span className="text-foreground">{inspectLog.resource} ({inspectLog.resource_id || "—"})</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-bold font-sans">Actor User ID</span>
                <span className="text-foreground">{inspectLog.user_id || "SYSTEM"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-bold font-sans">Target Company ID</span>
                <span className="text-foreground">{inspectLog.company_id || "PLATFORM_ROOT"}</span>
              </div>
            </div>

            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-1">
                Sanitized Payload / Parameters:
              </span>
              <pre className="rounded-lg border bg-slate-950 p-3 text-[11px] font-mono text-indigo-300 overflow-x-auto max-h-64">
                {JSON.stringify(inspectLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setInspectLog(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
