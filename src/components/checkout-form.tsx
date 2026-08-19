"use client";

import { useActionState, useState } from "react";

import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { createCheckoutAction, type CheckoutActionState } from "@/lib/checkout-actions";
import { computeShippingCost, FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import type { ClientProfile } from "@/lib/customer";

const initialState: CheckoutActionState = { error: null };

function formatAddress(client: ClientProfile): string {
  const line1 = [client.street, client.exterior_number].filter(Boolean).join(" ");
  const line1WithInterior = client.interior_number
    ? `${line1} Int. ${client.interior_number}`
    : line1;
  const line2 = [client.neighborhood, client.postal_code].filter(Boolean).join(", ");
  const line3 = [client.municipality || client.city, client.state]
    .filter(Boolean)
    .join(", ");
  return [line1WithInterior, line2, line3].filter(Boolean).join(" · ");
}

export function CheckoutForm({ client }: { client: ClientProfile | null }) {
  const { items, subtotal } = useCart();
  const [state, formAction, pending] = useActionState(
    createCheckoutAction,
    initialState
  );

  const hasSavedAddress = Boolean(client?.street && client?.postal_code);
  const [useDifferentAddress, setUseDifferentAddress] = useState(!hasSavedAddress);

  if (items.length === 0) {
    return <p className="text-aura-on-surface-variant">Tu carrito está vacío.</p>;
  }

  const shippingCost = computeShippingCost(subtotal);
  const total = subtotal + shippingCost;

  const cartPayload = JSON.stringify(
    items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="cart" value={cartPayload} />
      <input type="hidden" name="differentAddress" value={String(useDifferentAddress)} />

      <section>
        <h2 className="mb-3 text-sm font-medium text-aura-on-surface-variant">
          DATOS DE ENVÍO
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Nombre completo"
            name="name"
            defaultValue={client?.name ?? ""}
            required
            className="sm:col-span-2"
          />
          <Field label="Teléfono" name="phone" type="tel" defaultValue={client?.phone ?? ""} />
          <div />
        </div>

        {hasSavedAddress && !useDifferentAddress ? (
          <div className="mt-3 rounded-aura-base border border-aura-outline-variant bg-aura-surface-container-lowest p-3">
            <p className="text-sm text-aura-on-surface">{formatAddress(client!)}</p>
            <button
              type="button"
              onClick={() => setUseDifferentAddress(true)}
              className="mt-2 text-sm underline"
            >
              Enviar a una dirección diferente
            </button>

            {/* Not visibly editable in this mode, but still submitted so
                createCheckoutAction always receives the shipping address. */}
            <input type="hidden" name="street" value={client!.street ?? ""} />
            <input type="hidden" name="exteriorNumber" value={client!.exterior_number ?? ""} />
            <input type="hidden" name="interiorNumber" value={client!.interior_number ?? ""} />
            <input type="hidden" name="neighborhood" value={client!.neighborhood ?? ""} />
            <input type="hidden" name="postalCode" value={client!.postal_code ?? ""} />
            <input type="hidden" name="municipality" value={client!.municipality ?? ""} />
            <input type="hidden" name="city" value={client!.city ?? ""} />
            <input type="hidden" name="state" value={client!.state ?? ""} />
          </div>
        ) : (
          <div className="mt-3">
            {hasSavedAddress && (
              <button
                type="button"
                onClick={() => setUseDifferentAddress(false)}
                className="mb-3 text-sm underline"
              >
                Usar mi dirección guardada
              </button>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Calle"
                name="street"
                defaultValue={client?.street ?? ""}
                required
                className="sm:col-span-2"
              />
              <Field label="No. exterior" name="exteriorNumber" defaultValue={client?.exterior_number ?? ""} />
              <Field
                label="No. interior (opcional)"
                name="interiorNumber"
                defaultValue={client?.interior_number ?? ""}
              />
              <Field label="Colonia" name="neighborhood" defaultValue={client?.neighborhood ?? ""} />
              <Field
                label="Código postal"
                name="postalCode"
                defaultValue={client?.postal_code ?? ""}
                required
              />
              <Field label="Municipio/Alcaldía" name="municipality" defaultValue={client?.municipality ?? ""} />
              <Field label="Ciudad" name="city" defaultValue={client?.city ?? ""} />
              <Field label="Estado" name="state" defaultValue={client?.state ?? ""} />
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-1 border-t border-aura-outline-variant pt-4">
        <div className="flex items-center justify-between text-sm text-aura-on-surface-variant">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal, items[0].currency)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-aura-on-surface-variant">
          <span>Envío</span>
          <span>
            {shippingCost === 0 ? "Gratis" : formatPrice(shippingCost, items[0].currency)}
          </span>
        </div>
        {shippingCost > 0 && (
          <p className="text-xs text-aura-on-surface-variant">
            Envío gratis en pedidos de {formatPrice(FREE_SHIPPING_THRESHOLD, items[0].currency)} o más.
          </p>
        )}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-base font-medium text-aura-on-surface">Total</span>
          <span className="text-lg font-semibold text-aura-on-surface">
            {formatPrice(total, items[0].currency)}
          </span>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-aura-error">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-aura-base bg-aura-primary px-5 py-3 text-sm font-semibold text-aura-on-primary disabled:opacity-60"
      >
        {pending ? "Redirigiendo a Clip…" : "Pagar con Clip"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  className,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-aura-on-surface ${className ?? ""}`}>
      {label}
      <input
        name={name}
        type={type}
        className="rounded-aura-base border border-aura-outline-variant bg-aura-surface-container-lowest px-3 py-2 text-base outline-none focus:border-aura-outline"
        {...rest}
      />
    </label>
  );
}
