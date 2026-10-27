-- Extend existing public.subscription_payments with optional metadata columns
-- Reuses existing subscription_payments, subscriptions, and payment_proofs tables

ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS customer_message text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'bank_transfer';

-- Update RLS or trigger functions if necessary so admin updates can save rejection_reason & internal_notes
