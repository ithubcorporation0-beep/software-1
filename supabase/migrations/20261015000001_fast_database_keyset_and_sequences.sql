-- ============================================================================
-- IT-HUB ERP Master PostgreSQL / Supabase Migration
-- Migration: 20261015000001_fast_database_keyset_and_sequences.sql
-- Description: Covering indexes, partial indexes for pending/outstanding states,
--              keyset cursor indexes, atomic concurrency-safe document sequences,
--              and telemetry summary materialized store.
-- ============================================================================

-- 1. CONCURRENCY-SAFE ATOMIC DOCUMENT SEQUENCES TABLE & RPC
-- Eliminates table-level serialization locks; uses row-level atomic lock-and-increment.
CREATE TABLE IF NOT EXISTS public.company_document_sequences (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  prefix TEXT NOT NULL,
  current_number BIGINT NOT NULL DEFAULT 1000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (company_id, doc_type, prefix)
);

CREATE OR REPLACE FUNCTION public.get_next_document_sequence(
  p_company_id UUID,
  p_doc_type TEXT,
  p_prefix TEXT,
  p_start INT DEFAULT 1001
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_val BIGINT;
  v_formatted TEXT;
BEGIN
  -- Row-level atomic upsert and increment (sub-millisecond lock duration)
  INSERT INTO public.company_document_sequences (company_id, doc_type, prefix, current_number, updated_at)
  VALUES (p_company_id, p_doc_type, p_prefix, p_start, timezone('utc'::text, now()))
  ON CONFLICT (company_id, doc_type, prefix)
  DO UPDATE SET
    current_number = public.company_document_sequences.current_number + 1,
    updated_at = timezone('utc'::text, now())
  RETURNING current_number INTO v_next_val;

  v_formatted := p_prefix || lpad(v_next_val::text, 5, '0');
  RETURN v_formatted;
END;
$$;

-- 2. PARTIAL INDEXES (Eliminates scanning 90%+ settled/historical data)

-- A. Outstanding Receivables: Only index unpaid / active invoices
CREATE INDEX IF NOT EXISTS idx_invoices_outstanding_partial
ON public.invoices (company_id, due_date ASC, grand_total, amount_due)
WHERE status NOT IN ('Paid', 'Cancelled');

-- B. Pending Expense Approvals: Only index submitted expenses needing attention
CREATE INDEX IF NOT EXISTS idx_expenses_pending_approval_partial
ON public.expenses (company_id, created_at DESC)
WHERE approval_status = 'Submitted';

-- C. Low Stock Thresholds: Only index products that require restocking
CREATE INDEX IF NOT EXISTS idx_products_low_stock_partial
ON public.products (company_id, current_stock, minimum_stock)
WHERE current_stock <= minimum_stock;

-- 3. KEYSET / CURSOR PAGINATION COVERING INDEXES
-- Multi-column indexes supporting WHERE company_id = $1 AND created_at < $cursor ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_invoices_keyset_created
ON public.invoices (company_id, created_at DESC)
INCLUDE (id, invoice_number, status, grand_total, amount_due);

CREATE INDEX IF NOT EXISTS idx_expenses_keyset_created
ON public.expenses (company_id, created_at DESC)
INCLUDE (id, expense_number, category, amount, approval_status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_keyset_created
ON public.audit_logs (company_id, created_at DESC)
INCLUDE (id, action, resource, user_id);

CREATE INDEX IF NOT EXISTS idx_customers_keyset_created
ON public.customers (company_id, created_at DESC)
INCLUDE (id, name, email, status);

-- 4. PRE-CALCULATED COMPANY TELEMETRY SUMMARIES TABLE
CREATE TABLE IF NOT EXISTS public.company_telemetry_summaries (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  revenue_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  expenses_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  outstanding_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  paid_invoices_total INT NOT NULL DEFAULT 0,
  active_customers_count INT NOT NULL DEFAULT 0,
  stock_value_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  member_count INT NOT NULL DEFAULT 1,
  active_projects_count INT NOT NULL DEFAULT 0,
  pending_tasks_count INT NOT NULL DEFAULT 0,
  low_stock_count INT NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.company_telemetry_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their company telemetry summaries"
ON public.company_telemetry_summaries
FOR SELECT
USING (company_id IN (
  SELECT m.company_id FROM public.memberships m WHERE m.user_id = auth.uid() AND m.status = 'ACTIVE'
));
