"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lookupPostalCode, isValidNeighborhoodForPostalCode } from "@/lib/postal-code";

export interface AccountActionState {
  error: string | null;
  success: boolean;
}

export async function updateAccountAction(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre no puede estar vacío.", success: false };

  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const neighborhood = String(formData.get("neighborhood") ?? "").trim();

  // Address fields are optional here (unlike checkout), but if a postal
  // code was entered it still has to be a real one per SEPOMEX.
  if (postalCode) {
    const postalCodeInfo = await lookupPostalCode(supabase, postalCode);
    if (!postalCodeInfo) {
      return { error: "El código postal no existe según el catálogo de SEPOMEX.", success: false };
    }
    if (neighborhood && !isValidNeighborhoodForPostalCode(postalCodeInfo.colonias, neighborhood)) {
      return { error: "La colonia no corresponde a ese código postal.", success: false };
    }
  }

  // Allowed by the clients_update_own_customer RLS policy — no service
  // role needed since this runs as the customer's own session.
  const { error } = await supabase
    .from("clients")
    .update({
      name,
      phone: String(formData.get("phone") ?? "").trim() || null,
      street: String(formData.get("street") ?? "").trim() || null,
      exterior_number: String(formData.get("exteriorNumber") ?? "").trim() || null,
      interior_number: String(formData.get("interiorNumber") ?? "").trim() || null,
      neighborhood: neighborhood || null,
      postal_code: postalCode || null,
      municipality: String(formData.get("municipality") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim() || null,
      state: String(formData.get("state") ?? "").trim() || null,
    })
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo guardar tu información.", success: false };
  return { error: null, success: true };
}
