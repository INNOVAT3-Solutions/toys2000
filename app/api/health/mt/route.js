import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { keyFingerprint, probeMarketTimeKey } from '@/lib/mt-key-utils';

/**
 * GET /api/health/mt
 * Auth: Authorization: Bearer {CRON_SECRET}
 * Probes MarketTime with the deployment's MT_API_KEY (Vercel env).
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await probeMarketTimeKey();

    if (!result.ok) {
      console.error('[health/mt] MarketTime probe failed', {
        status: result.status,
        fingerprint: result.fingerprint,
        checkedAt: result.checkedAt,
      });
    }

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      fingerprint: result.fingerprint,
      repGroupId: result.repGroupId,
      checkedAt: result.checkedAt,
    }, { status: result.ok ? 200 : 503 });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err.message,
      fingerprint: process.env.MT_API_KEY ? keyFingerprint(process.env.MT_API_KEY.trim()) : null,
      checkedAt: new Date().toISOString(),
    }, { status: 503 });
  }
}
