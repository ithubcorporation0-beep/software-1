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
  Lock,
  Server,
  Activity,
  Building2,
  Radio,
  Check,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FbrCompanyConfig,
  FbrCredentialsStatus,
  FbrOnboardingStatus,
  FbrIntegrationOverview,
} from "@/lib/fbr-types";
import { saveFbrSettingsAction, testFbrConnectionAction } from "@/app/(erp)/settings/actions";

interface FbrSettingsTabProps {
  companyId: string;
  initialOverview: FbrIntegrationOverview;
}

export function FbrSettingsTab({ companyId, initialOverview }: FbrSettingsTabProps) {
  const [config, setConfig] = React.useState<FbrCompanyConfig>(initialOverview.config);
  const [creds] = React.useState<FbrCredentialsStatus>(initialOverview.credentialsStatus);
  const [effectiveStatus, setEffectiveStatus] = React.useState<FbrOnboardingStatus>(
    initialOverview.effectiveStatus
  );

  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(
    null
  );

  const handleConfigChange = (field: keyof FbrCompanyConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setFeedback(null);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    const formData = new FormData();
    formData.set("enabled", String(config.enabled));
    formData.set("environment", config.environment);
    formData.set("integratorName", config.integratorName);
    formData.set("sellerNtn", config.sellerNtn);
    formData.set("sellerStrn", config.sellerStrn);
    formData.set("posId", config.posId || "");
    formData.set("enableDigitalInvoicing", String(config.enableDigitalInvoicing));
    formData.set("enableTaxpayerVerification", String(config.enableTaxpayerVerification));
    formData.set("onboardingStatus", config.onboardingStatus);

    const res = await saveFbrSettingsAction(companyId, { success: false }, formData);
    setIsSaving(false);

    if (res.success && res.data) {
      setConfig(res.data);
      setFeedback({ message: res.message || "FBR Settings saved successfully.", type: "success" });
    } else {
      setFeedback({ message: res.error || "Failed to save FBR settings.", type: "error" });
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setFeedback(null);

    const res = await testFbrConnectionAction(companyId);
    setIsTesting(false);

    if (res.data?.status) {
      setEffectiveStatus(res.data.status);
    }

    if (res.success) {
      setFeedback({ message: res.message || "FBR Gateway connection successful!", type: "success" });
      setConfig((prev) => ({
        ...prev,
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: "SUCCESS",
        lastTestMessage: res.message || "Connected successfully",
      }));
    } else {
      setFeedback({ message: res.error || res.message || "Connection test failed.", type: "error" });
      setConfig((prev) => ({
        ...prev,
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: "FAILED",
        lastTestMessage: res.error || res.message || "Connection test failed",
        recentErrors: [
          { timestamp: new Date().toISOString(), message: res.error || res.message || "Error" },
          ...(prev.recentErrors || []).slice(0, 4),
        ],
      }));
    }
  };

  // Status Badge Styling
  const getStatusBadge = (status: FbrOnboardingStatus) => {
    switch (status) {
      case "Production Connected":
        return {
          icon: ShieldCheck,
          label: "Production Connected",
          classes: "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
        };
      case "Sandbox Connected":
        return {
          icon: ShieldCheck,
          label: "Sandbox Connected",
          classes: "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
        };
      case "Production Pending Approval":
        return {
          icon: Radio,
          label: "Production Pending Approval",
          classes: "border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
        };
      case "Sandbox Not Tested":
        return {
          icon: Activity,
          label: "Sandbox Not Tested",
          classes: "border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
        };
      case "Awaiting Credentials":
        return {
          icon: AlertTriangle,
          label: "Awaiting Credentials",
          classes: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
        };
      case "Awaiting Provider":
        return {
          icon: Building2,
          label: "Awaiting Provider",
          classes: "border-indigo-300 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
        };
      case "Connection Error":
        return {
          icon: ShieldAlert,
          label: "Connection Error",
          classes: "border-red-300 bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300",
        };
      case "Not Configured":
      default:
        return {
          icon: Lock,
          label: "Not Configured",
          classes: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
        };
    }
  };

  const statusBadge = getStatusBadge(effectiveStatus);
  const StatusIcon = statusBadge.icon;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Status Summary */}
      <Card className="border-2 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  FBR Digital Invoicing & Taxpayer Verification (Pakistan)
                </CardTitle>
                <CardDescription className="text-xs">
                  Official Federal Board of Revenue (FBR) Electronic Fiscalization & ATL Integration via PRAL
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Current Status:</span>
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${statusBadge.classes}`}
              >
                <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                <span>{statusBadge.label}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2 pb-4 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            This module integrates IT-HUB ERP with the Pakistan Federal Board of Revenue digital invoicing
            system (DI v1.12) and Active Taxpayer List (ATL) inquiry services. Real-time invoice registration
            yields official FBR IRNs, clearance UUIDs, and standardized 1.0&quot; × 1.0&quot; QR codes.
          </p>
        </CardContent>
      </Card>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl border p-3 flex items-start gap-2.5 text-xs transition-all animate-in fade-in-50 ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-red-200 bg-red-50/90 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          )}
          <p className="font-medium leading-relaxed">{feedback.message}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 2. Environment & Onboarding Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              Environment &amp; Provider Onboarding
            </CardTitle>
            <CardDescription className="text-xs">
              Configure sandbox or production modes and corporate registration details.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Environment Mode */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Operational Gateway Environment</label>
                <select
                  value={config.environment}
                  onChange={(e) => handleConfigChange("environment", e.target.value as any)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="sandbox">Sandbox / Staging (PRAL Testing Environment)</option>
                  <option value="production">Production (Live FBR IRIS Fiscal Network)</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Use Sandbox mode for certification and workflow testing before enabling live tax submissions.
                </p>
              </div>

              {/* Licensed Integrator */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Licensed Intermediary / Integrator</label>
                <Input
                  type="text"
                  value={config.integratorName}
                  onChange={(e) => handleConfigChange("integratorName", e.target.value)}
                  placeholder="PRAL (Pakistan Revenue Automation Limited)"
                  className="text-xs h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Official licensed provider authorized for electronic invoice transmission.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Seller NTN */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Company NTN (Seller)</label>
                <Input
                  type="text"
                  value={config.sellerNtn}
                  onChange={(e) => handleConfigChange("sellerNtn", e.target.value)}
                  placeholder="e.g. 1234567-8"
                  className="text-xs h-9 font-mono"
                />
                <p className="text-[11px] text-muted-foreground">7-digit National Tax Number registered with FBR.</p>
              </div>

              {/* Seller STRN */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Sales Tax Registration (STRN)</label>
                <Input
                  type="text"
                  value={config.sellerStrn}
                  onChange={(e) => handleConfigChange("sellerStrn", e.target.value)}
                  placeholder="e.g. 0701999999999"
                  className="text-xs h-9 font-mono"
                />
                <p className="text-[11px] text-muted-foreground">13-digit sales tax registration identifier.</p>
              </div>

              {/* POS / Branch Terminal ID */}
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">POS / Branch Terminal ID</label>
                <Input
                  type="text"
                  value={config.posId || ""}
                  onChange={(e) => handleConfigChange("posId", e.target.value)}
                  placeholder="e.g. POS-MAIN-01"
                  className="text-xs h-9"
                />
                <p className="text-[11px] text-muted-foreground">Optional fiscal cash register or POS identifier.</p>
              </div>
            </div>

            {/* Business Registration Stage */}
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">FBR / PRAL Onboarding Stage</label>
              <select
                value={config.onboardingStatus}
                onChange={(e) => handleConfigChange("onboardingStatus", e.target.value as any)}
                className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Not Configured">Not Configured (Initial Stage)</option>
                <option value="Awaiting Provider">Awaiting Provider (Application submitted to PRAL/FBR)</option>
                <option value="Awaiting Credentials">Awaiting Credentials (Approved, waiting for Client ID &amp; Secret)</option>
                <option value="Sandbox Not Tested">Sandbox Not Tested (Sandbox credentials received)</option>
                <option value="Sandbox Connected">Sandbox Connected (Certified in Sandbox)</option>
                <option value="Production Pending Approval">Production Pending Approval (Submitted for production clearance)</option>
                <option value="Production Connected">Production Connected (Live in Production)</option>
                <option value="Connection Error">Connection Error</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 3. Feature Configurations: Digital Invoicing & Taxpayer Verification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Module Feature Controls
            </CardTitle>
            <CardDescription className="text-xs">
              Toggle automated taxpayer ATL checks and electronic invoice clearance.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Digital Invoicing Toggle Box */}
              <div className="rounded-xl border p-4 bg-muted/20 flex items-start gap-3 justify-between">
                <div>
                  <p className="font-semibold text-foreground">Electronic Invoicing (DI v1.12)</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Automatically submit issued invoices to FBR, obtain IRN &amp; UUID, and embed 1.0&quot; × 1.0&quot;
                    QR codes on PDF bills.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableDigitalInvoicing}
                  onChange={(e) => handleConfigChange("enableDigitalInvoicing", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>

              {/* Taxpayer Verification Toggle Box */}
              <div className="rounded-xl border p-4 bg-muted/20 flex items-start gap-3 justify-between">
                <div>
                  <p className="font-semibold text-foreground">Active Taxpayer List (ATL) Verification</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Validate 13-digit CNIC and 7-digit NTN formats on customer registration. Enforce Section 236H /
                    236G withholding tax rates.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableTaxpayerVerification}
                  onChange={(e) => handleConfigChange("enableTaxpayerVerification", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Credentials Configuration & Security Inspection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              Environment Credential Status (Server-Side)
            </CardTitle>
            <CardDescription className="text-xs">
              Status of private OAuth keys stored in `.env.local` or Vercel production secrets.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">FBR Client ID</p>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                    {creds.maskedClientId}
                  </p>
                </div>
                <Badge variant={creds.hasClientId ? "default" : "destructive"}>
                  {creds.hasClientId ? "Configured" : "Missing"}
                </Badge>
              </div>

              <div className="rounded-lg border p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">FBR Client Secret</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {creds.hasClientSecret ? "Sealed in Server Environment" : "Missing in Environment"}
                  </p>
                </div>
                <Badge variant={creds.hasClientSecret ? "default" : "destructive"}>
                  {creds.hasClientSecret ? "Configured" : "Missing"}
                </Badge>
              </div>
            </div>

            {/* Endpoints Table */}
            <div className="rounded-lg border p-3 space-y-2 bg-muted/10 font-mono text-[11px]">
              <div className="flex justify-between items-center text-muted-foreground border-b pb-1">
                <span>Endpoint Function</span>
                <span>Configured URL Target</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground">OAuth Token URL:</span>
                <span className="text-muted-foreground truncate max-w-[280px]">{creds.tokenUrl}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground">Invoice Validate URL:</span>
                <span className="text-muted-foreground truncate max-w-[280px]">{creds.validateUrl}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground">Invoice Submit URL:</span>
                <span className="text-muted-foreground truncate max-w-[280px]">{creds.submitUrl}</span>
              </div>
            </div>

            <div className="rounded-md bg-blue-50/80 dark:bg-blue-950/40 p-3 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5 text-[11px] text-blue-800 dark:text-blue-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                To configure live credentials on Vercel, go to <strong>Project Settings &gt; Environment Variables</strong> and
                add <code>FBR_CLIENT_ID</code> and <code>FBR_CLIENT_SECRET</code>. Private keys are never exposed in
                client code or client network calls.
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Testing Gateway...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Test FBR Connection</span>
                  </>
                )}
              </Button>

              <span className="text-[11px] text-muted-foreground">
                Last test: {config.lastTestedAt ? new Date(config.lastTestedAt).toLocaleString() : "Never"}
              </span>
            </div>

            <Button type="submit" size="sm" disabled={isSaving} className="h-8 text-xs font-semibold">
              {isSaving ? "Saving Configuration..." : "Save FBR Settings"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* 5. Diagnostics & Recent Sanitized Errors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Connection Diagnostics &amp; Audit Logs
          </CardTitle>
          <CardDescription className="text-xs">
            Review recent sanitized gateway connection attempts and error telemetry.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 text-xs">
          {config.lastTestMessage && (
            <div
              className={`rounded-lg border p-3 font-mono text-[11px] ${
                config.lastTestStatus === "SUCCESS"
                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-red-200 bg-red-50/70 text-red-800 dark:bg-red-950/40 dark:text-red-300"
              }`}
            >
              <div className="font-semibold mb-0.5">
                {config.lastTestStatus === "SUCCESS" ? "✓ Test Passed" : "✕ Test Unsuccessful"}
              </div>
              <p>{config.lastTestMessage}</p>
            </div>
          )}

          {config.recentErrors && config.recentErrors.length > 0 ? (
            <div className="space-y-2">
              <p className="font-semibold text-foreground text-xs">Recent Sanitized Event Telemetry:</p>
              <div className="space-y-1.5">
                {config.recentErrors.map((err, i) => (
                  <div
                    key={i}
                    className="rounded border p-2.5 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]"
                  >
                    <span className="font-mono text-red-600 dark:text-red-400">{err.message}</span>
                    <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                      {new Date(err.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs italic">No errors recorded.</p>
          )}
        </CardContent>
      </Card>

      {/* 6. Documentation & Official Integration Guides */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Setup Documentation &amp; Official FBR Links
          </CardTitle>
          <CardDescription className="text-xs">
            Access engineering integration blueprints, specifications, and regulatory portals.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="https://e.fbr.gov.pk/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border p-3 hover:bg-muted/30 transition-colors flex items-center justify-between text-foreground"
            >
              <div>
                <p className="font-semibold">FBR Active Taxpayers (ATL)</p>
                <p className="text-[11px] text-muted-foreground">Official public ATL portal</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>

            <a
              href="https://iris.fbr.gov.pk/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border p-3 hover:bg-muted/30 transition-colors flex items-center justify-between text-foreground"
            >
              <div>
                <p className="font-semibold">FBR IRIS Portal</p>
                <p className="text-[11px] text-muted-foreground">Digital invoicing management</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>

            <div className="rounded-lg border p-3 bg-muted/10 flex flex-col justify-between">
              <div>
                <p className="font-semibold">SMS Verification</p>
                <p className="text-[11px] text-muted-foreground font-mono">Send &quot;ATL &lt;CNIC&gt;&quot; to 9966</p>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1">Official FBR cellular gateway</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
