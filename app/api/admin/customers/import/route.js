import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { clearMarketTimeCustomerEmailCache } from '@/lib/find-markettime-customer';
import { assignSalespersonToCustomerShipTo, approveCustomerForRepGroup, createCustomer } from '@/lib/markettime';
import { getMarketTimeConfig } from '@/lib/markettime-config';
import { importCustomerBatch, IMPORT_BATCH_SIZE } from '@/lib/customer-upload';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';

/**
 * POST /api/admin/customers/import
 * Admin-only. Create customers in MarketTime in small batches.
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

  const items = body.rows;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
  }

  if (items.length > IMPORT_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Maximum ${IMPORT_BATCH_SIZE} rows per request` },
      { status: 400 }
    );
  }

  for (const item of items) {
    if (item.index == null || !item.payload?.name) {
      return NextResponse.json({ error: 'Each row needs index and payload' }, { status: 400 });
    }
  }

  const salespersonId = body.salespersonId?.trim() || getMarketTimeConfig().salespersonId;

  if (!salespersonId) {
    return NextResponse.json(
      { error: 'salespersonId is required (select a rep or set MT_SALESPERSON_ID)' },
      { status: 400 }
    );
  }

  try {
    const results = await importCustomerBatch(createCustomer, items, {
      assignSalesperson: assignSalespersonToCustomerShipTo,
      salespersonId,
      approveCustomer: approveCustomerForRepGroup,
    });
    clearMarketTimeCustomerEmailCache();
    return NextResponse.json({ results, salespersonId });
  } catch (err) {
    console.error('[/api/admin/customers/import]', err);
    if (err.message?.includes('401')) {
      return marketTimeErrorResponse(err);
    }
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
