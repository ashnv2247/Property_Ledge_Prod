import { createClient, createAdminClient } from '@/lib/supabase/server';
import { billingProvider } from './provider';
import { CheckoutSessionOptions, CheckoutSessionResult, BillingPortalOptions, BillingPortalResult, BANK_DETAILS } from './types';
import { createSubscription, updateSubscription } from '@/lib/subscriptions/service';
import { getSubscription } from '@/lib/subscriptions/queries';
import { logAuthEvent } from '@/lib/debug/logger';
import { SubscriptionPayment, PaymentProof } from '@/types/subscriptions';
import { serverCache } from '@/lib/cache/server-cache';
import { put } from '@vercel/blob';

export async function createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSessionResult> {
  logAuthEvent('CHECKOUT_STARTED', { accountId: options.accountId, planSlug: options.planSlug });
  try {
    const session = await billingProvider.createCheckoutSession(options);
    logAuthEvent('CHECKOUT_CREATED', { accountId: options.accountId, sessionId: session.sessionId });
    return session;
  } catch (err: any) {
    logAuthEvent('CHECKOUT_FAILED', { accountId: options.accountId, error: err.message });
    throw err;
  }
}

export async function createManualCheckoutSession(
  userId: string,
  planSlug: string,
  billingInterval: 'monthly' | 'yearly' = 'monthly',
  customAmount?: number
): Promise<{ subscriptionId: string; paymentId: string; reference: string; expectedAmount: number }> {
  const supabase = await createAdminClient();

  // 1. Ensure user profile exists
  let { data: profile } = await (supabase as any)
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    const { data: newProf } = await (supabase as any)
      .from('profiles')
      .insert({
        id: userId,
        full_name: 'Customer Account',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();
    if (newProf) profile = newProf;
  }

  // 2. Ensure account_context exists for user (user_id is PK)
  let accountId = userId;
  const { data: accountCtx } = await (supabase as any)
    .from('account_context')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (accountCtx) {
    accountId = accountCtx.user_id;
  } else {
    const { data: newAcc } = await (supabase as any)
      .from('account_context')
      .insert({
        user_id: userId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('user_id')
      .maybeSingle();

    if (newAcc) {
      accountId = newAcc.user_id;
    }
  }

  // 3. Fetch plan
  const { data: plan, error: planErr } = await (supabase as any)
    .from('subscription_plans')
    .select('*')
    .eq('slug', planSlug)
    .single();

  if (planErr || !plan) {
    throw new Error(`Plan '${planSlug}' not found.`);
  }

  let expectedAmount: number;
  if (planSlug === 'agency' && customAmount !== undefined && customAmount > 0) {
    expectedAmount = Number(customAmount.toFixed(2));
  } else {
    const multiplier = billingInterval === 'yearly' ? 10 : 1;
    const priceDollars = plan.price_cents / 100;
    expectedAmount = Number((priceDollars * multiplier).toFixed(2));
  }

  // 4. Generate unique reference
  const randomRef = Math.floor(100000 + Math.random() * 900000);
  const reference = `${BANK_DETAILS.referencePrefix}${randomRef}`;

  // 5. Look for an existing pending checkout subscription (status in 'pending_payment', 'under_review')
  // Do NOT mutate an existing 'active' subscription into pending_payment here, so active access is preserved!
  const { data: existingCheckoutSub } = await (supabase as any)
    .from('subscriptions')
    .select('id, status')
    .eq('account_id', accountId)
    .in('status', ['pending_payment', 'under_review'])
    .maybeSingle();

  let subscriptionId: string;

  if (existingCheckoutSub) {
    subscriptionId = existingCheckoutSub.id;
    await (supabase as any)
      .from('subscriptions')
      .update({
        plan_id: plan.id,
        status: 'pending_payment',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);
  } else {
    const { data: newSub, error: subErr } = await (supabase as any)
      .from('subscriptions')
      .insert({
        account_id: accountId,
        plan_id: plan.id,
        status: 'pending_payment',
        provider: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (subErr || !newSub) {
      console.error('Failed to create subscription in database:', subErr);
      throw new Error(`Failed to create subscription: ${subErr?.message}`);
    }
    subscriptionId = newSub.id;
  }

  serverCache.invalidateAccount(accountId);

  // 6. Look for existing pending payment record on this checkout subscription or insert a new one
  const { data: existingPay } = await (supabase as any)
    .from('subscription_payments')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'pending')
    .maybeSingle();

  let paymentId: string;
  if (existingPay) {
    paymentId = existingPay.id;
    await (supabase as any)
      .from('subscription_payments')
      .update({
        reference,
        expected_amount: expectedAmount,
        currency: 'AUD',
        billing_cycle: billingInterval,
        payment_method: 'bank_transfer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);
  } else {
    const { data: payment, error: payErr } = await (supabase as any)
      .from('subscription_payments')
      .insert({
        subscription_id: subscriptionId,
        account_id: accountId,
        reference,
        expected_amount: expectedAmount,
        currency: 'AUD',
        status: 'pending',
        billing_cycle: billingInterval,
        payment_method: 'bank_transfer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (payErr || !payment) {
      console.error('Failed to create payment record in database:', payErr);
      throw new Error(`Failed to create payment record: ${payErr?.message}`);
    }
    paymentId = payment.id;
  }

  return {
    subscriptionId,
    paymentId,
    reference,
    expectedAmount,
  };
}

export async function submitManualPayment(
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
  const supabase = await createAdminClient();

  // 1. Update subscription_payments
  const { data: payment, error: payErr } = await (supabase as any)
    .from('subscription_payments')
    .update({
      submitted_amount: details.submittedAmount,
      payment_date: details.paymentDate,
      transaction_id: details.transactionId || null,
      customer_message: details.customerMessage || null,
      payment_method: details.paymentMethod || 'bank_transfer',
      billing_cycle: details.billingCycle || 'monthly',
      status: 'under_review',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (payErr || !payment) {
    console.error('Failed to update subscription payment record:', payErr);
    throw new Error(`Failed to update payment: ${payErr?.message}`);
  }

  // 2. Upload receipt to Vercel Blob (primary) with Supabase storage fallback
  let filePreviewUrl: string | null = details.filePreviewUrl || null;
  let storagePath = `${paymentId}/${details.fileName}`;

  if (details.filePreviewUrl && details.filePreviewUrl.startsWith('data:')) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      try {
        const base64Data = details.filePreviewUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const sanitized = details.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const blobResult = await put(
          `payment-receipts/${paymentId}-${sanitized}`,
          buffer,
          {
            access: 'public',
            contentType: details.mimeType,
            token,
          }
        );
        if (blobResult?.url) {
          filePreviewUrl = blobResult.url;
          storagePath = blobResult.url;
        }
      } catch (blobErr) {
        console.warn('Vercel Blob upload failed, attempting Supabase fallback:', blobErr);
      }
    }

    // Fallback: Supabase storage bucket
    if (!filePreviewUrl || filePreviewUrl.startsWith('data:')) {
      try {
        const extension = details.fileName.includes('.')
          ? details.fileName.split('.').pop()
          : details.mimeType === 'application/pdf'
            ? 'pdf'
            : 'jpg';
        const sbPath = `${paymentId}/${crypto.randomUUID()}.${extension}`;
        const base64Data = details.filePreviewUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');

        const { error: uploadErr } = await (supabase as any).storage
          .from('payment-receipts')
          .upload(sbPath, buffer, {
            contentType: details.mimeType,
            upsert: false,
          });

        if (!uploadErr) {
          storagePath = sbPath;
          const { data: signed } = await (supabase as any).storage
            .from('payment-receipts')
            .createSignedUrl(sbPath, 3600);
          if (signed?.signedUrl) {
            filePreviewUrl = signed.signedUrl;
          }
        }
      } catch (stErr) {
        console.warn('Supabase storage bucket upload exception:', stErr);
      }
    }
  }

  // 3. Create payment_proof record
  await (supabase as any)
    .from('payment_proofs')
    .insert({
      payment_id: paymentId,
      storage_path: storagePath,
      file_name: details.fileName,
      mime_type: details.mimeType,
      file_size: details.fileSize,
      file_preview_url: filePreviewUrl,
      uploaded_at: new Date().toISOString(),
    });

  // 4. Update checkout subscription status to under_review and establish 14-day trial window
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  await (supabase as any)
    .from('subscriptions')
    .update({
      status: 'under_review',
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', payment.subscription_id);

  if (payment.account_id) {
    serverCache.invalidateAccount(payment.account_id);
  }

  return payment;
}

export async function approveManualPayment(
  paymentId: string,
  adminId: string,
  internalNotes?: string
) {
  const supabase = await createAdminClient();

  // 1. Fetch payment and verify status
  let { data: payment, error: fetchErr } = await (supabase as any)
    .from('subscription_payments')
    .select('*, subscriptions!subscription_payments_subscription_id_fkey(*)')
    .eq('id', paymentId)
    .maybeSingle();

  // If not found directly, check by subscription_id (supports pay-<subId> or subId)
  if (!payment) {
    const cleanSubId = paymentId.startsWith('pay-') ? paymentId.replace('pay-', '') : paymentId;
    const { data: altPayment } = await (supabase as any)
      .from('subscription_payments')
      .select('*, subscriptions!subscription_payments_subscription_id_fkey(*)')
      .eq('subscription_id', cleanSubId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (altPayment) {
      payment = altPayment;
      paymentId = altPayment.id;
      fetchErr = null;
    }
  }

  if (fetchErr || !payment) {
    throw new Error('Payment record not found.');
  }

  if (payment.status === 'verified') {
    throw new Error('This payment has already been approved.');
  }

  const now = new Date();
  const isYearly = payment.billing_cycle === 'yearly';
  const periodEnd = new Date(
    now.getTime() + (isYearly ? 365 : 30) * 24 * 60 * 60 * 1000
  );

  // 2. Mark subscription payment verified
  const { data: updatedPayment, error: payErr } = await (supabase as any)
    .from('subscription_payments')
    .update({
      status: 'verified',
      verified_at: now.toISOString(),
      verified_by: adminId,
      internal_notes: internalNotes || null,
      updated_at: now.toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (payErr || !updatedPayment) {
    throw new Error(`Failed to approve payment: ${payErr?.message}`);
  }

  // 3. Supercede any previous active subscription row for this account to maintain single entitlement constraint
  const { data: previousActiveSubs } = await (supabase as any)
    .from('subscriptions')
    .select('id')
    .eq('account_id', payment.account_id)
    .in('status', ['trialing', 'active', 'past_due', 'paused'])
    .neq('id', payment.subscription_id);

  if (previousActiveSubs && previousActiveSubs.length > 0) {
    for (const oldSub of previousActiveSubs) {
      await (supabase as any)
        .from('subscriptions')
        .update({
          status: 'expired',
          updated_at: now.toISOString(),
        })
        .eq('id', oldSub.id);
    }
  }

  // 4. Activate current subscription
  await (supabase as any)
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      canceled_at: null,
      updated_at: now.toISOString(),
    })
    .eq('id', payment.subscription_id);

  if (payment.account_id) {
    serverCache.invalidateAccount(payment.account_id);
  }

  return updatedPayment;
}

export async function rejectManualPayment(
  paymentId: string,
  adminId: string,
  rejectionReason: string,
  internalNotes?: string
) {
  if (!rejectionReason || !rejectionReason.trim()) {
    throw new Error('A customer-facing rejection reason is required.');
  }

  const supabase = await createAdminClient();

  let { data: payment, error: fetchErr } = await (supabase as any)
    .from('subscription_payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();

  if (!payment) {
    const cleanSubId = paymentId.startsWith('pay-') ? paymentId.replace('pay-', '') : paymentId;
    const { data: altPayment } = await (supabase as any)
      .from('subscription_payments')
      .select('*')
      .eq('subscription_id', cleanSubId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (altPayment) {
      payment = altPayment;
      paymentId = altPayment.id;
      fetchErr = null;
    }
  }

  if (fetchErr || !payment) {
    throw new Error('Payment record not found.');
  }

  if (payment.status === 'verified') {
    throw new Error('Cannot reject a payment that has already been verified.');
  }

  // Update subscription_payments to rejected
  const { data: updatedPayment, error: payErr } = await (supabase as any)
    .from('subscription_payments')
    .update({
      status: 'rejected',
      rejection_reason: rejectionReason.trim(),
      internal_notes: internalNotes || null,
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (payErr || !updatedPayment) {
    throw new Error(`Failed to reject payment: ${payErr?.message}`);
  }

  // Set the pending subscription to canceled so it leaves the pending slot.
  // Any existing active subscription for that account remains completely untouched!
  await (supabase as any)
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.subscription_id);

  if (payment.account_id) {
    serverCache.invalidateAccount(payment.account_id);
  }

  return updatedPayment;
}

export async function getSubscriptionPaymentBySubId(subscriptionId: string): Promise<SubscriptionPayment | null> {
  const supabase = await createAdminClient();
  const { data } = await (supabase as any)
    .from('subscription_payments')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getLatestPaymentForAccount(accountId: string): Promise<SubscriptionPayment | null> {
  const supabase = await createAdminClient();
  const { data } = await (supabase as any)
    .from('subscription_payments')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function getPaymentProofByPaymentId(paymentId: string): Promise<PaymentProof | null> {
  const supabase = await createAdminClient();

  let { data: proof } = await (supabase as any)
    .from('payment_proofs')
    .select('*')
    .eq('payment_id', paymentId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // If not found directly, check if paymentId is a subscriptionId or pay-<subId>
  if (!proof && (paymentId.startsWith('pay-') || paymentId.length > 30)) {
    const cleanSubId = paymentId.startsWith('pay-') ? paymentId.replace('pay-', '') : paymentId;
    const { data: pay } = await (supabase as any)
      .from('subscription_payments')
      .select('id')
      .eq('subscription_id', cleanSubId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pay?.id) {
      const { data: proofByPay } = await (supabase as any)
        .from('payment_proofs')
        .select('*')
        .eq('payment_id', pay.id)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      proof = proofByPay;
    }
  }

  if (!proof) return null;

  if (proof.storage_path) {
    // If it's already an absolute URL (e.g. from Vercel Blob)
    if (proof.storage_path.startsWith('http://') || proof.storage_path.startsWith('https://')) {
      return {
        ...proof,
        file_preview_url: proof.file_preview_url || proof.storage_path,
      };
    }

    try {
      const { data: signed } = await (supabase as any).storage
        .from('payment-receipts')
        .createSignedUrl(proof.storage_path, 3600);

      if (signed?.signedUrl) {
        return {
          ...proof,
          file_preview_url: signed.signedUrl,
        };
      }
    } catch {
      // Fallback
    }
  }

  return proof;
}

export async function createPortalSession(options: BillingPortalOptions): Promise<BillingPortalResult> {
  return billingProvider.createPortalSession(options);
}

export async function processWebhookEvent(rawBody: string, signature: string, secret: string) {
  logAuthEvent('BILLING_WEBHOOK_RECEIVED');

  const isValid = billingProvider.verifyWebhookSignature(rawBody, signature, secret);
  if (!isValid) {
    logAuthEvent('BILLING_WEBHOOK_FAILED', { reason: 'Invalid signature' });
    throw new Error('WEBHOOK_INVALID_SIGNATURE: Invalid webhook signature');
  }

  logAuthEvent('BILLING_WEBHOOK_VALIDATED');
  const event = billingProvider.parseWebhookEvent(rawBody);

  const supabase = await createAdminClient();

  const { data: existingEvent } = await (supabase as any)
    .from('subscription_events')
    .select('id, status')
    .eq('provider_event_id', event.id)
    .maybeSingle();

  if (existingEvent && existingEvent.status === 'processed') {
    logAuthEvent('BILLING_WEBHOOK_DUPLICATE', { eventId: event.id });
    return { status: 'already_processed', eventId: event.id };
  }

  await (supabase as any)
    .from('subscription_events')
    .upsert({
      provider_event_id: event.id,
      account_id: event.accountId || null,
      provider: 'stripe',
      event_type: event.type,
      payload: event.data,
      status: 'received',
      processed_at: new Date().toISOString(),
    });

  if (event.accountId && event.planSlug) {
    const { data: plan } = await (supabase as any)
      .from('subscription_plans')
      .select('id')
      .eq('slug', event.planSlug)
      .single();

    if (plan) {
      const existingSub = await getSubscription(event.accountId);
      if (existingSub) {
        await updateSubscription(existingSub.id, {
          plan_id: plan.id,
          status: 'active',
          provider_customer_id: event.providerCustomerId || existingSub.provider_customer_id,
          provider_subscription_id: event.providerSubscriptionId || existingSub.provider_subscription_id,
        }, true);
      } else {
        await createSubscription(event.accountId, plan.id, 'active', {
          providerCustomerId: event.providerCustomerId,
          providerSubscriptionId: event.providerSubscriptionId,
        }, true);
      }
    }
  }

  await (supabase as any)
    .from('subscription_events')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
    })
    .eq('provider_event_id', event.id);

  logAuthEvent('BILLING_WEBHOOK_PROCESSED', { eventId: event.id });
  return { status: 'success', eventId: event.id };
}
