"use client";

import * as React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileText,
  ExternalLink,
  QrCode,
  Send,
  RotateCcw,
  Ban,
  PlusCircle,
  MinusCircle,
  Info,
  Clock,
  Eye,
  Check,
  X,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  getInvoiceFbrPreviewAction,
  submitInvoiceToFbrAction,
  reconcileInvoiceFbrStatusAction,
  createCreditNoteForFbrAction,
  createDebitNoteForFbrAction,
  cancelFbrInvoiceAction,
  getInvoiceFbrSubmissionHistoryAction,
} from "@/app/(erp)/sales/actions";
import {
  FbrInvoicePreview,
  FbrInvoiceSubmissionLog,
  FbrInvoiceOutcomeStatus,
} from "@/lib/fbr-types";
import { Invoice } from "@/types/database.types";

interface FbrDigitalInvoicingPanelProps {
  companyId: string;
  invoice: Invoice;
  onStatusUpdated?: (newStatus: string, irn?: string) => void;
}

export function FbrDigitalInvoicingPanel({
  companyId,
  invoice,
  onStatusUpdated,
}: FbrDigitalInvoicingPanelProps) {
  const [currentStatus, setCurrentStatus] = React.useState<string>(
    invoice.fbr_status || "NOT_SUBMITTED"
  );
  const [fbrIrn, setFbrIrn] = React.useState<string | null>(invoice.fbr_irn || null);
  const [fbrUuid, setFbrUuid] = React.useState<string | null>(invoice.fbr_uuid || null);
  const [fbrQrData, setFbrQrData] = React.useState<string | null>(invoice.fbr_qr_code_data || null);

  // Preview & Modal States
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [previewData, setPreviewData] = React.useState<FbrInvoicePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);

  // Action States
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isReconciling, setIsReconciling] = React.useState(false);
  const [actionFeedback, setActionFeedback] = React.useState<{ text: string; type: "success" | "error" | "warning" } | null>(null);

  // Credit / Debit Note & Cancellation Modals
  const [isCreditModalOpen, setIsCreditModalOpen] = React.useState(false);
  const [creditReason, setCreditReason] = React.useState("");
  const [creditAmount, setCreditAmount] = React.useState(invoice.grand_total.toString());
  const [isProcessingCredit, setIsProcessingCredit] = React.useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [isProcessingCancel, setIsProcessingCancel] = React.useState(false);

  // Submission History State
  const [history, setHistory] = React.useState<FbrInvoiceSubmissionLog[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

  // Confirmation Dialogue State
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  // Load preview data
  const handleOpenPreview = async () => {
    setIsLoadingPreview(true);
    setActionFeedback(null);
    try {
      const res = await getInvoiceFbrPreviewAction(companyId, invoice.id);
      if (res.success && res.data) {
        setPreviewData(res.data);
        setIsPreviewOpen(true);
      } else {
        setActionFeedback({ text: res.error || "Failed to load FBR preview", type: "error" });
      }
    } catch (err: any) {
      setActionFeedback({ text: err.message || "Preview error", type: "error" });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Submit to FBR
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setActionFeedback(null);
    setIsConfirmOpen(false);

    try {
      const res = await submitInvoiceToFbrAction(companyId, invoice.id);
      if (res.success && res.data) {
        setCurrentStatus("ACCEPTED");
        setFbrIrn(res.data.fbr_irn || null);
        setFbrUuid(res.data.fbr_uuid || null);
        setFbrQrData(res.data.fbr_qr_code_data || null);
        setActionFeedback({
          text: `Invoice cleared by FBR! IRN: ${res.data.fbr_irn}`,
          type: "success",
        });
        setIsPreviewOpen(false);
        if (onStatusUpdated) onStatusUpdated("ACCEPTED", res.data.fbr_irn);
      } else {
        const outcome = res.status || "REJECTED";
        setCurrentStatus(outcome);
        setActionFeedback({
          text: res.message || "FBR submission rejected.",
          type: outcome === "UNKNOWN" ? "warning" : "error",
        });
      }
    } catch (err: any) {
      setCurrentStatus("UNKNOWN");
      setActionFeedback({
        text: `Network timeout: ${err.message || "Submission outcome is unknown. Please reconcile."}`,
        type: "warning",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reconcile Status
  const handleReconcile = async () => {
    setIsReconciling(true);
    setActionFeedback(null);
    try {
      const res = await reconcileInvoiceFbrStatusAction(companyId, invoice.id);
      if (res.success) {
        if (res.status === "ACCEPTED") {
          setCurrentStatus("ACCEPTED");
          if (res.data?.fbr_irn) setFbrIrn(res.data.fbr_irn);
          setActionFeedback({ text: res.message || "Reconciled as Accepted.", type: "success" });
        } else {
          setCurrentStatus(res.status || "PENDING");
          setActionFeedback({ text: res.message || "Reconciled as Pending.", type: "success" });
        }
      } else {
        setActionFeedback({ text: res.message || "Reconciliation inconclusive.", type: "warning" });
      }
    } catch (err: any) {
      setActionFeedback({ text: err.message || "Reconciliation error", type: "error" });
    } finally {
      setIsReconciling(false);
    }
  };

  // Issue Credit Note
  const handleIssueCreditNote = async () => {
    if (!creditReason.trim()) return;
    setIsProcessingCredit(true);
    try {
      const amt = parseFloat(creditAmount) || Number(invoice.grand_total);
      const res = await createCreditNoteForFbrAction(companyId, invoice.id, creditReason.trim(), amt);
      if (res.success) {
        setActionFeedback({ text: res.message || "Credit Note successfully submitted to FBR.", type: "success" });
        setIsCreditModalOpen(false);
      } else {
        setActionFeedback({ text: res.message || "Credit Note submission failed.", type: "error" });
      }
    } catch (err: any) {
      setActionFeedback({ text: err.message || "Credit Note error", type: "error" });
    } finally {
      setIsProcessingCredit(false);
    }
  };

  // Cancel Invoice
  const handleCancelInvoice = async () => {
    if (!cancelReason.trim()) return;
    setIsProcessingCancel(true);
    try {
      const res = await cancelFbrInvoiceAction(companyId, invoice.id, cancelReason.trim());
      if (res.success) {
        setCurrentStatus("CANCELLED");
        setActionFeedback({ text: res.message || "Invoice cancelled.", type: "success" });
        setIsCancelModalOpen(false);
        if (onStatusUpdated) onStatusUpdated("CANCELLED");
      } else {
        setActionFeedback({ text: res.message || "Cancellation failed.", type: "error" });
      }
    } catch (err: any) {
      setActionFeedback({ text: err.message || "Cancellation error", type: "error" });
    } finally {
      setIsProcessingCancel(false);
    }
  };

  // Load History
  const handleOpenHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const logs = await getInvoiceFbrSubmissionHistoryAction(companyId, invoice.id);
      setHistory(logs || []);
      setIsHistoryOpen(true);
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const isAccepted = currentStatus === "ACCEPTED" || Boolean(fbrIrn);
  const isUnknown = currentStatus === "UNKNOWN";
  const isRejected = currentStatus === "REJECTED" || currentStatus === "FAILED";

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                FBR Digital Invoicing Integration (DI v1.12)
              </CardTitle>
              <CardDescription className="text-xs">
                Electronic invoice validation, fiscal QR code generation, and PRAL gateway clearance.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={
                isAccepted
                  ? "default"
                  : isUnknown
                  ? "outline"
                  : isRejected
                  ? "destructive"
                  : "secondary"
              }
              className={`text-xs ${
                isAccepted
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : isUnknown
                  ? "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                  : ""
              }`}
            >
              {isAccepted
                ? "Accepted & Cleared"
                : isUnknown
                ? "Outcome Unknown (Timeout)"
                : isRejected
                ? "Submission Rejected"
                : "Not Submitted"}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenHistory}
              disabled={isLoadingHistory}
              className="h-7 text-[11px] gap-1"
            >
              <Clock className="h-3 w-3" />
              <span>History</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5 text-xs">
        {/* ALERT: UNKNOWN TIMEOUT OUTCOME */}
        {isUnknown && (
          <div className="rounded-lg border border-amber-300 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40 p-3 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-xs">Uncertain Submission State (Duplicate Protection Active)</p>
              <p className="text-[11px] leading-relaxed">
                The transmission timed out or lost connection before receiving FBR confirmation.{" "}
                <span className="font-bold underline">
                  Automatic re-submission is locked to prevent accidental double-registration on the government portal.
                </span>{" "}
                Please use the <strong>Reconcile Status</strong> button below to query FBR.
              </p>
            </div>
          </div>
        )}

        {/* FEEDBACK NOTICE */}
        {actionFeedback && (
          <div
            className={`rounded-lg border p-3 text-xs flex items-center gap-2 ${
              actionFeedback.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : actionFeedback.type === "warning"
                ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                : "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            }`}
          >
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : actionFeedback.type === "warning" ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
        )}

        {/* CLEARED INVOICE ATTRIBUTES (IF ACCEPTED) */}
        {isAccepted && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
              <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>FBR Official Fiscal Clearance</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                PRAL DI v1.12 Compliant
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Invoice Reference Number (IRN)
                </span>
                <span className="font-mono font-bold text-xs text-foreground select-all">
                  {fbrIrn || "Pending IRN Allocation"}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Fiscal Document UUID
                </span>
                <span className="font-mono text-xs text-muted-foreground truncate block select-all">
                  {fbrUuid || "—"}
                </span>
              </div>
            </div>

            {fbrQrData && (
              <div className="text-[10px] font-mono text-muted-foreground bg-background/80 p-2 rounded border truncate">
                QR Payload: {fbrQrData}
              </div>
            )}
          </div>
        )}

        {/* ACTION CONTROLS */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!isAccepted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPreview}
              disabled={isLoadingPreview || isSubmitting}
              className="h-8 text-xs gap-1.5"
            >
              {isLoadingPreview ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              <span>Preview FBR Payload &amp; Validate</span>
            </Button>
          )}

          {isUnknown && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReconcile}
              disabled={isReconciling}
              className="h-8 text-xs gap-1.5 font-semibold text-amber-900 dark:text-amber-200"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isReconciling ? "animate-spin" : ""}`} />
              <span>Reconcile Status with FBR</span>
            </Button>
          )}

          {isAccepted && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreditModalOpen(true)}
                className="h-8 text-xs gap-1.5"
              >
                <MinusCircle className="h-3.5 w-3.5 text-blue-600" />
                <span>Issue Credit Note</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(true)}
                className="h-8 text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Cancel with FBR</span>
              </Button>
            </>
          )}

          <a
            href="https://e.fbr.gov.pk/esbn/Service.aspx?PID=TaxpayerVerification"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground ml-auto transition-colors"
          >
            <span>FBR Portal Check</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>

      {/* -----------------------------------------------------------------------
          MODAL 1: PRE-SUBMISSION PREVIEW & VALIDATION CHECKLIST
      ------------------------------------------------------------------------ */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            FBR Electronic Invoicing Pre-Submission Inspection
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review the mapped PRAL DI v1.12 payload and automated validation checks before live transmission.
          </DialogDescription>
        </DialogHeader>

        {previewData && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Environment Badge */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Target Gateway:</span>
                <Badge
                  variant={previewData.environment === "production" ? "destructive" : "secondary"}
                  className="uppercase text-[10px]"
                >
                  {previewData.environment} Mode
                </Badge>
                <span className="text-muted-foreground">• {previewData.integratorName}</span>
              </div>

              {!previewData.isCredentialsConfigured && (
                <Badge variant="outline" className="text-rose-600 border-rose-300 text-[10px]">
                  Credentials Not Sealed
                </Badge>
              )}
            </div>

            {/* Validation Checklist */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">
                Automated Statutory Validation Checklist
              </h4>
              <div className="space-y-1.5 rounded-lg border p-3 bg-muted/20">
                {previewData.validationChecks.map((check) => (
                  <div
                    key={check.ruleId}
                    className="flex items-start gap-2 text-xs py-1 border-b last:border-0 border-border/40"
                  >
                    {check.passed ? (
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${check.passed ? "text-foreground" : "text-rose-600"}`}>
                        {check.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{check.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mapped JSON Payload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-foreground">
                  Documented DI v1.12 JSON Payload
                </h4>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Schema: PRAL Electronic Invoice
                </span>
              </div>
              <div className="rounded-lg bg-zinc-950 p-3 font-mono text-[11px] text-zinc-100 overflow-x-auto max-h-56 border border-zinc-800">
                <pre>{JSON.stringify(previewData.payload, null, 2)}</pre>
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-2 flex items-center justify-between border-t gap-3">
              <Button variant="ghost" size="sm" onClick={() => setIsPreviewOpen(false)}>
                Close Preview
              </Button>

              <div className="flex items-center gap-2">
                {!previewData.isValid ? (
                  <span className="text-[11px] text-rose-600 font-medium">
                    Resolve validation errors before submission
                  </span>
                ) : !previewData.isCredentialsConfigured ? (
                  <span className="text-[11px] text-amber-600 font-medium">
                    Submissions disabled: Configure FBR credentials in Settings
                  </span>
                ) : previewData.isAlreadySubmitted ? (
                  <span className="text-[11px] text-emerald-600 font-medium">
                    Invoice already cleared
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setIsConfirmOpen(true)}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Confirm &amp; Submit to FBR</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* -----------------------------------------------------------------------
          MODAL 2: CONFIRMATION BEFORE LIVE SUBMISSION
      ------------------------------------------------------------------------ */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Confirm FBR Transmission</DialogTitle>
          <DialogDescription className="text-xs">
            Are you sure you want to transmit Invoice {invoice.invoice_number} to the FBR gateway?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <p className="leading-relaxed text-muted-foreground">
            Once submitted and cleared by FBR, this invoice will be officially recorded on the government fiscal register.
            Any subsequent modifications will require issuing an official Credit Note or Debit Note.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className="gap-1.5 text-xs font-semibold"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Transmitting...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Proceed with Submission
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* -----------------------------------------------------------------------
          MODAL 3: CREDIT NOTE ISSUANCE
      ------------------------------------------------------------------------ */}
      <Dialog open={isCreditModalOpen} onOpenChange={setIsCreditModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <MinusCircle className="h-4 w-4 text-blue-600" />
            Issue FBR Credit Note
          </DialogTitle>
          <DialogDescription className="text-xs">
            Issue a linked Credit Note referencing FBR IRN: {fbrIrn}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold block mb-1">Reason for Credit Adjustment</label>
            <Input
              type="text"
              placeholder="e.g. Returned goods / commercial pricing revision"
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Credit Amount</label>
            <Input
              type="number"
              step="0.01"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setIsCreditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleIssueCreditNote}
              disabled={isProcessingCredit || !creditReason.trim()}
              className="text-xs"
            >
              {isProcessingCredit ? "Submitting Credit Note..." : "Issue Credit Note"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* -----------------------------------------------------------------------
          MODAL 4: INVOICE CANCELLATION
      ------------------------------------------------------------------------ */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-rose-600 flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Cancel FBR Cleared Invoice
          </DialogTitle>
          <DialogDescription className="text-xs">
            Cancellation of invoice {invoice.invoice_number} (IRN: {fbrIrn}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Please enter a formal justification for cancelling this fiscal document.
          </p>

          <div>
            <label className="font-semibold block mb-1">Cancellation Reason</label>
            <Input
              type="text"
              placeholder="e.g. Order cancelled prior to delivery / duplicate entry"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setIsCancelModalOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelInvoice}
              disabled={isProcessingCancel || !cancelReason.trim()}
              className="text-xs"
            >
              {isProcessingCancel ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* -----------------------------------------------------------------------
          MODAL 5: SUBMISSION AUDIT HISTORY TABLE
      ------------------------------------------------------------------------ */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            FBR Submission Audit History
          </DialogTitle>
          <DialogDescription className="text-xs">
            Chronological audit trail of gateway transmission attempts, status changes, and sanitized error logs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs max-h-80 overflow-y-auto">
          {history.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No transmission attempts recorded for this invoice yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Timestamp</TableHead>
                  <TableHead className="text-xs">Outcome Status</TableHead>
                  <TableHead className="text-xs">Environment</TableHead>
                  <TableHead className="text-xs">IRN / Reference</TableHead>
                  <TableHead className="text-xs">Sanitized Errors / Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {new Date(log.attemptedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.status === "ACCEPTED"
                            ? "default"
                            : log.status === "UNKNOWN"
                            ? "outline"
                            : log.status === "CANCELLED"
                            ? "destructive"
                            : "secondary"
                        }
                        className={`text-[10px] ${
                          log.status === "ACCEPTED" ? "bg-emerald-600 text-white" : ""
                        }`}
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="uppercase text-[10px] text-muted-foreground">
                      {log.environment}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.fbrIrn || "—"}
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate text-muted-foreground">
                      {log.sanitizedErrors && log.sanitizedErrors.length > 0
                        ? log.sanitizedErrors.join("; ")
                        : log.reconciliationNotes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Dialog>
    </Card>
  );
}
