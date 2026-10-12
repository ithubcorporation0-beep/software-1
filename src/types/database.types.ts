export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SystemRoleCode =
  | "super_admin"
  | "admin"
  | "manager"
  | "accountant"
  | "hr_manager"
  | "employee"
  | "customer";

export interface Company {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  plan: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  company_id?: string | null;
  name: string;
  code: string;
  description?: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
  description?: string | null;
  created_at: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface Membership {
  id: string;
  company_id: string;
  user_id: string;
  role_id: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface CompanySettings {
  company_id: string;
  currency: string;
  timezone: string;
  fiscal_year_start: string;
  theme: string;
  features: Json;
  updated_at: string;
  updated_by?: string | null;
}

export interface AuditLog {
  id: string;
  company_id?: string | null;
  user_id?: string | null;
  action: string;
  resource: string;
  resource_id?: string | null;
  details: Json;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export type CustomerType = "B2B" | "B2C" | "Enterprise" | "SMB" | "Government" | "Wholesale";
export type CustomerStatus = "Active" | "Inactive" | "Lead" | "Archived";

export interface CustomerDocument {
  id: string;
  name: string;
  url: string;
  size?: string;
  uploaded_at: string;
  uploaded_by?: string | null;
}

export interface Customer {
  id: string;
  company_id: string;
  customer_code: string;
  name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  country: string;
  tax_number?: string | null;
  customer_type: CustomerType;
  status: CustomerStatus;
  notes?: string | null;
  documents: CustomerDocument[];
  total_spend: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerNote {
  id: string;
  company_id: string;
  customer_id: string;
  author_id?: string | null;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerActivity {
  id: string;
  company_id: string;
  customer_id: string;
  user_id?: string | null;
  type: string;
  title: string;
  description?: string | null;
  metadata: Json;
  created_at: string;
}

export type LeadSource =
  | "Website"
  | "Referral"
  | "Inbound Call"
  | "Conference / Event"
  | "LinkedIn / Social"
  | "Cold Outreach"
  | "Partner"
  | "Other";

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

export interface Lead {
  id: string;
  company_id: string;
  lead_code: string;
  name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  source: LeadSource;
  assigned_to?: string | null;
  status: LeadStatus;
  expected_value: number;
  notes?: string | null;
  follow_up_date?: string | null;
  customer_id?: string | null;
  lost_reason?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SALES: QUOTATIONS, ORDERS, INVOICES, PAYMENTS
// ============================================================================

export type QuotationStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Declined"
  | "Converted"
  | "Expired";

export type SalesOrderStatus =
  | "Draft"
  | "Confirmed"
  | "In Production"
  | "Shipped"
  | "Delivered"
  | "Invoiced"
  | "Cancelled";

export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export type PaymentMethod =
  | "Cash"
  | "Bank Transfer"
  | "Card"
  | "Online Payment"
  | "Other";

export type PaymentStatus = "Completed" | "Voided";

export interface QuotationItem {
  id: string;
  quotation_id: string;
  company_id: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  discount_amount: number;
  tax_pct: number;
  tax_amount: number;
  line_total: number;
  sort_order: number;
  created_at: string;
}

export interface Quotation {
  id: string;
  company_id: string;
  quotation_number: string;
  customer_id: string;
  customer?: Customer;
  lead_id?: string | null;
  issue_date: string;
  expiry_date: string;
  status: QuotationStatus;
  subtotal: number;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_total: number;
  tax_rate: number;
  tax_total: number;
  grand_total: number;
  currency: string;
  notes?: string | null;
  terms?: string | null;
  converted_to_type?: "sales_order" | "invoice" | null;
  converted_to_id?: string | null;
  converted_at?: string | null;
  items?: QuotationItem[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  company_id: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  discount_amount: number;
  tax_pct: number;
  tax_amount: number;
  line_total: number;
  sort_order: number;
  created_at: string;
}

export interface SalesOrder {
  id: string;
  company_id: string;
  order_number: string;
  quotation_id?: string | null;
  customer_id: string;
  customer?: Customer;
  order_date: string;
  expected_delivery_date?: string | null;
  status: SalesOrderStatus;
  subtotal: number;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_total: number;
  tax_rate: number;
  tax_total: number;
  grand_total: number;
  currency: string;
  notes?: string | null;
  terms?: string | null;
  invoice_id?: string | null;
  invoiced_at?: string | null;
  items?: SalesOrderItem[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  company_id: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  discount_amount: number;
  tax_pct: number;
  tax_amount: number;
  line_total: number;
  sort_order: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  customer_id: string;
  customer?: Customer;
  sales_order_id?: string | null;
  quotation_id?: string | null;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_total: number;
  tax_rate: number;
  tax_total: number;
  grand_total: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  notes?: string | null;
  terms?: string | null;
  items?: InvoiceItem[];
  payments?: Payment[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  company_id: string;
  payment_number: string;
  invoice_id: string;
  invoice?: Invoice;
  customer_id: string;
  customer?: Customer;
  amount: number;
  payment_method: PaymentMethod;
  transaction_reference?: string | null;
  payment_date: string;
  status: PaymentStatus;
  notes?: string | null;
  void_reason?: string | null;
  voided_at?: string | null;
  voided_by?: string | null;
  created_by?: string | null;
  created_at: string;
}

// ============================================================================
// EXPENSES & ACCOUNTING LEDGER TYPES
// ============================================================================

export type ExpenseCategory =
  | "Rent"
  | "Utilities"
  | "Salaries"
  | "Marketing"
  | "Transportation"
  | "Office Supplies"
  | "Software"
  | "Equipment"
  | "Other";

export type ExpensePaymentMethod =
  | "Cash"
  | "Bank Transfer"
  | "Credit Card"
  | "Check"
  | "Other";

export type ExpenseApprovalStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Rejected";

export interface ExpenseReceipt {
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface Expense {
  id: string;
  company_id: string;
  expense_number: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  date: string;
  vendor: string;
  payment_method: ExpensePaymentMethod;
  description: string;
  receipt_url?: string | null;
  receipt_name?: string | null;
  receipt_size?: number | null;
  receipt_mime?: string | null;
  employee_id?: string | null;
  employee_name?: string | null;
  employee_email?: string | null;
  approval_status: ExpenseApprovalStatus;
  rejection_reason?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  journal_entry_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type AccountType =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Revenue"
  | "Expense";

export interface Account {
  id: string;
  company_id: string;
  code: string;
  name: string;
  account_type: AccountType;
  description?: string | null;
  is_system: boolean;
  is_active: boolean;
  balance?: number;
  created_at: string;
  updated_at: string;
}

export type JournalEntryStatus = "Draft" | "Posted" | "Reversed";
export type JournalEntrySourceType = "manual" | "invoice" | "payment" | "expense" | "reversal";

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  company_id: string;
  account_id: string;
  account?: Account;
  account_code?: string;
  account_name?: string;
  description?: string | null;
  debit: number;
  credit: number;
  sort_order: number;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference?: string | null;
  status: JournalEntryStatus;
  source_type?: JournalEntrySourceType | null;
  source_id?: string | null;
  reversal_of_id?: string | null;
  total_debit: number;
  total_credit: number;
  posted_at?: string | null;
  posted_by?: string | null;
  lines?: JournalEntryLine[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

// Financial Report Interfaces
export interface ProfitLossReport {
  period: { from: string; to: string };
  revenue: {
    items: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  expenses: {
    items: Array<{ category: string; amount: number; percentage: number }>;
    total: number;
  };
  netOperatingIncome: number;
  netProfitMarginPct: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: {
    current: Array<{ code: string; name: string; amount: number }>;
    nonCurrent: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  liabilities: {
    current: Array<{ code: string; name: string; amount: number }>;
    nonCurrent: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  equity: {
    items: Array<{ code: string; name: string; amount: number }>;
    currentPeriodEarnings: number;
    total: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  variance: number;
}

export interface CashFlowReport {
  period: { from: string; to: string };
  operatingInflows: Array<{ name: string; amount: number }>;
  totalInflows: number;
  operatingOutflows: Array<{ name: string; amount: number }>;
  totalOutflows: number;
  netOperatingCashFlow: number;
}

export interface ARAgingReport {
  asOfDate: string;
  totalAR: number;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
  customers: Array<{
    customerId: string;
    customerName: string;
    total: number;
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
  }>;
}

export interface APAgingReport {
  asOfDate: string;
  totalAP: number;
  vendors: Array<{
    vendor: string;
    total: number;
    expenseCount: number;
  }>;
}

// ============================================================================
// HR: EMPLOYEES, DEPARTMENTS, ATTENDANCE & LEAVES
// ============================================================================

export interface Department {
  id: string;
  company_id: string;
  name: string;
  code: string;
  description?: string | null;
  manager_id?: string | null;
  manager_name?: string | null;
  is_active: boolean;
  employee_count?: number;
  created_at: string;
  updated_at: string;
}

export type EmploymentStatus =
  | "Active"
  | "On Leave"
  | "Probation"
  | "Terminated"
  | "Suspended";

export interface HREmployeeDocument {
  id: string;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  uploadedAt: string;
}

export interface HREmployee {
  id: string;
  company_id: string;
  user_id?: string | null;
  employee_id: string;
  full_name: string;
  avatar_url?: string | null;
  email: string;
  phone?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  position: string;
  joining_date: string;
  employment_status: EmploymentStatus;
  emergency_contact_name?: string | null;
  emergency_contact_relation?: string | null;
  emergency_contact_phone?: string | null;
  documents: HREmployeeDocument[];
  // SENSITIVE FIELDS: Masked unless role includes hr.sensitive or user is self
  cnic?: string | null;
  salary?: number | null;
  bank_name?: string | null;
  bank_account_title?: string | null;
  bank_account_number?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus =
  | "Present"
  | "Late"
  | "Half Day"
  | "Early Departure"
  | "Absent"
  | "On Leave"
  | "Holiday";

export interface HRAttendance {
  id: string;
  company_id: string;
  employee_id: string;
  employee?: HREmployee;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  total_hours: number;
  status: AttendanceStatus;
  is_manual_correction: boolean;
  correction_reason?: string | null;
  corrected_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type LeaveType =
  | "Annual"
  | "Casual"
  | "Sick"
  | "Maternity/Paternity"
  | "Unpaid"
  | "Other";

export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export interface HRLeave {
  id: string;
  company_id: string;
  employee_id: string;
  employee?: HREmployee;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  attachment_mime?: string | null;
  status: LeaveStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HRWorkdaySettings {
  company_id: string;
  workday_start: string; // "09:00"
  workday_end: string;   // "18:00"
  timezone: string;      // "UTC"
  grace_period_minutes: number; // 15
  half_day_hours: number;       // 4.0
  allow_overnight_shifts: boolean;
  updated_at: string;
}

export interface HRAttendanceSummaryReport {
  date: string;
  totalEmployees: number;
  presentCount: number;
  lateCount: number;
  halfDayCount: number;
  earlyDepartureCount: number;
  absentCount: number;
  onLeaveCount: number;
  attendanceRatePct: number;
}



