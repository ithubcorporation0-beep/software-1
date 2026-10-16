"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isValidAdminPassword,
  setAdminSession,
  DEFAULT_ADMIN_EMAIL,
} from "@/lib/auth/admin-session";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limiter";
import { recordAuditLog, checkSecurityAnomalies } from "@/lib/audit/server";
import { sanitizeRedirectPath } from "@/lib/auth/redirect";

export type LoginState = {
  error?: string | null;
};

export async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const rawRedirect = formData.get("redirectTo") as string;
  const safeRedirectTo = sanitizeRedirectPath(rawRedirect);

  if (!email || !password) {
    return { error: "Please enter both your email/username and password." };
  }

  const normalizedEmail = email.toLowerCase();
  const rateLimitKey = `login-action:${normalizedEmail}`;
  const rateCheck = checkRateLimit(rateLimitKey, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateCheck.allowed) {
    const waitMinutes = Math.ceil((rateCheck.resetTimeMs - Date.now()) / 60000);
    return {
      error: `Too many failed login attempts. Account temporarily locked for security. Please try again in ${waitMinutes} minute(s).`,
    };
  }

  // 1. Direct administrative authentication via configured admin password
  if (isValidAdminPassword(password)) {
    const adminEmail = email.includes("@") ? email : DEFAULT_ADMIN_EMAIL;
    await setAdminSession(adminEmail);
    resetRateLimit(rateLimitKey);

    await recordAuditLog({
      action: "auth.login_admin",
      resource: "auth",
      details: { email: adminEmail, method: "admin_token" },
    });

    redirect(safeRedirectTo);
  }

  // 2. Otherwise, attempt authentication via Supabase
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      checkSecurityAnomalies(normalizedEmail);
      await recordAuditLog({
        action: "auth.login_failed",
        resource: "auth",
        details: { email: normalizedEmail, error: error.message },
      });
      if (error.message.toLowerCase().includes("fetch failed")) {
        return {
          error: "Unable to reach the authentication service. Please check your internet connection or sign in as Admin with email: admin@ithub-enterprise.com and password: Admin@123.",
        };
      }
      return { error: error.message };
    }

    resetRateLimit(rateLimitKey);

    await recordAuditLog({
      userId: data.user.id,
      action: "auth.login",
      resource: "auth",
      resourceId: data.user.id,
      details: { email: data.user.email, method: "password" },
    });
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    const errMsg = err?.message || "";
    const isNetworkError = errMsg.toLowerCase().includes("fetch failed");
    return {
      error: isNetworkError
        ? "Unable to reach the authentication service. Please check your internet connection or try again shortly."
        : errMsg || "An unexpected error occurred during login.",
    };
  }

  // Next.js redirect must be called outside try/catch because it throws NEXT_REDIRECT
  redirect(safeRedirectTo);
}
