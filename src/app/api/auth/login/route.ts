import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/audit/server";
import {
  isValidAdminPassword,
  setAdminSession,
  DEFAULT_ADMIN_EMAIL,
} from "@/lib/auth/admin-session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (isValidAdminPassword(password)) {
      const adminEmail = email.includes("@") ? email.trim() : DEFAULT_ADMIN_EMAIL;
      await setAdminSession(adminEmail);
      return NextResponse.json({
        success: true,
        user: {
          id: "392c9ef9-a33e-4387-9c16-6a56b81f2191",
          email: adminEmail,
        },
      });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    // Record audit event
    await recordAuditLog({
      userId: data.user.id,
      action: "auth.login",
      resource: "auth",
      resourceId: data.user.id,
      details: { email: data.user.email, method: "password" },
      userAgent: request.headers.get("user-agent") || null,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
