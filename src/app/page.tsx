import { CatalogView } from "@/components/catalog-view";
import { fetchProducts } from "@/lib/products";

export const revalidate = 30;

export default async function CatalogPage() {
  const products = await fetchProducts();
  return <CatalogView products={products} />;
}
