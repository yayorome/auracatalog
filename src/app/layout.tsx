import type { Metadata } from "next";
import { Hanken_Grotesk, Libre_Caslon_Text } from "next/font/google";
import "./globals.css";
import { SocialLinks } from "@/components/social-links";
import { WhatsAppBanner } from "@/components/whatsapp-banner";
import { SiteHeader } from "@/components/site-header";
import { CartProvider } from "@/lib/cart-context";
import { fetchBannerSettings } from "@/lib/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const libreCaslonText = Libre_Caslon_Text({
  variable: "--font-libre-caslon-text",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aura Research Parfums",
  description: "Catálogo de perfumes Aura Research Parfums.",
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const bannerSettings = await fetchBannerSettings();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="es"
      className={`${libreCaslonText.variable} ${hankenGrotesk.variable}`}
    >
      <body className="min-h-screen antialiased font-body">
        {bannerSettings.enabled && (
          <WhatsAppBanner message={bannerSettings.message} />
        )}
        <CartProvider>
          <SiteHeader isLoggedIn={Boolean(user)} />
          {children}
        </CartProvider>
        <SocialLinks />
      </body>
    </html>
  );
}
