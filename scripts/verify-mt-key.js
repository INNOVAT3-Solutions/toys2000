import { probeMarketTimeKey } from '../lib/mt-key-utils.js';

async function main() {
  let result;
  try {
    result = await probeMarketTimeKey();
  } catch (err) {
    console.error('Config error:', err.message);
    process.exit(1);
  }

  console.log(`Rep group: ${result.repGroupId}`);
  console.log(`Key fingerprint: ${result.fingerprint} (if this changes, your .env was edited)`);
  console.log(`Key length: ${result.keyLength} chars`);

  if (result.ok) {
    console.log('MarketTime API key is valid.');
    process.exit(0);
  }

  console.error(`MarketTime API rejected the key (HTTP ${result.status}).`);

  if (result.status === 429) {
    console.error('');
    console.error('This is rate limiting (too many requests), NOT an expired key.');
    console.error('Wait a few minutes and retry. Do not regenerate the API key.');
  } else if (result.status === 401) {
    console.error('');
    console.error('401 = authentication failed. MarketTime does not document daily key expiry or');
    console.error('usage caps that revoke keys. Common causes:');
    console.error('  • Someone regenerated the key in MarketTime (invalidates the old one instantly)');
    console.error('  • .env on this machine differs from where the key was last updated');
    console.error('  • Vercel/production env has a different MT_API_KEY than local .env');
    console.error('');
    console.error('Before regenerating: note the fingerprint above. If it is UNCHANGED from');
    console.error('yesterday but you still get 401, contact MarketTime support — the key was');
    console.error('revoked server-side, not by this app.');
    console.error('');
    console.error('Run npm run monitor:mt to log checks and compare fingerprints over time.');
    console.error('');
    console.error('To fix locally: Billing & Payment → API Key → Generate Key → update .env → restart dev.');
  } else {
    console.error('');
    console.error('Response:', result.body);
  }

  if (result.body) {
    console.error('');
    console.error('MarketTime says:', result.body);
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
