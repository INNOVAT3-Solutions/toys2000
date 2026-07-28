import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getManufacturerShippingMethods } from '@/lib/markettime';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const shippingMethods = await getManufacturerShippingMethods(id);
    return NextResponse.json({ shippingMethods });
  } catch (err) {
    console.error('[/api/markettime/manufacturer/shipping]', err);
    return marketTimeErrorResponse(err);
  }
}
