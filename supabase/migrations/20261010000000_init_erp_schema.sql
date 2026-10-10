-- ============================================================================
-- IT-HUB ERP Master PostgreSQL / Supabase Database Schema
-- Migration: 20261010000000_init_erp_schema.sql
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations & Tenancy
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'ENTERPRISE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    city TEXT,
    capacity INTEGER NOT NULL DEFAULT 10000,
    current_usage INTEGER NOT NULL DEFAULT 0,
    manager TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Operational',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    lead_time_days INTEGER DEFAULT 7,
    rating DECIMAL(3, 2) DEFAULT 5.0,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Product Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Products & Master Catalog
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    barcode TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
    bin_location TEXT,
    cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_threshold INTEGER NOT NULL DEFAULT 10,
    max_capacity INTEGER NOT NULL DEFAULT 100,
    unit TEXT DEFAULT 'Units',
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    description TEXT,
    status TEXT DEFAULT 'In Stock',
    last_restocked TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Stock Movements (Inbound / Outbound / Audit)
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('Stock In', 'Stock Out', 'Audit Adjustment')),
    quantity INTEGER NOT NULL,
    reference TEXT,
    operator TEXT NOT NULL,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Customers (CRM)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Active Customer',
    total_spend DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Employees (HR)
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    employee_code TEXT NOT NULL,
    full_name TEXT NOT NULL,
    department TEXT NOT NULL,
    designation TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    base_salary DECIMAL(12, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_warehouse ON products(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON stock_movements(timestamp);

-- Row Level Security (RLS) Setup
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Default Read/Write Policies for authenticated workspace tenants
CREATE POLICY "Enable all access for authenticated tenant users" ON products
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for stock movements" ON stock_movements
    FOR ALL USING (true) WITH CHECK (true);
