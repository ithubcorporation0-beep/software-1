"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long." };
  }

  // 1. Try provisioning via service-role admin client (auto-confirm email + assign tenant membership)
  try {
    const adminClient = createAdminClient();
    const { data: adminUser, error: adminError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        requested_company: companyName,
        invite_code: inviteCode,
      },
    });

    if (adminError) {




      if (adminError.message.toLowerCase().includes("already registered") || adminError.message.toLowerCase().includes("unique")) {
        return { error: "An account with this email address already exists. Please sign in." };
      }
      return { error: adminError.message };
    }

    const userId = adminUser?.user?.id;
    if (userId) {
      // Ensure profile record is inserted
      await adminClient.from("profiles").upsert({
        id: userId,
        email,
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
            contact_email: email,
            contact_name: fullName,
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        const targetCompanyId =
          newCompany?.id || process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || "00000000-0000-0000-0000-000000000001";
        const adminRoleId = "00000000-0000-0000-0000-000000000002"; // Company Admin

        await adminClient.from("memberships").upsert(
          {
            company_id: targetCompanyId,
            user_id: userId,
            role_id: adminRoleId,
            status: "ACTIVE",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id,user_id" }
        );
      } else {
        // Assign membership in default tenant company
        const defaultCompanyId =
          process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || "00000000-0000-0000-0000-000000000001";
        const employeeRoleId = "00000000-0000-0000-0000-000000000006";

        await adminClient.from("memberships").upsert(
          {
            company_id: defaultCompanyId,
            user_id: userId,
            role_id: employeeRoleId,
            status: "ACTIVE",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id,user_id" }
        );
      }
    }

    return { success: true };
  } catch {
    // 2. Fallback to standard Supabase client signUp
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.signUp({
        email,
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
    } catch (err: any) {
      return { error: err.message || "An unexpected error occurred during registration." };
    }
  }
}
