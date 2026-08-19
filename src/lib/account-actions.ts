"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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
      neighborhood: String(formData.get("neighborhood") ?? "").trim() || null,
      postal_code: String(formData.get("postalCode") ?? "").trim() || null,
      municipality: String(formData.get("municipality") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim() || null,
      state: String(formData.get("state") ?? "").trim() || null,
    })
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo guardar tu información.", success: false };
  return { error: null, success: true };
}
