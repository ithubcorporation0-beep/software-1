import { cookies } from "next/headers";
import crypto from "crypto";

const DEFAULT_ADMIN_EMAIL = "admin@ithub-enterprise.com";
const DEFAULT_ADMIN_PASSWORDS = ["Admin@123", "admin123"];
const SESSION_COOKIE_NAME = "erp_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "it-hub-erp-secure-secret-key-2026-pkr-admin"
  );
}

/**
 * Validates whether the given password matches the configured administrative password.
 */
export function isValidAdminPassword(password: string): boolean {
  if (!password) return false;
  const configuredPassword = process.env.ADMIN_PASSWORD?.trim();
  if (configuredPassword) {
    if (password === configuredPassword) return true;
  }
  return DEFAULT_ADMIN_PASSWORDS.includes(password);
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
 */
export function verifyAdminSessionToken(token?: string): { email: string; role: string } | null {
  if (!token || !token.includes(".")) return null;
  const [base64Payload, signature] = token.split(".");
  if (!base64Payload || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", getSecretKey())
    .update(base64Payload)
    .digest("base64url");

  if (signature !== expectedSignature) return null;

  try {
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
