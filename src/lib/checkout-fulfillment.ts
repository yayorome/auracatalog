import { supabaseAdmin } from "@/lib/supabase/admin";
import { CLIP_PAID_STATUSES, CLIP_TERMINAL_REJECTED_STATUSES } from "@/lib/clip";
import { discardSale } from "@/lib/discard-sale";
import { sendOrderNotificationEmail, sendOrderReceiptEmail } from "@/lib/email";
import { formatAddressLines, type AddressFields } from "@/lib/format-address";

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

  const terminallyRejected = CLIP_TERMINAL_REJECTED_STATUSES.has(resourceStatus);
  if (!CLIP_PAID_STATUSES.has(resourceStatus) && !terminallyRejected) {
    // Still in flight (e.g. CHECKOUT_CREATED right after the link was made,
    // or CHECKOUT_PENDING mid-payment) — leave payment.status as "pending"
    // so a later webhook for this same payment can still be processed.
    return;
  }

  if (terminallyRejected) {
    // A checkout that never resulted in a successful payment shouldn't
    // leave a "Pago pendiente" order sitting in the customer's history
    // forever — discard it entirely instead of just marking the payment
    // rejected. No stock was ever decremented for a pending_payment sale
    // (mark_sale_paid is the only thing that decrements it), so there's
    // nothing else to roll back.
    await discardSale(saleId);
    return;
  }

  // Atomically flip pending -> approved, conditioned on the row still being
  // "pending", so two near-simultaneous webhook deliveries for the same
  // payment (a retry, or a duplicate delivery) can't both pass the earlier
  // status check and both proceed to decrement stock / send a receipt.
  // Whichever request's UPDATE actually matches a row "wins" the race.
  const { data: claimed } = await supabaseAdmin
    .from("payments")
    .update({ status: "approved", raw_payload: rawPayload as never })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id");
  if (!claimed || claimed.length === 0) return; // another delivery already claimed it

  // Decrements stock, logs inventory_movements, and sets sales.status =
  // 'paid' — reuses the existing staff-flow RPC instead of duplicating it.
  const { error } = await supabaseAdmin.rpc("mark_sale_paid", {
    p_sale_id: saleId,
  });
  if (error) {
    // Most likely cause: stock ran out between checkout and payment. The
    // customer already paid on Clip's side, so this can't be discarded
    // like a never-paid checkout — that would erase the only record of a
    // real charge. Mark the sale cancelled (out of "pending_payment" limbo,
    // where it would otherwise sit forever since payment.status is no
    // longer "pending" for a retried webhook to act on) so staff can find
    // it and issue a manual refund via Clip's dashboard.
    await supabaseAdmin
      .from("payments")
      .update({ status: "rejected", raw_payload: { error: error.message } as never })
      .eq("id", payment.id);
    await supabaseAdmin.rpc("cancel_sale_payment_failed", { p_sale_id: saleId });
    throw error;
  }

  await sendReceiptSafely(saleId);
}

interface ShippingAddressSnapshot extends AddressFields {
  name: string;
  street: string;
  postal_code: string;
}

// A receipt-email failure must never surface as a failed payment
// confirmation — the order is already paid and stock already decremented
// by the time this runs, so any error here is logged, not thrown.
async function sendReceiptSafely(saleId: string) {
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
  const shippingAddress = sale.shipping_address as ShippingAddressSnapshot | null;
  const items = sale.sale_items.map((item) => ({
    name: item.product_name_snapshot,
    milliliters: item.milliliters_snapshot,
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
    lineTotal: Number(item.line_total),
  }));

  if (!email) {
    console.warn(`[email] sale ${saleId} has no client email — skipping receipt`);
  } else {
    try {
      await sendOrderReceiptEmail({
        toEmail: email,
        toName: shippingAddress?.name ?? client?.name ?? "",
        saleId: sale.id,
        currency: sale.currency,
        subtotal: Number(sale.subtotal),
        shippingCost: Number(sale.shipping_cost),
        total: Number(sale.total),
        items,
        shippingAddressLine: shippingAddress ? formatAddressLines(shippingAddress) : null,
      });
    } catch (err) {
      console.error(`[email] failed to send receipt for sale ${saleId}`, err);
    }
  }

  try {
    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("order_notification_emails")
      .eq("id", 1)
      .maybeSingle();

    const notificationEmails = (settings?.order_notification_emails ?? "")
      .split(",")
      .map((address: string) => address.trim())
      .filter(Boolean);

    await sendOrderNotificationEmail({
      toEmails: notificationEmails,
      saleId: sale.id,
      currency: sale.currency,
      total: Number(sale.total),
      customerName: shippingAddress?.name ?? client?.name ?? "",
      customerEmail: email ?? "",
      items,
    });
  } catch (err) {
    console.error(`[email] failed to send order notification for sale ${saleId}`, err);
  }
}
