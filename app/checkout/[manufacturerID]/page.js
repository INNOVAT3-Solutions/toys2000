import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import CheckoutClient from './CheckoutClient';
import InactiveVendorCheckout from './InactiveVendorCheckout';
import { getActiveManufacturers, isActiveManufacturerId } from '@/lib/active-manufacturers';

export const metadata = { title: 'Checkout — Toys2000 Wholesale' };

export default async function CheckoutPage({ params }) {
  const { manufacturerID } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/checkout/${manufacturerID}`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, company_name, approved')
    .eq('id', user.id)
    .single();

  const admin = createAdminClient();
  const { data: manufacturer } = await admin
    .from('manufacturers')
    .select('manufacturer_id, name, logo_url')
    .eq('manufacturer_id', manufacturerID)
    .single();

  const activeManufacturers = await getActiveManufacturers(admin);

  if (!isActiveManufacturerId(manufacturerID, activeManufacturers)) {
    return (
      <InactiveVendorCheckout
        manufacturerName={manufacturer?.name ?? 'This vendor'}
      />
    );
  }

  if (!manufacturer) {
    return <InactiveVendorCheckout manufacturerName="This vendor" />;
  }

  return (
    <CheckoutClient
      manufacturerID={manufacturerID}
      manufacturerName={manufacturer.name}
      profile={profile}
    />
  );
}
