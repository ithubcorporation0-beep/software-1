"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Trash2,
  ExternalLink,
  MessageSquare,
  Paperclip,
  Briefcase,
  CreditCard,
  ShieldAlert,
} from "lucide-react";
import { Customer, CustomerNote, CustomerActivity, CustomerDocument } from "@/types/database.types";
import {
  addCustomerNoteAction,
  archiveCustomerAction,
  deleteCustomerAction,
  ActionState,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface CustomerDetailClientProps {
  companyId: string;
  customer: Customer;
  initialNotes: CustomerNote[];
  initialActivities: CustomerActivity[];
  links: {
    invoicesCount: number;
    paymentsCount: number;
    projectsCount: number;
  };
}

export function CustomerDetailClient({
  companyId,
  customer,
  initialNotes,
  initialActivities,
  links,
}: CustomerDetailClientProps) {
  const router = useRouter();
  const [notes, setNotes] = React.useState<CustomerNote[]>(initialNotes);
  const [activities, setActivities] = React.useState<CustomerActivity[]>(initialActivities);
  const [feedback, setFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(null);

  // Add Note Server Action
  const [noteState, addNoteFormAction, isAddingNote] = useActionState<ActionState, FormData>(
    async (state, formData) => {
      const res = await addCustomerNoteAction(companyId, customer.id, formData);
      if (res.success && res.data) {
        setNotes((prev) => [res.data, ...prev]);
        setFeedback({ message: "Note appended successfully.", type: "success" });
      } else {
        setFeedback({ message: res.error || "Failed to add note.", type: "error" });
      }
      return res;
    },
    { success: false }
  );

  const handleArchive = async () => {
    setFeedback(null);
    const res = await archiveCustomerAction(companyId, customer.id);
    if (res.success) {
      setFeedback({ message: "Customer archived successfully.", type: "success" });
      router.refresh();
    } else {
      setFeedback({ message: res.error || "Failed to archive customer.", type: "error" });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete customer '${customer.name}'?`)) return;
    setFeedback(null);
    const res = await deleteCustomerAction(companyId, customer.id);
    if (res.success) {
      router.push("/crm");
    } else {
      setFeedback({ message: res.error || "Failed to delete customer.", type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/crm"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Customer Directory
        </Link>
        <div className="flex items-center gap-2">
          {customer.status !== "Archived" ? (
            <Button variant="outline" size="sm" onClick={handleArchive} className="text-xs">
              <Archive className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              Archive Customer
            </Button>
          ) : (
            <Button variant="destructive" size="sm" onClick={handleDelete} className="text-xs">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete Account
            </Button>
          )}
        </div>
      </div>

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
          <button onClick={() => setFeedback(null)} className="underline text-[11px] opacity-80">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Profile Banner */}
      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
                <Badge
                  variant={
                    customer.status === "Active"
                      ? "success"
                      : customer.status === "Archived"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {customer.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {customer.customer_type}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                <span className="font-mono text-foreground font-semibold">{customer.customer_code}</span>
                {customer.company_name && (
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {customer.company_name}
                  </span>
                )}
                {customer.city && <span>{customer.city}, {customer.country}</span>}
                <span>Enrolled: {new Date(customer.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Total Spend Stat */}
            <div className="border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-6 space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Lifetime Account Valuation
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                ${Number(customer.total_spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid: Left 2 Cols Profile & Linked Modules, Right 1 Col Timeline & Notes */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Contact Details & Connected Modules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile & Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Account &amp; Communication Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">Official Email</div>
                  <div className="font-medium text-foreground">
                    {customer.email ? (
                      <a href={`mailto:${customer.email}`} className="text-primary hover:underline flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">Direct Telephone</div>
                  <div className="font-medium text-foreground font-mono">
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="hover:underline flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </a>
                    ) : (
                      "Not provided"
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">WhatsApp Channel</div>
                  <div>
                    {customer.whatsapp ? (
                      <a
                        href={`https://wa.me/${customer.whatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        <ExternalLink className="h-3 w-3" />
                        +{customer.whatsapp} (Open Chat)
                      </a>
                    ) : (
                      "No WhatsApp registered"
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">Tax Registration / VAT</div>
                  <div className="font-mono text-foreground">{customer.tax_number || "Not specified"}</div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <div className="text-muted-foreground font-medium">Physical Address</div>
                  <div className="text-foreground">
                    {customer.address ? `${customer.address}, ${customer.city || ""}, ${customer.country}` : "No physical address specified"}
                  </div>
                </div>
              </div>

              {customer.notes && (
                <div className="border-t pt-3 space-y-1">
                  <div className="text-muted-foreground font-medium">Profile Background</div>
                  <p className="text-muted-foreground leading-relaxed bg-muted/20 p-2.5 rounded border">
                    {customer.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected Modules Integration Hub */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Cross-Module Commercial Ledger</CardTitle>
              <CardDescription className="text-xs">
                Real-time transactional relationships across subsequent ERP enterprise modules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {/* 1. Commercial Invoices */}
                <div className="rounded-md border p-3 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Invoices
                    </span>
                    <Badge variant="outline" className="text-[9px]">Phase 3</Badge>
                  </div>
                  <div className="text-lg font-bold font-mono text-muted-foreground">0</div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Invoicing module pending
                  </p>
                </div>

                {/* 2. Recorded Payments */}
                <div className="rounded-md border p-3 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                      Payments
                    </span>
                    <Badge variant="outline" className="text-[9px]">Phase 3</Badge>
                  </div>
                  <div className="text-lg font-bold font-mono text-muted-foreground">$0.00</div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Finance ledger pending
                  </p>
                </div>

                {/* 3. PMO Projects */}
                <div className="rounded-md border p-3 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-sky-500" />
                      Projects
                    </span>
                    <Badge variant="outline" className="text-[9px]">Phase 4</Badge>
                  </div>
                  <div className="text-lg font-bold font-mono text-muted-foreground">0</div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    PMO module pending
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permitted Documents Shell */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-primary" />
                    Permitted Account Documents
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Client MSAs, tax exemption forms, and credit disclosures.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {customer.documents && customer.documents.length > 0 ? (
                <div className="space-y-2">
                  {customer.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2.5 rounded border text-xs bg-card"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium text-foreground">{doc.name}</div>
                          <div className="text-[10px] text-muted-foreground">{doc.size || "PDF File"}</div>
                        </div>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed rounded bg-muted/10">
                  No documents linked to this account. Documents storage adapter available in Phase 2.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Activity Timeline & Internal Notes */}
        <div className="space-y-6">
          {/* Internal Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                Internal Team Notes
              </CardTitle>
              <CardDescription className="text-xs">
                Private notes visible only to authorized internal members.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add Note Form */}
              <form action={addNoteFormAction} className="space-y-2">
                <textarea
                  name="content"
                  rows={2}
                  placeholder="Record call summary, pricing agreement, or follow-up task..."
                  required
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" className="h-7 text-xs" disabled={isAddingNote}>
                    {isAddingNote ? "Posting..." : "Post Note"}
                  </Button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-2 pt-2 border-t max-h-72 overflow-y-auto">
                {notes.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No notes recorded yet.
                  </div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="p-2.5 rounded border bg-muted/20 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{note.author_name}</span>
                        <span className="font-mono">{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-foreground leading-snug">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline & History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Customer History Timeline
              </CardTitle>
              <CardDescription className="text-xs">
                Audited timeline of relationship touchpoints.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {activities.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No historical events recorded.
                  </div>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5 text-xs pb-3 border-b last:border-b-0">
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-semibold text-foreground leading-tight">{act.title}</div>
                        {act.description && (
                          <p className="text-muted-foreground leading-snug">{act.description}</p>
                        )}
                        <span className="text-[10px] text-muted-foreground/80 font-mono block">
                          {new Date(act.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
