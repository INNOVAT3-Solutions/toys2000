'use client';

import { formatCurrency } from '@/lib/cart';

/**
 * Shows a free freight progress bar if the vendor has an active promotion.
 *
 * CRITICAL: The MarketTime API returns `dicountPercentage` (missing 's') —
 * this is intentional and matches the real API response. Do NOT rename to
 * `discountPercentage` or the field will always be undefined.
 */
export default function FreightNudge({ promotions = [], subtotal = 0, manufacturerName }) {
  if (!promotions?.length) return null;

  const now = new Date();

  const activePromo = promotions.find((promo) => {
    const end = promo.endDate ? new Date(promo.endDate) : null;
    return !end || end > now;
  });

  if (!activePromo) return null;

  const { amountToMeet, title, shippingMethod, dicountPercentage } = activePromo;

  if (!amountToMeet || subtotal >= amountToMeet) return null;

  const remaining = amountToMeet - subtotal;
  const progress = Math.min(100, Math.round((subtotal / amountToMeet) * 100));

  return (
    <div className="rounded-xl border border-[#00aeef]/30 bg-[#00aeef]/5 px-4 py-3 text-sm">
      <p className="font-semibold text-[#1a1d26] mb-1.5">
        Add{' '}
        <span style={{ color: '#00aeef' }}>{formatCurrency(remaining)}</span>{' '}
        more from {manufacturerName} for{' '}
        {shippingMethod ? `free ${shippingMethod} shipping` : 'free shipping'}!
      </p>
      {title && <p className="text-xs text-[#5f6980] mb-2">{title}</p>}
      <div className="h-2 bg-[#eef0f4] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: '#00aeef' }}
        />
      </div>
      <p className="text-xs text-[#5f6980] mt-1 text-right">{progress}% there</p>
    </div>
  );
}
