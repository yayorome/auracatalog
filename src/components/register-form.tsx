"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import { registerAction, type AuthActionState } from "@/lib/auth-actions";
import { lookupPostalCodeAction } from "@/lib/postal-code-actions";

const initialState: AuthActionState = { error: null };

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState
  );

  const [postalCode, setPostalCode] = useState("");
  const [colonias, setColonias] = useState<string[]>([]);
  const [neighborhood, setNeighborhood] = useState("");
  const [postalCodeHint, setPostalCodeHint] = useState<string | null>(null);
  const municipalityRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);

  async function lookupAndFill(cp: string) {
    const info = await lookupPostalCodeAction(cp);
    if (!info) {
      setColonias([]);
      setNeighborhood("");
      setPostalCodeHint("Código postal no encontrado.");
      return;
    }
    setPostalCodeHint(null);
    setColonias(info.colonias);
    setNeighborhood((prev) => (info.colonias.includes(prev) ? prev : ""));
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
      setPostalCodeHint(null);
      return;
    }
    lookupAndFill(trimmed);
  }

  if (state.checkEmail) {
    return (
      <p className="text-sm text-aura-on-surface">
        Te enviamos un correo para confirmar tu cuenta. Una vez confirmada,
        inicia sesión para continuar.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <Field label="Nombre completo" name="fullName" autoComplete="name" required />
      <Field
        label="Correo electrónico"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Field
        label="Teléfono (opcional)"
        name="phone"
        type="tel"
        autoComplete="tel"
      />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />

      <div>
        <h2 className="mb-3 text-sm font-medium text-aura-on-surface-variant">
          DIRECCIÓN DE ENVÍO (OPCIONAL)
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Calle" name="street" autoComplete="address-line1" className="sm:col-span-2" />
          <Field label="No. exterior" name="exteriorNumber" autoComplete="off" />
          <Field label="No. interior" name="interiorNumber" autoComplete="off" />
          <div className="flex flex-col gap-1">
            <Field
              label="Código postal"
              name="postalCode"
              autoComplete="postal-code"
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
            disabled={colonias.length === 0}
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
          <Field
            label="Municipio/Alcaldía"
            name="municipality"
            autoComplete="off"
            inputRef={municipalityRef}
          />
          <Field label="Ciudad" name="city" autoComplete="address-level2" inputRef={cityRef} />
          <Field label="Estado" name="state" autoComplete="address-level1" inputRef={stateRef} />
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
        className="mt-2 rounded-aura-base bg-aura-primary px-5 py-3 text-sm font-semibold text-aura-on-primary disabled:opacity-60"
      >
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>

      <p className="text-center text-sm text-aura-on-surface-variant">
        ¿Ya tienes cuenta?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="underline">
          Inicia sesión
        </Link>
      </p>
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
        className="rounded-aura-base border border-aura-outline-variant bg-aura-surface-container-lowest px-3 py-2 text-base outline-none focus:border-aura-outline"
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
