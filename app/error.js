'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-[#f15a24]" style={{ fontFamily: "'Baloo 2', cursive" }}>!</p>
        <h1 className="text-2xl font-bold text-[#1a1d26] mt-4" style={{ fontFamily: "'Baloo 2', cursive" }}>
          Something went wrong
        </h1>
        <p className="text-[#5f6980] mt-2 text-sm">
          An unexpected error occurred. Try again, or return to the catalog.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl font-semibold text-white cursor-pointer border-0"
            style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
          >
            Try again
          </button>
          <Link href="/catalog" className="px-6 py-3 rounded-xl font-semibold text-[#1a1d26] border border-gray-200 no-underline hover:bg-white">
            Browse catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
