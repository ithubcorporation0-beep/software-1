import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  createTask,
  getTasks,
  updateTaskStatus,
  updateTask,
  resetMemoryProjectStore,
  ProjectNotFoundError,
  TaskNotFoundError,
} from "@/lib/projects/server";
import {
  createWarehouse,
  getWarehouses,
  createSupplier,
  getSuppliers,
  createProduct,
  getProducts,
  getProductById,
  recordStockMovement,
  getStockMovements,
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  receivePurchaseOrderGoods,
  payPurchaseOrder,
  resetMemoryInventoryStore,
  DuplicateSKUError,
  InsufficientStockError,
  ProductNotFoundError,
  PurchaseOrderTransitionError,
} from "@/lib/inventory/server";
import { resetMemoryFinanceStore, memoryFinanceStore } from "@/lib/finance/server";

const { ForbiddenError, mockRequireUser, mockRequirePermission, mockRecordAuditLog } = vi.hoisted(() => {
  class ForbiddenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ForbiddenError";
    }
  }
  return {
    ForbiddenError,
    mockRequireUser: vi.fn(),
    mockRequirePermission: vi.fn(),
    mockRecordAuditLog: vi.fn(),
  };
});

vi.mock("@/lib/auth/server", () => ({
  ForbiddenError,
  requireUser: () => mockRequireUser(),
  requirePermission: (companyId: string, perm: string, user?: any) =>
    mockRequirePermission(companyId, perm, user),
}));

vi.mock("@/lib/audit/server", () => ({
  recordAuditLog: (...args: any[]) => mockRecordAuditLog(...args),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "rpc pending" } }),
  })),
}));

describe("Prompt 9: Projects, Tasks, Inventory, Suppliers, and Purchasing", () => {
  const companyA = "comp-alpha-111";
  const companyB = "comp-bravo-222";

  const adminUser = {
    id: "usr-admin-01",
    email: "admin@alpha.com",
    full_name: "Operations Director",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetMemoryProjectStore();
    resetMemoryInventoryStore();
    resetMemoryFinanceStore();

    mockRequireUser.mockResolvedValue(adminUser);
    mockRequirePermission.mockResolvedValue(true);
    mockRecordAuditLog.mockResolvedValue(undefined);
  });

  // ==========================================================================
  // SECTION 1: PROJECTS & TASKS KANBAN
  // ==========================================================================

  describe("Projects & Tasks Module", () => {
    it("creates a capital project with sequential code, budget, and default progress", async () => {
      const project = await createProject(companyA, {
        name: "Enterprise ERP Rollout",
        budget: 50000,
        status: "Active",
        startDate: "2026-11-01",
        endDate: "2027-04-30",
        description: "Cloud-native ERP system implementation across depots",
      }, adminUser);

      expect(project.id).toBeDefined();
      expect(project.project_code).toMatch(/^PRJ-\d+$/);
      expect(project.name).toBe("Enterprise ERP Rollout");
      expect(project.budget).toBe(50000);
      expect(project.status).toBe("Active");
      expect(project.progress_pct).toBe(0);

      expect(mockRecordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "PROJECT_CREATED",
          companyId: companyA,
        })
      );
    });

    it("creates tasks linked to a project and assigns priority and sequential task code", async () => {
      const project = await createProject(companyA, {
        name: "Supply Chain Overhaul",
        budget: 20000,
      }, adminUser);

      const task1 = await createTask(companyA, {
        projectId: project.id,
        name: "Define Depot Bin Locations",
        priority: "High",
        status: "To Do",
        assignedEmployeeName: "Warehouse Lead",
      }, adminUser);

      expect(task1.task_code).toMatch(/^TSK-\d+$/);
      expect(task1.project_id).toBe(project.id);
      expect(task1.priority).toBe("High");
      expect(task1.status).toBe("To Do");

      const task2 = await createTask(companyA, {
        projectId: project.id,
        name: "Procure Barcode Scanners",
        priority: "Urgent",
        status: "To Do",
      }, adminUser);

      expect(task2.task_code).toMatch(/^TSK-\d+$/);
      expect(task2.task_code).not.toBe(task1.task_code);
    });

    it("persists Kanban status transitions and dynamically updates project progress percentage", async () => {
      const project = await createProject(companyA, {
        name: "Logistics Optimization",
        budget: 15000,
      }, adminUser);

      const t1 = await createTask(companyA, {
        projectId: project.id,
        name: "Task 1: Vendor Onboarding",
        status: "To Do",
      }, adminUser);

      const t2 = await createTask(companyA, {
        projectId: project.id,
        name: "Task 2: Route Planning",
        status: "To Do",
      }, adminUser);

      // Initially 0%
      let fetchedProj = await getProjectById(companyA, project.id);
      expect(fetchedProj?.progress_pct).toBe(0);

      // Advance task 1 to In Progress -> still 0% completed
      const updatedT1 = await updateTaskStatus(companyA, t1.id, "In Progress", adminUser);
      expect(updatedT1.status).toBe("In Progress");
      fetchedProj = await getProjectById(companyA, project.id);
      expect(fetchedProj?.progress_pct).toBe(0);

      // Advance task 1 to Completed -> 1 of 2 = 50%
      await updateTaskStatus(companyA, t1.id, "Completed", adminUser);
      fetchedProj = await getProjectById(companyA, project.id);
      expect(fetchedProj?.progress_pct).toBe(50);

      // Advance task 2 to Completed -> 2 of 2 = 100%
      await updateTaskStatus(companyA, t2.id, "Completed", adminUser);
      fetchedProj = await getProjectById(companyA, project.id);
      expect(fetchedProj?.progress_pct).toBe(100);

      expect(mockRecordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "TASK_STATUS_UPDATED",
          companyId: companyA,
        })
      );
    });

    it("rejects task creation for non-existent projects", async () => {
      await expect(
        createTask(companyA, {
          projectId: "non-existent-prj",
          name: "Invalid Task",
        }, adminUser)
      ).rejects.toThrow(ProjectNotFoundError);
    });

    it("enforces tenant isolation for projects and tasks", async () => {
      const projA = await createProject(companyA, { name: "Project Alpha" }, adminUser);
      await createTask(companyA, { projectId: projA.id, name: "Task Alpha" }, adminUser);

      const projB = await createProject(companyB, { name: "Project Bravo" }, adminUser);
      await createTask(companyB, { projectId: projB.id, name: "Task Bravo" }, adminUser);

      const listA = await getProjects(companyA);
      expect(listA.length).toBe(1);
      expect(listA[0].name).toBe("Project Alpha");

      const tasksA = await getTasks(companyA);
      expect(tasksA.length).toBe(1);
      expect(tasksA[0].name).toBe("Task Alpha");

      const listB = await getProjects(companyB);
      expect(listB.length).toBe(1);
      expect(listB[0].name).toBe("Project Bravo");
    });
  });

  // ==========================================================================
  // SECTION 2: INVENTORY & AUDITABLE STOCK LEDGER
  // ==========================================================================

  describe("Inventory & Stock Movement Engine", () => {
    it("creates warehouses and products with scoped SKU uniqueness", async () => {
      const wh = await createWarehouse(companyA, {
        code: "WH-EAST",
        name: "East Logistics Terminal",
        city: "Boston",
        capacity: 30000,
      }, adminUser);

      expect(wh.code).toBe("WH-EAST");

      const prod = await createProduct(companyA, {
        sku: "SRV-DELL-R750",
        name: "Dell PowerEdge R750 Server",
        category: "Enterprise Hardware",
        purchasePrice: 4500,
        sellingPrice: 6200,
        minimumStock: 5,
        warehouseId: wh.id,
      }, adminUser);

      expect(prod.sku).toBe("SRV-DELL-R750");
      expect(prod.current_stock).toBe(0); // Untraceable direct edits prohibited; starts at 0
      expect(prod.status).toBe("Out of Stock");

      // Duplicate SKU in same tenant is rejected
      await expect(
        createProduct(companyA, {
          sku: "SRV-DELL-R750",
          name: "Duplicate Server",
        }, adminUser)
      ).rejects.toThrow(DuplicateSKUError);

      // Same SKU in different tenant is allowed
      const prodB = await createProduct(companyB, {
        sku: "SRV-DELL-R750",
        name: "Tenant B Server",
      }, adminUser);
      expect(prodB.company_id).toBe(companyB);
    });

    it("records auditable Stock In movements and atomically increments product balance", async () => {
      const prod = await createProduct(companyA, {
        sku: "NET-CISCO-9300",
        name: "Cisco Catalyst 9300 Switch",
        minimumStock: 5,
      }, adminUser);

      expect(prod.current_stock).toBe(0);

      const movement = await recordStockMovement(companyA, {
        productId: prod.id,
        type: "Stock In",
        quantity: 20,
        reason: "Initial warehouse stocking batch",
        reference: "INB-REC-001",
      }, adminUser);

      expect(movement.movement_number).toMatch(/^MOV-\d+$/);
      expect(movement.type).toBe("Stock In");
      expect(movement.previous_stock).toBe(0);
      expect(movement.new_stock).toBe(20);
      expect(movement.actor_name).toBe(adminUser.full_name);

      const refreshed = await getProductById(companyA, prod.id);
      expect(refreshed?.current_stock).toBe(20);
      expect(refreshed?.status).toBe("In Stock");

      const ledger = await getStockMovements(companyA, prod.id);
      expect(ledger.length).toBe(1);
      expect(ledger[0].movement_number).toBe(movement.movement_number);
    });

    it("strictly prevents invalid negative stock on Stock Out operations", async () => {
      const prod = await createProduct(companyA, {
        sku: "CAB-CAT6-1000",
        name: "Cat6 Ethernet Spool 1000ft",
        minimumStock: 2,
      }, adminUser);

      // Stock In 5 spools
      await recordStockMovement(companyA, {
        productId: prod.id,
        type: "Stock In",
        quantity: 5,
        reason: "Factory shipment",
      }, adminUser);

      // Stock Out 3 spools -> succeeds, leaves 2
      await recordStockMovement(companyA, {
        productId: prod.id,
        type: "Stock Out",
        quantity: 3,
        reason: "Dispatched to client deployment",
      }, adminUser);

      const intermediate = await getProductById(companyA, prod.id);
      expect(intermediate?.current_stock).toBe(2);
      expect(intermediate?.status).toBe("Low Stock"); // 2 <= minimumStock (2)

      // Attempt to Stock Out 3 spools when only 2 available -> InsufficientStockError!
      await expect(
        recordStockMovement(companyA, {
          productId: prod.id,
          type: "Stock Out",
          quantity: 3,
          reason: "Excess allocation",
        }, adminUser)
      ).rejects.toThrow(InsufficientStockError);

      // Balance remains untouched at 2
      const verified = await getProductById(companyA, prod.id);
      expect(verified?.current_stock).toBe(2);
    });

    it("supports Physical Count Adjustments and Depot Transfers", async () => {
      const prod = await createProduct(companyA, {
        sku: "UPS-APC-1500",
        name: "APC Smart-UPS 1500VA",
        minimumStock: 3,
      }, adminUser);

      // Add 10 units
      await recordStockMovement(companyA, {
        productId: prod.id,
        type: "Stock In",
        quantity: 10,
        reason: "Dock receiving",
      }, adminUser);

      // Physical audit reveals 8 units actually on shelf
      const adjMovement = await recordStockMovement(companyA, {
        productId: prod.id,
        type: "Adjustment",
        quantity: 8,
        reason: "Annual physical inventory cycle count",
      }, adminUser);

      expect(adjMovement.previous_stock).toBe(10);
      expect(adjMovement.new_stock).toBe(8);

      const refreshed = await getProductById(companyA, prod.id);
      expect(refreshed?.current_stock).toBe(8);
    });
  });

  // ==========================================================================
  // SECTION 3: SUPPLIERS & PURCHASING WORKFLOW & ACCOUNTING
  // ==========================================================================

  describe("Suppliers & Purchasing Workflow", () => {
    it("creates suppliers with payment terms and tracks PO lifecycle", async () => {
      const supplier = await createSupplier(companyA, {
        name: "TechData Global Distribution",
        companyName: "TechData Inc",
        email: "orders@techdata.example.com",
        paymentTerms: "Net 30",
        taxId: "US-EIN-9922881",
      }, adminUser);

      expect(supplier.code).toMatch(/^SUP-\d+$/);
      expect(supplier.name).toBe("TechData Global Distribution");
      expect(supplier.payment_terms).toBe("Net 30");

      const prod = await createProduct(companyA, {
        sku: "ROUTER-EDGE-X",
        name: "Edge Enterprise Router",
        purchasePrice: 800,
        sellingPrice: 1200,
      }, adminUser);

      // Create Purchase Order
      const po = await createPurchaseOrder(companyA, {
        supplierId: supplier.id,
        orderDate: "2026-10-15",
        expectedDeliveryDate: "2026-10-22",
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            productSku: prod.sku,
            quantityOrdered: 5,
            unitPrice: 800,
          },
        ],
      }, adminUser);

      expect(po.po_number).toMatch(/^PO-\d+$/);
      expect(po.status).toBe("Purchase Order");
      expect(po.total_amount).toBe(4000);
      expect(po.paid_amount).toBe(0);
      expect(po.payment_status).toBe("Unpaid");
    });

    it("receiving purchase order updates stock exactly once and posts balanced GL entries", async () => {
      const supplier = await createSupplier(companyA, {
        name: "Arrow Electronics",
      }, adminUser);

      const prod = await createProduct(companyA, {
        sku: "MOD-RAM-32GB",
        name: "DDR5 ECC Server Memory 32GB",
        purchasePrice: 150,
        minimumStock: 5,
      }, adminUser);

      expect(prod.current_stock).toBe(0);

      const po = await createPurchaseOrder(companyA, {
        supplierId: supplier.id,
        orderDate: "2026-10-16",
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            productSku: prod.sku,
            quantityOrdered: 10,
            unitPrice: 150,
          },
        ],
      }, adminUser);

      expect(po.total_amount).toBe(1500);

      // Receive Goods
      const receivedPO = await receivePurchaseOrderGoods(companyA, po.id, {
        grnNumber: "GRN-2026-001",
        supplierInvoiceNumber: "INV-ARROW-9988",
      }, adminUser);

      expect(receivedPO.status).toBe("Goods Received");
      expect(receivedPO.grn_number).toBe("GRN-2026-001");
      expect(receivedPO.supplier_invoice_number).toBe("INV-ARROW-9988");
      expect(receivedPO.journal_entry_id).toBeDefined();

      // Product stock incremented by 10
      const refreshedProd = await getProductById(companyA, prod.id);
      expect(refreshedProd?.current_stock).toBe(10);
      expect(refreshedProd?.status).toBe("In Stock");

      // Verify auditable stock movement was created for the goods receipt
      const movements = await getStockMovements(companyA, prod.id);
      expect(movements.length).toBe(1);
      expect(movements[0].type).toBe("Stock In");
      expect(movements[0].quantity).toBe(10);
      expect(movements[0].reference).toBe("GRN-2026-001");

      // Verify balanced double-entry accounting record was posted:
      // DEBIT 1500 Inventory Asset ($1,500), CREDIT 2000 Accounts Payable ($1,500)
      const postedJE = memoryFinanceStore.journalEntries.find(
        (je) => je.id === receivedPO.journal_entry_id
      );
      expect(postedJE).toBeDefined();
      expect(postedJE?.status).toBe("Posted");
      expect(postedJE?.total_debit).toBe(1500);
      expect(postedJE?.total_credit).toBe(1500);

      const jeLines = memoryFinanceStore.journalEntryLines.filter(
        (l) => l.journal_entry_id === postedJE?.id
      );
      expect(jeLines.length).toBe(2);
      const debitLine = jeLines.find((l) => l.debit === 1500);
      const creditLine = jeLines.find((l) => l.credit === 1500);
      expect(debitLine?.account_code).toBe("1500");
      expect(creditLine?.account_code).toBe("2000");

      // Safeguard: Receiving again is strictly prevented
      await expect(
        receivePurchaseOrderGoods(companyA, po.id, {}, adminUser)
      ).rejects.toThrow(PurchaseOrderTransitionError);

      // Stock remains exactly 10 (not duplicated)
      const reVerifiedProd = await getProductById(companyA, prod.id);
      expect(reVerifiedProd?.current_stock).toBe(10);
    });

    it("processes supplier payments, tracks settlement status, and posts disbursement GL entry", async () => {
      const supplier = await createSupplier(companyA, {
        name: "Avnet Logistics",
      }, adminUser);

      const prod = await createProduct(companyA, {
        sku: "SSD-NVME-2TB",
        name: "Samsung Enterprise NVMe 2TB",
        purchasePrice: 200,
      }, adminUser);

      const po = await createPurchaseOrder(companyA, {
        supplierId: supplier.id,
        orderDate: "2026-10-18",
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            productSku: prod.sku,
            quantityOrdered: 5,
            unitPrice: 200,
          },
        ],
      }, adminUser);

      await receivePurchaseOrderGoods(companyA, po.id, {}, adminUser);

      // Partial payment of $600 against $1,000 total
      const partialPO = await payPurchaseOrder(companyA, po.id, {
        amount: 600,
        paymentMethod: "Bank Transfer",
      }, adminUser);

      expect(partialPO.paid_amount).toBe(600);
      expect(partialPO.payment_status).toBe("Partially Paid");

      // Full payment of remaining $400
      const paidPO = await payPurchaseOrder(companyA, po.id, {
        amount: 400,
        paymentMethod: "Bank Transfer",
      }, adminUser);

      expect(paidPO.paid_amount).toBe(1000);
      expect(paidPO.payment_status).toBe("Paid");
      expect(paidPO.status).toBe("Paid");
      expect(paidPO.payment_journal_entry_id).toBeDefined();

      // Verify payment journal entry in accounting:
      // DEBIT 2000 Accounts Payable ($400), CREDIT 1020 Operating Bank ($400)
      const paymentJE = memoryFinanceStore.journalEntries.find(
        (je) => je.id === paidPO.payment_journal_entry_id
      );
      expect(paymentJE).toBeDefined();
      expect(paymentJE?.total_debit).toBe(400);
      expect(paymentJE?.total_credit).toBe(400);

      // Overpayment is rejected
      await expect(
        payPurchaseOrder(companyA, po.id, {
          amount: 50,
        }, adminUser)
      ).rejects.toThrow(/exceeds remaining balance/);
    });
  });
});
