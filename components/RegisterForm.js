'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { US_STATES } from '@/lib/us-states';

const INITIAL = {
  companyName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  fax: '',
  website: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
  taxId: '',
};

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1a1d26] mb-1">
        {label}
        {required ? <span className="text-[#f15a24]"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f15a24]/25 focus:border-[#f15a24] transition-all';

export default function RegisterForm() {
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/register/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setSuccess({
        message: data.message,
        recordID: data.recordID,
        email: form.email,
      });
      setForm(INITIAL);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-black/[0.06] p-8 sm:p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-5 text-2xl font-bold">
          ✓
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold text-[#1a1d26] mb-3"
          style={{ fontFamily: "'Baloo 2', cursive" }}
        >
          Application submitted
        </h1>
        <p className="text-sm text-[#5f6980] leading-relaxed mb-4">
          {success.message}
        </p>
        <p className="text-sm text-[#5f6980] leading-relaxed mb-6">
          We&apos;ll review your application for <strong>{success.email}</strong>. Once approved,
          create your portal login with that same email to browse pricing and place orders.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login?mode=signup"
            className="inline-block px-5 py-2.5 rounded-xl font-bold text-sm text-white"
            style={{
              background: 'linear-gradient(135deg, #f15a24, #ff7a4d)',
              fontFamily: "'Baloo 2', cursive",
            }}
          >
            Create portal login later
          </Link>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl font-bold text-sm text-[#5f6980] border border-gray-200 hover:bg-[#f7f8fa]"
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-black/[0.06] p-8 sm:p-10">
      <h1
        className="text-2xl sm:text-3xl font-bold text-center mb-2 text-[#1a1d26]"
        style={{ fontFamily: "'Baloo 2', cursive" }}
      >
        Join Toys2000 Wholesale
      </h1>
      <p className="text-sm text-[#5f6980] text-center mb-8">
        Apply here — Jimmy&apos;s team will review and approve your account. No MarketTime signup needed.
      </p>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-[#1a1d26] uppercase tracking-wide">
            Company information
          </h2>
          <Field label="Company name" required>
            <input
              className={inputClass}
              required
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
              autoComplete="organization"
            />
          </Field>
          <Field label="Address 1" required>
            <input
              className={inputClass}
              required
              value={form.address1}
              onChange={(e) => update('address1', e.target.value)}
              autoComplete="address-line1"
            />
          </Field>
          <Field label="Address 2">
            <input
              className={inputClass}
              value={form.address2}
              onChange={(e) => update('address2', e.target.value)}
              autoComplete="address-line2"
              placeholder="Suite, unit, etc."
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Country" required>
              <select
                className={inputClass}
                required
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </Field>
            <Field label={form.country === 'CA' ? 'Province' : 'State'} required>
              {form.country === 'US' ? (
                <select
                  className={inputClass}
                  required
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                >
                  <option value="">Select state</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClass}
                  required
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                  placeholder="e.g. ON"
                  maxLength={4}
                />
              )}
            </Field>
            <Field label="Zip code" required>
              <input
                className={inputClass}
                required
                value={form.zip}
                onChange={(e) => update('zip', e.target.value)}
                autoComplete="postal-code"
              />
            </Field>
          </div>
          <Field label="City" required>
            <input
              className={inputClass}
              required
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              autoComplete="address-level2"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone" required>
              <input
                className={inputClass}
                required
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                autoComplete="tel"
              />
            </Field>
            <Field label="Fax">
              <input
                className={inputClass}
                type="tel"
                value={form.fax}
                onChange={(e) => update('fax', e.target.value)}
              />
            </Field>
          </div>
          <Field label="Company email" required>
            <input
              className={inputClass}
              required
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Website">
            <input
              className={inputClass}
              type="text"
              value={form.website}
              onChange={(e) => update('website', e.target.value)}
              placeholder="retailcottage.com"
              autoComplete="url"
            />
          </Field>
          <Field label="Resale ID / Federal Tax Number">
            <input
              className={inputClass}
              value={form.taxId}
              onChange={(e) => update('taxId', e.target.value)}
            />
          </Field>
        </section>

        <section className="space-y-4 pt-2 border-t border-black/[0.06]">
          <h2 className="text-sm font-bold text-[#1a1d26] uppercase tracking-wide pt-4">
            Primary contact
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name" required>
              <input
                className={inputClass}
                required
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                autoComplete="given-name"
              />
            </Field>
            <Field label="Last name" required>
              <input
                className={inputClass}
                required
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                autoComplete="family-name"
              />
            </Field>
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-60 hover:shadow-lg hover:-translate-y-0.5 mt-2"
          style={{
            background: 'linear-gradient(135deg, #00aeef, #0090c8)',
            boxShadow: '0 4px 12px rgba(0, 174, 239, 0.25)',
            fontFamily: "'Baloo 2', cursive",
          }}
        >
          {loading ? 'Submitting…' : 'Submit application'}
        </button>
      </form>

      <p className="text-center text-sm text-[#5f6980] mt-8 pt-6 border-t border-black/[0.06]">
        Already approved?{' '}
        <Link href="/login?mode=signup" className="text-[#f15a24] font-semibold hover:underline">
          Create portal login
        </Link>
        {' · '}
        <Link href="/login" className="text-[#f15a24] font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function RegisterPageShell({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, #f7f8fa 0%, #eef0f4 40%, #fff5f0 100%)',
        }}
      />
      <div className="relative w-full max-w-xl">
        <div className="flex justify-center mb-8">
          <Link href="/" className="block transition-transform hover:scale-[1.02]">
            <Image
              src="/logos/toys_2000_logo.png"
              alt="Toys2000"
              width={200}
              height={68}
              className="h-16 w-auto object-contain drop-shadow-sm"
              priority
            />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
