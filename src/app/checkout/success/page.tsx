import Link from "next/link";
import { notFound } from "next/navigation";

import { ClearCartOnMount } from "@/components/clear-cart-on-mount";
import { formatPrice } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ sale?: string }>;
}) {
  const { sale: saleId } = await searchParams;
  if (!saleId) notFound();

  // Fetched with admin client so guest buyers (who lack a Supabase Auth
  // session) can view their confirmation without being blocked by RLS on sales.
  const { data: sale } = await supabaseAdmin
    .from("sales")
    .select("id, status, total, currency")
    .eq("id", saleId)
    .maybeSingle();
  if (!sale) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      <p className="mb-6 text-sm text-aura-on-surface-variant">
        {paid
          ? "Hemos enviado el comprobante de tu compra a tu correo electrónico."
          : "Estamos esperando la confirmación de Mercado Pago."}
      </p>

      {user ? (
        <Link href="/account/orders" className="text-sm underline text-aura-on-surface">
          Ver mis pedidos
        </Link>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/"
            className="rounded-aura-base bg-aura-primary px-5 py-2.5 text-sm font-semibold text-aura-on-primary"
          >
            Volver al catálogo
          </Link>
          <p className="text-xs text-aura-on-surface-variant">
            ¿Deseas consultar tus pedidos futuros?{" "}
            <Link href="/register" className="font-medium underline text-aura-on-surface">
              Crear una cuenta
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
