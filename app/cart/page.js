'use client';

import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/components/CartProvider';
import OrderPromotions from '@/components/OrderPromotions';
import PromotionSuggestions from '@/components/PromotionSuggestions';
import VendorCheckoutTabs from '@/components/VendorCheckoutTabs';
import { groupByManufacturer, vendorSubtotal, formatCurrency, snapQuantity } from '@/lib/cart';
import { useManufacturerCheckoutInfos } from '@/lib/use-manufacturer-checkout-info';

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, clearCart, loading } = useCart();
  const [activeManufacturerIds, setActiveManufacturerIds] = useState(null);

  useEffect(() => {
    fetch('/api/manufacturers')
      .then((res) => res.json())
      .then((data) => {
        setActiveManufacturerIds(new Set((data.manufacturers ?? []).map((m) => m.manufacturer_id)));
      })
      .catch(() => setActiveManufacturerIds(new Set()));
  }, []);

  const grouped = useMemo(() => groupByManufacturer(cartItems), [cartItems]);
  const vendorGroups = useMemo(
    () => Object.values(grouped).sort((a, b) => a.manufacturerName.localeCompare(b.manufacturerName)),
    [grouped]
  );
  const manufacturerIds = useMemo(
    () => vendorGroups.map((group) => group.manufacturerID),
    [vendorGroups]
  );
  const [activeVendorId, setActiveVendorId] = useState(null);

  useEffect(() => {
    if (!vendorGroups.length) {
      setActiveVendorId(null);
      return;
    }
    setActiveVendorId((current) => (
      current && vendorGroups.some((group) => group.manufacturerID === current)
        ? current
        : vendorGroups[0].manufacturerID
    ));
  }, [vendorGroups]);
  const { byId: checkoutInfoById, loading: checkoutInfoLoading } = useManufacturerCheckoutInfos(manufacturerIds);
  const grandTotal = cartItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  const vendorTabs = useMemo(() => vendorGroups.map((group) => {
    const subtotal = vendorSubtotal(group.items);
    const minimum = checkoutInfoById[group.manufacturerID]?.minimumOrderAmount ?? 0;
    const isActiveVendor = activeManufacturerIds
      ? activeManufacturerIds.has(group.manufacturerID)
      : true;
    const belowMin = minimum > 0 && subtotal < minimum;

    return {
      manufacturerID: group.manufacturerID,
      manufacturerName: group.manufacturerName,
      subtotal,
      itemCount: group.items.reduce((sum, item) => sum + item.quantity, 0),
      ready: isActiveVendor && !belowMin,
    };
  }), [vendorGroups, checkoutInfoById, activeManufacturerIds]);

  const activeGroup = vendorGroups.find((group) => group.manufacturerID === activeVendorId)
    ?? vendorGroups[0]
    ?? null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#f15a24] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-[#eef0f4] flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-[#5f6980]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
            Your cart is empty
          </h1>
          <p className="text-[#5f6980] text-sm">Browse the catalog and add items to get started.</p>
          <Link
            href="/catalog"
            className="inline-block mt-4 px-6 py-3 rounded-xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)', fontFamily: "'Baloo 2', cursive" }}
          >
            Browse Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
            Your Cart
          </h1>
          <button
            onClick={() => clearCart()}
            className="text-sm text-[#5f6980] hover:text-red-500 transition-colors"
          >
            Clear all
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <VendorCheckoutTabs
              vendors={vendorTabs}
              activeId={activeGroup?.manufacturerID}
              mode="cart"
              onSelect={setActiveVendorId}
            />

            {activeGroup && (() => {
              const group = activeGroup;
              const subtotal = vendorSubtotal(group.items);
              const checkoutInfo = checkoutInfoById[group.manufacturerID];
              const minimum = checkoutInfo?.minimumOrderAmount ?? 0;
              const promotions = checkoutInfo?.promotions ?? [];
              const belowMin = minimum > 0 && subtotal < minimum;
              const isActiveVendor = activeManufacturerIds
                ? activeManufacturerIds.has(group.manufacturerID)
                : true;
              const checkoutDisabled = belowMin || !isActiveVendor;

              return (
                <div key={group.manufacturerID} className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                  {/* Vendor header */}
                  <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
                    <h2 className="font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
                      {group.manufacturerName}
                    </h2>
                    <button
                      onClick={() => clearCart(group.manufacturerID)}
                      className="text-xs text-[#5f6980] hover:text-red-500 transition-colors"
                    >
                      Remove all
                    </button>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-black/[0.04]">
                    {group.items.map((item) => (
                      <CartRow
                        key={item.id}
                        item={item}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeFromCart}
                      />
                    ))}
                  </div>

                  {/* Vendor footer */}
                  <div className="px-5 py-4 border-t border-black/[0.06] space-y-3">
                    {belowMin && (
                      <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800">
                        Minimum order for {group.manufacturerName} is {formatCurrency(minimum)}. Add {formatCurrency(minimum - subtotal)} more.
                      </div>
                    )}

                    {!isActiveVendor && (
                      <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-800">
                        {group.manufacturerName} is not available through Toys2000. Remove these items or shop an active brand.
                      </div>
                    )}

                    {!checkoutInfoLoading && (
                      <OrderPromotions
                        promotions={promotions}
                        subtotal={subtotal}
                        manufacturerName={group.manufacturerName}
                      />
                    )}

                    {!checkoutInfoLoading && (
                      <PromotionSuggestions
                        manufacturerID={group.manufacturerID}
                        manufacturerName={group.manufacturerName}
                        subtotal={subtotal}
                        promotions={promotions}
                        cartItemIds={group.items.map((item) => item.item_id)}
                      />
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#1a1d26]">
                        Subtotal: {formatCurrency(subtotal)}
                      </span>
                      <Link
                        href={`/checkout/${group.manufacturerID}`}
                        className={`cart-vendor-checkout-btn px-5 py-2.5 rounded-xl text-sm font-bold no-underline transition-all ${
                          checkoutDisabled ? 'opacity-50 pointer-events-none' : ''
                        }`}
                        style={{
                          background: 'linear-gradient(135deg, #f15a24, #ff7a4d)',
                          color: '#ffffff',
                          fontFamily: "'Baloo 2', cursive",
                        }}
                        aria-disabled={checkoutDisabled}
                      >
                        Checkout {group.manufacturerName} →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 sticky top-20">
              <h2 className="font-bold text-[#1a1d26] mb-4" style={{ fontFamily: "'Baloo 2', cursive" }}>
                Order Summary
              </h2>
              {vendorGroups.map((group) => {
                const subtotal = vendorSubtotal(group.items);
                const checkoutInfo = checkoutInfoById[group.manufacturerID];
                const minimum = checkoutInfo?.minimumOrderAmount ?? 0;
                const isActiveVendor = activeManufacturerIds
                  ? activeManufacturerIds.has(group.manufacturerID)
                  : true;
                const belowMin = minimum > 0 && subtotal < minimum;
                const canCheckout = isActiveVendor && !belowMin;
                const isActive = group.manufacturerID === activeGroup?.manufacturerID;

                return (
                  <div
                    key={group.manufacturerID}
                    className={`flex items-center justify-between gap-2 text-sm mb-2 rounded-lg px-2 py-1.5 -mx-2 ${
                      isActive ? 'bg-[#fff5f0]' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveVendorId(group.manufacturerID)}
                      className="text-left flex-1 min-w-0"
                    >
                      <span className={`truncate mr-2 block ${isActive ? 'text-[#1a1d26] font-semibold' : 'text-[#5f6980]'}`}>
                        {group.manufacturerName}
                      </span>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-semibold text-[#1a1d26]">{formatCurrency(subtotal)}</span>
                      {canCheckout && (
                        <Link
                          href={`/checkout/${group.manufacturerID}`}
                          className="text-xs font-bold text-[#f15a24] hover:underline no-underline"
                        >
                          Checkout
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-black/[0.06] pt-3 mt-3 flex justify-between font-bold text-[#1a1d26]">
                <span style={{ fontFamily: "'Baloo 2', cursive" }}>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
              <p className="text-xs text-[#5f6980] mt-3 leading-relaxed">
                Checkout is processed separately per vendor. Payment terms are Net 30 — no card required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartRow({ item, onUpdateQuantity, onRemove }) {
  const handleQtyChange = (delta) => {
    const next = item.quantity + delta * item.quantity_increment;
    if (next < item.minimum_quantity) {
      onRemove(item.id);
    } else {
      onUpdateQuantity(item.id, snapQuantity(next, item.minimum_quantity, item.quantity_increment));
    }
  };

  return (
    <div className="flex gap-4 px-5 py-4 items-start">
      {item.primary_image_url && (
        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#f7f8fa] flex-shrink-0">
          <Image
            src={item.primary_image_url}
            alt={item.name}
            fill
            className="object-contain p-2"
            sizes="80px"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <Link href={`/product/${item.item_id}`} className="text-sm font-semibold text-[#1a1d26] hover:text-[#f15a24] line-clamp-2">
          {item.name}
        </Link>
        <p className="text-xs text-[#5f6980] mt-0.5">{formatCurrency(item.unit_price)} each</p>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => handleQtyChange(-1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-base font-medium hover:bg-[#f7f8fa]">−</button>
          <span className="text-sm font-bold w-8 text-center">{item.quantity}</span>
          <button onClick={() => handleQtyChange(1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-base font-medium hover:bg-[#f7f8fa]">+</button>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="font-bold text-[#1a1d26]">{formatCurrency(item.unit_price * item.quantity)}</span>
        <button onClick={() => onRemove(item.id)} className="text-xs text-[#5f6980] hover:text-red-500 transition-colors">Remove</button>
      </div>
    </div>
  );
}
