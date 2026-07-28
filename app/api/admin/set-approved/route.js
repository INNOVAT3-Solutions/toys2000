import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { notifyApprovalIfNeeded } from '@/lib/notify-approval';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, approved } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('approved, company_name')
    .eq('id', userId)
    .maybeSingle();

  const wasApproved = existingProfile?.approved === true;
  const nextApproved = Boolean(approved);

  const { error } = await admin
    .from('profiles')
    .update({ approved: nextApproved })
    .eq('id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (nextApproved && !wasApproved) {
    try {
      const { data: authData } = await admin.auth.admin.getUserById(userId);
      await notifyApprovalIfNeeded(admin, {
        userId,
        email: authData?.user?.email,
        companyName: existingProfile?.company_name,
        wasApproved,
        nowApproved: nextApproved,
      });
    } catch (emailErr) {
      console.warn('[/api/admin/set-approved] approval email failed:', emailErr.message);
    }
  }

  return NextResponse.json({ success: true });
}
