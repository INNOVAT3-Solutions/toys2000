/**
 * Normalize MarketTime manufacturer data for cart/checkout UI.
 */

export function getManufacturerMinimum(manufacturer) {
  const value = Number(manufacturer?.minimumOrderAmount ?? manufacturer?.minimum_order_amount);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function getManufacturerReorderMinimum(manufacturer) {
  const value = Number(manufacturer?.minimumReorderAmount ?? manufacturer?.minimum_reorder_amount);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function parsePromotionList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.records)) return response.records;
  return [];
}

/** Parse MT promo dates (YYYY-MM-DD, epoch ms, or ISO). Returns null if invalid. */
export function parsePromotionDate(value, { endOfDay = false } = {}) {
  if (value == null || value === '') return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const str = String(value).trim();
  if (/^\d+$/.test(str)) {
    const d = new Date(Number(str));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Date-only → UTC start (or end) of day so “ends 2026-07-31” stays active all that day
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when the promo is currently running (date window + website visibility). */
export function isPromotionCurrentlyActive(promo, now = new Date()) {
  if (!promo || promo.recordDeleted) return false;
  if (promo.showOnWebsite === false) return false;

  const start = parsePromotionDate(promo.startDate ?? promo.start_date);
  const end = parsePromotionDate(promo.endDate ?? promo.end_date, { endOfDay: true });

  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
}

export function normalizePromotion(promo) {
  if (!isPromotionCurrentlyActive(promo)) return null;

  const amountToMeet = Number(promo.amountToMeet);
  const discountPercent = Number(
    promo.discountPercent ?? promo.dicountPercentage ?? promo.discountPercentage
  );

  return {
    recordID: promo.recordID,
    title: promo.title ?? promo.name ?? 'Promotion',
    description: promo.description ?? null,
    amountToMeet: Number.isFinite(amountToMeet) ? amountToMeet : 0,
    discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0,
    shippingMethod: promo.shippingMethod ?? null,
    startDate: promo.startDate ?? null,
    endDate: promo.endDate ?? null,
    // Preserve MT typo field used on order responses
    dicountPercentage: promo.dicountPercentage ?? promo.discountPercent ?? 0,
  };
}

export function normalizePromotions(response) {
  return parsePromotionList(response)
    .map(normalizePromotion)
    .filter(Boolean);
}

export function meetsVendorMinimum(manufacturerID, subtotal, minimum) {
  const min = Number(minimum) || 0;
  return min === 0 || subtotal >= min;
}

/** Split spend-threshold promos into met vs unmet for cart/checkout UI. */
export function partitionFreightPromotions(promotions = [], subtotal = 0) {
  const freightPromos = promotions.filter((promo) => promo.amountToMeet > 0);
  const otherPromos = promotions.filter((promo) => !promo.amountToMeet);

  return {
    metFreight: freightPromos.filter((promo) => subtotal >= promo.amountToMeet),
    missedFreight: freightPromos.filter((promo) => subtotal < promo.amountToMeet),
    otherPromos,
  };
}
