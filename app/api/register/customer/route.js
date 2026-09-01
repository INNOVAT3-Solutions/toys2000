import {
  buildRegistrationCustomerPayload,
  parseRegistrationInput,
} from '@/lib/build-registration-payload';
import { createCustomerWithRetry } from '@/lib/customer-upload';
import {
  clearMarketTimeCustomerEmailCache,
  findCustomerByEmail,
} from '@/lib/find-markettime-customer';
import { getMarketTimeConfig } from '@/lib/markettime-config';
import { marketTimeErrorResponse } from '@/lib/markettime-errors';
import {
  assignSalespersonToCustomerShipTo,
  createCustomer,
} from '@/lib/markettime';
import { notifyNewRegistration } from '@/lib/notify-registration';
import {
  findPendingApplicationByEmail,
  recordPendingApplication,
} from '@/lib/pending-applications';
import { NextResponse } from 'next/server';

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
const recentByIp = new Map();

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  const stamps = (recentByIp.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (stamps.length >= RATE_LIMIT) {
    recentByIp.set(ip, stamps);
    return true;
  }
  stamps.push(now);
  recentByIp.set(ip, stamps);
  return false;
}

/**
 * POST /api/register/customer
 * Public. Creates an unapproved MarketTime customer from the website form.
 * Jimmy approves via /admin → Pending Applications (not MarketTime B2B Registrants).
 */
export async function POST(request) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseRegistrationInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.errors.join('. ') }, { status: 400 });
  }

  const { data } = parsed;

  try {
    // Fast duplicate checks first (avoid a ~40s MarketTime full scan on every signup).
    let existingPending = null;
    try {
      existingPending = await findPendingApplicationByEmail(data.email);
    } catch (pendingErr) {
      console.warn('[/api/register/customer] pending lookup skipped:', pendingErr.message);
    }
    if (existingPending) {
      return NextResponse.json({
        error: 'An application with this email is already pending approval.',
        code: 'already_exists',
        retailerID: existingPending.retailer_id,
      }, { status: 409 });
    }

    const existing = await findCustomerByEmail(data.email, { allowSlowScan: false });
    if (existing) {
      return NextResponse.json({
        error: 'A MarketTime account already exists for this email. If you already applied, wait for approval or create your portal login.',
        code: 'already_exists',
        retailerID: existing.recordID,
      }, { status: 409 });
    }

    const salespersonId = getMarketTimeConfig().salespersonId;
    const payload = buildRegistrationCustomerPayload(data);

    const result = await createCustomerWithRetry(createCustomer, payload, {
      assignSalesperson: salespersonId ? assignSalespersonToCustomerShipTo : null,
      salespersonId: salespersonId || null,
      approveCustomer: null,
    });

    clearMarketTimeCustomerEmailCache();

    if (!result.ok) {
      console.error('[/api/register/customer] create failed:', result.detail);
      return NextResponse.json(
        { error: 'Could not submit your application. Please try again or email jimmy@toys2000.com.' },
        { status: 502 }
      );
    }

    try {
      await recordPendingApplication({
        retailerId: result.recordID,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        contactName: `${data.firstName} ${data.lastName}`,
        city: data.city,
        state: data.state,
        address1: data.address1,
        website: data.website,
        taxId: data.taxId,
      });
    } catch (localErr) {
      console.error('[/api/register/customer] pending_applications insert failed:', localErr.message);
    }

    try {
      await notifyNewRegistration({
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        city: data.city,
        state: data.state,
        contactName: `${data.firstName} ${data.lastName}`,
        taxId: data.taxId,
        recordID: result.recordID,
      });
    } catch (emailErr) {
      console.warn('[/api/register/customer] notify failed:', emailErr.message);
    }

    return NextResponse.json({
      success: true,
      recordID: result.recordID,
      message: 'Application submitted. Our team will review and approve your account shortly.',
    });
  } catch (err) {
    console.error('[/api/register/customer]', err);
    if (err.message?.includes('401')) return marketTimeErrorResponse(err);
    return NextResponse.json(
      { error: 'Could not submit your application. Please try again later.' },
      { status: 502 }
    );
  }
}
