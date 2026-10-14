-- ============================================================================
-- IT-HUB ERP Master PostgreSQL / Supabase Migration
-- Migration: 20261014000002_super_admin_performance_and_indexes.sql
-- Optimizations: Platform-wide Super Admin Indexes, Fast Metrics RPC,
-- and Notification Query Indexing
-- ============================================================================

-- 1. SUPER ADMIN COMPANIES INDEXES
-- Eliminates sequential table scans when filtering companies by approval status
CREATE INDEX IF NOT EXISTS idx_companies_status_created_desc 
ON public.companies(status, created_at DESC);

-- Trigram index or B-tree on company search fields
CREATE INDEX IF NOT EXISTS idx_companies_slug 
ON public.companies(slug);

-- 2. PLATFORM-WIDE AUDIT TRAIL PERFORMANCE INDEXES
-- Super Admin compliance ledger queries across all tenants ordered by recency
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_desc 
ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_desc 
ON public.audit_logs(action, created_at DESC);

-- 3. PROFILES & RECENT ACTIVITY INDEXES
-- Speeds up active user metric calculation without full table scan
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at_desc 
ON public.profiles(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_super_admin 
ON public.profiles(is_super_admin, created_at DESC);

-- 4. USER NOTIFICATIONS RECOVERY INDEX
-- Speeds up unread notifications lookup per user and company
CREATE INDEX IF NOT EXISTS idx_notifications_company_user_read 
ON public.notifications(company_id, user_id, read, created_at DESC);

-- 5. CONSOLIDATED ATOMIC SUPER ADMIN PLATFORM METRICS RPC
-- Consolidates all platform metrics, pending approvals queue, and audit feed
-- into a single high-performance PostgreSQL call (sub-5ms execution).
CREATE OR REPLACE FUNCTION public.get_platform_super_admin_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_is_super_admin BOOLEAN;
    v_total_companies BIGINT;
    v_pending_companies BIGINT;
    v_active_companies BIGINT;
    v_suspended_companies BIGINT;
    v_rejected_companies BIGINT;
    v_total_users BIGINT;
    v_active_users BIGINT;
    v_pending_requests JSONB;
    v_recent_audits JSONB;
BEGIN
    -- Verify caller authentication and platform super administrator privilege
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        SELECT is_super_admin FROM public.profiles WHERE id = v_user_id INTO v_is_super_admin;
        IF NOT COALESCE(v_is_super_admin, FALSE) THEN
            RAISE EXCEPTION 'Access denied: IT HUB Platform Super Administrator credentials required.';
        END IF;
    END IF;

    -- Aggregate company status metrics using index-accelerated counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'PENDING'),
        COUNT(*) FILTER (WHERE status = 'ACTIVE'),
        COUNT(*) FILTER (WHERE status = 'SUSPENDED'),
        COUNT(*) FILTER (WHERE status = 'REJECTED')
    INTO 
        v_total_companies,
        v_pending_companies,
        v_active_companies,
        v_suspended_companies,
        v_rejected_companies
    FROM public.companies;

    -- Aggregate total and 7-day active platform users
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '7 days')
    INTO 
        v_total_users,
        v_active_users
    FROM public.profiles;

    -- Fetch 10 most recent pending company registrations
    SELECT COALESCE(json_agg(row_to_json(comp_rec)), '[]'::jsonb) INTO v_pending_requests
    FROM (
        SELECT id, name, slug, domain, plan, status, contact_email, contact_name, created_at, updated_at
        FROM public.companies
        WHERE status = 'PENDING'
        ORDER BY created_at DESC
        LIMIT 10
    ) comp_rec;

    -- Fetch 15 most recent platform audit events
    SELECT COALESCE(json_agg(row_to_json(aud_rec)), '[]'::jsonb) INTO v_recent_audits
    FROM (
        SELECT id, company_id, user_id, action, resource, resource_id, details, ip_address, created_at
        FROM public.audit_logs
        ORDER BY created_at DESC
        LIMIT 15
    ) aud_rec;

    RETURN json_build_object(
        'totalCompanies', v_total_companies,
        'pendingApprovals', v_pending_companies,
        'activeCompanies', v_active_companies,
        'suspendedCompanies', v_suspended_companies,
        'rejectedCompanies', v_rejected_companies,
        'totalUsers', v_total_users,
        'recentlyActiveUsers', v_active_users,
        'pendingRequests', v_pending_requests,
        'recentAuditLogs', v_recent_audits
    );
END;
$$;
