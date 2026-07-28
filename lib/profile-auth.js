import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/** Authenticated user with a linked MarketTime retailer ID (admins may pass retailerId). */
export async function requireProfileRetailer(requestedRetailerId = null) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, is_admin, company_name')
    .eq('id', user.id)
    .single();

  if (!profile?.retailer_id) {
    return {
      error: NextResponse.json(
        { error: 'Your portal account is not linked to MarketTime yet.' },
        { status: 403 }
      ),
    };
  }

  if (requestedRetailerId && !profile.is_admin && profile.retailer_id !== requestedRetailerId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { supabase, user, profile, retailerId: profile.retailer_id };
}
