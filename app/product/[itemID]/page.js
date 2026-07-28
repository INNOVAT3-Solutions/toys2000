import { createServerSupabaseClient } from '@/lib/supabase-server';
import { CATALOG_PRODUCT_SELECT, CATALOG_PRODUCT_DETAIL_SELECT } from '@/lib/catalog';
import { getBrowseAccess, getCatalogDb, stripProductPrices, stripProductsPrices } from '@/lib/browse-access';
import { getActiveManufacturers, isActiveManufacturerId } from '@/lib/active-manufacturers';

export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import ProductDetail from './ProductDetail';

export async function generateMetadata({ params }) {
  const { itemID } = await params;
  const supabase = await createServerSupabaseClient();
  const { showPrices } = await getBrowseAccess(supabase);
  const db = getCatalogDb(supabase, showPrices);
  const { data } = await db
    .from('products')
    .select('name, manufacturer_name')
    .eq('record_id', itemID)
    .single();
  return { title: data ? `${data.name} — Toys2000` : 'Product — Toys2000' };
}

export default async function ProductPage({ params }) {
  const { itemID } = await params;
  const supabase = await createServerSupabaseClient();
  const { showPrices } = await getBrowseAccess(supabase);
  const db = getCatalogDb(supabase, showPrices);
  const activeManufacturers = await getActiveManufacturers(db);

  const { data: product, error } = await db
    .from('products')
    .select(CATALOG_PRODUCT_DETAIL_SELECT)
    .eq('record_id', itemID)
    .eq('show_on_website', true)
    .eq('discontinued', false)
    .single();

  if (error || !product || !isActiveManufacturerId(product.manufacturer_id, activeManufacturers)) {
    notFound();
  }

  const { data: relatedRaw } = await db
    .from('products')
    .select('record_id, name, unit_price, primary_image_url, manufacturer_name, minimum_quantity')
    .eq('manufacturer_id', product.manufacturer_id)
    .eq('show_on_website', true)
    .eq('discontinued', false)
    .neq('record_id', product.record_id)
    .limit(6);

  const safeProduct = showPrices ? product : stripProductPrices(product);
  const related = showPrices ? (relatedRaw ?? []) : stripProductsPrices(relatedRaw);

  return <ProductDetail product={safeProduct} related={related} showPrices={showPrices} />;
}
