# 🏛️ IT-HUB ERP — Enterprise Operations Suite

> Modern, modular Enterprise Resource Planning (ERP) platform engineered with Next.js App Router, TypeScript, Tailwind CSS, and accessible design system primitives.

![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)
![React 19](https://img.shields.io/badge/React-19.3-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css)
![Vitest](https://img.shields.io/badge/Vitest-5.0-green?style=flat&logo=vitest)
![Theme](https://img.shields.io/badge/Theme-Obsidian%20Dark%20%26%20Light-00E5FF?style=flat)
![Phase](https://img.shields.io/badge/Phase-1%20Foundation%20Active-10B981?style=flat)

---

## 📁 Repository Structure

```text
it-hub-erp/
├── docs/                               # 📚 Enterprise Blueprint & Architecture
│   ├── MASTER_BUILD_PLAN.md            # Phased build milestones & Gantt roadmap
│   ├── ARCHITECTURE.md                 # System layering, App Router, design tokens & security
│   ├── DATA_MODEL.md                   # Relational database entities & ER diagrams
│   ├── PERMISSIONS.md                  # RBAC permissions matrix & role definitions
│   ├── DEPLOYMENT.md                   # Docker, Vercel & Supabase hosting guide
│   └── OPEN_QUESTIONS.md               # Key architectural decisions & open questions
├── public/                             # Static public assets & favicons
├── src/
│   ├── app/                            # 🚀 Next.js App Router
│   │   ├── (erp)/                      # Authenticated ERP application shell
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
│   ├── lib/                            # ⚙️ Reusable Utilities & Logic
│   │   ├── permissions/rbac.js         # Fine-grained RBAC matrix (Super Admin, Ops, etc.)
│   │   └── utils.ts                    # Class merger (`cn`), currency & date formatters
│   └── types/                          # TypeScript definitions & constants
├── supabase/                           # 🐘 Database Migrations & Seeds
│   ├── migrations/                     # 20261010000000_init_erp_schema.sql
│   └── seed.sql                        # PostgreSQL seed dataset
├── tests/                              # 🧪 Comprehensive Test Suite
│   ├── setup.ts                        # Jest-DOM matchers initialization
│   ├── unit/                           # Button, Badge, Sidebar, ComingSoonModule tests
│   └── integration/                    # RBAC role permissions tests
├── .env.example                        # Safe environment variables blueprint
├── .gitignore                          # Strictly ignores .env.local, .next, and secrets
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

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ithubcorporation0-beep/software-1.git
cd software-1

# Install dependencies
npm install

# Copy environment configuration template
cp .env.example .env.local
```

### 3. Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Running Checks & Tests
```bash
# Type check TypeScript without emitting files
npm run type-check

# Run ESLint across the codebase
npm run lint

# Run unit and integration tests with Vitest
npm test

# Build optimized production bundle
npm run build
```

---

## 🎨 Design System & Accessibility

* **Neutral Surfaces**: Restrained, modern slate and zinc tones.
* **Accent Colors**: Subtle enterprise sapphire tokens with semantic status colors (Emerald, Amber, Rose, Sky).
* **Keyboard Navigation**:
  * `Ctrl + K` or `Cmd + K` opens the Universal Command Palette.
  * `Escape` closes any open dialog or modal drawer.
  * Standard `Tab` navigation with visible outline rings (`:focus-visible`).
* **Honest Data Presentation**: Phase 1 avoids displaying simulated mock figures. Unimplemented modules and widgets show clear skeleton loaders or "Coming in a later phase" states.
