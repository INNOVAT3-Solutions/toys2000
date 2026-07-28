import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCustomerShipTos } from '@/lib/markettime';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin && profile?.retailer_id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const shipTos = await getCustomerShipTos(id);
    return NextResponse.json({ shipTos });
  } catch (err) {
    console.error('[/api/markettime/customer/shiptos]', err);
    return marketTimeErrorResponse(err);
  }
}
