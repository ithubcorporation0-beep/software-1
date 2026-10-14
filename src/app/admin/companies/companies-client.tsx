"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  RefreshCw,
  Eye,
  ShieldAlert,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
} from "lucide-react";
import { PlatformCompanyItem } from "@/lib/super-admin/server";
import {
  approveCompanyAction,
  rejectCompanyAction,
  suspendCompanyAction,
  reactivateCompanyAction,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface CompaniesClientProps {
  initialCompanies: PlatformCompanyItem[];
  total: number;
  page: number;
  totalPages: number;
  currentStatus: string;
  currentSearch: string;
}

export function CompaniesClient({
  initialCompanies,
  total,
  page,
  totalPages,
  currentStatus,
  currentSearch,
}: CompaniesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(currentSearch);
  const [feedback, setFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  // Dialog States
  const [inspectCompany, setInspectCompany] = React.useState<PlatformCompanyItem | null>(null);
  const [confirmApproveId, setConfirmApproveId] = React.useState<string | null>(null);
  const [rejectId, setRejectId] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [suspendId, setSuspendId] = React.useState<string | null>(null);
  const [suspensionReason, setSuspensionReason] = React.useState("");
  const [reactivateId, setReactivateId] = React.useState<string | null>(null);

  const applyFilters = (newStatus?: string, newSearch?: string, newPage?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    const statusVal = newStatus !== undefined ? newStatus : currentStatus;
    const searchVal = newSearch !== undefined ? newSearch : search;
    const pageVal = newPage !== undefined ? newPage : 1;

    if (statusVal && statusVal !== "ALL") {
      params.set("status", statusVal);
    } else {
      params.delete("status");
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

    router.push(`/admin/companies?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(currentStatus, search, 1);
  };

  // Actions
  const handleApprove = async () => {
    if (!confirmApproveId) return;
    setProcessingId(confirmApproveId);
    setFeedback(null);
    try {
      const res = await approveCompanyAction(confirmApproveId);
      if (res.success) {
        setFeedback({ message: res.message || "Company successfully approved.", type: "success" });
        setConfirmApproveId(null);
        router.refresh();
      } else {
        setFeedback({ message: res.error || "Approval failed.", type: "error" });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId || !rejectionReason.trim()) return;
    setProcessingId(rejectId);
    setFeedback(null);
    try {
      const res = await rejectCompanyAction(rejectId, rejectionReason);
      if (res.success) {
        setFeedback({ message: res.message || "Company registration rejected.", type: "success" });
        setRejectId(null);
        setRejectionReason("");
        router.refresh();
      } else {
        setFeedback({ message: res.error || "Rejection failed.", type: "error" });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendId) return;
    setProcessingId(suspendId);
    setFeedback(null);
    try {
      const res = await suspendCompanyAction(suspendId, suspensionReason || undefined);
      if (res.success) {
        setFeedback({ message: res.message || "Company suspended.", type: "success" });
        setSuspendId(null);
        setSuspensionReason("");
        router.refresh();
      } else {
        setFeedback({ message: res.error || "Suspension failed.", type: "error" });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReactivate = async () => {
    if (!reactivateId) return;
    setProcessingId(reactivateId);
    setFeedback(null);
    try {
      const res = await reactivateCompanyAction(reactivateId);
      if (res.success) {
        setFeedback({ message: res.message || "Company reactivated.", type: "success" });
        setReactivateId(null);
        router.refresh();
      } else {
        setFeedback({ message: res.error || "Reactivation failed.", type: "error" });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const statusTabs = [
    { label: "All Companies", value: "ALL" },
    { label: "Pending Approvals", value: "PENDING" },
    { label: "Active", value: "ACTIVE" },
    { label: "Suspended", value: "SUSPENDED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            Company Approvals &amp; Tenant Lifecycle Management
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Enforce server-side registration approvals, workspace status transitions, and enterprise account suspensions without exposing confidential customer transactions.
          </p>
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
          <button onClick={() => setFeedback(null)} className="text-[11px] underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Controls */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
            {statusTabs.map((tab) => {
              const isSelected = (currentStatus || "ALL") === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => applyFilters(tab.value, search, 1)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
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
                placeholder="Search companies by name, workspace subdomain, or contact email..."
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
                  applyFilters(currentStatus, "", 1);
                }}
                className="text-xs h-9"
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Main Companies Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b border-border/80">
          <div className="flex items-center justify-between text-xs">
            <div className="font-semibold text-foreground">
              Total Organizations: <span className="font-mono text-indigo-400">{total}</span>
            </div>
            <div className="text-muted-foreground font-mono">
              Page {page} of {Math.max(1, totalPages)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {initialCompanies.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p>No organizations found matching the active filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company &amp; Subdomain</TableHead>
                  <TableHead>Authorized Contact</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Platform Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialCompanies.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {comp.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          <span className="text-indigo-400 font-medium">{comp.slug}</span>.ithub-erp.com
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="font-medium text-foreground">{comp.contact_name || comp.adminName || "Corporate Lead"}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {comp.contact_email || comp.adminEmail || "unspecified"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          comp.status === "ACTIVE"
                            ? "success"
                            : comp.status === "PENDING"
                            ? "warning"
                            : comp.status === "SUSPENDED"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-[10px] uppercase font-mono font-bold"
                      >
                        {comp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      <Badge variant="outline" className="text-[9px] h-4">
                        {comp.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {comp.memberCount} users
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(comp.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setInspectCompany(comp)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Inspect Metadata"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        {comp.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={processingId === comp.id}
                              onClick={() => setConfirmApproveId(comp.id)}
                              className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={processingId === comp.id}
                              onClick={() => {
                                setRejectId(comp.id);
                                setRejectionReason("");
                              }}
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}

                        {comp.status === "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processingId === comp.id}
                            onClick={() => {
                              setSuspendId(comp.id);
                              setSuspensionReason("");
                            }}
                            className="h-7 px-2 text-xs text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                          >
                            <AlertOctagon className="h-3.5 w-3.5 mr-1" />
                            Suspend
                          </Button>
                        )}

                        {comp.status === "SUSPENDED" && (
                          <Button
                            size="sm"
                            variant="default"
                            disabled={processingId === comp.id}
                            onClick={() => setReactivateId(comp.id)}
                            className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Reactivate
                          </Button>
                        )}

                        {comp.status === "REJECTED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processingId === comp.id}
                            onClick={() => setConfirmApproveId(comp.id)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Reconsider
                          </Button>
                        )}
                      </div>
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
                Showing page {page} of {totalPages} ({total} total companies)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => applyFilters(currentStatus, search, page - 1)}
                  className="h-7 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => applyFilters(currentStatus, search, page + 1)}
                  className="h-7 text-xs"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspect Company Modal */}
      <Dialog open={inspectCompany !== null} onOpenChange={(open) => !open && setInspectCompany(null)}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-500" />
            Company Registration Profile
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review public and administrative tenant parameters. Operational financial journals and private employee records are strictly isolated.
          </DialogDescription>
        </DialogHeader>

        {inspectCompany && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3 border rounded-lg p-3 bg-muted/20">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Company Name</span>
                <span className="font-semibold text-foreground">{inspectCompany.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Workspace Subdomain</span>
                <span className="font-mono text-indigo-400 font-semibold">{inspectCompany.slug}.ithub-erp.com</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Account Status</span>
                <Badge
                  variant={
                    inspectCompany.status === "ACTIVE"
                      ? "success"
                      : inspectCompany.status === "PENDING"
                      ? "warning"
                      : "destructive"
                  }
                  className="text-[10px] mt-0.5"
                >
                  {inspectCompany.status}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Subscription Plan</span>
                <span className="font-mono font-medium">{inspectCompany.plan}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Authorized Contact</span>
                <span className="text-foreground">{inspectCompany.contact_name || inspectCompany.adminName || "Primary Lead"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Contact Email</span>
                <span className="font-mono text-foreground">{inspectCompany.contact_email || inspectCompany.adminEmail || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Registration Date</span>
                <span className="font-mono text-muted-foreground">{new Date(inspectCompany.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Enrolled Personnel</span>
                <span className="font-mono font-semibold">{inspectCompany.memberCount} users</span>
              </div>
            </div>

            {inspectCompany.rejection_reason && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                <span className="font-semibold block text-[10px] uppercase">Recorded Rejection Reason:</span>
                <p className="mt-0.5">{inspectCompany.rejection_reason}</p>
              </div>
            )}

            {inspectCompany.approved_at && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-emerald-600 dark:text-emerald-400">
                <span className="font-semibold block text-[10px] uppercase">Super Admin Approval Log:</span>
                <p className="mt-0.5 font-mono text-[11px]">Approved on {new Date(inspectCompany.approved_at).toLocaleString()}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setInspectCompany(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Approve Confirmation Modal */}
      <Dialog open={confirmApproveId !== null} onOpenChange={(open) => !open && setConfirmApproveId(null)}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
            Approve Company Registration
          </DialogTitle>
          <DialogDescription className="text-xs">
            Approving will activate this tenant workspace and allow its authorized employees to access ERP modules according to their assigned roles.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-3 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setConfirmApproveId(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="default"
            disabled={processingId !== null}
            onClick={handleApprove}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            {processingId ? "Approving..." : "Confirm & Activate"}
          </Button>
        </div>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectId !== null} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            Reject Company Registration
          </DialogTitle>
          <DialogDescription className="text-xs">
            Provide a mandatory rationale. This will set the company status to REJECTED and block ERP login.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleReject} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Rejection Reason *</label>
            <Input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Unverified tax registration, unauthorized corporate identity"
              required
              className="text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setRejectId(null)}>
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

      {/* Suspend Modal */}
      <Dialog open={suspendId !== null} onOpenChange={(open) => !open && setSuspendId(null)}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-amber-500">
            <AlertOctagon className="h-4 w-4" />
            Suspend Company Account
          </DialogTitle>
          <DialogDescription className="text-xs">
            Suspending immediately revokes access for ALL company members at the server level. Active sessions will receive a suspension notice.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSuspend} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Suspension Reason (Optional)</label>
            <Input
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              placeholder="e.g. Billing non-compliance or terms violation"
              className="text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setSuspendId(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="default"
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              disabled={processingId !== null}
            >
              {processingId ? "Suspending..." : "Confirm Suspension"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Reactivate Modal */}
      <Dialog open={reactivateId !== null} onOpenChange={(open) => !open && setReactivateId(null)}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-500">
            <RefreshCw className="h-4 w-4" />
            Reactivate Company Account
          </DialogTitle>
          <DialogDescription className="text-xs">
            Restores full access to this organization and clears the suspension block.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-3 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setReactivateId(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="default"
            disabled={processingId !== null}
            onClick={handleReactivate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            {processingId ? "Reactivating..." : "Confirm Reactivation"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
