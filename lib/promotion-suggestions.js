/**
 * Pick catalog products that help a customer reach a freight / spend promotion.
 */

export function getUnmetFreightPromotions(promotions = [], subtotal = 0) {
  return promotions
    .filter((promo) => promo.amountToMeet > 0 && subtotal < promo.amountToMeet)
    .map((promo) => ({
      ...promo,
      remaining: promo.amountToMeet - subtotal,
    }))
    .sort((a, b) => a.remaining - b.remaining);
}

export function getClosestUnmetPromotion(promotions = [], subtotal = 0) {
  const unmet = getUnmetFreightPromotions(promotions, subtotal);
  return unmet[0] ?? null;
}

function minimumLineTotal(product) {
  const unitPrice = Number(product.unit_price) || 0;
  const minQty = Number(product.minimum_quantity) || 1;
  if (!unitPrice) return 0;
  return unitPrice * minQty;
}

/**
 * Rank products to close a promotion gap. Prefers items whose minimum line
 * total meets the remaining amount with the least overspend.
 */
export function suggestProductsForRemaining(
  products = [],
  remaining,
  cartItemIds = [],
  { limit = 4 } = {}
) {
  const target = Number(remaining);
  if (!Number.isFinite(target) || target <= 0) return [];

  const inCart = new Set(cartItemIds);

  const ranked = products
    .filter((product) => product.record_id && !inCart.has(product.record_id))
    .map((product) => {
      const lineTotal = minimumLineTotal(product);
      if (lineTotal <= 0) return null;

      const overshoot = lineTotal - target;
      const score = lineTotal >= target
        ? overshoot
        : target - lineTotal + 1_000_000;

      return { product, lineTotal, overshoot, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);

  const seen = new Set();
  const picks = [];

  for (const entry of ranked) {
    if (seen.has(entry.product.record_id)) continue;
    seen.add(entry.product.record_id);
    picks.push(entry);
    if (picks.length >= limit) break;
  }

  return picks;
}
