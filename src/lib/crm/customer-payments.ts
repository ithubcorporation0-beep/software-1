import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";
import { CustomerPayment, CustomerPaymentStatus, CustomerPaymentType } from "@/types/database.types";
import { getCustomers } from "@/lib/crm/server";

// In-memory fallback store for customer payments
const memoryPayments: CustomerPayment[] = [];

export function resetMemoryPaymentsStore(): void {
  memoryPayments.length = 0;
}

export async function getCustomerPayments(
  companyId: string,
  filters?: { search?: string; customer_id?: string; status?: string }
): Promise<CustomerPayment[]> {
  await requirePermission(companyId, "crm:view");

  let result: CustomerPayment[] = [];

  try {
    const supabase = await createClient();
    let query = supabase
      .from("customer_payments")
      .select("*")
      .eq("company_id", companyId)
      .order("payment_date", { ascending: false });

    if (filters?.customer_id) {
      query = query.eq("customer_id", filters.customer_id);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      result = data;
    }
  } catch {
    // Fall back to memory store
  }

  if (result.length === 0) {
    result = memoryPayments
      .filter((p) => p.company_id === companyId || p.company_id === "default")
      .map((p) => ({ ...p, company_id: companyId }));
  }

  if (filters?.customer_id) {
    result = result.filter((p) => p.customer_id === filters.customer_id);
  }
  if (filters?.status) {
    result = result.filter((p) => p.status === filters.status);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.payment_number.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q) ||
        (p.reference_number && p.reference_number.toLowerCase().includes(q)) ||
        (p.invoice_number && p.invoice_number.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
    );
  }

  return result;
}

export async function getCustomerPaymentById(companyId: string, id: string): Promise<CustomerPayment | null> {
  await requirePermission(companyId, "crm:view");
  const payments = await getCustomerPayments(companyId);
  return payments.find((p) => p.id === id) || null;
}

export async function createCustomerPayment(
  companyId: string,
  data: {
    customer_id: string;
    customer_name?: string;
    payment_date: string;
    payment_amount: number;
    payment_type?: CustomerPaymentType;
    payment_method?: string;
    reference_number?: string;
    notes?: string;
    invoice_number?: string;
  }
): Promise<{ success: boolean; data?: CustomerPayment; error?: string }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:create", user);

  if (!data.customer_id) {
    return { success: false, error: "Customer is required." };
  }
  if (!data.payment_amount || data.payment_amount <= 0) {
    return { success: false, error: "Payment amount must be greater than zero." };
  }

  // Resolve customer name if missing
  let resolvedCustomerName = data.customer_name;
  if (!resolvedCustomerName) {
    const custs = await getCustomers(companyId);
    const found = custs.data?.find((c) => c.id === data.customer_id);
    resolvedCustomerName = found?.name || "Customer Account";
  }

  const existingPayments = await getCustomerPayments(companyId);
  const nextSeq = (existingPayments.length + 35).toString().padStart(3, "0");
  const monthStr = new Date(data.payment_date || Date.now()).toISOString().slice(0, 7);
  const paymentNumber = `CP-${monthStr}-${nextSeq}`;

  const now = new Date().toISOString();
  const payment: CustomerPayment = {
    id: crypto.randomUUID(),
    company_id: companyId,
    payment_number: paymentNumber,
    customer_id: data.customer_id,
    customer_name: resolvedCustomerName,
    payment_date: data.payment_date || now.split("T")[0],
    payment_amount: Number(data.payment_amount),
    payment_type: data.payment_type || "Against Invoices",
    payment_method: data.payment_method || "Bank Transfer",
    reference_number: data.reference_number || null,
    status: "Cleared",
    notes: data.notes || null,
    invoice_number: data.invoice_number || null,
    created_at: now,
    updated_at: now,
  };

  memoryPayments.unshift(payment);

  await recordAuditLog({
    action: "create",
    resource: "customer_payment",
    resourceId: payment.id,
    companyId,
    userId: user.id,
    details: { payment_number: payment.payment_number, amount: payment.payment_amount, customer: payment.customer_name },
  });

  return { success: true, data: payment };
}

export async function updateCustomerPaymentStatus(
  companyId: string,
  id: string,
  status: CustomerPaymentStatus
): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:edit", user);

  const idx = memoryPayments.findIndex((p) => p.id === id);
  if (idx === -1) {
    return { success: false, error: "Payment record not found." };
  }

  memoryPayments[idx].status = status;
  memoryPayments[idx].updated_at = new Date().toISOString();

  await recordAuditLog({
    action: "update",
    resource: "customer_payment",
    resourceId: id,
    companyId,
    userId: user.id,
    details: { status },
  });

  return { success: true };
}

export async function deleteCustomerPayment(
  companyId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:delete", user);

  const idx = memoryPayments.findIndex((p) => p.id === id);
  if (idx !== -1) {
    memoryPayments.splice(idx, 1);
  }

  await recordAuditLog({
    action: "delete",
    resource: "customer_payment",
    resourceId: id,
    companyId,
    userId: user.id,
    details: { deleted_payment_id: id },
  });

  return { success: true };
}

export async function recordBatchPayments(
  companyId: string,
  items: Array<{ customer_id: string; customer_name: string; amount: number; reference?: string }>
): Promise<{ success: boolean; processedCount: number; errors?: string[] }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:create", user);

  let processedCount = 0;
  const errors: string[] = [];

  for (const item of items) {
    if (item.amount <= 0) continue;
    try {
      const res = await createCustomerPayment(companyId, {
        customer_id: item.customer_id,
        customer_name: item.customer_name,
        payment_date: new Date().toISOString().split("T")[0],
        payment_amount: item.amount,
        payment_type: "Against Invoices",
        payment_method: "Bank Transfer",
        reference_number: item.reference || "Batch Settlement",
        notes: "Automated Batch Clearance",
      });
      if (res.success) {
        processedCount++;
      } else {
        errors.push(`Failed for ${item.customer_name}: ${res.error}`);
      }
    } catch (e: any) {
      errors.push(`Error for ${item.customer_name}: ${e.message}`);
    }
  }

  return { success: processedCount > 0, processedCount, errors };
}

export interface CustomerLedgerEntry {
  id: string;
  date: string;
  type: "Invoice" | "Payment" | "Opening Balance";
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export async function getCustomerLedger(
  companyId: string,
  customerId?: string
): Promise<{ customer: any; entries: CustomerLedgerEntry[]; totalDebit: number; totalCredit: number; closingBalance: number }> {
  await requirePermission(companyId, "crm:view");
  const customers = await getCustomers(companyId);
  const target = customerId ? customers.data?.find((c) => c.id === customerId) : customers.data?.[0];

  const openingBalance = target?.opening_balance || 0;
  const payments = (await getCustomerPayments(companyId)).filter((p) => !customerId || p.customer_id === customerId);

  const entries: CustomerLedgerEntry[] = [];
  let running = openingBalance;

  entries.push({
    id: "opening",
    date: "2026-01-01",
    type: "Opening Balance",
    reference: "INIT-BAL",
    description: "Opening Account Receivables Balance",
    debit: openingBalance > 0 ? openingBalance : 0,
    credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
    balance: running,
  });


  for (const pay of payments) {
    running -= pay.payment_amount;
    entries.push({
      id: "pay-" + pay.payment_number,
      date: pay.payment_date,
      type: "Payment",
      reference: pay.payment_number,
      description: `Payment via ${pay.payment_method} (${pay.reference_number || "No Ref"})`,
      debit: 0,
      credit: pay.payment_amount,
      balance: running,
    });
  }

  // Sort by date
  entries.sort((a, b) => (a.date > b.date ? 1 : -1));

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  return {
    customer: target || null,
    entries,
    totalDebit,
    totalCredit,
    closingBalance: running,
  };
}
