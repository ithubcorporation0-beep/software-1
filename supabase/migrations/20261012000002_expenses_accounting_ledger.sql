-- ============================================================================
-- IT-HUB ERP Master PostgreSQL / Supabase Migration
-- Migration: 20261012000002_expenses_accounting_ledger.sql
-- Modules: Chart of Accounts, Expenses, Double-Entry Journal Entries, Ledger
-- ============================================================================

-- 1. Chart of Accounts Table
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_account_code_company UNIQUE (company_id, code)
);

-- 2. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    expense_number TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Rent', 'Utilities', 'Salaries', 'Marketing', 'Transportation', 
        'Office Supplies', 'Software', 'Equipment', 'Other'
    )),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Credit Card', 'Check', 'Other')),
    description TEXT NOT NULL,
    receipt_url TEXT,
    receipt_name TEXT,
    receipt_size INTEGER,
    receipt_mime TEXT,
    employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    employee_name TEXT,
    employee_email TEXT,
    approval_status TEXT NOT NULL DEFAULT 'Draft' CHECK (approval_status IN ('Draft', 'Submitted', 'Approved', 'Rejected')),
    rejection_reason TEXT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    journal_entry_id UUID,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_expense_number_company UNIQUE (company_id, expense_number)
);

-- 3. Journal Entries Table (Double-Entry Header)
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    entry_number TEXT NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Posted', 'Reversed')),
    source_type TEXT CHECK (source_type IN ('manual', 'invoice', 'payment', 'expense', 'reversal')),
    source_id UUID,
    reversal_of_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    total_debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_journal_entry_number_company UNIQUE (company_id, entry_number)
);

-- 4. Journal Entry Lines Table (Double-Entry Line Items)
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
    description TEXT,
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (debit >= 0),
    credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (credit >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_debit_or_credit CHECK (debit > 0 OR credit > 0)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_coa_company_code ON public.chart_of_accounts(company_id, code);
CREATE INDEX IF NOT EXISTS idx_coa_type ON public.chart_of_accounts(company_id, account_type);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(company_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(company_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(company_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_employee ON public.expenses(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_je_company_date ON public.journal_entries(company_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_je_status ON public.journal_entries(company_id, status);
CREATE INDEX IF NOT EXISTS idx_je_source ON public.journal_entries(company_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_jel_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON public.journal_entry_lines(account_id);

-- Row Level Security (RLS) Setup
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- Multi-Tenant Security Policies
CREATE POLICY "Tenant isolation for chart_of_accounts" ON public.chart_of_accounts
    FOR ALL USING (
        company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid)
        OR ((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean = true)
    );

CREATE POLICY "Tenant isolation for expenses" ON public.expenses
    FOR ALL USING (
        company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid)
        OR ((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean = true)
    );

CREATE POLICY "Tenant isolation for journal_entries" ON public.journal_entries
    FOR ALL USING (
        company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid)
        OR ((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean = true)
    );

CREATE POLICY "Tenant isolation for journal_entry_lines" ON public.journal_entry_lines
    FOR ALL USING (
        company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid)
        OR ((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean = true)
    );
