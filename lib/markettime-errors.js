import { NextResponse } from 'next/server';

export const MT_AUTH_FAILED_MESSAGE =
  'MarketTime API key is invalid or expired. Regenerate it in MarketTime (Billing & Payment → API Key), set MT_API_KEY in .env, then restart the dev server.';

export function isMarketTimeAuthError(err) {
  const message = err?.message ?? String(err ?? '');
  return /401|unauthorized/i.test(message);
}

/** Map MarketTime client errors to actionable API responses. */
export function marketTimeErrorResponse(err) {
  if (isMarketTimeAuthError(err)) {
    return NextResponse.json(
      { error: MT_AUTH_FAILED_MESSAGE, code: 'mt_auth_failed' },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: err.message }, { status: 502 });
}
