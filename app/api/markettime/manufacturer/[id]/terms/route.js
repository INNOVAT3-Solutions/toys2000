import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getManufacturerPaymentTerms } from '@/lib/markettime';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const terms = await getManufacturerPaymentTerms(id);
    return NextResponse.json({ terms });
  } catch (err) {
    console.error('[/api/markettime/manufacturer/terms]', err);
    return marketTimeErrorResponse(err);
  }
}
