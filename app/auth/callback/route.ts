import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/routing/safeRedirect';
import { resolveOnboardingStage } from '@/lib/onboarding/resolver';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeRedirectPath(searchParams.get('next'), '/onboarding');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let target = next;
      if (user) {
        const resolution = await resolveOnboardingStage(user.id);
        if (!resolution.completed) {
          target = resolution.route || '/onboarding';
        } else {
          target = next === '/onboarding' ? '/dashboard' : next;
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${target}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${target}`);
      } else {
        return NextResponse.redirect(`${origin}${target}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Invalid verification code or link`);
}
