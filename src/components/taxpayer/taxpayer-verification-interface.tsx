"use client";

import * as React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Search,
  FileText,
  Smartphone,
  Globe,
  Clock,
  UserCheck,
  UserX,
  Info,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { validateTaxId, maskTaxIdentifier } from "@/lib/fbr-validation";
import {
  verifyTaxpayerAction,
  recordManualTaxpayerVerificationAction,
  getTaxpayerVerificationHistoryAction,
} from "@/app/(erp)/settings/actions";
import {
  TaxpayerVerificationRecord,
  TaxpayerVerificationSource,
  TaxpayerAtlStatus,
} from "@/lib/fbr-types";
import { FbrTaxpayerVerificationResult } from "@/lib/fbr-taxpayer-service";

interface TaxpayerVerificationInterfaceProps {
  companyId: string;
  initialHistory?: TaxpayerVerificationRecord[];
  onSelectVerified?: (result: {
    taxNumber: string;
    idType: "CNIC" | "NTN";
    atlStatus: "Active" | "Inactive";
    source: TaxpayerVerificationSource;
  }) => void;
}

export function TaxpayerVerificationInterface({
  companyId,
  initialHistory = [],
  onSelectVerified,
}: TaxpayerVerificationInterfaceProps) {
  // Input State
  const [taxInput, setTaxInput] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<"AUTO" | "CNIC" | "NTN">("AUTO");
  const [customerType, setCustomerType] = React.useState<"Retailer" | "WS / Distributor">("Retailer");

  // Automated Verification State
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [verificationResult, setVerificationResult] = React.useState<FbrTaxpayerVerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Manual Verification State
  const [manualSource, setManualSource] = React.useState<"MANUAL_PORTAL" | "MANUAL_SMS">("MANUAL_PORTAL");
  const [manualStatus, setManualStatus] = React.useState<"Active" | "Inactive">("Active");
  const [manualRef, setManualRef] = React.useState("");
  const [manualNotes, setManualNotes] = React.useState("");
  const [isRecordingManual, setIsRecordingManual] = React.useState(false);
  const [manualFeedback, setManualFeedback] = React.useState<string | null>(null);

  // History State
  const [history, setHistory] = React.useState<TaxpayerVerificationRecord[]>(initialHistory);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [historySearch, setHistorySearch] = React.useState("");

  // Live identifier format inspection
  const liveValidation = React.useMemo(() => {
    if (!taxInput.trim()) return null;
    return validateTaxId(taxInput.trim());
  }, [taxInput]);

  // Load history on mount if not provided
  React.useEffect(() => {
    if (initialHistory.length === 0) {
      loadHistory();
    }
  }, [companyId]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getTaxpayerVerificationHistoryAction(companyId);
      if (res.success && res.data) {
        setHistory(res.data);
      }
    } catch {
      // Non-critical background fetch
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Automated Gateway Verification
  const handleAutomatedVerify = async () => {
    if (!taxInput.trim()) return;
    setIsVerifying(true);
    setErrorMessage(null);
    setVerificationResult(null);
    setManualFeedback(null);

    try {
      const res = await verifyTaxpayerAction(companyId, taxInput.trim(), customerType);
      if (res.success && res.data) {
        setVerificationResult(res.data);
        await loadHistory();
      } else {
        setErrorMessage(res.error || "Automated verification failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reach verification endpoint");
    } finally {
      setIsVerifying(false);
    }
  };

  // Manual Verification Submission
  const handleRecordManual = async () => {
    if (!taxInput.trim()) return;
    setIsRecordingManual(true);
    setManualFeedback(null);
    setErrorMessage(null);

    try {
      const res = await recordManualTaxpayerVerificationAction(companyId, {
        taxNumber: taxInput.trim(),
        source: manualSource,
        status: manualStatus,
        referenceNumber: manualRef.trim() || undefined,
        notes: manualNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        setManualFeedback(`Manual verification successfully recorded: ${res.data.status} via ${res.data.source}.`);
        await loadHistory();

        if (onSelectVerified && (res.data.idType === "CNIC" || res.data.idType === "NTN")) {
          onSelectVerified({
            taxNumber: res.data.formattedIdentifier,
            idType: res.data.idType,
            atlStatus: res.data.status as "Active" | "Inactive",
            source: res.data.source,
          });
        }
      } else {
        setErrorMessage(res.error || "Failed to record manual verification");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error saving manual verification");
    } finally {
      setIsRecordingManual(false);
    }
  };

  // Filter history
  const filteredHistory = React.useMemo(() => {
    if (!historySearch.trim()) return history;
    const term = historySearch.toLowerCase();
    return history.filter(
      (item) =>
        item.maskedIdentifier.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term) ||
        item.source.toLowerCase().includes(term) ||
        (item.referenceNumber && item.referenceNumber.toLowerCase().includes(term)) ||
        (item.notes && item.notes.toLowerCase().includes(term))
    );
  }, [history, historySearch]);

  return (
    <div className="space-y-6">
      {/* -----------------------------------------------------------------------
          CARD 1: TAXPAYER LOOKUP & VERIFICATION CONSOLE
      ------------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                FBR Taxpayer Verification Console
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Verify Pakistani individual (CNIC) and corporate (NTN) tax registration for Active Taxpayer List (ATL) compliance.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Tax Year 2024–2026
              </Badge>
              <Badge variant="secondary" className="text-xs">
                PRAL / FBR Standards
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* CRITICAL TRUTHFULNESS CALLOUT */}
          <div className="rounded-lg border border-amber-300 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="font-semibold">FBR Statutory Compliance Notice</p>
              <p className="text-[11px] leading-relaxed opacity-90">
                A valid CNIC or NTN format confirms legal numerical structure only under NADRA/FBR rules.{" "}
                <span className="font-bold underline">
                  Format validity is NOT proof of Active Filer status on the official ATL.
                </span>{" "}
                The system will never mark a taxpayer Active or Inactive solely due to an API timeout, error, or unconfigured gateway.
              </p>
            </div>
          </div>

          {/* INPUT FORM */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-foreground">
                Tax Identifier (CNIC or NTN)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedType("AUTO")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedType === "AUTO"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Auto-Detect
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("CNIC")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedType === "CNIC"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  CNIC (13 digits)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("NTN")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedType === "NTN"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  NTN (7-8 digits)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-6">
                <Input
                  type="text"
                  placeholder={
                    selectedType === "CNIC"
                      ? "e.g. 16101-5419566-3 (13 digits)"
                      : selectedType === "NTN"
                      ? "e.g. 1234567-8 (7-8 digits)"
                      : "Enter 13-digit CNIC or 7-8 digit NTN..."
                  }
                  value={taxInput}
                  onChange={(e) => setTaxInput(e.target.value)}
                  className="font-mono text-sm tracking-wide"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Retailer">Retailer (Sec 236H: 0.5% vs 1.0%)</option>
                  <option value="WS / Distributor">Wholesaler (Sec 236G: 0.1% vs 0.2%)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <Button
                  onClick={handleAutomatedVerify}
                  disabled={isVerifying || !taxInput.trim()}
                  className="w-full h-9 text-xs font-semibold gap-1.5"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Querying Gateway...
                    </>
                  ) : (
                    <>
                      <Search className="h-3.5 w-3.5" />
                      Query FBR Gateway
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* LIVE FORMAT FEEDBACK */}
            {liveValidation && (
              <div
                className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-md text-xs border ${
                  liveValidation.isValid
                    ? "border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : "border-rose-200 bg-rose-50/60 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {liveValidation.isValid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span>
                    Format:{" "}
                    <strong>
                      {liveValidation.isValid ? "Valid Syntax" : "Format Error"}
                    </strong>{" "}
                    ({liveValidation.type})
                  </span>
                  {liveValidation.formatted && (
                    <span className="font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-bold">
                      {liveValidation.formatted}
                    </span>
                  )}
                  {liveValidation.province && (
                    <span className="text-[11px] opacity-80">
                      • {liveValidation.province}
                    </span>
                  )}
                  {liveValidation.gender && (
                    <span className="text-[11px] opacity-80">
                      • {liveValidation.gender}
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-mono opacity-80">
                  Masked Log: {maskTaxIdentifier(liveValidation.cleaned, liveValidation.type)}
                </div>
              </div>
            )}
          </div>

          {/* VERIFICATION RESULT CARD (IF QUERY EXECUTED) */}
          {verificationResult && (
            <div
              className={`rounded-lg border p-4 text-xs space-y-3 ${
                verificationResult.atlStatus === "Active"
                  ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100"
                  : verificationResult.atlStatus === "Inactive"
                  ? "border-amber-300 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100"
                  : verificationResult.atlStatus === "API Connection Error"
                  ? "border-rose-300 bg-rose-50/80 dark:border-rose-900 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100"
                  : "border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    {verificationResult.atlStatus === "Active"
                      ? "Active Taxpayer (ATL Active)"
                      : verificationResult.atlStatus === "Inactive"
                      ? "Inactive / Non-Filer Taxpayer"
                      : verificationResult.atlStatus === "API Connection Error"
                      ? "FBR API Connection Error"
                      : "Format Validated (ATL Status Unverified)"}
                  </span>
                  <Badge
                    variant={
                      verificationResult.verificationSource === "AUTOMATED_GATEWAY"
                        ? "default"
                        : "secondary"
                    }
                    className="text-[10px]"
                  >
                    Source: {verificationResult.verificationSource}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-[11px] opacity-80">
                  <Clock className="h-3 w-3" />
                  <span>Verified at: {new Date(verificationResult.verifiedAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold opacity-70 block">
                    Identifier (Masked)
                  </span>
                  <span className="font-mono font-bold text-xs">
                    {verificationResult.maskedId}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold opacity-70 block">
                    Applicable Tax Section
                  </span>
                  <span className="font-semibold text-xs">
                    {verificationResult.taxSection}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold opacity-70 block">
                    Withholding Rate
                  </span>
                  <span className="font-bold text-xs">
                    {verificationResult.isFiler
                      ? verificationResult.activeRate
                      : verificationResult.nonFilerRate}
                  </span>
                </div>
              </div>

              <p className="font-medium text-xs leading-relaxed">
                {verificationResult.message}
              </p>
              {verificationResult.detail && (
                <p className="text-[11px] opacity-85 leading-relaxed">
                  {verificationResult.detail}
                </p>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-rose-300 bg-rose-50/80 p-3 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {manualFeedback && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50/80 p-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{manualFeedback}</span>
            </div>
          )}

          {/* -------------------------------------------------------------------
              MANUAL VERIFICATION WORKFLOW (WHEN AUTOMATED API IS UNAVAILABLE)
          -------------------------------------------------------------------- */}
          <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-blue-600" />
                  Official Manual Verification Workflow
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When authorized PRAL API credentials are not yet sealed or during gateway downtime, use official government verification portals.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="https://e.fbr.gov.pk/esbn/Service.aspx?PID=TaxpayerVerification"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-background border text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-muted transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  <span>FBR e-Portal</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
                <a
                  href="https://iris.fbr.gov.pk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-background border text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-muted transition-colors"
                >
                  <Lock className="h-3 w-3" />
                  <span>Iris 2.0</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              </div>
            </div>

            {/* SMS Instruction Pill */}
            <div className="rounded border bg-background/80 p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="font-mono text-[11px]">
                  FBR SMS Service (9966): Send{" "}
                  <strong>
                    ATL {liveValidation?.cleaned || "1610154195663"}
                  </strong>{" "}
                  to <strong>9966</strong>
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Official FBR short-code (Standard carrier charges apply)
              </span>
            </div>

            {/* RECORD MANUAL VERIFICATION FORM */}
            <div className="pt-2 border-t space-y-3">
              <h5 className="text-[11px] font-semibold text-foreground">
                Record Verified Result (Manual Audit Trail)
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                    Verification Source
                  </label>
                  <select
                    value={manualSource}
                    onChange={(e) => setManualSource(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="MANUAL_PORTAL">FBR e-Portal (Web Inquiry)</option>
                    <option value="MANUAL_SMS">FBR SMS Service (9966)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                    Verified Status
                  </label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold"
                  >
                    <option value="Active">✓ Active Filer (Reduced Rate)</option>
                    <option value="Inactive">✕ Inactive / Non-Filer (2x Rate)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                    Portal Ref / SMS Code (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. ATL-2026-9881"
                    value={manualRef}
                    onChange={(e) => setManualRef(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleRecordManual}
                    disabled={isRecordingManual || !taxInput.trim()}
                    variant="outline"
                    className="w-full h-8 text-xs font-semibold gap-1.5"
                  >
                    {isRecordingManual ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                    <span>Save Manual Record</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* -----------------------------------------------------------------------
          CARD 2: VERIFICATION AUDIT TRAIL & HISTORY
      ------------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Taxpayer Verification Audit History
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Persistent audit log of automated and manual inquiries with masked national identifiers.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter history..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="h-8 text-xs gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingHistory ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Masked Identifier</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">ATL Status</TableHead>
                  <TableHead className="text-xs">Verification Source</TableHead>
                  <TableHead className="text-xs">Timestamp</TableHead>
                  <TableHead className="text-xs">Verified By</TableHead>
                  <TableHead className="text-xs">Reference / Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                      No verification logs recorded yet. Query a CNIC or NTN above to generate an audit entry.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {item.maskedIdentifier}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {item.idType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "Active"
                              ? "default"
                              : item.status === "Inactive"
                              ? "secondary"
                              : "outline"
                          }
                          className={`text-[10px] ${
                            item.status === "Active"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : item.status === "Inactive"
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : ""
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${
                            item.source === "AUTOMATED_GATEWAY"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : item.source === "MANUAL_PORTAL"
                              ? "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                              : item.source === "MANUAL_SMS"
                              ? "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {item.source === "AUTOMATED_GATEWAY"
                            ? "Automated PRAL Gateway"
                            : item.source === "MANUAL_PORTAL"
                            ? "Manual FBR e-Portal"
                            : item.source === "MANUAL_SMS"
                            ? "Manual SMS 9966"
                            : "Format Validated Only"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(item.verifiedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.verifiedBy || "System"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {item.referenceNumber ? `[Ref: ${item.referenceNumber}] ` : ""}
                        {item.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="border-t pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Total Entries: <strong>{filteredHistory.length}</strong>
          </span>
          <span>
            All national identifiers are automatically masked before persistence in adherence to FBR privacy safeguards.
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
