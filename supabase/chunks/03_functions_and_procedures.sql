-- ====================================================================
-- CHUNK 03: FUNCTIONS & STORED PROCEDURES
-- Step 3 of 9 — Run third in Supabase SQL Editor
-- ====================================================================

CREATE OR REPLACE FUNCTION public.accept_workspace_invitation (
  p_token text
)
  RETURNS TABLE (
    workspace_id uuid,
    member_id    uuid,
    role_name    text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
  AS $function$
#variable_conflict use_column
DECLARE
  v_user UUID;
  v_hash TEXT;
  v_inv RECORD;
  v_member_id UUID;
  v_role_name TEXT;
  v_workspace_id UUID;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

  v_hash := public.hash_invitation_token(p_token);

  SELECT wi.*, tr.name AS role_name_text
  INTO v_inv
  FROM public.workspace_invitations wi
  JOIN public.team_roles tr ON tr.id = wi.role_id
  WHERE wi.token_hash = v_hash
  FOR UPDATE;

  IF v_inv IS NULL THEN RAISE EXCEPTION 'INVALID_INVITATION'; END IF;
  IF v_inv.status = 'revoked' THEN RAISE EXCEPTION 'INVITATION_REVOKED'; END IF;
  IF v_inv.status = 'accepted' THEN RAISE EXCEPTION 'INVITATION_ALREADY_ACCEPTED'; END IF;
  IF v_inv.expires_at < NOW() OR v_inv.status = 'expired' THEN
    UPDATE public.workspace_invitations SET status = 'expired', updated_at = NOW() WHERE id = v_inv.id;
    RAISE EXCEPTION 'INVITATION_EXPIRED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = v_inv.workspace_id AND wm.user_id = v_user AND wm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.team_roles WHERE id = v_inv.role_id) THEN
    RAISE EXCEPTION 'ROLE_UNAVAILABLE';
  END IF;

  PERFORM public.assert_workspace_seat_available(v_inv.workspace_id);

  INSERT INTO public.workspace_members (workspace_id, user_id, role_id, role, status, invited_by, joined_at)
  VALUES (
    v_inv.workspace_id, v_user, v_inv.role_id,
    (SELECT CASE lower(tr.name)
      WHEN 'owner' THEN 'owner' WHEN 'admin' THEN 'admin' WHEN 'manager' THEN 'manager'
      WHEN 'leasing agent' THEN 'agent' WHEN 'staff' THEN 'staff' ELSE 'viewer' END
     FROM public.team_roles tr WHERE tr.id = v_inv.role_id),
    'active', v_inv.invited_by, NOW()
  )
  ON CONFLICT ON CONSTRAINT uq_workspace_members_ws_user DO UPDATE
  SET role_id = EXCLUDED.role_id, role = EXCLUDED.role, status = 'active', joined_at = NOW(), updated_at = NOW()
  RETURNING id INTO v_member_id;

  UPDATE public.workspace_invitations
  SET status = 'accepted', accepted_at = NOW(), accepted_by = v_user, updated_at = NOW()
  WHERE id = v_inv.id;

  PERFORM public.sync_workspace_member_property_access(v_inv.workspace_id, v_user);

  PERFORM public.log_activity(
    p_action := 'member.invite_accepted',
    p_entity_type := 'workspace_member',
    p_entity_id := v_member_id,
    p_workspace_id := v_inv.workspace_id,
    p_metadata := jsonb_build_object('invitation_id', v_inv.id, 'role_id', v_inv.role_id)
  );

  v_role_name := v_inv.role_name_text;
  v_workspace_id := v_inv.workspace_id;
  RETURN QUERY SELECT v_workspace_id, v_member_id, v_role_name;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."accept_workspace_invitation"(text) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: add_workspace_member_by_profile_id
CREATE OR REPLACE FUNCTION public.add_workspace_member_by_profile_id (
  p_workspace_id uuid,
  p_public_id    text,
  p_role_id      uuid
)
  RETURNS TABLE (
    member_id uuid,
    user_id   uuid,
    role_name text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
#variable_conflict use_column
DECLARE
  v_caller UUID;
  v_target_user UUID;
  v_member_id UUID;
  v_role_name TEXT;
  v_role_workspace UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

  IF NOT public.has_workspace_permission(p_workspace_id, 'team.member.invite', v_caller) THEN
    RAISE EXCEPTION 'FORBIDDEN: missing team.member.invite';
  END IF;

  SELECT p.id INTO v_target_user FROM public.profiles p WHERE p.public_id = p_public_id;
  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id AND wm.user_id = v_target_user AND wm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  SELECT tr.workspace_id, tr.name INTO v_role_workspace, v_role_name FROM public.team_roles tr WHERE tr.id = p_role_id;
  IF v_role_workspace IS NOT NULL AND v_role_workspace != p_workspace_id THEN
    RAISE EXCEPTION 'INVALID_ROLE';
  END IF;

  IF NOT public.can_assign_team_role(p_workspace_id, p_role_id, v_caller) THEN
    RAISE EXCEPTION 'FORBIDDEN: cannot assign role';
  END IF;

  PERFORM public.assert_workspace_seat_available(p_workspace_id);

  INSERT INTO public.workspace_members (workspace_id, user_id, role_id, role, status, invited_by, joined_at)
  VALUES (
    p_workspace_id, v_target_user, p_role_id,
    (SELECT CASE lower(tr.name)
      WHEN 'owner' THEN 'owner' WHEN 'admin' THEN 'admin' WHEN 'manager' THEN 'manager'
      WHEN 'leasing agent' THEN 'agent' WHEN 'staff' THEN 'staff' ELSE 'viewer' END
     FROM public.team_roles tr WHERE tr.id = p_role_id),
    'active', v_caller, NOW()
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role_id = EXCLUDED.role_id, role = EXCLUDED.role, status = 'active', joined_at = NOW(), updated_at = NOW()
  RETURNING id INTO v_member_id;

  PERFORM public.sync_workspace_member_property_access(p_workspace_id, v_target_user);

  PERFORM public.log_activity(
    p_action := 'member.added',
    p_entity_type := 'workspace_member',
    p_entity_id := v_member_id,
    p_workspace_id := p_workspace_id,
    p_metadata := jsonb_build_object('target_user_id', v_target_user, 'role_id', p_role_id)
  );

  RETURN QUERY SELECT v_member_id, v_target_user, v_role_name;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."add_workspace_member_by_profile_id"(uuid, text, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: admin_delete_platform_role
CREATE OR REPLACE FUNCTION public.admin_delete_platform_role (
  p_role_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_is_system BOOLEAN;
  v_user_count INTEGER;
BEGIN
  IF NOT public.has_platform_permission('platform_role.delete', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT is_system_role INTO v_is_system FROM public.platform_roles WHERE id = p_role_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_is_system THEN RAISE EXCEPTION 'SYSTEM_ROLE: System roles cannot be deleted'; END IF;

  SELECT COUNT(*) INTO v_user_count FROM public.platform_user_roles WHERE role_id = p_role_id;
  IF v_user_count > 0 THEN
    RAISE EXCEPTION 'ROLE_IN_USE: % users assigned', v_user_count;
  END IF;

  DELETE FROM public.platform_roles WHERE id = p_role_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_delete_platform_role"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: admin_get_platform_roles_with_stats
CREATE OR REPLACE FUNCTION public.admin_get_platform_roles_with_stats()
  RETURNS TABLE (
    id               uuid,
    name             text,
    description      text,
    is_system_role   boolean,
    permission_count bigint,
    user_count       bigint,
    updated_at       timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF NOT public.has_platform_permission('platform_role.view', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    pr.id, pr.name, pr.description, pr.is_system_role,
    (SELECT COUNT(*) FROM public.platform_role_permissions prp WHERE prp.role_id = pr.id),
    (SELECT COUNT(*) FROM public.platform_user_roles pur WHERE pur.role_id = pr.id),
    pr.updated_at
  FROM public.platform_roles pr
  ORDER BY pr.is_system_role DESC, pr.name;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_get_platform_roles_with_stats"() TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: admin_get_role_impact
CREATE OR REPLACE FUNCTION public.admin_get_role_impact (
  p_entity_type text,
  p_entity_id   uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.has_platform_permission('platform_role.view', auth.uid())
     AND NOT public.has_platform_permission('team_role.view', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_entity_type = 'platform_role' THEN
    SELECT jsonb_build_object(
      'user_count', (SELECT COUNT(*) FROM public.platform_user_roles WHERE role_id = p_entity_id),
      'permission_count', (SELECT COUNT(*) FROM public.platform_role_permissions WHERE role_id = p_entity_id)
    ) INTO v_result;
  ELSIF p_entity_type = 'team_role' THEN
    SELECT jsonb_build_object(
      'member_count', (SELECT COUNT(*) FROM public.workspace_members WHERE role_id = p_entity_id AND status = 'active'),
      'workspace_count', (SELECT COUNT(DISTINCT workspace_id) FROM public.workspace_members WHERE role_id = p_entity_id AND status = 'active'),
      'permission_count', (SELECT COUNT(*) FROM public.team_role_permissions WHERE role_id = p_entity_id)
    ) INTO v_result;
  ELSIF p_entity_type = 'entitlement' THEN
    SELECT jsonb_build_object(
      'plan_count', (SELECT COUNT(*) FROM public.plan_entitlements WHERE entitlement_id = p_entity_id)
    ) INTO v_result;
  ELSE
    RAISE EXCEPTION 'INVALID_ENTITY_TYPE';
  END IF;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_get_role_impact"(text, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: admin_get_system_team_roles_with_stats
CREATE OR REPLACE FUNCTION public.admin_get_system_team_roles_with_stats()
  RETURNS TABLE (
    id               uuid,
    name             text,
    description      text,
    is_system_role   boolean,
    permission_count bigint,
    member_count     bigint,
    workspace_count  bigint,
    updated_at       timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF NOT public.has_platform_permission('team_role.view', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    tr.id, tr.name, tr.description, tr.is_system_role,
    (SELECT COUNT(*) FROM public.team_role_permissions trp WHERE trp.role_id = tr.id),
    (SELECT COUNT(*) FROM public.workspace_members wm WHERE wm.role_id = tr.id AND wm.status = 'active'),
    (SELECT COUNT(DISTINCT wm.workspace_id) FROM public.workspace_members wm WHERE wm.role_id = tr.id AND wm.status = 'active'),
    tr.updated_at
  FROM public.team_roles tr
  WHERE tr.workspace_id IS NULL AND tr.is_system_role = true
  ORDER BY tr.name;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_get_system_team_roles_with_stats"() TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: admin_update_system_team_role
CREATE OR REPLACE FUNCTION public.admin_update_system_team_role (
  p_role_id         uuid,
  p_description     text,
  p_permission_keys text[]
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  IF NOT public.has_platform_permission('team_role.update', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_roles
    WHERE id = p_role_id AND workspace_id IS NULL AND is_system_role = true
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND or not a system role';
  END IF;

  UPDATE public.team_roles SET description = p_description, updated_at = NOW()
  WHERE id = p_role_id;

  DELETE FROM public.team_role_permissions WHERE role_id = p_role_id;

  FOREACH v_key IN ARRAY p_permission_keys LOOP
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'TEAM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.team_role_permissions (role_id, permission_id)
      VALUES (p_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_update_system_team_role"(uuid, text, text[]) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: admin_upsert_platform_role
CREATE OR REPLACE FUNCTION public.admin_upsert_platform_role (
  p_role_id         uuid,
  p_name            text,
  p_description     text,
  p_permission_keys text[]
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
  v_role_id UUID;
  v_is_system BOOLEAN;
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  v_user := auth.uid();

  IF p_role_id IS NULL THEN
    IF NOT public.has_platform_permission('platform_role.create', v_user) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    INSERT INTO public.platform_roles (name, description, is_system_role, created_by)
    VALUES (p_name, p_description, false, v_user)
    RETURNING id INTO v_role_id;
  ELSE
    IF NOT public.has_platform_permission('platform_role.update', v_user) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    SELECT is_system_role INTO v_is_system FROM public.platform_roles WHERE id = p_role_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

    UPDATE public.platform_roles
    SET name = p_name, description = p_description, updated_at = NOW()
    WHERE id = p_role_id;
    v_role_id := p_role_id;

    DELETE FROM public.platform_role_permissions WHERE role_id = p_role_id;
  END IF;

  FOREACH v_key IN ARRAY p_permission_keys LOOP
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'PLATFORM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.platform_role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_role_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."admin_upsert_platform_role"(uuid, text, text, text[]) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: assert_workspace_seat_available
CREATE OR REPLACE FUNCTION public.assert_workspace_seat_available (
  p_workspace_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_current INTEGER;
  v_limit INTEGER;
BEGIN
  v_current := public.count_workspace_seats(p_workspace_id);
  v_limit := public.get_workspace_seat_limit(p_workspace_id);
  IF v_current >= v_limit THEN
    RAISE EXCEPTION 'SEAT_LIMIT_EXCEEDED: Workspace has reached its team member limit (% of %)', v_current, v_limit;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."assert_workspace_seat_available"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: auth_is_service_role
CREATE OR REPLACE FUNCTION public.auth_is_service_role()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SET search_path TO 'public'
  AS $function$
  SELECT COALESCE(auth.role(), '') = 'service_role';
$function$;

GRANT EXECUTE ON FUNCTION "public"."auth_is_service_role"() TO PUBLIC, "postgres", "service_role";


-- Function: can_access_organization
CREATE OR REPLACE FUNCTION public.can_access_organization (
  p_organization_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT public.can_access_workspace(p_organization_id);
$function$;

GRANT EXECUTE ON FUNCTION "public"."can_access_organization"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: can_access_property
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
    WHERE property_id = p_property_id AND user_id = auth.uid() AND status = 'active'
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."can_access_property"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: can_access_workspace
CREATE OR REPLACE FUNCTION public.can_access_workspace (
  p_workspace_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND (
        w.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.workspace_members wm
          WHERE wm.workspace_id = w.id
            AND wm.user_id = (SELECT auth.uid())
            AND wm.status = 'active'
        )
      )
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."can_access_workspace"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: can_assign_team_role
CREATE OR REPLACE FUNCTION public.can_assign_team_role (
  p_workspace_id uuid,
  p_role_id      uuid,
  p_assigner_id  uuid DEFAULT NULL::uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_assigner UUID;
  v_role_workspace UUID;
BEGIN
  v_assigner := COALESCE(p_assigner_id, auth.uid());
  IF v_assigner IS NULL THEN RETURN FALSE; END IF;

  SELECT workspace_id INTO v_role_workspace FROM public.team_roles WHERE id = p_role_id;
  IF v_role_workspace IS NOT NULL AND v_role_workspace != p_workspace_id THEN
    RETURN FALSE;
  END IF;

  -- Every permission in target role must be held by assigner
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.team_role_permissions trp
    JOIN public.permissions p ON p.id = trp.permission_id
    WHERE trp.role_id = p_role_id
      AND p.scope = 'TEAM'
      AND p.key NOT IN (
        SELECT perm FROM public.get_effective_workspace_permissions(p_workspace_id, v_assigner) AS perm
      )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."can_assign_team_role"(uuid, uuid, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: can_write_property
CREATE OR REPLACE FUNCTION public.can_write_property (
  p_property_id uuid,
  p_permission  text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT public.is_platform_admin() OR public.owns_property(p_property_id)
      OR public.has_property_permission(p_property_id, p_permission);
$function$;

GRANT EXECUTE ON FUNCTION "public"."can_write_property"(uuid, text) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: change_workspace_member_role
CREATE OR REPLACE FUNCTION public.change_workspace_member_role (
  p_member_id uuid,
  p_role_id   uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
  v_ws UUID;
  v_target_user UUID;
  v_old_role_id UUID;
BEGIN
  v_user := auth.uid();
  SELECT wm.workspace_id, wm.user_id, wm.role_id
  INTO v_ws, v_target_user, v_old_role_id
  FROM public.workspace_members wm WHERE wm.id = p_member_id;

  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.update', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF NOT public.can_assign_team_role(v_ws, p_role_id, v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN: cannot assign role';
  END IF;

  UPDATE public.workspace_members
  SET role_id = p_role_id,
      role = (SELECT CASE lower(name)
        WHEN 'owner' THEN 'owner' WHEN 'admin' THEN 'admin' WHEN 'manager' THEN 'manager'
        WHEN 'leasing agent' THEN 'agent' WHEN 'staff' THEN 'staff' ELSE 'viewer' END
       FROM public.team_roles WHERE id = p_role_id),
      updated_at = NOW()
  WHERE id = p_member_id;

  PERFORM public.sync_workspace_member_property_access(v_ws, v_target_user);

  PERFORM public.log_activity(
    p_action := 'member.role_changed',
    p_entity_type := 'workspace_member',
    p_entity_id := p_member_id,
    p_workspace_id := v_ws,
    p_metadata := jsonb_build_object('previous_role_id', v_old_role_id, 'new_role_id', p_role_id)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."change_workspace_member_role"(uuid, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: count_workspace_custom_roles
CREATE OR REPLACE FUNCTION public.count_workspace_custom_roles (
  p_workspace_id uuid
)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.team_roles
  WHERE workspace_id = p_workspace_id AND is_system_role = false;
$function$;

GRANT EXECUTE ON FUNCTION "public"."count_workspace_custom_roles"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: count_workspace_seats
CREATE OR REPLACE FUNCTION public.count_workspace_seats (
  p_workspace_id uuid
)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT (
    (SELECT COUNT(*)::INTEGER FROM public.workspace_members
     WHERE workspace_id = p_workspace_id AND status = 'active')
    +
    (SELECT COUNT(*)::INTEGER FROM public.workspace_invitations
     WHERE workspace_id = p_workspace_id AND status = 'pending' AND expires_at > NOW())
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."count_workspace_seats"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: create_workspace_invitation
CREATE OR REPLACE FUNCTION public.create_workspace_invitation (
  p_workspace_id uuid,
  p_role_id      uuid,
  p_invite_type  text    DEFAULT 'LINK'::text,
  p_profile_id   uuid    DEFAULT NULL::uuid,
  p_email        text    DEFAULT NULL::text,
  p_expiry_days  integer DEFAULT 7
)
  RETURNS TABLE (
    invitation_id uuid,
    raw_token     text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
  AS $function$
DECLARE
  v_user UUID;
  v_token TEXT;
  v_token_hash TEXT;
  v_inv_id UUID;
  v_role_workspace UUID;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;

  IF NOT public.has_workspace_permission(p_workspace_id, 'team.member.invite', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN: missing team.member.invite';
  END IF;

  PERFORM public.assert_workspace_seat_available(p_workspace_id);

  SELECT workspace_id INTO v_role_workspace FROM public.team_roles WHERE id = p_role_id;
  IF v_role_workspace IS NOT NULL AND v_role_workspace != p_workspace_id THEN
    RAISE EXCEPTION 'INVALID_ROLE: role does not belong to workspace';
  END IF;

  IF NOT public.can_assign_team_role(p_workspace_id, p_role_id, v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN: cannot assign role with permissions you do not have';
  END IF;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_token_hash := public.hash_invitation_token(v_token);

  INSERT INTO public.workspace_invitations (
    workspace_id, invited_by, email, profile_id, role_id, token_hash,
    invite_type, status, expires_at
  ) VALUES (
    p_workspace_id, v_user, p_email, p_profile_id, p_role_id, v_token_hash,
    p_invite_type, 'pending', NOW() + (p_expiry_days || ' days')::INTERVAL
  )
  RETURNING id INTO v_inv_id;

  PERFORM public.log_activity(
    'member.invite_created', 'workspace_invitation', v_inv_id,
    p_workspace_id, NULL,
    jsonb_build_object('invitation_id', v_inv_id, 'role_id', p_role_id, 'invite_type', p_invite_type)
  );

  RETURN QUERY SELECT v_inv_id, v_token;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."create_workspace_invitation"(uuid, uuid, text, uuid, text, integer) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: create_workspace_team_role
CREATE OR REPLACE FUNCTION public.create_workspace_team_role (
  p_workspace_id    uuid,
  p_name            text,
  p_description     text,
  p_permission_keys text[]
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
  v_role_id UUID;
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  v_user := auth.uid();
  IF NOT public.has_workspace_permission(p_workspace_id, 'team.role.create', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.team_roles (workspace_id, name, description, is_system_role, created_by)
  VALUES (p_workspace_id, p_name, p_description, false, v_user)
  RETURNING id INTO v_role_id;

  FOREACH v_key IN ARRAY p_permission_keys LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.get_effective_workspace_permissions(p_workspace_id, v_user) AS perm
      WHERE perm = v_key
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN: cannot grant permission %', v_key;
    END IF;
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'TEAM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.team_role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  PERFORM public.log_activity('team_role.created', 'team_role', v_role_id, p_workspace_id, NULL,
    jsonb_build_object('name', p_name, 'permission_count', array_length(p_permission_keys, 1)));

  RETURN v_role_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."create_workspace_team_role"(uuid, text, text, text[]) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: current_user_id
CREATE OR REPLACE FUNCTION public.current_user_id()
  RETURNS uuid
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  RETURN auth.uid();
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."current_user_id"() TO PUBLIC, "postgres", "service_role";


-- Function: delete_workspace_team_role
CREATE OR REPLACE FUNCTION public.delete_workspace_team_role (
  p_role_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_ws UUID;
  v_member_count INTEGER;
BEGIN
  SELECT workspace_id INTO v_ws FROM public.team_roles WHERE id = p_role_id AND is_system_role = false;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.role.delete', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COUNT(*) INTO v_member_count FROM public.workspace_members WHERE role_id = p_role_id AND status = 'active';
  IF v_member_count > 0 THEN
    RAISE EXCEPTION 'ROLE_IN_USE: % members assigned', v_member_count;
  END IF;

  DELETE FROM public.team_roles WHERE id = p_role_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."delete_workspace_team_role"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: enforce_property_owner_in_workspace
CREATE OR REPLACE FUNCTION public.enforce_property_owner_in_workspace()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = NEW.workspace_id AND (
      w.owner_id = NEW.owner_id OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = NEW.workspace_id AND wm.user_id = NEW.owner_id AND wm.status = 'active'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Property owner must belong to the workspace';
  END IF;
  RETURN NEW;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."enforce_property_owner_in_workspace"() TO PUBLIC, "postgres", "service_role";


-- Function: enforce_rent_payment_lifecycle
CREATE OR REPLACE FUNCTION public.enforce_rent_payment_lifecycle()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN NEW; END IF;
  IF NEW.property_id IS DISTINCT FROM OLD.property_id OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
     OR NEW.lease_id IS DISTINCT FROM OLD.lease_id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Forbidden: payment ownership fields are not client-writable';
  END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status = 'pending' AND NEW.status IN ('completed','failed') THEN RETURN NEW; END IF;
  IF OLD.status = 'failed' AND NEW.status = 'pending' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Forbidden: invalid payment status transition % → %', OLD.status, NEW.status;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."enforce_rent_payment_lifecycle"() TO PUBLIC, "postgres", "service_role";


-- Function: ensure_single_current_subscription
CREATE OR REPLACE FUNCTION public.ensure_single_current_subscription()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF NEW.status IN ('trialing','active','past_due','paused') THEN
    UPDATE public.subscriptions SET status = 'expired', updated_at = NOW()
    WHERE account_id = NEW.account_id AND id IS DISTINCT FROM NEW.id
      AND status IN ('trialing','active','past_due','paused');
  ELSIF NEW.status IN ('pending_payment','under_review') THEN
    UPDATE public.subscriptions SET status = 'canceled', canceled_at = COALESCE(canceled_at, NOW()), updated_at = NOW()
    WHERE account_id = NEW.account_id AND id IS DISTINCT FROM NEW.id
      AND status IN ('pending_payment','under_review');
  END IF;
  RETURN NEW;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."ensure_single_current_subscription"() TO PUBLIC, "postgres", "service_role";


-- Function: ensure_workspace_owner_membership
CREATE OR REPLACE FUNCTION public.ensure_workspace_owner_membership (
  p_workspace_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_owner_id UUID;
  v_owner_role_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.workspaces WHERE id = p_workspace_id;
  IF v_owner_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_owner_role_id
  FROM public.team_roles
  WHERE workspace_id IS NULL AND lower(name) = 'owner'
  LIMIT 1;

  IF v_owner_role_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.workspace_members (
    workspace_id, user_id, role_id, role, status, joined_at
  ) VALUES (
    p_workspace_id, v_owner_id, v_owner_role_id, 'owner', 'active', NOW()
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role_id = v_owner_role_id,
      role = 'owner',
      status = 'active',
      joined_at = COALESCE(public.workspace_members.joined_at, NOW()),
      updated_at = NOW();
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."ensure_workspace_owner_membership"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: generate_profile_public_id
CREATE OR REPLACE FUNCTION public.generate_profile_public_id()
  RETURNS text
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_id TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_id := 'PL-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public_id = v_id) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."generate_profile_public_id"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";


-- Function: get_assignable_team_roles
CREATE OR REPLACE FUNCTION public.get_assignable_team_roles (
  p_workspace_id uuid,
  p_user_id      uuid DEFAULT NULL::uuid
)
  RETURNS TABLE (
    role_id          uuid,
    name             text,
    description      text,
    is_system_role   boolean,
    permission_count bigint
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  RETURN QUERY
  SELECT tr.id, tr.name, tr.description, tr.is_system_role,
    (SELECT COUNT(*) FROM public.team_role_permissions trp WHERE trp.role_id = tr.id)
  FROM public.team_roles tr
  WHERE (tr.workspace_id IS NULL OR tr.workspace_id = p_workspace_id)
    AND public.can_assign_team_role(p_workspace_id, tr.id, v_user)
  ORDER BY tr.is_system_role DESC, tr.name;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_assignable_team_roles"(uuid, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: get_effective_workspace_permissions
CREATE OR REPLACE FUNCTION public.get_effective_workspace_permissions (
  p_workspace_id uuid,
  p_user_id      uuid DEFAULT NULL::uuid
)
  RETURNS SETOF text
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
  v_role_id UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF v_user IS NULL THEN RETURN; END IF;

  -- Platform admin with team.data.view gets all TEAM permissions for workspace
  IF public.has_platform_permission('team.data.view', v_user)
     OR public.has_platform_permission('team.admin_access', v_user) THEN
    RETURN QUERY SELECT key FROM public.permissions WHERE scope = 'TEAM';
    RETURN;
  END IF;

  SELECT wm.role_id INTO v_role_id
  FROM public.workspace_members wm
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = v_user
    AND wm.status = 'active';

  IF v_role_id IS NULL THEN
    -- Workspace owner without membership row still gets owner role permissions
    IF EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p_workspace_id AND w.owner_id = v_user) THEN
      SELECT tr.id INTO v_role_id
      FROM public.team_roles tr
      WHERE tr.is_system_role = true AND lower(tr.name) = 'owner'
      LIMIT 1;
    END IF;
  END IF;

  IF v_role_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT p.key
  FROM public.team_role_permissions trp
  JOIN public.permissions p ON p.id = trp.permission_id
  WHERE trp.role_id = v_role_id AND p.scope = 'TEAM';
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_effective_workspace_permissions"(uuid, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: get_next_invoice_number
CREATE OR REPLACE FUNCTION public.get_next_invoice_number (
  p_workspace_id uuid,
  p_prefix       text    DEFAULT 'INV'::text,
  p_year         integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_next_num INT;
  v_formatted TEXT;
BEGIN
  INSERT INTO public.invoice_sequences (workspace_id, prefix, year, last_number, updated_at)
  VALUES (p_workspace_id, p_prefix, p_year, 1, NOW())
  ON CONFLICT (workspace_id, prefix, year)
  DO UPDATE SET
    last_number = public.invoice_sequences.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO v_next_num;

  v_formatted := p_prefix || '-' || p_year::TEXT || '-' || LPAD(v_next_num::TEXT, 6, '0');
  RETURN v_formatted;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_next_invoice_number"(uuid, text, integer) TO PUBLIC, "postgres", "service_role";


-- Function: get_role_permissions
CREATE OR REPLACE FUNCTION public.get_role_permissions (
  p_role_id uuid
)
  RETURNS TABLE (
    key      text,
    name     text,
    resource text,
    action   text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT p.key, p.name, p.resource, p.action
  FROM public.team_role_permissions trp
  JOIN public.permissions p ON p.id = trp.permission_id
  WHERE trp.role_id = p_role_id AND p.scope = 'TEAM'
  ORDER BY p.resource, p.action;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_role_permissions"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: get_user_accessible_organization_ids
CREATE OR REPLACE FUNCTION public.get_user_accessible_organization_ids (
  p_user_id uuid DEFAULT NULL::uuid
)
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT public.get_user_accessible_workspace_ids(p_user_id);
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_user_accessible_organization_ids"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: get_user_accessible_property_ids
CREATE OR REPLACE FUNCTION public.get_user_accessible_property_ids (
  p_user_id uuid DEFAULT NULL::uuid
)
  RETURNS SETOF uuid
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE v_user UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  IF v_user IS DISTINCT FROM auth.uid() AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id FROM public.properties p WHERE p.owner_id = v_user AND p.status = 'active'
  UNION
  SELECT pm.property_id FROM public.property_members pm
  JOIN public.properties p ON pm.property_id = p.id
  WHERE pm.user_id = v_user AND pm.status = 'active' AND p.status = 'active';
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_user_accessible_property_ids"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: get_user_accessible_workspace_ids
CREATE OR REPLACE FUNCTION public.get_user_accessible_workspace_ids (
  p_user_id uuid DEFAULT NULL::uuid
)
  RETURNS SETOF uuid
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE v_user UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  IF v_user IS DISTINCT FROM auth.uid() AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN RETURN; END IF;
  RETURN QUERY
  SELECT w.id FROM public.workspaces w WHERE w.owner_id = v_user AND w.status = 'active'
  UNION
  SELECT wm.workspace_id FROM public.workspace_members wm
  JOIN public.workspaces w ON wm.workspace_id = w.id
  WHERE wm.user_id = v_user AND wm.status = 'active' AND w.status = 'active';
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_user_accessible_workspace_ids"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: get_workspace_pending_invitations
CREATE OR REPLACE FUNCTION public.get_workspace_pending_invitations (
  p_workspace_id uuid
)
  RETURNS TABLE (
    id           uuid,
    role_name    text,
    invite_type  text,
    status       text,
    expires_at   timestamp with time zone,
    created_at   timestamp with time zone,
    inviter_name text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF NOT public.has_workspace_permission(p_workspace_id, 'team.member.view') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    wi.id,
    tr.name,
    wi.invite_type,
    wi.status,
    wi.expires_at,
    wi.created_at,
    COALESCE(p.full_name, 'Unknown')
  FROM public.workspace_invitations wi
  JOIN public.team_roles tr ON tr.id = wi.role_id
  LEFT JOIN public.profiles p ON p.id = wi.invited_by
  WHERE wi.workspace_id = p_workspace_id
    AND wi.status = 'pending'
  ORDER BY wi.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_workspace_pending_invitations"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: get_workspace_seat_limit
CREATE OR REPLACE FUNCTION public.get_workspace_seat_limit (
  p_workspace_id uuid
)
  RETURNS integer
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_owner_id UUID;
  v_limit INTEGER;
BEGIN
  SELECT owner_id INTO v_owner_id FROM public.workspaces WHERE id = p_workspace_id;
  IF v_owner_id IS NULL THEN RETURN 0; END IF;

  SELECT (pe.value::TEXT)::INTEGER INTO v_limit
  FROM public.subscriptions s
  JOIN public.plan_entitlements pe ON pe.plan_id = s.plan_id
  JOIN public.entitlements e ON e.id = pe.entitlement_id
  WHERE s.account_id = v_owner_id
    AND s.status IN ('active', 'trialing')
    AND e.key = 'team_members.max'
  ORDER BY s.created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_limit, 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_workspace_seat_limit"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: get_workspace_team_roles
CREATE OR REPLACE FUNCTION public.get_workspace_team_roles (
  p_workspace_id uuid
)
  RETURNS TABLE (
    id               uuid,
    name             text,
    description      text,
    is_system_role   boolean,
    workspace_id     uuid,
    member_count     bigint,
    permission_count bigint
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF NOT public.has_workspace_permission(p_workspace_id, 'team.role.view', auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    tr.id, tr.name, tr.description, tr.is_system_role, tr.workspace_id,
    (SELECT COUNT(*) FROM public.workspace_members wm WHERE wm.role_id = tr.id AND wm.status = 'active'),
    (SELECT COUNT(*) FROM public.team_role_permissions trp WHERE trp.role_id = tr.id)
  FROM public.team_roles tr
  WHERE tr.workspace_id IS NULL OR tr.workspace_id = p_workspace_id
  ORDER BY tr.is_system_role DESC, tr.name;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_workspace_team_roles"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  INSERT INTO public.account_context (user_id, status, onboarding_status, created_at, updated_at)
  VALUES (
    NEW.id,
    'active',
    'not_started',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "postgres", "service_role";


-- Function: has_platform_permission
CREATE OR REPLACE FUNCTION public.has_platform_permission (
  p_permission_key text,
  p_user_id        uuid DEFAULT NULL::uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF v_user IS NULL THEN RETURN FALSE; END IF;

  -- Legacy platform_admins compatibility
  IF EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = v_user AND status = 'active') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.platform_user_roles pur
    JOIN public.platform_role_permissions prp ON prp.role_id = pur.role_id
    JOIN public.permissions p ON p.id = prp.permission_id
    WHERE pur.user_id = v_user AND p.key = p_permission_key AND p.scope = 'PLATFORM'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."has_platform_permission"(text, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: has_property_permission
CREATE OR REPLACE FUNCTION public.has_property_permission (
  p_property_id uuid,
  p_permission  text,
  p_user_id     uuid DEFAULT NULL::uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE v_owner UUID; v_role TEXT; v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF v_user IS NULL THEN RETURN FALSE; END IF;
  IF v_user IS DISTINCT FROM auth.uid() AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN
    RETURN FALSE;
  END IF;
  SELECT owner_id INTO v_owner FROM public.properties WHERE id = p_property_id;
  IF v_owner IS NULL THEN RETURN FALSE; END IF;
  IF v_owner = v_user THEN RETURN TRUE; END IF;
  SELECT role INTO v_role FROM public.property_members
  WHERE property_id = p_property_id AND user_id = v_user AND status = 'active';
  IF v_role IS NULL THEN RETURN FALSE; END IF;
  CASE p_permission
    WHEN 'property.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'property.update' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'property.delete' THEN RETURN v_role = 'owner';
    WHEN 'team.invite' THEN RETURN v_role IN ('owner','manager');
    WHEN 'team.manage_members' THEN RETURN v_role IN ('owner','manager');
    WHEN 'team.remove' THEN RETURN v_role IN ('owner','manager');
    WHEN 'team.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'tenant.create' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'tenant.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'tenant.update' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'lease.create' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'lease.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'lease.update' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'financial.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'financial.manage' THEN RETURN v_role IN ('owner','manager');
    WHEN 'maintenance.create' THEN RETURN v_role IN ('owner','manager','agent','staff');
    WHEN 'maintenance.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'maintenance.manage' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'inspection.create' THEN RETURN v_role IN ('owner','manager','agent');
    WHEN 'inspection.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'document.create' THEN RETURN v_role IN ('owner','manager','agent','staff');
    WHEN 'document.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'task.create' THEN RETURN v_role IN ('owner','manager','agent','staff');
    WHEN 'task.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    WHEN 'reports.view' THEN RETURN v_role IN ('owner','manager','agent','staff','viewer');
    ELSE RETURN FALSE;
  END CASE;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."has_property_permission"(uuid, text, uuid) TO PUBLIC, "postgres", "service_role";


-- Function: has_workspace_permission
CREATE OR REPLACE FUNCTION public.has_workspace_permission (
  p_workspace_id   uuid,
  p_permission_key text,
  p_user_id        uuid DEFAULT NULL::uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());
  IF v_user IS NULL THEN RETURN FALSE; END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.get_effective_workspace_permissions(p_workspace_id, v_user) AS perm
    WHERE perm = p_permission_key
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."has_workspace_permission"(uuid, text, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: hash_invitation_token
CREATE OR REPLACE FUNCTION public.hash_invitation_token (
  p_token text
)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  AS $function$
  SELECT encode(sha256(p_token::bytea), 'hex');
$function$;

GRANT EXECUTE ON FUNCTION "public"."hash_invitation_token"(text) TO PUBLIC, "postgres", "service_role";


-- Function: is_platform_admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid() AND status = 'active') THEN
    RETURN TRUE;
  END IF;
  RETURN public.has_platform_permission('team.admin_access');
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."is_platform_admin"() TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: log_activity
CREATE OR REPLACE FUNCTION public.log_activity (
  p_action       text,
  p_entity_type  text,
  p_entity_id    uuid  DEFAULT NULL::uuid,
  p_workspace_id uuid  DEFAULT NULL::uuid,
  p_property_id  uuid  DEFAULT NULL::uuid,
  p_metadata     jsonb DEFAULT '{}'::jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_property_id IS NOT NULL AND NOT public.can_access_property(p_property_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden: no access to property';
  END IF;
  IF p_workspace_id IS NOT NULL AND NOT public.can_access_workspace(p_workspace_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden: no access to workspace';
  END IF;

  INSERT INTO public.activity_logs (workspace_id, property_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_workspace_id, p_property_id, auth.uid(), p_action, p_entity_type, p_entity_id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."log_activity"(text, text, uuid, uuid, uuid, jsonb) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."log_activity"(text, text, uuid, uuid, uuid, jsonb) FROM PUBLIC;


-- Function: lookup_profile_by_public_id
CREATE OR REPLACE FUNCTION public.lookup_profile_by_public_id (
  p_public_id text
)
  RETURNS TABLE (
    id         uuid,
    public_id  text,
    full_name  text,
    avatar_url text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT p.id, p.public_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.public_id = p_public_id;
$function$;

GRANT EXECUTE ON FUNCTION "public"."lookup_profile_by_public_id"(text) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: map_team_role_to_property_role
CREATE OR REPLACE FUNCTION public.map_team_role_to_property_role (
  p_team_role_name text
)
  RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO 'public'
  AS $function$
BEGIN
  CASE lower(COALESCE(p_team_role_name, ''))
    WHEN 'owner' THEN RETURN 'manager';
    WHEN 'admin' THEN RETURN 'manager';
    WHEN 'manager' THEN RETURN 'manager';
    WHEN 'leasing agent' THEN RETURN 'agent';
    WHEN 'staff' THEN RETURN 'staff';
    WHEN 'landlord' THEN RETURN 'viewer';
    ELSE RETURN 'viewer';
  END CASE;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."map_team_role_to_property_role"(text) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: owns_property
CREATE OR REPLACE FUNCTION public.owns_property (
  p_property_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id AND owner_id = auth.uid());
$function$;

GRANT EXECUTE ON FUNCTION "public"."owns_property"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: owns_subscription_payment
CREATE OR REPLACE FUNCTION public.owns_subscription_payment (
  p_payment_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscription_payments WHERE id = p_payment_id AND account_id = auth.uid()
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."owns_subscription_payment"(uuid) TO PUBLIC, "postgres", "service_role";


-- Function: payment_id_from_storage_path
CREATE OR REPLACE FUNCTION public.payment_id_from_storage_path (
  p_name text
)
  RETURNS uuid
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE part1 TEXT; part2 TEXT; candidate TEXT;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN RETURN NULL; END IF;
  part1 := split_part(p_name, '/', 1); part2 := split_part(p_name, '/', 2);
  IF part2 IS NULL OR part2 = '' THEN RETURN NULL; END IF;
  IF part1 = 'receipts' THEN
    IF split_part(p_name, '/', 3) = '' THEN RETURN NULL; END IF;
    candidate := part2;
  ELSE candidate := part1; END IF;
  BEGIN RETURN candidate::uuid; EXCEPTION WHEN invalid_text_representation THEN RETURN NULL; END;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."payment_id_from_storage_path"(text) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: prevent_activity_log_modification
CREATE OR REPLACE FUNCTION public.prevent_activity_log_modification()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  -- Allow service_role, postgres, supabase_admin, or admin context
  IF (SELECT current_user) IN ('postgres', 'service_role', 'supabase_admin') OR public.auth_is_service_role() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Allow setting foreign keys to NULL during parent entity deletion
  IF TG_OP = 'UPDATE' AND (
    (OLD.property_id IS NOT NULL AND NEW.property_id IS NULL) OR
    (OLD.workspace_id IS NOT NULL AND NEW.workspace_id IS NULL)
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Forbidden: Activity logs are append-only and cannot be updated or deleted';
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."prevent_activity_log_modification"() TO PUBLIC, "postgres", "service_role";


-- Function: protect_account_context_fields
CREATE OR REPLACE FUNCTION public.protect_account_context_fields()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN NEW.updated_at := NOW(); RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.first_login_at IS DISTINCT FROM OLD.first_login_at
     OR NEW.last_login_at IS DISTINCT FROM OLD.last_login_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Forbidden: account_context server fields are not client-writable';
  END IF;
  NEW.updated_at := NOW(); RETURN NEW;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."protect_account_context_fields"() TO PUBLIC, "postgres", "service_role";


-- Function: protect_child_property_id
CREATE OR REPLACE FUNCTION public.protect_child_property_id()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.property_id IS DISTINCT FROM OLD.property_id
     AND NOT public.auth_is_service_role() AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden: property_id cannot be changed by clients';
  END IF;
  RETURN NEW;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."protect_child_property_id"() TO PUBLIC, "postgres", "service_role";


-- Function: protect_created_by
CREATE OR REPLACE FUNCTION public.protect_created_by()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid();
    ELSIF NEW.created_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Forbidden: created_by must equal the authenticated user';
    END IF;
  ELSIF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Forbidden: created_by is immutable';
  END IF;
  RETURN NEW;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."protect_created_by"() TO PUBLIC, "postgres", "service_role";


-- Function: protect_notifications_read_state
CREATE OR REPLACE FUNCTION public.protect_notifications_read_state()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.type IS DISTINCT FROM OLD.type OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.message IS DISTINCT FROM OLD.message OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Forbidden: only notification read_at may be updated by clients';
  END IF;
  RETURN NEW;
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."protect_notifications_read_state"() TO PUBLIC, "postgres", "service_role";


-- Function: protect_platform_admins_mutations
CREATE OR REPLACE FUNCTION public.protect_platform_admins_mutations()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF public.auth_is_service_role() OR current_user IN ('postgres','supabase_admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Forbidden: platform_admins may only be changed via service_role';
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."protect_platform_admins_mutations"() TO PUBLIC, "postgres", "service_role";


-- Function: protect_subscription_payment_client
CREATE OR REPLACE FUNCTION public.protect_subscription_payment_client()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF public.auth_is_service_role() OR public.is_platform_admin() THEN RETURN COALESCE(NEW, OLD); END IF;
  RAISE EXCEPTION 'Forbidden: subscription_payments may only be mutated by trusted server/admin paths';
END; $function$;

GRANT EXECUTE ON FUNCTION "public"."protect_subscription_payment_client"() TO PUBLIC, "postgres", "service_role";


-- Function: receipt_payment_id_from_path
CREATE OR REPLACE FUNCTION public.receipt_payment_id_from_path (
  p_name text
)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SET search_path TO 'public'
  AS $function$
  SELECT public.payment_id_from_storage_path(p_name);
$function$;

GRANT EXECUTE ON FUNCTION "public"."receipt_payment_id_from_path"(text) TO PUBLIC, "postgres", "service_role";


-- Function: record_payment_and_allocate_rpc
CREATE OR REPLACE FUNCTION public.record_payment_and_allocate_rpc (
  p_workspace_id    uuid,
  p_property_id     uuid,
  p_amount          numeric,
  p_payment_date    date,
  p_payment_method  text,
  p_lease_id        uuid    DEFAULT NULL::uuid,
  p_tenant_id       uuid    DEFAULT NULL::uuid,
  p_reference       text    DEFAULT NULL::text,
  p_notes           text    DEFAULT NULL::text,
  p_allocations     jsonb   DEFAULT '[]'::jsonb,
  p_idempotency_key text    DEFAULT NULL::text,
  p_user_id         uuid    DEFAULT NULL::uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user_id UUID;
  v_payment_id UUID;
  v_tx_id UUID;
  v_alloc_item JSONB;
  v_alloc_amount NUMERIC(12, 2);
  v_total_allocated NUMERIC(12, 2) := 0;
  v_rent_period_id UUID;
  v_invoice_id UUID;
  v_inv_total NUMERIC(12, 2);
  v_inv_paid NUMERIC(12, 2);
  v_inv_bal NUMERIC(12, 2);
  v_rp_due NUMERIC(12, 2);
  v_existing_payment_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- 1. Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_payment_id
    FROM public.payments
    WHERE workspace_id = p_workspace_id AND idempotency_key = p_idempotency_key;
    
    IF v_existing_payment_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'payment_id', v_existing_payment_id
      );
    END IF;
  END IF;

  -- 2. Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  -- Normalize allocations parameter (supports JSONB array, stringified array, or null)
  IF p_allocations IS NOT NULL AND jsonb_typeof(p_allocations) = 'string' THEN
    BEGIN
      p_allocations := (p_allocations #>> '{}')::JSONB;
    EXCEPTION WHEN OTHERS THEN
      p_allocations := '[]'::JSONB;
    END;
  END IF;
  IF p_allocations IS NULL OR jsonb_typeof(p_allocations) != 'array' THEN
    p_allocations := '[]'::JSONB;
  END IF;

  -- 3. Calculate total allocated and validate targets
  IF jsonb_array_length(p_allocations) > 0 THEN
    FOR v_alloc_item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
      v_alloc_amount := (v_alloc_item->>'amount')::NUMERIC(12, 2);
      IF v_alloc_amount <= 0 THEN
        RAISE EXCEPTION 'Allocation amount must be greater than zero.';
      END IF;
      v_total_allocated := v_total_allocated + v_alloc_amount;
    END LOOP;

    IF v_total_allocated > p_amount THEN
      RAISE EXCEPTION 'Total allocated amount (%) exceeds payment amount (%).', v_total_allocated, p_amount;
    END IF;
  END IF;

  -- 4. Insert Payment record
  INSERT INTO public.payments (
    workspace_id,
    property_id,
    lease_id,
    tenant_id,
    amount,
    payment_date,
    payment_method,
    status,
    reference,
    notes,
    idempotency_key,
    created_by
  ) VALUES (
    p_workspace_id,
    p_property_id,
    p_lease_id,
    p_tenant_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    'completed',
    p_reference,
    p_notes,
    p_idempotency_key,
    v_user_id
  ) RETURNING id INTO v_payment_id;

  -- 5. Process Allocations
  IF jsonb_array_length(p_allocations) > 0 THEN
    FOR v_alloc_item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
      v_alloc_amount := (v_alloc_item->>'amount')::NUMERIC(12, 2);
      v_rent_period_id := NULLIF(v_alloc_item->>'rent_period_id', '')::UUID;
      v_invoice_id := NULLIF(v_alloc_item->>'invoice_id', '')::UUID;

      -- Insert allocation
      INSERT INTO public.payment_allocations (
        payment_id,
        rent_period_id,
        invoice_id,
        amount_allocated,
        allocated_by
      ) VALUES (
        v_payment_id,
        v_rent_period_id,
        v_invoice_id,
        v_alloc_amount,
        v_user_id
      );

      -- Update invoice if present (with row lock)
      IF v_invoice_id IS NOT NULL THEN
        SELECT total_amount, COALESCE(paid_amount, 0), balance_due
        INTO v_inv_total, v_inv_paid, v_inv_bal
        FROM public.invoices
        WHERE id = v_invoice_id
        FOR UPDATE;

        UPDATE public.invoices
        SET 
          paid_amount = LEAST(v_inv_total, v_inv_paid + v_alloc_amount),
          balance_due = GREATEST(0, v_inv_bal - v_alloc_amount),
          status = CASE 
            WHEN (v_inv_bal - v_alloc_amount) <= 0 THEN 'paid'
            ELSE 'partially_paid'
          END,
          updated_at = NOW()
        WHERE id = v_invoice_id;
      END IF;

      -- Update rent_period if present (with row lock)
      IF v_rent_period_id IS NOT NULL THEN
        SELECT amount_due INTO v_rp_due
        FROM public.rent_periods
        WHERE id = v_rent_period_id
        FOR UPDATE;

        -- Sum total allocations for this rent period
        SELECT COALESCE(SUM(amount_allocated), 0) INTO v_alloc_amount
        FROM public.payment_allocations
        WHERE rent_period_id = v_rent_period_id;

        UPDATE public.rent_periods
        SET 
          status = CASE 
            WHEN v_alloc_amount >= v_rp_due THEN 'paid'
            WHEN v_alloc_amount > 0 THEN 'partially_paid'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = v_rent_period_id;
      END IF;
    END LOOP;
  END IF;

  -- 6. Insert normalized Ledger transaction (Single credit for full bank receipt)
  INSERT INTO public.transactions (
    workspace_id,
    property_id,
    lease_id,
    transaction_date,
    transaction_type,
    description,
    reference,
    debit_amount,
    credit_amount,
    source_type,
    source_id,
    status,
    idempotency_key,
    created_by
  ) VALUES (
    p_workspace_id,
    p_property_id,
    p_lease_id,
    p_payment_date,
    'rent_payment',
    COALESCE(p_reference, 'Tenant Rent Payment'),
    p_reference,
    0.00,
    p_amount,
    'payment',
    v_payment_id,
    'posted',
    p_idempotency_key,
    v_user_id
  ) RETURNING id INTO v_tx_id;

  -- 7. Audit log entry
  INSERT INTO public.activity_logs (
    workspace_id,
    property_id,
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    p_workspace_id,
    p_property_id,
    v_user_id,
    'allocate',
    'payments',
    v_payment_id,
    format('Recorded payment of $%s with %s allocations', p_amount, jsonb_array_length(p_allocations)),
    jsonb_build_object(
      'amount', p_amount,
      'payment_method', p_payment_method,
      'allocations_count', jsonb_array_length(p_allocations),
      'transaction_id', v_tx_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'transaction_id', v_tx_id,
    'amount', p_amount,
    'total_allocated', v_total_allocated,
    'unallocated', p_amount - v_total_allocated
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_payment_and_allocate_rpc (
  p_workspace_id   uuid,
  p_property_id    uuid,
  p_amount         numeric,
  p_payment_date   date,
  p_payment_method text,
  p_lease_id       uuid    DEFAULT NULL::uuid,
  p_tenant_id      uuid    DEFAULT NULL::uuid,
  p_reference      text    DEFAULT NULL::text,
  p_notes          text    DEFAULT NULL::text,
  p_allocations    jsonb   DEFAULT '[]'::jsonb,
  p_user_id        uuid    DEFAULT NULL::uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user_id UUID;
  v_payment_id UUID;
  v_alloc_item JSONB;
  v_alloc_amount NUMERIC(12, 2);
  v_total_allocated NUMERIC(12, 2) := 0;
  v_rent_period_id UUID;
  v_invoice_id UUID;
  v_inv_total NUMERIC(12, 2);
  v_inv_paid NUMERIC(12, 2);
  v_inv_bal NUMERIC(12, 2);
  v_rp_due NUMERIC(12, 2);
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- 1. Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  -- Normalize allocations parameter
  IF p_allocations IS NOT NULL AND jsonb_typeof(p_allocations) = 'string' THEN
    BEGIN
      p_allocations := (p_allocations #>> '{}')::JSONB;
    EXCEPTION WHEN OTHERS THEN
      p_allocations := '[]'::JSONB;
    END;
  END IF;
  IF p_allocations IS NULL OR jsonb_typeof(p_allocations) != 'array' THEN
    p_allocations := '[]'::JSONB;
  END IF;

  -- 2. Calculate total allocated and validate targets
  IF jsonb_array_length(p_allocations) > 0 THEN
    FOR v_alloc_item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
      v_alloc_amount := (v_alloc_item->>'amount')::NUMERIC(12, 2);
      IF v_alloc_amount <= 0 THEN
        RAISE EXCEPTION 'Allocation amount must be greater than zero.';
      END IF;
      v_total_allocated := v_total_allocated + v_alloc_amount;
    END LOOP;

    IF v_total_allocated > p_amount THEN
      RAISE EXCEPTION 'Total allocated amount (%) exceeds payment amount (%).', v_total_allocated, p_amount;
    END IF;
  END IF;

  -- 3. Insert single unified Payment record (payment_type = 'rent', direction = 'in')
  INSERT INTO public.payments (
    workspace_id,
    property_id,
    lease_id,
    tenant_id,
    payment_type,
    direction,
    amount,
    currency,
    payment_date,
    payment_method,
    status,
    reference,
    description,
    notes,
    created_by
  ) VALUES (
    p_workspace_id,
    p_property_id,
    p_lease_id,
    p_tenant_id,
    'rent',
    'in',
    p_amount,
    'AUD',
    p_payment_date,
    p_payment_method,
    'completed',
    p_reference,
    COALESCE(p_reference, 'Tenant Rent Payment'),
    p_notes,
    v_user_id
  ) RETURNING id INTO v_payment_id;

  -- 4. Process Allocations
  IF jsonb_array_length(p_allocations) > 0 THEN
    FOR v_alloc_item IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
      v_alloc_amount := (v_alloc_item->>'amount')::NUMERIC(12, 2);
      v_rent_period_id := NULLIF(v_alloc_item->>'rent_period_id', '')::UUID;
      v_invoice_id := NULLIF(v_alloc_item->>'invoice_id', '')::UUID;

      -- Insert allocation
      INSERT INTO public.payment_allocations (
        payment_id,
        rent_period_id,
        invoice_id,
        amount_allocated,
        allocated_by
      ) VALUES (
        v_payment_id,
        v_rent_period_id,
        v_invoice_id,
        v_alloc_amount,
        v_user_id
      );

      -- Update invoice if present (with row lock)
      IF v_invoice_id IS NOT NULL THEN
        SELECT total_amount, COALESCE(paid_amount, 0), balance_due
        INTO v_inv_total, v_inv_paid, v_inv_bal
        FROM public.invoices
        WHERE id = v_invoice_id
        FOR UPDATE;

        UPDATE public.invoices
        SET 
          paid_amount = LEAST(v_inv_total, v_inv_paid + v_alloc_amount),
          balance_due = GREATEST(0, v_inv_bal - v_alloc_amount),
          status = CASE 
            WHEN (v_inv_bal - v_alloc_amount) <= 0 THEN 'paid'
            ELSE 'partially_paid'
          END,
          updated_at = NOW()
        WHERE id = v_invoice_id;
      END IF;

      -- Update rent_period if present (with row lock)
      IF v_rent_period_id IS NOT NULL THEN
        SELECT amount_due INTO v_rp_due
        FROM public.rent_periods
        WHERE id = v_rent_period_id
        FOR UPDATE;

        -- Sum total allocations for this rent period
        SELECT COALESCE(SUM(amount_allocated), 0) INTO v_alloc_amount
        FROM public.payment_allocations
        WHERE rent_period_id = v_rent_period_id;

        UPDATE public.rent_periods
        SET 
          status = CASE 
            WHEN v_alloc_amount >= v_rp_due THEN 'paid'
            WHEN v_alloc_amount > 0 THEN 'partially_paid'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = v_rent_period_id;
      END IF;
    END LOOP;
  END IF;

  -- 5. Audit log entry
  INSERT INTO public.activity_logs (
    workspace_id,
    property_id,
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    p_workspace_id,
    p_property_id,
    v_user_id,
    'allocate',
    'payments',
    v_payment_id,
    format('Recorded rent payment of $%s with %s allocations', p_amount, jsonb_array_length(p_allocations)),
    jsonb_build_object(
      'payment_type', 'rent',
      'direction', 'in',
      'amount', p_amount,
      'payment_method', p_payment_method,
      'allocations_count', jsonb_array_length(p_allocations)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'amount', p_amount,
    'total_allocated', v_total_allocated,
    'unallocated', p_amount - v_total_allocated
  );
END;
$function$;

GRANT EXECUTE
  ON FUNCTION "public"."record_payment_and_allocate_rpc"(uuid, uuid, numeric, date, text, uuid, uuid, text, text, jsonb, text, uuid)
  TO PUBLIC, "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."record_payment_and_allocate_rpc"(uuid, uuid, numeric, date, text, uuid, uuid, text, text, jsonb, uuid) TO PUBLIC, "postgres", "service_role";


-- Function: remove_workspace_member
CREATE OR REPLACE FUNCTION public.remove_workspace_member (
  p_member_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
  v_ws UUID;
  v_target_user UUID;
  v_owner_id UUID;
BEGIN
  v_user := auth.uid();
  SELECT wm.workspace_id, wm.user_id INTO v_ws, v_target_user
  FROM public.workspace_members wm WHERE wm.id = p_member_id;
  SELECT owner_id INTO v_owner_id FROM public.workspaces WHERE id = v_ws;

  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_target_user = v_owner_id THEN RAISE EXCEPTION 'CANNOT_REMOVE_OWNER'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.remove', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.workspace_members SET status = 'removed', updated_at = NOW() WHERE id = p_member_id;
  PERFORM public.revoke_workspace_member_property_access(v_ws, v_target_user, 'removed');

  PERFORM public.log_activity(
    p_action := 'member.removed',
    p_entity_type := 'workspace_member',
    p_entity_id := p_member_id,
    p_workspace_id := v_ws,
    p_metadata := '{}'::jsonb
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."remove_workspace_member"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: resolve_invitation_by_token
CREATE OR REPLACE FUNCTION public.resolve_invitation_by_token (
  p_token text
)
  RETURNS TABLE (
    invitation_id  uuid,
    status         text,
    workspace_id   uuid,
    workspace_name text,
    inviter_name   text,
    role_name      text,
    role_id        uuid,
    expires_at     timestamp with time zone,
    is_expired     boolean
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_hash TEXT;
BEGIN
  v_hash := public.hash_invitation_token(p_token);

  RETURN QUERY
  SELECT
    wi.id,
    wi.status,
    w.id,
    w.name,
    COALESCE(p.full_name, 'A team member'),
    tr.name,
    tr.id,
    wi.expires_at,
    (wi.expires_at < NOW() OR wi.status = 'expired')
  FROM public.workspace_invitations wi
  JOIN public.workspaces w ON w.id = wi.workspace_id
  JOIN public.team_roles tr ON tr.id = wi.role_id
  LEFT JOIN public.profiles p ON p.id = wi.invited_by
  WHERE wi.token_hash = v_hash;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."resolve_invitation_by_token"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";


-- Function: reverse_payment_rpc
CREATE OR REPLACE FUNCTION public.reverse_payment_rpc (
  p_payment_id uuid,
  p_reason     text,
  p_user_id    uuid DEFAULT NULL::uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user_id UUID;
  v_payment RECORD;
  v_alloc RECORD;
  v_reversal_payment_id UUID;
  v_rev_direction TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- 1. Fetch & lock payment
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record % not found.', p_payment_id;
  END IF;

  IF v_payment.status = 'reversed' THEN
    RAISE EXCEPTION 'Payment % is already reversed.', p_payment_id;
  END IF;

  -- 2. Reverse all allocations on invoices & rent periods if any
  FOR v_alloc IN 
    SELECT * FROM public.payment_allocations 
    WHERE payment_id = p_payment_id
    FOR UPDATE
  LOOP
    -- Restore invoice balance
    IF v_alloc.invoice_id IS NOT NULL THEN
      UPDATE public.invoices
      SET 
        paid_amount = GREATEST(0, COALESCE(paid_amount, 0) - v_alloc.amount_allocated),
        balance_due = LEAST(total_amount, COALESCE(balance_due, 0) + v_alloc.amount_allocated),
        status = CASE 
          WHEN (COALESCE(paid_amount, 0) - v_alloc.amount_allocated) <= 0 THEN 'unpaid'
          ELSE 'partially_paid'
        END,
        updated_at = NOW()
      WHERE id = v_alloc.invoice_id;
    END IF;

    -- Restore rent period status
    IF v_alloc.rent_period_id IS NOT NULL THEN
      UPDATE public.rent_periods
      SET 
        status = 'due',
        updated_at = NOW()
      WHERE id = v_alloc.rent_period_id;
    END IF;
  END LOOP;

  -- 3. Mark original payment status as reversed
  UPDATE public.payments
  SET status = 'reversed', updated_at = NOW()
  WHERE id = p_payment_id;

  -- 4. Determine compensating reversal direction:
  -- If original was 'in' (rent/income), compensating payment direction is 'out'.
  -- If original was 'out' (expense/refund), compensating payment direction is 'in'.
  IF v_payment.direction = 'in' THEN
    v_rev_direction := 'out';
  ELSE
    v_rev_direction := 'in';
  END IF;

  -- 5. Insert compensating reversal payment entry in payments table
  INSERT INTO public.payments (
    workspace_id,
    property_id,
    lease_id,
    tenant_id,
    category_id,
    payment_type,
    direction,
    amount,
    currency,
    payment_date,
    payment_method,
    status,
    reference,
    description,
    reverses_payment_id,
    created_by
  ) VALUES (
    v_payment.workspace_id,
    v_payment.property_id,
    v_payment.lease_id,
    v_payment.tenant_id,
    v_payment.category_id,
    'adjustment',
    v_rev_direction,
    v_payment.amount,
    COALESCE(v_payment.currency, 'AUD'),
    CURRENT_DATE,
    v_payment.payment_method,
    'completed',
    format('REV-%s', COALESCE(v_payment.reference, substring(p_payment_id::text, 1, 8))),
    format('Reversal of %s Payment (%s) - %s', v_payment.payment_type, COALESCE(v_payment.reference, p_payment_id::text), p_reason),
    p_payment_id,
    v_user_id
  ) RETURNING id INTO v_reversal_payment_id;

  -- 6. Activity log
  INSERT INTO public.activity_logs (
    workspace_id,
    property_id,
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    v_payment.workspace_id,
    v_payment.property_id,
    v_user_id,
    'reverse',
    'payments',
    p_payment_id,
    format('Reversed %s payment of $%s. Reason: %s', v_payment.payment_type, v_payment.amount, p_reason),
    jsonb_build_object(
      'payment_type', v_payment.payment_type,
      'amount', v_payment.amount,
      'reason', p_reason,
      'reversal_payment_id', v_reversal_payment_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'reversal_payment_id', v_reversal_payment_id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."reverse_payment_rpc"(uuid, text, uuid) TO PUBLIC, "postgres", "service_role";


-- Function: revoke_workspace_invitation
CREATE OR REPLACE FUNCTION public.revoke_workspace_invitation (
  p_invitation_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
  v_ws UUID;
BEGIN
  v_user := auth.uid();
  SELECT workspace_id INTO v_ws FROM public.workspace_invitations WHERE id = p_invitation_id;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.invite', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  UPDATE public.workspace_invitations
  SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
  WHERE id = p_invitation_id AND status = 'pending';
  PERFORM public.log_activity('member.invite_revoked', 'workspace_invitation', p_invitation_id, v_ws, NULL, '{}'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."revoke_workspace_invitation"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: revoke_workspace_member_property_access
CREATE OR REPLACE FUNCTION public.revoke_workspace_member_property_access (
  p_workspace_id uuid,
  p_user_id      uuid,
  p_status       text DEFAULT 'removed'::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  UPDATE public.property_members pm
  SET status = p_status,
      updated_at = NOW()
  FROM public.properties p
  WHERE pm.property_id = p.id
    AND p.workspace_id = p_workspace_id
    AND pm.user_id = p_user_id
    AND p.owner_id IS DISTINCT FROM p_user_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."revoke_workspace_member_property_access"(uuid, uuid, text) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: seed_default_expense_categories
CREATE OR REPLACE FUNCTION public.seed_default_expense_categories (
  p_workspace_id uuid,
  p_user_id      uuid DEFAULT NULL::uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  INSERT INTO public.expense_categories (workspace_id, name, code, description, created_by)
  VALUES
    (p_workspace_id, 'Repairs & Maintenance', 'REP', 'Plumbing, electrical, handyman, general maintenance', p_user_id),
    (p_workspace_id, 'Council Rates & Taxes', 'RATES', 'Local council rates, land tax, emergency services levies', p_user_id),
    (p_workspace_id, 'Water & Utilities', 'UTIL', 'Water usage, electricity, gas, internet', p_user_id),
    (p_workspace_id, 'Building & Landlord Insurance', 'INS', 'Property insurance premiums, landlord protection cover', p_user_id),
    (p_workspace_id, 'Property Management Fees', 'MGMT', 'Management commission, letting fees, admin charges', p_user_id),
    (p_workspace_id, 'Mortgage Interest', 'MORT', 'Interest paid on investment property loans', p_user_id),
    (p_workspace_id, 'Capital Improvements', 'CAPEX', 'Major renovations, structural upgrades, asset additions', p_user_id),
    (p_workspace_id, 'Cleaning & Gardening', 'CLEAN', 'End of lease cleaning, lawn care, pest control', p_user_id),
    (p_workspace_id, 'Legal & Professional Fees', 'LEGAL', 'Accountant fees, legal representation, tribunal costs', p_user_id)
  ON CONFLICT (workspace_id, lower(name)) DO NOTHING;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."seed_default_expense_categories"(uuid, uuid) TO PUBLIC, "postgres", "service_role";


-- Function: suspend_workspace_member
CREATE OR REPLACE FUNCTION public.suspend_workspace_member (
  p_member_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
  v_ws UUID;
  v_target_user UUID;
BEGIN
  v_user := auth.uid();
  SELECT wm.workspace_id, wm.user_id INTO v_ws, v_target_user
  FROM public.workspace_members wm WHERE wm.id = p_member_id;

  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.member.update', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.workspace_members SET status = 'suspended', updated_at = NOW() WHERE id = p_member_id;
  PERFORM public.revoke_workspace_member_property_access(v_ws, v_target_user, 'suspended');

  PERFORM public.log_activity(
    p_action := 'member.suspended',
    p_entity_type := 'workspace_member',
    p_entity_id := p_member_id,
    p_workspace_id := v_ws,
    p_metadata := '{}'::jsonb
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."suspend_workspace_member"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: sync_property_workspace_team_access
CREATE OR REPLACE FUNCTION public.sync_property_workspace_team_access()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_member RECORD;
BEGIN
  FOR v_member IN
    SELECT wm.user_id
    FROM public.workspace_members wm
    WHERE wm.workspace_id = NEW.workspace_id
      AND wm.status = 'active'
  LOOP
    PERFORM public.sync_workspace_member_property_access(NEW.workspace_id, v_member.user_id);
  END LOOP;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."sync_property_workspace_team_access"() TO PUBLIC, "postgres", "service_role";


-- Function: sync_workspace_member_property_access
CREATE OR REPLACE FUNCTION public.sync_workspace_member_property_access (
  p_workspace_id uuid,
  p_user_id      uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_member RECORD;
  v_property_role TEXT;
BEGIN
  SELECT wm.role_id, tr.name AS role_name
  INTO v_member
  FROM public.workspace_members wm
  LEFT JOIN public.team_roles tr ON tr.id = wm.role_id
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = p_user_id
    AND wm.status = 'active';

  IF v_member IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.has_workspace_permission(p_workspace_id, 'property.view', p_user_id) THEN
    RETURN;
  END IF;

  v_property_role := public.map_team_role_to_property_role(v_member.role_name);

  INSERT INTO public.property_members (property_id, user_id, role, status, joined_at)
  SELECT p.id, p_user_id, v_property_role, 'active', NOW()
  FROM public.properties p
  WHERE p.workspace_id = p_workspace_id
    AND p.status = 'active'
    AND p.owner_id IS DISTINCT FROM p_user_id
  ON CONFLICT (property_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      status = 'active',
      updated_at = NOW();
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."sync_workspace_member_property_access"(uuid, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: sync_workspace_member_role_text
CREATE OR REPLACE FUNCTION public.sync_workspace_member_role_text()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_role_name TEXT;
BEGIN
  IF NEW.role_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT lower(name) INTO v_role_name FROM public.team_roles WHERE id = NEW.role_id;
  IF v_role_name IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.role := CASE v_role_name
    WHEN 'owner' THEN 'owner'
    WHEN 'admin' THEN 'admin'
    WHEN 'manager' THEN 'manager'
    WHEN 'leasing agent' THEN 'agent'
    WHEN 'staff' THEN 'staff'
    ELSE 'viewer'
  END;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."sync_workspace_member_role_text"() TO PUBLIC, "postgres", "service_role";


-- Function: tenant_can_read_lease
CREATE OR REPLACE FUNCTION public.tenant_can_read_lease (
  p_lease_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.lease_tenants lt
    INNER JOIN public.tenants t ON t.id = lt.tenant_id
    WHERE lt.lease_id = p_lease_id
      AND t.user_id::text = auth.uid()::text
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."tenant_can_read_lease"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: tenant_can_read_unit
CREATE OR REPLACE FUNCTION public.tenant_can_read_unit (
  p_unit_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT false;
$function$;

GRANT EXECUTE ON FUNCTION "public"."tenant_can_read_unit"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: transfer_workspace_ownership
CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership (
  p_workspace_id      uuid,
  p_new_owner_user_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_actor UUID;
  v_old_owner UUID;
  v_owner_role_id UUID;
  v_admin_role_id UUID;
  v_new_member_id UUID;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  IF NOT public.has_workspace_permission(p_workspace_id, 'team.settings.update', v_actor) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  SELECT owner_id INTO v_old_owner FROM public.workspaces WHERE id = p_workspace_id FOR UPDATE;
  IF v_old_owner IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_old_owner = p_new_owner_user_id THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_new_owner_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'TARGET_NOT_MEMBER';
  END IF;

  SELECT id INTO v_owner_role_id FROM public.team_roles WHERE workspace_id IS NULL AND lower(name) = 'owner' LIMIT 1;
  SELECT id INTO v_admin_role_id FROM public.team_roles WHERE workspace_id IS NULL AND lower(name) = 'admin' LIMIT 1;

  UPDATE public.workspaces SET owner_id = p_new_owner_user_id, updated_at = NOW() WHERE id = p_workspace_id;

  UPDATE public.workspace_members
  SET role_id = v_owner_role_id, updated_at = NOW()
  WHERE workspace_id = p_workspace_id AND user_id = p_new_owner_user_id;

  IF v_admin_role_id IS NOT NULL AND v_old_owner IS NOT NULL THEN
    UPDATE public.workspace_members
    SET role_id = v_admin_role_id, updated_at = NOW()
    WHERE workspace_id = p_workspace_id AND user_id = v_old_owner;
  END IF;

  PERFORM public.log_activity(
    'workspace.ownership_transferred', 'workspace', p_workspace_id, p_workspace_id, NULL,
    jsonb_build_object('previous_owner_id', v_old_owner, 'new_owner_id', p_new_owner_user_id)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."transfer_workspace_ownership"(uuid, uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: trg_profiles_set_public_id
CREATE OR REPLACE FUNCTION public.trg_profiles_set_public_id()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
    NEW.public_id := public.generate_profile_public_id();
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trg_profiles_set_public_id"() TO PUBLIC, "postgres", "service_role";


-- Function: trg_workspaces_ensure_owner_membership
CREATE OR REPLACE FUNCTION public.trg_workspaces_ensure_owner_membership()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  PERFORM public.ensure_workspace_owner_membership(NEW.id);
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trg_workspaces_ensure_owner_membership"() TO PUBLIC, "postgres", "service_role";


-- Function: update_workspace_team_role
CREATE OR REPLACE FUNCTION public.update_workspace_team_role (
  p_role_id         uuid,
  p_name            text,
  p_description     text,
  p_permission_keys text[]
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_user UUID;
  v_ws UUID;
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  v_user := auth.uid();
  SELECT workspace_id INTO v_ws FROM public.team_roles WHERE id = p_role_id AND is_system_role = false;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'NOT_FOUND or system role'; END IF;
  IF NOT public.has_workspace_permission(v_ws, 'team.role.update', v_user) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.team_roles SET name = p_name, description = p_description, updated_at = NOW()
  WHERE id = p_role_id;

  DELETE FROM public.team_role_permissions WHERE role_id = p_role_id;

  FOREACH v_key IN ARRAY p_permission_keys LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.get_effective_workspace_permissions(v_ws, v_user) AS perm WHERE perm = v_key
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN: cannot grant permission %', v_key;
    END IF;
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'TEAM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.team_role_permissions (role_id, permission_id) VALUES (p_role_id, v_perm_id);
    END IF;
  END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_workspace_team_role"(uuid, text, text, text[]) TO PUBLIC, "authenticated", "postgres", "service_role";


-- Function: user_owns_or_member_workspace
CREATE OR REPLACE FUNCTION public.user_owns_or_member_workspace (
  p_workspace_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND (
        w.owner_id::text = (SELECT auth.uid())::text
        OR EXISTS (
          SELECT 1
          FROM public.workspace_members wm
          WHERE wm.workspace_id = w.id
            AND wm.user_id::text = (SELECT auth.uid())::text
            AND wm.status = 'active'
        )
      )
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."user_owns_or_member_workspace"(uuid) TO PUBLIC, "authenticated", "postgres", "service_role";


-- ====================================================================
