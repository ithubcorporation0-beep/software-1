import { NextResponse } from "next/server";
import { getCurrentUser, requireCompanyMembership, getUserMemberships } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/auth/rate-limiter";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Employees" | "Customers" | "Invoices" | "Expenses" | "Finance" | "Payroll" | "Products" | "Projects" | "Tasks" | "Suppliers";
  href?: string;
  badge?: string;
  isAvailable: boolean;
}

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: 60 searches per minute per user
    const rateCheck = checkRateLimit(`search:${user.id}`, {
      maxRequests: 60,
      windowMs: 60 * 1000,
    });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many search requests. Please slow down." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim().toLowerCase();
    
    const requestedCompanyId = searchParams.get("companyId");
    let companyId: string;
    if (requestedCompanyId) {
      companyId = requestedCompanyId;
    } else if (user.is_super_admin) {
      companyId = DEFAULT_COMPANY_ID;
    } else {
      const memberships = await getUserMemberships(user.id);
      companyId = memberships[0]?.company_id || DEFAULT_COMPANY_ID;
    }

    // Enforce tenant scoping and authorization (fails closed if user not member)
    const context = await requireCompanyMembership(companyId, user);
    const permissions = context.permissions;
    const isSuper = user.is_super_admin || permissions.includes("*");

    const results: SearchResultItem[] = [];

    // 1. Navigation items (Permission-checked)
    const navItems = [
      { id: "nav-dash", title: "Executive Operations Dashboard", subtitle: "Overview and real-time tenant KPIs", category: "Navigation" as const, href: "/", perm: null },
      { id: "nav-settings", title: "Company Settings & Governance", subtitle: "Legal profile, numbering, and fiscal options", category: "Navigation" as const, href: "/settings?tab=company", perm: "settings:view" },
      { id: "nav-users", title: "User Roster & Administration", subtitle: "Members, invitations, and role management", category: "Navigation" as const, href: "/settings?tab=users", perm: "users:view" },
      { id: "nav-roles", title: "Roles & Custom Permissions", subtitle: "RBAC security policies and role builder", category: "Navigation" as const, href: "/settings?tab=roles", perm: "roles:view" },
      { id: "nav-audit", title: "Cryptographic Audit Trail", subtitle: "Immutable system activity and login logs", category: "Navigation" as const, href: "/settings?tab=audit", perm: "audit:view" },
      { id: "nav-inventory", title: "Inventory & Warehouses", subtitle: "Stock valuation, catalog SKUs, and bin tracking", category: "Navigation" as const, href: "/inventory", perm: "inventory:view" },
      { id: "nav-crm", title: "CRM & Customers", subtitle: "Commercial accounts, leads, and client directory", category: "Navigation" as const, href: "/crm", perm: "crm:view" },
      { id: "nav-sales", title: "Sales Orders & Quotes", subtitle: "Order fulfillment and pricing pipelines", category: "Navigation" as const, href: "/sales", perm: "sales:view" },
      { id: "nav-finance", title: "General Ledger & Accounting", subtitle: "GAAP balance sheets and financial statements", category: "Navigation" as const, href: "/finance", perm: "finance:view" },
      { id: "nav-hr", title: "Personnel & Payroll", subtitle: "Staff roster, compensation, and PTO requests", category: "Navigation" as const, href: "/hr", perm: "hr:view" },
      { id: "nav-projects", title: "PMO Capital Projects", subtitle: "Strategic project milestones and Gantt delivery", category: "Navigation" as const, href: "/projects", perm: "projects:view" },
    ];

    for (const item of navItems) {
      if (!item.perm || isSuper || permissions.includes(item.perm)) {
        if (!query || item.title.toLowerCase().includes(query) || item.subtitle.toLowerCase().includes(query)) {
          results.push({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            category: item.category,
            href: item.href,
            isAvailable: true,
          });
        }
      }
    }

    // 2. Real Live Employees & Members (Tenant-scoped)
    if (isSuper || permissions.includes("users:view")) {
      const supabase = await createClient();
      const { data: members } = await supabase
        .from("memberships")
        .select(`
          id,
          status,
          profile:profiles(id, full_name, email),
          role:roles(name)
        `)
        .eq("company_id", companyId)
        .limit(20);

      for (const m of members || []) {
        const name = (m.profile as any)?.full_name || "Enterprise Member";
        const email = (m.profile as any)?.email || "";
        const roleName = (m.role as any)?.name || "Member";

        if (!query || name.toLowerCase().includes(query) || email.toLowerCase().includes(query) || roleName.toLowerCase().includes(query)) {
          results.push({
            id: `emp-${m.id}`,
            title: name,
            subtitle: `${email} • Role: ${roleName}`,
            category: "Employees",
            badge: m.status,
            href: "/settings?tab=users",
            isAvailable: true,
          });
        }
      }

      try {
        const { getHREmployees } = await import("@/lib/hr/server");
        const hrList = await getHREmployees(companyId, { search: query }, user);
        for (const hr of hrList.slice(0, 5)) {
          results.push({
            id: `hremp-${hr.id}`,
            title: hr.full_name,
            subtitle: `${hr.employee_id} • ${hr.position} • ${hr.department_name || "Staff"}`,
            category: "Employees",
            badge: hr.employment_status,
            href: "/hr",
            isAvailable: true,
          });
        }
      } catch {
        // Fall through
      }
    }

    // 3. Real Live CRM Customers (Tenant-scoped & Permission-checked)
    if (isSuper || permissions.includes("crm:view")) {
      try {
        const { getCustomers } = await import("@/lib/crm/server");
        const { data: customerList } = await getCustomers(companyId, { search: query, pageSize: 10 });
        for (const cust of customerList) {
          results.push({
            id: `cust-${cust.id}`,
            title: cust.name,
            subtitle: `${cust.company_name ? cust.company_name + " • " : ""}${cust.customer_code} • ${cust.status}`,
            category: "Customers",
            badge: cust.customer_type,
            href: `/crm/customers/${cust.id}`,
            isAvailable: true,
          });
        }
      } catch {
        // Fall through
      }
    }

    // 4. Real Live Sales Invoices (Tenant-scoped & Permission-checked)
    if (isSuper || permissions.includes("sales:view") || permissions.includes("finance:view")) {
      try {
        const { getInvoices } = await import("@/lib/sales/server");
        const invoiceList = await getInvoices(companyId, { search: query });
        for (const inv of invoiceList.slice(0, 10)) {
          results.push({
            id: `inv-${inv.id}`,
            title: `Invoice ${inv.invoice_number}`,
            subtitle: `${inv.customer?.name ? inv.customer.name + " • " : ""}$${inv.grand_total.toFixed(2)} • Due: $${inv.amount_due.toFixed(2)}`,
            category: "Invoices",
            badge: inv.status,
            href: `/sales/invoices/${inv.id}`,
            isAvailable: true,
          });
        }
      } catch {
        // Fall through
      }
    }

    // 5. Real Live Expenses & General Ledger (Tenant-scoped & Permission-checked)
    if (isSuper || permissions.includes("finance:view") || permissions.includes("finance.read")) {
      try {
        const { getExpenses, getAccounts } = await import("@/lib/finance/server");
        const expenseList = await getExpenses(companyId, { search: query });
        for (const exp of expenseList.slice(0, 5)) {
          results.push({
            id: `exp-${exp.id}`,
            title: `Expense ${exp.expense_number}: ${exp.vendor}`,
            subtitle: `${exp.category} • $${exp.amount.toFixed(2)} • ${exp.description}`,
            category: "Expenses",
            badge: exp.approval_status,
            href: "/finance",
            isAvailable: true,
          });
        }

        const accountList = await getAccounts(companyId);
        for (const acc of accountList.filter((a) => a.code.includes(query) || a.name.toLowerCase().includes(query)).slice(0, 5)) {
          results.push({
            id: `acc-${acc.id}`,
            title: `Account [${acc.code}] ${acc.name}`,
            subtitle: `${acc.account_type} • ${acc.description || "General Ledger Account"}`,
            category: "Finance",
            badge: acc.account_type,
            href: "/finance",
            isAvailable: true,
          });
        }
      } catch {
        // Fall through
      }
    }

    // 6. Real Live Payroll Runs (Tenant-scoped & Permission-checked - Never exposes raw salary amounts to unauthorized roles)
    if (isSuper || permissions.includes("payroll.read") || permissions.includes("payroll.admin") || permissions.includes("*")) {
      try {
        const { getPayrollRuns } = await import("@/lib/payroll/server");
        const payrollRuns = await getPayrollRuns(companyId, {}, user);
        for (const run of payrollRuns.slice(0, 5)) {
          if (!query || run.run_number.toLowerCase().includes(query) || run.status.toLowerCase().includes(query)) {
            results.push({
              id: `pay-${run.id}`,
              title: `Payroll ${run.run_number}`,
              subtitle: `Period: ${run.period_start} to ${run.period_end} • ${run.employee_count} Employees`,
              category: "Payroll",
              badge: run.status,
              href: "/payroll",
              isAvailable: true,
            });
          }
        }
      } catch {
        // Fall through
      }
    }

    // 7. Real Live Projects & Tasks (Tenant-scoped & Permission-checked)
    if (isSuper || permissions.includes("projects.read") || permissions.includes("*")) {
      try {
        const { getProjects, getTasks } = await import("@/lib/projects/server");
        const projectList = await getProjects(companyId, { search: query }, user);
        for (const prj of projectList.slice(0, 5)) {
          results.push({
            id: `prj-${prj.id}`,
            title: `Project: ${prj.name} (${prj.project_code})`,
            subtitle: `Status: ${prj.status} • Budget: $${(prj.budget || 0).toLocaleString()} • ${prj.progress_pct || 0}% Complete`,
            category: "Projects",
            badge: prj.status,
            href: "/projects",
            isAvailable: true,
          });
        }

        const taskList = await getTasks(companyId, { search: query }, user);
        for (const t of taskList.slice(0, 5)) {
          results.push({
            id: `tsk-${t.id}`,
            title: `Task: ${t.name} (${t.task_code})`,
            subtitle: `Priority: ${t.priority} • Status: ${t.status} • Assigned: ${t.assigned_employee_name || "Unassigned"}`,
            category: "Tasks",
            badge: t.priority,
            href: "/projects",
            isAvailable: true,
          });
        }
      } catch {
        // Fall through
      }
    }

    // 8. Real Live Products, Suppliers, & Purchase Orders (Tenant-scoped & Permission-checked)
    if (isSuper || permissions.includes("inventory.read") || permissions.includes("purchases.read") || permissions.includes("*")) {
      try {
        const { getProducts, getSuppliers } = await import("@/lib/inventory/server");
        const productList = await getProducts(companyId, { search: query });
        for (const prod of productList.slice(0, 5)) {
          results.push({
            id: `prod-${prod.id}`,
            title: `Product: ${prod.name} (SKU: ${prod.sku})`,
            subtitle: `Stock: ${prod.current_stock} ${prod.unit} • Price: $${prod.selling_price.toFixed(2)} • ${prod.status}`,
            category: "Products",
            badge: prod.status,
            href: "/inventory",
            isAvailable: true,
          });
        }

        const supplierList = await getSuppliers(companyId, { search: query });
        for (const sup of supplierList.slice(0, 5)) {
          results.push({
            id: `sup-${sup.id}`,
            title: `Supplier: ${sup.name} (${sup.code})`,
            subtitle: `${sup.company_name || ""} • Terms: ${sup.payment_terms} • ${sup.status}`,
            category: "Suppliers",
            badge: sup.status,
            href: "/inventory",
            isAvailable: true,
          });
        }
      } catch {
        // Fall through
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Search failed" }, { status: 500 });
  }
}
