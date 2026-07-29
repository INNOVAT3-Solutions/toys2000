import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { fetchActiveMarketingPromotions } from '@/lib/marketing-promotions';
import { buildPromoGroupsFromDeals } from '@/lib/promo-groups';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';

export const dynamic = 'force-dynamic';

const CACHE_MS = 15 * 60 * 1000;
let cache = { at: 0, payload: null };

/**
 * GET /api/promotions
 * Public list of currently active MarketTime promotions (date-filtered).
 */
export async function GET() {
  try {
    if (cache.payload && Date.now() - cache.at < CACHE_MS) {
      return NextResponse.json(cache.payload);
    }

    const db = createAdminClient();
    const deals = await fetchActiveMarketingPromotions(db);
    const groups = buildPromoGroupsFromDeals(deals);
    const payload = { deals, groups };

    cache = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[/api/promotions]', err);
    return marketTimeErrorResponse(err);
  }
}
