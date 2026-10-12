import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createHREmployee,
  getHREmployees,
  getHREmployeeById,
  updateHREmployee,
  createDepartment,
  getDepartments,
  checkIn,
  checkOut,
  manualAttendanceCorrection,
  getHRAttendance,
  submitLeaveRequest,
  reviewLeaveRequest,
  getHRLeaves,
  getHRAttendanceSummaryReport,
  exportAttendanceToCSV,
  updateHRWorkdaySettings,
  getHRWorkdaySettings,
  resetMemoryHRStore,
  canViewSensitiveHR,
  maskSensitiveFields,
  AttendanceTransitionError,
  OverlappingLeaveError,
} from "@/lib/hr/server";

const { ForbiddenError, mockRequireUser, mockRequirePermission, mockRecordAuditLog } = vi.hoisted(() => {
  class ForbiddenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ForbiddenError";
    }
  }
  return {
    ForbiddenError,
    mockRequireUser: vi.fn(),
    mockRequirePermission: vi.fn(),
    mockRecordAuditLog: vi.fn(),
  };
});

vi.mock("@/lib/auth/server", () => ({
  ForbiddenError,
  requireUser: () => mockRequireUser(),
  requirePermission: (companyId: string, perm: string, user?: any) =>
    mockRequirePermission(companyId, perm, user),
}));

vi.mock("@/lib/audit/server", () => ({
  recordAuditLog: (...args: any[]) => mockRecordAuditLog(...args),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "rpc pending" } }),
  })),
}));

describe("HR Module: Employees, Sensitive Records, Attendance, and Leave Workflows", () => {
  const companyA = "00000000-0000-0000-0000-000000000001";
  const companyB = "00000000-0000-0000-0000-000000000002";

  const staffUser = {
    id: "usr-staff-01",
    email: "sarah.connor@it-hub.corp",
    full_name: "Sarah Connor",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const hrManagerUser = {
    id: "usr-hr-01",
    email: "hr.director@it-hub.corp",
    full_name: "HR Director",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const generalViewerUser = {
    id: "usr-viewer-01",
    email: "team.lead@it-hub.corp",
    full_name: "Team Lead",
    is_super_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    resetMemoryHRStore();
    vi.clearAllMocks();

    mockRequireUser.mockResolvedValue(hrManagerUser);
    mockRequirePermission.mockResolvedValue({
      membership: { id: "m-1" },
      role: { name: "HR Manager" },
      company: { id: companyA, name: "IT-Hub Corp" },
      permissions: ["*"],
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  // --------------------------------------------------------------------------
  // 1. SENSITIVE FIELD PROTECTION & REDACTION
  // --------------------------------------------------------------------------
  describe("Sensitive Employee Fields & Redaction", () => {
    it("masks CNIC, salary, and bank details for standard unauthorized viewers", async () => {
      // 1. Create employee with confidential salary and bank details
      const emp = await createHREmployee(companyA, {
        fullName: "Alexander Pierce",
        email: "alexander.pierce@it-hub.corp",
        phone: "+1 555-0199",
        cnic: "35201-1234567-1",
        position: "Senior Systems Architect",
        joiningDate: "2026-01-15",
        salary: 12500,
        bankName: "JPMorgan Chase",
        bankAccountTitle: "Alexander Pierce",
        bankAccountNumber: "US99CHAS1234567890",
        employmentStatus: "Active",
      });

      // 2. Mock permissions as standard viewer (hr.read only, without hr.sensitive)
      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-viewer" },
        role: { name: "Team Lead" },
        company: { id: companyA, name: "IT-Hub Corp" },
        permissions: ["hr.read"],
      });

      const list = await getHREmployees(companyA, {}, generalViewerUser);
      const fetchedEmp = list.find((e) => e.id === emp.id);

      expect(fetchedEmp).toBeDefined();
      expect(fetchedEmp?.cnic).toBe("●●●●●-●●●●●●●-●");
      expect(fetchedEmp?.salary).toBeNull();
      expect(fetchedEmp?.bank_name).toBeNull();
      expect(fetchedEmp?.bank_account_number).toBeNull();
    });

    it("reveals unmasked sensitive details to authorized HR Admin or Super Admin", async () => {
      const emp = await createHREmployee(companyA, {
        fullName: "Diana Prince",
        email: "diana.prince@it-hub.corp",
        cnic: "35202-9876543-2",
        position: "Security Lead",
        joiningDate: "2026-02-01",
        salary: 15000,
        bankName: "Citibank",
        bankAccountTitle: "Diana Prince",
        bankAccountNumber: "US11CITI9876543210",
        employmentStatus: "Active",
      });

      // Authorized with wildcard or hr.sensitive
      mockRequirePermission.mockResolvedValue({
        membership: { id: "m-hr" },
        role: { name: "HR Director" },
        company: { id: companyA, name: "IT-Hub Corp" },
        permissions: ["hr.read", "hr.sensitive"],
      });

      const fetched = await getHREmployeeById(companyA, emp.id, hrManagerUser);

      expect(fetched).toBeDefined();
      expect(fetched?.cnic).toBe("35202-9876543-2");
      expect(fetched?.salary).toBe(15000);
      expect(fetched?.bank_name).toBe("Citibank");
      expect(fetched?.bank_account_number).toBe("US11CITI9876543210");
    });
  });

  // --------------------------------------------------------------------------
  // 2. EMPLOYEE & DEPARTMENT MANAGEMENT
  // --------------------------------------------------------------------------
  describe("Employee & Department Lifecycle", () => {
    it("creates a department and associates employees with it", async () => {
      const dept = await createDepartment(companyA, {
        name: "Artificial Intelligence & R&D",
        code: "AI-RD",
        description: "Autonomous reasoning and model alignment",
      });

      expect(dept.id).toBeDefined();
      expect(dept.code).toBe("AI-RD");

      const emp = await createHREmployee(companyA, {
        fullName: "Alan Turing",
        email: "alan.turing@it-hub.corp",
        departmentId: dept.id,
        position: "Principal AI Scientist",
        joiningDate: "2026-03-01",
      });

      expect(emp.employee_id).toMatch(/^EMP-\d+/);
      expect(emp.department_id).toBe(dept.id);
      expect(emp.department_name).toBe("Artificial Intelligence & R&D");

      const depts = await getDepartments(companyA);
      const foundDept = depts.find((d) => d.id === dept.id);
      expect(foundDept?.employee_count).toBe(1);
    });

    it("prevents duplicate department codes within the same company", async () => {
      await createDepartment(companyA, {
        name: "Quality Assurance",
        code: "QA",
      });

      await expect(
        createDepartment(companyA, {
          name: "Quality Automation",
          code: "QA",
        })
      ).rejects.toThrow(/already exists/);
    });

    it("updates employee records while maintaining tenant boundaries", async () => {
      const emp = await createHREmployee(companyA, {
        fullName: "James Bond",
        email: "james.bond@it-hub.corp",
        position: "Junior Analyst",
        joiningDate: "2026-01-01",
      });

      const updated = await updateHREmployee(companyA, emp.id, {
        position: "Senior Intelligence Analyst",
        employmentStatus: "Probation",
      });

      expect(updated.position).toBe("Senior Intelligence Analyst");
      expect(updated.employment_status).toBe("Probation");
    });
  });

  // --------------------------------------------------------------------------
  // 3. ATTENDANCE STATE MACHINE & TRANSITION VALIDATION
  // --------------------------------------------------------------------------
  describe("Attendance: Punch Clock, Grace Periods, and Valid Transitions", () => {
    it("records check-in on time as Present within grace period", async () => {
      // Workday starts at 09:00:00 with 15 mins grace period
      await updateHRWorkdaySettings(companyA, {
        workday_start: "09:00:00",
        grace_period_minutes: 15,
      });

      const emp = await createHREmployee(companyA, {
        fullName: "Peter Parker",
        email: "peter.parker@it-hub.corp",
        position: "Photographer",
        joiningDate: "2026-01-01",
      });

      // Check in at 09:10 UTC (within 15m grace window)
      const att = await checkIn(companyA, emp.id, "2026-10-12T09:10:00Z");

      expect(att.status).toBe("Present");
      expect(att.check_in).toBe("2026-10-12T09:10:00Z");
      expect(att.check_out).toBeNull();
    });

    it("flags check-in after grace period as Late", async () => {
      await updateHRWorkdaySettings(companyA, {
        workday_start: "09:00:00",
        grace_period_minutes: 15,
      });

      const emp = await createHREmployee(companyA, {
        fullName: "Clark Kent",
        email: "clark.kent@it-hub.corp",
        position: "Reporter",
        joiningDate: "2026-01-01",
      });

      // Check in at 09:35 UTC (after 09:15 grace limit)
      const att = await checkIn(companyA, emp.id, "2026-10-12T09:35:00Z");

      expect(att.status).toBe("Late");
    });

    it("PREVENTS DUPLICATE CHECK-IN: cannot check in twice on the same day without checking out", async () => {
      const emp = await createHREmployee(companyA, {
        fullName: "Bruce Wayne",
        email: "bruce.wayne@it-hub.corp",
        position: "Executive",
        joiningDate: "2026-01-01",
      });

      await checkIn(companyA, emp.id, "2026-10-12T09:00:00Z");

      // Attempt second check-in without checking out
      await expect(
        checkIn(companyA, emp.id, "2026-10-12T09:30:00Z")
      ).rejects.toThrow(AttendanceTransitionError);
    });

    it("calculates total hours on check-out and flags Half Day if under threshold", async () => {
      await updateHRWorkdaySettings(companyA, {
        half_day_hours: 4.0,
      });

      const emp = await createHREmployee(companyA, {
        fullName: "Barry Allen",
        email: "barry.allen@it-hub.corp",
        position: "Chemist",
        joiningDate: "2026-01-01",
      });

      await checkIn(companyA, emp.id, "2026-10-12T09:00:00Z");

      // Check out after only 2.5 hours
      const att = await checkOut(companyA, emp.id, "2026-10-12T11:30:00Z");

      expect(att.total_hours).toBe(2.5);
      expect(att.status).toBe("Half Day");
    });

    it("PREVENTS INVALID CHECK-OUT without prior check-in", async () => {
      const emp = await createHREmployee(companyA, {
        fullName: "Tony Stark",
        email: "tony.stark@it-hub.corp",
        position: "Engineer",
        joiningDate: "2026-01-01",
      });

      await expect(
        checkOut(companyA, emp.id, "2026-10-12T17:00:00Z")
      ).rejects.toThrow(AttendanceTransitionError);
    });

    it("PREVENTS IMPOSSIBLE TRANSITION: check-out timestamp cannot precede check-in timestamp", async () => {
      const emp = await createHREmployee(companyA, {
        fullName: "Steve Rogers",
        email: "steve.rogers@it-hub.corp",
        position: "Captain",
        joiningDate: "2026-01-01",
      });

      await checkIn(companyA, emp.id, "2026-10-12T09:00:00Z");

      // Check out in the past
      await expect(
        checkOut(companyA, emp.id, "2026-10-12T08:00:00Z")
      ).rejects.toThrow(AttendanceTransitionError);
    });

    it("allows managerial attendance correction with mandatory audit reason", async () => {
      const emp = await createHREmployee(companyA, {
        fullName: "Natasha Romanoff",
        email: "natasha.romanoff@it-hub.corp",
        position: "Specialist",
        joiningDate: "2026-01-01",
      });

      const att = await checkIn(companyA, emp.id, "2026-10-12T09:00:00Z");

      const corrected = await manualAttendanceCorrection(companyA, att.id, {
        status: "Present",
        reason: "Hardware card punch machine network timeout",
      });

      expect(corrected.is_manual_correction).toBe(true);
      expect(corrected.correction_reason).toBe("Hardware card punch machine network timeout");
    });
  });

  // --------------------------------------------------------------------------
  // 4. LEAVE MANAGEMENT & OVERLAP PREVENTION
  // --------------------------------------------------------------------------
  describe("Leave Management & Overlap Prevention", () => {
    it("submits a leave request with calculated total days", async () => {
      const emp = await createHREmployee(companyA, {
        fullName: "Arthur Curry",
        email: "arthur.curry@it-hub.corp",
        position: "Marine Biologist",
        joiningDate: "2026-01-01",
      });

      const leave = await submitLeaveRequest(companyA, {
        employeeId: emp.id,
        leaveType: "Annual",
        startDate: "2026-11-01",
        endDate: "2026-11-05",
        reason: "Family vacation",
      });

      expect(leave.id).toBeDefined();
      expect(leave.status).toBe("Pending");
      expect(leave.total_days).toBe(5);
    });

    it("PREVENTS OVERLAPPING LEAVE REQUESTS for the same employee", async () => {
      const emp = await createHREmployee(companyA, {
        fullName: "Wanda Maximoff",
        email: "wanda.maximoff@it-hub.corp",
        position: "Researcher",
        joiningDate: "2026-01-01",
      });

      // First request: Nov 10 to Nov 15
      await submitLeaveRequest(companyA, {
        employeeId: emp.id,
        leaveType: "Casual",
        startDate: "2026-11-10",
        endDate: "2026-11-15",
        reason: "Personal leave",
      });

      // Second overlapping request: Nov 12 to Nov 18
      await expect(
        submitLeaveRequest(companyA, {
          employeeId: emp.id,
          leaveType: "Sick",
          startDate: "2026-11-12",
          endDate: "2026-11-18",
          reason: "Medical appointment",
        })
      ).rejects.toThrow(OverlappingLeaveError);
    });

    it("approves and rejects leave requests with reviewer timestamps", async () => {
      const emp = await createHREmployee(companyA, {
        fullName: "Stephen Strange",
        email: "stephen.strange@it-hub.corp",
        position: "Surgeon",
        joiningDate: "2026-01-01",
      });

      const leave = await submitLeaveRequest(companyA, {
        employeeId: emp.id,
        leaveType: "Annual",
        startDate: "2026-12-20",
        endDate: "2026-12-25",
        reason: "Year end holiday",
      });

      // Manager approves
      const approved = await reviewLeaveRequest(companyA, leave.id, {
        status: "Approved",
      });

      expect(approved.status).toBe("Approved");
      expect(approved.reviewed_by).toBe(hrManagerUser.id);
      expect(approved.reviewed_at).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 5. ATTENDANCE SUMMARY REPORTS & CSV EXPORT
  // --------------------------------------------------------------------------
  describe("Attendance Reports & CSV Export Engine", () => {
    it("computes accurate attendance summary for the company", async () => {
      const emp1 = await createHREmployee(companyA, {
        fullName: "Employee One",
        email: "emp1@it-hub.corp",
        position: "Associate",
        joiningDate: "2026-01-01",
      });
      const emp2 = await createHREmployee(companyA, {
        fullName: "Employee Two",
        email: "emp2@it-hub.corp",
        position: "Associate",
        joiningDate: "2026-01-01",
      });

      // Emp1 is Present on 2026-10-12
      await checkIn(companyA, emp1.id, "2026-10-12T09:05:00Z");

      const summary = await getHRAttendanceSummaryReport(companyA, "2026-10-12");

      expect(summary.totalEmployees).toBe(2);
      expect(summary.presentCount).toBe(1);
      expect(summary.absentCount).toBe(1);
      expect(summary.attendanceRatePct).toBe(50);
    });

    it("exports compliant CSV formatted attendance reports", async () => {
      const emp = await createHREmployee(companyA, {
        fullName: "CSV Tester",
        email: "csv.tester@it-hub.corp",
        position: "QA",
        joiningDate: "2026-01-01",
      });
      await checkIn(companyA, emp.id, "2026-10-12T09:00:00Z");

      const list = await getHRAttendance(companyA, { date: "2026-10-12" });
      const csv = exportAttendanceToCSV(list, { companyName: "IT-Hub Corp" });

      expect(csv).toContain('"Report","ATTENDANCE LOG"');
      expect(csv).toContain('"Company","IT-Hub Corp"');
      expect(csv).toContain("CSV Tester");
      expect(csv).toContain("Present");
    });
  });

  // --------------------------------------------------------------------------
  // 6. MULTI-TENANT ISOLATION
  // --------------------------------------------------------------------------
  describe("Multi-Tenant Isolation", () => {
    it("strictly isolates employee and attendance records per tenant company", async () => {
      // Company A employee
      await createHREmployee(companyA, {
        fullName: "Tenant A Staff",
        email: "staffA@it-hub.corp",
        position: "Dev",
        joiningDate: "2026-01-01",
      });

      // Company B has zero employees
      const listA = await getHREmployees(companyA);
      const listB = await getHREmployees(companyB);

      expect(listA.length).toBe(1);
      expect(listB.length).toBe(0);
    });

    it("rejects unauthorized cross-tenant operations with ForbiddenError", async () => {
      mockRequirePermission.mockRejectedValue(new ForbiddenError("Access Denied"));

      await expect(getHREmployees(companyB)).rejects.toThrow(ForbiddenError);
      await expect(getDepartments(companyB)).rejects.toThrow(ForbiddenError);
    });
  });
});
