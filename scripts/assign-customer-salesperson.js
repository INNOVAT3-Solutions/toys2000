/**
 * Assign MT_SALESPERSON_ID to customers from an Excel upload (by company name).
 * Skips customers that already have the salesperson on their primary ship-to.
 *
 * Usage:
 *   node --env-file=.env scripts/assign-customer-salesperson.js path/to/customers.xlsx
 */

import fs from 'fs';
import { readExcelBuffer } from '../lib/customer-upload.js';
import {
  assignSalespersonToCustomerShipTo,
  getCustomer,
  searchCustomers,
} from '../lib/markettime.js';
import { getMarketTimeConfig } from '../lib/markettime-config.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findCustomerByName(name) {
  const records = await searchCustomers([
    { field: 'name', operator: 'eq', value: name },
  ]);
  const list = Array.isArray(records) ? records : records?.records ?? [];
  return list.find(
    (customer) => (customer.name || '').trim().toUpperCase() === name.trim().toUpperCase()
  ) ?? null;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node --env-file=.env scripts/assign-customer-salesperson.js path/to/file.xlsx');
    process.exit(1);
  }

  const { salespersonId } = getMarketTimeConfig();
  if (!salespersonId) {
    console.error('MT_SALESPERSON_ID is not configured.');
    process.exit(1);
  }

  const parsed = readExcelBuffer(fs.readFileSync(filePath));
  const rows = parsed.rows.filter((row) => row.valid);

  let assigned = 0;
  let alreadyAssigned = 0;
  let notFound = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const { companyName, payload } = rows[i];
    const customer = await findCustomerByName(payload.name);

    if (!customer?.recordID) {
      notFound += 1;
      console.log(`[skip] not found: ${companyName}`);
      await sleep(120);
      continue;
    }

    const full = await getCustomer(customer.recordID);
    const shipTos = full?.shipToLocations ?? [];
    const primary = shipTos.find((loc) => loc.isPrimary) ?? shipTos[0];

    if (!primary?.recordID) {
      failed += 1;
      console.log(`[fail] no ship-to: ${companyName} (${customer.recordID})`);
      await sleep(120);
      continue;
    }

    if (primary.salespersonIDs?.includes(salespersonId)) {
      alreadyAssigned += 1;
      console.log(`[ok] already assigned: ${companyName}`);
      await sleep(120);
      continue;
    }

    try {
      await assignSalespersonToCustomerShipTo({
        customerId: customer.recordID,
        shipToLocationId: primary.recordID,
        salespersonId,
      });
      assigned += 1;
      console.log(`[assigned] ${companyName} (${customer.recordID})`);
    } catch (err) {
      failed += 1;
      console.log(`[fail] ${companyName}: ${err.message}`);
    }

    if (i < rows.length - 1) await sleep(500);
  }

  console.log('\nDone.');
  console.log({
    salespersonId,
    totalValidRows: rows.length,
    assigned,
    alreadyAssigned,
    notFound,
    failed,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
