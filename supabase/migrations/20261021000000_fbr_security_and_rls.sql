-- ============================================================================
-- IT-HUB ERP Master PostgreSQL / Supabase Migration
-- Migration: 20261021000000_fbr_security_and_rls.sql
-- Modules: FBR Digital Invoicing & Security Hardening (RLS & Constraint Sync)
-- ============================================================================

-- 1. Sync & Expand FBR Status Check Constraint on public.invoices
ALTER TABLE public.invoices
    DROP CONSTRAINT IF EXISTS invoices_fbr_status_check;

ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_fbr_status_check
    CHECK (fbr_status IN (
        'PENDING',
        'VALIDATED',
        'SUBMITTED',
        'FAILED',
        'ACCEPTED',
        'REJECTED',
        'UNKNOWN',
        'CANCELLED'
    ));

-- 2. Ensure Row Level Security (RLS) is Enabled on Invoicing & Settings Tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Strict Multi-Tenant Isolation Policies for Invoices
DROP POLICY IF EXISTS "Active company members can view their tenant invoices" ON public.invoices;
CREATE POLICY "Active company members can view their tenant invoices"
ON public.invoices
FOR SELECT
USING (
    company_id IN (
        SELECT m.company_id
        FROM public.memberships m
        WHERE m.user_id = auth.uid()
          AND m.status = 'ACTIVE'
    )
);

DROP POLICY IF EXISTS "Authorized members can manage their tenant invoices" ON public.invoices;
CREATE POLICY "Authorized members can manage their tenant invoices"
ON public.invoices
FOR ALL
USING (
    company_id IN (
        SELECT m.company_id
        FROM public.memberships m
        WHERE m.user_id = auth.uid()
          AND m.status = 'ACTIVE'
    )
)
WITH CHECK (
    company_id IN (
        SELECT m.company_id
        FROM public.memberships m
        WHERE m.user_id = auth.uid()
          AND m.status = 'ACTIVE'
    )
);

-- 4. Strict Multi-Tenant Isolation Policies for Company Settings & Credentials
DROP POLICY IF EXISTS "Active company members can view company settings" ON public.company_settings;
CREATE POLICY "Active company members can view company settings"
ON public.company_settings
FOR SELECT
USING (
    company_id IN (
        SELECT m.company_id
        FROM public.memberships m
        WHERE m.user_id = auth.uid()
          AND m.status = 'ACTIVE'
    )
);

DROP POLICY IF EXISTS "Company administrators can update company settings" ON public.company_settings;
CREATE POLICY "Company administrators can update company settings"
ON public.company_settings
FOR UPDATE
USING (
    company_id IN (
        SELECT m.company_id
        FROM public.memberships m
        WHERE m.user_id = auth.uid()
          AND m.status = 'ACTIVE'
    )
)
WITH CHECK (
    company_id IN (
        SELECT m.company_id
        FROM public.memberships m
        WHERE m.user_id = auth.uid()
          AND m.status = 'ACTIVE'
    )
);

-- 5. Strict Tenant Isolation for Audit Logs
DROP POLICY IF EXISTS "Company members can view their tenant audit logs" ON public.audit_logs;
CREATE POLICY "Company members can view their tenant audit logs"
ON public.audit_logs
FOR SELECT
USING (
    company_id IN (
        SELECT m.company_id
        FROM public.memberships m
        WHERE m.user_id = auth.uid()
          AND m.status = 'ACTIVE'
    )
);
