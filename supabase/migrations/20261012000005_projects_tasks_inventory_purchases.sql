-- Migration: 20261012000005_projects_tasks_inventory_purchases.sql
-- Description: Projects, Tasks Kanban, Inventory Products, Auditable Stock Movements, Warehouses, Suppliers, and Purchasing Pipeline

-- 1. Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_code TEXT NOT NULL,
    name TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT,
    manager_id TEXT,
    manager_name TEXT,
    start_date DATE,
    end_date DATE,
    budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Planning', -- 'Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'
    description TEXT,
    progress_pct INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_project_code UNIQUE (company_id, project_code)
);

-- 2. Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_code TEXT NOT NULL,
    name TEXT NOT NULL,
    assigned_employee_id TEXT,
    assigned_employee_name TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
    start_date DATE,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'To Do', -- 'To Do', 'In Progress', 'Review', 'Completed'
    description TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    city TEXT,
    capacity INTEGER NOT NULL DEFAULT 10000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_warehouse_code UNIQUE (company_id, code)
);

-- 4. Inventory Suppliers
CREATE TABLE IF NOT EXISTS inventory_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_id TEXT,
    payment_terms TEXT DEFAULT 'Net 30',
    status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Inactive'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_supplier_code UNIQUE (company_id, code)
);

-- 5. Inventory Products & Master Catalog
CREATE TABLE IF NOT EXISTS inventory_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    brand TEXT,
    unit TEXT NOT NULL DEFAULT 'Units',
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 10,
    supplier_id UUID REFERENCES inventory_suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    warehouse_name TEXT,
    status TEXT NOT NULL DEFAULT 'In Stock', -- 'In Stock', 'Low Stock', 'Out of Stock'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_product_sku UNIQUE (company_id, sku),
    CONSTRAINT chk_stock_non_negative CHECK (current_stock >= 0)
);

-- 6. Stock Movements (Immutable Auditable Ledger)
CREATE TABLE IF NOT EXISTS inventory_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    movement_number TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Stock In', 'Stock Out', 'Adjustment', 'Transfer'
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    source_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    destination_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    reference TEXT,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Purchase Orders & Purchasing Pipeline
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    po_number TEXT NOT NULL,
    supplier_id UUID NOT NULL REFERENCES inventory_suppliers(id) ON DELETE RESTRICT,
    supplier_name TEXT NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status TEXT NOT NULL DEFAULT 'Purchase Request', -- 'Purchase Request', 'Purchase Order', 'Goods Received', 'Invoiced', 'Paid', 'Cancelled'
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'Unpaid', -- 'Unpaid', 'Partially Paid', 'Paid'
    received_at TIMESTAMPTZ,
    received_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    grn_number TEXT,
    supplier_invoice_number TEXT,
    journal_entry_id TEXT,
    payment_journal_entry_id TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_po_number UNIQUE (company_id, po_number)
);

-- 8. Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID REFERENCES inventory_products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_status ON tasks(company_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_products_company ON inventory_products(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON inventory_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);

-- Row Level Security (RLS) Setup
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_tenant_isolation" ON projects
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "tasks_tenant_isolation" ON tasks
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "warehouses_tenant_isolation" ON warehouses
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "inventory_suppliers_tenant_isolation" ON inventory_suppliers
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "inventory_products_tenant_isolation" ON inventory_products
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "inventory_stock_movements_tenant_isolation" ON inventory_stock_movements
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "purchase_orders_tenant_isolation" ON purchase_orders
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "purchase_order_items_tenant_isolation" ON purchase_order_items
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );
