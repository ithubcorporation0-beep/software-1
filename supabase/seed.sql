-- ============================================================================
-- IT-HUB ERP Master Seed Data (Multi-Tenant & Security Testing)
-- ============================================================================

-- 1. Companies / Tenants
INSERT INTO public.companies (id, name, slug, domain, plan, status) VALUES
('00000000-0000-0000-0000-000000000001', 'IT-HUB Global Technologies Corp', 'it-hub-global', 'ithub-enterprise.com', 'ENTERPRISE', 'ACTIVE'),
('00000000-0000-0000-0000-000000000002', 'Apex Autonomous Logistics Ltd', 'apex-logistics', 'apexlogistics.io', 'PROFESSIONAL', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 2. Company Settings
INSERT INTO public.company_settings (company_id, currency, timezone, fiscal_year_start, theme, features) VALUES
('00000000-0000-0000-0000-000000000001', 'USD', 'America/New_York', '01-01', 'obsidian', '{"mfa_enforced": true, "audit_retention_days": 365}'::jsonb),
('00000000-0000-0000-0000-000000000002', 'EUR', 'Europe/Berlin', '04-01', 'slate', '{"mfa_enforced": false, "audit_retention_days": 90}'::jsonb)
ON CONFLICT (company_id) DO NOTHING;

-- 3. Sample Warehouses for Company 1
INSERT INTO public.warehouses (id, organization_id, code, name, city, capacity, current_usage, manager, email, phone, status) VALUES
('wh-1', '00000000-0000-0000-0000-000000000001', 'WH-DAL-01', 'Central Logistics Hub', 'Dallas, TX', 25000, 19420, 'Sarah Jenkins', 's.jenkins@nexus-erp.corp', '+1 (214) 555-0192', 'Operational'),
('wh-2', '00000000-0000-0000-0000-000000000001', 'WH-NJ-02', 'East Coast Distribution Center', 'Newark, NJ', 18000, 14200, 'Marcus Vance', 'm.vance@nexus-erp.corp', '+1 (973) 555-0841', 'Operational'),
('wh-3', '00000000-0000-0000-0000-000000000001', 'WH-LA-03', 'Pacific Freight Depot', 'Long Beach, CA', 32000, 28900, 'Elena Rostova', 'e.rostova@nexus-erp.corp', '+1 (562) 555-4412', 'High Utilization')
ON CONFLICT (id) DO NOTHING;

-- 4. Sample Categories
INSERT INTO public.categories (id, organization_id, name, code, color) VALUES
('cat-1', '00000000-0000-0000-0000-000000000001', 'Electronics & Compute', 'ELEC', '#00e5ff'),
('cat-2', '00000000-0000-0000-0000-000000000001', 'Industrial Robotics', 'ROBO', '#7c4dff'),
('cat-3', '00000000-0000-0000-0000-000000000001', 'Optics & Display', 'OPTC', '#ff9100')
ON CONFLICT (id) DO NOTHING;

-- 5. Sample Products
INSERT INTO public.products (id, organization_id, sku, barcode, name, category, warehouse_id, bin_location, cost_price, selling_price, current_stock, min_threshold, max_capacity, unit, status) VALUES
('prod-101', '00000000-0000-0000-0000-000000000001', 'ELEC-GPU-H100', '793847291048', 'Neural Accelerator Core H100', 'Electronics & Compute', 'wh-1', 'Aisle 04 // Shelf B-12', 4200.00, 5850.00, 42, 15, 100, 'Units', 'In Stock'),
('prod-102', '00000000-0000-0000-0000-000000000001', 'ROBO-ARM-6DOF', '793847291055', '6-Axis Articulated Servo Arm', 'Industrial Robotics', 'wh-1', 'Bay 02 // Rack R-09', 8500.00, 12400.00, 6, 10, 30, 'Sets', 'Low Stock')
ON CONFLICT (id) DO NOTHING;
