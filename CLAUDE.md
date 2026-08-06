@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product overview

**Aura Research Parfums** — a public, login-free web landing page for browsing a perfume catalog. There is no cart, checkout, sales, quotes, user accounts, or admin/reporting UI — visitors can only view the list of products and their detail pages.

- **Product catalog**: a public, read-only list of active products (photos served from Supabase Storage), filterable by category, with a featured "best seller" card and per-product detail pages.

This app was originally built in Flutter (web/mobile) and was rewritten from scratch as this Next.js app for better SEO and load performance on a page that's 95% static browsing — Flutter Web ships the whole Dart runtime just to render a product grid, which is a poor fit for a public, crawlable landing page. The Flutter app and its `pubspec.yaml`/`lib/`/`ios/`/`android/` are gone from this repo (removed, not archived) — see git history before this rewrite if you need to reference the old implementation. The Supabase backend is unchanged and still carries schema from that app's fuller feature set (see "Backend still has unused sales/auth schema" below).

## Tech stack

- **Next.js 16** (App Router, Turbopack, React 19), TypeScript
- **Tailwind CSS v4** — theme tokens defined as CSS custom properties in `src/app/globals.css` (`@theme inline` block), not a `tailwind.config.js`
- **Supabase** — Postgres + Storage, read via `@supabase/supabase-js` with the anon/publishable key, server-side only (no client-side Supabase calls; there's no auth or interactivity that needs it). Connected via the `supabase` MCP server (`.mcp.json`, project ref `eumvtvjnutxoxazaptcr`)
- **Vercel** — deployment target, zero-config (Next.js is auto-detected; no `vercel.json` needed)

> **This Next.js version is newer than your training data — read `node_modules/next/dist/docs/` before assuming an API works the way you remember.** In particular: `next/font/google` export names are dynamic (check `node_modules/next/dist/compiled/@next/font/dist/google/index.d.ts` for exact function names/weight options before importing a font); route segment config (`export const revalidate`, etc.) only behaves as in older docs when `cacheComponents` is *not* enabled in `next.config.ts` (this project deliberately doesn't enable it — see "Data fetching model" below).

## Commands

```bash
npm install       # install deps
npm run dev        # dev server (Turbopack), http://localhost:3000
npm run build        # production build — treat as the source of truth over `next dev`/tsc for whether routing/types are correct
npm run start          # serve the production build locally
npm run lint             # eslint
npx tsc --noEmit           # type-check only, faster than a full build during iteration
```

`npx tsc --noEmit` fails with `Cannot find name 'LayoutProps'` (or `PageProps`) on a fresh checkout — those types are generated into `.next/types/` by `next build`/`next dev`, not shipped by the `next` package itself. Run `npm run build` or `npm run dev` once first if you hit this; it's not a real type error.

**Local run requires Supabase credentials** in `.env.local` (never commit real values — `.env*` is gitignored):
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```
These are read server-side only (`src/lib/supabase.ts`) — deliberately *not* `NEXT_PUBLIC_`-prefixed, since no client component ever needs a Supabase client. Set both as Vercel project environment variables before deploying.

## Architecture

- `src/app/page.tsx` — the catalog route (`/`), a Server Component that calls `fetchProducts()` and hands the result to `CatalogView`.
- `src/app/product/[id]/page.tsx` — product detail route (`/product/:id`), fetches one product server-side and calls `notFound()` if it doesn't exist.
- `src/app/not-found.tsx` — branded 404 (used both for a missing product and a malformed id in the URL).
- `src/app/layout.tsx` — loads the two Aura Essence fonts via `next/font/google` (`Libre_Caslon_Text` for headlines, `Hanken_Grotesk` for body) and exposes them as CSS variables consumed by `globals.css`.
- `src/components/catalog-view.tsx` — the only Client Component (`"use client"`) in the app; owns the category-filter `useState` and renders the featured card + grid. Everything else is a Server Component by default.
- `src/components/product-image.tsx` — wraps `next/image` with a fallback SVG placeholder for products with no photo.
- `src/lib/supabase.ts` — the server-only Supabase client singleton.
- `src/lib/products.ts` — `Product` type + `fetchProducts()`/`fetchProduct(id)`, mirroring the old Flutter `CatalogRepository`: joins `product_images`, picks the lowest-`position` image as the primary photo, and builds its public URL as `${SUPABASE_URL}/storage/v1/object/public/product-photos/${storage_path}`.
- `src/lib/format.ts` — price formatting (`Intl.NumberFormat` with `currencyDisplay: "narrowSymbol"` so MXN/USD both render as `$`, matching the old Flutter app's `NumberFormat.simpleCurrency`).

### Data fetching model: classic revalidate, not Cache Components

Next 16 ships an opt-in "Cache Components" model (`cacheComponents: true` in `next.config.ts`) with `"use cache"`/`<Suspense>`-driven prerendering. This project does **not** enable it — `next.config.ts` has no `cacheComponents` flag, so the classic model applies: plain `async` Server Components fetch data directly (no `fetch()` caching by default in this model either, but that's fine at this scale), and `export const revalidate = 30` on `page.tsx` gives the catalog page lightweight ISR. If you ever add `cacheComponents: true`, `export const revalidate` stops working (removed in that mode per the route-segment-config docs) and every async data access needs either `"use cache"` or a `<Suspense>` boundary — don't half-enable it.

### `fetchProduct` must treat a malformed id as not-found, not a crash

A URL like `/product/not-a-uuid` makes Postgres reject the `.eq("id", productId)` filter with `22P02` (`invalid_text_representation`), which `maybeSingle()` surfaces as a PostgREST error rather than an empty result — found by testing a bogus product id in the browser (it crashed with an unhandled Runtime Error before this fix). `fetchProduct` in `src/lib/products.ts` explicitly catches `error.code === "22P02"` and returns `null` (which the page turns into `notFound()`), on top of the normal empty-`data` case for a well-formed but nonexistent uuid. Keep this check if the query changes.

### Backend still has unused sales/auth schema — only one RLS change was made for this app

The Supabase schema was never pared down to match the app: tables like `profiles`, `sales`, `sale_items`, `payments`, `quotes`, RPCs like `mark_sale_paid`/`promote_user`/`convert_quote_to_sale`, and the `is_owner()` helper all still exist, just unreachable from this app. Don't be surprised to find them via `list_tables` — they're not dead/broken, just out of scope. The **one** change made for this app: `products`/`product_images` previously only allowed `SELECT` for the `authenticated` role, which would have made this public page unable to load anything, so an additive `anon`-role `SELECT` policy (`products_select_public`/`product_images_select_public`, scoped to `is_active = true`) was added — every other policy (including all Owner-only writes) was left untouched. The `product-photos` Storage bucket is `public = true`, so no Storage policy change was needed.

### `next/image` remote images need `remotePatterns`

`next.config.ts` allowlists `eumvtvjnutxoxazaptcr.supabase.co/storage/v1/object/public/**` — any new image source (a different Supabase project, a different bucket) needs its own `remotePatterns` entry or `next/image` throws at request time rather than just failing to load.

### Fonts: check the actual export name before importing from `next/font/google`

`Libre_Caslon_Text` and `Hanken_Grotesk` (used in `layout.tsx`) are real exports, but font family names don't always map 1:1 to a `next/font/google` function name (e.g. spaces become underscores, and not every Google Font variant is exported under the name you'd guess). Grep `node_modules/next/dist/compiled/@next/font/dist/google/index.d.ts` for the family name before assuming an import works, and check the declared `weight`/`subsets` options in the same file — some fonts require an explicit `weight` (no default).

### `error.tsx` uses `retry`, not `reset` — check the version history before copying an older example

`src/app/error.tsx` (Client Component, catches thrown errors from `fetchProducts`/`fetchProduct`) uses the `retry` prop. `retry` only became stable in **v16.3.0** (this project's exact version) — `reset` still exists but the docs now say to prefer `retry`. An example copied from an older Next.js version or from memory will likely use `reset`; check `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`'s version history before assuming either name.

### Contrast-safe accent color — don't revert `--color-aura-tertiary` to the Stitch source value

The Stitch-sourced sage accent (`#8a9a8e`) is only ~2.96:1 against white/cream — fails WCAG AA's 4.5:1 for text (found auditing the "DESTACADO" label against the `accessibility` skill's contrast table). `--color-aura-tertiary` in `globals.css` is intentionally darkened to `#5f6f63` (~5.3:1) so it stays usable as text; if a future change needs the lighter original tone, use it only for non-text fills/borders, not text color, or compute contrast again before reusing `#8a9a8e` for a label.

### One signature visual element, not decoration — `AuraGlow` in `catalog-view.tsx`

Per a `frontend-design` skill review, the page had no distinctive moment tied to the actual brand ("Aura" = a halo/glow) — everything read as a generic catalog grid. `AuraGlow` (concentric rings behind the featured/best-seller card only) is the deliberate one-time payoff; it's intentionally **not** reused on grid cards, the detail page, or anywhere else — per the design skill's restraint principle, repeating a "signature" element everywhere turns it back into decoration. If you're tempted to add the glow elsewhere, reconsider whether the page needs a second signature moment instead (usually it doesn't).

### Reduced motion is a blanket rule, not per-component

`globals.css` has a single `@media (prefers-reduced-motion: reduce)` block that zeroes out `animation-duration`/`transition-duration` globally (the pattern from the `accessibility` skill), covering the grid's stagger fade-in (`.animate-fade-in-up`) and the image hover-zoom (`ProductImage`'s `zoomOnHover`) alike. New animations/transitions don't need their own `motion-reduce:` variant — the global rule already catches them — but avoid working around it with `!important` overrides or inline styles that would defeat it.

## Workflow notes

- Use the `supabase` MCP tools for schema/database work (check `list_tables` before making schema changes; apply changes via `apply_migration`; run `get_advisors` after every schema change).
- Before writing any Next.js code, skim the relevant page under `node_modules/next/dist/docs/01-app/` — this version is newer than most training data and the on-disk docs are the authority (see the warning imported at the top of this file via `@AGENTS.md`).
- Design/quality skills installed at `~/.agents/skills/{frontend-design,vercel-react-best-practices,accessibility}` (global, via `npx skills add`) — reread them before a visual redesign, a performance pass, or an accessibility audit rather than re-deriving the guidance from scratch.
