import { notFound } from "next/navigation";

import { simulateClipPaymentAction } from "@/lib/mock-checkout-actions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/format";

export default async function MockCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ sale?: string }>;
}) {
  if (process.env.CLIP_API_KEY) notFound(); // dev-only stand-in for Clip's hosted page

  const { sale: saleId } = await searchParams;
  if (!saleId) notFound();

  const { data: sale } = await supabaseAdmin
    .from("sales")
    .select("id, total, currency")
    .eq("id", saleId)
    .maybeSingle();
  if (!sale) notFound();

  return (
    <div className="mx-auto max-w-[440px] px-5 py-10 text-center md:px-0">
      <p className="mb-2 text-xs font-medium tracking-wide text-aura-on-surface-variant">
        SIMULADOR LOCAL DE CLIP CHECKOUT
      </p>
      <h1 className="mb-2 font-headline text-2xl text-aura-on-surface">
        Total a pagar: {formatPrice(Number(sale.total), sale.currency)}
      </h1>
      <p className="mb-8 text-sm text-aura-on-surface-variant">
        CLIP_API_KEY no está configurada — esta pantalla sustituye el checkout
        real de Clip para poder probar el flujo completo localmente.
      </p>

      <form action={simulateClipPaymentAction} className="flex flex-col gap-3">
        <input type="hidden" name="saleId" value={sale.id} />
        <button
          type="submit"
          name="outcome"
          value="approve"
          className="rounded-aura-base bg-aura-primary px-5 py-3 text-sm font-semibold text-aura-on-primary"
        >
          Simular pago aprobado
        </button>
        <button
          type="submit"
          name="outcome"
          value="fail"
          className="rounded-aura-base border border-aura-outline-variant px-5 py-3 text-sm font-semibold text-aura-on-surface"
        >
          Simular pago rechazado
        </button>
      </form>
    </div>
  );
}
