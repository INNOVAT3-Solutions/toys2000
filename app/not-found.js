import Link from 'next/link';

export const metadata = { title: 'Page not found — Toys2000 Wholesale' };

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-[#f15a24]" style={{ fontFamily: "'Baloo 2', cursive" }}>404</p>
        <h1 className="text-2xl font-bold text-[#1a1d26] mt-4" style={{ fontFamily: "'Baloo 2', cursive" }}>
          Page not found
        </h1>
        <p className="text-[#5f6980] mt-2 text-sm">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            href="/catalog"
            className="px-6 py-3 rounded-xl font-semibold text-white no-underline"
            style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
          >
            Browse catalog
          </Link>
          <Link href="/" className="px-6 py-3 rounded-xl font-semibold text-[#1a1d26] border border-gray-200 no-underline hover:bg-white">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
