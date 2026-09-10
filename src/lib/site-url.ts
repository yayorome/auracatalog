// NEXT_PUBLIC_SITE_URL pins the stable production domain when set,
// VERCEL_URL covers preview deploys, and localhost is the local-dev
// fallback. Used anywhere an absolute URL back to this app is needed
// (password recovery emails, checkout redirect URLs, robots.txt/sitemap).
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
