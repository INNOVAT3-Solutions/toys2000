/**
 * Append-only health log for MarketTime API key checks.
 * Run via: npm run monitor:mt
 * Helps prove whether a 401 happened with the same fingerprint (server revoke)
 * vs a fingerprint change (someone updated .env or regenerated in MT).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { probeMarketTimeKey } from '../lib/mt-key-utils.js';

const LOG_DIR = join(process.cwd(), 'logs');
const LOG_FILE = join(LOG_DIR, 'mt-key-health.jsonl');

function appendLog(entry) {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
}

function readRecentLogs(limit = 20) {
  if (!existsSync(LOG_FILE)) return [];
  const lines = readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-limit).map((line) => JSON.parse(line));
}

function diagnose(result, recent) {
  const lines = [];

  if (result.ok) {
    lines.push('Key is healthy.');
    const lastFail = [...recent].reverse().find((row) => !row.ok);
    if (lastFail && lastFail.fingerprint === result.fingerprint) {
      lines.push(`Recovered since last failure at ${lastFail.checkedAt} (was HTTP ${lastFail.status}).`);
    }
    return lines;
  }

  const sameFingerprintFails = recent.filter(
    (row) => !row.ok && row.fingerprint === result.fingerprint
  );
  const prevSuccess = [...recent].reverse().find((row) => row.ok);

  if (prevSuccess && prevSuccess.fingerprint !== result.fingerprint) {
    lines.push('Fingerprint changed since last success — .env was updated or MT key was regenerated.');
  } else if (sameFingerprintFails.length >= 2) {
    lines.push('Repeated 401 with the SAME fingerprint — key was revoked server-side or in MT UI without a local .env change.');
    lines.push('Ask Jimmy if anyone clicked Generate Key in MarketTime Billing & Payment.');
    lines.push('If nobody regenerated, open a MarketTime support ticket with the fingerprint below.');
  } else if (prevSuccess && prevSuccess.fingerprint === result.fingerprint) {
    lines.push('Key worked before with this fingerprint, now fails — likely regenerated in MarketTime overnight.');
    lines.push(`Last success: ${prevSuccess.checkedAt}`);
  }

  if (result.status === 429) {
    lines.push('HTTP 429 is rate limiting — wait and retry. Do NOT regenerate the key.');
  }

  return lines;
}

async function main() {
  const result = await probeMarketTimeKey();
  const entry = {
    checkedAt: result.checkedAt,
    ok: result.ok,
    status: result.status,
    fingerprint: result.fingerprint,
    repGroupId: result.repGroupId,
    keyLength: result.keyLength,
    host: process.env.VERCEL ? 'vercel' : 'local',
  };

  appendLog(entry);
  const recent = readRecentLogs(50);

  console.log(`Checked at: ${entry.checkedAt}`);
  console.log(`Rep group: ${entry.repGroupId}`);
  console.log(`Fingerprint: ${entry.fingerprint}`);
  console.log(`Result: ${entry.ok ? 'OK' : `FAILED (HTTP ${entry.status})`}`);

  const hints = diagnose(result, recent);
  if (hints.length) {
    console.log('');
    console.log('Diagnosis:');
    for (const hint of hints) {
      console.log(`  • ${hint}`);
    }
  }

  if (!result.ok && result.body) {
    console.log('');
    console.log('MarketTime says:', result.body);
  }

  console.log('');
  console.log(`Log file: ${LOG_FILE}`);

  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
