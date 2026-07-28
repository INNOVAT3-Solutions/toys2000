import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrders } from '@/lib/markettime';
import OrdersList from '@/components/OrdersList';

export const metadata = { title: 'My Orders — Toys2000 Wholesale' };

const PAGE_SIZE = 50;

export default async function OrdersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/orders');

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, company_name, approved, is_admin')
    .eq('id', user.id)
    .single();

  let orders = [];
  let error = null;

  if (profile?.retailer_id && (profile.approved || profile.is_admin)) {
    try {
      const result = await getOrders({
        retailerID: profile.retailer_id,
        offset: 0,
        recordSize: PAGE_SIZE,
      });
      orders = Array.isArray(result) ? result : result?.records ?? [];
    } catch (err) {
      error = err.message;
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
              My Orders
            </h1>
            {profile?.company_name && (
              <p className="text-sm text-[#5f6980] mt-1">{profile.company_name}</p>
            )}
          </div>
        </div>

        {!profile?.retailer_id ? (
          <div className="bg-white rounded-2xl border border-black/[0.06] p-8 text-center">
            <p className="text-[#5f6980] font-medium">Your account is pending approval.</p>
            <p className="text-sm text-[#5f6980] mt-1">Contact Toys2000 to get your account linked and start placing orders.</p>
          </div>
        ) : !profile.approved && !profile.is_admin ? (
          <div className="bg-white rounded-2xl border border-black/[0.06] p-8 text-center">
            <p className="text-[#5f6980] font-medium">Your account is awaiting approval.</p>
            <p className="text-sm text-[#5f6980] mt-1">You&apos;ll be able to view orders once Toys2000 approves your retailer account.</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">
            Failed to load orders: {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/[0.06] p-12 text-center">
            <p className="text-[#5f6980] font-medium">No orders yet.</p>
            <p className="text-sm text-[#5f6980] mt-1">Place your first order from the catalog.</p>
            <Link
              href="/catalog"
              className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white no-underline"
              style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)', color: '#ffffff' }}
            >
              Browse Catalog
            </Link>
          </div>
        ) : (
          <OrdersList initialOrders={orders} />
        )}
      </div>
    </div>
  );
}
