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
