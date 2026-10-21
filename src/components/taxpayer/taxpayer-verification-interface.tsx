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
  Building2,
  Receipt,
  Scale,
  HelpCircle,
  Check,
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
  SalesTaxRegTypeStatus,
  SalesTaxAtlStatus,
  IncomeTaxAtlStatus,
} from "@/lib/fbr-types";
import { FbrTaxpayerVerificationResult } from "@/lib/fbr-taxpayer-service";

export type IndicatorDisplayState =
  | "Verified Active"
  | "Verified Inactive"
  | "Registered"
  | "Not Registered"
  | "Unable to Verify"
  | "Pending Authorization"
  | "Manual Verification Required";

export function resolveSalesTaxRegState(
  status: SalesTaxRegTypeStatus | undefined,
  isGatewayConfigured: boolean
): IndicatorDisplayState {
  if (!status) return isGatewayConfigured ? "Pending Authorization" : "Manual Verification Required";
  if (status === "Registered" || status === "Exempt") return "Registered";
  if (status === "Unregistered" || status === "Not Registered" || status === "Not Found") return "Not Registered";
  if (status === "Unable to Verify") return "Unable to Verify";
  if (status === "Pending Authorization") return "Pending Authorization";
  if (status === "Manual Verification Required") return "Manual Verification Required";
  if (status === "Pending") {
    return isGatewayConfigured ? "Pending Authorization" : "Manual Verification Required";
  }
  return "Unable to Verify";
}

export function resolveSalesTaxAtlState(
  status: SalesTaxAtlStatus | undefined,
  isGatewayConfigured: boolean
): IndicatorDisplayState {
  if (!status) return isGatewayConfigured ? "Pending Authorization" : "Manual Verification Required";
  if (status === "Verified Active" || status === "Exempt") return "Verified Active";
  if (status === "Verified Inactive") return "Verified Inactive";
  if (status === "Not Registered") return "Not Registered";
  if (status === "Unable to Verify") return "Unable to Verify";
  if (status === "Pending Authorization") return "Pending Authorization";
  if (status === "Manual Verification Required") return "Manual Verification Required";
  if (status === "Pending" || status === "Not Found") {
    return isGatewayConfigured ? "Pending Authorization" : "Manual Verification Required";
  }
  return "Unable to Verify";
}

export function resolveIncomeTaxAtlState(
  status: IncomeTaxAtlStatus | undefined,
  isGatewayConfigured: boolean
): IndicatorDisplayState {
  if (!status) return isGatewayConfigured ? "Pending Authorization" : "Manual Verification Required";
  if (status === "Verified Active") return "Verified Active";
  if (status === "Verified Inactive") return "Verified Inactive";
  if (status === "Not Registered") return "Not Registered";
  if (status === "Unable to Verify") return "Unable to Verify";
  if (status === "Pending Authorization") return "Pending Authorization";
  if (status === "Manual Verification Required") return "Manual Verification Required";
  if (status === "Pending" || status === "Not Found") {
    return isGatewayConfigured ? "Pending Authorization" : "Manual Verification Required";
  }
  return "Unable to Verify";
}

export function getStatusBadgeClass(state: IndicatorDisplayState): string {
  switch (state) {
    case "Verified Active":
    case "Registered":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold";
    case "Verified Inactive":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-semibold";
    case "Not Registered":
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-semibold";
    case "Unable to Verify":
      return "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800 font-semibold";
    case "Pending Authorization":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-semibold";
    case "Manual Verification Required":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold";
    default:
      return "bg-muted text-muted-foreground border font-semibold";
  }
}

export function formatVerificationSource(source: TaxpayerVerificationSource | string): string {
  switch (source) {
    case "AUTOMATED_GATEWAY":
      return "Automated PRAL Gateway";
    case "MANUAL_PORTAL":
      return "Manual FBR e-Portal (Web)";
    case "MANUAL_SMS":
      return "Manual FBR SMS (9966)";
    case "FORMAT_VALIDATED_ONLY":
      return "Format Validated Only";
    default:
      return source;
  }
}

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

  // Manual Verification State (Three UNAZ Indicators)
  const [manualSource, setManualSource] = React.useState<"MANUAL_PORTAL" | "MANUAL_SMS">("MANUAL_PORTAL");
  const [manualSalesTaxRegType, setManualSalesTaxRegType] = React.useState<SalesTaxRegTypeStatus>("Registered");
  const [manualSalesTaxAtl, setManualSalesTaxAtl] = React.useState<SalesTaxAtlStatus>("Verified Active");
  const [manualIncomeTaxAtl, setManualIncomeTaxAtl] = React.useState<IncomeTaxAtlStatus>("Verified Active");
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
        status: manualIncomeTaxAtl === "Verified Active" ? "Active" : "Inactive",
        salesTaxRegType: manualSalesTaxRegType,
        salesTaxAtl: manualSalesTaxAtl,
        incomeTaxAtl: manualIncomeTaxAtl,
        referenceNumber: manualRef.trim() || undefined,
        notes: manualNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        setManualFeedback(`Manual verification successfully recorded via ${res.data.source}.`);
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

          {/* THREE SEPARATE RESULT CARDS (SALES TAX REG, SALES TAX ATL, INCOME TAX ATL) */}
          {verificationResult && (() => {
            const stRegState = resolveSalesTaxRegState(
              verificationResult.indicators?.salesTaxRegType?.status,
              verificationResult.fbrGatewayConfigured
            );
            const stAtlState = resolveSalesTaxAtlState(
              verificationResult.indicators?.salesTaxAtl?.status,
              verificationResult.fbrGatewayConfigured
            );
            const incAtlState = resolveIncomeTaxAtlState(
              verificationResult.indicators?.incomeTaxAtl?.status,
              verificationResult.fbrGatewayConfigured
            );

            return (
              <div className="space-y-4 pt-1">
                {/* IDENTIFIER SUMMARY BANNER */}
                <div className="rounded-lg border bg-card p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {verificationResult.maskedId}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {verificationResult.idType}
                        </Badge>
                        {verificationResult.province && (
                          <span className="text-[11px] text-muted-foreground">
                            • {verificationResult.province}
                          </span>
                        )}
                        {verificationResult.businessName && (
                          <span className="text-[11px] font-medium text-foreground">
                            • {verificationResult.businessName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {verificationResult.taxSection} ({customerType}) • Statutory Withholding:{" "}
                        <strong className="text-foreground">
                          {verificationResult.isFiler
                            ? verificationResult.activeRate
                            : verificationResult.nonFilerRate}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1 text-[11px] text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>Verified: {new Date(verificationResult.verifiedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>Gateway Mode:</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {verificationResult.fbrGatewayConfigured ? "Live PRAL API" : "Manual / Format Verification"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* THREE SEPARATE RESULT CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* CARD 1: SALES TAX REG TYPE */}
                  <Card className="border shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">
                              Sales Tax Reg Type
                            </CardTitle>
                            <CardDescription className="text-[10px]">
                              Sales Tax Act, 1990 Registration
                            </CardDescription>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] whitespace-nowrap ${getStatusBadgeClass(stRegState)}`}>
                          {stRegState}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-3.5 space-y-3 text-xs flex-1">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Verified Registration Status
                        </span>
                        <p className="text-xs font-semibold text-foreground mt-0.5">
                          {verificationResult.indicators.salesTaxRegType.strn
                            ? `STRN: ${verificationResult.indicators.salesTaxRegType.strn}`
                            : stRegState === "Registered"
                            ? "STRN on Official File"
                            : "No STRN Assigned"}
                        </p>
                        {verificationResult.indicators.salesTaxRegType.category && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Category: {verificationResult.indicators.salesTaxRegType.category}
                          </p>
                        )}
                      </div>

                      <div className="p-2.5 rounded-md bg-muted/40 border text-[11px] text-muted-foreground leading-relaxed">
                        {verificationResult.indicators.salesTaxRegType.details}
                      </div>

                      <div className="space-y-1 pt-1 border-t">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Verification Source:</span>
                          <span className="font-medium text-foreground">
                            {formatVerificationSource(verificationResult.verificationSource)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Timestamp:</span>
                          <span className="font-mono text-muted-foreground">
                            {new Date(verificationResult.verifiedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2.5 border-t bg-muted/10 flex items-center justify-between text-[11px]">
                      <a
                        href="https://iris.fbr.gov.pk/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>FBR IRIS Portal</span>
                      </a>
                      <span className="text-[10px] text-muted-foreground">
                        Rule 12(1) STR
                      </span>
                    </CardFooter>
                  </Card>

                  {/* CARD 2: SALES TAX ATL */}
                  <Card className="border shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">
                              Sales Tax ATL
                            </CardTitle>
                            <CardDescription className="text-[10px]">
                              Monthly Return Filing Compliance
                            </CardDescription>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] whitespace-nowrap ${getStatusBadgeClass(stAtlState)}`}>
                          {stAtlState}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-3.5 space-y-3 text-xs flex-1">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Verified Return Status
                        </span>
                        <p className="text-xs font-semibold text-foreground mt-0.5">
                          {stAtlState === "Verified Active"
                            ? "Active Sales Tax Return Filer"
                            : stAtlState === "Verified Inactive"
                            ? "Inactive / Defaulting Filer"
                            : stAtlState === "Not Registered"
                            ? "Unregistered for Sales Tax"
                            : "Return Status Unverified"}
                        </p>
                        {verificationResult.referenceNumber && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            Ref: {verificationResult.referenceNumber}
                          </p>
                        )}
                      </div>

                      <div className="p-2.5 rounded-md bg-muted/40 border text-[11px] text-muted-foreground leading-relaxed">
                        {verificationResult.indicators.salesTaxAtl.details}
                      </div>

                      <div className="space-y-1 pt-1 border-t">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Verification Source:</span>
                          <span className="font-medium text-foreground">
                            {formatVerificationSource(verificationResult.verificationSource)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Timestamp:</span>
                          <span className="font-mono text-muted-foreground">
                            {new Date(verificationResult.verifiedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2.5 border-t bg-muted/10 flex items-center justify-between text-[11px]">
                      <a
                        href="https://www.fbr.gov.pk/atl-sales-tax/163223"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Sales Tax ATL List</span>
                      </a>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        SMS: ST to 9966
                      </span>
                    </CardFooter>
                  </Card>

                  {/* CARD 3: INCOME TAX ATL */}
                  <Card className="border shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                            <Scale className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">
                              Income Tax ATL
                            </CardTitle>
                            <CardDescription className="text-[10px]">
                              Income Tax Ordinance, 2001
                            </CardDescription>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] whitespace-nowrap ${getStatusBadgeClass(incAtlState)}`}>
                          {incAtlState}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-3.5 space-y-3 text-xs flex-1">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Annual Return Filer Status
                        </span>
                        <p className="text-xs font-semibold text-foreground mt-0.5">
                          {incAtlState === "Verified Active"
                            ? "Active Filer (ATL Active)"
                            : incAtlState === "Verified Inactive"
                            ? "Inactive / Non-Filer"
                            : "Filer Status Unconfirmed"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {verificationResult.taxSection}: Withholding Rate:{" "}
                          <strong className="text-foreground">
                            {verificationResult.isFiler
                              ? verificationResult.activeRate
                              : verificationResult.nonFilerRate}
                          </strong>
                        </p>
                      </div>

                      <div className="p-2.5 rounded-md bg-muted/40 border text-[11px] text-muted-foreground leading-relaxed">
                        {verificationResult.indicators.incomeTaxAtl.details}
                      </div>

                      <div className="space-y-1 pt-1 border-t">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Verification Source:</span>
                          <span className="font-medium text-foreground">
                            {formatVerificationSource(verificationResult.verificationSource)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Timestamp:</span>
                          <span className="font-mono text-muted-foreground">
                            {new Date(verificationResult.verifiedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2.5 border-t bg-muted/10 flex items-center justify-between text-[11px]">
                      <a
                        href="https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Income Tax ATL Portal</span>
                      </a>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        SMS: ATL to 9966
                      </span>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            );
          })()}

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
          <div className="rounded-lg border p-4 bg-muted/30 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-blue-600" />
                  Official Government Verification Portals
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Query verified state records across official FBR authorities and record the 3 indicators.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href="https://iris.fbr.gov.pk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-background border text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-muted transition-colors"
                >
                  <Lock className="h-3 w-3" />
                  <span>IRIS 2.0 Portal</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
                <a
                  href="https://www.fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71169"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-background border text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-muted transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  <span>Income Tax ATL Info</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
                <a
                  href="https://www.fbr.gov.pk/atl-sales-tax/163223"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-background border text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-muted transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  <span>Sales Tax ATL Info</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
                <a
                  href="https://e.fbr.gov.pk/esbn/Service.aspx?PID=TaxpayerVerification"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-background border text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-muted transition-colors"
                >
                  <Search className="h-3 w-3" />
                  <span>Online Inquiry</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              </div>
            </div>

            {/* SMS Instruction Pill */}
            <div className="rounded border bg-background/80 p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="font-mono text-[11px]">
                  FBR Cellular Gateway (9966): Income Tax: SMS <strong>ATL {liveValidation?.cleaned || "1610154195663"}</strong> to <strong>9966</strong> | Sales Tax: SMS <strong>ST {liveValidation?.cleaned || "1610154195663"}</strong> to <strong>9966</strong>
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                Official FBR short-code (Standard charges apply)
              </span>
            </div>

            {/* RECORD MANUAL VERIFICATION FORM (THREE INDICATORS) */}
            <div className="pt-2 border-t space-y-3">
              <h5 className="text-[11px] font-semibold text-foreground">
                Record Verified Result (Three Indicators Audit Trail)
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                <div className="sm:col-span-1">
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                    Verification Source
                  </label>
                  <select
                    value={manualSource}
                    onChange={(e) => setManualSource(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="MANUAL_PORTAL">FBR e-Portal (Web)</option>
                    <option value="MANUAL_SMS">FBR SMS (9966)</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                    1. Sales Tax Reg Type
                  </label>
                  <select
                    value={manualSalesTaxRegType}
                    onChange={(e) => setManualSalesTaxRegType(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold"
                  >
                    <option value="Registered">Registered</option>
                    <option value="Unregistered">Unregistered</option>
                    <option value="Exempt">Exempt</option>
                    <option value="Not Found">Not Found</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                    2. Sales Tax ATL
                  </label>
                  <select
                    value={manualSalesTaxAtl}
                    onChange={(e) => setManualSalesTaxAtl(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold"
                  >
                    <option value="Verified Active">✓ Active</option>
                    <option value="Verified Inactive">✕ Inactive</option>
                    <option value="Not Registered">Not Registered</option>
                    <option value="Not Found">Not Found</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                    3. Income Tax ATL
                  </label>
                  <select
                    value={manualIncomeTaxAtl}
                    onChange={(e) => setManualIncomeTaxAtl(e.target.value as any)}
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold"
                  >
                    <option value="Verified Active">✓ Active (Filer)</option>
                    <option value="Verified Inactive">✕ Inactive (Non-Filer)</option>
                    <option value="Not Found">Not Found</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                    Portal Ref / Code
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. ATL-9881"
                    value={manualRef}
                    onChange={(e) => setManualRef(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-1 flex items-end">
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
                    <span>Save Record</span>
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
                  <TableHead className="text-xs">1. Sales Reg Type</TableHead>
                  <TableHead className="text-xs">2. Sales Tax ATL</TableHead>
                  <TableHead className="text-xs">3. Income Tax ATL</TableHead>
                  <TableHead className="text-xs">Verification Source</TableHead>
                  <TableHead className="text-xs">Timestamp</TableHead>
                  <TableHead className="text-xs">Verified By</TableHead>
                  <TableHead className="text-xs">Reference / Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground">
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
                        {(() => {
                          const state = resolveSalesTaxRegState(
                            item.indicators?.salesTaxRegType?.status || (item.status === "Active" ? "Registered" : "Unregistered"),
                            item.source === "AUTOMATED_GATEWAY"
                          );
                          return (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${getStatusBadgeClass(state)}`}>
                              {state}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const state = resolveSalesTaxAtlState(
                            item.indicators?.salesTaxAtl?.status || (item.status === "Active" ? "Verified Active" : "Verified Inactive"),
                            item.source === "AUTOMATED_GATEWAY"
                          );
                          return (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${getStatusBadgeClass(state)}`}>
                              {state}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const state = resolveIncomeTaxAtlState(
                            item.indicators?.incomeTaxAtl?.status || (item.status === "Active" ? "Verified Active" : "Verified Inactive"),
                            item.source === "AUTOMATED_GATEWAY"
                          );
                          return (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${getStatusBadgeClass(state)}`}>
                              {state}
                            </span>
                          );
                        })()}
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
