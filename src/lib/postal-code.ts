import type { SupabaseClient } from "@supabase/supabase-js";

export interface PostalCodeInfo {
  estado: string;
  municipio: string;
  city: string | null;
  colonias: string[];
}

// Looks up a CP against the SEPOMEX catalog imported by
// scripts/import-postal-codes.mjs. Accepts either the admin client
// (checkout-actions.ts, bypasses RLS) or the cookie-bound client
// (account-actions.ts) — postal_codes has a public SELECT policy so both work.
export async function lookupPostalCode(
  supabase: SupabaseClient,
  postalCode: string
): Promise<PostalCodeInfo | null> {
  const { data, error } = await supabase
    .from("postal_codes")
    .select("estado, municipio, city, colonia")
    .eq("postal_code", postalCode);

  if (error || !data || data.length === 0) return null;

  return {
    estado: data[0].estado,
    municipio: data[0].municipio,
    city: data[0].city,
    colonias: data.map((row) => row.colonia),
  };
}

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "");
}

export function isValidNeighborhoodForPostalCode(
  colonias: string[],
  neighborhood: string
): boolean {
  const target = normalize(neighborhood);
  return colonias.some((colonia) => normalize(colonia) === target);
}
