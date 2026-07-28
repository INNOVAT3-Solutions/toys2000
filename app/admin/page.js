import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';

export const metadata = { title: 'Admin — Toys2000 Wholesale' };

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/admin');

  // Check is_admin on profiles — gated here server-side
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) redirect('/catalog');

  // Load all user profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, retailer_id, company_name, approved, is_admin, created_at')
    .order('created_at', { ascending: false });

  // Load auth users to get emails — requires service role
  const admin = createAdminClient();
  const { data: { users } } = await admin.auth.admin.listUsers();
  const emailMap = Object.fromEntries(users.map((u) => [u.id, u.email]));

  // Load latest sync log
  const { data: syncLog } = await supabase
    .from('sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  const enrichedProfiles = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? '—',
  }));

  return (
    <AdminClient
      profiles={enrichedProfiles}
      syncLog={syncLog ?? []}
      defaultSalespersonId={process.env.MT_SALESPERSON_ID ?? ''}
    />
  );
}
