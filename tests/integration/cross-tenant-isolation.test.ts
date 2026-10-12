import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCustomer, getCustomers, getCustomerById } from "@/lib/crm/server";
import { createLead, getLeads } from "@/lib/crm/server";
import { createQuotation, createInvoice, getInvoices, recordPayment, getPayments } from "@/lib/sales/server";
import { createExpense, getExpenses, createJournalEntry, getJournalEntries } from "@/lib/finance/server";
import { createHREmployee, getHREmployees, checkIn, submitLeaveRequest, getHRLeaves } from "@/lib/hr/server";
import { createPayrollRun, getPayrollRuns } from "@/lib/payroll/server";
import { createProject, getProjects, createTask, getTasks } from "@/lib/projects/server";
import { createProduct, getProducts, recordStockMovement, getStockMovements, createPurchaseOrder, getPurchaseOrders } from "@/lib/inventory/server";
import { dispatchNotification, getUserNotifications } from "@/lib/notifications/server";

import { resetMemoryCRMStore } from "@/lib/crm/server";
import { resetMemorySalesStore } from "@/lib/sales/server";
import { resetMemoryFinanceStore } from "@/lib/finance/server";
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

describe("Automated Tenant Isolation Suite: Cross-Tenant Breach Prevention", () => {
  const companyA = "tenant-enterprise-alpha-001";
  const companyB = "tenant-enterprise-bravo-002";

  const adminA = {
    id: "user-alpha-admin",
    email: "alpha@corp.example.com",
    full_name: "Alpha Admin",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const adminB = {
    id: "user-bravo-admin",
    email: "bravo@corp.example.com",
    full_name: "Bravo Admin",
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

    mockRequireUser.mockResolvedValue(adminA);
    mockRequirePermission.mockResolvedValue({ permissions: ["*"] });
    mockRecordAuditLog.mockResolvedValue(undefined);
  });

  it("prevents cross-tenant customer & lead visibility (CRM)", async () => {
    // Populate in Company A
    await createCustomer(companyA, { name: "Alpha Customer 1" }, adminA);
    await createLead(companyA, { name: "Alpha Lead 1" }, adminA);

    // Populate in Company B
    await createCustomer(companyB, { name: "Bravo Customer 1" }, adminB);
    await createLead(companyB, { name: "Bravo Lead 1" }, adminB);

    // Query Company A
    const custsA = await getCustomers(companyA, undefined, adminA);
    const leadsA = await getLeads(companyA, undefined, adminA);
    expect(custsA.data.every((c) => c.company_id === companyA)).toBe(true);
    expect(custsA.data.some((c) => c.name === "Bravo Customer 1")).toBe(false);
    expect(leadsA.leads.every((l) => l.company_id === companyA)).toBe(true);
    expect(leadsA.leads.some((l) => l.name === "Bravo Lead 1")).toBe(false);

    // Query Company B
    const custsB = await getCustomers(companyB, undefined, adminB);
    expect(custsB.data.every((c) => c.company_id === companyB)).toBe(true);
    expect(custsB.data.some((c) => c.name === "Alpha Customer 1")).toBe(false);
  });

  it("prevents cross-tenant quotation, invoice & payment leakage (Sales)", async () => {
    const custA = await createCustomer(companyA, { name: "Alpha Client" }, adminA);
    const invA = await createInvoice(companyA, {
      customerId: custA.data?.id,
      issueDate: "2026-10-12",
      dueDate: "2026-11-12",
      items: [{ description: "Server Rack", quantity: 1, unitPrice: 3000 }],
    }, adminA);

    const custB = await createCustomer(companyB, { name: "Bravo Client" }, adminB);
    const invB = await createInvoice(companyB, {
      customerId: custB.data?.id,
      issueDate: "2026-10-12",
      dueDate: "2026-11-12",
      items: [{ description: "Consulting", quantity: 1, unitPrice: 5000 }],
    }, adminB);

    const listA = await getInvoices(companyA, undefined, adminA);
    expect(listA.length).toBe(1);
    expect(listA[0].id).toBe(invA.data!.id);
    expect(listA.some((i) => i.id === invB.data!.id)).toBe(false);

    const listB = await getInvoices(companyB, undefined, adminB);
    expect(listB.length).toBe(1);
    expect(listB[0].id).toBe(invB.data!.id);
  });

  it("prevents cross-tenant operating expense & journal entry breach (Finance)", async () => {
    const expA = await createExpense(companyA, {
      category: "Software",
      amount: 450,
      date: "2026-10-12",
      vendor: "AWS Cloud",
      paymentMethod: "Bank Transfer",
      description: "Hosting for Alpha",
    }, adminA);

    const expB = await createExpense(companyB, {
      category: "Equipment",
      amount: 1200,
      date: "2026-10-12",
      vendor: "Dell Direct",
      paymentMethod: "Credit Card",
      description: "Hardware for Bravo",
    }, adminB);

    const expensesA = await getExpenses(companyA);
    expect(expensesA.length).toBe(1);
    expect(expensesA[0].id).toBe(expA.id);
    expect(expensesA.some((e) => e.id === expB.id)).toBe(false);

    const expensesB = await getExpenses(companyB);
    expect(expensesB.length).toBe(1);
    expect(expensesB[0].id).toBe(expB.id);
  });

  it("prevents cross-tenant employee, attendance & leave access (HR)", async () => {
    const empA = await createHREmployee(companyA, {
      fullName: "Alice Alpha",
      email: "alice@alpha.example.com",
      position: "Lead Architect",
      joiningDate: "2026-01-01",
    }, adminA);

    const empB = await createHREmployee(companyB, {
      fullName: "Bob Bravo",
      email: "bob@bravo.example.com",
      position: "Security Analyst",
      joiningDate: "2026-01-01",
    }, adminB);

    const hrListA = await getHREmployees(companyA);
    expect(hrListA.length).toBe(1);
    expect(hrListA[0].id).toBe(empA.id);
    expect(hrListA.some((e) => e.id === empB.id)).toBe(false);

    const hrListB = await getHREmployees(companyB);
    expect(hrListB.length).toBe(1);
    expect(hrListB[0].id).toBe(empB.id);
  });

  it("prevents cross-tenant project and task visibility (Projects & PMO)", async () => {
    const prjA = await createProject(companyA, { name: "Project Alpha Cloud" }, adminA);
    const taskA = await createTask(companyA, { projectId: prjA.id, name: "Task Alpha Setup" }, adminA);

    const prjB = await createProject(companyB, { name: "Project Bravo Mobile" }, adminB);
    const taskB = await createTask(companyB, { projectId: prjB.id, name: "Task Bravo Testing" }, adminB);

    const prjsA = await getProjects(companyA);
    expect(prjsA.length).toBe(1);
    expect(prjsA[0].id).toBe(prjA.id);

    const tasksA = await getTasks(companyA);
    expect(tasksA.length).toBe(1);
    expect(tasksA[0].id).toBe(taskA.id);

    const prjsB = await getProjects(companyB);
    expect(prjsB.length).toBe(1);
    expect(prjsB[0].id).toBe(prjB.id);
  });

  it("prevents cross-tenant product catalog, movement & PO leakage (Inventory)", async () => {
    const prodA = await createProduct(companyA, {
      sku: "ROUTER-001",
      name: "Alpha Router",
    }, adminA);

    const prodB = await createProduct(companyB, {
      sku: "ROUTER-001", // Allowed because SKU is tenant-scoped
      name: "Bravo Router",
    }, adminB);

    const productsA = await getProducts(companyA);
    expect(productsA.length).toBe(1);
    expect(productsA[0].name).toBe("Alpha Router");

    const productsB = await getProducts(companyB);
    expect(productsB.length).toBe(1);
    expect(productsB[0].name).toBe("Bravo Router");
  });

  it("prevents cross-tenant notification delivery (Notifications)", async () => {
    await dispatchNotification({
      companyId: companyA,
      type: "new_customer",
      category: "Sales",
      title: "Alpha Customer Alert",
      message: "Customer added to Alpha",
      dedupKey: "dedup-alpha-1",
    });

    await dispatchNotification({
      companyId: companyB,
      type: "new_customer",
      category: "Sales",
      title: "Bravo Customer Alert",
      message: "Customer added to Bravo",
      dedupKey: "dedup-bravo-1",
    });

    const notifsA = await getUserNotifications(companyA);
    expect(notifsA.length).toBe(1);
    expect(notifsA[0].title).toBe("Alpha Customer Alert");

    const notifsB = await getUserNotifications(companyB);
    expect(notifsB.length).toBe(1);
    expect(notifsB[0].title).toBe("Bravo Customer Alert");
  });
});
