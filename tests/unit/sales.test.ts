import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  roundMoney,
  calculateLineItem,
  calculateDocumentTotals,
  getNextDocumentNumber,
  createQuotation,
  getQuotations,
  getQuotationById,
  convertQuotationToSalesOrder,
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  convertSalesOrderToInvoice,
  createInvoice,
  getInvoices,
  getInvoiceById,
  recordPayment,
  voidPayment,
  getPayments,
} from "@/lib/sales/server";

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

describe("Sales & Invoicing Module: Quotations, Orders, Invoices & Payments", () => {
  const companyA = "00000000-0000-0000-0000-000000000001";
  const companyB = "00000000-0000-0000-0000-000000000002";
  const testCustomerA = "cust-001";

  const standardUser = {
    id: "user-123",
    email: "finance@company.com",
    full_name: "Finance Controller",
    is_super_admin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue(standardUser);
    mockRequirePermission.mockResolvedValue({
      membership: { id: "mem-1" },
      role: { code: "accountant" },
      permissions: ["sales:view", "sales:create", "sales:edit", "finance:view", "finance:create", "finance:approve"],
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "table pending" } }),
          }),
          order: vi.fn().mockResolvedValue({ data: null, error: { message: "table pending" } }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  describe("1. Exact Decimal-Safe Money Arithmetic & Rounding", () => {
    it("safely rounds money values without floating point errors", () => {
      // 0.1 + 0.2 in JS is 0.30000000000000004
      expect(0.1 + 0.2).not.toBe(0.3);
      expect(roundMoney(0.1 + 0.2)).toBe(0.3);

      expect(roundMoney(19.995)).toBe(20.0);
      expect(roundMoney(19.994)).toBe(19.99);
    });

    it("calculates line items with quantity, unit price, discounts, and taxes", () => {
      // 3 items at $10.50 each with 10% discount and 8% tax
      const line = calculateLineItem({
        quantity: 3,
        unitPrice: 10.5,
        discountPct: 10,
        taxPct: 8,
      });

      // Raw subtotal = 3 * 10.50 = 31.50
      expect(line.rawSubtotal).toBe(31.5);
      // Discount = 31.50 * 0.10 = 3.15
      expect(line.discountAmount).toBe(3.15);
      // Taxable = 31.50 - 3.15 = 28.35
      expect(line.taxableAmount).toBe(28.35);
      // Tax = 28.35 * 0.08 = 2.268 -> rounds to 2.27
      expect(line.taxAmount).toBe(2.27);
      // Line Total = 28.35 + 2.27 = 30.62
      expect(line.lineTotal).toBe(30.62);
    });

    it("calculates document totals correctly across multiple line items", () => {
      const items = [
        { quantity: 2, unitPrice: 100, discountPct: 0, taxPct: 10 }, // 200 + 20 = 220
        { quantity: 1, unitPrice: 50, discountPct: 10, taxPct: 0 },  // 50 - 5 = 45
      ];

      const doc = calculateDocumentTotals(items);
      expect(doc.subtotal).toBe(250.0);
      expect(doc.discountTotal).toBe(5.0);
      expect(doc.taxTotal).toBe(20.0);
      expect(doc.grandTotal).toBe(265.0);
    });
  });

  describe("2. Sequential Numbering & Concurrency Safety", () => {
    it("generates sequential document numbers per tenant", async () => {
      const num1 = await getNextDocumentNumber(companyA, "invoice", "TEST-", 500);
      const num2 = await getNextDocumentNumber(companyA, "invoice", "TEST-", 500);

      expect(num1).toBe("TEST-00500");
      expect(num2).toBe("TEST-00501");
    });
  });

  describe("3. Quotation-to-Order and Duplicate Conversion Safeguard", () => {
    it("creates a quotation with line items and totals", async () => {
      const res = await createQuotation(companyA, {
        customerId: "00000000-0000-0000-0000-000000000001",
        issueDate: "2026-10-12",
        expiryDate: "2026-11-12",
        items: [
          { description: "Enterprise Cloud License", quantity: 5, unitPrice: 1200, discountPct: 5, taxPct: 8 },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data?.quotation_number).toMatch(/^QT-\d+$/);
      expect(res.data?.subtotal).toBe(6000.0);
      expect(res.data?.discount_total).toBe(300.0); // 5% of 6000
      expect(res.data?.tax_total).toBe(456.0); // 8% of 5700
      expect(res.data?.grand_total).toBe(6156.0); // 5700 + 456
    });

    it("converts quotation to Sales Order and blocks duplicate conversions", async () => {
      const quoteRes = await createQuotation(companyA, {
        customerId: "00000000-0000-0000-0000-000000000001",
        issueDate: "2026-10-12",
        expiryDate: "2026-11-12",
        items: [{ description: "Consulting Hours", quantity: 10, unitPrice: 200 }],
      });

      const quoteId = quoteRes.data!.id;

      // First conversion: succeeds
      const soRes = await convertQuotationToSalesOrder(companyA, quoteId);
      expect(soRes.success).toBe(true);
      expect(soRes.data?.order_number).toMatch(/^SO-\d+$/);
      expect(soRes.data?.quotation_id).toBe(quoteId);

      // Verify quotation marked as Converted
      const updatedQuote = await getQuotationById(companyA, quoteId);
      expect(updatedQuote?.status).toBe("Converted");
      expect(updatedQuote?.converted_to_id).toBe(soRes.data!.id);

      // Second conversion attempt: must be prohibited
      const duplicateRes = await convertQuotationToSalesOrder(companyA, quoteId);
      expect(duplicateRes.success).toBe(false);
      expect(duplicateRes.error).toMatch(/Duplicate Conversion Prohibited/i);
    });
  });

  describe("4. Sales Order to Invoice Workflow", () => {
    it("converts sales order to commercial invoice and blocks duplicate invoicing", async () => {
      const orderRes = await createSalesOrder(companyA, {
        customerId: "00000000-0000-0000-0000-000000000001",
        orderDate: "2026-10-12",
        items: [{ description: "Server Rack Units", quantity: 2, unitPrice: 4500 }],
      });

      const orderId = orderRes.data!.id;

      // First conversion to invoice: succeeds
      const invRes = await convertSalesOrderToInvoice(companyA, orderId);
      expect(invRes.success).toBe(true);
      expect(invRes.data?.invoice_number).toMatch(/^INV-\d+$/);
      expect(invRes.data?.sales_order_id).toBe(orderId);
      expect(invRes.data?.amount_due).toBe(9000.0);
      expect(invRes.data?.amount_paid).toBe(0.0);

      // Verify sales order is marked Invoiced
      const updatedOrder = await getSalesOrderById(companyA, orderId);
      expect(updatedOrder?.status).toBe("Invoiced");
      expect(updatedOrder?.invoice_id).toBe(invRes.data!.id);

      // Second conversion attempt: must be rejected
      const duplicateRes = await convertSalesOrderToInvoice(companyA, orderId);
      expect(duplicateRes.success).toBe(false);
      expect(duplicateRes.error).toMatch(/Duplicate Conversion Prohibited/i);
    });
  });

  describe("5. Partial & Full Payments, Overpayment Protection, and Ledger", () => {
    it("records a partial payment and updates invoice status to Partially Paid", async () => {
      const invRes = await createInvoice(companyA, {
        customerId: "00000000-0000-0000-0000-000000000001",
        issueDate: "2026-10-12",
        dueDate: "2026-11-12",
        items: [{ description: "Development Milestone 1", quantity: 1, unitPrice: 10000.0 }],
      });

      const invoiceId = invRes.data!.id;

      // Partial payment of $4,000
      const payRes = await recordPayment(companyA, {
        invoiceId,
        amount: 4000.0,
        paymentMethod: "Bank Transfer",
        transactionReference: "TX-4000-PARTIAL",
        paymentDate: "2026-10-12",
      });

      expect(payRes.success).toBe(true);
      expect(payRes.data?.payment_number).toMatch(/^PAY-\d+$/);
      expect(payRes.data?.amount).toBe(4000.0);

      const updatedInv = await getInvoiceById(companyA, invoiceId);
      expect(updatedInv?.amount_paid).toBe(4000.0);
      expect(updatedInv?.amount_due).toBe(6000.0);
      expect(updatedInv?.status).toBe("Partially Paid");
    });

    it("prevents overpayment when payment amount exceeds remaining balance", async () => {
      const invRes = await createInvoice(companyA, {
        customerId: "00000000-0000-0000-0000-000000000001",
        issueDate: "2026-10-12",
        dueDate: "2026-11-12",
        items: [{ description: "Design Consultation", quantity: 1, unitPrice: 1500.0 }],
      });

      const invoiceId = invRes.data!.id;

      // Attempting to pay $2,000 against a $1,500 invoice
      const overpayRes = await recordPayment(companyA, {
        invoiceId,
        amount: 2000.0,
        paymentMethod: "Card",
        paymentDate: "2026-10-12",
      });

      expect(overpayRes.success).toBe(false);
      expect(overpayRes.error).toMatch(/Overpayment Prevented/i);
    });

    it("records full payment and updates invoice status to Paid with zero balance", async () => {
      const invRes = await createInvoice(companyA, {
        customerId: "00000000-0000-0000-0000-000000000001",
        issueDate: "2026-10-12",
        dueDate: "2026-11-12",
        items: [{ description: "Full Project Delivery", quantity: 1, unitPrice: 5000.0 }],
      });

      const invoiceId = invRes.data!.id;

      const payRes = await recordPayment(companyA, {
        invoiceId,
        amount: 5000.0,
        paymentMethod: "Bank Transfer",
        transactionReference: "FULL-5000",
        paymentDate: "2026-10-12",
      });

      expect(payRes.success).toBe(true);

      const updatedInv = await getInvoiceById(companyA, invoiceId);
      expect(updatedInv?.amount_paid).toBe(5000.0);
      expect(updatedInv?.amount_due).toBe(0.0);
      expect(updatedInv?.status).toBe("Paid");
    });

    it("safely voids a payment, preserves audit trail, and restores invoice balance", async () => {
      const invRes = await createInvoice(companyA, {
        customerId: "00000000-0000-0000-0000-000000000001",
        issueDate: "2026-10-12",
        dueDate: "2026-11-12",
        items: [{ description: "Reversible Milestone", quantity: 1, unitPrice: 3500.0 }],
      });

      const invoiceId = invRes.data!.id;

      const payRes = await recordPayment(companyA, {
        invoiceId,
        amount: 3500.0,
        paymentMethod: "Bank Transfer",
        paymentDate: "2026-10-12",
      });

      const paymentId = payRes.data!.id;

      // Void the payment
      const voidRes = await voidPayment(companyA, paymentId, {
        reason: "Wire transfer reversed by bank due to routing error",
      });

      expect(voidRes.success).toBe(true);

      // Verify payment record is preserved in ledger with Voided status
      const payments = await getPayments(companyA, { invoiceId });
      const voidedPay = payments.find((p) => p.id === paymentId);
      expect(voidedPay).toBeDefined();
      expect(voidedPay?.status).toBe("Voided");
      expect(voidedPay?.void_reason).toContain("routing error");

      // Verify invoice balance is restored
      const updatedInv = await getInvoiceById(companyA, invoiceId);
      expect(updatedInv?.amount_paid).toBe(0.0);
      expect(updatedInv?.amount_due).toBe(3500.0);
      expect(updatedInv?.status).toBe("Sent");
    });
  });

  describe("6. Multi-Tenant Isolation & Role Authorization", () => {
    it("denies Company B access to Company A invoices", async () => {
      const invInA = await createInvoice(companyA, {
        customerId: "00000000-0000-0000-0000-000000000001",
        issueDate: "2026-10-12",
        dueDate: "2026-11-12",
        items: [{ description: "Confidential Tenant A Contract", quantity: 1, unitPrice: 9999 }],
      });

      // Query from Company B
      const resultInB = await getInvoiceById(companyB, invInA.data!.id);
      expect(resultInB).toBeNull();
    });

    it("fails closed when caller lacks sales permissions", async () => {
      mockRequirePermission.mockRejectedValueOnce(
        new ForbiddenError("Access Denied: Missing sales:view")
      );

      await expect(getInvoices(companyA)).rejects.toThrow(ForbiddenError);
    });
  });
});
