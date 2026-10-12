"use server";

import { revalidatePath } from "next/cache";
import {
  createHREmployee,
  updateHREmployee,
  createDepartment,
  checkIn,
  checkOut,
  manualAttendanceCorrection,
  submitLeaveRequest,
  reviewLeaveRequest,
  getHRAttendance,
  exportAttendanceToCSV,
  updateHRWorkdaySettings,
} from "@/lib/hr/server";
import { getCompanySettings } from "@/lib/company/server";

export interface ActionState<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function createEmployeeAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const employee = await createHREmployee(companyId, payload);
    revalidatePath("/hr");
    return {
      success: true,
      message: `Employee ${employee.full_name} (${employee.employee_id}) registered successfully.`,
      data: employee,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to create employee profile",
    };
  }
}

export async function updateEmployeeAction(
  companyId: string,
  employeeId: string,
  payload: any
): Promise<ActionState> {
  try {
    const updated = await updateHREmployee(companyId, employeeId, payload);
    revalidatePath("/hr");
    return {
      success: true,
      message: `Employee ${updated.full_name} updated successfully.`,
      data: updated,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to update employee",
    };
  }
}

export async function createDepartmentAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const dept = await createDepartment(companyId, payload);
    revalidatePath("/hr");
    return {
      success: true,
      message: `Department ${dept.name} (${dept.code}) created successfully.`,
      data: dept,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to create department",
    };
  }
}

export async function checkInAction(
  companyId: string,
  employeeId: string,
  notes?: string
): Promise<ActionState> {
  try {
    const record = await checkIn(companyId, employeeId, undefined, notes);
    revalidatePath("/hr");
    return {
      success: true,
      message: `Check-in recorded at ${new Date(record.check_in!).toLocaleTimeString()} (Status: ${record.status}).`,
      data: record,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to record check-in",
    };
  }
}

export async function checkOutAction(
  companyId: string,
  employeeId: string,
  notes?: string
): Promise<ActionState> {
  try {
    const record = await checkOut(companyId, employeeId, undefined, notes);
    revalidatePath("/hr");
    return {
      success: true,
      message: `Check-out recorded at ${new Date(record.check_out!).toLocaleTimeString()} (${record.total_hours} hrs worked).`,
      data: record,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to record check-out",
    };
  }
}

export async function manualAttendanceCorrectionAction(
  companyId: string,
  attendanceId: string,
  payload: any
): Promise<ActionState> {
  try {
    const updated = await manualAttendanceCorrection(companyId, attendanceId, payload);
    revalidatePath("/hr");
    return {
      success: true,
      message: `Attendance corrected to ${updated.status} (${updated.total_hours} hrs).`,
      data: updated,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to correct attendance",
    };
  }
}

export async function submitLeaveAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const leave = await submitLeaveRequest(companyId, payload);
    revalidatePath("/hr");
    return {
      success: true,
      message: `${leave.leave_type} leave request for ${leave.total_days} day(s) submitted for approval.`,
      data: leave,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to submit leave request",
    };
  }
}

export async function reviewLeaveAction(
  companyId: string,
  leaveId: string,
  decision: { status: "Approved" | "Rejected"; rejectionReason?: string }
): Promise<ActionState> {
  try {
    const reviewed = await reviewLeaveRequest(companyId, leaveId, decision);
    revalidatePath("/hr");
    return {
      success: true,
      message: `Leave request marked as ${reviewed.status}.`,
      data: reviewed,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to review leave request",
    };
  }
}

export async function exportAttendanceCSVAction(
  companyId: string,
  date?: string
): Promise<ActionState<string>> {
  try {
    let companyName = "IT-Hub Corp";
    try {
      const settings = await getCompanySettings(companyId);
      companyName = settings.name || companyName;
    } catch {
      // Fallback
    }

    const attendance = await getHRAttendance(companyId, { date });
    const csv = exportAttendanceToCSV(attendance, { companyName });

    return {
      success: true,
      data: csv,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to export attendance CSV",
    };
  }
}

export async function updateWorkdaySettingsAction(
  companyId: string,
  payload: any
): Promise<ActionState> {
  try {
    const updated = await updateHRWorkdaySettings(companyId, payload);
    revalidatePath("/hr");
    return {
      success: true,
      message: "Workday settings and grace period parameters updated.",
      data: updated,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to update workday settings",
    };
  }
}
