/**
 * Read MarketTime credentials at request time (not module load time).
 * Next.js can cache module-scope env reads; trimming avoids copy/paste issues.
 */
export function getMarketTimeConfig() {
  const repGroupId = process.env.MT_REP_GROUP_ID?.trim();
  const apiKey = process.env.MT_API_KEY?.trim();
  const salespersonId = process.env.MT_SALESPERSON_ID?.trim();

  if (!repGroupId || !apiKey) {
    throw new Error('MarketTime env vars (MT_REP_GROUP_ID, MT_API_KEY) are not configured.');
  }

  return { repGroupId, apiKey, salespersonId };
}
