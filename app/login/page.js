'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const errorParam = searchParams.get('error');
  const modeParam = searchParams.get('mode');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

  const supabase = createBrowserClient();

  useEffect(() => {
    if (modeParam === 'signup') setMode('signup');
  }, [modeParam]);

  const safeRedirect =
    redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';

  // Best-effort; never block navigation — MarketTime link can take several seconds.
  const linkMarketTimeProfile = () => {
    void fetch('/api/profile/link-markettime', { method: 'POST' }).catch(() => {});
  };

  const goAfterAuth = (path) => {
    // Full navigation so auth cookies are applied before the next page/proxy check.
    window.location.assign(path);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back!');
        linkMarketTimeProfile();
        goAfterAuth(safeRedirect);
        return;
      }

      const verifyRes = await fetch('/api/auth/verify-markettime-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.eligible) {
        throw new Error(
          verifyData.message
            || 'No MarketTime registration was found for this email. Complete Toys2000 signup first.'
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      });
      if (error) throw error;
      if (data.session) {
        toast.success('Portal account created.');
        linkMarketTimeProfile();
        goAfterAuth('/pending-approval');
        return;
      }
      toast.success('Check your email to confirm your portal account.');
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Enter your email address first.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset email sent. Check your inbox.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, #f7f8fa 0%, #eef0f4 40%, #fff5f0 100%)',
        }}
      />
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{ background: '#00aeef' }}
      />
      <div
        className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full opacity-25 blur-3xl"
        style={{ background: '#f15a24' }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <a href="/" className="block transition-transform hover:scale-[1.02]">
            <Image
              src="/logos/toys_2000_logo.png"
              alt="Toys2000"
              width={200}
              height={68}
              className="h-16 w-auto object-contain drop-shadow-sm"
              priority
            />
          </a>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-black/[0.06] p-8 sm:p-10">
          <h1
            className="text-2xl sm:text-3xl font-bold text-center mb-1 text-[#1a1d26]"
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-[#5f6980] text-center mb-8">
            {mode === 'login'
              ? 'Sign in to your wholesale account'
              : 'Step 2 — use the same email as your wholesale application. Portal signup requires an approved MarketTime account.'}
          </p>

          {mode === 'signup' && (
            <div className="mb-6 px-4 py-3 bg-[#f0f9ff] border border-[#bae6fd] rounded-xl text-sm text-[#0c4a6e]">
              <p className="font-semibold">Haven&apos;t applied yet?</p>
              <p className="mt-1">
                <Link href="/register" className="text-[#00aeef] font-semibold hover:underline">
                  Submit a wholesale application first
                </Link>
                {' '}— Jimmy must approve you before portal signup works.
              </p>
            </div>
          )}

          {errorParam === 'auth_callback_failed' && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Email confirmation failed. Please try logging in again.
            </div>
          )}

          {errorParam === 'no_markettime_registration' && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              No MarketTime registration was found for this email.{' '}
              <Link href="/register" className="font-semibold underline">
                Complete Toys2000 signup first
              </Link>
              , then create your portal login.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1d26] mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f15a24]/25 focus:border-[#f15a24] transition-all"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1d26] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f15a24]/25 focus:border-[#f15a24] transition-all"
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-[#00aeef] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-60 hover:shadow-lg hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #f15a24, #ff7a4d)',
                boxShadow: '0 4px 12px rgba(241, 90, 36, 0.25)',
                fontFamily: "'Baloo 2', cursive",
              }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#5f6980]">
            {mode === 'login' ? (
              <p>
                New to Toys2000?{' '}
                <Link
                  href="/register"
                  className="text-[#f15a24] font-semibold hover:underline"
                >
                  Register here
                </Link>
              </p>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-[#f15a24] font-semibold hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[#8b94a8] mt-8">
          Toys2000 Wholesale Portal — For approved retailers only
        </p>
      </div>
    </div>
  );
}
