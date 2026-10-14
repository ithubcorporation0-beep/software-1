"use server";

import { revalidatePath } from "next/cache";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  syncSystemNotifications,
} from "@/lib/notifications/server";

export interface ActionState<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export async function fetchNotificationsAction(
  companyId: string,
  userId?: string,
  options?: { limit?: number; sync?: boolean }
): Promise<ActionState> {
  try {
    if (options?.sync) {
      await syncSystemNotifications(companyId);
    }
    const notifications = await getUserNotifications(companyId, userId, {
      limit: options?.limit || 15,
    });
    return {
      success: true,
      data: notifications,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to load notifications",
    };
  }
}

export async function markNotificationReadAction(
  companyId: string,
  notificationId: string
): Promise<ActionState> {
  try {
    const updated = await markNotificationAsRead(companyId, notificationId);
    revalidatePath("/", "layout");
    return {
      success: true,
      data: updated,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to mark notification as read",
    };
  }
}

export async function markAllNotificationsReadAction(
  companyId: string,
  userId?: string
): Promise<ActionState> {
  try {
    const count = await markAllNotificationsAsRead(companyId, userId);
    revalidatePath("/", "layout");
    return {
      success: true,
      message: `Marked ${count} notifications as read`,
      data: count,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to mark all as read",
    };
  }
}

export async function updatePreferencesAction(
  companyId: string,
  userId: string,
  updates: any
): Promise<ActionState> {
  try {
    const pref = await updateUserNotificationPreferences(companyId, userId, updates);
    return {
      success: true,
      message: "Notification preferences updated",
      data: pref,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to update preferences",
    };
  }
}
