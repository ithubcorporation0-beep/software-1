-- ============================================================================
-- IT-HUB ERP Master Migration: CRM Customers, Leads, Notes & Activity Timeline
-- Migration: 20261012000000_crm_customers_leads.sql
-- ============================================================================

-- 1. CUSTOMERS DIRECTORY
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_code TEXT NOT NULL,
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'US',
    tax_number TEXT,
    customer_type TEXT NOT NULL DEFAULT 'B2B' CHECK (customer_type IN ('B2B', 'B2C', 'Enterprise', 'SMB', 'Government', 'Wholesale')),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Lead', 'Archived')),
    notes TEXT,
    documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_spend NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customers_company_code UNIQUE (company_id, customer_code)
);

CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- 2. CUSTOMER NOTES
CREATE TABLE IF NOT EXISTS public.customer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON public.customer_notes(customer_id);

-- 3. CUSTOMER ACTIVITY TIMELINE & HISTORY
CREATE TABLE IF NOT EXISTS public.customer_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_activities_customer ON public.customer_activities(customer_id);

-- 4. LEADS & OPPORTUNITY PIPELINE
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    lead_code TEXT NOT NULL,
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    source TEXT NOT NULL DEFAULT 'Website' CHECK (source IN ('Website', 'Referral', 'Inbound Call', 'Conference / Event', 'LinkedIn / Social', 'Cold Outreach', 'Partner', 'Other')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')),
    expected_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    follow_up_date DATE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    lost_reason TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_leads_company_code UNIQUE (company_id, lead_code)
);

CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Helper tenant membership check
CREATE OR REPLACE FUNCTION public.crm_is_company_member(cid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.memberships
        WHERE company_id = cid
          AND user_id = auth.uid()
          AND status = 'ACTIVE'
    ) OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND is_super_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Customers Policies
DROP POLICY IF EXISTS "CRM Customers tenant select" ON public.customers;
CREATE POLICY "CRM Customers tenant select" ON public.customers
    FOR SELECT USING (crm_is_company_member(company_id));

DROP POLICY IF EXISTS "CRM Customers tenant insert" ON public.customers;
CREATE POLICY "CRM Customers tenant insert" ON public.customers
    FOR INSERT WITH CHECK (crm_is_company_member(company_id));

DROP POLICY IF EXISTS "CRM Customers tenant update" ON public.customers;
CREATE POLICY "CRM Customers tenant update" ON public.customers
    FOR UPDATE USING (crm_is_company_member(company_id));

DROP POLICY IF EXISTS "CRM Customers tenant delete" ON public.customers;
CREATE POLICY "CRM Customers tenant delete" ON public.customers
    FOR DELETE USING (crm_is_company_member(company_id));

-- Customer Notes Policies
DROP POLICY IF EXISTS "CRM Notes tenant select" ON public.customer_notes;
CREATE POLICY "CRM Notes tenant select" ON public.customer_notes
    FOR SELECT USING (crm_is_company_member(company_id));

DROP POLICY IF EXISTS "CRM Notes tenant insert" ON public.customer_notes;
CREATE POLICY "CRM Notes tenant insert" ON public.customer_notes
    FOR INSERT WITH CHECK (crm_is_company_member(company_id));

DROP POLICY IF EXISTS "CRM Notes tenant update" ON public.customer_notes;
CREATE POLICY "CRM Notes tenant update" ON public.customer_notes
    FOR UPDATE USING (crm_is_company_member(company_id));

DROP POLICY IF EXISTS "CRM Notes tenant delete" ON public.customer_notes;
CREATE POLICY "CRM Notes tenant delete" ON public.customer_notes
    FOR DELETE USING (crm_is_company_member(company_id));

-- Customer Activities Policies
DROP POLICY IF EXISTS "CRM Activities tenant select" ON public.customer_activities;
CREATE POLICY "CRM Activities tenant select" ON public.customer_activities
    FOR SELECT USING (crm_is_company_member(company_id));

DROP POLICY IF EXISTS "CRM Activities tenant insert" ON public.customer_activities;
CREATE POLICY "CRM Activities tenant insert" ON public.customer_activities
    FOR INSERT WITH CHECK (crm_is_company_member(company_id));

-- Leads Policies
DROP POLICY IF EXISTS "CRM Leads tenant select" ON public.leads;
CREATE POLICY "CRM Leads tenant select" ON public.leads
    FOR SELECT USING (crm_is_company_member(company_id));

DROP POLICY IF EXISTS "CRM Leads tenant insert" ON public.leads;
CREATE POLICY "CRM Leads tenant insert" ON public.leads
    FOR INSERT WITH CHECK (crm_is_company_member(company_id));

DROP POLICY IF EXISTS "CRM Leads tenant update" ON public.leads;
CREATE POLICY "CRM Leads tenant update" ON public.leads
    FOR UPDATE USING (crm_is_company_member(company_id));

DROP POLICY IF EXISTS "CRM Leads tenant delete" ON public.leads;
CREATE POLICY "CRM Leads tenant delete" ON public.leads
    FOR DELETE USING (crm_is_company_member(company_id));
