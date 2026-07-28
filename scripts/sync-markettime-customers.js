import { runCustomerSync } from '../lib/sync-customers.js';

const requiredEnv = [
  'MT_API_KEY',
  'MT_REP_GROUP_ID',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

console.log('Syncing MarketTime customer approvals to Supabase profiles...');

runCustomerSync()
  .then((result) => {
    console.log('\nCustomer sync summary:');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error('Customer sync failed:', err);
    process.exit(1);
  });
