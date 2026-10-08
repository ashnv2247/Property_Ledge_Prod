-- Seed Task & Activity module permissions into public.permissions
INSERT INTO public.permissions (key, name, description, scope, resource, action)
VALUES
  ('activity.view', 'View All Activities', 'View all property compliance activities, autopilot tasks, calendar and history across workspace', 'TEAM', 'activity', 'view'),
  ('activity.create', 'Create Activities', 'Create property activities, automated recurring schedules and inspection instances', 'TEAM', 'activity', 'create'),
  ('activity.update', 'Update Activities', 'Update activity details, due dates, statuses and notes', 'TEAM', 'activity', 'update'),
  ('activity.delete', 'Delete Activities', 'Delete or archive property activities', 'TEAM', 'activity', 'delete'),
  ('activity.assign', 'Assign Activities', 'Assign and reassign responsible teammates to activity tasks', 'TEAM', 'activity', 'assign'),
  ('task.view', 'View Assigned Tasks', 'View tasks and activities assigned to the user or workspace tasks', 'TEAM', 'task', 'view'),
  ('task.create', 'Create Tasks', 'Create new tasks and checklist items', 'TEAM', 'task', 'create'),
  ('task.update', 'Update Tasks', 'Update status, details, due dates and progress of tasks', 'TEAM', 'task', 'update'),
  ('task.delete', 'Delete Tasks', 'Delete or archive task items', 'TEAM', 'task', 'delete'),
  ('task.assign', 'Assign Tasks', 'Assign tasks to other team members', 'TEAM', 'task', 'assign')
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    scope = EXCLUDED.scope,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    updated_at = NOW();

-- Assign task & activity permissions to system team roles
DO $$
DECLARE
  v_act_view UUID;
  v_act_create UUID;
  v_act_update UUID;
  v_act_delete UUID;
  v_act_assign UUID;
  
  v_task_view UUID;
  v_task_create UUID;
  v_task_update UUID;
  v_task_delete UUID;
  v_task_assign UUID;

  v_owner UUID;
  v_admin UUID;
  v_manager UUID;
  v_agent UUID;
  v_staff UUID;
  v_viewer UUID;
BEGIN
  SELECT id INTO v_act_view FROM public.permissions WHERE key = 'activity.view';
  SELECT id INTO v_act_create FROM public.permissions WHERE key = 'activity.create';
  SELECT id INTO v_act_update FROM public.permissions WHERE key = 'activity.update';
  SELECT id INTO v_act_delete FROM public.permissions WHERE key = 'activity.delete';
  SELECT id INTO v_act_assign FROM public.permissions WHERE key = 'activity.assign';

  SELECT id INTO v_task_view FROM public.permissions WHERE key = 'task.view';
  SELECT id INTO v_task_create FROM public.permissions WHERE key = 'task.create';
  SELECT id INTO v_task_update FROM public.permissions WHERE key = 'task.update';
  SELECT id INTO v_task_delete FROM public.permissions WHERE key = 'task.delete';
  SELECT id INTO v_task_assign FROM public.permissions WHERE key = 'task.assign';

  SELECT id INTO v_owner FROM public.team_roles WHERE is_system_role = true AND lower(name) = 'owner';
  SELECT id INTO v_admin FROM public.team_roles WHERE is_system_role = true AND lower(name) = 'admin';
  SELECT id INTO v_manager FROM public.team_roles WHERE is_system_role = true AND lower(name) = 'manager';
  SELECT id INTO v_agent FROM public.team_roles WHERE is_system_role = true AND lower(name) = 'leasing agent';
  SELECT id INTO v_staff FROM public.team_roles WHERE is_system_role = true AND lower(name) = 'staff';
  SELECT id INTO v_viewer FROM public.team_roles WHERE is_system_role = true AND lower(name) = 'viewer';

  -- Owner / Admin / Manager: full access to both activities and tasks
  IF v_owner IS NOT NULL THEN
    INSERT INTO public.team_role_permissions (role_id, permission_id)
    VALUES 
      (v_owner, v_act_view), (v_owner, v_act_create), (v_owner, v_act_update), (v_owner, v_act_delete), (v_owner, v_act_assign),
      (v_owner, v_task_view), (v_owner, v_task_create), (v_owner, v_task_update), (v_owner, v_task_delete), (v_owner, v_task_assign)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_admin IS NOT NULL THEN
    INSERT INTO public.team_role_permissions (role_id, permission_id)
    VALUES 
      (v_admin, v_act_view), (v_admin, v_act_create), (v_admin, v_act_update), (v_admin, v_act_delete), (v_admin, v_act_assign),
      (v_admin, v_task_view), (v_admin, v_task_create), (v_admin, v_task_update), (v_admin, v_task_delete), (v_admin, v_task_assign)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_manager IS NOT NULL THEN
    INSERT INTO public.team_role_permissions (role_id, permission_id)
    VALUES 
      (v_manager, v_act_view), (v_manager, v_act_create), (v_manager, v_act_update), (v_manager, v_act_delete), (v_manager, v_act_assign),
      (v_manager, v_task_view), (v_manager, v_task_create), (v_manager, v_task_update), (v_manager, v_task_delete), (v_manager, v_task_assign)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Leasing Agent: can view, create, update, and assign activities and tasks
  IF v_agent IS NOT NULL THEN
    INSERT INTO public.team_role_permissions (role_id, permission_id)
    VALUES 
      (v_agent, v_act_view), (v_agent, v_act_create), (v_agent, v_act_update), (v_agent, v_act_assign),
      (v_agent, v_task_view), (v_agent, v_task_create), (v_agent, v_task_update), (v_agent, v_task_assign)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Staff: has task.view, task.create, task.update (Only sees their assigned tasks/activities unless activity.view granted)
  IF v_staff IS NOT NULL THEN
    INSERT INTO public.team_role_permissions (role_id, permission_id)
    VALUES 
      (v_staff, v_task_view), (v_staff, v_task_create), (v_staff, v_task_update)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Viewer: has task.view (Only sees their assigned tasks unless activity.view granted)
  IF v_viewer IS NOT NULL THEN
    INSERT INTO public.team_role_permissions (role_id, permission_id)
    VALUES 
      (v_viewer, v_task_view)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
