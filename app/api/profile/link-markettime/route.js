import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { getMarketTimeConfig } from '@/lib/markettime-config';
import { ensureDefaultSalesperson } from '@/lib/assign-default-salesperson';
import { notifyApprovalIfNeeded } from '@/lib/notify-approval';
import { NextResponse } from 'next/server';

const BASE_URL = 'https://publicapi.markettime.com/mtpublic/api/v1';
const PAGE_SIZE = 250;

function isApprovedCustomer(customer) {
  return (
    customer.active !== false &&
    customer.status !== 'INACTIVE' &&
    customer.recordDeleted !== true &&
    (customer.approvedByRepGroup === true
      || customer.approvedByRepGroup === 1
      || customer.approved === true)
  );
}

async function fetchCustomersPage(offset) {
  const { repGroupId, apiKey } = getMarketTimeConfig();
  const res = await fetch(
    `${BASE_URL}/${repGroupId}/customers/get?offset=${offset}&recordSize=${PAGE_SIZE}`,
    {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      // MarketTime expects an array of QueryFilter objects. Empty array returns
      // the page of customers without filtering.
      body: JSON.stringify([]),
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    throw new Error(`MarketTime customer lookup failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error?.message ?? 'MarketTime customer lookup failed');
  }

  return Array.isArray(data.response) ? data.response : data.response?.records ?? [];
}

async function findCustomerByEmail(email) {
  const target = email.trim().toLowerCase();
  let offset = 0;

  while (true) {
    const customers = await fetchCustomersPage(offset);
    if (customers.length === 0) return null;

    const match = customers.find((customer) => customer.email?.trim().toLowerCase() === target);
    if (match) return match;

    if (customers.length < PAGE_SIZE) return null;
    offset += PAGE_SIZE;
  }
}

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let customer;
  try {
    customer = await findCustomerByEmail(user.email);
  } catch (err) {
    console.error('[/api/profile/link-markettime]', err.message);
    return NextResponse.json({
      linked: false,
      reason: 'api_error',
      message: 'Could not reach MarketTime to link your account. You can still browse the catalog.',
    });
  }

  if (!customer) {
    return NextResponse.json({
      linked: false,
      reason: 'not_found',
      message: 'No matching MarketTime customer was found for this email.',
    });
  }

  const approved = isApprovedCustomer(customer);
  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('approved')
    .eq('id', user.id)
    .maybeSingle();

  const wasApproved = existingProfile?.approved === true;

  const { error } = await admin
    .from('profiles')
    .upsert({
      id: user.id,
      retailer_id: customer.recordID,
      company_name: customer.name ?? customer.dba ?? null,
      approved,
    }, { onConflict: 'id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let salespersonAssigned = false;
  try {
    const result = await ensureDefaultSalesperson(customer.recordID);
    salespersonAssigned = result.assigned === true;
  } catch (err) {
    console.warn('[/api/profile/link-markettime] salesperson assign skipped:', err.message);
  }

  try {
    await notifyApprovalIfNeeded(admin, {
      userId: user.id,
      email: user.email,
      companyName: customer.name ?? customer.dba ?? null,
      wasApproved,
      nowApproved: approved,
    });
  } catch (emailErr) {
    console.warn('[/api/profile/link-markettime] approval email failed:', emailErr.message);
  }

  return NextResponse.json({
    linked: true,
    approved,
    retailerID: customer.recordID,
    salespersonAssigned,
  });
}
