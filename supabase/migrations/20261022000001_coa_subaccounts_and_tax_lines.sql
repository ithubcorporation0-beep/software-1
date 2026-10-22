-- ============================================================================
-- IT-HUB ERP PostgreSQL Migration
-- Migration: 20261022000001_coa_subaccounts_and_tax_lines.sql
-- Modules: Chart of Accounts Sub-accounts, Detail Subtypes, and Tax Lines
-- ============================================================================

ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sub_type TEXT,
  ADD COLUMN IF NOT EXISTS tax_line TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PKR',
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(15, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS opening_balance_date DATE;

CREATE INDEX IF NOT EXISTS idx_coa_parent_id ON public.chart_of_accounts(parent_id);
