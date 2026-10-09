-- ====================================================================
-- CHUNK 04: TRIGGERS, INDEXES & ROW LEVEL SECURITY (RLS) POLICIES
-- Step 4 of 9 — Run fourth in Supabase SQL Editor
-- ====================================================================

  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_account_context_user_id ON public.account_context USING btree (user_id);

CREATE TRIGGER trg_protect_account_context
  BEFORE UPDATE ON public.account_context
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_account_context_fields();

CREATE POLICY "account_insert_own" ON "public"."account_context"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "account_select_admin" ON "public"."account_context"
  FOR SELECT
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "account_select_own" ON "public"."account_context"
  FOR SELECT
  TO "authenticated"
  USING ((auth.uid() = user_id));

CREATE POLICY "account_update_admin" ON "public"."account_context"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "account_update_own" ON "public"."account_context"
  FOR UPDATE
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."account_context" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."account_context" TO "postgres", "service_role";


-- Table: activity_logs
CREATE TABLE "public"."activity_logs" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid,
  "property_id"  uuid,
  "user_id"      uuid,
  "action"       text                     NOT NULL,
  "entity_type"  text                     NOT NULL,
  "entity_id"    uuid,
  "metadata"     jsonb                    DEFAULT '{}'::jsonb,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "description"  text,
  CONSTRAINT "activity_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "activity_logs_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL,
  CONSTRAINT "activity_logs_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."activity_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_activity_logs_action ON public.activity_logs USING btree (action);

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);

CREATE INDEX idx_activity_logs_entity ON public.activity_logs USING btree (entity_type, entity_id);

CREATE INDEX idx_activity_logs_property_created ON public.activity_logs USING btree (property_id, created_at DESC);

CREATE INDEX idx_activity_logs_property_id ON public.activity_logs USING btree (property_id);

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);

CREATE INDEX idx_activity_logs_workspace_created ON public.activity_logs USING btree (workspace_id, created_at DESC);

CREATE INDEX idx_activity_logs_workspace_id ON public.activity_logs USING btree (workspace_id);

CREATE TRIGGER trg_prevent_activity_log_modification
  BEFORE DELETE OR UPDATE ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_activity_log_modification();

CREATE POLICY "act_insert_admin" ON "public"."activity_logs"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "act_select" ON "public"."activity_logs"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR ((property_id IS NOT NULL) AND public.can_access_property(property_id)) OR ((workspace_id IS
    NOT NULL) AND public.can_access_workspace(workspace_id)) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."activity_logs" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."activity_logs" TO "postgres", "service_role";


-- Table: automation_executions
CREATE TABLE "public"."automation_executions" (
  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "automation_id"         uuid                     NOT NULL,
  "workspace_id"          uuid                     NOT NULL,
  "idempotency_key"       text                     NOT NULL,
  "trigger_source"        text,
  "status"                text                     NOT NULL DEFAULT 'pending'::text,
  "started_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at"          timestamp with time zone,
  "retry_count"           integer                  NOT NULL DEFAULT 0,
  "error_message"         text,
  "result_summary"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "lease_id"              uuid,
  "execution_type"        text                     DEFAULT 'scheduled'::text,
  "source_entity_type"    text,
  "source_entity_id"      text,
  "conditions_evaluated"  jsonb                    DEFAULT '{}'::jsonb,
  "actions_executed"      jsonb                    DEFAULT '[]'::jsonb,
  "execution_duration_ms" integer,
  CONSTRAINT "automation_executions_execution_type_check" CHECK ((execution_type = ANY (ARRAY['scheduled'::text, 'manual'::text]))),
  CONSTRAINT "automation_executions_pkey" PRIMARY KEY (id),
  CONSTRAINT "automation_executions_status_check"
    CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'succeeded'::text, 'failed'::text, 'skipped'::text]))),
  CONSTRAINT "uq_automation_idempotency" UNIQUE (automation_id, idempotency_key),
  CONSTRAINT "automation_executions_automation_id_fkey" FOREIGN KEY (automation_id) REFERENCES public.automations(id) ON DELETE CASCADE,
  CONSTRAINT "automation_executions_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE,
  CONSTRAINT "automation_executions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."automation_executions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_automation_executions_auto_created ON public.automation_executions USING btree (automation_id, created_at DESC);

CREATE INDEX idx_automation_executions_auto ON public.automation_executions USING btree (automation_id);

CREATE INDEX idx_automation_executions_idempotency ON public.automation_executions USING btree (idempotency_key)
  WHERE (idempotency_key IS NOT NULL);

CREATE INDEX idx_automation_executions_lease ON public.automation_executions USING btree (lease_id);

CREATE INDEX idx_automation_executions_source ON public.automation_executions USING btree (source_entity_type, source_entity_id);

CREATE INDEX idx_automation_executions_status ON public.automation_executions USING btree (status);

CREATE INDEX idx_automation_executions_workspace ON public.automation_executions USING btree (workspace_id);

CREATE POLICY "Workspace settings viewers can read automation executions"
  ON public.automation_executions
  FOR SELECT
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.view')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can insert automation executions"
  ON public.automation_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can update automation executions"
  ON public.automation_executions
  FOR UPDATE
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can delete automation executions"
  ON public.automation_executions
  FOR DELETE
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."automation_executions" TO "authenticated", "postgres", "service_role";


-- Table: automations
CREATE TABLE "public"."automations" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id"        uuid                     NOT NULL,
  "name"                text                     NOT NULL,
  "description"         text,
  "trigger_type"        text                     NOT NULL,
  "trigger_config"      jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "conditions"          jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "actions"             jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "is_active"           boolean                  NOT NULL DEFAULT true,
  "last_run_at"         timestamp with time zone,
  "next_run_at"         timestamp with time zone,
  "created_by"          uuid,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "lease_id"            uuid,
  "schedule_type"       text                     DEFAULT 'monthly'::text,
  "schedule_config"     jsonb                    DEFAULT '{}'::jsonb,
  "status"              text                     DEFAULT 'active'::text,
  "automation_type"     text                     DEFAULT 'lease'::text,
  "invoice_template_id" uuid,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  CONSTRAINT "automations_automation_type_check" CHECK ((automation_type = ANY (ARRAY['lease'::text, 'invoice'::text, 'finance'::text]))),
  CONSTRAINT "automations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "automations_pkey" PRIMARY KEY (id),
  CONSTRAINT "automations_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'failed'::text]))),
  CONSTRAINT "automations_trigger_type_check" CHECK ((trigger_type = ANY (ARRAY['schedule'::text, 'event'::text, 'source'::text]))),
  CONSTRAINT "automations_invoice_template_id_fkey" FOREIGN KEY (invoice_template_id) REFERENCES public.invoice_templates(id) ON DELETE SET NULL,
  CONSTRAINT "automations_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE,
  CONSTRAINT "automations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."automations"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_automations_is_active ON public.automations USING btree (is_active);

CREATE INDEX idx_automations_lease_id ON public.automations USING btree (lease_id);

CREATE INDEX idx_automations_next_run_active ON public.automations USING btree (next_run_at)
  WHERE (status = 'active'::text);

CREATE INDEX idx_automations_next_run ON public.automations USING btree (next_run_at);

CREATE INDEX idx_automations_status_next_run ON public.automations USING btree (status, next_run_at)
  WHERE (status = 'active'::text);

CREATE INDEX idx_automations_template ON public.automations USING btree (invoice_template_id);

CREATE INDEX idx_automations_type ON public.automations USING btree (automation_type);

CREATE INDEX idx_automations_workspace_status ON public.automations USING btree (workspace_id, status);

CREATE INDEX idx_automations_workspace ON public.automations USING btree (workspace_id);

CREATE POLICY "Workspace settings viewers can read automations"
  ON public.automations
  FOR SELECT
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.view')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can insert automations"
  ON public.automations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can update automations"
  ON public.automations
  FOR UPDATE
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );
CREATE POLICY "Workspace settings managers can delete automations"
  ON public.automations
  FOR DELETE
  TO authenticated
  USING (
    public.has_workspace_permission(workspace_id, 'team.settings.update')
    OR public.is_platform_admin()
  );

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."automations" TO "authenticated", "postgres", "service_role";


-- Table: categories
CREATE TABLE "public"."categories" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "transaction_type" text                     NOT NULL,
  "name"             text                     NOT NULL,
  "description"      text,
  "is_active"        boolean                  NOT NULL DEFAULT true,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "categories_pkey" PRIMARY KEY (id),
  CONSTRAINT "categories_transaction_type_check" CHECK ((transaction_type = ANY (ARRAY['income'::text, 'expense'::text]))),
  CONSTRAINT "uq_categories_id_type" UNIQUE (id, transaction_type),
  CONSTRAINT "uq_categories_type_name" UNIQUE (transaction_type, name)
);

ALTER TABLE "public"."categories"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage categories" ON "public"."categories"
  FOR ALL
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Authenticated users can read categories" ON "public"."categories"
  FOR SELECT
  TO "authenticated"
  USING (((is_active = true) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."categories" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "postgres", "service_role";


-- Table: email_events
CREATE TABLE "public"."email_events" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "recipient"           text                     NOT NULL,
  "subject"             text                     NOT NULL,
  "template_type"       text                     NOT NULL,
  "variables"           jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "provider_message_id" text,
  "status"              text                     NOT NULL DEFAULT 'pending'::text,
  "error_message"       text,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "email_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "email_events_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);

ALTER TABLE "public"."email_events"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_events_created_at ON public.email_events USING btree (created_at DESC);

CREATE INDEX idx_email_events_recipient ON public.email_events USING btree (recipient);

CREATE INDEX idx_email_events_status ON public.email_events USING btree (status);

CREATE POLICY "email_admin" ON "public"."email_events"
  FOR SELECT
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "email_own" ON "public"."email_events"
  FOR SELECT
  TO "authenticated"
  USING (((auth.jwt() ->> 'email'::text) = recipient));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."email_events" TO "postgres", "service_role";


-- Table: entitlements
CREATE TABLE "public"."entitlements" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "key"         text                     NOT NULL,
  "name"        text                     NOT NULL,
  "description" text,
  "value_type"  text                     NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "entitlements_key_key" UNIQUE (key),
  CONSTRAINT "entitlements_pkey" PRIMARY KEY (id),
  CONSTRAINT "entitlements_value_type_check" CHECK ((value_type = ANY (ARRAY['boolean'::text, 'number'::text, 'string'::text])))
);

ALTER TABLE "public"."entitlements"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_entitlements_key ON public.entitlements USING btree (key);

CREATE POLICY "entitlements_admin_del" ON "public"."entitlements"
  FOR DELETE
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "entitlements_admin_ins" ON "public"."entitlements"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "entitlements_admin_upd" ON "public"."entitlements"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "entitlements_select" ON "public"."entitlements"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT SELECT ON TABLE "public"."entitlements" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."entitlements" TO "postgres", "service_role";


-- Table: invoice_documents
CREATE TABLE "public"."invoice_documents" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id"      uuid                     NOT NULL,
  "workspace_id"    uuid                     NOT NULL,
  "document_type"   text                     NOT NULL,
  "storage_path"    text                     NOT NULL,
  "file_name"       text                     NOT NULL,
  "mime_type"       text                     NOT NULL,
  "file_size_bytes" bigint                   NOT NULL DEFAULT 0,
  "checksum"        text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "invoice_documents_document_type_check" CHECK ((document_type = ANY (ARRAY['pdf'::text, 'docx'::text]))),
  CONSTRAINT "invoice_documents_pkey" PRIMARY KEY (id),
  CONSTRAINT "invoice_documents_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE,
  CONSTRAINT "invoice_documents_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."invoice_documents"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoice_documents_invoice ON public.invoice_documents USING btree (invoice_id);

CREATE INDEX idx_invoice_documents_workspace ON public.invoice_documents USING btree (workspace_id);

CREATE POLICY "Workspace members can access invoice documents" ON "public"."invoice_documents"
  FOR ALL
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_id = invoice_documents.workspace_id) AND ((wm.user_id)::text = (auth.uid())::text)))) OR public.is_platform_admin()));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invoice_documents" TO "postgres", "service_role";


-- Table: invoice_items
CREATE TABLE "public"."invoice_items" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id"  uuid                     NOT NULL,
  "description" text                     NOT NULL,
  "quantity"    numeric(10,2)            NOT NULL DEFAULT 1,
  "unit_price"  numeric(10,2)            NOT NULL,
  "amount"      numeric(10,2)            NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "tax_rate"    numeric(5,2)             NOT NULL DEFAULT 0,
  "tax_amount"  numeric(12,2)            NOT NULL DEFAULT 0,
  "line_total"  numeric(12,2)            NOT NULL DEFAULT 0,
  "sort_order"  integer                  NOT NULL DEFAULT 0,
  CONSTRAINT "chk_invoice_item_amount" CHECK ((amount = round((quantity * unit_price), 2))),
  CONSTRAINT "invoice_items_amount_check" CHECK ((amount >= (0)::numeric)),
  CONSTRAINT "invoice_items_line_total_check" CHECK ((line_total >= (0)::numeric)),
  CONSTRAINT "invoice_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "invoice_items_quantity_check" CHECK ((quantity > (0)::numeric)),
  CONSTRAINT "invoice_items_tax_amount_check" CHECK ((tax_amount >= (0)::numeric)),
  CONSTRAINT "invoice_items_tax_rate_check" CHECK ((tax_rate >= (0)::numeric)),
  CONSTRAINT "invoice_items_unit_price_check" CHECK ((unit_price >= (0)::numeric)),
  CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE
);

ALTER TABLE "public"."invoice_items"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);

CREATE POLICY "Users can manage invoice items in authorized workspaces" ON "public"."invoice_items"
  FOR ALL
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM (public.invoices i
     JOIN public.workspace_members wm ON ((wm.workspace_id = i.workspace_id)))
  WHERE ((i.id = invoice_items.invoice_id) AND ((wm.user_id)::text = (auth.uid())::text) AND (wm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]))))) OR
    public.is_platform_admin()));

CREATE POLICY "Users can view invoice items in authorized workspaces" ON "public"."invoice_items"
  FOR SELECT
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM (public.invoices i
     JOIN public.workspace_members wm ON ((wm.workspace_id = i.workspace_id)))
  WHERE ((i.id = invoice_items.invoice_id) AND ((wm.user_id)::text = (auth.uid())::text)))) OR public.is_platform_admin()));

CREATE POLICY "invitem_delete_draft" ON "public"."invoice_items"
  FOR DELETE
  TO "authenticated"
  USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = invoice_items.invoice_id) AND (i.status = 'draft'::text) AND public.can_write_property(i.property_id, 'financial.manage'::text))))));

CREATE POLICY "invitem_insert" ON "public"."invoice_items"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = invoice_items.invoice_id) AND public.can_write_property(i.property_id, 'financial.manage'::text))))));

CREATE POLICY "invitem_select" ON "public"."invoice_items"
  FOR SELECT
  TO "authenticated"
  USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = invoice_items.invoice_id) AND public.can_access_property(i.property_id))))));

CREATE POLICY "invitem_update" ON "public"."invoice_items"
  FOR UPDATE
  TO "authenticated"
  USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = invoice_items.invoice_id) AND public.can_write_property(i.property_id, 'financial.manage'::text))))))
  WITH CHECK ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = invoice_items.invoice_id) AND public.can_write_property(i.property_id, 'financial.manage'::text))))));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."invoice_items" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invoice_items" TO "postgres", "service_role";


-- Table: invoice_sequences
CREATE TABLE "public"."invoice_sequences" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid                     NOT NULL,
  "prefix"       text                     NOT NULL DEFAULT 'INV'::text,
  "year"         integer                  NOT NULL,
  "last_number"  integer                  NOT NULL DEFAULT 0,
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_invoice_sequence" UNIQUE (workspace_id, prefix, year),
  CONSTRAINT "invoice_sequences_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."invoice_sequences"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoice_sequences_lookup ON public.invoice_sequences USING btree (workspace_id, prefix, year);

CREATE POLICY "Workspace members can access sequences" ON "public"."invoice_sequences"
  FOR ALL
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_id = invoice_sequences.workspace_id) AND ((wm.user_id)::text = (auth.uid())::text)))) OR public.is_platform_admin()));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invoice_sequences" TO "postgres", "service_role";


-- Table: invoice_templates
CREATE TABLE "public"."invoice_templates" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id"           uuid                     NOT NULL,
  "name"                   text                     NOT NULL,
  "layout_style"           text                     NOT NULL DEFAULT 'classic'::text,
  "brand_color"            text                     DEFAULT '#22333b'::text,
  "accent_color"           text                     DEFAULT '#a9927d'::text,
  "logo_url"               text,
  "header_text"            text,
  "footer_text"            text,
  "payment_instructions"   text,
  "tax_name"               text                     DEFAULT 'GST'::text,
  "notes"                  text,
  "is_default"             boolean                  NOT NULL DEFAULT false,
  "created_by"             uuid,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "description"            text,
  "status"                 text                     NOT NULL DEFAULT 'active'::text,
  "currency"               text                     NOT NULL DEFAULT 'AUD'::text,
  "invoice_type"           text                     NOT NULL DEFAULT 'rent'::text,
  "items"                  jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "payment_terms_days"     integer                  NOT NULL DEFAULT 14,
  "late_fee_amount"        numeric(10,2)            NOT NULL DEFAULT 0,
  "late_fee_days"          integer                  NOT NULL DEFAULT 0,
  "linked_property_ids"    jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "default_customer_name"  text,
  "default_customer_email" text,
  "automation_config"      jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "email_config"           jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "last_run_at"            timestamp with time zone,
  "next_run_at"            timestamp with time zone,
  "metadata"               jsonb                    DEFAULT '{}'::jsonb,
  "is_system"              boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "invoice_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "invoice_templates_late_fee_amount_check" CHECK ((late_fee_amount >= (0)::numeric)),
  CONSTRAINT "invoice_templates_late_fee_days_check" CHECK ((late_fee_days >= 0)),
  CONSTRAINT "invoice_templates_layout_style_check"
    CHECK ((layout_style = ANY (ARRAY['classic'::text, 'modern'::text, 'minimalist'::text, 'corporate'::text, 'creative'::text, 'elegant'::text, 'monochrome'::text]))),
  CONSTRAINT "invoice_templates_pkey" PRIMARY KEY (id),
  CONSTRAINT "invoice_templates_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text]))),
  CONSTRAINT "invoice_templates_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."invoice_templates"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoice_templates_is_default ON public.invoice_templates USING btree (is_default);

CREATE INDEX idx_invoice_templates_is_system ON public.invoice_templates USING btree (is_system);

CREATE INDEX idx_invoice_templates_next_run ON public.invoice_templates USING btree (next_run_at);

CREATE INDEX idx_invoice_templates_status ON public.invoice_templates USING btree (status);

CREATE INDEX idx_invoice_templates_workspace ON public.invoice_templates USING btree (workspace_id);

CREATE POLICY "Workspace members can manage invoice templates" ON "public"."invoice_templates"
  FOR ALL
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE
    ((wm.workspace_id = invoice_templates.workspace_id) AND ((wm.user_id)::text = (auth.uid())::text) AND (wm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])))))
    OR public.is_platform_admin()));

CREATE POLICY "Workspace members can view invoice templates" ON "public"."invoice_templates"
  FOR SELECT
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_id = invoice_templates.workspace_id) AND ((wm.user_id)::text = (auth.uid())::text)))) OR public.is_platform_admin()));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invoice_templates" TO "postgres", "service_role";


-- Table: invoices
CREATE TABLE "public"."invoices" (
  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"          uuid,
  "unit_id"              uuid,
  "lease_id"             uuid,
  "tenant_id"            uuid,
  "invoice_number"       text                     NOT NULL,
  "status"               text                     NOT NULL DEFAULT 'draft'::text,
  "issue_date"           date                     NOT NULL DEFAULT CURRENT_DATE,
  "due_date"             date                     NOT NULL,
  "subtotal"             numeric(10,2)            NOT NULL DEFAULT 0,
  "tax_amount"           numeric(10,2)            NOT NULL DEFAULT 0,
  "total_amount"         numeric(10,2)            NOT NULL DEFAULT 0,
  "balance_due"          numeric(10,2)            NOT NULL DEFAULT 0,
  "description"          text,
  "created_by"           uuid,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "workspace_id"         uuid,
  "currency"             text                     NOT NULL DEFAULT 'AUD'::text,
  "customer_name"        text,
  "customer_email"       text,
  "customer_address"     text,
  "snapshot"             jsonb,
  "template_id"          uuid,
  "notes"                text,
  "payment_instructions" text,
  "cancellation_reason"  text,
  "issued_at"            timestamp with time zone,
  "paid_at"              timestamp with time zone,
  "automation_id"        uuid,
  "paid_amount"          numeric(10,2)            NOT NULL DEFAULT 0,
  "billing_period_start" date,
  "billing_period_end"   date,
  CONSTRAINT "chk_invoice_balance" CHECK ((balance_due <= total_amount)),
  CONSTRAINT "chk_invoice_dates" CHECK ((due_date >= issue_date)),
  CONSTRAINT "chk_invoice_totals" CHECK ((total_amount = (subtotal + tax_amount))),
  CONSTRAINT "invoices_automation_id_fkey" FOREIGN KEY (automation_id) REFERENCES public.automations(id) ON DELETE SET NULL,
  CONSTRAINT "invoices_balance_due_check" CHECK ((balance_due >= (0)::numeric)),
  CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "invoices_invoice_number_key" UNIQUE (invoice_number),
  CONSTRAINT "invoices_pkey" PRIMARY KEY (id),
  CONSTRAINT "invoices_status_check"
    CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'viewed'::text, 'paid'::text, 'partially_paid'::text, 'overdue'::text, 'cancelled'::text, 'void'::text]))),
  CONSTRAINT "invoices_subtotal_check" CHECK ((subtotal >= (0)::numeric)),
  CONSTRAINT "invoices_tax_amount_check" CHECK ((tax_amount >= (0)::numeric)),
  CONSTRAINT "invoices_total_amount_check" CHECK ((total_amount >= (0)::numeric)),
  CONSTRAINT "fk_invoices_lease_id" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL,
  CONSTRAINT "invoices_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL,
  CONSTRAINT "invoices_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "fk_invoices_tenant_id" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL,
  CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL,
  CONSTRAINT "invoices_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."invoices"
  ENABLE ROW LEVEL SECURITY;

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
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_created_by();

CREATE TRIGGER trg_protect_invoices_property
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_child_property_id();

CREATE POLICY "Users can manage invoices in authorized workspaces or propertie" ON "public"."invoices"
  FOR ALL
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_id = invoices.workspace_id) AND ((wm.user_id)::text = (auth.uid())::text) AND (wm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]))))) OR
    ((property_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.properties p
  WHERE (((p.id)::text = (invoices.property_id)::text) AND (((p.owner_id)::text = (auth.uid())::text) OR (EXISTS ( SELECT 1
           FROM public.property_members pm
          WHERE
            (((pm.property_id)::text = (p.id)::text) AND ((pm.user_id)::text = (auth.uid())::text) AND (pm.status = 'active'::text) AND (pm.role = ANY (ARRAY['owner'::text,
            'manager'::text, 'agent'::text])))))))))) OR public.is_platform_admin()));

CREATE POLICY "Users can view invoices in authorized workspaces or properties" ON "public"."invoices"
  FOR SELECT
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.workspace_members wm
  WHERE ((wm.workspace_id = invoices.workspace_id) AND ((wm.user_id)::text = (auth.uid())::text)))) OR ((property_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.properties p
  WHERE (((p.id)::text = (invoices.property_id)::text) AND (((p.owner_id)::text = (auth.uid())::text) OR (EXISTS ( SELECT 1
           FROM public.property_members pm
          WHERE (((pm.property_id)::text = (p.id)::text) AND ((pm.user_id)::text = (auth.uid())::text) AND (pm.status = 'active'::text))))))))) OR public.is_platform_admin()));

CREATE POLICY "inv_delete_draft" ON "public"."invoices"
  FOR DELETE
  TO "authenticated"
  USING (((status = 'draft'::text) AND public.can_write_property(property_id, 'financial.manage'::text)));

CREATE POLICY "inv_insert" ON "public"."invoices"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.can_write_property(property_id, 'financial.manage'::text));

CREATE POLICY "inv_select" ON "public"."invoices"
  FOR SELECT
  TO "authenticated"
  USING ((public.can_access_property(property_id) OR (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE ((tenants.user_id)::text = (auth.uid())::text))) OR public.is_platform_admin()));

CREATE POLICY "inv_update" ON "public"."invoices"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'financial.manage'::text))
  WITH CHECK (public.can_write_property(property_id, 'financial.manage'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."invoices" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invoices" TO "postgres", "service_role";


-- Table: lease_tenants
CREATE TABLE "public"."lease_tenants" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "lease_id"    uuid                     NOT NULL,
  "tenant_id"   uuid                     NOT NULL,
  "property_id" uuid                     NOT NULL,
  "role"        text                     NOT NULL DEFAULT 'primary'::text,
  "is_primary"  boolean                  NOT NULL DEFAULT false,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "lease_tenants_lease_id_tenant_id_key" UNIQUE (lease_id, tenant_id),
  CONSTRAINT "lease_tenants_pkey" PRIMARY KEY (id),
  CONSTRAINT "lease_tenants_role_check" CHECK ((role = ANY (ARRAY['primary'::text, 'co-tenant'::text, 'guarantor'::text]))),
  CONSTRAINT "lease_tenants_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE,
  CONSTRAINT "fk_lease_tenants_lease_prop" FOREIGN KEY (lease_id, property_id) REFERENCES public.leases(id, property_id) ON DELETE CASCADE,
  CONSTRAINT "lease_tenants_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "lease_tenants_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT "fk_lease_tenants_tenant_prop" FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE CASCADE
);

ALTER TABLE "public"."lease_tenants"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_lease_tenants_lease_id ON public.lease_tenants USING btree (lease_id);

CREATE INDEX idx_lease_tenants_property_id ON public.lease_tenants USING btree (property_id);

CREATE INDEX idx_lease_tenants_tenant_id ON public.lease_tenants USING btree (tenant_id);

CREATE UNIQUE INDEX uq_lease_primary_tenant ON public.lease_tenants USING btree (lease_id)
  WHERE (is_primary = true);

CREATE POLICY "lt_delete" ON "public"."lease_tenants"
  FOR DELETE
  TO "authenticated"
  USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND public.can_write_property(l.property_id, 'lease.update'::text))))));

CREATE POLICY "lt_insert" ON "public"."lease_tenants"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND public.can_write_property(l.property_id, 'lease.update'::text))))));

CREATE POLICY "lt_select" ON "public"."lease_tenants"
  FOR SELECT
  TO "authenticated"
  USING ((public.is_platform_admin() OR public.can_access_property(property_id) OR (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE ((tenants.user_id)::text = (auth.uid())::text)))));

CREATE POLICY "lt_update" ON "public"."lease_tenants"
  FOR UPDATE
  TO "authenticated"
  USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND public.can_write_property(l.property_id, 'lease.update'::text))))))
  WITH CHECK ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND public.can_write_property(l.property_id, 'lease.update'::text))))));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."lease_tenants" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lease_tenants" TO "postgres", "service_role";


-- Table: leases
CREATE TABLE "public"."leases" (
  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"           uuid                     NOT NULL,
  "status"                text                     NOT NULL DEFAULT 'draft'::text,
  "start_date"            date                     NOT NULL,
  "end_date"              date,
  "rent_amount"           numeric(10,2)            NOT NULL,
  "security_deposit"      numeric(10,2)            NOT NULL DEFAULT 0,
  "payment_due_day"       integer                  NOT NULL DEFAULT 1,
  "rent_frequency"        text                     NOT NULL DEFAULT 'monthly'::text,
  "notes"                 text,
  "created_by"            uuid,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "renewed_from_lease_id" uuid,
  CONSTRAINT "chk_lease_dates" CHECK (((end_date IS NULL) OR (end_date >= start_date))),
  CONSTRAINT "leases_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "leases_payment_due_day_check" CHECK (((payment_due_day >= 1) AND (payment_due_day <= 31))),
  CONSTRAINT "leases_pkey" PRIMARY KEY (id),
  CONSTRAINT "leases_renewed_from_lease_id_fkey" FOREIGN KEY (renewed_from_lease_id) REFERENCES public.leases(id) ON DELETE SET NULL,
  CONSTRAINT "leases_rent_amount_check" CHECK ((rent_amount >= (0)::numeric)),
  CONSTRAINT "leases_rent_frequency_check" CHECK ((rent_frequency = ANY (ARRAY['weekly'::text, 'fortnightly'::text, 'monthly'::text, 'yearly'::text]))),
  CONSTRAINT "leases_security_deposit_check" CHECK ((security_deposit >= (0)::numeric)),
  CONSTRAINT "leases_status_check"
    CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'active'::text, 'expired'::text, 'terminated'::text, 'cancelled'::text, 'renewed'::text]))),
  CONSTRAINT "uq_leases_id_property" UNIQUE (id, property_id),
  CONSTRAINT "leases_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

ALTER TABLE "public"."leases"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_leases_dates ON public.leases USING btree (start_date, end_date);

CREATE INDEX idx_leases_property_created_at ON public.leases USING btree (property_id, created_at DESC);

CREATE INDEX idx_leases_property_id ON public.leases USING btree (property_id);

CREATE INDEX idx_leases_property_status ON public.leases USING btree (property_id, status);

CREATE INDEX idx_leases_renewed_from ON public.leases USING btree (renewed_from_lease_id);

CREATE INDEX idx_leases_status ON public.leases USING btree (status);

CREATE TRIGGER trg_leases_created_by
  BEFORE INSERT OR UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_created_by();

CREATE TRIGGER trg_protect_leases_property
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_child_property_id();

CREATE POLICY "leases_delete" ON "public"."leases"
  FOR DELETE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'lease.update'::text));

CREATE POLICY "leases_insert" ON "public"."leases"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.can_write_property(property_id, 'lease.update'::text));

CREATE POLICY "leases_select" ON "public"."leases"
  FOR SELECT
  TO "authenticated"
  USING ((public.can_access_property(property_id) OR public.tenant_can_read_lease(id) OR public.is_platform_admin()));

CREATE POLICY "leases_update" ON "public"."leases"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'lease.update'::text))
  WITH CHECK (public.can_write_property(property_id, 'lease.update'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."leases" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."leases" TO "postgres", "service_role";


-- Table: maintenance_requests
CREATE TABLE "public"."maintenance_requests" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"  uuid                     NOT NULL,
  "tenant_id"    uuid,
  "assigned_to"  uuid,
  "title"        text                     NOT NULL,
  "description"  text                     NOT NULL,
  "priority"     text                     NOT NULL DEFAULT 'medium'::text,
  "status"       text                     NOT NULL DEFAULT 'open'::text,
  "category"     text,
  "scheduled_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_by"   uuid,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "maintenance_requests_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "maintenance_requests_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "maintenance_requests_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
  CONSTRAINT "maintenance_requests_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'scheduled'::text, 'completed'::text, 'cancelled'::text]))),
  CONSTRAINT "maintenance_requests_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "maintenance_requests_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL,
  CONSTRAINT "fk_maintenance_tenant_prop" FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE SET NULL
);

ALTER TABLE "public"."maintenance_requests"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_maintenance_assigned_to ON public.maintenance_requests USING btree (assigned_to);

CREATE INDEX idx_maintenance_priority ON public.maintenance_requests USING btree (priority);

CREATE INDEX idx_maintenance_property_id ON public.maintenance_requests USING btree (property_id);

CREATE INDEX idx_maintenance_status ON public.maintenance_requests USING btree (status);

CREATE INDEX idx_maintenance_tenant_id ON public.maintenance_requests USING btree (tenant_id);

CREATE TRIGGER trg_protect_maintenance_requests_property
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_child_property_id();

CREATE POLICY "mnt_delete" ON "public"."maintenance_requests"
  FOR DELETE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'maintenance.manage'::text));

CREATE POLICY "mnt_insert" ON "public"."maintenance_requests"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.can_write_property(property_id, 'maintenance.manage'::text));

CREATE POLICY "mnt_select" ON "public"."maintenance_requests"
  FOR SELECT
  TO "authenticated"
  USING ((public.can_access_property(property_id) OR (assigned_to = auth.uid()) OR (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (tenants.user_id = auth.uid()))) OR public.is_platform_admin()));

CREATE POLICY "mnt_update" ON "public"."maintenance_requests"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'maintenance.manage'::text))
  WITH CHECK (public.can_write_property(property_id, 'maintenance.manage'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."maintenance_requests" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."maintenance_requests" TO "postgres", "service_role";


-- Table: notifications
CREATE TABLE "public"."notifications" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     uuid                     NOT NULL,
  "property_id" uuid,
  "type"        text                     NOT NULL,
  "title"       text                     NOT NULL,
  "message"     text                     NOT NULL,
  "read_at"     timestamp with time zone,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY (id),
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "notifications_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

ALTER TABLE "public"."notifications"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_notifications_property_id ON public.notifications USING btree (property_id);

CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE TRIGGER trg_protect_notifications
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_notifications_read_state();

CREATE POLICY "notif_insert_managers" ON "public"."notifications"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.is_platform_admin() OR ((property_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.properties p
  WHERE (((p.id)::text = p.property_id) AND (((p.owner_id)::text = (auth.uid())::text) OR (EXISTS ( SELECT 1
           FROM public.property_members pm
          WHERE
            (((pm.property_id)::text = (p.id)::text) AND ((pm.user_id)::text = (auth.uid())::text) AND (pm.status = 'active'::text) AND (pm.role = ANY (ARRAY['owner'::text,
            'manager'::text, 'agent'::text]))))) OR (EXISTS ( SELECT 1
           FROM public.workspace_members wm
          WHERE
            (((wm.workspace_id)::text = (p.workspace_id)::text) AND ((wm.user_id)::text = (auth.uid())::text) AND (wm.status = 'active'::text) AND (wm.role = ANY
            (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))))))))));

CREATE POLICY "notif_select" ON "public"."notifications"
  FOR SELECT
  TO "authenticated"
  USING ((user_id = auth.uid()));

CREATE POLICY "notif_update_read" ON "public"."notifications"
  FOR UPDATE
  TO "authenticated"
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

GRANT SELECT, UPDATE ON TABLE "public"."notifications" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "postgres", "service_role";


-- Table: payment_proofs
CREATE TABLE "public"."payment_proofs" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "payment_id"       uuid                     NOT NULL,
  "storage_path"     text                     NOT NULL,
  "file_name"        text                     NOT NULL,
  "mime_type"        text                     NOT NULL,
  "file_size"        integer                  NOT NULL,
  "file_preview_url" text,
  "uploaded_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "chk_payment_proofs_mime" CHECK ((mime_type = ANY (ARRAY['application/pdf'::text, 'image/png'::text, 'image/jpeg'::text, 'image/jpg'::text]))),
  CONSTRAINT "chk_payment_proofs_size" CHECK (((file_size > 0) AND (file_size <= 5242880))),
  CONSTRAINT "payment_proofs_pkey" PRIMARY KEY (id),
  CONSTRAINT "payment_proofs_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.subscription_payments(id) ON DELETE CASCADE
);

ALTER TABLE "public"."payment_proofs"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_payment_proofs_payment_id ON public.payment_proofs USING btree (payment_id);

CREATE POLICY "proofs_insert_own" ON "public"."payment_proofs"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.subscription_payments sp
  WHERE ((sp.id = payment_proofs.payment_id) AND (sp.account_id = auth.uid()))))));

CREATE POLICY "proofs_select_own" ON "public"."payment_proofs"
  FOR SELECT
  TO "authenticated"
  USING ((public.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.subscription_payments sp
  WHERE ((sp.id = payment_proofs.payment_id) AND (sp.account_id = auth.uid()))))));

GRANT INSERT, SELECT ON TABLE "public"."payment_proofs" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payment_proofs" TO "postgres", "service_role";


-- Table: permissions
CREATE TABLE "public"."permissions" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "key"         text                     NOT NULL,
  "name"        text                     NOT NULL,
  "description" text,
  "scope"       text                     NOT NULL,
  "resource"    text                     NOT NULL,
  "action"      text                     NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "permissions_key_key" UNIQUE (key),
  CONSTRAINT "permissions_pkey" PRIMARY KEY (id),
  CONSTRAINT "permissions_scope_check" CHECK ((scope = ANY (ARRAY['PLATFORM'::text, 'TEAM'::text])))
);

ALTER TABLE "public"."permissions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_permissions_key ON public.permissions USING btree (key);

CREATE INDEX idx_permissions_scope ON public.permissions USING btree (scope);

CREATE POLICY "permissions_select" ON "public"."permissions"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT SELECT ON TABLE "public"."permissions" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."permissions" TO "postgres", "service_role";


-- Table: plan_entitlements
CREATE TABLE "public"."plan_entitlements" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "plan_id"        uuid                     NOT NULL,
  "entitlement_id" uuid                     NOT NULL,
  "value"          jsonb                    NOT NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "plan_entitlements_entitlement_id_fkey" FOREIGN KEY (entitlement_id) REFERENCES public.entitlements(id) ON DELETE CASCADE,
  CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY (id),
  CONSTRAINT "unique_plan_entitlement" UNIQUE (plan_id, entitlement_id),
  CONSTRAINT "plan_entitlements_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE
);

ALTER TABLE "public"."plan_entitlements"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_plan_entitlements_entitlement_id ON public.plan_entitlements USING btree (entitlement_id);

CREATE INDEX idx_plan_entitlements_plan_id ON public.plan_entitlements USING btree (plan_id);

CREATE POLICY "plan_entitlements_admin_del" ON "public"."plan_entitlements"
  FOR DELETE
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "plan_entitlements_admin_ins" ON "public"."plan_entitlements"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "plan_entitlements_admin_upd" ON "public"."plan_entitlements"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "plan_entitlements_select" ON "public"."plan_entitlements"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT SELECT ON TABLE "public"."plan_entitlements" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."plan_entitlements" TO "postgres", "service_role";


-- Table: platform_admins
CREATE TABLE "public"."platform_admins" (
  "user_id"    uuid                     NOT NULL,
  "status"     text                     NOT NULL DEFAULT 'active'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "notes"      text,
  CONSTRAINT "platform_admins_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "platform_admins_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "platform_admins_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text]))),
  CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE "public"."platform_admins"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."platform_admins"
  FORCE ROW LEVEL SECURITY;

CREATE INDEX idx_platform_admins_status ON public.platform_admins USING btree (status);

CREATE TRIGGER trg_protect_platform_admins
  BEFORE INSERT OR DELETE OR UPDATE ON public.platform_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_platform_admins_mutations();

CREATE POLICY "platform_admins_select_admin" ON "public"."platform_admins"
  FOR SELECT
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "platform_admins_select_own" ON "public"."platform_admins"
  FOR SELECT
  TO "authenticated"
  USING ((user_id = auth.uid()));

GRANT SELECT ON TABLE "public"."platform_admins" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_admins" TO "postgres", "service_role";


-- Table: platform_role_permissions
CREATE TABLE "public"."platform_role_permissions" (
  "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
  "role_id"       uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  CONSTRAINT "platform_role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE,
  CONSTRAINT "platform_role_permissions_pkey" PRIMARY KEY (id),
  CONSTRAINT "platform_role_permissions_role_id_permission_id_key" UNIQUE (role_id, permission_id),
  CONSTRAINT "platform_role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.platform_roles(id) ON DELETE CASCADE
);

ALTER TABLE "public"."platform_role_permissions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_platform_role_permissions_perm ON public.platform_role_permissions USING btree (permission_id);

CREATE INDEX idx_platform_role_permissions_role ON public.platform_role_permissions USING btree (role_id);

CREATE POLICY "platform_role_perms_select" ON "public"."platform_role_permissions"
  FOR SELECT
  TO "authenticated"
  USING ((public.has_platform_permission('platform_role.view'::text) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."platform_role_permissions" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_role_permissions" TO "postgres", "service_role";


-- Table: platform_roles
CREATE TABLE "public"."platform_roles" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"           text                     NOT NULL,
  "description"    text,
  "is_system_role" boolean                  NOT NULL DEFAULT false,
  "created_by"     uuid,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "platform_roles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "platform_roles_name_key" UNIQUE (name),
  CONSTRAINT "platform_roles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."platform_roles"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_roles_select" ON "public"."platform_roles"
  FOR SELECT
  TO "authenticated"
  USING ((public.has_platform_permission('platform_role.view'::text) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."platform_roles" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_roles" TO "postgres", "service_role";


-- Table: platform_user_roles
CREATE TABLE "public"."platform_user_roles" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "role_id"    uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "platform_user_roles_pkey" PRIMARY KEY (id),
  CONSTRAINT "platform_user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.platform_roles(id) ON DELETE CASCADE,
  CONSTRAINT "platform_user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "platform_user_roles_user_id_role_id_key" UNIQUE (user_id, role_id)
);

ALTER TABLE "public"."platform_user_roles"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_platform_user_roles_user ON public.platform_user_roles USING btree (user_id);

CREATE POLICY "platform_user_roles_select" ON "public"."platform_user_roles"
  FOR SELECT
  TO "authenticated"
  USING ((((user_id)::text = (auth.uid())::text) OR public.has_platform_permission('user.view'::text) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."platform_user_roles" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."platform_user_roles" TO "postgres", "service_role";


-- Table: profiles
CREATE TABLE "public"."profiles" (
  "id"         uuid                     NOT NULL,
  "full_name"  text,
  "phone"      text,
  "avatar_url" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "public_id"  text                     NOT NULL,
  CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_profiles_id ON public.profiles USING btree (id);

CREATE UNIQUE INDEX uq_profiles_public_id ON public.profiles USING btree (public_id);

CREATE TRIGGER trg_profiles_set_public_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_profiles_set_public_id();

CREATE POLICY "Public profiles are viewable by authenticated" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Users can insert own profile" ON "public"."profiles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "profiles_select_admin" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "profiles_select_own" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((auth.uid() = id));

CREATE POLICY "profiles_update_own" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."profiles" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres", "service_role";

COMMENT ON COLUMN "public"."profiles"."avatar_url" IS 'URL or seed reference for user avatar image. Defaults to deterministic DiceBear avatar if NULL.';


-- Table: properties
CREATE TABLE "public"."properties" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id"      uuid                     NOT NULL,
  "owner_id"          uuid                     NOT NULL,
  "name"              text                     NOT NULL,
  "property_type"     text,
  "status"            text                     NOT NULL DEFAULT 'active'::text,
  "address_line_1"    text                     NOT NULL,
  "address_line_2"    text,
  "city"              text                     NOT NULL,
  "state"             text                     NOT NULL,
  "postal_code"       text                     NOT NULL,
  "country"           text                     NOT NULL DEFAULT 'Australia'::text,
  "latitude"          numeric(10,8),
  "longitude"         numeric(11,8),
  "description"       text,
  "image_url"         text,
  "bedrooms"          integer,
  "bathrooms"         numeric(3,1),
  "parking_spaces"    integer,
  "square_feet"       numeric(10,2),
  "purchase_price"    numeric(12,2),
  "purchase_date"     date,
  "notes"             text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "property_category" text,
  "rent_amount"       numeric(10,2),
  "payment_frequency" text                     DEFAULT 'Weekly'::text,
  "property_id"       text,
  "suburb"            text,
  "postcode"          text,
  "car_spaces"        integer                  DEFAULT 0,
  "tenant_name"       text,
  "tenant_email"      text,
  "lease_start"       date,
  "lease_duration"    text,
  "deleted_at"        timestamp with time zone,
  CONSTRAINT "properties_bathrooms_check" CHECK ((bathrooms >= (0)::numeric)),
  CONSTRAINT "properties_bedrooms_check" CHECK ((bedrooms >= 0)),
  CONSTRAINT "properties_car_spaces_check" CHECK ((car_spaces >= 0)),
  CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT "properties_parking_spaces_check" CHECK ((parking_spaces >= 0)),
  CONSTRAINT "properties_pkey" PRIMARY KEY (id),
  CONSTRAINT "properties_property_category_check" CHECK ((property_category = ANY (ARRAY['Residential'::text, 'Commercial'::text]))),
  CONSTRAINT "properties_purchase_price_check" CHECK ((purchase_price >= (0)::numeric)),
  CONSTRAINT "properties_rent_amount_check" CHECK ((rent_amount >= (0)::numeric)),
  CONSTRAINT "properties_square_feet_check" CHECK ((square_feet >= (0)::numeric)),
  CONSTRAINT "properties_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text, 'maintenance'::text]))),
  CONSTRAINT "uq_properties_id_workspace" UNIQUE (id, workspace_id),
  CONSTRAINT "properties_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."properties"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_properties_owner_id ON public.properties USING btree (owner_id);

CREATE INDEX idx_properties_status ON public.properties USING btree (status);

CREATE INDEX idx_properties_workspace_created ON public.properties USING btree (workspace_id, created_at DESC);

CREATE INDEX idx_properties_workspace_id ON public.properties USING btree (workspace_id);

CREATE INDEX idx_properties_workspace_status ON public.properties USING btree (workspace_id, status);

CREATE TRIGGER trg_property_owner_in_workspace
  BEFORE INSERT OR UPDATE OF workspace_id, owner_id ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_property_owner_in_workspace();

CREATE TRIGGER trg_sync_property_workspace_team_access
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_property_workspace_team_access();

CREATE POLICY "prop_delete" ON "public"."properties"
  FOR DELETE
  TO "authenticated"
  USING ((public.owns_property(id) OR public.is_platform_admin()));

CREATE POLICY "prop_insert" ON "public"."properties"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((((owner_id)::text = (( SELECT auth.uid() AS uid))::text) AND public.user_owns_or_member_workspace(workspace_id)));

CREATE POLICY "prop_select" ON "public"."properties"
  FOR SELECT
  TO "authenticated"
  USING ((public.can_access_property(id) OR (id IN ( SELECT tenants.property_id
   FROM public.tenants
  WHERE ((tenants.user_id)::text = (auth.uid())::text))) OR public.is_platform_admin()));

CREATE POLICY "prop_update" ON "public"."properties"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(id, 'property.update'::text))
  WITH CHECK (public.can_write_property(id, 'property.update'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."properties" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."properties" TO "postgres", "service_role";

COMMENT ON COLUMN "public"."properties"."car_spaces" IS 'Car parking spaces';

COMMENT ON COLUMN "public"."properties"."payment_frequency" IS 'Rent payment frequency: Weekly, Fortnightly, or Monthly';

COMMENT ON COLUMN "public"."properties"."property_category" IS 'Property category: Residential or Commercial';

COMMENT ON COLUMN "public"."properties"."property_id" IS 'Custom identifier string e.g. PL-1024';

COMMENT ON COLUMN "public"."properties"."rent_amount" IS 'Advertised rent amount';


-- Table: property_members
CREATE TABLE "public"."property_members" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id" uuid                     NOT NULL,
  "user_id"     uuid                     NOT NULL,
  "role"        text                     NOT NULL DEFAULT 'viewer'::text,
  "status"      text                     NOT NULL DEFAULT 'invited'::text,
  "invited_by"  uuid,
  "joined_at"   timestamp with time zone,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "property_members_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "property_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "property_members_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "property_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text, 'agent'::text, 'staff'::text, 'viewer'::text]))),
  CONSTRAINT "property_members_status_check" CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text, 'removed'::text]))),
  CONSTRAINT "property_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "uq_property_members_prop_user" UNIQUE (property_id, user_id)
);

ALTER TABLE "public"."property_members"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_property_members_prop_id ON public.property_members USING btree (property_id);

CREATE INDEX idx_property_members_status ON public.property_members USING btree (status);

CREATE INDEX idx_property_members_user_id ON public.property_members USING btree (user_id);

CREATE POLICY "pm_delete" ON "public"."property_members"
  FOR DELETE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'team.manage_members'::text));

CREATE POLICY "pm_insert" ON "public"."property_members"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.is_platform_admin() OR public.owns_property(property_id) OR public.can_write_property(property_id, 'team.manage_members'::text) OR (EXISTS ( SELECT 1
   FROM public.properties p
  WHERE (((p.id)::text = p.property_id) AND ((p.owner_id)::text = (( SELECT auth.uid() AS uid))::text))))));

CREATE POLICY "pm_select" ON "public"."property_members"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR public.owns_property(property_id) OR public.has_property_permission(property_id, 'team.view'::text) OR public.is_platform_admin()));

CREATE POLICY "pm_update" ON "public"."property_members"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'team.manage_members'::text))
  WITH CHECK (public.can_write_property(property_id, 'team.manage_members'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."property_members" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_members" TO "postgres", "service_role";


-- Table: subscription_events
CREATE TABLE "public"."subscription_events" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_id"        uuid,
  "provider"          text                     NOT NULL DEFAULT 'stripe'::text,
  "provider_event_id" text                     NOT NULL,
  "event_type"        text                     NOT NULL,
  "payload"           jsonb                    NOT NULL,
  "status"            text                     NOT NULL DEFAULT 'processed'::text,
  "processed_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_events_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.account_context(user_id) ON DELETE SET NULL,
  CONSTRAINT "subscription_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "subscription_events_provider_event_id_key" UNIQUE (provider_event_id),
  CONSTRAINT "subscription_events_status_check" CHECK ((status = ANY (ARRAY['received'::text, 'processed'::text, 'failed'::text])))
);

ALTER TABLE "public"."subscription_events"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscription_events_account_id ON public.subscription_events USING btree (account_id);

CREATE INDEX idx_subscription_events_created_at ON public.subscription_events USING btree (created_at DESC);

CREATE INDEX idx_subscription_events_event_id ON public.subscription_events USING btree (provider_event_id);

CREATE POLICY "sub_events_admin" ON "public"."subscription_events"
  FOR SELECT
  TO "authenticated"
  USING (public.is_platform_admin());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."subscription_events" TO "postgres", "service_role";


-- Table: subscription_payments
CREATE TABLE "public"."subscription_payments" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "subscription_id"  uuid                     NOT NULL,
  "account_id"       uuid                     NOT NULL,
  "reference"        text                     NOT NULL,
  "expected_amount"  numeric(10,2)            NOT NULL,
  "submitted_amount" numeric(10,2),
  "currency"         text                     NOT NULL DEFAULT 'AUD'::text,
  "payment_date"     date,
  "transaction_id"   text,
  "status"           text                     NOT NULL DEFAULT 'pending'::text,
  "submitted_at"     timestamp with time zone,
  "verified_at"      timestamp with time zone,
  "verified_by"      uuid,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_payments_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.account_context(user_id) ON DELETE CASCADE,
  CONSTRAINT "subscription_payments_pkey" PRIMARY KEY (id),
  CONSTRAINT "subscription_payments_reference_key" UNIQUE (reference),
  CONSTRAINT "subscription_payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'under_review'::text, 'verified'::text, 'rejected'::text]))),
  CONSTRAINT "subscription_payments_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES auth.users(id),
  CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  CONSTRAINT "fk_subscription_payments_sub_account" FOREIGN KEY (subscription_id, account_id) REFERENCES public.subscriptions(id, account_id) ON DELETE CASCADE
);

ALTER TABLE "public"."subscription_payments"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscription_payments_account_id ON public.subscription_payments USING btree (account_id);

CREATE INDEX idx_subscription_payments_reference ON public.subscription_payments USING btree (reference);

CREATE INDEX idx_subscription_payments_status ON public.subscription_payments USING btree (status);

CREATE INDEX idx_subscription_payments_subscription_id ON public.subscription_payments USING btree (subscription_id);

CREATE TRIGGER trg_protect_subscription_payments
  BEFORE DELETE OR UPDATE ON public.subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_subscription_payment_client();

CREATE POLICY "subpay_admin_ins" ON "public"."subscription_payments"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "subpay_admin_upd" ON "public"."subscription_payments"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "subpay_select_own" ON "public"."subscription_payments"
  FOR SELECT
  TO "authenticated"
  USING (((auth.uid() = account_id) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."subscription_payments" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."subscription_payments" TO "postgres", "service_role";


-- Table: subscription_plans
CREATE TABLE "public"."subscription_plans" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"              text                     NOT NULL,
  "slug"              text                     NOT NULL,
  "description"       text,
  "status"            text                     NOT NULL DEFAULT 'active'::text,
  "display_order"     integer                  NOT NULL DEFAULT 0,
  "price_cents"       integer                  NOT NULL DEFAULT 0,
  "billing_interval"  text                     NOT NULL DEFAULT 'monthly'::text,
  "provider_price_id" text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_plans_billing_interval_check" CHECK ((billing_interval = ANY (ARRAY['monthly'::text, 'yearly'::text]))),
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY (id),
  CONSTRAINT "subscription_plans_slug_key" UNIQUE (slug),
  CONSTRAINT "subscription_plans_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);

ALTER TABLE "public"."subscription_plans"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscription_plans_slug ON public.subscription_plans USING btree (slug);

CREATE INDEX idx_subscription_plans_status ON public.subscription_plans USING btree (status);

CREATE POLICY "plans_admin_del" ON "public"."subscription_plans"
  FOR DELETE
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "plans_admin_ins" ON "public"."subscription_plans"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "plans_admin_upd" ON "public"."subscription_plans"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "plans_select_active" ON "public"."subscription_plans"
  FOR SELECT
  TO "authenticated"
  USING (((status = 'active'::text) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."subscription_plans" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."subscription_plans" TO "postgres", "service_role";


-- Table: subscriptions
CREATE TABLE "public"."subscriptions" (
  "id"                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_id"               uuid                     NOT NULL,
  "plan_id"                  uuid                     NOT NULL,
  "status"                   text                     NOT NULL DEFAULT 'active'::text,
  "current_period_start"     timestamp with time zone,
  "current_period_end"       timestamp with time zone,
  "cancel_at_period_end"     boolean                  NOT NULL DEFAULT false,
  "canceled_at"              timestamp with time zone,
  "trial_start"              timestamp with time zone,
  "trial_end"                timestamp with time zone,
  "provider"                 text                     DEFAULT 'stripe'::text,
  "provider_customer_id"     text,
  "provider_subscription_id" text,
  "created_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"               timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "subscriptions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.account_context(user_id) ON DELETE CASCADE,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY (id),
  CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  CONSTRAINT "subscriptions_status_check"
    CHECK
    ((status = ANY (ARRAY['draft'::text, 'pending_payment'::text, 'under_review'::text, 'trialing'::text, 'active'::text, 'past_due'::text, 'paused'::text, 'canceled'::text,
    'expired'::text]))),
  CONSTRAINT "uq_subscriptions_id_account" UNIQUE (id, account_id)
);

ALTER TABLE "public"."subscriptions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_subscriptions_account_id ON public.subscriptions USING btree (account_id);

CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions USING btree (plan_id);

CREATE INDEX idx_subscriptions_provider_sub_id ON public.subscriptions USING btree (provider_subscription_id);

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);

CREATE UNIQUE INDEX uq_subscriptions_one_checkout_current ON public.subscriptions USING btree (account_id)
  WHERE (status = ANY (ARRAY['pending_payment'::text, 'under_review'::text]));

CREATE UNIQUE INDEX uq_subscriptions_one_entitlement_current ON public.subscriptions USING btree (account_id)
  WHERE (status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'paused'::text]));

CREATE TRIGGER trg_ensure_single_current_subscription
  BEFORE INSERT OR UPDATE OF status ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_current_subscription();

CREATE POLICY "subs_admin_del" ON "public"."subscriptions"
  FOR DELETE
  TO "authenticated"
  USING (public.is_platform_admin());

CREATE POLICY "subs_admin_ins" ON "public"."subscriptions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "subs_admin_upd" ON "public"."subscriptions"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "subs_select_own" ON "public"."subscriptions"
  FOR SELECT
  TO "authenticated"
  USING (((auth.uid() = account_id) OR public.is_platform_admin()));

GRANT SELECT ON TABLE "public"."subscriptions" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."subscriptions" TO "postgres", "service_role";


-- Table: tasks
CREATE TABLE "public"."tasks" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"  uuid                     NOT NULL,
  "assigned_to"  uuid,
  "created_by"   uuid,
  "title"        text                     NOT NULL,
  "description"  text,
  "priority"     text                     NOT NULL DEFAULT 'medium'::text,
  "status"       text                     NOT NULL DEFAULT 'pending'::text,
  "due_date"     date,
  "completed_at" timestamp with time zone,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "tasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "tasks_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
  CONSTRAINT "tasks_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "tasks_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);

ALTER TABLE "public"."tasks"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);

CREATE INDEX idx_tasks_property_id ON public.tasks USING btree (property_id);

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);

CREATE TRIGGER trg_protect_tasks_property
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_child_property_id();

CREATE POLICY "task_delete" ON "public"."tasks"
  FOR DELETE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'task.create'::text));

CREATE POLICY "task_insert" ON "public"."tasks"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.can_write_property(property_id, 'task.create'::text));

CREATE POLICY "task_select" ON "public"."tasks"
  FOR SELECT
  TO "authenticated"
  USING ((public.can_access_property(property_id) OR (assigned_to = auth.uid()) OR (created_by = auth.uid()) OR public.is_platform_admin()));

CREATE POLICY "task_update" ON "public"."tasks"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'task.create'::text))
  WITH CHECK (public.can_write_property(property_id, 'task.create'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."tasks" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tasks" TO "postgres", "service_role";


-- Table: team_role_permissions
CREATE TABLE "public"."team_role_permissions" (
  "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
  "role_id"       uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  CONSTRAINT "team_role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE,
  CONSTRAINT "team_role_permissions_pkey" PRIMARY KEY (id),
  CONSTRAINT "team_role_permissions_role_id_permission_id_key" UNIQUE (role_id, permission_id),
  CONSTRAINT "team_role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.team_roles(id) ON DELETE CASCADE
);

ALTER TABLE "public"."team_role_permissions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_team_role_permissions_perm ON public.team_role_permissions USING btree (permission_id);

CREATE INDEX idx_team_role_permissions_role ON public.team_role_permissions USING btree (role_id);

CREATE POLICY "team_role_perms_select" ON "public"."team_role_permissions"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.team_roles tr
  WHERE ((tr.id = team_role_permissions.role_id) AND ((tr.workspace_id IS NULL) OR public.can_access_workspace(tr.workspace_id))))));

GRANT SELECT ON TABLE "public"."team_role_permissions" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."team_role_permissions" TO "postgres", "service_role";


-- Table: team_roles
CREATE TABLE "public"."team_roles" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id"   uuid,
  "name"           text                     NOT NULL,
  "description"    text,
  "is_system_role" boolean                  NOT NULL DEFAULT false,
  "created_by"     uuid,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "chk_team_role_scope" CHECK ((((is_system_role = true) AND (workspace_id IS NULL)) OR ((is_system_role = false) AND (workspace_id IS NOT NULL)))),
  CONSTRAINT "team_roles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "team_roles_pkey" PRIMARY KEY (id),
  CONSTRAINT "team_roles_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."team_roles"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_team_roles_workspace_id ON public.team_roles USING btree (workspace_id);

CREATE UNIQUE INDEX uq_team_roles_system_name ON public.team_roles USING btree (lower(name))
  WHERE (workspace_id IS NULL);

CREATE UNIQUE INDEX uq_team_roles_workspace_name ON public.team_roles USING btree (workspace_id, lower(name))
  WHERE (workspace_id IS NOT NULL);

CREATE POLICY "team_roles_select" ON "public"."team_roles"
  FOR SELECT
  TO "authenticated"
  USING (((workspace_id IS NULL) OR public.can_access_workspace(workspace_id) OR public.has_platform_permission('team_role.view'::text)));

GRANT SELECT ON TABLE "public"."team_roles" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."team_roles" TO "postgres", "service_role";


-- Table: tenants
CREATE TABLE "public"."tenants" (
  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"             uuid                     NOT NULL,
  "user_id"                 uuid,
  "first_name"              text                     NOT NULL,
  "last_name"               text                     NOT NULL,
  "email"                   text                     NOT NULL,
  "phone"                   text,
  "status"                  text                     NOT NULL DEFAULT 'active'::text,
  "date_of_birth"           date,
  "emergency_contact_name"  text,
  "emergency_contact_phone" text,
  "notes"                   text,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tenants_pkey" PRIMARY KEY (id),
  CONSTRAINT "tenants_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "tenants_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text, 'prospect'::text]))),
  CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "uq_tenants_id_property" UNIQUE (id, property_id)
);

ALTER TABLE "public"."tenants"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tenants_email ON public.tenants USING btree (email);

CREATE INDEX idx_tenants_property_created_at ON public.tenants USING btree (property_id, created_at DESC);

CREATE INDEX idx_tenants_property_id ON public.tenants USING btree (property_id);

CREATE INDEX idx_tenants_property_status ON public.tenants USING btree (property_id, status);

CREATE INDEX idx_tenants_status ON public.tenants USING btree (status);

CREATE INDEX idx_tenants_user_id ON public.tenants USING btree (user_id);

CREATE TRIGGER trg_protect_tenants_property
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_child_property_id();

CREATE POLICY "tenants_delete" ON "public"."tenants"
  FOR DELETE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'tenant.update'::text));

CREATE POLICY "tenants_insert" ON "public"."tenants"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.can_write_property(property_id, 'tenant.update'::text));

CREATE POLICY "tenants_select" ON "public"."tenants"
  FOR SELECT
  TO "authenticated"
  USING ((public.can_access_property(property_id) OR (user_id = auth.uid()) OR public.is_platform_admin()));

CREATE POLICY "tenants_update" ON "public"."tenants"
  FOR UPDATE
  TO "authenticated"
  USING (public.can_write_property(property_id, 'tenant.update'::text))
  WITH CHECK (public.can_write_property(property_id, 'tenant.update'::text));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."tenants" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tenants" TO "postgres", "service_role";


-- Table: transactions
CREATE TABLE "public"."transactions" (
  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "amount"                  numeric(12,4)            NOT NULL,
  "transaction_type"        text                     NOT NULL,
  "transaction_category_id" uuid                     NOT NULL,
  "transaction_date"        date                     NOT NULL DEFAULT CURRENT_DATE,
  "payment_method"          text,
  "description"             text,
  "reference"               text,
  "vendor_name"             text,
  "notes"                   text,
  "status"                  text                     NOT NULL DEFAULT 'completed'::text,
  "tenant_id"               uuid,
  "lease_id"                uuid,
  "invoice_id"              uuid,
  "property_id"             uuid                     NOT NULL,
  "workspace_id"            uuid                     NOT NULL,
  "created_by"              uuid,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "fk_transactions_category_type" FOREIGN KEY (transaction_category_id, transaction_type) REFERENCES public.categories(id, transaction_type) ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT "transactions_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "transactions_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL,
  CONSTRAINT "transactions_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL,
  CONSTRAINT "transactions_pkey" PRIMARY KEY (id),
  CONSTRAINT "transactions_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "transactions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'reversed'::text, 'refunded'::text]))),
  CONSTRAINT "transactions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL,
  CONSTRAINT "transactions_transaction_type_check" CHECK ((transaction_type = ANY (ARRAY['income'::text, 'expense'::text]))),
  CONSTRAINT "transactions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."transactions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_transactions_category ON public.transactions USING btree (transaction_category_id);

CREATE INDEX idx_transactions_invoice ON public.transactions USING btree (invoice_id)
  WHERE (invoice_id IS NOT NULL);

CREATE INDEX idx_transactions_lease ON public.transactions USING btree (lease_id)
  WHERE (lease_id IS NOT NULL);

CREATE INDEX idx_transactions_property_date ON public.transactions USING btree (property_id, transaction_date DESC);

CREATE INDEX idx_transactions_tenant ON public.transactions USING btree (tenant_id)
  WHERE (tenant_id IS NOT NULL);

CREATE INDEX idx_transactions_type_status ON public.transactions USING btree (transaction_type, status);

CREATE INDEX idx_transactions_workspace_date ON public.transactions USING btree (workspace_id, transaction_date DESC);

CREATE POLICY "Users can delete transactions for authorized properties" ON "public"."transactions"
  FOR DELETE
  TO "authenticated"
  USING ((public.can_access_workspace(workspace_id) AND public.can_write_property(property_id, 'financial.manage'::text)));

CREATE POLICY "Users can insert transactions for authorized properties" ON "public"."transactions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.can_access_workspace(workspace_id) AND public.can_write_property(property_id, 'financial.manage'::text)));

CREATE POLICY "Users can read transactions for authorized properties" ON "public"."transactions"
  FOR SELECT
  TO "authenticated"
  USING (((public.can_access_workspace(workspace_id) AND public.can_access_property(property_id)) OR (tenant_id IN ( SELECT t.id
   FROM public.tenants t
  WHERE (t.user_id = auth.uid()))) OR public.is_platform_admin()));

CREATE POLICY "Users can update transactions for authorized properties" ON "public"."transactions"
  FOR UPDATE
  TO "authenticated"
  USING ((public.can_access_workspace(workspace_id) AND public.can_write_property(property_id, 'financial.manage'::text)))
  WITH CHECK ((public.can_access_workspace(workspace_id) AND public.can_write_property(property_id, 'financial.manage'::text)));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."transactions" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transactions" TO "postgres", "service_role";


-- Table: workspace_invitations
CREATE TABLE "public"."workspace_invitations" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid                     NOT NULL,
  "invited_by"   uuid                     NOT NULL,
  "email"        text,
  "profile_id"   uuid,
  "role_id"      uuid                     NOT NULL,
  "token_hash"   text,
  "invite_type"  text                     NOT NULL,
  "status"       text                     NOT NULL DEFAULT 'pending'::text,
  "expires_at"   timestamp with time zone NOT NULL,
  "accepted_at"  timestamp with time zone,
  "accepted_by"  uuid,
  "revoked_at"   timestamp with time zone,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "workspace_invitations_accepted_by_fkey" FOREIGN KEY (accepted_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "workspace_invitations_invite_type_check" CHECK ((invite_type = ANY (ARRAY['LINK'::text, 'DIRECT_PROFILE'::text, 'EMAIL'::text]))),
  CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY (id),
  CONSTRAINT "workspace_invitations_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "workspace_invitations_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.team_roles(id) ON DELETE RESTRICT,
  CONSTRAINT "workspace_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'revoked'::text]))),
  CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."workspace_invitations"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_workspace_invitations_expires ON public.workspace_invitations USING btree (expires_at);

CREATE INDEX idx_workspace_invitations_status ON public.workspace_invitations USING btree (status);

CREATE INDEX idx_workspace_invitations_workspace ON public.workspace_invitations USING btree (workspace_id);

CREATE UNIQUE INDEX uq_workspace_invitations_token_hash ON public.workspace_invitations USING btree (token_hash)
  WHERE (token_hash IS NOT NULL);

CREATE POLICY "workspace_invitations_deny" ON "public"."workspace_invitations"
  FOR ALL
  TO "authenticated"
  USING (false);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."workspace_invitations" TO "postgres", "service_role";


-- Table: workspace_members
CREATE TABLE "public"."workspace_members" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid                     NOT NULL,
  "user_id"      uuid                     NOT NULL,
  "role"         text                     NOT NULL DEFAULT 'viewer'::text,
  "status"       text                     NOT NULL DEFAULT 'invited'::text,
  "invited_by"   uuid,
  "joined_at"    timestamp with time zone,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "role_id"      uuid,
  CONSTRAINT "uq_workspace_members_ws_user" UNIQUE (workspace_id, user_id),
  CONSTRAINT "workspace_members_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "workspace_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "workspace_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'agent'::text, 'staff'::text, 'viewer'::text]))),
  CONSTRAINT "workspace_members_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.team_roles(id) ON DELETE RESTRICT,
  CONSTRAINT "workspace_members_status_check" CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text, 'removed'::text]))),
  CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

ALTER TABLE "public"."workspace_members"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_workspace_members_role_id ON public.workspace_members USING btree (role_id);

CREATE INDEX idx_workspace_members_status ON public.workspace_members USING btree (status);

CREATE INDEX idx_workspace_members_user_id ON public.workspace_members USING btree (user_id);

CREATE INDEX idx_workspace_members_ws_id ON public.workspace_members USING btree (workspace_id);

CREATE TRIGGER trg_sync_workspace_member_role_text
  BEFORE INSERT OR UPDATE OF role_id ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_workspace_member_role_text();

CREATE POLICY "wsm_delete" ON "public"."workspace_members"
  FOR DELETE
  TO "authenticated"
  USING ((public.has_workspace_permission(workspace_id, 'team.member.remove'::text) OR (EXISTS ( SELECT 1
   FROM public.workspaces w
  WHERE ((w.id = workspace_members.workspace_id) AND ((w.owner_id)::text = (auth.uid())::text))))));

CREATE POLICY "wsm_insert" ON "public"."workspace_members"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (false);

CREATE POLICY "wsm_select" ON "public"."workspace_members"
  FOR SELECT
  TO "authenticated"
  USING ((((user_id)::text = (auth.uid())::text) OR public.has_workspace_permission(workspace_id, 'team.member.view'::text) OR (EXISTS ( SELECT 1
   FROM public.workspaces w
  WHERE ((w.id = workspace_members.workspace_id) AND ((w.owner_id)::text = (auth.uid())::text)))) OR public.has_platform_permission('team.data.view'::text)));

CREATE POLICY "wsm_update" ON "public"."workspace_members"
  FOR UPDATE
  TO "authenticated"
  USING ((public.has_workspace_permission(workspace_id, 'team.member.update'::text) OR (EXISTS ( SELECT 1
   FROM public.workspaces w
  WHERE ((w.id = workspace_members.workspace_id) AND ((w.owner_id)::text = (auth.uid())::text))))))
  WITH CHECK ((public.has_workspace_permission(workspace_id, 'team.member.update'::text) OR (EXISTS ( SELECT 1
   FROM public.workspaces w
  WHERE ((w.id = workspace_members.workspace_id) AND ((w.owner_id)::text = (auth.uid())::text))))));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."workspace_members" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."workspace_members" TO "postgres", "service_role";


-- Table: workspaces
CREATE TABLE "public"."workspaces" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "slug"       text                     NOT NULL,
  "owner_id"   uuid                     NOT NULL,
  "status"     text                     NOT NULL DEFAULT 'active'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "avatar_url" text,
  CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY (id),
  CONSTRAINT "workspaces_slug_key" UNIQUE (slug),
  CONSTRAINT "workspaces_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text, 'suspended'::text])))
);

ALTER TABLE "public"."workspaces"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_workspaces_owner_id ON public.workspaces USING btree (owner_id);

CREATE INDEX idx_workspaces_slug ON public.workspaces USING btree (slug);

CREATE TRIGGER trg_workspaces_ensure_owner_membership
  AFTER INSERT OR UPDATE OF owner_id ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_workspaces_ensure_owner_membership();

CREATE POLICY "ws_insert" ON "public"."workspaces"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "ws_select" ON "public"."workspaces"
  FOR SELECT
  TO "authenticated"
  USING (((owner_id = auth.uid()) OR public.can_access_workspace(id) OR public.is_platform_admin()));

CREATE POLICY "ws_update" ON "public"."workspaces"
  FOR UPDATE
  TO "authenticated"
  USING (((owner_id = auth.uid()) OR public.is_platform_admin()))
  WITH CHECK (((owner_id = auth.uid()) OR public.is_platform_admin()));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."workspaces" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."workspaces" TO "postgres", "service_role";

COMMENT ON COLUMN "public"."workspaces"."avatar_url" IS 'Custom avatar or logo URL for organization/workspace branding. Defaults to deterministic DiceBear avatar if NULL.';


-- ====================================================================
-- STORAGE POLICIES & OBJECTS
-- ====================================================================

-- Storage Table/Policy: objects
CREATE POLICY "Allow authenticated users to read invoice documents" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING ((bucket_id = 'invoice-documents'::text));

CREATE POLICY "Allow service role full access to invoice documents" ON "storage"."objects"
  FOR ALL
  TO "service_role"
  USING ((bucket_id = 'invoice-documents'::text))
  WITH CHECK ((bucket_id = 'invoice-documents'::text));

CREATE POLICY "Allow users to upload receipts to their folder" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'payment-receipts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Avatar images are publicly accessible" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'profile-photos'::text));

CREATE POLICY "Users can delete their own avatar" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can update their own avatar" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Users can upload their own avatar" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'profile-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "payment_proofs_upload" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((bucket_id = 'payment-proofs'::text));

CREATE POLICY "receipts_delete_own" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'payment-receipts'::text) AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name)))));

CREATE POLICY "receipts_insert_own" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'payment-receipts'::text) AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name)))));

CREATE POLICY "receipts_select_own" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'payment-receipts'::text) AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name)))));

CREATE POLICY "receipts_service" ON "storage"."objects"
  FOR ALL
  TO "service_role"
  USING ((bucket_id = 'payment-receipts'::text))
  WITH CHECK ((bucket_id = 'payment-receipts'::text));

CREATE POLICY "receipts_update_own" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'payment-receipts'::text) AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name)))))
  WITH CHECK (((bucket_id = 'payment-receipts'::text) AND (public.is_platform_admin() OR public.owns_subscription_payment(public.payment_id_from_storage_path(name)))));

-- ====================================================================
-- PropertyLedge Condition Reports & Inspection System
-- Migration: 20260929000000_condition_reports.sql
-- ====================================================================

-- 1. Main Condition Reports Table
CREATE INDEX IF NOT EXISTS idx_condition_reports_workspace_id ON public.condition_reports (workspace_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_property_id ON public.condition_reports (property_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_lease_id ON public.condition_reports (lease_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_baseline_report_id ON public.condition_reports (baseline_report_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_status ON public.condition_reports (status);
CREATE INDEX IF NOT EXISTS idx_condition_reports_inspection_date ON public.condition_reports (inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_rooms_report_id ON public.inspection_rooms (report_id, room_order);
CREATE INDEX IF NOT EXISTS idx_inspection_items_room_id ON public.inspection_items (room_id);
CREATE INDEX IF NOT EXISTS idx_inspection_defects_room_id ON public.inspection_defects (room_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_room_id ON public.inspection_photos (room_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_defect_id ON public.inspection_photos (defect_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_item_id ON public.inspection_photos (item_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "cr_select" ON public.condition_reports;
DROP POLICY IF EXISTS "cr_insert" ON public.condition_reports;
DROP POLICY IF EXISTS "cr_update" ON public.condition_reports;
DROP POLICY IF EXISTS "cr_delete" ON public.condition_reports;

DROP POLICY IF EXISTS "ir_select" ON public.inspection_rooms;
DROP POLICY IF EXISTS "ir_insert" ON public.inspection_rooms;
DROP POLICY IF EXISTS "ir_update" ON public.inspection_rooms;
DROP POLICY IF EXISTS "ir_delete" ON public.inspection_rooms;

DROP POLICY IF EXISTS "ii_select" ON public.inspection_items;
DROP POLICY IF EXISTS "ii_insert" ON public.inspection_items;
DROP POLICY IF EXISTS "ii_update" ON public.inspection_items;
DROP POLICY IF EXISTS "ii_delete" ON public.inspection_items;

DROP POLICY IF EXISTS "id_select" ON public.inspection_defects;
DROP POLICY IF EXISTS "id_insert" ON public.inspection_defects;
DROP POLICY IF EXISTS "id_update" ON public.inspection_defects;
DROP POLICY IF EXISTS "id_delete" ON public.inspection_defects;

DROP POLICY IF EXISTS "ip_select" ON public.inspection_photos;
DROP POLICY IF EXISTS "ip_insert" ON public.inspection_photos;
DROP POLICY IF EXISTS "ip_update" ON public.inspection_photos;
DROP POLICY IF EXISTS "ip_delete" ON public.inspection_photos;

-- Condition Reports RLS Policies
CREATE POLICY "cr_select" ON public.condition_reports
  FOR SELECT TO authenticated
  USING (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_access_property(property_id) OR
      public.is_platform_admin() OR
      EXISTS (SELECT 1 FROM public.tenants t WHERE t.user_id = auth.uid() AND t.property_id = condition_reports.property_id)
    )
  );

CREATE POLICY "cr_insert" ON public.condition_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_write_property(property_id, 'inspection.create'::text) OR
      public.can_write_property(property_id, 'property.update'::text) OR
      public.owns_property(property_id) OR
      public.is_platform_admin()
    )
  );

CREATE POLICY "cr_update" ON public.condition_reports
  FOR UPDATE TO authenticated
  USING (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_write_property(property_id, 'inspection.update'::text) OR
      public.can_write_property(property_id, 'property.update'::text) OR
      public.owns_property(property_id) OR
      public.is_platform_admin()
    )
  )
  WITH CHECK (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_write_property(property_id, 'inspection.update'::text) OR
      public.can_write_property(property_id, 'property.update'::text) OR
      public.owns_property(property_id) OR
      public.is_platform_admin()
    )
  );

CREATE POLICY "cr_delete" ON public.condition_reports
  FOR DELETE TO authenticated
  USING (
    public.user_owns_or_member_workspace(workspace_id) AND (
      public.can_write_property(property_id, 'inspection.delete'::text) OR
      public.can_write_property(property_id, 'property.update'::text) OR
      public.owns_property(property_id) OR
      public.is_platform_admin()
    )
  );

-- Inspection Rooms Policies
CREATE POLICY "ir_select" ON public.inspection_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr
      WHERE cr.id = inspection_rooms.report_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_access_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ir_insert" ON public.inspection_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr
      WHERE cr.id = inspection_rooms.report_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.create'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ir_update" ON public.inspection_rooms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr
      WHERE cr.id = inspection_rooms.report_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.update'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ir_delete" ON public.inspection_rooms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr
      WHERE cr.id = inspection_rooms.report_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.delete'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

-- Inspection Items Policies
CREATE POLICY "ii_select" ON public.inspection_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_items.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_access_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ii_insert" ON public.inspection_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_items.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.create'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ii_update" ON public.inspection_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_items.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.update'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ii_delete" ON public.inspection_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_items.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.delete'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

-- Inspection Defects Policies
CREATE POLICY "id_select" ON public.inspection_defects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_defects.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_access_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "id_insert" ON public.inspection_defects
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_defects.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.create'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "id_update" ON public.inspection_defects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_defects.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.update'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "id_delete" ON public.inspection_defects
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_defects.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.delete'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

-- Inspection Photos Policies
CREATE POLICY "ip_select" ON public.inspection_photos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_photos.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_access_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ip_insert" ON public.inspection_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_photos.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.create'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ip_update" ON public.inspection_photos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_photos.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.update'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

CREATE POLICY "ip_delete" ON public.inspection_photos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_rooms ir
      JOIN public.condition_reports cr ON cr.id = ir.report_id
      WHERE ir.id = inspection_photos.room_id
      AND public.user_owns_or_member_workspace(cr.workspace_id)
      AND (public.can_write_property(cr.property_id, 'inspection.delete'::text) OR public.owns_property(cr.property_id) OR public.is_platform_admin())
    )
  );

-- Service role & postgres permissions
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condition_reports TO authenticated, service_role, postgres;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.inspection_rooms TO authenticated, service_role, postgres;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.inspection_items TO authenticated, service_role, postgres;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.inspection_defects TO authenticated, service_role, postgres;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.inspection_photos TO authenticated, service_role, postgres;


-- ====================================================================
-- FINANCIAL SYSTEM & AUSTRALIAN TAX / GST (BAS)
-- ====================================================================

-- 1. category_groups table
ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view category groups"
    ON public.category_groups FOR SELECT TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY "Workspace managers can manage category groups"
    ON public.category_groups FOR ALL TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin())
    WITH CHECK (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

GRANT ALL ON public.category_groups TO authenticated, service_role;

-- 2. categories table
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view categories"
    ON public.categories FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Workspace managers can manage categories"
    ON public.categories FOR ALL TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

GRANT ALL ON public.categories TO authenticated, service_role;

-- 3. tax_classifications table
ALTER TABLE public.tax_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view tax classifications"
    ON public.tax_classifications FOR SELECT TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY "Workspace managers can manage tax classifications"
    ON public.tax_classifications FOR ALL TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin())
    WITH CHECK (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

GRANT ALL ON public.tax_classifications TO authenticated, service_role;

-- 4. transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_date ON public.transactions(workspace_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_property_date ON public.transactions(property_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_lease ON public.transactions(lease_id) WHERE lease_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON public.transactions(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(transaction_category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tax_classification ON public.transactions(tax_classification_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_blob ON public.transactions(receipt_blob_path) WHERE receipt_blob_path IS NOT NULL;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view transactions"
    ON public.transactions FOR SELECT TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY "Workspace members can manage transactions"
    ON public.transactions FOR ALL TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin())
    WITH CHECK (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

GRANT ALL ON public.transactions TO authenticated, service_role;

-- 5. expected_payment_schedule & allocations
CREATE INDEX IF NOT EXISTS idx_expected_schedule_workspace_due ON public.expected_payment_schedule (workspace_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_expected_schedule_property_due ON public.expected_payment_schedule (property_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_expected_schedule_lease ON public.expected_payment_schedule (lease_id) WHERE lease_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expected_schedule_status ON public.expected_payment_schedule (status);

ALTER TABLE public.expected_payment_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view expected schedules"
    ON public.expected_payment_schedule FOR SELECT TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY "Workspace members can manage expected schedules"
    ON public.expected_payment_schedule FOR ALL TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin())
    WITH CHECK (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

GRANT ALL ON public.expected_payment_schedule TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_allocations_transaction ON public.transaction_schedule_allocations (transaction_id);
CREATE INDEX IF NOT EXISTS idx_allocations_expected_payment ON public.transaction_schedule_allocations (expected_payment_id);

ALTER TABLE public.transaction_schedule_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view allocations"
    ON public.transaction_schedule_allocations FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_schedule_allocations.transaction_id
              AND (public.can_access_workspace(t.workspace_id) OR public.is_platform_admin())
        )
    );

CREATE POLICY "Workspace members can manage allocations"
    ON public.transaction_schedule_allocations FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_schedule_allocations.transaction_id
              AND (public.can_access_workspace(t.workspace_id) OR public.is_platform_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_schedule_allocations.transaction_id
              AND (public.can_access_workspace(t.workspace_id) OR public.is_platform_admin())
        )
    );

GRANT ALL ON public.transaction_schedule_allocations TO authenticated, service_role;

-- ====================================================================
-- TRANSACTION ATTACHMENTS (Multi-file Expense Receipts & Invoices)
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_transaction_attachments_tx ON public.transaction_attachments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_workspace ON public.transaction_attachments(workspace_id);

ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access can view transaction attachments"
    ON public.transaction_attachments FOR SELECT TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY "Workspace access can manage transaction attachments"
    ON public.transaction_attachments FOR ALL TO authenticated
    USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin())
    WITH CHECK (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

GRANT ALL ON public.transaction_attachments TO authenticated, service_role;

-- ====================================================================
-- DOCUMENTS SYSTEM (Agreements, Insurance, Compliance, Notices)
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_property_id ON public.documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_lease_id ON public.documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access can view documents"
  ON public.documents FOR SELECT TO authenticated
  USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY "Workspace access can insert documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.can_access_workspace(workspace_id)
      AND (
        property_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.properties p
          WHERE p.id = documents.property_id
            AND p.workspace_id = documents.workspace_id
        )
      )
    )
    OR public.is_platform_admin()
  );

CREATE POLICY "Workspace access can update documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (
    public.can_access_workspace(workspace_id)
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (
      public.can_access_workspace(workspace_id)
      AND (
        property_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.properties p
          WHERE p.id = documents.property_id
            AND p.workspace_id = documents.workspace_id
        )
      )
    )
    OR public.is_platform_admin()
  );

CREATE POLICY "Workspace access can delete documents"
  ON public.documents FOR DELETE TO authenticated
  USING (public.can_access_workspace(workspace_id) OR public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.set_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_documents_updated_at ON public.documents;
CREATE TRIGGER trigger_set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_documents_updated_at();

GRANT ALL ON public.documents TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';





