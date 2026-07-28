import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getManufacturer, getManufacturerPromotions } from '@/lib/markettime';
import {
  getManufacturerMinimum,
  getManufacturerReorderMinimum,
  normalizePromotions,
} from '@/lib/manufacturer-checkout';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [manufacturer, promotionsResponse] = await Promise.all([
      getManufacturer(id),
      getManufacturerPromotions(id),
    ]);

    const promotions = normalizePromotions(promotionsResponse);

    return NextResponse.json({
      manufacturerID: id,
      minimumOrderAmount: getManufacturerMinimum(manufacturer),
      minimumReorderAmount: getManufacturerReorderMinimum(manufacturer),
      promotions,
    });
  } catch (err) {
    console.error('[/api/markettime/manufacturer/checkout-info]', err);
    return marketTimeErrorResponse(err);
  }
}
