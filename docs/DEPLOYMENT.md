# 🚀 IT-HUB ERP — Enterprise Production Deployment & Operational Handover Guide

This document defines the production deployment topology, Vercel CI/CD configuration, Supabase PostgreSQL database migration protocols, disaster recovery backup procedures, rollbacks, and operational handover checklists for **IT-HUB ERP**.

---

## 1. System Architecture Overview

```
                      +-----------------------------+
                      |       Users / Clients       |
                      +--------------+--------------+
                                     |  HTTPS (TLS 1.3)
                                     v
                      +-----------------------------+
                      |       Vercel Edge CDN       |
                      | (Headers, DDoS, SSL/TLS)    |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Next.js App Router        |
                      |   (Server Actions & API)    |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                     |                     |
               v                     v                     v
+-------------------------+ +-----------------+ +-------------------------+
| Supabase Auth           | | Supabase Postgres| | SMTP / Resend Email   |
| (Cookie JWT / Sessions) | | (RLS Multi-Ten) | | (Fails closed if unset) |
+-------------------------+ +-----------------+ +-------------------------+
```

---

## 2. Vercel Production Deployment Workflow

### 2.1 Git Connection Setup
1. Log in to [Vercel Dashboard](https://vercel.com) and click **"Add New Project"**.
2. Select your Git provider (GitHub / GitLab / Bitbucket) and import repository: `erp software`.
3. Configure the framework preset:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./`
   - **Build Command**: `next build` (or default `npm run build`)
   - **Output Directory**: `.next` (automatically managed by Next.js preset)
   - **Node.js Version**: `20.x` or higher

### 2.2 Environment Variables Configuration
Configure environment variables in **Vercel Project Settings > Environment Variables**.
Target each variable to **Production**, **Preview**, and **Development** as appropriate:

| Variable Name | Environment | Description | Secret? |
|---|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | All | Application title ("IT-HUB ERP") | No |
| `NEXT_PUBLIC_APP_ENV` | Prod / Preview | Environment identifier ("production" / "preview") | No |
| `NEXT_PUBLIC_APP_URL` | Prod / Preview | Canonical public URL (e.g. `https://erp.ithub.example.com`) | No |
| `NEXT_PUBLIC_DEFAULT_TENANT_ID` | All | Default active tenant UUID | No |
| `NEXT_PUBLIC_DEFAULT_WORKSPACE` | All | Primary workspace name | No |
| `NEXT_PUBLIC_SUPABASE_URL` | All | Supabase project API gateway URL | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Public Supabase anon JWT key (enforces RLS) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | **HIGH PRIVILEGE** database role key (never expose to client) | **YES** |
| `SESSION_SECRET` | Server Only | 64-character cryptographic cookie sealing secret | **YES** |
| `SMTP_HOST` | Server Only | (Optional) Outbound email hostname | No |
| `SMTP_PORT` | Server Only | (Optional) SMTP port (typically 587) | No |
| `SMTP_USER` | Server Only | (Optional) SMTP authentication username | **YES** |
| `SMTP_PASSWORD` | Server Only | (Optional) SMTP credential password | **YES** |
| `SMTP_FROM` | Server Only | (Optional) Verified sender email address | No |
| `RESEND_API_KEY` | Server Only | (Optional) Alternative email dispatch key (`re_...`) | **YES** |

> [!CAUTION]
> **Zero Secrets in Client Code**: Never prefix private API keys or database connection strings with `NEXT_PUBLIC_`. The Next.js compiler embeds `NEXT_PUBLIC_` variables directly into public JavaScript bundles.

---

## 3. Supabase Auth & Redirect URL Whitelisting

In the **Supabase Dashboard > Authentication > URL Configuration**:
1. **Site URL**:
   Set to your production domain: `https://erp.yourdomain.com`
2. **Redirect URLs (Allow List)**:
   Add the following patterns to allow secure authentication redirects:
   - `https://erp.yourdomain.com/**`
   - `https://erp.yourdomain.com/auth/callback`
   - `https://*-your-team.vercel.app/**` (For Vercel preview environments)
   - `http://localhost:3000/**` (For local development only)

---

## 4. Production Database Migrations & Seed Hygiene

### 4.1 Running Clean Migrations
Database schema definitions are version-controlled in [`supabase/migrations/`](file:///e:/new%20data/erp%20software/supabase/migrations).

To apply migrations cleanly without GUI drift:
```bash
# 1. Login via Supabase CLI
npx supabase login

# 2. Link your production or staging project
npx supabase link --project-ref <your-supabase-project-ref>

# 3. Check migration synchronization status
npx supabase migration list

# 4. Push pending migrations safely
npx supabase db push
```

Alternatively, executing migrations directly in Supabase SQL Editor:
1. Open [`supabase/migrations/20261010000000_init_erp_schema.sql`](file:///e:/new%20data/erp%20software/supabase/migrations/20261010000000_init_erp_schema.sql).
2. Review the statements in a staging database first.
3. Execute SQL transactionally.

### 4.2 Seed Data Hygiene
> [!IMPORTANT]
> **Never Deploy Seed Data to Production**: Seed files in [`supabase/seed.sql`](file:///e:/new%20data/erp%20software/supabase/seed.sql) contain synthetic mock accounts (`admin@example.com`, `user@example.com`) designed exclusively for local integration and unit tests.
> - **Production bootstrap**: Only initialize system roles and schema constraints.
> - First tenant administrator must register through the verified auth flow.

---

## 5. Database Backup, Disaster Recovery & Rollback

### 5.1 Automated Backups
- **Supabase Cloud Daily Backups**: Automated Point-in-Time Recovery (PITR) is recommended for production instances (retains physical WAL logs up to 7-30 days).
- **Manual Logical Snapshot (`pg_dump`)**:
  Before major schema updates or monthly payroll closes, export a manual encrypted snapshot:
  ```bash
  pg_dump -h db.<project-ref>.supabase.co -U postgres -d postgres -F c -b -v -f "backup_erp_$(date +%Y%m%d_%H%M%S).dump"
  ```

### 5.2 Database Restoration Procedure
To restore from a logical dump:
```bash
pg_restore -h db.<project-ref>.supabase.co -U postgres -d postgres -v --clean "backup_erp_YYYYMMDD_HHMMSS.dump"
```

### 5.3 Rollback Strategy
1. **Application Rollback (Vercel)**:
   - Open Vercel Dashboard > Project > **Deployments**.
   - Locate the previous stable production deployment.
   - Click **"Instant Rollback"** (traffic switches in < 5 seconds without rebuilding).
2. **Database Schema Rollback**:
   - Write explicit down-migrations (`revert_*.sql`) to reverse schema changes gracefully.
   - Do not drop columns containing production data without archiving first.

---

## 6. Pre-Flight Verification & Smoke Tests

After deploying to a Vercel Preview URL or Production domain, execute the following smoke verification sequence:

1. **HTTPS & Security Headers Inspection**:
   ```bash
   curl -I https://erp.yourdomain.com
   ```
   Verify headers:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Strict-Transport-Security: max-age=63072000...`
   - `Permissions-Policy`
2. **Authentication Flow**:
   - Test login and password recovery.
   - Verify secure cookie issuance (`HttpOnly`, `SameSite=Lax`, `Secure`).
3. **Multi-Tenant Access Isolation**:
   - Log in as Tenant A user; attempt access to Tenant B records. Verify failure with 403 Forbidden.
4. **Critical Workflow Smoke**:
   - [x] Create Customer in CRM
   - [x] Issue Quotation and convert to Invoice
   - [x] Record Payment and verify General Ledger posting
   - [x] Submit employee expense and test approval separation of duties
   - [x] Record attendance check-in and leave request
   - [x] Draft, calculate, approve, and finalize payroll run
   - [x] Issue PO, perform single-event goods receipt, and verify stock level increment
   - [x] Run Financial P&L and Workforce report; trigger CSV export
5. **Notification Stream**:
   - Verify in-app notifications render in navbar popover.
   - Verify unread count badge decrements upon marking read.

---

## 7. Known Operational Limitations & Future Roadmap

The following items are outside the current core scope or reserved for future releases:
1. **Customer Self-Service Portal**: Customers currently interface via direct invoices, emails, and staff communication.
2. **Automated SaaS Subscription Billing**: Currently modeled for direct corporate invoicing rather than Stripe recurring metered subscriptions.
3. **Biometric / GPS Hardware Clock-In**: Attendance is recorded via authenticated web interface with workday rules, grace period calculations, and IP audit logging.
4. **WhatsApp & SMS Gateway**: CRM tracks WhatsApp numbers and initiates click-to-chat links; automated SMS gateway dispatch requires third-party Twilio/Meta Business API credentials.
5. **Single Sign-On (SAML / Okta) & 2FA Enforcement**: Supabase email/password and standard OAuth are enabled; enterprise SAML requires Supabase Enterprise tier configuration.

---

## 8. Professional Review Recommendations

> [!WARNING]
> **Independent Advisory Notice**:
> - **Security Audit**: A qualified third-party penetration test is strongly recommended prior to handling live regulated customer data or payment gateway credentials.
> - **Accounting & Tax Review**: Financial rules, tax rates, Chart of Accounts codes, and General Ledger posting policies must be reviewed and certified by the client's corporate CPA / chartered accountant.
> - **Payroll & Labor Compliance**: Statutory deductions, income tax brackets, overtime multipliers, and leave policies must be configured and signed off by the client's human resources and payroll legal counsel.
