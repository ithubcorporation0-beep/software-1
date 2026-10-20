-- ============================================================================
-- IT-HUB ERP Master PostgreSQL / Supabase Migration
-- Migration: 20261020000000_fbr_digital_invoicing.sql
-- Modules: FBR (Pakistan) Digital Invoicing Integration
-- ============================================================================

-- 1. Add FBR (Federal Board of Revenue) Electronic Invoicing Columns
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS fbr_irn TEXT,
    ADD COLUMN IF NOT EXISTS fbr_uuid TEXT,
    ADD COLUMN IF NOT EXISTS fbr_qr_code_data TEXT,
    ADD COLUMN IF NOT EXISTS fbr_digital_signature TEXT,
    ADD COLUMN IF NOT EXISTS fbr_status TEXT DEFAULT 'PENDING'
        CHECK (fbr_status IN ('PENDING', 'VALIDATED', 'SUBMITTED', 'FAILED'));

-- 2. Performance Index on fbr_irn for fast lookups & verification
CREATE INDEX IF NOT EXISTS idx_invoices_fbr_irn
    ON public.invoices(fbr_irn)
    WHERE fbr_irn IS NOT NULL;

-- 3. Composite Index on Tenant + FBR Status for multi-tenant compliance queries
CREATE INDEX IF NOT EXISTS idx_invoices_company_fbr_status
    ON public.invoices(company_id, fbr_status);

-- 4. Column Documentation Comments for Database Schema Introspection
COMMENT ON COLUMN public.invoices.fbr_irn IS 'FBR Invoice Reference Number issued by Pakistan digital tax system';
COMMENT ON COLUMN public.invoices.fbr_uuid IS 'FBR Unique Identifier generated for the digital fiscal document';
COMMENT ON COLUMN public.invoices.fbr_qr_code_data IS 'FBR compliant QR code payload string for fiscal verification';
COMMENT ON COLUMN public.invoices.fbr_digital_signature IS 'Cryptographic digital signature issued for the cleared invoice';
COMMENT ON COLUMN public.invoices.fbr_status IS 'FBR verification status: PENDING, VALIDATED, SUBMITTED, FAILED';
