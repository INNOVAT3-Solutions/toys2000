/**
 * Fast pending-application store (Supabase).
 * Website registrations are written here on submit so /admin does not need
 * to scan every MarketTime customer (~40s) just to list pending apps.
 */

import { createAdminClient } from '@/lib/supabase-server';
import {
  WEB_REGISTRATION_EXTERNAL_ID,
  listPendingCustomers,
} from '@/lib/find-markettime-customer';

function mapRow(row) {
  return {
    recordID: row.retailer_id,
    name: row.company_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    state: row.state,
    address1: row.address1,
    website: row.website,
    externalID: WEB_REGISTRATION_EXTERNAL_ID,
    dateAdded: row.created_at ? new Date(row.created_at).getTime() : null,
    isWebRegistration: true,
    contactName: row.contact_name,
    source: 'local',
  };
}

export async function recordPendingApplication({
  retailerId,
  companyName,
  email,
  phone,
  contactName,
  city,
  state,
  address1,
  website,
  taxId,
}) {
  const db = createAdminClient();
  const { error } = await db.from('pending_applications').upsert(
    {
      retailer_id: retailerId,
      company_name: companyName,
      email: email.trim().toLowerCase(),
      phone: phone || null,
      contact_name: contactName || null,
      city: city || null,
      state: state || null,
      address1: address1 || null,
      website: website || null,
      tax_id: taxId || null,
      status: 'pending',
      resolved_at: null,
    },
    { onConflict: 'retailer_id' }
  );

  if (error) throw error;
}

export async function findPendingApplicationByEmail(email) {
  const target = email?.trim().toLowerCase();
  if (!target) return null;

  const db = createAdminClient();
  const { data, error } = await db
    .from('pending_applications')
    .select('retailer_id, company_name, email, status, created_at')
    .eq('email', target)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listLocalPendingApplications() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('pending_applications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function markPendingApplicationApproved(retailerId) {
  const db = createAdminClient();
  const { error } = await db
    .from('pending_applications')
    .update({
      status: 'approved',
      resolved_at: new Date().toISOString(),
    })
    .eq('retailer_id', retailerId)
    .eq('status', 'pending');

  if (error) throw error;
}

export async function markPendingApplicationRejected(retailerId) {
  const db = createAdminClient();
  const { error } = await db
    .from('pending_applications')
    .update({
      status: 'rejected',
      resolved_at: new Date().toISOString(),
    })
    .eq('retailer_id', retailerId)
    .eq('status', 'pending');

  if (error) throw error;
}

/**
 * Pull web-tagged unapproved customers from MarketTime into Supabase.
 * Slow (~40s) — use only for one-time backfill / Sync button.
 */
export async function syncPendingApplicationsFromMarketTime() {
  const fromMt = await listPendingCustomers({ webOnly: true });
  const db = createAdminClient();
  let upserted = 0;

  for (const customer of fromMt) {
    if (!customer.recordID) continue;
    const { error } = await db.from('pending_applications').upsert(
      {
        retailer_id: customer.recordID,
        company_name: customer.name || 'Unknown company',
        email: (customer.email || '').trim().toLowerCase()
          || `unknown+${customer.recordID}@invalid.local`,
        phone: customer.phone || null,
        contact_name: customer.contactName || null,
        city: customer.city || null,
        state: customer.state || null,
        address1: customer.address1 || null,
        website: customer.website || null,
        status: 'pending',
        resolved_at: null,
        created_at: customer.dateAdded
          ? new Date(customer.dateAdded).toISOString()
          : undefined,
      },
      { onConflict: 'retailer_id' }
    );
    if (!error) upserted += 1;
  }

  return { fromMarketTime: fromMt.length, upserted };
}
