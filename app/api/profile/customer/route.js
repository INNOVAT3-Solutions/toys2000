import { NextResponse } from 'next/server';
import { requireProfileRetailer } from '@/lib/profile-auth';
import { updateCustomer } from '@/lib/markettime';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import {
  buildCustomerUpdatePayload,
  validateCustomerFields,
} from '@/lib/profile-form';

export async function PUT(request) {
  const auth = await requireProfileRetailer();
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const problems = validateCustomerFields(body);
  if (problems.length > 0) {
    return NextResponse.json({ error: problems.join('. ') }, { status: 400 });
  }

  const payload = buildCustomerUpdatePayload(body);

  try {
    const customer = await updateCustomer(auth.retailerId, payload);

    if (payload.name && payload.name !== auth.profile.company_name) {
      await auth.supabase
        .from('profiles')
        .update({ company_name: payload.name })
        .eq('id', auth.user.id);
    }

    return NextResponse.json({ customer });
  } catch (err) {
    console.error('[/api/profile/customer]', err);
    return marketTimeErrorResponse(err);
  }
}
