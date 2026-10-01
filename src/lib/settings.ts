import { supabase } from "./supabase";
import { DEFAULT_FREE_SHIPPING_THRESHOLD } from "./shipping";

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

// Single source of truth for the free-shipping amount: site_settings row 1,
// editable by the owner. Falls back to the default rather than failing the
// cart/checkout if the row can't be read.
export async function fetchFreeShippingThreshold(): Promise<number> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("free_shipping_threshold")
    .eq("id", 1)
    .maybeSingle();

  const value = Number(data?.free_shipping_threshold);
  if (error || !Number.isFinite(value) || value < 0) return DEFAULT_FREE_SHIPPING_THRESHOLD;
  return value;
}
