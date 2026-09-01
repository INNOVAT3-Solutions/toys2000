/**
 * Look up MarketTime customers by email (company or contact).
 * Server-side only — uses MT API key.
 */

import { getMarketTimeConfig } from '@/lib/markettime-config.js';

const BASE_URL = 'https://publicapi.markettime.com/mtpublic/api/v1';
const PAGE_SIZE = 250;
const INDEX_CACHE_TTL_MS = 10 * 60 * 1000;

/** Tag applied to customers created via toys2000.com/register. */
export const WEB_REGISTRATION_EXTERNAL_ID = 'toys2000-web';

let customersCache = null;
let customersCacheAt = 0;
let emailIndexCache = null;
let emailIndexCacheAt = 0;

export function isApprovedCustomer(customer) {
  return (
    customer.active !== false &&
    customer.status !== 'INACTIVE' &&
    customer.recordDeleted !== true &&
    (customer.approvedByRepGroup === true
      || customer.approvedByRepGroup === 1
      || customer.approved === true)
  );
}

function normalizeEmail(email) {
  return email?.trim().toLowerCase() ?? '';
}

function collectCustomerEmails(customer) {
  const emails = new Set();
  const companyEmail = normalizeEmail(customer.email);
  if (companyEmail) emails.add(companyEmail);

  for (const contact of customer.contacts ?? []) {
    const contactEmail = normalizeEmail(contact.email);
    if (contactEmail) emails.add(contactEmail);
  }

  return emails;
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

async function fetchAllCustomers() {
  const customers = [];
  let offset = 0;

  while (true) {
    const page = await fetchCustomersPage(offset);
    if (page.length === 0) break;
    customers.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return customers;
}

function isPendingApproval(customer) {
  return (
    customer.recordDeleted !== true &&
    customer.approvedByRepGroup !== true &&
    customer.approvedByRepGroup !== 1 &&
    customer.approved !== true
  );
}

function rebuildEmailIndex(customers) {
  const index = new Map();

  for (const customer of customers) {
    if (!customer.recordID) continue;

    for (const email of collectCustomerEmails(customer)) {
      const existing = index.get(email);
      if (!existing || (!isApprovedCustomer(existing) && isApprovedCustomer(customer))) {
        index.set(email, customer);
      }
    }
  }

  return index;
}

async function getCachedCustomers() {
  if (customersCache && Date.now() - customersCacheAt < INDEX_CACHE_TTL_MS) {
    return customersCache;
  }

  const customers = await fetchAllCustomers();
  customersCache = customers;
  customersCacheAt = Date.now();
  emailIndexCache = rebuildEmailIndex(customers);
  emailIndexCacheAt = Date.now();
  return customers;
}

async function getCustomerEmailIndex() {
  if (emailIndexCache && Date.now() - emailIndexCacheAt < INDEX_CACHE_TTL_MS) {
    return emailIndexCache;
  }

  await getCachedCustomers();
  return emailIndexCache ?? new Map();
}

/** Clear cached customer/email index (e.g. after create or approve). */
export function clearMarketTimeCustomerEmailCache() {
  customersCache = null;
  customersCacheAt = 0;
  emailIndexCache = null;
  emailIndexCacheAt = 0;
}

/**
 * Find a MarketTime customer whose company or contact email matches.
 * @param {string} email
 * @param {{ allowSlowScan?: boolean }} [options]
 *   When allowSlowScan is false and the cache is cold, returns null instead of
 *   scanning every MarketTime customer (~40s). Use for registration duplicate checks.
 * @returns {Promise<object|null>}
 */
export async function findCustomerByEmail(email, { allowSlowScan = true } = {}) {
  const target = normalizeEmail(email);
  if (!target) return null;

  if (
    !allowSlowScan
    && !(emailIndexCache && Date.now() - emailIndexCacheAt < INDEX_CACHE_TTL_MS)
  ) {
    return null;
  }

  const index = await getCustomerEmailIndex();
  return index.get(target) ?? null;
}

function summarizePendingCustomer(customer) {
  const primaryContact = (customer.contacts ?? []).find((c) => c.isPrimary)
    ?? (customer.contacts ?? [])[0]
    ?? null;

  return {
    recordID: customer.recordID,
    name: customer.name ?? customer.dba ?? null,
    email: customer.email ?? primaryContact?.email ?? null,
    phone: customer.phone ?? primaryContact?.phone ?? null,
    city: customer.city ?? null,
    state: customer.state ?? null,
    address1: customer.address1 ?? null,
    website: customer.website ?? null,
    externalID: customer.externalID ?? null,
    dateAdded: customer.dateAdded ?? null,
    isWebRegistration: customer.externalID === WEB_REGISTRATION_EXTERNAL_ID,
    contactName: primaryContact
      ? [primaryContact.firstName, primaryContact.lastName].filter(Boolean).join(' ')
      : null,
  };
}

/**
 * List MarketTime customers not yet approved for the rep group.
 * @param {{ webOnly?: boolean }} [options]
 */
export async function listPendingCustomers({ webOnly = true } = {}) {
  const customers = await getCachedCustomers();

  const pending = customers
    .filter((customer) => {
      if (!isPendingApproval(customer)) return false;
      if (!webOnly) return true;
      return customer.externalID === WEB_REGISTRATION_EXTERNAL_ID;
    })
    .map(summarizePendingCustomer)
    .sort((a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0));

  return pending;
}
