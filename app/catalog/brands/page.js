import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getBrowseAccess, getCatalogDb } from '@/lib/browse-access';
import { getActiveManufacturers } from '@/lib/active-manufacturers';
import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Brands — Toys2000 Wholesale' };

export default async function BrandsPage() {
  const supabase = await createServerSupabaseClient();
  const { showPrices } = await getBrowseAccess(supabase);
  const db = getCatalogDb(supabase, showPrices);

  const manufacturers = await getActiveManufacturers(db);

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <Link href="/catalog" className="text-sm text-[#5f6980] hover:text-[#f15a24] transition-colors">
            ← Back to catalog
          </Link>
          <h1
            className="text-3xl font-bold text-[#1a1d26] mt-2"
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            Our Brands
          </h1>
          <p className="text-sm text-[#5f6980] mt-1">
            {manufacturers.length} brands represented by Toys2000
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {manufacturers.map((mfr) => (
            <Link
              key={mfr.manufacturer_id}
              href={`/catalog/${mfr.manufacturer_id}`}
              className="bg-white rounded-2xl border border-black/[0.06] p-5 flex flex-col items-center justify-center gap-3 min-h-[140px] hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              {mfr.logo_url ? (
                <Image
                  src={mfr.logo_url}
                  alt={mfr.name}
                  width={120}
                  height={60}
                  className="h-12 object-contain group-hover:scale-105 transition-transform"
                  style={{ width: 'auto', height: '3rem' }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)', fontFamily: "'Baloo 2', cursive" }}
                >
                  {mfr.name.charAt(0)}
                </div>
              )}
              <span className="text-sm font-semibold text-[#1a1d26] text-center leading-tight">
                {mfr.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
