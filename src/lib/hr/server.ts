import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, requireUser } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit/server";
import { sanitizeCSVCell } from "@/lib/utils/csv-sanitizer";
import type {
  Department,
  HREmployee,
  EmploymentStatus,
  HRAttendance,
  AttendanceStatus,
  HRLeave,
  LeaveType,
  LeaveStatus,
  HRWorkdaySettings,
  HRAttendanceSummaryReport,
  Profile,
} from "@/types/database.types";

// ============================================================================
// CUSTOM HR ERRORS
// ============================================================================

export class SensitiveAccessDeniedError extends Error {
  constructor(message: string = "Access Denied: You do not have permission to view sensitive HR records (CNIC, bank details, salary).") {
    super(message);
    this.name = "SensitiveAccessDeniedError";
  }
}

export class AttendanceTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttendanceTransitionError";
  }
}

export class OverlappingLeaveError extends Error {
  constructor(message: string = "Overlapping leave request: Employee already has an active or pending leave request for the specified dates.") {
    super(message);
    this.name = "OverlappingLeaveError";
  }
}

// ============================================================================
// SENSITIVE FIELD REDACTION & ACCESS CONTROLS
// ============================================================================

export function canViewSensitiveHR(
  context: {
    user: Profile;
    permissions?: string[];
    employeeUserId?: string | null;
    employeeId?: string;
  }
): boolean {
  if (context.user.is_super_admin) return true;
  if (context.permissions?.includes("*")) return true;
  if (context.permissions?.includes("hr.sensitive")) return true;
  if (context.permissions?.includes("hr.admin")) return true;
  if (context.permissions?.includes("employees:view_sensitive")) return true;
  if (context.permissions?.includes("employees.view_sensitive")) return true;
  // An employee can view their own salary and personal details
  if (context.employeeUserId && context.user.id === context.employeeUserId) return true;
  return false;
}

export function maskSensitiveFields(emp: HREmployee, canView: boolean): HREmployee {
  if (canView) return emp;
  return {
    ...emp,
    cnic: emp.cnic ? "●●●●●-●●●●●●●-●" : null,
    salary: null,
    bank_name: null,
    bank_account_title: null,
    bank_account_number: null,
  };
}

// ============================================================================
// WORKDAY & TIMEZONE CONFIGURABLE RULES
// ============================================================================

export const DEFAULT_WORKDAY_SETTINGS: HRWorkdaySettings = {
  company_id: "default",
  workday_start: "09:00:00",
  workday_end: "18:00:00",
  timezone: "UTC",
  grace_period_minutes: 15,
  half_day_hours: 4.0,
  allow_overnight_shifts: false,
  updated_at: new Date().toISOString(),
};

// ============================================================================
// IN-MEMORY RESILIENT DATA STORE (FOR TESTING & RPC FALLBACK)
// ============================================================================

interface MemoryHRStore {
  departments: Department[];
  employees: HREmployee[];
  attendance: HRAttendance[];
  leaves: HRLeave[];
  settings: Record<string, HRWorkdaySettings>;
  sequences: Record<string, number>;
}

export const memoryHRStore: MemoryHRStore = {
  departments: [],
  employees: [],
  attendance: [],
  leaves: [],
  settings: {},
  sequences: {},
};

export function resetMemoryHRStore(): void {
  memoryHRStore.departments = [];
  memoryHRStore.employees = [];
  memoryHRStore.attendance = [];
  memoryHRStore.leaves = [];
  memoryHRStore.settings = {};
  memoryHRStore.sequences = {};
}

export const DEFAULT_DEPARTMENTS: Array<{ name: string; code: string; description: string }> = [
  { name: "Executive & Administration", code: "EXEC", description: "C-suite and executive corporate operations" },
  { name: "Engineering & Technology", code: "ENG", description: "Software architecture, DevOps, and IT systems" },
  { name: "Sales & Commercial", code: "SALES", description: "Client relationship management and revenue pipelines" },
  { name: "Marketing & Growth", code: "MKT", description: "Brand awareness, lead generation, and public relations" },
  { name: "Human Resources", code: "HR", description: "Personnel onboarding, employee relations, and compliance" },
  { name: "Finance & Accounting", code: "FIN", description: "Treasury, bookkeeping, payroll, and audit" },
  { name: "Operations & Logistics", code: "OPS", description: "Facility management and supply chain logistics" },
];

export async function initializeCompanyHR(companyId: string): Promise<void> {
  // Ensure default departments
  const existingDept = memoryHRStore.departments.filter((d) => d.company_id === companyId);
  if (existingDept.length === 0) {
    const now = new Date().toISOString();
    for (const d of DEFAULT_DEPARTMENTS) {
      memoryHRStore.departments.push({
        id: `dept-${companyId}-${d.code.toLowerCase()}`,
        company_id: companyId,
        name: d.name,
        code: d.code,
        description: d.description,
        manager_id: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }
  }

  // Ensure workday settings
  if (!memoryHRStore.settings[companyId]) {
    memoryHRStore.settings[companyId] = {
      ...DEFAULT_WORKDAY_SETTINGS,
      company_id: companyId,
    };
  }
}

export function getNextHREmployeeNumber(companyId: string): string {
  const key = `${companyId}:EMP`;
  if (!memoryHRStore.sequences[key]) {
    memoryHRStore.sequences[key] = 1000;
  }
  memoryHRStore.sequences[key] += 1;
  const num = memoryHRStore.sequences[key];
  return `EMP-${num}`;
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const employmentStatusSchema = z.enum([
  "Active",
  "On Leave",
  "Probation",
  "Terminated",
  "Suspended",
]);

export const leaveTypeSchema = z.enum([
  "Annual",
  "Casual",
  "Sick",
  "Maternity/Paternity",
  "Unpaid",
  "Other",
]);

export const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().email("Valid corporate email is required"),
  phone: z.string().trim().max(30).optional().nullable(),
  cnic: z.string().trim().max(30).optional().nullable(),
  departmentId: z.string().optional().nullable(),
  position: z.string().trim().min(2, "Job position is required").max(100),
  joiningDate: z.string().min(1, "Joining date is required"),
  salary: z.coerce.number().min(0).optional().nullable(),
  bankName: z.string().trim().max(100).optional().nullable(),
  bankAccountTitle: z.string().trim().max(100).optional().nullable(),
  bankAccountNumber: z.string().trim().max(50).optional().nullable(),
  emergencyContactName: z.string().trim().max(100).optional().nullable(),
  emergencyContactRelation: z.string().trim().max(50).optional().nullable(),
  emergencyContactPhone: z.string().trim().max(30).optional().nullable(),
  employmentStatus: employmentStatusSchema.optional().default("Active"),
  avatarUrl: z.string().optional().nullable(),
  documents: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        size: z.number().optional(),
        mimeType: z.string().optional(),
        uploadedAt: z.string(),
      })
    )
    .optional()
    .default([]),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, "Department name must be at least 2 characters").max(100),
  code: z.string().trim().min(2, "Department code must be at least 2 characters").max(20).toUpperCase(),
  description: z.string().trim().max(500).optional().nullable(),
  managerId: z.string().optional().nullable(),
});

export const submitLeaveSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  leaveType: leaveTypeSchema,
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(1000),
  attachmentUrl: z.string().optional().nullable(),
  attachmentName: z.string().optional().nullable(),
  attachmentSize: z.number().optional().nullable(),
  attachmentMime: z.string().optional().nullable(),
});

// ============================================================================
// WORKDAY SETTINGS OPERATIONS
// ============================================================================

export async function getHRWorkdaySettings(companyId: string): Promise<HRWorkdaySettings> {
  await initializeCompanyHR(companyId);
  return memoryHRStore.settings[companyId] || { ...DEFAULT_WORKDAY_SETTINGS, company_id: companyId };
}

export async function updateHRWorkdaySettings(
  companyId: string,
  input: Partial<Omit<HRWorkdaySettings, "company_id" | "updated_at">>,
  actorUser?: Profile
): Promise<HRWorkdaySettings> {
  await requirePermission(companyId, "hr.admin", actorUser);
  const user = actorUser || (await requireUser());

  await initializeCompanyHR(companyId);
  const current = memoryHRStore.settings[companyId] || { ...DEFAULT_WORKDAY_SETTINGS, company_id: companyId };

  const updated: HRWorkdaySettings = {
    ...current,
    ...input,
    company_id: companyId,
    updated_at: new Date().toISOString(),
  };

  memoryHRStore.settings[companyId] = updated;

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "HR_WORKDAY_SETTINGS_UPDATED",
    resource: "hr_workday_settings",
    resourceId: companyId,
    details: { changes: input },
  });

  return updated;
}

// ============================================================================
// DEPARTMENT OPERATIONS
// ============================================================================

export async function getDepartments(companyId: string): Promise<Department[]> {
  await requirePermission(companyId, "hr.read");
  await initializeCompanyHR(companyId);

  const depts = memoryHRStore.departments.filter((d) => d.company_id === companyId);
  // Compute employee count per department
  const employees = memoryHRStore.employees.filter((e) => e.company_id === companyId);

  return depts.map((d) => ({
    ...d,
    employee_count: employees.filter((e) => e.department_id === d.id).length,
  }));
}

export async function createDepartment(
  companyId: string,
  input: z.infer<typeof createDepartmentSchema>,
  creatorUser?: Profile
): Promise<Department> {
  await requirePermission(companyId, "hr.write", creatorUser);
  const user = creatorUser || (await requireUser());
  const validated = createDepartmentSchema.parse(input);

  await initializeCompanyHR(companyId);
  const existing = memoryHRStore.departments.find(
    (d) => d.company_id === companyId && d.code === validated.code
  );
  if (existing) {
    throw new Error(`Department code [${validated.code}] already exists.`);
  }

  const now = new Date().toISOString();
  const newDept: Department = {
    id: `dept-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    company_id: companyId,
    name: validated.name,
    code: validated.code,
    description: validated.description || null,
    manager_id: validated.managerId || null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  memoryHRStore.departments.push(newDept);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "DEPARTMENT_CREATED",
    resource: "departments",
    resourceId: newDept.id,
    details: { name: newDept.name, code: newDept.code },
  });

  return newDept;
}

// ============================================================================
// EMPLOYEE OPERATIONS (WITH SENSITIVE FIELD PROTECTION)
// ============================================================================

export async function getHREmployees(
  companyId: string,
  filters?: {
    departmentId?: string;
    status?: EmploymentStatus;
    search?: string;
  },
  viewerUser?: Profile
): Promise<HREmployee[]> {
  const context = await requirePermission(companyId, "hr.read", viewerUser);
  const user = viewerUser || (await requireUser());
  await initializeCompanyHR(companyId);

  let list = memoryHRStore.employees.filter((e) => e.company_id === companyId);

  if (filters?.departmentId) {
    list = list.filter((e) => e.department_id === filters.departmentId);
  }
  if (filters?.status) {
    list = list.filter((e) => e.employment_status === filters.status);
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    list = list.filter(
      (e) =>
        e.full_name.toLowerCase().includes(s) ||
        e.email.toLowerCase().includes(s) ||
        e.employee_id.toLowerCase().includes(s) ||
        e.position.toLowerCase().includes(s)
    );
  }

  const canViewSensitive = canViewSensitiveHR({
    user,
    permissions: context.permissions,
  });

  // Apply sensitive field masking unless viewer has sensitive role privilege
  return list.map((emp) => {
    const isSelf = emp.user_id === user.id;
    return maskSensitiveFields(emp, canViewSensitive || isSelf);
  });
}

export async function getHREmployeeById(
  companyId: string,
  employeeId: string,
  viewerUser?: Profile
): Promise<HREmployee | null> {
  const context = await requirePermission(companyId, "hr.read", viewerUser);
  const user = viewerUser || (await requireUser());
  await initializeCompanyHR(companyId);

  const emp = memoryHRStore.employees.find(
    (e) => e.company_id === companyId && (e.id === employeeId || e.employee_id === employeeId)
  );
  if (!emp) return null;

  const canView = canViewSensitiveHR({
    user,
    permissions: context.permissions,
    employeeUserId: emp.user_id,
    employeeId: emp.id,
  });

  return maskSensitiveFields(emp, canView);
}

export async function createHREmployee(
  companyId: string,
  input: z.input<typeof createEmployeeSchema>,
  creatorUser?: Profile
): Promise<HREmployee> {
  await requirePermission(companyId, "hr.write", creatorUser);
  const user = creatorUser || (await requireUser());
  const validated = createEmployeeSchema.parse(input);

  await initializeCompanyHR(companyId);

  // Check unique email per tenant
  const existingEmail = memoryHRStore.employees.find(
    (e) => e.company_id === companyId && e.email.toLowerCase() === validated.email.toLowerCase()
  );
  if (existingEmail) {
    throw new Error(`An employee with email [${validated.email}] already exists in this company.`);
  }

  const empNumber = getNextHREmployeeNumber(companyId);
  const now = new Date().toISOString();
  const id = `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Find department name if departmentId supplied
  let departmentName: string | null = null;
  if (validated.departmentId) {
    const dept = memoryHRStore.departments.find(
      (d) => d.company_id === companyId && d.id === validated.departmentId
    );
    if (dept) departmentName = dept.name;
  }

  const newEmployee: HREmployee = {
    id,
    company_id: companyId,
    user_id: null,
    employee_id: empNumber,
    full_name: validated.fullName,
    avatar_url: validated.avatarUrl || null,
    email: validated.email,
    phone: validated.phone || null,
    cnic: validated.cnic || null,
    department_id: validated.departmentId || null,
    department_name: departmentName,
    position: validated.position,
    joining_date: validated.joiningDate,
    salary: validated.salary !== undefined && validated.salary !== null ? validated.salary : null,
    bank_name: validated.bankName || null,
    bank_account_title: validated.bankAccountTitle || null,
    bank_account_number: validated.bankAccountNumber || null,
    emergency_contact_name: validated.emergencyContactName || null,
    emergency_contact_relation: validated.emergencyContactRelation || null,
    emergency_contact_phone: validated.emergencyContactPhone || null,
    documents: validated.documents || [],
    employment_status: validated.employmentStatus || "Active",
    created_by: user.id,
    created_at: now,
    updated_at: now,
  };

  memoryHRStore.employees.unshift(newEmployee);

  // Record audit log with sensitive data stripped/sanitized
  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "HR_EMPLOYEE_CREATED",
    resource: "hr_employees",
    resourceId: id,
    details: {
      employeeId: empNumber,
      fullName: validated.fullName,
      email: validated.email,
      department: departmentName,
      position: validated.position,
      status: validated.employmentStatus,
    },
  });

  return newEmployee;
}

export async function updateHREmployee(
  companyId: string,
  id: string,
  input: z.input<typeof updateEmployeeSchema>,
  editorUser?: Profile
): Promise<HREmployee> {
  await requirePermission(companyId, "hr.write", editorUser);
  const user = editorUser || (await requireUser());
  const validated = updateEmployeeSchema.parse(input);

  const existing = memoryHRStore.employees.find(
    (e) => e.company_id === companyId && e.id === id
  );
  if (!existing) {
    throw new Error(`Employee [${id}] not found.`);
  }

  let departmentName = existing.department_name;
  if (validated.departmentId && validated.departmentId !== existing.department_id) {
    const dept = memoryHRStore.departments.find(
      (d) => d.company_id === companyId && d.id === validated.departmentId
    );
    if (dept) departmentName = dept.name;
  }

  const now = new Date().toISOString();
  const updated: HREmployee = {
    ...existing,
    full_name: validated.fullName || existing.full_name,
    avatar_url: validated.avatarUrl !== undefined ? validated.avatarUrl : existing.avatar_url,
    email: validated.email || existing.email,
    phone: validated.phone !== undefined ? validated.phone : existing.phone,
    cnic: validated.cnic !== undefined ? validated.cnic : existing.cnic,
    department_id: validated.departmentId !== undefined ? validated.departmentId : existing.department_id,
    department_name: departmentName,
    position: validated.position || existing.position,
    joining_date: validated.joiningDate || existing.joining_date,
    salary: validated.salary !== undefined ? validated.salary : existing.salary,
    bank_name: validated.bankName !== undefined ? validated.bankName : existing.bank_name,
    bank_account_title: validated.bankAccountTitle !== undefined ? validated.bankAccountTitle : existing.bank_account_title,
    bank_account_number: validated.bankAccountNumber !== undefined ? validated.bankAccountNumber : existing.bank_account_number,
    emergency_contact_name: validated.emergencyContactName !== undefined ? validated.emergencyContactName : existing.emergency_contact_name,
    emergency_contact_relation: validated.emergencyContactRelation !== undefined ? validated.emergencyContactRelation : existing.emergency_contact_relation,
    emergency_contact_phone: validated.emergencyContactPhone !== undefined ? validated.emergencyContactPhone : existing.emergency_contact_phone,
    documents: validated.documents || existing.documents,
    employment_status: validated.employmentStatus || existing.employment_status,
    updated_at: now,
  };

  const idx = memoryHRStore.employees.findIndex((e) => e.id === id);
  if (idx !== -1) memoryHRStore.employees[idx] = updated;

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "HR_EMPLOYEE_UPDATED",
    resource: "hr_employees",
    resourceId: id,
    details: {
      employeeId: existing.employee_id,
      updatedFields: Object.keys(validated).filter((k) => !["cnic", "salary", "bankAccountNumber"].includes(k)),
    },
  });

  return updated;
}

// ============================================================================
// ATTENDANCE MANAGEMENT (PUNCH, VALIDATION, AUDIT)
// ============================================================================

export async function getHRAttendance(
  companyId: string,
  options?: {
    employeeId?: string;
    date?: string;
    from?: string;
    to?: string;
  }
): Promise<HRAttendance[]> {
  await requirePermission(companyId, "hr.read");

  let list = memoryHRStore.attendance.filter((a) => a.company_id === companyId);

  if (options?.employeeId) {
    list = list.filter((a) => a.employee_id === options.employeeId);
  }
  if (options?.date) {
    list = list.filter((a) => a.date === options.date);
  }
  if (options?.from) {
    list = list.filter((a) => a.date >= options.from!);
  }
  if (options?.to) {
    list = list.filter((a) => a.date <= options.to!);
  }

  // Populate employee details
  const empMap = new Map(memoryHRStore.employees.map((e) => [e.id, e]));
  return list
    .map((a) => ({
      ...a,
      employee: empMap.get(a.employee_id),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Records employee Check-In.
 * Enforces transition validity:
 * - Prevents duplicate check-in if already checked in and not checked out.
 * - Applies company grace period and flags Late attendance if check-in exceeds grace period.
 */
export async function checkIn(
  companyId: string,
  employeeId: string,
  timestamp?: string,
  notes?: string,
  actorUser?: Profile
): Promise<HRAttendance> {
  await requirePermission(companyId, "attendance.record", actorUser);
  const user = actorUser || (await requireUser());
  const workdaySettings = await getHRWorkdaySettings(companyId);

  const checkInDate = timestamp ? timestamp.split("T")[0] : new Date().toISOString().split("T")[0];
  const checkInTime = timestamp || new Date().toISOString();

  // Find existing attendance for this employee on this date
  const existing = memoryHRStore.attendance.find(
    (a) => a.company_id === companyId && a.employee_id === employeeId && a.date === checkInDate
  );

  if (existing && existing.check_in && !existing.check_out) {
    throw new AttendanceTransitionError(
      `Duplicate check-in rejected: Employee is already checked in for ${checkInDate} at ${existing.check_in}. Please check out first.`
    );
  }

  // Calculate Late status based on Workday Start & Grace Period
  const [startHour, startMin] = workdaySettings.workday_start.split(":").map(Number);
  const graceMinutes = workdaySettings.grace_period_minutes;

  const checkInObj = new Date(checkInTime);
  const checkInHours = checkInObj.getUTCHours();
  const checkInMinutes = checkInObj.getUTCMinutes();
  const checkInTotalMins = checkInHours * 60 + checkInMinutes;
  const standardStartMins = startHour * 60 + startMin;

  let status: AttendanceStatus = "Present";
  if (checkInTotalMins > standardStartMins + graceMinutes) {
    status = "Late";
  }

  const now = new Date().toISOString();
  let record: HRAttendance;

  if (existing) {
    record = {
      ...existing,
      check_in: checkInTime,
      status,
      notes: notes || existing.notes,
      updated_at: now,
    };
    const idx = memoryHRStore.attendance.findIndex((a) => a.id === existing.id);
    memoryHRStore.attendance[idx] = record;
  } else {
    record = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      company_id: companyId,
      employee_id: employeeId,
      date: checkInDate,
      check_in: checkInTime,
      check_out: null,
      total_hours: 0,
      status,
      is_manual_correction: false,
      notes: notes || null,
      created_at: now,
      updated_at: now,
    };
    memoryHRStore.attendance.unshift(record);
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "ATTENDANCE_CHECK_IN",
    resource: "hr_attendance",
    resourceId: record.id,
    details: { employeeId, checkInTime, status },
  });

  return record;
}

/**
 * Records employee Check-Out.
 * Enforces transition validity:
 * - Requires prior check-in for the day.
 * - Prevents duplicate check-out.
 * - Enforces check-out time is chronologically after check-in time.
 * - Computes total hours worked and detects Half Day / Early Departure.
 */
export async function checkOut(
  companyId: string,
  employeeId: string,
  timestamp?: string,
  notes?: string,
  actorUser?: Profile
): Promise<HRAttendance> {
  await requirePermission(companyId, "attendance.record", actorUser);
  const user = actorUser || (await requireUser());
  const workdaySettings = await getHRWorkdaySettings(companyId);

  const checkOutDate = timestamp ? timestamp.split("T")[0] : new Date().toISOString().split("T")[0];
  const checkOutTime = timestamp || new Date().toISOString();

  const existing = memoryHRStore.attendance.find(
    (a) => a.company_id === companyId && a.employee_id === employeeId && a.date === checkOutDate
  );

  if (!existing || !existing.check_in) {
    throw new AttendanceTransitionError(
      `Invalid transition: Cannot check out without an active check-in record for ${checkOutDate}.`
    );
  }

  if (existing.check_out) {
    throw new AttendanceTransitionError(
      `Employee has already completed check-out for ${checkOutDate} at ${existing.check_out}.`
    );
  }

  const inTime = new Date(existing.check_in).getTime();
  const outTime = new Date(checkOutTime).getTime();

  if (outTime <= inTime) {
    throw new AttendanceTransitionError(
      `Invalid transition: Check-out time (${checkOutTime}) cannot be before or equal to check-in time (${existing.check_in}).`
    );
  }

  // Calculate duration in hours
  const diffHours = Math.round(((outTime - inTime) / (1000 * 60 * 60)) * 100) / 100;

  // Determine if Half Day or Early Departure
  let status = existing.status;
  if (diffHours < workdaySettings.half_day_hours) {
    status = "Half Day";
  } else if (status !== "Late") {
    // Check if early departure before workday end
    const [endH, endM] = workdaySettings.workday_end.split(":").map(Number);
    const outObj = new Date(checkOutTime);
    const outTotalMins = outObj.getUTCHours() * 60 + outObj.getUTCMinutes();
    const endTotalMins = endH * 60 + endM;
    if (outTotalMins < endTotalMins - 30) {
      status = "Early Departure";
    }
  }

  const now = new Date().toISOString();
  const updated: HRAttendance = {
    ...existing,
    check_out: checkOutTime,
    total_hours: diffHours,
    status,
    notes: notes ? (existing.notes ? `${existing.notes} | ${notes}` : notes) : existing.notes,
    updated_at: now,
  };

  const idx = memoryHRStore.attendance.findIndex((a) => a.id === existing.id);
  memoryHRStore.attendance[idx] = updated;

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "ATTENDANCE_CHECK_OUT",
    resource: "hr_attendance",
    resourceId: existing.id,
    details: { employeeId, checkOutTime, totalHours: diffHours, status },
  });

  return updated;
}

/**
 * Managerial manual attendance correction.
 * Requires audit logging and explicit justification.
 */
export async function manualAttendanceCorrection(
  companyId: string,
  attendanceId: string,
  data: {
    checkIn?: string;
    checkOut?: string;
    status: AttendanceStatus;
    reason: string;
  },
  actorUser?: Profile
): Promise<HRAttendance> {
  await requirePermission(companyId, "attendance.manage", actorUser);
  const user = actorUser || (await requireUser());

  if (!data.reason || data.reason.trim().length < 5) {
    throw new Error("Attendance correction requires an auditable reason of at least 5 characters.");
  }

  const existing = memoryHRStore.attendance.find(
    (a) => a.company_id === companyId && a.id === attendanceId
  );
  if (!existing) {
    throw new Error(`Attendance record [${attendanceId}] not found.`);
  }

  let totalHours = existing.total_hours;
  const checkIn = data.checkIn || existing.check_in;
  const checkOut = data.checkOut || existing.check_out;

  if (checkIn && checkOut) {
    const inT = new Date(checkIn).getTime();
    const outT = new Date(checkOut).getTime();
    if (outT <= inT) {
      throw new AttendanceTransitionError("Check-out time must be after check-in time.");
    }
    totalHours = Math.round(((outT - inT) / (1000 * 60 * 60)) * 100) / 100;
  }

  const now = new Date().toISOString();
  const updated: HRAttendance = {
    ...existing,
    check_in: checkIn,
    check_out: checkOut,
    total_hours: totalHours,
    status: data.status,
    is_manual_correction: true,
    correction_reason: data.reason,
    corrected_by: user.id,
    updated_at: now,
  };

  const idx = memoryHRStore.attendance.findIndex((a) => a.id === attendanceId);
  memoryHRStore.attendance[idx] = updated;

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "ATTENDANCE_MANUAL_CORRECTION",
    resource: "hr_attendance",
    resourceId: attendanceId,
    details: {
      employeeId: existing.employee_id,
      previousStatus: existing.status,
      newStatus: data.status,
      reason: data.reason,
    },
  });

  return updated;
}

// ============================================================================
// LEAVE MANAGEMENT (SUBMIT, OVERLAP CHECK, APPROVE, REJECT)
// ============================================================================

export async function getHRLeaves(
  companyId: string,
  options?: {
    employeeId?: string;
    status?: LeaveStatus;
    from?: string;
    to?: string;
  },
  viewerUser?: Profile
): Promise<HRLeave[]> {
  await requirePermission(companyId, "hr.read", viewerUser);

  let list = memoryHRStore.leaves.filter((l) => l.company_id === companyId);

  if (options?.employeeId) {
    list = list.filter((l) => l.employee_id === options.employeeId);
  }
  if (options?.status) {
    list = list.filter((l) => l.status === options.status);
  }
  if (options?.from) {
    list = list.filter((l) => l.end_date >= options.from!);
  }
  if (options?.to) {
    list = list.filter((l) => l.start_date <= options.to!);
  }

  const empMap = new Map(memoryHRStore.employees.map((e) => [e.id, e]));
  return list
    .map((l) => ({
      ...l,
      employee: empMap.get(l.employee_id),
    }))
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
}

/**
 * Submits a leave request with rigorous date validation and overlap prevention.
 */
export async function submitLeaveRequest(
  companyId: string,
  input: z.infer<typeof submitLeaveSchema>,
  submitterUser?: Profile
): Promise<HRLeave> {
  await requirePermission(companyId, "leave.request", submitterUser);
  const user = submitterUser || (await requireUser());
  const validated = submitLeaveSchema.parse(input);

  // Validate start_date <= end_date
  if (validated.startDate > validated.endDate) {
    throw new Error("Leave start date cannot be after end date.");
  }

  // Calculate day count
  const startMs = new Date(validated.startDate).getTime();
  const endMs = new Date(validated.endDate).getTime();
  const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;

  // OVERLAP PREVENTION: Check if employee already has active or pending leave during this interval
  const overlapping = memoryHRStore.leaves.find(
    (l) =>
      l.company_id === companyId &&
      l.employee_id === validated.employeeId &&
      l.status !== "Rejected" &&
      l.status !== "Cancelled" &&
      l.start_date <= validated.endDate &&
      l.end_date >= validated.startDate
  );

  if (overlapping) {
    throw new OverlappingLeaveError(
      `Overlapping leave request: Employee already has a [${overlapping.status}] leave request from ${overlapping.start_date} to ${overlapping.end_date}.`
    );
  }

  const now = new Date().toISOString();
  const id = `leave-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newLeave: HRLeave = {
    id,
    company_id: companyId,
    employee_id: validated.employeeId,
    leave_type: validated.leaveType,
    start_date: validated.startDate,
    end_date: validated.endDate,
    total_days: diffDays,
    reason: validated.reason,
    attachment_url: validated.attachmentUrl || null,
    attachment_name: validated.attachmentName || null,
    attachment_size: validated.attachmentSize || null,
    attachment_mime: validated.attachmentMime || null,
    status: "Pending",
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    created_at: now,
    updated_at: now,
  };

  memoryHRStore.leaves.unshift(newLeave);

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: "HR_LEAVE_REQUESTED",
    resource: "hr_leaves",
    resourceId: id,
    details: {
      employeeId: validated.employeeId,
      leaveType: validated.leaveType,
      startDate: validated.startDate,
      endDate: validated.endDate,
      totalDays: diffDays,
    },
  });

  return newLeave;
}

/**
 * Reviews and approves or rejects a leave request.
 */
export async function reviewLeaveRequest(
  companyId: string,
  leaveId: string,
  decision: {
    status: "Approved" | "Rejected";
    rejectionReason?: string;
  },
  reviewerUser?: Profile
): Promise<HRLeave> {
  await requirePermission(companyId, "leave.approve", reviewerUser);
  const user = reviewerUser || (await requireUser());

  const existing = memoryHRStore.leaves.find(
    (l) => l.company_id === companyId && l.id === leaveId
  );
  if (!existing) {
    throw new Error(`Leave request [${leaveId}] not found.`);
  }

  if (existing.status !== "Pending") {
    throw new Error(`Leave request is already in [${existing.status}] status and cannot be re-evaluated.`);
  }

  if (decision.status === "Rejected" && (!decision.rejectionReason || decision.rejectionReason.trim().length < 3)) {
    throw new Error("Leave rejection requires a valid reason of at least 3 characters.");
  }

  // Separation of duties: An approver cannot approve their own leave request
  const applicantEmployee = memoryHRStore.employees.find(
    (e) => e.company_id === companyId && e.id === existing.employee_id
  );
  if (
    decision.status === "Approved" &&
    applicantEmployee &&
    applicantEmployee.user_id === user.id &&
    !user.is_super_admin
  ) {
    throw new Error(
      `Separation of duties violation: Approver [${user.email}] cannot approve their own leave request. Approval must be conducted by an independent authorized reviewer.`
    );
  }

  const now = new Date().toISOString();
  const updated: HRLeave = {
    ...existing,
    status: decision.status,
    reviewed_by: user.id,
    reviewed_at: now,
    rejection_reason: decision.status === "Rejected" ? decision.rejectionReason || null : null,
    updated_at: now,
  };

  const idx = memoryHRStore.leaves.findIndex((l) => l.id === leaveId);
  memoryHRStore.leaves[idx] = updated;

  await recordAuditLog({
    companyId,
    userId: user.id,
    action: decision.status === "Approved" ? "HR_LEAVE_APPROVED" : "HR_LEAVE_REJECTED",
    resource: "hr_leaves",
    resourceId: leaveId,
    details: {
      employeeId: existing.employee_id,
      leaveType: existing.leave_type,
      reviewer: user.email,
      rejectionReason: decision.rejectionReason,
    },
  });

  return updated;
}

// ============================================================================
// HR SUMMARY REPORTS & EXPORTS
// ============================================================================

export async function getHRAttendanceSummaryReport(
  companyId: string,
  date?: string
): Promise<HRAttendanceSummaryReport> {
  await requirePermission(companyId, "hr.read");
  const targetDate = date || new Date().toISOString().split("T")[0];

  const employees = memoryHRStore.employees.filter(
    (e) => e.company_id === companyId && e.employment_status === "Active"
  );
  const attendanceList = memoryHRStore.attendance.filter(
    (a) => a.company_id === companyId && a.date === targetDate
  );

  let presentCount = 0;
  let lateCount = 0;
  let halfDayCount = 0;
  let earlyDepartureCount = 0;
  let onLeaveCount = 0;

  for (const a of attendanceList) {
    if (a.status === "Present") presentCount++;
    else if (a.status === "Late") lateCount++;
    else if (a.status === "Half Day") halfDayCount++;
    else if (a.status === "Early Departure") earlyDepartureCount++;
    else if (a.status === "On Leave") onLeaveCount++;
  }

  // Count employees with approved leave today
  const activeLeaves = memoryHRStore.leaves.filter(
    (l) =>
      l.company_id === companyId &&
      l.status === "Approved" &&
      l.start_date <= targetDate &&
      l.end_date >= targetDate
  );
  onLeaveCount = Math.max(onLeaveCount, activeLeaves.length);

  const totalEmployees = employees.length;
  const attendedCount = presentCount + lateCount + halfDayCount + earlyDepartureCount;
  const absentCount = Math.max(0, totalEmployees - attendedCount - onLeaveCount);
  const attendanceRatePct = totalEmployees > 0 ? Math.round((attendedCount / totalEmployees) * 1000) / 10 : 0;

  return {
    date: targetDate,
    totalEmployees,
    presentCount,
    lateCount,
    halfDayCount,
    earlyDepartureCount,
    absentCount,
    onLeaveCount,
    attendanceRatePct,
  };
}

export function exportAttendanceToCSV(
  attendance: HRAttendance[],
  meta: { companyName: string; exportedAt?: string }
): string {
  const exportedAt = meta.exportedAt || new Date().toISOString();
  const lines: string[] = [];

  lines.push(`"Report","ATTENDANCE LOG"`);
  lines.push(`"Company","${meta.companyName.replace(/"/g, '""')}"`);
  lines.push(`"Generated At","${exportedAt}"`);
  lines.push("");
  lines.push('"EMPLOYEE ID","NAME","DATE","CHECK IN","CHECK OUT","TOTAL HOURS","STATUS","CORRECTION","NOTES"');

  for (const a of attendance) {
    lines.push(
      [
        a.employee?.employee_id || "",
        a.employee?.full_name || "Employee",
        a.date,
        a.check_in || "",
        a.check_out || "",
        a.total_hours.toFixed(2),
        a.status,
        a.is_manual_correction ? "Manual" : "Standard",
        a.notes || "",
      ]
        .map(sanitizeCSVCell)
        .join(",")
    );
  }

  return lines.join("\r\n");
}
