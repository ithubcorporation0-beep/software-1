-- ============================================================================
-- IT-HUB ERP Master PostgreSQL / Supabase Migration
-- Migration: 20261012000003_hr_employees_attendance_leave.sql
-- Modules: HR Employees, Departments, Attendance Tracking, Leave Management
-- ============================================================================

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_department_code_company UNIQUE (company_id, code)
);

-- 2. HR Employees Table
CREATE TABLE IF NOT EXISTS public.hr_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    employee_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    cnic TEXT, -- SENSITIVE: Encrypted/masked on broad list
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    department_name TEXT,
    position TEXT NOT NULL,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    salary NUMERIC(15, 2) DEFAULT 0.00, -- SENSITIVE
    bank_name TEXT, -- SENSITIVE
    bank_account_title TEXT, -- SENSITIVE
    bank_account_number TEXT, -- SENSITIVE
    emergency_contact_name TEXT,
    emergency_contact_relation TEXT,
    emergency_contact_phone TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    employment_status TEXT NOT NULL DEFAULT 'Active' CHECK (employment_status IN (
        'Active', 'On Leave', 'Probation', 'Terminated', 'Suspended'
    )),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_hr_employee_id_company UNIQUE (company_id, employee_id)
);

-- 3. HR Attendance Table
CREATE TABLE IF NOT EXISTS public.hr_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    total_hours NUMERIC(5, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Present' CHECK (status IN (
        'Present', 'Late', 'Half Day', 'Early Departure', 'Absent', 'On Leave', 'Holiday'
    )),
    is_manual_correction BOOLEAN NOT NULL DEFAULT false,
    correction_reason TEXT,
    corrected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_employee_date_attendance UNIQUE (company_id, employee_id, date)
);

-- 4. HR Leave Requests Table
CREATE TABLE IF NOT EXISTS public.hr_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK (leave_type IN (
        'Annual', 'Casual', 'Sick', 'Maternity/Paternity', 'Unpaid', 'Other'
    )),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4, 1) NOT NULL CHECK (total_days > 0),
    reason TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_size INTEGER,
    attachment_mime TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN (
        'Pending', 'Approved', 'Rejected', 'Cancelled'
    )),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_leave_dates CHECK (start_date <= end_date)
);

-- 5. HR Workday Settings (Tenant-level)
CREATE TABLE IF NOT EXISTS public.hr_workday_settings (
    company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    workday_start TIME NOT NULL DEFAULT '09:00:00',
    workday_end TIME NOT NULL DEFAULT '18:00:00',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    grace_period_minutes INTEGER NOT NULL DEFAULT 15,
    half_day_hours NUMERIC(4, 2) NOT NULL DEFAULT 4.00,
    allow_overnight_shifts BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_departments_company ON public.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_company ON public.hr_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_dept ON public.hr_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_user ON public.hr_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_status ON public.hr_employees(company_id, employment_status);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_company_date ON public.hr_attendance(company_id, date);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_employee ON public.hr_attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_company_status ON public.hr_leaves(company_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_employee ON public.hr_leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_dates ON public.hr_leaves(start_date, end_date);

-- Row Level Security (RLS) Setup
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_workday_settings ENABLE ROW LEVEL SECURITY;

-- Multi-Tenant Security Policies
CREATE POLICY "Tenant isolation for departments" ON public.departments
    FOR ALL USING (
        company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid)
        OR ((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean = true)
    );

CREATE POLICY "Tenant isolation for hr_employees" ON public.hr_employees
    FOR ALL USING (
        company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid)
        OR ((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean = true)
    );

CREATE POLICY "Tenant isolation for hr_attendance" ON public.hr_attendance
    FOR ALL USING (
        company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid)
        OR ((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean = true)
    );

CREATE POLICY "Tenant isolation for hr_leaves" ON public.hr_leaves
    FOR ALL USING (
        company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid)
        OR ((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean = true)
    );

CREATE POLICY "Tenant isolation for hr_workday_settings" ON public.hr_workday_settings
    FOR ALL USING (
        company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid)
        OR ((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean = true)
    );
