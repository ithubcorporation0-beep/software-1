"use server";

import { revalidatePath } from "next/cache";
import {
  createExpense,
  updateExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  createJournalEntry,
  reverseJournalEntry,
  getProfitLossReport,
  getBalanceSheetReport,
  getCashFlowReport,
  getARAgingReport,
  getAPAgingReport,
  getExpenses,
  exportFinancialReportToCSV,
} from "@/lib/finance/server";
import { getCompanySettings } from "@/lib/company/server";

export interface ActionState<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function createExpenseAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const expense = await createExpense(companyId, payload);
    revalidatePath("/finance");
    return {
      success: true,
      message: `Expense ${expense.expense_number} recorded successfully.`,
      data: expense,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to record expense",
    };
  }
}

export async function updateExpenseAction(
  companyId: string,
  expenseId: string,
  payload: any
): Promise<ActionState> {
  try {
    const updated = await updateExpense(companyId, expenseId, payload);
    revalidatePath("/finance");
    return {
      success: true,
      message: `Expense ${updated.expense_number} updated successfully.`,
      data: updated,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to update expense",
    };
  }
}

export async function submitExpenseAction(
  companyId: string,
  expenseId: string
): Promise<ActionState> {
  try {
    const submitted = await submitExpense(companyId, expenseId);
    revalidatePath("/finance");
    return {
      success: true,
      message: `Expense ${submitted.expense_number} submitted for review.`,
      data: submitted,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to submit expense",
    };
  }
}

export async function approveExpenseAction(
  companyId: string,
  expenseId: string
): Promise<ActionState> {
  try {
    const result = await approveExpense(companyId, expenseId);
    revalidatePath("/finance");
    return {
      success: true,
      message: `Expense ${result.expense.expense_number} approved and posted to General Ledger (${result.journalEntry.entry_number}).`,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to approve expense",
    };
  }
}

export async function rejectExpenseAction(
  companyId: string,
  expenseId: string,
  reason: string
): Promise<ActionState> {
  try {
    const rejected = await rejectExpense(companyId, expenseId, reason);
    revalidatePath("/finance");
    return {
      success: true,
      message: `Expense ${rejected.expense_number} rejected.`,
      data: rejected,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to reject expense",
    };
  }
}

export async function createJournalEntryAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const je = await createJournalEntry(companyId, payload);
    revalidatePath("/finance");
    return {
      success: true,
      message: `Journal Entry ${je.entry_number} posted with balanced debits and credits ($${je.total_debit.toFixed(2)}).`,
      data: je,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to post journal entry",
    };
  }
}

export async function reverseJournalEntryAction(
  companyId: string,
  entryId: string,
  reason: string
): Promise<ActionState> {
  try {
    const result = await reverseJournalEntry(companyId, entryId, reason);
    revalidatePath("/finance");
    return {
      success: true,
      message: `Journal Entry reversed successfully via correcting entry ${result.reversal.entry_number}.`,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to reverse journal entry",
    };
  }
}

export async function getFinancialReportAction(
  companyId: string,
  reportType: "profit_loss" | "balance_sheet" | "cash_flow" | "ar_aging" | "ap_aging",
  filters: { from?: string; to?: string; asOfDate?: string }
): Promise<ActionState> {
  try {
    let reportData: any;
    if (reportType === "profit_loss") {
      reportData = await getProfitLossReport(companyId, { from: filters.from, to: filters.to });
    } else if (reportType === "balance_sheet") {
      reportData = await getBalanceSheetReport(companyId, filters.asOfDate);
    } else if (reportType === "cash_flow") {
      reportData = await getCashFlowReport(companyId, { from: filters.from, to: filters.to });
    } else if (reportType === "ar_aging") {
      reportData = await getARAgingReport(companyId, filters.asOfDate);
    } else if (reportType === "ap_aging") {
      reportData = await getAPAgingReport(companyId, filters.asOfDate);
    }

    return {
      success: true,
      data: reportData,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to generate financial report",
    };
  }
}

export async function exportFinancialReportCSVAction(
  companyId: string,
  reportType: "profit_loss" | "balance_sheet" | "cash_flow" | "ar_aging" | "ap_aging" | "expenses",
  filters: { from?: string; to?: string; asOfDate?: string }
): Promise<ActionState<string>> {
  try {
    let reportData: any;
    let companyName = "ERP Tenant";
    let currency = "USD";

    try {
      const settings = await getCompanySettings(companyId);
      companyName = settings.name || companyName;
      currency = settings.currency || currency;
    } catch {
      // Fallback defaults
    }

    if (reportType === "profit_loss") {
      reportData = await getProfitLossReport(companyId, { from: filters.from, to: filters.to });
    } else if (reportType === "balance_sheet") {
      reportData = await getBalanceSheetReport(companyId, filters.asOfDate);
    } else if (reportType === "cash_flow") {
      reportData = await getCashFlowReport(companyId, { from: filters.from, to: filters.to });
    } else if (reportType === "ar_aging") {
      reportData = await getARAgingReport(companyId, filters.asOfDate);
    } else if (reportType === "ap_aging") {
      reportData = await getAPAgingReport(companyId, filters.asOfDate);
    } else if (reportType === "expenses") {
      reportData = await getExpenses(companyId, { from: filters.from, to: filters.to });
    }

    const csv = exportFinancialReportToCSV(reportType, reportData, {
      companyName,
      currency,
    });

    return {
      success: true,
      data: csv,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to export report",
    };
  }
}
