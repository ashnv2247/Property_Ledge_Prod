-- Fix create_workspace_invitation to support environments where gen_random_bytes is in extensions or pgcrypto schema
CREATE OR REPLACE FUNCTION public.create_workspace_invitation (
  p_workspace_id uuid,
  p_role_id      uuid,
  p_invite_type  text    DEFAULT 'EMAIL'::text,
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

  -- Generate secure random token using standard UUIDs and random bits
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
