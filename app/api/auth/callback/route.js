import { createServerClient } from '@supabase/ssr';
import { findCustomerByEmail } from '@/lib/find-markettime-customer';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function enforceMarketTimeRegistration(supabase, email) {
  try {
    const customer = await findCustomerByEmail(email);
    if (!customer) {
      await supabase.auth.signOut();
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[auth/callback] MarketTime lookup failed — allowing session:', err.message);
    return true;
  }
}

/**
 * Supabase auth callback handler.
 * Called after email confirmation or OAuth flows.
 * Exchanges the code for a session and redirects the user.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const skipMarketTimeCheck = next.includes('reset-password');
      if (!skipMarketTimeCheck) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const allowed = await enforceMarketTimeRegistration(supabase, user.email);
          if (!allowed) {
            return NextResponse.redirect(`${origin}/login?error=no_markettime_registration`);
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
  }

  // Some Supabase email templates use token_hash/type instead of PKCE code.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      const skipMarketTimeCheck = type === 'recovery' || next.includes('reset-password');
      if (!skipMarketTimeCheck) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const allowed = await enforceMarketTimeRegistration(supabase, user.email);
          if (!allowed) {
            return NextResponse.redirect(`${origin}/login?error=no_markettime_registration`);
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('[auth/callback] verifyOtp failed:', error.message);
  }

  // On error, redirect to login with error message
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
