import { getSalesperson } from './markettime.js';

/**
 * Salesperson IDs assigned on the primary ship-to, or any ship-to if none on primary.
 */
export function getAssignedSalespersonIds(shipTos) {
  const list = Array.isArray(shipTos) ? shipTos : [];
  const primary = list.find((shipTo) => shipTo.isPrimary) ?? list[0];
  const primaryIds = primary?.salespersonIDs ?? [];

  if (primaryIds.length > 0) {
    return [...new Set(primaryIds.map(String))];
  }

  return [
    ...new Set(
      list
        .flatMap((shipTo) => shipTo.salespersonIDs ?? [])
        .map(String)
        .filter(Boolean)
    ),
  ];
}

export function formatSalespersonPhone(person) {
  return person?.phone || person?.cell || null;
}

export function formatSalespersonAddress(person) {
  if (!person) return null;

  const line1 = [person.address1, person.address2].filter(Boolean).join(', ');
  const line2 = [person.city, person.state, person.zip].filter(Boolean).join(', ');
  const parts = [line1, line2, person.country].filter(Boolean);
  return parts.length ? parts : null;
}

/** Load salesperson profiles for IDs on the customer's ship-to locations. */
export async function getSalespeopleForShipTos(shipTos) {
  const ids = getAssignedSalespersonIds(shipTos);
  if (ids.length === 0) return [];

  const people = await Promise.all(
    ids.map(async (id) => {
      try {
        return await getSalesperson(id);
      } catch (err) {
        console.warn(`[customer-salesperson] Could not load ${id}:`, err.message);
        return null;
      }
    })
  );

  return people.filter(Boolean);
}
