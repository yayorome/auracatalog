import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Account/cart/checkout are per-customer, never worth indexing, and
      // checkout/mock only exists for local dev (404s once MP_ACCESS_TOKEN is
      // set — see CLAUDE.md — but excluding it here costs nothing either way).
      disallow: ["/account", "/cart", "/checkout", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
