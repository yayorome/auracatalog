"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { registerAction, type AuthActionState } from "@/lib/auth-actions";
import { lookupPostalCodeAction } from "@/lib/postal-code-actions";
import { PASSWORD_REQUIREMENTS_TEXT, validatePassword } from "@/lib/password";

const initialState: AuthActionState = { error: null };

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [street, setStreet] = useState("");
  const [exteriorNumber, setExteriorNumber] = useState("");
  const [interiorNumber, setInteriorNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [colonias, setColonias] = useState<string[]>([]);
  const [neighborhood, setNeighborhood] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postalCodeHint, setPostalCodeHint] = useState<string | null>(null);

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const passwordError = password.length > 0 ? validatePassword(password) : null;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // All required fields must be present and valid to allow account creation:
  // fullName, email, password & confirmation, street, exteriorNumber, postalCode, and selected colonia.
  const isFormComplete = Boolean(
    fullName.trim() &&
    email.trim() &&
    isEmailValid &&
    password &&
    !passwordError &&
    confirmPassword &&
    !passwordMismatch &&
    password === confirmPassword &&
    street.trim() &&
    exteriorNumber.trim() &&
    postalCode.trim().length === 5 &&
    !postalCodeHint &&
    neighborhood.trim() &&
    municipality.trim() &&
    stateName.trim()
  );

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

  if (state.checkEmail) {
    return (
      <p className="text-sm text-aura-on-surface">
        Te enviamos un correo para confirmar tu cuenta. Una vez confirmada,
        inicia sesión para continuar.
      </p>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!isFormComplete) {
      e.preventDefault();
      return;
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <Field
        label="Nombre completo"
        name="fullName"
        autoComplete="name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <Field
        label="Correo electrónico"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Field
        label="Teléfono (opcional)"
        name="phone"
        type="tel"
        autoComplete="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <div className="flex flex-col gap-1">
        <Field
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-aura-on-surface-variant">
          {PASSWORD_REQUIREMENTS_TEXT}
        </p>
        {passwordError && (
          <p className="text-xs text-aura-error">{passwordError}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Field
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {passwordMismatch && (
          <p className="text-xs text-aura-error">Las contraseñas no coinciden.</p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-aura-on-surface-variant">
          DIRECCIÓN DE ENVÍO
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Calle"
            name="street"
            autoComplete="address-line1"
            className="sm:col-span-2"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            required
          />
          <Field
            label="No. exterior"
            name="exteriorNumber"
            autoComplete="off"
            value={exteriorNumber}
            onChange={(e) => setExteriorNumber(e.target.value)}
            required
          />
          <Field
            label="No. interior (opcional)"
            name="interiorNumber"
            autoComplete="off"
            value={interiorNumber}
            onChange={(e) => setInteriorNumber(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <Field
              label="Código postal"
              name="postalCode"
              autoComplete="postal-code"
              maxLength={5}
              inputMode="numeric"
              value={postalCode}
              onChange={handlePostalCodeChange}
              required
            />
            {postalCodeHint && <p className="text-xs text-aura-error">{postalCodeHint}</p>}
          </div>
          <SelectField
            label="Colonia"
            name="neighborhood"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            disabled={colonias.length === 0}
            required
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
            value={municipality}
            readOnly
            tabIndex={-1}
            placeholder="Se autocompleta con el C.P."
            required
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
            required
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-aura-error">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !isFormComplete}
        className="mt-2 rounded-aura-base bg-aura-primary px-5 py-3 text-sm font-semibold text-aura-on-primary disabled:cursor-not-allowed disabled:opacity-50"
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
  readOnly,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  className?: string;
  readOnly?: boolean;
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
        className="rounded-aura-base border border-aura-outline-variant bg-aura-surface-container-lowest px-3 py-2 text-base outline-none focus:border-aura-outline disabled:cursor-not-allowed disabled:bg-aura-surface-container disabled:text-aura-on-surface-variant disabled:opacity-60"
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}
