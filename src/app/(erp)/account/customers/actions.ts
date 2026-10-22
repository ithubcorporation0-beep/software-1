"use server";

import { revalidatePath } from "next/cache";
import {
  toggleCustomerStatus,
  bulkDeleteCustomers,
  exportCustomersToCsv,
} from "@/lib/crm/customer-settings";
import { deleteCustomer } from "@/lib/crm/server";
import { CustomerStatus } from "@/types/database.types";

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
