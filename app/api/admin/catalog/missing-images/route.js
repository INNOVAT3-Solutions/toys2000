import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { applyActiveProductFilter, getActiveManufacturerIds } from '@/lib/active-manufacturers';

/**
 * GET /api/admin/catalog/missing-images
 * CSV of active catalog products without a primary image.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const db = createAdminClient();
  const activeIds = await getActiveManufacturerIds(db);

  let query = db
    .from('products')
    .select('item_number, name, manufacturer_id, manufacturer_name, primary_image_url')
    .eq('show_on_website', true)
    .eq('discontinued', false);

  query = applyActiveProductFilter(query, activeIds);

  const { data, error } = await query.order('manufacturer_name').order('item_number');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).filter((product) => !product.primary_image_url);
  const lines = [
    'item_number,name,manufacturer_id,manufacturer_name',
    ...rows.map((product) => [
      csvCell(product.item_number),
      csvCell(product.name),
      csvCell(product.manufacturer_id),
      csvCell(product.manufacturer_name),
    ].join(',')),
  ];

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="catalog-missing-images.csv"',
    },
  });
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
