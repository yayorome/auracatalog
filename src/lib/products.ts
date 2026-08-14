import { supabase, supabaseUrl } from "./supabase";

export interface ProductVariant {
  id: string;
  sku: string | null;
  price: number;
  stockQuantity: number;
  milliliters: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  currency: string;
  category: string | null;
  fragranceNotes: string[];
  isActive: boolean;
  imageUrl: string | null;
  unitsSold: number;
  variants: ProductVariant[];
}

interface ProductImageRow {
  storage_path: string;
  position: number;
}

interface ProductVariantRow {
  id: string;
  sku: string | null;
  price: number;
  stock_quantity: number;
  milliliters: number;
}

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  currency: string;
  category: string | null;
  fragrance_notes: string[] | null;
  is_active: boolean;
  units_sold: number | null;
  product_images: ProductImageRow[] | null;
  product_variants: ProductVariantRow[] | null;
}

const PRODUCT_PHOTOS_BUCKET = "product-photos";

// Explicit column list (rather than "*") so we don't pull columns this app
// never reads off every request.
const PRODUCT_COLUMNS =
  "id, name, description, brand, currency, category, fragrance_notes, is_active, units_sold, product_images(storage_path, position), product_variants(id, sku, price, stock_quantity, milliliters)";

function primaryImageUrl(images: ProductImageRow[] | null): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => a.position - b.position);
  return `${supabaseUrl}/storage/v1/object/public/${PRODUCT_PHOTOS_BUCKET}/${sorted[0].storage_path}`;
}

function toVariants(rows: ProductVariantRow[] | null): ProductVariant[] {
  if (!rows) return [];
  return [...rows]
    .sort((a, b) => a.milliliters - b.milliliters)
    .map((row) => ({
      id: row.id,
      sku: row.sku,
      price: row.price,
      stockQuantity: row.stock_quantity,
      milliliters: row.milliliters,
    }));
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    brand: row.brand,
    currency: row.currency,
    category: row.category,
    fragranceNotes: row.fragrance_notes ?? [],
    isActive: row.is_active,
    imageUrl: primaryImageUrl(row.product_images),
    unitsSold: row.units_sold ?? 0,
    variants: toVariants(row.product_variants),
  };
}

// Ordered by units_sold desc (ties broken alphabetically) so the catalog
// page can treat the first (optionally category-filtered) row as the
// featured/"best seller" product.
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("units_sold", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ProductRow[]).map(toProduct);
}

export async function fetchProduct(productId: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    // 22P02 = invalid_text_representation — the id in the URL isn't a
    // well-formed uuid, which is a not-found case here, not a server error.
    if (error.code === "22P02") return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  return toProduct(data as ProductRow);
}
