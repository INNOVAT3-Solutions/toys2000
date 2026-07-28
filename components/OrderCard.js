import Link from 'next/link';
import { formatCurrency, getOrderStatusLabel } from '@/lib/cart';

const STATUS_COLORS = {
  'Pending Review': { bg: '#fff7ed', text: '#c2410c', dot: '#f15a24' },
  'Submitted':      { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'Processing':     { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  'On Its Way':     { bg: '#f0f9ff', text: '#0369a1', dot: '#00aeef' },
  'Delivered':      { bg: '#f0fdf4', text: '#166534', dot: '#16a34a' },
};

export default function OrderCard({ order }) {
  const {
    recordID,
    manufacturerName,
    orderDate,
    manufacturerOrderStatus,
    poNumber,
    details = [],
  } = order;

  const label = getOrderStatusLabel(manufacturerOrderStatus);
  const colors = STATUS_COLORS[label] ?? { bg: '#f7f8fa', text: '#5f6980', dot: '#5f6980' };
  const itemCount = details.reduce((s, d) => s + (d.quantity ?? 0), 0);
  const orderTotal = details.reduce((s, d) => s + (d.unitPrice ?? 0) * (d.quantity ?? 0), 0);

  const formattedDate = orderDate
    ? new Date(orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <Link
      href={`/orders/${recordID}`}
      className="block bg-white border border-black/[0.06] rounded-2xl p-5 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#1a1d26] truncate" style={{ fontFamily: "'Baloo 2', cursive" }}>
            {manufacturerName}
          </p>
          {poNumber && (
            <p className="text-xs text-[#5f6980] mt-0.5">PO: {poNumber}</p>
          )}
        </div>
        <span
          className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: colors.bg, color: colors.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.dot }} />
          {label}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-[#5f6980]">
        <span>{formattedDate}</span>
        <div className="text-right">
          <span className="font-semibold text-[#1a1d26]">{formatCurrency(orderTotal)}</span>
          <span className="ml-2 text-xs">· {itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        </div>
      </div>
    </Link>
  );
}
