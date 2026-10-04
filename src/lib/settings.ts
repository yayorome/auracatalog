import { supabase } from "./supabase";
import { DEFAULT_FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_COST } from "./shipping";

const DEFAULT_BANNER_MESSAGE = "Para hacer tu pedido contactanos via WhatsApp";

export async function fetchBannerSettings(): Promise<{
  message: string;
  enabled: boolean;
}> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("banner_message, banner_enabled")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return { message: DEFAULT_BANNER_MESSAGE, enabled: true };
  return { message: data.banner_message, enabled: data.banner_enabled };
}

// Single source of truth for the shipping settings: site_settings row 1,
// editable by the owner. Falls back to defaults rather than failing the
// cart/checkout if the row can't be read.
export async function fetchShippingSettings(): Promise<{
  freeShippingThreshold: number;
  shippingCost: number;
}> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("free_shipping_threshold, shipping_cost")
    .eq("id", 1)
    .maybeSingle();

  const threshold = Number(data?.free_shipping_threshold);
  const cost = Number(data?.shipping_cost);

  return {
    freeShippingThreshold:
      error || !Number.isFinite(threshold) || threshold < 0
        ? DEFAULT_FREE_SHIPPING_THRESHOLD
        : threshold,
    shippingCost:
      error || !Number.isFinite(cost) || cost < 0
        ? DEFAULT_SHIPPING_COST
        : cost,
  };
}

export async function fetchFreeShippingThreshold(): Promise<number> {
  const settings = await fetchShippingSettings();
  return settings.freeShippingThreshold;
}

export async function fetchShippingCost(): Promise<number> {
  const settings = await fetchShippingSettings();
  return settings.shippingCost;
}
