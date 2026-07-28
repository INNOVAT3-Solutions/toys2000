import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Pages reachable without signing in.
const PUBLIC_PATHS = ['/', '/login', '/register', '/catalog', '/product', '/api'];

// Pages an authenticated-but-unapproved user may view (includes public catalog browsing).
const APPROVAL_EXEMPT_PATHS = ['/', '/login', '/register', '/pending-approval', '/reset-password', '/catalog', '/product', '/profile', '/api'];

export async function proxy(req) {
  const res = NextResponse.next({
    request: { headers: req.headers },
  });

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

  // IMPORTANT: use getUser() rather than getSession(). getSession() reads the JWT
  // from cookies without validating it against the auth server, so a tampered or
  // stale cookie can satisfy the auth check. getUser() round-trips to Supabase
  // and is the only safe primitive to use in server-side auth gates.
  // See: https://supabase.com/docs/guides/auth/server-side/nextjs
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (!user && !isPublic) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Enforce the "approved retailer" business rule at the edge. Without this,
  // anyone who signs up can browse the catalog before Jimmy reviews them in MT.
  // The catalog/cart/checkout RLS policies also enforce this server-side, but
  // redirecting at the proxy avoids leaking page shells and 401 noise.
  if (user) {
    const isExempt = APPROVAL_EXEMPT_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + '/')
    );

    if (!isExempt) {
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
  }

  return res;
}

export const matcher = [
  '/((?!_next/static|_next/image|favicon.ico|logos|brands|catalogs|categories|icons.svg).*)',
];

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static files.
     */
    '/((?!_next/static|_next/image|favicon.ico|logos|brands|catalogs|categories|icons.svg).*)',
  ],
};
