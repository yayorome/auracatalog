"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import type { Product, ProductVariant } from "@/lib/products";

export function AddToCart({ product }: { product: Product }) {
  const inStockVariants = product.variants.filter((v) => v.stockQuantity > 0);
  const [selectedId, setSelectedId] = useState<string | null>(
    inStockVariants[0]?.id ?? null
  );
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  const selected: ProductVariant | undefined = product.variants.find(
    (v) => v.id === selectedId
  );

  if (product.variants.length === 0) return null;

  function handleAdd() {
    if (!selected || selected.stockQuantity <= 0) return;
    addItem({
      variantId: selected.id,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      milliliters: selected.milliliters,
      price: selected.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {product.variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            disabled={variant.stockQuantity <= 0}
            onClick={() => setSelectedId(variant.id)}
            className={`rounded-aura-base border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              selectedId === variant.id
                ? "border-aura-primary bg-aura-primary text-aura-on-primary"
                : "border-aura-outline-variant text-aura-on-surface"
            }`}
          >
            {variant.milliliters} ml · {formatPrice(variant.price, product.currency)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selected || selected.stockQuantity <= 0}
          className="flex-1 rounded-aura-base bg-aura-primary px-5 py-3 text-sm font-semibold text-aura-on-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {added ? "Agregado ✓" : "Agregar al carrito"}
        </button>
        <button
          type="button"
          onClick={() => {
            handleAdd();
            router.push("/cart");
          }}
          disabled={!selected || selected.stockQuantity <= 0}
          className="flex-1 rounded-aura-base border border-aura-primary px-5 py-3 text-sm font-semibold text-aura-on-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          Comprar ahora
        </button>
      </div>
    </div>
  );
}
