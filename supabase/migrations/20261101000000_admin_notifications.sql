-- ====================================================================
-- Migration: 20261101000000_admin_notifications.sql
-- Description: Centralized Admin Notification System and Transactional Email Outbox
-- ====================================================================

BEGIN;

-- 1. Extend public.notifications for rich metadata, deep linking, and idempotency
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Unique index to prevent duplicate notifications per admin user
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_idempotency
  ON public.notifications (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Fast index for fetching unread notifications by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read_at)
  WHERE read_at IS NULL;

-- 2. Extend public.email_events for transactional outbox delivery
ALTER TABLE public.email_events
  ADD COLUMN IF NOT EXISTS notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_provider text DEFAULT 'resend' NOT NULL;

-- Unique index for email idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_events_idempotency
  ON public.email_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Fast index for outbox workers querying pending emails
CREATE INDEX IF NOT EXISTS idx_email_events_pending
  ON public.email_events (status, created_at)
  WHERE status = 'pending';

-- 3. Update protect_notifications_read_state trigger function to protect new columns
CREATE OR REPLACE FUNCTION public.protect_notifications_read_state()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.target_url IS DISTINCT FROM OLD.target_url
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
    RAISE EXCEPTION 'Forbidden: only notification read_at may be updated by clients';
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Create admin notification preferences table
CREATE TABLE IF NOT EXISTS public.admin_notification_preferences (
  admin_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true NOT NULL,
  in_app_enabled boolean DEFAULT true NOT NULL,
  event_subscriptions jsonb DEFAULT '{
    "user_registered": {"in_app": true, "email": true},
    "subscription_initiated": {"in_app": true, "email": true},
    "payment_success": {"in_app": true, "email": true},
    "payment_failed": {"in_app": true, "email": true},
    "subscription_cancelled": {"in_app": true, "email": true},
    "subscription_expired": {"in_app": true, "email": true}
  }'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on admin_notification_preferences
ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Allow platform admins to view and manage their own preferences
DROP POLICY IF EXISTS admin_pref_select ON public.admin_notification_preferences;
CREATE POLICY admin_pref_select ON public.admin_notification_preferences
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() AND admin_user_id = auth.uid());

DROP POLICY IF EXISTS admin_pref_insert ON public.admin_notification_preferences;
CREATE POLICY admin_pref_insert ON public.admin_notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() AND admin_user_id = auth.uid());

DROP POLICY IF EXISTS admin_pref_update ON public.admin_notification_preferences;
CREATE POLICY admin_pref_update ON public.admin_notification_preferences
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin() AND admin_user_id = auth.uid())
  WITH CHECK (public.is_platform_admin() AND admin_user_id = auth.uid());

-- 5. Enable Supabase Realtime for public.notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 6. Core dispatcher function: notify_platform_admins
CREATE OR REPLACE FUNCTION public.notify_platform_admins(
  p_event_type text,
  p_title text,
  p_message text,
  p_target_url text,
  p_metadata jsonb,
  p_email_subject text,
  p_email_template text,
  p_email_variables jsonb,
  p_source_id text,
  p_event_fingerprint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  r_admin RECORD;
  v_pref RECORD;
  v_in_app boolean;
  v_email boolean;
  v_notif_key text;
  v_email_key text;
  v_notif_id uuid;
BEGIN
  -- Iterate through all active platform admins
  FOR r_admin IN
    SELECT pa.user_id, u.email
    FROM public.platform_admins pa
    JOIN auth.users u ON u.id = pa.user_id
    WHERE pa.status = 'active'
  LOOP
    -- Fetch preferences if customized, otherwise default to enabled
    SELECT
      email_enabled,
      in_app_enabled,
      event_subscriptions
    INTO v_pref
    FROM public.admin_notification_preferences
    WHERE admin_user_id = r_admin.user_id;

    IF FOUND THEN
      v_in_app := v_pref.in_app_enabled AND COALESCE((v_pref.event_subscriptions->p_event_type->>'in_app')::boolean, true);
      v_email := v_pref.email_enabled AND COALESCE((v_pref.event_subscriptions->p_event_type->>'email')::boolean, true);
    ELSE
      v_in_app := true;
      v_email := true;
    END IF;

    -- Construct deterministic idempotency key for in-app notification
    v_notif_key := p_event_type || ':' || p_source_id || ':' || p_event_fingerprint || ':' || r_admin.user_id;
    v_notif_id := NULL;

    -- Insert in-app notification if enabled
    IF v_in_app THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        target_url,
        metadata,
        idempotency_key
      ) VALUES (
        r_admin.user_id,
        p_event_type,
        p_title,
        p_message,
        p_target_url,
        p_metadata,
        v_notif_key
      )
      ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
      DO NOTHING
      RETURNING id INTO v_notif_id;

      -- If existing row conflicted, retrieve its id
      IF v_notif_id IS NULL THEN
        SELECT id INTO v_notif_id
        FROM public.notifications
        WHERE user_id = r_admin.user_id AND idempotency_key = v_notif_key;
      END IF;
    END IF;

    -- Enqueue email in transactional outbox (public.email_events) if enabled
    IF v_email AND r_admin.email IS NOT NULL AND length(trim(r_admin.email)) > 0 THEN
      v_email_key := 'email:' || v_notif_key;

      INSERT INTO public.email_events (
        recipient,
        subject,
        template_type,
        variables,
        status,
        notification_id,
        idempotency_key,
        delivery_provider
      ) VALUES (
        r_admin.email,
        p_email_subject,
        p_email_template,
        p_email_variables,
        'pending',
        v_notif_id,
        v_email_key,
        'resend'
      )
      ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
      DO NOTHING;
    END IF;

  END LOOP;
END;
$function$;

-- 7. Trigger: New User Registered (auth.users AFTER INSERT)
CREATE OR REPLACE FUNCTION public.trg_notify_admin_user_registered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_name text;
  v_created_at_fmt text;
BEGIN
  -- Only process genuine user records with an email
  IF NEW.email IS NULL OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_created_at_fmt := to_char(COALESCE(NEW.created_at, now()) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

  PERFORM public.notify_platform_admins(
    'user_registered',
    'New User Registered',
    'A new user (' || v_name || ') has joined PropertyLedge.',
    '/admin/users/' || NEW.id,
    jsonb_build_object(
      'userId', NEW.id,
      'email', NEW.email,
      'fullName', v_name,
      'registeredAt', v_created_at_fmt
    ),
    'New User Registration – PropertyLedge',
    'admin_user_registered',
    jsonb_build_object(
      'userId', NEW.id,
      'userName', v_name,
      'userEmail', NEW.email,
      'registeredAt', v_created_at_fmt,
      'profileUrl', '/admin/users/' || NEW.id
    ),
    NEW.id::text,
    'created'
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_after_user_insert_notify_admin ON auth.users;
CREATE TRIGGER trg_after_user_insert_notify_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_admin_user_registered();

-- 8. Trigger: Subscription Payments (subscription_payments AFTER INSERT OR UPDATE)
CREATE OR REPLACE FUNCTION public.trg_notify_admin_payment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user_name text;
  v_user_email text;
  v_plan_name text;
  v_billing_interval text;
  v_start_date text;
  v_end_date text;
  v_amount numeric;
  v_currency text;
  v_now_fmt text;
BEGIN
  v_now_fmt := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

  -- Fetch user email and full name
  SELECT
    COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    u.email
  INTO v_user_name, v_user_email
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = NEW.account_id;

  v_user_name := COALESCE(v_user_name, 'Customer');
  v_user_email := COALESCE(v_user_email, 'N/A');

  -- Fetch plan details and current period from subscriptions
  SELECT
    COALESCE(sp.name, 'Subscription Plan'),
    COALESCE(NEW.billing_cycle, sp.billing_interval, 'monthly'),
    to_char(s.current_period_start AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    to_char(s.current_period_end AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  INTO v_plan_name, v_billing_interval, v_start_date, v_end_date
  FROM public.subscriptions s
  LEFT JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.id = NEW.subscription_id;

  v_plan_name := COALESCE(v_plan_name, 'Subscription Plan');
  v_billing_interval := COALESCE(v_billing_interval, 'monthly');
  v_currency := COALESCE(NEW.currency, 'AUD');

  -- CASE A: Subscription Initiation (INSERT with status = 'pending')
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    v_amount := COALESCE(NEW.expected_amount, 0);

    PERFORM public.notify_platform_admins(
      'subscription_initiated',
      'New Subscription Attempt',
      v_user_name || ' initiated checkout for ' || v_plan_name || ' (' || v_billing_interval || '). Status: Pending Payment.',
      '/admin/payments',
      jsonb_build_object(
        'paymentId', NEW.id,
        'subscriptionId', NEW.subscription_id,
        'accountId', NEW.account_id,
        'userName', v_user_name,
        'userEmail', v_user_email,
        'planName', v_plan_name,
        'billingInterval', v_billing_interval,
        'amount', v_amount,
        'currency', v_currency,
        'reference', NEW.reference,
        'status', 'Pending Payment',
        'initiatedAt', v_now_fmt
      ),
      'New Subscription Attempt – PropertyLedge',
      'admin_subscription_initiated',
      jsonb_build_object(
        'paymentId', NEW.id,
        'subscriptionId', NEW.subscription_id,
        'userName', v_user_name,
        'userEmail', v_user_email,
        'planName', v_plan_name,
        'billingInterval', v_billing_interval,
        'amount', v_amount,
        'currency', v_currency,
        'reference', NEW.reference,
        'status', 'Pending Payment',
        'initiatedAt', v_now_fmt,
        'adminUrl', '/admin/payments'
      ),
      NEW.id::text,
      'initiated'
    );
    RETURN NEW;
  END IF;

  -- CASE B: Payment Verified / Successful (UPDATE transition to 'verified')
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'verified' AND NEW.status = 'verified' THEN
    v_amount := COALESCE(NEW.submitted_amount, NEW.expected_amount, 0);

    PERFORM public.notify_platform_admins(
      'payment_success',
      'New Subscription Activated',
      'Payment of $' || trim(to_char(v_amount, '99999990.00')) || ' ' || v_currency || ' verified for ' || v_user_name || ' (' || v_plan_name || ').',
      '/admin/payments',
      jsonb_build_object(
        'paymentId', NEW.id,
        'subscriptionId', NEW.subscription_id,
        'accountId', NEW.account_id,
        'userName', v_user_name,
        'userEmail', v_user_email,
        'planName', v_plan_name,
        'billingInterval', v_billing_interval,
        'amount', v_amount,
        'currency', v_currency,
        'reference', NEW.reference,
        'startDate', v_start_date,
        'endDate', v_end_date,
        'verifiedAt', v_now_fmt
      ),
      'New Subscription Activated – PropertyLedge',
      'admin_payment_success',
      jsonb_build_object(
        'paymentId', NEW.id,
        'subscriptionId', NEW.subscription_id,
        'userName', v_user_name,
        'userEmail', v_user_email,
        'planName', v_plan_name,
        'billingInterval', v_billing_interval,
        'amount', v_amount,
        'currency', v_currency,
        'reference', NEW.reference,
        'startDate', v_start_date,
        'endDate', v_end_date,
        'adminUrl', '/admin/payments'
      ),
      NEW.id::text,
      'verified'
    );
    RETURN NEW;
  END IF;

  -- CASE C: Payment Failed / Rejected (UPDATE transition to 'rejected')
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'rejected' AND NEW.status = 'rejected' THEN
    v_amount := COALESCE(NEW.submitted_amount, NEW.expected_amount, 0);

    PERFORM public.notify_platform_admins(
      'payment_failed',
      'Payment Failed',
      'Payment failed for ' || v_user_name || ' (' || v_plan_name || '): ' || COALESCE(NEW.rejection_reason, 'Verification rejected'),
      '/admin/payments',
      jsonb_build_object(
        'paymentId', NEW.id,
        'subscriptionId', NEW.subscription_id,
        'accountId', NEW.account_id,
        'userName', v_user_name,
        'userEmail', v_user_email,
        'planName', v_plan_name,
        'amount', v_amount,
        'currency', v_currency,
        'failureReason', COALESCE(NEW.rejection_reason, 'Payment rejected by administrator'),
        'reference', NEW.reference,
        'failedAt', v_now_fmt
      ),
      'Payment Failed – PropertyLedge',
      'admin_payment_failed',
      jsonb_build_object(
        'paymentId', NEW.id,
        'subscriptionId', NEW.subscription_id,
        'userName', v_user_name,
        'userEmail', v_user_email,
        'planName', v_plan_name,
        'amount', v_amount,
        'currency', v_currency,
        'failureReason', COALESCE(NEW.rejection_reason, 'Payment rejected by administrator'),
        'reference', NEW.reference,
        'failedAt', v_now_fmt,
        'adminUrl', '/admin/payments'
      ),
      NEW.id::text,
      'rejected'
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_subscription_payments_admin_notify ON public.subscription_payments;
CREATE TRIGGER trg_subscription_payments_admin_notify
  AFTER INSERT OR UPDATE ON public.subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_admin_payment_event();

-- 9. Trigger: Subscriptions Lifecycle (subscriptions AFTER UPDATE for cancellation & expiration)
CREATE OR REPLACE FUNCTION public.trg_notify_admin_subscription_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user_name text;
  v_user_email text;
  v_plan_name text;
  v_cancel_date text;
  v_end_date text;
  v_now_fmt text;
BEGIN
  v_now_fmt := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

  -- Fetch user email and full name
  SELECT
    COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    u.email
  INTO v_user_name, v_user_email
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = NEW.account_id;

  v_user_name := COALESCE(v_user_name, 'Customer');
  v_user_email := COALESCE(v_user_email, 'N/A');

  -- Fetch plan name
  SELECT COALESCE(sp.name, 'Subscription Plan')
  INTO v_plan_name
  FROM public.subscription_plans sp
  WHERE sp.id = NEW.plan_id;

  v_plan_name := COALESCE(v_plan_name, 'Subscription Plan');
  v_cancel_date := to_char(COALESCE(NEW.canceled_at, now()) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  v_end_date := to_char(NEW.current_period_end AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

  -- CASE A: Subscription Cancelled
  IF OLD.status IS DISTINCT FROM 'canceled' AND NEW.status = 'canceled' THEN
    PERFORM public.notify_platform_admins(
      'subscription_cancelled',
      'Subscription Cancelled',
      v_user_name || ' cancelled their ' || v_plan_name || ' subscription.',
      '/admin/subscriptions/' || NEW.id,
      jsonb_build_object(
        'subscriptionId', NEW.id,
        'accountId', NEW.account_id,
        'userName', v_user_name,
        'userEmail', v_user_email,
        'planName', v_plan_name,
        'cancellationDate', v_cancel_date,
        'accessActiveUntil', v_end_date,
        'cancelAtPeriodEnd', COALESCE(NEW.cancel_at_period_end, false),
        'status', NEW.status
      ),
      'Subscription Cancelled – PropertyLedge',
      'admin_subscription_cancelled',
      jsonb_build_object(
        'subscriptionId', NEW.id,
        'userName', v_user_name,
        'userEmail', v_user_email,
        'planName', v_plan_name,
        'cancellationDate', v_cancel_date,
        'accessActiveUntil', v_end_date,
        'cancelAtPeriodEnd', COALESCE(NEW.cancel_at_period_end, false),
        'status', NEW.status,
        'adminUrl', '/admin/subscriptions/' || NEW.id
      ),
      NEW.id::text,
      'canceled'
    );
    RETURN NEW;
  END IF;

  -- CASE B: Subscription Expired
  IF OLD.status IS DISTINCT FROM 'expired' AND NEW.status = 'expired' THEN
    PERFORM public.notify_platform_admins(
      'subscription_expired',
      'Subscription Expired',
      v_user_name || ' subscription for ' || v_plan_name || ' has expired.',
      '/admin/subscriptions/' || NEW.id,
      jsonb_build_object(
        'subscriptionId', NEW.id,
        'accountId', NEW.account_id,
        'userName', v_user_name,
        'userEmail', v_user_email,
        'planName', v_plan_name,
        'expirationDate', COALESCE(v_end_date, v_now_fmt),
        'status', NEW.status
      ),
      'Subscription Expired – PropertyLedge',
      'admin_subscription_expired',
      jsonb_build_object(
        'subscriptionId', NEW.id,
        'userName', v_user_name,
        'userEmail', v_user_email,
        'planName', v_plan_name,
        'expirationDate', COALESCE(v_end_date, v_now_fmt),
        'status', NEW.status,
        'adminUrl', '/admin/subscriptions/' || NEW.id
      ),
      NEW.id::text,
      'expired'
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_subscriptions_admin_notify ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_admin_notify
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_admin_subscription_event();

COMMIT;

