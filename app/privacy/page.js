import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — Toys2000 Wholesale' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/" className="text-sm font-semibold text-[#f15a24] hover:underline">← Back to home</Link>
        <h1 className="text-3xl font-bold text-[#1a1d26] mt-6" style={{ fontFamily: "'Baloo 2', cursive" }}>
          Privacy Policy
        </h1>
        <div className="mt-8 bg-white rounded-2xl border border-black/[0.06] p-6 sm:p-8 space-y-4 text-sm text-[#5f6980] leading-relaxed">
          <p>
            Toys2000 collects account information (company name, email) to authenticate users and link your portal account to your MarketTime retailer profile.
          </p>
          <p>
            Order and cart data are stored in Supabase and transmitted to MarketTime when you place an order. We do not collect payment card information through this portal — vendors arrange payment directly under their stated terms.
          </p>
          <p>
            We use industry-standard hosting and authentication providers. Access to wholesale pricing and order history is limited to authenticated, approved retailer accounts.
          </p>
          <p>
            For privacy requests or data questions, contact your Toys2000 sales representative.
          </p>
        </div>
      </div>
    </div>
  );
}
