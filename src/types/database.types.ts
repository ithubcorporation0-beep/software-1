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

