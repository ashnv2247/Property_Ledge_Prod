-- ====================================================================
-- PROPERTYLEDGE: SUPER ADMIN USER SEED SCRIPT
-- ====================================================================
-- Target Email: admin@propertyledge.com.au
-- Role: Platform Super Administrator (full platform + workspace permissions)
-- Idempotent: Can be run multiple times safely.
-- ====================================================================

-- Ensure pgcrypto extension is available for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_email            TEXT := 'admin@propertyledge.com.au';
  v_password         TEXT := 'PL#Admin_9xK2$vM8q!2026';
  v_user_id          UUID;
  v_platform_role_id UUID;
  v_workspace_id     UUID;
  v_owner_role_id    UUID := 'fc6629d9-28c6-4005-80ab-d9d08329722c'; -- System 'Owner' role
  v_biz_plan_id      UUID := '00000000-0000-0000-0000-000000000005'; -- Portfolio Pro tier plan
  v_encrypted_pw     TEXT;
BEGIN
  -- Generate bcrypt password hash
  BEGIN
    v_encrypted_pw := extensions.crypt(v_password, extensions.gen_salt('bf', 10));
  EXCEPTION WHEN OTHERS THEN
    v_encrypted_pw := crypt(v_password, gen_salt('bf', 10));
  END;

  -- ------------------------------------------------------------------
  -- 1. Create or Update auth.users record
  -- ------------------------------------------------------------------
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_pw,
      now(),
      NULL,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"PropertyLedge Administrator","is_admin":true}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"full_name":"PropertyLedge Administrator","is_admin":true}'::jsonb,
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- ------------------------------------------------------------------
  -- 2. Create or Update auth.identities record (enables email/password login)
  -- ------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id) THEN
    BEGIN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        v_user_id::text,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
        'email',
        v_user_id::text,
        now(),
        now(),
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        INSERT INTO auth.identities (
          id,
          user_id,
          identity_data,
          provider,
          last_sign_in_at,
          created_at,
          updated_at
        ) VALUES (
          v_user_id::text,
          v_user_id,
          jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
          'email',
          now(),
          now(),
          now()
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END IF;

  -- ------------------------------------------------------------------
  -- 3. Public Profile (public.profiles)
  -- ------------------------------------------------------------------
  INSERT INTO public.profiles (id, full_name, phone, created_at, updated_at)
  VALUES (v_user_id, 'PropertyLedge Administrator', '+61 400 000 000', now(), now())
  ON CONFLICT (id) DO UPDATE
  SET full_name = 'PropertyLedge Administrator',
      updated_at = now();

  -- ------------------------------------------------------------------
  -- 4. Account Context (public.account_context)
  -- ------------------------------------------------------------------
  INSERT INTO public.account_context (user_id, status, onboarding_status, first_login_at, last_login_at, created_at, updated_at)
  VALUES (v_user_id, 'active', 'completed', now(), now(), now(), now())
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'active',
      onboarding_status = 'completed',
      updated_at = now();

  -- ------------------------------------------------------------------
  -- 5. Platform Admin Row (public.platform_admins)
  -- ------------------------------------------------------------------
  BEGIN
    ALTER TABLE public.platform_admins DISABLE TRIGGER trg_protect_platform_admins;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  INSERT INTO public.platform_admins (user_id, status, notes, created_at)
  VALUES (v_user_id, 'active', 'Primary platform super administrator', now())
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'active',
      notes = 'Primary platform super administrator';

  BEGIN
    ALTER TABLE public.platform_admins ENABLE TRIGGER trg_protect_platform_admins;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- ------------------------------------------------------------------
  -- 6. Platform Roles & Permissions (public.platform_roles, public.platform_user_roles)
  -- ------------------------------------------------------------------
  INSERT INTO public.platform_roles (id, name, description, is_system_role)
  VALUES ('00000000-0000-0000-0000-000000000001', 'Super Admin', 'Full platform-wide administrative privileges', true)
  ON CONFLICT (name) DO UPDATE SET is_system_role = true
  RETURNING id INTO v_platform_role_id;

  -- Link all PLATFORM-scoped permissions to Super Admin role
  INSERT INTO public.platform_role_permissions (role_id, permission_id)
  SELECT v_platform_role_id, id FROM public.permissions WHERE scope = 'PLATFORM'
  ON CONFLICT DO NOTHING;

  -- Assign the role to the admin user
  INSERT INTO public.platform_user_roles (user_id, role_id)
  VALUES (v_user_id, v_platform_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- ------------------------------------------------------------------
  -- 7. Default Admin Workspace (public.workspaces)
  -- ------------------------------------------------------------------
  SELECT id INTO v_workspace_id FROM public.workspaces WHERE owner_id = v_user_id LIMIT 1;

  IF v_workspace_id IS NULL THEN
    INSERT INTO public.workspaces (id, name, slug, owner_id, status, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'PropertyLedge HQ',
      'propertyledge-hq',
      v_user_id,
      'active',
      now(),
      now()
    )
    RETURNING id INTO v_workspace_id;

    -- Workspace Membership (as Owner)
    INSERT INTO public.workspace_members (workspace_id, user_id, role_id, status, created_at, updated_at)
    VALUES (
      v_workspace_id,
      v_user_id,
      v_owner_role_id,
      'active',
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;

    -- Account Subscription (Portfolio Pro plan, long validity)
    INSERT INTO public.subscriptions (
      id,
      account_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_biz_plan_id,
      'active',
      now(),
      now() + INTERVAL '10 years',
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE '===========================================================';
  RAISE NOTICE 'Super Admin user seeded successfully!';
  RAISE NOTICE 'Email:    %', v_email;
  RAISE NOTICE 'User ID:  %', v_user_id;
  RAISE NOTICE '===========================================================';
END $$;
