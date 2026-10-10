# 📦 NEXUS ERP — Enterprise Inventory & Operations Suite

> Next-generation Enterprise Resource Planning (ERP) platform for real-time inventory management, multi-warehouse logistics, SKU lifecycle control, and automated reorder defense.

![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react)
![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat&logo=vite)
![Design](https://img.shields.io/badge/Theme-Obsidian%20Dark%20%26%20Light-00E5FF?style=flat)
![Status](https://img.shields.io/badge/Status-Operational-10B981?style=flat)

---

## 🌟 Core Modules & Capabilities

### 1. 📊 Executive Operations Radar (Dashboard)
* **Real-time KPI Metrics**: Live stock valuation (Cost Basis), projected retail turnover yield, average margin %, active catalog SKUs, and transaction velocity.
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
  * Delete protection with confirmation dialogs.

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

### 6. 🚚 Supplier & Vendor Procurement Directory
* Direct vendor directory with SLA lead times (business days), reliability ratings (4.5–4.9 ⭐), account representatives, and one-click catalog filtering.

### 7. 📈 Financial Valuation & Liquidity Analytics
* Working capital basis vs retail list yield comparison.
* Top 5 highest valuation assets and top 5 highest profit margin performers.
* Slow-moving liquidity risk alert audit.

### 8. 💾 Data Persistence, Backup & Portability
* Instant persistence via browser `localStorage` with enterprise demo fallback.
* One-click **Export Catalog to CSV**.
* One-click **Full JSON Database Backup**.
* **Import JSON Dataset** loader.
* **Reset to Demo Data** utility for safe demonstration and onboarding.

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
* `Ctrl + K` or `/` — Universal SKU & product search
* `Escape` — Close active modal dialog

---

## 🛠️ Technology Stack
* **Framework**: React 19, Vite
* **Icons**: Lucide React
* **Styling**: Vanilla CSS Design Tokens (Obsidian Dark & Clean Light modes)
* **Fonts**: Plus Jakarta Sans, JetBrains Mono
