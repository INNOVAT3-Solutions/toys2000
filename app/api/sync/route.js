import { runCatalogSync } from '@/lib/sync-catalog';
import { NextResponse } from 'next/server';

export const maxDuration = 300;

function isAuthorized(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Sync] CRON_SECRET is not configured');
    return false;
  }
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * GET /api/sync
 * Called by Vercel cron (daily at 4am UTC).
 * Always runs as a delta sync from yesterday.
 */
export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const modifiedStartDate = yesterday.toISOString().split('T')[0];

  return runCatalogSync({ modifiedStartDate, isFull: false });
}

/**
 * POST /api/sync
 * Admin-triggered sync — requires Authorization: Bearer {CRON_SECRET}
 *
 * Query params:
 *   modifiedStartDate (optional) — ISO date string for delta sync e.g. "2026-04-22"
 *   full=true — force a full re-pull with no date filter
 */
export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const modifiedStartDate = searchParams.get('modifiedStartDate');
  const isFull = searchParams.get('full') === 'true';

  return runCatalogSync({ modifiedStartDate, isFull });
}
