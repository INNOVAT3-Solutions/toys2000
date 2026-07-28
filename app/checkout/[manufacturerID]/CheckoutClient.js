'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import AdRails from '@/components/AdRails';
import CheckoutForm from '@/components/CheckoutForm';
import VendorCheckoutTabs from '@/components/VendorCheckoutTabs';
import { groupByManufacturer, vendorSubtotal } from '@/lib/cart';

export default function CheckoutClient({ manufacturerID, manufacturerName, profile }) {
  const router = useRouter();
  const { cartItems, clearCart, loading, liveByItemId, refreshLivePricing } = useCart();
  const [shipTos, setShipTos] = useState([]);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [completingOrder, setCompletingOrder] = useState(false);

  useEffect(() => {
    if (!cartItems.length) return;
    void refreshLivePricing().catch((err) => {
      console.warn('[checkout] live pricing refresh failed', err);
    });
  }, [cartItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => groupByManufacturer(cartItems), [cartItems]);
  const vendorGroup = grouped[manufacturerID];
  const vendorTabs = useMemo(() => (
    Object.values(grouped)
      .sort((a, b) => a.manufacturerName.localeCompare(b.manufacturerName))
      .map((group) => ({
        manufacturerID: group.manufacturerID,
        manufacturerName: group.manufacturerName,
        subtotal: vendorSubtotal(group.items),
        itemCount: group.items.reduce((sum, item) => sum + item.quantity, 0),
      }))
  ), [grouped]);

  useEffect(() => {
    if (!profile?.retailer_id) { setDataLoading(false); return; }

    const loadShipTos = fetch(`/api/markettime/customer/${profile.retailer_id}/shiptos`).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to load ship-to addresses');
      return data.shipTos ?? [];
    });

    const loadShipping = fetch(`/api/markettime/manufacturer/${manufacturerID}/shipping`).then(async (r) => {
      const data = await r.json();
      if (!r.ok) {
        console.warn('Shipping methods unavailable:', data.error);
        return [];
      }
      return data.shippingMethods ?? [];
    });

    Promise.all([loadShipTos, loadShipping])
      .then(([shipToList, methodList]) => {
        setShipTos(shipToList);
        setShippingMethods(methodList);
        if (methodList.length === 0) {
          setDataError(null);
        }
      })
      .catch((err) => setDataError(err.message))
      .finally(() => setDataLoading(false));
  }, [profile?.retailer_id, manufacturerID]);

  const handleSuccess = async (order) => {
    const orderId = order.recordID ?? order.id;
    setCompletingOrder(true);
    router.push(`/orders/${orderId}`);
    await clearCart(manufacturerID);
  };

  if (loading || dataLoading || completingOrder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-[#f15a24] border-t-transparent rounded-full animate-spin" />
        {completingOrder && (
          <p className="text-sm text-[#5f6980]">Order placed! Taking you to your order…</p>
        )}
      </div>
    );
  }

  if (!vendorGroup) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4 text-center">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
            No items from {manufacturerName}
          </h1>
          <p className="text-[#5f6980] text-sm">Your cart doesn&apos;t have any items from this brand.</p>
          <Link href="/cart" className="inline-block text-sm font-semibold text-[#f15a24] hover:underline">← Back to cart</Link>
        </div>
      </div>
    );
  }

  if (!profile?.retailer_id) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
            Account Pending Approval
          </h1>
          <p className="text-[#5f6980] text-sm leading-relaxed">
            Your account hasn&apos;t been linked to a MarketTime retailer ID yet. Contact Toys2000 to get approved and start placing orders.
          </p>
          <Link href="/catalog" className="inline-block text-sm font-semibold text-[#f15a24] hover:underline">
            Continue browsing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] products-page">
      <AdRails>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-12">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#5f6980] mb-6">
            <Link href="/cart" className="hover:text-[#f15a24]">← Cart</Link>
            <span>›</span>
            <span className="text-[#1a1d26] font-medium">Checkout — {manufacturerName}</span>
          </div>

          <h1 className="text-3xl font-bold text-[#1a1d26] mb-6" style={{ fontFamily: "'Baloo 2', cursive" }}>
            Checkout
          </h1>

          <VendorCheckoutTabs
            vendors={vendorTabs}
            activeId={manufacturerID}
            mode="checkout"
          />

          <CheckoutForm
            group={vendorGroup}
            profile={profile}
            shipTos={shipTos}
            shippingMethods={shippingMethods}
            dataError={dataError}
            liveByItemId={liveByItemId}
            onSuccess={handleSuccess}
          />
        </div>
      </AdRails>
    </div>
  );
}
