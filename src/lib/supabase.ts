import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables"
  );
}

export const supabaseUrl = url;

// Server-only client (this app has no auth, so it always reads with the
// public/anon role — the same role the removed Flutter app's public
// catalog view used, gated by the products/product_images RLS policies
// that allow anon SELECT on active rows).
export const supabase = createClient(url, anonKey);
