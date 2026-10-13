-- ====================================================================
-- Optimization Migration: Composite Indexes for Workspace Membership & RLS
-- Migration: 20261014000000_optimize_workspace_members_and_rls.sql
-- Description:
--   1. Adds composite index on workspace_members(workspace_id, user_id, status)
--      to accelerate public.can_access_workspace() RLS evaluations on every row.
--   2. Adds composite index on workspaces(id, owner_id) for workspace authorization.
--   3. Adds composite index on properties(workspace_id, status, created_at)
--      for instant directory queries.
-- ====================================================================

DO $$
BEGIN

  -- 1. Accelerate can_access_workspace RLS helper function
  IF to_regclass('public.workspace_members') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workspace_members_access ON public.workspace_members (workspace_id, user_id, status)';
  END IF;

  -- 2. Accelerate workspace ownership checks
  IF to_regclass('public.workspaces') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workspaces_id_owner ON public.workspaces (id, owner_id)';
  END IF;

  -- 3. Accelerate workspace properties directory listing
  IF to_regclass('public.properties') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_properties_ws_status_created ON public.properties (workspace_id, status, created_at DESC)';
  END IF;

END $$;
