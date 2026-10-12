-- Migration: 20261012000004_payroll_runs_items_controls.sql
-- Description: Schema for Payroll Runs, Itemized Pay Slips, Statutory Settings, and Controls

-- 1. Payroll Settings (per tenant)
CREATE TABLE IF NOT EXISTS payroll_settings (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    currency TEXT NOT NULL DEFAULT 'USD',
    tax_calculation_mode TEXT NOT NULL DEFAULT 'Manual', -- 'Manual', 'Percentage', 'StatutoryBrackets'
    statutory_rules_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    statutory_rules_confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    statutory_rules_confirmed_at TIMESTAMPTZ,
    default_overtime_hourly_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    overtime_rate_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    standard_working_days_per_month INTEGER NOT NULL DEFAULT 22,
    round_to_nearest TEXT NOT NULL DEFAULT 'cent', -- 'cent', 'dollar', 'none'
    auto_post_to_accounting BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    run_number TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    pay_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Approved', 'Finalized', 'Reversed'
    total_basic NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_allowances NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_overtime NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_advance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_net NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    employee_count INTEGER NOT NULL DEFAULT 0,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    finalized_at TIMESTAMPTZ,
    reversal_reason TEXT,
    reversed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reversed_at TIMESTAMPTZ,
    journal_entry_id TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_payroll_run_number UNIQUE (company_id, run_number),
    CONSTRAINT chk_payroll_period_order CHECK (period_end >= period_start)
);

-- 3. Payroll Items (Itemized pay records per employee)
CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    employee_code TEXT NOT NULL,
    department_name TEXT,
    designation TEXT,
    basic_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    allowances NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    bonus NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    overtime NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    advance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'Draft',
    bank_name TEXT,
    bank_account_title TEXT,
    bank_account_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_run_employee UNIQUE (payroll_run_id, employee_id),
    CONSTRAINT chk_net_non_negative CHECK (net_salary >= 0)
);

-- Indexes for performance & lookups
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(company_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee ON payroll_items(company_id, employee_id);

-- Row Level Security (RLS)
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_settings_tenant_isolation" ON payroll_settings
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "payroll_runs_tenant_isolation" ON payroll_runs
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "payroll_items_tenant_isolation" ON payroll_items
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );
