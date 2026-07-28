import Image from 'next/image';
import Link from 'next/link';

export const metadata = { title: 'Register — Toys2000 Wholesale' };

const MT_SIGNUP_URL = process.env.MT_B2B_SIGNUP_URL || 'https://toys2000.markettime.com/signup';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, #f7f8fa 0%, #eef0f4 40%, #fff5f0 100%)',
        }}
      />

      <div className="relative w-full max-w-lg">
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

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-black/[0.06] p-8 sm:p-10">
          <h1
            className="text-2xl sm:text-3xl font-bold text-center mb-2 text-[#1a1d26]"
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            Join Toys2000 Wholesale
          </h1>
          <p className="text-sm text-[#5f6980] text-center mb-8">
            New retailers register on MarketTime first, then create a portal login with the same email.
          </p>

          <ol className="space-y-5">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#00aeef] text-white text-sm font-bold flex items-center justify-center">
                1
              </span>
              <div className="flex-1">
                <h2 className="font-bold text-[#1a1d26]">Register on MarketTime</h2>
                <p className="text-sm text-[#5f6980] mt-1 leading-relaxed">
                  Complete the Toys2000 B2B application. Jimmy&apos;s team will review and approve your account.
                </p>
                <a
                  href={MT_SIGNUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #00aeef, #0090c8)',
                    fontFamily: "'Baloo 2', cursive",
                  }}
                >
                  Register with MarketTime
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </li>

            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#f15a24] text-white text-sm font-bold flex items-center justify-center">
                2
              </span>
              <div className="flex-1">
                <h2 className="font-bold text-[#1a1d26]">Create your portal login</h2>
                <p className="text-sm text-[#5f6980] mt-1 leading-relaxed">
                  After registering (or if you&apos;re already approved), create a portal password using the{' '}
                  <strong>same email address</strong> as your MarketTime account.
                </p>
                <Link
                  href="/login?mode=signup"
                  className="inline-block mt-3 px-5 py-2.5 rounded-xl font-bold text-sm text-[#f15a24] border-2 border-[#f15a24] hover:bg-[#fff5f0] transition-colors"
                  style={{ fontFamily: "'Baloo 2', cursive" }}
                >
                  Create portal login
                </Link>
              </div>
            </li>

            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e8ecf2] text-[#5f6980] text-sm font-bold flex items-center justify-center">
                3
              </span>
              <div className="flex-1">
                <h2 className="font-bold text-[#1a1d26]">Browse &amp; order</h2>
                <p className="text-sm text-[#5f6980] mt-1 leading-relaxed">
                  Once approved, sign in to view pricing, place orders, and manage your profile.
                </p>
              </div>
            </li>
          </ol>

          <p className="text-center text-sm text-[#5f6980] mt-8 pt-6 border-t border-black/[0.06]">
            Already have a portal account?{' '}
            <Link href="/login" className="text-[#f15a24] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
