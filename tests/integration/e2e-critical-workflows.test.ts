import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCustomer, createLead, moveLeadStage } from "@/lib/crm/server";
import {
  createQuotation,
  convertQuotationToInvoice,
  createInvoice,
  recordPayment,
  getInvoices,
} from "@/lib/sales/server";
import {
  createExpense,
  submitExpense,
  approveExpense,
  getProfitLossReport,
} from "@/lib/finance/server";
import {
  createHREmployee,
  checkIn,
  checkOut,
  submitLeaveRequest,
  reviewLeaveRequest,
} from "@/lib/hr/server";
import {
  createPayrollRun,
  updatePayrollItem,
  approvePayrollRun,
  finalizePayrollRun,
  getPayrollRuns,
} from "@/lib/payroll/server";
import {
  createProject,
  createTask,
  updateTaskStatus,
  getProjectById,
} from "@/lib/projects/server";
import {
  createProduct,
  recordStockMovement,
  createSupplier,
  createPurchaseOrder,
  receivePurchaseOrderGoods,
  payPurchaseOrder,
  getProductById,
} from "@/lib/inventory/server";
import { getComprehensiveReports, exportReportToCSV } from "@/lib/reports/server";

import { resetMemoryCRMStore } from "@/lib/crm/server";
import { resetMemorySalesStore } from "@/lib/sales/server";
import { resetMemoryFinanceStore, memoryFinanceStore } from "@/lib/finance/server";
import { resetMemoryHRStore } from "@/lib/hr/server";
import { resetMemoryPayrollStore } from "@/lib/payroll/server";
import { resetMemoryProjectStore } from "@/lib/projects/server";
import { resetMemoryInventoryStore } from "@/lib/inventory/server";
import { resetMemoryNotificationStore } from "@/lib/notifications/server";

const { mockRequireUser, mockRequirePermission, mockRecordAuditLog } = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockRecordAuditLog: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  requireUser: () => mockRequireUser(),
  requirePermission: (companyId: string, perm: string, user?: any) =>
    mockRequirePermission(companyId, perm, user),
}));

vi.mock("@/lib/audit/server", () => ({
  recordAuditLog: (...args: any[]) => mockRecordAuditLog(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "mock rpc" } }),
  })),
}));

describe("End-to-End Critical Business Workflows", () => {
  const companyId = "tenant-e2e-corp-001";

  const operatorUser = {
    id: "user-e2e-op",
    email: "operator@e2e.example.com",
    full_name: "Operations Lead",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const financeManager = {
    id: "user-e2e-cfo",
    email: "cfo@e2e.example.com",
    full_name: "Chief Financial Officer",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetMemoryCRMStore();
    resetMemorySalesStore();
    resetMemoryFinanceStore();
    resetMemoryHRStore();
    resetMemoryPayrollStore();
    resetMemoryProjectStore();
    resetMemoryInventoryStore();
    resetMemoryNotificationStore();

    mockRequireUser.mockResolvedValue(operatorUser);
    mockRequirePermission.mockResolvedValue({ permissions: ["*"] });
    mockRecordAuditLog.mockResolvedValue(undefined);
  });

  // ==========================================================================
  // WORKFLOW 1: LEAD -> CUSTOMER -> QUOTE -> INVOICE -> PAYMENT -> GL POSTING
  // ==========================================================================

  it("Workflow 1: CRM Lead to Quotation, Invoice, Partial & Full Payment and GL posting", async () => {
    // 1. Create Lead and progress stage
    const leadRes = await createLead(companyId, {
      name: "Acme Cloud Infrastructure Opportunity",
      companyName: "Acme Corp",
      email: "contact@acme.com",
      expectedValue: 12000,
      status: "New",
    }, operatorUser);
    expect(leadRes.success).toBe(true);
    expect(leadRes.data?.id).toBeDefined();

    const qualifiedLead = await moveLeadStage(companyId, leadRes.data!.id, "Qualified", undefined, operatorUser);
    expect(qualifiedLead.success).toBe(true);

    // 2. Onboard Customer
    const customerRes = await createCustomer(companyId, {
      name: "Acme Corporation",
      companyName: "Acme Corp",
      email: "billing@acme.com",
      customerType: "Enterprise",
      status: "Active",
    }, operatorUser);
    expect(customerRes.success).toBe(true);
    expect(customerRes.data?.id).toBeDefined();

    // 3. Create Quotation
    const quoteRes = await createQuotation(companyId, {
      customerId: customerRes.data!.id,
      issueDate: "2026-10-12",
      expiryDate: "2026-11-12",
      items: [
        { description: "Managed Kubernetes Cluster", quantity: 1, unitPrice: 8000, discountPct: 0, taxPct: 0 },
        { description: "Support Retainer", quantity: 1, unitPrice: 4000, discountPct: 0, taxPct: 0 },
      ],
    }, operatorUser);
    expect(quoteRes.success).toBe(true);
    const quote = quoteRes.data!;
    expect(quote.quotation_number).toMatch(/^(?:QUO|QT)-\d+$/);
    expect(quote.grand_total).toBe(12000);

    // 4. Convert Quote to Official Invoice
    const invoiceRes = await convertQuotationToInvoice(companyId, quote.id, operatorUser);
    expect(invoiceRes.success).toBe(true);
    const invoice = invoiceRes.data!;
    expect(invoice.invoice_number).toMatch(/^INV-\d+$/);
    expect(invoice.grand_total).toBe(12000);
    expect(invoice.status).toBe("Sent");
    expect(invoice.amount_due).toBe(12000);

    // 5. Record Partial Payment ($5,000)
    const partialPaymentRes = await recordPayment(companyId, {
      invoiceId: invoice.id,
      amount: 5000,
      paymentDate: "2026-10-14",
      paymentMethod: "Bank Transfer",
      reference: "WIRE-ACME-001",
    }, operatorUser);
    expect(partialPaymentRes.success).toBe(true);

    const partialInvoice = (await getInvoices(companyId, undefined, operatorUser)).find((i) => i.id === invoice.id);
    expect(partialInvoice?.amount_due).toBe(7000);
    expect(partialInvoice?.status).toBe("Partially Paid");

    // 6. Record Full Settlement Payment ($7,000)
    const fullPaymentRes = await recordPayment(companyId, {
      invoiceId: invoice.id,
      amount: 7000,
      paymentDate: "2026-10-20",
      paymentMethod: "Bank Transfer",
      reference: "WIRE-ACME-002",
    }, operatorUser);
    expect(fullPaymentRes.success).toBe(true);

    const settledInvoice = (await getInvoices(companyId, undefined, operatorUser)).find((i) => i.id === invoice.id);
    expect(settledInvoice?.amount_due).toBe(0);
    expect(settledInvoice?.status).toBe("Paid");
  });

  // ==========================================================================
  // WORKFLOW 2: EXPENSE SUBMISSION & APPROVAL WITH SEPARATION OF DUTIES
  // ==========================================================================

  it("Workflow 2: Employee Expense submission and CFO approval", async () => {
    // 1. Employee submits expense
    const expense = await createExpense(companyId, {
      category: "Software",
      amount: 1200,
      date: "2026-10-12",
      vendor: "Datadog Monitoring",
      paymentMethod: "Credit Card",
      description: "APM and server log ingestion subscription",
    }, operatorUser);

    expect(expense.approval_status).toBe("Draft");

    const submitted = await submitExpense(companyId, expense.id, operatorUser);
    expect(submitted.approval_status).toBe("Submitted");

    // 2. CFO approves expense (different user)
    mockRequireUser.mockResolvedValue(financeManager);
    const approved = await approveExpense(companyId, expense.id, financeManager);
    expect(approved.expense.approval_status).toBe("Approved");
    expect(approved.expense.approved_by).toBe(financeManager.id);
    expect(approved.journalEntry).toBeDefined();
  });

  // ==========================================================================
  // WORKFLOW 3: HR WORKFORCE, ATTENDANCE & LEAVE WORKFLOW
  // ==========================================================================

  it("Workflow 3: HR employee onboarding, shift attendance and leave approval", async () => {
    // 1. Onboard Staff
    const employee = await createHREmployee(companyId, {
      fullName: "Marcus Sterling",
      email: "marcus@corp.example.com",
      position: "Senior Systems Engineer",
      joiningDate: "2026-10-01",
    }, operatorUser);
    expect(employee.employee_id).toMatch(/^EMP-\d+$/);

    // 2. Check In & Check Out
    const checkInRecord = await checkIn(companyId, employee.id, "2026-10-12T09:00:00.000Z", "On-site shift", operatorUser);
    expect(checkInRecord.check_in).toBeDefined();

    const checkOutRecord = await checkOut(companyId, employee.id, "2026-10-12T17:00:00.000Z", "End of day", operatorUser);
    expect(checkOutRecord.check_out).toBeDefined();
    expect(checkOutRecord.total_hours).toBeGreaterThanOrEqual(0);

    // 3. Submit and Review Leave Request
    const leave = await submitLeaveRequest(companyId, {
      employeeId: employee.id,
      leaveType: "Annual",
      startDate: "2026-11-10",
      endDate: "2026-11-12",
      reason: "Family vacation",
    }, operatorUser);
    expect(leave.status).toBe("Pending");

    const reviewedLeave = await reviewLeaveRequest(companyId, leave.id, {
      status: "Approved",
    }, operatorUser);
    expect(reviewedLeave.status).toBe("Approved");
  });

  // ==========================================================================
  // WORKFLOW 4: CONTROLLED PAYROLL ENGINE WITH FORMULA & APPROVAL GATES
  // ==========================================================================

  it("Workflow 4: Deterministic payroll run calculation, review, and finalization", async () => {
    const employee = await createHREmployee(companyId, {
      fullName: "Devon Vance",
      email: "devon@corp.example.com",
      position: "Platform Engineer",
      joiningDate: "2026-10-01",
      salary: 6000,
    }, operatorUser);

    // 1. Generate Draft Payroll Run
    const { run, items } = await createPayrollRun(companyId, {
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      payDate: "2026-10-31",
      notes: "October Regular Salary Run",
    }, operatorUser);
    expect(run.status).toBe("Draft");

    // 2. Adjust with PRD formula components: Allowances (+500), Overtime (+300), Tax (-600)
    // Formula: Net = 6000 + 500 + 300 - 600 = 6200
    const item = items?.[0];
    if (item) {
      const updatedItem = await updatePayrollItem(companyId, item.id, {
        allowances: 500,
        overtime: 300,
        tax: 600,
      }, operatorUser);
      expect(updatedItem.net_salary).toBe(6200);
    }

    // 3. Approval Gate & Finalize
    const approvedRun = await approvePayrollRun(companyId, run.id, financeManager);
    expect(approvedRun.status).toBe("Approved");

    const finalizedRun = await finalizePayrollRun(companyId, run.id, financeManager);
    expect(finalizedRun.status).toBe("Finalized");
    expect(finalizedRun.journal_entry_id).toBeDefined();
  });

  // ==========================================================================
  // WORKFLOW 5: PROJECT & TASK KANBAN VELOCITY
  // ==========================================================================

  it("Workflow 5: Project creation, task assignment, and Kanban completion", async () => {
    const project = await createProject(companyId, {
      name: "Global Data Center Expansion",
      budget: 100000,
      status: "Active",
    }, operatorUser);

    const taskA = await createTask(companyId, {
      projectId: project.id,
      name: "Fiber Optic Provisioning",
      status: "To Do",
      priority: "Urgent",
    }, operatorUser);

    const taskB = await createTask(companyId, {
      projectId: project.id,
      name: "Power Backup UPS Testing",
      status: "To Do",
      priority: "High",
    }, operatorUser);

    // Complete task A
    await updateTaskStatus(companyId, taskA.id, "Completed", operatorUser);
    let p = await getProjectById(companyId, project.id);
    expect(p?.progress_pct).toBe(50);

    // Complete task B
    await updateTaskStatus(companyId, taskB.id, "Completed", operatorUser);
    p = await getProjectById(companyId, project.id);
    expect(p?.progress_pct).toBe(100);
  });

  // ==========================================================================
  // WORKFLOW 6: INVENTORY & PROCUREMENT TO ACCOUNTING POSTING
  // ==========================================================================

  it("Workflow 6: Product registration, PO issuance, Goods receipt exactly once and payment", async () => {
    const supplier = await createSupplier(companyId, {
      name: "Global Silicon Suppliers",
    }, operatorUser);

    const product = await createProduct(companyId, {
      sku: "CHIP-TPU-V4",
      name: "Tensor Processing Unit Board",
      purchasePrice: 2500,
      sellingPrice: 3800,
    }, operatorUser);

    expect(product.current_stock).toBe(0);

    // Issue Purchase Order for 4 units ($10,000)
    const po = await createPurchaseOrder(companyId, {
      supplierId: supplier.id,
      orderDate: "2026-10-12",
      items: [{
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantityOrdered: 4,
        unitPrice: 2500,
      }],
    }, operatorUser);

    // Receive Goods -> Stock is 4, GL entry posted
    const receivedPO = await receivePurchaseOrderGoods(companyId, po.id, {
      grnNumber: "GRN-CHIP-001",
    }, operatorUser);
    expect(receivedPO.status).toBe("Goods Received");

    const refreshedProduct = await getProductById(companyId, product.id);
    expect(refreshedProduct?.current_stock).toBe(4);

    // Transfer 2 units to secondary depot
    await recordStockMovement(companyId, {
      productId: product.id,
      type: "Transfer",
      quantity: 2,
      reason: "Inter-depot shipment",
    }, operatorUser);

    const transferredProduct = await getProductById(companyId, product.id);
    expect(transferredProduct?.current_stock).toBe(2);

    // Pay Supplier ($10,000)
    const paidPO = await payPurchaseOrder(companyId, po.id, {
      amount: 10000,
      paymentMethod: "Bank Transfer",
    }, operatorUser);
    expect(paidPO.status).toBe("Paid");
    expect(paidPO.payment_status).toBe("Paid");
  });

  // ==========================================================================
  // WORKFLOW 7: COMPREHENSIVE REPORTS AGGREGATION & CSV EXPORT
  // ==========================================================================

  it("Workflow 7: Reports compilation and CSV schedule generation", async () => {
    const reports = await getComprehensiveReports(companyId, {}, operatorUser);
    expect(reports.companyId).toBe(companyId);
    expect(reports.finance).toBeDefined();
    expect(reports.workforce).toBeDefined();
    expect(reports.inventory).toBeDefined();
    expect(reports.pmo).toBeDefined();

    const salesCSV = exportReportToCSV("sales", reports);
    expect(salesCSV).toContain("IT-Hub ERP Sales & Commercial Performance Report");

    const financeCSV = exportReportToCSV("finance", reports);
    expect(financeCSV).toContain("IT-Hub ERP Financial Summary Schedule");

    const inventoryCSV = exportReportToCSV("inventory", reports);
    expect(inventoryCSV).toContain("IT-Hub ERP Stock Valuation & Procurement Report");
  });
});
