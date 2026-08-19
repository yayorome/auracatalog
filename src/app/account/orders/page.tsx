import Link from "next/link";
import { redirect } from "next/navigation";

import { BackLink } from "@/components/back-link";
import { formatPrice } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export default async function OrdersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/orders");

  const { data: sales } = await supabase
    .from("sales")
    .select("id, status, total, currency, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-[720px] px-5 py-6 md:px-16">
      <BackLink href="/" label="Volver al catálogo" />
      <h1 className="mb-6 font-headline text-3xl text-aura-on-surface">
        Mis pedidos
      </h1>

      {!sales || sales.length === 0 ? (
        <p className="text-aura-on-surface-variant">Aún no tienes pedidos.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-aura-outline-variant">
          {sales.map((sale) => (
            <li key={sale.id}>
              <Link
                href={`/account/orders/${sale.id}`}
                className="flex items-center justify-between py-4 hover:bg-aura-surface-container-lowest"
              >
                <div>
                  <p className="text-sm font-medium text-aura-on-surface">
                    Pedido #{sale.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-aura-on-surface-variant">
                    {new Date(sale.created_at).toLocaleDateString("es-MX")} ·{" "}
                    {STATUS_LABELS[sale.status] ?? sale.status}
                  </p>
                </div>
                <span className="text-sm font-semibold text-aura-on-surface">
                  {formatPrice(Number(sale.total), sale.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
