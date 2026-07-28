'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { formatCurrency, snapQuantity } from '@/lib/cart';
import {
  getClosestUnmetPromotion,
  suggestProductsForRemaining,
} from '@/lib/promotion-suggestions';

export default function PromotionSuggestions({
  manufacturerID,
  manufacturerName,
  subtotal,
  promotions = [],
  cartItemIds = [],
}) {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  const targetPromo = useMemo(
    () => getClosestUnmetPromotion(promotions, subtotal),
    [promotions, subtotal]
  );

  useEffect(() => {
    if (!manufacturerID || !targetPromo) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/catalog?manufacturer_id=${encodeURIComponent(manufacturerID)}&limit=100`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const suggestions = suggestProductsForRemaining(
          data.products ?? [],
          targetPromo.remaining,
          cartItemIds,
          { limit: 4 }
        );
        setProducts(suggestions);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [manufacturerID, targetPromo, cartItemIds.join(',')]);

  if (!targetPromo) return null;

  const handleAdd = async (product) => {
    const qty = snapQuantity(
      product.minimum_quantity || 1,
      product.minimum_quantity,
      product.quantity_increment
    );
    setAddingId(product.record_id);
    try {
      await addToCart({ product, quantity: qty });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-[#00aeef]/30 bg-[#f0f9ff] px-4 py-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-[#0c4a6e]">
          Suggested add-ons for {targetPromo.title}
        </p>
        <p className="text-xs text-[#0369a1] mt-0.5">
          Add {formatCurrency(targetPromo.remaining)} more from {manufacturerName} to unlock this promotion.
        </p>
      </div>

      {loading && (
        <p className="text-xs text-[#0369a1]">Finding items…</p>
      )}

      {!loading && products.length === 0 && (
        <p className="text-xs text-[#0369a1]">
          No close matches in catalog —{' '}
          <Link href={`/catalog/${encodeURIComponent(manufacturerID)}`} className="font-semibold underline">
            browse {manufacturerName}
          </Link>
          {' '}to add more.
        </p>
      )}

      {!loading && products.length > 0 && (
        <ul className="space-y-2">
          {products.map(({ product, lineTotal, overshoot }) => {
            const meetsPromo = lineTotal >= targetPromo.remaining;
            return (
              <li
                key={product.record_id}
                className="flex items-center gap-3 bg-white/80 rounded-lg border border-[#bae6fd] px-3 py-2"
              >
                {product.primary_image_url ? (
                  <div className="relative w-12 h-12 rounded-md overflow-hidden bg-white flex-shrink-0">
                    <Image
                      src={product.primary_image_url}
                      alt={product.name}
                      fill
                      className="object-contain p-1"
                      sizes="48px"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-md bg-[#eef0f4] flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${product.record_id}`}
                    className="text-sm font-medium text-[#1a1d26] hover:text-[#f15a24] line-clamp-1"
                  >
                    {product.name}
                  </Link>
                  <p className="text-xs text-[#5f6980] mt-0.5">
                    {formatCurrency(product.unit_price)} × {product.minimum_quantity || 1} min
                    {' · '}
                    {formatCurrency(lineTotal)} line
                    {meetsPromo && overshoot >= 0 && (
                      <span className="text-green-700">
                        {' '}(+{formatCurrency(overshoot)} over threshold)
                      </span>
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAdd(product)}
                  disabled={addingId === product.record_id}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #00aeef, #0090c8)' }}
                >
                  {addingId === product.record_id ? 'Adding…' : 'Add'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
