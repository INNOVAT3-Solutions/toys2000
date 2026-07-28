import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getBrowseAccess, getCatalogDb } from '@/lib/browse-access';
import { getActiveManufacturers } from '@/lib/active-manufacturers';

/** GET /api/manufacturers — public brand list for catalog filters. */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { showPrices } = await getBrowseAccess(supabase);
  const db = getCatalogDb(supabase, showPrices);

  try {
    const manufacturers = await getActiveManufacturers(db);
    return NextResponse.json({ manufacturers });
  } catch (error) {
    console.error('[/api/manufacturers] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch manufacturers' }, { status: 500 });
  }
}
