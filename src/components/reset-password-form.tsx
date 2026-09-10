"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Status = "checking" | "ready" | "invalid" | "done";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    // The recovery link's #access_token=... fragment is consumed by the
    // browser client on load (detectSessionInUrl, default true) — that
    // happens asynchronously, so getSession() alone can race it on first
    // paint. onAuthStateChange also fires PASSWORD_RECOVERY once the
    // fragment is processed, which is what actually flips this to "ready"
    // on a fresh link; the getSession() check just covers a revisit of
    // this page while a recovery session is already active.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus("ready");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, 3000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStatus("done");
    setTimeout(() => router.push("/account"), 1500);
  }

  if (status === "checking") {
    return <p className="text-sm text-aura-on-surface-variant">Verificando enlace…</p>;
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-aura-error">
          Este enlace ya no es válido o expiró. Solicita uno nuevo.
        </p>
        <Link href="/forgot-password" className="text-sm underline">
          Solicitar enlace de nuevo
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <p className="text-sm text-aura-on-surface">
        Tu contraseña se actualizó. Te estamos redirigiendo…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-aura-on-surface">
        Nueva contraseña
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-aura-base border border-aura-outline-variant bg-aura-surface-container-lowest px-3 py-2 text-base outline-none focus:border-aura-outline"
        />
      </label>

      <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1 text-sm text-aura-on-surface">
          Confirmar nueva contraseña
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-aura-base border border-aura-outline-variant bg-aura-surface-container-lowest px-3 py-2 text-base outline-none focus:border-aura-outline"
          />
        </label>
        {passwordMismatch && (
          <p className="text-xs text-aura-error">Las contraseñas no coinciden.</p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-aura-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || passwordMismatch}
        className="mt-2 rounded-aura-base bg-aura-primary px-5 py-3 text-sm font-semibold text-aura-on-primary disabled:opacity-60"
      >
        {submitting ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
