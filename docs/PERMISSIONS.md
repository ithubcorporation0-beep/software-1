# 🔐 IT-HUB ERP — Permissions & RBAC Matrix

## 1. System Roles
IT-HUB ERP enforces fine-grained Role-Based Access Control (RBAC).

1. **`SUPER_ADMIN`**: Full administrative access across all organizational data, settings, user permissions, and audit logs.
2. **`FINANCE_MANAGER`**: Financial books, journal ledger, invoicing, accounts payable/receivable, payroll authorization.
3. **`INVENTORY_MANAGER`**: Master SKU management, warehouse allocations, receiving and dispatching stock, stock adjustments.
4. **`SALES_DIRECTOR`**: CRM, customer relationships, quote approval, sales orders, fulfillment tracking.
5. **`HR_MANAGER`**: Employee records, department hierarchies, attendance, onboarding/offboarding, leave requests.
6. **`OPERATIONS_STAFF`**: Day-to-day barcode scanning, logging movements, view-only catalog access.
7. **`VIEWER`**: Read-only oversight and reports.

---

## 2. Permissions Matrix

| Resource / Action | SUPER_ADMIN | FINANCE_MGR | INVENTORY_MGR | SALES_DIR | HR_MGR | OPS_STAFF |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Inventory: View Catalog** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Inventory: Create / Edit SKU** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Inventory: Delete SKU** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Inventory: Record Stock In/Out** | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Inventory: Adjust Stock Audit** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Warehouses: Manage Facilities** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Suppliers: Manage Directory** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CRM: Manage Customers** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Sales: Issue Invoices / Orders** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Finance: General Ledger** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **HR: Manage Employees** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Payroll: Run Disbursements** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Audit Logs: Full Inspection** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Enforcement in Frontend & API
* **Client Guard**: Presentational components consult `canAccess(user, 'inventory.create_sku')` to conditionally render action buttons.
* **Service Guard**: Domain services in `src/features/*/services/` validate session credentials before invoking state transitions.
* **Database RLS**: Supabase Row-Level Security policies strictly enforce row tenant isolation based on `auth.uid()`.
