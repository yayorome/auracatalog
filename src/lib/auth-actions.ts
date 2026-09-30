"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lookupPostalCode, isValidNeighborhoodForPostalCode } from "@/lib/postal-code";
import { validatePassword } from "@/lib/password";
import { siteUrl } from "@/lib/site-url";

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
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
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
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }
  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }
  // Shipping address is required at registration — interiorNumber is the
  // only optional field (not every address has one).
  if (
    !street ||
    !exteriorNumber ||
    !neighborhood ||
    !postalCode ||
    !municipality ||
    !city ||
    !state
  ) {
    return { error: "Completa tu dirección de envío." };
  }

  const supabase = await createSupabaseServerClient();

  const postalCodeInfo = await lookupPostalCode(supabase, postalCode);
  if (!postalCodeInfo) {
    return { error: "El código postal no existe." };
  }
  if (!isValidNeighborhoodForPostalCode(postalCodeInfo.colonias, neighborhood)) {
    return { error: "La colonia no corresponde a ese código postal." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
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

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Ingresa tu correo." };
  }

  const supabase = await createSupabaseServerClient();
  // resetPasswordForEmail doesn't error for an unknown email (Supabase's
  // own anti-enumeration behavior) — always show the same "check your
  // email" message so this form can't be used to test which addresses
  // have an account, same reasoning as registerAction's checkEmail state.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });

  return { error: null, checkEmail: true };
}

export interface ResetPasswordActionState {
  error: string | null;
  success: boolean;
}

// registerAction re-validates validatePassword() server-side so the
// strength rule can't be bypassed by a scripted client — reset-password-form
// used to call supabase.auth.updateUser() directly from the browser with no
// server-side check, meaning anyone calling Supabase Auth's API directly
// with the recovery session could set a password that fails validatePassword.
// Routing the reset through this Server Action (which reuses the same
// cookie-bound client the recovery session already lives in) closes that gap.
export async function resetPasswordAction(
  _prevState: ResetPasswordActionState,
  formData: FormData
): Promise<ResetPasswordActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError, success: false };
  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden.", success: false };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message, success: false };

  return { error: null, success: true };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
