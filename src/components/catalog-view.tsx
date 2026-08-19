"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { formatPrice } from "@/lib/format";
import type { Product, ProductVariant } from "@/lib/products";
import { ProductImage } from "@/components/product-image";
import { useCart } from "@/lib/cart-context";

export function CatalogView({ products }: { products: Product[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null
  );

  const categories = useMemo(() => {
    const set = new Set(
      products
        .map((p) => p.category)
        .filter((c): c is string => Boolean(c && c.length > 0))
    );
    return [...set].sort();
  }, [products]);

  const filtered = useMemo(
    () =>
      selectedCategory === null
        ? products
        : products.filter((p) => p.category === selectedCategory),
    [products, selectedCategory]
  );

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6 md:px-16">
      <header className="mb-6 flex justify-center">
        <h1>
          <Image
            src="/logo.webp"
            alt="Aura Research Parfums"
            width={1143}
            height={1136}
            priority
            className="h-20 w-auto sm:h-24"
          />
        </h1>
      </header>

      <main>
        {products.length === 0 ? (
          <p className="py-16 text-center text-aura-on-surface-variant">
            Aún no hay productos.
          </p>
        ) : (
          <>
            {categories.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                <CategoryChip
                  label="Todos"
                  selected={selectedCategory === null}
                  onClick={() => setSelectedCategory(null)}
                />
                {categories.map((category) => (
                  <CategoryChip
                    key={category}
                    label={category}
                    selected={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                  />
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  delayMs={Math.min(index, 10) * 40}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function CategoryChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-aura-xl border px-4 py-1.5 text-sm font-medium transition-colors ${
        selected
          ? "border-aura-primary bg-aura-primary text-aura-on-primary"
          : "border-aura-outline-variant bg-transparent text-aura-on-surface hover:bg-aura-surface-container"
      }`}
    >
      {label}
    </button>
  );
}

// The catalog has no cart/checkout, so a card only ever needs one
// representative price: the cheapest active size, labeled "Desde" when a
// product has more than one.
function cheapestVariant(product: Product) {
  if (product.variants.length === 0) return null;
  const variant = product.variants.reduce((min, v) =>
    v.price < min.price ? v : min
  );
  return { variant, hasMultiple: product.variants.length > 1 };
}

function inStock(product: Product): boolean {
  return product.variants.some((v) => v.stockQuantity > 0);
}

// Quick-add from the grid has no size picker, so it adds the cheapest
// in-stock size — a product entirely out of stock has none, so the button
// is hidden rather than shown disabled.
function cheapestInStockVariant(product: Product): ProductVariant | null {
  const inStockVariants = product.variants.filter((v) => v.stockQuantity > 0);
  if (inStockVariants.length === 0) return null;
  return inStockVariants.reduce((min, v) => (v.price < min.price ? v : min));
}

function ProductCard({
  product,
  delayMs,
}: {
  product: Product;
  delayMs: number;
}) {
  const cheapest = cheapestVariant(product);
  const quickAddVariant = cheapestInStockVariant(product);
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!quickAddVariant) return;
    addItem({
      variantId: quickAddVariant.id,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      milliliters: quickAddVariant.milliliters,
      price: quickAddVariant.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <Link
      href={`/product/${product.id}`}
      style={{ animationDelay: `${delayMs}ms` }}
      className="animate-fade-in-up group flex flex-col rounded-aura-lg border border-aura-outline-variant bg-aura-surface-container-lowest p-3 transition-shadow hover:shadow-sm"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-aura-md">
        <ProductImage
          imageUrl={product.imageUrl}
          alt={product.name}
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
          zoomOnHover
        />
      </div>
      <h3 className="mt-2 truncate text-base font-normal text-aura-on-surface">
        {product.name}
      </h3>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <div>
          {cheapest && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-aura-on-surface">
                {cheapest.hasMultiple && (
                  <span className="mr-1 text-xs font-normal text-aura-on-surface-variant">
                    Desde
                  </span>
                )}
                {formatPrice(cheapest.variant.price, product.currency)}
              </span>
              <span className="text-xs text-aura-on-surface-variant">
                {cheapest.variant.milliliters} ml
              </span>
            </div>
          )}
          {!inStock(product) && (
            <span className="text-xs font-medium text-aura-error">
              Agotado
            </span>
          )}
        </div>

        {quickAddVariant && (
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={`Agregar ${product.name} al carrito`}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
              added
                ? "bg-aura-tertiary text-aura-on-primary"
                : "bg-aura-primary text-aura-on-primary hover:bg-aura-on-surface"
            }`}
          >
            {added ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <PlusIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </Link>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
