import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatPrice } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending_payment: "Pago pendiente",
  paid: "Pagado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

interface ShippingAddress {
  name: string;
  phone: string | null;
  street: string;
  exterior_number: string | null;
  interior_number: string | null;
  neighborhood: string | null;
  postal_code: string;
  municipality: string | null;
  city: string | null;
  state: string | null;
}

function formatShippingAddress(address: ShippingAddress): string {
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

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/account/orders/${id}`);

  // RLS (sales_select_own_customer) scopes this to the logged-in customer's
  // own orders — a well-formed id belonging to someone else just returns null.
  const { data: sale, error } = await supabase
    .from("sales")
    .select("id, status, subtotal, shipping_cost, total, currency, created_at, shipping_address, sale_items(id, product_name_snapshot, milliliters_snapshot, quantity, unit_price, line_total)")
    .eq("id", id)
    .maybeSingle();

  if (error?.code === "22P02") notFound();
  if (!sale) notFound();

  const shippingAddress = sale.shipping_address as ShippingAddress | null;

  return (
    <div className="mx-auto max-w-[640px] px-5 py-6 md:px-16">
      <Link href="/account/orders" className="mb-4 inline-block text-sm underline">
        ← Mis pedidos
      </Link>

      <h1 className="mb-1 font-headline text-3xl text-aura-on-surface">
        Pedido #{sale.id.slice(0, 8)}
      </h1>
      <p className="mb-6 text-sm text-aura-on-surface-variant">
        {new Date(sale.created_at).toLocaleString("es-MX")} ·{" "}
        {STATUS_LABELS[sale.status] ?? sale.status}
      </p>

      {shippingAddress && (
        <div className="mb-6 rounded-aura-base border border-aura-outline-variant bg-aura-surface-container-lowest p-3">
          <p className="text-xs font-medium tracking-wide text-aura-on-surface-variant">
            ENVIADO A
          </p>
          <p className="mt-1 text-sm text-aura-on-surface">{shippingAddress.name}</p>
          <p className="text-sm text-aura-on-surface-variant">
            {formatShippingAddress(shippingAddress)}
          </p>
        </div>
      )}

      <ul className="flex flex-col divide-y divide-aura-outline-variant">
        {sale.sale_items.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-aura-on-surface">
                {item.product_name_snapshot} · {item.milliliters_snapshot} ml
              </p>
              <p className="text-xs text-aura-on-surface-variant">
                {item.quantity} × {formatPrice(Number(item.unit_price), sale.currency)}
              </p>
            </div>
            <span className="text-sm font-medium text-aura-on-surface">
              {formatPrice(Number(item.line_total), sale.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-1 border-t border-aura-outline-variant pt-4">
        <div className="flex items-center justify-between text-sm text-aura-on-surface-variant">
          <span>Subtotal</span>
          <span>{formatPrice(Number(sale.subtotal), sale.currency)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-aura-on-surface-variant">
          <span>Envío</span>
          <span>
            {Number(sale.shipping_cost) === 0
              ? "Gratis"
              : formatPrice(Number(sale.shipping_cost), sale.currency)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-base font-medium text-aura-on-surface">Total</span>
          <span className="text-lg font-semibold text-aura-on-surface">
            {formatPrice(Number(sale.total), sale.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
