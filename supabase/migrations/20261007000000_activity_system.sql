-- ====================================================================
-- PropertyLedge Activity & Accountability Engine (Autopilot Foundation)
-- Migration: 20261007000000_activity_system.sql
-- Description: Core schema for Activities, Occurrences, Recurrence,
--              Comments, and Chronological Activity Journal.
-- ====================================================================

-- 1. Activity Types Table
CREATE TABLE IF NOT EXISTS public.activity_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  icon VARCHAR(50) NOT NULL DEFAULT 'Activity',
  color VARCHAR(50) NOT NULL DEFAULT 'teal',
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed predefined standard activity types
INSERT INTO public.activity_types (id, name, slug, icon, color, description, is_system)
VALUES
  ('inspection', 'Property Inspection', 'property-inspection', 'Home', 'indigo', 'Routine property inspection and periodic condition checks', true),
  ('rent_review', 'Rent Review', 'rent-review', 'TrendingUp', 'emerald', 'Periodic rent rate review and market rate evaluation', true),
  ('lease_expiry', 'Lease Expiry', 'lease-expiry', 'FileText', 'amber', 'Lease contract expiration review and renewal negotiation', true),
  ('insurance_renewal', 'Insurance Renewal', 'insurance-renewal', 'ShieldCheck', 'blue', 'Landlord and building insurance policy renewal', true),
  ('lease_renewal', 'Lease Renewal', 'lease-renewal', 'FileCheck2', 'teal', 'Formal lease extension or renewal execution', true),
  ('repair', 'Repair', 'repair', 'Wrench', 'orange', 'Urgent or scheduled property repair work', true),
  ('maintenance', 'Maintenance Issue', 'maintenance-issue', 'Wrench', 'yellow', 'General proactive or preventative property maintenance', true),
  ('tenant_issue', 'Tenant Issue', 'tenant-issue', 'UserCheck', 'rose', 'Tenant request, communication, or issue resolution', true),
  ('other', 'Other', 'other', 'CheckSquare', 'slate', 'General custom property activity', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Activities Table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  activity_type_id VARCHAR(50) NOT NULL REFERENCES public.activity_types(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (lifecycle_status IN ('draft', 'active', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_enabled BOOLEAN NOT NULL DEFAULT false,
  recurrence_frequency VARCHAR(30) CHECK (recurrence_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom') OR recurrence_frequency IS NULL),
  recurrence_interval INTEGER NOT NULL DEFAULT 1,
  recurrence_start_date DATE,
  recurrence_end_date DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Activity Occurrences Table
CREATE TABLE IF NOT EXISTS public.activity_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'delayed', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completion_notes TEXT,
  sequence_number INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Unique sequence constraint per activity to prevent duplicate next occurrences
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_occurrences_unique_seq ON public.activity_occurrences(activity_id, sequence_number);

-- 4. Activity Comments Table
CREATE TABLE IF NOT EXISTS public.activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  occurrence_id UUID REFERENCES public.activity_occurrences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Activity Journal Table
CREATE TABLE IF NOT EXISTS public.activity_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  occurrence_id UUID REFERENCES public.activity_occurrences(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_activities_workspace_id ON public.activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_property_id ON public.activities(property_id);
CREATE INDEX IF NOT EXISTS idx_activities_lifecycle ON public.activities(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(activity_type_id);

CREATE INDEX IF NOT EXISTS idx_occurrences_activity_id ON public.activity_occurrences(activity_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_workspace_id ON public.activity_occurrences(workspace_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_property_id ON public.activity_occurrences(property_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_assigned_to ON public.activity_occurrences(assigned_to);
CREATE INDEX IF NOT EXISTS idx_occurrences_due_date ON public.activity_occurrences(due_date);
CREATE INDEX IF NOT EXISTS idx_occurrences_status ON public.activity_occurrences(status);

CREATE INDEX IF NOT EXISTS idx_comments_activity_id ON public.activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_comments_occurrence_id ON public.activity_comments(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.activity_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_journal_activity_id ON public.activity_journal(activity_id);
CREATE INDEX IF NOT EXISTS idx_journal_occurrence_id ON public.activity_journal(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_journal_created_at ON public.activity_journal(created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_journal ENABLE ROW LEVEL SECURITY;

-- Activity Types Policies
DROP POLICY IF EXISTS "Public or workspace members can view activity types" ON public.activity_types;
CREATE POLICY "Public or workspace members can view activity types"
  ON public.activity_types
  FOR SELECT
  TO authenticated
  USING (
    is_system = true OR
    workspace_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activity_types.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Activities Policies
DROP POLICY IF EXISTS "Workspace members can view activities" ON public.activities;
CREATE POLICY "Workspace members can view activities"
  ON public.activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activities.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Workspace members can manage activities" ON public.activities;
CREATE POLICY "Workspace members can manage activities"
  ON public.activities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activities.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activities.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Activity Occurrences Policies
DROP POLICY IF EXISTS "Workspace members can view activity occurrences" ON public.activity_occurrences;
CREATE POLICY "Workspace members can view activity occurrences"
  ON public.activity_occurrences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activity_occurrences.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Workspace members can manage activity occurrences" ON public.activity_occurrences;
CREATE POLICY "Workspace members can manage activity occurrences"
  ON public.activity_occurrences
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activity_occurrences.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activity_occurrences.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Comments Policies
DROP POLICY IF EXISTS "Workspace members can view comments" ON public.activity_comments;
CREATE POLICY "Workspace members can view comments"
  ON public.activity_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activity_comments.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Workspace members can create comments" ON public.activity_comments;
CREATE POLICY "Workspace members can create comments"
  ON public.activity_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activity_comments.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Journal Policies (Immutable read-only for users, writes via system / service role)
DROP POLICY IF EXISTS "Workspace members can view activity journal" ON public.activity_journal;
CREATE POLICY "Workspace members can view activity journal"
  ON public.activity_journal
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activity_journal.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Workspace members can append to activity journal" ON public.activity_journal;
CREATE POLICY "Workspace members can append to activity journal"
  ON public.activity_journal
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = activity_journal.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );
