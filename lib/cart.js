/**
 * Cart utility functions — pure, no I/O.
 * Shared between Server Components (for read logic) and client components.
 */

/**
 * Snap a requested quantity to the nearest valid value.
 * Valid quantities are: minimumQuantity, minimumQuantity + quantityIncrement,
 * minimumQuantity + (2 * quantityIncrement), etc.
 *
 * Examples:
 *   snapQuantity(1, 6, 6)  → 6   (below minimum, snap up to minimum)
 *   snapQuantity(7, 6, 6)  → 12  (between valid values, snap up)
 *   snapQuantity(12, 6, 6) → 12  (already valid)
 */
export const snapQuantity = (requested, minimumQuantity, quantityIncrement) => {
  const min = minimumQuantity || 1;
  const inc = quantityIncrement || 1;

  if (requested <= min) return min;

  const stepsAboveMin = Math.ceil((requested - min) / inc);
  return min + stepsAboveMin * inc;
};

/**
 * Check whether a quantity is valid for a given item.
 * Returns true if quantity >= minimumQuantity and (quantity - minimumQuantity)
 * is divisible by quantityIncrement.
 */
export const isValidQuantity = (quantity, minimumQuantity, quantityIncrement) => {
  const min = minimumQuantity || 1;
  const inc = quantityIncrement || 1;
  if (quantity < min) return false;
  return (quantity - min) % inc === 0;
};

/**
 * Group cart items by manufacturerID.
 * Returns an object keyed by manufacturerID, each with { manufacturerID,
 * manufacturerName, items[] }.
 */
export const groupByManufacturer = (cartItems) => {
  return cartItems.reduce((acc, item) => {
    const key = item.manufacturer_id;
    if (!acc[key]) {
      acc[key] = {
        manufacturerID: key,
        manufacturerName: item.manufacturer_name,
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});
};

/**
 * Calculate the subtotal for a group of cart items.
 */
export const vendorSubtotal = (items) =>
  items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

/**
 * Format a dollar amount as a USD string.
 */
export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

/** Unit price for a quantity, honoring volume_pricing tiers when present. */
export const getUnitPriceForQuantity = (product, quantity) => {
  const base = Number(product?.unit_price) || 0;
  const tiers = product?.volume_pricing;
  if (!Array.isArray(tiers) || tiers.length === 0) return base;

  const sorted = tiers
    .slice()
    .sort((a, b) => (Number(b.volumeQuantity) || 0) - (Number(a.volumeQuantity) || 0));
  const tier = sorted.find((t) => quantity >= (Number(t.volumeQuantity) || 0));
  const tierPrice = tier?.unitPrice != null ? Number(tier.unitPrice) : null;
  return tierPrice != null && Number.isFinite(tierPrice) ? tierPrice : base;
};

/**
 * Map MarketTime manufacturerOrderStatus values to human-readable labels.
 * MT uses uppercase codes (e.g. NOT TRANSMITTED, OPEN).
 */
export const ORDER_STATUS_LABELS = {
  'NOT TRANSMITTED': 'Pending Review',
  OPEN: 'Submitted',
  RECEIVED: 'Processing',
  SHIPPED: 'On Its Way',
  COMPLETE: 'Delivered',
};

export const normalizeOrderStatus = (status) =>
  (status ?? '').trim().toUpperCase();

export const getOrderStatusLabel = (status) =>
  ORDER_STATUS_LABELS[normalizeOrderStatus(status)] ?? status;
