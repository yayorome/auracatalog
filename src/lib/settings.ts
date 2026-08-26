import { supabase } from "./supabase";

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
