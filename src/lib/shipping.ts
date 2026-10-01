export const SHIPPING_COST = 150;
// Used only if site_settings.free_shipping_threshold can't be read.
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 2500;

/** Flat shipping fee, waived once the product subtotal reaches the threshold. */
export function computeShippingCost(subtotal: number, freeShippingThreshold: number): number {
  return subtotal >= freeShippingThreshold ? 0 : SHIPPING_COST;
}
