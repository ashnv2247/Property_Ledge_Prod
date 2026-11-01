import { createAdminClient } from '@/lib/supabase/server';
import { buildEmailHtml } from '@/lib/email/service';

export interface OutboxProcessResult {
  processed: number;
  successful: number;
  failed: number;
  simulated: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Transactional Outbox processor: dispatches pending email notifications from public.email_events via Resend.
 * Safe, idempotent, with retries and exponential-friendly attempt tracking.
 */
export async function processPendingEmailEvents(options?: {
  limit?: number;
  maxAttempts?: number;
}): Promise<OutboxProcessResult> {
  const limit = options?.limit ?? 25;
  const maxAttempts = options?.maxAttempts ?? 5;

  const result: OutboxProcessResult = {
    processed: 0,
    successful: 0,
    failed: 0,
    simulated: 0,
    errors: [],
  };

  try {
    const supabase = await createAdminClient();

    // 1. Fetch pending email events ordered by creation time
    const { data: pendingEvents, error: fetchErr } = await (supabase as any)
      .from('email_events')
      .select('*')
      .eq('status', 'pending')
      .lt('attempt_count', maxAttempts)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (fetchErr) {
      console.error('[EmailOutbox] Error querying pending email events:', fetchErr);
      return result;
    }

    if (!pendingEvents || pendingEvents.length === 0) {
      return result;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      'PropertyLedge <noreply@propertyledge.com.au>';

    // 2. Process each event sequentially
    for (const event of pendingEvents) {
      result.processed++;
      const currentAttempt = (event.attempt_count || 0) + 1;

      // Atomically update attempt count
      await (supabase as any)
        .from('email_events')
        .update({
          attempt_count: currentAttempt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      try {
        const html = buildEmailHtml(event.template_type, event.variables || {});

        // If no Resend API key configured, safely simulate delivery in dev/sandbox
        if (!resendApiKey) {
          const simId = `sim_outbox_${Math.random().toString(36).substring(2, 10)}`;
          await (supabase as any)
            .from('email_events')
            .update({
              status: 'simulated',
              sent_at: new Date().toISOString(),
              provider_message_id: simId,
              error_message: 'RESEND_API_KEY not configured. Email simulated.',
              updated_at: new Date().toISOString(),
            })
            .eq('id', event.id);

          result.simulated++;
          result.successful++;
          continue;
        }

        // Resend API invocation
        const executeResend = async (targetRecipient: string, sub: string) => {
          return fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromAddress,
              to: [targetRecipient],
              subject: sub,
              html,
            }),
          });
        };

        let response = await executeResend(event.recipient, event.subject);

        // Fallback for Resend sandbox/testing 403 unverified domain limitation
        if (!response.ok && response.status === 403) {
          const redirect = process.env.EMAIL_REDIRECT_TO || process.env.ADMIN_NOTIFY_EMAIL?.replace(/,$/, '').trim();
          if (redirect && redirect !== event.recipient) {
            const redirectSubject = `[For: ${event.recipient}] ${event.subject}`;
            const retryRes = await executeResend(redirect, redirectSubject);
            if (retryRes.ok) {
              response = retryRes;
            }
          }
        }

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[EmailOutbox] Resend API error (${response.status}) for event ${event.id}:`, errText);

          const isFinalFailure = currentAttempt >= maxAttempts;
          await (supabase as any)
            .from('email_events')
            .update({
              status: isFinalFailure ? 'failed' : 'pending',
              error_message: `Resend HTTP ${response.status}: ${errText.slice(0, 500)}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', event.id);

          result.failed++;
          result.errors.push({ id: event.id, error: errText });
          continue;
        }

        const data = await response.json();
        const providerMessageId = data.id || data.message_id || 'sent';

        // Mark as sent
        await (supabase as any)
          .from('email_events')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider_message_id: providerMessageId,
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', event.id);

        result.successful++;
      } catch (err: any) {
        console.error(`[EmailOutbox] Exception sending event ${event.id}:`, err);
        const isFinalFailure = currentAttempt >= maxAttempts;
        await (supabase as any)
          .from('email_events')
          .update({
            status: isFinalFailure ? 'failed' : 'pending',
            error_message: err.message || 'Unknown network error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', event.id);

        result.failed++;
        result.errors.push({ id: event.id, error: err.message });
      }
    }
  } catch (outerErr: any) {
    console.error('[EmailOutbox] Uncaught exception processing outbox:', outerErr);
  }

  return result;
}

/**
 * Triggers background outbox delivery without blocking the caller.
 */
export function triggerEmailOutboxDelivery(): void {
  // Fire and forget
  processPendingEmailEvents().catch((err) => {
    console.warn('[EmailOutbox] Background dispatch triggered error:', err);
  });
}

