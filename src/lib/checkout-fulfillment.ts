import { supabaseAdmin } from "@/lib/supabase/admin";
import { CLIP_PAID_STATUSES } from "@/lib/clip";
import { sendOrderReceiptEmail } from "@/lib/email";

/**
 * Applies a Clip payment result to our own records. Shared by the real
 * webhook route and the local mock-checkout page (used when CLIP_API_KEY
 * isn't configured yet) so both paths exercise the same fulfillment logic.
 */
export async function fulfillClipPayment(
  saleId: string,
  resourceStatus: string,
  rawPayload: unknown
) {
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, status")
    .eq("sale_id", saleId)
    .maybeSingle();

  if (!payment) throw new Error(`No payment row found for sale ${saleId}`);
  if (payment.status !== "pending") return; // already settled — ignore replays

  const approved = CLIP_PAID_STATUSES.has(resourceStatus);

  await supabaseAdmin
    .from("payments")
    .update({
      status: approved ? "approved" : "rejected",
      raw_payload: rawPayload as never,
    })
    .eq("id", payment.id);

  if (approved) {
    // Decrements stock, logs inventory_movements, and sets sales.status =
    // 'paid' — reuses the existing staff-flow RPC instead of duplicating it.
    const { error } = await supabaseAdmin.rpc("mark_sale_paid", {
      p_sale_id: saleId,
    });
    if (error) {
      // Most likely cause: stock ran out between checkout and payment.
      await supabaseAdmin
        .from("payments")
        .update({ status: "rejected", raw_payload: { error: error.message } as never })
        .eq("id", payment.id);
      throw error;
    }

    await sendReceiptSafely(saleId);
  }
}

interface ShippingAddressSnapshot {
  name: string;
  street: string;
  exterior_number: string | null;
  interior_number: string | null;
  neighborhood: string | null;
  postal_code: string;
  municipality: string | null;
  city: string | null;
  state: string | null;
}

function formatShippingLine(address: ShippingAddressSnapshot): string {
  const line1 = [address.street, address.exterior_number].filter(Boolean).join(" ");
  const line1WithInterior = address.interior_number
    ? `${line1} Int. ${address.interior_number}`
    : line1;
  const line2 = [address.neighborhood, address.postal_code].filter(Boolean).join(", ");
  const line3 = [address.municipality || address.city, address.state]
    .filter(Boolean)
    .join(", ");
  return [line1WithInterior, line2, line3].filter(Boolean).join(" · ");
}

// A receipt-email failure must never surface as a failed payment
// confirmation — the order is already paid and stock already decremented
// by the time this runs, so any error here is logged, not thrown.
async function sendReceiptSafely(saleId: string) {
  try {
    const { data: sale } = await supabaseAdmin
      .from("sales")
      .select(
        "id, currency, subtotal, shipping_cost, total, shipping_address, clients(email, name), sale_items(product_name_snapshot, milliliters_snapshot, quantity, unit_price, line_total)"
      )
      .eq("id", saleId)
      .single();

    if (!sale) return;
    // Supabase infers a belongs-to join like this as an array without
    // generated Database types on hand — it's always exactly one row here.
    const client = Array.isArray(sale.clients) ? sale.clients[0] : sale.clients;
    const email = client?.email;
    if (!email) {
      console.warn(`[email] sale ${saleId} has no client email — skipping receipt`);
      return;
    }

    const shippingAddress = sale.shipping_address as ShippingAddressSnapshot | null;

    await sendOrderReceiptEmail({
      toEmail: email,
      toName: shippingAddress?.name ?? client?.name ?? "",
      saleId: sale.id,
      currency: sale.currency,
      subtotal: Number(sale.subtotal),
      shippingCost: Number(sale.shipping_cost),
      total: Number(sale.total),
      items: sale.sale_items.map((item) => ({
        name: item.product_name_snapshot,
        milliliters: item.milliliters_snapshot,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total),
      })),
      shippingAddressLine: shippingAddress ? formatShippingLine(shippingAddress) : null,
    });
  } catch (err) {
    console.error(`[email] failed to send receipt for sale ${saleId}`, err);
  }
}
