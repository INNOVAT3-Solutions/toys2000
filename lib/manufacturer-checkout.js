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

export function normalizePromotion(promo) {
  if (!promo || promo.recordDeleted) return null;
  if (promo.showOnWebsite === false) return null;

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
  const now = new Date();
  return parsePromotionList(response)
    .map(normalizePromotion)
    .filter(Boolean)
    .filter((promo) => {
      if (promo.startDate && new Date(promo.startDate) > now) return false;
      if (promo.endDate && new Date(promo.endDate) < now) return false;
      return true;
    });
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
