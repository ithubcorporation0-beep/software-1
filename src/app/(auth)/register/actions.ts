"use server";

import { createClient } from "@/lib/supabase/server";

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
