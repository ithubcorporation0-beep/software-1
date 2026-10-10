# 🏛️ IT-HUB ERP — Enterprise Operations Suite

> Modern, modular Enterprise Resource Planning (ERP) platform engineered with Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL, and multi-tenant Row Level Security (RLS).

![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)
![React 19](https://img.shields.io/badge/React-19.3-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20RLS-3ECF8E?style=flat&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css)
![Vitest](https://img.shields.io/badge/Vitest-5.0-green?style=flat&logo=vitest)
![Theme](https://img.shields.io/badge/Theme-Obsidian%20Dark%20%26%20Light-00E5FF?style=flat)
![Security](https://img.shields.io/badge/Security-Multi--Tenant%20RLS-10B981?style=flat)

---

## 📁 Repository Structure

```text
it-hub-erp/
├── docs/                               # 📚 Enterprise Blueprint & Architecture
│   ├── MASTER_BUILD_PLAN.md            # Phased build milestones & Gantt roadmap
│   ├── ARCHITECTURE.md                 # System layering, App Router, design tokens & security
│   ├── DATA_MODEL.md                   # Relational database entities & ER diagrams
│   ├── PERMISSIONS.md                  # PRD RBAC permissions matrix & role definitions
│   ├── BOOTSTRAP.md                    # Safe Super Admin onboarding & bootstrap guide
│   ├── DEPLOYMENT.md                   # Docker, Vercel & Supabase hosting guide
│   └── OPEN_QUESTIONS.md               # Key architectural decisions & open questions
├── public/                             # Static public assets & favicons
├── scripts/
│   └── bootstrap-super-admin.ts        # Secure CLI for provisioning initial Super Admin
├── src/
│   ├── app/                            # 🚀 Next.js App Router
│   │   ├── (auth)/                     # Authentication route group
│   │   │   ├── layout.tsx              # Centered enterprise authentication shell
│   │   │   ├── login/page.tsx          # Password sign-in with company email
│   │   │   ├── register/page.tsx       # Controlled onboarding & invite code acceptance
│   │   │   ├── forgot-password/page.tsx# Password reset link dispatch
│   │   │   └── reset-password/page.tsx # Password token replacement
│   │   ├── (erp)/                      # Protected ERP application shell
│   │   │   ├── layout.tsx              # Persistent layout with Sidebar, Header & Viewport
│   │   │   ├── page.tsx                # Executive Operations Radar (Dashboard)
│   │   │   ├── inventory/page.tsx      # Inventory & Multi-Depot Logistics (Phase 2)
│   │   │   ├── crm/page.tsx            # CRM & Commercial Accounts (Phase 2)
│   │   │   ├── sales/page.tsx          # Sales Orders & Fulfillment (Phase 2)
│   │   │   ├── projects/page.tsx       # Projects & PMO Portfolio (Phase 3)
│   │   │   ├── finance/page.tsx        # Finance & General Ledger (Phase 3)
│   │   │   ├── payroll/page.tsx        # Payroll & Statutory Disbursements (Phase 3)
│   │   │   ├── hr/page.tsx             # Human Resources & Directory (Phase 4)
│   │   │   ├── reports/page.tsx        # Reports & Audit Intelligence (Phase 4)
│   │   │   └── settings/page.tsx       # System Settings & Governance (Phase 4)
│   │   ├── api/auth/logout/route.ts    # Secure session termination handler
│   │   ├── error.tsx                   # Route-level error boundary
│   │   ├── global-error.tsx            # Root fatal error boundary
│   │   ├── not-found.tsx               # Accessible 404 page
│   │   ├── layout.tsx                  # Root HTML shell with theme & metadata
│   │   └── globals.css                 # Design tokens, CSS variables, focus rings
│   ├── components/
│   │   ├── layout/                     # SaaS Shell Components
│   │   │   ├── erp-shell.tsx           # Primary wrapper
│   │   │   ├── sidebar.tsx             # Left navigation with phase badges & tenant context
│   │   │   ├── header.tsx              # Sticky top header with search, notifs & user menu
│   │   │   ├── mobile-nav.tsx          # Accessible mobile drawer with focus trap
│   │   │   ├── global-search-dialog.tsx# Universal Command palette (Ctrl+K)
│   │   │   ├── notifications-popover.tsx# System notification tray
│   │   │   ├── user-menu.tsx           # Role switcher & dark/light theme toggle
│   │   │   ├── page-header.tsx         # Page title, dynamic breadcrumbs & actions
│   │   │   └── content-layout.tsx      # Standardized responsive container
│   │   ├── ui/                         # 🎨 Design System Primitives
│   │   │   ├── button.tsx              # Accessible button with variants & loading states
│   │   │   ├── input.tsx               # Inputs with accessible labels & error states
│   │   │   ├── badge.tsx               # Semantic badges (success, warning, info, etc.)
│   │   │   ├── card.tsx                # Card, Header, Title, Content, Footer
│   │   │   ├── dialog.tsx              # Modal dialogs with Escape listener & backdrop
│   │   │   ├── dropdown.tsx            # Accessible dropdowns with keyboard navigation
│   │   │   ├── table.tsx               # Tabular data patterns with responsive scrolling
│   │   │   ├── skeleton.tsx            # Pulsing skeleton loaders
│   │   │   ├── empty-state.tsx         # Zero-data state with icon & CTA
│   │   │   ├── error-state.tsx         # Operation failure alert with retry
│   │   │   └── breadcrumbs.tsx         # Screen-reader friendly breadcrumb trail
│   │   └── shared/
│   │       └── coming-soon-module.tsx  # Honest roadmap placeholder for future modules
│   ├── lib/                            # ⚙️ Reusable Utilities & Auth
│   │   ├── auth/server.ts              # Fail-closed server authorization helpers
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client (Anon key only)
│   │   │   ├── server.ts               # Server Supabase client (Cookie-backed)
│   │   │   └── admin.ts                # Server-only administrative Supabase client
│   │   └── utils.ts                    # Class merger (`cn`), currency & date formatters
│   ├── middleware.ts                   # Session verification and protected route guard
│   └── types/                          # TypeScript definitions & contracts
├── supabase/                           # 🐘 Database Migrations & Seeds
│   ├── migrations/
│   │   ├── 20261010000000_init_erp_schema.sql
│   │   └── 20261010000001_auth_tenancy_rbac.sql
│   └── seed.sql                        # Multi-tenant test seeds
├── tests/                              # 🧪 Comprehensive Test Suite
│   ├── setup.ts                        # Jest-DOM matchers initialization
│   ├── unit/                           # Auth isolation, Button, Badge, Sidebar tests
│   └── integration/                    # RBAC role permissions tests
├── .env.example                        # Documented environment blueprint
├── eslint.config.mjs                   # ESLint 9 flat configuration
├── tsconfig.json                       # TypeScript compiler configuration with path aliases
├── tailwind.config.ts                  # Design tokens & semantic color system
├── vitest.config.ts                    # Vitest configuration with jsdom & React plugin
└── package.json
```

---

## 🚀 Quick Start

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18+ or v20+)
* npm (v9+)
* A [Supabase](https://supabase.com) project or local Supabase CLI instance

### 2. Environment Setup
```bash
# Clone the repository
git clone https://github.com/ithubcorporation0-beep/software-1.git
cd software-1

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

Configure your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret-key"
```

### 3. Applying Database Migrations
Apply the migrations in your Supabase SQL Editor or via Supabase CLI:
```bash
# Using Supabase CLI:
supabase db push
# Or apply in development SQL Editor:
# 1. supabase/migrations/20261010000000_init_erp_schema.sql
# 2. supabase/migrations/20261010000001_auth_tenancy_rbac.sql
# 3. supabase/seed.sql (Optional development data)
```

### 4. Provisioning the Initial Super Administrator
Run the safe server-side bootstrap script:
```bash
npx tsx scripts/bootstrap-super-admin.ts admin@yourcompany.com "YourPassword123!" "Chief Executive Officer"
```
*(Refer to [`docs/BOOTSTRAP.md`](docs/BOOTSTRAP.md) for detailed onboarding steps and manual dashboard procedures).*

### 5. Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Quality & Test Verification

```bash
# 1. TypeScript compilation check
npm run type-check

# 2. Code linting
npm run lint

# 3. Unit and integration tests (Auth, Tenant Isolation, RBAC, Design System)
npm test

# 4. Production build
npm run build
```

---

## 🔐 Multi-Tenant Security & RBAC Model

* **Verified Server Membership**: A user's company access originates exclusively from verified `memberships` records where `status = 'ACTIVE'`. Client-supplied `company_id` values are never trusted blindly.
* **Fail-Closed Authorization**: All server actions consult `requirePermission(companyId, permissionCode)`, which throws `403 Forbidden` if unverified.
* **Database Row Level Security (RLS)**: Enforced across all tables via security definer predicates `user_company_ids()` and `has_company_permission()`, preventing Company A from ever reading or mutating Company B records.
* **PRD System Roles**: Supports `Super Admin`, `Admin`, `Manager`, `Accountant`, `HR Manager`, `Employee`, and `Customer` with granular action privileges (`view`, `create`, `edit`, `delete`, `export`, `approve`).
