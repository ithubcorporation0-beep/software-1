import { NextResponse } from "next/server";
import { getCurrentUser, requireCompanyMembership } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Employees" | "Customers" | "Invoices" | "Expenses" | "Finance" | "Products" | "Projects" | "Tasks" | "Suppliers";
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

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim().toLowerCase();
    const companyId = searchParams.get("companyId") || DEFAULT_COMPANY_ID;

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

    if ("product".includes(query) || "item".includes(query) || "sku".includes(query)) {
      results.push({
        id: "mod-product",
        title: "Product Catalog",
        subtitle: "Not available until Inventory module is enabled (Phase 2)",
        category: "Products",
        badge: "Phase 2",
        isAvailable: false,
      });
    }

    if ("project".includes(query) || "milestone".includes(query)) {
      results.push({
        id: "mod-project",
        title: "Capital Projects",
        subtitle: "Not available until PMO module is enabled (Phase 4)",
        category: "Projects",
        badge: "Phase 4",
        isAvailable: false,
      });
    }

    if ("task".includes(query) || "todo".includes(query)) {
      results.push({
        id: "mod-task",
        title: "Workflow Tasks",
        subtitle: "Not available until Task Management is enabled (Phase 4)",
        category: "Tasks",
        badge: "Phase 4",
        isAvailable: false,
      });
    }

    if ("supplier".includes(query) || "vendor".includes(query)) {
      results.push({
        id: "mod-supplier",
        title: "Supplier Directory",
        subtitle: "Not available until Procurement module is enabled (Phase 2)",
        category: "Suppliers",
        badge: "Phase 2",
        isAvailable: false,
      });
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Search failed" }, { status: 500 });
  }
}
