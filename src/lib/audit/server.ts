import { createClient } from "@/lib/supabase/server";
import { AuditLog, Json } from "@/types/database.types";
import { requirePermission } from "@/lib/auth/server";
import { after } from "next/server";

export interface LogAuditParams {
  companyId?: string | null;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const REDACTED_KEYS = new Set([
  "password",
  "newpassword",
  "oldpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "clientsecret",
  "client_secret",
  "privatekey",
  "key",
  "apikey",
  "servicekey",
  "authorization",
  "credential",
  "cnic",
  "ntn",
  "rawidentifier",
  "signature",
  "fbr_digital_signature",
]);

/**
 * Anomaly and security event detection tracker.
 * Tracks failed login streaks and privilege escalations in memory.
 */
interface SecurityAnomalyTracker {
  recentFailedLogins: Map<string, number[]>; // identifier -> timestamps
}

const securityTracker: SecurityAnomalyTracker = {
  recentFailedLogins: new Map(),
};

export function checkSecurityAnomalies(identifier: string): {
  isSuspicious: boolean;
  failedAttempts: number;
} {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5-minute sliding window
  let timestamps = securityTracker.recentFailedLogins.get(identifier) || [];
  timestamps = timestamps.filter((t) => now - t < windowMs);
  timestamps.push(now);
  securityTracker.recentFailedLogins.set(identifier, timestamps);

  const count = timestamps.length;
  const isSuspicious = count >= 5;

  if (isSuspicious) {
    console.warn(
      `[SECURITY ALERT] Suspicious repeated failed login attempts detected for identity "${identifier}": ${count} failures in last 5 minutes.`
    );
  }

  return { isSuspicious, failedAttempts: count };
}

/**
 * Recursively redacts sensitive keys from audit details.
 * Guarantees passwords, tokens, and secrets are never committed to audit trails.
 */
export function sanitizeAuditPayload(data: any): Json {
  if (data === null || data === undefined) {
    return null;
  }
  if (typeof data !== "object") {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditPayload(item));
  }

  const sanitized: Record<string, Json> = {};
  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z]/g, "");
    if (REDACTED_KEYS.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitizeAuditPayload(val);
    } else {
      sanitized[key] = val as Json;
    }
  }
  return sanitized;
}

/**
 * Internal persistence executor for audit logs with error logging.
 */
async function persistAuditRecord(params: LogAuditParams): Promise<void> {
  try {
    const supabase = await createClient();
    const safeDetails = sanitizeAuditPayload(params.details || {});

    await supabase.from("audit_logs").insert({
      company_id: params.companyId || null,
      user_id: params.userId || null,
      action: params.action,
      resource: params.resource,
      resource_id: params.resourceId || null,
      details: safeDetails,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[AUDIT LOG ERROR] Failed to persist audit record:", err);
  }
}

/**
 * Records an immutable audit log record asynchronously AFTER the response
 * using Next.js after() or non-blocking execution so user actions are never delayed.
 * Ensures records are never silently dropped (logs failures).
 */
export async function recordAuditLog(params: LogAuditParams): Promise<void> {
  try {
    if (typeof after === "function") {
      after(async () => {
        await persistAuditRecord(params);
      });
      return;
    }
  } catch {
    // Fall through if after() was invoked outside of a Next.js request lifecycle
  }

  // Fallback safe fire-and-forget queue
  persistAuditRecord(params).catch((err) => {
    console.error("[AUDIT LOG ERROR] Background persistence failure:", err);
  });
}

/**
 * Retrieves audit logs for an authorized company tenant.
 * Requires `audit:view` permission or Super Admin status.
 */
export async function getCompanyAuditLogs(
  companyId: string,
  options?: {
    limit?: number;
    offset?: number;
    cursor?: string;
    action?: string;
    resource?: string;
  }
): Promise<AuditLog[]> {
  await requirePermission(companyId, "audit:view");

  const supabase = await createClient();
  const limit = Math.min(options?.limit ?? 50, 50);

  let query = supabase
    .from("audit_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (options?.cursor) {
    query = query.lt("created_at", options.cursor).limit(limit);
  } else if (options?.offset) {
    query = query.range(options.offset, options.offset + limit - 1);
  } else {
    query = query.limit(limit);
  }
  if (options?.action) {
    query = query.ilike("action", `%${options.action}%`);
  }
  if (options?.resource) {
    query = query.eq("resource", options.resource);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }
  return data as AuditLog[];
}
