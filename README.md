# 🏛️ IT-HUB ERP — Enterprise Operations Suite

> Next-generation Enterprise Resource Planning (ERP) platform for real-time inventory management, multi-warehouse logistics, CRM, commercial sales orders, financial ledger, human capital, automated payroll, and operational intelligence.

![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react)
![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat&logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase)
![Theme](https://img.shields.io/badge/Theme-Obsidian%20Dark%20%26%20Light-00E5FF?style=flat)
![Status](https://img.shields.io/badge/Status-Operational-10B981?style=flat)

---

## 📁 Repository Structure

```text
it-hub-erp/
├── docs/                               # 📚 Enterprise Blueprint & Architecture
│   ├── MASTER_BUILD_PLAN.md            # Phased build milestones & Gantt roadmap
│   ├── ARCHITECTURE.md                 # System layering, data flow & security
│   ├── DATA_MODEL.md                   # Relational database entities & ER diagrams
│   ├── PERMISSIONS.md                  # RBAC permissions matrix & role definitions
│   ├── DEPLOYMENT.md                   # Docker, Vercel & Supabase hosting guide
│   └── OPEN_QUESTIONS.md               # Key architectural decisions & FX/costing
├── public/                             # Static public assets & favicons
├── src/
│   ├── app/                            # Route shells & layouts
│   ├── components/
│   │   ├── layout/                     # Header, Sidebar, Responsive Shell
│   │   ├── ui/                         # Atomic design system controls
│   │   └── shared/                     # Confirm dialogs & toast notifications
│   ├── features/                       # 🧩 Modular Business Domains
│   │   ├── dashboard/                  # Executive telemetry & velocity charts
│   │   ├── inventory/                  # SKU catalog, stock ledger, barcodes
│   │   ├── crm/                        # Customer directory & lead pipeline
│   │   ├── sales/                      # Commercial sales orders & fulfillment
│   │   ├── finance/                    # Chart of accounts, balance sheet, P&L
│   │   ├── hr/                         # Employee directory & department hierarchy
│   │   ├── payroll/                    # Statutory withholding & disbursements
│   │   ├── projects/                   # Strategic engineering projects & milestones
│   │   ├── reports/                    # CSV valuation & movement ledgers
│   │   └── notifications/              # Stockout & audit event radar
│   ├── lib/                            # ⚙️ Core Libraries & Services
│   │   ├── auth/                       # Session handling & RBAC user profiles
│   │   ├── db/                         # Database & storage adapter
│   │   ├── permissions/                # Fine-grained RBAC permission checks
│   │   ├── validation/                 # Schema validators
│   │   ├── audit/                      # Cryptographic audit trail logger
│   │   └── utils/                      # Currency, date, and margin utilities
│   └── types/                          # Data contracts & TypeScript models
├── supabase/                           # 🐘 Database Migrations & Seeds
│   ├── migrations/                     # 20261010000000_init_erp_schema.sql
│   └── seed.sql                        # Enterprise mock dataset for PostgreSQL
├── tests/                              # 🧪 Comprehensive Test Suite
│   ├── unit/                           # Inventory calculations & margin formulas
│   ├── integration/                    # RBAC role authorization matrix
│   └── e2e/                            # End-to-end stock transfer lifecycle
├── .env.example                        # Environment variables template
├── .gitignore
├── README.md
└── package.json
```

---

## 🌟 Modules & Business Features

### 1. 📊 Executive Operations Radar (Dashboard)
* **Real-time KPI Metrics**: Live stock valuation (Cost Basis), potential retail turnover, gross margin %, catalog SKUs, and movement velocity.
* **Movement Velocity Charts**: Interactive SVG stock trajectory visualization tracking Inbound receipts vs Outbound dispatches.
* **Category Breakdown**: Category-level volume progress bars and working capital distribution.
* **Live Audit Activity Feed**: Real-time chronological operations log with relative timestamps.

### 2. 🏷️ Product & SKU Master Catalog
* **Dual View Experience**: High-density Data Table view with sortable columns or Responsive Card Grid view.
* **Universal Search & Filtering**: Multi-parameter search by SKU, Name, Barcode UPC, Category, Warehouse Hub, or Bin Location.
* **Profit Margin Engine**: Auto-computes gross profit margin percentages and dollar spread per unit.
* **Full CRUD Operations**:
  * Auto-generates cryptographically distinct SKUs with category prefixes (e.g. `ELEC-CORE-8812`).
  * Instant UPC/EAN barcode code generator.
  * Stock level safety gauges compared against max storage capacity.

### 3. 🔄 Stock Movement Ledger (In / Out / Audit)
* **Transaction Recording**:
  * **Stock In (+)**: Receive supplier shipments, container deliveries, and client returns.
  * **Stock Out (-)**: Dispatch sales orders, work order allocations, and fulfillment jobs with negative-stock prevention.
  * **Audit Adjustments (±)**: Reconcile physical cycle counts and scrap damaged units.
* **Complete Audit Trail**: Immutable transaction ID, ISO timestamp, delta quantities, reference codes (PO#, SO#), authorized operators, and notes.

### 4. 🚨 Intelligent Reorder Radar & Stockout Defense
* **Automated Stockout Detection**: Classifies products into `Stockout Emergency`, `Critical (<40% min threshold)`, and `Reorder Needed`.
* **Recommended Replenishment Calculator**: Automatically computes missing capacity units and estimated purchase capital required.
* **One-Click Restock**: Pre-fills stock movement transactions or generates simulated batch Purchase Orders (PO).

### 5. 🏢 Multi-Depot Logistics Facilities
* Tracks centralized and regional distribution centers:
  * Central Logistics Hub (Dallas, TX)
  * East Coast Distribution Center (Newark, NJ)
  * Pacific Freight Depot (Long Beach, CA)
  * European Gateway Depot (Amsterdam, NL)
* Live storage utilization gauges (% capacity filled, active SKUs, and facility director contact details).

### 6. 🤝 CRM & Commercial Accounts
* Enterprise account directory with lifetime spend tracking, account contact profiles, and lead status pipeline transitions (`Lead`, `Prospect`, `Active Customer`).

### 7. 🛒 Sales Orders & Fulfillment
* Commercial sales order tracking (PO/SO codes), line-item allocations, payment receipt statuses (`Paid`, `Pending`), and fulfillment lifecycle stages (`Confirmed`, `Dispatched`, `Fulfilled`).

### 8. 💰 Finance, Ledger & Treasury Capital
* Chart of accounts (Assets, Liabilities, Equity, Revenue, COGS), working capital calculations, accounts receivable/payable balances.

### 9. 👥 HR & Staff Directory
* Personnel profiles, employee identification codes, department divisions, salary bands, and streamlined employee onboarding.

### 10. 💳 Automated Payroll Engine
* Automated monthly salary runs with statutory tax withholding (22%), healthcare deductions, and single-click net pay disbursement.

### 11. 📐 Capital Engineering Projects
* PMO project milestone tracker, target completion dates, allocated budgets vs committed expenditure, and progress velocity bars.

### 12. 📑 Enterprise Reports & Business Intelligence
* Exportable audit-ready CSV schedules for Inventory Asset Valuation and Stock Movement Audit Trails.

### 13. 🔐 Role-Based Access Control (RBAC)
* Seamless in-app user role switcher in the header to simulate and verify permissions for:
  * **Super Admin**: Unrestricted system governance.
  * **Inventory Manager**: SKU creation, stock adjustments, vendor oversight.
  * **Operations Staff**: Barcode scanning and movement logging only.
  * **Finance Director**: Balance sheet, ledger, and payroll disbursements.

---

## 🚀 Quick Start

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* npm (v9+)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ithubcorporation0-beep/software-1.git
cd software-1

# Install dependencies
npm install
```

### 3. Development Server
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### 4. Production Build
```bash
npm run build
npm run preview
```

---

## ⌨️ Keyboard Shortcuts
* `Ctrl + K` or `/` — Universal SKU, product, and account search
* `Escape` — Close active modal dialog
