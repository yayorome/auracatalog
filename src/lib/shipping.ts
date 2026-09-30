export const SHIPPING_COST = 150;
export const FREE_SHIPPING_THRESHOLD = 2500;

/** Flat shipping fee, waived once the product subtotal reaches the threshold. */
export function computeShippingCost(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
}
