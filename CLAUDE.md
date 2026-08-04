# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product overview

**Aura Research Fragrance** — a mobile/web app for selling perfumes. Core capabilities:

- **Product catalog** with photo uploads per product (stored in Supabase Storage)
- **Online sales**: seller builds a cart, generates a **sales ticket** once a sale completes, or a **budget/quote** for cart contents before the sale is finalized — both can be sent to a client via email or WhatsApp
- **Inventory management**: photo uploads, and each completed sale automatically decrements the corresponding item's stock
- **User management** and **login/auth**, with two roles: **Owner** (full access) and **Seller** (catalog + sales only)
- **Sales reports**

Full phased implementation plan lives at `/Users/yairromero/.claude/plans/structured-imagining-mist.md`.

## Tech stack

- **Flutter** (iOS + Android + Web) — client application
- **Riverpod** (`flutter_riverpod`, no code generation — see "Riverpod" below) for state management
- **go_router** for navigation
- **Supabase** — Postgres database, Storage (product photos, generated PDFs), and Auth. Connected via the `supabase` MCP server (`.mcp.json`, project ref `eumvtvjnutxoxazaptcr`)
- **Mercado Pago** (Checkout Pro, via Supabase Edge Functions) for payments
- **Vercel** — Flutter Web build deployment target
- **Stitch MCP** — design source of truth, project "Auraresearchp Fragrance App" (id `17428257875776255847`), design system "Aura Essence" — tokens translated by hand into `lib/app/theme/`

## Commands

```bash
flutter pub get                                    # install deps
flutter analyze                                     # static analysis (must be clean)
flutter test                                         # run all tests
flutter test test/widget_test.dart                   # run a single test file
dart run build_runner build --delete-conflicting-outputs   # regenerate freezed/json_serializable code after editing an annotated model
flutter run -d chrome --web-port=8765                 # run on web
flutter run -d macos                                   # run desktop (if macos platform added)
flutter build web                                       # production web build (for Vercel)
```

Supabase and Stitch operations go through their MCP tools (`mcp__supabase__*`, `mcp__stitch__*`), not the CLI — e.g. `list_tables`/`apply_migration`/`get_advisors` for schema work, `get_screen`/`generate_screen_from_text` for design.

**Local run requires Supabase credentials** via dart-define (never commit real values):
```bash
flutter run -d chrome --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_PUBLISHABLE_KEY=...
```
Without these, `SupabaseEnv.isConfigured` is false and `main.dart` skips `Supabase.initialize` (the app still boots, but any Supabase-backed feature will fail).

## Architecture

Feature-first under `lib/`:
- `app/theme/` — Aura Essence design tokens (`aura_essence_tokens.dart`) and the `ThemeData` built from them (`aura_essence_theme.dart`). Stitch doesn't export Flutter code, so this mapping is maintained by hand — update it if the Stitch design system changes.
- `app/router/` — `route_paths.dart` (all route strings as constants — never hardcode a path elsewhere) and `app_router.dart` (the single global `GoRouter`). Convention: `context.go` replaces the stack, `context.push` stacks on top (see the `flutter-navigation-go-router` skill in `.agents/skills/`).
- `core/supabase/` — `supabase_env.dart` (dart-define config) and `supabase_client_provider.dart` (the single Riverpod `Provider<SupabaseClient>` every repository depends on).
- `core/widgets/bento_tile.dart` — the shared glassmorphism tile that's the primary layout unit of the Aura Essence design system; reuse it rather than building bespoke containers.
- `features/{auth,catalog,inventory,cart,sales,quotes,payments,reports,users}/` — each split into `data/` (Supabase repository), `domain/` (models + providers), `presentation/` (screens/widgets).

### Riverpod

**No `riverpod_generator`** — `riverpod_generator`/`riverpod_annotation` are deliberately not dependencies. At the current resolved package versions, `riverpod_generator`'s analyzer requirement conflicts with `supabase_flutter`'s `realtime_client` → `web_socket_channel` requirement (no version of `riverpod_generator` satisfies both — see the pub resolver's own conflict trace if you try to re-add it). Use plain `Provider`/`NotifierProvider`/`AsyncNotifierProvider` construction instead (see `core/supabase/supabase_client_provider.dart` for the pattern). Re-attempt code generation only if this upstream conflict has since been resolved.

### Stock decrement (security-sensitive — see the plan's "Supabase schema" section before touching this)

Stock changes on a sale must go through the `mark_sale_paid` Postgres RPC (`SECURITY DEFINER`), which does a single row-locked, conditional `UPDATE ... WHERE stock_quantity >= qty` per line item — verified atomic via direct RPC testing (a forced insufficient-stock case left `stock_quantity` untouched, confirming the whole function rolls back on exception). Never implement a separate "check stock, then decrement" path client-side — that reintroduces a race condition between concurrent sales of the same item. `sale_items.unit_price`/`product_name_snapshot`/`line_total` are likewise never trusted from the client — the `sale_items_set_pricing` trigger overwrites them from the current `products` row, and `mark_sale_paid` recomputes `sales.total` from the line items rather than whatever the client sent at insert time. `payments`/`sales.status` transitions must never be client-writable directly — only through this RPC or a service-role Edge Function (Mercado Pago webhook, Phase 4).

If `mark_sale_paid` throws (e.g. `insufficient_stock`), the `sales` row it was called on is left in `pending_payment` rather than being cleaned up — there's no cancel/retry path yet. `SalesRepository.completeCashSale` surfaces the exception to the UI; add a cancellation RPC before this matters for real usage volume.

### Supabase RLS pattern

Role checks in RLS policies must go through the `public.is_owner()` `SECURITY DEFINER` function, never a raw `exists (select 1 from profiles where ...)` inline in the policy — a policy on `profiles` that subqueries `profiles` directly re-triggers itself and Postgres returns "infinite recursion detected" (surfaces as an opaque PostgREST 500, found and fixed during Phase 1). `is_owner()`'s subquery runs as the function owner and bypasses RLS, breaking the cycle. Reuse it for every Owner-only policy on new tables.

### Product photos

`product_images` supports a multi-photo gallery (`position` column) but the Phase 2 form only sets one (`InventoryRepository.replacePrimaryPhoto` deletes any existing image row + Storage object before inserting the new one at position 0). Extend to a real gallery by adding more images at increasing `position` values instead of replacing, and updating `CatalogRepository`/the detail screen to render more than the first one.

### Mercado Pago setup (required before online payments work)

The integration is fully built (`payments` table, `create-payment-preference` + `mercadopago-webhook` Edge Functions, "Pay online" button, Realtime payment-status screen) but **`MERCADOPAGO_ACCESS_TOKEN` is not yet configured** — there's no Mercado Pago developer account for this project yet. Until it is, `create-payment-preference` returns a clean 500 (`MERCADOPAGO_ACCESS_TOKEN is not configured`) rather than crashing; verified via direct HTTP calls to the deployed function. To activate:

1. Create a Mercado Pago developer account (Mexico marketplace, MLM/MXN) at https://www.mercadopago.com.mx/developers, and get a test (sandbox) Access Token from a test application.
2. Set it as an Edge Function secret yourself — never paste API keys/tokens into chat with an AI assistant, including this one: `supabase secrets set MERCADOPAGO_ACCESS_TOKEN=... --project-ref eumvtvjnutxoxazaptcr` (Supabase CLI) or via the Dashboard → Edge Functions → Secrets. No code change needed after that; both functions read it from `Deno.env`.
3. Test with Mercado Pago's sandbox test cards before ever pointing this at a production access token.
4. `mark_sale_paid`'s authorization check allows `seller_id = auth.uid() or is_owner() or auth.role() = 'service_role'` — the last clause exists specifically so the webhook's service-role call (no user JWT) can call it; verified via direct RPC testing with a simulated `service_role` JWT claim.
5. **Mobile is not wired up yet** — `AppReturnUrl.current()` returns a placeholder `auraresearch://` scheme on non-web platforms with no registered handler. Before testing payments on iOS/Android, add Associated Domains (iOS) / App Links (Android) so Mercado Pago's redirect can actually resume the app after checkout.

### Edge Functions called from the browser need CORS headers

Any Edge Function invoked via `supabase.functions.invoke(...)` from Flutter Web (`create-payment-preference`, `send-document-email` — anything client-facing, as opposed to `mercadopago-webhook`, which only Mercado Pago's servers call) must set `Access-Control-Allow-Origin`/`Access-Control-Allow-Headers` and handle the `OPTIONS` preflight request, or the browser rejects the response before Dart ever sees it (`ClientException: Failed to fetch`) — found during Phase 5 testing. **`curl` will not catch this**: curl doesn't enforce CORS, so a function can look completely fine in direct HTTP testing and still be unusable from the actual app. Always do at least one real browser-triggered call to a new client-facing Edge Function, not just a curl check, before considering it done. Both existing client-facing functions already have the `corsHeaders` pattern — copy it for any new one.

### go_router: use `ref.read(goRouterProvider)`, not `context.push`/`context.pop`, after an async gap

Calling `context.push(...)`/`context.pop()` from an async method — e.g. after `await someRepository.createThing()` followed by a Riverpod state mutation like `ref.read(cartProvider.notifier).clear()` — silently failed to navigate in this app (found during Phase 5: `_saveAsQuote` cleared the cart and created the quote correctly server-side, but the UI just sat on the now-empty cart screen with no error). Root cause wasn't fully isolated, but `ref.read(goRouterProvider).push(...)`/`.pop()` (the `Provider<GoRouter>` from `app/router/app_router.dart`, not the `BuildContext` extension) fixed it reliably and is now the pattern used throughout `cart_screen.dart`. Use `ref.read(goRouterProvider)` for any navigation that happens after an `await` + state mutation in an event handler; plain `context.push`/`context.go` from a synchronous `onPressed` (no prior `await`) is fine as-is (e.g. `PaymentStatusScreen`'s "Back to catalog" button).

### Reports RPCs are `security invoker`, not `security definer`

`report_sales_summary`/`report_sales_daily`/`report_top_products` (migration `0010_reports_rpc`) deliberately omit `security definer` so they inherit the caller's RLS instead of bypassing it — an Owner sees store-wide totals via `sales_select_own_or_owner`/`sale_items_select_own_or_owner`, and if a Seller ever called them directly they'd just get their own scoped totals (the same data they can already query from `sales` directly, not a new privilege). The Reports/Users nav entries in `CatalogScreen`'s AppBar are gated on `user.isOwner`, same pattern as `productNew`/`productEdit` — not redirect-gated at the router level, since the underlying data is already RLS-safe either way.

### Verifying Owner-only UI live requires the Owner's actual password — don't reset it or flip roles to get there

There's no seeded Owner password on file, and two different ways of getting an authenticated browser session into the Owner view during Phase 6 verification were both correctly blocked by the permission-classifier: directly resetting `auth.users.encrypted_password` via SQL, and flipping a test Seller's `profiles.role` to `'owner'` via SQL. Both are credential/authorization mutations on a live (if just a dev) project, not schema/test-data work, so don't attempt either as a verification shortcut — ask the user to log in as Owner themselves if a live Owner-view screenshot is needed. Backend correctness for Owner-only logic (RPC results, RLS scoping, `promote_user`'s self-escalation rejection) is still fully verifiable without this, via the JWT-claim-simulation SQL pattern (`select set_config('request.jwt.claim.sub', '<uuid>', true)` etc., one `execute_sql` call per step) — that's what Phase 6's reports/users backend was actually verified with.

### Vercel deployment: `vercel-build.sh` clones the Flutter SDK at build time

Vercel has no native Flutter buildpack, so `vercel.json` runs `vercel-build.sh`, which clones `flutter/flutter` (stable, depth 1) into the build container, then runs `flutter build web --release` with `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` from `--dart-define`. Before deploying, set both as Vercel project environment variables (Project Settings → Environment Variables) — never hardcode them in `vercel.json` or `vercel-build.sh`. `outputDirectory` is `build/web`; `framework` is `null` since Vercel's framework auto-detection doesn't recognize Flutter. Verified locally: `flutter build web --release` with the same dart-defines produces a working `build/web` (confirmed by serving it with a plain static file server and driving it in a browser — this is a meaningfully different check from `flutter run -d chrome`'s dev-mode server, since it catches CanvasKit/asset-path issues dev mode can mask). The app uses go_router's default hash-based URL strategy (`#/catalog`, `#/cart`, etc.), so no Vercel rewrite rule is needed for client-side routes — every path resolves to the same static `index.html` and the hash fragment never reaches the server.

### Responsive desktop breakpoint (`core/widgets/responsive_page.dart`)

Every screen used a hardcoded `EdgeInsets.all(AuraSpacing.marginMobile)` regardless of viewport width — fine on phones, cramped and edge-to-edge on desktop web. `auraPagePadding(context)` swaps to `AuraSpacing.marginDesktop` horizontal padding above `auraDesktopBreakpoint` (900px) and is passed as the scrollable's own `padding:` (not a wrapping `Padding`) so it stays scroll-aware, same as before. `ResponsivePage` separately centers and caps body width (`Center` + `ConstrainedBox`) so bento tiles/lists don't stretch edge-to-edge on ultrawide screens — wrap the `Scaffold.body`'s content in it per-screen (`maxWidth` varies: 1400 for the catalog grid, 1120 default for list-style pages, 720 for single-card detail/form pages, 640 for the cart). `LoginScreen` and `PaymentStatusScreen` were left alone — both already self-constrain via a `Center` + fixed-width `BentoTile`/`ConstrainedBox`, so there was nothing to fix.

### iOS Simulator: "Unable to find a destination matching the provided destination specifier" for every simulator

`flutter run -d <ios-simulator>` failed outright — not for the specific device picked, but `xcodebuild -showdestinations` couldn't enumerate *any* iOS Simulator destination for the `Runner` scheme, even though `xcrun simctl`/`xcrun xctrace list devices`/`flutter doctor` all correctly saw the booted simulator. Restarting the simulator, restarting `CoreSimulatorService`, and clearing `~/Library/Developer/Xcode/DerivedData` didn't fix it — ruled out project misconfiguration. The actual cause was in Xcode's own error text: it expected **iOS 26.5** while only the **iOS 26.3** simulator runtime was installed on this machine (an Xcode 26.6 vs. installed-platform mismatch after an Xcode update). Fixed with `xcodebuild -downloadPlatform iOS` (an ~8.5GB download) — after that, `-showdestinations` immediately listed every simulator correctly. If this recurs after a future Xcode update, check `xcrun simctl list runtimes` against what Xcode's own error message expects before assuming it's a project/Flutter problem.

## Workflow notes

- Flutter convention skills are installed at `.agents/skills/flutter-riverpod-expert` and `.agents/skills/flutter-navigation-go-router` (via `find-skills`/`npx skills`) — follow their patterns for new providers/routes.
- Use the `supabase` MCP tools for schema/database work (check `list_tables` before making schema changes; apply changes via `apply_migration`; run `get_advisors` after every schema change).
- Use the `stitch` MCP tools (`get_screen`, `generate_screen_from_text`, `edit_screens`) against the existing "Aura Essence" design system when a feature needs a screen not yet designed, rather than hand-designing UI from scratch.
