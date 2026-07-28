/**
 * MarketTime API client — server-side only.
 * All calls require the x-api-key header. This file must NEVER be imported
 * from client components. Import only in route handlers and server actions.
 */

import { getMarketTimeConfig } from './markettime-config.js';

const BASE_URL = 'https://publicapi.markettime.com/mtpublic/api/v1';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mtFetch = async (path, options = {}) => {
  const { repGroupId, apiKey } = getMarketTimeConfig();
  const url = `${BASE_URL}/${repGroupId}${path}`;
  let res;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      res = await fetch(url, {
        ...options,
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        // Disable Next.js caching — data is managed via Supabase sync
        cache: 'no-store',
      });

      if (res.ok || res.status < 500) break;
    } catch (err) {
      if (attempt === 3) {
        throw new Error(`MarketTime fetch failed after 3 attempts: ${path} — ${err.message}`);
      }
    }

    await sleep(500 * attempt);
  }

  if (!res.ok) {
    let details = '';
    try {
      const errorBody = await res.json();
      details = errorBody.error?.message ? `: ${errorBody.error.message}` : '';
    } catch {
      // Some MarketTime errors are not JSON; keep the status-only message.
    }

    throw new Error(`MarketTime API error: ${res.status} ${res.statusText}${details} — ${path}`);
  }

  const data = await res.json();

  if (!data.success) {
    throw new Error(`MarketTime error: ${data.error?.message ?? 'Unknown error'} — ${path}`);
  }

  return data.response;
};

// ─── Items ───────────────────────────────────────────────────────────────────

/**
 * Normalize a delta-sync "since" date to YYYY-MM-DD for MarketTime filters.
 * GET /items?modifiedStartDate=… is broken on MT (Long param, then date parse fails).
 * Delta sync uses POST /items/get with dateModified >= YYYY-MM-DD instead.
 */
export function toModifiedStartDateIso(dateInput) {
  if (dateInput == null || dateInput === '') return null;

  if (typeof dateInput === 'number' && Number.isFinite(dateInput)) {
    return new Date(dateInput).toISOString().slice(0, 10);
  }

  const str = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  if (/^\d+$/.test(str)) {
    return new Date(Number(str)).toISOString().slice(0, 10);
  }

  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid modifiedStartDate: ${dateInput}`);
  }

  return parsed.toISOString().slice(0, 10);
}

/** @deprecated Prefer toModifiedStartDateIso — MT GET modifiedStartDate is unreliable. */
export function toModifiedStartDateMs(dateInput) {
  if (dateInput == null || dateInput === '') return null;

  if (typeof dateInput === 'number' && Number.isFinite(dateInput)) {
    return dateInput;
  }

  const str = String(dateInput).trim();
  if (/^\d+$/.test(str)) {
    return Number(str);
  }

  const parsed = str.length === 10
    ? new Date(`${str}T00:00:00.000Z`)
    : new Date(str);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid modifiedStartDate: ${dateInput}`);
  }

  return parsed.getTime();
}

/**
 * Paginated item list. Pass offset/recordSize for pagination.
 * Pass modifiedStartDate (ISO date) for delta sync via POST /items/get filter.
 */
export const getItems = (params = {}) => {
  const { modifiedStartDate, offset = 0, recordSize = 250, ...rest } = params;
  const since = modifiedStartDate != null && modifiedStartDate !== ''
    ? toModifiedStartDateIso(modifiedStartDate)
    : null;

  // Delta: POST /items/get with dateModified filter (GET ?modifiedStartDate= is broken on MT)
  if (since) {
    const qs = new URLSearchParams({
      offset: String(offset),
      recordSize: String(recordSize),
      ...Object.fromEntries(
        Object.entries(rest).map(([key, value]) => [key, String(value)])
      ),
    }).toString();

    return mtFetch(`/items/get${qs ? '?' + qs : ''}`, {
      method: 'POST',
      body: JSON.stringify([
        { field: 'dateModified', operator: 'gte', value: since },
      ]),
    });
  }

  const query = { offset, recordSize, ...rest };
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(query).map(([key, value]) => [key, String(value)])
    )
  ).toString();

  return mtFetch(`/items${qs ? '?' + qs : ''}`);
};

export const getItem = (itemID) => mtFetch(`/items/${itemID}`);

export const getItemsByFilter = (filters) =>
  mtFetch('/items/get', { method: 'POST', body: JSON.stringify(filters) });

/** Fetch customer-specific pricing. Call at cart-add time, not browse time. */
export const getItemPricing = (itemID) => mtFetch(`/items/pricing/${itemID}`);

export const getItemInventory = (itemID) => mtFetch(`/items/inventory/${itemID}`);

export const getItemImages = (itemID) => mtFetch(`/items/images/${itemID}`);

// ─── Manufacturers ────────────────────────────────────────────────────────────

export const getManufacturers = () => mtFetch('/manufacturers');

export const getManufacturer = (manufacturerID) =>
  mtFetch(`/manufacturers/${manufacturerID}`);

/** Active promotions for a manufacturer (free freight, discounts, etc.). */
export const getManufacturerPromotions = (manufacturerID) =>
  mtFetch('/manufacturers/promotions/get', {
    method: 'POST',
    body: JSON.stringify({ manufacturerID }),
  });

export const getManufacturerPaymentTerms = (manufacturerID) =>
  mtFetch(`/manufacturers/${manufacturerID}/paymentterms`);

export const getManufacturerShippingMethods = async (manufacturerID) => {
  const methods = await mtFetch('/manufacturers/shippingMethods');
  const list = Array.isArray(methods) ? methods : methods?.records ?? [];

  return list.filter((method) =>
    method.recordDeleted !== true &&
    (!manufacturerID || method.manufacturerID === manufacturerID)
  );
};

export const getManufacturerCategories = (manufacturerID) =>
  mtFetch(`/manufacturers/${manufacturerID}/categories`);

export const getManufacturerPriceCodes = (manufacturerID) =>
  mtFetch(`/manufacturers/${manufacturerID}/pricecodes`);

// ─── Customers ────────────────────────────────────────────────────────────────

export const getCustomer = (retailerID) =>
  mtFetch(`/customers/${retailerID}`);

export const getCustomerShipTos = (retailerID) =>
  mtFetch(`/customers/${retailerID}/shiptolocations`);

export const getCustomerContacts = (retailerID) =>
  mtFetch(`/customers/${retailerID}/contacts`);

export const searchCustomers = (filters) =>
  mtFetch('/customers/get', { method: 'POST', body: JSON.stringify(filters) });

/** Create a new MarketTime customer (one at a time — no bulk endpoint). */
export const createCustomer = (customerPayload) =>
  mtFetch('/customers', { method: 'POST', body: JSON.stringify(customerPayload) });

/** Update an existing MarketTime customer (billing / company fields). */
export const updateCustomer = (retailerID, customerPayload) =>
  mtFetch(`/customers/${retailerID}`, {
    method: 'PUT',
    body: JSON.stringify({ recordID: retailerID, ...customerPayload }),
  });

/**
 * Approve a customer for the rep group so they appear in MarketTime customer lists.
 * Bulk import creates with approved=false by default; reps won't see them until approved.
 */
export async function approveCustomerForRepGroup(retailerID) {
  const customer = await getCustomer(retailerID);

  return updateCustomer(retailerID, {
    recordID: retailerID,
    name: customer.name,
    email: customer.email,
    phone: customer.phone ?? '',
    address1: customer.address1 ?? null,
    address2: customer.address2 ?? null,
    city: customer.city ?? null,
    state: customer.state,
    zip: customer.zip ?? null,
    country: customer.country,
    website: customer.website ?? null,
    externalID: customer.externalID ?? null,
    active: true,
    approved: true,
    approvedByRepGroup: 1,
  });
}

/** Update a customer ship-to location. */
export const updateCustomerShipTo = (retailerID, shipToLocationId, shipToPayload) =>
  mtFetch(`/customers/${retailerID}/shiptolocation/${shipToLocationId}`, {
    method: 'PUT',
    body: JSON.stringify({
      recordID: Number(shipToLocationId) || shipToLocationId,
      retailerID,
      ...shipToPayload,
    }),
  });

/** Update a customer contact. */
export const updateCustomerContact = (retailerID, contactId, contactPayload) => {
  const { repGroupId } = getMarketTimeConfig();

  return mtFetch(`/customers/${retailerID}/contact/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify({
      recordID: Number(contactId) || contactId,
      retailerID,
      repGroupID: repGroupId,
      ...contactPayload,
    }),
  });
};

/**
 * Assign a salesperson as primary (type 1) on a customer's ship-to location.
 * POST /customers/{customerId}/repgroupsalespersoncustomer
 */
export const assignSalespersonToCustomerShipTo = ({
  customerId,
  shipToLocationId,
  salespersonId,
}) => {
  const { repGroupId } = getMarketTimeConfig();

  return mtFetch(`/customers/${customerId}/repgroupsalespersoncustomer`, {
    method: 'POST',
    body: JSON.stringify([
      {
        repGroupID: repGroupId,
        retailerID: customerId,
        salespersonID: salespersonId,
        retailerShipToLocationID: shipToLocationId,
        salespersonType: '1',
      },
    ]),
  });
};

/** Fetch one salesperson by MarketTime record ID (e.g. S14368). */
export const getSalesperson = async (salespersonID) => {
  const response = await mtFetch('/salespersons/get', {
    method: 'POST',
    body: JSON.stringify([{ field: 'recordID', operator: 'eq', value: salespersonID }]),
  });

  const list = Array.isArray(response) ? response : response?.records ?? [];
  const target = String(salespersonID);
  return list.find((person) => String(person.recordID) === target) ?? list[0] ?? null;
};

/** List salespeople for the rep group (POST /salespersons/get with no filters). */
export const getSalespeople = async ({ offset = 0, recordSize = 250 } = {}) => {
  const qs = new URLSearchParams({
    offset: String(offset),
    recordSize: String(recordSize),
  });

  const response = await mtFetch(`/salespersons/get?${qs}`, {
    method: 'POST',
    body: JSON.stringify([]),
  });

  return Array.isArray(response) ? response : response?.records ?? [];
};

// ─── Orders ───────────────────────────────────────────────────────────────────

/**
 * Create a new order. Always pass manufacturerOrderStatus: "NOT TRANSMITTED".
 * Do NOT include blocked fields: retailerContactID, retailerContact, publicOrderID,
 * orderType, externalID2, manufacturerOrderNumber, origin, salespersonGroupID,
 * orderPaymentTokens, orderPayments, recordID, dateAdded, dateModified,
 * userAdded, userModified, recordDeleted.
 */
export const createOrder = (orderPayload) =>
  mtFetch('/orders', { method: 'POST', body: JSON.stringify(orderPayload) });

export const updateOrder = (orderID, orderPayload) =>
  mtFetch(`/orders/${orderID}`, { method: 'PUT', body: JSON.stringify(orderPayload) });

const toQueryFilters = (filters = {}) => {
  if (Array.isArray(filters)) return filters;

  return Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([field, value]) => ({ field, operator: 'eq', value }));
};

export const getOrders = ({ offset = 0, recordSize = 250, ...filters } = {}) => {
  const qs = new URLSearchParams({
    offset: String(offset),
    recordSize: String(Math.min(recordSize, 250)),
  });

  return mtFetch(`/orders/get?${qs}`, {
    method: 'POST',
    body: JSON.stringify(toQueryFilters(filters)),
  });
};

/**
 * Find one order by recordID. MT's orders/get endpoint ignores recordID filters,
 * so we page through the retailer's orders until we find a match.
 */
export const getOrderByRecordId = async (retailerID, recordID, { recordSize = 250, maxPages = 20 } = {}) => {
  const target = String(recordID);
  let offset = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const batch = await getOrders({ retailerID, offset, recordSize });
    const list = Array.isArray(batch) ? batch : batch?.records ?? [];
    const found = list.find((o) => String(o.recordID ?? o.id) === target);
    if (found) return found;
    if (list.length < recordSize) break;
    offset += list.length;
  }

  return null;
};

export const getOrderTracking = (orderID) =>
  mtFetch(`/orders/${orderID}/trackingdetails/get`);

export const getOrderHistory = (orderID) =>
  mtFetch(`/orders/${orderID}/orderChangesHistory/get`, { method: 'POST' });
