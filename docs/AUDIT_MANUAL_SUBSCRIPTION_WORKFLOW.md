# Codebase Audit: Manual Subscription Request, Payment Proof & Admin Approval Workflow

## Executive Summary
This audit inspects PropertyLedge's existing subscription, billing, storage, authorization, email, and admin architecture to establish the baseline before implementing the complete manual subscription request and approval workflow.

---

## 1. Current Pricing Page & Subscription CTA Components
- **Marketing Pricing Page:** Located at `components/marketing/Pricing.tsx` (rendered on `/pricing`).
  - Dark navy palette (`#061222`, `#08182A`), teal accents (`#008F83`, `#00A99D`), three pricing cards:
    1. **Landlord Starter:** $39/mo or $29/mo billed annually ($348/year, "Save 20%"). Up to 5 properties.
    2. **Portfolio Pro:** Highlighted / most popular card. $99/mo or $79/mo billed annually ($948/year, "Save 20%"). Up to 50 properties.
    3. **Agency & Enterprise:** Custom pricing ("Custom"), "Speak with Sales", unlimited properties & entities.
  - Previous CTA links: `/checkout?plan=pro` and `/checkout?plan=business`, pointing to a simulated direct checkout flow in `components/subscription/SubscriptionCheckout.tsx`.
- **Checkout Component:** `components/subscription/SubscriptionCheckout.tsx` on `app/checkout/page.tsx`.
  - Multi-step flow: Plan selection -> Customer Details -> Payment Instructions & Proof Upload -> Confirmation.
  - Displays Bank Deposit Details (`BANK_DETAILS` in `lib/billing/types.ts`): NAB, BSB 083-004, Account 9876 54321, Reference prefix `PL-2026-`.

---

## 2. Existing Database Schema & Subscriptions Architecture
From `supabase/schema.sql`, `types/database.ts`, and `PROPERTYLEDGE_V3_1_SECURITY_AUDIT.md`:

### A. Core Subscription Tables
1. **`public.subscription_plans`**:
   - Columns: `id`, `name`, `slug`, `description`, `status` (`active`, `inactive`, `archived`), `display_order`, `price_cents`, `billing_interval` (`monthly`, `yearly`), `provider_price_id`, `created_at`, `updated_at`.
2. **`public.subscriptions`**:
   - Columns: `id`, `account_id` (references user/account), `plan_id` (references `subscription_plans`), `status` (`draft`, `pending_payment`, `under_review`, `trialing`, `active`, `past_due`, `paused`, `canceled`, `expired`), `current_period_start`, `current_period_end`, `cancel_at_period_end`, `canceled_at`, `trial_start`, `trial_end`, `provider`, `provider_customer_id`, `provider_subscription_id`, `created_at`, `updated_at`.
   - Security: Protected by V3.1 partial unique index on `account_id` where status is in current billing slot (`pending_payment`, `under_review`, `trialing`, `active`, `past_due`, `paused`). Client updates dropped; only service role / admin can mutate status.
3. **`public.subscription_payments`**:
   - Columns: `id`, `subscription_id`, `account_id`, `reference`, `expected_amount`, `submitted_amount`, `currency`, `payment_date`, `transaction_id`, `status` (`pending`, `under_review`, `verified`, `rejected`), `submitted_at`, `verified_at`, `verified_by`, `created_at`, `updated_at`.
   - Composite FK binding: `(subscription_id, account_id)` references `subscriptions(id, account_id)`.
4. **`public.payment_proofs`**:
   - Columns: `id`, `payment_id`, `storage_path`, `file_name`, `mime_type`, `file_size`, `file_preview_url`, `uploaded_at`.
   - Constraints: MIME type must be PDF, PNG, JPEG, JPG (`chk_payment_proofs_mime`), file size <= 5MB (`chk_payment_proofs_size`).
5. **`public.entitlements` & `public.plan_entitlements`**:
   - Capabilities defined per plan (e.g. `properties.limit`, `users.limit`, `reports.advanced`, `inspections.unlimited`).
6. **`public.admin_audit_logs` & `public.activity_logs`**:
   - Append-only audit logs recording admin decisions (`ADMIN_SUBSCRIPTION_APPROVED`, `ADMIN_SUBSCRIPTION_REJECTED`, etc.).

---

## 3. Storage Architecture: `payment-receipts` Bucket
- Supabase Storage bucket: `payment-receipts`.
- Bucket configuration: **`public = false`** (Private).
- RLS Policies on `storage.objects`:
  - `receipts_insert_own`: authenticated users can upload only to paths matching their payment ID via `public.owns_subscription_payment(public.payment_id_from_storage_path(name))`.
  - `receipts_select_own`: authenticated users can view only their own receipts; platform admins can view all receipts.
  - Short-lived signed URLs (`createSignedUrl(storagePath, 3600)`) are generated on demand to securely view or download receipt files without public exposure.

---

## 4. Auth & Admin Authorization System
- **Supabase Auth:** Session handled via `@/lib/supabase/server` and `@/lib/auth/queries` (`getCurrentUser()`).
- **Platform Admin Authorization:**
  - `public.platform_admins` table: authoritative roster of platform administrators (`user_id`, `status = 'active'`).
  - `is_platform_admin()` SQL function: strictly queries `platform_admins`, preventing forged JWT or metadata escalation.
  - Server helper `requireAdmin()` in `lib/admin/authorization.ts`: verifies user exists in `platform_admins`.
- **Admin Panel Structure:**
  - Layout: `app/admin/layout.tsx` wraps pages in `AdminClientLayout`.
  - Navigation Sections in `components/admin/AdminClientLayout.tsx`:
    - Overview: `/admin`
    - Platform: Users (`/admin/users`), Subscriptions (`/admin/subscriptions`), Payments (`/admin/payments`), Activity (`/admin/activity`)
    - Business: Plans (`/admin/plans`), Entitlements (`/admin/entitlements`), Roles, Billing Events, Audit Logs.
  - Existing subscriptions page: `app/admin/subscriptions/page.tsx` with `SubscriptionDrawer.tsx`.

---

## 5. Resend Email Integration & Outbox
- **Service:** `lib/email/service.ts` (`emailService.sendEmail`).
- **Environment variables:**
  - `RESEND_API_KEY`: Server-side API key.
  - `EMAIL_FROM`: Sender address (e.g., `subscription@propertyledge.au` or verified domain sender).
  - `EMAIL_FROM_NAME`: `PropertyLedge`.
  - Dedicated notification inbox: `subscription@propertyledge.au`.
  - Administrator recipient: `ashdeveloper2247@gmail.com`.
- **Database Email Logging:** `email_events` table logs every dispatch attempt (`recipient`, `subject`, `template_type`, `variables`, `status`, `provider_message_id`, `error_message`).
- **Template System:** Responsive dark-mode HTML templates in `lib/email/service.ts` (`subscription_requested`, `subscription_requested_user`, `subscription_accepted`, `subscription_rejected`).

---

## 6. Entitlements & Subscription Status Lifecycle
- **Entitlement Calculation:** `lib/entitlements/queries.ts` (`getEntitlements(accountId)`):
  - Checks `getSubscription(accountId)`. If active or trialing, loads `plan_entitlements` for `sub.plan_id`.
  - If inactive/pending/rejected, returns empty map `{}` (no paid access).
- **Workspace Context:** `lib/workspace/context.ts` resolves billing through workspace `owner_id`.
- **Customer Subscription Page:** `app/(app)/subscription/page.tsx` displays current plan, status badge, renewal date, and entitlement list.

---

## 7. Identified Gaps & Target Implementation
1. **Dedicated Subscription Requests Table:**
   - Create `public.subscription_requests` with schema matching prompt requirements: `id`, `user_id`, `plan_id`, `billing_cycle`, `amount`, `currency`, `payment_method`, `payment_reference`, `payment_date`, `receipt_storage_path`, `status` (`pending`, `under_review`, `approved`, `rejected`), `customer_message`, `reviewed_by`, `reviewed_at`, `internal_notes`, `rejection_reason`, `created_at`, `updated_at`.
   - Maintain compatibility and synchronization with `subscription_payments` and `subscriptions`.
2. **Dedicated Admin Navigation & Route:**
   - Add `Admin -> Subscriptions -> Subscription Requests` (`/admin/subscriptions/requests`) with dashboard metrics, data grid, status filtering, receipt preview modal, and approve/reject actions with mandatory customer rejection reasons.
3. **Email Delivery Configuration:**
   - Configure exact recipients:
     - Admin: `ashdeveloper2247@gmail.com`
     - Dedicated Subscription Inbox: `subscription@propertyledge.au`
     - Customer: Authenticated customer's registered email
   - Ensure proper templates for Emails A, B, C, D, and E with secure admin review links and customer dashboard links.
4. **Atomic Server Actions:**
   - `submitSubscriptionRequestAction`: calculates authoritative plan price server-side, validates upload, persists request idempotently, and triggers notifications A, B, and C.
   - `approveSubscriptionRequestAction`: verifies admin permissions, atomically updates status, sets subscription active, sets period dates, logs audit event, and sends Email D.
   - `rejectSubscriptionRequestAction`: verifies admin, requires customer reason, marks rejected, preserves existing subscription, and sends Email E.
5. **Customer Dashboard View:**
   - Enhance `/subscription` to clearly present the pending request, review status, rejection explanations with re-submission guidance, and active entitlement refresh.
