"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Clock,
  CheckCircle2,
  AlertOctagon,
  XCircle,
  Users,
  ShieldCheck,
  FileClock,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { SuperAdminMetrics } from "@/lib/super-admin/server";
import { approveCompanyAction, rejectCompanyAction } from "./actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface OverviewClientProps {
  metrics: SuperAdminMetrics;
}

export function OverviewClient({ metrics }: OverviewClientProps) {
  const [feedback, setFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  // Reject Dialog State
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

  const handleApprove = async (companyId: string) => {
    setProcessingId(companyId);
    setFeedback(null);
    try {
      const res = await approveCompanyAction(companyId);
      if (res.success) {
        setFeedback({ message: res.message || "Company approved successfully.", type: "success" });
      } else {
        setFeedback({ message: res.error || "Failed to approve company.", type: "error" });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    setProcessingId(selectedCompanyId);
    setFeedback(null);
    try {
      const res = await rejectCompanyAction(selectedCompanyId, rejectionReason);
      if (res.success) {
        setFeedback({ message: res.message || "Company registration rejected.", type: "success" });
        setRejectModalOpen(false);
      } else {
        setFeedback({ message: res.error || "Failed to reject company.", type: "error" });
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/80 bg-gradient-to-r from-card via-card to-indigo-950/20 p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              IT HUB Platform Super Admin Dashboard
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Platform-wide governance, company registration approvals, tenant suspension controls, and cross-organization telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/admin/companies">
            <Button size="sm" variant="outline" className="text-xs h-8">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              Manage All Companies
            </Button>
          </Link>
          <Link href="/admin/audit-logs">
            <Button size="sm" variant="default" className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white">
              <FileClock className="mr-1.5 h-3.5 w-3.5" />
              Platform Audit Logs
            </Button>
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-lg p-3 text-xs flex items-center justify-between gap-2 shadow-xs ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border border-destructive/30 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Companies */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Companies
            </span>
            <div className="rounded-md bg-primary/10 p-1.5 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {metrics.totalCompanies}
            </span>
            <span className="text-[11px] text-muted-foreground">registered tenants</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            <span>{metrics.activeCompanies} Active &amp; Operational</span>
          </div>
        </Card>

        {/* Pending Approvals */}
        <Card
          className={`p-4 flex flex-col justify-between transition-all ${
            metrics.pendingApprovals > 0
              ? "border-amber-500/50 bg-amber-500/5 shadow-amber-500/10 shadow-sm"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className="rounded-md bg-amber-500/10 p-1.5 text-amber-500">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {metrics.pendingApprovals}
            </span>
            <span className="text-[11px] text-muted-foreground">awaiting review</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            {metrics.pendingApprovals > 0 ? (
              <span className="font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
                Action required on server
              </span>
            ) : (
              <span className="text-muted-foreground">Queue clear</span>
            )}
            <Link
              href="/admin/companies?status=PENDING"
              className="font-medium text-primary hover:underline flex items-center gap-1"
            >
              Review queue <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Account Status Distribution */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status Breakdown
            </span>
            <div className="rounded-md bg-indigo-500/10 p-1.5 text-indigo-500">
              <AlertOctagon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Suspended:</span>
              <Badge variant="destructive" className="text-[10px] h-4">
                {metrics.suspendedCompanies}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rejected:</span>
              <Badge variant="outline" className="text-[10px] h-4">
                {metrics.rejectedCompanies}
              </Badge>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">
            Suspended tenants are locked out on server.
          </div>
        </Card>

        {/* Total Users */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Platform Users
            </span>
            <div className="rounded-md bg-purple-500/10 p-1.5 text-purple-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {metrics.totalUsers}
            </span>
            <span className="text-[11px] text-muted-foreground">total user accounts</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <span>{metrics.recentlyActiveUsers} active in last 24h</span>
          </div>
        </Card>
      </div>

      {/* Pending Registration Queue Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending Company Registration Requests
                {metrics.pendingRequests.length > 0 && (
                  <Badge variant="warning" className="text-xs font-mono ml-2">
                    {metrics.pendingRequests.length} Waiting
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Organizations in PENDING status are blocked from accessing operational ERP modules until Super Admin review and approval.
              </CardDescription>
            </div>
            <Link href="/admin/companies?status=PENDING">
              <Button variant="outline" size="sm" className="text-xs h-7">
                Full Approvals View
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {metrics.pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No Pending Requests</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                All tenant registration requests have been reviewed and processed. New registrations will automatically queue here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company &amp; Subdomain</TableHead>
                  <TableHead>Authorized Contact</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Decision Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.pendingRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {req.name}
                          <Badge variant="warning" className="text-[9px] h-3.5">
                            PENDING
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Subdomain: <span className="text-indigo-400 font-semibold">{req.slug}</span>.ithub-erp.com
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="font-medium text-foreground">{req.contact_name || "Primary Admin"}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {req.contact_email || "no-contact@registered.local"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {req.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {new Date(req.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          disabled={processingId === req.id}
                          onClick={() => handleApprove(req.id)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processingId === req.id}
                          onClick={() => openRejectModal(req.id)}
                          className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Platform Audit Trail */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileClock className="h-4 w-4 text-indigo-400" />
                Recent Platform Administrative Activity
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time security audit events across company approvals, privilege adjustments, and tenant lifecycle state changes.
              </CardDescription>
            </div>
            <Link href="/admin/audit-logs">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                View all logs <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {metrics.recentAuditLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No audit logs captured yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentAuditLogs.slice(0, 8).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()} · {new Date(log.created_at).toLocaleDateString()}
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
                    <TableCell className="text-xs font-medium text-foreground">
                      {log.resource}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground max-w-md truncate">
                      {typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details || "—")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject Company Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            Reject Company Registration
          </DialogTitle>
          <DialogDescription className="text-xs">
            Specify the formal rationale for declining this organization&apos;s registration request. This reason is permanently recorded in the audit ledger.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleConfirmReject} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Rejection Reason *</label>
            <Input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete business verification, unverified corporate domain"
              required
              className="text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={!rejectionReason.trim() || processingId !== null}
            >
              {processingId ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
