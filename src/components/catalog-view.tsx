"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/products";
import { ProductImage } from "@/components/product-image";

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

  // fetchProducts() already orders by units_sold desc, so the first
  // (optionally category-filtered) row is the best seller.
  const featured = filtered[0] ?? null;
  const rest = filtered.length > 1 ? filtered.slice(1) : [];

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

            {featured && (
              <div className="mb-3">
                <FeaturedProductCard product={featured} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {rest.map((product, index) => (
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

/**
 * The one deliberate signature moment on the page: a literal "aura" — a
 * halo of concentric rings bleeding off the card edge — behind the best
 * seller, tying back to the brand name. Nowhere else on the page repeats
 * this motif, so it stays a single accent rather than decoration.
 */
function AuraGlow() {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden
      className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 text-aura-tertiary opacity-[0.14] sm:h-72 sm:w-72"
    >
      <circle cx="100" cy="100" r="99" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="100" cy="100" r="45" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
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

function FeaturedProductCard({ product }: { product: Product }) {
  const cheapest = cheapestVariant(product);
  return (
    <Link
      href={`/product/${product.id}`}
      className="animate-fade-in-up group relative block overflow-hidden rounded-aura-lg border border-aura-outline-variant bg-aura-surface-container-lowest p-4 transition-shadow hover:shadow-md sm:p-6"
    >
      <AuraGlow />
      <div className="relative flex items-start gap-4 sm:gap-6">
        <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-aura-md sm:h-[168px] sm:w-[168px]">
          <ProductImage
            imageUrl={product.imageUrl}
            alt={product.name}
            sizes="168px"
            zoomOnHover
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tracking-wide text-aura-tertiary">
              DESTACADO
            </span>
            {product.unitsSold > 0 && (
              <span className="text-xs text-aura-on-surface-variant">
                {product.unitsSold} vendidos
              </span>
            )}
          </div>
          <h2 className="mt-1 truncate font-headline text-2xl tracking-tight text-aura-on-surface sm:text-4xl">
            {product.name}
          </h2>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-base text-aura-on-surface-variant">
              {product.description}
            </p>
          )}
          <div className="mt-2 flex items-baseline gap-1.5 sm:mt-4">
            {cheapest && (
              <>
                <span className="text-sm font-semibold text-aura-on-surface sm:text-xl">
                  {cheapest.hasMultiple && (
                    <span className="mr-1 text-xs font-normal text-aura-on-surface-variant sm:text-sm">
                      Desde
                    </span>
                  )}
                  {formatPrice(cheapest.variant.price, product.currency)}
                </span>
                <span className="text-xs text-aura-on-surface-variant sm:text-sm">
                  {cheapest.variant.milliliters} ml
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductCard({
  product,
  delayMs,
}: {
  product: Product;
  delayMs: number;
}) {
  const cheapest = cheapestVariant(product);
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
      {cheapest && (
        <div className="mt-0.5 flex items-baseline gap-1.5">
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
        <span className="mt-0.5 text-xs font-medium text-aura-error">
          Agotado
        </span>
      )}
    </Link>
  );
}
