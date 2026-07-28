import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSalespeople } from '@/lib/markettime';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';

/**
 * GET /api/admin/salespeople
 * Active MarketTime salespeople for bulk-import rep assignment.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const records = await getSalespeople();
    const salespeople = records
      .filter((person) => person.active !== false && person.recordDeleted !== true)
      .map((person) => ({
        recordID: person.recordID,
        name: person.name,
        email: person.email ?? null,
        abbreviation: person.abbreviation ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ salespeople });
  } catch (err) {
    console.error('[/api/admin/salespeople]', err);
    return marketTimeErrorResponse(err);
  }
}
