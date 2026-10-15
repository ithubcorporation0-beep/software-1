import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAuditLog, checkSecurityAnomalies } from "@/lib/audit/server";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limiter";
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

    const normalizedEmail = email.trim().toLowerCase();
    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || null;

    // 1. Rate Limiting Check (5 attempts per 15 minutes per email/IP)
    const rateLimitKey = `login:${normalizedEmail}:${ipAddress}`;
    const rateCheck = checkRateLimit(rateLimitKey, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateCheck.allowed) {
      const waitMinutes = Math.ceil((rateCheck.resetTimeMs - Date.now()) / 60000);
      await recordAuditLog({
        action: "auth.rate_limited",
        resource: "auth",
        details: { email: normalizedEmail, reason: "Too many failed attempts" },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please wait ${waitMinutes} minute(s) before trying again.`,
        },
        { status: 429 }
      );
    }

    // 2. Direct administrative authentication check
    if (isValidAdminPassword(password)) {
      const adminEmail = email.includes("@") ? email.trim() : DEFAULT_ADMIN_EMAIL;
      await setAdminSession(adminEmail);
      resetRateLimit(rateLimitKey);

      await recordAuditLog({
        userId: "392c9ef9-a33e-4387-9c16-6a56b81f2191",
        action: "auth.login_admin",
        resource: "auth",
        resourceId: "392c9ef9-a33e-4387-9c16-6a56b81f2191",
        details: { email: adminEmail, method: "admin_token" },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        user: {
          id: "392c9ef9-a33e-4387-9c16-6a56b81f2191",
          email: adminEmail,
        },
      });
    }

    // 3. Supabase Auth
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      checkSecurityAnomalies(normalizedEmail);
      await recordAuditLog({
        action: "auth.login_failed",
        resource: "auth",
        details: { email: normalizedEmail, error: error.message },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    // Successful login: reset rate limit counter
    resetRateLimit(rateLimitKey);

    // Record audit event
    await recordAuditLog({
      userId: data.user.id,
      action: "auth.login",
      resource: "auth",
      resourceId: data.user.id,
      details: { email: data.user.email, method: "password" },
      ipAddress,
      userAgent,
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
