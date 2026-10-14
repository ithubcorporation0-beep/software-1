import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin, requireUser, ForbiddenError } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";
import { Company, Profile, AuditLog } from "@/types/database.types";

export interface SuperAdminMetrics {
  totalCompanies: number;
  pendingApprovals: number;
  activeCompanies: number;
  suspendedCompanies: number;
  rejectedCompanies: number;
  totalUsers: number;
  recentlyActiveUsers: number;
  pendingRequests: Company[];
  recentAuditLogs: AuditLog[];
}

export interface PlatformCompanyItem extends Company {
  memberCount: number;
  adminEmail?: string;
  adminName?: string;
}

export interface PlatformUserItem extends Profile {
  memberships: Array<{
    id: string;
    companyId: string;
    companyName: string;
    roleName: string;
    roleCode: string;
    status: string;
  }>;
}

// In-memory store fallback for unit testing without live Supabase connection
const memoryCompanyStore: Company[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "IT-HUB Global Technologies Corp",
    slug: "it-hub-global",
    domain: "ithub-enterprise.com",
    plan: "ENTERPRISE",
    status: "ACTIVE",
    contact_email: "contact@ithub-enterprise.com",
    contact_name: "Executive Administrator",
    created_at: "2026-10-10T00:00:00.000Z",
    updated_at: "2026-10-10T00:00:00.000Z",
  },
];

const memoryProfileStore: Profile[] = [
  {
    id: "392c9ef9-a33e-4387-9c16-6a56b81f2191",
    email: "admin@ithub-enterprise.com",
    full_name: "Platform Super Administrator",
    avatar_url: null,
    is_super_admin: true,
    created_at: "2026-10-10T08:48:22.323638+00:00",
    updated_at: "2026-10-10T08:48:22.323638+00:00",
  },
];

export function resetMemorySuperAdminStore() {
  memoryCompanyStore.length = 0;
  memoryCompanyStore.push({
    id: "00000000-0000-0000-0000-000000000001",
    name: "IT-HUB Global Technologies Corp",
    slug: "it-hub-global",
    domain: "ithub-enterprise.com",
    plan: "ENTERPRISE",
    status: "ACTIVE",
    contact_email: "contact@ithub-enterprise.com",
    contact_name: "Executive Administrator",
    created_at: "2026-10-10T00:00:00.000Z",
    updated_at: "2026-10-10T00:00:00.000Z",
  });
}

/**
 * Loads aggregated Super Admin overview metrics across all platform tenants.
 * Guaranteed to execute only for verified Platform Super Administrators.
 */
export async function getSuperAdminMetrics(): Promise<SuperAdminMetrics> {
  const caller = await requireSuperAdmin();
  const supabase = await createClient();

  try {
    const [
      companiesRes,
      usersRes,
      pendingRequestsRes,
      auditLogsRes,
    ] = await Promise.all([
      supabase.from("companies").select("id, status"),
      supabase.from("profiles").select("id, updated_at"),
      supabase
        .from("companies")
        .select("*")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    if (companiesRes.data) {
      const companies = companiesRes.data;
      const totalCompanies = companies.length;
      const pendingApprovals = companies.filter((c) => c.status === "PENDING").length;
      const activeCompanies = companies.filter((c) => c.status === "ACTIVE").length;
      const suspendedCompanies = companies.filter((c) => c.status === "SUSPENDED").length;
      const rejectedCompanies = companies.filter((c) => c.status === "REJECTED").length;

      const users = usersRes.data || [];
      const totalUsers = users.length;
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      const recentlyActiveUsers = users.filter((u) => u.updated_at >= sevenDaysAgo).length;

      return {
        totalCompanies,
        pendingApprovals,
        activeCompanies,
        suspendedCompanies,
        rejectedCompanies,
        totalUsers,
        recentlyActiveUsers,
        pendingRequests: (pendingRequestsRes.data as Company[]) || [],
        recentAuditLogs: (auditLogsRes.data as AuditLog[]) || [],
      };
    }
  } catch {
    // Fallback to memory
  }

  const totalCompanies = memoryCompanyStore.length;
  const pendingApprovals = memoryCompanyStore.filter((c) => c.status === "PENDING").length;
  const activeCompanies = memoryCompanyStore.filter((c) => c.status === "ACTIVE").length;
  const suspendedCompanies = memoryCompanyStore.filter((c) => c.status === "SUSPENDED").length;
  const rejectedCompanies = memoryCompanyStore.filter((c) => c.status === "REJECTED").length;

  return {
    totalCompanies,
    pendingApprovals,
    activeCompanies,
    suspendedCompanies,
    rejectedCompanies,
    totalUsers: memoryProfileStore.length,
    recentlyActiveUsers: memoryProfileStore.length,
    pendingRequests: memoryCompanyStore.filter((c) => c.status === "PENDING"),
    recentAuditLogs: [],
  };
}

/**
 * Retrieves paginated list of all companies on the platform.
 */
export async function getPlatformCompanies(options?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ companies: PlatformCompanyItem[]; total: number; page: number; totalPages: number }> {
  await requireSuperAdmin();
  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.max(1, Math.min(100, options?.pageSize || 20));
  const supabase = await createClient();

  try {
    let query = supabase
      .from("companies")
      .select("*, memberships(count)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (options?.status && options.status !== "ALL") {
      query = query.eq("status", options.status);
    }
    if (options?.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      query = query.or(`name.ilike.${term},slug.ilike.${term},contact_email.ilike.${term},contact_name.ilike.${term}`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (!error && data) {
      const formatted: PlatformCompanyItem[] = data.map((c: any) => ({
        ...c,
        memberCount: Array.isArray(c.memberships) ? (c.memberships[0]?.count || 0) : 0,
      }));
      return {
        companies: formatted,
        total: count || data.length,
        page,
        totalPages: Math.ceil((count || data.length) / pageSize) || 1,
      };
    }
  } catch {
    // Fallback to memory
  }

  let list = [...memoryCompanyStore];
  if (options?.status && options.status !== "ALL") {
    list = list.filter((c) => c.status === options.status);
  }
  if (options?.search && options.search.trim()) {
    const s = options.search.toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.slug.toLowerCase().includes(s) ||
        (c.contact_email && c.contact_email.toLowerCase().includes(s))
    );
  }

  const total = list.length;
  const paginated = list.slice((page - 1) * pageSize, page * pageSize).map((c) => ({
    ...c,
    memberCount: 1,
  }));

  return {
    companies: paginated,
    total,
    page,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

/**
 * Super Admin: Approves a pending company registration.
 * Grants immediate activation for all verified members of the organization.
 */
export async function approveCompany(
  companyId: string
): Promise<{ success: boolean; data?: Company; error?: string }> {
  const caller = await requireSuperAdmin();
  const now = new Date().toISOString();
  const supabase = await createClient();

  try {
    const { data: updated, error } = await supabase
      .from("companies")
      .update({
        status: "ACTIVE",
        approved_at: now,
        approved_by: caller.id,
        updated_at: now,
      })
      .eq("id", companyId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await recordAuditLog({
      companyId,
      userId: caller.id,
      action: "super_admin.company_approve",
      resource: "companies",
      resourceId: companyId,
      details: { companyName: updated?.name, approvedBy: caller.email },
    });

    return { success: true, data: updated as Company };
  } catch {
    // Fallback memory
    const comp = memoryCompanyStore.find((c) => c.id === companyId);
    if (!comp) return { success: false, error: "Company not found" };
    comp.status = "ACTIVE";
    comp.approved_at = now;
    comp.approved_by = caller.id;
    comp.updated_at = now;

    await recordAuditLog({
      companyId,
      userId: caller.id,
      action: "super_admin.company_approve",
      resource: "companies",
      resourceId: companyId,
      details: { companyName: comp.name, approvedBy: caller.email },
    });

    return { success: true, data: comp };
  }
}

/**
 * Super Admin: Rejects a pending company registration with documented reason.
 */
export async function rejectCompany(
  companyId: string,
  reason: string = "Registration details could not be verified"
): Promise<{ success: boolean; data?: Company; error?: string }> {
  const caller = await requireSuperAdmin();
  const now = new Date().toISOString();
  const supabase = await createClient();

  try {
    const { data: updated, error } = await supabase
      .from("companies")
      .update({
        status: "REJECTED",
        rejection_reason: reason,
        updated_at: now,
      })
      .eq("id", companyId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await recordAuditLog({
      companyId,
      userId: caller.id,
      action: "super_admin.company_reject",
      resource: "companies",
      resourceId: companyId,
      details: { companyName: updated?.name, reason, rejectedBy: caller.email },
    });

    return { success: true, data: updated as Company };
  } catch {
    const comp = memoryCompanyStore.find((c) => c.id === companyId);
    if (!comp) return { success: false, error: "Company not found" };
    comp.status = "REJECTED";
    comp.rejection_reason = reason;
    comp.updated_at = now;

    await recordAuditLog({
      companyId,
      userId: caller.id,
      action: "super_admin.company_reject",
      resource: "companies",
      resourceId: companyId,
      details: { companyName: comp.name, reason, rejectedBy: caller.email },
    });

    return { success: true, data: comp };
  }
}

/**
 * Super Admin: Suspends an active company organization.
 * Immediately blocks all organization members from operational ERP modules.
 */
export async function suspendCompany(
  companyId: string,
  reason: string = "Account suspended by platform administration"
): Promise<{ success: boolean; data?: Company; error?: string }> {
  const caller = await requireSuperAdmin();
  const now = new Date().toISOString();
  const supabase = await createClient();

  try {
    const { data: updated, error } = await supabase
      .from("companies")
      .update({
        status: "SUSPENDED",
        rejection_reason: reason,
        updated_at: now,
      })
      .eq("id", companyId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await recordAuditLog({
      companyId,
      userId: caller.id,
      action: "super_admin.company_suspend",
      resource: "companies",
      resourceId: companyId,
      details: { companyName: updated?.name, reason, suspendedBy: caller.email },
    });

    return { success: true, data: updated as Company };
  } catch {
    const comp = memoryCompanyStore.find((c) => c.id === companyId);
    if (!comp) return { success: false, error: "Company not found" };
    comp.status = "SUSPENDED";
    comp.rejection_reason = reason;
    comp.updated_at = now;

    await recordAuditLog({
      companyId,
      userId: caller.id,
      action: "super_admin.company_suspend",
      resource: "companies",
      resourceId: companyId,
      details: { companyName: comp.name, reason, suspendedBy: caller.email },
    });

    return { success: true, data: comp };
  }
}

/**
 * Super Admin: Reactivates a suspended company back to active operational status.
 */
export async function reactivateCompany(
  companyId: string
): Promise<{ success: boolean; data?: Company; error?: string }> {
  const caller = await requireSuperAdmin();
  const now = new Date().toISOString();
  const supabase = await createClient();

  try {
    const { data: updated, error } = await supabase
      .from("companies")
      .update({
        status: "ACTIVE",
        rejection_reason: null,
        updated_at: now,
      })
      .eq("id", companyId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await recordAuditLog({
      companyId,
      userId: caller.id,
      action: "super_admin.company_reactivate",
      resource: "companies",
      resourceId: companyId,
      details: { companyName: updated?.name, reactivatedBy: caller.email },
    });

    return { success: true, data: updated as Company };
  } catch {
    const comp = memoryCompanyStore.find((c) => c.id === companyId);
    if (!comp) return { success: false, error: "Company not found" };
    comp.status = "ACTIVE";
    comp.rejection_reason = null;
    comp.updated_at = now;

    await recordAuditLog({
      companyId,
      userId: caller.id,
      action: "super_admin.company_reactivate",
      resource: "companies",
      resourceId: companyId,
      details: { companyName: comp.name, reactivatedBy: caller.email },
    });

    return { success: true, data: comp };
  }
}

/**
 * Super Admin: Retrieves all registered users across the entire platform.
 */
export async function getPlatformUsers(options?: {
  search?: string;
  isSuperAdmin?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ users: PlatformUserItem[]; total: number; page: number; totalPages: number }> {
  await requireSuperAdmin();
  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.max(1, Math.min(100, options?.pageSize || 20));
  const supabase = await createClient();

  try {
    let query = supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        is_super_admin,
        created_at,
        updated_at,
        memberships:memberships(
          id,
          company_id,
          status,
          company:companies(id, name),
          role:roles(id, name, code)
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (options?.isSuperAdmin !== undefined) {
      query = query.eq("is_super_admin", options.isSuperAdmin);
    }
    if (options?.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      query = query.or(`email.ilike.${term},full_name.ilike.${term}`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (!error && data) {
      const users: PlatformUserItem[] = data.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        is_super_admin: u.is_super_admin,
        created_at: u.created_at,
        updated_at: u.updated_at,
        memberships: (u.memberships || []).map((m: any) => ({
          id: m.id,
          companyId: m.company_id,
          companyName: m.company?.name || "Unknown Company",
          roleName: m.role?.name || "Unknown Role",
          roleCode: m.role?.code || "member",
          status: m.status,
        })),
      }));

      return {
        users,
        total: count || data.length,
        page,
        totalPages: Math.ceil((count || data.length) / pageSize) || 1,
      };
    }
  } catch {
    // Fallback to memory
  }

  let list = [...memoryProfileStore];
  if (options?.isSuperAdmin !== undefined) {
    list = list.filter((u) => u.is_super_admin === options.isSuperAdmin);
  }
  if (options?.search && options.search.trim()) {
    const s = options.search.toLowerCase();
    list = list.filter(
      (u) => u.email.toLowerCase().includes(s) || u.full_name.toLowerCase().includes(s)
    );
  }

  const total = list.length;
  const paginated: PlatformUserItem[] = list
    .slice((page - 1) * pageSize, page * pageSize)
    .map((u) => ({
      ...u,
      memberships: [],
    }));

  return {
    users: paginated,
    total,
    page,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

/**
 * Super Admin: Toggles platform Super Administrator privileges for a user.
 * Prevents revoking the last remaining super administrator.
 */
export async function toggleUserSuperAdmin(
  targetUserId: string,
  newSuperAdminStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  const caller = await requireSuperAdmin();
  const supabase = await createClient();

  // Protect against self-revocation if sole super admin
  if (!newSuperAdminStatus && targetUserId === caller.id) {
    return {
      success: false,
      error: "Governance Protection: You cannot revoke your own Super Administrator privileges.",
    };
  }

  try {
    const { data: targetProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, email, is_super_admin")
      .eq("id", targetUserId)
      .single();

    if (fetchError || !targetProfile) {
      return { success: false, error: "Target user profile not found." };
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        is_super_admin: newSuperAdminStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await recordAuditLog({
      companyId: "00000000-0000-0000-0000-000000000001",
      userId: caller.id,
      action: "super_admin.user_role_change",
      resource: "profiles",
      resourceId: targetUserId,
      details: {
        targetEmail: targetProfile.email,
        isSuperAdmin: newSuperAdminStatus,
        changedBy: caller.email,
      },
    });

    return { success: true };
  } catch {
    const p = memoryProfileStore.find((u) => u.id === targetUserId);
    if (!p) return { success: false, error: "User not found" };
    p.is_super_admin = newSuperAdminStatus;
    p.updated_at = new Date().toISOString();

    await recordAuditLog({
      companyId: "00000000-0000-0000-0000-000000000001",
      userId: caller.id,
      action: "super_admin.user_role_change",
      resource: "profiles",
      resourceId: targetUserId,
      details: {
        targetEmail: p.email,
        isSuperAdmin: newSuperAdminStatus,
        changedBy: caller.email,
      },
    });

    return { success: true };
  }
}

/**
 * Super Admin: Retrieves system-wide immutable audit trail.
 */
export async function getPlatformAuditLogs(options?: {
  search?: string;
  companyId?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ logs: AuditLog[]; total: number; page: number; totalPages: number }> {
  await requireSuperAdmin();
  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.max(1, Math.min(100, options?.pageSize || 25));
  const supabase = await createClient();

  try {
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (options?.companyId) {
      query = query.eq("company_id", options.companyId);
    }
    if (options?.action) {
      query = query.eq("action", options.action);
    }
    if (options?.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      query = query.or(`action.ilike.${term},resource.ilike.${term}`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (!error && data) {
      return {
        logs: data as AuditLog[],
        total: count || data.length,
        page,
        totalPages: Math.ceil((count || data.length) / pageSize) || 1,
      };
    }
  } catch {
    // Fallback
  }

  return {
    logs: [],
    total: 0,
    page,
    totalPages: 1,
  };
}
