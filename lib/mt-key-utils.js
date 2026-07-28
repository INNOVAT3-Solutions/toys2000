import { createHash } from 'crypto';
import { getMarketTimeConfig } from './markettime-config.js';

const BASE_URL = 'https://publicapi.markettime.com/mtpublic/api/v1';

export function keyFingerprint(apiKey) {
  return createHash('sha256').update(apiKey).digest('hex').slice(0, 12);
}

/**
 * Lightweight auth probe against MarketTime.
 */
export async function probeMarketTimeKey(config = getMarketTimeConfig()) {
  const url = `${BASE_URL}/${config.repGroupId}/manufacturers?offset=0&recordSize=1`;
  const startedAt = new Date().toISOString();

  let res;
  let body = '';

  try {
    res = await fetch(url, {
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    body = await res.text();
  } catch (err) {
    return {
      ok: false,
      status: 0,
      fingerprint: keyFingerprint(config.apiKey),
      repGroupId: config.repGroupId,
      keyLength: config.apiKey.length,
      checkedAt: startedAt,
      error: err.message,
      body: '',
    };
  }

  return {
    ok: res.ok,
    status: res.status,
    fingerprint: keyFingerprint(config.apiKey),
    repGroupId: config.repGroupId,
    keyLength: config.apiKey.length,
    checkedAt: startedAt,
    body: body.slice(0, 400),
  };
}
