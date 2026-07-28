import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCustomer } from '@/lib/markettime';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Users can only fetch their own customer record
  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, is_admin')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.is_admin;
  const userRetailerId = profile?.retailer_id;

  if (!isAdmin && userRetailerId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const customer = await getCustomer(id);
    return NextResponse.json({ customer });
  } catch (err) {
    console.error('[/api/markettime/customer]', err);
    return marketTimeErrorResponse(err);
  }
}
