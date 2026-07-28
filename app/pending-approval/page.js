import Image from 'next/image';
import Link from 'next/link';

// Shown to users who have signed up but whose profile.approved flag is still
// false. The proxy redirects all non-public routes here, so this is the
// holding-pen page until an admin links their MarketTime retailerID and flips
// approved = true.
export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa] px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-black/[0.06] shadow-sm p-8 text-center">
        <Image
          src="/logos/toys_2000_logo.png"
          alt="Toys2000"
          width={140}
          height={48}
          className="h-10 w-auto object-contain mx-auto mb-6"
        />

        <h1
          className="text-2xl font-bold text-[#1a1d26] mb-3"
          style={{ fontFamily: "'Baloo 2', cursive" }}
        >
          Account pending approval
        </h1>

        <p className="text-sm text-[#5f6980] leading-relaxed mb-4">
          Thanks for signing up. Your account is waiting for review by the
          Toys2000 team. Once your MarketTime retailer profile is approved, you&apos;ll get
          full access to the catalog, pricing, and ordering.
        </p>

        <p className="text-sm text-[#5f6980] leading-relaxed mb-6">
          Haven&apos;t completed MarketTime registration yet?{' '}
          <Link href="/register" className="text-[#00aeef] font-semibold hover:underline">
            Start here
          </Link>
          . You can also{' '}
          <Link href="/profile" className="text-[#00aeef] font-semibold hover:underline">
            view your profile
          </Link>
          {' '}to see if your MarketTime account is linked.
        </p>

        <p className="text-xs text-[#8b94a8] mb-8">
          Questions? Email{' '}
          <a
            href="mailto:jimmy@toys2000.com"
            className="text-[#00aeef] font-semibold hover:underline"
          >
            jimmy@toys2000.com
          </a>
          .
        </p>

        <Link
          href="/"
          className="inline-block bg-[#f15a24] text-white font-bold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
          style={{ fontFamily: "'Baloo 2', cursive" }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
