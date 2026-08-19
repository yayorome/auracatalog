"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/lib/cart-context";
import { logoutAction } from "@/lib/auth-actions";

export function SiteHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { itemCount } = useCart();

  return (
    <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3 text-sm md:px-16">
      <Link href="/" aria-label="Ir al catálogo" className="shrink-0">
        <Image
          src="/logo.webp"
          alt="Aura Research Parfums"
          width={1143}
          height={1136}
          className="h-9 w-auto"
        />
      </Link>

      <div className="flex items-center gap-4">
      {isLoggedIn ? (
        <>
          <Link href="/account/orders" className="text-aura-on-surface hover:underline">
            Mis pedidos
          </Link>
          <Link href="/account" className="text-aura-on-surface hover:underline">
            Mi cuenta
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-aura-on-surface-variant hover:underline">
              Salir
            </button>
          </form>
        </>
      ) : (
        <>
          <Link href="/login" className="text-aura-on-surface hover:underline">
            Iniciar sesión
          </Link>
          <Link href="/register" className="text-aura-on-surface hover:underline">
            Crear cuenta
          </Link>
        </>
      )}

      <Link
        href="/cart"
        aria-label="Carrito"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-aura-on-surface hover:bg-aura-surface-container-high"
      >
        <CartIcon className="h-5 w-5" />
        {/* Always rendered (never conditionally omitted) so the server-rendered
            tree — which always sees an empty cart — matches the client's
            structure on hydration; only visibility depends on itemCount. */}
        <span
          suppressHydrationWarning
          aria-hidden={itemCount === 0}
          className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-aura-primary px-1 text-[10px] font-semibold text-aura-on-primary ${
            itemCount > 0 ? "" : "invisible"
          }`}
        >
          {itemCount}
        </span>
      </Link>
      </div>
    </div>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
