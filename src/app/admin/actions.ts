"use server";

import { revalidatePath } from "next/cache";
import {
  approveCompany,
  rejectCompany,
  suspendCompany,
  reactivateCompany,
  toggleUserSuperAdmin,
} from "@/lib/super-admin/server";

export interface SuperAdminActionState<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export async function approveCompanyAction(
  companyId: string
): Promise<SuperAdminActionState> {
  try {
    const res = await approveCompany(companyId);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to approve company" };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/companies");
    revalidatePath("/");
    return {
      success: true,
      message: `Company registration successfully approved. Organization is now ACTIVE.`,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected error occurred while approving company",
    };
  }
}

export async function rejectCompanyAction(
  companyId: string,
  reason: string
): Promise<SuperAdminActionState> {
  try {
    if (!reason || !reason.trim()) {
      return { success: false, error: "A valid rejection reason is required." };
    }

    const res = await rejectCompany(companyId, reason.trim());
    if (!res.success) {
      return { success: false, error: res.error || "Failed to reject company" };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/companies");
    return {
      success: true,
      message: "Company registration was rejected and logged.",
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected error occurred while rejecting company",
    };
  }
}

export async function suspendCompanyAction(
  companyId: string,
  reason?: string
): Promise<SuperAdminActionState> {
  try {
    const res = await suspendCompany(companyId, reason);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to suspend company" };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/companies");
    revalidatePath("/");
    return {
      success: true,
      message: "Company account has been SUSPENDED. All member operations locked out.",
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected error occurred while suspending company",
    };
  }
}

export async function reactivateCompanyAction(
  companyId: string
): Promise<SuperAdminActionState> {
  try {
    const res = await reactivateCompany(companyId);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to reactivate company" };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/companies");
    revalidatePath("/");
    return {
      success: true,
      message: "Company account successfully reactivated. Full access restored.",
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected error occurred while reactivating company",
    };
  }
}

export async function toggleSuperAdminAction(
  userId: string,
  isSuperAdmin: boolean
): Promise<SuperAdminActionState> {
  try {
    const res = await toggleUserSuperAdmin(userId, isSuperAdmin);
    if (!res.success) {
      return { success: false, error: res.error || "Failed to toggle Super Admin status" };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    return {
      success: true,
      message: `Super Admin status updated to: ${isSuperAdmin ? "ENABLED" : "REVOKED"}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected error occurred while updating role",
    };
  }
}
