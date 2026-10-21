# FBR Production Deployment & Go-Live Checklist

This checklist must be reviewed and signed off before deploying FBR Digital Invoicing integration to production on Supabase and Vercel.

---

## 1. Database & Schema Readiness (Supabase)

- [ ] **Migration Check**: Verify that migration [`20261020000000_fbr_digital_invoicing.sql`](file:///e:/new%20data/erp%20software/supabase/migrations/20261020000000_fbr_digital_invoicing.sql) has executed successfully on production Supabase:
  - Columns present on `public.invoices`: `fbr_irn`, `fbr_uuid`, `fbr_qr_code_data`, `fbr_digital_signature`, `fbr_status`.
  - Indexes present: `idx_invoices_fbr_irn`, `idx_invoices_company_fbr_status`.
- [ ] **Row Level Security (RLS)**: Verify RLS is active on `public.invoices` and `public.customers` to prevent cross-tenant data leaks.
- [ ] **Database Backup**: Create an automated manual snapshot on the Supabase dashboard under **Database** > **Backups**.

---

## 2. Vercel Environment Variables Configuration

Ensure the following variables are configured in the **Vercel Project Settings** under **Environment Variables** (Production Environment only):

- [ ] `FBR_CLIENT_ID`: Production OAuth Client ID issued by PRAL.
- [ ] `FBR_CLIENT_SECRET`: Production OAuth Secret Key (mark as **Sensitive / Encrypted**).
- [ ] `FBR_TOKEN_URL`: `https://api.fbr.gov.pk/oauth2/token`
- [ ] `FBR_VALIDATE_URL`: `https://api.fbr.gov.pk/invoices/validate`
- [ ] `FBR_SUBMIT_URL`: `https://api.fbr.gov.pk/invoices/submit`
- [ ] `FBR_SELLER_NTN`: Your company's 7-digit NTN (e.g. `1234567-8`).
- [ ] Verify **no** FBR variable is prefixed with `NEXT_PUBLIC_`.

---

## 3. Security & Governance Review

- [ ] **No Client-Side Secrets**: Audit that `FBR_CLIENT_SECRET` is only accessed within `src/lib/` and Next.js route handlers, never sent in client components or bundles.
- [ ] **HTTPS Enforcement**: Confirm SSL/TLS is active for all incoming traffic to Vercel and outgoing API calls to FBR.
- [ ] **Audit Logging**: Confirm that every invoice submission to FBR creates an audit entry in `public.audit_logs` capturing user ID, timestamp, and fiscal response status.

---

## 4. Operational Fail-Safe & Network Resilience

- [ ] **Non-Blocking Invoicing**: If FBR's gateway experiences latency or temporary downtime, invoices must still be created locally in the ERP with `fbr_status = 'PENDING'`. Business sales operations must never be blocked by external server outages.
- [ ] **Retry Mechanism**: A background retry queue or manual "Resubmit to FBR" button is available in the invoice details view for pending or failed submissions.
- [ ] **Timeout Protection**: All outbound requests to FBR endpoints must enforce a strict 10-second timeout to prevent serverless function hang-ups.

---

## 5. Pre-Flight Code Quality Verification

Before triggering production deployments, ensure all checks pass locally:

- [ ] **Static Typecheck**:
  ```bash
  npm run type-check
  ```
  *Must exit with 0 errors.*
- [ ] **Static Linter**:
  ```bash
  npm run lint
  ```
  *Must exit with 0 errors.*
- [ ] **Automated Test Suite**:
  ```bash
  npm test
  ```
  *All 30 test files and 223+ tests must pass.*
- [ ] **Production Webpack Bundle**:
  ```bash
  npm run build
  ```
  *All 25 routes must compile cleanly.*

---

## 6. Post-Deployment Smoke Test

- [ ] Log in as a tenant administrator.
- [ ] Open the **Create Customer** modal:
  - Enter an invalid 15-digit number (`161015419561411`) and click **Verify Tax Number**. Confirm red rejection alert.
  - Enter a valid 13-digit CNIC (`1610154195663`). Confirm auto-formatting and official verification channels.
- [ ] Create a test commercial invoice and verify that the downloaded PDF contains the emerald green FBR banner and scannable 25×25 QR code.
- [ ] Check Vercel Function logs to ensure zero unhandled exceptions.
