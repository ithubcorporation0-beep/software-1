"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import {
  Users,
  Kanban,
  Plus,
  Search,
  Filter,
  DollarSign,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  ExternalLink,
  Archive,
  Trash2,
  Edit,
  Clock,
  Sparkles,
} from "lucide-react";
import { Customer, Lead, LeadStatus } from "@/types/database.types";
import { CompanyMemberItem } from "@/lib/users/server";
import {
  createCustomerAction,
  updateCustomerAction,
  archiveCustomerAction,
  deleteCustomerAction,
  createLeadAction,
  moveLeadStageAction,
  updateLeadAction,
  ActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const KANBAN_STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id: "New", label: "New Leads", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { id: "Contacted", label: "Contacted", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  { id: "Qualified", label: "Qualified", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  { id: "Proposal", label: "Proposal Sent", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { id: "Negotiation", label: "In Negotiation", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { id: "Won", label: "Closed Won", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  { id: "Lost", label: "Closed Lost", color: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
];

interface CrmClientProps {
  companyId: string;
  initialCustomers: Customer[];
  initialLeads: Lead[];
  totalCustomers: number;
  totalPipelineValue: number;
  members: CompanyMemberItem[];
}

export function CrmClient({
  companyId,
  initialCustomers,
  initialLeads,
  totalCustomers,
  totalPipelineValue,
  members,
}: CrmClientProps) {
  const [activeTab, setActiveTab] = React.useState<"customers" | "pipeline">("customers");

  // Feedback banner
  const [feedback, setFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(null);

  // --- CUSTOMER ROSTER STATE ---
  const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers);
  const [searchCustomer, setSearchCustomer] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const pageSize = 8;

  // Customer Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);

  // Add Customer Action
  const [createCustomerState, createCustomerFormAction, isCreatingCustomer] = useActionState<ActionState, FormData>(
    async (state, formData) => {
      const res = await createCustomerAction(companyId, state, formData);
      if (res.success && res.data) {
        setCustomers((prev) => [res.data, ...prev]);
        setIsAddCustomerOpen(false);
        setFeedback({ message: res.message || "Customer successfully created.", type: "success" });
      } else {
        setFeedback({ message: res.error || "Failed to create customer.", type: "error" });
      }
      return res;
    },
    { success: false }
  );

  // Edit Customer Action
  const [editCustomerState, editCustomerFormAction, isUpdatingCustomer] = useActionState<ActionState, FormData>(
    async (state, formData) => {
      if (!editingCustomer) return state;
      const res = await updateCustomerAction(companyId, editingCustomer.id, state, formData);
      if (res.success && res.data) {
        setCustomers((prev) => prev.map((c) => (c.id === editingCustomer.id ? res.data : c)));
        setEditingCustomer(null);
        setFeedback({ message: "Customer profile updated successfully.", type: "success" });
      } else {
        setFeedback({ message: res.error || "Failed to update customer.", type: "error" });
      }
      return res;
    },
    { success: false }
  );

  const handleArchiveCustomer = async (id: string) => {
    setFeedback(null);
    const res = await archiveCustomerAction(companyId, id);
    if (res.success) {
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status: "Archived" } : c)));
      setFeedback({ message: "Customer archived.", type: "success" });
    } else {
      setFeedback({ message: res.error || "Failed to archive.", type: "error" });
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setFeedback(null);
    const res = await deleteCustomerAction(companyId, id);
    if (res.success) {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setFeedback({ message: "Customer deleted successfully.", type: "success" });
    } else {
      setFeedback({ message: res.error || "Failed to delete customer.", type: "error" });
    }
  };

  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        (c.company_name && c.company_name.toLowerCase().includes(searchCustomer.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(searchCustomer.toLowerCase())) ||
        c.customer_code.toLowerCase().includes(searchCustomer.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchesType = typeFilter === "ALL" || c.customer_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [customers, searchCustomer, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const pagedCustomers = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  // --- LEADS & KANBAN STATE ---
  const [leads, setLeads] = React.useState<Lead[]>(initialLeads);
  const [searchLead, setSearchLead] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState("ALL");
  const [isAddLeadOpen, setIsAddLeadOpen] = React.useState(false);
  const [movingLead, setMovingLead] = React.useState<{ lead: Lead; targetStage: LeadStatus } | null>(null);
  const [lostReasonInput, setLostReasonInput] = React.useState("");

  // Create Lead Action
  const [createLeadState, createLeadFormAction, isCreatingLead] = useActionState<ActionState, FormData>(
    async (state, formData) => {
      const res = await createLeadAction(companyId, state, formData);
      if (res.success && res.data) {
        setLeads((prev) => [res.data, ...prev]);
        setIsAddLeadOpen(false);
        setFeedback({ message: res.message || "Lead created.", type: "success" });
      } else {
        setFeedback({ message: res.error || "Failed to create lead.", type: "error" });
      }
      return res;
    },
    { success: false }
  );

  const handleStageChange = async (lead: Lead, targetStage: LeadStatus) => {
    if (targetStage === "Lost") {
      setMovingLead({ lead, targetStage });
      return;
    }
    setFeedback(null);
    const res = await moveLeadStageAction(companyId, lead.id, targetStage);
    if (res.success && res.data) {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? res.data : l)));
    } else {
      setFeedback({ message: res.error || "Failed to update stage.", type: "error" });
    }
  };

  const confirmLostStage = async () => {
    if (!movingLead) return;
    setFeedback(null);
    const res = await moveLeadStageAction(
      companyId,
      movingLead.lead.id,
      "Lost",
      lostReasonInput || "No reason specified"
    );
    if (res.success && res.data) {
      setLeads((prev) => prev.map((l) => (l.id === movingLead.lead.id ? res.data : l)));
      setMovingLead(null);
      setLostReasonInput("");
    } else {
      setFeedback({ message: res.error || "Failed to update stage.", type: "error" });
    }
  };

  const filteredLeads = React.useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch =
        l.name.toLowerCase().includes(searchLead.toLowerCase()) ||
        (l.company_name && l.company_name.toLowerCase().includes(searchLead.toLowerCase())) ||
        (l.email && l.email.toLowerCase().includes(searchLead.toLowerCase())) ||
        l.lead_code.toLowerCase().includes(searchLead.toLowerCase());
      const matchesSource = sourceFilter === "ALL" || l.source === sourceFilter;
      return matchesSearch && matchesSource;
    });
  }, [leads, searchLead, sourceFilter]);

  const pipelineValuation = React.useMemo(() => {
    return filteredLeads
      .filter((l) => l.status !== "Lost")
      .reduce((acc, l) => acc + Number(l.expected_value || 0), 0);
  }, [filteredLeads]);

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-md p-3 text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top View Selector & Quick KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("customers")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "customers"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Customer Directory
            <Badge variant="outline" className="ml-1 text-[10px] h-4">
              {customers.length}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "pipeline"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Kanban className="h-4 w-4" />
            Lead Kanban Pipeline
            <Badge variant="outline" className="ml-1 text-[10px] h-4">
              {leads.length}
            </Badge>
          </button>
        </div>

        {/* Action Button */}
        {activeTab === "customers" ? (
          <Button onClick={() => setIsAddCustomerOpen(true)} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            New Customer
          </Button>
        ) : (
          <Button onClick={() => setIsAddLeadOpen(true)} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Pipeline Lead
          </Button>
        )}
      </div>

      {/* =========================================================================
          VIEW 1: CUSTOMER DIRECTORY
      ========================================================================= */}
      {activeTab === "customers" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">
                  Commercial Client Accounts &amp; Roster
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage commercial accounts, contacts, WhatsApp channels, and historical ledgers.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchCustomer}
                  onChange={(e) => {
                    setSearchCustomer(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by customer name, company, code, or email..."
                  className="pl-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Lead">Lead</option>
                  <option value="Archived">Archived</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="ALL">All Account Types</option>
                  <option value="B2B">B2B Commercial</option>
                  <option value="Enterprise">Enterprise</option>
                  <option value="SMB">SMB</option>
                  <option value="B2C">B2C Retail</option>
                  <option value="Government">Government</option>
                  <option value="Wholesale">Wholesale</option>
                </select>
              </div>
            </div>

            {/* Customers Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Code / Name</TableHead>
                  <TableHead>Corporate Account</TableHead>
                  <TableHead>Contact &amp; Channels</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Valuation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                      No customer accounts found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedCustomers.map((cust) => (
                    <TableRow key={cust.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <Link
                            href={`/crm/customers/${cust.id}`}
                            className="font-semibold text-foreground hover:text-primary flex items-center gap-1.5"
                          >
                            {cust.name}
                            <ArrowRight className="h-3 w-3 opacity-60" />
                          </Link>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {cust.customer_code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">
                          {cust.company_name || "Direct Individual"}
                        </div>
                        {cust.tax_number && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Tax ID: {cust.tax_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {cust.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[140px]">{cust.email}</span>
                          </div>
                        )}
                        {cust.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                            <Phone className="h-2.5 w-2.5 shrink-0" />
                            {cust.phone}
                          </div>
                        )}
                        {cust.whatsapp && (
                          <a
                            href={`https://wa.me/${cust.whatsapp.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            WhatsApp: {cust.whatsapp}
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {cust.customer_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            cust.status === "Active"
                              ? "success"
                              : cust.status === "Archived"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {cust.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-foreground">
                        ${Number(cust.total_spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/crm/customers/${cust.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" title="View Customer Details">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setEditingCustomer(cust)}
                            title="Edit Customer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          {cust.status !== "Archived" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-amber-500 hover:text-amber-600"
                              onClick={() => handleArchiveCustomer(cust.id)}
                              title="Archive Customer"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive/80"
                              onClick={() => handleDeleteCustomer(cust.id)}
                              title="Delete Customer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>
                  Showing page {page} of {totalPages} ({filteredCustomers.length} total)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          {/* Add Customer Modal */}
          <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">Create Customer Account</DialogTitle>
              <DialogDescription className="text-xs">
                Enroll a commercial account with contact channels and billing details.
              </DialogDescription>
            </DialogHeader>

            <form action={createCustomerFormAction} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Contact Name *</label>
                  <Input name="name" placeholder="e.g. Jane Doe" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Company Entity</label>
                  <Input name="companyName" placeholder="e.g. Nexus Logistics LLC" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Official Email</label>
                  <Input name="email" type="email" placeholder="jane@nexus.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Phone Number</label>
                  <Input name="phone" placeholder="+1 (555) 012-3456" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">WhatsApp Direct</label>
                  <Input name="whatsapp" placeholder="+15550123456" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Customer Type</label>
                  <select
                    name="customerType"
                    defaultValue="B2B"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="B2B">B2B Commercial</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="SMB">SMB</option>
                    <option value="B2C">B2C Retail</option>
                    <option value="Government">Government</option>
                    <option value="Wholesale">Wholesale</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Status</label>
                  <select
                    name="status"
                    defaultValue="Active"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Active">Active Customer</option>
                    <option value="Lead">Lead / Prospect</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Tax ID / VAT</label>
                  <Input name="taxNumber" placeholder="TAX-998822" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground">Physical Address</label>
                  <Input name="address" placeholder="100 Tech Blvd, Suite 400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">City</label>
                  <Input name="city" placeholder="San Francisco" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Internal Account Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Key relationship background, credit considerations, or terms..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCustomerOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isCreatingCustomer}>
                  {isCreatingCustomer ? "Enrolling Customer..." : "Save Customer"}
                </Button>
              </div>
            </form>
          </Dialog>

          {/* Edit Customer Modal */}
          <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">Edit Customer Account</DialogTitle>
              <DialogDescription className="text-xs">
                Update account contacts and profile information.
              </DialogDescription>
            </DialogHeader>

            {editingCustomer && (
              <form action={editCustomerFormAction} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Contact Name *</label>
                    <Input name="name" defaultValue={editingCustomer.name} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Company Entity</label>
                    <Input name="companyName" defaultValue={editingCustomer.company_name || ""} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Official Email</label>
                    <Input name="email" type="email" defaultValue={editingCustomer.email || ""} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Phone Number</label>
                    <Input name="phone" defaultValue={editingCustomer.phone || ""} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">WhatsApp Direct</label>
                    <Input name="whatsapp" defaultValue={editingCustomer.whatsapp || ""} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Customer Type</label>
                    <select
                      name="customerType"
                      defaultValue={editingCustomer.customer_type}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="B2B">B2B Commercial</option>
                      <option value="Enterprise">Enterprise</option>
                      <option value="SMB">SMB</option>
                      <option value="B2C">B2C Retail</option>
                      <option value="Government">Government</option>
                      <option value="Wholesale">Wholesale</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Status</label>
                    <select
                      name="status"
                      defaultValue={editingCustomer.status}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Lead">Lead</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Tax ID / VAT</label>
                    <Input name="taxNumber" defaultValue={editingCustomer.tax_number || ""} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground">Physical Address</label>
                    <Input name="address" defaultValue={editingCustomer.address || ""} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">City</label>
                    <Input name="city" defaultValue={editingCustomer.city || ""} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Account Notes</label>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={editingCustomer.notes || ""}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingCustomer(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isUpdatingCustomer}>
                    {isUpdatingCustomer ? "Updating..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}
          </Dialog>
        </Card>
      )}

      {/* =========================================================================
          VIEW 2: LEAD KANBAN PIPELINE
      ========================================================================= */}
      {activeTab === "pipeline" && (
        <div className="space-y-4">
          {/* Pipeline Summary Bar */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Total Active Leads</div>
                <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                  {filteredLeads.filter((l) => l.status !== "Lost").length}
                </div>
              </div>
              <Users className="h-6 w-6 text-primary opacity-60" />
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Pipeline Expected Value</div>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ${pipelineValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <DollarSign className="h-6 w-6 text-emerald-500 opacity-60" />
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Win Ratio (Won vs Lost)</div>
                <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-0.5">
                  {leads.filter((l) => l.status === "Won").length} won / {leads.filter((l) => l.status === "Lost").length} lost
                </div>
              </div>
              <Sparkles className="h-6 w-6 text-sky-500 opacity-60" />
            </Card>
          </div>

          {/* Kanban Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchLead}
                onChange={(e) => setSearchLead(e.target.value)}
                placeholder="Search leads by prospect name, company, code..."
                className="pl-8 text-xs"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Lead Sources</option>
              <option value="Website">Website Inbound</option>
              <option value="Referral">Referral</option>
              <option value="Inbound Call">Inbound Call</option>
              <option value="Conference / Event">Conference / Event</option>
              <option value="LinkedIn / Social">LinkedIn / Social</option>
              <option value="Cold Outreach">Cold Outreach</option>
              <option value="Partner">Partner</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Kanban Board Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5 overflow-x-auto pb-4">
            {KANBAN_STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.status === stage.id);
              const stageValue = stageLeads.reduce((acc, l) => acc + Number(l.expected_value || 0), 0);

              return (
                <div
                  key={stage.id}
                  className="rounded-lg border bg-muted/20 p-2.5 flex flex-col justify-between min-w-[220px]"
                >
                  {/* Column Header */}
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                        {stage.label}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {stageLeads.length}
                      </Badge>
                    </div>

                    <div className="text-[10px] text-muted-foreground font-mono mb-2">
                      ${stageValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </div>

                    {/* Lead Cards List */}
                    <div className="space-y-2">
                      {stageLeads.length === 0 ? (
                        <div className="py-6 text-center text-[11px] text-muted-foreground/60 border border-dashed rounded">
                          No leads
                        </div>
                      ) : (
                        stageLeads.map((lead) => (
                          <div
                            key={lead.id}
                            className="rounded-md border bg-card p-3 shadow-2xs space-y-2 text-xs transition-shadow hover:shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                <div className="font-semibold text-foreground leading-snug">
                                  {lead.name}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {lead.company_name || "Direct Prospect"}
                                </div>
                              </div>
                              <span className="text-[9px] font-mono text-muted-foreground/80 shrink-0">
                                {lead.lead_code}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                ${Number(lead.expected_value || 0).toLocaleString()}
                              </span>
                              <Badge variant="outline" className="text-[9px] h-3.5">
                                {lead.source}
                              </Badge>
                            </div>

                            {lead.follow_up_date && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                                <Clock className="h-3 w-3" />
                                Follow-up: {new Date(lead.follow_up_date).toLocaleDateString()}
                              </div>
                            )}

                            {lead.lost_reason && (
                              <div className="text-[10px] text-rose-500 italic">
                                Reason: {lead.lost_reason}
                              </div>
                            )}

                            {/* Move Stage Selector */}
                            <div className="border-t pt-1.5 flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">Stage:</span>
                              <select
                                value={lead.status}
                                onChange={(e) => handleStageChange(lead, e.target.value as LeadStatus)}
                                className="h-6 rounded border border-input bg-background px-1 text-[10px] font-medium"
                              >
                                {KANBAN_STAGES.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Lead Dialog */}
          <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">Add Lead Prospect</DialogTitle>
              <DialogDescription className="text-xs">
                Enroll a new sales opportunity into the Kanban pipeline.
              </DialogDescription>
            </DialogHeader>

            <form action={createLeadFormAction} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Prospect Name *</label>
                  <Input name="name" placeholder="e.g. Michael Scott" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Target Company</label>
                  <Input name="companyName" placeholder="e.g. Dunder Mifflin" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Email</label>
                  <Input name="email" type="email" placeholder="michael@dunder.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Phone</label>
                  <Input name="phone" placeholder="+1 (555) 321-9988" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Source</label>
                  <select
                    name="source"
                    defaultValue="Website"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Inbound Call">Inbound Call</option>
                    <option value="Conference / Event">Conference / Event</option>
                    <option value="LinkedIn / Social">LinkedIn / Social</option>
                    <option value="Cold Outreach">Cold Outreach</option>
                    <option value="Partner">Partner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Initial Stage</label>
                  <select
                    name="status"
                    defaultValue="New"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {KANBAN_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Expected Value ($)</label>
                  <Input
                    name="expectedValue"
                    type="number"
                    min={0}
                    step={100}
                    defaultValue={5000}
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Assigned Owner</label>
                  <select
                    name="assignedTo"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.fullName} ({m.roleName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Follow-up Date</label>
                  <Input name="followUpDate" type="date" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Opportunity Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Pain points, estimated budget, decision timeline..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddLeadOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isCreatingLead}>
                  {isCreatingLead ? "Creating Lead..." : "Save Pipeline Lead"}
                </Button>
              </div>
            </form>
          </Dialog>

          {/* Prompt Reason for Closed Lost */}
          <Dialog open={!!movingLead} onOpenChange={(open) => !open && setMovingLead(null)}>
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">Record Closed Lost Reason</DialogTitle>
              <DialogDescription className="text-xs">
                Document why this opportunity did not close to preserve sales intelligence.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Reason for Loss *</label>
                <Input
                  value={lostReasonInput}
                  onChange={(e) => setLostReasonInput(e.target.value)}
                  placeholder="e.g. Chose competitor, budget freeze, project postponed"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setMovingLead(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={confirmLostStage}>
                  Confirm Closed Lost
                </Button>
              </div>
            </div>
          </Dialog>
        </div>
      )}
    </div>
  );
}
