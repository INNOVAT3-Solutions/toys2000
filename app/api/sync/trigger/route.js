import { createServerSupabaseClient } from '@/lib/supabase-server';
import { runCatalogSync } from '@/lib/sync-catalog';
import { NextResponse } from 'next/server';

export const maxDuration = 300;

/**
 * POST /api/sync/trigger
 * Admin-only UI trigger for manual catalog sync.
 * Verifies the user is logged in and has is_admin = true,
 * then runs the sync in-process (avoids HTTP self-fetch timeouts).
 *
 * Pass ?full=true for a full re-pull (no modifiedStartDate).
 * Default is a delta sync from yesterday.
 */
export async function POST(request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const full = searchParams.get('full') === 'true';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const modifiedStartDate = yesterday.toISOString().split('T')[0];

  return runCatalogSync({
    modifiedStartDate: full ? null : modifiedStartDate,
    isFull: full,
  });
}
