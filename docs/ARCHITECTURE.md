# 🏗️ IT-HUB ERP — System Architecture Specification

## 1. High-Level Architectural Pattern
IT-HUB ERP utilizes a **Feature-Driven Domain Architecture** adhering to clean separation of concerns. Presentational components are isolated from data access, business calculations, and authorization rules.

```
                    +---------------------------------------+
                    |           Presentation Layer          |
                    |   (App Router, Layouts, UI Primitives)|
                    +-------------------+-------------------+
                                        |
                                        v
                    +---------------------------------------+
                    |          Feature Modules              |
                    | (Inventory, Sales, CRM, Finance, HR)  |
                    |  - Components                         |
                    |  - Services & Domain Logic            |
                    |  - Queries & Store Hooks              |
                    +-------------------+-------------------+
                                        |
                                        v
                    +---------------------------------------+
                    |             Core Lib Layer            |
                    | - Auth & Session Context              |
                    | - RBAC Permissions Matrix             |
                    | - Validation Schemas                  |
                    | - Audit Event Dispatcher              |
                    | - Database & Storage Adapter          |
                    +-------------------+-------------------+
                                        |
                                        v
                    +---------------------------------------+
                    |          Persistence Layer            |
                    | - Supabase PostgreSQL (Production)    |
                    | - LocalStorage / Offline Cache        |
                    +---------------------------------------+
```

---

## 2. Directory Layout Rationale
* **`src/app/`**: Application routing shells, route layouts, authentication guards, and route wrappers.
* **`src/components/layout/`**: Global shells including top bar, collapsible sidebar, notifications tray, and breadcrumb trails.
* **`src/components/ui/`**: Atomic, design-system-aligned headless primitives (`Button`, `Card`, `Badge`, `Modal`, `Input`, `Select`).
* **`src/components/shared/`**: Composite cross-cutting components (`ConfirmDialog`, `ToastContainer`, `StatusIndicator`).
* **`src/features/<feature>/`**: Autonomous, self-contained business domain modules containing domain components, services, and queries.
* **`src/lib/`**: Foundational, reusable business utilities:
  * `lib/auth/`: Token handling, session persistence, login/logout providers.
  * `lib/permissions/`: RBAC enforcement helpers (`canAccess(user, permission)`).
  * `lib/db/`: Data access adapter connecting to Supabase with local-first offline support.
  * `lib/audit/`: Central audit logger for enterprise security and traceability.
  * `lib/validation/`: Input constraint validators.
  * `lib/utils/`: Currency, date formatting, and math utilities.
* **`src/types/`**: Central TypeScript and JSDoc entity models.

---

## 3. Data Flow & State Management
1. **Local-First Resilience**: All business state is instantly reflected in memory with reactive UI updates.
2. **Persistence Adapter**: Changes are dispatched through `lib/db/` which synchronously commits to local storage and asynchronously dispatches updates to Supabase PostgreSQL when online.
3. **Optimistic Locking**: Critical inventory updates prevent race conditions and stockout discrepancies via server-enforced database checks.
