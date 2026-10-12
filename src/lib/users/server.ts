import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser, requireCompanyMembership } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";
import { Role, Permission } from "@/types/database.types";

export interface CompanyMemberItem {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  roleId: string;
  roleName: string;
  roleCode: string;
  isSystemRole: boolean;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  isSuperAdmin: boolean;
  createdAt: string;
}

export const inviteUserSchema = z.object({
  email: z.string().trim().email("Valid email address required"),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  roleId: z.string().trim().min(1, "Role ID is required"),
});

export const customRoleSchema = z.object({
  name: z.string().trim().min(2, "Role name must be at least 2 characters").max(50),
  code: z.string().trim().min(2, "Role code must be at least 2 characters").max(50)
    .regex(/^[a-z0-9_-]+$/, "Role code must be lowercase alphanumeric with underscores/hyphens"),
  description: z.string().trim().max(255).optional().or(z.literal("")),
  permissionCodes: z.array(z.string()).min(1, "At least one permission must be granted"),
});

/**
 * Retrieves members of a tenant company with optional search and filters.
 */
export async function getCompanyMembers(
  companyId: string,
  options?: {
    search?: string;
    status?: "ACTIVE" | "INVITED" | "SUSPENDED" | "ALL";
    roleId?: string;
  }
): Promise<CompanyMemberItem[]> {
  await requirePermission(companyId, "users:view");

  const supabase = await createClient();

  let query = supabase
    .from("memberships")
    .select(`
      id,
      user_id,
      role_id,
      status,
      created_at,
      profile:profiles(id, email, full_name, avatar_url, is_super_admin),
      role:roles(id, name, code, is_system)
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (options?.status && options.status !== "ALL") {
    query = query.eq("status", options.status);
  }

  if (options?.roleId) {
    query = query.eq("role_id", options.roleId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  let items: CompanyMemberItem[] = data.map((row: any) => ({
    membershipId: row.id,
    userId: row.user_id,
    fullName: row.profile?.full_name || "Unassigned Name",
    email: row.profile?.email || "no-email@tenant.local",
    avatarUrl: row.profile?.avatar_url || null,
    roleId: row.role?.id || row.role_id,
    roleName: row.role?.name || "Standard Member",
    roleCode: row.role?.code || "member",
    isSystemRole: row.role?.is_system ?? true,
    status: row.status,
    isSuperAdmin: Boolean(row.profile?.is_super_admin),
    createdAt: row.created_at,
  }));

  if (options?.search && options.search.trim()) {
    const term = options.search.trim().toLowerCase();
    items = items.filter(
      (m) =>
        m.fullName.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        m.roleName.toLowerCase().includes(term)
    );
  }

  return items;
}

/**
 * Invites / assigns a user to a company tenant with an authorized role.
 * Prevents privilege escalation: non-super-admins cannot assign Super Admin roles.
 */
export async function inviteCompanyUser(
  companyId: string,
  rawData: unknown
): Promise<{ success: boolean; data?: CompanyMemberItem; error?: string }> {
  const caller = await requireUser();
  const callerContext = await requirePermission(companyId, "users:invite", caller);

  const parsed = inviteUserSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const { email, fullName, roleId } = parsed.data;
  const supabase = await createClient();

  // 1. Verify the target role exists and belongs to platform or this company
  const { data: targetRole, error: roleError } = await supabase
    .from("roles")
    .select("*")
    .eq("id", roleId)
    .single();

  if (roleError || !targetRole) {
    return { success: false, error: "Selected role does not exist" };
  }

  // Prevent privilege escalation: caller cannot assign super_admin unless caller is Super Admin
  if (targetRole.code === "super_admin" && !caller.is_super_admin) {
    return { success: false, error: "Privilege Escalation Blocked: Only Super Admins can assign the Super Admin role" };
  }

  // Ensure role is either a global system role or belongs to this company
  if (targetRole.company_id && targetRole.company_id !== companyId) {
    return { success: false, error: "Cross-tenant violation: Cannot assign role belonging to another organization" };
  }

  // 2. Lookup or create user profile
  let targetUserId: string;
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    targetUserId = existingProfile.id;
  } else {
    // Generate placeholder profile so membership can be created
    const newUserId = crypto.randomUUID();
    const { data: newProfile, error: profileInsertError } = await supabase
      .from("profiles")
      .insert({
        id: newUserId,
        email: email.toLowerCase(),
        full_name: fullName,
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (profileInsertError || !newProfile) {
      return { success: false, error: "Failed to initialize user identity profile" };
    }
    targetUserId = newProfile.id;
  }

  // 3. Check if user already has membership in this company
  const { data: existingMembership } = await supabase
    .from("memberships")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (existingMembership) {
    if (existingMembership.status === "ACTIVE") {
      return { success: false, error: "User is already an active member of this organization" };
    }
    // If previously suspended or invited, reactivate with the newly requested role
    const { data: updated, error: updateError } = await supabase
      .from("memberships")
      .update({
        role_id: roleId,
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingMembership.id)
      .select()
      .single();

    if (updateError || !updated) {
      return { success: false, error: updateError?.message || "Failed to reactivate membership" };
    }

    await recordAuditLog({
      companyId,
      userId: caller.id,
      action: "user.reactivate_role",
      resource: "memberships",
      resourceId: updated.id,
      details: { email, roleName: targetRole.name, roleCode: targetRole.code },
    });

    const members = await getCompanyMembers(companyId);
    const item = members.find((m) => m.membershipId === updated.id);
    return { success: true, data: item };
  }

  // 4. Create new membership
  const { data: newMembership, error: membershipError } = await supabase
    .from("memberships")
    .insert({
      company_id: companyId,
      user_id: targetUserId,
      role_id: roleId,
      status: "ACTIVE",
      created_by: caller.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (membershipError || !newMembership) {
    return { success: false, error: membershipError?.message || "Failed to create membership" };
  }

  // 5. Audit log
  await recordAuditLog({
    companyId,
    userId: caller.id,
    action: "user.invite",
    resource: "memberships",
    resourceId: newMembership.id,
    details: {
      email,
      fullName,
      roleId,
      roleName: targetRole.name,
      roleCode: targetRole.code,
    },
  });

  const members = await getCompanyMembers(companyId);
  const createdItem = members.find((m) => m.membershipId === newMembership.id);
  return { success: true, data: createdItem };
}

/**
 * Updates a member's role assignment.
 * Protects against privilege escalation and demotion of the last active administrator.
 */
export async function updateMemberRole(
  companyId: string,
  membershipId: string,
  newRoleId: string
): Promise<{ success: boolean; error?: string }> {
  const caller = await requireUser();
  await requirePermission(companyId, "users:edit", caller);

  const supabase = await createClient();

  // 1. Fetch current membership with current role and target user
  const { data: targetMembership, error: fetchError } = await supabase
    .from("memberships")
    .select("*, role:roles(*), profile:profiles(*)")
    .eq("id", membershipId)
    .eq("company_id", companyId)
    .single();

  if (fetchError || !targetMembership) {
    return { success: false, error: "Membership record not found in this company" };
  }

  // 2. Fetch target role
  const { data: targetRole, error: roleError } = await supabase
    .from("roles")
    .select("*")
    .eq("id", newRoleId)
    .single();

  if (roleError || !targetRole) {
    return { success: false, error: "Target role not found" };
  }

  // Privilege escalation protection
  if (targetRole.code === "super_admin" && !caller.is_super_admin) {
    return { success: false, error: "Privilege Escalation Blocked: Only Super Admins can assign Super Admin role" };
  }

  // 3. Last Admin Protection
  const currentRoleCode = (targetMembership.role as any)?.code;
  const isDemotingAdmin = (currentRoleCode === "admin" || currentRoleCode === "super_admin") &&
    (targetRole.code !== "admin" && targetRole.code !== "super_admin");

  if (isDemotingAdmin) {
    // Count active admins in this company
    const { data: activeAdmins } = await supabase
      .from("memberships")
      .select("id, role:roles(code)")
      .eq("company_id", companyId)
      .eq("status", "ACTIVE");

    const adminCount = (activeAdmins || []).filter(
      (m: any) => m.role?.code === "admin" || m.role?.code === "super_admin"
    ).length;

    if (adminCount <= 1) {
      return {
        success: false,
        error: "Governance Protection: Cannot demote the last active Administrator for this organization",
      };
    }
  }

  // 4. Update membership
  const { error: updateError } = await supabase
    .from("memberships")
    .update({
      role_id: newRoleId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membershipId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 5. Audit Log
  await recordAuditLog({
    companyId,
    userId: caller.id,
    action: "user.role_change",
    resource: "memberships",
    resourceId: membershipId,
    details: {
      targetUserId: targetMembership.user_id,
      previousRole: currentRoleCode,
      newRole: targetRole.code,
      newRoleName: targetRole.name,
    },
  });

  return { success: true };
}

/**
 * Toggles a member's active / suspended status.
 * Prevents deactivating the last active administrator or self-lockout.
 */
export async function toggleMemberStatus(
  companyId: string,
  membershipId: string,
  newStatus: "ACTIVE" | "SUSPENDED"
): Promise<{ success: boolean; error?: string }> {
  const caller = await requireUser();
  await requirePermission(companyId, "users:edit", caller);

  const supabase = await createClient();

  // 1. Fetch current membership
  const { data: targetMembership, error: fetchError } = await supabase
    .from("memberships")
    .select("*, role:roles(*)")
    .eq("id", membershipId)
    .eq("company_id", companyId)
    .single();

  if (fetchError || !targetMembership) {
    return { success: false, error: "Membership record not found in this company" };
  }

  // 2. Protect last active Admin if suspending
  if (newStatus === "SUSPENDED") {
    const roleCode = (targetMembership.role as any)?.code;
    if (roleCode === "admin" || roleCode === "super_admin") {
      const { data: activeAdmins } = await supabase
        .from("memberships")
        .select("id, role:roles(code)")
        .eq("company_id", companyId)
        .eq("status", "ACTIVE");

      const adminCount = (activeAdmins || []).filter(
        (m: any) => m.role?.code === "admin" || m.role?.code === "super_admin"
      ).length;

      if (adminCount <= 1) {
        return {
          success: false,
          error: "Governance Protection: Cannot suspend the last active Administrator for this organization",
        };
      }
    }

    // Protect caller from accidental self-lockout if sole admin
    if (targetMembership.user_id === caller.id && !caller.is_super_admin) {
      return {
        success: false,
        error: "Action Blocked: You cannot suspend your own administrative account",
      };
    }
  }

  // 3. Update status
  const { error: updateError } = await supabase
    .from("memberships")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membershipId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 4. Record Audit Log
  await recordAuditLog({
    companyId,
    userId: caller.id,
    action: newStatus === "SUSPENDED" ? "user.deactivate" : "user.reactivate",
    resource: "memberships",
    resourceId: membershipId,
    details: {
      targetUserId: targetMembership.user_id,
      newStatus,
    },
  });

  return { success: true };
}

/**
 * Retrieves all available roles (system roles + company-specific custom roles)
 * with their associated permission codes.
 */
export async function getCompanyRoles(companyId: string): Promise<Array<Role & { permissions: string[] }>> {
  await requirePermission(companyId, "roles:view");

  const supabase = await createClient();

  // Fetch system roles and roles belonging to this company
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("*")
    .or(`company_id.is.null,company_id.eq.${companyId}`)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (rolesError || !roles) {
    return [];
  }

  // Fetch all role_permissions mapped
  const { data: rolePermissions } = await supabase
    .from("role_permissions")
    .select("role_id, permission:permissions(code)");

  const permissionsByRoleId: Record<string, string[]> = {};
  for (const rp of rolePermissions || []) {
    if (!permissionsByRoleId[rp.role_id]) {
      permissionsByRoleId[rp.role_id] = [];
    }
    const code = (rp.permission as any)?.code;
    if (code) {
      permissionsByRoleId[rp.role_id].push(code);
    }
  }

  return roles.map((role) => ({
    ...role,
    permissions: permissionsByRoleId[role.id] || [],
  }));
}

/**
 * Retrieves the catalog of all available permissions in the system.
 */
export async function getPermissionsCatalog(): Promise<Permission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permissions")
    .select("*")
    .order("resource", { ascending: true })
    .order("code", { ascending: true });

  if (error || !data) return [];
  return data;
}

/**
 * Creates a tenant-scoped custom role with granular permissions.
 * Prevents privilege escalation: non-super-admins cannot grant permissions they do not possess.
 */
export async function createCustomRole(
  companyId: string,
  rawData: unknown
): Promise<{ success: boolean; data?: Role; error?: string }> {
  const caller = await requireUser();
  const callerContext = await requirePermission(companyId, "roles:create", caller);

  const parsed = customRoleSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const { name, code, description, permissionCodes } = parsed.data;

  // Privilege escalation check: caller cannot grant permissions they don't have
  if (!caller.is_super_admin && !callerContext.permissions.includes("*")) {
    const unauthorizedPerms = permissionCodes.filter(
      (code) => !callerContext.permissions.includes(code)
    );
    if (unauthorizedPerms.length > 0) {
      return {
        success: false,
        error: `Privilege Escalation Blocked: You cannot grant permissions you do not possess: ${unauthorizedPerms.join(", ")}`,
      };
    }
  }

  const supabase = await createClient();

  // 1. Verify code uniqueness within this company
  const { data: existingRole } = await supabase
    .from("roles")
    .select("id")
    .eq("company_id", companyId)
    .eq("code", code)
    .maybeSingle();

  if (existingRole) {
    return { success: false, error: `A role with code '${code}' already exists in this company` };
  }

  // 2. Fetch permission IDs for the provided codes
  const { data: permissions } = await supabase
    .from("permissions")
    .select("id, code")
    .in("code", permissionCodes);

  if (!permissions || permissions.length === 0) {
    return { success: false, error: "No valid permissions matched the selection" };
  }

  // 3. Create the custom role
  const { data: newRole, error: roleError } = await supabase
    .from("roles")
    .insert({
      company_id: companyId,
      name,
      code,
      description: description || null,
      is_system: false,
      created_by: caller.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (roleError || !newRole) {
    return { success: false, error: roleError?.message || "Failed to create custom role" };
  }

  // 4. Insert role_permissions mappings
  const mappings = permissions.map((p) => ({
    role_id: newRole.id,
    permission_id: p.id,
    created_at: new Date().toISOString(),
  }));

  const { error: mappingError } = await supabase
    .from("role_permissions")
    .insert(mappings);

  if (mappingError) {
    // Attempt rollback of created role
    await supabase.from("roles").delete().eq("id", newRole.id);
    return { success: false, error: "Failed to link permissions to the role" };
  }

  // 5. Record Audit Log
  await recordAuditLog({
    companyId,
    userId: caller.id,
    action: "role.create",
    resource: "roles",
    resourceId: newRole.id,
    details: {
      name,
      code,
      assignedPermissionsCount: permissions.length,
      assignedPermissions: permissions.map((p) => p.code),
    },
  });

  return { success: true, data: newRole };
}

/**
 * Deletes a tenant-scoped custom role.
 * Protects system roles and roles with active member assignments.
 */
export async function deleteCustomRole(
  companyId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  const caller = await requireUser();
  await requirePermission(companyId, "roles:delete", caller);

  const supabase = await createClient();

  // 1. Fetch role
  const { data: role, error: fetchError } = await supabase
    .from("roles")
    .select("*")
    .eq("id", roleId)
    .single();

  if (fetchError || !role) {
    return { success: false, error: "Role not found" };
  }

  // Protect system roles
  if (role.is_system) {
    return { success: false, error: "Governance Protection: Built-in system roles cannot be deleted" };
  }

  // Protect tenant boundary
  if (role.company_id !== companyId) {
    return { success: false, error: "Cross-tenant violation: Cannot delete a role belonging to another organization" };
  }

  // 2. Protect roles with active memberships
  const { data: assignedMembers, count } = await supabase
    .from("memberships")
    .select("id", { count: "exact" })
    .eq("company_id", companyId)
    .eq("role_id", roleId);

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete role: ${count} active member(s) are currently assigned to this role. Reassign their roles first.`,
    };
  }

  // 3. Delete role_permissions first, then the role
  await supabase.from("role_permissions").delete().eq("role_id", roleId);
  const { error: deleteError } = await supabase.from("roles").delete().eq("id", roleId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  // 4. Record Audit Log
  await recordAuditLog({
    companyId,
    userId: caller.id,
    action: "role.delete",
    resource: "roles",
    resourceId: roleId,
    details: {
      roleName: role.name,
      roleCode: role.code,
    },
  });

  return { success: true };
}
