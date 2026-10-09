-- ====================================================================
-- CHUNK 02: CORE TABLE DEFINITIONS & FOREIGN KEY CONSTRAINTS
-- Step 2 of 9 — Run second in Supabase SQL Editor
-- (Tables created first, Foreign Keys added after all tables exist)
-- ====================================================================

-- SECTION A: CREATE ALL BASE TABLES
-- ====================================================================

-- CHUNK 02: CORE TABLE DEFINITIONS & CONSTRAINTS

-- Step 2 of 9 — Run second in Supabase SQL Editor

-- (All tables arranged in strict parent-to-child dependency order)

-- ====================================================================



-- --------------------------------------------------------------------

-- Table: public.workspaces

-- --------------------------------------------------------------------

CREATE TABLE "public"."workspaces" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "slug"       text                     NOT NULL,
  "owner_id"   uuid                     NOT NULL,
  "status"     text                     NOT NULL DEFAULT 'active'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "avatar_url" text,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY (id),
  CONSTRAINT "workspaces_slug_key" UNIQUE (slug),
  CONSTRAINT "workspaces_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text, 'suspended'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.profiles

-- --------------------------------------------------------------------

CREATE TABLE "public"."profiles" (
  "id"         uuid                     NOT NULL,
  "full_name"  text,
  "phone"      text,
  "avatar_url" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "public_id"  text                     NOT NULL,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);



-- --------------------------------------------------------------------

-- Table: public.platform_roles

-- --------------------------------------------------------------------

CREATE TABLE "public"."platform_roles" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"           text                     NOT NULL,
  "description"    text,
  "is_system_role" boolean                  NOT NULL DEFAULT false,
  "created_by"     uuid,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "platform_roles_name_key" UNIQUE (name),
  CONSTRAINT "platform_roles_pkey" PRIMARY KEY (id)
);



-- --------------------------------------------------------------------

-- Table: public.permissions

-- --------------------------------------------------------------------

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



-- --------------------------------------------------------------------

-- Table: public.platform_role_permissions

-- --------------------------------------------------------------------

CREATE TABLE "public"."platform_role_permissions" (
  "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
  "role_id"       uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  CONSTRAINT "platform_role_permissions_pkey" PRIMARY KEY (id),
  CONSTRAINT "platform_role_permissions_role_id_permission_id_key" UNIQUE (role_id, permission_id)
);



-- --------------------------------------------------------------------

-- Table: public.platform_admins

-- --------------------------------------------------------------------

CREATE TABLE "public"."platform_admins" (
  "user_id"    uuid                     NOT NULL,
  "status"     text                     NOT NULL DEFAULT 'active'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "notes"      text,
  CONSTRAINT "platform_admins_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "platform_admins_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.platform_user_roles

-- --------------------------------------------------------------------

CREATE TABLE "public"."platform_user_roles" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "role_id"    uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "platform_user_roles_pkey" PRIMARY KEY (id),
  CONSTRAINT "platform_user_roles_user_id_role_id_key" UNIQUE (user_id, role_id)
);



-- --------------------------------------------------------------------

-- Table: public.team_roles

-- --------------------------------------------------------------------

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
  CONSTRAINT "team_roles_pkey" PRIMARY KEY (id)
);



-- --------------------------------------------------------------------

-- Table: public.team_role_permissions

-- --------------------------------------------------------------------

CREATE TABLE "public"."team_role_permissions" (
  "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
  "role_id"       uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  CONSTRAINT "team_role_permissions_pkey" PRIMARY KEY (id),
  CONSTRAINT "team_role_permissions_role_id_permission_id_key" UNIQUE (role_id, permission_id)
);



-- --------------------------------------------------------------------

-- Table: public.entitlements

-- --------------------------------------------------------------------

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



-- --------------------------------------------------------------------

-- Table: public.subscription_plans

-- --------------------------------------------------------------------

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



-- --------------------------------------------------------------------

-- Table: public.subscriptions

-- --------------------------------------------------------------------

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
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY (id),
  CONSTRAINT "subscriptions_status_check"
    CHECK
    ((status = ANY (ARRAY['draft'::text, 'pending_payment'::text, 'under_review'::text, 'trialing'::text, 'active'::text, 'past_due'::text, 'paused'::text, 'canceled'::text,
    'expired'::text]))),
  CONSTRAINT "uq_subscriptions_id_account" UNIQUE (id, account_id)
);



-- --------------------------------------------------------------------

-- Table: public.plan_entitlements

-- --------------------------------------------------------------------

CREATE TABLE "public"."plan_entitlements" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "plan_id"        uuid                     NOT NULL,
  "entitlement_id" uuid                     NOT NULL,
  "value"          jsonb                    NOT NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY (id),
  CONSTRAINT "unique_plan_entitlement" UNIQUE (plan_id, entitlement_id)
);



-- --------------------------------------------------------------------

-- Table: public.subscription_events

-- --------------------------------------------------------------------

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
  CONSTRAINT "subscription_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "subscription_events_provider_event_id_key" UNIQUE (provider_event_id),
  CONSTRAINT "subscription_events_status_check" CHECK ((status = ANY (ARRAY['received'::text, 'processed'::text, 'failed'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.subscription_payments

-- --------------------------------------------------------------------

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
  CONSTRAINT "subscription_payments_pkey" PRIMARY KEY (id),
  CONSTRAINT "subscription_payments_reference_key" UNIQUE (reference),
  CONSTRAINT "subscription_payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'under_review'::text, 'verified'::text, 'rejected'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.categories

-- --------------------------------------------------------------------

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



-- --------------------------------------------------------------------

-- Table: public.account_context

-- --------------------------------------------------------------------

CREATE TABLE "public"."account_context" (
  "user_id"           uuid                     NOT NULL,
  "status"            text                     NOT NULL DEFAULT 'active'::text,
  "onboarding_status" text                     NOT NULL DEFAULT 'completed'::text,
  "first_login_at"    timestamp with time zone,
  "last_login_at"     timestamp with time zone,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "account_context_onboarding_status_check" CHECK ((onboarding_status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text]))),
  CONSTRAINT "account_context_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "account_context_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'deactivated'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.email_events

-- --------------------------------------------------------------------

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



-- --------------------------------------------------------------------

-- Table: public.notifications

-- --------------------------------------------------------------------

CREATE TABLE "public"."notifications" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     uuid                     NOT NULL,
  "property_id" uuid,
  "type"        text                     NOT NULL,
  "title"       text                     NOT NULL,
  "message"     text                     NOT NULL,
  "read_at"     timestamp with time zone,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY (id)
);



-- --------------------------------------------------------------------

-- Table: public.automations

-- --------------------------------------------------------------------

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
  CONSTRAINT "automations_pkey" PRIMARY KEY (id),
  CONSTRAINT "automations_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'failed'::text]))),
  CONSTRAINT "automations_trigger_type_check" CHECK ((trigger_type = ANY (ARRAY['schedule'::text, 'event'::text, 'source'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.automation_executions

-- --------------------------------------------------------------------

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
  CONSTRAINT "uq_automation_idempotency" UNIQUE (automation_id, idempotency_key)
);



-- --------------------------------------------------------------------

-- Table: public.tasks

-- --------------------------------------------------------------------

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
  CONSTRAINT "tasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "tasks_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
  CONSTRAINT "tasks_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.activity_logs

-- --------------------------------------------------------------------

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
  CONSTRAINT "activity_logs_pkey" PRIMARY KEY (id)
);



-- --------------------------------------------------------------------

-- Table: public.workspace_members

-- --------------------------------------------------------------------

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
  CONSTRAINT "workspace_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "workspace_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'agent'::text, 'staff'::text, 'viewer'::text]))),
  CONSTRAINT "workspace_members_status_check" CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text, 'removed'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.workspace_invitations

-- --------------------------------------------------------------------

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
  CONSTRAINT "workspace_invitations_invite_type_check" CHECK ((invite_type = ANY (ARRAY['LINK'::text, 'DIRECT_PROFILE'::text, 'EMAIL'::text]))),
  CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY (id),
  CONSTRAINT "workspace_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'revoked'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.properties

-- --------------------------------------------------------------------

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
  CONSTRAINT "properties_parking_spaces_check" CHECK ((parking_spaces >= 0)),
  CONSTRAINT "properties_pkey" PRIMARY KEY (id),
  CONSTRAINT "properties_property_category_check" CHECK ((property_category = ANY (ARRAY['Residential'::text, 'Commercial'::text]))),
  CONSTRAINT "properties_purchase_price_check" CHECK ((purchase_price >= (0)::numeric)),
  CONSTRAINT "properties_rent_amount_check" CHECK ((rent_amount >= (0)::numeric)),
  CONSTRAINT "properties_square_feet_check" CHECK ((square_feet >= (0)::numeric)),
  CONSTRAINT "properties_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text, 'maintenance'::text]))),
  CONSTRAINT "uq_properties_id_workspace" UNIQUE (id, workspace_id)
);



-- --------------------------------------------------------------------

-- Table: public.property_members

-- --------------------------------------------------------------------

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
  CONSTRAINT "property_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "property_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text, 'agent'::text, 'staff'::text, 'viewer'::text]))),
  CONSTRAINT "property_members_status_check" CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text, 'removed'::text]))),
  CONSTRAINT "uq_property_members_prop_user" UNIQUE (property_id, user_id)
);



-- --------------------------------------------------------------------

-- Table: public.tenants

-- --------------------------------------------------------------------

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
  CONSTRAINT "tenants_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text, 'prospect'::text]))),
  CONSTRAINT "uq_tenants_id_property" UNIQUE (id, property_id)
);



-- --------------------------------------------------------------------

-- Table: public.leases

-- --------------------------------------------------------------------

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
  CONSTRAINT "leases_payment_due_day_check" CHECK (((payment_due_day >= 1) AND (payment_due_day <= 31))),
  CONSTRAINT "leases_pkey" PRIMARY KEY (id),
  CONSTRAINT "leases_rent_amount_check" CHECK ((rent_amount >= (0)::numeric)),
  CONSTRAINT "leases_rent_frequency_check" CHECK ((rent_frequency = ANY (ARRAY['weekly'::text, 'fortnightly'::text, 'monthly'::text, 'yearly'::text]))),
  CONSTRAINT "leases_security_deposit_check" CHECK ((security_deposit >= (0)::numeric)),
  CONSTRAINT "leases_status_check"
    CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'active'::text, 'expired'::text, 'terminated'::text, 'cancelled'::text, 'renewed'::text]))),
  CONSTRAINT "uq_leases_id_property" UNIQUE (id, property_id)
);



-- --------------------------------------------------------------------

-- Table: public.lease_tenants

-- --------------------------------------------------------------------

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
  CONSTRAINT "lease_tenants_role_check" CHECK ((role = ANY (ARRAY['primary'::text, 'co-tenant'::text, 'guarantor'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.invoice_sequences

-- --------------------------------------------------------------------

CREATE TABLE "public"."invoice_sequences" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid                     NOT NULL,
  "prefix"       text                     NOT NULL DEFAULT 'INV'::text,
  "year"         integer                  NOT NULL,
  "last_number"  integer                  NOT NULL DEFAULT 0,
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_invoice_sequence" UNIQUE (workspace_id, prefix, year)
);



-- --------------------------------------------------------------------

-- Table: public.invoice_templates

-- --------------------------------------------------------------------

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
  CONSTRAINT "invoice_templates_late_fee_amount_check" CHECK ((late_fee_amount >= (0)::numeric)),
  CONSTRAINT "invoice_templates_late_fee_days_check" CHECK ((late_fee_days >= 0)),
  CONSTRAINT "invoice_templates_layout_style_check"
    CHECK ((layout_style = ANY (ARRAY['classic'::text, 'modern'::text, 'minimalist'::text, 'corporate'::text, 'creative'::text, 'elegant'::text, 'monochrome'::text]))),
  CONSTRAINT "invoice_templates_pkey" PRIMARY KEY (id),
  CONSTRAINT "invoice_templates_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'archived'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.invoices

-- --------------------------------------------------------------------

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
  CONSTRAINT "invoices_balance_due_check" CHECK ((balance_due >= (0)::numeric)),
  CONSTRAINT "invoices_invoice_number_key" UNIQUE (invoice_number),
  CONSTRAINT "invoices_pkey" PRIMARY KEY (id),
  CONSTRAINT "invoices_status_check"
    CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'viewed'::text, 'paid'::text, 'partially_paid'::text, 'overdue'::text, 'cancelled'::text, 'void'::text]))),
  CONSTRAINT "invoices_subtotal_check" CHECK ((subtotal >= (0)::numeric)),
  CONSTRAINT "invoices_tax_amount_check" CHECK ((tax_amount >= (0)::numeric)),
  CONSTRAINT "invoices_total_amount_check" CHECK ((total_amount >= (0)::numeric))
);



-- --------------------------------------------------------------------

-- Table: public.invoice_items

-- --------------------------------------------------------------------

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
  CONSTRAINT "invoice_items_unit_price_check" CHECK ((unit_price >= (0)::numeric))
);



-- --------------------------------------------------------------------

-- Table: public.invoice_documents

-- --------------------------------------------------------------------

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
  CONSTRAINT "invoice_documents_pkey" PRIMARY KEY (id)
);



-- --------------------------------------------------------------------

-- Table: public.transactions

-- --------------------------------------------------------------------

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
    ON DELETE RESTRICT,
  CONSTRAINT "transactions_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "transactions_pkey" PRIMARY KEY (id),
  CONSTRAINT "transactions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'reversed'::text, 'refunded'::text]))),
  CONSTRAINT "transactions_transaction_type_check" CHECK ((transaction_type = ANY (ARRAY['income'::text, 'expense'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.payment_proofs

-- --------------------------------------------------------------------

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
  CONSTRAINT "payment_proofs_pkey" PRIMARY KEY (id)
);



-- --------------------------------------------------------------------

-- Table: public.maintenance_requests

-- --------------------------------------------------------------------

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
  CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "maintenance_requests_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
  CONSTRAINT "maintenance_requests_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'scheduled'::text, 'completed'::text, 'cancelled'::text])))
);



-- --------------------------------------------------------------------

-- Table: public.public

-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  document_type VARCHAR(50) NOT NULL DEFAULT 'other' CHECK (
    document_type IN (
      'lease_agreement',
      'condition_report',
      'receipt',
      'insurance_policy',
      'strata_notice',
      'compliance_certificate',
      'council_notice',
      'photo',
      'other'
    )
  ),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  blob_path TEXT,
  file_size BIGINT,
  mime_type VARCHAR(100),
  description TEXT,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);





-- ====================================================================
-- SECTION B: ADD ALL FOREIGN KEY CONSTRAINTS
-- (Safe execution: All tables now exist in database)
-- ====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspaces_owner_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'platform_roles_created_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."platform_roles" ADD CONSTRAINT "platform_roles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'platform_role_permissions_permission_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."platform_role_permissions" ADD CONSTRAINT "platform_role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'platform_role_permissions_role_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."platform_role_permissions" ADD CONSTRAINT "platform_role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.platform_roles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'platform_admins_created_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."platform_admins" ADD CONSTRAINT "platform_admins_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'platform_admins_user_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."platform_admins" ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'platform_user_roles_role_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."platform_user_roles" ADD CONSTRAINT "platform_user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.platform_roles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'platform_user_roles_user_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."platform_user_roles" ADD CONSTRAINT "platform_user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'team_roles_created_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."team_roles" ADD CONSTRAINT "team_roles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'team_roles_workspace_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."team_roles" ADD CONSTRAINT "team_roles_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'team_role_permissions_permission_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."team_role_permissions" ADD CONSTRAINT "team_role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'team_role_permissions_role_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."team_role_permissions" ADD CONSTRAINT "team_role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.team_roles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_account_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.account_context(user_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_plan_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'plan_entitlements_entitlement_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."plan_entitlements" ADD CONSTRAINT "plan_entitlements_entitlement_id_fkey" FOREIGN KEY (entitlement_id) REFERENCES public.entitlements(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'plan_entitlements_plan_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."plan_entitlements" ADD CONSTRAINT "plan_entitlements_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscription_events_account_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."subscription_events" ADD CONSTRAINT "subscription_events_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.account_context(user_id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscription_payments_account_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."subscription_payments" ADD CONSTRAINT "subscription_payments_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.account_context(user_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscription_payments_verified_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."subscription_payments" ADD CONSTRAINT "subscription_payments_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscription_payments_subscription_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_subscription_payments_sub_account' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."subscription_payments" ADD CONSTRAINT "fk_subscription_payments_sub_account" FOREIGN KEY (subscription_id, account_id) REFERENCES public.subscriptions(id, account_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'account_context_user_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."account_context" ADD CONSTRAINT "account_context_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notifications_user_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notifications_property_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'automations_created_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."automations" ADD CONSTRAINT "automations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'automations_invoice_template_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."automations" ADD CONSTRAINT "automations_invoice_template_id_fkey" FOREIGN KEY (invoice_template_id) REFERENCES public.invoice_templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'automations_lease_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."automations" ADD CONSTRAINT "automations_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'automations_workspace_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."automations" ADD CONSTRAINT "automations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'automation_executions_automation_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."automation_executions" ADD CONSTRAINT "automation_executions_automation_id_fkey" FOREIGN KEY (automation_id) REFERENCES public.automations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'automation_executions_lease_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."automation_executions" ADD CONSTRAINT "automation_executions_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'automation_executions_workspace_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."automation_executions" ADD CONSTRAINT "automation_executions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_assigned_to_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_created_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_property_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'activity_logs_user_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'activity_logs_property_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'activity_logs_workspace_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_members_invited_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_members_role_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.team_roles(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_members_user_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_members_workspace_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_invitations_accepted_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_accepted_by_fkey" FOREIGN KEY (accepted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_invitations_invited_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_invitations_profile_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_invitations_role_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.team_roles(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_invitations_workspace_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'properties_owner_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'properties_workspace_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."properties" ADD CONSTRAINT "properties_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'property_members_invited_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."property_members" ADD CONSTRAINT "property_members_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'property_members_property_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."property_members" ADD CONSTRAINT "property_members_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'property_members_user_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."property_members" ADD CONSTRAINT "property_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenants_property_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."tenants" ADD CONSTRAINT "tenants_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenants_user_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."tenants" ADD CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leases_created_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."leases" ADD CONSTRAINT "leases_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leases_renewed_from_lease_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."leases" ADD CONSTRAINT "leases_renewed_from_lease_id_fkey" FOREIGN KEY (renewed_from_lease_id) REFERENCES public.leases(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leases_property_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."leases" ADD CONSTRAINT "leases_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lease_tenants_lease_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."lease_tenants" ADD CONSTRAINT "lease_tenants_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_lease_tenants_lease_prop' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."lease_tenants" ADD CONSTRAINT "fk_lease_tenants_lease_prop" FOREIGN KEY (lease_id, property_id) REFERENCES public.leases(id, property_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lease_tenants_property_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."lease_tenants" ADD CONSTRAINT "lease_tenants_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lease_tenants_tenant_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."lease_tenants" ADD CONSTRAINT "lease_tenants_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_lease_tenants_tenant_prop' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."lease_tenants" ADD CONSTRAINT "fk_lease_tenants_tenant_prop" FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoice_sequences_workspace_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoice_sequences" ADD CONSTRAINT "invoice_sequences_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoice_templates_created_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoice_templates" ADD CONSTRAINT "invoice_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoice_templates_workspace_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoice_templates" ADD CONSTRAINT "invoice_templates_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_automation_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_automation_id_fkey" FOREIGN KEY (automation_id) REFERENCES public.automations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_created_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_invoices_lease_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoices" ADD CONSTRAINT "fk_invoices_lease_id" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_lease_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_property_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_invoices_tenant_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoices" ADD CONSTRAINT "fk_invoices_tenant_id" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_tenant_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_workspace_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoice_items_invoice_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoice_documents_invoice_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoice_documents" ADD CONSTRAINT "invoice_documents_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoice_documents_workspace_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."invoice_documents" ADD CONSTRAINT "invoice_documents_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_transactions_category_type' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."transactions" ADD CONSTRAINT "fk_transactions_category_type" FOREIGN KEY (transaction_category_id, transaction_type) REFERENCES public.categories(id, transaction_type) ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_created_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_invoice_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_lease_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_lease_id_fkey" FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_property_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_tenant_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_workspace_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_proofs_payment_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."payment_proofs" ADD CONSTRAINT "payment_proofs_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.subscription_payments(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'maintenance_requests_assigned_to_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."maintenance_requests" ADD CONSTRAINT "maintenance_requests_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'maintenance_requests_created_by_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."maintenance_requests" ADD CONSTRAINT "maintenance_requests_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'maintenance_requests_property_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."maintenance_requests" ADD CONSTRAINT "maintenance_requests_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'maintenance_requests_tenant_id_fkey' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."maintenance_requests" ADD CONSTRAINT "maintenance_requests_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_maintenance_tenant_prop' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "public"."maintenance_requests" ADD CONSTRAINT "fk_maintenance_tenant_prop" FOREIGN KEY (tenant_id, property_id) REFERENCES public.tenants(id, property_id) ON DELETE SET NULL;
  END IF;

END $$;
