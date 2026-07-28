import { runCustomerSync } from '@/lib/sync-customers';
import { NextResponse } from 'next/server';

function isAuthorized(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Customer sync] CRON_SECRET is not configured');
    return false;
  }
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * GET /api/sync/customers
 * Called by Vercel cron daily after catalog sync.
 */
export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return runSync();
}

/**
 * POST /api/sync/customers
 * Manual trigger with Authorization: Bearer {CRON_SECRET}
 */
export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return runSync();
}

async function runSync() {
  const startedAt = new Date().toISOString();

  try {
    const result = await runCustomerSync();
    return NextResponse.json({ ...result, startedAt, finishedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[Customer sync]', err);
    return NextResponse.json(
      { success: false, error: err.message, startedAt, finishedAt: new Date().toISOString() },
      { status: 500 }
    );
  }
}
