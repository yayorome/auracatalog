import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductImage } from "@/components/product-image";
import { formatPrice } from "@/lib/format";
import { fetchProduct } from "@/lib/products";

export const revalidate = 30;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-[720px] px-5 py-6 md:px-16">
      <Link
        href="/"
        aria-label="Volver al catálogo"
        className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-aura-on-surface hover:bg-aura-surface-container"
      >
        <BackArrowIcon className="h-5 w-5" />
      </Link>

      {product.imageUrl && (
        <div className="relative mb-6 aspect-square w-full overflow-hidden rounded-aura-lg">
          <ProductImage
            imageUrl={product.imageUrl}
            alt={product.name}
            sizes="720px"
          />
        </div>
      )}

      <div className="rounded-aura-lg border border-aura-outline-variant bg-aura-surface-container-lowest p-5">
        {product.brand && (
          <p className="text-xs font-medium tracking-wide text-aura-on-surface-variant">
            {product.brand.toUpperCase()}
          </p>
        )}
        <h1 className="font-headline text-4xl text-aura-on-surface">
          {product.name}
        </h1>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl text-aura-on-surface">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.milliliters != null && (
            <span className="text-base text-aura-on-surface-variant">
              {product.milliliters} ml
            </span>
          )}
        </div>

        {product.description && (
          <p className="mt-4 text-base text-aura-on-surface">
            {product.description}
          </p>
        )}

        {product.fragranceNotes.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium tracking-wide text-aura-on-surface-variant">
              NOTAS OLFATIVAS
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.fragranceNotes.map((note) => (
                <span
                  key={note}
                  className="rounded-aura-xl border border-aura-outline-variant bg-aura-glass px-3 py-1 text-xs text-aura-on-surface backdrop-blur-sm"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>
        )}

        <p
          className={`mt-4 text-sm font-semibold ${
            product.stockQuantity > 0
              ? "text-aura-on-surface-variant"
              : "text-aura-error"
          }`}
        >
          {product.stockQuantity > 0 ? "Disponible" : "Agotado"}
        </p>
      </div>
    </div>
  );
}

function BackArrowIcon({ className }: { className?: string }) {
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
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}
