-- ====================================================================
-- PROPERTY LEDGE: COMPREHENSIVE SYSTEM REFERENCE SEED SCRIPT
-- ====================================================================
-- Run this script in the Supabase SQL Editor to restore all essential
-- reference data (Permissions, System Roles, Role Permissions, 
-- Subscription Plans, Entitlements, Categories, and Tax Classifications).
-- Idempotent: safe to run multiple times without duplicating or failing.
-- ====================================================================

-- Temporarily disable FK trigger checks for batch seeding if replica session allowed
-- (standard in Supabase SQL editor; wrapped cleanly)
DO $$
BEGIN
  BEGIN
    SET session_replication_role = replica;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if not superuser
    NULL;
  END;
END $$;

-- --------------------------------------------------------------------
-- 1. SYSTEM PERMISSIONS (public.permissions)
-- Scope: PLATFORM (Admin/Support) and TEAM (Workspaces/Roles)
-- --------------------------------------------------------------------
INSERT INTO public.permissions ("id", "key", "name", "description", "scope", "resource", "action")
VALUES
  -- Platform Scope
  ('f735d668-0d32-46a4-9d2c-012e045633aa', 'user.view', 'View Users', 'View platform users', 'PLATFORM', 'user', 'view'),
  ('662a97af-016d-4e88-ae13-a5c0250294e7', 'user.create', 'Create Users', 'Create platform users', 'PLATFORM', 'user', 'create'),
  ('60d84be9-bc0b-41b5-8a1f-234ed528e8cc', 'user.update', 'Update Users', 'Update platform users', 'PLATFORM', 'user', 'update'),
  ('8b1d3f18-dbc2-4837-b314-d5bdedf67eb7', 'user.delete', 'Delete Users', 'Delete platform users', 'PLATFORM', 'user', 'delete'),
  ('ce359ec1-b452-469d-91df-b28c0a73a40d', 'platform_role.view', 'View Platform Roles', 'View platform roles', 'PLATFORM', 'platform_role', 'view'),
  ('3d7b9119-5bd3-45db-bb58-b6ef638b7ccb', 'platform_role.create', 'Create Platform Roles', 'Create platform roles', 'PLATFORM', 'platform_role', 'create'),
  ('6f22cb44-4c69-43d6-bb45-04794d99bcb0', 'platform_role.update', 'Update Platform Roles', 'Update platform roles', 'PLATFORM', 'platform_role', 'update'),
  ('b6f6a2f9-14ab-4a8a-aae8-2e35feee591a', 'platform_role.delete', 'Delete Platform Roles', 'Delete platform roles', 'PLATFORM', 'platform_role', 'delete'),
  ('22a8b91c-9cb3-43bb-9852-59bfda0c3dc9', 'team.view', 'View Teams', 'View workspaces/teams', 'PLATFORM', 'team', 'view'),
  ('ff03e2f1-8154-432a-a525-c15cbae22897', 'team.create', 'Create Teams', 'Create workspaces/teams', 'PLATFORM', 'team', 'create'),
  ('61a61212-f04d-4d71-bf3e-e99d9e99c121', 'team.update', 'Update Teams', 'Update workspaces/teams', 'PLATFORM', 'team', 'update'),
  ('ef015960-b2bd-4d82-80e7-627a8a1f978a', 'team.delete', 'Delete Teams', 'Delete workspaces/teams', 'PLATFORM', 'team', 'delete'),
  ('e3bc8f8d-b2de-4de0-a796-a506bbdfdadd', 'team_role.view', 'View Team Roles', 'View team role definitions', 'PLATFORM', 'team_role', 'view'),
  ('fb69dad6-4a3c-4c55-8379-f476574f285f', 'team_role.create', 'Create Team Roles', 'Create system team roles', 'PLATFORM', 'team_role', 'create'),
  ('7de24c60-aeaa-4f59-8097-f307406d8150', 'team_role.update', 'Update Team Roles', 'Update team role definitions', 'PLATFORM', 'team_role', 'update'),
  ('d5daa577-8936-4859-bee1-559e9fdd06cf', 'team_role.delete', 'Delete Team Roles', 'Delete team roles', 'PLATFORM', 'team_role', 'delete'),
  ('d10eea66-ae31-4572-89d3-4e0d01d89153', 'team_role.assign', 'Assign Team Roles', 'Assign team roles platform-wide', 'PLATFORM', 'team_role', 'assign'),
  ('1ccd067e-9430-4c4b-949d-f623d9b6eedb', 'subscription.view', 'View Subscriptions', 'View subscriptions', 'PLATFORM', 'subscription', 'view'),
  ('d75c37e0-c640-4b78-a0b8-deea7a96e625', 'subscription.manage', 'Manage Subscriptions', 'Manage subscriptions', 'PLATFORM', 'subscription', 'manage'),
  ('6fa6530c-3a2d-4604-92f8-e3e7675dcf05', 'billing.view', 'View Billing', 'View billing', 'PLATFORM', 'billing', 'view'),
  ('67322310-3cd4-43cf-b5ec-49d5b13ba41b', 'billing.manage', 'Manage Billing', 'Manage billing', 'PLATFORM', 'billing', 'manage'),
  ('2c528e26-7575-4b11-a31f-f68b279d928b', 'audit.view', 'View Audit Logs', 'View audit logs', 'PLATFORM', 'audit', 'view'),
  ('b3c7ee6f-7245-4f93-8db7-6987aeb5e9b6', 'platform.settings.view', 'View Platform Settings', 'View platform settings', 'PLATFORM', 'platform.settings', 'view'),
  ('8db706ab-9bef-4693-ae9e-1167dc28ac9a', 'platform.settings.update', 'Update Platform Settings', 'Update platform settings', 'PLATFORM', 'platform.settings', 'update'),
  ('877b4c70-d08c-4cfc-bae9-6543981a4f31', 'team.admin_access', 'Team Admin Access', 'Administrative access to workspaces', 'PLATFORM', 'team', 'admin_access'),
  ('bec7bff4-ea81-4285-8ad2-662aff2aee14', 'team.data.view', 'View Team Data', 'View workspace data as admin', 'PLATFORM', 'team', 'data.view'),
  ('d3de81db-46e2-4d58-ace7-18903b2e58fd', 'team.data.manage', 'Manage Team Data', 'Manage workspace data as admin', 'PLATFORM', 'team', 'data.manage'),
  ('590beb83-fd1b-468f-a656-e96e590af06f', 'team.impersonate', 'Impersonate Users', 'Impersonate workspace users', 'PLATFORM', 'team', 'impersonate'),

  -- Team Scope: Properties
  ('27fa07a0-7e9a-4743-b447-e72b05aed21f', 'property.view', 'View Properties', 'View properties', 'TEAM', 'property', 'view'),
  ('a9401853-8d54-47b3-b5d5-45dfd11906a3', 'property.create', 'Create Properties', 'Create properties', 'TEAM', 'property', 'create'),
  ('4bf7de4d-554b-49c2-b9f0-b20107e3140b', 'property.update', 'Update Properties', 'Update properties', 'TEAM', 'property', 'update'),
  ('ae33f389-dfc1-4793-a36f-4f91e6ef32d6', 'property.delete', 'Delete Properties', 'Delete properties', 'TEAM', 'property', 'delete'),

  -- Team Scope: Tenants
  ('b99f791f-3b82-4666-ab0e-bd547ab611aa', 'tenant.view', 'View Tenants', 'View tenants', 'TEAM', 'tenant', 'view'),
  ('66268342-72cf-43ae-b6b6-5a5fa13913cd', 'tenant.create', 'Create Tenants', 'Create tenants', 'TEAM', 'tenant', 'create'),
  ('ac13d910-2acf-4688-988b-fcbbd0333b40', 'tenant.update', 'Update Tenants', 'Update tenants', 'TEAM', 'tenant', 'update'),
  ('4484b93e-85c5-476f-8e9d-481f4e194fd6', 'tenant.delete', 'Delete Tenants', 'Delete tenants', 'TEAM', 'tenant', 'delete'),

  -- Team Scope: Leases
  ('0c66d6bc-bf08-45d9-8018-f1bd192d8ad9', 'lease.view', 'View Leases', 'View leases', 'TEAM', 'lease', 'view'),
  ('a20d3358-0f60-49ac-9894-e5ecf4a82649', 'lease.create', 'Create Leases', 'Create leases', 'TEAM', 'lease', 'create'),
  ('e0857643-4a0e-4f5a-821a-47de8ea08edf', 'lease.update', 'Update Leases', 'Update leases', 'TEAM', 'lease', 'update'),
  ('92d87f3f-2a6c-4d19-8526-e9a370dc7409', 'lease.delete', 'Delete Leases', 'Delete leases', 'TEAM', 'lease', 'delete'),

  -- Team Scope: Invoices
  ('3883af4f-d421-456a-8e86-bd6753d679eb', 'invoice.view', 'View Invoices', 'View invoices', 'TEAM', 'invoice', 'view'),
  ('585bd2e2-6a12-40f7-bb51-c0d324eb76a2', 'invoice.create', 'Create Invoices', 'Create invoices', 'TEAM', 'invoice', 'create'),
  ('cc11c24f-ddfc-449e-8345-39f4b7927a4b', 'invoice.update', 'Update Invoices', 'Update invoices', 'TEAM', 'invoice', 'update'),
  ('82b2682f-15d8-4ba7-84c1-d6f298693dcc', 'invoice.delete', 'Delete Invoices', 'Delete invoices', 'TEAM', 'invoice', 'delete'),

  -- Team Scope: Payments
  ('e2755a5d-252a-4670-8268-c550d4acfeba', 'payment.view', 'View Payments', 'View payments', 'TEAM', 'payment', 'view'),
  ('ee7617d6-f751-4b8c-b774-58e93e537fad', 'payment.create', 'Create Payments', 'Create payments', 'TEAM', 'payment', 'create'),
  ('c63a258e-8010-4193-be9a-3e81615a3128', 'payment.update', 'Update Payments', 'Update payments', 'TEAM', 'payment', 'update'),
  ('d4892e36-8980-4143-a50b-11f97dafb0f0', 'payment.delete', 'Delete Payments', 'Delete payments', 'TEAM', 'payment', 'delete'),

  -- Team Scope: Expenses
  ('432cad2e-0167-4224-b6dd-8e86092b0b35', 'expense.view', 'View Expenses', 'View expenses', 'TEAM', 'expense', 'view'),
  ('fdd6cb45-8422-4e34-8a87-7fab14464105', 'expense.create', 'Create Expenses', 'Create expenses', 'TEAM', 'expense', 'create'),
  ('8c656d9b-5d3a-475d-87bb-1e43a0f1e70f', 'expense.update', 'Update Expenses', 'Update expenses', 'TEAM', 'expense', 'update'),
  ('35bb72be-42cd-4fa9-af85-99c1e6fb0c2b', 'expense.delete', 'Delete Expenses', 'Delete expenses', 'TEAM', 'expense', 'delete'),

  -- Team Scope: Maintenance
  ('26f7cf9f-1137-43a9-a30b-7708d5493312', 'maintenance.view', 'View Maintenance', 'View maintenance requests', 'TEAM', 'maintenance', 'view'),
  ('05e12e03-88b1-43ed-b000-ae55a2b8379b', 'maintenance.create', 'Create Maintenance', 'Create maintenance requests', 'TEAM', 'maintenance', 'create'),
  ('a98ceeb7-48f8-4df5-ab14-b6d85ea69479', 'maintenance.update', 'Update Maintenance', 'Update maintenance requests', 'TEAM', 'maintenance', 'update'),
  ('fb395259-d487-4785-a96d-b9341b39ce5d', 'maintenance.delete', 'Delete Maintenance', 'Delete maintenance requests', 'TEAM', 'maintenance', 'delete'),
  ('8d209a95-03b5-4733-b155-d9f82dc19d4f', 'maintenance.assign', 'Assign Maintenance', 'Assign maintenance requests', 'TEAM', 'maintenance', 'assign'),

  -- Team Scope: Inspections
  ('4a95c211-d81e-40a6-8541-94be02183914', 'inspection.view', 'View Inspections', 'View inspections', 'TEAM', 'inspection', 'view'),
  ('5c9cfb97-a3a0-44f7-9775-2726e501de06', 'inspection.create', 'Create Inspections', 'Create inspections', 'TEAM', 'inspection', 'create'),
  ('36cd0696-81fb-446e-946a-50c5b9bb4e2e', 'inspection.update', 'Update Inspections', 'Update inspections', 'TEAM', 'inspection', 'update'),
  ('43a4c1bb-5981-4230-a131-edc3b8e7c3cd', 'inspection.delete', 'Delete Inspections', 'Delete inspections', 'TEAM', 'inspection', 'delete'),

  -- Team Scope: Documents
  ('6fa64862-f451-476b-8c4c-62b86a428594', 'document.view', 'View Documents', 'View documents', 'TEAM', 'document', 'view'),
  ('a887717c-3991-4cab-bca2-6bfdcd8f2591', 'document.create', 'Create Documents', 'Create documents', 'TEAM', 'document', 'create'),
  ('0d4e85fc-aabc-4717-a6d4-69376be7f03d', 'document.update', 'Update Documents', 'Update documents', 'TEAM', 'document', 'update'),
  ('0ce2340e-5ef0-426f-8027-de3fb1aa84e1', 'document.delete', 'Delete Documents', 'Delete documents', 'TEAM', 'document', 'delete'),

  -- Team Scope: Team Members & Settings
  ('55d4702f-c5b7-4ea7-8be1-f53ff9038d17', 'team.member.view', 'View Members', 'View team members', 'TEAM', 'team.member', 'view'),
  ('601b32e0-31c2-471f-8db4-abc9843869bf', 'team.member.invite', 'Invite Members', 'Invite team members', 'TEAM', 'team.member', 'invite'),
  ('e2a08642-735e-443e-bbb2-4d840040a1e8', 'team.member.update', 'Update Members', 'Update team members', 'TEAM', 'team.member', 'update'),
  ('10efc492-4c59-4bb9-af9b-50103f7a16c3', 'team.member.remove', 'Remove Members', 'Remove team members', 'TEAM', 'team.member', 'remove'),
  ('6a7a9db0-06b1-489b-9518-591060020935', 'team.settings.view', 'View Settings', 'View workspace settings', 'TEAM', 'team.settings', 'view'),
  ('3be21ece-34ae-464c-bfa8-94ee1b433a69', 'team.settings.update', 'Update Settings', 'Update workspace settings', 'TEAM', 'team.settings', 'update'),
  ('3339035e-cf14-4a6e-a591-466bc920d715', 'team.role.view', 'View Roles', 'View team roles', 'TEAM', 'team.role', 'view'),
  ('b5c2a27f-3869-45bb-a544-766f858ffdbc', 'team.role.assign', 'Assign Roles', 'Assign team roles', 'TEAM', 'team.role', 'assign'),
  ('6138a245-17cb-4132-910a-653d35b4840b', 'team.role.create', 'Create Roles', 'Create custom team roles', 'TEAM', 'team.role', 'create'),
  ('d4dda289-30d8-4ece-854b-9cddb0d642c8', 'team.role.update', 'Update Roles', 'Update custom team roles', 'TEAM', 'team.role', 'update'),
  ('ce40dc7b-8d38-4092-b8c5-dc8ae0104d2d', 'team.role.delete', 'Delete Roles', 'Delete custom team roles', 'TEAM', 'team.role', 'delete'),

  -- Team Scope: Insights & Analytics
  ('969e0734-0f16-4fe7-bf73-02699b7b4210', 'insights.view', 'View Insights', 'View workspace insights and analytics', 'TEAM', 'insights', 'view'),
  ('47fb5e84-4223-4aa4-a255-cca0eba32ae0', 'insights.generate', 'Generate Insights', 'Generate insight reports', 'TEAM', 'insights', 'generate'),
  ('fc4bbc8d-6d83-4683-9d13-a6d6ffc6cbb1', 'insights.export', 'Export Insights', 'Export insight reports', 'TEAM', 'insights', 'export'),

  -- Team Scope: Compliance & Activities
  ('ec0e9bac-8181-4203-acee-ad9071303994', 'activity.view', 'View All Activities', 'View all property compliance activities and autopilot schedules', 'TEAM', 'activity', 'view'),
  ('5eaeb41a-de59-486e-ab04-01da7a61a829', 'activity.create', 'Create Activities', 'Create property activities and inspection instances', 'TEAM', 'activity', 'create'),
  ('4dc7a3ff-38f5-4945-a683-509e726fb96b', 'activity.update', 'Update Activities', 'Update activity details, due dates, statuses and notes', 'TEAM', 'activity', 'update'),
  ('646aabd4-74af-4a2e-b092-0173b8a14f31', 'activity.delete', 'Delete Activities', 'Delete or archive property activities', 'TEAM', 'activity', 'delete'),
  ('5daed44e-5220-441e-9e52-dd62191a83e1', 'activity.assign', 'Assign Activities', 'Assign responsible teammates to activities', 'TEAM', 'activity', 'assign'),

  -- Team Scope: Tasks & Action Items
  ('08fb796f-2781-478c-a056-3cfbd40d86a6', 'task.view', 'View Assigned Tasks', 'View tasks assigned to the user or workspace tasks', 'TEAM', 'task', 'view'),
  ('330468a2-fc7b-4cea-a085-8da7869cc05b', 'task.create', 'Create Tasks', 'Create new tasks and checklist items', 'TEAM', 'task', 'create'),
  ('3e043f04-2547-4beb-ad75-b24875542254', 'task.update', 'Update Tasks', 'Update status, details, due dates and progress of tasks', 'TEAM', 'task', 'update'),
  ('a5d4fb0b-134d-4fe7-acfa-c2dc04c5f996', 'task.delete', 'Delete Tasks', 'Delete or archive task items', 'TEAM', 'task', 'delete'),
  ('89b02006-4e0c-446e-ab96-9092b96b4d94', 'task.assign', 'Assign Tasks', 'Assign tasks to other team members', 'TEAM', 'task', 'assign')
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    scope = EXCLUDED.scope,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    updated_at = NOW();

-- --------------------------------------------------------------------
-- 2. SYSTEM TEAM ROLES (public.team_roles)
-- Predefined roles available across all workspaces (workspace_id IS NULL)
-- --------------------------------------------------------------------
INSERT INTO public.team_roles ("id", "workspace_id", "name", "description", "is_system_role")
VALUES
  ('fc6629d9-28c6-4005-80ab-d9d08329722c', NULL, 'Owner', 'Complete control over workspace, properties, finances, and team administration', true),
  ('a0000000-0000-0000-0000-000000000001', NULL, 'Admin', 'Full administrative operations across portfolio and team members', true),
  ('a0000000-0000-0000-0000-000000000002', NULL, 'Property Manager', 'Operational manager handling properties, leases, maintenance, inspections, and tasks', true),
  ('e07358d9-7aaf-4d0b-b56d-936d9543d27e', NULL, 'Leasing Agent', 'Agent managing tenants, leasing agreements, property viewings, and inspections', true),
  ('a0000000-0000-0000-0000-000000000003', NULL, 'Accountant', 'Financial controller managing invoices, payments, expense records, and tax reports', true),
  ('a0000000-0000-0000-0000-000000000004', NULL, 'Staff', 'Operational team member handling maintenance tickets and assigned task checklists', true),
  ('82ca104a-efd1-4e81-a47e-1a0488a9acf3', NULL, 'Viewer', 'Read-only access to property details, leases, and reports', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system_role = true,
    workspace_id = NULL,
    updated_at = NOW();

-- --------------------------------------------------------------------
-- 3. TEAM ROLE PERMISSIONS MAPPINGS (public.team_role_permissions)
-- Associates granular permissions to system roles
-- --------------------------------------------------------------------
DO $$
DECLARE
  v_owner UUID := 'fc6629d9-28c6-4005-80ab-d9d08329722c';
  v_admin UUID := 'a0000000-0000-0000-0000-000000000001';
  v_manager UUID := 'a0000000-0000-0000-0000-000000000002';
  v_agent UUID := 'e07358d9-7aaf-4d0b-b56d-936d9543d27e';
  v_accountant UUID := 'a0000000-0000-0000-0000-000000000003';
  v_staff UUID := 'a0000000-0000-0000-0000-000000000004';
  v_viewer UUID := '82ca104a-efd1-4e81-a47e-1a0488a9acf3';
BEGIN
  -- 3.1 OWNER: Receives ALL TEAM-scoped permissions
  INSERT INTO public.team_role_permissions (role_id, permission_id)
  SELECT v_owner, id FROM public.permissions WHERE scope = 'TEAM'
  ON CONFLICT DO NOTHING;

  -- 3.2 ADMIN: Receives all operational and management permissions
  INSERT INTO public.team_role_permissions (role_id, permission_id)
  SELECT v_admin, id FROM public.permissions 
  WHERE scope = 'TEAM' AND key NOT IN ('team.delete')
  ON CONFLICT DO NOTHING;

  -- 3.3 PROPERTY MANAGER: Properties, tenants, leases, maintenance, inspections, documents, activities, tasks, invoices, expenses
  INSERT INTO public.team_role_permissions (role_id, permission_id)
  SELECT v_manager, id FROM public.permissions 
  WHERE scope = 'TEAM' AND (
    resource IN ('property', 'tenant', 'lease', 'maintenance', 'inspection', 'document', 'activity', 'task')
    OR key IN ('invoice.view', 'invoice.create', 'invoice.update', 'payment.view', 'payment.create', 'expense.view', 'expense.create', 'expense.update', 'insights.view', 'insights.generate', 'team.member.view')
  )
  ON CONFLICT DO NOTHING;

  -- 3.4 LEASING AGENT: Tenants, leases, inspections, maintenance, tasks, activities, document viewing
  INSERT INTO public.team_role_permissions (role_id, permission_id)
  SELECT v_agent, id FROM public.permissions 
  WHERE scope = 'TEAM' AND (
    resource IN ('tenant', 'lease', 'inspection')
    OR key IN (
      'property.view', 'document.view', 'document.create',
      'maintenance.view', 'maintenance.create', 'maintenance.update', 'maintenance.assign',
      'activity.view', 'activity.create', 'activity.update', 'activity.assign',
      'task.view', 'task.create', 'task.update', 'task.assign',
      'invoice.view', 'payment.view'
    )
  )
  ON CONFLICT DO NOTHING;

  -- 3.5 ACCOUNTANT: Full financial control & read-only for properties/leases
  INSERT INTO public.team_role_permissions (role_id, permission_id)
  SELECT v_accountant, id FROM public.permissions 
  WHERE scope = 'TEAM' AND (
    resource IN ('invoice', 'payment', 'expense', 'insights')
    OR key IN ('property.view', 'tenant.view', 'lease.view', 'document.view', 'document.create')
  )
  ON CONFLICT DO NOTHING;

  -- 3.6 STAFF: Maintenance viewing/updating, task execution
  INSERT INTO public.team_role_permissions (role_id, permission_id)
  SELECT v_staff, id FROM public.permissions 
  WHERE scope = 'TEAM' AND key IN (
    'property.view', 'tenant.view',
    'maintenance.view', 'maintenance.update',
    'task.view', 'task.create', 'task.update',
    'document.view'
  )
  ON CONFLICT DO NOTHING;

  -- 3.7 VIEWER: Read-only access across the board
  INSERT INTO public.team_role_permissions (role_id, permission_id)
  SELECT v_viewer, id FROM public.permissions 
  WHERE scope = 'TEAM' AND action = 'view'
  ON CONFLICT DO NOTHING;
END $$;

-- --------------------------------------------------------------------
-- 4. SUBSCRIPTION PLANS (public.subscription_plans)
-- Tier configurations for self-hosted and SaaS plans
-- --------------------------------------------------------------------
INSERT INTO public.subscription_plans ("id", "name", "slug", "description", "status", "display_order", "price_cents", "billing_interval")
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Free', 'free', 'Legacy tier.', 'archived', 99, 0, 'monthly'),
  ('00000000-0000-0000-0000-000000000002', 'Pro', 'pro', 'Legacy tier.', 'archived', 99, 2900, 'monthly'),
  ('00000000-0000-0000-0000-000000000003', 'Business', 'business', 'Legacy tier.', 'archived', 99, 9900, 'monthly'),
  ('00000000-0000-0000-0000-000000000004', 'Landlord Starter', 'landlord', 'For private investors & self-managed landlords', 'active', 1, 2900, 'monthly'),
  ('00000000-0000-0000-0000-000000000005', 'Portfolio Pro', 'manager', 'For growing portfolios & active property managers', 'active', 2, 7900, 'monthly'),
  ('00000000-0000-0000-0000-000000000006', 'Agency & Enterprise', 'agency', 'For real-estate agencies & institutional portfolios', 'active', 3, 0, 'monthly')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    display_order = EXCLUDED.display_order,
    price_cents = EXCLUDED.price_cents,
    billing_interval = EXCLUDED.billing_interval,
    updated_at = NOW();

-- --------------------------------------------------------------------
-- 5. ENTITLEMENT DEFINITIONS (public.entitlements)
-- Feature and resource limit keys
-- --------------------------------------------------------------------
INSERT INTO public.entitlements ("id", "key", "name", "description", "value_type")
VALUES
  ('10000000-0000-0000-0000-000000000001', 'properties.max', 'Maximum Properties', 'Maximum number of managed properties allowed', 'number'),
  ('10000000-0000-0000-0000-000000000002', 'reports.enabled', 'Standard Reports', 'Access to basic financial and tenant reports', 'boolean'),
  ('10000000-0000-0000-0000-000000000003', 'advanced_reports.enabled', 'Advanced Analytics', 'Access to AI insights, export data, and custom reports', 'boolean'),
  ('10000000-0000-0000-0000-000000000004', 'team_members.max', 'Maximum Team Members', 'Maximum number of team seats allowed', 'number'),
  ('10000000-0000-0000-0000-000000000005', 'storage.max_gb', 'Document Storage (GB)', 'Maximum document storage in gigabytes', 'number'),
  ('684b9b2d-4f3e-4bbe-8aa4-4cbbd2abb7bf', 'insights.enabled', 'Insights', 'Access to workspace insights and analytics', 'boolean'),
  ('d5e39b3d-1125-4371-8961-78653287fc62', 'team_management.enabled', 'Team Management', 'Enable team member management features', 'boolean'),
  ('5eb38664-dd8b-4b95-a603-c8f4c4b0ea13', 'custom_roles.enabled', 'Custom Team Roles', 'Allow creating custom workspace team roles', 'boolean'),
  ('34e2f1c1-4880-42ee-b29c-89479937569f', 'custom_roles.max', 'Maximum Custom Roles', 'Maximum number of custom team roles per workspace', 'number')
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    value_type = EXCLUDED.value_type,
    updated_at = NOW();

-- --------------------------------------------------------------------
-- 6. PLAN ENTITLEMENT QUOTAS (public.plan_entitlements)
-- Maps quotas to each plan
-- --------------------------------------------------------------------
DO $$
DECLARE
  v_free UUID := '00000000-0000-0000-0000-000000000001';
  v_pro UUID := '00000000-0000-0000-0000-000000000002';
  v_biz UUID := '00000000-0000-0000-0000-000000000003';
  v_landlord UUID := '00000000-0000-0000-0000-000000000004';
  v_pm UUID := '00000000-0000-0000-0000-000000000005';

  v_e_prop UUID;
  v_e_rep UUID;
  v_e_adv UUID;
  v_e_team UUID;
  v_e_stor UUID;
  v_e_ins UUID;
  v_e_tmgmt UUID;
  v_e_crole UUID;
  v_e_cmax UUID;
BEGIN
  SELECT id INTO v_e_prop FROM public.entitlements WHERE key = 'properties.max';
  SELECT id INTO v_e_rep FROM public.entitlements WHERE key = 'reports.enabled';
  SELECT id INTO v_e_adv FROM public.entitlements WHERE key = 'advanced_reports.enabled';
  SELECT id INTO v_e_team FROM public.entitlements WHERE key = 'team_members.max';
  SELECT id INTO v_e_stor FROM public.entitlements WHERE key = 'storage.max_gb';
  SELECT id INTO v_e_ins FROM public.entitlements WHERE key = 'insights.enabled';
  SELECT id INTO v_e_tmgmt FROM public.entitlements WHERE key = 'team_management.enabled';
  SELECT id INTO v_e_crole FROM public.entitlements WHERE key = 'custom_roles.enabled';
  SELECT id INTO v_e_cmax FROM public.entitlements WHERE key = 'custom_roles.max';

  -- Free Plan Entitlements
  INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value) VALUES
    (v_free, v_e_prop, '2'::jsonb),
    (v_free, v_e_rep, 'true'::jsonb),
    (v_free, v_e_adv, 'false'::jsonb),
    (v_free, v_e_team, '1'::jsonb),
    (v_free, v_e_stor, '1'::jsonb),
    (v_free, v_e_ins, 'false'::jsonb),
    (v_free, v_e_tmgmt, 'false'::jsonb),
    (v_free, v_e_crole, 'false'::jsonb),
    (v_free, v_e_cmax, '0'::jsonb)
  ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;

  -- Pro Plan Entitlements
  INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value) VALUES
    (v_pro, v_e_prop, '10'::jsonb),
    (v_pro, v_e_rep, 'true'::jsonb),
    (v_pro, v_e_adv, 'true'::jsonb),
    (v_pro, v_e_team, '3'::jsonb),
    (v_pro, v_e_stor, '10'::jsonb),
    (v_pro, v_e_ins, 'true'::jsonb),
    (v_pro, v_e_tmgmt, 'true'::jsonb),
    (v_pro, v_e_crole, 'false'::jsonb),
    (v_pro, v_e_cmax, '0'::jsonb)
  ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;

  -- Business Plan Entitlements
  INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value) VALUES
    (v_biz, v_e_prop, '99999'::jsonb),
    (v_biz, v_e_rep, 'true'::jsonb),
    (v_biz, v_e_adv, 'true'::jsonb),
    (v_biz, v_e_team, '50'::jsonb),
    (v_biz, v_e_stor, '100'::jsonb),
    (v_biz, v_e_ins, 'true'::jsonb),
    (v_biz, v_e_tmgmt, 'true'::jsonb),
    (v_biz, v_e_crole, 'true'::jsonb),
    (v_biz, v_e_cmax, '20'::jsonb)
  ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;

  -- Landlord Plan Entitlements
  INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value) VALUES
    (v_landlord, v_e_prop, '15'::jsonb),
    (v_landlord, v_e_rep, 'true'::jsonb),
    (v_landlord, v_e_adv, 'true'::jsonb),
    (v_landlord, v_e_team, '3'::jsonb),
    (v_landlord, v_e_stor, '15'::jsonb),
    (v_landlord, v_e_ins, 'true'::jsonb),
    (v_landlord, v_e_tmgmt, 'true'::jsonb),
    (v_landlord, v_e_crole, 'false'::jsonb),
    (v_landlord, v_e_cmax, '0'::jsonb)
  ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;

  -- Property Manager Plan Entitlements
  INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value) VALUES
    (v_pm, v_e_prop, '100'::jsonb),
    (v_pm, v_e_rep, 'true'::jsonb),
    (v_pm, v_e_adv, 'true'::jsonb),
    (v_pm, v_e_team, '20'::jsonb),
    (v_pm, v_e_stor, '50'::jsonb),
    (v_pm, v_e_ins, 'true'::jsonb),
    (v_pm, v_e_tmgmt, 'true'::jsonb),
    (v_pm, v_e_crole, 'true'::jsonb),
    (v_pm, v_e_cmax, '10'::jsonb)
  ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
END $$;

-- --------------------------------------------------------------------
-- 7. DEFAULT FINANCIAL CATEGORIES (public.categories)
-- Complete Australian property management Income & Expense classification
-- --------------------------------------------------------------------
INSERT INTO public.categories (transaction_type, name, description, is_active)
VALUES
  -- Income Categories
  ('income', 'Rent', 'Rental payments received from tenants', true),
  ('income', 'Rental Income', 'Periodic residential or commercial rental revenue', true),
  ('income', 'Security Deposit', 'Tenant bond and security funds', true),
  ('income', 'Rental Bond / Deposit', 'Residential tenancy bond transfers and receipts', true),
  ('income', 'Utility Reimbursement', 'Tenant utility and outgoings recovery payments', true),
  ('income', 'Late Fee / Penalty', 'Late payment administrative surcharges', true),
  ('income', 'Owner Contribution', 'Owner equity injections and capital funds', true),
  ('income', 'Other Income', 'Sundry and miscellaneous property revenue', true),

  -- Expense Categories
  ('expense', 'Maintenance', 'Routine and preventative maintenance', true),
  ('expense', 'Repairs', 'Emergency and reactive property repairs', true),
  ('expense', 'Repairs & Maintenance', 'Combined maintenance work and contractor call-outs', true),
  ('expense', 'Utilities', 'Water, power, gas, and utility service charges', true),
  ('expense', 'Utilities (Electricity/Gas)', 'Electricity, natural gas and communal services', true),
  ('expense', 'Council Rates', 'Local municipal council charges and municipal rates', true),
  ('expense', 'Water & Sewerage Rates', 'Water consumption, sewerage, and drainage levies', true),
  ('expense', 'Insurance', 'Landlord, building, contents, and public liability insurance', true),
  ('expense', 'Property Tax', 'State land tax and statutory property duties', true),
  ('expense', 'Land Tax', 'Annual state land tax assessments', true),
  ('expense', 'Management Fee', 'Agency and property management commission fees', true),
  ('expense', 'Property Management Fees', 'Professional management and letting fee percentages', true),
  ('expense', 'Strata / Body Corporate', 'Strata levies, capital works fund, and body corp dues', true),
  ('expense', 'Cleaning & Gardening', 'End of lease cleaning, groundskeeping, and lawn mowing', true),
  ('expense', 'Legal & Professional Fees', 'Conveyancing, accountancy, and dispute legal fees', true),
  ('expense', 'Advertising & Marketing', 'Real estate portal listings and tenant acquisition', true),
  ('expense', 'Other Expense', 'General and miscellaneous property expenses', true),
  ('expense', 'Other Operating Expense', 'General administrative and minor sundry expenses', true)
ON CONFLICT (transaction_type, name) DO UPDATE
SET description = EXCLUDED.description,
    is_active = true,
    updated_at = NOW();

-- --------------------------------------------------------------------
-- 8. PREDEFINED ACTIVITY TYPES (public.activity_types)
-- Foundation for the Autopilot and Property Activity Engine
-- --------------------------------------------------------------------
INSERT INTO public.activity_types (id, name, slug, icon, color, description, is_system)
VALUES
  ('inspection', 'Property Inspection', 'property-inspection', 'Home', 'indigo', 'Routine property inspection and periodic condition checks', true),
  ('rent_review', 'Rent Review', 'rent-review', 'TrendingUp', 'emerald', 'Periodic rent rate review and market rate evaluation', true),
  ('lease_expiry', 'Lease Expiry', 'lease-expiry', 'FileText', 'amber', 'Lease contract expiration review and renewal negotiation', true),
  ('insurance_renewal', 'Insurance Renewal', 'insurance-renewal', 'ShieldCheck', 'blue', 'Landlord and building insurance policy renewal', true),
  ('lease_renewal', 'Lease Renewal', 'lease-renewal', 'FileCheck2', 'teal', 'Formal lease extension or renewal execution', true),
  ('repair', 'Repair', 'repair', 'Wrench', 'orange', 'Urgent or scheduled property repair work', true),
  ('maintenance', 'Maintenance Issue', 'maintenance-issue', 'Wrench', 'yellow', 'General proactive or preventative property maintenance', true),
  ('tenant_issue', 'Tenant Issue', 'tenant-issue', 'UserCheck', 'rose', 'Tenant request, communication, or issue resolution', true),
  ('other', 'Other', 'other', 'CheckSquare', 'slate', 'General custom property activity', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    is_system = true;

-- --------------------------------------------------------------------
-- 9. BAS & GST CATEGORY GROUPS (public.category_groups)
-- Standard Australian BAS reporting groupings
-- --------------------------------------------------------------------
DO $$
DECLARE
  ws RECORD;
BEGIN
  -- Create category_groups table if not already created
  CREATE TABLE IF NOT EXISTS public.category_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_category_groups_workspace_name UNIQUE (workspace_id, name)
  );

  FOR ws IN SELECT id FROM public.workspaces LOOP
    INSERT INTO public.category_groups (workspace_id, name, description)
    VALUES
      (ws.id, 'Rental Income', 'Gross residential and commercial rental revenue'),
      (ws.id, 'Other Revenue', 'Sundry and miscellaneous property income'),
      (ws.id, 'Operating Expenses', 'Allowable property operating expenses'),
      (ws.id, 'Repairs & Maintenance', 'Repairs, servicing and emergency maintenance'),
      (ws.id, 'Capital Works & Acquisitions', 'Capital improvements and depreciable assets (G10)'),
      (ws.id, 'Statutory Levies & Rates', 'Council rates, water rates, and land tax')
    ON CONFLICT (workspace_id, name) DO NOTHING;
  END LOOP;

  -- Ensure category_group_id column exists on categories
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'category_group_id'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN category_group_id UUID REFERENCES public.category_groups(id) ON DELETE SET NULL;
  END IF;

  -- Link categories to default category groups
  UPDATE public.categories c
  SET category_group_id = cg.id
  FROM public.category_groups cg
  WHERE c.category_group_id IS NULL
    AND (
      (c.name ILIKE '%rent%' AND cg.name = 'Rental Income')
      OR (c.name ILIKE '%maintenance%' AND cg.name = 'Repairs & Maintenance')
      OR (c.name ILIKE '%repair%' AND cg.name = 'Repairs & Maintenance')
      OR (c.name ILIKE '%capital%' AND cg.name = 'Capital Works & Acquisitions')
      OR (c.name ILIKE '%improvement%' AND cg.name = 'Capital Works & Acquisitions')
      OR (c.name ILIKE '%rate%' AND cg.name = 'Statutory Levies & Rates')
      OR (c.name ILIKE '%tax%' AND cg.name = 'Statutory Levies & Rates')
      OR (c.transaction_type = 'expense' AND cg.name = 'Operating Expenses')
      OR (c.transaction_type = 'income' AND cg.name = 'Rental Income')
    );
END $$;

-- --------------------------------------------------------------------
-- 10. TAX CLASSIFICATIONS (public.tax_classifications)
-- Standard Australian GST / BAS tax codes seeded for any existing workspaces
-- --------------------------------------------------------------------
DO $$
DECLARE
  ws RECORD;
BEGIN
  -- For every workspace currently in the database (if any exist)
  FOR ws IN SELECT id FROM public.workspaces LOOP
    INSERT INTO public.tax_classifications (workspace_id, name, bas_code, description, applies_to, is_active)
    VALUES
      -- Income Tax Classifications
      (ws.id, 'Taxable Sales (10% GST)', 'G1', 'Standard commercial rent and taxable supplies', 'income', true),
      (ws.id, 'GST-Free Rental Income', 'G1', 'Residential rent (input taxed / GST-free)', 'income', true),

      -- Expense Tax Classifications
      (ws.id, 'Operating Expense (Taxable)', '1B', 'Maintenance, utilities, and management fees with GST', 'expense', true),
      (ws.id, 'Capital Acquisition (G10)', 'G10', 'Major property capital assets & structural improvements', 'expense', true),
      (ws.id, 'GST-Free / Non-Taxable Expense', NULL, 'Council rates, water access charges, and interest', 'expense', true),
      (ws.id, 'Repair & Maintenance', '1B', 'Repairs and recurring maintenance to existing assets', 'expense', true),
      (ws.id, 'Initial Repair', 'G10', 'Repairs made immediately after acquisition (capital in nature)', 'expense', true),
      (ws.id, 'Capital Works', 'G10', 'Structural additions, alterations, and improvements (Div 43)', 'expense', true),
      (ws.id, 'Depreciating Asset', 'G10', 'Plant and equipment assets subject to decline in value (Div 40)', 'expense', true),
      (ws.id, 'Borrowing Expense', NULL, 'Loan establishment, mortgage documentation, and borrowing fees', 'expense', true),
      (ws.id, 'Other Deductible Expense', '1B', 'Rates, insurance, management fees, and general deductions', 'expense', true),
      (ws.id, 'Non-Deductible Expense', NULL, 'Fines, penalties, and non-claimable expenditures', 'expense', true),
      (ws.id, 'Private / Personal', NULL, 'Owner private proportion and non-business items', 'expense', true),
      (ws.id, 'CGT / Capital Expense', 'G10', 'Cost base additions and non-depreciable capital items', 'expense', true)
    ON CONFLICT (workspace_id, name) DO NOTHING;
  END LOOP;
END $$;

-- --------------------------------------------------------------------
-- 10. GENERATE SUGGESTED AUTOPILOT ACTIVITIES FOR WORKSPACES
-- Triggers Autopilot to generate suggested draft activities from properties/leases
-- --------------------------------------------------------------------
DO $$
DECLARE
  ws RECORD;
BEGIN
  -- If sync_workspace_autopilot_activities exists, execute it across workspaces
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_workspace_autopilot_activities') THEN
    FOR ws IN SELECT id FROM public.workspaces LOOP
      BEGIN
        PERFORM public.sync_workspace_autopilot_activities(ws.id);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END LOOP;
  END IF;
END $$;

-- Reset session replication role to default
DO $$
BEGIN
  BEGIN
    SET session_replication_role = DEFAULT;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

