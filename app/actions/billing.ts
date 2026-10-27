'use server';

import { getCurrentUser } from '@/lib/auth/queries';
import { requireAdmin } from '@/lib/admin/authorization';
import {
  createManualCheckoutSession as createManualCheckoutSessionService,
  submitManualPayment as submitManualPaymentService,
  approveManualPayment as approveManualPaymentService,
  rejectManualPayment as rejectManualPaymentService,
} from '@/lib/billing/service';
import { notificationService } from '@/lib/notifications/service';
import { recordAdminAudit } from '@/lib/admin/service';
import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function handleCreateManualCheckoutSession(
  planSlug: string,
  billingInterval: 'monthly' | 'yearly',
  customAmount?: number
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: Please sign in to choose a subscription plan.');
  }
  return createManualCheckoutSessionService(user.id, planSlug, billingInterval, customAmount);
}

export async function handleSubmitManualPayment(
  paymentId: string,
  details: {
    submittedAmount: number;
    paymentDate: string;
    transactionId?: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storagePath?: string;
    filePreviewUrl?: string;
    customerMessage?: string;
    paymentMethod?: string;
    billingCycle?: 'monthly' | 'yearly';
  }
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: Please sign in to submit a subscription payment.');
  }

  const payment = await submitManualPaymentService(paymentId, details);

  // Trigger SUBSCRIPTION_REQUESTED notification events (Email A, Email B, Email C)
  try {
    const supabase = await createAdminClient();
    const { data: payRecord } = await (supabase as any)
      .from('subscription_payments')
      .select('*, subscriptions!subscription_payments_subscription_id_fkey(*, subscription_plans(*))')
      .eq('id', paymentId)
      .maybeSingle();

    if (payRecord) {
      const accountId = payRecord.account_id;
      const subRecord = payRecord.subscriptions;
      const planName = subRecord?.subscription_plans?.name || 'Portfolio Pro';

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', accountId)
        .maybeSingle();

      const { data: authUser } = await supabase.auth.admin.getUserById(accountId);

      const customerEmail =
        authUser?.user?.email ||
        profile?.email ||
        user.email ||
        'customer@propertyledge.com.au';

      const customerName =
        profile?.full_name ||
        authUser?.user?.user_metadata?.full_name ||
        user.user_metadata?.full_name ||
        'Customer';

      await notificationService.notifySubscriptionRequested({
        paymentId,
        subscriptionId: payRecord.subscription_id,
        accountName: customerName,
        accountEmail: customerEmail,
        planName,
        billingCycle: details.billingCycle || payRecord.billing_cycle || 'monthly',
        amount: details.submittedAmount || payRecord.expected_amount,
        currency: payRecord.currency || 'AUD',
        paymentMethod: details.paymentMethod || payRecord.payment_method || 'Bank Transfer',
        transactionReference: details.transactionId || payRecord.transaction_id,
        reference: payRecord.reference || paymentId,
        submittedAt: payRecord.submitted_at || new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[billing.ts] Notification trigger exception:', err);
  }

  revalidatePath('/subscription');
  revalidatePath('/admin/subscriptions');
  return payment;
}

export async function handleApprovePayment(paymentId: string, internalNotes?: string) {
  const adminId = await requireAdmin();
  const payment = await approveManualPaymentService(paymentId, adminId, internalNotes);

  // Record audit log
  await recordAdminAudit(adminId, 'ADMIN_SUBSCRIPTION_ACCEPTED', 'subscription_payment', paymentId, {
    subscriptionId: payment.subscription_id,
    internalNotes,
  });

  // Trigger SUBSCRIPTION_ACCEPTED notification (Email D) to customer
  try {
    const supabase = await createAdminClient();
    const { data: payRecord } = await (supabase as any)
      .from('subscription_payments')
      .select('*, subscriptions!subscription_payments_subscription_id_fkey(*, subscription_plans(*))')
      .eq('id', paymentId)
      .maybeSingle();

    if (payRecord) {
      const accountId = payRecord.account_id;
      const subRecord = payRecord.subscriptions;
      const planName = subRecord?.subscription_plans?.name || 'Portfolio Pro';

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', accountId)
        .maybeSingle();

      const { data: authUser } = await supabase.auth.admin.getUserById(accountId);

      const customerEmail =
        authUser?.user?.email ||
        profile?.email ||
        'customer@propertyledge.com.au';

      const customerName =
        profile?.full_name ||
        authUser?.user?.user_metadata?.full_name ||
        'Customer';

      await notificationService.notifySubscriptionAccepted({
        paymentId,
        subscriptionId: payRecord.subscription_id,
        accountName: customerName,
        accountEmail: customerEmail,
        planName,
        billingCycle: payRecord.billing_cycle || 'monthly',
        amount: Number(payRecord.submitted_amount || payRecord.expected_amount || 0),
        currency: payRecord.currency || 'AUD',
        startDate: subRecord?.current_period_start || new Date().toISOString(),
        effectiveDate: new Date().toISOString(),
        endDate: subRecord?.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  } catch (err) {
    console.error('[billing.ts] Subscription approval notification exception:', err);
  }

  revalidatePath('/admin/subscriptions');
  revalidatePath('/subscription');
  revalidatePath('/dashboard');
  return payment;
}

export async function handleRejectPayment(
  paymentId: string,
  rejectionReason: string,
  internalNotes?: string
) {
  const adminId = await requireAdmin();
  const payment = await rejectManualPaymentService(paymentId, adminId, rejectionReason, internalNotes);

  await recordAdminAudit(adminId, 'ADMIN_SUBSCRIPTION_REJECTED', 'subscription_payment', paymentId, {
    subscriptionId: payment.subscription_id,
    rejectionReason,
    internalNotes,
  });

  // Trigger SUBSCRIPTION_REJECTED notification (Email E) to customer
  try {
    const supabase = await createAdminClient();
    const { data: payRecord } = await (supabase as any)
      .from('subscription_payments')
      .select('*, subscriptions!subscription_payments_subscription_id_fkey(*, subscription_plans(*))')
      .eq('id', paymentId)
      .maybeSingle();

    if (payRecord) {
      const accountId = payRecord.account_id;
      const subRecord = payRecord.subscriptions;
      const planName = subRecord?.subscription_plans?.name || 'Portfolio Pro';

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', accountId)
        .maybeSingle();

      const { data: authUser } = await supabase.auth.admin.getUserById(accountId);

      const customerEmail =
        authUser?.user?.email ||
        profile?.email ||
        'customer@propertyledge.com.au';

      const customerName =
        profile?.full_name ||
        authUser?.user?.user_metadata?.full_name ||
        'Customer';

      await notificationService.notifySubscriptionRejected({
        paymentId,
        subscriptionId: payRecord.subscription_id,
        accountName: customerName,
        accountEmail: customerEmail,
        planName,
        reference: payRecord.reference || paymentId,
        decisionDate: new Date().toISOString(),
        rejectionReason,
      });
    }
  } catch (err) {
    console.error('[billing.ts] Subscription rejection notification exception:', err);
  }

  revalidatePath('/admin/subscriptions');
  revalidatePath('/subscription');
  return payment;
}
