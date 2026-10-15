import { requirePermission } from "@/lib/auth/server";
import { getInvoices, getPayments } from "@/lib/sales/server";
import { getExpenses, getProfitLossReport } from "@/lib/finance/server";
import { getHREmployees, getHRAttendance, getHRLeaves } from "@/lib/hr/server";
import { getPayrollRuns } from "@/lib/payroll/server";
import { getProducts, getStockMovements, getPurchaseOrders } from "@/lib/inventory/server";
import { getProjects, getTasks } from "@/lib/projects/server";
import type { Profile } from "@/types/database.types";
import { sanitizeCSVCell } from "@/lib/utils/csv-sanitizer";

// ============================================================================
// REPORT DATA STRUCTURES
// ============================================================================

export interface SalesReportRow {
  periodKey: string; // e.g. "2026-10-12" or "2026-10" or "Customer Name"
  invoiceCount: number;
  grossSales: number;
  paymentsReceived: number;
  outstandingBalance: number;
}

export interface FinancialReportSummary {
  revenueTotal: number;
  expensesTotal: number;
  netOperatingIncome: number;
  outstandingReceivables: number;
  accountsPayable: number;
  cashAndBankBalance: number;
}

export interface WorkforceReportSummary {
  totalStaff: number;
  attendancePresent: number;
  attendanceLate: number;
  leaveCount: number;
  totalPayrollDisbursed: number;
  activeDepartments: number;
}

export interface InventoryLogisticsReportSummary {
  totalSkus: number;
  totalStockUnits: number;
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalMovements: number;
  totalPurchasedAmount: number;
}

export interface ProjectsPMOReportSummary {
  totalProjects: number;
  activeProjects: number;
  totalBudget: number;
  averageProgressPct: number;
  totalTasks: number;
  completedTasks: number;
  urgentTasks: number;
}

export interface ComprehensiveReportsPayload {
  companyId: string;
  currency: string;
  salesSummary: {
    byMonth: SalesReportRow[];
    byCustomer: SalesReportRow[];
    totalSales: number;
  };
  finance: FinancialReportSummary;
  workforce: WorkforceReportSummary;
  inventory: InventoryLogisticsReportSummary;
  pmo: ProjectsPMOReportSummary;
}

// ============================================================================
// REPORT GENERATION & DATA COMPILATION
// ============================================================================

export async function getComprehensiveReports(
  companyId: string,
  options?: {
    startDate?: string;
    endDate?: string;
  },
  viewerUser?: Profile
): Promise<ComprehensiveReportsPayload> {
  // Enforce server-side authorization: reports.read or finance.read or admin
  await requirePermission(companyId, "reports.read", viewerUser);

  // 1. Fetch Sales & Invoices
  const [invoices, payments] = await Promise.all([
    getInvoices(companyId).catch(() => []),
    getPayments(companyId).catch(() => []),
  ]);

  let totalSales = 0;
  const monthMap: Record<string, SalesReportRow> = {};
  const customerMap: Record<string, SalesReportRow> = {};

  for (const inv of invoices) {
    if (inv.status === "Cancelled") continue;
    totalSales += inv.grand_total;

    const mKey = (inv.issue_date || "").substring(0, 7) || "Unscheduled";
    if (!monthMap[mKey]) {
      monthMap[mKey] = {
        periodKey: mKey,
        invoiceCount: 0,
        grossSales: 0,
        paymentsReceived: 0,
        outstandingBalance: 0,
      };
    }
    monthMap[mKey].invoiceCount += 1;
    monthMap[mKey].grossSales += inv.grand_total;
    monthMap[mKey].outstandingBalance += inv.amount_due;

    const cKey = inv.customer?.name || "Standard Client";
    if (!customerMap[cKey]) {
      customerMap[cKey] = {
        periodKey: cKey,
        invoiceCount: 0,
        grossSales: 0,
        paymentsReceived: 0,
        outstandingBalance: 0,
      };
    }
    customerMap[cKey].invoiceCount += 1;
    customerMap[cKey].grossSales += inv.grand_total;
    customerMap[cKey].outstandingBalance += inv.amount_due;
  }

  for (const pmt of payments) {
    if (pmt.status === "Completed") {
      const mKey = (pmt.payment_date || "").substring(0, 7) || "Unscheduled";
      if (monthMap[mKey]) {
        monthMap[mKey].paymentsReceived += pmt.amount;
      }
    }
  }

  // 2. Fetch Finance & Operating Expenses
  const pl = await getProfitLossReport(companyId, {}).catch(() => ({
    revenue: { total: 0 },
    expenses: { total: 0 },
    netOperatingIncome: 0,
  }));

  const expenses = await getExpenses(companyId).catch(() => []);
  const outstandingReceivables = invoices.reduce((acc, i) => acc + (i.amount_due || 0), 0);

  // 3. Fetch HR, Attendance & Payroll
  const [employees, attendance, leaves, payrollRuns] = await Promise.all([
    getHREmployees(companyId, {}, viewerUser).catch(() => []),
    getHRAttendance(companyId).catch(() => []),
    getHRLeaves(companyId, {}, viewerUser).catch(() => []),
    getPayrollRuns(companyId, {}, viewerUser).catch(() => []),
  ]);

  const presentCount = attendance.filter((a) => a.status === "Present").length;
  const lateCount = attendance.filter((a) => a.status === "Late").length;
  const payrollTotal = payrollRuns.reduce((acc, pr) => acc + (pr.total_net || 0), 0);

  // 4. Fetch Inventory, Movements & Purchases
  const [products, movements, purchaseOrders] = await Promise.all([
    getProducts(companyId).catch(() => []),
    getStockMovements(companyId).catch(() => []),
    getPurchaseOrders(companyId).catch(() => []),
  ]);

  const totalStockUnits = products.reduce((acc, p) => acc + p.current_stock, 0);
  const totalValuation = products.reduce((acc, p) => acc + p.current_stock * p.purchase_price, 0);
  const lowStockCount = products.filter((p) => p.status === "Low Stock").length;
  const outOfStockCount = products.filter((p) => p.status === "Out of Stock").length;
  const totalPurchasedAmount = purchaseOrders.reduce((acc, po) => acc + (po.total_amount || 0), 0);

  // 5. Fetch PMO Projects & Tasks
  const [projects, tasks] = await Promise.all([
    getProjects(companyId, {}, viewerUser).catch(() => []),
    getTasks(companyId, {}, viewerUser).catch(() => []),
  ]);

  const activeProjects = projects.filter((p) => p.status === "Active").length;
  const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
  const avgProgress =
    projects.length > 0
      ? Math.round(projects.reduce((acc, p) => acc + (p.progress_pct || 0), 0) / projects.length)
      : 0;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const urgentTasks = tasks.filter((t) => t.priority === "Urgent" && t.status !== "Completed").length;

  return {
    companyId,
    currency: "PKR",
    salesSummary: {
      byMonth: Object.values(monthMap).sort((a, b) => b.periodKey.localeCompare(a.periodKey)),
      byCustomer: Object.values(customerMap).sort((a, b) => b.grossSales - a.grossSales),
      totalSales,
    },
    finance: {
      revenueTotal: pl.revenue.total,
      expensesTotal: pl.expenses.total,
      netOperatingIncome: pl.netOperatingIncome,
      outstandingReceivables,
      accountsPayable: purchaseOrders.reduce((acc, po) => acc + (po.total_amount - po.paid_amount), 0),
      cashAndBankBalance: Math.max(0, pl.revenue.total - pl.expenses.total),
    },
    workforce: {
      totalStaff: employees.length,
      attendancePresent: presentCount,
      attendanceLate: lateCount,
      leaveCount: leaves.length,
      totalPayrollDisbursed: payrollTotal,
      activeDepartments: new Set(employees.map((e) => e.department_id).filter(Boolean)).size,
    },
    inventory: {
      totalSkus: products.length,
      totalStockUnits,
      totalValuation,
      lowStockCount,
      outOfStockCount,
      totalMovements: movements.length,
      totalPurchasedAmount,
    },
    pmo: {
      totalProjects: projects.length,
      activeProjects,
      totalBudget,
      averageProgressPct: avgProgress,
      totalTasks: tasks.length,
      completedTasks,
      urgentTasks,
    },
  };
}

// ============================================================================
// AUDITABLE CSV EXPORT ENGINE
// ============================================================================

export function exportReportToCSV(
  reportType: "sales" | "finance" | "workforce" | "inventory" | "pmo",
  data: ComprehensiveReportsPayload
): string {
  const lines: string[] = [];

  switch (reportType) {
    case "sales":
      lines.push("IT-Hub ERP Sales & Commercial Performance Report");
      lines.push(`Generated: ${new Date().toISOString()}`);
      lines.push("");
      lines.push("Month / Period,Invoice Count,Gross Sales,Payments Received,Outstanding Balance");
      for (const row of data.salesSummary.byMonth) {
        lines.push(
          `${sanitizeCSVCell(row.periodKey)},${row.invoiceCount},${row.grossSales.toFixed(2)},${row.paymentsReceived.toFixed(2)},${row.outstandingBalance.toFixed(2)}`
        );
      }
      lines.push("");
      lines.push("Top Customers,Invoice Count,Gross Sales,Outstanding Balance");
      for (const row of data.salesSummary.byCustomer) {
        lines.push(
          `${sanitizeCSVCell(row.periodKey)},${row.invoiceCount},${row.grossSales.toFixed(2)},${row.outstandingBalance.toFixed(2)}`
        );
      }
      break;

    case "finance":
      lines.push("IT-Hub ERP Financial Summary Schedule");
      lines.push(`Generated: ${new Date().toISOString()}`);
      lines.push("");
      lines.push("Metric,Amount (PKR)");
      lines.push(`Gross Revenue Collected,${data.finance.revenueTotal.toFixed(2)}`);
      lines.push(`Operating Expenditures,${data.finance.expensesTotal.toFixed(2)}`);
      lines.push(`Net Operating Margin,${data.finance.netOperatingIncome.toFixed(2)}`);
      lines.push(`Outstanding Accounts Receivable,${data.finance.outstandingReceivables.toFixed(2)}`);
      lines.push(`Accounts Payable Liability,${data.finance.accountsPayable.toFixed(2)}`);
      break;

    case "workforce":
      lines.push("IT-Hub ERP Human Capital & Payroll Summary");
      lines.push(`Generated: ${new Date().toISOString()}`);
      lines.push("");
      lines.push("Metric,Value");
      lines.push(`Verified Personnel,${data.workforce.totalStaff}`);
      lines.push(`Present Attendance Records,${data.workforce.attendancePresent}`);
      lines.push(`Late Attendance Records,${data.workforce.attendanceLate}`);
      lines.push(`Total Leaves Filed,${data.workforce.leaveCount}`);
      lines.push(`Total Net Payroll Disbursed,${data.workforce.totalPayrollDisbursed.toFixed(2)}`);
      break;

    case "inventory":
      lines.push("IT-Hub ERP Stock Valuation & Procurement Report");
      lines.push(`Generated: ${new Date().toISOString()}`);
      lines.push("");
      lines.push("Metric,Value");
      lines.push(`Total Catalog SKUs,${data.inventory.totalSkus}`);
      lines.push(`Total Units On-Hand,${data.inventory.totalStockUnits}`);
      lines.push(`Inventory Asset Valuation,${data.inventory.totalValuation.toFixed(2)}`);
      lines.push(`Low-Stock SKU Alerts,${data.inventory.lowStockCount}`);
      lines.push(`Out-of-Stock SKUs,${data.inventory.outOfStockCount}`);
      lines.push(`Total Auditable Movements,${data.inventory.totalMovements}`);
      lines.push(`Total Purchase Orders Issued,${data.inventory.totalPurchasedAmount.toFixed(2)}`);
      break;

    case "pmo":
      lines.push("IT-Hub ERP Capital Projects & Deliverables Report");
      lines.push(`Generated: ${new Date().toISOString()}`);
      lines.push("");
      lines.push("Metric,Value");
      lines.push(`Total Projects,${data.pmo.totalProjects}`);
      lines.push(`Active Initiatives,${data.pmo.activeProjects}`);
      lines.push(`Portfolio Capital Budget,${data.pmo.totalBudget.toFixed(2)}`);
      lines.push(`Average Completion Rate,${data.pmo.averageProgressPct}%`);
      lines.push(`Total Tasks,${data.pmo.totalTasks}`);
      lines.push(`Completed Tasks,${data.pmo.completedTasks}`);
      lines.push(`Pending Urgent Deliverables,${data.pmo.urgentTasks}`);
      break;
  }

  return lines.join("\n");
}
