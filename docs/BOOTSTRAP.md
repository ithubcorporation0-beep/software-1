# 🚀 IT-HUB ERP — Super Admin Onboarding & Security Bootstrap Guide

## Overview
To prevent privilege escalation vulnerabilities, IT-HUB ERP does not allow public registration to create platform super administrators or arbitrary company tenants without a verified administrative invitation.

This document outlines the safe procedures to provision the initial **Super Administrator** and configure the first enterprise tenant.

---

## Security Guarantees
1. **Zero Hardcoded Master Passwords**: No default passwords or fallback root accounts exist in code or database seeds.
2. **Service Role Key Isolation**: The `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to server-side environments and local CLI scripts. It is never exposed to browser bundles or client-side components.
3. **Fail-Closed RBAC**: If a user does not have a verified active membership in a requested company, the server-side authorization layer immediately returns `403 Forbidden`.

---

## Method 1: Automated Local / CI CLI Script (Recommended)

Run the bootstrap script from the secure terminal where your `.env.local` contains `SUPABASE_SERVICE_ROLE_KEY`:

```bash
# Syntax: npx tsx scripts/bootstrap-super-admin.ts <email> <password> "<Full Name>"
npx tsx scripts/bootstrap-super-admin.ts admin@yourcompany.com "YourStrongPassword123!" "Chief Executive Officer"
```

### What this command executes:
1. Provisions the user in Supabase Auth via `supabase.auth.admin.createUser` with auto-confirmed email.
2. Upserts the `public.profiles` record setting `is_super_admin = TRUE`.
3. Grants universal platform oversight across all tenant organizations.

---

## Method 2: Manual Supabase Dashboard Execution

If managing via the Supabase Web Dashboard:

### Step 1: Create the User in Authentication
1. Navigate to **Authentication** > **Users**.
2. Click **Add User** > **Create User**.
3. Enter the administrator's email and a cryptographically strong password. Check **Auto Confirm User**.

### Step 2: Elevate to Super Admin in SQL Editor
Navigate to the **SQL Editor** and run the following query:

```sql
UPDATE public.profiles
SET is_super_admin = TRUE,
    updated_at = NOW()
WHERE email = 'admin@yourcompany.com';
```

---

## Method 3: Provisioning an Enterprise Tenant Company

To associate the administrator with a specific company:

```sql
-- 1. Create the tenant company
INSERT INTO public.companies (id, name, slug, plan, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'IT-HUB Global Technologies Corp',
    'it-hub-global',
    'ENTERPRISE',
    'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

-- 2. Associate the administrator with the Admin role
INSERT INTO public.memberships (company_id, user_id, role_id, status)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    p.id,
    '00000000-0000-0000-0000-000000000002', -- System Admin Role ID
    'ACTIVE'
FROM public.profiles p
WHERE p.email = 'admin@yourcompany.com'
ON CONFLICT (company_id, user_id) DO NOTHING;
```

---

## Verifying Setup
1. Open the application at `http://localhost:3000/login`.
2. Sign in with the super administrator credentials.
3. Verify that the User Profile menu shows the **Verified Session** badge and that company management features in `/settings` are accessible.
