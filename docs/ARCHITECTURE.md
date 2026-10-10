# 🏗️ IT-HUB ERP — System Architecture Specification

## 1. High-Level Architectural Pattern
IT-HUB ERP utilizes a **Feature-Driven Domain Architecture** on top of **Next.js App Router (React 19)**, TypeScript, Tailwind CSS, and headless design system primitives. Presentational components are isolated from data access, business calculations, and authorization rules.

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
                    | - Local-First Offline Cache           |
                    +-------------------+-------------------+
```

---

## 2. Directory Layout Rationale
* **`src/app/`**: Next.js App Router routes, layouts, and error boundaries:
  * `src/app/(erp)/layout.tsx`: SaaS ERP shell containing fixed desktop sidebar, sticky top header, mobile drawer, and main scroll area.
  * `src/app/(erp)/page.tsx`: Executive Operations Radar with authentic skeleton placeholders and zero fake figures.
  * `src/app/(erp)/[module]/page.tsx`: Navigation routes for all PRD modules displaying honest `ComingSoonModule` roadmap cards.
  * `src/app/not-found.tsx`: Accessible 404 handler.
  * `src/app/error.tsx`: Route error boundary with retry capability.
  * `src/app/global-error.tsx`: Root fatal fault boundary.
* **`src/components/layout/`**: Enterprise SaaS shell elements:
  * `sidebar.tsx`: Collapsible left navigation with grouped sections, tenant branding, and phase badges.
  * `header.tsx`: Sticky top bar with workspace context, universal search command entry (`Ctrl+K`), notifications, and user role menu.
  * `mobile-nav.tsx`: Accessible mobile navigation drawer with backdrop blur, focus trap, and Escape key dismissal.
  * `global-search-dialog.tsx`: Fast universal command palette for jumping between modules.
  * `notifications-popover.tsx`: System alert tray with unread badge and audit records.
  * `user-menu.tsx`: Role switcher, theme toggle (Obsidian Dark / Light), and profile settings.
  * `page-header.tsx`: Standard page title, description, dynamic breadcrumb trail, and action buttons.
  * `content-layout.tsx`: Responsive container with standardized padding.
* **`src/components/ui/`**: Atomic, accessible design system primitives:
  * `Button`: Variants (`default`, `secondary`, `outline`, `ghost`, `destructive`, `link`), loading spinner, disabled states.
  * `Input`: Accessible labels, error messages, and helper text with ARIA descriptors.
  * `Badge`: Semantic statuses (`default`, `secondary`, `success`, `warning`, `info`, `destructive`, `outline`).
  * `Card`: Standardized surface elevations and headers.
  * `Dialog`: Modal dialogs with Escape listener and focus retention.
  * `Dropdown`: Click-outside and keyboard-navigable popovers.
  * `Table`: Accessible tabular data display with responsive horizontal scroll.
  * `Skeleton`: Pulsing placeholders for genuine loading and schema demonstration.
  * `EmptyState`: Zero-data screens with icon, description, and primary CTA.
  * `ErrorState`: Operation failure state with retry trigger.
  * `Breadcrumbs`: Screen-reader-friendly navigational path trail.
* **`src/components/shared/`**: Composite cross-cutting components:
  * `ComingSoonModule`: Honest placeholder for future modules showing roadmap phase, planned capabilities, and schema contracts.
* **`src/features/<feature>/`**: Autonomous, self-contained business domain modules.
* **`src/lib/`**: Foundational, reusable business utilities:
  * `lib/auth/`: Token handling, session persistence.
  * `lib/permissions/`: RBAC enforcement helpers (`RbacService.hasPermission(role, permission)`).
  * `lib/db/`: Data access adapter connecting to Supabase with local-first offline support.
  * `lib/utils.ts`: Class merge helper (`cn`), currency formatter, date formatter.
* **`src/types/`**: Central TypeScript models and permission contracts.

---

## 3. Design System & Accessibility (WCAG 2.1 AA)
1. **Neutral Surfaces**: HSL-based slate and zinc palette providing soft contrast without harsh saturation.
2. **Restrained Brand Accent**: Sapphire/indigo primary token (`hsl(221, 83%, 53%)`) used selectively for active states and primary actions.
3. **Focus States**: High-visibility `:focus-visible` outline rings with 2px offset for keyboard accessibility.
4. **Contrast**: Text elements adhere to >= 4.5:1 contrast ratios across both dark and light themes.

---

## 4. Phase Rollout Architecture
| Module | Code | Target Phase | Status in Phase 1 |
| :--- | :--- | :--- | :--- |
| **Executive Radar** | `DSH` | Phase 1 | **Active** (Skeleton & Foundation layout) |
| **Inventory & Stock** | `INV` | Phase 2 | Scheduled (Coming Soon state) |
| **CRM & Accounts** | `CRM` | Phase 2 | Scheduled (Coming Soon state) |
| **Sales Orders** | `SLS` | Phase 2 | Scheduled (Coming Soon state) |
| **Projects & PMO** | `PRJ` | Phase 3 | Scheduled (Coming Soon state) |
| **Finance & Ledger** | `FIN` | Phase 3 | Scheduled (Coming Soon state) |
| **Payroll Engine** | `PAY` | Phase 3 | Scheduled (Coming Soon state) |
| **HR & Directory** | `HR` | Phase 4 | Scheduled (Coming Soon state) |
| **Reports & Audits** | `REP` | Phase 4 | Scheduled (Coming Soon state) |
| **System Settings** | `SET` | Phase 4 | Scheduled (Coming Soon state) |
