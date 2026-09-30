"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  requestPasswordResetAction,
  type AuthActionState,
} from "@/lib/auth-actions";

const initialState: AuthActionState = { error: null };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState
  );

  if (state.checkEmail) {
    return (
      <p className="text-sm text-aura-on-surface">
        Si ese correo tiene una cuenta, te enviamos un enlace para
        restablecer tu contraseña. Revisa tu bandeja de entrada.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-aura-on-surface-variant">
        Ingresa el correo de tu cuenta y te enviaremos un enlace para
        restablecer tu contraseña.
      </p>

      <label className="flex flex-col gap-1 text-sm text-aura-on-surface">
        Correo electrónico
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-aura-base border border-aura-outline-variant bg-aura-surface-container-lowest px-3 py-2 text-base outline-none focus:border-aura-outline"
        />
      </label>

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
        {pending ? "Enviando…" : "Enviar enlace"}
      </button>

      <p className="text-center text-sm text-aura-on-surface-variant">
        <Link href="/login" className="underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
