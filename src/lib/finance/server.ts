import { z } from "zod";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";
import { roundMoney } from "@/lib/sales/server";
import { getCachedCompanyData, revalidateCompanyTag } from "@/lib/cache/tagged-cache";
import { updateCompanySummaryIncremental } from "@/lib/summaries/company-summaries";
import { sanitizeCSVCell } from "@/lib/utils/csv-sanitizer";
import type {
  Expense,
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseApprovalStatus,
  Account,
  AccountType,
  JournalEntry,
  JournalEntryLine,
  JournalEntryStatus,
  ProfitLossReport,
  BalanceSheetReport,
  CashFlowReport,
  ARAgingReport,
  APAgingReport,
  Profile,
} from "@/types/database.types";

// ============================================================================
// CUSTOM FINANCIAL ERRORS
// ============================================================================

export class UnbalancedJournalEntryError extends Error {
  totalDebit: number;
  totalCredit: number;
  constructor(totalDebit: number, totalCredit: number) {
    super(
      `Unbalanced journal entry: Total debits (${totalDebit.toFixed(2)}) must equal total credits (${totalCredit.toFixed(2)}). Balanced double-entry required.`
    );
    this.name = "UnbalancedJournalEntryError";
    this.totalDebit = totalDebit;
    this.totalCredit = totalCredit;
  }
}

export class SeparationOfDutiesError extends Error {
  constructor(
    message: string = "Separation of duties violation: Submitter cannot approve their own expense. Must be reviewed by an authorized administrator."
  ) {
    super(message);
    this.name = "SeparationOfDutiesError";
  }
}

export class ImmutablePostedEntryError extends Error {
  constructor(message: string = "Posted journal entries cannot be edited or deleted. Create a traceable correcting reversal entry instead.") {
    super(message);
    this.name = "ImmutablePostedEntryError";
  }
}

// ============================================================================
// RECEIPT VALIDATION
// ============================================================================

export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function validateReceiptMetadata(file: {
  name: string;
  size?: number | null;
  mimeType?: string | null;
  url?: string | null;
}): { valid: boolean; error?: string } {
  if (file.size !== undefined && file.size !== null) {
    if (file.size <= 0 || file.size > MAX_RECEIPT_SIZE_BYTES) {
      return {
        valid: false,
        error: `Receipt file size exceeds the 10MB limit (must be between 1 byte and 10MB). Provided: ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
      };
    }
  }

  if (file.mimeType) {
    const isAllowed = (ALLOWED_RECEIPT_MIME_TYPES as readonly string[]).includes(
      file.mimeType.toLowerCase()
    );
    if (!isAllowed) {
      return {
        valid: false,
        error: `Receipt file type [${file.mimeType}] is not permitted. Allowed formats: PDF, PNG, JPEG, WebP.`,
      };
    }
  }

  if (file.url) {
    const lower = file.url.trim().toLowerCase();
    if (
      lower.startsWith("javascript:") ||
      lower.startsWith("data:") ||
      lower.startsWith("vbscript:")
    ) {
      return {
        valid: false,
        error: "Invalid receipt URL: dangerous URI schemes are prohibited.",
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// STANDARD CHART OF ACCOUNTS (GAAP-ALIGNED DEFAULTS)
// ============================================================================

export const STANDARD_CHART_OF_ACCOUNTS: Array<{
  code: string;
  name: string;
  account_type: AccountType;
  description: string;
}> = [
  // 1000s: Current & Non-Current Assets
  { code: "1010", name: "Cash on Hand", account_type: "Asset", description: "Petty cash and drawer funds" },
  { code: "1020", name: "Operating Bank Account", account_type: "Asset", description: "Primary operating checking account" },
  { code: "1200", name: "Accounts Receivable", account_type: "Asset", description: "Amounts owed by customers for billed invoices" },
  { code: "1500", name: "Equipment & Hardware", account_type: "Asset", description: "Office IT hardware, servers, and equipment" },

  // 2000s: Current & Non-Current Liabilities
  { code: "2000", name: "Accounts Payable", account_type: "Liability", description: "Vendor bills and operating obligations due" },
  { code: "2100", name: "Accrued Expenses & Payroll", account_type: "Liability", description: "Incurred expenses and salaries payable" },

  // 3000s: Equity
  { code: "3000", name: "Retained Earnings / Owner Equity", account_type: "Equity", description: "Accumulated net earnings and equity" },

  // 4000s: Revenue
  { code: "4000", name: "Sales Revenue", account_type: "Revenue", description: "Direct goods and product invoicing revenue" },
  { code: "4100", name: "Service & Consulting Revenue", account_type: "Revenue", description: "Professional services and project revenue" },

  // 5000s: Operating Expenses
  { code: "5010", name: "Rent Expense", account_type: "Expense", description: "Office and facility lease expenses" },
  { code: "5020", name: "Utilities Expense", account_type: "Expense", description: "Electricity, internet, water, and power" },
  { code: "5030", name: "Salaries & Wages Expense", account_type: "Expense", description: "Staff payroll, bonuses, and contractor fees" },
  { code: "5040", name: "Marketing & Advertising", account_type: "Expense", description: "Lead generation, ads, and branding expenses" },
  { code: "5050", name: "Transportation & Travel", account_type: "Expense", description: "Logistics, flights, mileage, and transit" },
  { code: "5060", name: "Office Supplies", account_type: "Expense", description: "Stationery, consumables, and minor office items" },
  { code: "5070", name: "Software & Cloud Subscriptions", account_type: "Expense", description: "SaaS licenses, servers, and cloud infrastructure" },
  { code: "5080", name: "Equipment & Maintenance", account_type: "Expense", description: "Repairs, hardware upkeep, and tooling" },
  { code: "5090", name: "Other Operating Expenses", account_type: "Expense", description: "Miscellaneous administrative operating expenses" },
];

export const CATEGORY_TO_ACCOUNT_CODE: Record<ExpenseCategory, string> = {
  Rent: "5010",
  Utilities: "5020",
  Salaries: "5030",
  Marketing: "5040",
  Transportation: "5050",
  "Office Supplies": "5060",
  Software: "5070",
  Equipment: "5080",
  Other: "5090",
};

// ============================================================================
// IN-MEMORY RESILIENT DATA STORE (FOR TESTING & RPC FALLBACK)
// ============================================================================

interface MemoryFinanceStore {
  accounts: Account[];
  expenses: Expense[];
  journalEntries: JournalEntry[];
  journalEntryLines: JournalEntryLine[];
  sequences: Record<string, number>;
}

export const memoryFinanceStore: MemoryFinanceStore = {
  accounts: [],
  expenses: [],
  journalEntries: [],
  journalEntryLines: [],
  sequences: {},
};

const initializedCompanies = new Set<string>();

export function resetMemoryFinanceStore(): void {
  memoryFinanceStore.accounts = [];
  memoryFinanceStore.expenses = [];
  memoryFinanceStore.journalEntries = [];
  memoryFinanceStore.journalEntryLines = [];
  memoryFinanceStore.sequences = {};
  initializedCompanies.clear();
}

/**
 * Ensures standard Chart of Accounts exists for a company in memory and database.
 * Deduplicated per-request via React cache() and process-level set to avoid redundant upserts.
 */
export const initializeCompanyChartOfAccounts = cache(
  async function initializeCompanyChartOfAccounts(companyId: string): Promise<Account[]> {
    if (initializedCompanies.has(companyId)) {
      return memoryFinanceStore.accounts.filter((a) => a.company_id === companyId);
    }

    const existing = memoryFinanceStore.accounts.filter((a) => a.company_id === companyId);
    if (existing.length >= STANDARD_CHART_OF_ACCOUNTS.length) {
      initializedCompanies.add(companyId);
      return existing;
    }

    const seeded: Account[] = [];
    const now = new Date().toISOString();

    for (const template of STANDARD_CHART_OF_ACCOUNTS) {
      const found = existing.find((a) => a.code === template.code);
      if (!found) {
        const newAcc: Account = {
          id: `acc-${companyId}-${template.code}`,
          company_id: companyId,
          code: template.code,
          name: template.name,
          account_type: template.account_type,
          description: template.description,
          is_system: true,
          is_active: true,
          created_at: now,
          updated_at: now,
        };
        memoryFinanceStore.accounts.push(newAcc);
        seeded.push(newAcc);
      } else {
        seeded.push(found);
      }
    }

    // Attempt database sync once per company lifecycle if connected
    try {
      const supabase = await createClient();
      const rows = STANDARD_CHART_OF_ACCOUNTS.map((t) => ({
        company_id: companyId,
        code: t.code,
        name: t.name,
        account_type: t.account_type,
        description: t.description,
        is_system: true,
        is_active: true,
      }));
      await supabase.from("chart_of_accounts").upsert(rows, { onConflict: "company_id,code" });
    } catch {
      // Memory store handles fallback
    }

    initializedCompanies.add(companyId);
    return memoryFinanceStore.accounts.filter((a) => a.company_id === companyId);
  }
);

// ============================================================================
// SEQUENTIAL NUMBERING
// ============================================================================

export function getNextFinanceNumber(companyId: string, prefix: "EXP-" | "JE-"): string {
  const key = `${companyId}:${prefix}`;
  if (!memoryFinanceStore.sequences[key]) {
    memoryFinanceStore.sequences[key] = 1000;
  }
  memoryFinanceStore.sequences[key] += 1;
  const num = memoryFinanceStore.sequences[key];
  return `${prefix}${num}`;
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const expenseCategorySchema = z.enum([
  "Rent",
  "Utilities",
  "Salaries",
  "Marketing",
  "Transportation",
  "Office Supplies",
  "Software",
  "Equipment",
  "Other",
]);

export const expensePaymentMethodSchema = z.enum([
  "Cash",
  "Bank Transfer",
  "Credit Card",
  "Check",
  "Other",
]);

export const createExpenseSchema = z.object({
  category: expenseCategorySchema,
  amount: z.coerce.number().positive("Expense amount must be greater than 0"),
  currency: z.string().default("PKR"),
  date: z.string().min(1, "Expense date is required"),
  vendor: z.string().trim().min(1, "Vendor name is required").max(200),
  paymentMethod: expensePaymentMethodSchema,
  description: z.string().trim().min(1, "Description is required").max(1000),
  receiptUrl: z.string().optional().nullable(),
  receiptName: z.string().optional().nullable(),
  receiptSize: z.number().optional().nullable(),
  receiptMime: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  employeeName: z.string().optional().nullable(),
  employeeEmail: z.string().optional().nullable(),
  approvalStatus: z.enum(["Draft", "Submitted"]).default("Draft"),
});

export const updateExpenseSchema = z.object({
  category: expenseCategorySchema.optional(),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().optional(),
  date: z.string().optional(),
  vendor: z.string().trim().min(1).max(200).optional(),
  paymentMethod: expensePaymentMethodSchema.optional(),
  description: z.string().trim().min(1).max(1000).optional(),
  receiptUrl: z.string().optional().nullable(),
  receiptName: z.string().optional().nullable(),
  receiptSize: z.number().optional().nullable(),
  receiptMime: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
});

export const rejectExpenseSchema = z.object({
  reason: z.string().trim().min(3, "Rejection reason must be at least 3 characters").max(500),
});

export const journalEntryLineSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  description: z.string().max(255).optional().nullable(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
});

export const createJournalEntrySchema = z.object({
  entryDate: z.string().min(1, "Entry date is required"),
  description: z.string().trim().min(1, "Description is required").max(500),
  reference: z.string().max(200).optional().nullable(),
  lines: z.array(journalEntryLineSchema).min(2, "Journal entry requires at least 2 balanced lines"),
});

// ============================================================================
// EXPENSE WORKFLOW MANAGEMENT
// ============================================================================

export async function getExpenses(
  companyId: string,
  options?: {
    category?: ExpenseCategory;
    status?: ExpenseApprovalStatus;
    search?: string;
    employeeId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
    cursor?: string;
  },
  viewingUser?: Profile
): Promise<Expense[]> {
  await requirePermission(companyId, "finance.read", viewingUser);

  const limit = Math.min(options?.limit ?? 50, 50);

  try {
    const supabase = await createClient();
    let query = supabase
      .from("expenses")
      .select("*")
      .eq("company_id", companyId)
      .order("date", { ascending: false });

    if (options?.category) query = query.eq("category", options.category);
    if (options?.status) query = query.eq("approval_status", options.status);
    if (options?.employeeId) query = query.eq("employee_id", options.employeeId);
    if (options?.from) query = query.gte("date", options.from);
    if (options?.to) query = query.lte("date", options.to);
    if (options?.search) {
      query = query.or(`vendor.ilike.%${options.search}%,description.ilike.%${options.search}%,expense_number.ilike.%${options.search}%`);
    }

    if (options?.cursor) {
      query = query.lt("date", options.cursor).limit(limit);
    } else {
      const offset = options?.offset ?? 0;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as Expense[];
    }
  } catch {
    // Fall back to memory
  }

  let list = memoryFinanceStore.expenses.filter((e) => e.company_id === companyId);
  if (options?.category) list = list.filter((e) => e.category === options.category);
  if (options?.status) list = list.filter((e) => e.approval_status === options.status);
  if (options?.employeeId) list = list.filter((e) => e.employee_id === options.employeeId);
  if (options?.from) list = list.filter((e) => e.date >= options.from!);
  if (options?.to) list = list.filter((e) => e.date <= options.to!);
  if (options?.search) {
    const s = options.search.toLowerCase();
    list = list.filter(
      (e) =>
        e.vendor.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s) ||
        e.expense_number.toLowerCase().includes(s)
    );
  }

  list = list.sort((a, b) => b.date.localeCompare(a.date));
  if (options?.cursor) {
    list = list.filter((e) => e.date < options.cursor!);
    return list.slice(0, limit);
  }
  if (options?.offset !== undefined && options?.limit !== undefined) {
    list = list.slice(options.offset, options.offset + options.limit);
  } else if (options?.limit !== undefined) {
    list = list.slice(0, options.limit);
  }
  return list;
}

export async function getExpenseById(companyId: string, expenseId: string): Promise<Expense | null> {
  await requirePermission(companyId, "finance.read");

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("company_id", companyId)
      .eq("id", expenseId)
      .single();

    if (!error && data) {
      return data as Expense;
    }
  } catch {
    // Memory fallback
  }

  const exp = memoryFinanceStore.expenses.find(
    (e) => e.company_id === companyId && e.id === expenseId
  );
  return exp || null;
}

export async function createExpense(
  companyId: string,
  input: z.input<typeof createExpenseSchema>,
  creatorUser?: Profile
): Promise<Expense> {
  await requirePermission(companyId, "finance.write", creatorUser);
  const user = creatorUser || (await requireUser());
  const validated = createExpenseSchema.parse(input);

  // Validate receipt metadata if provided
  if (validated.receiptUrl) {
    const check = validateReceiptMetadata({
      name: validated.receiptName || "receipt",
      size: validated.receiptSize,
      mimeType: validated.receiptMime,
    });
    if (!check.valid) {
      throw new Error(check.error);
    }
  }

  const expenseNumber = getNextFinanceNumber(companyId, "EXP-");
  const now = new Date().toISOString();
  const expenseId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const newExpense: Expense = {
    id: expenseId,
    company_id: companyId,
    expense_number: expenseNumber,
    category: validated.category,
    amount: roundMoney(validated.amount),
    currency: validated.currency || "PKR",
    date: validated.date,
    vendor: validated.vendor,
    payment_method: validated.paymentMethod,
    description: validated.description,
    receipt_url: validated.receiptUrl || null,
    receipt_name: validated.receiptName || null,
    receipt_size: validated.receiptSize || null,
    receipt_mime: validated.receiptMime || null,
    employee_id: validated.employeeId || user.id,
    employee_name: validated.employeeName || user.full_name,
    employee_email: validated.employeeEmail || user.email,
    approval_status: validated.approvalStatus,
    rejection_reason: null,
    approved_by: null,
    approved_at: null,
    journal_entry_id: null,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  memoryFinanceStore.expenses.unshift(newExpense);

  try {
    const supabase = await createClient();
    await supabase.from("expenses").insert(newExpense);
  } catch {
    // Memory fallback
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "EXPENSE_CREATED",
    resource: "expenses",
    resourceId: expenseId,
    details: {
      expenseNumber,
      category: validated.category,
      amount: validated.amount,
      vendor: validated.vendor,
      status: validated.approvalStatus,
    },
  });

  try {
    await updateCompanySummaryIncremental(companyId, {
      expensesDelta: newExpense.amount,
    });
    await revalidateCompanyTag(companyId, "dashboard");
    await revalidateCompanyTag(companyId, "summary");
  } catch {
    // Non-blocking cache/summary update
  }

  return newExpense;
}

export async function updateExpense(
  companyId: string,
  expenseId: string,
  input: z.infer<typeof updateExpenseSchema>,
  editorUser?: Profile
): Promise<Expense> {
  await requirePermission(companyId, "finance.write", editorUser);
  const user = editorUser || (await requireUser());
  const validated = updateExpenseSchema.parse(input);

  const existing = await getExpenseById(companyId, expenseId);
  if (!existing) {
    throw new Error(`Expense [${expenseId}] not found in company ${companyId}`);
  }

  if (existing.approval_status === "Approved") {
    throw new Error("Approved expenses cannot be modified. Create a correcting entry instead.");
  }

  if (validated.receiptUrl) {
    const check = validateReceiptMetadata({
      name: validated.receiptName || "receipt",
      size: validated.receiptSize,
      mimeType: validated.receiptMime,
    });
    if (!check.valid) {
      throw new Error(check.error);
    }
  }

  const now = new Date().toISOString();
  const updatedExpense: Expense = {
    ...existing,
    category: validated.category || existing.category,
    amount: validated.amount !== undefined ? roundMoney(validated.amount) : existing.amount,
    currency: validated.currency || existing.currency,
    date: validated.date || existing.date,
    vendor: validated.vendor || existing.vendor,
    payment_method: validated.paymentMethod || existing.payment_method,
    description: validated.description || existing.description,
    receipt_url: validated.receiptUrl !== undefined ? validated.receiptUrl : existing.receipt_url,
    receipt_name: validated.receiptName !== undefined ? validated.receiptName : existing.receipt_name,
    receipt_size: validated.receiptSize !== undefined ? validated.receiptSize : existing.receipt_size,
    receipt_mime: validated.receiptMime !== undefined ? validated.receiptMime : existing.receipt_mime,
    updated_at: now,
  };

  const idx = memoryFinanceStore.expenses.findIndex((e) => e.id === expenseId && e.company_id === companyId);
  if (idx !== -1) {
    memoryFinanceStore.expenses[idx] = updatedExpense;
  }

  try {
    const supabase = await createClient();
    await supabase.from("expenses").update(updatedExpense).eq("id", expenseId).eq("company_id", companyId);
  } catch {
    // Memory fallback
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "EXPENSE_UPDATED",
    resource: "expenses",
    resourceId: expenseId,
    details: { changes: validated },
  });

  return updatedExpense;
}

export async function submitExpense(
  companyId: string,
  expenseId: string,
  submitterUser?: Profile
): Promise<Expense> {
  await requirePermission(companyId, "finance.write", submitterUser);
  const user = submitterUser || (await requireUser());

  const existing = await getExpenseById(companyId, expenseId);
  if (!existing) {
    throw new Error(`Expense [${expenseId}] not found.`);
  }

  if (existing.approval_status !== "Draft" && existing.approval_status !== "Rejected") {
    throw new Error(`Expense is already in [${existing.approval_status}] status and cannot be submitted.`);
  }

  const now = new Date().toISOString();
  const updated: Expense = {
    ...existing,
    approval_status: "Submitted",
    rejection_reason: null,
    updated_at: now,
  };

  const idx = memoryFinanceStore.expenses.findIndex((e) => e.id === expenseId);
  if (idx !== -1) memoryFinanceStore.expenses[idx] = updated;

  try {
    const supabase = await createClient();
    await supabase.from("expenses").update({ approval_status: "Submitted", rejection_reason: null, updated_at: now }).eq("id", expenseId);
  } catch {
    // Memory fallback
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "EXPENSE_SUBMITTED",
    resource: "expenses",
    resourceId: expenseId,
    details: { expenseNumber: existing.expense_number, amount: existing.amount },
  });

  return updated;
}

/**
 * Approves an expense with strict separation of duties:
 * Submitter CANNOT approve their own expense unless Super Admin.
 * Automatically posts a balanced double-entry General Ledger transaction.
 */
export async function approveExpense(
  companyId: string,
  expenseId: string,
  approverUser?: Profile
): Promise<{ expense: Expense; journalEntry: JournalEntry }> {
  await requirePermission(companyId, "expenses.approve", approverUser);
  const user = approverUser || (await requireUser());

  const expense = await getExpenseById(companyId, expenseId);
  if (!expense) {
    throw new Error(`Expense [${expenseId}] not found.`);
  }

  if (expense.approval_status === "Approved") {
    throw new Error(`Expense [${expense.expense_number}] is already approved.`);
  }

  // ENFORCE SEPARATION OF DUTIES
  // An employee may never approve their own expense submission
  if (expense.employee_id === user.id && !user.is_super_admin) {
    throw new SeparationOfDutiesError(
      `Separation of duties violation: Submitter [${expense.employee_name || user.email}] cannot approve their own expense. Approval must be conducted by an independent authorized manager.`
    );
  }

  // Ensure Chart of Accounts is initialized
  await initializeCompanyChartOfAccounts(companyId);

  // Determine Expense Account Code
  const expenseAccountCode = CATEGORY_TO_ACCOUNT_CODE[expense.category] || "5090";
  const expenseAccount = memoryFinanceStore.accounts.find(
    (a) => a.company_id === companyId && a.code === expenseAccountCode
  );
  if (!expenseAccount) {
    throw new Error(`Account code [${expenseAccountCode}] for category [${expense.category}] not found.`);
  }

  // Determine Credit Account based on payment method
  let creditAccountCode = "2000"; // Accounts Payable default
  if (expense.payment_method === "Cash") {
    creditAccountCode = "1010"; // Cash on Hand
  } else if (expense.payment_method === "Bank Transfer" || expense.payment_method === "Credit Card") {
    creditAccountCode = "1020"; // Operating Bank
  }

  const creditAccount = memoryFinanceStore.accounts.find(
    (a) => a.company_id === companyId && a.code === creditAccountCode
  );
  if (!creditAccount) {
    throw new Error(`Credit account code [${creditAccountCode}] not found.`);
  }

  // Create balanced double-entry journal entry:
  // DEBIT: Expense Account (increase expense)
  // CREDIT: Cash/Bank or Accounts Payable (decrease asset or increase liability)
  const now = new Date().toISOString();
  const jeNumber = getNextFinanceNumber(companyId, "JE-");
  const journalEntryId = `je-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const lines: JournalEntryLine[] = [
    {
      id: `jel-${Date.now()}-1`,
      journal_entry_id: journalEntryId,
      company_id: companyId,
      account_id: expenseAccount.id,
      account_code: expenseAccount.code,
      account_name: expenseAccount.name,
      description: `Expense ${expense.expense_number}: ${expense.vendor} - ${expense.description}`,
      debit: expense.amount,
      credit: 0,
      sort_order: 1,
      created_at: now,
    },
    {
      id: `jel-${Date.now()}-2`,
      journal_entry_id: journalEntryId,
      company_id: companyId,
      account_id: creditAccount.id,
      account_code: creditAccount.code,
      account_name: creditAccount.name,
      description: `Settlement via ${expense.payment_method} for ${expense.expense_number}`,
      debit: 0,
      credit: expense.amount,
      sort_order: 2,
      created_at: now,
    },
  ];

  const journalEntry: JournalEntry = {
    id: journalEntryId,
    company_id: companyId,
    entry_number: jeNumber,
    entry_date: expense.date,
    description: `Approved Expense ${expense.expense_number} (${expense.vendor})`,
    reference: expense.expense_number,
    status: "Posted",
    source_type: "expense",
    source_id: expense.id,
    reversal_of_id: null,
    total_debit: expense.amount,
    total_credit: expense.amount,
    posted_at: now,
    posted_by: user.id,
    lines,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  // Post to General Ledger store
  memoryFinanceStore.journalEntries.unshift(journalEntry);
  memoryFinanceStore.journalEntryLines.push(...lines);

  // Update Expense record
  const updatedExpense: Expense = {
    ...expense,
    approval_status: "Approved",
    approved_by: user.id,
    approved_at: now,
    journal_entry_id: journalEntryId,
    rejection_reason: null,
    updated_at: now,
  };

  const expIdx = memoryFinanceStore.expenses.findIndex((e) => e.id === expenseId);
  if (expIdx !== -1) memoryFinanceStore.expenses[expIdx] = updatedExpense;

  try {
    const supabase = await createClient();
    await supabase.from("journal_entries").insert(journalEntry);
    await supabase.from("journal_entry_lines").insert(lines);
    await supabase
      .from("expenses")
      .update({
        approval_status: "Approved",
        approved_by: user.id,
        approved_at: now,
        journal_entry_id: journalEntryId,
        updated_at: now,
      })
      .eq("id", expenseId);
  } catch {
    // Memory fallback
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "EXPENSE_APPROVED",
    resource: "expenses",
    resourceId: expenseId,
    details: {
      expenseNumber: expense.expense_number,
      amount: expense.amount,
      journalEntryNumber: jeNumber,
      approvedBy: user.email,
    },
  });

  return { expense: updatedExpense, journalEntry };
}

export async function rejectExpense(
  companyId: string,
  expenseId: string,
  reason: string,
  rejectorUser?: Profile
): Promise<Expense> {
  await requirePermission(companyId, "expenses.approve", rejectorUser);
  const user = rejectorUser || (await requireUser());

  const validated = rejectExpenseSchema.parse({ reason });
  const existing = await getExpenseById(companyId, expenseId);
  if (!existing) {
    throw new Error(`Expense [${expenseId}] not found.`);
  }

  if (existing.approval_status === "Approved") {
    throw new Error("Approved expenses cannot be rejected. Please reverse the journal entry instead.");
  }

  const now = new Date().toISOString();
  const updatedExpense: Expense = {
    ...existing,
    approval_status: "Rejected",
    rejection_reason: validated.reason,
    updated_at: now,
  };

  const idx = memoryFinanceStore.expenses.findIndex((e) => e.id === expenseId);
  if (idx !== -1) memoryFinanceStore.expenses[idx] = updatedExpense;

  try {
    const supabase = await createClient();
    await supabase
      .from("expenses")
      .update({
        approval_status: "Rejected",
        rejection_reason: validated.reason,
        updated_at: now,
      })
      .eq("id", expenseId);
  } catch {
    // Memory fallback
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "EXPENSE_REJECTED",
    resource: "expenses",
    resourceId: expenseId,
    details: {
      expenseNumber: existing.expense_number,
      reason: validated.reason,
      rejectedBy: user.email,
    },
  });

  return updatedExpense;
}

// ============================================================================
// GENERAL LEDGER & BALANCED DOUBLE-ENTRY JOURNAL ENTRIES
// ============================================================================

export async function getAccounts(companyId: string): Promise<Account[]> {
  await requirePermission(companyId, "finance.read");
  await initializeCompanyChartOfAccounts(companyId);

  return getCachedCompanyData(companyId, "chart-of-accounts", async () => {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("company_id", companyId)
        .order("code", { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Account[];
      }
    } catch {
      // Memory fallback
    }

    return memoryFinanceStore.accounts
      .filter((a) => a.company_id === companyId)
      .sort((a, b) => a.code.localeCompare(b.code));
  });
}

export async function createAccount(
  companyId: string,
  input: {
    code: string;
    name: string;
    account_type: AccountType;
    sub_type?: string | null;
    parent_id?: string | null;
    tax_line?: string | null;
    currency?: string | null;
    opening_balance?: number | null;
    opening_balance_date?: string | null;
    description?: string | null;
  },
  creatorUser?: Profile
): Promise<Account> {
  await requirePermission(companyId, "finance.write", creatorUser);
  const user = creatorUser || (await requireUser());

  const code = input.code.trim();
  const name = input.name.trim();

  const existingAccounts = await getAccounts(companyId);
  if (existingAccounts.some((a) => a.code === code)) {
    throw new Error(`Account code [${code}] already exists in chart of accounts.`);
  }

  const now = new Date().toISOString();
  const newAccount: Account = {
    id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    company_id: companyId,
    code,
    name,
    account_type: input.account_type,
    sub_type: input.sub_type || null,
    parent_id: input.parent_id || null,
    tax_line: input.tax_line || null,
    currency: input.currency || "PKR",
    opening_balance: input.opening_balance ?? 0,
    opening_balance_date: input.opening_balance_date || null,
    description: input.description || null,
    is_system: false,
    is_active: true,
    balance: input.opening_balance ?? 0,
    created_at: now,
    updated_at: now,
  };

  memoryFinanceStore.accounts.push(newAccount);

  try {
    const supabase = await createClient();
    await supabase.from("chart_of_accounts").insert(newAccount);
  } catch {
    // Memory fallback
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "ACCOUNT_CREATED",
    resource: "chart_of_accounts",
    resourceId: newAccount.id,
    details: { code, name, type: input.account_type, sub_type: input.sub_type },
  });

  try {
    await revalidateCompanyTag(companyId, "chart-of-accounts");
  } catch {
    // Non-blocking cache revalidation
  }

  return newAccount;
}

export async function updateAccount(
  companyId: string,
  accountId: string,
  input: {
    name?: string;
    description?: string | null;
    sub_type?: string | null;
    tax_line?: string | null;
    is_active?: boolean;
  },
  actingUser?: Profile
): Promise<Account> {
  await requirePermission(companyId, "finance.write", actingUser);
  const user = actingUser || (await requireUser());

  const existing = (await getAccounts(companyId)).find((a) => a.id === accountId);
  if (!existing) {
    throw new Error(`Account with ID ${accountId} not found.`);
  }

  const updated: Account = {
    ...existing,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    sub_type: input.sub_type !== undefined ? input.sub_type : existing.sub_type,
    tax_line: input.tax_line !== undefined ? input.tax_line : existing.tax_line,
    is_active: input.is_active !== undefined ? input.is_active : existing.is_active,
    updated_at: new Date().toISOString(),
  };

  const memIdx = memoryFinanceStore.accounts.findIndex((a) => a.id === accountId);
  if (memIdx >= 0) {
    memoryFinanceStore.accounts[memIdx] = updated;
  }

  try {
    const supabase = await createClient();
    await supabase
      .from("chart_of_accounts")
      .update({
        name: updated.name,
        description: updated.description,
        sub_type: updated.sub_type,
        tax_line: updated.tax_line,
        is_active: updated.is_active,
        updated_at: updated.updated_at,
      })
      .eq("id", accountId)
      .eq("company_id", companyId);
  } catch {
    // Memory fallback
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "ACCOUNT_UPDATED",
    resource: "chart_of_accounts",
    resourceId: accountId,
    details: input,
  });

  try {
    await revalidateCompanyTag(companyId, "chart-of-accounts");
  } catch {
    // Non-blocking cache revalidation
  }

  return updated;
}

export async function toggleAccountActive(
  companyId: string,
  accountId: string,
  actingUser?: Profile
): Promise<Account> {
  const account = (await getAccounts(companyId)).find((a) => a.id === accountId);
  if (!account) {
    throw new Error(`Account with ID ${accountId} not found.`);
  }
  if (account.is_system) {
    throw new Error(`System core account [${account.code}] cannot be deactivated.`);
  }
  return updateAccount(companyId, accountId, { is_active: !account.is_active }, actingUser);
}

export async function getJournalEntries(
  companyId: string,
  options?: {
    status?: JournalEntryStatus;
    from?: string;
    to?: string;
    sourceType?: string;
    limit?: number;
    offset?: number;
  },
  viewingUser?: Profile
): Promise<JournalEntry[]> {
  await requirePermission(companyId, "finance.read", viewingUser);

  try {
    const supabase = await createClient();
    let query = supabase
      .from("journal_entries")
      .select("*, lines:journal_entry_lines(*)")
      .eq("company_id", companyId)
      .order("entry_date", { ascending: false });

    if (options?.status) query = query.eq("status", options.status);
    if (options?.from) query = query.gte("entry_date", options.from);
    if (options?.to) query = query.lte("entry_date", options.to);
    if (options?.sourceType) query = query.eq("source_type", options.sourceType);

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as JournalEntry[];
    }
  } catch {
    // Memory fallback
  }

  let list = memoryFinanceStore.journalEntries
    .filter((je) => je.company_id === companyId)
    .map((je) => ({
      ...je,
      lines: memoryFinanceStore.journalEntryLines.filter((l) => l.journal_entry_id === je.id),
    }));

  if (options?.status) list = list.filter((je) => je.status === options.status);
  if (options?.from) list = list.filter((je) => je.entry_date >= options.from!);
  if (options?.to) list = list.filter((je) => je.entry_date <= options.to!);
  if (options?.sourceType) list = list.filter((je) => je.source_type === options.sourceType);

  list = list.sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  if (options?.limit !== undefined || (!options?.from && !options?.to)) {
    const limit = Math.min(options?.limit ?? 50, 50);
    const offset = options?.offset ?? 0;
    list = list.slice(offset, offset + limit);
  }
  return list;
}

export async function getJournalEntryById(
  companyId: string,
  entryId: string,
  viewingUser?: Profile
): Promise<JournalEntry | null> {
  await requirePermission(companyId, "finance.read", viewingUser);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*, lines:journal_entry_lines(*)")
      .eq("company_id", companyId)
      .eq("id", entryId)
      .single();

    if (!error && data) {
      return data as JournalEntry;
    }
  } catch {
    // Memory fallback
  }

  const je = memoryFinanceStore.journalEntries.find(
    (e) => e.company_id === companyId && e.id === entryId
  );
  if (!je) return null;

  return {
    ...je,
    lines: memoryFinanceStore.journalEntryLines.filter((l) => l.journal_entry_id === je.id),
  };
}

/**
 * Creates a balanced double-entry manual journal entry.
 * Strictly verifies debits == credits before accepting.
 */
export async function createJournalEntry(
  companyId: string,
  input: z.infer<typeof createJournalEntrySchema>,
  creatorUser?: Profile
): Promise<JournalEntry> {
  await requirePermission(companyId, "finance.write", creatorUser);
  const user = creatorUser || (await requireUser());
  const validated = createJournalEntrySchema.parse(input);

  // Calculate Debits and Credits
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of validated.lines) {
    totalDebit = roundMoney(totalDebit + line.debit);
    totalCredit = roundMoney(totalCredit + line.credit);
  }

  // STRICT DOUBLE-ENTRY ENFORCEMENT
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new UnbalancedJournalEntryError(totalDebit, totalCredit);
  }

  if (totalDebit <= 0) {
    throw new Error("Journal entry must have a non-zero financial transaction value.");
  }

  const accounts = await getAccounts(companyId);
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const entryNumber = getNextFinanceNumber(companyId, "JE-");
  const now = new Date().toISOString();
  const entryId = `je-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const lines: JournalEntryLine[] = validated.lines.map((l, idx) => {
    const acc = accountMap.get(l.accountId);
    return {
      id: `jel-${Date.now()}-${idx + 1}`,
      journal_entry_id: entryId,
      company_id: companyId,
      account_id: l.accountId,
      account_code: acc?.code,
      account_name: acc?.name,
      description: l.description || validated.description,
      debit: roundMoney(l.debit),
      credit: roundMoney(l.credit),
      sort_order: idx + 1,
      created_at: now,
    };
  });

  const newEntry: JournalEntry = {
    id: entryId,
    company_id: companyId,
    entry_number: entryNumber,
    entry_date: validated.entryDate,
    description: validated.description,
    reference: validated.reference || null,
    status: "Posted",
    source_type: "manual",
    source_id: null,
    reversal_of_id: null,
    total_debit: totalDebit,
    total_credit: totalCredit,
    posted_at: now,
    posted_by: user.id,
    lines,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  memoryFinanceStore.journalEntries.unshift(newEntry);
  memoryFinanceStore.journalEntryLines.push(...lines);

  try {
    const supabase = await createClient();
    await supabase.from("journal_entries").insert(newEntry);
    await supabase.from("journal_entry_lines").insert(lines);
  } catch {
    // Memory fallback
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "JOURNAL_ENTRY_POSTED",
    resource: "journal_entries",
    resourceId: entryId,
    details: {
      entryNumber,
      totalDebit,
      totalCredit,
      lineCount: lines.length,
    },
  });

  return newEntry;
}

/**
 * Creates a traceable correcting reversal entry for an existing posted journal entry.
 * Swaps debits and credits, marks the original as "Reversed", preserving complete audit history.
 */
export async function reverseJournalEntry(
  companyId: string,
  entryId: string,
  reason: string,
  actorUser?: Profile
): Promise<{ original: JournalEntry; reversal: JournalEntry }> {
  await requirePermission(companyId, "finance.write", actorUser);
  const user = actorUser || (await requireUser());

  const original = await getJournalEntryById(companyId, entryId, user);

  if (!original) {
    throw new Error(`Journal entry [${entryId}] not found.`);
  }

  if (original.status === "Reversed") {
    throw new Error(`Journal entry [${original.entry_number}] has already been reversed.`);
  }

  const origLines = original.lines || [];
  if (origLines.length === 0) {
    throw new Error("Cannot reverse a journal entry with no line items.");
  }

  const now = new Date().toISOString();
  const reversalNumber = getNextFinanceNumber(companyId, "JE-");
  const reversalId = `je-rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Correcting entry: swap debits and credits
  const reversalLines: JournalEntryLine[] = origLines.map((l, idx) => ({
    id: `jel-rev-${Date.now()}-${idx + 1}`,
    journal_entry_id: reversalId,
    company_id: companyId,
    account_id: l.account_id,
    account_code: l.account_code,
    account_name: l.account_name,
    description: `Reversal of [${original.entry_number}]: ${l.description || ""}`,
    debit: l.credit, // SWAPPED
    credit: l.debit, // SWAPPED
    sort_order: idx + 1,
    created_at: now,
  }));

  const reversalEntry: JournalEntry = {
    id: reversalId,
    company_id: companyId,
    entry_number: reversalNumber,
    entry_date: new Date().toISOString().split("T")[0],
    description: `Traceable Reversal of ${original.entry_number}: ${reason}`,
    reference: `REV-${original.entry_number}`,
    status: "Posted",
    source_type: "reversal",
    source_id: original.id,
    reversal_of_id: original.id,
    total_debit: original.total_credit,
    total_credit: original.total_debit,
    posted_at: now,
    posted_by: user.id,
    lines: reversalLines,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  // Mark original as Reversed
  const updatedOriginal: JournalEntry = {
    ...original,
    status: "Reversed",
    updated_at: now,
  };

  const origIdx = memoryFinanceStore.journalEntries.findIndex((e) => e.id === entryId);
  if (origIdx !== -1) memoryFinanceStore.journalEntries[origIdx] = updatedOriginal;

  memoryFinanceStore.journalEntries.unshift(reversalEntry);
  memoryFinanceStore.journalEntryLines.push(...reversalLines);

  try {
    const supabase = await createClient();
    await supabase.from("journal_entries").update({ status: "Reversed", updated_at: now }).eq("id", entryId);
    await supabase.from("journal_entries").insert(reversalEntry);
    await supabase.from("journal_entry_lines").insert(reversalLines);
  } catch {
    // Memory fallback
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "JOURNAL_ENTRY_REVERSED",
    resource: "journal_entries",
    resourceId: original.id,
    details: {
      originalNumber: original.entry_number,
      reversalNumber,
      reason,
      reversedBy: user.email,
    },
  });

  return { original: updatedOriginal, reversal: reversalEntry };
}

// ============================================================================
// AUTOMATED LEDGER INTEGRATION (INVOICES & PAYMENTS)
// ============================================================================

/**
 * Automatically creates and posts a balanced double-entry for an issued invoice:
 * DEBIT: Accounts Receivable (1200) for grand total
 * CREDIT: Sales Revenue (4000) for grand total
 */
export async function postInvoiceToLedger(
  companyId: string,
  invoice: { id: string; invoice_number: string; issue_date: string; grand_total: number; customer_name?: string },
  actorUser?: Profile
): Promise<JournalEntry | null> {
  if (invoice.grand_total <= 0) return null;

  // Check idempotency: avoid duplicate posting for same invoice
  const existing = memoryFinanceStore.journalEntries.find(
    (je) => je.company_id === companyId && je.source_type === "invoice" && je.source_id === invoice.id && je.status === "Posted"
  );
  if (existing) return existing;

  await initializeCompanyChartOfAccounts(companyId);
  const accounts = await getAccounts(companyId);
  const arAcc = accounts.find((a) => a.code === "1200");
  const revAcc = accounts.find((a) => a.code === "4000");

  if (!arAcc || !revAcc) return null;

  const user = actorUser || (await requireUser());
  const entryNumber = getNextFinanceNumber(companyId, "JE-");
  const now = new Date().toISOString();
  const entryId = `je-inv-${Date.now()}`;

  const lines: JournalEntryLine[] = [
    {
      id: `jel-${Date.now()}-1`,
      journal_entry_id: entryId,
      company_id: companyId,
      account_id: arAcc.id,
      account_code: arAcc.code,
      account_name: arAcc.name,
      description: `Accounts Receivable for Invoice ${invoice.invoice_number}`,
      debit: roundMoney(invoice.grand_total),
      credit: 0,
      sort_order: 1,
      created_at: now,
    },
    {
      id: `jel-${Date.now()}-2`,
      journal_entry_id: entryId,
      company_id: companyId,
      account_id: revAcc.id,
      account_code: revAcc.code,
      account_name: revAcc.name,
      description: `Sales Revenue recognized for Invoice ${invoice.invoice_number}`,
      debit: 0,
      credit: roundMoney(invoice.grand_total),
      sort_order: 2,
      created_at: now,
    },
  ];

  const entry: JournalEntry = {
    id: entryId,
    company_id: companyId,
    entry_number: entryNumber,
    entry_date: invoice.issue_date,
    description: `Invoice ${invoice.invoice_number} Issued (${invoice.customer_name || "Customer"})`,
    reference: invoice.invoice_number,
    status: "Posted",
    source_type: "invoice",
    source_id: invoice.id,
    reversal_of_id: null,
    total_debit: roundMoney(invoice.grand_total),
    total_credit: roundMoney(invoice.grand_total),
    posted_at: now,
    posted_by: user.id,
    lines,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  memoryFinanceStore.journalEntries.unshift(entry);
  memoryFinanceStore.journalEntryLines.push(...lines);

  return entry;
}

/**
 * Automatically creates and posts a balanced double-entry for an invoice payment:
 * DEBIT: Cash (1010) or Bank (1020) for payment amount
 * CREDIT: Accounts Receivable (1200) for payment amount
 */
export async function postPaymentToLedger(
  companyId: string,
  payment: { id: string; payment_number: string; invoice_number?: string; payment_date: string; amount: number; payment_method: string },
  actorUser?: Profile
): Promise<JournalEntry | null> {
  if (payment.amount <= 0) return null;

  // Check idempotency
  const existing = memoryFinanceStore.journalEntries.find(
    (je) => je.company_id === companyId && je.source_type === "payment" && je.source_id === payment.id && je.status === "Posted"
  );
  if (existing) return existing;

  await initializeCompanyChartOfAccounts(companyId);
  const accounts = await getAccounts(companyId);
  const cashOrBankCode = payment.payment_method === "Cash" ? "1010" : "1020";
  const cashAcc = accounts.find((a) => a.code === cashOrBankCode);
  const arAcc = accounts.find((a) => a.code === "1200");

  if (!cashAcc || !arAcc) return null;

  const user = actorUser || (await requireUser());
  const entryNumber = getNextFinanceNumber(companyId, "JE-");
  const now = new Date().toISOString();
  const entryId = `je-pay-${Date.now()}`;

  const lines: JournalEntryLine[] = [
    {
      id: `jel-${Date.now()}-1`,
      journal_entry_id: entryId,
      company_id: companyId,
      account_id: cashAcc.id,
      account_code: cashAcc.code,
      account_name: cashAcc.name,
      description: `Payment ${payment.payment_number} received via ${payment.payment_method}`,
      debit: roundMoney(payment.amount),
      credit: 0,
      sort_order: 1,
      created_at: now,
    },
    {
      id: `jel-${Date.now()}-2`,
      journal_entry_id: entryId,
      company_id: companyId,
      account_id: arAcc.id,
      account_code: arAcc.code,
      account_name: arAcc.name,
      description: `Relief of AR for payment on ${payment.invoice_number || "Invoice"}`,
      debit: 0,
      credit: roundMoney(payment.amount),
      sort_order: 2,
      created_at: now,
    },
  ];

  const entry: JournalEntry = {
    id: entryId,
    company_id: companyId,
    entry_number: entryNumber,
    entry_date: payment.payment_date,
    description: `Payment ${payment.payment_number} (${payment.payment_method})`,
    reference: payment.payment_number,
    status: "Posted",
    source_type: "payment",
    source_id: payment.id,
    reversal_of_id: null,
    total_debit: roundMoney(payment.amount),
    total_credit: roundMoney(payment.amount),
    posted_at: now,
    posted_by: user.id,
    lines,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  memoryFinanceStore.journalEntries.unshift(entry);
  memoryFinanceStore.journalEntryLines.push(...lines);

  return entry;
}

// ============================================================================
// CORE FINANCIAL REPORTS GENERATOR (RECONCILED TO LEDGER & ERP TRANSACTIONS)
// ============================================================================

/**
 * Generates Profit & Loss (Income Statement) Report:
 * Reconciled from posted general ledger transactions and approved expenses.
 */
export async function getProfitLossReport(
  companyId: string,
  period: { from?: string; to?: string }
): Promise<ProfitLossReport> {
  await requirePermission(companyId, "finance.read");
  await initializeCompanyChartOfAccounts(companyId);

  const from = period.from || "2000-01-01";
  const to = period.to || "2099-12-31";

  // Get posted journal entries in period
  const entries = await getJournalEntries(companyId, { status: "Posted", from, to });
  const accounts = await getAccounts(companyId);
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // Calculate account balances from ledger lines
  const accountBalances: Record<string, { debit: number; credit: number }> = {};
  for (const entry of entries) {
    for (const line of entry.lines || []) {
      if (!accountBalances[line.account_id]) {
        accountBalances[line.account_id] = { debit: 0, credit: 0 };
      }
      accountBalances[line.account_id].debit = roundMoney(
        accountBalances[line.account_id].debit + line.debit
      );
      accountBalances[line.account_id].credit = roundMoney(
        accountBalances[line.account_id].credit + line.credit
      );
    }
  }

  // Revenue items (Credit - Debit for Revenue accounts)
  const revenueItems: Array<{ code: string; name: string; amount: number }> = [];
  let totalRevenue = 0;

  for (const acc of accounts.filter((a) => a.account_type === "Revenue")) {
    const bal = accountBalances[acc.id] || { debit: 0, credit: 0 };
    const netCredit = roundMoney(bal.credit - bal.debit);
    if (netCredit !== 0) {
      revenueItems.push({ code: acc.code, name: acc.name, amount: netCredit });
      totalRevenue = roundMoney(totalRevenue + netCredit);
    }
  }

  // Also include approved expenses in period
  const approvedExpenses = await getExpenses(companyId, {
    status: "Approved",
    from,
    to,
  });

  const categoryTotals: Record<ExpenseCategory, number> = {
    Rent: 0,
    Utilities: 0,
    Salaries: 0,
    Marketing: 0,
    Transportation: 0,
    "Office Supplies": 0,
    Software: 0,
    Equipment: 0,
    Other: 0,
  };

  let totalExpenses = 0;
  for (const exp of approvedExpenses) {
    categoryTotals[exp.category] = roundMoney(categoryTotals[exp.category] + exp.amount);
    totalExpenses = roundMoney(totalExpenses + exp.amount);
  }

  // If there are manual journal entries against expense accounts not in approvedExpenses, reconcile them
  for (const acc of accounts.filter((a) => a.account_type === "Expense")) {
    const bal = accountBalances[acc.id] || { debit: 0, credit: 0 };
    const netDebit = roundMoney(bal.debit - bal.credit);
    // Find matching category
    const catEntry = Object.entries(CATEGORY_TO_ACCOUNT_CODE).find(([, code]) => code === acc.code);
    if (catEntry && netDebit > categoryTotals[catEntry[0] as ExpenseCategory]) {
      // Reconcile up if manual entries exceed expense documents
      const diff = roundMoney(netDebit - categoryTotals[catEntry[0] as ExpenseCategory]);
      categoryTotals[catEntry[0] as ExpenseCategory] = netDebit;
      totalExpenses = roundMoney(totalExpenses + diff);
    }
  }

  const expenseItems: Array<{ category: string; amount: number; percentage: number }> = [];
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (amt > 0) {
      const pct = totalExpenses > 0 ? roundMoney((amt / totalExpenses) * 100) : 0;
      expenseItems.push({ category: cat, amount: amt, percentage: pct });
    }
  }

  const netOperatingIncome = roundMoney(totalRevenue - totalExpenses);
  const netProfitMarginPct = totalRevenue > 0 ? roundMoney((netOperatingIncome / totalRevenue) * 100) : 0;

  return {
    period: { from, to },
    revenue: {
      items: revenueItems,
      total: totalRevenue,
    },
    expenses: {
      items: expenseItems.sort((a, b) => b.amount - a.amount),
      total: totalExpenses,
    },
    netOperatingIncome,
    netProfitMarginPct,
  };
}

/**
 * Generates Balance Sheet Report:
 * Reconciled against standard accounting equation: Assets = Liabilities + Equity
 */
export async function getBalanceSheetReport(
  companyId: string,
  asOfDate?: string
): Promise<BalanceSheetReport> {
  await requirePermission(companyId, "finance.read");
  await initializeCompanyChartOfAccounts(companyId);

  const targetDate = asOfDate || new Date().toISOString().split("T")[0];
  const entries = await getJournalEntries(companyId, {
    status: "Posted",
    to: targetDate,
  });
  const accounts = await getAccounts(companyId);

  // Compute net balance per account
  const accountBalances: Record<string, number> = {};
  for (const entry of entries) {
    for (const line of entry.lines || []) {
      if (!accountBalances[line.account_id]) {
        accountBalances[line.account_id] = 0;
      }
      accountBalances[line.account_id] = roundMoney(
        accountBalances[line.account_id] + line.debit - line.credit
      );
    }
  }

  // Calculate current period net income to reconcile Equity
  const pl = await getProfitLossReport(companyId, { to: targetDate });
  const currentPeriodEarnings = pl.netOperatingIncome;

  const currentAssets: Array<{ code: string; name: string; amount: number }> = [];
  const nonCurrentAssets: Array<{ code: string; name: string; amount: number }> = [];
  let totalAssets = 0;

  const currentLiabilities: Array<{ code: string; name: string; amount: number }> = [];
  const nonCurrentLiabilities: Array<{ code: string; name: string; amount: number }> = [];
  let totalLiabilities = 0;

  const equityItems: Array<{ code: string; name: string; amount: number }> = [];
  let totalEquityBase = 0;

  for (const acc of accounts) {
    const rawNet = accountBalances[acc.id] || 0;

    if (acc.account_type === "Asset") {
      const bal = rawNet; // Debit normal
      if (acc.code.startsWith("15") || acc.code.startsWith("16")) {
        nonCurrentAssets.push({ code: acc.code, name: acc.name, amount: bal });
      } else {
        currentAssets.push({ code: acc.code, name: acc.name, amount: bal });
      }
      totalAssets = roundMoney(totalAssets + bal);
    } else if (acc.account_type === "Liability") {
      const bal = -rawNet; // Credit normal
      if (acc.code.startsWith("25") || acc.code.startsWith("26")) {
        nonCurrentLiabilities.push({ code: acc.code, name: acc.name, amount: bal });
      } else {
        currentLiabilities.push({ code: acc.code, name: acc.name, amount: bal });
      }
      totalLiabilities = roundMoney(totalLiabilities + bal);
    } else if (acc.account_type === "Equity") {
      const bal = -rawNet; // Credit normal
      equityItems.push({ code: acc.code, name: acc.name, amount: bal });
      totalEquityBase = roundMoney(totalEquityBase + bal);
    }
  }

  const totalEquity = roundMoney(totalEquityBase + currentPeriodEarnings);
  const totalLiabilitiesAndEquity = roundMoney(totalLiabilities + totalEquity);
  const variance = roundMoney(totalAssets - totalLiabilitiesAndEquity);
  const isBalanced = Math.abs(variance) < 0.01;

  return {
    asOfDate: targetDate,
    assets: {
      current: currentAssets,
      nonCurrent: nonCurrentAssets,
      total: totalAssets,
    },
    liabilities: {
      current: currentLiabilities,
      nonCurrent: nonCurrentLiabilities,
      total: totalLiabilities,
    },
    equity: {
      items: equityItems,
      currentPeriodEarnings,
      total: totalEquity,
    },
    totalLiabilitiesAndEquity,
    isBalanced,
    variance,
  };
}

/**
 * Generates Direct Operating Cash Flow Report:
 * Reconciles cash received from customers and cash outflows for expenses.
 */
export async function getCashFlowReport(
  companyId: string,
  period: { from?: string; to?: string }
): Promise<CashFlowReport> {
  await requirePermission(companyId, "finance.read");

  const from = period.from || "2000-01-01";
  const to = period.to || "2099-12-31";

  // Operating cash inflows: Payment journal entries or payments received
  const entries = await getJournalEntries(companyId, { status: "Posted", from, to });
  const paymentEntries = entries.filter((e) => e.source_type === "payment");

  let totalInflows = 0;
  const operatingInflows: Array<{ name: string; amount: number }> = [];

  for (const pe of paymentEntries) {
    totalInflows = roundMoney(totalInflows + pe.total_debit);
    operatingInflows.push({
      name: `${pe.description} (${pe.entry_date})`,
      amount: pe.total_debit,
    });
  }

  // Operating cash outflows: Approved expenses paid via Cash, Bank Transfer, or Credit Card
  const expenses = await getExpenses(companyId, { status: "Approved", from, to });
  const directPaidExpenses = expenses.filter(
    (e) => e.payment_method === "Cash" || e.payment_method === "Bank Transfer" || e.payment_method === "Credit Card"
  );

  let totalOutflows = 0;
  const operatingOutflows: Array<{ name: string; amount: number }> = [];

  for (const exp of directPaidExpenses) {
    totalOutflows = roundMoney(totalOutflows + exp.amount);
    operatingOutflows.push({
      name: `${exp.vendor} (${exp.category}) - ${exp.expense_number}`,
      amount: exp.amount,
    });
  }

  const netOperatingCashFlow = roundMoney(totalInflows - totalOutflows);

  return {
    period: { from, to },
    operatingInflows,
    totalInflows,
    operatingOutflows,
    totalOutflows,
    netOperatingCashFlow,
  };
}

/**
 * Generates Accounts Receivable (A/R) Aging Report with aging buckets:
 * Current, 1-30 days, 31-60 days, 61-90 days, 90+ days overdue.
 */
export async function getARAgingReport(
  companyId: string,
  asOfDate?: string
): Promise<ARAgingReport> {
  await requirePermission(companyId, "finance.read");
  const targetDateStr = asOfDate || new Date().toISOString().split("T")[0];
  const targetDate = new Date(targetDateStr);

  // In memory or database invoices
  let invoices: Array<{
    id: string;
    customer_id: string;
    customer_name?: string;
    invoice_number: string;
    due_date: string;
    amount_due: number;
    status: string;
  }> = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("invoices")
      .select("id, customer_id, invoice_number, due_date, amount_due, status, customer:customers(name)")
      .eq("company_id", companyId)
      .in("status", ["Sent", "Partially Paid", "Overdue"]);

    if (data && data.length > 0) {
      invoices = data.map((inv: any) => ({
        id: inv.id,
        customer_id: inv.customer_id,
        customer_name: inv.customer?.name || "Customer",
        invoice_number: inv.invoice_number,
        due_date: inv.due_date,
        amount_due: inv.amount_due,
        status: inv.status,
      }));
    }
  } catch {
    // Memory fallback
  }

  if (invoices.length === 0) {
    // Check memory sales store if available via global
    // Mock sample or return empty
  }

  let totalAR = 0;
  let current = 0;
  let days1_30 = 0;
  let days31_60 = 0;
  let days61_90 = 0;
  let days90Plus = 0;

  const customerMap = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      total: number;
      current: number;
      days1_30: number;
      days31_60: number;
      days61_90: number;
      days90Plus: number;
    }
  >();

  for (const inv of invoices) {
    if (inv.amount_due <= 0) continue;

    const dueDate = new Date(inv.due_date);
    const diffDays = Math.floor((targetDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const dueAmt = inv.amount_due;

    totalAR = roundMoney(totalAR + dueAmt);

    let isCurr = false;
    let is1_30 = false;
    let is31_60 = false;
    let is61_90 = false;
    let is90Plus = false;

    if (diffDays <= 0) {
      current = roundMoney(current + dueAmt);
      isCurr = true;
    } else if (diffDays <= 30) {
      days1_30 = roundMoney(days1_30 + dueAmt);
      is1_30 = true;
    } else if (diffDays <= 60) {
      days31_60 = roundMoney(days31_60 + dueAmt);
      is31_60 = true;
    } else if (diffDays <= 90) {
      days61_90 = roundMoney(days61_90 + dueAmt);
      is61_90 = true;
    } else {
      days90Plus = roundMoney(days90Plus + dueAmt);
      is90Plus = true;
    }

    const cId = inv.customer_id;
    if (!customerMap.has(cId)) {
      customerMap.set(cId, {
        customerId: cId,
        customerName: inv.customer_name || "Customer",
        total: 0,
        current: 0,
        days1_30: 0,
        days31_60: 0,
        days61_90: 0,
        days90Plus: 0,
      });
    }

    const cObj = customerMap.get(cId)!;
    cObj.total = roundMoney(cObj.total + dueAmt);
    if (isCurr) cObj.current = roundMoney(cObj.current + dueAmt);
    if (is1_30) cObj.days1_30 = roundMoney(cObj.days1_30 + dueAmt);
    if (is31_60) cObj.days31_60 = roundMoney(cObj.days31_60 + dueAmt);
    if (is61_90) cObj.days61_90 = roundMoney(cObj.days61_90 + dueAmt);
    if (is90Plus) cObj.days90Plus = roundMoney(cObj.days90Plus + dueAmt);
  }

  return {
    asOfDate: targetDateStr,
    totalAR,
    current,
    days1_30,
    days31_60,
    days61_90,
    days90Plus,
    customers: Array.from(customerMap.values()).sort((a, b) => b.total - a.total),
  };
}

/**
 * Generates Accounts Payable (A/P) Report:
 * Reconciles vendor liabilities and pending payments from approved expenses.
 */
export async function getAPAgingReport(
  companyId: string,
  asOfDate?: string
): Promise<APAgingReport> {
  await requirePermission(companyId, "finance.read");
  const targetDate = asOfDate || new Date().toISOString().split("T")[0];

  const expenses = await getExpenses(companyId, {
    status: "Approved",
    to: targetDate,
  });

  // Approved expenses with AP payment method (Check, Other, or Unsettled)
  const payableExpenses = expenses.filter(
    (e) => e.payment_method === "Check" || e.payment_method === "Other"
  );

  let totalAP = 0;
  const vendorMap = new Map<string, { total: number; count: number }>();

  for (const exp of payableExpenses) {
    totalAP = roundMoney(totalAP + exp.amount);
    const existing = vendorMap.get(exp.vendor) || { total: 0, count: 0 };
    vendorMap.set(exp.vendor, {
      total: roundMoney(existing.total + exp.amount),
      count: existing.count + 1,
    });
  }

  const vendors = Array.from(vendorMap.entries()).map(([vendor, stat]) => ({
    vendor,
    total: stat.total,
    expenseCount: stat.count,
  }));

  return {
    asOfDate: targetDate,
    totalAP,
    vendors: vendors.sort((a, b) => b.total - a.total),
  };
}

// ============================================================================
// TENANT-SCOPED CSV EXPORT ENGINE
// ============================================================================

export function exportFinancialReportToCSV(
  reportType: "profit_loss" | "balance_sheet" | "cash_flow" | "ar_aging" | "ap_aging" | "expenses",
  data: any,
  meta: { companyName: string; currency: string; exportedAt?: string }
): string {
  const exportedAt = meta.exportedAt || new Date().toISOString();
  const lines: string[] = [];

  // Header Metadata
  const cleanReportTitle = reportType.toUpperCase().replace("_", " ");
  lines.push(`"Report","${cleanReportTitle.replace(/"/g, '""')}"`);
  lines.push(`"Company","${meta.companyName.replace(/"/g, '""')}"`);
  lines.push(`"Currency","${meta.currency.replace(/"/g, '""')}"`);
  lines.push(`"Generated At","${exportedAt.replace(/"/g, '""')}"`);
  lines.push(`"Disclaimer","Uncertified preliminary draft. Subject to client CPA / Accountant review before statutory filing."`);
  lines.push("");

  if (reportType === "profit_loss") {
    const pl = data as ProfitLossReport;
    lines.push(`"Period From",${sanitizeCSVCell(pl.period.from)},"Period To",${sanitizeCSVCell(pl.period.to)}`);
    lines.push("");
    lines.push('"SECTION","ACCOUNT / CATEGORY","AMOUNT (' + meta.currency + ')","PERCENT"');
    lines.push('"REVENUE"');
    for (const r of pl.revenue.items) {
      lines.push(`,${sanitizeCSVCell(`[${r.code}] ${r.name}`)},${r.amount.toFixed(2)},""`);
    }
    lines.push(`,"TOTAL REVENUE",${pl.revenue.total.toFixed(2)},"100.00%"`);
    lines.push("");
    lines.push('"OPERATING EXPENSES"');
    for (const e of pl.expenses.items) {
      lines.push(`,${sanitizeCSVCell(e.category)},${e.amount.toFixed(2)},"${e.percentage.toFixed(2)}%"`);
    }
    lines.push(`,"TOTAL EXPENSES",${pl.expenses.total.toFixed(2)},""`);
    lines.push("");
    lines.push(`,"NET OPERATING INCOME",${pl.netOperatingIncome.toFixed(2)},"${pl.netProfitMarginPct.toFixed(2)}%"`);
  } else if (reportType === "balance_sheet") {
    const bs = data as BalanceSheetReport;
    lines.push(`"As Of Date","${bs.asOfDate}"`);
    lines.push(`"Balanced","${bs.isBalanced ? "YES" : "NO"}"`);
    lines.push("");
    lines.push('"CATEGORY","ACCOUNT","AMOUNT (' + meta.currency + ')"');
    lines.push('"ASSETS"');
    for (const a of bs.assets.current) {
      lines.push(`"Current Asset","[${a.code}] ${a.name.replace(/"/g, '""')}",${a.amount.toFixed(2)}`);
    }
    for (const a of bs.assets.nonCurrent) {
      lines.push(`"Non-Current Asset","[${a.code}] ${a.name.replace(/"/g, '""')}",${a.amount.toFixed(2)}`);
    }
    lines.push(`,"TOTAL ASSETS",${bs.assets.total.toFixed(2)}`);
    lines.push("");
    lines.push('"LIABILITIES"');
    for (const l of bs.liabilities.current) {
      lines.push(`"Current Liability","[${l.code}] ${l.name.replace(/"/g, '""')}",${l.amount.toFixed(2)}`);
    }
    lines.push(`,"TOTAL LIABILITIES",${bs.liabilities.total.toFixed(2)}`);
    lines.push("");
    lines.push('"EQUITY"');
    for (const eq of bs.equity.items) {
      lines.push(`"Owner Equity","[${eq.code}] ${eq.name.replace(/"/g, '""')}",${eq.amount.toFixed(2)}`);
    }
    lines.push(`,"Current Period Earnings",${bs.equity.currentPeriodEarnings.toFixed(2)}`);
    lines.push(`,"TOTAL EQUITY",${bs.equity.total.toFixed(2)}`);
    lines.push("");
    lines.push(`,"TOTAL LIABILITIES & EQUITY",${bs.totalLiabilitiesAndEquity.toFixed(2)}`);
  } else if (reportType === "cash_flow") {
    const cf = data as CashFlowReport;
    lines.push(`"Period From","${cf.period.from}","Period To","${cf.period.to}"`);
    lines.push("");
    lines.push('"FLOW DIRECTION","DESCRIPTION","AMOUNT (' + meta.currency + ')"');
    lines.push('"OPERATING INFLOWS"');
    for (const inf of cf.operatingInflows) {
      lines.push(`,"${inf.name.replace(/"/g, '""')}",${inf.amount.toFixed(2)}`);
    }
    lines.push(`,"TOTAL INFLOWS",${cf.totalInflows.toFixed(2)}`);
    lines.push("");
    lines.push('"OPERATING OUTFLOWS"');
    for (const out of cf.operatingOutflows) {
      lines.push(`,"${out.name.replace(/"/g, '""')}",${out.amount.toFixed(2)}`);
    }
    lines.push(`,"TOTAL OUTFLOWS",${cf.totalOutflows.toFixed(2)}`);
    lines.push("");
    lines.push(`,"NET OPERATING CASH FLOW",${cf.netOperatingCashFlow.toFixed(2)}`);
  } else if (reportType === "expenses") {
    const expenses = data as Expense[];
    lines.push('"EXPENSE #","DATE","VENDOR","CATEGORY","PAYMENT METHOD","AMOUNT","STATUS","DESCRIPTION"');
    for (const e of expenses) {
      lines.push(
        `"${e.expense_number}","${e.date}","${e.vendor.replace(/"/g, '""')}","${e.category}","${e.payment_method}",${e.amount.toFixed(2)},"${e.approval_status}","${e.description.replace(/"/g, '""')}"`
      );
    }
  }

  return lines.join("\r\n");
}
