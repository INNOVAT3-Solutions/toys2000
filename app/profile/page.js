import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCustomer, getCustomerContacts, getCustomerShipTos } from '@/lib/markettime';
import { getSalespeopleForShipTos } from '@/lib/customer-salesperson';
import ProfileEditor from '@/components/ProfileEditor';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'My Profile — Toys2000 Wholesale' };

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/profile');

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, company_name, approved, is_admin')
    .eq('id', user.id)
    .single();

  let customer = null;
  let contacts = [];
  let shipTos = [];
  let salespeople = [];
  let error = null;

  if (profile?.retailer_id) {
    try {
      const [customerData, contactsData, shipTosData] = await Promise.all([
        getCustomer(profile.retailer_id),
        getCustomerContacts(profile.retailer_id),
        getCustomerShipTos(profile.retailer_id),
      ]);
      customer = customerData;
      contacts = Array.isArray(contactsData) ? contactsData : contactsData?.records ?? [];
      shipTos = Array.isArray(shipTosData) ? shipTosData : shipTosData?.records ?? [];
      salespeople = await getSalespeopleForShipTos(shipTos);
    } catch (err) {
      error = err.message;
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1
            className="text-3xl font-bold text-[#1a1d26]"
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            My Profile
          </h1>
          <p className="text-sm text-[#5f6980] mt-1">
            Update your company, billing, contacts, and ship-to locations — synced with MarketTime.
          </p>
        </div>

        {!profile?.retailer_id ? (
          <div className="bg-white rounded-2xl border border-black/[0.06] p-8 text-center">
            <p className="text-[#5f6980] font-medium">Your portal account isn&apos;t linked to MarketTime yet.</p>
            <p className="text-sm text-[#5f6980] mt-1">
              Complete MarketTime signup, then sign in here with the same email so we can link your account.
            </p>
            <Link
              href="/pending-approval"
              className="inline-block mt-4 text-sm font-semibold text-[#00aeef] hover:underline"
            >
              Check approval status
            </Link>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">
            <p className="font-semibold">Could not load profile from MarketTime</p>
            <p className="mt-1">{error}</p>
            {error.includes('API key') && (
              <p className="mt-2 text-xs text-red-600">
                An admin needs to refresh the MarketTime API key. Run <code>npm run verify:mt</code> locally.
              </p>
            )}
          </div>
        ) : (
          <ProfileEditor
            retailerId={profile.retailer_id}
            portalLoginEmail={user.email}
            portalApproved={Boolean(profile.approved || profile.is_admin)}
            initialCustomer={customer}
            initialContacts={contacts}
            initialShipTos={shipTos}
            initialSalespeople={salespeople}
          />
        )}
      </div>
    </div>
  );
}
