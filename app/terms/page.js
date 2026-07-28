import Link from 'next/link';

export const metadata = { title: 'Terms of Use — Toys2000 Wholesale' };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/" className="text-sm font-semibold text-[#f15a24] hover:underline">← Back to home</Link>
        <h1 className="text-3xl font-bold text-[#1a1d26] mt-6" style={{ fontFamily: "'Baloo 2', cursive" }}>
          Terms of Use
        </h1>
        <div className="mt-8 bg-white rounded-2xl border border-black/[0.06] p-6 sm:p-8 space-y-4 text-sm text-[#5f6980] leading-relaxed">
          <p>
            This wholesale portal is provided by Toys2000 for approved retailers only. By using this site you agree to place orders in accordance with each vendor&apos;s terms, minimums, and shipping policies as shown at checkout.
          </p>
          <p>
            Product availability, pricing, and payment terms are set by individual manufacturers in MarketTime and may change without notice. Orders are subject to vendor acceptance.
          </p>
          <p>
            Account access is granted at Toys2000&apos;s discretion. Misuse of the portal, sharing credentials, or attempting to manipulate pricing or order data may result in account suspension.
          </p>
          <p>
            For account or order questions, contact your Toys2000 sales representative.
          </p>
        </div>
      </div>
    </div>
  );
}
