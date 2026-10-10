# ❓ IT-HUB ERP — Open Architectural Questions & Decisions

## 1. Multi-Currency & FX Exchange Rate Sync
* **Question**: Should financial valuations dynamically calculate live foreign exchange rates (e.g. converting EUR, GBP to USD) via an automated daily oracle API (e.g. OpenExchangeRates), or fix transactional exchange rates at the time of invoice issuance?
* **Decision**: Fix the transaction rate at the time of Stock Inward / Invoice generation with an option to toggle reporting base currency.

---

## 2. Inventory Costing Methodology
* **Question**: Should stock valuation follow **FIFO** (First-In, First-Out), **LIFO**, or **Weighted Average Cost (WAC)**?
* **Decision**: Default to **Weighted Average Costing (WAC)** with audit movement logging for maximum audit simplicity across manufacturing and distributor profiles.

---

## 3. Barcode Scanner Hardware Integration
* **Question**: Rely exclusively on optical camera scanners (e.g., MediaPipe/ZBar) or support hardware Bluetooth/USB HID barcode wedge readers?
* **Decision**: Support standard keyboard wedge readers out of the box (listening on global keypresses with rapid character delimiters) alongside optical device camera previews.

---

## 4. Multi-Tenant vs Single-Tenant Database Architecture
* **Question**: Should enterprise clients be hosted in isolated schema tenants or shared PostgreSQL with strict Row Level Security (RLS)?
* **Decision**: Shared PostgreSQL database utilizing Supabase RLS policies parameterized by `tenant_id` / `organization_id`, with optional dedicated database provisioning for enterprise tier.

---

## 5. UI/UX Data Integrity & Dashboard Metrics (Phase 1 Decision)
* **Question**: Should the Phase 1 dashboard present simulated mock business metrics (e.g. mock $2.1M revenue, 94K inventory count) to look populated, or present authentic skeleton and zero-data states?
* **Decision**: Strictly present clearly labelled skeleton loaders and zero-data empty states. No invented numbers or fake operational metrics are permitted, maintaining absolute enterprise integrity.

---

## 6. Offline Synchronization Conflict Resolution
* **Question**: In low-connectivity warehouse environments where multiple barcode terminals dispatch stock offline, what is the tie-breaking conflict resolution policy?
* **Tentative Decision**: Client-side monotonic version vectors coupled with server-side optimistic locking. If a stockout conflict arises upon reconnect, an audit adjustment exception is logged and escalated to the warehouse manager.
