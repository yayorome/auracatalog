import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Account/cart/checkout are per-customer, never worth indexing.
      disallow: ["/account", "/cart", "/checkout", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
