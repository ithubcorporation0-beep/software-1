"use server";

import { revalidatePath } from "next/cache";
import {
  createCustomer,
  updateCustomer,
  archiveCustomer,
  deleteCustomer,
  addCustomerNote,
  createLead,
  updateLead,
  moveLeadStage,
} from "@/lib/crm/server";
import { LeadStatus } from "@/types/database.types";

export interface ActionState<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  data?: T;
}

/**
 * Server Action for creating a new Customer.
 */
export async function createCustomerAction(
  companyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const rawData = {
      customerCode: (formData.get("customerCode") as string) || undefined,
      name: (formData.get("name") as string) || "",
      companyName: (formData.get("companyName") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      whatsapp: (formData.get("whatsapp") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      city: (formData.get("city") as string) || undefined,
      country: (formData.get("country") as string) || "US",
      taxNumber: (formData.get("taxNumber") as string) || undefined,
      customerType: (formData.get("customerType") as any) || "B2B",
      status: (formData.get("status") as any) || "Active",
      notes: (formData.get("notes") as string) || undefined,
    };

    const res = await createCustomer(companyId, rawData);
    if (!res.success) {
      return {
        success: false,
        error: res.error || "Failed to create customer",
        errors: res.errors,
      };
    }

    revalidatePath("/crm");
    revalidatePath(`/crm/customers/${res.data?.id}`);
    return {
      success: true,
      message: `Customer ${res.data?.name} successfully created.`,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to create customer",
    };
  }
}

/**
 * Server Action for updating an existing Customer.
 */
export async function updateCustomerAction(
  companyId: string,
  customerId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const rawData = {
      name: (formData.get("name") as string) || "",
      companyName: (formData.get("companyName") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      whatsapp: (formData.get("whatsapp") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      city: (formData.get("city") as string) || undefined,
      country: (formData.get("country") as string) || "US",
      taxNumber: (formData.get("taxNumber") as string) || undefined,
      customerType: (formData.get("customerType") as any) || "B2B",
      status: (formData.get("status") as any) || "Active",
      notes: (formData.get("notes") as string) || undefined,
    };

    const res = await updateCustomer(companyId, customerId, rawData);
    if (!res.success) {
      return {
        success: false,
        error: res.error || "Failed to update customer",
        errors: res.errors,
      };
    }

    revalidatePath("/crm");
    revalidatePath(`/crm/customers/${customerId}`);
    return {
      success: true,
      message: `Customer profile updated successfully.`,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to update customer",
    };
  }
}

/**
 * Server Action for archiving a Customer.
 */
export async function archiveCustomerAction(
  companyId: string,
  customerId: string
): Promise<ActionState> {
  try {
    const res = await archiveCustomer(companyId, customerId);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to archive customer" };
    }

    revalidatePath("/crm");
    revalidatePath(`/crm/customers/${customerId}`);
    return {
      success: true,
      message: "Customer status moved to Archived.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to archive customer" };
  }
}

/**
 * Server Action for safely deleting a Customer.
 */
export async function deleteCustomerAction(
  companyId: string,
  customerId: string
): Promise<ActionState> {
  try {
    const res = await deleteCustomer(companyId, customerId);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to delete customer" };
    }

    revalidatePath("/crm");
    return {
      success: true,
      message: "Customer successfully deleted.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete customer" };
  }
}

/**
 * Server Action for adding an internal note to a Customer.
 */
export async function addCustomerNoteAction(
  companyId: string,
  customerId: string,
  formData: FormData
): Promise<ActionState> {
  try {
    const content = (formData.get("content") as string) || "";
    const res = await addCustomerNote(companyId, customerId, content);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to add note" };
    }

    revalidatePath(`/crm/customers/${customerId}`);
    return {
      success: true,
      message: "Note successfully appended to customer timeline.",
      data: res.data,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add note" };
  }
}

/**
 * Server Action for creating a new Lead.
 */
export async function createLeadAction(
  companyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const rawData = {
      leadCode: (formData.get("leadCode") as string) || undefined,
      name: (formData.get("name") as string) || "",
      companyName: (formData.get("companyName") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      source: (formData.get("source") as any) || "Website",
      assignedTo: (formData.get("assignedTo") as string) || undefined,
      status: (formData.get("status") as any) || "New",
      expectedValue: Number(formData.get("expectedValue") || 0),
      notes: (formData.get("notes") as string) || undefined,
      followUpDate: (formData.get("followUpDate") as string) || undefined,
    };

    const res = await createLead(companyId, rawData);
    if (!res.success) {
      return {
        success: false,
        error: res.error || "Failed to create lead",
        errors: res.errors,
      };
    }

    revalidatePath("/crm");
    return {
      success: true,
      message: `Lead ${res.data?.name} successfully created.`,
      data: res.data,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create lead" };
  }
}

/**
 * Server Action for moving a Lead stage in the Kanban board.
 */
export async function moveLeadStageAction(
  companyId: string,
  leadId: string,
  newStage: LeadStatus,
  lostReason?: string
): Promise<ActionState> {
  try {
    const res = await moveLeadStage(companyId, leadId, newStage, lostReason);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to move stage" };
    }

    revalidatePath("/crm");
    return {
      success: true,
      message: `Lead moved to stage: ${newStage}.`,
      data: res.data,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update lead stage" };
  }
}

/**
 * Server Action for updating a Lead.
 */
export async function updateLeadAction(
  companyId: string,
  leadId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const rawData = {
      name: (formData.get("name") as string) || "",
      companyName: (formData.get("companyName") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      source: (formData.get("source") as any) || "Website",
      assignedTo: (formData.get("assignedTo") as string) || undefined,
      status: (formData.get("status") as any) || "New",
      expectedValue: Number(formData.get("expectedValue") || 0),
      notes: (formData.get("notes") as string) || undefined,
      followUpDate: (formData.get("followUpDate") as string) || undefined,
      lostReason: (formData.get("lostReason") as string) || undefined,
    };

    const res = await updateLead(companyId, leadId, rawData);
    if (!res.success) {
      return {
        success: false,
        error: res.error || "Failed to update lead",
        errors: res.errors,
      };
    }

    revalidatePath("/crm");
    return {
      success: true,
      message: "Lead updated successfully.",
      data: res.data,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update lead" };
  }
}
