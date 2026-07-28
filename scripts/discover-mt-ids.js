/**
 * MarketTime ID Discovery Script
 * Run: node scripts/discover-mt-ids.js YOUR_API_KEY
 *
 * Tries to discover MT_REP_GROUP_ID and MT_SALESPERSON_ID from the API key alone.
 */

const API_KEY = process.argv[2];

if (!API_KEY) {
  console.error('Usage: node scripts/discover-mt-ids.js YOUR_API_KEY');
  process.exit(1);
}

const BASE = 'https://publicapi.markettime.com/mtpublic/api/v1';

const get = async (url) => {
  const res = await fetch(url, {
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
};

const post = async (url, body = {}) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
};

async function main() {
  console.log('\n=== MarketTime ID Discovery ===\n');
  console.log(`API Key: ${API_KEY.slice(0, 6)}...${API_KEY.slice(-4)}\n`);

  // Step 1: Try the base URL with no whoAmI — may return account info or valid IDs
  console.log('Step 1: Probing base URL for account info...');
  const base = await get(`${BASE}/`);
  console.log('  Status:', base.status);
  if (base.data && typeof base.data === 'object') {
    console.log('  Response:', JSON.stringify(base.data, null, 2).slice(0, 500));
  } else {
    console.log('  Response:', String(base.data).slice(0, 200));
  }

  // Step 2: Try known rep group ID patterns — MT rep groups are format R followed by digits
  // The error message from a wrong whoAmI often reveals the correct one
  console.log('\nStep 2: Trying /me or /account endpoint...');
  const me = await get(`${BASE}/me`);
  console.log('  /me status:', me.status, '|', JSON.stringify(me.data).slice(0, 300));

  const account = await get(`${BASE}/account`);
  console.log('  /account status:', account.status, '|', JSON.stringify(account.data).slice(0, 300));

  // Step 3: Try repgroups endpoint — sometimes APIs have a self-discovery path
  console.log('\nStep 3: Trying repgroup discovery endpoints...');
  const rg1 = await get(`${BASE}/repgroups`);
  console.log('  /repgroups status:', rg1.status, '|', JSON.stringify(rg1.data).slice(0, 300));

  const rg2 = await get(`${BASE}/repgroup`);
  console.log('  /repgroup status:', rg2.status, '|', JSON.stringify(rg2.data).slice(0, 300));

  // Step 4: If any of the above gave us a rep group ID hint, try to fetch manufacturers
  // The error message from 403/404 often contains the correct rep group ID
  console.log('\nStep 4: Checking error responses for ID hints...');
  const hint = await get(`${BASE}/UNKNOWN/manufacturers`);
  console.log('  /UNKNOWN/manufacturers status:', hint.status);
  console.log('  Response:', JSON.stringify(hint.data).slice(0, 500));

  // Step 5: If you got a rep group ID from above, uncomment and fill in:
  // const REP_GROUP_ID = 'R12345'; // <-- fill in from above results
  // console.log('\nStep 5: Fetching manufacturers to find salesperson IDs...');
  // const mfrs = await get(`${BASE}/${REP_GROUP_ID}/manufacturers`);
  // console.log('  Status:', mfrs.status);
  // console.log('  Response:', JSON.stringify(mfrs.data).slice(0, 1000));

  // Step 6: Try to get salesperson info from orders (requires rep group ID)
  // const orders = await post(`${BASE}/${REP_GROUP_ID}/orders/get`, {});
  // console.log('\nStep 6: Sample order (to extract salesperson IDs)...');
  // console.log('  Status:', orders.status);
  // const firstOrder = orders.data?.response?.records?.[0];
  // if (firstOrder) {
  //   console.log('  salespersonOrderWriterID:', firstOrder.salespersonOrderWriterID);
  //   console.log('  salespersonAssignedID:', firstOrder.salespersonAssignedID);
  //   console.log('  repGroupID:', firstOrder.repGroupID);
  // }

  console.log('\n=== Done. Paste the output above to figure out the IDs. ===\n');
}

main().catch(console.error);
