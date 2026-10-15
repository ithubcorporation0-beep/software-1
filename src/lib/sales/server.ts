import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";
import { getCompanySettings } from "@/lib/company/server";
import { getCustomerById } from "@/lib/crm/server";
import { revalidateCompanyTag } from "@/lib/cache/tagged-cache";
import { updateCompanySummaryIncremental } from "@/lib/summaries/company-summaries";
import type {
  Quotation,
  QuotationItem,
  QuotationStatus,
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Customer,
  Profile,
} from "@/types/database.types";

// ============================================================================
// EXACT DECIMAL-SAFE MONEY ARITHMETIC & ROUNDING
// ============================================================================

/**
 * Rounds money amounts to 2 decimal places using half-up arithmetic.
 * Protects against floating-point precision artifacts (e.g., 0.1 + 0.2 !== 0.3).
 */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates line-level financials with decimal-safe precision.
 */
export function calculateLineItem(item: {
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxPct?: number;
}) {
  const qty = Math.max(0, item.quantity);
  const price = Math.max(0, item.unitPrice);
  const discPct = Math.min(100, Math.max(0, item.discountPct || 0));
  const taxPct = Math.min(100, Math.max(0, item.taxPct || 0));

  const rawSubtotal = roundMoney(qty * price);
  const discountAmount = roundMoney(rawSubtotal * (discPct / 100));
  const taxableAmount = Math.max(0, roundMoney(rawSubtotal - discountAmount));
  const taxAmount = roundMoney(taxableAmount * (taxPct / 100));
  const lineTotal = roundMoney(taxableAmount + taxAmount);

  return {
    rawSubtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotal,
  };
}

/**
 * Calculates whole-document totals with explicit subtotal, discount, tax, and grand total.
 */
export function calculateDocumentTotals(
  items: Array<{
    quantity: number;
    unitPrice: number;
    discountPct?: number;
    taxPct?: number;
  }>,
  headerDiscount?: {
    type: "percentage" | "fixed";
    value: number;
  },
  headerTaxRate?: number
) {
  let subtotal = 0;
  let itemsDiscount = 0;
  let itemsTax = 0;

  for (const it of items) {
    const calc = calculateLineItem(it);
    subtotal = roundMoney(subtotal + calc.rawSubtotal);
    itemsDiscount = roundMoney(itemsDiscount + calc.discountAmount);
    itemsTax = roundMoney(itemsTax + calc.taxAmount);
  }

  let headerDiscountTotal = 0;
  if (headerDiscount && headerDiscount.value > 0) {
    if (headerDiscount.type === "percentage") {
      headerDiscountTotal = roundMoney(
        Math.max(0, subtotal - itemsDiscount) * (headerDiscount.value / 100)
      );
    } else {
      headerDiscountTotal = roundMoney(headerDiscount.value);
    }
  }
  const discountTotal = roundMoney(itemsDiscount + headerDiscountTotal);

  let taxTotal = itemsTax;
  if (headerTaxRate && headerTaxRate > 0) {
    const taxableBase = Math.max(0, subtotal - discountTotal);
    taxTotal = roundMoney(taxableBase * (headerTaxRate / 100));
  }

  const grandTotal = Math.max(0, roundMoney(subtotal - discountTotal + taxTotal));

  return {
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal,
  };
}

// ============================================================================
// CONCURRENCY-SAFE SEQUENTIAL NUMBERING
// ============================================================================

export async function getNextDocumentNumber(
  companyId: string,
  docType: "quotation" | "sales_order" | "invoice" | "payment",
  overridePrefix?: string,
  overrideStart?: number
): Promise<string> {
  let prefix = overridePrefix;
  let startingNumber = overrideStart || 1;

  if (!prefix) {
    try {
      const settings = await getCompanySettings(companyId);
      if (docType === "invoice") {
        prefix = settings.invoicePrefix || "INV-";
        startingNumber = settings.startingInvoiceNumber || 1001;
      } else if (docType === "sales_order") {
        prefix = "SO-";
      } else if (docType === "quotation") {
        prefix = "QT-";
      } else {
        prefix = "PAY-";
      }
    } catch {
      prefix = docType === "invoice" ? "INV-" : docType === "sales_order" ? "SO-" : docType === "quotation" ? "QT-" : "PAY-";
    }
  }

  const supabase = await createClient();
  try {
    const { data, error } = await supabase.rpc("get_next_document_sequence", {
      p_company_id: companyId,
      p_doc_type: docType,
      p_prefix: prefix,
      p_start: startingNumber,
    });
    if (!error && data) {
      return data as string;
    }
  } catch {
    // Fall back to memory sequence
  }

  // Resilient atomic in-memory sequence increment
  const seqKey = overridePrefix ? `${companyId}:${docType}:${overridePrefix}` : `${companyId}:${docType}`;
  if (!memorySalesStore.sequences[seqKey]) {
    memorySalesStore.sequences[seqKey] = {
      prefix,
      currentNumber: startingNumber - 1,
    };
  }
  memorySalesStore.sequences[seqKey].currentNumber += 1;
  const num = memorySalesStore.sequences[seqKey].currentNumber;
  return `${prefix}${String(num).padStart(5, "0")}`;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const lineItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().trim().optional().nullable(),
  description: z.string().trim().min(1, "Item description is required").max(500),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxPct: z.coerce.number().min(0).max(100).default(0),
});

export const quotationSchema = z.object({
  customerId: z.string().trim().min(1, "Customer selection is required"),
  leadId: z.string().trim().optional().nullable(),
  issueDate: z.string().min(1, "Issue date is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  status: z.enum(["Draft", "Sent", "Accepted", "Declined", "Converted", "Expired"]).default("Draft"),
  discountType: z.enum(["percentage", "fixed"]).default("percentage"),
  discountValue: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).default(0),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(2000).optional().nullable(),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

export const salesOrderSchema = z.object({
  customerId: z.string().trim().min(1, "Customer selection is required"),
  quotationId: z.string().trim().optional().nullable(),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDeliveryDate: z.string().optional().nullable(),
  status: z.enum(["Draft", "Confirmed", "In Production", "Shipped", "Delivered", "Invoiced", "Cancelled"]).default("Draft"),
  discountType: z.enum(["percentage", "fixed"]).default("percentage"),
  discountValue: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).default(0),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(2000).optional().nullable(),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

export const invoiceSchema = z.object({
  customerId: z.string().trim().min(1, "Customer selection is required"),
  salesOrderId: z.string().trim().optional().nullable(),
  quotationId: z.string().trim().optional().nullable(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"]).default("Draft"),
  discountType: z.enum(["percentage", "fixed"]).default("percentage"),
  discountValue: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).default(0),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(2000).optional().nullable(),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

export const paymentSchema = z.object({
  invoiceId: z.string().trim().min(1, "Invoice ID is required"),
  amount: z.coerce.number().positive("Payment amount must be greater than zero"),
  paymentMethod: z.enum(["Cash", "Bank Transfer", "Card", "Online Payment", "Other"]),
  transactionReference: z.string().trim().max(100).optional().nullable(),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().max(1000).optional().nullable(),
});

export const voidPaymentSchema = z.object({
  reason: z.string().trim().min(3, "A valid reason for voiding this payment is required").max(500),
});

// ============================================================================
// RESILIENT IN-MEMORY TENANT STATE STORE
// ============================================================================

interface MemorySalesStore {
  quotations: Quotation[];
  quotationItems: QuotationItem[];
  salesOrders: SalesOrder[];
  salesOrderItems: SalesOrderItem[];
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  payments: Payment[];
  sequences: Record<string, { prefix: string; currentNumber: number }>;
}

const memorySalesStore: MemorySalesStore = {
  quotations: [],
  quotationItems: [],
  salesOrders: [],
  salesOrderItems: [],
  invoices: [],
  invoiceItems: [],
  payments: [],
  sequences: {},
};

export function resetMemorySalesStore(): void {
  memorySalesStore.quotations = [];
  memorySalesStore.quotationItems = [];
  memorySalesStore.salesOrders = [];
  memorySalesStore.salesOrderItems = [];
  memorySalesStore.invoices = [];
  memorySalesStore.invoiceItems = [];
  memorySalesStore.payments = [];
  memorySalesStore.sequences = {};
}

// ============================================================================
// QUOTATIONS SERVICE
// ============================================================================

export async function getQuotations(
  companyId: string,
  options?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
    includeDetails?: boolean;
  },
  viewingUser?: Profile
): Promise<Quotation[]> {
  await requirePermission(companyId, "sales:view", viewingUser);
  const supabase = await createClient();

  try {
    const projection = options?.includeDetails
      ? "*, customer:customers(*), items:quotation_items(*)"
      : "*, customer:customers(id, name, email, company_name)";

    let query = supabase
      .from("quotations")
      .select(projection as any)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (options?.status && options.status !== "ALL") {
      query = query.eq("status", options.status);
    }

    const limit = Math.min(options?.limit ?? 50, 50);
    const offset = options?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (!error && data) {
      let list = data as unknown as Quotation[];
      if (options?.search?.trim()) {
        const term = options.search.trim().toLowerCase();
        list = list.filter(
          (q) =>
            q.quotation_number.toLowerCase().includes(term) ||
            q.customer?.name.toLowerCase().includes(term)
        );
      }
      return list;
    }
  } catch {
    // Fall through
  }

  // Memory fallback
  let list = memorySalesStore.quotations
    .filter((q) => q.company_id === companyId)
    .map((q) => ({
      ...q,
      items: memorySalesStore.quotationItems.filter((i) => i.quotation_id === q.id),
    }));

  if (options?.status && options.status !== "ALL") {
    list = list.filter((q) => q.status === options.status);
  }
  if (options?.search?.trim()) {
    const term = options.search.trim().toLowerCase();
    list = list.filter((q) => q.quotation_number.toLowerCase().includes(term));
  }
  const limit = Math.min(options?.limit ?? 50, 50);
  const offset = options?.offset || 0;
  list = list.slice(offset, offset + limit);
  return list;
}

export async function getQuotationById(
  companyId: string,
  quotationId: string,
  viewingUser?: Profile
): Promise<Quotation | null> {
  await requirePermission(companyId, "sales:view", viewingUser);
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("quotations")
      .select("*, customer:customers(*), items:quotation_items(*)")
      .eq("company_id", companyId)
      .eq("id", quotationId)
      .single();

    if (!error && data) {
      return data as Quotation;
    }
  } catch {
    // Fall through
  }

  const q = memorySalesStore.quotations.find(
    (item) => item.company_id === companyId && item.id === quotationId
  );
  if (!q) return null;

  return {
    ...q,
    items: memorySalesStore.quotationItems.filter((i) => i.quotation_id === q.id),
  };
}

export async function createQuotation(
  companyId: string,
  rawData: unknown,
  creatorUser?: Profile
): Promise<{ success: boolean; data?: Quotation; error?: string; errors?: Record<string, string[]> }> {
  const user = creatorUser || (await requireUser());
  await requirePermission(companyId, "sales:create", user);

  const parsed = quotationSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed: please review the highlighted fields",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const valid = parsed.data;
  const totals = calculateDocumentTotals(
    valid.items,
    { type: valid.discountType, value: valid.discountValue },
    valid.taxRate
  );

  const quotationNumber = await getNextDocumentNumber(companyId, "quotation");
  const now = new Date().toISOString();
  const quotationId = crypto.randomUUID();

  const newQuotation: Quotation = {
    id: quotationId,
    company_id: companyId,
    quotation_number: quotationNumber,
    customer_id: valid.customerId,
    lead_id: valid.leadId || null,
    issue_date: valid.issueDate,
    expiry_date: valid.expiryDate,
    status: valid.status as QuotationStatus,
    subtotal: totals.subtotal,
    discount_type: valid.discountType,
    discount_value: valid.discountValue,
    discount_total: totals.discountTotal,
    tax_rate: valid.taxRate,
    tax_total: totals.taxTotal,
    grand_total: totals.grandTotal,
    currency: "PKR",
    notes: valid.notes || null,
    terms: valid.terms || null,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  const lineItems: QuotationItem[] = valid.items.map((it, idx) => {
    const calc = calculateLineItem(it);
    return {
      id: crypto.randomUUID(),
      quotation_id: quotationId,
      company_id: companyId,
      product_id: it.productId || null,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      discount_pct: it.discountPct || 0,
      discount_amount: calc.discountAmount,
      tax_pct: it.taxPct || 0,
      tax_amount: calc.taxAmount,
      line_total: calc.lineTotal,
      sort_order: idx,
      created_at: now,
    };
  });

  const supabase = await createClient();
  try {
    await supabase.from("quotations").insert(newQuotation);
    if (lineItems.length > 0) {
      await supabase.from("quotation_items").insert(lineItems);
    }
  } catch {
    // Memory store
  }

  memorySalesStore.quotations.unshift(newQuotation);
  memorySalesStore.quotationItems.push(...lineItems);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "sales.quotation_create",
    resource: "quotations",
    resourceId: quotationId,
    details: { quotationNumber, grandTotal: totals.grandTotal },
  });

  return { success: true, data: { ...newQuotation, items: lineItems } };
}

/**
 * Converts a quotation to a Sales Order with duplicate-conversion safeguard.
 */
export async function convertQuotationToSalesOrder(
  companyId: string,
  quotationId: string,
  actorUser?: Profile
): Promise<{ success: boolean; data?: SalesOrder; error?: string }> {
  const user = actorUser || (await requireUser());
  await requirePermission(companyId, "sales:create", user);

  const quotation = await getQuotationById(companyId, quotationId);
  if (!quotation) {
    return { success: false, error: "Quotation not found" };
  }

  // Duplicate conversion protection
  if (quotation.status === "Converted" || quotation.converted_to_id) {
    return {
      success: false,
      error: `Duplicate Conversion Prohibited: Quotation '${quotation.quotation_number}' has already been converted to ${quotation.converted_to_type || "a record"} (ID: ${quotation.converted_to_id}).`,
    };
  }

  const orderNumber = await getNextDocumentNumber(companyId, "sales_order");
  const now = new Date().toISOString();
  const orderId = crypto.randomUUID();

  const newSalesOrder: SalesOrder = {
    id: orderId,
    company_id: companyId,
    order_number: orderNumber,
    quotation_id: quotation.id,
    customer_id: quotation.customer_id,
    order_date: new Date().toISOString().split("T")[0],
    expected_delivery_date: null,
    status: "Confirmed",
    subtotal: quotation.subtotal,
    discount_type: quotation.discount_type,
    discount_value: quotation.discount_value,
    discount_total: quotation.discount_total,
    tax_rate: quotation.tax_rate,
    tax_total: quotation.tax_total,
    grand_total: quotation.grand_total,
    currency: quotation.currency,
    notes: `Generated from Quotation ${quotation.quotation_number}. ${quotation.notes || ""}`.trim(),
    terms: quotation.terms,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  const lineItems: SalesOrderItem[] = (quotation.items || []).map((it, idx) => ({
    id: crypto.randomUUID(),
    sales_order_id: orderId,
    company_id: companyId,
    product_id: it.product_id || null,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    discount_pct: it.discount_pct,
    discount_amount: it.discount_amount,
    tax_pct: it.tax_pct,
    tax_amount: it.tax_amount,
    line_total: it.line_total,
    sort_order: idx,
    created_at: now,
  }));

  const supabase = await createClient();
  try {
    await supabase.from("sales_orders").insert(newSalesOrder);
    if (lineItems.length > 0) {
      await supabase.from("sales_order_items").insert(lineItems);
    }
    await supabase
      .from("quotations")
      .update({
        status: "Converted",
        converted_to_type: "sales_order",
        converted_to_id: orderId,
        converted_at: now,
        updated_at: now,
      })
      .eq("id", quotation.id);
  } catch {
    // Memory store
  }

  // Update in memory
  memorySalesStore.salesOrders.unshift(newSalesOrder);
  memorySalesStore.salesOrderItems.push(...lineItems);
  const qIdx = memorySalesStore.quotations.findIndex(
    (item) => item.company_id === companyId && item.id === quotationId
  );
  if (qIdx !== -1) {
    memorySalesStore.quotations[qIdx].status = "Converted";
    memorySalesStore.quotations[qIdx].converted_to_type = "sales_order";
    memorySalesStore.quotations[qIdx].converted_to_id = orderId;
    memorySalesStore.quotations[qIdx].converted_at = now;
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "sales.quotation_convert",
    resource: "quotations",
    resourceId: quotationId,
    details: { convertedTo: "sales_order", targetId: orderId, orderNumber },
  });

  return { success: true, data: { ...newSalesOrder, items: lineItems } };
}

/**
 * Converts a quotation directly to an Invoice with duplicate-conversion safeguards.
 */
export async function convertQuotationToInvoice(
  companyId: string,
  quotationId: string,
  actorUser?: Profile
): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  const user = actorUser || (await requireUser());
  await requirePermission(companyId, "sales:create", user);

  const quotation = await getQuotationById(companyId, quotationId);
  if (!quotation) {
    return { success: false, error: "Quotation not found" };
  }

  // Duplicate conversion protection
  if (quotation.status === "Converted" || quotation.converted_to_id) {
    return {
      success: false,
      error: `Duplicate Conversion Prohibited: Quotation '${quotation.quotation_number}' has already been converted to ${quotation.converted_to_type || "a record"} (ID: ${quotation.converted_to_id}).`,
    };
  }

  const invoiceNumber = await getNextDocumentNumber(companyId, "invoice");
  const now = new Date().toISOString();
  const invoiceId = crypto.randomUUID();

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateStr = dueDate.toISOString().split("T")[0];

  const newInvoice: Invoice = {
    id: invoiceId,
    company_id: companyId,
    invoice_number: invoiceNumber,
    customer_id: quotation.customer_id,
    sales_order_id: null,
    quotation_id: quotation.id,
    issue_date: new Date().toISOString().split("T")[0],
    due_date: dueDateStr,
    status: "Sent",
    subtotal: quotation.subtotal,
    discount_type: quotation.discount_type,
    discount_value: quotation.discount_value,
    discount_total: quotation.discount_total,
    tax_rate: quotation.tax_rate,
    tax_total: quotation.tax_total,
    grand_total: quotation.grand_total,
    amount_paid: 0.0,
    amount_due: quotation.grand_total,
    currency: quotation.currency,
    notes: `Generated from Quotation ${quotation.quotation_number}. ${quotation.notes || ""}`.trim(),
    terms: quotation.terms,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  const lineItems: InvoiceItem[] = (quotation.items || []).map((it, idx) => ({
    id: crypto.randomUUID(),
    invoice_id: invoiceId,
    company_id: companyId,
    product_id: it.product_id || null,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    discount_pct: it.discount_pct,
    discount_amount: it.discount_amount,
    tax_pct: it.tax_pct,
    tax_amount: it.tax_amount,
    line_total: it.line_total,
    sort_order: idx,
    created_at: now,
  }));

  const supabase = await createClient();
  try {
    await supabase.from("invoices").insert(newInvoice);
    if (lineItems.length > 0) {
      await supabase.from("invoice_items").insert(lineItems);
    }
    await supabase
      .from("quotations")
      .update({
        status: "Converted",
        converted_to_type: "invoice",
        converted_to_id: invoiceId,
        converted_at: now,
        updated_at: now,
      })
      .eq("id", quotation.id);
  } catch {
    // Memory store
  }

  // Update in memory
  memorySalesStore.invoices.unshift(newInvoice);
  memorySalesStore.invoiceItems.push(...lineItems);
  const qIdx = memorySalesStore.quotations.findIndex(
    (item) => item.company_id === companyId && item.id === quotationId
  );
  if (qIdx !== -1) {
    memorySalesStore.quotations[qIdx].status = "Converted";
    memorySalesStore.quotations[qIdx].converted_to_type = "invoice";
    memorySalesStore.quotations[qIdx].converted_to_id = invoiceId;
    memorySalesStore.quotations[qIdx].converted_at = now;
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "sales.quotation_convert",
    resource: "quotations",
    resourceId: quotationId,
    details: { convertedTo: "invoice", targetId: invoiceId, invoiceNumber },
  });

  return { success: true, data: { ...newInvoice, items: lineItems } };
}

// ============================================================================
// SALES ORDERS SERVICE
// ============================================================================

export async function getSalesOrders(
  companyId: string,
  options?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
    includeDetails?: boolean;
  },
  viewingUser?: Profile
): Promise<SalesOrder[]> {
  await requirePermission(companyId, "sales:view", viewingUser);
  const supabase = await createClient();

  try {
    const projection = options?.includeDetails
      ? "*, customer:customers(*), items:sales_order_items(*)"
      : "*, customer:customers(id, name, email, company_name)";

    let query = supabase
      .from("sales_orders")
      .select(projection as any)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (options?.status && options.status !== "ALL") {
      query = query.eq("status", options.status);
    }

    const limit = Math.min(options?.limit ?? 50, 50);
    const offset = options?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (!error && data) {
      let list = data as unknown as SalesOrder[];
      if (options?.search?.trim()) {
        const term = options.search.trim().toLowerCase();
        list = list.filter(
          (o) =>
            o.order_number.toLowerCase().includes(term) ||
            o.customer?.name.toLowerCase().includes(term)
        );
      }
      return list;
    }
  } catch {
    // Fall through
  }

  // Memory fallback
  let list = memorySalesStore.salesOrders
    .filter((o) => o.company_id === companyId)
    .map((o) => ({
      ...o,
      items: memorySalesStore.salesOrderItems.filter((i) => i.sales_order_id === o.id),
    }));

  if (options?.status && options.status !== "ALL") {
    list = list.filter((o) => o.status === options.status);
  }
  if (options?.search?.trim()) {
    const term = options.search.trim().toLowerCase();
    list = list.filter((o) => o.order_number.toLowerCase().includes(term));
  }
  const limit = Math.min(options?.limit ?? 50, 50);
  const offset = options?.offset || 0;
  list = list.slice(offset, offset + limit);
  return list;
}

export async function getSalesOrderById(
  companyId: string,
  orderId: string,
  viewingUser?: Profile
): Promise<SalesOrder | null> {
  await requirePermission(companyId, "sales:view", viewingUser);
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("sales_orders")
      .select("*, customer:customers(*), items:sales_order_items(*)")
      .eq("company_id", companyId)
      .eq("id", orderId)
      .single();

    if (!error && data) {
      return data as SalesOrder;
    }
  } catch {
    // Fall through
  }

  const o = memorySalesStore.salesOrders.find(
    (item) => item.company_id === companyId && item.id === orderId
  );
  if (!o) return null;

  return {
    ...o,
    items: memorySalesStore.salesOrderItems.filter((i) => i.sales_order_id === o.id),
  };
}

export async function createSalesOrder(
  companyId: string,
  rawData: unknown,
  creatorUser?: Profile
): Promise<{ success: boolean; data?: SalesOrder; error?: string; errors?: Record<string, string[]> }> {
  const user = creatorUser || (await requireUser());
  await requirePermission(companyId, "sales:create", user);

  const parsed = salesOrderSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed: please review the highlighted fields",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const valid = parsed.data;
  const totals = calculateDocumentTotals(
    valid.items,
    { type: valid.discountType, value: valid.discountValue },
    valid.taxRate
  );

  const orderNumber = await getNextDocumentNumber(companyId, "sales_order");
  const now = new Date().toISOString();
  const orderId = crypto.randomUUID();

  const newSalesOrder: SalesOrder = {
    id: orderId,
    company_id: companyId,
    order_number: orderNumber,
    quotation_id: valid.quotationId || null,
    customer_id: valid.customerId,
    order_date: valid.orderDate,
    expected_delivery_date: valid.expectedDeliveryDate || null,
    status: valid.status as SalesOrderStatus,
    subtotal: totals.subtotal,
    discount_type: valid.discountType,
    discount_value: valid.discountValue,
    discount_total: totals.discountTotal,
    tax_rate: valid.taxRate,
    tax_total: totals.taxTotal,
    grand_total: totals.grandTotal,
    currency: "PKR",
    notes: valid.notes || null,
    terms: valid.terms || null,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  const lineItems: SalesOrderItem[] = valid.items.map((it, idx) => {
    const calc = calculateLineItem(it);
    return {
      id: crypto.randomUUID(),
      sales_order_id: orderId,
      company_id: companyId,
      product_id: it.productId || null,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      discount_pct: it.discountPct || 0,
      discount_amount: calc.discountAmount,
      tax_pct: it.taxPct || 0,
      tax_amount: calc.taxAmount,
      line_total: calc.lineTotal,
      sort_order: idx,
      created_at: now,
    };
  });

  const supabase = await createClient();
  try {
    await supabase.from("sales_orders").insert(newSalesOrder);
    if (lineItems.length > 0) {
      await supabase.from("sales_order_items").insert(lineItems);
    }
  } catch {
    // Memory store
  }

  memorySalesStore.salesOrders.unshift(newSalesOrder);
  memorySalesStore.salesOrderItems.push(...lineItems);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "sales.order_create",
    resource: "sales_orders",
    resourceId: orderId,
    details: { orderNumber, grandTotal: totals.grandTotal },
  });

  return { success: true, data: { ...newSalesOrder, items: lineItems } };
}

/**
 * Converts a Sales Order to an Invoice with duplicate-conversion safeguards.
 */
export async function convertSalesOrderToInvoice(
  companyId: string,
  orderId: string,
  actorUser?: Profile
): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  const user = actorUser || (await requireUser());
  await requirePermission(companyId, "sales:create", user);

  const order = await getSalesOrderById(companyId, orderId);
  if (!order) {
    return { success: false, error: "Sales Order not found" };
  }

  if (order.status === "Invoiced" || order.invoice_id) {
    return {
      success: false,
      error: `Duplicate Conversion Prohibited: Sales order '${order.order_number}' has already been invoiced (Invoice ID: ${order.invoice_id}).`,
    };
  }

  const invoiceNumber = await getNextDocumentNumber(companyId, "invoice");
  const now = new Date().toISOString();
  const invoiceId = crypto.randomUUID();

  // Due date defaults to 30 days from now
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateStr = dueDate.toISOString().split("T")[0];

  const newInvoice: Invoice = {
    id: invoiceId,
    company_id: companyId,
    invoice_number: invoiceNumber,
    customer_id: order.customer_id,
    sales_order_id: order.id,
    quotation_id: order.quotation_id,
    issue_date: new Date().toISOString().split("T")[0],
    due_date: dueDateStr,
    status: "Sent",
    subtotal: order.subtotal,
    discount_type: order.discount_type,
    discount_value: order.discount_value,
    discount_total: order.discount_total,
    tax_rate: order.tax_rate,
    tax_total: order.tax_total,
    grand_total: order.grand_total,
    amount_paid: 0.0,
    amount_due: order.grand_total,
    currency: order.currency,
    notes: `Generated from Sales Order ${order.order_number}. ${order.notes || ""}`.trim(),
    terms: order.terms || "Net 30. Please remit payment promptly.",
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  // Immutable historical line snapshot
  const lineItems: InvoiceItem[] = (order.items || []).map((it, idx) => ({
    id: crypto.randomUUID(),
    invoice_id: invoiceId,
    company_id: companyId,
    product_id: it.product_id || null,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    discount_pct: it.discount_pct,
    discount_amount: it.discount_amount,
    tax_pct: it.tax_pct,
    tax_amount: it.tax_amount,
    line_total: it.line_total,
    sort_order: idx,
    created_at: now,
  }));

  const supabase = await createClient();
  try {
    await supabase.from("invoices").insert(newInvoice);
    if (lineItems.length > 0) {
      await supabase.from("invoice_items").insert(lineItems);
    }
    await supabase
      .from("sales_orders")
      .update({
        status: "Invoiced",
        invoice_id: invoiceId,
        invoiced_at: now,
        updated_at: now,
      })
      .eq("id", order.id);
  } catch {
    // Memory store
  }

  memorySalesStore.invoices.unshift(newInvoice);
  memorySalesStore.invoiceItems.push(...lineItems);
  const ordIdx = memorySalesStore.salesOrders.findIndex(
    (item) => item.company_id === companyId && item.id === orderId
  );
  if (ordIdx !== -1) {
    memorySalesStore.salesOrders[ordIdx].status = "Invoiced";
    memorySalesStore.salesOrders[ordIdx].invoice_id = invoiceId;
    memorySalesStore.salesOrders[ordIdx].invoiced_at = now;
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "sales.order_invoice",
    resource: "sales_orders",
    resourceId: orderId,
    details: { invoiceId, invoiceNumber },
  });

  return { success: true, data: { ...newInvoice, items: lineItems } };
}

// ============================================================================
// INVOICES SERVICE
// ============================================================================

export async function getInvoices(
  companyId: string,
  options?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
    page?: number;
    pageSize?: number;
    includeDetails?: boolean;
  },
  viewingUser?: Profile
): Promise<Invoice[]> {
  await requirePermission(companyId, "sales:view", viewingUser);
  const supabase = await createClient();

  const limit = options?.limit ?? (options?.pageSize ? options.pageSize : undefined);
  const offset = options?.offset ?? (options?.page && options?.pageSize ? (options.page - 1) * options.pageSize : undefined);

  try {
    // Avoid heavy N+1 joining of all line items and payments when generating table listings
    const selectProjection = options?.includeDetails
      ? "*, customer:customers(*), items:invoice_items(*), payments:payments(*)"
      : "*, customer:customers(id, name, email, company_name)";

    let query = supabase
      .from("invoices")
      .select(selectProjection as any)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (options?.status && options.status !== "ALL") {
      query = query.eq("status", options.status);
    }

    if (options?.search?.trim()) {
      const term = `%${options.search.trim()}%`;
      query = query.ilike("invoice_number", term);
    }

    const limit = Math.min(options?.limit ?? options?.pageSize ?? 50, 50);
    const offset = options?.offset ?? (options?.page && options?.pageSize ? (options.page - 1) * options.pageSize : 0);
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (!error && data) {
      let list = data as unknown as Invoice[];
      if (options?.search?.trim()) {
        const term = options.search.trim().toLowerCase();
        list = list.filter(
          (inv) =>
            inv.invoice_number.toLowerCase().includes(term) ||
            inv.customer?.name.toLowerCase().includes(term)
        );
      }
      return list;
    }
  } catch {
    // Fall through
  }

  // Memory fallback
  let list = memorySalesStore.invoices
    .filter((inv) => inv.company_id === companyId)
    .map((inv) => ({
      ...inv,
      items: memorySalesStore.invoiceItems.filter((i) => i.invoice_id === inv.id),
      payments: memorySalesStore.payments.filter((p) => p.invoice_id === inv.id),
    }));

  if (options?.status && options.status !== "ALL") {
    list = list.filter((inv) => inv.status === options.status);
  }
  if (options?.search?.trim()) {
    const term = options.search.trim().toLowerCase();
    list = list.filter((inv) => inv.invoice_number.toLowerCase().includes(term));
  }
  const finalLimit = Math.min(options?.limit ?? options?.pageSize ?? 50, 50);
  const finalOffset = offset || 0;
  list = list.slice(finalOffset, finalOffset + finalLimit);
  return list;
}

export async function getInvoiceById(
  companyId: string,
  invoiceId: string,
  viewingUser?: Profile
): Promise<Invoice | null> {
  await requirePermission(companyId, "sales:view", viewingUser);
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*, customer:customers(*), items:invoice_items(*), payments:payments(*)")
      .eq("company_id", companyId)
      .eq("id", invoiceId)
      .single();

    if (!error && data) {
      return data as Invoice;
    }
  } catch {
    // Fall through
  }

  const inv = memorySalesStore.invoices.find(
    (item) => item.company_id === companyId && item.id === invoiceId
  );
  if (!inv) return null;

  return {
    ...inv,
    items: memorySalesStore.invoiceItems.filter((i) => i.invoice_id === inv.id),
    payments: memorySalesStore.payments.filter((p) => p.invoice_id === inv.id),
  };
}

export async function createInvoice(
  companyId: string,
  rawData: unknown,
  creatorUser?: Profile
): Promise<{ success: boolean; data?: Invoice; error?: string; errors?: Record<string, string[]> }> {
  const user = creatorUser || (await requireUser());
  await requirePermission(companyId, "sales:create", user);

  const parsed = invoiceSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed: please review the highlighted fields",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const valid = parsed.data;
  const totals = calculateDocumentTotals(
    valid.items,
    { type: valid.discountType, value: valid.discountValue },
    valid.taxRate
  );

  const invoiceNumber = await getNextDocumentNumber(companyId, "invoice");
  const now = new Date().toISOString();
  const invoiceId = crypto.randomUUID();

  const newInvoice: Invoice = {
    id: invoiceId,
    company_id: companyId,
    invoice_number: invoiceNumber,
    customer_id: valid.customerId,
    sales_order_id: valid.salesOrderId || null,
    quotation_id: valid.quotationId || null,
    issue_date: valid.issueDate,
    due_date: valid.dueDate,
    status: valid.status as InvoiceStatus,
    subtotal: totals.subtotal,
    discount_type: valid.discountType,
    discount_value: valid.discountValue,
    discount_total: totals.discountTotal,
    tax_rate: valid.taxRate,
    tax_total: totals.taxTotal,
    grand_total: totals.grandTotal,
    amount_paid: 0.0,
    amount_due: totals.grandTotal,
    currency: "PKR",
    notes: valid.notes || null,
    terms: valid.terms || null,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  // Historical snapshot of line items
  const lineItems: InvoiceItem[] = valid.items.map((it, idx) => {
    const calc = calculateLineItem(it);
    return {
      id: crypto.randomUUID(),
      invoice_id: invoiceId,
      company_id: companyId,
      product_id: it.productId || null,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      discount_pct: it.discountPct || 0,
      discount_amount: calc.discountAmount,
      tax_pct: it.taxPct || 0,
      tax_amount: calc.taxAmount,
      line_total: calc.lineTotal,
      sort_order: idx,
      created_at: now,
    };
  });

  const supabase = await createClient();
  try {
    await supabase.from("invoices").insert(newInvoice);
    if (lineItems.length > 0) {
      await supabase.from("invoice_items").insert(lineItems);
    }
  } catch {
    // Memory store
  }

  memorySalesStore.invoices.unshift(newInvoice);
  memorySalesStore.invoiceItems.push(...lineItems);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "sales.invoice_create",
    resource: "invoices",
    resourceId: invoiceId,
    details: { invoiceNumber, grandTotal: totals.grandTotal },
  });

  try {
    await updateCompanySummaryIncremental(companyId, {
      revenueDelta: totals.grandTotal,
      outstandingDelta: totals.grandTotal,
    });
    await revalidateCompanyTag(companyId, "dashboard");
    await revalidateCompanyTag(companyId, "summary");
  } catch {
    // Non-blocking cache/summary update
  }

  return { success: true, data: { ...newInvoice, items: lineItems } };
}

// ============================================================================
// PAYMENTS & FINANCIAL LEDGER SERVICE
// ============================================================================

export async function getPayments(
  companyId: string,
  options?: { invoiceId?: string; customerId?: string; limit?: number; offset?: number },
  viewingUser?: Profile
): Promise<Payment[]> {
  await requirePermission(companyId, "sales:view", viewingUser);
  const supabase = await createClient();

  try {
    let query = supabase
      .from("payments")
      .select("*, invoice:invoices(id, invoice_number, grand_total, amount_due), customer:customers(id, name, email)" as any)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (options?.invoiceId) {
      query = query.eq("invoice_id", options.invoiceId);
    }
    if (options?.customerId) {
      query = query.eq("customer_id", options.customerId);
    }
    const limit = Math.min(options?.limit ?? 50, 50);
    const offset = options?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (!error && data) {
      return data as unknown as Payment[];
    }
  } catch {
    // Fall through
  }

  let list = memorySalesStore.payments.filter((p) => p.company_id === companyId);
  if (options?.invoiceId) {
    list = list.filter((p) => p.invoice_id === options.invoiceId);
  }
  if (options?.customerId) {
    list = list.filter((p) => p.customer_id === options.customerId);
  }
  const limit = Math.min(options?.limit ?? 50, 50);
  const offset = options?.offset || 0;
  list = list.slice(offset, offset + limit);
  return list;
}

/**
 * Records a customer payment against an invoice with exact money arithmetic,
 * overpayment prevention, server-side status updates, and audit logging.
 */
export async function recordPayment(
  companyId: string,
  rawData: unknown,
  creatorUser?: Profile
): Promise<{ success: boolean; data?: Payment; error?: string }> {
  const user = creatorUser || (await requireUser());
  await requirePermission(companyId, "sales:edit", user);

  const parsed = paymentSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid payment details",
    };
  }

  const valid = parsed.data;
  const payAmount = roundMoney(valid.amount);

  const invoice = await getInvoiceById(companyId, valid.invoiceId);
  if (!invoice) {
    return { success: false, error: "Invoice record not found" };
  }

  if (invoice.status === "Cancelled") {
    return { success: false, error: "Payments cannot be recorded against a Cancelled invoice" };
  }

  if (invoice.status === "Paid" || invoice.amount_due <= 0.001) {
    return {
      success: false,
      error: `Invoice ${invoice.invoice_number} is already fully paid. Balance due is ₨ 0.00.`,
    };
  }

  // Overpayment prevention safeguard
  if (payAmount > invoice.amount_due + 0.001) {
    return {
      success: false,
      error: `Overpayment Prevented: Payment of ₨ ${payAmount.toFixed(2)} exceeds remaining invoice balance of ₨ ${invoice.amount_due.toFixed(2)}.`,
    };
  }

  const paymentNumber = await getNextDocumentNumber(companyId, "payment");
  const now = new Date().toISOString();
  const paymentId = crypto.randomUUID();

  const newPayment: Payment = {
    id: paymentId,
    company_id: companyId,
    payment_number: paymentNumber,
    invoice_id: invoice.id,
    customer_id: invoice.customer_id,
    amount: payAmount,
    payment_method: valid.paymentMethod,
    transaction_reference: valid.transactionReference || null,
    payment_date: valid.paymentDate,
    status: "Completed",
    notes: valid.notes || null,
    created_by: user.id,
    created_at: now,
  };

  // Compute new invoice balances and status
  const newAmountPaid = roundMoney(invoice.amount_paid + payAmount);
  const newAmountDue = Math.max(0, roundMoney(invoice.grand_total - newAmountPaid));
  const newStatus: InvoiceStatus = newAmountDue <= 0.001 ? "Paid" : "Partially Paid";

  const supabase = await createClient();
  try {
    await supabase.from("payments").insert(newPayment);
    await supabase
      .from("invoices")
      .update({
        amount_paid: newAmountPaid,
        amount_due: newAmountDue,
        status: newStatus,
        updated_at: now,
      })
      .eq("id", invoice.id);
  } catch {
    // Memory store
  }

  // Update memory store
  memorySalesStore.payments.unshift(newPayment);
  const invIdx = memorySalesStore.invoices.findIndex(
    (item) => item.company_id === companyId && item.id === invoice.id
  );
  if (invIdx !== -1) {
    memorySalesStore.invoices[invIdx].amount_paid = newAmountPaid;
    memorySalesStore.invoices[invIdx].amount_due = newAmountDue;
    memorySalesStore.invoices[invIdx].status = newStatus;
    memorySalesStore.invoices[invIdx].updated_at = now;
  }

  // Update customer total spend
  try {
    const cust = await getCustomerById(companyId, invoice.customer_id);
    if (cust) {
      cust.customer.total_spend = roundMoney((cust.customer.total_spend || 0) + payAmount);
    }
  } catch {
    // Fall through
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "sales.payment_record",
    resource: "payments",
    resourceId: paymentId,
    details: {
      paymentNumber,
      invoiceNumber: invoice.invoice_number,
      amount: payAmount,
      method: valid.paymentMethod,
      newInvoiceStatus: newStatus,
      remainingDue: newAmountDue,
    },
  });

  try {
    await updateCompanySummaryIncremental(companyId, {
      outstandingDelta: -payAmount,
      paidInvoicesDelta: newStatus === "Paid" ? 1 : 0,
    });
    await revalidateCompanyTag(companyId, "dashboard");
    await revalidateCompanyTag(companyId, "summary");
  } catch {
    // Non-blocking cache/summary update
  }

  return { success: true, data: newPayment };
}

/**
 * Safely voids/reverses a payment in the financial ledger.
 * Financial records are NEVER silently deleted; the transaction is marked Voided
 * and the invoice balance/status is safely restored.
 */
export async function voidPayment(
  companyId: string,
  paymentId: string,
  rawData: unknown,
  actorUser?: Profile
): Promise<{ success: boolean; error?: string }> {
  const user = actorUser || (await requireUser());
  await requirePermission(companyId, "sales:edit", user);

  const parsed = voidPaymentSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "A valid void reason is required",
    };
  }

  const { reason } = parsed.data;

  // Find payment
  const payment = memorySalesStore.payments.find(
    (p) => p.company_id === companyId && p.id === paymentId
  );
  if (!payment) {
    return { success: false, error: "Payment record not found" };
  }

  if (payment.status === "Voided") {
    return { success: false, error: "This payment has already been voided" };
  }

  const invoice = await getInvoiceById(companyId, payment.invoice_id);
  if (!invoice) {
    return { success: false, error: "Linked invoice not found" };
  }

  const now = new Date().toISOString();
  payment.status = "Voided";
  payment.void_reason = reason;
  payment.voided_at = now;
  payment.voided_by = user.id;

  // Reverse invoice balances
  const newAmountPaid = Math.max(0, roundMoney(invoice.amount_paid - payment.amount));
  const newAmountDue = Math.max(0, roundMoney(invoice.grand_total - newAmountPaid));
  let newStatus: InvoiceStatus = "Sent";
  if (newAmountPaid > 0) {
    newStatus = "Partially Paid";
  } else {
    // Check if overdue
    const today = new Date().toISOString().split("T")[0];
    newStatus = invoice.due_date < today ? "Overdue" : "Sent";
  }

  const invIdx = memorySalesStore.invoices.findIndex(
    (item) => item.company_id === companyId && item.id === invoice.id
  );
  if (invIdx !== -1) {
    memorySalesStore.invoices[invIdx].amount_paid = newAmountPaid;
    memorySalesStore.invoices[invIdx].amount_due = newAmountDue;
    memorySalesStore.invoices[invIdx].status = newStatus;
    memorySalesStore.invoices[invIdx].updated_at = now;
  }

  const payIdx = memorySalesStore.payments.findIndex(
    (p) => p.company_id === companyId && p.id === paymentId
  );
  if (payIdx !== -1) {
    memorySalesStore.payments[payIdx].status = "Voided";
    memorySalesStore.payments[payIdx].void_reason = reason;
    memorySalesStore.payments[payIdx].voided_at = now;
    memorySalesStore.payments[payIdx].voided_by = user.id;
  }

  const supabase = await createClient();
  try {
    await supabase
      .from("payments")
      .update({
        status: "Voided",
        void_reason: reason,
        voided_at: now,
        voided_by: user.id,
      })
      .eq("id", payment.id);

    await supabase
      .from("invoices")
      .update({
        amount_paid: newAmountPaid,
        amount_due: newAmountDue,
        status: newStatus,
        updated_at: now,
      })
      .eq("id", invoice.id);
  } catch {
    // Memory store
  }

  // Reverse customer spend
  try {
    const cust = await getCustomerById(companyId, invoice.customer_id);
    if (cust) {
      cust.customer.total_spend = Math.max(0, roundMoney((cust.customer.total_spend || 0) - payment.amount));
    }
  } catch {
    // Fall through
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "sales.payment_void",
    resource: "payments",
    resourceId: payment.id,
    details: {
      paymentNumber: payment.payment_number,
      invoiceNumber: invoice.invoice_number,
      reversedAmount: payment.amount,
      reason,
      restoredInvoiceStatus: newStatus,
    },
  });

  try {
    await updateCompanySummaryIncremental(companyId, {
      outstandingDelta: payment.amount,
      paidInvoicesDelta: invoice.status === "Paid" ? -1 : 0,
    });
    await revalidateCompanyTag(companyId, "dashboard");
    await revalidateCompanyTag(companyId, "summary");
  } catch {
    // Non-blocking cache/summary update
  }

  return { success: true };
}

