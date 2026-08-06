import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client khusus pembacaan konten publik.
 *
 * Client ini hanya memakai anon key sehingga tetap mengikuti aturan RLS.
 * Jangan pernah memakai SUPABASE_SERVICE_ROLE_KEY di sini.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
