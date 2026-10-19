-- ====================================================================
-- PropertyLedge Complete Autopilot Management System Migration
-- Migration: 20261019000000_autopilot_management_system.sql
-- Description:
--   1. Ensures activities, activity_occurrences, and activity_journal have
--      first-class fields for reminders, follow-ups, and completion auditing.
--   2. Maintains property_autopilots, autopilot_rules, and autopilot_run_logs
--      for property-level automation tracking.
--   3. Replaces sync_workspace_autopilot_activities to generate idempotent
--      suggested activities in DRAFT status from real lease/property records.
--   4. Explicit Make Live required for any live workflow action.
--   5. Configures RLS policies and performance indexes.
-- ====================================================================

-- 1. Extend Core Activities with Reminder & Follow-Up Rule Fields
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS followup_frequency_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS max_followups INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS followup_count INTEGER NOT NULL DEFAULT 0;

-- 2. Performance Indexes on Core Activity & Occurrence Tables
CREATE INDEX IF NOT EXISTS idx_activities_workspace_property_type_lifecycle 
  ON public.activities(workspace_id, property_id, activity_type_id, lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_occurrences_workspace_due_status 
  ON public.activity_occurrences(workspace_id, due_date, status);

CREATE INDEX IF NOT EXISTS idx_activity_journal_workspace_created 
  ON public.activity_journal(workspace_id, created_at DESC);

-- 3. Property Autopilots (Property-Level Master Automation Tracking)
CREATE TABLE IF NOT EXISTS public.property_autopilots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'not_initialized' CHECK (status IN ('not_initialized', 'draft', 'active', 'paused', 'stopped')),
  name VARCHAR(255) NOT NULL DEFAULT 'Property Autopilot',
  activated_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_property_autopilots_workspace_property UNIQUE (workspace_id, property_id)
);

-- 4. Autopilot Rules (Per-Activity Rules & Schedules linked to canonical activities)
CREATE TABLE IF NOT EXISTS public.autopilot_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autopilot_id UUID NOT NULL REFERENCES public.property_autopilots(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  activity_type_id VARCHAR(50) NOT NULL REFERENCES public.activity_types(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  frequency VARCHAR(30) NOT NULL DEFAULT 'semiannual' CHECK (frequency IN ('once', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom')),
  interval INTEGER NOT NULL DEFAULT 1,
  next_due_date DATE NOT NULL,
  reminder_days_before INTEGER NOT NULL DEFAULT 14,
  followup_frequency_days INTEGER NOT NULL DEFAULT 7,
  max_followups INTEGER NOT NULL DEFAULT 3,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Autopilot Run Logs (Execution & Lifecycle Audit History)
CREATE TABLE IF NOT EXISTS public.autopilot_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autopilot_id UUID NOT NULL REFERENCES public.property_autopilots(id) ON DELETE CASCADE,
  activity_config_id UUID REFERENCES public.autopilot_rules(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  activity_type_id VARCHAR(50),
  execution_type VARCHAR(50) NOT NULL CHECK (execution_type IN ('initialization', 'scheduled_run', 'manual_trigger', 'recurrence_generation', 'lifecycle_change', 'draft_generation')),
  status VARCHAR(30) NOT NULL CHECK (status IN ('success', 'failed', 'skipped', 'requires_attention')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  summary TEXT NOT NULL,
  error_message TEXT,
  task_id UUID,
  idempotency_key VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_property_autopilots_workspace ON public.property_autopilots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_property_autopilots_property ON public.property_autopilots(property_id);
CREATE INDEX IF NOT EXISTS idx_property_autopilots_status ON public.property_autopilots(status);

CREATE INDEX IF NOT EXISTS idx_autopilot_rules_autopilot ON public.autopilot_rules(autopilot_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_rules_workspace ON public.autopilot_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_rules_due_date ON public.autopilot_rules(next_due_date);

CREATE INDEX IF NOT EXISTS idx_autopilot_run_logs_autopilot ON public.autopilot_run_logs(autopilot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autopilot_run_logs_workspace ON public.autopilot_run_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autopilot_run_logs_status ON public.autopilot_run_logs(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_autopilot_run_logs_idempotency ON public.autopilot_run_logs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 6. Enable Row Level Security
ALTER TABLE public.property_autopilots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_run_logs ENABLE ROW LEVEL SECURITY;

-- Property Autopilots RLS Policies
DROP POLICY IF EXISTS "Workspace members can view property autopilots" ON public.property_autopilots;
CREATE POLICY "Workspace members can view property autopilots"
  ON public.property_autopilots FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
    OR
    workspace_id IN (
      SELECT w.id FROM public.workspaces w
      WHERE w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authorized members can manage property autopilots" ON public.property_autopilots;
CREATE POLICY "Authorized members can manage property autopilots"
  ON public.property_autopilots FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
    OR
    workspace_id IN (
      SELECT w.id FROM public.workspaces w
      WHERE w.owner_id = auth.uid()
    )
  );

-- Autopilot Rules RLS Policies
DROP POLICY IF EXISTS "Workspace members can view autopilot rules" ON public.autopilot_rules;
CREATE POLICY "Workspace members can view autopilot rules"
  ON public.autopilot_rules FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
    OR
    workspace_id IN (
      SELECT w.id FROM public.workspaces w
      WHERE w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authorized members can manage autopilot rules" ON public.autopilot_rules;
CREATE POLICY "Authorized members can manage autopilot rules"
  ON public.autopilot_rules FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
    OR
    workspace_id IN (
      SELECT w.id FROM public.workspaces w
      WHERE w.owner_id = auth.uid()
    )
  );

-- Autopilot Run Logs RLS Policies
DROP POLICY IF EXISTS "Workspace members can view autopilot run logs" ON public.autopilot_run_logs;
CREATE POLICY "Workspace members can view autopilot run logs"
  ON public.autopilot_run_logs FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
    OR
    workspace_id IN (
      SELECT w.id FROM public.workspaces w
      WHERE w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authorized members can insert autopilot run logs" ON public.autopilot_run_logs;
CREATE POLICY "Authorized members can insert autopilot run logs"
  ON public.autopilot_run_logs FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.status = 'active'
    )
    OR
    workspace_id IN (
      SELECT w.id FROM public.workspaces w
      WHERE w.owner_id = auth.uid()
    )
  );

-- 7. REFACTOR AUTOPILOT SYNC FUNCTION TO ACTIVITY-DRIVEN ARCHITECTURE:
-- Generates suggested property activities in DRAFT status from real lease, inspection, and insurance data.
-- Idempotent: Does not create duplicate drafts on repeated execution.
CREATE OR REPLACE FUNCTION public.sync_workspace_autopilot_activities(
  p_workspace_id UUID,
  p_property_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_property RECORD;
  v_lease RECORD;
  v_cr RECORD;
  v_ins RECORD;
  v_owner_id UUID;
  v_agent_id UUID;
  v_target_user UUID;
  v_activity_id UUID;
  v_count INTEGER := 0;
  v_due_date DATE;
BEGIN
  -- Workspace owner and default agent for assignment
  SELECT owner_id INTO v_owner_id FROM public.workspaces WHERE id = p_workspace_id;
  SELECT user_id INTO v_agent_id FROM public.workspace_members 
   WHERE workspace_id = p_workspace_id AND status = 'active' AND user_id != v_owner_id 
   LIMIT 1;

  v_target_user := COALESCE(v_agent_id, v_owner_id);

  -- Iterate properties (single property if specified, or all properties in workspace)
  FOR v_property IN
    SELECT p.id, p.name, p.workspace_id
    FROM public.properties p
    WHERE p.workspace_id = p_workspace_id
      AND (p_property_id IS NULL OR p.id = p_property_id)
      AND p.status = 'active'
  LOOP
    -- A. Check for Active Lease on this property
    SELECT * INTO v_lease
    FROM public.leases
    WHERE property_id = v_property.id AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- 1. Lease Expiry Review (Draft)
    IF v_lease.id IS NOT NULL AND v_lease.end_date IS NOT NULL THEN
      -- Check if activity already exists in draft or active state
      IF NOT EXISTS (
        SELECT 1 FROM public.activities
        WHERE workspace_id = p_workspace_id
          AND property_id = v_property.id
          AND activity_type_id = 'lease_expiry'
          AND lifecycle_status IN ('draft', 'active')
      ) THEN
        v_due_date := GREATEST(CURRENT_DATE, (v_lease.end_date - INTERVAL '60 days')::DATE);

        INSERT INTO public.activities (
          workspace_id, property_id, lease_id, activity_type_id, title, description,
          lifecycle_status, is_recurring, recurrence_frequency, owner_id,
          reminder_days_before, followup_frequency_days, max_followups,
          metadata
        ) VALUES (
          p_workspace_id, v_property.id, v_lease.id, 'lease_expiry',
          'Lease Expiry Review — ' || v_property.name,
          'Review upcoming lease expiration, tenant intentions, and renewal terms.',
          'draft', false, NULL, v_target_user,
          60, 7, 3,
          jsonb_build_object('auto_generated', true, 'lease_end_date', v_lease.end_date)
        ) RETURNING id INTO v_activity_id;

        INSERT INTO public.activity_occurrences (
          activity_id, workspace_id, property_id, due_date, assigned_to, status, sequence_number
        ) VALUES (
          v_activity_id, p_workspace_id, v_property.id,
          v_due_date, v_target_user, 'open', 1
        );

        INSERT INTO public.activity_journal (
          workspace_id, activity_id, event_type, actor_id, metadata
        ) VALUES (
          p_workspace_id, v_activity_id, 'activity_created', v_owner_id,
          jsonb_build_object('source', 'autopilot_draft_generator', 'lifecycle_status', 'draft')
        );

        v_count := v_count + 1;
      END IF;
    END IF;

    -- 2. Rental Review (Draft, Recurring Annual)
    IF v_lease.id IS NOT NULL AND v_lease.start_date IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.activities
        WHERE workspace_id = p_workspace_id
          AND property_id = v_property.id
          AND activity_type_id = 'rent_review'
          AND lifecycle_status IN ('draft', 'active')
      ) THEN
        -- Schedule annual review 12 months from start (or 6 months if in 1st year)
        v_due_date := (v_lease.start_date + INTERVAL '12 months')::DATE;
        IF v_due_date <= CURRENT_DATE THEN
          v_due_date := (CURRENT_DATE + INTERVAL '30 days')::DATE;
        END IF;

        INSERT INTO public.activities (
          workspace_id, property_id, lease_id, activity_type_id, title, description,
          lifecycle_status, is_recurring, recurrence_enabled, recurrence_frequency, recurrence_interval,
          owner_id, reminder_days_before, followup_frequency_days, max_followups,
          metadata
        ) VALUES (
          p_workspace_id, v_property.id, v_lease.id, 'rent_review',
          'Rental Review — ' || v_property.name,
          'Evaluate current market rental yields and prepare annual rent adjustment notice.',
          'draft', true, true, 'annual', 1,
          v_target_user, 30, 7, 3,
          jsonb_build_object('auto_generated', true, 'lease_start_date', v_lease.start_date)
        ) RETURNING id INTO v_activity_id;

        INSERT INTO public.activity_occurrences (
          activity_id, workspace_id, property_id, due_date, assigned_to, status, sequence_number
        ) VALUES (
          v_activity_id, p_workspace_id, v_property.id,
          v_due_date, v_target_user, 'open', 1
        );

        INSERT INTO public.activity_journal (
          workspace_id, activity_id, event_type, actor_id, metadata
        ) VALUES (
          p_workspace_id, v_activity_id, 'activity_created', v_owner_id,
          jsonb_build_object('source', 'autopilot_draft_generator', 'lifecycle_status', 'draft')
        );

        v_count := v_count + 1;
      END IF;
    END IF;

    -- 3. Routine Property Inspection (Draft, Recurring Semiannual)
    IF NOT EXISTS (
      SELECT 1 FROM public.activities
      WHERE workspace_id = p_workspace_id
        AND property_id = v_property.id
        AND activity_type_id = 'inspection'
        AND lifecycle_status IN ('draft', 'active')
    ) THEN
      -- Determine inspection baseline date
      SELECT inspection_date INTO v_cr
      FROM public.condition_reports
      WHERE property_id = v_property.id
      ORDER BY inspection_date DESC
      LIMIT 1;

      IF v_cr.inspection_date IS NOT NULL THEN
        v_due_date := (v_cr.inspection_date + INTERVAL '6 months')::DATE;
      ELSIF v_lease.start_date IS NOT NULL THEN
        v_due_date := (v_lease.start_date + INTERVAL '6 months')::DATE;
      ELSE
        v_due_date := (CURRENT_DATE + INTERVAL '90 days')::DATE;
      END IF;

      IF v_due_date <= CURRENT_DATE THEN
        v_due_date := (CURRENT_DATE + INTERVAL '14 days')::DATE;
      END IF;

      INSERT INTO public.activities (
        workspace_id, property_id, lease_id, activity_type_id, title, description,
        lifecycle_status, is_recurring, recurrence_enabled, recurrence_frequency, recurrence_interval,
        owner_id, reminder_days_before, followup_frequency_days, max_followups,
        metadata
      ) VALUES (
        p_workspace_id, v_property.id, v_lease.id, 'inspection',
        'Condition Report / Inspection — ' || v_property.name,
        'Routine periodic property inspection and baseline condition check.',
        'draft', true, true, 'semiannual', 1,
        v_target_user, 14, 7, 3,
        jsonb_build_object('auto_generated', true)
      ) RETURNING id INTO v_activity_id;

      INSERT INTO public.activity_occurrences (
        activity_id, workspace_id, property_id, due_date, assigned_to, status, sequence_number
      ) VALUES (
        v_activity_id, p_workspace_id, v_property.id,
        v_due_date, v_target_user, 'open', 1
      );

      INSERT INTO public.activity_journal (
        workspace_id, activity_id, event_type, actor_id, metadata
      ) VALUES (
        p_workspace_id, v_activity_id, 'activity_created', v_owner_id,
        jsonb_build_object('source', 'autopilot_draft_generator', 'lifecycle_status', 'draft')
      );

      v_count := v_count + 1;
    END IF;

    -- 4. Insurance Policy Renewal (Draft, Recurring Annual)
    IF NOT EXISTS (
      SELECT 1 FROM public.activities
      WHERE workspace_id = p_workspace_id
        AND property_id = v_property.id
        AND activity_type_id = 'insurance_renewal'
        AND lifecycle_status IN ('draft', 'active')
    ) THEN
      SELECT created_at INTO v_ins
      FROM public.documents
      WHERE property_id = v_property.id AND document_type = 'insurance_policy'
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_ins.created_at IS NOT NULL THEN
        v_due_date := (v_ins.created_at::DATE + INTERVAL '1 year')::DATE;
        IF v_due_date <= CURRENT_DATE THEN
          v_due_date := (CURRENT_DATE + INTERVAL '30 days')::DATE;
        END IF;

        INSERT INTO public.activities (
          workspace_id, property_id, activity_type_id, title, description,
          lifecycle_status, is_recurring, recurrence_enabled, recurrence_frequency, recurrence_interval,
          owner_id, reminder_days_before, followup_frequency_days, max_followups,
          metadata
        ) VALUES (
          p_workspace_id, v_property.id, 'insurance_renewal',
          'Insurance Renewal — ' || v_property.name,
          'Review landlord and building insurance policy coverage and renew policy.',
          'draft', true, true, 'annual', 1,
          v_target_user, 30, 7, 3,
          jsonb_build_object('auto_generated', true)
        ) RETURNING id INTO v_activity_id;

        INSERT INTO public.activity_occurrences (
          activity_id, workspace_id, property_id, due_date, assigned_to, status, sequence_number
        ) VALUES (
          v_activity_id, p_workspace_id, v_property.id,
          v_due_date, v_target_user, 'open', 1
        );

        INSERT INTO public.activity_journal (
          workspace_id, activity_id, event_type, actor_id, metadata
        ) VALUES (
          p_workspace_id, v_activity_id, 'activity_created', v_owner_id,
          jsonb_build_object('source', 'autopilot_draft_generator', 'lifecycle_status', 'draft')
        );

        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'draft_activities_created', v_count);
END;
$$;
