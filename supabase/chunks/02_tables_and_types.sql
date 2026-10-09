-- ====================================================================
-- CHUNK 02: TABLE DEFINITIONS & CONSTRAINTS
-- Step 2 of 9 — Run second in Supabase SQL Editor
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.condition_reports (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID                     NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  property_id         UUID                     NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lease_id            UUID                     REFERENCES public.leases(id) ON DELETE SET NULL,
  baseline_report_id  UUID                     REFERENCES public.condition_reports(id) ON DELETE SET NULL,
  inspector_id        UUID                     REFERENCES auth.users(id) ON DELETE SET NULL,
  type                VARCHAR(50)              NOT NULL CHECK (type IN ('Move In', 'Routine', 'Move Out', 'Custom')),
  inspection_date     DATE                     NOT NULL DEFAULT CURRENT_DATE,
  inspector_name      VARCHAR(255)             NOT NULL,
  status              VARCHAR(50)              NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Completed')),
  notes               TEXT,
  signature_manager   TEXT,
  signature_tenant    TEXT,
  signature_landlord  TEXT,
  completed_at        TIMESTAMP WITH TIME ZONE,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.condition_reports ADD COLUMN IF NOT EXISTS baseline_report_id UUID REFERENCES public.condition_reports(id) ON DELETE SET NULL;

-- 2. Inspection Rooms Table
CREATE TABLE IF NOT EXISTS public.inspection_rooms (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id           UUID                     NOT NULL REFERENCES public.condition_reports(id) ON DELETE CASCADE,
  name                VARCHAR(255)             NOT NULL,
  status              VARCHAR(50)              NOT NULL DEFAULT 'Incomplete' CHECK (status IN ('Incomplete', 'Completed')),
  room_order          INT                      NOT NULL DEFAULT 0,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Inspection Items Table
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID                     NOT NULL REFERENCES public.inspection_rooms(id) ON DELETE CASCADE,
  name                VARCHAR(255)             NOT NULL,
  rating              VARCHAR(50)              CHECK (rating IN ('Excellent', 'Good', 'Fair', 'Needs Repair', 'Damaged', 'Not Applicable')),
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Inspection Defects Table
CREATE TABLE IF NOT EXISTS public.inspection_defects (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID                     NOT NULL REFERENCES public.inspection_rooms(id) ON DELETE CASCADE,
  item_name           VARCHAR(255),
  notes               TEXT                     NOT NULL,
  severity            VARCHAR(50)              NOT NULL CHECK (severity IN ('Minor', 'Moderate', 'Major', 'Urgent')),
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Inspection Photos Table
CREATE TABLE IF NOT EXISTS public.inspection_photos (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID                     NOT NULL REFERENCES public.inspection_rooms(id) ON DELETE CASCADE,
  defect_id           UUID                     REFERENCES public.inspection_defects(id) ON DELETE CASCADE,
  item_id             UUID                     REFERENCES public.inspection_items(id) ON DELETE CASCADE,
  photo_url           TEXT                     NOT NULL,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.inspection_photos ADD COLUMN IF NOT EXISTS defect_id UUID REFERENCES public.inspection_defects(id) ON DELETE CASCADE;
ALTER TABLE public.inspection_photos ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.inspection_items(id) ON DELETE CASCADE;

-- Indexes for optimal lookup performance
CREATE TABLE IF NOT EXISTS public.category_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_category_groups_workspace_name UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_group_id UUID REFERENCES public.category_groups(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_categories_type_name UNIQUE (transaction_type, name),
    CONSTRAINT uq_categories_id_type UNIQUE (id, transaction_type)
);

CREATE TABLE IF NOT EXISTS public.tax_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bas_code TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tax_classifications_workspace_name UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12,4) NOT NULL CHECK (amount > 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    transaction_category_id UUID NOT NULL,
    tax_classification_id UUID REFERENCES public.tax_classifications(id) ON DELETE SET NULL,
    gst_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
    gst_amount NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT,
    description TEXT,
    reference TEXT,
    vendor_name TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed', 'refunded')),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    receipt_url TEXT,
    receipt_blob_path TEXT,
    receipt_file_name TEXT,
    receipt_file_size BIGINT,
    receipt_mime_type TEXT,
    receipt_uploaded_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_transactions_category_type FOREIGN KEY (transaction_category_id, transaction_type) 
        REFERENCES public.categories(id, transaction_type) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.expected_payment_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    transaction_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    tax_classification_id UUID REFERENCES public.tax_classifications(id) ON DELETE SET NULL,
    gst_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
    gst_amount NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
    schedule_name TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('lease', 'independent')),
    amount NUMERIC(12,4) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly', 'custom')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transaction_schedule_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    expected_payment_id UUID NOT NULL REFERENCES public.expected_payment_schedule(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(12,4) NOT NULL CHECK (allocated_amount > 0),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_transaction_schedule_allocations UNIQUE (transaction_id, expected_payment_id)
);

CREATE TABLE IF NOT EXISTS public.transaction_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    blob_url TEXT NOT NULL,
    blob_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    source_path TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

