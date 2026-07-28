'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createBrowserClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated. You can sign in with your new password.');
      router.push('/catalog');
      router.refresh();
    } catch (err) {
      toast.error(err.message || 'Could not update password. Try the reset link again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#f7f8fa]">
      <div className="w-full max-w-md bg-white rounded-3xl border border-black/[0.06] shadow-lg p-8">
        <div className="flex justify-center mb-6">
          <Image
            src="/logos/toys_2000_logo.png"
            alt="Toys2000"
            width={200}
            height={68}
            className="object-contain"
            style={{ width: 'auto', height: '4rem' }}
          />
        </div>
        <h1 className="text-2xl font-bold text-center text-[#1a1d26] mb-2" style={{ fontFamily: "'Baloo 2', cursive" }}>
          Set a new password
        </h1>
        <p className="text-sm text-[#5f6980] text-center mb-6">
          Choose a new password for your portal account.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1a1d26] mb-1">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#f15a24]"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1a1d26] mb-1">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#f15a24]"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)', fontFamily: "'Baloo 2', cursive" }}
          >
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
