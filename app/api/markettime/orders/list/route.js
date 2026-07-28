import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getOrders } from '@/lib/markettime';
import { NextResponse } from 'next/server';

const PAGE_SIZE = 50;

/**
 * POST /api/markettime/orders/list
 * Returns paginated orders for the authenticated customer from MarketTime.
 */
export async function POST(request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, is_admin, approved')
    .eq('id', user.id)
    .single();

  if (!profile?.retailer_id) {
    return NextResponse.json({ orders: [], hasMore: false });
  }

  if (!profile.is_admin && !profile.approved) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // defaults are fine
  }

  const offset = Math.max(0, Number(body.offset) || 0);
  const recordSize = Math.min(250, Math.max(1, Number(body.recordSize) || PAGE_SIZE));

  const filters = {
    ...(profile.is_admin ? {} : { retailerID: profile.retailer_id }),
    repGroupID: process.env.MT_REP_GROUP_ID,
    offset,
    recordSize,
  };

  try {
    const orders = await getOrders(filters);
    const list = Array.isArray(orders) ? orders : orders?.records ?? [];
    return NextResponse.json({
      orders: list,
      hasMore: list.length === recordSize,
      offset,
      recordSize,
    });
  } catch (err) {
    console.error('[/api/markettime/orders/list]', err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
