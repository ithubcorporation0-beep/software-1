-- ============================================================================
-- IT-HUB ERP Master PostgreSQL / Supabase Migration
-- Migration: 20261015000000_composite_trgm_performance_indexes.sql
-- Description: Composite covering indexes starting with company_id matching
--              production WHERE and ORDER BY clauses, plus GIN trigram indexes
--              for accelerated sub-millisecond ILIKE substring searches.
-- ============================================================================

-- Ensure the pg_trgm extension is available for fast substring and text searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. CRM & CUSTOMERS COMPOSITE & TRIGRAM INDEXES
-- Multi-column composite index matching: WHERE company_id = $1 AND status = $2 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_customers_company_status_created
ON public.customers (company_id, status, created_at DESC);

-- GIN Trigram indexes for fast ILIKE searches on customer name and company name
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
ON public.customers USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_company_name_trgm
ON public.customers USING gin (company_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_email_trgm
ON public.customers USING gin (email gin_trgm_ops);

-- 2. SALES & INVOICING COMPOSITE & TRIGRAM INDEXES
-- GIN Trigram index for invoice number prefix and substring searches (e.g. %INV-2026%)
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number_trgm
ON public.invoices USING gin (invoice_number gin_trgm_ops);

-- Composite index matching status filter and due date for aging & collection schedules
CREATE INDEX IF NOT EXISTS idx_invoices_company_status_due_date
ON public.invoices (company_id, status, due_date ASC);

-- 3. EXPENSES & GENERAL LEDGER COMPOSITE & TRIGRAM INDEXES
-- Multi-column composite index matching: WHERE company_id = $1 AND category = $2 AND approval_status = $3 ORDER BY date DESC
CREATE INDEX IF NOT EXISTS idx_expenses_company_cat_status_date
ON public.expenses (company_id, category, approval_status, date DESC);

-- Composite index for fast temporal filtering on date range reports
CREATE INDEX IF NOT EXISTS idx_expenses_company_date_desc
ON public.expenses (company_id, date DESC);

-- GIN Trigram indexes for vendor and description substring searches
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_trgm
ON public.expenses USING gin (vendor gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_expenses_description_trgm
ON public.expenses USING gin (description gin_trgm_ops);

-- 4. DOUBLE-ENTRY JOURNAL ENTRIES & LINES COMPOSITE INDEXES
-- Multi-column composite index matching: WHERE company_id = $1 AND status = 'Posted' ORDER BY entry_date DESC
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_status_date
ON public.journal_entries (company_id, status, entry_date DESC);

-- Covering index on child journal lines by parent transaction and company tenant
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_je_comp
ON public.journal_entry_lines (journal_entry_id, company_id);

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_comp
ON public.journal_entry_lines (account_id, company_id);

-- 5. INVENTORY & WAREHOUSING COMPOSITE & TRIGRAM INDEXES
CREATE INDEX IF NOT EXISTS idx_products_company_status_name
ON public.products (company_id, status, name ASC);

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
ON public.products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
ON public.products USING gin (sku gin_trgm_ops);

-- 6. HUMAN RESOURCES & PAYROLL COMPOSITE & TRIGRAM INDEXES
CREATE INDEX IF NOT EXISTS idx_employees_company_status_name
ON public.employees (company_id, status, last_name, first_name);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_company_status_period
ON public.payroll_runs (company_id, status, period_start DESC);

-- 7. PROJECT DELIVERY & TASK EXECUTION COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS idx_project_tasks_company_proj_status_due
ON public.project_tasks (company_id, project_id, status, due_date ASC);

-- 8. RBAC TENANT ROLES & PERMISSION MAPPINGS COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS idx_roles_company_code
ON public.roles (company_id, code);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_perm
ON public.role_permissions (role_id, permission_id);
