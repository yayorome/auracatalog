"use client";

import Link from "next/link";

import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { computeShippingCost, FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import { ProductImage } from "@/components/product-image";

export function CartView() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const shippingCost = computeShippingCost(subtotal);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-aura-on-surface-variant">Tu carrito está vacío.</p>
        <Link href="/" className="mt-4 inline-block underline">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-aura-outline-variant">
        {items.map((item) => (
          <li key={item.variantId} className="flex items-center gap-4 py-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-aura-base bg-aura-surface-container-high">
              <ProductImage imageUrl={item.imageUrl} alt={item.productName} sizes="64px" />
            </div>

            <div className="min-w-0 flex-1">
              {item.brand && (
                <p className="text-xs text-aura-on-surface-variant">{item.brand}</p>
              )}
              <p className="truncate text-sm font-medium text-aura-on-surface">
                {item.productName}
              </p>
              <p className="text-xs text-aura-on-surface-variant">
                {item.milliliters} ml · {formatPrice(item.price, item.currency)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Disminuir cantidad"
                onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                className="h-8 w-8 rounded-full border border-aura-outline-variant text-aura-on-surface"
              >
                −
              </button>
              <span className="w-6 text-center text-sm">{item.quantity}</span>
              <button
                type="button"
                aria-label="Aumentar cantidad"
                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                className="h-8 w-8 rounded-full border border-aura-outline-variant text-aura-on-surface"
              >
                +
              </button>
            </div>

            <button
              type="button"
              aria-label="Eliminar del carrito"
              onClick={() => removeItem(item.variantId)}
              className="text-aura-on-surface-variant hover:text-aura-error"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 border-t border-aura-outline-variant pt-4">
        <div className="flex items-center justify-between text-sm text-aura-on-surface-variant">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal, items[0].currency)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-aura-on-surface-variant">
          <span>Envío</span>
          <span>
            {shippingCost === 0 ? "Gratis" : formatPrice(shippingCost, items[0].currency)}
          </span>
        </div>
        {shippingCost > 0 && (
          <p className="text-xs text-aura-on-surface-variant">
            Te faltan {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal, items[0].currency)} para
            envío gratis.
          </p>
        )}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-base font-medium text-aura-on-surface">Total</span>
          <span className="text-lg font-semibold text-aura-on-surface">
            {formatPrice(subtotal + shippingCost, items[0].currency)}
          </span>
        </div>
      </div>

      <Link
        href="/checkout"
        className="rounded-aura-base bg-aura-primary px-5 py-3 text-center text-sm font-semibold text-aura-on-primary"
      >
        Proceder al pago
      </Link>
    </div>
  );
}
