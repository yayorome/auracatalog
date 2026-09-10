import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Deletes a sale and its children (FK-safe order) so a checkout that never
 * resulted in a successful payment leaves no trace — used both when a step
 * during checkout creation fails (checkout-actions.ts) and when Clip
 * reports a definitively rejected/expired payment after the fact
 * (checkout-fulfillment.ts). Without this, "Mis pedidos" (account/orders)
 * lists every `sales` row regardless of status, so a never-paid order would
 * otherwise sit there indefinitely labeled "Pago pendiente".
 */
export async function discardSale(saleId: string) {
  await supabaseAdmin.from("payments").delete().eq("sale_id", saleId);
  await supabaseAdmin.from("sale_items").delete().eq("sale_id", saleId);
  await supabaseAdmin.from("sales").delete().eq("id", saleId);
}
