-- Support one-time delivery of existing invoices without creating a recurring schedule.
ALTER TABLE public.invoice_scheduled_email_jobs
  ALTER COLUMN schedule_id DROP NOT NULL;

ALTER TABLE public.invoice_scheduled_email_jobs
  ADD COLUMN IF NOT EXISTS job_type VARCHAR(20) NOT NULL DEFAULT 'recurring';

ALTER TABLE public.invoice_scheduled_email_jobs
  DROP CONSTRAINT IF EXISTS invoice_scheduled_email_jobs_job_type_check;

ALTER TABLE public.invoice_scheduled_email_jobs
  ADD CONSTRAINT invoice_scheduled_email_jobs_job_type_check
  CHECK (job_type IN ('recurring', 'individual'));

CREATE INDEX IF NOT EXISTS idx_invoice_email_jobs_workspace_type
  ON public.invoice_scheduled_email_jobs (workspace_id, job_type, scheduled_send_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_individual_invoice_send_date
  ON public.invoice_scheduled_email_jobs (workspace_id, invoice_id, scheduled_send_date)
  WHERE job_type = 'individual' AND status <> 'cancelled';
