import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
import { redirect, notFound } from 'next/navigation';
import { getOrderByRecordId, getOrderTracking } from '@/lib/markettime';
import Link from 'next/link';
import { formatCurrency, getOrderStatusLabel, ORDER_STATUS_LABELS, normalizeOrderStatus } from '@/lib/cart';

export const metadata = { title: 'Order Detail — Toys2000 Wholesale' };

const STATUS_COLORS = {
  'Pending Review': { bg: '#fff7ed', text: '#c2410c', dot: '#f15a24' },
  'Submitted':      { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'Processing':     { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  'On Its Way':     { bg: '#f0f9ff', text: '#0369a1', dot: '#00aeef' },
  'Delivered':      { bg: '#f0fdf4', text: '#166534', dot: '#16a34a' },
};

export default async function OrderDetailPage({ params }) {
  const { orderID } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/orders');

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.retailer_id) redirect('/orders');

  // MT has no GET /orders/{id}; recordID filters on orders/get are ignored.
  let order = null;
  let tracking = null;

  try {
    order = await getOrderByRecordId(profile.retailer_id, orderID);
  } catch {
    notFound();
  }

  if (!order) notFound();

  try {
    tracking = await getOrderTracking(orderID);
  } catch {
    // Tracking not available — not a fatal error
  }

  const label = getOrderStatusLabel(order.manufacturerOrderStatus);
  const colors = STATUS_COLORS[label] ?? { bg: '#f7f8fa', text: '#5f6980', dot: '#5f6980' };

  const orderTotal = (order.details ?? []).reduce(
    (s, d) => s + (d.unitPrice ?? 0) * (d.quantity ?? 0), 0
  );

  const formattedDate = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#5f6980] mb-6">
          <Link href="/orders" className="hover:text-[#f15a24]">← My Orders</Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
                {order.manufacturerName}
              </h1>
              <p className="text-sm text-[#5f6980] mt-1">{formattedDate}</p>
              {order.poNumber && <p className="text-xs text-[#5f6980] mt-0.5">PO: {order.poNumber}</p>}
            </div>
            <span
              className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full flex-shrink-0"
              style={{ background: colors.bg, color: colors.text }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: colors.dot }} />
              {label}
            </span>
          </div>

          {/* Status timeline */}
          <div className="mt-6">
            <div className="flex items-center gap-0">
              {Object.entries(ORDER_STATUS_LABELS).map(([status, displayLabel], i, arr) => {
                const statuses = Object.keys(ORDER_STATUS_LABELS);
                const currentStatus = normalizeOrderStatus(order.manufacturerOrderStatus);
                const currentIdx = statuses.indexOf(currentStatus);
                const stepIdx = statuses.indexOf(status);
                const isDone = stepIdx <= currentIdx;
                const isLast = i === arr.length - 1;

                return (
                  <div key={status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ background: isDone ? '#f15a24' : '#eef0f4' }}
                      >
                        {isDone && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-[#5f6980] mt-1 text-center whitespace-nowrap hidden sm:block">
                        {displayLabel}
                      </span>
                    </div>
                    {!isLast && (
                      <div className="h-0.5 flex-1 mx-1" style={{ background: isDone ? '#f15a24' : '#eef0f4' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order items */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6 mb-6">
          <h2 className="font-bold text-[#1a1d26] mb-4" style={{ fontFamily: "'Baloo 2', cursive" }}>
            Items
          </h2>
          <div className="space-y-3">
            {(order.details ?? []).map((detail, i) => (
              <div key={detail.recordID ?? i} className="flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold text-[#1a1d26]">{detail.itemName ?? detail.itemNumber}</p>
                  <p className="text-xs text-[#5f6980]">
                    {formatCurrency(detail.unitPrice)} × {detail.quantity}
                  </p>
                </div>
                <span className="font-bold text-[#1a1d26]">
                  {formatCurrency((detail.unitPrice ?? 0) * (detail.quantity ?? 0))}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-black/[0.06] pt-4 mt-4 flex justify-between font-bold text-[#1a1d26]">
            <span style={{ fontFamily: "'Baloo 2', cursive" }}>Order Total</span>
            <span>{formatCurrency(orderTotal)}</span>
          </div>
        </div>

        {/* Tracking */}
        {tracking && (
          <div className="bg-white rounded-2xl border border-black/[0.06] p-6 mb-6">
            <h2 className="font-bold text-[#1a1d26] mb-4" style={{ fontFamily: "'Baloo 2', cursive" }}>
              Shipment Tracking
            </h2>
            <div className="space-y-2 text-sm">
              {(Array.isArray(tracking) ? tracking : [tracking]).map((t, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-[#5f6980]">{t.carrier ?? 'Carrier'}</span>
                  <a
                    href={t.trackingUrl ?? `https://www.google.com/search?q=${t.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#00aeef] hover:underline"
                  >
                    {t.trackingNumber}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order info */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
          <h2 className="font-bold text-[#1a1d26] mb-4" style={{ fontFamily: "'Baloo 2', cursive" }}>
            Order Information
          </h2>
          <dl className="space-y-2 text-sm">
            {[
              ['Payment Terms', 'Net 30'],
              ['Ship Method', order.shippingMethod || '—'],
              ['Requested Ship Date', order.shipDate ? new Date(order.shipDate).toLocaleDateString() : '—'],
              ['Cancel Date', order.cancelDate ? new Date(order.cancelDate).toLocaleDateString() : '—'],
              ['Backorders', order.acceptBackOrder ? 'Accepted' : 'Not accepted'],
              ['Notes', order.specialInstructions || '—'],
            ].map(([key, val]) => (
              <div key={key} className="flex justify-between gap-4">
                <dt className="text-[#5f6980]">{key}</dt>
                <dd className="font-medium text-[#1a1d26] text-right">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
