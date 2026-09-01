import { findCustomerByEmail } from '@/lib/find-markettime-customer';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/verify-markettime-email
 * Public. Checks whether an email has a MarketTime customer record before portal signup.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  }

  try {
    const customer = await findCustomerByEmail(email);
    if (!customer) {
      return NextResponse.json({
        eligible: false,
        reason: 'not_found',
        message: 'No MarketTime registration was found for this email. Complete Toys2000 signup first, then create your portal login.',
      });
    }

    return NextResponse.json({
      eligible: true,
      retailerID: customer.recordID,
      companyName: customer.name ?? customer.dba ?? null,
    });
  } catch (err) {
    console.error('[/api/auth/verify-markettime-email]', err.message);
    if (err.message?.includes('401')) return marketTimeErrorResponse(err);
    return NextResponse.json({
      eligible: false,
      reason: 'api_error',
      message: 'Could not verify your MarketTime registration right now. Please try again in a few minutes.',
    }, { status: 503 });
  }
}
