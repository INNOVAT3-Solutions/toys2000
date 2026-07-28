import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

let browserClient = null;

/**
 * Browser client — safe for client components.
 * Uses the anon key; respects Supabase RLS.
 * Returns null if env vars are not set (build-time safety).
 */
export const createBrowserClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!browserClient) {
    browserClient = createSupabaseBrowserClient(url, key);
  }

  return browserClient;
};
