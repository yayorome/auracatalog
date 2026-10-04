// Fallbacks used only if site_settings can't be read.
export const DEFAULT_SHIPPING_COST = 150;
export const SHIPPING_COST = DEFAULT_SHIPPING_COST;
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 2500;

/** Shipping fee, waived once the product subtotal reaches the free shipping threshold. */
export function computeShippingCost(
  subtotal: number,
  freeShippingThreshold: number,
  shippingRate: number = DEFAULT_SHIPPING_COST
): number {
  return subtotal >= freeShippingThreshold ? 0 : shippingRate;
}
