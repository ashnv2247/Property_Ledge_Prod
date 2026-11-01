-- ====================================================================
-- Migration: 20261101000001_primary_admin_email_configuration.sql
-- Description: Centralize Primary Admin Notification Email and Decouple
--              from Individual Platform Admin User Accounts.
-- ====================================================================

BEGIN;

-- 1. Create centralized platform notification configuration table
CREATE TABLE IF NOT EXISTS public.platform_notification_settings (
  id integer PRIMARY KEY DEFAULT 1,
  primary_admin_email text NOT NULL DEFAULT 'shdeveloper2247@gmail.com',
  email_notifications_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed initial configuration with shdeveloper2247@gmail.com
INSERT INTO public.platform_notification_settings (id, primary_admin_email, email_notifications_enabled)
VALUES (1, 'shdeveloper2247@gmail.com', true)
ON CONFLICT (id) DO UPDATE
SET primary_admin_email = 'shdeveloper2247@gmail.com',
    email_notifications_enabled = true,
    updated_at = now();

-- 2. Secure platform_notification_settings with RLS
ALTER TABLE public.platform_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_notif_settings_select ON public.platform_notification_settings;
CREATE POLICY platform_notif_settings_select ON public.platform_notification_settings
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS platform_notif_settings_update ON public.platform_notification_settings;
CREATE POLICY platform_notif_settings_update ON public.platform_notification_settings
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 3. Extend email_events status check to support 'simulated' alongside pending/sent/failed
ALTER TABLE public.email_events DROP CONSTRAINT IF EXISTS email_events_status_check;
ALTER TABLE public.email_events ADD CONSTRAINT email_events_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'simulated'::text]));

-- 4. Replace notify_platform_admins function
-- Guarantees:
--  - In-app notification for EVERY active platform admin
--  - Exactly ONE email queued to primary_admin_email per business event
--  - Full idempotency across webhook / database retries
--  - Independent of individual admin in-app notification preferences
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
  v_notif_key text;
  v_last_notif_id uuid := NULL;
  v_primary_email text;
  v_email_enabled boolean;
  v_email_key text;
BEGIN
  -- PART 1: In-app notifications to all active platform administrators
  FOR r_admin IN
    SELECT pa.user_id
    FROM public.platform_admins pa
    WHERE pa.status = 'active'
  LOOP
    -- Check individual in-app preference for this administrator
    SELECT in_app_enabled, event_subscriptions
    INTO v_pref
    FROM public.admin_notification_preferences
    WHERE admin_user_id = r_admin.user_id;

    IF FOUND THEN
      v_in_app := v_pref.in_app_enabled AND COALESCE((v_pref.event_subscriptions->p_event_type->>'in_app')::boolean, true);
    ELSE
      v_in_app := true;
    END IF;

    -- Deterministic in-app idempotency key per admin user
    v_notif_key := p_event_type || ':' || p_source_id || ':' || p_event_fingerprint || ':' || r_admin.user_id;

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
      RETURNING id INTO v_last_notif_id;

      IF v_last_notif_id IS NULL THEN
        SELECT id INTO v_last_notif_id
        FROM public.notifications
        WHERE user_id = r_admin.user_id AND idempotency_key = v_notif_key;
      END IF;
    END IF;
  END LOOP;

  -- PART 2: Queue exactly ONE email to the primary platform notification email
  SELECT primary_admin_email, email_notifications_enabled
  INTO v_primary_email, v_email_enabled
  FROM public.platform_notification_settings
  WHERE id = 1;

  -- Safe fallback defaults
  v_primary_email := COALESCE(NULLIF(trim(v_primary_email), ''), 'shdeveloper2247@gmail.com');
  v_email_enabled := COALESCE(v_email_enabled, true);

  IF v_email_enabled AND v_primary_email IS NOT NULL AND length(v_primary_email) > 0 THEN
    -- Central event idempotency key (independent of admin user accounts)
    v_email_key := 'email:platform:' || p_event_type || ':' || p_source_id || ':' || p_event_fingerprint;

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
      v_primary_email,
      p_email_subject,
      p_email_template,
      p_email_variables,
      'pending',
      v_last_notif_id,
      v_email_key,
      'resend'
    )
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
    DO NOTHING;
  END IF;

END;
$function$;

COMMIT;

