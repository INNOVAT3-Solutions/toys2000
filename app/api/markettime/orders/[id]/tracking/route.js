import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getOrderByRecordId, getOrderTracking } from '@/lib/markettime';
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

  if (!profile?.retailer_id && !profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    if (!profile.is_admin) {
      const owned = await getOrderByRecordId(profile.retailer_id, id);
      if (!owned) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
    }

    const tracking = await getOrderTracking(id);
    return NextResponse.json({ tracking });
  } catch (err) {
    console.error('[/api/markettime/orders/tracking]', err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
