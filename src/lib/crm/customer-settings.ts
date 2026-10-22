import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";
import { revalidateCompanyTag } from "@/lib/cache/tagged-cache";
import { CustomerGroup, CustomerCategory, Customer, CustomerStatus } from "@/types/database.types";
import { getCustomers, createCustomer, deleteCustomer } from "@/lib/crm/server";

// In-memory fallback stores for groups and categories
const memoryGroups: CustomerGroup[] = [
  {
    id: "group-general",
    company_id: "default",
    name: "General",
    description: "Standard regular accounts and walk-in trade",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "group-wholesale",
    company_id: "default",
    name: "Wholesale Traders",
    description: "Bulk wholesale distributors and dealers (Section 236G)",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "group-corporate",
    company_id: "default",
    name: "Corporate Accounts",
    description: "Large enterprise partners and corporate procurement",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "group-retail",
    company_id: "default",
    name: "Retail Merchants",
    description: "Retail tier shops and end retailers (Section 236H)",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const memoryCategories: CustomerCategory[] = [
  {
    id: "cat-priority",
    company_id: "default",
    name: "Tier 1 Priority",
    description: "High volume tier-1 accounts with immediate dispatch",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "cat-standard",
    company_id: "default",
    name: "Standard Commercial",
    description: "Normal credit-terms commercial customers",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "cat-exempt",
    company_id: "default",
    name: "Exempt / Non-Profit",
    description: "Sales tax exempt and non-profit institutions",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "cat-government",
    company_id: "default",
    name: "Government Entities",
    description: "State department procurement and municipal bodies",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper to get all customers for tenant to compute customer_count
async function getTenantCustomers(companyId: string): Promise<Customer[]> {
  try {
    const res = await getCustomers(companyId, { pageSize: 1000 });
    return res.data || [];
  } catch {
    return [];
  }
}

// ============================================================================
// CUSTOMER GROUPS
// ============================================================================

export async function getCustomerGroups(companyId: string): Promise<CustomerGroup[]> {
  await requirePermission(companyId, "crm:view");
  const customers = await getTenantCustomers(companyId);

  // Return groups with dynamic customer counts
  const tenantGroups = memoryGroups.filter((g) => g.company_id === companyId || g.company_id === "default");
  
  return tenantGroups.map((g) => {
    const count = customers.filter(
      (c) => (c.customer_group || "").toLowerCase() === g.name.toLowerCase()
    ).length;
    return {
      ...g,
      company_id: companyId,
      customer_count: count,
    };
  });
}

export async function createCustomerGroup(
  companyId: string,
  data: { name: string; description?: string }
): Promise<{ success: boolean; data?: CustomerGroup; error?: string }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:create", user);

  if (!data.name?.trim()) {
    return { success: false, error: "Group name is required." };
  }

  const existing = memoryGroups.find(
    (g) => (g.company_id === companyId || g.company_id === "default") && g.name.toLowerCase() === data.name.trim().toLowerCase()
  );
  if (existing) {
    return { success: false, error: `Customer Group '${data.name}' already exists.` };
  }

  const now = new Date().toISOString();
  const newGroup: CustomerGroup = {
    id: crypto.randomUUID(),
    company_id: companyId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    customer_count: 0,
    created_at: now,
    updated_at: now,
  };

  memoryGroups.unshift(newGroup);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.customer_group_create",
    resource: "customer_groups",
    resourceId: newGroup.id,
    details: { name: newGroup.name },
  });

  return { success: true, data: newGroup };
}

export async function updateCustomerGroup(
  companyId: string,
  groupId: string,
  data: { name: string; description?: string }
): Promise<{ success: boolean; data?: CustomerGroup; error?: string }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:edit", user);

  if (!data.name?.trim()) {
    return { success: false, error: "Group name is required." };
  }

  const idx = memoryGroups.findIndex((g) => g.id === groupId);
  if (idx === -1) {
    return { success: false, error: "Customer Group not found." };
  }

  const now = new Date().toISOString();
  memoryGroups[idx] = {
    ...memoryGroups[idx],
    company_id: companyId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    updated_at: now,
  };

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.customer_group_update",
    resource: "customer_groups",
    resourceId: groupId,
    details: { name: data.name },
  });

  return { success: true, data: memoryGroups[idx] };
}

export async function deleteCustomerGroup(
  companyId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:delete", user);

  const idx = memoryGroups.findIndex((g) => g.id === groupId);
  if (idx === -1) {
    return { success: false, error: "Customer Group not found." };
  }

  const groupName = memoryGroups[idx].name;
  const customers = await getTenantCustomers(companyId);
  const inUse = customers.some((c) => (c.customer_group || "").toLowerCase() === groupName.toLowerCase());
  if (inUse) {
    return { success: false, error: `Cannot delete group '${groupName}' because it is assigned to existing customers.` };
  }

  memoryGroups.splice(idx, 1);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.customer_group_delete",
    resource: "customer_groups",
    resourceId: groupId,
  });

  return { success: true };
}

// ============================================================================
// CUSTOMER CATEGORIES
// ============================================================================

export async function getCustomerCategories(companyId: string): Promise<CustomerCategory[]> {
  await requirePermission(companyId, "crm:view");
  const customers = await getTenantCustomers(companyId);

  const tenantCategories = memoryCategories.filter((c) => c.company_id === companyId || c.company_id === "default");

  return tenantCategories.map((cat) => {
    const count = customers.filter(
      (c) => (c.customer_category || "").toLowerCase() === cat.name.toLowerCase()
    ).length;
    return {
      ...cat,
      company_id: companyId,
      customer_count: count,
    };
  });
}

export async function createCustomerCategory(
  companyId: string,
  data: { name: string; description?: string }
): Promise<{ success: boolean; data?: CustomerCategory; error?: string }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:create", user);

  if (!data.name?.trim()) {
    return { success: false, error: "Category name is required." };
  }

  const existing = memoryCategories.find(
    (c) => (c.company_id === companyId || c.company_id === "default") && c.name.toLowerCase() === data.name.trim().toLowerCase()
  );
  if (existing) {
    return { success: false, error: `Customer Category '${data.name}' already exists.` };
  }

  const now = new Date().toISOString();
  const newCat: CustomerCategory = {
    id: crypto.randomUUID(),
    company_id: companyId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    customer_count: 0,
    created_at: now,
    updated_at: now,
  };

  memoryCategories.unshift(newCat);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.customer_category_create",
    resource: "customer_categories",
    resourceId: newCat.id,
    details: { name: newCat.name },
  });

  return { success: true, data: newCat };
}

export async function updateCustomerCategory(
  companyId: string,
  categoryId: string,
  data: { name: string; description?: string }
): Promise<{ success: boolean; data?: CustomerCategory; error?: string }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:edit", user);

  if (!data.name?.trim()) {
    return { success: false, error: "Category name is required." };
  }

  const idx = memoryCategories.findIndex((c) => c.id === categoryId);
  if (idx === -1) {
    return { success: false, error: "Customer Category not found." };
  }

  const now = new Date().toISOString();
  memoryCategories[idx] = {
    ...memoryCategories[idx],
    company_id: companyId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    updated_at: now,
  };

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.customer_category_update",
    resource: "customer_categories",
    resourceId: categoryId,
    details: { name: data.name },
  });

  return { success: true, data: memoryCategories[idx] };
}

export async function deleteCustomerCategory(
  companyId: string,
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:delete", user);

  const idx = memoryCategories.findIndex((c) => c.id === categoryId);
  if (idx === -1) {
    return { success: false, error: "Customer Category not found." };
  }

  const catName = memoryCategories[idx].name;
  const customers = await getTenantCustomers(companyId);
  const inUse = customers.some((c) => (c.customer_category || "").toLowerCase() === catName.toLowerCase());
  if (inUse) {
    return { success: false, error: `Cannot delete category '${catName}' because it is assigned to existing customers.` };
  }

  memoryCategories.splice(idx, 1);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.customer_category_delete",
    resource: "customer_categories",
    resourceId: categoryId,
  });

  return { success: true };
}

// ============================================================================
// CUSTOMER STATUS TOGGLE & BULK ACTIONS
// ============================================================================

export async function toggleCustomerStatus(
  companyId: string,
  customerId: string,
  targetStatus?: "Active" | "Inactive" | "Disabled"
): Promise<{ success: boolean; newStatus?: CustomerStatus; error?: string }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:edit", user);

  const supabase = await createClient();

  // Fetch current customer
  let currentStatus: CustomerStatus = "Active";
  try {
    const { data } = await supabase
      .from("customers")
      .select("status")
      .eq("company_id", companyId)
      .eq("id", customerId)
      .single();
    if (data?.status) currentStatus = data.status;
  } catch {
    // Fallback
  }

  const nextStatus: CustomerStatus = targetStatus === "Disabled" || targetStatus === "Inactive"
    ? "Inactive"
    : targetStatus === "Active"
    ? "Active"
    : currentStatus === "Active"
    ? "Inactive"
    : "Active";

  try {
    await supabase
      .from("customers")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("company_id", companyId)
      .eq("id", customerId);
  } catch {
    // Fallback
  }

  revalidateCompanyTag(companyId, "customers-picker");

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "crm.customer_toggle_status",
    resource: "customers",
    resourceId: customerId,
    details: { oldStatus: currentStatus, newStatus: nextStatus },
  });

  return { success: true, newStatus: nextStatus };
}

export async function bulkDeleteCustomers(
  companyId: string,
  customerIds: string[]
): Promise<{ success: boolean; deletedCount: number; errors?: string[] }> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:delete", user);

  let deletedCount = 0;
  const errors: string[] = [];

  for (const id of customerIds) {
    try {
      const res = await deleteCustomer(companyId, id, user);
      if (res.success) {
        deletedCount++;
      } else {
        errors.push(res.error || `Failed to delete customer ${id}`);
      }
    } catch (e: any) {
      errors.push(e.message || `Error deleting ${id}`);
    }
  }

  revalidateCompanyTag(companyId, "customers-picker");
  return { success: deletedCount > 0, deletedCount, errors };
}

// ============================================================================
// CUSTOMER CSV EXPORT & IMPORT
// ============================================================================

export async function exportCustomersToCsv(companyId: string): Promise<string> {
  await requirePermission(companyId, "crm:view");
  const customers = await getTenantCustomers(companyId);

  const headers = [
    "Customer Code",
    "Company Name",
    "Contact Person",
    "Email",
    "Mobile No",
    "Customer Type",
    "NTN Number",
    "CNIC Number",
    "STRN Number",
    "Sales Tax Reg Type",
    "Sales Tax ATL",
    "Income Tax ATL",
    "Customer Category",
    "Customer Group",
    "Opening Balance",
    "Credit Limit",
    "Payment Terms",
    "Carried By",
    "Billing Address",
    "City",
    "State",
    "Zip Code",
    "Country",
    "Status",
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = customers.map((c) => [
    escapeCsv(c.customer_code),
    escapeCsv(c.company_name || c.name),
    escapeCsv(c.contact_person || c.name),
    escapeCsv(c.email || ""),
    escapeCsv(c.mobile_number || c.phone || ""),
    escapeCsv(c.customer_type),
    escapeCsv(c.ntn_number || ""),
    escapeCsv(c.cnic_number || ""),
    escapeCsv(c.strn_number || ""),
    escapeCsv(c.sales_tax_reg_type || "Unregistered"),
    escapeCsv(c.sales_tax_atl || "Inactive"),
    escapeCsv(c.income_tax_atl || "Inactive"),
    escapeCsv(c.customer_category || "General"),
    escapeCsv(c.customer_group || "General"),
    escapeCsv(c.opening_balance || 0),
    escapeCsv(c.credit_limit || 0),
    escapeCsv(c.payment_terms || "Due on Receipt"),
    escapeCsv(c.carried_by || ""),
    escapeCsv(c.billing_address || c.address || ""),
    escapeCsv(c.city || ""),
    escapeCsv(c.state || ""),
    escapeCsv(c.zip_code || ""),
    escapeCsv(c.country || "Pakistan"),
    escapeCsv(c.status),
  ].join(","));

  return [headers.join(","), ...rows].join("\n");
}

export interface CsvImportResult {
  totalRows: number;
  validRows: number;
  errorRows: Array<{ row: number; reason: string }>;
  insertedCount: number;
}

export async function importCustomersFromCsv(
  companyId: string,
  csvText: string,
  commit: boolean = false
): Promise<CsvImportResult> {
  const user = await requireUser();
  await requirePermission(companyId, "crm:create", user);

  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return { totalRows: 0, validRows: 0, errorRows: [{ row: 1, reason: "CSV file is empty or only contains headers." }], insertedCount: 0 };
  }

  // Parse header
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, "_"));
  const dataRows = lines.slice(1);

  let validCount = 0;
  let insertedCount = 0;
  const errorRows: Array<{ row: number; reason: string }> = [];

  for (let idx = 0; idx < dataRows.length; idx++) {
    const rowNum = idx + 2;
    const cols = parseRow(dataRows[idx]);
    if (cols.length === 0 || cols.every((c) => !c)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, i) => {
      rowObj[h] = cols[i] || "";
    });

    const companyName = rowObj["company_name"] || rowObj["customer_name"] || rowObj["name"] || "";
    const contactPerson = rowObj["contact_person"] || companyName;

    if (!companyName && !contactPerson) {
      errorRows.push({ row: rowNum, reason: "Missing Company Name or Contact Person." });
      continue;
    }

    validCount++;

    if (commit) {
      const payload = {
        name: companyName || contactPerson,
        companyName,
        contactPerson,
        email: rowObj["email"] || undefined,
        phone: rowObj["phone"] || rowObj["mobile_no"] || undefined,
        mobileNumber: rowObj["mobile_no"] || undefined,
        customerType: rowObj["customer_type"] || "Retailer",
        ntnNumber: rowObj["ntn_number"] || undefined,
        cnicNumber: rowObj["cnic_number"] || undefined,
        strnNumber: rowObj["strn_number"] || undefined,
        salesTaxRegType: rowObj["sales_tax_reg_type"] || "Unregistered",
        salesTaxAtl: rowObj["sales_tax_atl"] || "Inactive",
        incomeTaxAtl: rowObj["income_tax_atl"] || "Inactive",
        customerCategory: rowObj["customer_category"] || "General",
        customerGroup: rowObj["customer_group"] || "General",
        openingBalance: Number(rowObj["opening_balance"] || 0),
        creditLimit: Number(rowObj["credit_limit"] || 0),
        paymentTerms: rowObj["payment_terms"] || "Due on Receipt",
        carriedBy: rowObj["carried_by"] || undefined,
        billingAddress: rowObj["billing_address"] || undefined,
        city: rowObj["city"] || undefined,
        state: rowObj["state"] || undefined,
        zipCode: rowObj["zip_code"] || undefined,
        country: rowObj["country"] || "Pakistan",
        status: (rowObj["status"] as any) || "Active",
      };

      try {
        const createRes = await createCustomer(companyId, payload, user);
        if (createRes.success) {
          insertedCount++;
        } else {
          errorRows.push({ row: rowNum, reason: createRes.error || "Creation error" });
        }
      } catch (err: any) {
        errorRows.push({ row: rowNum, reason: err.message || "Failed to insert" });
      }
    }
  }

  return {
    totalRows: dataRows.length,
    validRows: validCount,
    errorRows,
    insertedCount,
  };
}
