import { notFound } from "next/navigation";

import { AddToCart } from "@/components/add-to-cart";
import { BackLink } from "@/components/back-link";
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
      <BackLink href="/" label="Volver al catálogo" />

      <main>
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

        {product.variants.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium tracking-wide text-aura-on-surface-variant">
              PRESENTACIONES
            </p>
            <ul className="mt-2 divide-y divide-aura-outline-variant">
              {product.variants.map((variant) => (
                <li
                  key={variant.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-base text-aura-on-surface">
                    {variant.milliliters} ml
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-base text-aura-on-surface">
                      {formatPrice(variant.price, product.currency)}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        variant.stockQuantity > 0
                          ? "text-aura-on-surface-variant"
                          : "text-aura-error"
                      }`}
                    >
                      {variant.stockQuantity > 0 ? "Disponible" : "Agotado"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <AddToCart product={product} />
      </div>
      </main>
    </div>
  );
}
