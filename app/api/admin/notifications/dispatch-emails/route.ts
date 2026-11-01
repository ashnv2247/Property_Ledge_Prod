import { NextRequest, NextResponse } from 'next/server';
import { processPendingEmailEvents } from '@/lib/admin/email-outbox';
import { isAdmin } from '@/lib/admin/authorization';

export async function POST(request: NextRequest) {
  // 1. Authorize: Check Cron token, Vercel cron header, or authenticated platform admin
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  let authorized = false;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    authorized = true;
  } else if (isVercelCron) {
    authorized = true;
  } else {
    // Check if called by an authenticated platform admin
    authorized = await isAdmin();
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body?.limit === 'number' ? body.limit : 25;
    const maxAttempts = typeof body?.maxAttempts === 'number' ? body.maxAttempts : 5;

    const result = await processPendingEmailEvents({ limit, maxAttempts });

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[DispatchEmailsRoute] Failed:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

