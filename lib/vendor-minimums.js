/**
 * Vendor minimum order amounts — sourced from MarketTime at checkout time.
 *
 * Client components should use `useManufacturerCheckoutInfo` or
 * GET /api/markettime/manufacturer/{id}/checkout-info.
 *
 * This module remains for server-side helpers and backward-compatible imports.
 */

export {
  getManufacturerMinimum,
  getManufacturerReorderMinimum,
  meetsVendorMinimum,
  normalizePromotions,
} from './manufacturer-checkout.js';

/** @deprecated Use live MT data via checkout-info API. Always returns 0. */
export const getVendorMinimum = () => 0;

export default {};
