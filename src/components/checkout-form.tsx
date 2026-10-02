"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { createCheckoutAction, type CheckoutActionState } from "@/lib/checkout-actions";
import { lookupPostalCodeAction } from "@/lib/postal-code-actions";
import { computeShippingCost } from "@/lib/shipping";
import { formatAddressLines } from "@/lib/format-address";
import type { ClientProfile } from "@/lib/customer";

const initialState: CheckoutActionState = { error: null };

export function CheckoutForm({
  client,
  isLoggedIn = false,
  initialColonias = [],
  freeShippingThreshold,
}: {
  client: ClientProfile | null;
  isLoggedIn?: boolean;
  initialColonias?: string[];
  freeShippingThreshold: number;
}) {
  const { items, subtotal } = useCart();
  const [state, formAction, pending] = useActionState(
    createCheckoutAction,
    initialState
  );

  const hasSavedAddress = Boolean(client?.street && client?.postal_code);
  const [useDifferentAddress, setUseDifferentAddress] = useState(!hasSavedAddress);

  // Controlled form state ensures fields are never wiped if an error occurs during checkout
  const [name, setName] = useState(client?.name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [street, setStreet] = useState(client?.street ?? "");
  const [exteriorNumber, setExteriorNumber] = useState(client?.exterior_number ?? "");
  const [interiorNumber, setInteriorNumber] = useState(client?.interior_number ?? "");
  const [postalCode, setPostalCode] = useState(client?.postal_code ?? "");
  const [colonias, setColonias] = useState<string[]>(initialColonias);
  const [neighborhood, setNeighborhood] = useState(
    client?.neighborhood || (initialColonias.length === 1 ? initialColonias[0] : "")
  );
  const [municipality, setMunicipality] = useState(client?.municipality ?? "");
  const [city, setCity] = useState(client?.city ?? "");
  const [stateName, setStateName] = useState(client?.state ?? "");
  const [postalCodeHint, setPostalCodeHint] = useState<string | null>(null);

  async function lookupAndFill(cp: string) {
    const info = await lookupPostalCodeAction(cp);
    if (!info) {
      setColonias([]);
      setNeighborhood("");
      setMunicipality("");
      setCity("");
      setStateName("");
      setPostalCodeHint("Código postal no encontrado.");
      return;
    }
    setPostalCodeHint(null);
    setColonias(info.colonias);
    setNeighborhood((prev) =>
      info.colonias.length === 1 ? info.colonias[0] : info.colonias.includes(prev) ? prev : ""
    );
    setMunicipality(info.municipio);
    setCity(info.city ?? "");
    setStateName(info.estado);
  }

  function handlePostalCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setPostalCode(value);
    const trimmed = value.trim();
    if (trimmed.length !== 5) {
      setColonias([]);
      setNeighborhood("");
      setMunicipality("");
      setCity("");
      setStateName("");
      setPostalCodeHint(null);
      return;
    }
    lookupAndFill(trimmed);
  }

  if (items.length === 0) {
    return <p className="text-aura-on-surface-variant">Tu carrito está vacío.</p>;
  }

  const shippingCost = computeShippingCost(subtotal, freeShippingThreshold);
  const total = subtotal + shippingCost;

  const cartPayload = JSON.stringify(
    items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="cart" value={cartPayload} />
      <input type="hidden" name="differentAddress" value={String(useDifferentAddress)} />

      {!isLoggedIn && (
        <div className="rounded-aura-base border border-aura-outline-variant bg-aura-surface-container-lowest p-3 text-sm text-aura-on-surface">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login?next=/checkout" className="font-medium underline hover:text-aura-primary">
            Inicia sesión
          </Link>{" "}
          para usar tus datos y direcciones guardadas.
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-aura-on-surface-variant">
          DATOS DE ENVÍO
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Nombre completo"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="sm:col-span-2"
          />
          <Field
            label="Correo electrónico"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            label="Teléfono (opcional)"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {hasSavedAddress && !useDifferentAddress ? (
          <div className="mt-3 rounded-aura-base border border-aura-outline-variant bg-aura-surface-container-lowest p-3">
            <p className="text-sm text-aura-on-surface">{formatAddressLines(client!)}</p>
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
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                required
                className="sm:col-span-2"
              />
              <Field
                label="No. exterior"
                name="exteriorNumber"
                value={exteriorNumber}
                onChange={(e) => setExteriorNumber(e.target.value)}
              />
              <Field
                label="No. interior (opcional)"
                name="interiorNumber"
                value={interiorNumber}
                onChange={(e) => setInteriorNumber(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <Field
                  label="Código postal"
                  name="postalCode"
                  value={postalCode}
                  onChange={handlePostalCodeChange}
                  required
                />
                {postalCodeHint && (
                  <p className="text-xs text-aura-error">{postalCodeHint}</p>
                )}
              </div>
              <SelectField
                label="Colonia"
                name="neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                disabled={colonias.length <= 1}
              >
                <option value="" disabled>
                  {colonias.length === 0 ? "Ingresa tu código postal" : "Selecciona tu colonia"}
                </option>
                {colonias.map((colonia) => (
                  <option key={colonia} value={colonia}>
                    {colonia}
                  </option>
                ))}
              </SelectField>
              {colonias.length === 1 && <input type="hidden" name="neighborhood" value={neighborhood} />}
              <Field
                label="Municipio/Alcaldía"
                name="municipality"
                value={municipality}
                readOnly
                tabIndex={-1}
                placeholder="Se autocompleta con el C.P."
              />
              <Field
                label="Ciudad"
                name="city"
                value={city}
                readOnly
                tabIndex={-1}
                placeholder="Se autocompleta con el C.P."
              />
              <Field
                label="Estado"
                name="state"
                value={stateName}
                readOnly
                tabIndex={-1}
                placeholder="Se autocompleta con el C.P."
              />
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
            Envío gratis en pedidos de {formatPrice(freeShippingThreshold, items[0].currency)} o más.
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
        data-mp-checkout-cta="checkout-pro"
        aria-label={pending ? "Redirigiendo a Mercado Pago…" : "Pagar con Mercado Pago"}
        className="self-start rounded-aura-base bg-[#009ee3] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        Pagar con Mercado Pago
      </button>
      {pending && (
        <p className="text-sm text-aura-on-surface-variant">Redirigiendo a Mercado Pago…</p>
      )}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  className,
  readOnly,
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
        readOnly={readOnly}
        className={`rounded-aura-base border border-aura-outline-variant px-3 py-2 text-base outline-none focus:border-aura-outline ${
          readOnly
            ? "cursor-not-allowed bg-aura-surface-container text-aura-on-surface-variant select-none opacity-80"
            : "bg-aura-surface-container-lowest"
        }`}
        {...rest}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  className,
  children,
  ...rest
}: {
  label: string;
  name: string;
  className?: string;
  children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-aura-on-surface ${className ?? ""}`}>
      {label}
      <select
        name={name}
        className="rounded-aura-base border border-aura-outline-variant bg-aura-surface-container-lowest px-3 py-2 text-base outline-none focus:border-aura-outline disabled:opacity-60"
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}
