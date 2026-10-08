-- Seed activity module permissions and link to system team roles
INSERT INTO public.permissions (key, name, description, scope, resource, action)
VALUES
  ('activity.view', 'View Activities', 'View property compliance activities, autopilot tasks, calendar and history', 'TEAM', 'activity', 'view'),
  ('activity.create', 'Create Activities', 'Create property activities, automated recurring schedules and inspection instances', 'TEAM', 'activity', 'create'),
  ('activity.update', 'Update Activities', 'Update activity details, due dates, statuses and notes', 'TEAM', 'activity', 'update'),
  ('activity.delete', 'Delete Activities', 'Delete or archive property activities', 'TEAM', 'activity', 'delete'),
  ('activity.assign', 'Assign Activities', 'Assign and reassign responsible teammates to activity tasks', 'TEAM', 'activity', 'assign')
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    scope = EXCLUDED.scope,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    updated_at = NOW();

-- Assign activity permissions to system team roles
DO $$
DECLARE
  v_perm_view UUID;
  v_perm_create UUID;
  v_perm_update UUID;
  v_perm_delete UUID;
  v_perm_assign UUID;
  v_owner UUID;
  v_admin UUID;
  v_manager UUID;
  v_agent UUID;
  v_staff UUID;
  v_viewer UUID;
BEGIN
  SELECT id INTO v_perm_view FROM public.permissions WHERE key = 'activity.view';
  SELECT id INTO v_perm_create FROM public.permissions WHERE key = 'activity.create';
  SELECT id INTO v_perm_update FROM public.permissions WHERE key = 'activity.update';
  SELECT id INTO v_perm_delete FROM public.permissions WHERE key = 'activity.delete';
  SELECT id INTO v_perm_assign FROM public.permissions WHERE key = 'activity.assign';

  SELECT id INTO v_owner FROM public.team_roles WHERE is_system_role = true AND lower(name) = 'owner';
  SELECT id INTO v_admin FROM public.team_roles WHERE is_system_role = true AND lower(name) = 'admin';
  SELECT id INTO v_manager FROM public.team_roles WHERE is_system_role = true AND lower(name) = 'manager';
  SELECT id INTO v_agent FROM public.team_roles WHERE is_system_role = true AND lower(name) = 'leasing agent';
  SELECT id INTO v_staff FROM public.team_roles WHERE is_system_role = true AND lower(name) = 'staff';
  SELECT id INTO v_viewer FROM public.team_roles WHERE is_system_role = true AND lower(name) = 'viewer';

  -- Owner / Admin / Manager: all permissions
  IF v_owner IS NOT NULL THEN
    INSERT INTO public.team_role_permissions (role_id, permission_id)
    VALUES (v_owner, v_perm_view), (v_owner, v_perm_create), (v_owner, v_perm_update), (v_owner, v_perm_delete), (v_owner, v_perm_assign)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_admin IS NOT NULL THEN
    INSERT INTO public.team_role_permissions (role_id, permission_id)
    VALUES (v_admin, v_perm_view), (v_admin, v_perm_create), (v_admin, v_perm_update), (v_admin, v_perm_delete), (v_admin, v_perm_assign)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_manager IS NOT NULL THEN
    INSERT INTO public.team_role_permissions (role_id, permission_id)
    VALUES (v_manager, v_perm_view), (v_manager, v_perm_create), (v_manager, v_perm_update), (v_manager, v_perm_delete), (v_manager, v_perm_assign)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Leasing Agent: view, create, update, assign
  IF v_agent IS NOT NULL THEN
    INSERT INTO public.team_role_permissions (role_id, permission_id)
    VALUES (v_agent, v_perm_view), (v_agent, v_perm_create), (v_agent, v_perm_update), (v_agent, v_perm_assign)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Staff: view, update
  IF v_staff IS NOT NULL THEN
    INSERT INTO public.team_role_permissions (role_id, permission_id)
    VALUES (v_staff, v_perm_view), (v_staff, v_perm_update)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Viewer: view
  IF v_viewer IS NOT NULL THEN
    INSERT INTO public.team_role_permissions (role_id, permission_id)
    VALUES (v_viewer, v_perm_view)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
