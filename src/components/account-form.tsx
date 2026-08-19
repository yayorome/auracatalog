"use client";

import { useActionState } from "react";

import { updateAccountAction, type AccountActionState } from "@/lib/account-actions";
import type { ClientProfile } from "@/lib/customer";

const initialState: AccountActionState = { error: null, success: false };

export function AccountForm({ client }: { client: ClientProfile }) {
  const [state, formAction, pending] = useActionState(
    updateAccountAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nombre completo" name="name" defaultValue={client.name} required className="sm:col-span-2" />
        <Field label="Teléfono" name="phone" defaultValue={client.phone ?? ""} type="tel" />
        <div />
        <Field label="Calle" name="street" defaultValue={client.street ?? ""} className="sm:col-span-2" />
        <Field label="No. exterior" name="exteriorNumber" defaultValue={client.exterior_number ?? ""} />
        <Field label="No. interior" name="interiorNumber" defaultValue={client.interior_number ?? ""} />
        <Field label="Colonia" name="neighborhood" defaultValue={client.neighborhood ?? ""} />
        <Field label="Código postal" name="postalCode" defaultValue={client.postal_code ?? ""} />
        <Field label="Municipio/Alcaldía" name="municipality" defaultValue={client.municipality ?? ""} />
        <Field label="Ciudad" name="city" defaultValue={client.city ?? ""} />
        <Field label="Estado" name="state" defaultValue={client.state ?? ""} />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-aura-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-aura-tertiary">Guardado.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-aura-base bg-aura-primary px-5 py-3 text-sm font-semibold text-aura-on-primary disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
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
