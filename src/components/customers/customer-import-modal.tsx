"use client";

import * as React from "react";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { importCustomersFromCsvAction } from "@/app/(erp)/account/customers/actions";

export interface CustomerImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  companyId: string;
}

export function CustomerImportModal({
  open,
  onClose,
  onImportComplete,
  companyId,
}: CustomerImportModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [csvContent, setCsvContent] = React.useState<string>("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    tested: boolean;
    validRows: number;
    errorRows: Array<{ row: number; reason: string }>;
  } | null>(null);
  const [commitResult, setCommitResult] = React.useState<{
    success: boolean;
    insertedCount: number;
    error?: string;
  } | null>(null);

  React.useEffect(() => {
    if (open) {
      setFile(null);
      setCsvContent("");
      setTestResult(null);
      setCommitResult(null);
    }
  }, [open]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent((event.target?.result as string) || "");
      };
      reader.readAsText(selected);
      setTestResult(null);
      setCommitResult(null);
    }
  };

  const downloadSampleCsv = () => {
    const sample = `Customer Code,Company Name,Contact Person,Email,Mobile No,Customer Type,NTN Number,CNIC Number,STRN Number,Sales Tax Reg Type,Sales Tax ATL,Income Tax ATL,Customer Category,Customer Group,Opening Balance,Credit Limit,Payment Terms,Carried By,Billing Address,City,State,Zip Code,Country,Status
CUST-1001,"Al-Rehman Enterprises","Tariq Mehmood","tariq@alrehman.pk","03001234567","Retailer","1234567-8","16101-5419566-3","3277876123456","Registered","Active","Active","Standard Commercial","General",0,500000,"Net 30","Ahsan Khan","Office 402, Blue Area","Islamabad","Islamabad Capital Territory","44000","Pakistan","Active"
CUST-1002,"Lahore General Supplies","Zubair Ali","zubair@lgs.com.pk","03219876543","WS / Distributor","7654321-0","35202-1234567-1","","Registered","Active","Active","Tier 1 Priority","Wholesale Traders",150000,2000000,"Net 15","Usman Malik","Plot 18, Sundar Industrial Estate","Lahore","Punjab","54000","Pakistan","Active"`;
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "unaz_customers_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runImportTest = async () => {
    if (!csvContent) return;
    setIsProcessing(true);
    try {
      const res = await importCustomersFromCsvAction(companyId, csvContent, false);
      if (res.success && res.data) {
        setTestResult({
          tested: true,
          validRows: res.data.validRows,
          errorRows: res.data.errorRows,
        });
      } else {
        setTestResult({
          tested: true,
          validRows: 0,
          errorRows: [{ row: 1, reason: res.error || "Validation failed" }],
        });
      }
    } catch (e: any) {
      setTestResult({
        tested: true,
        validRows: 0,
        errorRows: [{ row: 1, reason: e.message || "Parse failed" }],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const runImportCommit = async () => {
    if (!csvContent) return;
    setIsProcessing(true);
    try {
      const res = await importCustomersFromCsvAction(companyId, csvContent, true);
      if (res.success && res.data) {
        setCommitResult({
          success: res.data.insertedCount > 0,
          insertedCount: res.data.insertedCount,
        });
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        setCommitResult({
          success: false,
          insertedCount: 0,
          error: res.error || "Commit failed",
        });
      }
    } catch (e: any) {
      setCommitResult({
        success: false,
        insertedCount: 0,
        error: e.message || "Commit failed",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Import Customers CSV</h3>
              <p className="text-xs text-muted-foreground">Upload and batch-register customer records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Sample Download Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-dashed border-border bg-muted/30">
            <div className="flex items-center gap-2 text-xs text-foreground font-medium">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Standard UNAZ CSV Template</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleCsv}
              className="gap-1.5 h-8 text-xs font-semibold cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Sample</span>
            </Button>
          </div>

          {/* File Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Choose CSV File to Import</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 file:cursor-pointer border border-border rounded-xl p-2 bg-card"
            />
          </div>

          {/* Validation Test Results */}
          {testResult && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Validation Test Results</span>
                <Badge
                  variant={testResult.errorRows.length === 0 ? "default" : "destructive"}
                  className="text-[11px]"
                >
                  {testResult.errorRows.length === 0 ? "Passed" : `${testResult.errorRows.length} Warnings`}
                </Badge>
              </div>

              <p className="text-muted-foreground">
                <strong className="text-emerald-600 dark:text-emerald-400">{testResult.validRows} rows</strong> valid and ready to import.
              </p>

              {testResult.errorRows.length > 0 && (
                <div className="max-h-28 overflow-y-auto space-y-1 pt-1 border-t border-border">
                  {testResult.errorRows.slice(0, 5).map((err, i) => (
                    <div key={i} className="text-rose-500 font-mono text-[11px]">
                      Row {err.row}: {err.reason}
                    </div>
                  ))}
                  {testResult.errorRows.length > 5 && (
                    <p className="text-muted-foreground text-[10px]">
                      + {testResult.errorRows.length - 5} more issues
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Commit Success Message */}
          {commitResult && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Import Successful
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {commitResult.insertedCount} customers imported into database.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-card/60 flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
            {commitResult?.success ? "Close" : "Cancel"}
          </Button>

          {!testResult?.tested && (
            <Button
              variant="secondary"
              size="sm"
              onClick={runImportTest}
              disabled={!csvContent || isProcessing}
              className="gap-1.5"
            >
              {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Test Import</span>
            </Button>
          )}

          {testResult?.tested && !commitResult?.success && (
            <Button
              variant="default"
              size="sm"
              onClick={runImportCommit}
              disabled={testResult.validRows === 0 || isProcessing}
              className="gap-1.5"
            >
              {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Insert ({testResult.validRows}) Records</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
