import { createBrowserClient } from "@supabase/ssr";

// Deliberately not going through env.ts's requireEnv() here: it reads
// process.env[name] via computed property access, which bundlers can't
// statically replace with the inlined NEXT_PUBLIC_ value — that only works
// for a literal `process.env.NEXT_PUBLIC_X` expression. Since this file is
// the one Supabase client flavor that ships in the browser bundle, it needs
// the literal form (same pattern middleware.ts already uses); requireEnv
// stays fine for server.ts/admin.ts, which only ever run on the server
// where the real process.env supports computed access.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
