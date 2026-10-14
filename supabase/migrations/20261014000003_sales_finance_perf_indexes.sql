-- ============================================================================
-- Migration: 20261014000003_sales_finance_perf_indexes.sql
-- Description: Targeted performance and composite covering indexes for
--              commercial sales, invoicing, payments, and ledger lookups.
-- ============================================================================

-- 1. Quotations performance index (filters by company_id, status, ordered by created_at DESC)
CREATE INDEX IF NOT EXISTS idx_quotations_company_status_created
ON quotations (company_id, status, created_at DESC);

-- 2. Sales Orders performance index (filters by company_id, status, ordered by created_at DESC)
CREATE INDEX IF NOT EXISTS idx_sales_orders_company_status_created
ON sales_orders (company_id, status, created_at DESC);

-- 3. Quotation Items foreign key join index
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id
ON quotation_items (quotation_id);

-- 4. Sales Order Items foreign key join index
CREATE INDEX IF NOT EXISTS idx_sales_order_items_sales_order_id
ON sales_order_items (sales_order_id);

-- 5. Payments covering index by invoice lookup
CREATE INDEX IF NOT EXISTS idx_payments_company_invoice
ON payments (company_id, invoice_id);

-- 6. Chart of Accounts uniqueness and lookup accelerator
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_code
ON chart_of_accounts (company_id, code);
