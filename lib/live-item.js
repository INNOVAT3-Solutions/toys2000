/**
 * Live MarketTime price + inventory for cart/checkout.
 * Prefer dedicated pricing/inventory endpoints; fall back to GET /items/{id}.
 */

import {
  getItem,
  getItemInventory,
  getItemPricing,
} from '@/lib/markettime';

function unwrapRecord(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] ?? null;
  if (Array.isArray(payload.records)) return payload.records[0] ?? null;
  if (Array.isArray(payload.data)) return payload.data[0] ?? null;
  return payload;
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toBool(value, fallback = null) {
  if (value === true || value === false) return value;
  if (value == null) return fallback;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(lower)) return true;
    if (['false', '0', 'no', 'n'].includes(lower)) return false;
  }
  return fallback;
}

export function normalizeLiveSnapshot(parts = {}) {
  const pricing = unwrapRecord(parts.pricing);
  const inventory = unwrapRecord(parts.inventory);
  const item = unwrapRecord(parts.item);

  const unitPrice =
    toNumber(pricing?.unitPrice) ??
    toNumber(item?.unitPrice) ??
    null;

  const qtyAvailable =
    toNumber(inventory?.qtyAvailable) ??
    toNumber(pricing?.qtyAvailable) ??
    toNumber(item?.qtyAvailable) ??
    null;

  const discontinued =
    toBool(pricing?.discontinued, null) ??
    toBool(item?.discontinued, null) ??
    false;

  const isAvailable =
    toBool(inventory?.available, null) ??
    toBool(inventory?.isAvailable, null) ??
    toBool(pricing?.isAvailable, null) ??
    toBool(item?.isAvailable, null) ??
    (discontinued ? false : true);

  const volumePricing =
    pricing?.volumePricing ??
    item?.volumePricing ??
    null;

  const minimumQuantity =
    toNumber(pricing?.minimumQuantity) ??
    toNumber(item?.minimumQuantity) ??
    null;

  const quantityIncrement =
    toNumber(pricing?.quantityIncrement) ??
    toNumber(item?.quantityIncrement) ??
    null;

  return {
    itemID: String(
      pricing?.recordID ??
      inventory?.recordID ??
      item?.recordID ??
      parts.itemID ??
      ''
    ),
    itemNumber: pricing?.itemNumber ?? inventory?.itemNumber ?? item?.itemNumber ?? null,
    unitPrice,
    qtyAvailable,
    isAvailable: Boolean(isAvailable) && !discontinued,
    discontinued: Boolean(discontinued),
    volumePricing: Array.isArray(volumePricing) ? volumePricing : [],
    minimumQuantity,
    quantityIncrement,
    nextAvailableDate: inventory?.nextAvailableDate ?? item?.nextAvailableDate ?? null,
    source: parts.source ?? 'markettime',
  };
}

/**
 * True when the requested quantity can be fulfilled.
 * Unknown qty (null) is allowed if isAvailable is true — many vendors omit counts.
 */
export function canFulfillQuantity(snapshot, quantity) {
  if (!snapshot) return false;
  if (!snapshot.isAvailable || snapshot.discontinued) return false;
  if (snapshot.qtyAvailable == null) return true;
  return quantity <= snapshot.qtyAvailable;
}

export function liveAvailabilityMessage(snapshot, quantity = 1) {
  if (!snapshot) return 'Could not verify live availability with MarketTime.';
  if (snapshot.discontinued) return 'This item is discontinued.';
  if (!snapshot.isAvailable) return 'This item is currently unavailable.';
  if (
    snapshot.qtyAvailable != null &&
    quantity > snapshot.qtyAvailable
  ) {
    return snapshot.qtyAvailable <= 0
      ? 'This item is out of stock.'
      : `Only ${snapshot.qtyAvailable} available.`;
  }
  return null;
}

async function safeCall(label, fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err), label };
  }
}

/**
 * Fetch one live price/inventory snapshot for an MT item recordID.
 */
export async function fetchLiveItemSnapshot(itemID) {
  const id = String(itemID ?? '').trim();
  if (!id) throw new Error('itemID is required');

  const [pricingResult, inventoryResult] = await Promise.all([
    safeCall('pricing', () => getItemPricing(id)),
    safeCall('inventory', () => getItemInventory(id)),
  ]);

  let itemResult = { ok: false, data: null };
  const needFallback =
    !pricingResult.ok ||
    unwrapRecord(pricingResult.data)?.unitPrice == null;

  if (needFallback || !inventoryResult.ok) {
    itemResult = await safeCall('item', () => getItem(id));
  }

  if (!pricingResult.ok && !inventoryResult.ok && !itemResult.ok) {
    throw new Error(
      pricingResult.error ||
      inventoryResult.error ||
      itemResult.error ||
      'Live MarketTime lookup failed'
    );
  }

  return normalizeLiveSnapshot({
    itemID: id,
    pricing: pricingResult.ok ? pricingResult.data : null,
    inventory: inventoryResult.ok ? inventoryResult.data : null,
    item: itemResult.ok ? itemResult.data : null,
    source: [
      pricingResult.ok ? 'pricing' : null,
      inventoryResult.ok ? 'inventory' : null,
      itemResult.ok ? 'item' : null,
    ].filter(Boolean).join('+') || 'markettime',
  });
}

/**
 * Parallel live lookups with a small concurrency limit.
 * Returns { [itemID]: snapshot | { error } }.
 */
export async function fetchLiveItemSnapshots(itemIDs = [], { concurrency = 6 } = {}) {
  const ids = [...new Set((itemIDs ?? []).map((id) => String(id).trim()).filter(Boolean))];
  const byId = {};

  for (let i = 0; i < ids.length; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (id) => {
        try {
          return [id, await fetchLiveItemSnapshot(id)];
        } catch (err) {
          return [id, { itemID: id, error: err?.message ?? String(err), isAvailable: false }];
        }
      })
    );
    for (const [id, snapshot] of results) byId[id] = snapshot;
  }

  return byId;
}
