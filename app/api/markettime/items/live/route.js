import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchLiveItemSnapshot, fetchLiveItemSnapshots } from '@/lib/live-item';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import { NextResponse } from 'next/server';

/**
 * GET /api/markettime/items/live?id=123
 * POST /api/markettime/items/live  { itemIDs: ["123", ...] }
 *
 * Returns live MarketTime unit price + availability for cart/checkout.
 */
export async function GET(request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
  }

  try {
    const snapshot = await fetchLiveItemSnapshot(id);
    return NextResponse.json({ item: snapshot });
  } catch (err) {
    console.error('[/api/markettime/items/live GET]', err);
    return marketTimeErrorResponse(err);
  }
}

export async function POST(request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const itemIDs = Array.isArray(body?.itemIDs) ? body.itemIDs : [];
  if (!itemIDs.length) {
    return NextResponse.json({ error: 'itemIDs array is required' }, { status: 400 });
  }
  if (itemIDs.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 itemIDs per request' }, { status: 400 });
  }

  try {
    const items = await fetchLiveItemSnapshots(itemIDs);
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[/api/markettime/items/live POST]', err);
    return marketTimeErrorResponse(err);
  }
}
