import { NextResponse } from 'next/server';
import { requireProfileRetailer } from '@/lib/profile-auth';
import { updateCustomerContact } from '@/lib/markettime';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import {
  buildContactUpdatePayload,
  validateContactFields,
} from '@/lib/profile-form';

export async function PUT(request, { params }) {
  const { contactId } = await params;
  const auth = await requireProfileRetailer();
  if (auth.error) return auth.error;

  if (!contactId) {
    return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const problems = validateContactFields(body);
  if (problems.length > 0) {
    return NextResponse.json({ error: problems.join('. ') }, { status: 400 });
  }

  const payload = buildContactUpdatePayload(body, { isPrimary: Boolean(body.isPrimary) });

  try {
    const contact = await updateCustomerContact(auth.retailerId, contactId, payload);
    return NextResponse.json({ contact });
  } catch (err) {
    console.error('[/api/profile/contact]', err);
    return marketTimeErrorResponse(err);
  }
}
