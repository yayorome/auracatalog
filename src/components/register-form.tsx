"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerAction, type AuthActionState } from "@/lib/auth-actions";

const initialState: AuthActionState = { error: null };

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState
  );

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
          <Field label="Colonia" name="neighborhood" autoComplete="off" />
          <Field label="Código postal" name="postalCode" autoComplete="postal-code" />
          <Field label="Municipio/Alcaldía" name="municipality" autoComplete="off" />
          <Field label="Ciudad" name="city" autoComplete="address-level2" />
          <Field label="Estado" name="state" autoComplete="address-level1" />
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
