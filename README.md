# 🏛️ IT-HUB ERP — Enterprise Operations Suite

> Modern, modular Enterprise Resource Planning (ERP) platform engineered with Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL, and multi-tenant Row Level Security (RLS).

![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)
![React 19](https://img.shields.io/badge/React-19.3-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20RLS-3ECF8E?style=flat&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css)
![Vitest](https://img.shields.io/badge/Vitest-144%20Passed-green?style=flat&logo=vitest)
![Theme](https://img.shields.io/badge/Theme-Obsidian%20Dark%20%26%20Light-00E5FF?style=flat)
![Security](https://img.shields.io/badge/Security-Multi--Tenant%20RLS-10B981?style=flat)

---

## 📚 Documentation & Specifications

- 📘 [**Architecture & System Design**](docs/ARCHITECTURE.md) — Layering, server actions, design tokens, security.
- 📋 [**PRD Acceptance Checklist**](docs/ACCEPTANCE_CHECKLIST.md) — Evidence-based Pass/Fail scorecard for all PRD criteria.
- 🚀 [**Deployment & DevOps Guide**](docs/DEPLOYMENT.md) — Vercel Git integration, migrations, backups, disaster recovery, rollbacks.
- 🔒 [**Permissions & RBAC Matrix**](docs/PERMISSIONS.md) — Granular privileges, system roles, separation of duties.
- 🗄️ [**Data Model & ER Diagrams**](docs/DATA_MODEL.md) — PostgreSQL relational schema, indexes, audit trail.
- ⚡ [**Super Admin Bootstrap**](docs/BOOTSTRAP.md) — Initial administrative account provisioning CLI.

---

## 🌟 Modules & Core Workflows

1. **Multi-Tenancy, Auth & Governance**:
   - Strict Row Level Security (`company_id`) and fail-closed server authorization (`requirePermission`).
   - User administration, invitation workflow, role assignments, and immutable audit logs.
2. **CRM & Lead Pipeline**:
   - Customer master data, contact history, financial spend tracking, and destructive deletion safeguards.
   - 7-stage interactive Kanban pipeline (New → Contacted → Qualified → Proposal → Negotiation → Won → Lost).
3. **Sales, Invoicing & Payments**:
   - Concurrency-safe sequential numbering (`QT-00001`, `SO-00001`, `INV-00001`, `PAY-00001`).
   - Duplicate conversion safeguards (`Quotation` → `Sales Order` → `Invoice`).
   - Partial/full payment recording, invoice balance auto-settlement, and non-destructive payment voiding.
4. **Finance, Expenses & General Ledger (GAAP)**:
   - Operating expense management with private receipt attachments and submit/approve workflows.
   - Strict separation of duties: Submitter cannot approve their own expense.
   - Balanced double-entry General Ledger postings, Profit & Loss reports, and Chart of Accounts.
5. **Human Resources & Workforce**:
   - Employee profile directory with role-based masking for sensitive fields (CNIC, Bank details, Salary).
   - Time & attendance tracking with workday grace period calculations and late arrival detection.
   - Leave request submission and manager approval lifecycle.
6. **Payroll Engine**:
   - PRD net salary formula: `Net = Basic + Allowances + Bonus + Overtime − Deductions − Tax − Advances`.
   - Controlled state transitions: Draft → Approved → Finalized → Reversed.
   - Automated liabilities posting to General Ledger upon payroll finalization.
7. **Projects & Task Kanban (PMO)**:
   - Project budgets, timelines, milestone tracking, and customer account association.
   - Task Kanban board with priority scheduling, employee assignments, and completion metrics.
8. **Inventory, Purchasing & Logistics**:
   - Multi-warehouse SKU catalog, minimum stock thresholds, and real-time low-stock alerts.
   - Purchase Orders with idempotent single-event goods receipt (`receivePurchaseOrderGoods`).
   - Auditable inventory movement tracking with unit-cost valuation.
9. **In-App Notifications**:
   - Real-time alerts for invoices, overdue payments, tasks, leaves, low stock, and deadlines.
   - User preferences, deduplication keys (`dedup_key`), and read/unread counters.
10. **Reports & Intelligence Engine**:
    - Multi-tab reporting suite across Sales, Financial P&L, Workforce, Inventory, and PMO.
    - Date range filtering, search, printable schedules, and tenant-scoped CSV exports.
11. **Categorized Global Search**:
    - Keyboard-triggered Command dialog (`Ctrl+K` / `⌘K`) searching across Customers, Employees, Invoices, Expenses, Projects, Tasks, Products, and Suppliers with strict permission filtering.

---

## 🚀 Quick Start

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v20+)
* npm (v10+)
* A [Supabase](https://supabase.com) PostgreSQL database instance or Supabase CLI

### 2. Environment Setup
```bash
# Clone the repository
git clone https://github.com/ithubcorporation0-beep/software-1.git
cd software-1

# Install exact dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

Configure your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret-key"
SESSION_SECRET="your-64-character-session-secret"
```

### 3. Database Migrations
Apply migrations cleanly via Supabase CLI or SQL Editor:
```bash
npx supabase link --project-ref <your-ref>
npx supabase db push
```

### 4. Provision Initial Super Administrator
```bash
npx tsx scripts/bootstrap-super-admin.ts admin@yourcompany.com "YourSecurePassword123!" "Chief Executive Officer"
```

### 5. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Quality & Verification Suite

All quality gates pass with zero warnings or unhandled exceptions:

```bash
# 1. Static TypeScript Type Checking
npm run type-check

# 2. ESLint Validation
npm run lint

# 3. Automated Test Suite (18 files / 144 unit, integration & E2E tests)
npm test

# 4. Production Next.js Build
npm run build
```

---

## ⚠️ Advisory Notice

- **Independent Security Review**: An external third-party penetration test is recommended before hosting live customer data or payment gateway credentials.
- **Accounting & Payroll Sign-Off**: Local tax rates, statutory labor deductions, Chart of Accounts codes, and General Ledger posting policies must be certified by the client's corporate CPA and payroll legal counsel.

