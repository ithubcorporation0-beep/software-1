"use client";

import * as React from "react";
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  Calendar,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Eye,
  Lock,
  FileText,
  ShieldAlert,
  LogIn,
  LogOut,
  Edit,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type {
  HREmployee,
  Department,
  HRAttendance,
  HRLeave,
  HRWorkdaySettings,
  HRAttendanceSummaryReport,
  EmploymentStatus,
  LeaveType,
  AttendanceStatus,
} from "@/types/database.types";
import {
  createEmployeeAction,
  updateEmployeeAction,
  createDepartmentAction,
  checkInAction,
  checkOutAction,
  manualAttendanceCorrectionAction,
  submitLeaveAction,
  reviewLeaveAction,
  exportAttendanceCSVAction,
  updateWorkdaySettingsAction,
} from "./actions";

interface HRClientProps {
  companyId: string;
  currency: string;
  canViewSensitive: boolean;
  initialEmployees: HREmployee[];
  initialDepartments: Department[];
  initialAttendance: HRAttendance[];
  initialLeaves: HRLeave[];
  initialSettings: HRWorkdaySettings;
  initialSummary: HRAttendanceSummaryReport;
}

const EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  "Active",
  "On Leave",
  "Probation",
  "Terminated",
  "Suspended",
];

const LEAVE_TYPES: LeaveType[] = [
  "Annual",
  "Casual",
  "Sick",
  "Maternity/Paternity",
  "Unpaid",
  "Other",
];

export function HRClient({
  companyId,
  currency,
  canViewSensitive,
  initialEmployees,
  initialDepartments,
  initialAttendance,
  initialLeaves,
  initialSettings,
  initialSummary,
}: HRClientProps) {
  // Navigation
  const [activeTab, setActiveTab] = React.useState<"employees" | "attendance" | "leaves" | "departments" | "rules">("employees");

  // State
  const [employees, setEmployees] = React.useState<HREmployee[]>(initialEmployees);
  const [departments, setDepartments] = React.useState<Department[]>(initialDepartments);
  const [attendance, setAttendance] = React.useState<HRAttendance[]>(initialAttendance);
  const [leaves, setLeaves] = React.useState<HRLeave[]>(initialLeaves);
  const [settings, setSettings] = React.useState<HRWorkdaySettings>(initialSettings);
  const [summary, setSummary] = React.useState<HRAttendanceSummaryReport>(initialSummary);

  // Filters & Search
  const [employeeSearch, setEmployeeSearch] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Notifications & Async Transition
  const [isPending, startTransition] = React.useTransition();
  const [notification, setNotification] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modals
  const [showAddEmployeeModal, setShowAddEmployeeModal] = React.useState(false);
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = React.useState<HREmployee | null>(null);
  const [showAddDeptModal, setShowAddDeptModal] = React.useState(false);
  const [showRequestLeaveModal, setShowRequestLeaveModal] = React.useState(false);
  const [showRejectLeaveModal, setShowRejectLeaveModal] = React.useState(false);
  const [selectedLeaveForReject, setSelectedLeaveForReject] = React.useState<HRLeave | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

  const [showCorrectionModal, setShowCorrectionModal] = React.useState(false);
  const [selectedAttendanceForCorrection, setSelectedAttendanceForCorrection] = React.useState<HRAttendance | null>(null);
  const [correctionData, setCorrectionData] = React.useState({
    status: "Present" as AttendanceStatus,
    reason: "",
  });

  // Forms
  const [employeeForm, setEmployeeForm] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    cnic: "",
    departmentId: departments[0]?.id || "",
    position: "",
    joiningDate: new Date().toISOString().split("T")[0],
    salary: "",
    bankName: "",
    bankAccountTitle: "",
    bankAccountNumber: "",
    emergencyContactName: "",
    emergencyContactRelation: "",
    emergencyContactPhone: "",
    employmentStatus: "Active" as EmploymentStatus,
  });

  const [deptForm, setDeptForm] = React.useState({
    name: "",
    code: "",
    description: "",
  });

  const [leaveForm, setLeaveForm] = React.useState({
    employeeId: employees[0]?.id || "",
    leaveType: "Annual" as LeaveType,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: "",
    attachmentUrl: "",
  });

  const [settingsForm, setSettingsForm] = React.useState({
    workday_start: settings.workday_start,
    workday_end: settings.workday_end,
    timezone: settings.timezone,
    grace_period_minutes: settings.grace_period_minutes,
    half_day_hours: settings.half_day_hours,
  });

  // Auto-dismiss notifications
  React.useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  // Filtered Employees
  const filteredEmployees = employees.filter((e) => {
    const s = employeeSearch.toLowerCase();
    const matchesSearch =
      !employeeSearch ||
      e.full_name.toLowerCase().includes(s) ||
      e.email.toLowerCase().includes(s) ||
      e.employee_id.toLowerCase().includes(s) ||
      e.position.toLowerCase().includes(s);
    const matchesDept = departmentFilter === "ALL" || e.department_id === departmentFilter;
    const matchesStatus = statusFilter === "ALL" || e.employment_status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  // Handlers
  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createEmployeeAction(companyId, {
        fullName: employeeForm.fullName,
        email: employeeForm.email,
        phone: employeeForm.phone || null,
        cnic: employeeForm.cnic || null,
        departmentId: employeeForm.departmentId || null,
        position: employeeForm.position,
        joiningDate: employeeForm.joiningDate,
        salary: employeeForm.salary ? parseFloat(employeeForm.salary) : null,
        bankName: employeeForm.bankName || null,
        bankAccountTitle: employeeForm.bankAccountTitle || null,
        bankAccountNumber: employeeForm.bankAccountNumber || null,
        emergencyContactName: employeeForm.emergencyContactName || null,
        emergencyContactRelation: employeeForm.emergencyContactRelation || null,
        emergencyContactPhone: employeeForm.emergencyContactPhone || null,
        employmentStatus: employeeForm.employmentStatus,
      });

      if (res.success && res.data) {
        setEmployees([res.data, ...employees]);
        setShowAddEmployeeModal(false);
        setEmployeeForm({
          fullName: "",
          email: "",
          phone: "",
          cnic: "",
          departmentId: departments[0]?.id || "",
          position: "",
          joiningDate: new Date().toISOString().split("T")[0],
          salary: "",
          bankName: "",
          bankAccountTitle: "",
          bankAccountNumber: "",
          emergencyContactName: "",
          emergencyContactRelation: "",
          emergencyContactPhone: "",
          employmentStatus: "Active",
        });
        setNotification({ text: res.message || "Employee registered.", type: "success" });
      } else {
        setNotification({ text: res.message || "Failed to register employee.", type: "error" });
      }
    });
  };

  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createDepartmentAction(companyId, deptForm);
      if (res.success && res.data) {
        setDepartments([...departments, res.data]);
        setShowAddDeptModal(false);
        setDeptForm({ name: "", code: "", description: "" });
        setNotification({ text: res.message || "Department created.", type: "success" });
      } else {
        setNotification({ text: res.message || "Failed to create department.", type: "error" });
      }
    });
  };

  const handleCheckIn = (employeeId: string) => {
    const previous = [...attendance];
    const nowIso = new Date().toISOString();
    const tempId = `temp-att-${Date.now()}`;
    const optimisticRecord: any = {
      id: tempId,
      company_id: companyId,
      employee_id: employeeId,
      date: nowIso.split("T")[0],
      check_in: nowIso,
      check_out: null,
      status: "Present",
      work_hours: 0,
    };
    const existingIdx = attendance.findIndex(
      (a) => a.employee_id === employeeId && a.date === optimisticRecord.date
    );
    if (existingIdx !== -1) {
      const updated = [...attendance];
      updated[existingIdx] = { ...updated[existingIdx], check_in: nowIso, status: "Present" };
      setAttendance(updated);
    } else {
      setAttendance([optimisticRecord, ...attendance]);
    }
    setNotification({ text: "Checked in successfully.", type: "success" });

    startTransition(async () => {
      try {
        const res = await checkInAction(companyId, employeeId);
        if (res.success && res.data) {
          setAttendance((current) =>
            current.map((a) => (a.id === tempId || a.id === res.data.id ? res.data : a))
          );
        } else {
          setAttendance(previous);
          setNotification({ text: res.message || "Check-in failed.", type: "error" });
        }
      } catch {
        setAttendance(previous);
        setNotification({ text: "Network error during check-in.", type: "error" });
      }
    });
  };

  const handleCheckOut = (employeeId: string) => {
    const previous = [...attendance];
    const nowIso = new Date().toISOString();
    const existingIdx = attendance.findIndex((a) => a.employee_id === employeeId);
    if (existingIdx !== -1) {
      const updated = [...attendance];
      updated[existingIdx] = { ...updated[existingIdx], check_out: nowIso };
      setAttendance(updated);
    }
    setNotification({ text: "Checked out successfully.", type: "success" });

    startTransition(async () => {
      try {
        const res = await checkOutAction(companyId, employeeId);
        if (res.success && res.data) {
          setAttendance((current) =>
            current.map((a) => (a.id === res.data.id ? res.data : a))
          );
        } else {
          setAttendance(previous);
          setNotification({ text: res.message || "Check-out failed.", type: "error" });
        }
      } catch {
        setAttendance(previous);
        setNotification({ text: "Network error during check-out.", type: "error" });
      }
    });
  };

  const handleAttendanceCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendanceForCorrection) return;
    startTransition(async () => {
      const res = await manualAttendanceCorrectionAction(
        companyId,
        selectedAttendanceForCorrection.id,
        correctionData
      );
      if (res.success && res.data) {
        setAttendance(
          attendance.map((a) => (a.id === selectedAttendanceForCorrection.id ? res.data : a))
        );
        setShowCorrectionModal(false);
        setSelectedAttendanceForCorrection(null);
        setCorrectionData({ status: "Present", reason: "" });
        setNotification({ text: res.message || "Attendance corrected.", type: "success" });
      } else {
        setNotification({ text: res.message || "Correction failed.", type: "error" });
      }
    });
  };

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitLeaveAction(companyId, leaveForm);
      if (res.success && res.data) {
        setLeaves([res.data, ...leaves]);
        setShowRequestLeaveModal(false);
        setLeaveForm({
          employeeId: employees[0]?.id || "",
          leaveType: "Annual",
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date().toISOString().split("T")[0],
          reason: "",
          attachmentUrl: "",
        });
        setNotification({ text: res.message || "Leave request submitted.", type: "success" });
      } else {
        setNotification({ text: res.message || "Failed to submit leave request.", type: "error" });
      }
    });
  };

  const handleReviewLeave = (leaveId: string, status: "Approved" | "Rejected", reason?: string) => {
    startTransition(async () => {
      const res = await reviewLeaveAction(companyId, leaveId, {
        status,
        rejectionReason: reason,
      });
      if (res.success && res.data) {
        setLeaves(leaves.map((l) => (l.id === leaveId ? res.data : l)));
        setShowRejectLeaveModal(false);
        setSelectedLeaveForReject(null);
        setRejectionReason("");
        setNotification({ text: res.message || `Leave ${status}.`, type: "success" });
      } else {
        setNotification({ text: res.message || `Failed to update leave.`, type: "error" });
      }
    });
  };

  const handleExportAttendanceCSV = () => {
    startTransition(async () => {
      const res = await exportAttendanceCSVAction(companyId);
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `attendance_export_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setNotification({ text: "Attendance report exported to CSV.", type: "success" });
      } else {
        setNotification({ text: res.message || "Export failed.", type: "error" });
      }
    });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateWorkdaySettingsAction(companyId, {
        ...settingsForm,
        grace_period_minutes: Number(settingsForm.grace_period_minutes),
        half_day_hours: Number(settingsForm.half_day_hours),
      });
      if (res.success && res.data) {
        setSettings(res.data);
        setNotification({ text: res.message || "Settings updated.", type: "success" });
      } else {
        setNotification({ text: res.message || "Failed to update settings.", type: "error" });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm shadow-sm transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Human Resources & Workforce
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Employee profiles, sensitive record protections, workday attendance rules, and leave management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAttendanceCSV}
            disabled={isPending}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowRequestLeaveModal(true)}
            className="gap-1.5"
          >
            <Calendar className="h-4 w-4" />
            Request Leave
          </Button>

          <Button
            size="sm"
            onClick={() => setShowAddEmployeeModal(true)}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Workforce Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Active Headcount
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>{employees.filter((e) => e.employment_status === "Active").length}</span>
              <Users className="h-5 w-5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              Across {departments.length} corporate departments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Attendance Today ({summary.date})
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>{summary.presentCount + summary.lateCount} Present</span>
              <UserCheck className="h-5 w-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              {summary.lateCount} late arrivals | {summary.absentCount} absent
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              On Leave Today
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>{summary.onLeaveCount}</span>
              <Calendar className="h-5 w-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              {leaves.filter((l) => l.status === "Pending").length} pending approval requests
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Workday Window ({settings.timezone})
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>{settings.workday_start.substring(0, 5)} - {settings.workday_end.substring(0, 5)}</span>
              <Clock className="h-5 w-5 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              Grace period: {settings.grace_period_minutes} mins
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("employees")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "employees"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          Employees ({employees.length})
        </button>

        <button
          onClick={() => setActiveTab("attendance")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "attendance"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Clock className="h-4 w-4" />
          Attendance Ledger ({attendance.length})
        </button>

        <button
          onClick={() => setActiveTab("leaves")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "leaves"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Leave Requests ({leaves.length})
        </button>

        <button
          onClick={() => setActiveTab("departments")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "departments"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Building className="h-4 w-4" />
          Departments ({departments.length})
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "rules"
              ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Work Rules & Shift Policy
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: EMPLOYEES ROSTER                                              */}
      {/* ==================================================================== */}
      {activeTab === "employees" && (
        <div className="space-y-4">
          {/* Controls: Search, Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name, email, ID, or title..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="h-9 text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Statuses</option>
                {EMPLOYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Employees Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Joining Date</th>
                  <th className="px-4 py-3">Compensation</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No employee records match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {emp.full_name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
                          <span>{emp.employee_id}</span>
                          <span>•</span>
                          <span>{emp.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {emp.department_name || "Unassigned"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {emp.position}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {emp.joining_date}
                      </td>
                      <td className="px-4 py-3">
                        {canViewSensitive && emp.salary !== null && emp.salary !== undefined ? (
                          <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            {currency} {emp.salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Lock className="h-3 w-3" />
                            Confidential
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {emp.employment_status === "Active" && (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none">
                            Active
                          </Badge>
                        )}
                        {emp.employment_status === "On Leave" && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-none">
                            On Leave
                          </Badge>
                        )}
                        {emp.employment_status === "Probation" && (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-none">
                            Probation
                          </Badge>
                        )}
                        {emp.employment_status === "Terminated" && (
                          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-none">
                            Terminated
                          </Badge>
                        )}
                        {emp.employment_status === "Suspended" && (
                          <Badge className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-none">
                            Suspended
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedEmployeeForDetail(emp)}
                          className="h-8 text-xs gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: ATTENDANCE LEDGER & QUICK PUNCH                               */}
      {/* ==================================================================== */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Quick Attendance Punch Widget for Staff */}
          <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Daily Punch Attendance Desk</span>
                <span className="text-xs font-normal text-slate-500">
                  Workday: {settings.workday_start.substring(0, 5)} - {settings.workday_end.substring(0, 5)} ({settings.timezone})
                </span>
              </CardTitle>
              <CardDescription>
                Record your official shift attendance. Late arrivals beyond the {settings.grace_period_minutes}-minute grace window are tagged automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {employees.slice(0, 6).map((emp) => {
                  const todayAtt = attendance.find(
                    (a) => a.employee_id === emp.id && a.date === new Date().toISOString().split("T")[0]
                  );
                  const isCheckedIn = todayAtt && todayAtt.check_in && !todayAtt.check_out;
                  const isCompleted = todayAtt && todayAtt.check_in && todayAtt.check_out;

                  return (
                    <div
                      key={emp.id}
                      className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {emp.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {emp.employee_id}
                        </div>
                        {todayAtt && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            Status: <span className="font-semibold">{todayAtt.status}</span>
                            {todayAtt.check_in && ` (${new Date(todayAtt.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isCheckedIn && !isCompleted && (
                          <Button
                            size="sm"
                            onClick={() => handleCheckIn(emp.id)}
                            disabled={isPending}
                            className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <LogIn className="h-3 w-3" />
                            In
                          </Button>
                        )}

                        {isCheckedIn && (
                          <Button
                            size="sm"
                            onClick={() => handleCheckOut(emp.id)}
                            disabled={isPending}
                            className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white gap-1"
                          >
                            <LogOut className="h-3 w-3" />
                            Out
                          </Button>
                        )}

                        {isCompleted && (
                          <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-[10px] border-none">
                            Done ({todayAtt.total_hours}h)
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Attendance History Table */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Official Shift Attendance Log
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3 text-right">Hours</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Audit Type</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No attendance records found.
                      </td>
                    </tr>
                  ) : (
                    attendance.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-medium">
                          {att.employee?.full_name || "Employee"} ({att.employee?.employee_id})
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {att.date}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {att.check_in ? new Date(att.check_in).toLocaleTimeString() : "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {att.check_out ? new Date(att.check_out).toLocaleTimeString() : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {att.total_hours.toFixed(2)}h
                        </td>
                        <td className="px-4 py-3">
                          {att.status === "Present" && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none">
                              Present
                            </Badge>
                          )}
                          {att.status === "Late" && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-none">
                              Late Arrival
                            </Badge>
                          )}
                          {att.status === "Half Day" && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-none">
                              Half Day
                            </Badge>
                          )}
                          {att.status === "Early Departure" && (
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-none">
                              Early Departure
                            </Badge>
                          )}
                          {att.status === "Absent" && (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-none">
                              Absent
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {att.is_manual_correction ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium cursor-help" title={att.correction_reason || "Corrected"}>
                              Manual Correction
                            </span>
                          ) : (
                            "Punch Clock"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedAttendanceForCorrection(att);
                              setCorrectionData({ status: att.status, reason: "" });
                              setShowCorrectionModal(true);
                            }}
                            className="h-7 text-xs text-slate-500 hover:text-slate-900"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Correct
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: LEAVE MANAGEMENT & APPROVALS                                 */}
      {/* ==================================================================== */}
      {activeTab === "leaves" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Time-Off & Leave Requests
              </h3>
              <p className="text-xs text-slate-500">
                Staff PTO and medical leave requests. Overlapping date requests are prevented automatically.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowRequestLeaveModal(true)}
              className="gap-1.5"
            >
              <Calendar className="h-4 w-4" />
              Submit Leave Request
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-center">Days</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No leave requests submitted.
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium">
                        {l.employee?.full_name || "Employee"} ({l.employee?.employee_id})
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {l.leave_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {l.start_date} to {l.end_date}
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {l.total_days}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {l.reason}
                      </td>
                      <td className="px-4 py-3">
                        {l.status === "Approved" && (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none">
                            Approved
                          </Badge>
                        )}
                        {l.status === "Pending" && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-none">
                            Pending Review
                          </Badge>
                        )}
                        {l.status === "Rejected" && (
                          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-none">
                            Rejected
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {l.status === "Pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleReviewLeave(l.id, "Approved")}
                              disabled={isPending}
                              className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedLeaveForReject(l);
                                setShowRejectLeaveModal(true);
                              }}
                              disabled={isPending}
                              className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Reviewed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: DEPARTMENTS                                                   */}
      {/* ==================================================================== */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Organizational Departments
              </h3>
              <p className="text-xs text-slate-500">
                Functional units and workforce allocation across your company.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddDeptModal(true)}
              className="gap-1.5"
            >
              <Building className="h-4 w-4" />
              Add Department
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d) => (
              <Card key={d.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-xs">
                      {d.code}
                    </Badge>
                    <span className="text-xs text-slate-500 font-semibold">
                      {d.employee_count || 0} Staff
                    </span>
                  </div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {d.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {d.description || "No description provided."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: WORK RULES & SHIFT POLICY                                    */}
      {/* ==================================================================== */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg">Configurable Workday & Attendance Parameters</CardTitle>
              <CardDescription>
                Define operational shift hours, company timezone, and arrival grace periods.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Standard Workday Start *
                    </label>
                    <Input
                      type="time"
                      value={settingsForm.workday_start}
                      onChange={(e) => setSettingsForm({ ...settingsForm, workday_start: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Standard Workday End *
                    </label>
                    <Input
                      type="time"
                      value={settingsForm.workday_end}
                      onChange={(e) => setSettingsForm({ ...settingsForm, workday_end: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Company Timezone *
                    </label>
                    <Input
                      placeholder="e.g. UTC, Asia/Karachi, America/New_York"
                      value={settingsForm.timezone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, timezone: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Arrival Grace Period (Minutes) *
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={settingsForm.grace_period_minutes}
                      onChange={(e) => setSettingsForm({ ...settingsForm, grace_period_minutes: Number(e.target.value) })}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Half-Day Minimum Hours Threshold *
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min={1}
                    max={12}
                    value={settingsForm.half_day_hours}
                    onChange={(e) => setSettingsForm({ ...settingsForm, half_day_hours: Number(e.target.value) })}
                    required
                    className="mt-1"
                  />
                </div>

                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Hardware & Biometric Roadmap Notice</p>
                    <p className="mt-1 leading-relaxed">
                      GPS geo-fencing, IP whitelisting restrictions, and physical biometric reader integration are flagged as future connector modules. Current shift punches operate systematically on tenant-scoped authenticated web sessions.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Save Shift Parameters
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: ADD EMPLOYEE                                                */}
      {/* ==================================================================== */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Register New Employee
              </h3>
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Legal Name *
                  </label>
                  <Input
                    placeholder="e.g. John Doe"
                    value={employeeForm.fullName}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, fullName: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Corporate Email *
                  </label>
                  <Input
                    type="email"
                    placeholder="john@company.com"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Department *
                  </label>
                  <select
                    value={employeeForm.departmentId}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, departmentId: e.target.value })}
                    className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Job Title / Position *
                  </label>
                  <Input
                    placeholder="e.g. Senior Software Engineer"
                    value={employeeForm.position}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Joining Date *
                  </label>
                  <Input
                    type="date"
                    value={employeeForm.joiningDate}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, joiningDate: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Employment Status *
                  </label>
                  <select
                    value={employeeForm.employmentStatus}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employmentStatus: e.target.value as EmploymentStatus })}
                    className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {EMPLOYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sensitive Fields (CNIC, Salary, Bank) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  <Lock className="h-3.5 w-3.5 text-amber-500" />
                  Sensitive Compensation & Identity (Permission Protected)
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400">
                      CNIC / National ID
                    </label>
                    <Input
                      placeholder="e.g. 35201-XXXXXXX-X"
                      value={employeeForm.cnic}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, cnic: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400">
                      Monthly Salary ({currency})
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={employeeForm.salary}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400">Bank Name</label>
                    <Input
                      placeholder="Bank"
                      value={employeeForm.bankName}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, bankName: e.target.value })}
                      className="mt-0.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400">Account Title</label>
                    <Input
                      placeholder="Title"
                      value={employeeForm.bankAccountTitle}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, bankAccountTitle: e.target.value })}
                      className="mt-0.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400">IBAN / Account #</label>
                    <Input
                      placeholder="Account #"
                      value={employeeForm.bankAccountNumber}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, bankAccountNumber: e.target.value })}
                      className="mt-0.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Emergency Contact
                  </label>
                  <Input
                    placeholder="Name"
                    value={employeeForm.emergencyContactName}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyContactName: e.target.value })}
                    className="mt-0.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Relationship
                  </label>
                  <Input
                    placeholder="e.g. Spouse, Parent"
                    value={employeeForm.emergencyContactRelation}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyContactRelation: e.target.value })}
                    className="mt-0.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Phone
                  </label>
                  <Input
                    placeholder="Phone #"
                    value={employeeForm.emergencyContactPhone}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyContactPhone: e.target.value })}
                    className="mt-0.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddEmployeeModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isPending ? "Registering..." : "Save Employee Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: EMPLOYEE DETAIL DRAWER / DIALOG                             */}
      {/* ==================================================================== */}
      {selectedEmployeeForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedEmployeeForDetail.full_name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedEmployeeForDetail.employee_id} • {selectedEmployeeForDetail.position}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployeeForDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Email:</span>{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedEmployeeForDetail.email}</span>
                </div>
                <div>
                  <span className="text-slate-400">Phone:</span>{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedEmployeeForDetail.phone || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400">Department:</span>{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedEmployeeForDetail.department_name || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400">Joining Date:</span>{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedEmployeeForDetail.joining_date}</span>
                </div>
              </div>

              {/* Sensitive Section */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2 text-xs border border-slate-200 dark:border-slate-700">
                <div className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-500" />
                  Protected Identity & Compensation
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400">CNIC:</span>{" "}
                    <span className="font-mono font-medium">
                      {selectedEmployeeForDetail.cnic || "Masked"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Salary:</span>{" "}
                    <span className="font-mono font-medium text-emerald-600">
                      {selectedEmployeeForDetail.salary !== null && selectedEmployeeForDetail.salary !== undefined
                        ? `${currency} ${selectedEmployeeForDetail.salary.toFixed(2)}`
                        : "Confidential"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Bank:</span>{" "}
                    <span>{selectedEmployeeForDetail.bank_name || "Confidential"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Account #:</span>{" "}
                    <span className="font-mono">{selectedEmployeeForDetail.bank_account_number || "Confidential"}</span>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="text-xs">
                <span className="text-slate-400">Emergency Contact:</span>{" "}
                <span className="font-semibold">
                  {selectedEmployeeForDetail.emergency_contact_name || "Not specified"}{" "}
                  {selectedEmployeeForDetail.emergency_contact_relation && `(${selectedEmployeeForDetail.emergency_contact_relation})`}{" "}
                  {selectedEmployeeForDetail.emergency_contact_phone && `• ${selectedEmployeeForDetail.emergency_contact_phone}`}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" onClick={() => setSelectedEmployeeForDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: REQUEST LEAVE                                               */}
      {/* ==================================================================== */}
      {showRequestLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Submit Leave Request
              </h3>
              <button
                onClick={() => setShowRequestLeaveModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Employee *
                </label>
                <select
                  value={leaveForm.employeeId}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                  className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Leave Type *
                </label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value as LeaveType })}
                  className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Start Date *
                  </label>
                  <Input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    End Date *
                  </label>
                  <Input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reason / Notes *
                </label>
                <textarea
                  rows={2}
                  placeholder="Reason for taking time off..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  required
                  className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRequestLeaveModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isPending ? "Submitting..." : "Submit Leave Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: REJECT LEAVE                                                */}
      {/* ==================================================================== */}
      {showRejectLeaveModal && selectedLeaveForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" />
              Reject Leave Request
            </h3>
            <p className="text-xs text-slate-500">
              Provide an auditable reason for rejecting this leave request.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleReviewLeave(selectedLeaveForReject.id, "Rejected", rejectionReason);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Project deliverable deadline conflict, insufficient leave quota..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRejectLeaveModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: ATTENDANCE MANUAL CORRECTION                                */}
      {/* ==================================================================== */}
      {showCorrectionModal && selectedAttendanceForCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit className="h-5 w-5 text-amber-500" />
              Manual Attendance Correction
            </h3>

            <form onSubmit={handleAttendanceCorrection} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Corrected Attendance Status *
                </label>
                <select
                  value={correctionData.status}
                  onChange={(e) => setCorrectionData({ ...correctionData, status: e.target.value as AttendanceStatus })}
                  className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Early Departure">Early Departure</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Auditable Correction Justification *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Employee punch card reader failed, confirmed on-site client visit..."
                  value={correctionData.reason}
                  onChange={(e) => setCorrectionData({ ...correctionData, reason: e.target.value })}
                  required
                  className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCorrectionModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Save Correction
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 6: ADD DEPARTMENT                                              */}
      {/* ==================================================================== */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Create Corporate Department
            </h3>

            <form onSubmit={handleCreateDepartment} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Department Name *
                </label>
                <Input
                  placeholder="e.g. Quality Assurance"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Department Code *
                </label>
                <Input
                  placeholder="e.g. QA"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Department operational scope..."
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full mt-1 text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDeptModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create Department
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
