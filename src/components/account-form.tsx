"use client";

import { useActionState, useRef, useState } from "react";

import { updateAccountAction, type AccountActionState } from "@/lib/account-actions";
import { lookupPostalCodeAction } from "@/lib/postal-code-actions";
import type { ClientProfile } from "@/lib/customer";

const initialState: AccountActionState = { error: null, success: false };

export function AccountForm({
  client,
  initialColonias = [],
}: {
  client: ClientProfile;
  initialColonias?: string[];
}) {
  const [state, formAction, pending] = useActionState(
    updateAccountAction,
    initialState
  );

  const [postalCode, setPostalCode] = useState(client.postal_code ?? "");
  const [colonias, setColonias] = useState<string[]>(initialColonias);
  const [neighborhood, setNeighborhood] = useState(
    client.neighborhood || (initialColonias.length === 1 ? initialColonias[0] : "")
  );
  const [postalCodeHint, setPostalCodeHint] = useState<string | null>(null);
  const municipalityRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  // Municipio/ciudad/estado come from the CP catalog: once autofilled they're
  // locked, and the colonia select is only usable when the CP has several.
  const [locked, setLocked] = useState({
    municipality: initialColonias.length > 0 && Boolean(client.municipality),
    city: initialColonias.length > 0 && Boolean(client.city),
    state: initialColonias.length > 0 && Boolean(client.state),
  });

  async function lookupAndFill(cp: string) {
    const info = await lookupPostalCodeAction(cp);
    if (!info) {
      setColonias([]);
      setNeighborhood("");
      setLocked({ municipality: false, city: false, state: false });
      setPostalCodeHint("Código postal no encontrado.");
      return;
    }
    setPostalCodeHint(null);
    setColonias(info.colonias);
    setNeighborhood((prev) =>
      info.colonias.length === 1 ? info.colonias[0] : info.colonias.includes(prev) ? prev : ""
    );
    setLocked({
      municipality: Boolean(info.municipio),
      city: Boolean(info.city),
      state: Boolean(info.estado),
    });
    if (municipalityRef.current) municipalityRef.current.value = info.municipio;
    if (cityRef.current) cityRef.current.value = info.city ?? "";
    if (stateRef.current) stateRef.current.value = info.estado;
  }

  function handlePostalCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setPostalCode(value);
    const trimmed = value.trim();
    if (trimmed.length !== 5) {
      setColonias([]);
      setNeighborhood("");
      setLocked({ municipality: false, city: false, state: false });
      setPostalCodeHint(null);
      return;
    }
    lookupAndFill(trimmed);
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nombre completo" name="name" defaultValue={client.name} required className="sm:col-span-2" />
        <Field label="Teléfono" name="phone" defaultValue={client.phone ?? ""} type="tel" />
        <div />
        <Field label="Calle" name="street" defaultValue={client.street ?? ""} className="sm:col-span-2" />
        <Field label="No. exterior" name="exteriorNumber" defaultValue={client.exterior_number ?? ""} />
        <Field label="No. interior" name="interiorNumber" defaultValue={client.interior_number ?? ""} />
        <div className="flex flex-col gap-1">
          <Field
            label="Código postal"
            name="postalCode"
            value={postalCode}
            onChange={handlePostalCodeChange}
          />
          {postalCodeHint && <p className="text-xs text-aura-error">{postalCodeHint}</p>}
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
          readOnly={locked.municipality}
          defaultValue={client.municipality ?? ""}
          inputRef={municipalityRef}
        />
        <Field label="Ciudad" name="city" readOnly={locked.city} defaultValue={client.city ?? ""} inputRef={cityRef} />
        <Field label="Estado" name="state" readOnly={locked.state} defaultValue={client.state ?? ""} inputRef={stateRef} />
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
  inputRef,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-aura-on-surface ${className ?? ""}`}>
      {label}
      <input
        ref={inputRef}
        name={name}
        type={type}
        className="rounded-aura-base border border-aura-outline-variant bg-aura-surface-container-lowest px-3 py-2 text-base outline-none focus:border-aura-outline read-only:cursor-not-allowed read-only:opacity-60"
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
