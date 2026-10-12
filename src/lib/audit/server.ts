import { createClient } from "@/lib/supabase/server";
import { AuditLog, Json } from "@/types/database.types";
import { requirePermission } from "@/lib/auth/server";

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
  "key",
  "apikey",
  "servicekey",
  "authorization",
  "credential",
]);

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
 * Records an immutable audit log record.
 * Fails safely without throwing so primary business actions are not blocked.
 */
export async function recordAuditLog(params: LogAuditParams): Promise<void> {
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
    // Fail-open for audit logging write failure to preserve transaction continuity
    console.error("[AUDIT LOG ERROR] Failed to persist audit record:", err);
  }
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
    action?: string;
    resource?: string;
  }
): Promise<AuditLog[]> {
  await requirePermission(companyId, "audit:view");

  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(options?.limit || 50);

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
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
