'use client';

import { useMemo, useState } from 'react';
import OrderCard from '@/components/OrderCard';
import { getOrderStatusLabel } from '@/lib/cart';

const PAGE_SIZE = 50;

const STATUS_FILTER_OPTIONS = [
  'Pending Review',
  'Submitted',
  'Processing',
  'On Its Way',
  'Delivered',
];

function matchesFilter(order, filter) {
  if (!filter || filter === 'all') return true;

  if (filter.startsWith('status:')) {
    return getOrderStatusLabel(order.manufacturerOrderStatus) === filter.slice(7);
  }

  if (filter.startsWith('vendor:')) {
    return order.manufacturerName === filter.slice(7);
  }

  return true;
}

export default function OrdersList({ initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [offset, setOffset] = useState(initialOrders.length);
  const [hasMore, setHasMore] = useState(initialOrders.length >= PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const vendors = useMemo(() => {
    const names = new Set();
    for (const order of orders) {
      if (order.manufacturerName) names.add(order.manufacturerName);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order, filter)),
    [orders, filter]
  );

  const loadMore = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/markettime/orders/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset, recordSize: PAGE_SIZE }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load more orders');

      const batch = data.orders ?? [];
      setOrders((prev) => [...prev, ...batch]);
      setOffset((prev) => prev + batch.length);
      setHasMore(data.hasMore ?? batch.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-sm text-[#5f6980]">
          Showing {filteredOrders.length} of {orders.length} order{orders.length === 1 ? '' : 's'}
        </p>
        <label className="flex items-center gap-2 text-sm text-[#1a1d26]">
          <span className="font-medium whitespace-nowrap">Filter</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="min-w-[12rem] px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#f15a24]"
          >
            <option value="all">All orders</option>
            <optgroup label="Status">
              {STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status} value={`status:${status}`}>
                  {status}
                </option>
              ))}
            </optgroup>
            {vendors.length > 0 && (
              <optgroup label="Brand">
                {vendors.map((vendor) => (
                  <option key={vendor} value={`vendor:${vendor}`}>
                    {vendor}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-8 text-center">
          <p className="text-[#5f6980] font-medium">No orders match this filter.</p>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="mt-3 text-sm font-semibold text-[#f15a24] hover:underline"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard key={order.recordID ?? order.id} order={order} />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 text-center mt-4">{error}</p>
      )}

      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
          >
            {loading ? 'Loading…' : 'Load more orders'}
          </button>
        </div>
      )}
    </>
  );
}
