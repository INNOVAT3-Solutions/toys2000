import { requireAdmin } from '@/lib/admin-auth';
import { listPendingCustomers } from '@/lib/find-markettime-customer';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import {
  listLocalPendingApplications,
  syncPendingApplicationsFromMarketTime,
} from '@/lib/pending-applications';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/customers/pending
 * Fast path (default): pending website applications from Supabase.
 * Query: ?all=1 — slow full MarketTime scan (imports + web).
 * Query: ?sync=1 — pull web-tagged MT customers into Supabase, then return local list.
 */
export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === '1';
  const sync = searchParams.get('sync') === '1';

  try {
    if (all) {
      const customers = await listPendingCustomers({ webOnly: false });
      return NextResponse.json({
        customers,
        count: customers.length,
        webOnly: false,
        source: 'markettime',
      });
    }

    if (sync) {
      const syncResult = await syncPendingApplicationsFromMarketTime();
      const customers = await listLocalPendingApplications();
      return NextResponse.json({
        customers,
        count: customers.length,
        webOnly: true,
        source: 'local',
        sync: syncResult,
      });
    }

    const customers = await listLocalPendingApplications();
    return NextResponse.json({
      customers,
      count: customers.length,
      webOnly: true,
      source: 'local',
    });
  } catch (err) {
    console.error('[/api/admin/customers/pending]', err);
    if (err.message?.includes('401')) return marketTimeErrorResponse(err);
    if (err.message?.includes('pending_applications') || err.code === '42P01') {
      return NextResponse.json({
        error: 'Pending applications table is missing. Run supabase/migrations/20260831_pending_applications.sql in the Supabase SQL editor.',
        code: 'migration_required',
      }, { status: 503 });
    }
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
