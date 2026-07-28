'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { snapQuantity, formatCurrency, getUnitPriceForQuantity } from '@/lib/cart';

export default function QuickView({ product, open, onClose, onAddToCart, showPrices = true }) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product) {
      setQuantity(product.minimum_quantity || 1);
    }
  }, [product]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !product) return null;

  const {
    name,
    manufacturer_name,
    unit_price,
    primary_image_url,
    minimum_quantity = 1,
    quantity_increment = 1,
    volume_pricing,
  } = product;

  const unitPrice = showPrices ? getUnitPriceForQuantity(product, quantity) : null;
  const lineTotal = unitPrice != null ? unitPrice * quantity : null;
  const tiers = Array.isArray(volume_pricing) ? volume_pricing : [];

  const handleQty = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta * quantity_increment;
      return Math.max(minimum_quantity, next);
    });
  };

  const handleQtyInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setQuantity(snapQuantity(val, minimum_quantity, quantity_increment));
    }
  };

  const handleAdd = () => {
    onAddToCart({ product, quantity });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 text-[#5f6980] hover:bg-[#f7f8fa] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
            <div className="relative aspect-square bg-[#f7f8fa] rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none overflow-hidden">
              {primary_image_url ? (
                <Image
                  src={primary_image_url}
                  alt={name}
                  fill
                  className="object-contain p-6"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[#5f6980] text-sm">No image</div>
              )}
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div>
                <p className="text-xs text-[#5f6980] font-medium">{manufacturer_name}</p>
                <h2 className="text-xl font-bold text-[#1a1d26] mt-1" style={{ fontFamily: "'Baloo 2', cursive" }}>
                  {name}
                </h2>
              </div>

              {showPrices ? (
                <div>
                  <p className="text-xs font-semibold text-[#5f6980] uppercase tracking-wide mb-2">Pricing</p>
                  {tiers.length > 0 ? (
                    <div className="space-y-1">
                      {tiers.map((tier, i) => (
                        <div key={i} className="flex justify-between text-sm text-[#5f6980]">
                          <span>{tier.volumeQuantity}+ units</span>
                          <span className="font-semibold text-[#1a1d26]">{formatCurrency(tier.unitPrice)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-[#1a1d26]">{formatCurrency(unit_price)}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#5f6980]">Sign in to see wholesale pricing.</p>
              )}

              <div>
                <p className="text-xs font-semibold text-[#5f6980] uppercase tracking-wide mb-2">
                  Quantity {minimum_quantity > 1 && <span className="normal-case">(min {minimum_quantity}, increments of {quantity_increment})</span>}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleQty(-1)} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-[#1a1d26] hover:bg-[#f7f8fa] text-lg font-medium">−</button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={handleQtyInput}
                    onBlur={() => setQuantity(snapQuantity(quantity, minimum_quantity, quantity_increment))}
                    className="w-16 text-center border border-gray-200 rounded-lg py-1.5 text-sm font-semibold focus:outline-none focus:border-[#f15a24]"
                    min={minimum_quantity}
                    step={quantity_increment}
                  />
                  <button onClick={() => handleQty(1)} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-[#1a1d26] hover:bg-[#f7f8fa] text-lg font-medium">+</button>
                </div>
              </div>

              {showPrices && lineTotal != null && (
                <div className="flex justify-between items-baseline font-bold text-[#1a1d26]">
                  <span style={{ fontFamily: "'Baloo 2', cursive" }}>Total</span>
                  <span className="text-2xl">{formatCurrency(lineTotal)}</span>
                </div>
              )}

              {showPrices && (
                <button
                  onClick={handleAdd}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)', fontFamily: "'Baloo 2', cursive" }}
                >
                  Add to cart
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
