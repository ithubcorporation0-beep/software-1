"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePasswordStrength } from "@/lib/validation/password";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { recordAuditLog } from "@/lib/audit/server";

export type RegisterState = {
  error?: string | null;
  success?: boolean;
};

export async function registerAction(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const companyName = (formData.get("companyName") as string)?.trim();
  const inviteCode = (formData.get("inviteCode") as string)?.trim();

  if (!email || !password || !fullName) {
    return { error: "Full Name, Work Email, and Password are required." };
  }

  // 1. Enforce strict enterprise password policy
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    return { error: passwordValidation.errors[0] };
  }

  // 2. Multi-tenant isolation: Require company name or invitation
  if (!companyName && !inviteCode) {
    return {
      error: "An Organization Name or Invitation Code is required. Uninvited registration is prohibited.",
    };
  }

  // 3. Rate limiting (max 5 registration attempts per 15 mins per IP/email)
  const normalizedEmail = email.toLowerCase();
  const rateLimitKey = `register:${normalizedEmail}`;
  const rateCheck = checkRateLimit(rateLimitKey, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateCheck.allowed) {
    const waitMinutes = Math.ceil((rateCheck.resetTimeMs - Date.now()) / 60000);
    return {
      error: `Too many registration attempts. Please wait ${waitMinutes} minute(s) before trying again.`,
    };
  }

  // 4. Try provisioning via service-role admin client
  try {
    const adminClient = createAdminClient();
    const { data: adminUser, error: adminError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // Auto-confirm so users can sign in immediately
      user_metadata: {
        full_name: fullName,
        requested_company: companyName,
        invite_code: inviteCode,
      },
    });

    if (adminError) {
      if (
        adminError.message.toLowerCase().includes("already registered") ||
        adminError.message.toLowerCase().includes("unique")
      ) {
        return { error: "An account with this email address already exists. Please sign in." };
      }
      if (adminError.message.toLowerCase().includes("fetch failed")) {
        return {
          error: "Unable to reach the registration service. Please verify your internet connection or try again shortly.",
        };
      }
      return { error: adminError.message };
    }

    const userId = adminUser?.user?.id;
    if (userId) {
      // Ensure profile record is inserted
      await adminClient.from("profiles").upsert({
        id: userId,
        email: normalizedEmail,
        full_name: fullName,
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (companyName) {
        // Provision new tenant company in PENDING status for Super Admin review
        const slug =
          companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") +
          "-" +
          Math.floor(100 + Math.random() * 900);

        const { data: newCompany } = await adminClient
          .from("companies")
          .insert({
            name: companyName,
            slug,
            plan: "ENTERPRISE",
            status: "PENDING",
            contact_email: normalizedEmail,
            contact_name: fullName,
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (newCompany?.id) {
          const adminRoleId = "00000000-0000-0000-0000-000000000002"; // Company Admin

          await adminClient.from("memberships").upsert(
            {
              company_id: newCompany.id,
              user_id: userId,
              role_id: adminRoleId,
              status: "ACTIVE",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "company_id,user_id" }
          );
        }
      }

      await recordAuditLog({
        userId,
        action: "auth.register",
        resource: "users",
        resourceId: userId,
        details: { email: normalizedEmail, company: companyName || "invited" },
      });
    }

    return { success: true };
  } catch {
    // Fallback to standard Supabase client signUp
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            requested_company: companyName,
            invite_code: inviteCode,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (fallbackErr: any) {
      const errMsg = fallbackErr?.message || "";
      const isNetworkError = errMsg.toLowerCase().includes("fetch failed");
      return {
        error: isNetworkError
          ? "Unable to reach the registration service. Please check your internet connection and try again."
          : errMsg || "An unexpected error occurred during account creation.",
      };
    }
  }
}
