import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { applyHomeCategoryFilter } from '@/lib/home-categories';
import { CATALOG_PRODUCT_SELECT, CATALOG_COUNT_TYPE } from '@/lib/catalog';
import { getBrowseAccess, getCatalogDb, stripProductsPrices } from '@/lib/browse-access';
import {
  applyActiveProductFilter,
  getActiveManufacturers,
  isActiveManufacturerId,
} from '@/lib/active-manufacturers';

/**
 * GET /api/catalog
 * Returns paginated products. Guests may browse; prices omitted unless approved.
 */
export async function GET(request) {
  const supabase = await createServerSupabaseClient();
  const { showPrices } = await getBrowseAccess(supabase);
  const db = getCatalogDb(supabase, showPrices);

  const { searchParams } = new URL(request.url);
  const manufacturerID = searchParams.get('manufacturer_id');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '48', 10));
  const offset = (page - 1) * limit;

  const activeManufacturers = await getActiveManufacturers(db);
  const activeIds = activeManufacturers.map((m) => m.manufacturer_id);

  if (manufacturerID && !isActiveManufacturerId(manufacturerID, activeManufacturers)) {
    return NextResponse.json({ products: [], total: 0, page, limit, totalPages: 0, showPrices });
  }

  let query = db
    .from('products')
    .select(CATALOG_PRODUCT_SELECT, { count: CATALOG_COUNT_TYPE })
    .eq('show_on_website', true)
    .eq('discontinued', false)
    .range(offset, offset + limit - 1)
    .order('record_id');

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

  const { data, error, count } = await query;

  if (error) {
    console.error('[/api/catalog] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 });
  }

  const products = showPrices ? data : stripProductsPrices(data);

  return NextResponse.json({
    products,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
    showPrices,
  });
}
