"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lookupPostalCode, isValidNeighborhoodForPostalCode } from "@/lib/postal-code";

export interface AuthActionState {
  error: string | null;
  /** Set when signUp succeeded but email confirmation is required before a
   *  session exists — the form should show this instead of redirecting. */
  checkEmail?: boolean;
}

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const exteriorNumber = String(formData.get("exteriorNumber") ?? "").trim();
  const interiorNumber = String(formData.get("interiorNumber") ?? "").trim();
  const neighborhood = String(formData.get("neighborhood") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const municipality = String(formData.get("municipality") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!email || !password || !fullName) {
    return { error: "Completa tu nombre, correo y contraseña." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = await createSupabaseServerClient();

  // Shipping address is optional at registration, but if a postal code was
  // entered it still has to be a real one per the SEPOMEX catalog.
  if (postalCode) {
    const postalCodeInfo = await lookupPostalCode(supabase, postalCode);
    if (!postalCodeInfo) {
      return { error: "El código postal no existe según el catálogo de SEPOMEX." };
    }
    if (neighborhood && !isValidNeighborhoodForPostalCode(postalCodeInfo.colonias, neighborhood)) {
      return { error: "La colonia no corresponde a ese código postal." };
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        account_type: "customer",
        full_name: fullName,
        phone: phone || null,
        street: street || null,
        exterior_number: exteriorNumber || null,
        interior_number: interiorNumber || null,
        neighborhood: neighborhood || null,
        postal_code: postalCode || null,
        municipality: municipality || null,
        city: city || null,
        state: state || null,
      },
    },
  });

  if (error) return { error: error.message };
  // With email confirmation enabled (the default), signUp doesn't return a
  // session — the customer isn't logged in yet, so don't redirect as if
  // they were.
  if (!data.session) return { error: null, checkEmail: true };
  redirect(next);
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect(next);
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
