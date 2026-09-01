import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { ensureDefaultSalesperson } from '@/lib/assign-default-salesperson';
import { findCustomerByEmail, isApprovedCustomer } from '@/lib/find-markettime-customer';
import { notifyApprovalIfNeeded } from '@/lib/notify-approval';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let customer;
  try {
    customer = await findCustomerByEmail(user.email);
  } catch (err) {
    console.error('[/api/profile/link-markettime]', err.message);
    return NextResponse.json({
      linked: false,
      reason: 'api_error',
      message: 'Could not reach MarketTime to link your account. You can still browse the catalog.',
    });
  }

  if (!customer) {
    return NextResponse.json({
      linked: false,
      reason: 'not_found',
      message: 'No matching MarketTime customer was found for this email.',
    });
  }

  const approved = isApprovedCustomer(customer);
  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('approved')
    .eq('id', user.id)
    .maybeSingle();

  const wasApproved = existingProfile?.approved === true;

  const { error } = await admin
    .from('profiles')
    .upsert({
      id: user.id,
      retailer_id: customer.recordID,
      company_name: customer.name ?? customer.dba ?? null,
      approved,
    }, { onConflict: 'id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let salespersonAssigned = false;
  try {
    const result = await ensureDefaultSalesperson(customer.recordID);
    salespersonAssigned = result.assigned === true;
  } catch (err) {
    console.warn('[/api/profile/link-markettime] salesperson assign skipped:', err.message);
  }

  try {
    await notifyApprovalIfNeeded(admin, {
      userId: user.id,
      email: user.email,
      companyName: customer.name ?? customer.dba ?? null,
      wasApproved,
      nowApproved: approved,
    });
  } catch (emailErr) {
    console.warn('[/api/profile/link-markettime] approval email failed:', emailErr.message);
  }

  return NextResponse.json({
    linked: true,
    approved,
    retailerID: customer.recordID,
    salespersonAssigned,
  });
}
