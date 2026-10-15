import { cookies } from "next/headers";
import crypto from "crypto";

const DEFAULT_ADMIN_EMAIL = "admin@ithub-enterprise.com";
const SESSION_COOKIE_NAME = "erp_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Security Exception: ADMIN_SESSION_SECRET must be configured in production environments."
      );
    }
    return "dev-only-local-secret-do-not-use-in-production-random-hash-key";
  }
  return secret;
}

/**
 * Validates whether the given password matches the configured administrative password.
 * Evaluated in constant time using crypto.timingSafeEqual to prevent side-channel timing attacks.
 * Never allows hardcoded or default backdoor passwords.
 */
export function isValidAdminPassword(password: string): boolean {
  if (!password) return false;
  const configuredPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!configuredPassword) {
    return false;
  }

  const passBuffer = Buffer.from(password, "utf8");
  const configBuffer = Buffer.from(configuredPassword, "utf8");

  if (passBuffer.length !== configBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(passBuffer, configBuffer);
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  if (email.toLowerCase().trim() !== adminEmail.toLowerCase().trim()) {
    return false;
  }
  return isValidAdminPassword(password);
}

/**
 * Creates a cryptographically signed session token for the administrator.
 */
export function createAdminSessionToken(email: string = DEFAULT_ADMIN_EMAIL): string {
  const payload = {
    email: email.trim().toLowerCase(),
    role: "super_admin",
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const jsonStr = JSON.stringify(payload);
  const base64Payload = Buffer.from(jsonStr).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecretKey())
    .update(base64Payload)
    .digest("base64url");
  return `${base64Payload}.${signature}`;
}

/**
 * Verifies the integrity and expiration of an administrative session token.
 * Uses constant-time comparison to prevent timing forgery.
 */
export function verifyAdminSessionToken(token?: string): { email: string; role: string } | null {
  if (!token || !token.includes(".")) return null;
  const [base64Payload, signature] = token.split(".");
  if (!base64Payload || !signature) return null;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", getSecretKey())
      .update(base64Payload)
      .digest("base64url");

    const sigBuffer = Buffer.from(signature, "utf8");
    const expBuffer = Buffer.from(expectedSignature, "utf8");

    if (sigBuffer.length !== expBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      return null;
    }

    const jsonStr = Buffer.from(base64Payload, "base64url").toString("utf8");
    const payload = JSON.parse(jsonStr);
    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return {
      email: payload.email || DEFAULT_ADMIN_EMAIL,
      role: payload.role || "super_admin",
    };
  } catch {
    return null;
  }
}

/**
 * Helper to set the admin session cookie in a Server Action or Route Handler.
 */
export async function setAdminSession(email?: string) {
  const token = createAdminSessionToken(email);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Helper to clear the admin session cookie.
 */
export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export { SESSION_COOKIE_NAME, DEFAULT_ADMIN_EMAIL };
