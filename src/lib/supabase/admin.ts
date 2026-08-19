import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireEnv } from "@/lib/supabase/env";

// Service-role client — bypasses RLS entirely. Only import this from the
// checkout Server Action and the Clip webhook route handler, both of which
// validate/authorize by hand (session check, webhook lookup) instead of
// relying on RLS. Never import from a Client Component or expose this key
// with a NEXT_PUBLIC_ prefix.
//
// Built lazily (not a top-level const) so merely importing this module
// doesn't throw during `next build`'s route data collection when
// SUPABASE_SERVICE_ROLE_KEY isn't set yet (e.g. before Clip credentials are
// wired up) — the error only surfaces if a request actually needs it.
let client: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );
  }
  return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getAdminClient(), prop, receiver);
  },
});
