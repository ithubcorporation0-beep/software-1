import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";
import { memoryHRStore } from "@/lib/hr/server";
import { memoryFinanceStore, getNextFinanceNumber } from "@/lib/finance/server";
import type {
  PayrollRun,
  PayrollItem,
  PayrollSettings,
  PayrollStatus,
  PayrollRoundMode,
  PayrollCalculationResult,
  PayrollSlipData,
  JournalEntry,
  JournalEntryLine,
  Account,
  Profile,
} from "@/types/database.types";

// ============================================================================
// CUSTOM PAYROLL ERRORS
// ============================================================================

export class DuplicatePayrollPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicatePayrollPeriodError";
  }
}

export class PayrollTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayrollTransitionError";
  }
}

export class ImmutablePayrollError extends Error {
  constructor(message: string = "Finalized payroll records are immutable. Create a traceable reversal or adjustment to modify.") {
    super(message);
    this.name = "ImmutablePayrollError";
  }
}

export class PayrollAccessDeniedError extends Error {
  constructor(message: string = "Access Denied: You do not have permission to view sensitive compensation and payroll records.") {
    super(message);
    this.name = "PayrollAccessDeniedError";
  }
}

// ============================================================================
// DECIMAL-SAFE ARITHMETIC & PRD FORMULA CALCULATIONS
// ============================================================================

/**
 * Decimal-safe rounding avoiding floating-point precision artifacts.
 */
export function roundCurrency(val: number, mode: PayrollRoundMode = "cent"): number {
  if (isNaN(val)) return 0;
  if (mode === "dollar") {
    return Math.round(val);
  }
  // Standard two decimal places
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * PRD Formula:
 * Net Salary = Basic Salary + Allowances + Bonus + Overtime − Deductions − Tax − Advances.
 *
 * Uses decimal-safe arithmetic and prevents impossible negative net salary distributions.
 */
export function calculateNetSalary(params: {
  basicSalary: number;
  allowances?: number;
  bonus?: number;
  overtime?: number;
  deductions?: number;
  tax?: number;
  advance?: number;
  roundMode?: PayrollRoundMode;
}): PayrollCalculationResult {
  const mode = params.roundMode || "cent";
  const basicSalary = roundCurrency(Math.max(0, params.basicSalary || 0), mode);
  const allowances = roundCurrency(Math.max(0, params.allowances || 0), mode);
  const bonus = roundCurrency(Math.max(0, params.bonus || 0), mode);
  const overtime = roundCurrency(Math.max(0, params.overtime || 0), mode);

  const deductions = roundCurrency(Math.max(0, params.deductions || 0), mode);
  const tax = roundCurrency(Math.max(0, params.tax || 0), mode);
  const advance = roundCurrency(Math.max(0, params.advance || 0), mode);

  const grossEarnings = roundCurrency(basicSalary + allowances + bonus + overtime, mode);
  const totalReductions = roundCurrency(deductions + tax + advance, mode);
  const netSalary = roundCurrency(grossEarnings - totalReductions, mode);

  if (netSalary < 0) {
    throw new Error(
      `Negative net salary error: Total deductions (${totalReductions.toFixed(2)}) exceed gross earnings (${grossEarnings.toFixed(2)}). Net salary cannot be negative.`
    );
  }

  return {
    grossEarnings,
    totalReductions,
    netSalary,
  };
}

// ============================================================================
// DEFAULT PAYROLL SETTINGS
// ============================================================================

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  company_id: "default",
  currency: "PKR",
  tax_calculation_mode: "Manual",
  statutory_rules_confirmed: false,
  statutory_rules_confirmed_by: null,
  statutory_rules_confirmed_at: null,
  default_overtime_hourly_multiplier: 1.0,
  overtime_rate_confirmed: false,
  standard_working_days_per_month: 22,
  round_to_nearest: "cent",
  auto_post_to_accounting: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============================================================================
// RESILIENT IN-MEMORY DATA STORE (FOR TESTING & RPC FALLBACK)
// ============================================================================

interface MemoryPayrollStore {
  runs: PayrollRun[];
  items: PayrollItem[];
  settings: Record<string, PayrollSettings>;
  sequences: Record<string, number>;
}

export const memoryPayrollStore: MemoryPayrollStore = {
  runs: [],
  items: [],
  settings: {},
  sequences: {},
};

export function resetMemoryPayrollStore(): void {
  memoryPayrollStore.runs = [];
  memoryPayrollStore.items = [];
  memoryPayrollStore.settings = {};
  memoryPayrollStore.sequences = {};
}

export async function initializeCompanyPayroll(companyId: string): Promise<void> {
  if (!memoryPayrollStore.settings[companyId]) {
    memoryPayrollStore.settings[companyId] = {
      ...DEFAULT_PAYROLL_SETTINGS,
      company_id: companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

export function getNextPayrollRunNumber(companyId: string, periodStart: string): string {
  const yearMonth = periodStart.substring(0, 7).replace("-", "");
  const key = `${companyId}:${yearMonth}`;
  if (!memoryPayrollStore.sequences[key]) {
    memoryPayrollStore.sequences[key] = 0;
  }
  memoryPayrollStore.sequences[key] += 1;
  const seq = String(memoryPayrollStore.sequences[key]).padStart(3, "0");
  return `PAY-${yearMonth}-${seq}`;
}

// ============================================================================
// SENSITIVE COMPENSATION PERMISSION VERIFICATION
// ============================================================================

export function canAccessPayroll(context: {
  user: Profile;
  permissions?: string[];
  employeeId?: string;
  employeeUserId?: string | null;
}): boolean {
  if (context.user.is_super_admin) return true;
  if (context.permissions?.includes("*")) return true;
  if (context.permissions?.includes("payroll.admin")) return true;
  if (context.permissions?.includes("payroll.read")) return true;
  if (context.permissions?.includes("payroll.write")) return true;
  if (context.permissions?.includes("payroll.approve")) return true;
  if (context.permissions?.includes("payroll.finalize")) return true;
  if (context.employeeUserId && context.user.id === context.employeeUserId) return true;
  return false;
}

export function canManageOrViewAllPayroll(context: {
  user: Profile;
  permissions?: string[];
}): boolean {
  if (context.user.is_super_admin) return true;
  if (context.permissions?.includes("*")) return true;
  if (context.permissions?.includes("payroll.admin")) return true;
  if (context.permissions?.includes("payroll.write")) return true;
  if (context.permissions?.includes("payroll.approve")) return true;
  if (context.permissions?.includes("payroll.finalize")) return true;
  return false;
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const createPayrollRunSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Period start must be YYYY-MM-DD"),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Period end must be YYYY-MM-DD"),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pay date must be YYYY-MM-DD"),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const updatePayrollItemSchema = z.object({
  basicSalary: z.coerce.number().min(0).optional(),
  allowances: z.coerce.number().min(0).optional(),
  bonus: z.coerce.number().min(0).optional(),
  overtime: z.coerce.number().min(0).optional(),
  deductions: z.coerce.number().min(0).optional(),
  tax: z.coerce.number().min(0).optional(),
  advance: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const reversePayrollRunSchema = z.object({
  reversalReason: z.string().trim().min(5, "Reversal reason must be at least 5 characters").max(1000),
});

export const updatePayrollSettingsSchema = z.object({
  currency: z.string().trim().min(2).max(10).optional(),
  taxCalculationMode: z.enum(["Manual", "Percentage", "StatutoryBrackets"]).optional(),
  defaultOvertimeHourlyMultiplier: z.coerce.number().min(0.5).max(5.0).optional(),
  standardWorkingDaysPerMonth: z.coerce.number().min(1).max(31).optional(),
  roundToNearest: z.enum(["cent", "dollar", "none"]).optional(),
  autoPostToAccounting: z.boolean().optional(),
});

// ============================================================================
// PAYROLL SETTINGS OPERATIONS
// ============================================================================

export async function getPayrollSettings(
  companyId: string,
  viewerUser?: Profile
): Promise<PayrollSettings> {
  const context = await requirePermission(companyId, "payroll.read", viewerUser);
  const user = viewerUser || (await requireUser());
  if (!canAccessPayroll({ user, permissions: context.permissions })) {
    throw new PayrollAccessDeniedError();
  }
  await initializeCompanyPayroll(companyId);
  return memoryPayrollStore.settings[companyId] || { ...DEFAULT_PAYROLL_SETTINGS, company_id: companyId };
}

export async function updatePayrollSettings(
  companyId: string,
  input: z.input<typeof updatePayrollSettingsSchema>,
  actorUser?: Profile
): Promise<PayrollSettings> {
  await requirePermission(companyId, "payroll.admin", actorUser);
  const user = actorUser || (await requireUser());
  const validated = updatePayrollSettingsSchema.parse(input);

  await initializeCompanyPayroll(companyId);
  const current = memoryPayrollStore.settings[companyId] || { ...DEFAULT_PAYROLL_SETTINGS, company_id: companyId };

  const updated: PayrollSettings = {
    ...current,
    currency: validated.currency || current.currency,
    tax_calculation_mode: validated.taxCalculationMode || current.tax_calculation_mode,
    default_overtime_hourly_multiplier:
      validated.defaultOvertimeHourlyMultiplier !== undefined
        ? validated.defaultOvertimeHourlyMultiplier
        : current.default_overtime_hourly_multiplier,
    standard_working_days_per_month:
      validated.standardWorkingDaysPerMonth !== undefined
        ? validated.standardWorkingDaysPerMonth
        : current.standard_working_days_per_month,
    round_to_nearest: validated.roundToNearest || current.round_to_nearest,
    auto_post_to_accounting:
      validated.autoPostToAccounting !== undefined
        ? validated.autoPostToAccounting
        : current.auto_post_to_accounting,
    updated_at: new Date().toISOString(),
  };

  memoryPayrollStore.settings[companyId] = updated;

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PAYROLL_SETTINGS_UPDATED",
    resource: "payroll_settings",
    resourceId: companyId,
    details: { changes: validated },
  });

  return updated;
}

export async function confirmStatutoryPayrollRules(
  companyId: string,
  actorUser?: Profile
): Promise<PayrollSettings> {
  await requirePermission(companyId, "payroll.admin", actorUser);
  const user = actorUser || (await requireUser());

  await initializeCompanyPayroll(companyId);
  const current = memoryPayrollStore.settings[companyId] || { ...DEFAULT_PAYROLL_SETTINGS, company_id: companyId };
  const now = new Date().toISOString();

  const updated: PayrollSettings = {
    ...current,
    statutory_rules_confirmed: true,
    statutory_rules_confirmed_by: user.id,
    statutory_rules_confirmed_at: now,
    overtime_rate_confirmed: true,
    updated_at: now,
  };

  memoryPayrollStore.settings[companyId] = updated;

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PAYROLL_STATUTORY_RULES_CONFIRMED",
    resource: "payroll_settings",
    resourceId: companyId,
    details: {
      confirmedBy: user.email,
      confirmedAt: now,
    },
  });

  return updated;
}

// ============================================================================
// PAYROLL RUN LIFECYCLE OPERATIONS
// ============================================================================

/**
 * Creates a new Draft payroll run and compiles payroll items for all active employees.
 * Strictly prevents duplicate runs for the same period.
 */
export async function createPayrollRun(
  companyId: string,
  input: z.input<typeof createPayrollRunSchema>,
  creatorUser?: Profile
): Promise<{ run: PayrollRun; items: PayrollItem[] }> {
  const context = await requirePermission(companyId, "payroll.write", creatorUser);
  const user = creatorUser || (await requireUser());
  if (!canAccessPayroll({ user, permissions: context.permissions })) {
    throw new PayrollAccessDeniedError();
  }

  const validated = createPayrollRunSchema.parse(input);

  if (new Date(validated.periodEnd) < new Date(validated.periodStart)) {
    throw new Error("Period end date cannot precede period start date.");
  }

  await initializeCompanyPayroll(companyId);

  // Safeguard: Prevent accidental duplicate runs for the exact same period
  const existingActive = memoryPayrollStore.runs.find(
    (r) =>
      r.company_id === companyId &&
      r.period_start === validated.periodStart &&
      r.period_end === validated.periodEnd &&
      r.status !== "Reversed"
  );
  if (existingActive) {
    throw new DuplicatePayrollPeriodError(
      `An active payroll run (${existingActive.run_number}) already exists for the period ${validated.periodStart} to ${validated.periodEnd}. Duplicate period runs are strictly prevented.`
    );
  }

  const settings = memoryPayrollStore.settings[companyId] || { ...DEFAULT_PAYROLL_SETTINGS, company_id: companyId };
  const runNumber = getNextPayrollRunNumber(companyId, validated.periodStart);
  const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Pull active HR employees for this tenant
  const activeEmployees = memoryHRStore.employees.filter(
    (e) => e.company_id === companyId && e.employment_status !== "Terminated"
  );

  const items: PayrollItem[] = [];
  let totalBasic = 0;
  let totalAllowances = 0;
  let totalBonus = 0;
  let totalOvertime = 0;
  let totalDeductions = 0;
  let totalTax = 0;
  let totalAdvance = 0;
  let totalNet = 0;

  for (const emp of activeEmployees) {
    const basic = roundCurrency(emp.salary || 0, settings.round_to_nearest);
    const allowances = 0;
    const bonus = 0;
    const overtime = 0;
    const deductions = 0;
    const tax = 0;
    const advance = 0;

    const calc = calculateNetSalary({
      basicSalary: basic,
      allowances,
      bonus,
      overtime,
      deductions,
      tax,
      advance,
      roundMode: settings.round_to_nearest,
    });

    const itemId = `pi-${Date.now()}-${emp.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}-${Math.random().toString(36).substring(2, 5)}`;

    const item: PayrollItem = {
      id: itemId,
      payroll_run_id: runId,
      company_id: companyId,
      employee_id: emp.id,
      employee_name: emp.full_name,
      employee_code: emp.employee_id,
      department_name: emp.department_name,
      designation: emp.position,
      basic_salary: basic,
      allowances,
      bonus,
      overtime,
      deductions,
      tax,
      advance,
      net_salary: calc.netSalary,
      currency: settings.currency,
      status: "Draft",
      bank_name: emp.bank_name,
      bank_account_title: emp.bank_account_title,
      bank_account_number: emp.bank_account_number,
      notes: null,
      created_at: now,
      updated_at: now,
    };

    items.push(item);
    totalBasic += basic;
    totalAllowances += allowances;
    totalBonus += bonus;
    totalOvertime += overtime;
    totalDeductions += deductions;
    totalTax += tax;
    totalAdvance += advance;
    totalNet += calc.netSalary;
  }

  const run: PayrollRun = {
    id: runId,
    company_id: companyId,
    run_number: runNumber,
    period_start: validated.periodStart,
    period_end: validated.periodEnd,
    pay_date: validated.payDate,
    status: "Draft",
    total_basic: roundCurrency(totalBasic, settings.round_to_nearest),
    total_allowances: roundCurrency(totalAllowances, settings.round_to_nearest),
    total_bonus: roundCurrency(totalBonus, settings.round_to_nearest),
    total_overtime: roundCurrency(totalOvertime, settings.round_to_nearest),
    total_deductions: roundCurrency(totalDeductions, settings.round_to_nearest),
    total_tax: roundCurrency(totalTax, settings.round_to_nearest),
    total_advance: roundCurrency(totalAdvance, settings.round_to_nearest),
    total_net: roundCurrency(totalNet, settings.round_to_nearest),
    employee_count: items.length,
    approved_by: null,
    approved_at: null,
    finalized_by: null,
    finalized_at: null,
    reversal_reason: null,
    reversed_by: null,
    reversed_at: null,
    journal_entry_id: null,
    notes: validated.notes || null,
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  memoryPayrollStore.runs.unshift(run);
  memoryPayrollStore.items.push(...items);

  // Audited with stripped personal compensation amounts
  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PAYROLL_RUN_CREATED",
    resource: "payroll_runs",
    resourceId: runId,
    details: {
      runNumber,
      periodStart: validated.periodStart,
      periodEnd: validated.periodEnd,
      employeeCount: items.length,
      status: "Draft",
    },
  });

  return { run, items };
}

export async function getPayrollRuns(
  companyId: string,
  filters?: {
    status?: PayrollStatus;
    year?: string;
  },
  viewerUser?: Profile
): Promise<PayrollRun[]> {
  const context = await requirePermission(companyId, "payroll.read", viewerUser);
  const user = viewerUser || (await requireUser());
  if (!canAccessPayroll({ user, permissions: context.permissions })) {
    throw new PayrollAccessDeniedError();
  }

  await initializeCompanyPayroll(companyId);

  let list = memoryPayrollStore.runs.filter((r) => r.company_id === companyId);
  if (filters?.status) {
    list = list.filter((r) => r.status === filters.status);
  }
  if (filters?.year) {
    list = list.filter((r) => r.period_start.startsWith(filters.year!));
  }

  return list;
}

export async function getPayrollRunById(
  companyId: string,
  runId: string,
  viewerUser?: Profile
): Promise<{ run: PayrollRun; items: PayrollItem[] } | null> {
  const context = await requirePermission(companyId, "payroll.read", viewerUser);
  const user = viewerUser || (await requireUser());
  if (!canAccessPayroll({ user, permissions: context.permissions })) {
    throw new PayrollAccessDeniedError();
  }

  await initializeCompanyPayroll(companyId);

  const run = memoryPayrollStore.runs.find((r) => r.company_id === companyId && r.id === runId);
  if (!run) return null;

  const items = memoryPayrollStore.items.filter(
    (i) => i.company_id === companyId && i.payroll_run_id === runId
  );

  return { run, items };
}

/**
 * Updates a specific employee item on a DRAFT payroll run.
 * Recomputes item net salary and parent run summary totals.
 */
export async function updatePayrollItem(
  companyId: string,
  itemId: string,
  input: z.input<typeof updatePayrollItemSchema>,
  editorUser?: Profile
): Promise<PayrollItem> {
  const context = await requirePermission(companyId, "payroll.write", editorUser);
  const user = editorUser || (await requireUser());
  if (!canAccessPayroll({ user, permissions: context.permissions })) {
    throw new PayrollAccessDeniedError();
  }

  const validated = updatePayrollItemSchema.parse(input);
  await initializeCompanyPayroll(companyId);

  const itemIndex = memoryPayrollStore.items.findIndex(
    (i) => i.company_id === companyId && i.id === itemId
  );
  if (itemIndex === -1) {
    throw new Error(`Payroll item [${itemId}] not found.`);
  }

  const currentItem = memoryPayrollStore.items[itemIndex];
  const run = memoryPayrollStore.runs.find(
    (r) => r.company_id === companyId && r.id === currentItem.payroll_run_id
  );
  if (!run) {
    throw new Error(`Parent payroll run [${currentItem.payroll_run_id}] not found.`);
  }

  if (run.status !== "Draft") {
    throw new ImmutablePayrollError(
      `Cannot modify items on a [${run.status}] payroll run. Only Draft runs permit line adjustments.`
    );
  }

  const settings = memoryPayrollStore.settings[companyId] || { ...DEFAULT_PAYROLL_SETTINGS, company_id: companyId };

  const basicSalary =
    validated.basicSalary !== undefined ? validated.basicSalary : currentItem.basic_salary;
  const allowances =
    validated.allowances !== undefined ? validated.allowances : currentItem.allowances;
  const bonus = validated.bonus !== undefined ? validated.bonus : currentItem.bonus;
  const overtime =
    validated.overtime !== undefined ? validated.overtime : currentItem.overtime;
  const deductions =
    validated.deductions !== undefined ? validated.deductions : currentItem.deductions;
  const tax = validated.tax !== undefined ? validated.tax : currentItem.tax;
  const advance = validated.advance !== undefined ? validated.advance : currentItem.advance;

  const calc = calculateNetSalary({
    basicSalary,
    allowances,
    bonus,
    overtime,
    deductions,
    tax,
    advance,
    roundMode: settings.round_to_nearest,
  });

  const now = new Date().toISOString();
  const updatedItem: PayrollItem = {
    ...currentItem,
    basic_salary: roundCurrency(basicSalary, settings.round_to_nearest),
    allowances: roundCurrency(allowances, settings.round_to_nearest),
    bonus: roundCurrency(bonus, settings.round_to_nearest),
    overtime: roundCurrency(overtime, settings.round_to_nearest),
    deductions: roundCurrency(deductions, settings.round_to_nearest),
    tax: roundCurrency(tax, settings.round_to_nearest),
    advance: roundCurrency(advance, settings.round_to_nearest),
    net_salary: calc.netSalary,
    notes: validated.notes !== undefined ? validated.notes : currentItem.notes,
    updated_at: now,
  };

  memoryPayrollStore.items[itemIndex] = updatedItem;

  // Recompute parent run totals
  recalculatePayrollRunTotals(companyId, run.id, settings.round_to_nearest);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PAYROLL_ITEM_UPDATED",
    resource: "payroll_items",
    resourceId: itemId,
    details: {
      employeeCode: currentItem.employee_code,
      runId: run.id,
      netSalary: calc.netSalary,
    },
  });

  return updatedItem;
}

function recalculatePayrollRunTotals(
  companyId: string,
  runId: string,
  roundMode: PayrollRoundMode
): void {
  const runIdx = memoryPayrollStore.runs.findIndex(
    (r) => r.company_id === companyId && r.id === runId
  );
  if (runIdx === -1) return;

  const runItems = memoryPayrollStore.items.filter(
    (i) => i.company_id === companyId && i.payroll_run_id === runId
  );

  let totalBasic = 0;
  let totalAllowances = 0;
  let totalBonus = 0;
  let totalOvertime = 0;
  let totalDeductions = 0;
  let totalTax = 0;
  let totalAdvance = 0;
  let totalNet = 0;

  for (const item of runItems) {
    totalBasic += item.basic_salary;
    totalAllowances += item.allowances;
    totalBonus += item.bonus;
    totalOvertime += item.overtime;
    totalDeductions += item.deductions;
    totalTax += item.tax;
    totalAdvance += item.advance;
    totalNet += item.net_salary;
  }

  memoryPayrollStore.runs[runIdx] = {
    ...memoryPayrollStore.runs[runIdx],
    total_basic: roundCurrency(totalBasic, roundMode),
    total_allowances: roundCurrency(totalAllowances, roundMode),
    total_bonus: roundCurrency(totalBonus, roundMode),
    total_overtime: roundCurrency(totalOvertime, roundMode),
    total_deductions: roundCurrency(totalDeductions, roundMode),
    total_tax: roundCurrency(totalTax, roundMode),
    total_advance: roundCurrency(totalAdvance, roundMode),
    total_net: roundCurrency(totalNet, roundMode),
    employee_count: runItems.length,
    updated_at: new Date().toISOString(),
  };
}

// ============================================================================
// WORKFLOW STATE TRANSITIONS: DRAFT -> APPROVED -> FINALIZED -> REVERSED
// ============================================================================

/**
 * Transition: Draft -> Approved
 */
export async function approvePayrollRun(
  companyId: string,
  runId: string,
  actorUser?: Profile
): Promise<PayrollRun> {
  const context = await requirePermission(companyId, "payroll.approve", actorUser);
  const user = actorUser || (await requireUser());
  if (!canAccessPayroll({ user, permissions: context.permissions })) {
    throw new PayrollAccessDeniedError();
  }

  await initializeCompanyPayroll(companyId);
  const runIndex = memoryPayrollStore.runs.findIndex(
    (r) => r.company_id === companyId && r.id === runId
  );
  if (runIndex === -1) {
    throw new Error(`Payroll run [${runId}] not found.`);
  }

  const run = memoryPayrollStore.runs[runIndex];
  if (run.status !== "Draft") {
    throw new PayrollTransitionError(
      `Invalid state transition: Cannot approve a payroll run currently in status [${run.status}]. Must be in Draft status.`
    );
  }

  const now = new Date().toISOString();
  const approvedRun: PayrollRun = {
    ...run,
    status: "Approved",
    approved_by: user.id,
    approved_at: now,
    updated_at: now,
  };

  memoryPayrollStore.runs[runIndex] = approvedRun;

  // Update item statuses to Approved
  memoryPayrollStore.items
    .filter((i) => i.company_id === companyId && i.payroll_run_id === runId)
    .forEach((item) => {
      item.status = "Approved";
      item.updated_at = now;
    });

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PAYROLL_RUN_APPROVED",
    resource: "payroll_runs",
    resourceId: runId,
    details: {
      runNumber: run.run_number,
      approvedBy: user.email,
      approvedAt: now,
      employeeCount: run.employee_count,
    },
  });

  return approvedRun;
}

/**
 * Transition: Approved -> Finalized
 * Atomically locks payroll run, makes items immutable, and posts balanced
 * double-entry journal entry to the accounting ledger if auto_post is enabled.
 */
export async function finalizePayrollRun(
  companyId: string,
  runId: string,
  actorUser?: Profile
): Promise<PayrollRun> {
  const context = await requirePermission(companyId, "payroll.finalize", actorUser);
  const user = actorUser || (await requireUser());
  if (!canAccessPayroll({ user, permissions: context.permissions })) {
    throw new PayrollAccessDeniedError();
  }

  await initializeCompanyPayroll(companyId);
  const runIndex = memoryPayrollStore.runs.findIndex(
    (r) => r.company_id === companyId && r.id === runId
  );
  if (runIndex === -1) {
    throw new Error(`Payroll run [${runId}] not found.`);
  }

  const run = memoryPayrollStore.runs[runIndex];
  if (run.status !== "Approved") {
    throw new PayrollTransitionError(
      `Invalid state transition: Cannot finalize a payroll run in status [${run.status}]. Run must be Approved before finalization.`
    );
  }

  const now = new Date().toISOString();
  const settings = memoryPayrollStore.settings[companyId] || { ...DEFAULT_PAYROLL_SETTINGS, company_id: companyId };

  let journalEntryId: string | null = null;

  // Post to accounting ledger atomically if configured
  if (settings.auto_post_to_accounting) {
    // Total Gross = Basic + Allowances + Bonus + Overtime
    const totalGross = roundCurrency(
      run.total_basic + run.total_allowances + run.total_bonus + run.total_overtime,
      settings.round_to_nearest
    );
    // Total Reductions = Deductions + Tax + Advance
    const totalReductions = roundCurrency(
      run.total_deductions + run.total_tax + run.total_advance,
      settings.round_to_nearest
    );
    const totalNet = roundCurrency(run.total_net, settings.round_to_nearest);

    // Double entry:
    // DEBIT: 5030 Salaries & Wages Expense (totalGross)
    // CREDIT: 2100 Accrued Expenses & Payroll (totalNet)
    // CREDIT: 2100 Statutory/Tax & Deductions Payable (totalReductions)
    // Note: Debit (totalGross) = Credit (totalNet + totalReductions) exactly.
    const jeNumber = getNextFinanceNumber(companyId, "JE-");
    journalEntryId = `je-${Date.now()}-payroll-${run.run_number.toLowerCase()}`;

    // Ensure accounts exist in memoryFinanceStore
    let expenseAccount = memoryFinanceStore.accounts.find(
      (a) => a.company_id === companyId && a.code === "5030"
    );
    const expAcc: Account = expenseAccount || {
      id: `acc-${companyId}-5030`,
      company_id: companyId,
      code: "5030",
      name: "Salaries & Wages Expense",
      account_type: "Expense",
      description: "Staff payroll, bonuses, and compensation",
      is_system: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    if (!expenseAccount) memoryFinanceStore.accounts.push(expAcc);

    const liabilityAccount = memoryFinanceStore.accounts.find(
      (a) => a.company_id === companyId && a.code === "2100"
    );
    const liabAcc: Account = liabilityAccount || {
      id: `acc-${companyId}-2100`,
      company_id: companyId,
      code: "2100",
      name: "Accrued Expenses & Payroll",
      account_type: "Liability",
      description: "Salaries, payroll taxes, and benefits payable",
      is_system: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    if (!liabilityAccount) memoryFinanceStore.accounts.push(liabAcc);

    const lines: JournalEntryLine[] = [
      {
        id: `jel-${Date.now()}-1`,
        journal_entry_id: journalEntryId,
        company_id: companyId,
        account_id: expAcc.id,
        account_code: expAcc.code,
        account_name: expAcc.name,
        description: `Gross Salaries & Compensation for ${run.run_number} (${run.period_start} to ${run.period_end})`,
        debit: totalGross,
        credit: 0,
        sort_order: 1,
        created_at: now,
      },
      {
        id: `jel-${Date.now()}-2`,
        journal_entry_id: journalEntryId,
        company_id: companyId,
        account_id: liabAcc.id,
        account_code: liabAcc.code,
        account_name: liabAcc.name,
        description: `Net Salaries Payable for ${run.run_number}`,
        debit: 0,
        credit: totalNet,
        sort_order: 2,
        created_at: now,
      },
    ];

    if (totalReductions > 0) {
      lines.push({
        id: `jel-${Date.now()}-3`,
        journal_entry_id: journalEntryId,
        company_id: companyId,
        account_id: liabAcc.id,
        account_code: liabAcc.code,
        account_name: `${liabAcc.name} (Withholdings & Deductions)`,
        description: `Tax, Advances & Deductions Withheld for ${run.run_number}`,
        debit: 0,
        credit: totalReductions,
        sort_order: 3,
        created_at: now,
      });
    }

    const journalEntry: JournalEntry = {
      id: journalEntryId,
      company_id: companyId,
      entry_number: jeNumber,
      entry_date: run.pay_date,
      description: `Payroll Run ${run.run_number} Settlement (${run.employee_count} employees)`,
      reference: run.run_number,
      status: "Posted",
      source_type: "payroll",
      source_id: run.id,
      reversal_of_id: null,
      total_debit: totalGross,
      total_credit: totalGross,
      posted_at: now,
      posted_by: user.id,
      lines,
      created_by: user.id,
      created_at: now,
      updated_at: now,
    };

    memoryFinanceStore.journalEntries.unshift(journalEntry);
    memoryFinanceStore.journalEntryLines.push(...lines);
  }

  const finalizedRun: PayrollRun = {
    ...run,
    status: "Finalized",
    finalized_by: user.id,
    finalized_at: now,
    journal_entry_id: journalEntryId,
    updated_at: now,
  };

  memoryPayrollStore.runs[runIndex] = finalizedRun;

  // Lock all items to Finalized
  memoryPayrollStore.items
    .filter((i) => i.company_id === companyId && i.payroll_run_id === runId)
    .forEach((item) => {
      item.status = "Finalized";
      item.updated_at = now;
    });

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PAYROLL_RUN_FINALIZED",
    resource: "payroll_runs",
    resourceId: runId,
    details: {
      runNumber: run.run_number,
      finalizedBy: user.email,
      finalizedAt: now,
      journalEntryId,
      employeeCount: run.employee_count,
    },
  });

  return finalizedRun;
}

/**
 * Reverses a finalized payroll run through a traceable adjustment process.
 * Marks run and items as Reversed and creates an offsetting reversal journal entry in accounting.
 */
export async function reversePayrollRun(
  companyId: string,
  runId: string,
  input: z.input<typeof reversePayrollRunSchema>,
  actorUser?: Profile
): Promise<PayrollRun> {
  const context = await requirePermission(companyId, "payroll.reverse", actorUser);
  const user = actorUser || (await requireUser());
  if (!canAccessPayroll({ user, permissions: context.permissions })) {
    throw new PayrollAccessDeniedError();
  }

  const validated = reversePayrollRunSchema.parse(input);
  await initializeCompanyPayroll(companyId);

  const runIndex = memoryPayrollStore.runs.findIndex(
    (r) => r.company_id === companyId && r.id === runId
  );
  if (runIndex === -1) {
    throw new Error(`Payroll run [${runId}] not found.`);
  }

  const run = memoryPayrollStore.runs[runIndex];
  if (run.status !== "Finalized") {
    throw new PayrollTransitionError(
      `Only Finalized payroll runs can be reversed. Current status is [${run.status}].`
    );
  }

  const now = new Date().toISOString();

  // If a journal entry exists, post an offsetting reversal journal entry in accounting
  if (run.journal_entry_id) {
    const originalEntry = memoryFinanceStore.journalEntries.find(
      (j) => j.id === run.journal_entry_id && j.company_id === companyId
    );
    if (originalEntry) {
      const revJeNumber = getNextFinanceNumber(companyId, "JE-");
      const revEntryId = `je-${Date.now()}-rev-${run.run_number.toLowerCase()}`;

      // Invert debits and credits
      const linesToReverse: JournalEntryLine[] = originalEntry.lines || [];
      const revLines: JournalEntryLine[] = linesToReverse.map((l, idx) => ({
        id: `jel-${Date.now()}-rev-${idx}`,
        journal_entry_id: revEntryId,
        company_id: companyId,
        account_id: l.account_id,
        account_code: l.account_code,
        account_name: l.account_name,
        description: `Reversal of ${originalEntry.entry_number}: ${l.description}`,
        debit: l.credit,
        credit: l.debit,
        sort_order: l.sort_order,
        created_at: now,
      }));

      const reversalJournalEntry: JournalEntry = {
        id: revEntryId,
        company_id: companyId,
        entry_number: revJeNumber,
        entry_date: now.split("T")[0],
        description: `Reversal of Payroll Run ${run.run_number} (${validated.reversalReason})`,
        reference: run.run_number,
        status: "Posted",
        source_type: "payroll_reversal",
        source_id: run.id,
        reversal_of_id: originalEntry.id,
        total_debit: originalEntry.total_debit,
        total_credit: originalEntry.total_credit,
        posted_at: now,
        posted_by: user.id,
        lines: revLines,
        created_by: user.id,
        created_at: now,
        updated_at: now,
      };

      memoryFinanceStore.journalEntries.unshift(reversalJournalEntry);
      memoryFinanceStore.journalEntryLines.push(...revLines);
    }
  }

  const reversedRun: PayrollRun = {
    ...run,
    status: "Reversed",
    reversal_reason: validated.reversalReason,
    reversed_by: user.id,
    reversed_at: now,
    updated_at: now,
  };

  memoryPayrollStore.runs[runIndex] = reversedRun;

  // Mark all items as Reversed
  memoryPayrollStore.items
    .filter((i) => i.company_id === companyId && i.payroll_run_id === runId)
    .forEach((item) => {
      item.status = "Reversed";
      item.updated_at = now;
    });

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "PAYROLL_RUN_REVERSED",
    resource: "payroll_runs",
    resourceId: runId,
    details: {
      runNumber: run.run_number,
      reversalReason: validated.reversalReason,
      reversedBy: user.email,
      reversedAt: now,
    },
  });

  return reversedRun;
}

// ============================================================================
// EMPLOYEE SALARY SLIPS & PERMISSION CHECKED ACCESS
// ============================================================================

/**
 * Retrieves salary slips for an employee.
 * Strictly verifies that the viewer is either the employee themselves or an authorized HR/payroll role.
 */
export async function getEmployeeSalarySlips(
  companyId: string,
  employeeId?: string,
  viewerUser?: Profile
): Promise<PayrollItem[]> {
  const user = viewerUser || (await requireUser());
  const context = await requirePermission(companyId, "payroll.read", user);

  await initializeCompanyPayroll(companyId);

  // If employeeId is not provided, locate employee record matching user.id
  let targetEmployeeId = employeeId;
  if (!targetEmployeeId) {
    const linkedEmployee = memoryHRStore.employees.find(
      (e) => e.company_id === companyId && e.user_id === user.id
    );
    if (linkedEmployee) {
      targetEmployeeId = linkedEmployee.id;
    }
  }

  if (!targetEmployeeId) {
    // If not a linked employee and has general payroll permissions, return all items
    if (canAccessPayroll({ user, permissions: context.permissions })) {
      return memoryPayrollStore.items.filter((i) => i.company_id === companyId);
    }
    return [];
  }

  // Check if viewing another employee's records
  const targetEmployee = memoryHRStore.employees.find(
    (e) => e.company_id === companyId && (e.id === targetEmployeeId || e.employee_id === targetEmployeeId)
  );

  const isSelf = targetEmployee && targetEmployee.user_id === user.id;
  const hasManagerAccess = canManageOrViewAllPayroll({ user, permissions: context.permissions });

  if (!isSelf && !hasManagerAccess) {
    throw new PayrollAccessDeniedError(
      "Access Denied: You are not authorized to view salary slips for other employees."
    );
  }

  return memoryPayrollStore.items.filter(
    (i) =>
      i.company_id === companyId &&
      (i.employee_id === targetEmployeeId || i.employee_code === targetEmployeeId)
  );
}

/**
 * Retrieves comprehensive printable pay slip data for a specific item.
 */
export async function getPaySlipData(
  companyId: string,
  itemId: string,
  viewerUser?: Profile
): Promise<PayrollSlipData> {
  const user = viewerUser || (await requireUser());
  const context = await requirePermission(companyId, "payroll.read", user);

  await initializeCompanyPayroll(companyId);

  const item = memoryPayrollStore.items.find(
    (i) => i.company_id === companyId && i.id === itemId
  );
  if (!item) {
    throw new Error(`Salary slip [${itemId}] not found.`);
  }

  const run = memoryPayrollStore.runs.find(
    (r) => r.company_id === companyId && r.id === item.payroll_run_id
  );
  if (!run) {
    throw new Error(`Parent payroll run not found.`);
  }

  // Permission verification: must be employee themselves or authorized manager
  const linkedEmployee = memoryHRStore.employees.find(
    (e) => e.company_id === companyId && e.id === item.employee_id
  );
  const isSelf = linkedEmployee && linkedEmployee.user_id === user.id;
  const hasManagerAccess = canManageOrViewAllPayroll({ user, permissions: context.permissions });

  if (!isSelf && !hasManagerAccess) {
    throw new PayrollAccessDeniedError("Access Denied: You cannot view this salary slip.");
  }

  const calculation = calculateNetSalary({
    basicSalary: item.basic_salary,
    allowances: item.allowances,
    bonus: item.bonus,
    overtime: item.overtime,
    deductions: item.deductions,
    tax: item.tax,
    advance: item.advance,
  });

  return {
    item,
    run,
    company: {
      id: companyId,
      name: context.company.name,
      currency: item.currency,
      address: null,
      tax_id: null,
    },
    calculation,
    verifiedApprover: run.approved_by,
    verifiedFinalizer: run.finalized_by,
  };
}

// ============================================================================
// CSV EXPORT FOR AUDITING & DISBURSEMENT
// ============================================================================

export async function exportPayrollRunToCSV(
  companyId: string,
  runId: string,
  viewerUser?: Profile
): Promise<string> {
  const result = await getPayrollRunById(companyId, runId, viewerUser);
  if (!result) {
    throw new Error(`Payroll run [${runId}] not found.`);
  }

  const { run, items } = result;

  const headers = [
    "Run Number",
    "Employee Code",
    "Employee Name",
    "Department",
    "Designation",
    "Basic Salary",
    "Allowances",
    "Bonus",
    "Overtime",
    "Deductions",
    "Income Tax (Manual)",
    "Advance Recovery",
    "Net Salary",
    "Currency",
    "Bank Name",
    "Account Title",
    "Account Number",
    "Status",
  ];

  const escapeCSV = (field: unknown): string => {
    if (field === null || field === undefined) return "";
    const str = String(field);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = items.map((i) => [
    run.run_number,
    i.employee_code,
    i.employee_name,
    i.department_name || "N/A",
    i.designation || "N/A",
    i.basic_salary.toFixed(2),
    i.allowances.toFixed(2),
    i.bonus.toFixed(2),
    i.overtime.toFixed(2),
    i.deductions.toFixed(2),
    i.tax.toFixed(2),
    i.advance.toFixed(2),
    i.net_salary.toFixed(2),
    i.currency,
    i.bank_name || "",
    i.bank_account_title || "",
    i.bank_account_number || "",
    i.status,
  ]);

  return [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ].join("\r\n");
}
