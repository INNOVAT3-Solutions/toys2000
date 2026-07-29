import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Pages reachable without signing in.
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/catalog',
  '/product',
  '/brands',
  '/privacy',
  '/terms',
  '/api',
];

// Pages an authenticated-but-unapproved user may view (includes public catalog browsing).
const APPROVAL_EXEMPT_PATHS = [
  '/',
  '/login',
  '/register',
  '/pending-approval',
  '/reset-password',
  '/catalog',
  '/product',
  '/brands',
  '/privacy',
  '/terms',
  '/profile',
  '/api',
];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isApprovalExempt(pathname) {
  return APPROVAL_EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/** True when the request likely has a Supabase session cookie. */
function hasSupabaseAuthCookie(req) {
  return req.cookies.getAll().some((cookie) => {
    const name = cookie.name;
    return (
      name.includes('-auth-token') ||
      (name.startsWith('sb-') && name.includes('auth'))
    );
  });
}

function isAuthRateLimited(error) {
  if (!error) return false;
  return (
    error.status === 429 ||
    error.code === 'over_request_rate_limit' ||
    /rate limit/i.test(error.message ?? '')
  );
}

/** Transient network / fetch failure talking to Supabase Auth (status 0). */
function isAuthUnreachable(error) {
  if (!error) return false;
  return (
    error.status === 0 ||
    error.name === 'AuthRetryableFetchError' ||
    /fetch failed/i.test(error.message ?? '')
  );
}

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function proxy(req) {
  const res = NextResponse.next({
    request: { headers: req.headers },
  });

  const pathname = req.nextUrl.pathname;
  const publicPath = isPublicPath(pathname);
  const hasSessionCookie = hasSupabaseAuthCookie(req);

  if (!hasSupabaseConfig()) {
    if (!publicPath) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  // Fast path: no auth cookie → never call Supabase Auth (avoids 429 storms).
  if (!hasSessionCookie) {
    if (!publicPath) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  // Public pages do not need session validation in middleware.
  if (publicPath) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validate/refresh session only when a cookie is present.
  let user;
  let error;
  try {
    ({ data: { user }, error } = await supabase.auth.getUser());
  } catch (authError) {
    error = authError;
  }

  // If Auth is unreachable or rate-limited, do not redirect-loop.
  if (isAuthRateLimited(error)) {
    console.warn('[proxy] Supabase auth rate limited — passing request through');
    return res;
  }
  if (isAuthUnreachable(error)) {
    console.warn('[proxy] Supabase auth unreachable — passing request through');
    return res;
  }

  if (!user && !publicPath) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Enforce approved-retailer gate for signed-in users on non-exempt routes.
  if (user && !isApprovalExempt(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.approved) {
      const pendingUrl = new URL('/pending-approval', req.url);
      return NextResponse.redirect(pendingUrl);
    }
  }

  return res;
}

export const matcher = [
  '/((?!_next/static|_next/image|favicon.ico|logos|brands|catalogs|catalog-covers|catalog-pages|categories|hero|brand-videos|icons.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4)$).*)',
];

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static marketing assets.
     */
    '/((?!_next/static|_next/image|favicon.ico|logos|brands|catalogs|catalog-covers|catalog-pages|categories|hero|brand-videos|icons.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4)$).*)',
  ],
};
