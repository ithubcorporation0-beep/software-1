import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";
import { memoryFinanceStore, getNextFinanceNumber } from "@/lib/finance/server";
import { roundMoney } from "@/lib/sales/server";
import type {
  Warehouse,
  InventorySupplier,
  Product,
  ProductStatus,
  StockMovement,
  StockMovementType,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  PurchasePaymentStatus,
  JournalEntry,
  JournalEntryLine,
  Account,
  Profile,
} from "@/types/database.types";

// ============================================================================
// CUSTOM INVENTORY & PURCHASING ERRORS
// ============================================================================

export class ProductNotFoundError extends Error {
  constructor(message: string = "Product not found") {
    super(message);
    this.name = "ProductNotFoundError";
  }
}

export class InsufficientStockError extends Error {
  constructor(message: string = "Insufficient stock: Cannot reduce stock below zero.") {
    super(message);
    this.name = "InsufficientStockError";
  }
}

export class DuplicateSKUError extends Error {
  constructor(message: string = "Duplicate SKU: A product with this SKU already exists in this company.") {
    super(message);
    this.name = "DuplicateSKUError";
  }
}

export class PurchaseOrderTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseOrderTransitionError";
  }
}

// ============================================================================
// RESILIENT IN-MEMORY STORE (FOR TESTING & RPC FALLBACK)
// ============================================================================

interface MemoryInventoryStore {
  warehouses: Warehouse[];
  suppliers: InventorySupplier[];
  products: Product[];
  movements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  purchaseOrderItems: PurchaseOrderItem[];
  sequences: Record<string, number>;
}

export const memoryInventoryStore: MemoryInventoryStore = {
  warehouses: [],
  suppliers: [],
  products: [],
  movements: [],
  purchaseOrders: [],
  purchaseOrderItems: [],
  sequences: {},
};

export function resetMemoryInventoryStore(): void {
  memoryInventoryStore.warehouses = [];
  memoryInventoryStore.suppliers = [];
  memoryInventoryStore.products = [];
  memoryInventoryStore.movements = [];
  memoryInventoryStore.purchaseOrders = [];
  memoryInventoryStore.purchaseOrderItems = [];
  memoryInventoryStore.sequences = {};
}

export function getNextInventorySequence(companyId: string, prefix: string): string {
  const key = `${companyId}:${prefix}`;
  if (!memoryInventoryStore.sequences[key]) {
    memoryInventoryStore.sequences[key] = 1000;
  }
  memoryInventoryStore.sequences[key] += 1;
  return `${prefix}-${memoryInventoryStore.sequences[key]}`;
}

export async function initializeCompanyInventory(companyId: string): Promise<void> {
  // Ensure at least one default central warehouse
  const existingWh = memoryInventoryStore.warehouses.filter((w) => w.company_id === companyId);
  if (existingWh.length === 0) {
    const now = new Date().toISOString();
    memoryInventoryStore.warehouses.push({
      id: `wh-${companyId}-central`,
      company_id: companyId,
      code: "WH-MAIN",
      name: "Central Logistics Warehouse",
      city: "Corporate Hub",
      capacity: 50000,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
  }
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const createWarehouseSchema = z.object({
  code: z.string().trim().min(2).max(20).toUpperCase(),
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().max(100).optional().nullable(),
  capacity: z.coerce.number().min(1).default(10000),
});

export const createSupplierSchema = z.object({
  name: z.string().trim().min(2).max(100),
  companyName: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  taxId: z.string().trim().max(50).optional().nullable(),
  paymentTerms: z.string().trim().max(50).default("Net 30"),
});

export const createProductSchema = z.object({
  sku: z.string().trim().min(2, "SKU must be at least 2 characters").max(50).toUpperCase(),
  name: z.string().trim().min(2, "Product name must be at least 2 characters").max(150),
  category: z.string().trim().min(1).default("General"),
  brand: z.string().trim().max(100).optional().nullable(),
  unit: z.string().trim().default("Units"),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  minimumStock: z.coerce.number().min(0).default(10),
  supplierId: z.string().optional().nullable(),
  warehouseId: z.string().optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export const stockMovementSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  type: z.enum(["Stock In", "Stock Out", "Adjustment", "Transfer"]),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(500),
  reference: z.string().trim().max(100).optional().nullable(),
  destinationWarehouseId: z.string().optional().nullable(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Order date must be YYYY-MM-DD"),
  expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().optional().nullable(),
      productName: z.string().trim().min(1),
      productSku: z.string().trim().min(1).toUpperCase(),
      quantityOrdered: z.coerce.number().int().min(1),
      unitPrice: z.coerce.number().min(0),
    })
  ).min(1, "At least one item is required"),
});

export const receivePurchaseOrderSchema = z.object({
  grnNumber: z.string().trim().optional(),
  supplierInvoiceNumber: z.string().trim().optional(),
});

export const payPurchaseOrderSchema = z.object({
  amount: z.coerce.number().min(0.01, "Payment amount must be greater than zero"),
  paymentMethod: z.string().default("Bank Transfer"),
  notes: z.string().optional(),
});

// ============================================================================
// WAREHOUSE OPERATIONS
// ============================================================================

export async function getWarehouses(companyId: string): Promise<Warehouse[]> {
  await requirePermission(companyId, "inventory.read");
  await initializeCompanyInventory(companyId);
  return memoryInventoryStore.warehouses.filter((w) => w.company_id === companyId);
}

export async function createWarehouse(
  companyId: string,
  input: z.input<typeof createWarehouseSchema>,
  creatorUser?: Profile
): Promise<Warehouse> {
  await requirePermission(companyId, "inventory.write", creatorUser);
  const user = creatorUser || (await requireUser());
  const validated = createWarehouseSchema.parse(input);

  const id = `wh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newWarehouse: Warehouse = {
    id,
    company_id: companyId,
    code: validated.code,
    name: validated.name,
    city: validated.city || null,
    capacity: validated.capacity,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  memoryInventoryStore.warehouses.push(newWarehouse);
  return newWarehouse;
}

// ============================================================================
// SUPPLIER OPERATIONS
// ============================================================================

export async function getSuppliers(
  companyId: string,
  filters?: { search?: string }
): Promise<InventorySupplier[]> {
  await requirePermission(companyId, "inventory.read");

  let list = memoryInventoryStore.suppliers.filter((s) => s.company_id === companyId);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.company_name && s.company_name.toLowerCase().includes(q))
    );
  }

  return list;
}

export async function createSupplier(
  companyId: string,
  input: z.input<typeof createSupplierSchema>,
  creatorUser?: Profile
): Promise<InventorySupplier> {
  await requirePermission(companyId, "inventory.write", creatorUser);
  const user = creatorUser || (await requireUser());
  const validated = createSupplierSchema.parse(input);

  const code = getNextInventorySequence(companyId, "SUP");
  const id = `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newSupplier: InventorySupplier = {
    id,
    company_id: companyId,
    code,
    name: validated.name,
    company_name: validated.companyName || null,
    phone: validated.phone || null,
    email: validated.email || null,
    address: validated.address || null,
    tax_id: validated.taxId || null,
    payment_terms: validated.paymentTerms || "Net 30",
    status: "Active",
    created_at: now,
    updated_at: now,
  };

  memoryInventoryStore.suppliers.unshift(newSupplier);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "SUPPLIER_CREATED",
    resource: "inventory_suppliers",
    resourceId: id,
    details: { code, name: validated.name },
  });

  return newSupplier;
}

// ============================================================================
// PRODUCT & MASTER CATALOG OPERATIONS
// ============================================================================

export async function getProducts(
  companyId: string,
  filters?: {
    search?: string;
    category?: string;
    status?: ProductStatus;
  }
): Promise<Product[]> {
  await requirePermission(companyId, "inventory.read");
  await initializeCompanyInventory(companyId);

  let list = memoryInventoryStore.products.filter((p) => p.company_id === companyId);
  if (filters?.category) {
    list = list.filter((p) => p.category === filters.category);
  }
  if (filters?.status) {
    list = list.filter((p) => p.status === filters.status);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q))
    );
  }

  return list;
}

export async function getProductById(
  companyId: string,
  productId: string
): Promise<Product | null> {
  await requirePermission(companyId, "inventory.read");
  const product = memoryInventoryStore.products.find(
    (p) => p.company_id === companyId && (p.id === productId || p.sku === productId)
  );
  return product || null;
}

export async function createProduct(
  companyId: string,
  input: z.input<typeof createProductSchema>,
  creatorUser?: Profile
): Promise<Product> {
  await requirePermission(companyId, "inventory.write", creatorUser);
  const user = creatorUser || (await requireUser());
  const validated = createProductSchema.parse(input);

  await initializeCompanyInventory(companyId);

  // SKU Uniqueness check per tenant
  const existing = memoryInventoryStore.products.find(
    (p) => p.company_id === companyId && p.sku.toUpperCase() === validated.sku.toUpperCase()
  );
  if (existing) {
    throw new DuplicateSKUError(
      `Product SKU [${validated.sku}] is already registered in this company.`
    );
  }

  let supplierName: string | null = null;
  if (validated.supplierId) {
    const sup = memoryInventoryStore.suppliers.find(
      (s) => s.company_id === companyId && s.id === validated.supplierId
    );
    if (sup) supplierName = sup.name;
  }

  let warehouseName: string | null = null;
  const whId = validated.warehouseId || memoryInventoryStore.warehouses[0]?.id;
  const wh = memoryInventoryStore.warehouses.find(
    (w) => w.company_id === companyId && w.id === whId
  );
  if (wh) warehouseName = wh.name;

  const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Initial stock is strictly 0 until initialized via an auditable movement
  const newProduct: Product = {
    id,
    company_id: companyId,
    sku: validated.sku.toUpperCase(),
    name: validated.name,
    category: validated.category,
    brand: validated.brand || null,
    unit: validated.unit,
    purchase_price: roundMoney(validated.purchasePrice),
    selling_price: roundMoney(validated.sellingPrice),
    current_stock: 0,
    minimum_stock: validated.minimumStock,
    supplier_id: validated.supplierId || null,
    supplier_name: supplierName,
    warehouse_id: whId || null,
    warehouse_name: warehouseName,
    status: "Out of Stock",
    created_at: now,
    updated_at: now,
  };

  memoryInventoryStore.products.unshift(newProduct);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PRODUCT_CREATED",
    resource: "inventory_products",
    resourceId: id,
    details: {
      sku: newProduct.sku,
      name: newProduct.name,
      purchasePrice: newProduct.purchase_price,
      sellingPrice: newProduct.selling_price,
    },
  });

  return newProduct;
}

export async function updateProduct(
  companyId: string,
  productId: string,
  input: z.input<typeof updateProductSchema>,
  editorUser?: Profile
): Promise<Product> {
  await requirePermission(companyId, "inventory.write", editorUser);
  const user = editorUser || (await requireUser());
  const validated = updateProductSchema.parse(input);

  const idx = memoryInventoryStore.products.findIndex(
    (p) => p.company_id === companyId && p.id === productId
  );
  if (idx === -1) {
    throw new ProductNotFoundError(`Product [${productId}] not found.`);
  }

  const existing = memoryInventoryStore.products[idx];

  // If changing SKU, verify uniqueness
  if (validated.sku && validated.sku.toUpperCase() !== existing.sku) {
    const dup = memoryInventoryStore.products.find(
      (p) => p.company_id === companyId && p.sku.toUpperCase() === validated.sku!.toUpperCase()
    );
    if (dup) {
      throw new DuplicateSKUError(`SKU [${validated.sku}] already in use.`);
    }
  }

  const now = new Date().toISOString();
  const updated: Product = {
    ...existing,
    sku: validated.sku ? validated.sku.toUpperCase() : existing.sku,
    name: validated.name || existing.name,
    category: validated.category || existing.category,
    brand: validated.brand !== undefined ? validated.brand : existing.brand,
    unit: validated.unit || existing.unit,
    purchase_price: validated.purchasePrice !== undefined ? roundMoney(validated.purchasePrice) : existing.purchase_price,
    selling_price: validated.sellingPrice !== undefined ? roundMoney(validated.sellingPrice) : existing.selling_price,
    minimum_stock: validated.minimumStock !== undefined ? validated.minimumStock : existing.minimum_stock,
    supplier_id: validated.supplierId !== undefined ? validated.supplierId : existing.supplier_id,
    warehouse_id: validated.warehouseId !== undefined ? validated.warehouseId : existing.warehouse_id,
    updated_at: now,
  };

  memoryInventoryStore.products[idx] = updated;

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PRODUCT_UPDATED",
    resource: "inventory_products",
    resourceId: productId,
    details: { changes: validated },
  });

  return updated;
}

// ============================================================================
// AUDITABLE STOCK MOVEMENTS (NO DIRECT UNTRACEABLE EDITING)
// ============================================================================

export async function getStockMovements(
  companyId: string,
  productId?: string
): Promise<StockMovement[]> {
  await requirePermission(companyId, "inventory.read");

  let list = memoryInventoryStore.movements.filter((m) => m.company_id === companyId);
  if (productId) {
    list = list.filter((m) => m.product_id === productId);
  }

  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Records an auditable stock movement and atomically updates product balance.
 * Strictly prevents invalid negative stock balances.
 */
export async function recordStockMovement(
  companyId: string,
  input: z.input<typeof stockMovementSchema>,
  actorUser?: Profile
): Promise<StockMovement> {
  await requirePermission(companyId, "inventory.write", actorUser);
  const user = actorUser || (await requireUser());
  const validated = stockMovementSchema.parse(input);

  const pIdx = memoryInventoryStore.products.findIndex(
    (p) => p.company_id === companyId && p.id === validated.productId
  );
  if (pIdx === -1) {
    throw new ProductNotFoundError(`Product [${validated.productId}] not found.`);
  }

  const product = memoryInventoryStore.products[pIdx];
  const prevStock = product.current_stock;
  let newStock = prevStock;

  switch (validated.type) {
    case "Stock In":
      newStock = prevStock + validated.quantity;
      break;

    case "Stock Out":
      if (prevStock < validated.quantity) {
        throw new InsufficientStockError(
          `Insufficient stock for [${product.name}]: available is ${prevStock}, requested out is ${validated.quantity}. Negative stock is prevented.`
        );
      }
      newStock = prevStock - validated.quantity;
      break;

    case "Adjustment":
      // Direct physical inventory count reconciliation
      newStock = validated.quantity;
      break;

    case "Transfer":
      if (prevStock < validated.quantity) {
        throw new InsufficientStockError(
          `Cannot transfer ${validated.quantity} units of [${product.name}]: only ${prevStock} available in source warehouse.`
        );
      }
      // Source is decremented
      newStock = prevStock - validated.quantity;
      break;
  }

  // Derive status
  let newStatus: ProductStatus = "In Stock";
  if (newStock === 0) {
    newStatus = "Out of Stock";
  } else if (newStock <= product.minimum_stock) {
    newStatus = "Low Stock";
  }

  const now = new Date().toISOString();
  const movNumber = getNextInventorySequence(companyId, "MOV");
  const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const movement: StockMovement = {
    id: movementId,
    company_id: companyId,
    movement_number: movNumber,
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku,
    type: validated.type,
    quantity: validated.quantity,
    previous_stock: prevStock,
    new_stock: newStock,
    source_warehouse_id: product.warehouse_id || null,
    destination_warehouse_id: validated.destinationWarehouseId || null,
    reason: validated.reason,
    reference: validated.reference || null,
    actor_id: user.id,
    actor_name: user.full_name,
    created_at: now,
  };

  // Atomically update product record in ledger
  memoryInventoryStore.products[pIdx] = {
    ...product,
    current_stock: newStock,
    status: newStatus,
    updated_at: now,
  };

  memoryInventoryStore.movements.unshift(movement);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "STOCK_MOVEMENT_RECORDED",
    resource: "inventory_stock_movements",
    resourceId: movementId,
    details: {
      movementNumber: movNumber,
      sku: product.sku,
      type: validated.type,
      quantity: validated.quantity,
      previousStock: prevStock,
      newStock,
      reason: validated.reason,
    },
  });

  return movement;
}

// ============================================================================
// PURCHASING WORKFLOW PIPELINE & ACCOUNTING INTEGRATION
// ============================================================================

export async function getPurchaseOrders(
  companyId: string,
  filters?: {
    status?: PurchaseOrderStatus;
    supplierId?: string;
  }
): Promise<PurchaseOrder[]> {
  await requirePermission(companyId, "purchases.read");

  let list = memoryInventoryStore.purchaseOrders.filter((po) => po.company_id === companyId);
  if (filters?.status) {
    list = list.filter((po) => po.status === filters.status);
  }
  if (filters?.supplierId) {
    list = list.filter((po) => po.supplier_id === filters.supplierId);
  }

  return list.map((po) => ({
    ...po,
    items: memoryInventoryStore.purchaseOrderItems.filter((i) => i.purchase_order_id === po.id),
  }));
}

export async function getPurchaseOrderById(
  companyId: string,
  poId: string
): Promise<PurchaseOrder | null> {
  await requirePermission(companyId, "purchases.read");

  const po = memoryInventoryStore.purchaseOrders.find(
    (p) => p.company_id === companyId && (p.id === poId || p.po_number === poId)
  );
  if (!po) return null;

  return {
    ...po,
    items: memoryInventoryStore.purchaseOrderItems.filter((i) => i.purchase_order_id === po.id),
  };
}

export async function createPurchaseOrder(
  companyId: string,
  input: z.input<typeof createPurchaseOrderSchema>,
  creatorUser?: Profile
): Promise<PurchaseOrder> {
  await requirePermission(companyId, "purchases.write", creatorUser);
  const user = creatorUser || (await requireUser());
  const validated = createPurchaseOrderSchema.parse(input);

  const supplier = memoryInventoryStore.suppliers.find(
    (s) => s.company_id === companyId && s.id === validated.supplierId
  );
  if (!supplier) {
    throw new Error(`Supplier [${validated.supplierId}] not found.`);
  }

  const poNumber = getNextInventorySequence(companyId, "PO");
  const poId = `po-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  let totalAmount = 0;
  const items: PurchaseOrderItem[] = [];

  for (const item of validated.items) {
    const subtotal = roundMoney(item.quantityOrdered * item.unitPrice);
    totalAmount += subtotal;

    items.push({
      id: `poi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      purchase_order_id: poId,
      company_id: companyId,
      product_id: item.productId || null,
      product_name: item.productName,
      product_sku: item.productSku.toUpperCase(),
      quantity_ordered: item.quantityOrdered,
      quantity_received: 0,
      unit_price: roundMoney(item.unitPrice),
      subtotal,
      created_at: now,
    });
  }

  const newPO: PurchaseOrder = {
    id: poId,
    company_id: companyId,
    po_number: poNumber,
    supplier_id: supplier.id,
    supplier_name: supplier.name,
    order_date: validated.orderDate,
    expected_delivery_date: validated.expectedDeliveryDate || null,
    status: "Purchase Order",
    total_amount: roundMoney(totalAmount),
    paid_amount: 0,
    payment_status: "Unpaid",
    received_at: null,
    received_by: null,
    grn_number: null,
    supplier_invoice_number: null,
    journal_entry_id: null,
    payment_journal_entry_id: null,
    notes: validated.notes || null,
    items,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  memoryInventoryStore.purchaseOrders.unshift(newPO);
  memoryInventoryStore.purchaseOrderItems.push(...items);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PURCHASE_ORDER_CREATED",
    resource: "purchase_orders",
    resourceId: poId,
    details: {
      poNumber,
      supplier: supplier.name,
      totalAmount: newPO.total_amount,
      itemCount: items.length,
    },
  });

  return newPO;
}

/**
 * Receives goods for a purchase order.
 * Updates stock exactly once via auditable Stock In movements.
 * Posts balanced double entry to accounting: DEBIT Inventory (1500), CREDIT Accounts Payable (2000).
 */
export async function receivePurchaseOrderGoods(
  companyId: string,
  poId: string,
  input: z.input<typeof receivePurchaseOrderSchema>,
  receiverUser?: Profile
): Promise<PurchaseOrder> {
  await requirePermission(companyId, "purchases.write", receiverUser);
  const user = receiverUser || (await requireUser());
  const validated = receivePurchaseOrderSchema.parse(input);

  const poIdx = memoryInventoryStore.purchaseOrders.findIndex(
    (p) => p.company_id === companyId && p.id === poId
  );
  if (poIdx === -1) {
    throw new Error(`Purchase order [${poId}] not found.`);
  }

  const po = memoryInventoryStore.purchaseOrders[poIdx];

  // Safeguard: Prevent duplicate receiving
  if (
    po.status === "Goods Received" ||
    po.status === "Invoiced" ||
    po.status === "Paid"
  ) {
    throw new PurchaseOrderTransitionError(
      `Purchase order ${po.po_number} has already been received on ${po.received_at}. Duplicate receiving is prevented.`
    );
  }

  const now = new Date().toISOString();
  const grnNumber = validated.grnNumber || getNextInventorySequence(companyId, "GRN");
  const poItems = memoryInventoryStore.purchaseOrderItems.filter(
    (i) => i.purchase_order_id === po.id
  );

  // Automatically update stock via auditable movements
  for (const item of poItems) {
    item.quantity_received = item.quantity_ordered;

    // Find product or match by SKU
    let product = memoryInventoryStore.products.find(
      (p) => p.company_id === companyId && (p.id === item.product_id || p.sku === item.product_sku)
    );

    if (product) {
      await recordStockMovement(
        companyId,
        {
          productId: product.id,
          type: "Stock In",
          quantity: item.quantity_ordered,
          reason: `Goods Receipt for PO ${po.po_number} (${grnNumber})`,
          reference: grnNumber,
        },
        user
      );
    }
  }

  // Double-entry accounting entry:
  // DEBIT: 1500 Equipment & Hardware / Inventory Asset (totalAmount)
  // CREDIT: 2000 Accounts Payable (totalAmount)
  let journalEntryId: string | null = null;
  const jeNumber = getNextFinanceNumber(companyId, "JE-");
  journalEntryId = `je-${Date.now()}-po-${po.po_number.toLowerCase()}`;

  let assetAccount = memoryFinanceStore.accounts.find(
    (a) => a.company_id === companyId && a.code === "1500"
  );
  if (!assetAccount) {
    assetAccount = {
      id: `acc-${companyId}-1500`,
      company_id: companyId,
      code: "1500",
      name: "Inventory & Hardware Asset",
      account_type: "Asset",
      description: "Inventory materials, equipment, and assets",
      is_system: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    memoryFinanceStore.accounts.push(assetAccount);
  }

  let apAccount = memoryFinanceStore.accounts.find(
    (a) => a.company_id === companyId && a.code === "2000"
  );
  if (!apAccount) {
    apAccount = {
      id: `acc-${companyId}-2000`,
      company_id: companyId,
      code: "2000",
      name: "Accounts Payable",
      account_type: "Liability",
      description: "Vendor bills and obligations due",
      is_system: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    memoryFinanceStore.accounts.push(apAccount);
  }

  const lines: JournalEntryLine[] = [
    {
      id: `jel-${Date.now()}-1`,
      journal_entry_id: journalEntryId,
      company_id: companyId,
      account_id: assetAccount.id,
      account_code: assetAccount.code,
      account_name: assetAccount.name,
      description: `Goods Received ${grnNumber} for PO ${po.po_number} (${po.supplier_name})`,
      debit: po.total_amount,
      credit: 0,
      sort_order: 1,
      created_at: now,
    },
    {
      id: `jel-${Date.now()}-2`,
      journal_entry_id: journalEntryId,
      company_id: companyId,
      account_id: apAccount.id,
      account_code: apAccount.code,
      account_name: apAccount.name,
      description: `Accounts Payable Liability for PO ${po.po_number}`,
      debit: 0,
      credit: po.total_amount,
      sort_order: 2,
      created_at: now,
    },
  ];

  const journalEntry: JournalEntry = {
    id: journalEntryId,
    company_id: companyId,
    entry_number: jeNumber,
    entry_date: now.split("T")[0],
    description: `Goods Receipt ${grnNumber} for Purchase Order ${po.po_number}`,
    reference: po.po_number,
    status: "Posted",
    source_type: "invoice",
    source_id: po.id,
    reversal_of_id: null,
    total_debit: po.total_amount,
    total_credit: po.total_amount,
    posted_at: now,
    posted_by: user.id,
    lines,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  memoryFinanceStore.journalEntries.unshift(journalEntry);
  memoryFinanceStore.journalEntryLines.push(...lines);

  const updatedPO: PurchaseOrder = {
    ...po,
    status: "Goods Received",
    received_at: now,
    received_by: user.id,
    grn_number: grnNumber,
    supplier_invoice_number: validated.supplierInvoiceNumber || null,
    journal_entry_id: journalEntryId,
    updated_at: now,
    items: poItems,
  };

  memoryInventoryStore.purchaseOrders[poIdx] = updatedPO;

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PURCHASE_ORDER_RECEIVED",
    resource: "purchase_orders",
    resourceId: po.id,
    details: {
      poNumber: po.po_number,
      grnNumber,
      totalAmount: po.total_amount,
      journalEntryId,
    },
  });

  return updatedPO;
}

/**
 * Records supplier invoice payment against a received purchase order.
 * Posts double entry to accounting: DEBIT Accounts Payable (2000), CREDIT Operating Bank (1020).
 */
export async function payPurchaseOrder(
  companyId: string,
  poId: string,
  input: z.input<typeof payPurchaseOrderSchema>,
  payerUser?: Profile
): Promise<PurchaseOrder> {
  await requirePermission(companyId, "purchases.write", payerUser);
  const user = payerUser || (await requireUser());
  const validated = payPurchaseOrderSchema.parse(input);

  const poIdx = memoryInventoryStore.purchaseOrders.findIndex(
    (p) => p.company_id === companyId && p.id === poId
  );
  if (poIdx === -1) {
    throw new Error(`Purchase order [${poId}] not found.`);
  }

  const po = memoryInventoryStore.purchaseOrders[poIdx];
  const remainingDue = roundMoney(po.total_amount - po.paid_amount);

  if (validated.amount > remainingDue) {
    throw new Error(
      `Payment amount ($${validated.amount}) exceeds remaining balance ($${remainingDue}) for PO ${po.po_number}.`
    );
  }

  const newPaidAmount = roundMoney(po.paid_amount + validated.amount);
  const newPaymentStatus: PurchasePaymentStatus =
    newPaidAmount >= po.total_amount ? "Paid" : "Partially Paid";
  const newStatus: PurchaseOrderStatus =
    newPaymentStatus === "Paid" ? "Paid" : po.status;

  const now = new Date().toISOString();
  const jeNumber = getNextFinanceNumber(companyId, "JE-");
  const pmtJeId = `je-${Date.now()}-popmt-${po.po_number.toLowerCase()}`;

  // Double entry:
  // DEBIT: 2000 Accounts Payable (validated.amount)
  // CREDIT: 1020 Operating Bank Account (validated.amount)
  let apAccount = memoryFinanceStore.accounts.find(
    (a) => a.company_id === companyId && a.code === "2000"
  );
  let bankAccount = memoryFinanceStore.accounts.find(
    (a) => a.company_id === companyId && a.code === "1020"
  );

  const lines: JournalEntryLine[] = [
    {
      id: `jel-${Date.now()}-pmt-1`,
      journal_entry_id: pmtJeId,
      company_id: companyId,
      account_id: apAccount?.id || "acc-2000",
      account_code: "2000",
      account_name: "Accounts Payable",
      description: `Payment for Supplier Invoice on PO ${po.po_number}`,
      debit: validated.amount,
      credit: 0,
      sort_order: 1,
      created_at: now,
    },
    {
      id: `jel-${Date.now()}-pmt-2`,
      journal_entry_id: pmtJeId,
      company_id: companyId,
      account_id: bankAccount?.id || "acc-1020",
      account_code: "1020",
      account_name: "Operating Bank Account",
      description: `Disbursement via ${validated.paymentMethod} for PO ${po.po_number}`,
      debit: 0,
      credit: validated.amount,
      sort_order: 2,
      created_at: now,
    },
  ];

  const journalEntry: JournalEntry = {
    id: pmtJeId,
    company_id: companyId,
    entry_number: jeNumber,
    entry_date: now.split("T")[0],
    description: `Supplier Payment for PO ${po.po_number} (${po.supplier_name})`,
    reference: po.po_number,
    status: "Posted",
    source_type: "payment",
    source_id: po.id,
    reversal_of_id: null,
    total_debit: validated.amount,
    total_credit: validated.amount,
    posted_at: now,
    posted_by: user.id,
    lines,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  memoryFinanceStore.journalEntries.unshift(journalEntry);
  memoryFinanceStore.journalEntryLines.push(...lines);

  const updatedPO: PurchaseOrder = {
    ...po,
    paid_amount: newPaidAmount,
    payment_status: newPaymentStatus,
    status: newStatus,
    payment_journal_entry_id: pmtJeId,
    updated_at: now,
  };

  memoryInventoryStore.purchaseOrders[poIdx] = updatedPO;

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PURCHASE_ORDER_PAID",
    resource: "purchase_orders",
    resourceId: po.id,
    details: {
      poNumber: po.po_number,
      amount: validated.amount,
      paymentStatus: newPaymentStatus,
      paymentJournalEntryId: pmtJeId,
    },
  });

  return updatedPO;
}
