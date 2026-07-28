import { createServerSupabaseClient } from '@/lib/supabase-server';
import { CATALOG_PRODUCT_SELECT, CATALOG_COUNT_TYPE } from '@/lib/catalog';
import { getBrowseAccess, getCatalogDb, stripProductsPrices } from '@/lib/browse-access';
import {
  applyActiveProductFilter,
  getActiveManufacturers,
  isActiveManufacturerId,
} from '@/lib/active-manufacturers';

export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import CatalogGrid from '../CatalogGrid';

export async function generateMetadata({ params }) {
  const { brand } = await params;
  return { title: `${decodeURIComponent(brand)} — Toys2000 Wholesale` };
}

export default async function BrandCatalogPage({ params }) {
  const { brand } = await params;
  const supabase = await createServerSupabaseClient();
  const { showPrices } = await getBrowseAccess(supabase);
  const db = getCatalogDb(supabase, showPrices);

  const manufacturerID = decodeURIComponent(brand);
  const manufacturers = await getActiveManufacturers(db);

  if (!isActiveManufacturerId(manufacturerID, manufacturers)) {
    notFound();
  }

  const [mfrResult, productsResult] = await Promise.all([
    db.from('manufacturers').select('*').eq('manufacturer_id', manufacturerID).single(),
    applyActiveProductFilter(
      db
        .from('products')
        .select(CATALOG_PRODUCT_SELECT, { count: CATALOG_COUNT_TYPE })
        .eq('manufacturer_id', manufacturerID)
        .eq('show_on_website', true)
        .eq('discontinued', false)
        .order('record_id')
        .range(0, 47),
      [manufacturerID]
    ),
  ]);

  if (mfrResult.error || !mfrResult.data) notFound();

  const manufacturer = mfrResult.data;
  const products = showPrices
    ? (productsResult.data ?? [])
    : stripProductsPrices(productsResult.data);
  const total = productsResult.count ?? 0;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="bg-white border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex items-center gap-6">
          {manufacturer.logo_url && (
            <Image
              src={manufacturer.logo_url}
              alt={manufacturer.name}
              width={120}
              height={60}
              className="object-contain"
              style={{ width: 'auto', height: '3.5rem' }}
            />
          )}
          <div>
            <Link href="/catalog/brands" className="text-xs text-[#5f6980] hover:text-[#f15a24] transition-colors">
              ← All Brands
            </Link>
            <h1 className="text-3xl font-bold text-[#1a1d26] mt-1" style={{ fontFamily: "'Baloo 2', cursive" }}>
              {manufacturer.name}
            </h1>
            <p className="text-sm text-[#5f6980] mt-0.5">{total.toLocaleString()} products</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <CatalogGrid
          initialProducts={products}
          initialTotal={total}
          manufacturers={manufacturers}
          initialFilters={{ manufacturerID, category: null, search: null }}
          showPrices={showPrices}
        />
      </div>
    </div>
  );
}
