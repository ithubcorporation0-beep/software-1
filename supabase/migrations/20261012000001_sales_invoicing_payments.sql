-- ============================================================================
-- IT-HUB ERP Master PostgreSQL / Supabase Migration
-- Migration: 20261012000001_sales_invoicing_payments.sql
-- Modules: Sales Quotations, Sales Orders, Invoices, Payments & Sequences
-- ============================================================================

-- 1. Document Sequences (Concurrency-safe atomic numbering per tenant)
CREATE TABLE IF NOT EXISTS public.document_sequences (
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('quotation', 'sales_order', 'invoice', 'payment')),
    prefix TEXT NOT NULL,
    current_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (company_id, document_type)
);

-- 2. Quotations Table
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    quotation_number TEXT NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Declined', 'Converted', 'Expired')),
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    notes TEXT,
    terms TEXT,
    converted_to_type TEXT CHECK (converted_to_type IN ('sales_order', 'invoice')),
    converted_to_id UUID,
    converted_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_quotation_number_company UNIQUE (company_id, quotation_number)
);

-- Quotation Line Items
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id TEXT,
    description TEXT NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL DEFAULT 1.0000 CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_pct >= 0 AND tax_pct <= 100),
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Sales Orders Table
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed', 'In Production', 'Shipped', 'Delivered', 'Invoiced', 'Cancelled')),
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    notes TEXT,
    terms TEXT,
    invoice_id UUID,
    invoiced_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sales_order_number_company UNIQUE (company_id, order_number)
);

-- Sales Order Line Items
CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id TEXT,
    description TEXT NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL DEFAULT 1.0000 CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_pct >= 0 AND tax_pct <= 100),
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled')),
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    amount_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (amount_due >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    notes TEXT,
    terms TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_invoice_number_company UNIQUE (company_id, invoice_number)
);

-- Invoice Line Items (Historical immutable snapshot of prices and rates)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id TEXT,
    description TEXT NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL DEFAULT 1.0000 CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_pct >= 0 AND tax_pct <= 100),
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Payments Table (Permanent immutable financial ledger)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    payment_number TEXT NOT NULL,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Card', 'Online Payment', 'Other')),
    transaction_reference TEXT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Voided')),
    notes TEXT,
    void_reason TEXT,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_number_company UNIQUE (company_id, payment_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotations_company_status ON public.quotations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON public.quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON public.quotation_items(quotation_id);

CREATE INDEX IF NOT EXISTS idx_sales_orders_company_status ON public.sales_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON public.sales_order_items(sales_order_id);

CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON public.invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

-- Row Level Security (RLS)
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Multi-Tenant RLS Policies
CREATE POLICY "Tenant isolation for document_sequences" ON public.document_sequences
    FOR ALL USING (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin())
    WITH CHECK (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin());

CREATE POLICY "Tenant isolation for quotations" ON public.quotations
    FOR ALL USING (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin())
    WITH CHECK (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin());

CREATE POLICY "Tenant isolation for quotation_items" ON public.quotation_items
    FOR ALL USING (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin())
    WITH CHECK (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin());

CREATE POLICY "Tenant isolation for sales_orders" ON public.sales_orders
    FOR ALL USING (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin())
    WITH CHECK (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin());

CREATE POLICY "Tenant isolation for sales_order_items" ON public.sales_order_items
    FOR ALL USING (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin())
    WITH CHECK (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin());

CREATE POLICY "Tenant isolation for invoices" ON public.invoices
    FOR ALL USING (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin())
    WITH CHECK (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin());

CREATE POLICY "Tenant isolation for invoice_items" ON public.invoice_items
    FOR ALL USING (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin())
    WITH CHECK (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin());

CREATE POLICY "Tenant isolation for payments" ON public.payments
    FOR ALL USING (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin())
    WITH CHECK (company_id IN (SELECT public.user_company_ids()) OR public.is_super_admin());
