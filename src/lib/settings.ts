import { supabase } from "./supabase";

const DEFAULT_BANNER_MESSAGE = "Para hacer tu pedido contactanos via WhatsApp";

export async function fetchBannerMessage(): Promise<string> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("banner_message")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return DEFAULT_BANNER_MESSAGE;
  return data.banner_message;
}
