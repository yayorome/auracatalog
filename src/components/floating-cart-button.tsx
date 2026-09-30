"use client";

import Link from "next/link";

import { CartIcon } from "@/components/site-header";
import { useCart } from "@/lib/cart-context";

export function FloatingCartButton() {
  const { itemCount } = useCart();
  // Sits directly above the SocialLinks stack (3 × 48px buttons + 2 × 12px
  // gaps, anchored at bottom-5): 20 + 168 + 12 gap = 200px. Update this if
  // the number or size of social buttons changes.

  return (
    <Link
      href="/cart"
      aria-label={
        itemCount > 0 ? `Carrito, ${itemCount} artículos` : "Carrito"
      }
      className="fixed bottom-[200px] right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-aura-primary text-aura-on-primary shadow-lg transition-transform hover:scale-105"
    >
      <CartIcon className="h-6 w-6" />
      {/* Always rendered so server and client trees match on hydration
          (the server always sees an empty cart); only visibility varies. */}
      <span
        suppressHydrationWarning
        aria-hidden
        className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-aura-on-surface px-1 text-[11px] font-semibold text-white ${
          itemCount > 0 ? "" : "invisible"
        }`}
      >
        {itemCount}
      </span>
    </Link>
  );
}
