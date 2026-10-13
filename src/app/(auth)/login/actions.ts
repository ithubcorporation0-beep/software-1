"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isValidAdminPassword,
  setAdminSession,
  DEFAULT_ADMIN_EMAIL,
} from "@/lib/auth/admin-session";

export type LoginState = {
  error?: string | null;
};

export async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/";

  if (!email || !password) {
    return { error: "Please enter both your email/username and password." };
  }

  // 1. Direct administrative authentication via configured admin password
  if (isValidAdminPassword(password)) {
    const adminEmail = email.includes("@") ? email : DEFAULT_ADMIN_EMAIL;
    await setAdminSession(adminEmail);
    redirect(redirectTo);
  }

  // 2. Otherwise, attempt authentication via Supabase
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    return {
      error: err.message || "An unexpected error occurred during login.",
    };
  }

  // Next.js redirect must be called outside try/catch because it throws NEXT_REDIRECT
  redirect(redirectTo);
}
