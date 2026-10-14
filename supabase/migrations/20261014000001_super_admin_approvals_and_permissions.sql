-- ============================================================================
-- IT-HUB ERP Master PostgreSQL / Supabase Migration
-- Migration: 20261014000001_super_admin_approvals_and_permissions.sql
-- Modules: Super Admin Oversight, Company Approvals & Granular Permissions
-- ============================================================================

-- 1. COMPANY REGISTRATION & APPROVAL SCHEMA EXTENSION
-- Add approval metadata columns to companies
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS contact_email TEXT,
    ADD COLUMN IF NOT EXISTS contact_name TEXT,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update status check constraint to include 'REJECTED'
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE public.companies
    ADD CONSTRAINT companies_status_check
    CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'));

-- Performance index for Super Admin platform approvals and status filtering
CREATE INDEX IF NOT EXISTS idx_companies_status_created_desc
ON public.companies(status, created_at DESC);

-- 2. HARDEN RLS: UNAPPROVED / SUSPENDED COMPANIES CANNOT ACCESS ERP RESOURCES
-- Update user_company_ids() to enforce that the company itself MUST be 'ACTIVE'
CREATE OR REPLACE FUNCTION public.user_company_ids()
RETURNS TABLE(company_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT m.company_id
    FROM public.memberships m
    JOIN public.companies c ON c.id = m.company_id
    WHERE m.user_id = auth.uid()
      AND m.status = 'ACTIVE'
      AND c.status = 'ACTIVE';
$$;

-- 3. INSERT GRANULAR PERMISSIONS CATALOG
INSERT INTO public.permissions (code, resource, action, description) VALUES
    -- Customers / CRM
    ('customers.view', 'customers', 'view', 'View customer directory and accounts'),
    ('customers.create', 'customers', 'create', 'Create new customer accounts'),
    ('customers.edit', 'customers', 'edit', 'Modify customer contact details and terms'),
    ('customers.delete', 'customers', 'delete', 'Archive or delete customer accounts'),

    -- Invoices & Billing
    ('invoices.view', 'invoices', 'view', 'View commercial invoices and statements'),
    ('invoices.create', 'invoices', 'create', 'Create and send new sales invoices'),
    ('invoices.edit', 'invoices', 'edit', 'Modify draft invoice line items and terms'),
    ('invoices.delete', 'invoices', 'delete', 'Cancel or delete draft invoices'),
    ('invoices.export', 'invoices', 'export', 'Export invoice schedules and PDFs'),

    -- Expenses & Disbursements
    ('expenses.view', 'expenses', 'view', 'View operating expenses and receipts'),
    ('expenses.create', 'expenses', 'create', 'Submit new expense claims and receipts'),
    ('expenses.approve', 'expenses', 'approve', 'Approve or reject operating expense claims'),

    -- Employees & Personnel
    ('employees.view', 'employees', 'view', 'View employee directory and organizational chart'),
    ('employees.create', 'employees', 'create', 'Onboard new personnel and employee profiles'),
    ('employees.edit', 'employees', 'edit', 'Update employee job details, titles, and departments'),

    -- Attendance & Shifts
    ('attendance.view', 'attendance', 'view', 'View personnel clock-in logs and attendance sheets'),
    ('attendance.manage', 'attendance', 'manage', 'Adjust attendance time cards and shift allocations'),

    -- Payroll
    ('payroll.view', 'payroll', 'view', 'View compensation summaries and payslips'),
    ('payroll.process', 'payroll', 'process', 'Execute monthly pay runs and salary disbursements'),

    -- Inventory & Warehousing
    ('inventory.view', 'inventory', 'view', 'View product catalog, SKU levels, and warehouse stock'),
    ('inventory.manage', 'inventory', 'manage', 'Create products, adjust stock levels, and transfer bins'),

    -- Reports & Analytics
    ('reports.view', 'reports', 'view', 'Inspect financial, operational, and executive reports'),
    ('reports.export', 'reports', 'export', 'Export confidential business intelligence and reports'),

    -- Users & Memberships
    ('users.view', 'users', 'view', 'View company member roster'),
    ('users.manage', 'users', 'manage', 'Invite users, change roles, and deactivate memberships'),

    -- Settings & Organization Governance
    ('settings.manage', 'settings', 'manage', 'Manage company profile, numbering sequences, and policies')
ON CONFLICT (code) DO NOTHING;

-- 4. MAP NEW PERMISSIONS TO SYSTEM ROLES
-- Super Admin gets ALL permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- Admin role gets all company permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM public.permissions
ON CONFLICT DO NOTHING;
