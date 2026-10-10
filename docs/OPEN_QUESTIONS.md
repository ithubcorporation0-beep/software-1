# ❓ IT-HUB ERP — Open Architectural Questions & Decisions

## 1. Multi-Currency & FX Exchange Rate Sync
* **Question**: Should financial valuations dynamically calculate live foreign exchange rates (e.g. converting EUR, GBP to USD) via an automated daily oracle API (e.g. OpenExchangeRates), or fix transactional exchange rates at the time of invoice issuance?
* **Tentative Decision**: Fix the transaction rate at the time of Stock Inward / Invoice generation with an option to toggle reporting base currency.

---

## 2. Inventory Costing Methodology
* **Question**: Should stock valuation follow **FIFO** (First-In, First-Out), **LIFO**, or **Weighted Average Cost (WAC)**?
* **Tentative Decision**: Default to **Weighted Average Costing** with audit movement logging for maximum audit simplicity across manufacturing and distributor profiles.

---

## 3. Barcode Scanner Hardware Integration
* **Question**: Rely exclusively on optical camera scanners (e.g., MediaPipe/ZBar) or support hardware Bluetooth/USB HID barcode wedge readers?
* **Tentative Decision**: Support standard keyboard wedge readers out of the box (listening on global keypresses with rapid character delimiters) alongside optical device camera previews.

---

## 4. Multi-Tenant vs Single-Tenant Database Architecture
* **Question**: Should enterprise clients be hosted in isolated schema tenants or shared PostgreSQL with strict Row Level Security (RLS)?
* **Tentative Decision**: Shared PostgreSQL database utilizing Supabase RLS policies parameterized by `tenant_id` / `organization_id`, with optional dedicated database provisioning for enterprise tier.
