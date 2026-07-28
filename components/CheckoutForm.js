'use client';

import { useState, useEffect, useRef } from 'react';
import { generatePO } from '@/lib/po-number';
import { formatCurrency, vendorSubtotal } from '@/lib/cart';
import { formatPaymentTermsLabel } from '@/lib/payment-terms';
import OrderPromotions from './OrderPromotions';
import { useManufacturerCheckoutInfo } from '@/lib/use-manufacturer-checkout-info';
import toast from 'react-hot-toast';

import { getShipToRecordId } from '@/lib/build-markettime-order';

function getIdempotencyKey(manufacturerID) {
  const storageKey = `checkout-idempotency-${manufacturerID}`;
  let key = sessionStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
  }
  return key;
}

function clearIdempotencyKey(manufacturerID) {
  sessionStorage.removeItem(`checkout-idempotency-${manufacturerID}`);
}

export default function CheckoutForm({ group, customer, shipTos = [], shippingMethods = [], dataError, onSuccess }) {
  const { manufacturerID, manufacturerName, items } = group;

  const [poNumber, setPoNumber] = useState('');
  const [shipToID, setShipToID] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [shipDate, setShipDate] = useState('');
  const [cancelDate, setCancelDate] = useState('');
  const [acceptBackOrder, setAcceptBackOrder] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentTermsLabel, setPaymentTermsLabel] = useState('Net 30');
  const idempotencyKeyRef = useRef(null);

  const {
    minimumOrderAmount: minimum,
    promotions,
    loading: checkoutInfoLoading,
  } = useManufacturerCheckoutInfo(manufacturerID);

  const subtotal = vendorSubtotal(items);
  const belowMinimum = minimum > 0 && subtotal < minimum;

  useEffect(() => {
    idempotencyKeyRef.current = getIdempotencyKey(manufacturerID);
  }, [manufacturerID]);

  useEffect(() => {
    setPoNumber(generatePO());
    if (shipTos.length > 0) setShipToID(String(getShipToRecordId(shipTos[0]) ?? ''));
    if (shippingMethods.length > 0) {
      setShippingMethod(shippingMethods[0]?.shippingMethod ?? shippingMethods[0]?.name ?? '');
    } else {
      setShippingMethod('STANDARD');
    }
  }, [shipTos, shippingMethods]);

  useEffect(() => {
    fetch(`/api/markettime/manufacturer/${manufacturerID}/terms`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setPaymentTermsLabel(formatPaymentTermsLabel(data.terms));
      })
      .catch(() => {
        // Keep Net 30 fallback
      });
  }, [manufacturerID]);

  const activeShipToID = shipToID || String(getShipToRecordId(shipTos[0]) ?? '');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (belowMinimum) {
      toast.error(`Order must be at least ${formatCurrency(minimum)} for ${manufacturerName}.`);
      return;
    }

    if (!activeShipToID) {
      toast.error('Please select a ship-to address.');
      return;
    }

    setSubmitting(true);

    const payload = {
      manufacturerID,
      retailerShipToID: parseInt(activeShipToID, 10),
      poNumber: poNumber.trim(),
      shippingMethod,
      shipDate: shipDate || undefined,
      cancelDate: cancelDate || undefined,
      acceptBackOrder,
      orderDate: new Date().toISOString(),
      requestDate: new Date().toISOString(),
      details: items.map((item) => ({
        itemNumber: item.item_number,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        unitQty: item.unit_qty ?? item.quantity,
      })),
    };

    if (notes.trim()) {
      payload.specialInstructions = `${paymentTermsLabel}. ${notes.trim()}`;
    }

    const idempotencyKey = idempotencyKeyRef.current ?? getIdempotencyKey(manufacturerID);

    try {
      const res = await fetch('/api/markettime/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Order submission failed');
      }

      // Order placed — promotions were already shown pre-submit from MT checkout-info
      clearIdempotencyKey(manufacturerID);
      toast.success(`Order placed with ${manufacturerName}!`);
      onSuccess?.(data.order);
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vendor summary */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
        <h2 className="font-bold text-[#1a1d26] text-lg mb-4" style={{ fontFamily: "'Baloo 2', cursive" }}>
          {manufacturerName}
        </h2>

        {/* Items */}
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id ?? item.item_id ?? item.item_number} className="flex justify-between text-sm">
              <span className="text-[#1a1d26] line-clamp-1 flex-1 mr-4">{item.name} × {item.quantity}</span>
              <span className="font-semibold text-[#1a1d26] flex-shrink-0">{formatCurrency(item.unit_price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-black/[0.06] pt-3 flex justify-between font-bold">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        {belowMinimum && (
          <div className="mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
            Minimum order for {manufacturerName} is {formatCurrency(minimum)}. Add {formatCurrency(minimum - subtotal)} more to proceed.
          </div>
        )}
      </div>

      {/* Promotions + freight thresholds from MarketTime */}
      {!checkoutInfoLoading && (
        <OrderPromotions
          promotions={promotions}
          subtotal={subtotal}
          manufacturerName={manufacturerName}
          mode="checkout"
        />
      )}

      {/* Payment terms — read-only */}
      <div className="bg-[#f0fdf4] border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-green-800">{paymentTermsLabel} — No payment required now</p>
          <p className="text-xs text-green-700 mt-0.5">The vendor will contact you directly to arrange payment.</p>
        </div>
      </div>

      {/* Ship-to address */}
      {dataError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">Could not load checkout data</p>
          <p className="mt-1">{dataError}</p>
          {dataError.includes('API key') && (
            <p className="mt-2 text-xs text-red-600">
              Run <code>npm run verify:mt</code> after updating your key. Restart the dev server when done.
            </p>
          )}
        </div>
      )}

      {shippingMethods.length === 0 && !dataError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Shipping methods could not be loaded — defaulting to <strong>STANDARD</strong> freight.
        </div>
      )}

      {shipTos.length > 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 space-y-4">
          <h3 className="font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>Shipping</h3>

          <div>
            <label className="block text-sm font-medium text-[#1a1d26] mb-1.5">Ship-to address</label>
            <select
              value={activeShipToID}
              onChange={(e) => setShipToID(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#f15a24]"
            >
              {shipTos.map((s, index) => {
                const id = String(getShipToRecordId(s) ?? '');
                return (
                  <option key={id || index} value={id}>
                    {s.addressName || s.address1} — {s.city}, {s.state}
                  </option>
                );
              })}
            </select>
          </div>

          {shippingMethods.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#1a1d26] mb-1.5">Shipping method</label>
              <select
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#f15a24]"
              >
                {shippingMethods.map((m, index) => (
                  <option key={m.recordID ?? m.shippingMethod ?? m.name ?? index} value={m.shippingMethod ?? m.name}>
                    {m.shippingMethod ?? m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1d26] mb-1.5">Requested ship date</label>
              <input
                type="date"
                value={shipDate}
                onChange={(e) => setShipDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#f15a24]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1d26] mb-1.5">Cancel if not shipped by</label>
              <input
                type="date"
                value={cancelDate}
                onChange={(e) => setCancelDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#f15a24]"
              />
            </div>
          </div>
        </div>
      ) : !dataError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">No ship-to addresses found</p>
          <p className="mt-1">
            Your MarketTime account needs at least one ship-to location before you can place orders.
            Contact Toys2000 if this looks wrong.
          </p>
        </div>
      )}

      {/* Order details */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-5 space-y-4">
        <h3 className="font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>Order Details</h3>

        <div>
          <label className="block text-sm font-medium text-[#1a1d26] mb-1.5">PO Number</label>
          <input
            type="text"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-[#f15a24]"
            placeholder="T2K-YYYYMMDD-XXXX"
          />
          <p className="text-xs text-[#5f6980] mt-1">Auto-generated — edit if you have your own PO number.</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="backorder"
            checked={acceptBackOrder}
            onChange={(e) => setAcceptBackOrder(e.target.checked)}
            className="w-4 h-4 accent-[#f15a24]"
          />
          <label htmlFor="backorder" className="text-sm text-[#1a1d26]">
            Accept backorders if items are temporarily out of stock
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1a1d26] mb-1.5">Additional notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#f15a24] resize-none"
            placeholder="Any special instructions for this order…"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || belowMinimum || (shipTos.length > 0 && !activeShipToID)}
        className="w-full py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)', fontFamily: "'Baloo 2', cursive", fontSize: '1rem' }}
      >
        {submitting ? 'Placing order…' : `Place order with ${manufacturerName}`}
      </button>
    </form>
  );
}
