@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product overview

**Aura Research Parfums** — an online store for a perfume catalog. Visitors browse the catalog without an account; buying requires a customer account (email + password via Supabase Auth), which is linked 1:1 to the pre-existing `clients` table. Logged-in customers have a cart, checkout via Clip Checkout (hosted payment link), and an order-history view under `/account`.

- **Product catalog**: a public, read-only list of active products (photos served from Supabase Storage), filterable by category, with a featured "best seller" card and per-product detail pages.
- **Accounts/cart/checkout/orders**: added on top of the original read-only catalog — see "Customer accounts, cart, and Clip checkout" below for the architecture.

This app was originally built in Flutter (web/mobile) and was rewritten from scratch as this Next.js app for better SEO and load performance on a page that's 95% static browsing — Flutter Web ships the whole Dart runtime just to render a product grid, which is a poor fit for a public, crawlable landing page. The Flutter app and its `pubspec.yaml`/`lib/`/`ios/`/`android/` are gone from this repo (removed, not archived) — see git history before this rewrite if you need to reference the old implementation. The Supabase backend is unchanged from that app's fuller feature set except for the additive changes described below (see "Backend still has unused staff-only schema").

## Tech stack

- **Next.js 16** (App Router, Turbopack, React 19), TypeScript
- **Tailwind CSS v4** — theme tokens defined as CSS custom properties in `src/app/globals.css` (`@theme inline` block), not a `tailwind.config.js`
- **Supabase** — Postgres + Storage + Auth. Server Components/Actions read with the anon key via a cookie-bound `@supabase/ssr` client (`src/lib/supabase/server.ts`) so RLS applies as the logged-in customer; the checkout Server Action and the Clip webhook route use a service-role client (`src/lib/supabase/admin.ts`) that bypasses RLS entirely — never import that one into anything reachable from a Client Component. Connected via the `supabase` MCP server (`.mcp.json`, project ref `eumvtvjnutxoxazaptcr`) for schema/database work.
- **Clip Checkout** — hosted payment link API (`src/lib/clip.ts`). See "Customer accounts, cart, and Clip checkout" below.
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

**Local run requires Supabase + Clip credentials** in `.env.local` (never commit real values — `.env*` is gitignored):
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...          # same project, exposed for browser auth (@supabase/ssr)
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...         # Settings > API > service_role — never NEXT_PUBLIC_
CLIP_API_KEY=...                      # base64("api_key:secret_key"); leave unset to use /checkout/mock locally
RESEND_API_KEY=...                    # resend.com; leave unset to skip the paid-order receipt email (logs instead)
RESEND_FROM_EMAIL=...                 # must be on a domain verified in the Resend dashboard
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
`src/lib/supabase.ts` (the original server-only, non-`NEXT_PUBLIC_` client) still exists and is still what the catalog pages use for anonymous reads — the `NEXT_PUBLIC_` vars above are additive, only for the new auth-aware code paths under `src/lib/supabase/`. Set all of these as Vercel project environment variables before deploying — including `SUPABASE_SERVICE_ROLE_KEY`, `CLIP_API_KEY`, and `RESEND_API_KEY`/`RESEND_FROM_EMAIL`, or checkout/webhooks/receipt emails will fail in production.

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
- `src/lib/supabase/{browser,server,admin,env}.ts` — the three Supabase client flavors used by the accounts/cart/checkout code (see below); `src/lib/supabase.ts` (no subfolder) is the original anon-only server client and is unrelated/unchanged.
- `src/lib/cart-context.tsx` — client-side cart (`localStorage`, no login required to browse/add), mounted as `<CartProvider>` in `layout.tsx`.
- `src/lib/{auth-actions,checkout-actions,account-actions,mock-checkout-actions}.ts` + `src/lib/checkout-fulfillment.ts` + `src/lib/clip.ts` — Server Actions and the Clip API client backing register/login, checkout, account editing, and payment fulfillment.
- `middleware.ts` — refreshes the Supabase auth cookie on every request; required for cookie-bound Server Components to see a valid session.

### Customer accounts, cart, and Clip checkout

Customer auth, cart, checkout, and order history were added on top of the original read-only catalog. Key points if you're touching this code:

- **`clients.user_id`** links a `auth.users` row to a `clients` row 1:1. The `handle_new_user()` trigger on `auth.users` (bound as `on_auth_user_created` — it previously existed as a function but was **not actually wired to a trigger**, a pre-existing bug fixed alongside this feature) branches on `raw_user_meta_data->>'account_type'`: `'customer'` creates a `clients` row instead of the staff-only `profiles` row. `src/lib/auth-actions.ts`'s `registerAction` passes that metadata — never call `supabase.auth.signUp()` for a customer without it, or the trigger will create a `profiles`/`'seller'` row instead (real privilege escalation, not hypothetical — see git history for this feature).
- **Email confirmation is on by default** for this Supabase project, so `signUp()` does not return a session — `registerAction` checks `data.session` and shows a "check your email" message instead of redirecting when it's null. Supabase's shared/default email sending is rate-limited and not meant for production; wire up real SMTP (Supabase Auth settings) before relying on this in production.
- **`sales.seller_id` is nullable** (changed from `NOT NULL`) because self-service customer orders have no staff seller — `checkout-actions.ts` always inserts `seller_id: null`.
- **Checkout writes go through the service-role client** (`src/lib/supabase/admin.ts`, bypasses RLS) instead of extending the seller-shaped `sales_insert_own` RLS policy to cover customers. Reads (order history, account page) go through the cookie-bound client and rely on additive RLS policies (`clients_select_own_customer`, `sales_select_own_customer`, etc.) scoped by `clients.user_id = auth.uid()` — every pre-existing owner/seller policy was left untouched.
- **`sale_items_set_pricing`** (pre-existing trigger) fills `unit_price`/`line_total` from the live `product_variants.price` at insert time — the checkout action intentionally omits `unit_price` on insert so this trigger is the source of truth, not client-submitted cart prices. It does *not* check stock at insert; `mark_sale_paid()` (pre-existing RPC, reused as-is) enforces stock at payment-confirmation time and raises if insufficient.
- **Clip integration** (`src/lib/clip.ts`): hosted payment-link API (`POST https://api.payclip.com/v2/checkout`), `Authorization: Basic base64(api_key:secret_key)`. Clip's webhook docs don't document a request-signing scheme, so `src/app/api/webhooks/clip/route.ts` does **not** trust the webhook body's status — it re-fetches the payment request by id from Clip's API and acts on that instead. Re-check Clip's docs for a signature header before relaxing that.
- **`CLIP_API_KEY` unset → `/checkout/mock`**: `checkout-actions.ts` redirects there instead of calling Clip when the key isn't configured, so the full order flow (including `mark_sale_paid`/stock decrement/`inventory_movements`) can be exercised locally before real Clip credentials exist. It 404s once `CLIP_API_KEY` is set — don't remove this branch to "clean up"; it's the only way to test checkout without live credentials.
- **`payments`** columns `mp_preference_id`/`mp_payment_id` (leftover from a removed Mercado Pago integration, commit `d7b23ca`) were renamed to `provider_reference`/`provider_payment_id` — the table had 0 rows, so this was a safe rename rather than adding Clip-specific columns alongside dead MP ones.
- **`sales.subtotal`/`total` are protected columns** — `sales_prevent_protected_update` (pre-existing trigger) rejects any update to them unless `app.allow_sale_status_update` is set, which only `mark_sale_paid()` did before this feature. `checkout-actions.ts` can't set the initial total with a plain `.update()` (found the hard way: it silently no-ops, leaving `total = 0` on every order) — it goes through a new `set_sale_pending_totals(p_sale_id, p_subtotal, p_total)` RPC (`service_role`-only) that sets the config flag first, mirroring `mark_sale_paid()`'s own pattern.
- **`sales.shipping_address` (jsonb)** snapshots the address actually used for that order (name, phone, street, etc.) at checkout time, independent of `clients.*` which can change later — `checkout-form.tsx` lets a customer ship one order to a different address without overwriting their saved profile default; `checkout-actions.ts` only writes to `clients.*` when the customer wasn't using an explicitly-different address (or had no saved address yet).
- **Shipping is a flat $150 MXN, free at $2,500+ subtotal** — `src/lib/shipping.ts`'s `computeShippingCost()` is the single source of truth, used by `cart-view.tsx`/`checkout-form.tsx` (display) and `checkout-actions.ts` (charged amount, sent to Clip as part of `payments.amount`). Persisted on `sales.shipping_cost` — *not* one of `sales_prevent_protected_update`'s guarded columns, so it's set with a plain `.update()` (unlike `subtotal`/`total`, which go through `set_sale_pending_totals`). `mark_sale_paid()` was extended to add `shipping_cost` on top of the (possibly card-commission-adjusted) product subtotal when computing the final paid `total` — it doesn't get a discount from `card_commission_pct` the way the product subtotal does, since that's a pre-existing margin adjustment on product revenue, not something shipping should be discounted against.
- **Paid-order receipt email** (`src/lib/email.ts`, via Resend): `checkout-fulfillment.ts`'s `fulfillClipPayment()` sends it right after `mark_sale_paid()` succeeds — the one place both the real webhook and `/checkout/mock` funnel through. A send failure is caught and logged, never thrown, since the order is already paid and stock already decremented by that point. Requires `clients.email` — `checkout-actions.ts` blocks checkout with a clear error if it's missing (nullable in the schema for staff-added walk-in clients, but always required for a self-service order since there'd be nowhere to send the ticket). Without `RESEND_API_KEY`/`RESEND_FROM_EMAIL` set, it logs a warning instead of sending — same "degrade, don't fail the request" pattern as `/checkout/mock`.

### Data fetching model: classic revalidate, not Cache Components

Next 16 ships an opt-in "Cache Components" model (`cacheComponents: true` in `next.config.ts`) with `"use cache"`/`<Suspense>`-driven prerendering. This project does **not** enable it — `next.config.ts` has no `cacheComponents` flag, so the classic model applies: plain `async` Server Components fetch data directly (no `fetch()` caching by default in this model either, but that's fine at this scale), and `export const revalidate = 30` on `page.tsx` gives the catalog page lightweight ISR. If you ever add `cacheComponents: true`, `export const revalidate` stops working (removed in that mode per the route-segment-config docs) and every async data access needs either `"use cache"` or a `<Suspense>` boundary — don't half-enable it.

Note: `layout.tsx` now calls `supabase.auth.getUser()` (cookie-dependent, to know whether to render the logged-in header) on every request, which makes the whole tree dynamic (`ƒ` in the build output) regardless of `revalidate` — the catalog page's ISR setting no longer produces a cached static shell. This is a deliberate tradeoff for per-request auth state, not a regression to "fix".

### `fetchProduct` must treat a malformed id as not-found, not a crash

A URL like `/product/not-a-uuid` makes Postgres reject the `.eq("id", productId)` filter with `22P02` (`invalid_text_representation`), which `maybeSingle()` surfaces as a PostgREST error rather than an empty result — found by testing a bogus product id in the browser (it crashed with an unhandled Runtime Error before this fix). `fetchProduct` in `src/lib/products.ts` explicitly catches `error.code === "22P02"` and returns `null` (which the page turns into `notFound()`), on top of the normal empty-`data` case for a well-formed but nonexistent uuid. Keep this check if the query changes.

### Backend still has unused staff-only schema — RLS changes so far are all additive

The Supabase schema was never pared down to match a public catalog app: tables like `profiles`, `quotes`, RPCs like `promote_user`/`convert_quote_to_sale`, and the `is_owner()` helper still exist for a staff/seller workflow this Next.js app doesn't expose any UI for. Don't be surprised to find them via `list_tables` — they're not dead/broken, just out of scope. `sales`/`sale_items`/`payments`/`clients`, on the other hand, **are** now used — by the customer-facing checkout/order-history flow (see "Customer accounts, cart, and Clip checkout" above), alongside their original staff-facing role. Every schema/RLS change made for this app so far has been additive (new columns, new policies, or a rename of unused columns) — no pre-existing owner/seller policy has been modified or removed. The `product-photos` Storage bucket is `public = true`, so no Storage policy change was needed for the catalog images.

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
