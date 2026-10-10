# 🔐 IT-HUB ERP — Permissions & RBAC Matrix

## 1. System Roles Overview
IT-HUB ERP enforces fine-grained Role-Based Access Control (RBAC) across multi-tenant enterprise companies.

1. **`Super Admin` (`super_admin`)**: Global platform governance across all companies, subscription management, security oversight, and unrestricted access (`*`).
2. **`Admin` (`admin`)**: Primary company tenant administrator with full authority over users, custom roles, settings, and company-owned modules.
3. **`Manager` (`manager`)**: Operational leader managing inventory logistics, sales pipelines, projects, and supply chain fulfillment.
4. **`Accountant` (`accountant`)**: Financial controller managing General Ledger, invoicing, accounts payable/receivable, and payroll disbursements.
5. **`HR Manager` (`hr_manager`)**: Human capital director overseeing employee records, leave approvals, and payroll preparation.
6. **`Employee` (`employee`)**: Standard team member with view access to catalog, projects, and personal records.
7. **`Customer` (`customer`)**: External commercial client portal account restricted to viewing own quotes, orders, and payment statuses.

---

## 2. Granular Permissions Matrix

| Resource & Action | Super Admin | Admin | Manager | Accountant | HR Manager | Employee | Customer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Inventory: View** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Inventory: Create / Edit** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Inventory: Delete** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Inventory: Export** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Inventory: Approve (Scrap/Audit)** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CRM: View Accounts** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Self Only |
| **CRM: Create / Edit Accounts** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CRM: Approve Credit Terms** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Sales: View Orders** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Self Only |
| **Sales: Create / Edit Orders** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Sales: Approve Orders** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Finance: View Ledger & P&L** | ✅ | ✅ | View Only | ✅ | ❌ | ❌ | ❌ |
| **Finance: Post Journals & Bills** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Finance: Approve Payments** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Payroll: View Pay Runs** | ✅ | ✅ | ❌ | ✅ | ✅ | Self Only | ❌ |
| **Payroll: Calculate & Edit** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Payroll: Approve Disbursement** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **HR: View Employees** | ✅ | ✅ | View Only | ❌ | ✅ | Directory | ❌ |
| **HR: Onboard / Edit Staff** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **HR: Approve Leave (PTO)** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Projects: View & Edit** | ✅ | ✅ | ✅ | ❌ | View Only | View Only | ❌ |
| **Projects: Approve Milestones** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Users: Invite & Manage Roles** | ✅ | ✅ | ❌ | ❌ | Invite Only | ❌ | ❌ |
| **Roles: Create Custom Roles** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Settings: Edit Company Policy** | ✅ | ✅ | ❌ | View Only | ❌ | ❌ | ❌ |
| **Audit Logs: Full Inspection** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Custom Roles Creation Rules
Tenants can define custom roles (e.g. `"Warehouse Lead"`, `"Billing Specialist"`) with safety constraints:
1. **No Accidental Privilege Escalation**: Custom roles must have `is_system = FALSE` and `company_id = <tenant_uuid>`.
2. **Restricted Admin Grant**: A tenant administrator cannot assign permissions exceeding their own company privileges (e.g., they cannot grant `*` or create global roles).
3. **Immutability of System Roles**: System roles (`company_id IS NULL`) cannot be deleted or mutated by tenant administrators.

---

## 4. Multi-Layer Enforcement Architecture
1. **Database Tier (PostgreSQL RLS)**:
   All queries evaluate `has_company_permission(company_id, perm_code)` and `company_id IN (SELECT user_company_ids())`.
2. **Server Tier (Next.js Server Actions & Route Handlers)**:
   Server-side authorization helpers fail closed:
   ```ts
   await requirePermission(companyId, "inventory:delete");
   ```
3. **Presentation Tier (React UI Components)**:
   Controls and action buttons conditionally render based on verified membership context.
