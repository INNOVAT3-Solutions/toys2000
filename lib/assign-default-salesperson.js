import { assignSalespersonToCustomerShipTo, getCustomerShipTos } from './markettime.js';
import { getMarketTimeConfig } from './markettime-config.js';

/**
 * Assign MT_SALESPERSON_ID to the customer's primary ship-to if not already set.
 * Best-effort — failures are logged but do not block account linking.
 */
export async function ensureDefaultSalesperson(retailerId) {
  const { salespersonId } = getMarketTimeConfig();
  if (!salespersonId || !retailerId) {
    return { assigned: false, reason: 'not_configured' };
  }

  const shipTosRaw = await getCustomerShipTos(retailerId);
  const shipTos = Array.isArray(shipTosRaw) ? shipTosRaw : shipTosRaw?.records ?? [];
  const primary = shipTos.find((loc) => loc.isPrimary) ?? shipTos[0];
  const shipToLocationId = primary?.recordID;

  if (!shipToLocationId) {
    return { assigned: false, reason: 'no_shipto' };
  }

  const existing = primary.salespersonIDs ?? [];
  if (existing.includes(salespersonId)) {
    return { assigned: false, reason: 'already_assigned' };
  }

  await assignSalespersonToCustomerShipTo({
    customerId: retailerId,
    shipToLocationId,
    salespersonId,
  });

  return { assigned: true, shipToLocationId, salespersonId };
}
