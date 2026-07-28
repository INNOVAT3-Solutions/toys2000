import { createAdminClient } from '@/lib/supabase-server';

/** Wholesale prices are visible only to approved retailers (and admins). */
export async function getBrowseAccess(supabase) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { showPrices: false, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('approved, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  return {
    showPrices: !!(profile?.approved || profile?.is_admin),
    user,
    profile,
  };
}

/** Server-side catalog DB client — guests use service role; prices stripped before the client. */
export function getCatalogDb(supabase, showPrices) {
  return showPrices ? supabase : createAdminClient();
}

const PRICE_FIELDS = ['unit_price', 'retail_price', 'discount_percent', 'volume_pricing'];

export function stripProductPrices(product) {
  if (!product) return product;
  const stripped = { ...product };
  for (const field of PRICE_FIELDS) delete stripped[field];
  return stripped;
}

export function stripProductsPrices(products) {
  return (products ?? []).map(stripProductPrices);
}
