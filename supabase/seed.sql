-- ============================================================================
-- IT-HUB ERP Master Seed Data
-- ============================================================================

-- 1. Organization
INSERT INTO organizations (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'IT-HUB Global Technologies Corp', 'it-hub-global', 'ENTERPRISE')
ON CONFLICT DO NOTHING;

-- 2. Warehouses
INSERT INTO warehouses (id, organization_id, code, name, city, capacity, current_usage, manager, email, phone, status) VALUES
('wh-1', '00000000-0000-0000-0000-000000000001', 'WH-DAL-01', 'Central Logistics Hub', 'Dallas, TX', 25000, 19420, 'Sarah Jenkins', 's.jenkins@nexus-erp.corp', '+1 (214) 555-0192', 'Operational'),
('wh-2', '00000000-0000-0000-0000-000000000001', 'WH-NJ-02', 'East Coast Distribution Center', 'Newark, NJ', 18000, 14200, 'Marcus Vance', 'm.vance@nexus-erp.corp', '+1 (973) 555-0841', 'Operational'),
('wh-3', '00000000-0000-0000-0000-000000000001', 'WH-LA-03', 'Pacific Freight Depot', 'Long Beach, CA', 32000, 28900, 'Elena Rostova', 'e.rostova@nexus-erp.corp', '+1 (562) 555-4412', 'High Utilization'),
('wh-4', '00000000-0000-0000-0000-000000000001', 'WH-AMS-04', 'European Gateway Depot', 'Amsterdam, NL', 15000, 6800, 'Lukas van Dijk', 'l.vandijk@nexus-erp.corp', '+31 20 555 3180', 'Operational')
ON CONFLICT (id) DO NOTHING;

-- 3. Categories
INSERT INTO categories (id, organization_id, name, code, color) VALUES
('cat-1', '00000000-0000-0000-0000-000000000001', 'Electronics & Compute', 'ELEC', '#00e5ff'),
('cat-2', '00000000-0000-0000-0000-000000000001', 'Industrial Robotics', 'ROBO', '#7c4dff'),
('cat-3', '00000000-0000-0000-0000-000000000001', 'Optics & Display', 'OPTC', '#ff9100'),
('cat-4', '00000000-0000-0000-0000-000000000001', 'Power & Storage', 'POWR', '#00e676'),
('cat-5', '00000000-0000-0000-0000-000000000001', 'Structural Alloys', 'MATL', '#ff1744'),
('cat-6', '00000000-0000-0000-0000-000000000001', 'Network & Comms', 'NETW', '#2979ff')
ON CONFLICT (id) DO NOTHING;

-- 4. Suppliers
INSERT INTO suppliers (id, organization_id, code, name, category, contact_person, email, phone, lead_time_days, rating, status) VALUES
('sup-1', '00000000-0000-0000-0000-000000000001', 'SUP-APEX', 'Apex Semiconductor Systems', 'Electronics & Compute', 'David Chen', 'procurement@apex-semi.com', '+1 (408) 555-7890', 7, 4.9, 'Active'),
('sup-2', '00000000-0000-0000-0000-000000000001', 'SUP-KUKA', 'Kuka Dynamic Robotics Ltd', 'Industrial Robotics', 'Heidi Bauer', 'supply@kuka-dynamics.de', '+49 89 555 4910', 14, 4.8, 'Active'),
('sup-3', '00000000-0000-0000-0000-000000000001', 'SUP-PHOT', 'Photonix Laser & Optics Corp', 'Optics & Display', 'Kenji Takahashi', 'orders@photonix-jp.com', '+81 3 5555 0182', 10, 4.7, 'Active'),
('sup-4', '00000000-0000-0000-0000-000000000001', 'SUP-TITN', 'Titanium Dynamics & Alloys', 'Structural Alloys', 'Robert Sterling', 'sales@titandynamics.com', '+1 (312) 555-9011', 21, 4.5, 'Active'),
('sup-5', '00000000-0000-0000-0000-000000000001', 'SUP-VOLT', 'Voltaic Cell Innovations', 'Power & Storage', 'Camille Laurent', 'contact@voltaic-battery.fr', '+33 1 44 55 66 77', 12, 4.9, 'Active')
ON CONFLICT (id) DO NOTHING;

-- 5. Products
INSERT INTO products (id, organization_id, sku, barcode, name, category, warehouse_id, bin_location, cost_price, selling_price, current_stock, min_threshold, max_capacity, unit, supplier_id, description, status) VALUES
('prod-101', '00000000-0000-0000-0000-000000000001', 'ELEC-GPU-H100', '793847291048', 'Neural Accelerator Core H100', 'Electronics & Compute', 'wh-1', 'Aisle 04 // Shelf B-12', 4200.00, 5850.00, 42, 15, 100, 'Units', 'sup-1', 'High performance enterprise compute module for neural synthesis and AI inference.', 'In Stock'),
('prod-102', '00000000-0000-0000-0000-000000000001', 'ROBO-ARM-6DOF', '793847291055', '6-Axis Articulated Servo Arm', 'Industrial Robotics', 'wh-1', 'Bay 02 // Rack R-09', 8500.00, 12400.00, 6, 10, 30, 'Sets', 'sup-2', 'Precision kinematics industrial robot manipulator with sub-millimeter repeatable accuracy.', 'Low Stock'),
('prod-103', '00000000-0000-0000-0000-000000000001', 'OPTC-LIDAR-4K', '793847291062', 'Solid-State LiDAR Scanner 4K', 'Optics & Display', 'wh-3', 'Aisle 01 // Shelf C-04', 1250.00, 1890.00, 3, 12, 60, 'Units', 'sup-3', '360-degree autonomous navigation sensor with 250m detection range and dual-echo return.', 'Critical Low'),
('prod-104', '00000000-0000-0000-0000-000000000001', 'POWR-BAT-48V', '793847291079', '48V 100Ah Lithium Iron Titanate Pack', 'Power & Storage', 'wh-2', 'Vault 03 // Tier T-01', 920.00, 1450.00, 58, 20, 120, 'Packs', 'sup-5', 'Ultra high discharge industrial grade energy storage with 6000+ lifecycle durability.', 'In Stock'),
('prod-105', '00000000-0000-0000-0000-000000000001', 'MATL-TI-BAR-50', '793847291086', 'Titanium Grade 5 Extruded Rod (50mm)', 'Structural Alloys', 'wh-3', 'Yard 04 // Section S-15', 180.00, 295.00, 0, 25, 200, 'Bars', 'sup-4', 'Aerospace structural alloy with supreme strength-to-weight ratio and corrosion immunity.', 'Out of Stock')
ON CONFLICT (id) DO NOTHING;

-- 6. Customers (CRM)
INSERT INTO customers (id, organization_id, name, company, email, phone, status, total_spend) VALUES
('cust-1', '00000000-0000-0000-0000-000000000001', 'Alexander Wright', 'Quantum Aerospace Dynamics', 'a.wright@quantumaero.com', '+1 (650) 555-9120', 'Active Customer', 285400.00),
('cust-2', '00000000-0000-0000-0000-000000000001', 'Beatriz Silva', 'BioSynthetix Laboratories', 'b.silva@biosynthetix.io', '+1 (617) 555-8314', 'Active Customer', 142000.00),
('cust-3', '00000000-0000-0000-0000-000000000001', 'Chen Wei', 'Pacific Autonomous Transit', 'chen.wei@pat-transit.sg', '+65 6789 0123', 'Prospect', 0.00)
ON CONFLICT (id) DO NOTHING;

-- 7. Employees (HR)
INSERT INTO employees (id, organization_id, employee_code, full_name, department, designation, email, phone, base_salary, status) VALUES
('emp-1', '00000000-0000-0000-0000-000000000001', 'EMP-1001', 'Sarah Jenkins', 'Logistics & Supply Chain', 'Central Hub Director', 's.jenkins@nexus-erp.corp', '+1 (214) 555-0192', 125000.00, 'Active'),
('emp-2', '00000000-0000-0000-0000-000000000001', 'EMP-1002', 'Marcus Vance', 'Warehouse Operations', 'Site Supervisor', 'm.vance@nexus-erp.corp', '+1 (973) 555-0841', 88000.00, 'Active'),
('emp-3', '00000000-0000-0000-0000-000000000001', 'EMP-1003', 'Elena Rostova', 'Procurement & Logistics', 'Logistics Specialist', 'e.rostova@nexus-erp.corp', '+1 (562) 555-4412', 92000.00, 'Active')
ON CONFLICT (id) DO NOTHING;
