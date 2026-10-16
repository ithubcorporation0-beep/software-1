"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { recordAuditLog } from "@/lib/audit/server";

export type ForgotPasswordState = {
  error?: string | null;
  success?: boolean;
  values?: {
    email?: string;
  };
};

export async function forgotPasswordAction(
  prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = (formData.get("email") as string)?.trim() || "";
  const submittedValues = { email };

  if (!email) {
    return {
      error: "Please enter your registered work email address.",
      values: submittedValues,
    };
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
      values: submittedValues,
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
    if (error) {
      return {
        error: error.message,
        values: submittedValues,
      };
    }

    await recordAuditLog({
      action: "auth.password_reset_requested",
      resource: "auth",
      details: { email: normalizedEmail },
    });

    return { success: true };
  } catch (err: any) {
    return {
      error: err.message || "An unexpected error occurred while requesting password reset.",
      values: submittedValues,
    };
  }
}
