"use server";

import { revalidatePath } from "next/cache";
import {
  createQuotation,
  convertQuotationToSalesOrder,
  createSalesOrder,
  convertSalesOrderToInvoice,
  createInvoice,
  recordPayment,
  voidPayment,
} from "@/lib/sales/server";

export interface ActionState<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function createQuotationAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const res = await createQuotation(companyId, payload);
    if (!res.success) {
      return {
        success: false,
        message: res.error || "Failed to create quotation",
        errors: res.errors,
      };
    }
    revalidatePath("/sales");
    return {
      success: true,
      message: `Quotation ${res.data?.quotation_number} generated successfully.`,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "An unexpected error occurred while creating quotation",
    };
  }
}

export async function convertQuotationToSalesOrderAction(
  companyId: string,
  quotationId: string
): Promise<ActionState> {
  try {
    const res = await convertQuotationToSalesOrder(companyId, quotationId);
    if (!res.success) {
      return {
        success: false,
        message: res.error || "Failed to convert quotation to sales order",
      };
    }
    revalidatePath("/sales");
    return {
      success: true,
      message: `Sales Order ${res.data?.order_number} successfully created from quote.`,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to convert quotation",
    };
  }
}

export async function createSalesOrderAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const res = await createSalesOrder(companyId, payload);
    if (!res.success) {
      return {
        success: false,
        message: res.error || "Failed to create sales order",
        errors: res.errors,
      };
    }
    revalidatePath("/sales");
    return {
      success: true,
      message: `Sales Order ${res.data?.order_number} created successfully.`,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "An unexpected error occurred while creating sales order",
    };
  }
}

export async function convertSalesOrderToInvoiceAction(
  companyId: string,
  orderId: string
): Promise<ActionState> {
  try {
    const res = await convertSalesOrderToInvoice(companyId, orderId);
    if (!res.success) {
      return {
        success: false,
        message: res.error || "Failed to convert sales order to invoice",
      };
    }
    revalidatePath("/sales");
    return {
      success: true,
      message: `Commercial Invoice ${res.data?.invoice_number} created successfully.`,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to convert sales order to invoice",
    };
  }
}

export async function createInvoiceAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const res = await createInvoice(companyId, payload);
    if (!res.success) {
      return {
        success: false,
        message: res.error || "Failed to create invoice",
        errors: res.errors,
      };
    }
    revalidatePath("/sales");
    return {
      success: true,
      message: `Invoice ${res.data?.invoice_number} created successfully.`,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "An unexpected error occurred while creating invoice",
    };
  }
}

export async function recordPaymentAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const res = await recordPayment(companyId, payload);
    if (!res.success) {
      return {
        success: false,
        message: res.error || "Failed to record payment",
      };
    }
    revalidatePath("/sales");
    return {
      success: true,
      message: `Payment ${res.data?.payment_number} ($${res.data?.amount.toFixed(2)}) recorded successfully.`,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "An unexpected error occurred while recording payment",
    };
  }
}

export async function voidPaymentAction(
  companyId: string,
  paymentId: string,
  reason: string
): Promise<ActionState> {
  try {
    const res = await voidPayment(companyId, paymentId, { reason });
    if (!res.success) {
      return {
        success: false,
        message: res.error || "Failed to void payment",
      };
    }
    revalidatePath("/sales");
    return {
      success: true,
      message: "Payment successfully voided and invoice balance safely restored.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "An unexpected error occurred while voiding payment",
    };
  }
}

import {
  submitInvoiceToFbrService,
  getInvoiceFbrPreview,
  reconcileInvoiceFbrStatusService,
  createCreditNoteForFbrService,
  createDebitNoteForFbrService,
  cancelFbrInvoiceService,
  getInvoiceFbrSubmissionHistory,
} from "@/lib/fbr-service";
import { getCurrentUser, requireCompanyMembership, requirePermission } from "@/lib/auth/server";

export async function submitInvoiceToFbrAction(companyId: string, invoiceId: string) {
  const user = await getCurrentUser();
  if (user) {
    await requireCompanyMembership(companyId, user);
    await requirePermission(companyId, "invoices:edit", user);
  }
  return await submitInvoiceToFbrService(companyId, invoiceId);
}

export async function getInvoiceFbrPreviewAction(companyId: string, invoiceId: string) {
  const user = await getCurrentUser();
  if (user) {
    await requireCompanyMembership(companyId, user);
    await requirePermission(companyId, "invoices:view", user);
  }
  return await getInvoiceFbrPreview(companyId, invoiceId);
}

export async function reconcileInvoiceFbrStatusAction(companyId: string, invoiceId: string) {
  const user = await getCurrentUser();
  if (user) {
    await requireCompanyMembership(companyId, user);
    await requirePermission(companyId, "invoices:edit", user);
  }
  return await reconcileInvoiceFbrStatusService(companyId, invoiceId);
}

export async function createCreditNoteForFbrAction(
  companyId: string,
  invoiceId: string,
  reason: string,
  creditAmount?: number
) {
  const user = await getCurrentUser();
  if (user) {
    await requireCompanyMembership(companyId, user);
    await requirePermission(companyId, "invoices:edit", user);
  }
  return await createCreditNoteForFbrService(companyId, invoiceId, { reason, creditAmount });
}

export async function createDebitNoteForFbrAction(
  companyId: string,
  invoiceId: string,
  reason: string,
  debitAmount: number
) {
  const user = await getCurrentUser();
  if (user) {
    await requireCompanyMembership(companyId, user);
    await requirePermission(companyId, "invoices:edit", user);
  }
  return await createDebitNoteForFbrService(companyId, invoiceId, { reason, debitAmount });
}

export async function cancelFbrInvoiceAction(
  companyId: string,
  invoiceId: string,
  reason: string
) {
  const user = await getCurrentUser();
  if (user) {
    await requireCompanyMembership(companyId, user);
    await requirePermission(companyId, "invoices:delete", user);
  }
  return await cancelFbrInvoiceService(companyId, invoiceId, reason);
}

export async function getInvoiceFbrSubmissionHistoryAction(
  companyId: string,
  invoiceId: string
) {
  const user = await getCurrentUser();
  if (user) {
    await requireCompanyMembership(companyId, user);
    await requirePermission(companyId, "invoices:view", user);
  }
  return await getInvoiceFbrSubmissionHistory(companyId, invoiceId);
}


