import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Narrowed from Next's defaults to the widths this app actually renders
    // (header logo, grid card, product detail) so next/image generates far
    // fewer distinct Vercel Image Optimization transformation variants per
    // photo — the unnarrowed defaults exhausted the Hobby plan's monthly
    // transformation quota, breaking every product photo in production
    // (https://auraresearchp.com) once new variants got 402'd.
    deviceSizes: [640, 750, 1080, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    // Product photos rarely change; a long TTL avoids re-transformation on
    // cache expiry (STALE) for images whose content hasn't changed. Replace
    // a photo via a new storage_path rather than overwriting in place, since
    // there's no manual cache invalidation.
    minimumCacheTTL: 2678400, // 31 days
    remotePatterns: [
      {
        protocol: "https",
        hostname: "eumvtvjnutxoxazaptcr.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
