import Link from 'next/link';

export default function InactiveVendorCheckout({ manufacturerName }) {
  return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
          Vendor not available
        </h1>
        <p className="text-[#5f6980] text-sm leading-relaxed">
          <strong>{manufacturerName}</strong> is not one of the active Toys2000 rep lines.
          Remove these items from your cart or browse an available brand.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/cart"
            className="px-6 py-3 rounded-xl font-semibold text-white no-underline"
            style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
          >
            Back to cart
          </Link>
          <Link href="/catalog/brands" className="px-6 py-3 rounded-xl font-semibold text-[#1a1d26] border border-gray-200 no-underline hover:bg-white">
            Browse brands
          </Link>
        </div>
      </div>
    </div>
  );
}
