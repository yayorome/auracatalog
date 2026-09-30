import type { MetadataRoute } from "next";

import { fetchProducts } from "@/lib/products";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await fetchProducts();

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...products.map((product) => ({
      url: `${base}/product/${product.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
