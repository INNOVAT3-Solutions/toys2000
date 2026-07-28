import { createClient } from '@supabase/supabase-js';

import { notifyApprovalIfNeeded } from '@/lib/notify-approval';

const PAGE_SIZE = 250;

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

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
  const BASE_URL = 'https://publicapi.markettime.com/mtpublic/api/v1';
  const url = `${BASE_URL}/${process.env.MT_REP_GROUP_ID}/customers/get?offset=${offset}&recordSize=${PAGE_SIZE}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.MT_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([]),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MarketTime API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(`MarketTime error: ${data.error?.message ?? 'Unknown error'}`);
  }

  const response = data.response;
  return Array.isArray(response) ? response : response?.records ?? [];
}

async function fetchAllCustomers() {
  const customers = [];
  let offset = 0;

  while (true) {
    const records = await fetchCustomersPage(offset);
    if (records.length === 0) break;

    customers.push(...records);
    if (records.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return customers;
}

async function fetchAllUsers(db) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    users.push(...(data.users ?? []));
    if (!data.users?.length || data.users.length < 1000) break;
    page += 1;
  }

  return users;
}

/**
 * Links Supabase auth users to MarketTime retailer profiles by email.
 * Sets retailer_id, company_name, and approved from MT customer status.
 */
export async function runCustomerSync() {
  const db = createAdminClient();

  const [customers, users] = await Promise.all([
    fetchAllCustomers(),
    fetchAllUsers(db),
  ]);

  const customersByEmail = new Map();
  for (const customer of customers) {
    const email = customer.email?.trim().toLowerCase();
    if (!email || !customer.recordID) continue;

    const existing = customersByEmail.get(email);
    if (!existing || (!isApprovedCustomer(existing) && isApprovedCustomer(customer))) {
      customersByEmail.set(email, customer);
    }
  }

  let matched = 0;
  let linked = 0;
  let unmatched = 0;

  for (const user of users) {
    const email = user.email?.trim().toLowerCase();
    if (!email) continue;

    const customer = customersByEmail.get(email);
    if (!customer) {
      unmatched += 1;
      continue;
    }

    matched += 1;
    const approved = isApprovedCustomer(customer);

    const { data: existingProfile } = await db
      .from('profiles')
      .select('approved')
      .eq('id', user.id)
      .maybeSingle();

    const wasApproved = existingProfile?.approved === true;

    const { error } = await db
      .from('profiles')
      .upsert(
        {
          id: user.id,
          retailer_id: customer.recordID,
          company_name: customer.name ?? customer.dba ?? null,
          approved,
        },
        { onConflict: 'id' }
      );

    if (error) throw error;
    linked += 1;

    try {
      await notifyApprovalIfNeeded(db, {
        userId: user.id,
        email: user.email,
        companyName: customer.name ?? customer.dba ?? null,
        wasApproved,
        nowApproved: approved,
      });
    } catch (emailErr) {
      console.warn('[sync-customers] approval email failed:', emailErr.message);
    }
  }

  return {
    success: true,
    marketTimeCustomers: customers.length,
    supabaseUsers: users.length,
    matchedByEmail: matched,
    linkedProfiles: linked,
    unmatchedUsers: unmatched,
  };
}
