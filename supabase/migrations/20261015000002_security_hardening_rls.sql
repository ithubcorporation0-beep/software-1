-- Migration: 20261015000002_security_hardening_rls.sql
-- Description: Enable RLS and tenant isolation policies on company_document_sequences

ALTER TABLE public.company_document_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant users can manage their company document sequences" ON public.company_document_sequences;

CREATE POLICY "Tenant users can manage their company document sequences"
ON public.company_document_sequences
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
