"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction, type AuthActionState } from "@/lib/auth-actions";

const initialState: AuthActionState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

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

      <label className="flex flex-col gap-1 text-sm text-aura-on-surface">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
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
        {pending ? "Ingresando…" : "Iniciar sesión"}
      </button>

      <p className="text-center text-sm text-aura-on-surface-variant">
        ¿Aún no tienes cuenta?{" "}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="underline"
        >
          Regístrate
        </Link>
      </p>
    </form>
  );
}
