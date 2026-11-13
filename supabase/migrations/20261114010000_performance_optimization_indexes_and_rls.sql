-- Migration: 20261114010000_performance_optimization_indexes_and_rls.sql
-- Description: Comprehensive database performance optimization:
-- 1. High-frequency composite indexes for dashboard, invoices, transactions, leases, properties, and schedules.
-- 2. Missing foreign key indexes to accelerate joins and CASCADE operations.
-- 3. Optimized RLS policies with scalar (SELECT auth.uid()) subqueries to eliminate per-row re-evaluation.

-- ============================================================================
-- 1. COMPOSITE & HIGH-FREQUENCY QUERY INDEXES
-- ============================================================================

-- Invoices: Workspace-scoped listing by issue date & status/due date
CREATE INDEX IF NOT EXISTS idx_invoices_ws_issue_date_desc 
  ON public.invoices (workspace_id, issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_ws_status_due_date 
  ON public.invoices (workspace_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_invoices_created_by 
  ON public.invoices (created_by);

CREATE INDEX IF NOT EXISTS idx_invoices_source_invoice_id 
  ON public.invoices (source_invoice_id);

-- Transactions: Workspace-scoped financial calculations (monthly breakdown, cash flow, GST)
CREATE INDEX IF NOT EXISTS idx_transactions_ws_type_status_date_desc 
  ON public.transactions (workspace_id, transaction_type, status, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_created_by 
  ON public.transactions (created_by);

-- Leases: Status and date ranges
CREATE INDEX IF NOT EXISTS idx_leases_created_by 
  ON public.leases (created_by);

CREATE INDEX IF NOT EXISTS idx_leases_prop_status_start_date 
  ON public.leases (property_id, status, start_date DESC);

-- Tenants: Property lookups and sorting
CREATE INDEX IF NOT EXISTS idx_tenants_prop_status_name 
  ON public.tenants (property_id, status, last_name, first_name);

-- Activities & Tasks
CREATE INDEX IF NOT EXISTS idx_activities_tenant_id 
  ON public.activities (tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_lease_id 
  ON public.activities (lease_id) WHERE lease_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_owner_id 
  ON public.activities (owner_id) WHERE owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_created_by 
  ON public.tasks (created_by);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_by 
  ON public.maintenance_requests (created_by);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_prop_status 
  ON public.maintenance_requests (property_id, status);

-- Expected Payment Schedules
CREATE INDEX IF NOT EXISTS idx_expected_payment_schedule_tenant_id 
  ON public.expected_payment_schedule (tenant_id);

CREATE INDEX IF NOT EXISTS idx_expected_payment_schedule_ws_status_due_date 
  ON public.expected_payment_schedule (workspace_id, status, due_date);

-- Autopilot & Automations
CREATE INDEX IF NOT EXISTS idx_automations_created_by 
  ON public.automations (created_by);

CREATE INDEX IF NOT EXISTS idx_autopilot_rules_property_id 
  ON public.autopilot_rules (property_id);

CREATE INDEX IF NOT EXISTS idx_autopilot_run_logs_property_id 
  ON public.autopilot_run_logs (property_id);

-- Documents & Condition Reports
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by 
  ON public.documents (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_condition_reports_inspector_id 
  ON public.condition_reports (inspector_id);

-- Schedule Email Jobs & Schedules
CREATE INDEX IF NOT EXISTS idx_invoice_email_schedules_property_id 
  ON public.invoice_email_schedules (property_id);

CREATE INDEX IF NOT EXISTS idx_invoice_email_schedules_tenant_id 
  ON public.invoice_email_schedules (tenant_id);

CREATE INDEX IF NOT EXISTS idx_invoice_scheduled_email_jobs_ws_status_send_date 
  ON public.invoice_scheduled_email_jobs (workspace_id, status, scheduled_send_date);

-- ============================================================================
-- 2. SECURITY FUNCTION OPTIMIZATION (STABLE & PARALLEL SAFE)
-- ============================================================================

-- Ensure is_platform_admin wraps auth.uid() in scalar subquery and is PARALLEL SAFE
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := (SELECT auth.uid());
  IF v_uid IS NULL THEN 
    RETURN FALSE; 
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = v_uid AND status = 'active') THEN
    RETURN TRUE;
  END IF;
  
  RETURN public.has_platform_permission('team.admin_access');
END;
$$;

-- Ensure can_access_workspace uses scalar subqueries and is PARALLEL SAFE
CREATE OR REPLACE FUNCTION public.can_access_workspace(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND (
        w.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.workspace_members wm
          WHERE wm.workspace_id = w.id
            AND wm.user_id = (SELECT auth.uid())
            AND wm.status = 'active'
        )
      )
  );
$$;

-- Ensure can_access_property uses scalar subqueries and is PARALLEL SAFE
CREATE OR REPLACE FUNCTION public.can_access_property(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT public.owns_property(p_property_id) OR EXISTS (
    SELECT 1 FROM public.property_members
    WHERE property_id = p_property_id 
      AND user_id = (SELECT auth.uid()) 
      AND status = 'active'
  );
$$;

-- ============================================================================
-- 3. RLS POLICIES OPTIMIZATION (SCALAR SUBQUERIES FOR HIGH-FREQUENCY TABLES)
-- ============================================================================

-- account_context
DROP POLICY IF EXISTS "account_select_own" ON public.account_context;
CREATE POLICY "account_select_own" ON public.account_context
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "account_update_own" ON public.account_context;
CREATE POLICY "account_update_own" ON public.account_context
  FOR UPDATE USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "account_insert_own" ON public.account_context;
CREATE POLICY "account_insert_own" ON public.account_context
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

-- workspaces
DROP POLICY IF EXISTS "ws_select" ON public.workspaces;
CREATE POLICY "ws_select" ON public.workspaces
  FOR SELECT USING (
    owner_id = (SELECT auth.uid()) 
    OR can_access_workspace(id) 
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "ws_update" ON public.workspaces;
CREATE POLICY "ws_update" ON public.workspaces
  FOR UPDATE USING (
    owner_id = (SELECT auth.uid()) 
    OR is_platform_admin()
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid()) 
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "ws_insert" ON public.workspaces;
CREATE POLICY "ws_insert" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = (SELECT auth.uid()));

-- workspace_members
DROP POLICY IF EXISTS "wsm_select" ON public.workspace_members;
CREATE POLICY "wsm_select" ON public.workspace_members
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id AND w.owner_id = (SELECT auth.uid())
    )
    OR has_workspace_permission(workspace_id, 'team.member.view')
    OR has_platform_permission('team.data.view')
  );

-- properties
DROP POLICY IF EXISTS "prop_select" ON public.properties;
CREATE POLICY "prop_select" ON public.properties
  FOR SELECT USING (
    can_access_property(id)
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.property_id = properties.id AND t.user_id = (SELECT auth.uid())
    )
    OR is_platform_admin()
  );

-- tenants
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants
  FOR SELECT USING (
    can_access_property(property_id)
    OR user_id = (SELECT auth.uid())
    OR is_platform_admin()
  );

-- transactions
DROP POLICY IF EXISTS "Users can read transactions for authorized properties" ON public.transactions;
CREATE POLICY "Users can read transactions for authorized properties" ON public.transactions
  FOR SELECT USING (
    (can_access_workspace(workspace_id) AND can_access_property(property_id))
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = transactions.tenant_id AND t.user_id = (SELECT auth.uid())
    )
    OR is_platform_admin()
  );

-- activities
DROP POLICY IF EXISTS "Workspace members can view activities" ON public.activities;
CREATE POLICY "Workspace members can view activities" ON public.activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activities.workspace_id 
        AND wm.user_id = (SELECT auth.uid()) 
        AND wm.status = 'active'
    )
    OR is_platform_admin()
  );

DROP POLICY IF EXISTS "Workspace members can manage activities" ON public.activities;
CREATE POLICY "Workspace members can manage activities" ON public.activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activities.workspace_id 
        AND wm.user_id = (SELECT auth.uid()) 
        AND wm.status = 'active'
    )
    OR is_platform_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activities.workspace_id 
        AND wm.user_id = (SELECT auth.uid()) 
        AND wm.status = 'active'
    )
    OR is_platform_admin()
  );

-- activity_logs
DROP POLICY IF EXISTS "act_select" ON public.activity_logs;
CREATE POLICY "act_select" ON public.activity_logs
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR (property_id IS NOT NULL AND can_access_property(property_id))
    OR (workspace_id IS NOT NULL AND can_access_workspace(workspace_id))
    OR is_platform_admin()
  );
