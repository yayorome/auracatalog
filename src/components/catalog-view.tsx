"use client";

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
      <header className="mb-6 text-center">
        <h1 className="font-headline text-3xl font-normal text-aura-on-surface">
          Aura Research
        </h1>
      </header>

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
            {rest.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
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

function FeaturedProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="block rounded-aura-lg border border-aura-outline-variant bg-aura-surface-container-lowest p-4 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-aura-md">
          <ProductImage
            imageUrl={product.imageUrl}
            alt={product.name}
            sizes="120px"
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
          <h2 className="mt-1 truncate font-headline text-2xl text-aura-on-surface">
            {product.name}
          </h2>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-base text-aura-on-surface-variant">
              {product.description}
            </p>
          )}
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-aura-on-surface">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.milliliters != null && (
              <span className="text-xs text-aura-on-surface-variant">
                {product.milliliters} ml
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="flex flex-col rounded-aura-lg border border-aura-outline-variant bg-aura-surface-container-lowest p-3 transition-shadow hover:shadow-sm"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-aura-md">
        <ProductImage
          imageUrl={product.imageUrl}
          alt={product.name}
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
        />
      </div>
      <p className="mt-2 truncate text-base text-aura-on-surface">
        {product.name}
      </p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-sm font-semibold text-aura-on-surface">
          {formatPrice(product.price, product.currency)}
        </span>
        {product.milliliters != null && (
          <span className="text-xs text-aura-on-surface-variant">
            {product.milliliters} ml
          </span>
        )}
      </div>
      {!(product.stockQuantity > 0) && (
        <span className="mt-0.5 text-xs font-medium text-aura-error">
          Agotado
        </span>
      )}
    </Link>
  );
}
