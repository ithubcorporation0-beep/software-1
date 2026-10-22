"use server";

import { revalidatePath } from "next/cache";
import {
  toggleCustomerStatus,
  bulkDeleteCustomers,
  exportCustomersToCsv,
  createCustomerGroup,
  updateCustomerGroup,
  deleteCustomerGroup,
  createCustomerCategory,
  updateCustomerCategory,
  deleteCustomerCategory,
  importCustomersFromCsv,
} from "@/lib/crm/customer-settings";
import { deleteCustomer } from "@/lib/crm/server";
import {
  getCustomerPayments,
  createCustomerPayment,
  updateCustomerPaymentStatus,
  deleteCustomerPayment,
  recordBatchPayments,
  getCustomerLedger,
} from "@/lib/crm/customer-payments";
import { CustomerStatus, CustomerGroup, CustomerCategory, CustomerPayment, CustomerPaymentStatus } from "@/types/database.types";

export interface ActionState<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export async function toggleCustomerStatusAction(
  companyId: string,
  customerId: string,
  targetStatus?: "Active" | "Inactive" | "Disabled"
): Promise<ActionState<{ newStatus?: CustomerStatus }>> {
  try {
    const res = await toggleCustomerStatus(companyId, customerId, targetStatus);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to toggle status" };
    }
    revalidatePath("/account/customers");
    revalidatePath("/crm");
    return {
      success: true,
      message: `Status updated to ${res.newStatus}`,
      data: { newStatus: res.newStatus },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to toggle customer status" };
  }
}

export async function bulkDeleteCustomersAction(
  companyId: string,
  customerIds: string[]
): Promise<ActionState<{ deletedCount: number }>> {
  try {
    const res = await bulkDeleteCustomers(companyId, customerIds);
    if (!res.success) {
      return {
        success: false,
        error: res.errors?.join(", ") || "Failed to delete selected customers",
      };
    }
    revalidatePath("/account/customers");
    revalidatePath("/crm");
    return {
      success: true,
      message: `Successfully deleted ${res.deletedCount} customer(s)`,
      data: { deletedCount: res.deletedCount },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Bulk delete failed" };
  }
}

export async function deleteCustomerAccountAction(
  companyId: string,
  customerId: string
): Promise<ActionState> {
  try {
    const res = await deleteCustomer(companyId, customerId);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to delete customer" };
    }
    revalidatePath("/account/customers");
    revalidatePath("/crm");
    return { success: true, message: "Customer deleted successfully" };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete customer" };
  }
}

export async function exportCustomersCsvAction(
  companyId: string
): Promise<ActionState<string>> {
  try {
    const csv = await exportCustomersToCsv(companyId);
    return { success: true, data: csv };
  } catch (err: any) {
    return { success: false, error: err.message || "Export failed" };
  }
}

export async function createCustomerGroupAction(
  companyId: string,
  data: { name: string; description?: string }
): Promise<ActionState<CustomerGroup>> {
  try {
    const res = await createCustomerGroup(companyId, data);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to create group" };
    }
    revalidatePath("/account/customer-groups");
    revalidatePath("/account/customers");
    return { success: true, data: res.data, message: "Customer group created successfully" };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create customer group" };
  }
}

export async function updateCustomerGroupAction(
  companyId: string,
  groupId: string,
  data: { name: string; description?: string }
): Promise<ActionState<CustomerGroup>> {
  try {
    const res = await updateCustomerGroup(companyId, groupId, data);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to update group" };
    }
    revalidatePath("/account/customer-groups");
    revalidatePath("/account/customers");
    return { success: true, data: res.data, message: "Customer group updated successfully" };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update customer group" };
  }
}

export async function deleteCustomerGroupAction(
  companyId: string,
  groupId: string
): Promise<ActionState> {
  try {
    const res = await deleteCustomerGroup(companyId, groupId);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to delete group" };
    }
    revalidatePath("/account/customer-groups");
    revalidatePath("/account/customers");
    return { success: true, message: "Customer group deleted successfully" };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete customer group" };
  }
}

export async function createCustomerCategoryAction(
  companyId: string,
  data: { name: string; description?: string }
): Promise<ActionState<CustomerCategory>> {
  try {
    const res = await createCustomerCategory(companyId, data);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to create category" };
    }
    revalidatePath("/account/customer-categories");
    revalidatePath("/account/customers");
    return { success: true, data: res.data, message: "Customer category created successfully" };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create customer category" };
  }
}

export async function updateCustomerCategoryAction(
  companyId: string,
  categoryId: string,
  data: { name: string; description?: string }
): Promise<ActionState<CustomerCategory>> {
  try {
    const res = await updateCustomerCategory(companyId, categoryId, data);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to update category" };
    }
    revalidatePath("/account/customer-categories");
    revalidatePath("/account/customers");
    return { success: true, data: res.data, message: "Customer category updated successfully" };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update customer category" };
  }
}

export async function deleteCustomerCategoryAction(
  companyId: string,
  categoryId: string
): Promise<ActionState> {
  try {
    const res = await deleteCustomerCategory(companyId, categoryId);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to delete category" };
    }
    revalidatePath("/account/customer-categories");
    revalidatePath("/account/customers");
    return { success: true, message: "Customer category deleted successfully" };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete customer category" };
  }
}

export async function importCustomersFromCsvAction(
  companyId: string,
  csvText: string,
  commit: boolean = false
): Promise<ActionState<{ totalRows: number; validRows: number; errorRows: Array<{ row: number; reason: string }>; insertedCount: number }>> {
  try {
    const res = await importCustomersFromCsv(companyId, csvText, commit);
    if (commit) {
      revalidatePath("/account/customers");
      revalidatePath("/crm");
    }
    return {
      success: true,
      message: commit
        ? `Successfully imported ${res.insertedCount} customer(s)`
        : `Validated ${res.validRows} valid rows out of ${res.totalRows}`,
      data: res,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "CSV Import failed" };
  }
}

export async function getCustomerPaymentsAction(
  companyId: string
): Promise<ActionState<CustomerPayment[]>> {
  try {
    const data = await getCustomerPayments(companyId);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load payments" };
  }
}

export async function createCustomerPaymentAction(
  companyId: string,
  payload: any
): Promise<ActionState<CustomerPayment>> {
  try {
    const res = await createCustomerPayment(companyId, payload);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to create payment" };
    }
    revalidatePath("/account/customer-payments");
    revalidatePath("/account/customers");
    revalidatePath("/crm");
    return { success: true, data: res.data, message: `Payment ${res.data?.payment_number} recorded successfully.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record payment" };
  }
}

export async function updateCustomerPaymentStatusAction(
  companyId: string,
  id: string,
  status: CustomerPaymentStatus
): Promise<ActionState> {
  try {
    const res = await updateCustomerPaymentStatus(companyId, id, status);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to update status" };
    }
    revalidatePath("/account/customer-payments");
    return { success: true, message: `Payment status marked as ${status}.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update payment status" };
  }
}

export async function deleteCustomerPaymentAction(
  companyId: string,
  id: string
): Promise<ActionState> {
  try {
    const res = await deleteCustomerPayment(companyId, id);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to delete payment" };
    }
    revalidatePath("/account/customer-payments");
    return { success: true, message: "Payment record deleted." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete payment" };
  }
}

export async function recordBatchPaymentsAction(
  companyId: string,
  items: Array<{ customer_id: string; customer_name: string; amount: number; reference?: string }>
): Promise<ActionState<{ processedCount: number; errors?: string[] }>> {
  try {
    const res = await recordBatchPayments(companyId, items);
    if (!res.success) {
      return { success: false, error: res.errors?.join("; ") || "Batch payment failed" };
    }
    revalidatePath("/account/customer-payments");
    revalidatePath("/account/customers");
    return { success: true, data: { processedCount: res.processedCount, errors: res.errors }, message: `Processed ${res.processedCount} batch payments.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Batch payment failed" };
  }
}

export async function getCustomerLedgerAction(
  companyId: string,
  customerId?: string
): Promise<ActionState<any>> {
  try {
    const data = await getCustomerLedger(companyId, customerId);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch ledger" };
  }
}
