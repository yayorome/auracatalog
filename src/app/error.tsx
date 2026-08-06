"use client";

export default function Error({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col items-center justify-center px-5 text-center">
      <h1 className="font-headline text-3xl text-aura-on-surface">
        No se pudo cargar el catálogo
      </h1>
      <p className="mt-2 text-base text-aura-on-surface-variant">
        Ocurrió un problema al conectar con el servidor. Intenta de nuevo en
        un momento.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 rounded-aura-xl bg-aura-primary px-6 py-2.5 text-sm font-semibold text-aura-on-primary"
      >
        Reintentar
      </button>
    </main>
  );
}
