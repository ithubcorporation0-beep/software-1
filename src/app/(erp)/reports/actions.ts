"use server";

import {
  getComprehensiveReports,
  exportReportToCSV,
  ComprehensiveReportsPayload,
} from "@/lib/reports/server";
import { getCurrentUser } from "@/lib/auth/server";

export interface ActionState<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export async function fetchReportsAction(
  companyId: string,
  options?: { startDate?: string; endDate?: string }
): Promise<ActionState<ComprehensiveReportsPayload>> {
  try {
    const user = await getCurrentUser();
    const reports = await getComprehensiveReports(companyId, options, user || undefined);
    return {
      success: true,
      data: reports,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to load reports",
    };
  }
}

export async function exportReportCSVAction(
  companyId: string,
  reportType: "sales" | "finance" | "workforce" | "inventory" | "pmo"
): Promise<ActionState<string>> {
  try {
    const user = await getCurrentUser();
    const reports = await getComprehensiveReports(companyId, {}, user || undefined);
    const csv = exportReportToCSV(reportType, reports);
    return {
      success: true,
      data: csv,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to export report CSV",
    };
  }
}
