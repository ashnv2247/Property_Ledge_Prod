-- ====================================================================
-- RLS initPlan Optimization and Index Deduplication Migration
-- Migration: 20261009000000_rls_initplan_and_index_cleanup.sql
-- Description:
--   1. Optimizes RLS security helper functions (owns_property, can_access_property)
--      using (SELECT auth.uid()) to enable PostgreSQL initPlan evaluation.
--   2. Deduplicates redundant indexes on transactions.
--   3. Adds composite indexes for high-frequency dashboard and finance queries.
-- ====================================================================

DO $$
BEGIN

  -- 1. Optimize owns_property helper function
  CREATE OR REPLACE FUNCTION public.owns_property (
    p_property_id uuid
  )
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $function$
    SELECT EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = p_property_id AND owner_id = (SELECT auth.uid())
    );
  $function$;

  GRANT EXECUTE ON FUNCTION public.owns_property(uuid) TO PUBLIC, postgres, service_role;

  -- 2. Optimize can_access_property helper function
  CREATE OR REPLACE FUNCTION public.can_access_property (
    p_property_id uuid
  )
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $function$
    SELECT public.owns_property(p_property_id) OR EXISTS (
      SELECT 1 FROM public.property_members
      WHERE property_id = p_property_id 
        AND user_id = (SELECT auth.uid()) 
        AND status = 'active'
    );
  $function$;

  GRANT EXECUTE ON FUNCTION public.can_access_property(uuid) TO PUBLIC, postgres, service_role;

  -- 3. Drop redundant / duplicate indexes on transactions
  IF to_regclass('public.idx_transactions_tenant') IS NOT NULL AND to_regclass('public.idx_transactions_tenant_id') IS NOT NULL THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_transactions_tenant';
  END IF;

  IF to_regclass('public.idx_transactions_workspace_id') IS NOT NULL AND to_regclass('public.idx_transactions_ws_date') IS NOT NULL THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_transactions_workspace_id';
  END IF;

  IF to_regclass('public.idx_transactions_property_id') IS NOT NULL AND to_regclass('public.idx_transactions_property_date') IS NOT NULL THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_transactions_property_id';
  END IF;

  -- 4. High-value composite indexes for finance & dashboard operations
  IF to_regclass('public.transactions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_ws_status_date ON public.transactions (workspace_id, status, transaction_date DESC)';
  END IF;

  IF to_regclass('public.tenants') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tenants_prop_status ON public.tenants (property_id, status)';
  END IF;

  IF to_regclass('public.leases') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_leases_prop_status ON public.leases (property_id, status)';
  END IF;

  IF to_regclass('public.maintenance_requests') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_maintenance_prop_status ON public.maintenance_requests (property_id, status)';
  END IF;

END $$;
