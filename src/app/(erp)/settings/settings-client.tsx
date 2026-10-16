"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  Building2,
  Users,
  Shield,
  FileText,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  RefreshCw,
  Eye,
  Check,
} from "lucide-react";
import { CompanyExtendedSettings } from "@/lib/company/server";
import { CompanyMemberItem } from "@/lib/users/server";
import { Role, Permission, AuditLog } from "@/types/database.types";
import {
  saveCompanySettingsAction,
  inviteUserAction,
  updateMemberRoleAction,
  toggleMemberStatusAction,
  createCustomRoleAction,
  deleteCustomRoleAction,
  ActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface SettingsClientProps {
  companySettings: CompanyExtendedSettings;
  members: CompanyMemberItem[];
  roles: Array<Role & { permissions: string[] }>;
  permissionsCatalog: Permission[];
  auditLogs: AuditLog[];
  initialTab?: string;
}

export function SettingsClient({
  companySettings,
  members: initialMembers,
  roles: initialRoles,
  permissionsCatalog,
  auditLogs: initialAuditLogs,
  initialTab = "company",
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = React.useState<"company" | "users" | "roles" | "audit">(
    (initialTab as any) || "company"
  );

  // --- TAB 1: Company Settings Form State ---
  const [companyState, formAction, isSavingCompany] = useActionState<ActionState, FormData>(
    (state, formData) => saveCompanySettingsAction(companySettings.companyId, state, formData),
    { success: false }
  );

  // --- TAB 3: Roles & Custom Permissions State ---
  const [roles, setRoles] = React.useState(initialRoles);

  // --- TAB 2: User Administration State ---
  const [members, setMembers] = React.useState<CompanyMemberItem[]>(initialMembers);
  const [searchMember, setSearchMember] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [userAdminFeedback, setUserAdminFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(null);

  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteFullName, setInviteFullName] = React.useState("");
  const [inviteRoleId, setInviteRoleId] = React.useState(
    roles.find((r) => r.code === "employee")?.id || roles[0]?.id || ""
  );

  const [inviteState, inviteFormAction, isInviting] = useActionState<ActionState, FormData>(
    async (state, formData) => {
      formData.set("email", inviteEmail.trim());
      formData.set("fullName", inviteFullName.trim());
      formData.set("roleId", inviteRoleId);

      const res = await inviteUserAction(companySettings.companyId, state, formData);
      if (res.success && res.data) {
        setMembers((prev) => [res.data, ...prev]);
        setIsInviteOpen(false);
        setInviteEmail("");
        setInviteFullName("");
        setInviteError(null);
        setUserAdminFeedback({ message: res.message || "User invited successfully", type: "success" });
      } else {
        // Keep user typed fields (inviteEmail, inviteFullName) completely preserved!
        setInviteError(res.error || "Failed to invite user");
      }
      return res;
    },
    { success: false }
  );

  // Handle role update
  const handleRoleChange = async (membershipId: string, newRoleId: string) => {
    setUserAdminFeedback(null);
    const res = await updateMemberRoleAction(companySettings.companyId, membershipId, newRoleId);
    if (res.success) {
      setMembers((prev) =>
        prev.map((m) => {
          if (m.membershipId === membershipId) {
            const roleObj = initialRoles.find((r) => r.id === newRoleId);
            return {
              ...m,
              roleId: newRoleId,
              roleName: roleObj?.name || m.roleName,
              roleCode: roleObj?.code || m.roleCode,
            };
          }
          return m;
        })
      );
      setUserAdminFeedback({ message: "Member role updated successfully", type: "success" });
    } else {
      setUserAdminFeedback({ message: res.error || "Failed to update role", type: "error" });
    }
  };

  // Handle member status toggle
  const handleStatusToggle = async (membershipId: string, currentStatus: string) => {
    setUserAdminFeedback(null);
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const res = await toggleMemberStatusAction(companySettings.companyId, membershipId, newStatus);
    if (res.success) {
      setMembers((prev) =>
        prev.map((m) => (m.membershipId === membershipId ? { ...m, status: newStatus } : m))
      );
      setUserAdminFeedback({ message: `Member ${newStatus.toLowerCase()} successfully`, type: "success" });
    } else {
      setUserAdminFeedback({ message: res.error || "Failed to toggle status", type: "error" });
    }
  };

  const filteredMembers = React.useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.fullName.toLowerCase().includes(searchMember.toLowerCase()) ||
        m.email.toLowerCase().includes(searchMember.toLowerCase()) ||
        m.roleName.toLowerCase().includes(searchMember.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, searchMember, statusFilter]);

  const [effectivePermissionsMember, setEffectivePermissionsMember] = React.useState<CompanyMemberItem | null>(null);

  // --- TAB 3: Roles & Custom Permissions State ---
  const [isRoleModalOpen, setIsRoleModalOpen] = React.useState(false);
  const [roleFeedback, setRoleFeedback] = React.useState<{ message: string; type: "success" | "error" } | null>(null);

  // Custom Role Builder State
  const [roleTitle, setRoleTitle] = React.useState("");
  const [roleCode, setRoleCode] = React.useState("");
  const [roleDesc, setRoleDesc] = React.useState("");
  const [selectedPerms, setSelectedPerms] = React.useState<string[]>([]);

  const ROLE_ARCHETYPES = [
    {
      title: "Data Entry Operator",
      code: "data_entry_operator",
      desc: "Performs client onboarding and preliminary invoice drafts. No financial disbursement authority.",
      perms: ["customers.view", "customers.create", "invoices.view", "invoices.create", "inventory.view"],
    },
    {
      title: "Invoice Clerk",
      code: "invoice_clerk",
      desc: "Generates customer billing invoices, sales exports, and manages commercial receivables.",
      perms: ["invoices.view", "invoices.create", "invoices.edit", "invoices.export", "customers.view"],
    },
    {
      title: "Accountant",
      code: "accountant",
      desc: "Manages financial general ledger, expense reviews and approvals, and financial reports.",
      perms: ["expenses.view", "expenses.create", "expenses.approve", "invoices.view", "invoices.export", "payroll.view", "reports.view", "reports.export"],
    },
    {
      title: "HR Manager",
      code: "hr_manager",
      desc: "Oversees employee directory, attendance rosters, and payroll disbursement processing.",
      perms: ["employees.view", "employees.create", "employees.edit", "attendance.view", "attendance.manage", "payroll.view", "payroll.process"],
    },
    {
      title: "Sales Manager",
      code: "sales_manager",
      desc: "Full ownership of customer relationship management, sales pipelines, and invoicing.",
      perms: ["customers.view", "customers.create", "customers.edit", "customers.delete", "invoices.view", "invoices.create", "invoices.edit", "invoices.export", "reports.view"],
    },
  ];

  const applyArchetype = (arch: (typeof ROLE_ARCHETYPES)[0]) => {
    setRoleTitle(arch.title);
    setRoleCode(arch.code);
    setRoleDesc(arch.desc);
    setSelectedPerms(arch.perms);
  };

  const togglePermission = (code: string) => {
    setSelectedPerms((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const toggleModulePermissions = (codes: string[]) => {
    const allSelected = codes.every((c) => selectedPerms.includes(c));
    if (allSelected) {
      setSelectedPerms((prev) => prev.filter((c) => !codes.includes(c)));
    } else {
      setSelectedPerms((prev) => Array.from(new Set([...prev, ...codes])));
    }
  };

  const [roleState, roleFormAction, isCreatingRole] = useActionState<ActionState, FormData>(
    async (state, formData) => {
      const res = await createCustomRoleAction(companySettings.companyId, state, formData);
      if (res.success && res.data) {
        const perms = formData.getAll("permissionCodes") as string[];
        setRoles((prev) => [...prev, { ...res.data, permissions: perms }]);
        setIsRoleModalOpen(false);
        setRoleTitle("");
        setRoleCode("");
        setRoleDesc("");
        setSelectedPerms([]);
        setRoleFeedback({ message: res.message || "Custom role created successfully", type: "success" });
      } else {
        setRoleFeedback({ message: res.error || "Failed to create role", type: "error" });
      }
      return res;
    },
    { success: false }
  );

  const handleDeleteRole = async (roleId: string) => {
    setRoleFeedback(null);
    const res = await deleteCustomRoleAction(companySettings.companyId, roleId);
    if (res.success) {
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      setRoleFeedback({ message: "Custom role successfully deleted", type: "success" });
    } else {
      setRoleFeedback({ message: res.error || "Failed to delete role", type: "error" });
    }
  };

  // Group permissions by resource
  const groupedPermissions = React.useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissionsCatalog) {
      const list = map.get(p.resource) || [];
      list.push(p);
      map.set(p.resource, list);
    }
    return map;
  }, [permissionsCatalog]);

  // --- TAB 4: Audit Trail State ---
  const [auditLogs] = React.useState<AuditLog[]>(initialAuditLogs);
  const [auditSearch, setAuditSearch] = React.useState("");
  const [inspectedLog, setInspectedLog] = React.useState<AuditLog | null>(null);

  const filteredLogs = React.useMemo(() => {
    if (!auditSearch.trim()) return auditLogs;
    const term = auditSearch.toLowerCase();
    return auditLogs.filter(
      (log) =>
        log.action.toLowerCase().includes(term) ||
        log.resource.toLowerCase().includes(term) ||
        (log.resource_id && log.resource_id.toLowerCase().includes(term))
    );
  }, [auditLogs, auditSearch]);

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        <button
          onClick={() => setActiveTab("company")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === "company"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Company Settings
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === "users"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          User Administration
          <Badge variant="outline" className="ml-1 text-[10px] h-4">
            {members.length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === "roles"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Shield className="h-4 w-4" />
          Roles &amp; Permissions
          <Badge variant="outline" className="ml-1 text-[10px] h-4">
            {roles.length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === "audit"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Lock className="h-4 w-4" />
          Audit Trail
          <Badge variant="outline" className="ml-1 text-[10px] h-4">
            {auditLogs.length}
          </Badge>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: COMPANY PROFILE & FISCAL SETTINGS
      ========================================================================= */}
      {activeTab === "company" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Company Profile &amp; Operational Governance
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure corporate legal identity, numbering sequences, tax policy, and alert preferences.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Tenant: {companySettings.slug}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {companyState?.success && (
              <div className="mb-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{companyState.message}</span>
              </div>
            )}
            {companyState?.error && (
              <div className="mb-6 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{companyState.error}</span>
              </div>
            )}

            <form action={formAction} className="space-y-6">
              {/* Section 1: Legal Identity */}
              <div>
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  1. Legal Identity &amp; Branding
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Company Legal Name *</label>
                    <Input
                      name="name"
                      defaultValue={companySettings.name}
                      placeholder="e.g. Acme Industrial Technologies Corp"
                      required
                    />
                    {companyState?.errors?.name && (
                      <p className="text-[11px] text-destructive">{companyState.errors.name[0]}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Logo Asset URL</label>
                    <Input
                      name="logo"
                      defaultValue={companySettings.logo}
                      placeholder="https://assets.corp.local/logo.svg"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Headquarters Address</label>
                    <Input
                      name="address"
                      defaultValue={companySettings.address}
                      placeholder="Suite 500, Enterprise Financial Plaza"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Corporate Phone</label>
                    <Input
                      name="phone"
                      defaultValue={companySettings.phone}
                      placeholder="+1 (800) 555-0199"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Official Email</label>
                    <Input
                      name="email"
                      type="email"
                      defaultValue={companySettings.email}
                      placeholder="contact@enterprise.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Corporate Website</label>
                    <Input
                      name="website"
                      defaultValue={companySettings.website}
                      placeholder="https://www.enterprise.com"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground">Tax Identification / VAT Number</label>
                    <Input
                      name="taxInformation"
                      defaultValue={companySettings.taxInformation}
                      placeholder="US-EIN 12-3456789 or EU-VAT 987654321"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Fiscal, Currency & Localization */}
              <div className="border-t pt-5">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  2. Fiscal Parameters &amp; Localization
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Operating Currency *</label>
                    <select
                      name="currency"
                      defaultValue={companySettings.currency}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="PKR">PKR (₨) - Pakistani Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                      <option value="CAD">CAD ($) - Canadian Dollar</option>
                      <option value="AUD">AUD ($) - Australian Dollar</option>
                      <option value="AED">AED (د.إ) - UAE Dirham</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Corporate Timezone *</label>
                    <select
                      name="timezone"
                      defaultValue={companySettings.timezone}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="UTC">UTC (Universal Coordinated)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="America/Chicago">America/Chicago (CST)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                      <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">System Language</label>
                    <select
                      name="language"
                      defaultValue={companySettings.language}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Spanish (Español)</option>
                      <option value="fr">French (Français)</option>
                      <option value="ar">Arabic (العربية)</option>
                      <option value="ur">Urdu (اردو)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Date Format</label>
                    <select
                      name="dateFormat"
                      defaultValue={companySettings.dateFormat}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (Standard)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Billing & Invoicing Parameters */}
              <div className="border-t pt-5">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  3. Invoicing &amp; Commercial Terms
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Invoice Prefix *</label>
                    <Input
                      name="invoicePrefix"
                      defaultValue={companySettings.invoicePrefix}
                      placeholder="INV-"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Starting Invoice Number *</label>
                    <Input
                      name="startingInvoiceNumber"
                      type="number"
                      min={1}
                      defaultValue={companySettings.startingInvoiceNumber}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Default Tax Rate (%)</label>
                    <Input
                      name="defaultTaxSetting"
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      defaultValue={companySettings.defaultTaxSetting}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Payment Terms</label>
                    <select
                      name="paymentTerms"
                      defaultValue={companySettings.paymentTerms}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="Due on Receipt">Due on Receipt</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 60">Net 60 Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Notification Preferences */}
              <div className="border-t pt-5">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  4. Governance &amp; Notification Preferences
                </h3>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      name="emailAlerts"
                      defaultChecked={companySettings.notificationPreferences.emailAlerts}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Dispatch email notifications for urgent ledger disbursements and inventory movements</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      name="securityAlerts"
                      defaultChecked={companySettings.notificationPreferences.securityAlerts}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Immediate administrative dispatch on role modification or abnormal login activity</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      name="systemDigest"
                      defaultChecked={companySettings.notificationPreferences.systemDigest}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Generate weekly executive performance and inventory velocity digest</span>
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="border-t pt-4 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Last updated: {new Date(companySettings.updatedAt).toLocaleString()}
                </span>
                <Button type="submit" disabled={isSavingCompany}>
                  {isSavingCompany ? "Saving Settings..." : "Save Operating Policies"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          TAB 2: USER ADMINISTRATION
      ========================================================================= */}
      {activeTab === "users" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">
                  User Roster &amp; Access Governance
                </CardTitle>
                <CardDescription className="text-xs">
                  Authorize company personnel, assign granular roles, deactivate access, and protect administrative integrity.
                </CardDescription>
              </div>
              <Button onClick={() => setIsInviteOpen(true)} size="sm" className="shrink-0">
                <Plus className="mr-1.5 h-4 w-4" />
                Invite Member
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {userAdminFeedback && (
              <div
                className={`rounded-md p-3 text-xs flex items-center gap-2 ${
                  userAdminFeedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 border border-destructive/20 text-destructive"
                }`}
              >
                {userAdminFeedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>{userAdminFeedback.message}</span>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  placeholder="Filter users by name, email, or role..."
                  className="pl-8 text-xs"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INVITED">Invited</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>

            {/* Members Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User / Email</TableHead>
                  <TableHead>Role Assignment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-right">Access Controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                      No members matched the criteria &quot;{searchMember}&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.membershipId}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {member.fullName}
                            {member.isSuperAdmin && (
                              <Badge variant="warning" className="text-[9px] h-3.5">
                                Super Admin
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">{member.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <select
                          value={member.roleId}
                          onChange={(e) => handleRoleChange(member.membershipId, e.target.value)}
                          className="h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} {r.is_system ? "(System)" : "(Custom)"}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.status === "ACTIVE"
                              ? "success"
                              : member.status === "INVITED"
                              ? "info"
                              : "destructive"
                          }
                          className="text-[10px]"
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEffectivePermissionsMember(member)}
                            className="text-xs h-7 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10"
                            title="Inspect Effective Permissions"
                          >
                            <Shield className="mr-1 h-3 w-3" />
                            Permissions
                          </Button>
                          <Button
                            variant={member.status === "ACTIVE" ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleStatusToggle(member.membershipId, member.status)}
                            className="text-xs h-7"
                          >
                            {member.status === "ACTIVE" ? (
                              <>
                                <UserX className="mr-1 h-3 w-3 text-amber-500" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-1 h-3 w-3 text-emerald-500" />
                                Reactivate
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Invite User Dialog */}
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">Invite &amp; Assign User</DialogTitle>
              <DialogDescription className="text-xs">
                Grant membership to a team member and assign their initial operational role.
              </DialogDescription>
            </DialogHeader>

            {inviteError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form action={inviteFormAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Email Address *</label>
                <Input
                  name="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (inviteError) setInviteError(null);
                  }}
                  placeholder="colleague@enterprise.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Full Name *</label>
                <Input
                  name="fullName"
                  value={inviteFullName}
                  onChange={(e) => {
                    setInviteFullName(e.target.value);
                    if (inviteError) setInviteError(null);
                  }}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Role Assignment *</label>
                <select
                  name="roleId"
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.description || (r.is_system ? "System Role" : "Custom Role")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isInviting}>
                  {isInviting ? "Inviting..." : "Send Assignment"}
                </Button>
              </div>
            </form>
          </Dialog>

          {/* Effective Permissions Dialog */}
          <Dialog
            open={effectivePermissionsMember !== null}
            onOpenChange={(open) => !open && setEffectivePermissionsMember(null)}
          >
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-500" />
                Effective Permissions Audit: {effectivePermissionsMember?.fullName}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review verified operational entitlements. IT HUB ERP enforces a strict server-side default-deny policy.
              </DialogDescription>
            </DialogHeader>

            {effectivePermissionsMember && (() => {
              const memberRole = roles.find((r) => r.id === effectivePermissionsMember.roleId);
              const isSuper = effectivePermissionsMember.isSuperAdmin;
              const rolePerms = memberRole?.permissions || [];
              const hasWildcard = isSuper || rolePerms.includes("*");

              const checkHas = (code: string) => {
                if (hasWildcard) return true;
                if (rolePerms.includes(code)) return true;
                const alt1 = code.replace(".", ":");
                const alt2 = code.replace(":", ".");
                if (rolePerms.includes(alt1) || rolePerms.includes(alt2)) return true;
                const [res] = code.split(/[:.]/);
                if (
                  rolePerms.includes(`${res}:*`) ||
                  rolePerms.includes(`${res}.*`) ||
                  rolePerms.includes(`${res}:manage`) ||
                  rolePerms.includes(`${res}.manage`)
                ) {
                  return true;
                }
                return false;
              };

              const MODULE_SPEC = [
                {
                  module: "Customers & CRM",
                  actions: [
                    { name: "View Customers", code: "customers.view" },
                    { name: "Create Customer", code: "customers.create" },
                    { name: "Edit Customer", code: "customers.edit" },
                    { name: "Delete Customer", code: "customers.delete" },
                  ],
                },
                {
                  module: "Sales & Invoicing",
                  actions: [
                    { name: "View Invoices", code: "invoices.view" },
                    { name: "Create Invoice", code: "invoices.create" },
                    { name: "Edit Invoice", code: "invoices.edit" },
                    { name: "Delete Invoice", code: "invoices.delete" },
                    { name: "Export Invoices", code: "invoices.export" },
                  ],
                },
                {
                  module: "Finance & Expenses",
                  actions: [
                    { name: "View Expenses", code: "expenses.view" },
                    { name: "Create Expense", code: "expenses.create" },
                    { name: "Approve Expense", code: "expenses.approve" },
                  ],
                },
                {
                  module: "Human Resources",
                  actions: [
                    { name: "View Employees", code: "employees.view" },
                    { name: "Create Employee", code: "employees.create" },
                    { name: "Edit Employee", code: "employees.edit" },
                    { name: "View Attendance", code: "attendance.view" },
                    { name: "Manage Attendance", code: "attendance.manage" },
                  ],
                },
                {
                  module: "Payroll Processing",
                  actions: [
                    { name: "View Payroll", code: "payroll.view" },
                    { name: "Process Payroll", code: "payroll.process" },
                  ],
                },
                {
                  module: "Inventory & Warehousing",
                  actions: [
                    { name: "View Inventory", code: "inventory.view" },
                    { name: "Manage Inventory", code: "inventory.manage" },
                  ],
                },
                {
                  module: "Reports & Analytics",
                  actions: [
                    { name: "View Reports", code: "reports.view" },
                    { name: "Export Reports", code: "reports.export" },
                  ],
                },
                {
                  module: "User & Role Governance",
                  actions: [
                    { name: "View Users", code: "users.view" },
                    { name: "Manage Users", code: "users.manage" },
                  ],
                },
                {
                  module: "Company Settings",
                  actions: [
                    { name: "Manage Settings", code: "settings.manage" },
                  ],
                },
              ];

              return (
                <div className="space-y-4 pt-2 text-xs max-h-[70vh] overflow-y-auto pr-1">
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {effectivePermissionsMember.fullName} ({effectivePermissionsMember.email})
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {memberRole?.name || "Standard Member"}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Status: <span className="font-medium text-foreground">{effectivePermissionsMember.status}</span>
                      {isSuper && " · Global Super Admin Platform Bypass"}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {MODULE_SPEC.map((mod) => (
                      <div key={mod.module} className="rounded-lg border p-3 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {mod.module}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {mod.actions.map((act) => {
                            const isAllowed = checkHas(act.code);
                            return (
                              <div
                                key={act.code}
                                className={`flex items-center justify-between rounded p-1.5 border ${
                                  isAllowed
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                    : "bg-muted/10 border-border/40 text-muted-foreground opacity-60"
                                }`}
                              >
                                <div>
                                  <div className="font-medium text-[11px]">{act.name}</div>
                                  <div className="font-mono text-[9px] opacity-75">{act.code}</div>
                                </div>
                                <Badge
                                  variant={isAllowed ? "success" : "outline"}
                                  className="text-[9px] h-4 py-0"
                                >
                                  {isAllowed ? "Permitted" : "Default Deny"}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => setEffectivePermissionsMember(null)}>
                      Close Inspection
                    </Button>
                  </div>
                </div>
              );
            })()}
          </Dialog>
        </Card>
      )}

      {/* =========================================================================
          TAB 3: ROLES & CUSTOM PERMISSIONS
      ========================================================================= */}
      {activeTab === "roles" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">
                  Organizational Roles &amp; Granular Permissions
                </CardTitle>
                <CardDescription className="text-xs">
                  Inspect built-in PRD system roles or assemble custom role bundles for specialized workflows.
                </CardDescription>
              </div>
              <Button onClick={() => setIsRoleModalOpen(true)} size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Create Custom Role
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {roleFeedback && (
              <div
                className={`rounded-md p-3 text-xs flex items-center gap-2 ${
                  roleFeedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 border border-destructive/20 text-destructive"
                }`}
              >
                {roleFeedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>{roleFeedback.message}</span>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-lg border bg-card p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{role.name}</span>
                        <Badge
                          variant={role.is_system ? "secondary" : "outline"}
                          className="text-[10px] h-4"
                        >
                          {role.is_system ? "System" : "Custom"}
                        </Badge>
                      </div>
                      {!role.is_system && (
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{role.description || "No description provided."}</p>
                    <div className="text-[11px] font-mono text-muted-foreground">Code: {role.code}</div>
                  </div>

                  <div className="border-t pt-2.5">
                    <div className="text-[11px] font-medium text-foreground mb-1.5">
                      Assigned Permissions ({role.permissions.length}):
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {role.permissions.map((p) => (
                        <Badge key={p} variant="outline" className="text-[9px] font-mono py-0 h-4">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>

          {/* Create Custom Role Modal */}
          <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">Define Custom Organizational Role</DialogTitle>
              <DialogDescription className="text-xs">
                Assemble tailored permission bundles. Privilege escalation rules apply.
              </DialogDescription>
            </DialogHeader>

            <form action={roleFormAction} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Quick Template Archetypes */}
              <div className="space-y-1.5 border-b pb-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Role Archetypes (PRD Standards):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_ARCHETYPES.map((arch) => (
                    <Button
                      key={arch.code}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyArchetype(arch)}
                      className="h-6 text-[10px] px-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 border-indigo-500/20"
                    >
                      + {arch.title}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Role Title *</label>
                  <Input
                    name="name"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g. Data Entry Operator"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Role Code *</label>
                  <Input
                    name="code"
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    placeholder="e.g. data_entry_operator"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Role Description</label>
                <Input
                  name="description"
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  placeholder="e.g. Manages customer entry and draft sales invoices without financial disbursement rights"
                />
              </div>

              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-foreground">
                    Grant Granular Permissions * ({selectedPerms.length} selected)
                  </div>
                  {selectedPerms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedPerms([])}
                      className="text-[11px] text-muted-foreground hover:text-destructive underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto border rounded-md p-3">
                  {Array.from(groupedPermissions.entries()).map(([resource, perms]) => {
                    const allInModuleSelected = perms.every((p) => selectedPerms.includes(p.code));
                    return (
                      <div key={resource} className="space-y-1.5 border-b pb-2 last:border-b-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {resource}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleModulePermissions(perms.map((p) => p.code))}
                            className="text-[10px] text-indigo-400 hover:underline font-mono"
                          >
                            {allInModuleSelected ? "Deselect Module" : "Select Module"}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {perms.map((p) => {
                            const isChecked = selectedPerms.includes(p.code);
                            return (
                              <label
                                key={p.code}
                                className={`flex items-start gap-2 text-[11px] p-1.5 rounded cursor-pointer border transition-colors ${
                                  isChecked
                                    ? "bg-indigo-500/10 border-indigo-500/30 text-foreground"
                                    : "hover:bg-muted/40 border-transparent text-muted-foreground"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  name="permissionCodes"
                                  value={p.code}
                                  checked={isChecked}
                                  onChange={() => togglePermission(p.code)}
                                  className="mt-0.5 rounded border-input text-primary h-3.5 w-3.5"
                                />
                                <div>
                                  <span className="font-mono font-medium text-foreground">{p.code}</span>
                                  <p className="text-[10px] text-muted-foreground">{p.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsRoleModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isCreatingRole}>
                  {isCreatingRole ? "Creating Role..." : "Save Role"}
                </Button>
              </div>
            </form>
          </Dialog>
        </Card>
      )}

      {/* =========================================================================
          TAB 4: SECURITY & AUDIT TRAIL
      ========================================================================= */}
      {activeTab === "audit" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Enterprise Audit Trail &amp; Compliance Ledger
                </CardTitle>
                <CardDescription className="text-xs">
                  Immutable, append-only security logs. Normal users cannot modify or purge records.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs self-start sm:self-auto font-mono">
                Redaction Engine Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Audit Logs */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit trail by action (e.g. auth.login, user.invite), resource, or ID..."
                className="pl-8 text-xs"
              />
            </div>

            {/* Audit Logs Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Actor / IP</TableHead>
                  <TableHead className="text-right">Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                      No audit events recorded for current filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {log.resource}
                        {log.resource_id && (
                          <span className="block text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                            {log.resource_id}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        <div>User: {log.user_id ? log.user_id.substring(0, 8) + "..." : "System"}</div>
                        {log.ip_address && <div className="text-[10px]">IP: {log.ip_address}</div>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectedLog(log)}
                          className="h-7 text-xs"
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Inspect Payload Modal */}
          <Dialog open={!!inspectedLog} onOpenChange={(open) => !open && setInspectedLog(null)}>
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">Audit Event Payload</DialogTitle>
              <DialogDescription className="text-xs">
                Action: <span className="font-mono text-foreground">{inspectedLog?.action}</span> | Timestamp: {inspectedLog?.created_at}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="rounded-md bg-muted/60 p-3 font-mono text-xs overflow-x-auto max-h-72 border">
                <pre>{JSON.stringify(inspectedLog?.details, null, 2)}</pre>
              </div>
              <p className="text-[10px] text-muted-foreground">
                All credentials, passwords, session tokens, and secrets are automatically redacted before insertion.
              </p>
            </div>
          </Dialog>
        </Card>
      )}
    </div>
  );
}
