-- ====================================================================
-- CHUNK 04: ROW LEVEL SECURITY (RLS) POLICIES, INDEXES & TRIGGERS
-- Step 4 of 9 — Run fourth in Supabase SQL Editor
-- ====================================================================

CREATE INDEX idx_account_context_user_id ON public.account_context USING btree (user_id);
CREATE TRIGGER trg_protect_account_context
CREATE POLICY "account_insert_own" ON "public"."account_context"
CREATE POLICY "account_select_admin" ON "public"."account_context"
CREATE POLICY "account_select_own" ON "public"."account_context"
CREATE POLICY "account_update_admin" ON "public"."account_context"
CREATE POLICY "account_update_own" ON "public"."account_context"
CREATE INDEX idx_activity_logs_action ON public.activity_logs USING btree (action);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs USING btree (entity_type, entity_id);
CREATE INDEX idx_activity_logs_property_created ON public.activity_logs USING btree (property_id, created_at DESC);
CREATE INDEX idx_activity_logs_property_id ON public.activity_logs USING btree (property_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);
CREATE INDEX idx_activity_logs_workspace_created ON public.activity_logs USING btree (workspace_id, created_at DESC);
CREATE INDEX idx_activity_logs_workspace_id ON public.activity_logs USING btree (workspace_id);
CREATE TRIGGER trg_prevent_activity_log_modification
CREATE POLICY "act_insert_admin" ON "public"."activity_logs"
CREATE POLICY "act_select" ON "public"."activity_logs"
CREATE INDEX idx_automation_executions_auto_created ON public.automation_executions USING btree (automation_id, created_at DESC);
CREATE INDEX idx_automation_executions_auto ON public.automation_executions USING btree (automation_id);
CREATE INDEX idx_automation_executions_idempotency ON public.automation_executions USING btree (idempotency_key)
CREATE INDEX idx_automation_executions_lease ON public.automation_executions USING btree (lease_id);
CREATE INDEX idx_automation_executions_source ON public.automation_executions USING btree (source_entity_type, source_entity_id);
CREATE INDEX idx_automation_executions_status ON public.automation_executions USING btree (status);
CREATE INDEX idx_automation_executions_workspace ON public.automation_executions USING btree (workspace_id);
CREATE POLICY "Workspace settings viewers can read automation executions"
CREATE POLICY "Workspace settings managers can insert automation executions"
CREATE POLICY "Workspace settings managers can update automation executions"
CREATE POLICY "Workspace settings managers can delete automation executions"
CREATE INDEX idx_automations_is_active ON public.automations USING btree (is_active);
CREATE INDEX idx_automations_lease_id ON public.automations USING btree (lease_id);
CREATE INDEX idx_automations_next_run_active ON public.automations USING btree (next_run_at)
CREATE INDEX idx_automations_next_run ON public.automations USING btree (next_run_at);
CREATE INDEX idx_automations_status_next_run ON public.automations USING btree (status, next_run_at)
CREATE INDEX idx_automations_template ON public.automations USING btree (invoice_template_id);
CREATE INDEX idx_automations_type ON public.automations USING btree (automation_type);
CREATE INDEX idx_automations_workspace_status ON public.automations USING btree (workspace_id, status);
CREATE INDEX idx_automations_workspace ON public.automations USING btree (workspace_id);
CREATE POLICY "Workspace settings viewers can read automations"
CREATE POLICY "Workspace settings managers can insert automations"
CREATE POLICY "Workspace settings managers can update automations"
CREATE POLICY "Workspace settings managers can delete automations"
CREATE POLICY "Admins can manage categories" ON "public"."categories"
CREATE POLICY "Authenticated users can read categories" ON "public"."categories"
CREATE INDEX idx_email_events_created_at ON public.email_events USING btree (created_at DESC);
CREATE INDEX idx_email_events_recipient ON public.email_events USING btree (recipient);
CREATE INDEX idx_email_events_status ON public.email_events USING btree (status);
CREATE POLICY "email_admin" ON "public"."email_events"
CREATE POLICY "email_own" ON "public"."email_events"
CREATE INDEX idx_entitlements_key ON public.entitlements USING btree (key);
CREATE POLICY "entitlements_admin_del" ON "public"."entitlements"
CREATE POLICY "entitlements_admin_ins" ON "public"."entitlements"
CREATE POLICY "entitlements_admin_upd" ON "public"."entitlements"
CREATE POLICY "entitlements_select" ON "public"."entitlements"
CREATE INDEX idx_invoice_documents_invoice ON public.invoice_documents USING btree (invoice_id);
CREATE INDEX idx_invoice_documents_workspace ON public.invoice_documents USING btree (workspace_id);
CREATE POLICY "Workspace members can access invoice documents" ON "public"."invoice_documents"
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);
CREATE POLICY "Users can manage invoice items in authorized workspaces" ON "public"."invoice_items"
CREATE POLICY "Users can view invoice items in authorized workspaces" ON "public"."invoice_items"
CREATE POLICY "invitem_delete_draft" ON "public"."invoice_items"
CREATE POLICY "invitem_insert" ON "public"."invoice_items"
CREATE POLICY "invitem_select" ON "public"."invoice_items"
CREATE POLICY "invitem_update" ON "public"."invoice_items"
CREATE INDEX idx_invoice_sequences_lookup ON public.invoice_sequences USING btree (workspace_id, prefix, year);
CREATE POLICY "Workspace members can access sequences" ON "public"."invoice_sequences"
CREATE INDEX idx_invoice_templates_is_default ON public.invoice_templates USING btree (is_default);
CREATE INDEX idx_invoice_templates_is_system ON public.invoice_templates USING btree (is_system);
CREATE INDEX idx_invoice_templates_next_run ON public.invoice_templates USING btree (next_run_at);
CREATE INDEX idx_invoice_templates_status ON public.invoice_templates USING btree (status);
CREATE INDEX idx_invoice_templates_workspace ON public.invoice_templates USING btree (workspace_id);
CREATE POLICY "Workspace members can manage invoice templates" ON "public"."invoice_templates"
CREATE POLICY "Workspace members can view invoice templates" ON "public"."invoice_templates"
CREATE INDEX idx_invoices_automation_id ON public.invoices USING btree (automation_id);
CREATE INDEX idx_invoices_customer_email ON public.invoices USING btree (customer_email);
CREATE INDEX idx_invoices_due_date ON public.invoices USING btree (due_date);
CREATE INDEX idx_invoices_lease_id ON public.invoices USING btree (lease_id);
CREATE INDEX idx_invoices_number ON public.invoices USING btree (invoice_number);
CREATE INDEX idx_invoices_property_created ON public.invoices USING btree (property_id, created_at DESC);
CREATE INDEX idx_invoices_property_id ON public.invoices USING btree (property_id);
CREATE INDEX idx_invoices_property_issue_date ON public.invoices USING btree (property_id, issue_date DESC);
CREATE INDEX idx_invoices_property_status ON public.invoices USING btree (property_id, status);
CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);
CREATE INDEX idx_invoices_tenant_id ON public.invoices USING btree (tenant_id);
CREATE INDEX idx_invoices_workspace_created_at ON public.invoices USING btree (workspace_id, created_at DESC);
CREATE INDEX idx_invoices_workspace_id ON public.invoices USING btree (workspace_id);
CREATE INDEX idx_invoices_workspace_issue_date ON public.invoices USING btree (workspace_id, issue_date DESC);
CREATE INDEX idx_invoices_workspace_status ON public.invoices USING btree (workspace_id, status);
CREATE TRIGGER trg_invoices_created_by
CREATE TRIGGER trg_protect_invoices_property
CREATE POLICY "Users can manage invoices in authorized workspaces or propertie" ON "public"."invoices"
CREATE POLICY "Users can view invoices in authorized workspaces or properties" ON "public"."invoices"
CREATE POLICY "inv_delete_draft" ON "public"."invoices"
CREATE POLICY "inv_insert" ON "public"."invoices"
CREATE POLICY "inv_select" ON "public"."invoices"
CREATE POLICY "inv_update" ON "public"."invoices"
CREATE INDEX idx_lease_tenants_lease_id ON public.lease_tenants USING btree (lease_id);
CREATE INDEX idx_lease_tenants_property_id ON public.lease_tenants USING btree (property_id);
CREATE INDEX idx_lease_tenants_tenant_id ON public.lease_tenants USING btree (tenant_id);
CREATE UNIQUE INDEX uq_lease_primary_tenant ON public.lease_tenants USING btree (lease_id)
CREATE POLICY "lt_delete" ON "public"."lease_tenants"
CREATE POLICY "lt_insert" ON "public"."lease_tenants"
CREATE POLICY "lt_select" ON "public"."lease_tenants"
CREATE POLICY "lt_update" ON "public"."lease_tenants"
CREATE INDEX idx_leases_dates ON public.leases USING btree (start_date, end_date);
CREATE INDEX idx_leases_property_created_at ON public.leases USING btree (property_id, created_at DESC);
CREATE INDEX idx_leases_property_id ON public.leases USING btree (property_id);
CREATE INDEX idx_leases_property_status ON public.leases USING btree (property_id, status);
CREATE INDEX idx_leases_renewed_from ON public.leases USING btree (renewed_from_lease_id);
CREATE INDEX idx_leases_status ON public.leases USING btree (status);
CREATE TRIGGER trg_leases_created_by
CREATE TRIGGER trg_protect_leases_property
CREATE POLICY "leases_delete" ON "public"."leases"
CREATE POLICY "leases_insert" ON "public"."leases"
CREATE POLICY "leases_select" ON "public"."leases"
CREATE POLICY "leases_update" ON "public"."leases"
CREATE INDEX idx_maintenance_assigned_to ON public.maintenance_requests USING btree (assigned_to);
CREATE INDEX idx_maintenance_priority ON public.maintenance_requests USING btree (priority);
CREATE INDEX idx_maintenance_property_id ON public.maintenance_requests USING btree (property_id);
CREATE INDEX idx_maintenance_status ON public.maintenance_requests USING btree (status);
CREATE INDEX idx_maintenance_tenant_id ON public.maintenance_requests USING btree (tenant_id);
CREATE TRIGGER trg_protect_maintenance_requests_property
CREATE POLICY "mnt_delete" ON "public"."maintenance_requests"
CREATE POLICY "mnt_insert" ON "public"."maintenance_requests"
CREATE POLICY "mnt_select" ON "public"."maintenance_requests"
CREATE POLICY "mnt_update" ON "public"."maintenance_requests"
CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);
CREATE INDEX idx_notifications_property_id ON public.notifications USING btree (property_id);
CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE TRIGGER trg_protect_notifications
CREATE POLICY "notif_insert_managers" ON "public"."notifications"
CREATE POLICY "notif_select" ON "public"."notifications"
CREATE POLICY "notif_update_read" ON "public"."notifications"
CREATE INDEX idx_payment_proofs_payment_id ON public.payment_proofs USING btree (payment_id);
CREATE POLICY "proofs_insert_own" ON "public"."payment_proofs"
CREATE POLICY "proofs_select_own" ON "public"."payment_proofs"
CREATE INDEX idx_permissions_key ON public.permissions USING btree (key);
CREATE INDEX idx_permissions_scope ON public.permissions USING btree (scope);
CREATE POLICY "permissions_select" ON "public"."permissions"
CREATE INDEX idx_plan_entitlements_entitlement_id ON public.plan_entitlements USING btree (entitlement_id);
CREATE INDEX idx_plan_entitlements_plan_id ON public.plan_entitlements USING btree (plan_id);
CREATE POLICY "plan_entitlements_admin_del" ON "public"."plan_entitlements"
CREATE POLICY "plan_entitlements_admin_ins" ON "public"."plan_entitlements"
CREATE POLICY "plan_entitlements_admin_upd" ON "public"."plan_entitlements"
CREATE POLICY "plan_entitlements_select" ON "public"."plan_entitlements"
CREATE INDEX idx_platform_admins_status ON public.platform_admins USING btree (status);
CREATE TRIGGER trg_protect_platform_admins
CREATE POLICY "platform_admins_select_admin" ON "public"."platform_admins"
CREATE POLICY "platform_admins_select_own" ON "public"."platform_admins"
CREATE INDEX idx_platform_role_permissions_perm ON public.platform_role_permissions USING btree (permission_id);
CREATE INDEX idx_platform_role_permissions_role ON public.platform_role_permissions USING btree (role_id);
CREATE POLICY "platform_role_perms_select" ON "public"."platform_role_permissions"
CREATE POLICY "platform_roles_select" ON "public"."platform_roles"
CREATE INDEX idx_platform_user_roles_user ON public.platform_user_roles USING btree (user_id);
CREATE POLICY "platform_user_roles_select" ON "public"."platform_user_roles"
CREATE INDEX idx_profiles_id ON public.profiles USING btree (id);
CREATE UNIQUE INDEX uq_profiles_public_id ON public.profiles USING btree (public_id);
CREATE TRIGGER trg_profiles_set_public_id
CREATE POLICY "Public profiles are viewable by authenticated" ON "public"."profiles"
CREATE POLICY "Users can insert own profile" ON "public"."profiles"
CREATE POLICY "profiles_select_admin" ON "public"."profiles"
CREATE POLICY "profiles_select_own" ON "public"."profiles"
CREATE POLICY "profiles_update_own" ON "public"."profiles"
CREATE INDEX idx_properties_owner_id ON public.properties USING btree (owner_id);
CREATE INDEX idx_properties_status ON public.properties USING btree (status);
CREATE INDEX idx_properties_workspace_created ON public.properties USING btree (workspace_id, created_at DESC);
CREATE INDEX idx_properties_workspace_id ON public.properties USING btree (workspace_id);
CREATE INDEX idx_properties_workspace_status ON public.properties USING btree (workspace_id, status);
CREATE TRIGGER trg_property_owner_in_workspace
CREATE TRIGGER trg_sync_property_workspace_team_access
CREATE POLICY "prop_delete" ON "public"."properties"
CREATE POLICY "prop_insert" ON "public"."properties"
CREATE POLICY "prop_select" ON "public"."properties"
CREATE POLICY "prop_update" ON "public"."properties"
CREATE INDEX idx_property_members_prop_id ON public.property_members USING btree (property_id);
CREATE INDEX idx_property_members_status ON public.property_members USING btree (status);
CREATE INDEX idx_property_members_user_id ON public.property_members USING btree (user_id);
CREATE POLICY "pm_delete" ON "public"."property_members"
CREATE POLICY "pm_insert" ON "public"."property_members"
CREATE POLICY "pm_select" ON "public"."property_members"
CREATE POLICY "pm_update" ON "public"."property_members"
CREATE INDEX idx_subscription_events_account_id ON public.subscription_events USING btree (account_id);
CREATE INDEX idx_subscription_events_created_at ON public.subscription_events USING btree (created_at DESC);
CREATE INDEX idx_subscription_events_event_id ON public.subscription_events USING btree (provider_event_id);
CREATE POLICY "sub_events_admin" ON "public"."subscription_events"
CREATE INDEX idx_subscription_payments_account_id ON public.subscription_payments USING btree (account_id);
CREATE INDEX idx_subscription_payments_reference ON public.subscription_payments USING btree (reference);
CREATE INDEX idx_subscription_payments_status ON public.subscription_payments USING btree (status);
CREATE INDEX idx_subscription_payments_subscription_id ON public.subscription_payments USING btree (subscription_id);
CREATE TRIGGER trg_protect_subscription_payments
CREATE POLICY "subpay_admin_ins" ON "public"."subscription_payments"
CREATE POLICY "subpay_admin_upd" ON "public"."subscription_payments"
CREATE POLICY "subpay_select_own" ON "public"."subscription_payments"
CREATE INDEX idx_subscription_plans_slug ON public.subscription_plans USING btree (slug);
CREATE INDEX idx_subscription_plans_status ON public.subscription_plans USING btree (status);
CREATE POLICY "plans_admin_del" ON "public"."subscription_plans"
CREATE POLICY "plans_admin_ins" ON "public"."subscription_plans"
CREATE POLICY "plans_admin_upd" ON "public"."subscription_plans"
CREATE POLICY "plans_select_active" ON "public"."subscription_plans"
CREATE INDEX idx_subscriptions_account_id ON public.subscriptions USING btree (account_id);
CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions USING btree (plan_id);
CREATE INDEX idx_subscriptions_provider_sub_id ON public.subscriptions USING btree (provider_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);
CREATE UNIQUE INDEX uq_subscriptions_one_checkout_current ON public.subscriptions USING btree (account_id)
CREATE UNIQUE INDEX uq_subscriptions_one_entitlement_current ON public.subscriptions USING btree (account_id)
CREATE TRIGGER trg_ensure_single_current_subscription
CREATE POLICY "subs_admin_del" ON "public"."subscriptions"
CREATE POLICY "subs_admin_ins" ON "public"."subscriptions"
CREATE POLICY "subs_admin_upd" ON "public"."subscriptions"
CREATE POLICY "subs_select_own" ON "public"."subscriptions"
CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);
CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);
CREATE INDEX idx_tasks_property_id ON public.tasks USING btree (property_id);
CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);
CREATE TRIGGER trg_protect_tasks_property
CREATE POLICY "task_delete" ON "public"."tasks"
CREATE POLICY "task_insert" ON "public"."tasks"
CREATE POLICY "task_select" ON "public"."tasks"
CREATE POLICY "task_update" ON "public"."tasks"
CREATE INDEX idx_team_role_permissions_perm ON public.team_role_permissions USING btree (permission_id);
CREATE INDEX idx_team_role_permissions_role ON public.team_role_permissions USING btree (role_id);
CREATE POLICY "team_role_perms_select" ON "public"."team_role_permissions"
CREATE INDEX idx_team_roles_workspace_id ON public.team_roles USING btree (workspace_id);
CREATE UNIQUE INDEX uq_team_roles_system_name ON public.team_roles USING btree (lower(name))
CREATE UNIQUE INDEX uq_team_roles_workspace_name ON public.team_roles USING btree (workspace_id, lower(name))
CREATE POLICY "team_roles_select" ON "public"."team_roles"
CREATE INDEX idx_tenants_email ON public.tenants USING btree (email);
CREATE INDEX idx_tenants_property_created_at ON public.tenants USING btree (property_id, created_at DESC);
CREATE INDEX idx_tenants_property_id ON public.tenants USING btree (property_id);
CREATE INDEX idx_tenants_property_status ON public.tenants USING btree (property_id, status);
CREATE INDEX idx_tenants_status ON public.tenants USING btree (status);
CREATE INDEX idx_tenants_user_id ON public.tenants USING btree (user_id);
CREATE TRIGGER trg_protect_tenants_property
CREATE POLICY "tenants_delete" ON "public"."tenants"
CREATE POLICY "tenants_insert" ON "public"."tenants"
CREATE POLICY "tenants_select" ON "public"."tenants"
CREATE POLICY "tenants_update" ON "public"."tenants"
CREATE INDEX idx_transactions_category ON public.transactions USING btree (transaction_category_id);
CREATE INDEX idx_transactions_invoice ON public.transactions USING btree (invoice_id)
CREATE INDEX idx_transactions_lease ON public.transactions USING btree (lease_id)
CREATE INDEX idx_transactions_property_date ON public.transactions USING btree (property_id, transaction_date DESC);
CREATE INDEX idx_transactions_tenant ON public.transactions USING btree (tenant_id)
CREATE INDEX idx_transactions_type_status ON public.transactions USING btree (transaction_type, status);
CREATE INDEX idx_transactions_workspace_date ON public.transactions USING btree (workspace_id, transaction_date DESC);
CREATE POLICY "Users can delete transactions for authorized properties" ON "public"."transactions"
CREATE POLICY "Users can insert transactions for authorized properties" ON "public"."transactions"
CREATE POLICY "Users can read transactions for authorized properties" ON "public"."transactions"
CREATE POLICY "Users can update transactions for authorized properties" ON "public"."transactions"
CREATE INDEX idx_workspace_invitations_expires ON public.workspace_invitations USING btree (expires_at);
CREATE INDEX idx_workspace_invitations_status ON public.workspace_invitations USING btree (status);
CREATE INDEX idx_workspace_invitations_workspace ON public.workspace_invitations USING btree (workspace_id);
CREATE UNIQUE INDEX uq_workspace_invitations_token_hash ON public.workspace_invitations USING btree (token_hash)
CREATE POLICY "workspace_invitations_deny" ON "public"."workspace_invitations"
CREATE INDEX idx_workspace_members_role_id ON public.workspace_members USING btree (role_id);
CREATE INDEX idx_workspace_members_status ON public.workspace_members USING btree (status);
CREATE INDEX idx_workspace_members_user_id ON public.workspace_members USING btree (user_id);
CREATE INDEX idx_workspace_members_ws_id ON public.workspace_members USING btree (workspace_id);
CREATE TRIGGER trg_sync_workspace_member_role_text
CREATE POLICY "wsm_delete" ON "public"."workspace_members"
CREATE POLICY "wsm_insert" ON "public"."workspace_members"
CREATE POLICY "wsm_select" ON "public"."workspace_members"
CREATE POLICY "wsm_update" ON "public"."workspace_members"
CREATE INDEX idx_workspaces_owner_id ON public.workspaces USING btree (owner_id);
CREATE INDEX idx_workspaces_slug ON public.workspaces USING btree (slug);
CREATE TRIGGER trg_workspaces_ensure_owner_membership
CREATE POLICY "ws_insert" ON "public"."workspaces"
CREATE POLICY "ws_select" ON "public"."workspaces"
CREATE POLICY "ws_update" ON "public"."workspaces"
CREATE POLICY "Allow authenticated users to read invoice documents" ON "storage"."objects"
CREATE POLICY "Allow service role full access to invoice documents" ON "storage"."objects"
CREATE POLICY "Allow users to upload receipts to their folder" ON "storage"."objects"
CREATE POLICY "Avatar images are publicly accessible" ON "storage"."objects"
CREATE POLICY "Users can delete their own avatar" ON "storage"."objects"
CREATE POLICY "Users can update their own avatar" ON "storage"."objects"
CREATE POLICY "Users can upload their own avatar" ON "storage"."objects"
CREATE POLICY "payment_proofs_upload" ON "storage"."objects"
CREATE POLICY "receipts_delete_own" ON "storage"."objects"
CREATE POLICY "receipts_insert_own" ON "storage"."objects"
CREATE POLICY "receipts_select_own" ON "storage"."objects"
CREATE POLICY "receipts_service" ON "storage"."objects"
CREATE POLICY "receipts_update_own" ON "storage"."objects"
CREATE INDEX IF NOT EXISTS idx_expected_schedule_workspace_due ON public.expected_payment_schedule (workspace_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_expected_schedule_property_due ON public.expected_payment_schedule (property_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_expected_schedule_lease ON public.expected_payment_schedule (lease_id) WHERE lease_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expected_schedule_status ON public.expected_payment_schedule (status);
CREATE INDEX IF NOT EXISTS idx_allocations_transaction ON public.transaction_schedule_allocations (transaction_id);
CREATE INDEX IF NOT EXISTS idx_allocations_expected_payment ON public.transaction_schedule_allocations (expected_payment_id);
ALTER TABLE public.expected_payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_schedule_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read expected schedules for authorized workspaces/properties" ON public.expected_payment_schedule FOR SELECT TO authenticated USING ((public.can_access_workspace(workspace_id) AND (property_id IS NULL OR public.can_access_property(property_id))) OR (tenant_id IN (SELECT t.id FROM public.tenants t WHERE t.user_id = auth.uid())) OR public.is_platform_admin());
CREATE POLICY "Users can insert expected schedules for authorized workspaces/properties" ON public.expected_payment_schedule FOR INSERT TO authenticated WITH CHECK (public.can_access_workspace(workspace_id) AND (property_id IS NULL OR public.can_write_property(property_id, 'financial.manage')));
CREATE POLICY "Users can update expected schedules for authorized workspaces/properties" ON public.expected_payment_schedule FOR UPDATE TO authenticated USING (public.can_access_workspace(workspace_id) AND (property_id IS NULL OR public.can_write_property(property_id, 'financial.manage'))) WITH CHECK (public.can_access_workspace(workspace_id) AND (property_id IS NULL OR public.can_write_property(property_id, 'financial.manage')));
CREATE POLICY "Users can delete expected schedules for authorized workspaces/properties" ON public.expected_payment_schedule FOR DELETE TO authenticated USING (public.can_access_workspace(workspace_id) AND (property_id IS NULL OR public.can_write_property(property_id, 'financial.manage')));
CREATE POLICY "Users can read transaction allocations" ON public.transaction_schedule_allocations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND public.can_access_workspace(t.workspace_id)) OR public.is_platform_admin());
CREATE POLICY "Users can insert transaction allocations" ON public.transaction_schedule_allocations FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND public.can_access_workspace(t.workspace_id) AND public.can_write_property(t.property_id, 'financial.manage')));
CREATE POLICY "Users can update transaction allocations" ON public.transaction_schedule_allocations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND public.can_access_workspace(t.workspace_id) AND public.can_write_property(t.property_id, 'financial.manage'))) WITH CHECK (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND public.can_access_workspace(t.workspace_id) AND public.can_write_property(t.property_id, 'financial.manage')));
CREATE POLICY "Users can delete transaction allocations" ON public.transaction_schedule_allocations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND public.can_access_workspace(t.workspace_id) AND public.can_write_property(t.property_id, 'financial.manage')));
CREATE INDEX IF NOT EXISTS idx_condition_reports_workspace_id ON public.condition_reports (workspace_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_property_id ON public.condition_reports (property_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_lease_id ON public.condition_reports (lease_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_status ON public.condition_reports (status);
CREATE INDEX IF NOT EXISTS idx_condition_reports_inspection_date ON public.condition_reports (inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_rooms_report_id ON public.inspection_rooms (report_id, room_order);
CREATE INDEX IF NOT EXISTS idx_inspection_items_room_id ON public.inspection_items (room_id);
CREATE INDEX IF NOT EXISTS idx_inspection_defects_room_id ON public.inspection_defects (room_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_room_id ON public.inspection_photos (room_id);
ALTER TABLE public.condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr_select" ON public.condition_reports
CREATE POLICY "cr_insert" ON public.condition_reports
CREATE POLICY "cr_update" ON public.condition_reports
CREATE POLICY "cr_delete" ON public.condition_reports
CREATE POLICY "ir_select" ON public.inspection_rooms
CREATE POLICY "ir_insert" ON public.inspection_rooms
CREATE POLICY "ir_update" ON public.inspection_rooms
CREATE POLICY "ir_delete" ON public.inspection_rooms
CREATE POLICY "ii_select" ON public.inspection_items
CREATE POLICY "ii_insert" ON public.inspection_items
CREATE POLICY "ii_update" ON public.inspection_items
CREATE POLICY "ii_delete" ON public.inspection_items
CREATE POLICY "id_select" ON public.inspection_defects
CREATE POLICY "id_insert" ON public.inspection_defects
CREATE POLICY "id_update" ON public.inspection_defects
CREATE POLICY "id_delete" ON public.inspection_defects
CREATE POLICY "ip_select" ON public.inspection_photos
CREATE POLICY "ip_insert" ON public.inspection_photos
CREATE POLICY "ip_update" ON public.inspection_photos
CREATE POLICY "ip_delete" ON public.inspection_photos
ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view category groups"
CREATE POLICY "Workspace managers can manage category groups"
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view categories"
CREATE POLICY "Workspace managers can manage categories"
ALTER TABLE public.tax_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view tax classifications"
CREATE POLICY "Workspace managers can manage tax classifications"
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_date ON public.transactions(workspace_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_property_date ON public.transactions(property_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_lease ON public.transactions(lease_id) WHERE lease_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON public.transactions(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(transaction_category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tax_classification ON public.transactions(tax_classification_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_blob ON public.transactions(receipt_blob_path) WHERE receipt_blob_path IS NOT NULL;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view transactions"
CREATE POLICY "Workspace members can manage transactions"
CREATE INDEX IF NOT EXISTS idx_expected_schedule_workspace_due ON public.expected_payment_schedule (workspace_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_expected_schedule_property_due ON public.expected_payment_schedule (property_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_expected_schedule_lease ON public.expected_payment_schedule (lease_id) WHERE lease_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expected_schedule_status ON public.expected_payment_schedule (status);
ALTER TABLE public.expected_payment_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view expected schedules"
CREATE POLICY "Workspace members can manage expected schedules"
CREATE INDEX IF NOT EXISTS idx_allocations_transaction ON public.transaction_schedule_allocations (transaction_id);
CREATE INDEX IF NOT EXISTS idx_allocations_expected_payment ON public.transaction_schedule_allocations (expected_payment_id);
ALTER TABLE public.transaction_schedule_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view allocations"
CREATE POLICY "Workspace members can manage allocations"
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_tx ON public.transaction_attachments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_workspace ON public.transaction_attachments(workspace_id);
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace access can view transaction attachments"
CREATE POLICY "Workspace access can manage transaction attachments"
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_property_id ON public.documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_lease_id ON public.documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace access can view documents"
CREATE POLICY "Workspace access can insert documents"
CREATE POLICY "Workspace access can update documents"
CREATE POLICY "Workspace access can delete documents"
CREATE TRIGGER trigger_set_documents_updated_at
NOTIFY pgrst, 'reload schema';
