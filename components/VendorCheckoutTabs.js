'use client';

import Link from 'next/link';
import { formatCurrency } from '@/lib/cart';

/**
 * Tab bar for switching between vendors in a multi-brand cart or checkout.
 *
 * @param {'cart' | 'checkout'} mode
 * @param {Array} vendors — { manufacturerID, manufacturerName, subtotal, itemCount?, ready? }
 */
export default function VendorCheckoutTabs({
  vendors = [],
  activeId,
  mode = 'cart',
  onSelect,
}) {
  if (vendors.length <= 1) return null;

  return (
    <div className="mb-4 -mx-1 overflow-x-auto">
      <div className="flex gap-2 min-w-max px-1 pb-1">
        {vendors.map((vendor) => {
          const isActive = vendor.manufacturerID === activeId;
          const label = (
            <>
              <span className="font-semibold truncate max-w-[10rem] sm:max-w-none">
                {vendor.manufacturerName}
              </span>
              <span className="text-xs opacity-80 whitespace-nowrap">
                {formatCurrency(vendor.subtotal)}
                {vendor.itemCount != null && ` · ${vendor.itemCount} item${vendor.itemCount === 1 ? '' : 's'}`}
              </span>
            </>
          );

          const className = [
            'flex flex-col items-start gap-0.5 px-4 py-2.5 rounded-xl border text-sm transition-all min-w-[9rem]',
            isActive
              ? 'border-[#f15a24] bg-[#fff5f0] text-[#1a1d26] shadow-sm'
              : 'border-black/[0.08] bg-white text-[#5f6980] hover:border-[#f15a24]/40 hover:text-[#1a1d26]',
            vendor.ready === false ? 'opacity-70' : '',
          ].join(' ');

          if (mode === 'checkout') {
            return (
              <Link
                key={vendor.manufacturerID}
                href={`/checkout/${vendor.manufacturerID}`}
                className={`no-underline ${className}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {label}
              </Link>
            );
          }

          return (
            <button
              key={vendor.manufacturerID}
              type="button"
              onClick={() => onSelect?.(vendor.manufacturerID)}
              className={className}
              aria-current={isActive ? 'true' : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[#5f6980] mt-2 px-1">
        {mode === 'checkout'
          ? 'Each vendor is checked out separately. Switch tabs to place orders with other brands in your cart.'
          : 'Select a vendor to review items, promotions, and checkout.'}
      </p>
    </div>
  );
}
