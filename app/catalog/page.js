import { createServerSupabaseClient } from '@/lib/supabase-server';
import { CATALOG_PRODUCT_SELECT, CATALOG_COUNT_TYPE } from '@/lib/catalog';
import { getBrowseAccess, getCatalogDb, stripProductsPrices } from '@/lib/browse-access';
import { applyHomeCategoryFilter, getHomeCategory } from '@/lib/home-categories';
import {
  applyActiveProductFilter,
  findActiveManufacturerByBrandParam,
  getActiveManufacturers,
  isActiveManufacturerId,
} from '@/lib/active-manufacturers';

export const dynamic = 'force-dynamic';
import CatalogGrid from './CatalogGrid';

export const metadata = { title: 'Catalog — Toys2000 Wholesale' };

export default async function CatalogPage({ searchParams }) {
  const supabase = await createServerSupabaseClient();
  const { showPrices } = await getBrowseAccess(supabase);
  const db = getCatalogDb(supabase, showPrices);

  const params = await searchParams;
  let manufacturerID = params.manufacturer_id || null;
  const category = params.category || null;
  const search = params.search || null;
  const homeCategory = getHomeCategory(category);

  const manufacturers = await getActiveManufacturers(db);
  const activeIds = manufacturers.map((m) => m.manufacturer_id);

  if (!manufacturerID && params.brand) {
    const mfr = findActiveManufacturerByBrandParam(manufacturers, params.brand);
    manufacturerID = mfr?.manufacturer_id ?? null;
  }

  if (manufacturerID && !isActiveManufacturerId(manufacturerID, manufacturers)) {
    manufacturerID = null;
  }

  let query = db
    .from('products')
    .select(CATALOG_PRODUCT_SELECT, { count: CATALOG_COUNT_TYPE })
    .eq('show_on_website', true)
    .eq('discontinued', false)
    .order('record_id')
    .range(0, 47);

  query = applyActiveProductFilter(query, activeIds);

  if (manufacturerID) {
    query = query.eq('manufacturer_id', manufacturerID);
  } else if (category) {
    ({ query } = await applyHomeCategoryFilter(db, query, category));
  }

  if (search) {
    const term = search.replace(/[%_]/g, '\\$&');
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const productsResult = await query;

  const products = showPrices
    ? (productsResult.data ?? [])
    : stripProductsPrices(productsResult.data);
  const total = productsResult.count ?? 0;

  const pageTitle = manufacturerID
    ? manufacturers.find((m) => m.manufacturer_id === manufacturerID)?.name ?? 'Brand Catalog'
    : homeCategory?.name ?? 'All Products';

  return (
    <div className="min-h-screen bg-[#f7f8fa] products-page">
      <div className="products-layout-container">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
              {pageTitle}
            </h1>
            <p className="text-sm text-[#5f6980] mt-1">{total.toLocaleString()} products</p>
            {homeCategory && (
              <p className="text-xs text-[#5f6980] mt-1">{homeCategory.description}</p>
            )}
          </div>
        </div>

        <CatalogGrid
          initialProducts={products}
          initialTotal={total}
          manufacturers={manufacturers}
          initialFilters={{ manufacturerID, category, search }}
          categoryLabel={homeCategory?.name ?? null}
          showPrices={showPrices}
        />
      </div>
    </div>
  );
}
