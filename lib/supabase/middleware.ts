import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveUserDestination } from '@/lib/routing/resolveUserDestination';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  const isRsc = request.headers.get('rsc') === '1' || request.nextUrl.searchParams.has('_rsc');
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  );

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/tenant') ||
    pathname.startsWith('/subscription') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/onboarding');

  // Fast path 1: Internal RSC navigation with active auth cookie -> zero remote network overhead
  if (isRsc && !isAuthRoute) {
    if (!hasAuthCookie && isProtectedRoute) {
      return NextResponse.redirect(new URL(`/login?redirectTo=${encodeURIComponent(pathname)}`, request.url));
    }
    return supabaseResponse;
  }

  // Fast path 2: Direct unauthenticated request to protected route without auth cookie -> instant redirect
  if (!hasAuthCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL(`/login?redirectTo=${encodeURIComponent(pathname)}`, request.url));
  }

  // Secure Supabase session verification & token refresh
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = request.nextUrl.searchParams.get('redirectTo');
  const planParam = request.nextUrl.searchParams.get('plan');
  const joinMatch = redirectTo?.match(/^\/join\/([^/?]+)/);
  const pendingInvitationToken = joinMatch?.[1] ?? null;

  // Middleware only handles route security and cookie refresh.
  // Database-heavy onboarding and persona resolution are delegated to AppLayout.
  const resolution = resolveUserDestination({
    isAuthenticated: !!user,
    pathname,
    onboardingStatus: 'completed',
    onboardingRoute: null,
    persona: null,
    pendingInvitationToken,
    redirectTo,
    planParam,
  });

  if (resolution) {
    return NextResponse.redirect(new URL(resolution.path, request.url));
  }

  return supabaseResponse;
}

