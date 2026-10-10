-- ============================================================================
-- IT-HUB ERP — Enterprise Auth, Tenancy, RBAC & Multi-Tenant Security Migration
-- Migration: 20261010000001_auth_tenancy_rbac.sql
-- ============================================================================

-- Ensure pgcrypto extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. COMPANIES / TENANTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    plan TEXT NOT NULL DEFAULT 'ENTERPRISE',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

-- ----------------------------------------------------------------------------
-- 2. USER PROFILES (Linked to Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. ROLES (PRD System Roles & Tenant Custom Roles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT uq_company_role_code UNIQUE NULLS NOT DISTINCT (company_id, code)
);

-- ----------------------------------------------------------------------------
-- 4. PERMISSIONS CATALOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. ROLE PERMISSIONS MAPPING
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- ----------------------------------------------------------------------------
-- 6. COMPANY MEMBERSHIPS (Tenant Access Boundary)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT uq_company_user UNIQUE (company_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 7. COMPANY SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_settings (
    company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    currency TEXT NOT NULL DEFAULT 'USD',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    fiscal_year_start TEXT NOT NULL DEFAULT '01-01',
    theme TEXT NOT NULL DEFAULT 'obsidian',
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID
);

-- ----------------------------------------------------------------------------
-- 8. ENTERPRISE AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_company ON public.memberships(company_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.memberships(status);
CREATE INDEX IF NOT EXISTS idx_roles_company ON public.roles(company_id);
CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- ----------------------------------------------------------------------------
-- 10. SECURITY DEFINER FUNCTIONS (Helper predicates for RLS)
-- ----------------------------------------------------------------------------

-- Check if current authenticated caller is platform super administrator
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_super_admin = TRUE
    );
$$;

-- Returns set of company IDs where the caller has ACTIVE membership
CREATE OR REPLACE FUNCTION public.user_company_ids()
RETURNS TABLE(company_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT m.company_id
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
      AND m.status = 'ACTIVE';
$$;

-- Check if caller has verified permission in specific company
CREATE OR REPLACE FUNCTION public.has_company_permission(comp_id UUID, perm_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    -- Super Admin has universal permission
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- Check if user's role in this specific company has the permission
    RETURN EXISTS (
        SELECT 1
        FROM public.memberships m
        JOIN public.role_permissions rp ON rp.role_id = m.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE m.user_id = auth.uid()
          AND m.company_id = comp_id
          AND m.status = 'ACTIVE'
          AND p.code = perm_code
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) ACTIVATION & POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Companies: Users can only select companies where they are members (or super admin)
CREATE POLICY "Companies viewable by verified members or super admin"
    ON public.companies
    FOR SELECT
    USING (
        id IN (SELECT user_company_ids())
        OR public.is_super_admin()
    );

CREATE POLICY "Companies mutable only by super admin or tenant admins"
    ON public.companies
    FOR UPDATE
    USING (
        public.is_super_admin()
        OR (id IN (SELECT user_company_ids()) AND public.has_company_permission(id, 'settings:edit'))
    );

-- Profiles: Users can view their own profile and profiles of members in shared companies
CREATE POLICY "Profiles viewable by self and co-members"
    ON public.profiles
    FOR SELECT
    USING (
        id = auth.uid()
        OR public.is_super_admin()
        OR EXISTS (
            SELECT 1 FROM public.memberships m1
            JOIN public.memberships m2 ON m1.company_id = m2.company_id
            WHERE m1.user_id = auth.uid() AND m2.user_id = public.profiles.id
        )
    );

CREATE POLICY "Profiles updateable by self or super admin"
    ON public.profiles
    FOR UPDATE
    USING (id = auth.uid() OR public.is_super_admin());

-- Memberships: Members can see company member roster; only admins can mutate
CREATE POLICY "Memberships viewable by active company members"
    ON public.memberships
    FOR SELECT
    USING (
        company_id IN (SELECT user_company_ids())
        OR public.is_super_admin()
    );

CREATE POLICY "Memberships mutable by company admins or super admin"
    ON public.memberships
    FOR ALL
    USING (
        public.is_super_admin()
        OR public.has_company_permission(company_id, 'users:edit')
    );

-- Roles: Viewable if system role or company-specific role for members
CREATE POLICY "Roles viewable by company members or super admin"
    ON public.roles
    FOR SELECT
    USING (
        company_id IS NULL
        OR company_id IN (SELECT user_company_ids())
        OR public.is_super_admin()
    );

CREATE POLICY "Roles mutable only by authorized role admins"
    ON public.roles
    FOR ALL
    USING (
        public.is_super_admin()
        OR (company_id IS NOT NULL AND public.has_company_permission(company_id, 'roles:edit'))
    );

-- Permissions & Role-Permissions: Readable by all authenticated members
CREATE POLICY "Permissions viewable by authenticated users"
    ON public.permissions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Role permissions viewable by authenticated users"
    ON public.role_permissions
    FOR SELECT
    TO authenticated
    USING (true);

-- Company Settings: Members can view; only admins can edit
CREATE POLICY "Company settings viewable by members"
    ON public.company_settings
    FOR SELECT
    USING (
        company_id IN (SELECT user_company_ids())
        OR public.is_super_admin()
    );

CREATE POLICY "Company settings mutable by settings admins"
    ON public.company_settings
    FOR ALL
    USING (
        public.is_super_admin()
        OR public.has_company_permission(company_id, 'settings:edit')
    );

-- Audit Logs: Viewable only by audit viewers
CREATE POLICY "Audit logs viewable by authorized audit inspectors"
    ON public.audit_logs
    FOR SELECT
    USING (
        public.is_super_admin()
        OR (company_id IN (SELECT user_company_ids()) AND public.has_company_permission(company_id, 'audit:view'))
    );

-- ----------------------------------------------------------------------------
-- 12. SEED DEFAULT PERMISSIONS & PRD SYSTEM ROLES
-- ----------------------------------------------------------------------------

-- Insert Granular Permissions Catalog
INSERT INTO public.permissions (code, resource, action, description) VALUES
    -- Inventory
    ('inventory:view', 'inventory', 'view', 'View product catalog and warehouse stock levels'),
    ('inventory:create', 'inventory', 'create', 'Create new inventory products and SKUs'),
    ('inventory:edit', 'inventory', 'edit', 'Modify existing product metadata, thresholds and bin locations'),
    ('inventory:delete', 'inventory', 'delete', 'Archive or delete products from catalog'),
    ('inventory:export', 'inventory', 'export', 'Export inventory valuation and SKU reports'),
    ('inventory:approve', 'inventory', 'approve', 'Approve major cycle count reconciliation and scrap adjustments'),

    -- CRM & Customers
    ('crm:view', 'crm', 'view', 'View enterprise customer directory and contact records'),
    ('crm:create', 'crm', 'create', 'Add new commercial client accounts and leads'),
    ('crm:edit', 'crm', 'edit', 'Update client credit terms, addresses, and contacts'),
    ('crm:delete', 'crm', 'delete', 'Archive client accounts'),
    ('crm:export', 'crm', 'export', 'Export CRM customer lists'),
    ('crm:approve', 'crm', 'approve', 'Approve commercial credit limit extensions'),

    -- Sales Orders
    ('sales:view', 'sales', 'view', 'View commercial sales orders and price quotes'),
    ('sales:create', 'sales', 'create', 'Generate quotations and commercial sales orders'),
    ('sales:edit', 'sales', 'edit', 'Modify sales order line items and pricing discounts'),
    ('sales:delete', 'sales', 'delete', 'Cancel draft sales orders'),
    ('sales:export', 'sales', 'export', 'Export sales turnover schedules and picking slips'),
    ('sales:approve', 'sales', 'approve', 'Authorize commercial order fulfillment and volume discount approvals'),

    -- Finance & Ledger
    ('finance:view', 'finance', 'view', 'Inspect general ledger, balance sheet, and P&L statements'),
    ('finance:create', 'finance', 'create', 'Post manual journal entries and asset acquisitions'),
    ('finance:edit', 'finance', 'edit', 'Update ledger account classifications'),
    ('finance:delete', 'finance', 'delete', 'Void draft financial records'),
    ('finance:export', 'finance', 'export', 'Export GAAP-compliant financial trial balance and tax schedules'),
    ('finance:approve', 'finance', 'approve', 'Approve high-value disbursements and accounts payable bills'),

    -- Payroll
    ('payroll:view', 'payroll', 'view', 'Inspect compensation schedules and pay slips'),
    ('payroll:create', 'payroll', 'create', 'Initiate monthly compensation calculation pay runs'),
    ('payroll:edit', 'payroll', 'edit', 'Adjust statutory tax withholding and benefit deductions'),
    ('payroll:delete', 'payroll', 'delete', 'Discard unapproved payroll preview drafts'),
    ('payroll:export', 'payroll', 'export', 'Generate NACHA / SEPA direct deposit payment batch files'),
    ('payroll:approve', 'payroll', 'approve', 'Final authorization and release of employee salary disbursements'),

    -- Human Resources
    ('hr:view', 'hr', 'view', 'Inspect employee profiles and organizational hierarchy'),
    ('hr:create', 'hr', 'create', 'Onboard new personnel and create employee profiles'),
    ('hr:edit', 'hr', 'edit', 'Update compensation tiers, titles, and departments'),
    ('hr:delete', 'hr', 'delete', 'Initiate offboarding and personnel deactivation'),
    ('hr:export', 'hr', 'export', 'Export personnel headcount and department statistics'),
    ('hr:approve', 'hr', 'approve', 'Approve paid time off (PTO) and leave requests'),

    -- Projects & PMO
    ('projects:view', 'projects', 'view', 'View strategic capital engineering projects and milestones'),
    ('projects:create', 'projects', 'create', 'Create PMO projects and work breakdown structures'),
    ('projects:edit', 'projects', 'edit', 'Update deliverables, assigned personnel, and schedules'),
    ('projects:delete', 'projects', 'delete', 'Archive capital projects'),
    ('projects:export', 'projects', 'export', 'Export project velocity and Gantt reports'),
    ('projects:approve', 'projects', 'approve', 'Sign off on project milestone deliverables and budget expansions'),

    -- System Governance & Tenancy
    ('settings:view', 'settings', 'view', 'View company profile, currency, and integrations'),
    ('settings:edit', 'settings', 'edit', 'Modify company fiscal policies, timezone, and branding'),
    ('users:view', 'users', 'view', 'Inspect company member roster and pending invites'),
    ('users:invite', 'users', 'invite', 'Invite new employees and assign initial roles'),
    ('users:edit', 'users', 'edit', 'Modify member role assignments or suspend access'),
    ('users:delete', 'users', 'delete', 'Remove membership from company'),
    ('roles:view', 'roles', 'view', 'Inspect available roles and permission sets'),
    ('roles:create', 'roles', 'create', 'Define custom organizational roles'),
    ('roles:edit', 'roles', 'edit', 'Adjust custom role permission bundles'),
    ('roles:delete', 'roles', 'delete', 'Delete custom organizational roles'),
    ('audit:view', 'audit', 'view', 'Inspect immutable cryptographic system audit log records'),
    ('audit:export', 'audit', 'export', 'Export compliance audit log trails')
ON CONFLICT (code) DO NOTHING;

-- Insert PRD System Roles (company_id IS NULL)
INSERT INTO public.roles (id, company_id, name, code, description, is_system) VALUES
    ('00000000-0000-0000-0000-000000000001', NULL, 'Super Admin', 'super_admin', 'Global platform administrator with unrestricted cross-tenant oversight', TRUE),
    ('00000000-0000-0000-0000-000000000002', NULL, 'Admin', 'admin', 'Primary company administrator with governance over users, roles, and settings', TRUE),
    ('00000000-0000-0000-0000-000000000003', NULL, 'Manager', 'manager', 'Operational lead across inventory logistics, sales pipelines, and capital projects', TRUE),
    ('00000000-0000-0000-0000-000000000004', NULL, 'Accountant', 'accountant', 'Financial controller overseeing general ledger, invoices, payables, and payroll', TRUE),
    ('00000000-0000-0000-0000-000000000005', NULL, 'HR Manager', 'hr_manager', 'Human capital administrator managing employee lifecycle and payroll inputs', TRUE),
    ('00000000-0000-0000-0000-000000000006', NULL, 'Employee', 'employee', 'Standard organization member with view access to catalog, projects, and personal data', TRUE),
    ('00000000-0000-0000-0000-000000000007', NULL, 'Customer', 'customer', 'Commercial client portal user with restricted access to quotes and sales invoices', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Map Permissions to Roles

-- 1. Super Admin: ALL permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- 2. Admin: All company permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- 3. Manager: Operations, Sales, Inventory, Projects + Read on Finance & HR
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM public.permissions
WHERE code IN (
    'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:export', 'inventory:approve',
    'crm:view', 'crm:create', 'crm:edit', 'crm:export',
    'sales:view', 'sales:create', 'sales:edit', 'sales:export', 'sales:approve',
    'projects:view', 'projects:create', 'projects:edit', 'projects:export', 'projects:approve',
    'finance:view', 'hr:view', 'users:view', 'roles:view'
)
ON CONFLICT DO NOTHING;

-- 4. Accountant: Finance, Payroll, Sales, Reports + View Inventory
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id FROM public.permissions
WHERE code IN (
    'finance:view', 'finance:create', 'finance:edit', 'finance:export', 'finance:approve',
    'payroll:view', 'payroll:create', 'payroll:edit', 'payroll:export', 'payroll:approve',
    'sales:view', 'sales:create', 'sales:edit', 'sales:export',
    'inventory:view', 'inventory:export', 'reports:view', 'reports:export',
    'settings:view'
)
ON CONFLICT DO NOTHING;

-- 5. HR Manager: Personnel, Leave, Payroll + Projects View
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000005', id FROM public.permissions
WHERE code IN (
    'hr:view', 'hr:create', 'hr:edit', 'hr:export', 'hr:approve',
    'payroll:view', 'payroll:create', 'payroll:export',
    'users:view', 'users:invite',
    'projects:view'
)
ON CONFLICT DO NOTHING;

-- 6. Employee: Standard view access
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000006', id FROM public.permissions
WHERE code IN (
    'inventory:view',
    'projects:view',
    'hr:view'
)
ON CONFLICT DO NOTHING;

-- 7. Customer: Commercial portal view
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000007', id FROM public.permissions
WHERE code IN (
    'crm:view',
    'sales:view'
)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 13. AUTOMATED PROFILE PROVISIONING TRIGGER (Supabase Auth Hook)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, is_super_admin)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
