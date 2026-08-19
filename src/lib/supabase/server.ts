import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireEnv } from "@/lib/supabase/env";

// Cookie-bound client for Server Components/Actions — reads/writes run as
// the logged-in customer's own JWT, so RLS (e.g. `sales_select_own_customer`)
// scopes results automatically. Never use this for checkout/webhook writes;
// use `admin.ts` there instead.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — the middleware already
            // refreshes the session cookie on the request, so this is safe to
            // ignore per the @supabase/ssr Next.js App Router guidance.
          }
        },
      },
    }
  );
}
