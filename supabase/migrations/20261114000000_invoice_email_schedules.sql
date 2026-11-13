-- ====================================================================
-- PropertyLedge: Schedule Email - Recurring Invoice Management System
-- Migration: 20261114000000_invoice_email_schedules.sql
-- ====================================================================

-- 1. Create invoice_email_schedules table
CREATE TABLE IF NOT EXISTS public.invoice_email_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  
  -- Recipient Info
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  
  -- Schedule Configuration
  billing_start_month VARCHAR(7) NOT NULL, -- e.g. '2027-01'
  billing_end_month VARCHAR(7) NOT NULL,   -- e.g. '2027-12'
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
  generation_day_of_month INT NOT NULL DEFAULT 1,
  due_days_after INT NOT NULL DEFAULT 7,
  due_date_fixed INT,
  timezone VARCHAR(50) NOT NULL DEFAULT 'Australia/Sydney',
  
  -- Mode & Lifecycle
  email_mode VARCHAR(20) NOT NULL DEFAULT 'automatic' CHECK (email_mode IN ('automatic', 'manual')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled', 'failed')),
  
  -- Counters
  invoices_generated_count INT NOT NULL DEFAULT 0,
  emails_sent_count INT NOT NULL DEFAULT 0,
  emails_pending_count INT NOT NULL DEFAULT 0,
  emails_failed_count INT NOT NULL DEFAULT 0,
  
  -- Template & Customization
  subject_template TEXT,
  custom_message TEXT,
  drive_folder_url TEXT,
  
  -- Metadata / Audit
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT chk_months_order CHECK (billing_end_month >= billing_start_month)
);

-- 2. Alter invoices table to link with schedules
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.invoice_email_schedules(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS source_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending';

-- 3. Create invoice_scheduled_email_jobs table
CREATE TABLE IF NOT EXISTS public.invoice_scheduled_email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES public.invoice_email_schedules(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  
  billing_month VARCHAR(7) NOT NULL,
  scheduled_send_date TIMESTAMPTZ NOT NULL,
  attempted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  failure_reason TEXT,
  provider_message_id TEXT,
  
  subject TEXT,
  custom_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT uq_schedule_invoice UNIQUE (schedule_id, invoice_id)
);

-- 4. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_invoice_email_schedules_ws_status ON public.invoice_email_schedules (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_email_schedules_created ON public.invoice_email_schedules (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_email_schedules_source ON public.invoice_email_schedules (source_invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_email_jobs_due ON public.invoice_scheduled_email_jobs (status, scheduled_send_date) WHERE status IN ('scheduled', 'pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_invoice_email_jobs_schedule ON public.invoice_scheduled_email_jobs (schedule_id);
CREATE INDEX IF NOT EXISTS idx_invoice_email_jobs_invoice ON public.invoice_scheduled_email_jobs (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_schedule_id ON public.invoices (schedule_id);

-- 5. Row Level Security
ALTER TABLE public.invoice_email_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_scheduled_email_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view schedules in authorized workspaces" ON public.invoice_email_schedules;
DROP POLICY IF EXISTS "Users can insert schedules in authorized workspaces" ON public.invoice_email_schedules;
DROP POLICY IF EXISTS "Users can update schedules in authorized workspaces" ON public.invoice_email_schedules;
DROP POLICY IF EXISTS "Users can delete schedules in authorized workspaces" ON public.invoice_email_schedules;

DROP POLICY IF EXISTS "Users can view email jobs in authorized workspaces" ON public.invoice_scheduled_email_jobs;
DROP POLICY IF EXISTS "Users can insert email jobs in authorized workspaces" ON public.invoice_scheduled_email_jobs;
DROP POLICY IF EXISTS "Users can update email jobs in authorized workspaces" ON public.invoice_scheduled_email_jobs;
DROP POLICY IF EXISTS "Users can delete email jobs in authorized workspaces" ON public.invoice_scheduled_email_jobs;

-- Policies for invoice_email_schedules
CREATE POLICY "Users can view schedules in authorized workspaces"
  ON public.invoice_email_schedules FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert schedules in authorized workspaces"
  ON public.invoice_email_schedules FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update schedules in authorized workspaces"
  ON public.invoice_email_schedules FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete schedules in authorized workspaces"
  ON public.invoice_email_schedules FOR DELETE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- Policies for invoice_scheduled_email_jobs
CREATE POLICY "Users can view email jobs in authorized workspaces"
  ON public.invoice_scheduled_email_jobs FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert email jobs in authorized workspaces"
  ON public.invoice_scheduled_email_jobs FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update email jobs in authorized workspaces"
  ON public.invoice_scheduled_email_jobs FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete email jobs in authorized workspaces"
  ON public.invoice_scheduled_email_jobs FOR DELETE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invoice_email_schedules TO authenticated;
GRANT ALL ON TABLE public.invoice_email_schedules TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invoice_scheduled_email_jobs TO authenticated;
GRANT ALL ON TABLE public.invoice_scheduled_email_jobs TO service_role;

