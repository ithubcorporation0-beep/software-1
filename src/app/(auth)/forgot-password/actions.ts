"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { recordAuditLog } from "@/lib/audit/server";

export type ForgotPasswordState = {
  error?: string | null;
  success?: boolean;
};

export async function forgotPasswordAction(
  prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = (formData.get("email") as string)?.trim();
  if (!email) {
    return { error: "Please enter your registered company email address." };
  }

  const normalizedEmail = email.toLowerCase();
  const rateLimitKey = `forgot-password:${normalizedEmail}`;
  const rateCheck = checkRateLimit(rateLimitKey, {
    maxRequests: 3,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateCheck.allowed) {
    const waitMinutes = Math.ceil((rateCheck.resetTimeMs - Date.now()) / 60000);
    return {
      error: `Too many password reset requests. Please wait ${waitMinutes} minute(s) before trying again.`,
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
    if (error) {
      return { error: error.message };
    }

    await recordAuditLog({
      action: "auth.password_reset_requested",
      resource: "auth",
      details: { email: normalizedEmail },
    });

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred." };
  }
}
