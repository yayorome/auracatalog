import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[720px] flex-col items-center justify-center px-5 text-center">
      <h1 className="font-headline text-3xl text-aura-on-surface">
        Producto no encontrado
      </h1>
      <p className="mt-2 text-base text-aura-on-surface-variant">
        Puede que este producto ya no esté disponible.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-aura-xl bg-aura-primary px-6 py-2.5 text-sm font-semibold text-aura-on-primary"
      >
        Volver al catálogo
      </Link>
    </div>
  );
}
