"use server";

import { revalidatePath } from "next/cache";
import {
  createPayrollRun,
  updatePayrollItem,
  approvePayrollRun,
  finalizePayrollRun,
  reversePayrollRun,
  updatePayrollSettings,
  confirmStatutoryPayrollRules,
  exportPayrollRunToCSV,
} from "@/lib/payroll/server";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createPayrollRunAction(
  companyId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const periodStart = formData.get("periodStart") as string;
    const periodEnd = formData.get("periodEnd") as string;
    const payDate = formData.get("payDate") as string;
    const notes = (formData.get("notes") as string) || null;

    if (!periodStart || !periodEnd || !payDate) {
      return { success: false, error: "Period start, period end, and pay date are required." };
    }

    const result = await createPayrollRun(companyId, {
      periodStart,
      periodEnd,
      payDate,
      notes,
    });

    revalidatePath("/payroll");
    return { success: true, data: result };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message || "Failed to create payroll run" };
  }
}

export async function updatePayrollItemAction(
  companyId: string,
  itemId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const basicSalary = formData.get("basicSalary") ? Number(formData.get("basicSalary")) : undefined;
    const allowances = formData.get("allowances") ? Number(formData.get("allowances")) : undefined;
    const bonus = formData.get("bonus") ? Number(formData.get("bonus")) : undefined;
    const overtime = formData.get("overtime") ? Number(formData.get("overtime")) : undefined;
    const deductions = formData.get("deductions") ? Number(formData.get("deductions")) : undefined;
    const tax = formData.get("tax") ? Number(formData.get("tax")) : undefined;
    const advance = formData.get("advance") ? Number(formData.get("advance")) : undefined;
    const notes = (formData.get("notes") as string) || undefined;

    const updated = await updatePayrollItem(companyId, itemId, {
      basicSalary,
      allowances,
      bonus,
      overtime,
      deductions,
      tax,
      advance,
      notes,
    });

    revalidatePath("/payroll");
    return { success: true, data: updated };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message || "Failed to update payroll item" };
  }
}

export async function approvePayrollRunAction(
  companyId: string,
  runId: string
): Promise<ActionResult> {
  try {
    const approved = await approvePayrollRun(companyId, runId);
    revalidatePath("/payroll");
    return { success: true, data: approved };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message || "Failed to approve payroll run" };
  }
}

export async function finalizePayrollRunAction(
  companyId: string,
  runId: string
): Promise<ActionResult> {
  try {
    const finalized = await finalizePayrollRun(companyId, runId);
    revalidatePath("/payroll");
    return { success: true, data: finalized };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message || "Failed to finalize payroll run" };
  }
}

export async function reversePayrollRunAction(
  companyId: string,
  runId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const reversalReason = formData.get("reversalReason") as string;
    if (!reversalReason || reversalReason.trim().length < 5) {
      return { success: false, error: "A detailed reversal reason (at least 5 characters) is required." };
    }

    const reversed = await reversePayrollRun(companyId, runId, {
      reversalReason,
    });

    revalidatePath("/payroll");
    return { success: true, data: reversed };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message || "Failed to reverse payroll run" };
  }
}

export async function updatePayrollSettingsAction(
  companyId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const currency = (formData.get("currency") as string) || undefined;
    const taxCalculationMode = formData.get("taxCalculationMode") as
      | "Manual"
      | "Percentage"
      | "StatutoryBrackets"
      | undefined;
    const defaultOvertimeHourlyMultiplier = formData.get("defaultOvertimeHourlyMultiplier")
      ? Number(formData.get("defaultOvertimeHourlyMultiplier"))
      : undefined;
    const standardWorkingDaysPerMonth = formData.get("standardWorkingDaysPerMonth")
      ? Number(formData.get("standardWorkingDaysPerMonth"))
      : undefined;
    const roundToNearest = formData.get("roundToNearest") as "cent" | "dollar" | "none" | undefined;
    const autoPostToAccounting = formData.get("autoPostToAccounting") === "true";

    const updated = await updatePayrollSettings(companyId, {
      currency,
      taxCalculationMode,
      defaultOvertimeHourlyMultiplier,
      standardWorkingDaysPerMonth,
      roundToNearest,
      autoPostToAccounting,
    });

    revalidatePath("/payroll");
    return { success: true, data: updated };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message || "Failed to update payroll settings" };
  }
}

export async function confirmStatutoryRulesAction(companyId: string): Promise<ActionResult> {
  try {
    const confirmed = await confirmStatutoryPayrollRules(companyId);
    revalidatePath("/payroll");
    return { success: true, data: confirmed };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message || "Failed to confirm statutory rules" };
  }
}

export async function exportPayrollCSVAction(
  companyId: string,
  runId: string
): Promise<ActionResult<string>> {
  try {
    const csv = await exportPayrollRunToCSV(companyId, runId);
    return { success: true, data: csv };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message || "Failed to export payroll CSV" };
  }
}
