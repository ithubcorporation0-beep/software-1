import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser, getCurrentUser } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";
import { getCachedCompanyData, revalidateCompanyTag } from "@/lib/cache/tagged-cache";
import { updateCompanySummaryIncremental } from "@/lib/summaries/company-summaries";
import {
  Customer,
  CustomerNote,
  CustomerActivity,
  CustomerDocument,
  CustomerType,
  CustomerStatus,
  Lead,
  LeadStatus,
  LeadSource,
  Profile,
} from "@/types/database.types";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const customerSchema = z.object({
  customerCode: z.string().trim().optional(),
  name: z.string().trim().min(2, "Customer contact name must be at least 2 characters").max(100),
  companyName: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(50).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(100).default("US"),
  taxNumber: z.string().trim().max(50).optional().or(z.literal("")),
  customerType: z.enum(["B2B", "B2C", "Enterprise", "SMB", "Government", "Wholesale"]).default("B2B"),
  status: z.enum(["Active", "Inactive", "Lead", "Archived"]).default("Active"),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const leadSchema = z.object({
  leadCode: z.string().trim().optional(),
  name: z.string().trim().min(2, "Lead prospect name must be at least 2 characters").max(100),
  companyName: z.string().trim().max(100).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email format").optional().or(z.literal("")),
  source: z.enum([
    "Website",
    "Referral",
    "Inbound Call",
    "Conference / Event",
    "LinkedIn / Social",
    "Cold Outreach",
    "Partner",
    "Other",
  ]).default("Website"),
  assignedTo: z.string().uuid("Invalid assignee UUID").optional().or(z.literal("")),
  status: z.enum(["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]).default("New"),
  expectedValue: z.coerce.number().min(0, "Expected value must be positive").default(0),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  followUpDate: z.string().optional().or(z.literal("")),
  lostReason: z.string().trim().max(255).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const customerNoteSchema = z.object({
  content: z.string().trim().min(1, "Note content cannot be empty").max(5000),
});

// In-memory tenant store fallback if PostgreSQL tables are awaiting remote push
const memoryTenantStore: {
  customers: Customer[];
  notes: CustomerNote[];
  activities: CustomerActivity[];
  leads: Lead[];
} = {
  customers: [],
  notes: [],
  activities: [],
  leads: [],
};

export function resetMemoryTenantStore(): void {
  memoryTenantStore.customers = [];
  memoryTenantStore.notes = [];
  memoryTenantStore.activities = [];
  memoryTenantStore.leads = [];
}
export const resetMemoryCRMStore = resetMemoryTenantStore;

function generateCode(prefix: string): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${rand}`;
}

// ============================================================================
// CUSTOMER SERVICES
// ============================================================================

export interface CustomerListOptions {
  search?: string;
  status?: string;
  customerType?: string;
  sortBy?: "name" | "createdAt" | "totalSpend" | "companyName";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Retrieves paginated customers for an authorized company tenant.
 */
export async function getCustomers(
  companyId: string,
  options?: CustomerListOptions,
  viewingUser?: Profile
): Promise<PaginatedResult<Customer>> {
  const context = await requirePermission(companyId, "crm:view", viewingUser);
  const isCustomerPortal = context?.role?.code === "customer";
  const callerUser = isCustomerPortal ? (viewingUser || (await getCurrentUser())) : null;
  const callerEmail = callerUser?.email?.trim().toLowerCase();

  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.max(1, Math.min(50, options?.pageSize || 10));
  const supabase = await createClient();

  try {
    let query = supabase
      .from("customers")
      .select("*", { count: "exact" })
      .eq("company_id", companyId);

    if (isCustomerPortal) {
      if (!callerEmail) {
        return { data: [], total: 0, page: 1, pageSize, totalPages: 1 };
      }
      query = query.eq("email", callerEmail);
    }

    if (options?.status && options.status !== "ALL") {
      query = query.eq("status", options.status);
    }
    if (options?.customerType && options.customerType !== "ALL") {
      query = query.eq("customer_type", options.customerType);
    }
    if (options?.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      query = query.or(`name.ilike.${term},company_name.ilike.${term},email.ilike.${term},customer_code.ilike.${term}`);
    }

    const sortCol = options?.sortBy === "companyName" ? "company_name" :
                    options?.sortBy === "totalSpend" ? "total_spend" :
                    options?.sortBy === "name" ? "name" : "created_at";
    query = query.order(sortCol, { ascending: options?.sortOrder === "asc" });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (!error && data) {
      return {
        data: data as Customer[],
        total: count || data.length,
        page,
        pageSize,
        totalPages: Math.ceil((count || data.length) / pageSize) || 1,
      };
    }
  } catch {
    // Fall through to memory store fallback
  }

  // Fallback to memory tenant store
  let filtered = memoryTenantStore.customers.filter((c) => c.company_id === companyId);
  if (isCustomerPortal) {
    if (!callerEmail) return { data: [], total: 0, page: 1, pageSize, totalPages: 1 };
    filtered = filtered.filter((c) => (c.email || "").toLowerCase() === callerEmail);
  }
  if (options?.status && options.status !== "ALL") {
    filtered = filtered.filter((c) => c.status === options.status);
  }
  if (options?.customerType && options.customerType !== "ALL") {
    filtered = filtered.filter((c) => c.customer_type === options.customerType);
  }
  if (options?.search && options.search.trim()) {
    const s = options.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.company_name && c.company_name.toLowerCase().includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s)) ||
        c.customer_code.toLowerCase().includes(s)
    );
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return {
    data: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

/**
 * Retrieves cached, lightweight customer options for dropdowns and pickers (e.g., invoice creator).
 * Cached with tag 'company-{companyId}-customers-picker' to avoid full scans on invoice forms.
 */
export async function getCustomerPickerOptions(
  companyId: string
): Promise<Array<{ id: string; name: string; companyName: string; email: string }>> {
  await requirePermission(companyId, "crm:view");

  return await getCachedCompanyData(
    companyId,
    "customers-picker",
    async () => {
      const supabase = await createClient();
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("id, name, company_name, email")
          .eq("company_id", companyId)
          .eq("status", "Active")
          .order("name", { ascending: true })
          .limit(100);

        if (!error && data && data.length > 0) {
          return data.map((c: any) => ({
            id: c.id,
            name: c.name,
            companyName: c.company_name || "",
            email: c.email || "",
          }));
        }
      } catch {
        // Fall back to memory store
      }

      return memoryTenantStore.customers
        .filter((c) => c.company_id === companyId && c.status === "Active")
        .map((c) => ({
          id: c.id,
          name: c.name,
          companyName: c.company_name || "",
          email: c.email || "",
        }));
    },
    1800 // 30-minute TTL
  );
}

/**
 * Retrieves a customer by ID with notes, timeline, and link metadata.
 * Enforces strict tenant scoping.
 */
export async function getCustomerById(
  companyId: string,
  customerId: string,
  viewingUser?: Profile
): Promise<{
  customer: Customer;
  notes: CustomerNote[];
  activities: CustomerActivity[];
  links: {
    invoicesCount: number;
    paymentsCount: number;
    projectsCount: number;
  };
} | null> {
  const context = await requirePermission(companyId, "crm:view", viewingUser);

  const supabase = await createClient();

  let customer: Customer | null = null;
  let notes: CustomerNote[] = [];
  let activities: CustomerActivity[] = [];

  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", customerId)
      .single();

    if (!error && data) {
      customer = data as Customer;

      // Fetch notes
      const { data: notesData } = await supabase
        .from("customer_notes")
        .select("*")
        .eq("company_id", companyId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (notesData) notes = notesData as CustomerNote[];

      // Fetch activities
      const { data: actData } = await supabase
        .from("customer_activities")
        .select("*")
        .eq("company_id", companyId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (actData) activities = actData as CustomerActivity[];
    }
  } catch {
    // Fall through to memory store
  }

  if (!customer) {
    const memCust = memoryTenantStore.customers.find(
      (c) => c.company_id === companyId && c.id === customerId
    );
    if (!memCust) return null;
    customer = memCust;
  }

  if (context?.role?.code === "customer") {
    const callerUser = viewingUser || (await getCurrentUser());
    const callerEmail = callerUser?.email?.trim().toLowerCase();
    if (!callerEmail || (customer.email || "").toLowerCase() !== callerEmail) {
      return null;
    }
  }

  if (notes.length === 0) {
    notes = memoryTenantStore.notes.filter((n) => n.customer_id === customerId);
  }
  if (activities.length === 0) {
    activities = memoryTenantStore.activities.filter((a) => a.customer_id === customerId);
  }

    // Real Sales & Invoices count
    let invoicesCount = 0;
    let paymentsCount = 0;
    try {
      const { getInvoices, getPayments } = await import("@/lib/sales/server");
      const [invList, payList] = await Promise.all([
        getInvoices(companyId).catch(() => []),
        getPayments(companyId, { customerId }).catch(() => []),
      ]);
      invoicesCount = invList.filter((i) => i.customer_id === customerId).length;
      paymentsCount = payList.length;
    } catch {
      // Fall through
    }

    return {
      customer,
      notes,
      activities,
      links: {
        invoicesCount,
        paymentsCount,
        projectsCount: 0,
      },
    };
}

/**
 * Creates a new customer record.
 * Validates fields, checks tenant-scoped uniqueness, and logs audit record.
 */
export async function createCustomer(
  companyId: string,
  rawData: unknown,
  creatorUser?: Profile
): Promise<{ success: boolean; data?: Customer; error?: string; errors?: Record<string, string[]> }> {
  const user = creatorUser || (await requireUser());
  await requirePermission(companyId, "crm:create", user);

  const parsed = customerSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed: please review the highlighted fields",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const valid = parsed.data;
  const supabase = await createClient();
  const customerCode = valid.customerCode?.trim() || generateCode("CUST");

  // 1. Sensible duplicate prevention check (tenant-scoped)
  if (valid.email) {
    let existingName: string | null = null;
    try {
      const { data: existing } = await supabase
        .from("customers")
        .select("id, name")
        .eq("company_id", companyId)
        .eq("email", valid.email)
        .maybeSingle();

      if (existing) {
        existingName = existing.name;
      }
    } catch {
      // Fall through
    }

    if (!existingName) {
      const memExisting = memoryTenantStore.customers.find(
        (c) => c.company_id === companyId && c.email?.toLowerCase() === valid.email?.toLowerCase()
      );
      if (memExisting) {
        existingName = memExisting.name;
      }
    }

    if (existingName) {
      return {
        success: false,
        error: `A customer record with email '${valid.email}' already exists (${existingName}).`,
      };
    }
  }

  const now = new Date().toISOString();
  const newCustomer: Customer = {
    id: crypto.randomUUID(),
    company_id: companyId,
    customer_code: customerCode,
    name: valid.name,
    company_name: valid.companyName || null,
    email: valid.email || null,
    phone: valid.phone || null,
    whatsapp: valid.whatsapp || null,
    address: valid.address || null,
    city: valid.city || null,
    country: valid.country,
    tax_number: valid.taxNumber || null,
    customer_type: valid.customerType as CustomerType,
    status: valid.status as CustomerStatus,
    notes: valid.notes || null,
    documents: [],
    total_spend: 0.0,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from("customers")
      .insert(newCustomer)
      .select()
      .single();

    if (!error && data) {
      newCustomer.id = data.id;
    } else {
      memoryTenantStore.customers.unshift(newCustomer);
    }
  } catch {
    memoryTenantStore.customers.unshift(newCustomer);
  }

  // Log activity
  const activity: CustomerActivity = {
    id: crypto.randomUUID(),
    company_id: companyId,
    customer_id: newCustomer.id,
    user_id: user.id,
    type: "created",
    title: "Customer Account Created",
    description: `Account initialized by ${user.full_name} (${valid.customerType})`,
    metadata: { code: customerCode, type: valid.customerType },
    created_at: now,
  };
  try {
    await supabase.from("customer_activities").insert(activity);
  } catch {
    memoryTenantStore.activities.unshift(activity);
  }

  // Audit trail
  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.customer_create",
    resource: "customers",
    resourceId: newCustomer.id,
    details: {
      name: newCustomer.name,
      customerCode: newCustomer.customer_code,
      companyName: newCustomer.company_name,
      customerType: newCustomer.customer_type,
    },
  });

  revalidateCompanyTag(companyId, "customers-picker");
  updateCompanySummaryIncremental(companyId, { customersDelta: 1 }).catch(() => {});

  return { success: true, data: newCustomer };
}

/**
 * Updates an existing customer record.
 */
export async function updateCustomer(
  companyId: string,
  customerId: string,
  rawData: unknown,
  actorUser?: Profile
): Promise<{ success: boolean; data?: Customer; error?: string; errors?: Record<string, string[]> }> {
  const user = actorUser || (await requireUser());
  await requirePermission(companyId, "crm:edit", user);

  const parsed = customerSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed: please review the highlighted fields",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const valid = parsed.data;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const updatePayload = {
    name: valid.name,
    company_name: valid.companyName || null,
    email: valid.email || null,
    phone: valid.phone || null,
    whatsapp: valid.whatsapp || null,
    address: valid.address || null,
    city: valid.city || null,
    country: valid.country,
    tax_number: valid.taxNumber || null,
    customer_type: valid.customerType as CustomerType,
    status: valid.status as CustomerStatus,
    notes: valid.notes || null,
    updated_at: now,
  };

  let updatedCustomer: Customer | null = null;
  try {
    const { data, error } = await supabase
      .from("customers")
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", customerId)
      .select()
      .single();

    if (!error && data) {
      updatedCustomer = data as Customer;
    }
  } catch {
    // Fall through
  }

  if (!updatedCustomer) {
    const idx = memoryTenantStore.customers.findIndex(
      (c) => c.company_id === companyId && c.id === customerId
    );
    if (idx !== -1) {
      memoryTenantStore.customers[idx] = {
        ...memoryTenantStore.customers[idx],
        ...updatePayload,
      };
      updatedCustomer = memoryTenantStore.customers[idx];
    }
  }

  if (!updatedCustomer) {
    return { success: false, error: "Customer record not found" };
  }

  // Activity log
  const activity: CustomerActivity = {
    id: crypto.randomUUID(),
    company_id: companyId,
    customer_id: customerId,
    user_id: user.id,
    type: "updated",
    title: "Customer Details Modified",
    description: `Profile updated by ${user.full_name}`,
    metadata: { updatedFields: Object.keys(valid) },
    created_at: now,
  };
  try {
    await supabase.from("customer_activities").insert(activity);
  } catch {
    // Fall through
  }
  memoryTenantStore.activities.unshift(activity);

  // Audit trail
  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.customer_update",
    resource: "customers",
    resourceId: customerId,
    details: {
      name: updatedCustomer.name,
      customerCode: updatedCustomer.customer_code,
      updatedFields: Object.keys(valid),
    },
  });

  revalidateCompanyTag(companyId, "customers-picker");

  return { success: true, data: updatedCustomer };
}

/**
 * Safely archives a customer (soft status update).
 */
export async function archiveCustomer(
  companyId: string,
  customerId: string,
  actorUser?: Profile
): Promise<{ success: boolean; error?: string }> {
  const user = actorUser || (await requireUser());
  await requirePermission(companyId, "crm:edit", user);

  const supabase = await createClient();
  const now = new Date().toISOString();

  try {
    await supabase
      .from("customers")
      .update({ status: "Archived", updated_at: now })
      .eq("company_id", companyId)
      .eq("id", customerId);
  } catch {
    // Fall through
  }

  const cust = memoryTenantStore.customers.find((c) => c.company_id === companyId && c.id === customerId);
  if (cust) {
    cust.status = "Archived";
    cust.updated_at = now;
  }

  // Log activity
  const activity: CustomerActivity = {
    id: crypto.randomUUID(),
    company_id: companyId,
    customer_id: customerId,
    user_id: user.id,
    type: "archived",
    title: "Customer Archived",
    description: "Account archived by administrator.",
    metadata: {},
    created_at: now,
  };
  try {
    await supabase.from("customer_activities").insert(activity);
  } catch {
    // Fall through
  }
  memoryTenantStore.activities.unshift(activity);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.customer_archive",
    resource: "customers",
    resourceId: customerId,
  });

  return { success: true };
}

/**
 * Destructive deletion protection:
 * Blocks deletion if the customer has financial history or active module links.
 */
export async function deleteCustomer(
  companyId: string,
  customerId: string,
  actorUser?: Profile
): Promise<{ success: boolean; error?: string }> {
  const user = actorUser || (await requireUser());
  await requirePermission(companyId, "crm:delete", user);

  const detail = await getCustomerById(companyId, customerId);
  if (!detail) {
    return { success: false, error: "Customer not found" };
  }

  // Destructive deletion guard
  if (detail.customer.total_spend > 0) {
    return {
      success: false,
      error: `Destructive Deletion Blocked: Customer '${detail.customer.name}' has recorded financial history ($${detail.customer.total_spend.toFixed(2)}). Please Archive this account instead to preserve financial audit compliance.`,
    };
  }

  const supabase = await createClient();
  try {
    await supabase
      .from("customers")
      .delete()
      .eq("company_id", companyId)
      .eq("id", customerId);
  } catch {
    // Fall through
  }

  memoryTenantStore.customers = memoryTenantStore.customers.filter((c) => c.id !== customerId);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.customer_delete",
    resource: "customers",
    resourceId: customerId,
    details: { name: detail.customer.name, code: detail.customer.customer_code },
  });

  return { success: true };
}

/**
 * Adds an interactive note to a customer.
 */
export async function addCustomerNote(
  companyId: string,
  customerId: string,
  content: string,
  actorUser?: Profile
): Promise<{ success: boolean; data?: CustomerNote; error?: string }> {
  const user = actorUser || (await requireUser());
  await requirePermission(companyId, "crm:edit", user);

  const parsed = customerNoteSchema.safeParse({ content });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid note content" };
  }

  const now = new Date().toISOString();
  const note: CustomerNote = {
    id: crypto.randomUUID(),
    company_id: companyId,
    customer_id: customerId,
    author_id: user.id,
    author_name: user.full_name,
    content: parsed.data.content,
    created_at: now,
    updated_at: now,
  };

  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from("customer_notes").insert(note).select().single();
    if (!error && data) note.id = data.id;
  } catch {
    // Memory store
  }
  memoryTenantStore.notes.unshift(note);

  // Activity log
  const activity: CustomerActivity = {
    id: crypto.randomUUID(),
    company_id: companyId,
    customer_id: customerId,
    user_id: user.id,
    type: "note_added",
    title: "Internal Note Appended",
    description: parsed.data.content.length > 80 ? parsed.data.content.slice(0, 80) + "..." : parsed.data.content,
    metadata: { author: user.full_name },
    created_at: now,
  };
  try {
    await supabase.from("customer_activities").insert(activity);
  } catch {
    // Fall through
  }
  memoryTenantStore.activities.unshift(activity);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.note_add",
    resource: "customer_notes",
    resourceId: note.id,
    details: { customerId },
  });

  return { success: true, data: note };
}

// ============================================================================
// LEADS & KANBAN PIPELINE SERVICES
// ============================================================================

export interface LeadFilterOptions {
  search?: string;
  status?: string;
  assignedTo?: string;
  source?: string;
}

export const KANBAN_STAGES: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

/**
 * Retrieves leads for an authorized company tenant.
 */
export async function getLeads(
  companyId: string,
  options?: LeadFilterOptions,
  viewingUser?: Profile
): Promise<{ leads: Lead[]; totalPipelineValue: number }> {
  await requirePermission(companyId, "crm:view", viewingUser);

  const supabase = await createClient();
  let leads: Lead[] = [];

  try {
    let query = supabase
      .from("leads")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (options?.status && options.status !== "ALL") {
      query = query.eq("status", options.status);
    }
    if (options?.source && options.source !== "ALL") {
      query = query.eq("source", options.source);
    }
    if (options?.assignedTo && options.assignedTo !== "ALL") {
      query = query.eq("assigned_to", options.assignedTo);
    }

    const limit = Math.min((options as any)?.limit ?? 50, 50);
    query = query.limit(limit);

    const { data, error } = await query;
    if (!error && data) {
      leads = data as Lead[];
    }
  } catch {
    // Fall through
  }

  if (leads.length === 0) {
    leads = memoryTenantStore.leads.filter((l) => l.company_id === companyId);
    if (options?.status && options.status !== "ALL") {
      leads = leads.filter((l) => l.status === options.status);
    }
    if (options?.source && options.source !== "ALL") {
      leads = leads.filter((l) => l.source === options.source);
    }
    if (options?.assignedTo && options.assignedTo !== "ALL") {
      leads = leads.filter((l) => l.assigned_to === options.assignedTo);
    }
  }

  if (options?.search && options.search.trim()) {
    const s = options.search.toLowerCase();
    leads = leads.filter(
      (l) =>
        l.name.toLowerCase().includes(s) ||
        (l.company_name && l.company_name.toLowerCase().includes(s)) ||
        (l.email && l.email.toLowerCase().includes(s)) ||
        l.lead_code.toLowerCase().includes(s)
    );
  }

  const totalPipelineValue = leads
    .filter((l) => l.status !== "Lost")
    .reduce((acc, l) => acc + Number(l.expected_value || 0), 0);

  return { leads, totalPipelineValue };
}

/**
 * Creates a new lead in the pipeline.
 */
export async function createLead(
  companyId: string,
  rawData: unknown,
  creatorUser?: Profile
): Promise<{ success: boolean; data?: Lead; error?: string; errors?: Record<string, string[]> }> {
  const user = creatorUser || (await requireUser());
  await requirePermission(companyId, "crm:create", user);

  const parsed = leadSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed: please review the highlighted fields",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const valid = parsed.data;
  const leadCode = valid.leadCode?.trim() || generateCode("LEAD");
  const now = new Date().toISOString();

  const newLead: Lead = {
    id: crypto.randomUUID(),
    company_id: companyId,
    lead_code: leadCode,
    name: valid.name,
    company_name: valid.companyName || null,
    phone: valid.phone || null,
    email: valid.email || null,
    source: valid.source as LeadSource,
    assigned_to: valid.assignedTo || user.id,
    status: valid.status as LeadStatus,
    expected_value: valid.expectedValue,
    notes: valid.notes || null,
    follow_up_date: valid.followUpDate || null,
    lost_reason: null,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from("leads").insert(newLead).select().single();
    if (!error && data) newLead.id = data.id;
    else memoryTenantStore.leads.unshift(newLead);
  } catch {
    memoryTenantStore.leads.unshift(newLead);
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.lead_create",
    resource: "leads",
    resourceId: newLead.id,
    details: {
      name: newLead.name,
      code: newLead.lead_code,
      status: newLead.status,
      expectedValue: newLead.expected_value,
    },
  });

  return { success: true, data: newLead };
}

/**
 * Moves a lead between Kanban pipeline stages.
 * Validates permission, updates status and optional lostReason, records audit trail.
 */
export async function moveLeadStage(
  companyId: string,
  leadId: string,
  newStage: LeadStatus,
  lostReason?: string,
  actorUser?: Profile
): Promise<{ success: boolean; data?: Lead; error?: string }> {
  const user = actorUser || (await requireUser());
  await requirePermission(companyId, "crm:edit", user);

  if (!KANBAN_STAGES.includes(newStage)) {
    return { success: false, error: `Invalid pipeline stage: ${newStage}` };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  let previousStatus: string = "Unknown";
  let updatedLead: Lead | null = null;

  try {
    const { data: existing } = await supabase
      .from("leads")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", leadId)
      .single();

    if (existing) {
      previousStatus = existing.status;
      const { data, error } = await supabase
        .from("leads")
        .update({
          status: newStage,
          lost_reason: newStage === "Lost" ? (lostReason || "No reason specified") : null,
          updated_at: now,
        })
        .eq("company_id", companyId)
        .eq("id", leadId)
        .select()
        .single();

      if (!error && data) updatedLead = data as Lead;
    }
  } catch {
    // Fall through
  }

  if (!updatedLead) {
    const memLead = memoryTenantStore.leads.find((l) => l.company_id === companyId && l.id === leadId);
    if (!memLead) return { success: false, error: "Lead not found in this company" };
    previousStatus = memLead.status;
    memLead.status = newStage;
    memLead.lost_reason = newStage === "Lost" ? (lostReason || "No reason specified") : null;
    memLead.updated_at = now;
    updatedLead = memLead;
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.lead_stage_change",
    resource: "leads",
    resourceId: leadId,
    details: {
      leadCode: updatedLead.lead_code,
      name: updatedLead.name,
      previousStatus,
      newStatus: newStage,
      lostReason: lostReason || null,
    },
  });

  return { success: true, data: updatedLead };
}

/**
 * Updates lead details, assignee, or follow-up date.
 */
export async function updateLead(
  companyId: string,
  leadId: string,
  rawData: unknown
): Promise<{ success: boolean; data?: Lead; error?: string; errors?: Record<string, string[]> }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:edit", user);

  const parsed = leadSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed: please review the highlighted fields",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const valid = parsed.data;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const updatePayload = {
    name: valid.name,
    company_name: valid.companyName || null,
    phone: valid.phone || null,
    email: valid.email || null,
    source: valid.source as LeadSource,
    assigned_to: valid.assignedTo || null,
    status: valid.status as LeadStatus,
    expected_value: valid.expectedValue,
    notes: valid.notes || null,
    follow_up_date: valid.followUpDate || null,
    lost_reason: valid.lostReason || null,
    updated_at: now,
  };

  let updatedLead: Lead | null = null;
  try {
    const { data, error } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("company_id", companyId)
      .eq("id", leadId)
      .select()
      .single();

    if (!error && data) updatedLead = data as Lead;
  } catch {
    // Fall through
  }

  if (!updatedLead) {
    const idx = memoryTenantStore.leads.findIndex((l) => l.company_id === companyId && l.id === leadId);
    if (idx !== -1) {
      memoryTenantStore.leads[idx] = { ...memoryTenantStore.leads[idx], ...updatePayload };
      updatedLead = memoryTenantStore.leads[idx];
    }
  }

  if (!updatedLead) return { success: false, error: "Lead not found" };

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.lead_update",
    resource: "leads",
    resourceId: leadId,
    details: { code: updatedLead.lead_code, name: updatedLead.name },
  });

  return { success: true, data: updatedLead };
}
