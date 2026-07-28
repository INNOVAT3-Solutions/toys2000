/**
 * Approve MarketTime customers for the rep group (makes them visible in Jimmy's customer list).
 *
 * Usage:
 *   npm run approve:customers -- B26446906 B26446907
 *   npm run approve:customers -- --file ids.txt
 */

import { readFileSync } from 'fs';
import { approveCustomerForRepGroup } from '../lib/markettime.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadIds(argv) {
  const fileFlag = argv.indexOf('--file');
  if (fileFlag !== -1) {
    const path = argv[fileFlag + 1];
    if (!path) throw new Error('Provide a file path after --file');
    return readFileSync(path, 'utf8')
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);
  }

  return argv.filter((arg) => !arg.startsWith('--'));
}

async function main() {
  const ids = loadIds(process.argv.slice(2));
  if (!ids.length) {
    console.error('Usage: npm run approve:customers -- B26446906 B26446907');
    console.error('   or: npm run approve:customers -- --file ids.txt');
    process.exit(1);
  }

  let approved = 0;
  let failed = 0;

  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    try {
      await approveCustomerForRepGroup(id);
      approved += 1;
      console.log(`✓ ${id}`);
    } catch (err) {
      failed += 1;
      console.error(`✗ ${id}: ${err.message}`);
    }
    if (i < ids.length - 1) await sleep(300);
  }

  console.log(`\nDone: ${approved} approved, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
