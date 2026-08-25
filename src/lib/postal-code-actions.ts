"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lookupPostalCode, type PostalCodeInfo } from "@/lib/postal-code";

// Client-callable wrapper around lookupPostalCode, for live autofill/hinting
// in checkout-form.tsx and account-form.tsx as the customer types a CP.
// Final validation still happens server-side in checkout-actions.ts /
// account-actions.ts — this is UX only.
export async function lookupPostalCodeAction(postalCode: string): Promise<PostalCodeInfo | null> {
  const supabase = await createSupabaseServerClient();
  return lookupPostalCode(supabase, postalCode.trim());
}
