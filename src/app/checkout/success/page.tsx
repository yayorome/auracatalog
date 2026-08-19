import Link from "next/link";
import { notFound } from "next/navigation";

import { ClearCartOnMount } from "@/components/clear-cart-on-mount";
import { formatPrice } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ sale?: string }>;
}) {
  const { sale: saleId } = await searchParams;
  if (!saleId) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: sale } = await supabase
    .from("sales")
    .select("id, status, total, currency")
    .eq("id", saleId)
    .maybeSingle();
  if (!sale) notFound();

  const paid = sale.status === "paid";

  return (
    <div className="mx-auto max-w-[440px] px-5 py-16 text-center md:px-0">
      <ClearCartOnMount />
      <h1 className="mb-2 font-headline text-3xl text-aura-on-surface">
        {paid ? "¡Gracias por tu compra!" : "Confirmando tu pago…"}
      </h1>
      <p className="mb-1 text-aura-on-surface-variant">
        Pedido #{sale.id.slice(0, 8)} · {formatPrice(Number(sale.total), sale.currency)}
      </p>
      <p className="mb-8 text-sm text-aura-on-surface-variant">
        {paid
          ? "Te avisaremos por WhatsApp con los detalles de envío."
          : "Estamos esperando la confirmación de Clip. Puedes revisar el estado en Mis pedidos en unos minutos."}
      </p>
      <Link href="/account/orders" className="underline">
        Ver mis pedidos
      </Link>
    </div>
  );
}
