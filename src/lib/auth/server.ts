import { createClient } from "@/lib/supabase/server";
import { Profile, Membership, Role, Company } from "@/types/database.types";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export class ForbiddenError extends AuthError {
  constructor(message: string = "Forbidden: Insufficient privileges", statusCode: number = 403) {
    super(message, statusCode);
    this.name = "ForbiddenError";
  }
}

export class CompanyAccessError extends ForbiddenError {
  companyStatus: "PENDING" | "SUSPENDED" | "REJECTED";
  constructor(companyName: string, status: "PENDING" | "SUSPENDED" | "REJECTED") {
    const msg =
      status === "PENDING"
        ? `Registration Pending: Organization "${companyName}" is awaiting IT HUB Super Admin review and approval before ERP access is enabled.`
        : status === "SUSPENDED"
        ? `Account Suspended: Organization "${companyName}" has been suspended by platform administration. Please contact support.`
        : `Registration Rejected: Organization "${companyName}" registration was not approved.`;
    super(msg, 403);
    this.name = "CompanyAccessError";
    this.companyStatus = status;
  }
}

export interface VerifiedMembershipContext {
  membership: Membership;
  role: Role;
  company: Company;
  permissions: string[];
}

import { cookies } from "next/headers";
import { cache } from "react";
import { verifyAdminSessionToken, SESSION_COOKIE_NAME } from "./admin-session";
import { trackAuth, trackPermissions, trackTenant } from "@/lib/perf/timing";
import { revalidateCompanyTag } from "@/lib/cache/tagged-cache";

interface CachedRolePermissions {
  permissions: string[];
  role: Role;
  expiresAt: number;
}

// In-memory tenant role and permissions cache with 5-minute TTL
// Key format: `${companyId}:${roleId}` ensuring strict multi-tenant boundary isolation
const rolePermissionsCache = new Map<string, CachedRolePermissions>();
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Invalidates the in-memory role & permission cache.
 * Must be invoked whenever roles, permission assignments, or memberships change.
 */
export function invalidateRoleCache(companyId?: string, roleId?: string): void {
  if (companyId && roleId) {
    rolePermissionsCache.delete(`${companyId}:${roleId}`);
    try {
      revalidateCompanyTag(companyId, "roles");
      revalidateCompanyTag(companyId, `role-${roleId}`);
    } catch {
      // Ignore in non-Next environments
    }
  } else if (companyId) {
    for (const key of rolePermissionsCache.keys()) {
      if (key.startsWith(`${companyId}:`)) {
        rolePermissionsCache.delete(key);
      }
    }
    try {
      revalidateCompanyTag(companyId, "roles");
    } catch {
      // Ignore in non-Next environments
    }
  } else {
    rolePermissionsCache.clear();
  }
}

/**
 * Retrieves the currently authenticated Supabase user or administrative session.
 * Fails safely by returning null if unauthenticated or session invalid.
 * Deduplicated per-request via React cache().
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<Profile | null> {
  return await trackAuth(async () => {
  try {
    // 1. Check for signed administrative session cookie
    try {
      const cookieStore = await cookies();
      const adminCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      const adminSession = verifyAdminSessionToken(adminCookie);

      if (adminSession) {
        return {
          id: "392c9ef9-a33e-4387-9c16-6a56b81f2191",
          email: adminSession.email,
          full_name: "Platform Super Administrator",
          avatar_url: null,
          is_super_admin: true,
          created_at: "2026-10-10T08:48:22.323638+00:00",
          updated_at: new Date().toISOString(),
        };
      }
    } catch {
      // Fall through if cookies() is called outside request scope (e.g. testing)
    }

    // 2. Check for live Supabase user
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      // Fallback profile if row trigger has slight latency
      return {
        id: user.id,
        email: user.email || "",
        full_name: user.user_metadata?.full_name || (user.email ? user.email.split("@")[0] : "ERP User"),
        avatar_url: user.user_metadata?.avatar_url || null,
        is_super_admin: false,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
      };
    }

    return profile;
  } catch {
    return null;
  }
  });
});

/**
 * Requires an authenticated user. Throws AuthError (401) if unauthenticated.
 * NEVER allows unauthenticated pass-through (Fails closed).
 */
export async function requireUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required to access this resource", 401);
  }
  return user;
}

/**
 * Checks whether the user is a platform super administrator.
 */
export async function isSuperAdmin(userId?: string): Promise<boolean> {
  if (!userId) {
    const current = await getCurrentUser();
    return current?.is_super_admin ?? false;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .single();

  return data?.is_super_admin ?? false;
}

/**
 * Requires the authenticated caller to have platform Super Administrator privileges.
 * Fails closed (403 Forbidden) if not a verified platform super admin.
 */
export async function requireSuperAdmin(providedUser?: Profile): Promise<Profile> {
  const user = providedUser || (await requireUser());
  if (!user.is_super_admin) {
    throw new ForbiddenError(
      "Access Denied: IT HUB Platform Super Administrator privileges required.",
      403
    );
  }
  return user;
}

/**
 * Retrieves all verified active memberships for a user.
 */
export async function getUserMemberships(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("*, role:roles(*), company:companies(*)")
    .eq("user_id", userId)
    .eq("status", "ACTIVE");

  if (error || !data) return [];
  return data;
}

/**
 * Canonical permission evaluator supporting granular actions, module wildcards,
 * and standard dot/colon alias normalizations.
 */
export function hasPermission(grantedPermissions: string[], requiredCode: string): boolean {
  if (grantedPermissions.includes("*")) return true;
  if (grantedPermissions.includes(requiredCode)) return true;

  // Dot vs colon interchangeable representations (e.g. invoices.create <-> invoices:create)
  const colonCode = requiredCode.replace(".", ":");
  const dotCode = requiredCode.replace(":", ".");
  if (grantedPermissions.includes(colonCode) || grantedPermissions.includes(dotCode)) return true;

  // Cross-module aliases & PRD action mappings
  const aliases: Record<string, string[]> = {
    // Invoices & Sales
    "invoices.view": ["sales:view", "sales.view", "invoices:view"],
    "invoices.create": ["sales:create", "sales.create", "invoices:create"],
    "invoices.edit": ["sales:edit", "sales.edit", "invoices:edit"],
    "invoices.delete": ["sales:delete", "sales.delete", "invoices:delete"],
    "invoices.export": ["sales:export", "sales.export", "invoices:export"],
    "sales:view": ["invoices.view", "sales.view", "invoices:view"],
    "sales:create": ["invoices.create", "sales.create", "invoices:create"],
    "sales:edit": ["invoices.edit", "sales.edit", "invoices:edit"],
    "sales:delete": ["invoices.delete", "sales.delete", "invoices:delete"],
    "sales:export": ["invoices.export", "sales.export", "invoices:export"],

    // Customers & CRM
    "customers.view": ["crm:view", "crm.view", "customers:view"],
    "customers.create": ["crm:create", "crm.create", "customers:create"],
    "customers.edit": ["crm:edit", "crm.edit", "customers:edit"],
    "customers.delete": ["crm:delete", "crm.delete", "customers:delete"],
    "crm:view": ["customers.view", "crm.view", "customers:view"],
    "crm:create": ["customers.create", "crm.create", "customers:create"],
    "crm:edit": ["customers.edit", "crm.edit", "customers:edit"],
    "crm:delete": ["customers.delete", "crm.delete", "customers:delete"],

    // Expenses & Finance
    "expenses.view": ["finance:view", "finance.view", "finance.read", "expenses:view"],
    "expenses.create": ["finance:create", "finance.create", "expenses:create"],
    "expenses.approve": ["finance:approve", "finance.approve", "expenses:approve"],
    "finance.read": ["expenses.view", "finance:view", "finance.view"],
    "finance.create": ["expenses.create", "finance:create", "expenses.create"],
    "finance:view": ["expenses.view", "finance.view", "finance.read"],
    "finance:create": ["expenses.create", "finance.create", "finance:create"],
    "finance:approve": ["expenses.approve", "finance.approve", "finance:approve"],

    // Employees & HR
    "employees.view": ["hr:view", "hr.view", "employees:view"],
    "employees.create": ["hr:create", "hr.create", "employees:create"],
    "employees.edit": ["hr:edit", "hr.edit", "employees:edit"],
    "hr:view": ["employees.view", "hr.view", "employees:view"],
    "hr:create": ["employees.create", "hr.create", "employees:create"],
    "hr:edit": ["employees.edit", "hr.edit", "employees:edit"],

    // Attendance & Shifts
    "attendance.view": ["hr:view", "attendance:view", "attendance.view"],
    "attendance.manage": ["hr:edit", "attendance:manage", "attendance.manage"],

    // Payroll
    "payroll.view": ["payroll:view", "payroll.view"],
    "payroll.process": ["payroll:create", "payroll:approve", "payroll.process"],
    "payroll:view": ["payroll.view", "payroll:view"],
    "payroll:create": ["payroll.process", "payroll:create"],
    "payroll:approve": ["payroll.process", "payroll:approve"],

    // Inventory & Warehousing
    "inventory.view": ["inventory:view", "inventory.view"],
    "inventory.manage": ["inventory:create", "inventory:edit", "inventory.manage"],
    "inventory:view": ["inventory.view", "inventory:view"],
    "inventory:create": ["inventory.manage", "inventory:create"],
    "inventory:edit": ["inventory.manage", "inventory:edit"],

    // Reports
    "reports.view": ["reports:view", "reports.view"],
    "reports.export": ["reports:export", "reports.export"],
    "reports:view": ["reports.view", "reports:view"],
    "reports:export": ["reports.export", "reports:export"],

    // Users & Roles
    "users.view": ["users:view", "users.view"],
    "users.manage": ["users:invite", "users:edit", "users:delete", "users.manage"],
    "users:view": ["users.view", "users:view"],
    "users:invite": ["users.manage", "users:invite"],
    "users:edit": ["users.manage", "users:edit"],
    "users:delete": ["users.manage", "users:delete"],

    // Settings
    "settings.manage": ["settings:edit", "settings.manage"],
    "settings:edit": ["settings.manage", "settings:edit"],
  };

  const matchedAliases = aliases[requiredCode];
  if (matchedAliases && matchedAliases.some((alias) => grantedPermissions.includes(alias))) {
    return true;
  }

  // Check resource wildcard (e.g., 'sales:*' or 'invoices.*')
  const [resource] = requiredCode.split(/[:.]/);
  if (
    grantedPermissions.includes(`${resource}:*`) ||
    grantedPermissions.includes(`${resource}.*`) ||
    grantedPermissions.includes(`${resource}:manage`) ||
    grantedPermissions.includes(`${resource}.manage`)
  ) {
    return true;
  }

  return false;
}

/**
 * Verifies server-side company membership.
 * Fails closed (403 Forbidden) if the user does NOT have active membership in the company.
 * Never relies on client-supplied parameters alone.
 * Deduplicated per-request via React cache().
 */
export const requireCompanyMembership = cache(async function requireCompanyMembership(
  companyId: string,
  providedUser?: Profile
): Promise<VerifiedMembershipContext> {
  return await trackTenant(async () => {
  const user = providedUser || (await requireUser());

  // Check if global platform super admin
  if (user.is_super_admin) {
    const supabase = await createClient();
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    const targetCompany: Company = company || {
      id: companyId,
      name: "IT-HUB Global Technologies Corp",
      slug: "it-hub-global",
      domain: "ithub-enterprise.com",
      plan: "ENTERPRISE",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
    };

    // Synthesize super admin membership context
    const superAdminRole: Role = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Super Admin",
      code: "super_admin",
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      membership: {
        id: "super-admin-override",
        company_id: companyId,
        user_id: user.id,
        role_id: superAdminRole.id,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      role: superAdminRole,
      company: targetCompany,
      permissions: ["*"],
    };
  }

  const supabase = await createClient();
  const { data: membership, error } = await supabase
    .from("memberships")
    .select(`
      *,
      company:companies(*),
      role:roles(
        *,
        role_permissions(permission:permissions(code))
      )
    `)
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .single();

  if (error || !membership || !membership.company || !membership.role) {
    throw new ForbiddenError(
      `Access Denied: User ${user.email} does not possess verified membership in company ${companyId}`
    );
  }

  // Strict Server Guard: Non-Super-Admins CANNOT access unapproved, suspended, or rejected companies
  const companyStatus = (membership.company as any)?.status || "ACTIVE";
  if (companyStatus !== "ACTIVE") {
    throw new CompanyAccessError(
      membership.company.name,
      companyStatus as "PENDING" | "SUSPENDED" | "REJECTED"
    );
  }

  // Retrieve permissions for role (prefer in-memory role & permission cache)
  const cacheKey = `${companyId}:${membership.role_id}`;
  const cachedRole = rolePermissionsCache.get(cacheKey);
  let permissions: string[] = [];

  if (cachedRole && cachedRole.expiresAt > Date.now()) {
    permissions = cachedRole.permissions;
  } else {
    const nestedRolePerms = (membership.role as any)?.role_permissions;
    if (Array.isArray(nestedRolePerms)) {
      permissions = nestedRolePerms
        .map((rp: any) => rp.permission?.code)
        .filter(Boolean);
    } else {
      // Resilient fallback for mocks or environments without deep relation joins
      const { data: rolePermissions } = await supabase
        .from("role_permissions")
        .select("permission:permissions(code)")
        .eq("role_id", membership.role_id);

      permissions = (rolePermissions || [])
        .map((rp: any) => rp.permission?.code)
        .filter(Boolean);
    }

    rolePermissionsCache.set(cacheKey, {
      permissions,
      role: membership.role,
      expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
    });
  }

  return {
    membership,
    role: membership.role,
    company: membership.company,
    permissions,
  };
  });
});

/**
 * Canonical alias for requireCompanyMembership.
 * Deduplicated per-request via React cache() with multi-tenant role cache.
 */
export const getSessionContext = requireCompanyMembership;

/**
 * Enforces granular permission verification.
 * Fails closed (403 Forbidden) if the user's role does not contain the permission.
 */
export async function requirePermission(
  companyId: string,
  permissionCode: string,
  providedUser?: Profile
): Promise<VerifiedMembershipContext> {
  return await trackPermissions(async () => {
    const context = await requireCompanyMembership(companyId, providedUser);

    if (context.permissions.includes("*") || context.role.code === "super_admin") {
      return context;
    }

    if (!hasPermission(context.permissions, permissionCode)) {
      throw new ForbiddenError(
        `Access Denied: Missing required permission [${permissionCode}] in company ${context.company.name}`
      );
    }

    return context;
  });
}
