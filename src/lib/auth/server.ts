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
  constructor(message: string = "Forbidden: Insufficient privileges") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export interface VerifiedMembershipContext {
  membership: Membership;
  role: Role;
  company: Company;
  permissions: string[];
}

/**
 * Retrieves the currently authenticated Supabase user and profile.
 * Fails safely by returning null if unauthenticated or session invalid.
 */
export async function getCurrentUser(): Promise<Profile | null> {
  try {
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
}

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
 * Verifies server-side company membership.
 * Fails closed (403 Forbidden) if the user does NOT have active membership in the company.
 * Never relies on client-supplied parameters alone.
 */
export async function requireCompanyMembership(
  companyId: string,
  providedUser?: Profile
): Promise<VerifiedMembershipContext> {
  const user = providedUser || (await requireUser());

  // Check if global platform super admin
  if (user.is_super_admin) {
    const supabase = await createClient();
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (!company) {
      throw new ForbiddenError(`Company ${companyId} not found`);
    }

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
      company,
      permissions: ["*"],
    };
  }

  const supabase = await createClient();
  const { data: membership, error } = await supabase
    .from("memberships")
    .select("*, role:roles(*), company:companies(*)")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .single();

  if (error || !membership || !membership.company || !membership.role) {
    throw new ForbiddenError(
      `Access Denied: User ${user.email} does not possess verified membership in company ${companyId}`
    );
  }

  // Retrieve permissions for role
  const { data: rolePermissions } = await supabase
    .from("role_permissions")
    .select("permission:permissions(code)")
    .eq("role_id", membership.role_id);

  const permissions = (rolePermissions || [])
    .map((rp: any) => rp.permission?.code)
    .filter(Boolean);

  return {
    membership,
    role: membership.role,
    company: membership.company,
    permissions,
  };
}

/**
 * Enforces granular permission verification.
 * Fails closed (403 Forbidden) if the user's role does not contain the permission.
 */
export async function requirePermission(
  companyId: string,
  permissionCode: string,
  providedUser?: Profile
): Promise<VerifiedMembershipContext> {
  const context = await requireCompanyMembership(companyId, providedUser);

  if (context.permissions.includes("*") || context.role.code === "super_admin") {
    return context;
  }

  if (!context.permissions.includes(permissionCode)) {
    throw new ForbiddenError(
      `Access Denied: Missing required permission [${permissionCode}] in company ${context.company.name}`
    );
  }

  return context;
}
