import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CheckoutErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ sale?: string }>;
}) {
  const { sale: saleId } = await searchParams;
  if (!saleId) notFound();

  // Deliberately doesn't look the sale up in the database: a rejected/
  // expired payment gets its sale row deleted (discardSale, via
  // checkout-fulfillment.ts) so it leaves no trace in "Mis pedidos", and
  // that deletion (server-to-server webhook) races this page load (browser
  // redirect from Mercado Pago) — the row may already be gone by the time
  // this renders. saleId is only used here for display.
  return (
    <div className="mx-auto max-w-[440px] px-5 py-16 text-center md:px-0">
      <h1 className="mb-2 font-headline text-3xl text-aura-on-surface">
        No pudimos procesar tu pago
      </h1>
      <p className="mb-8 text-sm text-aura-on-surface-variant">
        Pedido #{saleId.slice(0, 8)}. Tu carrito sigue disponible — puedes
        intentar de nuevo o contactarnos por WhatsApp.
      </p>
      <Link href="/cart" className="underline">
        Volver al carrito
      </Link>
    </div>
  );
}
