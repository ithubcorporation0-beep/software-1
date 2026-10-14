"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users2,
  Search,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Building,
  UserCheck,
} from "lucide-react";
import { PlatformUserItem } from "@/lib/super-admin/server";
import { toggleSuperAdminAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface UsersClientProps {
  initialUsers: PlatformUserItem[];
  total: number;
  page: number;
  totalPages: number;
  currentSearch: string;
}

export function UsersClient({
  initialUsers,
  total,
  page,
  totalPages,
  currentSearch,
}: UsersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(currentSearch);
  const [feedback, setFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  // Toggle Super Admin confirmation dialog state
  const [targetUser, setTargetUser] = React.useState<PlatformUserItem | null>(null);

  const applyFilters = (newSearch?: string, newPage?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    const searchVal = newSearch !== undefined ? newSearch : search;
    const pageVal = newPage !== undefined ? newPage : 1;

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

    router.push(`/admin/users?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(search, 1);
  };

  const handleConfirmToggleSuperAdmin = async () => {
    if (!targetUser) return;
    setProcessingId(targetUser.id);
    setFeedback(null);
    const newStatus = !targetUser.is_super_admin;
    try {
      const res = await toggleSuperAdminAction(targetUser.id, newStatus);
      if (res.success) {
        setFeedback({ message: res.message || "Super Admin status updated.", type: "success" });
        setTargetUser(null);
        router.refresh();
      } else {
        setFeedback({ message: res.error || "Failed to update role.", type: "error" });
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Users2 className="h-5 w-5 text-indigo-500" />
          Global User Directory &amp; Platform Access Control
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Platform-level user oversight across all registered client tenants. Grant or revoke Platform Super Administrator privileges.
        </p>
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

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search platform users by full name or email address..."
                className="pl-8 text-xs h-9"
              />
            </div>
            <Button type="submit" size="sm" variant="default" className="text-xs h-9 px-4">
              Search
            </Button>
            {search && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  applyFilters("", 1);
                }}
                className="text-xs h-9"
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b border-border/80">
          <div className="flex items-center justify-between text-xs">
            <div className="font-semibold text-foreground">
              Total Users: <span className="font-mono text-indigo-400">{total}</span>
            </div>
            <div className="text-muted-foreground font-mono">
              Page {page} of {Math.max(1, totalPages)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {initialUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No users found matching search query.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Profile</TableHead>
                  <TableHead>Platform Role</TableHead>
                  <TableHead>Organization Memberships</TableHead>
                  <TableHead>Joined Platform</TableHead>
                  <TableHead className="text-right">Privilege Governance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase shrink-0">
                          {user.full_name?.slice(0, 2) || "U"}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{user.full_name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.is_super_admin ? (
                        <Badge variant="warning" className="text-[10px] h-4 font-mono font-bold">
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          SUPER ADMIN
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4 text-muted-foreground font-mono">
                          STANDARD
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.memberships.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground italic">No tenant assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {user.memberships.map((m) => (
                            <Badge
                              key={m.id}
                              variant="secondary"
                              className="text-[9px] py-0 h-4 font-normal"
                            >
                              <Building className="h-2.5 w-2.5 mr-1 opacity-70" />
                              {m.companyName} ({m.roleName})
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={user.is_super_admin ? "outline" : "default"}
                        disabled={processingId === user.id}
                        onClick={() => setTargetUser(user)}
                        className={`h-7 px-2.5 text-xs font-medium ${
                          user.is_super_admin
                            ? "text-destructive hover:bg-destructive/10 border-destructive/30"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        }`}
                      >
                        {user.is_super_admin ? (
                          <>Revoke Super Admin</>
                        ) : (
                          <>
                            <Shield className="h-3 w-3 mr-1" />
                            Make Super Admin
                          </>
                        )}
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
                  onClick={() => applyFilters(search, page - 1)}
                  className="h-7 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => applyFilters(search, page + 1)}
                  className="h-7 text-xs"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toggle Confirmation Modal */}
      <Dialog open={targetUser !== null} onOpenChange={(open) => !open && setTargetUser(null)}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-indigo-500" />
            {targetUser?.is_super_admin ? "Revoke Super Admin Privileges" : "Grant Super Admin Privileges"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {targetUser?.is_super_admin
              ? `Are you sure you want to revoke Platform Super Administrator privileges from ${targetUser.email}? They will lose cross-tenant oversight.`
              : `Granting Platform Super Administrator privileges to ${targetUser?.email} grants full platform-wide access, including company approval and tenant suspension capabilities.`}
          </DialogDescription>
        </DialogHeader>
        <div className="pt-3 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setTargetUser(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={targetUser?.is_super_admin ? "destructive" : "default"}
            disabled={processingId !== null}
            onClick={handleConfirmToggleSuperAdmin}
            className={!targetUser?.is_super_admin ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}
          >
            {processingId
              ? "Updating..."
              : targetUser?.is_super_admin
              ? "Confirm Revocation"
              : "Confirm Grant"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
