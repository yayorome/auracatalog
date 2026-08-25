"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createPaymentLink } from "@/lib/clip";
import { computeShippingCost } from "@/lib/shipping";
import { lookupPostalCode, isValidNeighborhoodForPostalCode } from "@/lib/postal-code";

export interface CheckoutActionState {
  error: string | null;
}

interface CartLine {
  variantId: string;
  quantity: number;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function createCheckoutAction(
  _prevState: CheckoutActionState,
  formData: FormData
): Promise<CheckoutActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/checkout");

  let cartLines: CartLine[];
  try {
    cartLines = JSON.parse(String(formData.get("cart") ?? "[]"));
  } catch {
    return { error: "No se pudo leer el carrito." };
  }
  if (!Array.isArray(cartLines) || cartLines.length === 0) {
    return { error: "Tu carrito está vacío." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const exteriorNumber = String(formData.get("exteriorNumber") ?? "").trim();
  const interiorNumber = String(formData.get("interiorNumber") ?? "").trim();
  const neighborhood = String(formData.get("neighborhood") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const municipality = String(formData.get("municipality") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  // Set by checkout-form.tsx when the customer chose "Enviar a una dirección
  // diferente" instead of their saved one.
  const shipToDifferentAddress = formData.get("differentAddress") === "true";

  if (!name || !street || !postalCode) {
    return { error: "Completa tu nombre y dirección de envío." };
  }

  // Cross-check against the SEPOMEX catalog (scripts/import-postal-codes.mjs)
  // so orders can't be placed against a nonexistent postal code or a
  // colonia that doesn't actually belong to it.
  const postalCodeInfo = await lookupPostalCode(supabaseAdmin, postalCode);
  if (!postalCodeInfo) {
    return { error: "El código postal no existe." };
  }
  if (neighborhood && !isValidNeighborhoodForPostalCode(postalCodeInfo.colonias, neighborhood)) {
    return { error: "La colonia no corresponde a ese código postal." };
  }

  // The `clients` row was created by the handle_new_user() trigger at
  // signup — every customer account has exactly one.
  const { data: client, error: clientError } = await supabaseAdmin
    .from("clients")
    .select("id, email, street, postal_code")
    .eq("user_id", user.id)
    .maybeSingle();
  if (clientError || !client) {
    return { error: "No se encontró tu perfil de cliente. Intenta iniciar sesión de nuevo." };
  }
  // Required so the paid-order receipt (checkout-fulfillment.ts) has
  // somewhere to send the ticket — every customer account has one from
  // Supabase Auth, but `clients.email` is nullable for staff-added rows,
  // so this is a real check, not just defensive noise.
  if (!client.email) {
    return {
      error: "Tu cuenta no tiene un correo electrónico registrado. Actualízalo en Mi cuenta antes de continuar.",
    };
  }

  const hadSavedAddress = Boolean(client.street && client.postal_code);
  const shippingAddress = {
    name,
    phone: phone || null,
    street,
    exterior_number: exteriorNumber || null,
    interior_number: interiorNumber || null,
    neighborhood: neighborhood || null,
    postal_code: postalCode,
    municipality: municipality || null,
    city: city || null,
    state: state || null,
  };

  // Always update contact info, but only overwrite the saved profile
  // address when the customer wasn't deliberately shipping this one order
  // elsewhere — a one-off "different address" shouldn't clobber what's on
  // file. The order's own address is preserved separately below regardless
  // (sales.shipping_address), so this only affects the *profile* default.
  const updatePayload: Record<string, unknown> = { name, phone: phone || null };
  if (!hadSavedAddress || !shipToDifferentAddress) {
    Object.assign(updatePayload, {
      street: shippingAddress.street,
      exterior_number: shippingAddress.exterior_number,
      interior_number: shippingAddress.interior_number,
      neighborhood: shippingAddress.neighborhood,
      postal_code: shippingAddress.postal_code,
      municipality: shippingAddress.municipality,
      city: shippingAddress.city,
      state: shippingAddress.state,
    });
  }
  await supabaseAdmin.from("clients").update(updatePayload).eq("id", client.id);

  // Confirm every line is still purchasable before creating the order.
  const variantIds = cartLines.map((l) => l.variantId);
  const { data: variants } = await supabaseAdmin
    .from("product_variants")
    .select("id, stock_quantity, is_active")
    .in("id", variantIds);

  for (const line of cartLines) {
    const variant = variants?.find((v) => v.id === line.variantId);
    if (!variant || !variant.is_active || variant.stock_quantity < line.quantity) {
      return { error: "Uno o más productos de tu carrito ya no están disponibles." };
    }
  }

  const { data: sale, error: saleError } = await supabaseAdmin
    .from("sales")
    .insert({
      client_id: client.id,
      status: "pending_payment",
      payment_method: "card",
      shipping_address: shippingAddress,
    })
    .select("id")
    .single();
  if (saleError || !sale) {
    return { error: "No se pudo crear tu pedido. Intenta de nuevo." };
  }

  // unit_price is intentionally omitted — the sale_items_set_pricing
  // trigger fills it (and line_total) from the current catalog price.
  const { error: itemsError } = await supabaseAdmin.from("sale_items").insert(
    cartLines.map((line) => ({ sale_id: sale.id, variant_id: line.variantId, quantity: line.quantity }))
  );
  if (itemsError) {
    return { error: "No se pudo registrar tu pedido. Intenta de nuevo." };
  }

  const { data: items } = await supabaseAdmin
    .from("sale_items")
    .select("line_total")
    .eq("sale_id", sale.id);
  const subtotal = (items ?? []).reduce((sum, i) => sum + Number(i.line_total), 0);
  const shippingCost = computeShippingCost(subtotal);
  const total = subtotal + shippingCost;

  // sales.subtotal/total are protected columns (sales_prevent_protected_update
  // trigger) — a plain .update() is silently rejected outside this RPC, which
  // mirrors how mark_sale_paid() is allowed to touch them. shipping_cost
  // isn't one of the protected columns, so a normal update is fine for it.
  const { error: totalsError } = await supabaseAdmin.rpc("set_sale_pending_totals", {
    p_sale_id: sale.id,
    p_subtotal: subtotal,
    p_total: total,
  });
  if (totalsError) {
    return { error: "No se pudo calcular el total de tu pedido. Intenta de nuevo." };
  }
  await supabaseAdmin.from("sales").update({ shipping_cost: shippingCost }).eq("id", sale.id);

  const { data: paymentRow } = await supabaseAdmin
    .from("payments")
    .insert({ sale_id: sale.id, provider: "clip", status: "pending", amount: total })
    .select("id")
    .single();

  const base = siteUrl();

  if (!process.env.CLIP_API_KEY) {
    // Clip credentials aren't configured yet — send the customer to a local
    // stand-in page instead of failing checkout outright. Only reachable
    // in this env-var state; once CLIP_API_KEY is set, this branch is dead.
    redirect(`/checkout/mock?sale=${sale.id}`);
  }

  let checkoutUrl: string;
  try {
    const link = await createPaymentLink({
      amount: total,
      currency: "MXN",
      purchaseDescription: `Pedido Aura Research Parfums #${sale.id.slice(0, 8)}`,
      externalReference: sale.id,
      successUrl: `${base}/checkout/success?sale=${sale.id}`,
      errorUrl: `${base}/checkout/error?sale=${sale.id}`,
      defaultUrl: base,
      webhookUrl: `${base}/api/webhooks/clip`,
      customer: { name, email: client.email ?? user.email ?? "" },
    });

    await supabaseAdmin
      .from("payments")
      .update({ provider_reference: link.payment_request_id, checkout_url: link.payment_request_url })
      .eq("id", paymentRow!.id);

    checkoutUrl = link.payment_request_url;
  } catch (err) {
    console.error("Clip createPaymentLink failed", err);
    return { error: "No se pudo iniciar el pago. Intenta de nuevo en unos minutos." };
  }

  redirect(checkoutUrl);
}
