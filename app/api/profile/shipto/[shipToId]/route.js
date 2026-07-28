import { NextResponse } from 'next/server';
import { requireProfileRetailer } from '@/lib/profile-auth';
import { updateCustomerShipTo } from '@/lib/markettime';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import {
  buildShipToUpdatePayload,
  validateShipToFields,
} from '@/lib/profile-form';

export async function PUT(request, { params }) {
  const { shipToId } = await params;
  const auth = await requireProfileRetailer();
  if (auth.error) return auth.error;

  if (!shipToId) {
    return NextResponse.json({ error: 'Ship-to ID is required' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const problems = validateShipToFields(body);
  if (problems.length > 0) {
    return NextResponse.json({ error: problems.join('. ') }, { status: 400 });
  }

  const payload = buildShipToUpdatePayload(body, { isPrimary: Boolean(body.isPrimary) });

  try {
    const shipTo = await updateCustomerShipTo(auth.retailerId, shipToId, payload);
    return NextResponse.json({ shipTo });
  } catch (err) {
    console.error('[/api/profile/shipto]', err);
    return marketTimeErrorResponse(err);
  }
}
