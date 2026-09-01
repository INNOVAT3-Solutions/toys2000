import { requireAdmin } from '@/lib/admin-auth';
import { clearMarketTimeCustomerEmailCache } from '@/lib/find-markettime-customer';
import { denyCustomerForRepGroup } from '@/lib/markettime';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import { markPendingApplicationRejected } from '@/lib/pending-applications';
import { NextResponse } from 'next/server';

const RATE_LIMIT_MS = 300;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST /api/admin/customers/deny
 * Deny pending MarketTime customers (inactive + unapproved) and mark local applications rejected.
 */
export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const retailerIds = body.retailerIds;
  if (!Array.isArray(retailerIds) || retailerIds.length === 0) {
    return NextResponse.json({ error: 'retailerIds array is required' }, { status: 400 });
  }

  if (retailerIds.length > 100) {
    return NextResponse.json({ error: 'Maximum 100 customers per request' }, { status: 400 });
  }

  const results = [];

  try {
    for (let i = 0; i < retailerIds.length; i += 1) {
      const retailerID = String(retailerIds[i]).trim();
      if (!retailerID) continue;

      try {
        await denyCustomerForRepGroup(retailerID);
        try {
          await markPendingApplicationRejected(retailerID);
        } catch (localErr) {
          console.warn('[/api/admin/customers/deny] local pending update skipped:', localErr.message);
        }
        results.push({ retailerID, ok: true });
      } catch (err) {
        results.push({ retailerID, ok: false, error: err.message });
      }

      if (i < retailerIds.length - 1) await sleep(RATE_LIMIT_MS);
    }

    clearMarketTimeCustomerEmailCache();

    return NextResponse.json({
      results,
      denied: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    });
  } catch (err) {
    console.error('[/api/admin/customers/deny]', err);
    if (err.message?.includes('401')) return marketTimeErrorResponse(err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
