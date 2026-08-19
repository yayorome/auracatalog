import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CheckoutErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ sale?: string }>;
}) {
  const { sale: saleId } = await searchParams;
  if (!saleId) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: sale } = await supabase
    .from("sales")
    .select("id")
    .eq("id", saleId)
    .maybeSingle();
  if (!sale) notFound();

  return (
    <div className="mx-auto max-w-[440px] px-5 py-16 text-center md:px-0">
      <h1 className="mb-2 font-headline text-3xl text-aura-on-surface">
        No pudimos procesar tu pago
      </h1>
      <p className="mb-8 text-sm text-aura-on-surface-variant">
        Pedido #{sale.id.slice(0, 8)}. Tu carrito sigue disponible — puedes
        intentar de nuevo o contactarnos por WhatsApp.
      </p>
      <Link href="/cart" className="underline">
        Volver al carrito
      </Link>
    </div>
  );
}
