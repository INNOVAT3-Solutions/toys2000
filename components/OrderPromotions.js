'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/cart';
import { partitionFreightPromotions } from '@/lib/manufacturer-checkout';
import FreightNudge from './FreightNudge';

function MetPromotionCard({ promo }) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      <p className="font-semibold">
        {promo.title} — threshold met!
      </p>
      {promo.description && (
        <p className="text-xs mt-1 text-green-700">{promo.description}</p>
      )}
      {promo.shippingMethod && (
        <p className="text-xs mt-1 text-green-700">
          Eligible for free {promo.shippingMethod} shipping on this order.
        </p>
      )}
    </div>
  );
}

function OtherPromotionCard({ promo }) {
  return (
    <div className="rounded-xl border border-[#f15a24]/25 bg-[#fff5f0] px-4 py-3 text-sm">
      <p className="font-semibold text-[#1a1d26]">{promo.title}</p>
      {promo.description && (
        <p className="text-xs text-[#5f6980] mt-1 leading-relaxed">{promo.description}</p>
      )}
      {promo.discountPercent > 0 && (
        <p className="text-xs font-medium text-[#f15a24] mt-1">
          {promo.discountPercent}% off when eligible
        </p>
      )}
    </div>
  );
}

/**
 * Shows active MarketTime promotions during cart/checkout.
 * Cart (`mode="full"`): all freight progress bars + suggestions context.
 * Checkout (`mode="checkout"`): met promos only; missed behind a toggle.
 */
export default function OrderPromotions({
  promotions = [],
  subtotal = 0,
  manufacturerName,
  mode = 'full',
}) {
  if (!promotions?.length) return null;

  const { metFreight, missedFreight, otherPromos } = partitionFreightPromotions(
    promotions,
    subtotal
  );

  if (mode === 'checkout') {
    return (
      <CheckoutPromotions
        metFreight={metFreight}
        missedFreight={missedFreight}
        otherPromos={otherPromos}
        subtotal={subtotal}
        manufacturerName={manufacturerName}
      />
    );
  }

  return (
    <div className="space-y-3">
      {missedFreight.map((promo) => (
        <FreightNudge
          key={promo.recordID ?? promo.title}
          promotions={[promo]}
          subtotal={subtotal}
          manufacturerName={manufacturerName}
        />
      ))}

      {otherPromos.map((promo) => (
        <OtherPromotionCard key={promo.recordID ?? promo.title} promo={promo} />
      ))}

      {metFreight.map((promo) => (
        <MetPromotionCard key={`met-${promo.recordID ?? promo.title}`} promo={promo} />
      ))}
    </div>
  );
}

function CheckoutPromotions({
  metFreight,
  missedFreight,
  otherPromos,
  subtotal,
  manufacturerName,
}) {
  const [showMissed, setShowMissed] = useState(false);
  const hasMet = metFreight.length > 0;
  const hasMissed = missedFreight.length > 0;
  const hasOther = otherPromos.length > 0;

  if (!hasMet && !hasMissed && !hasOther) return null;

  return (
    <div className="space-y-3">
      {hasMet && metFreight.map((promo) => (
        <MetPromotionCard key={`met-${promo.recordID ?? promo.title}`} promo={promo} />
      ))}

      {hasOther && otherPromos.map((promo) => (
        <OtherPromotionCard key={promo.recordID ?? promo.title} promo={promo} />
      ))}

      {!hasMet && hasMissed && !showMissed && (
        <p className="text-sm text-[#5f6980]">
          No promotion thresholds reached on this order yet.
        </p>
      )}

      {hasMissed && (
        <>
          <button
            type="button"
            onClick={() => setShowMissed((open) => !open)}
            className="text-sm font-semibold text-[#00aeef] hover:text-[#0090c8] transition-colors"
          >
            {showMissed
              ? 'Hide promotions not reached'
              : `Show ${missedFreight.length} promotion${missedFreight.length === 1 ? '' : 's'} not reached`}
          </button>

          {showMissed && (
            <div className="space-y-3 pt-1">
              {missedFreight.map((promo) => {
                const remaining = promo.amountToMeet - subtotal;
                return (
                  <div key={promo.recordID ?? promo.title} className="space-y-2">
                    <FreightNudge
                      promotions={[promo]}
                      subtotal={subtotal}
                      manufacturerName={manufacturerName}
                    />
                    <p className="text-xs text-[#5f6980] px-1">
                      {formatCurrency(remaining)} more from {manufacturerName} needed for {promo.title}.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
