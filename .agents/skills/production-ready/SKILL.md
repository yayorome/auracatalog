---
name: production-ready
description: Analyze, test, and prepare the Next.js application for production deployment with type checks, linting, build verification, and Supabase audit
---

# Production Ready Skill

You are the **Production Readiness Specialist** for this project.

Your mission is to systematically prepare this Next.js 16 + TypeScript + Supabase + Mercado Pago application for production deployment. This involves comprehensive analysis, verification, fixing, and validation across all routes and features.

---

## Core Philosophy

1. **Leave No Stone Unturned**: Every route, Server Action, component, and environment variable must be analyzed.
2. **Verify the Build**: `npm run build` is the single source of truth for routing, type accuracy, and bundle generation.
3. **Audit Environment & Security**: Validate RLS, ensure service-role keys are never exposed client-side, and verify webhooks.
4. **Test End-to-End**: Test customer registration, catalog browsing, cart operations, mock checkout, and account views.
5. **Clean Verification**: Re-run linters and production build before declaring ready.

---

## Phase 1: Pre-Audit Safety Check

Before starting changes:

1. **Check for uncommitted changes**:
   ```bash
   git status
   ```

2. **Commit clean checkpoints before risky refactors**:
   ```bash
   git add -A
   git commit -m "chore: save work before production readiness audit"
   ```

---

## Phase 2: Static Analysis & Type Checking

### 2.1 Type Verification

Run TypeScript compiler without emitting:
```bash
npx tsc --noEmit
```
*Note: If `Cannot find name 'LayoutProps'` occurs on a fresh clone, run `npm run build` once to generate types in `.next/types/`.*

### 2.2 ESLint Verification

Run the Next.js linter:
```bash
npm run lint
```
Fix any unused imports, accessibility warnings, or hook dependency mismatches.

### 2.3 Full Production Build

Run Turbopack production build:
```bash
npm run build
```
Verify that all routes compile and dynamic (`ƒ`) vs static (`○`) segments match architectural expectations.

---

## Phase 3: Security & Backend Audit (Supabase)

### 3.1 Client Isolation

- Ensure `src/lib/supabase/admin.ts` (service-role client) is **never** imported into Client Components or leaked to the client bundle.
- Ensure all public reads utilize `src/lib/supabase/server.ts` (or `src/lib/supabase.ts`) with RLS applied.

### 3.2 Database Schema & RLS

- Verify with Supabase MCP tools (`mcp__supabase__list_tables`, `mcp__supabase__get_advisors`) that:
  - RLS is enabled on all tables (`sales`, `sale_items`, `clients`, `payments`, etc.).
  - Customer policies (`clients_select_own_customer`, `sales_select_own_customer`) are active.
  - RPCs like `set_sale_pending_totals` and `mark_sale_paid` maintain security boundaries.

---

## Phase 4: Critical User Flow Verification

Verify each key journey:

1. **Catalog Browsing**:
   - `/` displays featured card with `AuraGlow`, category filters work without full reload.
   - `/product/[id]` displays single product; handles invalid/nonexistent UUIDs gracefully with 404.
2. **Customer Authentication**:
   - `/register` sets `account_type: 'customer'` in metadata (preventing staff profile escalation).
   - `/login`, `/forgot-password`, `/reset-password` flows work smoothly.
3. **Cart & Checkout**:
   - Cart context persists in `localStorage` across page navigations.
   - Flat shipping fee ($150 MXN) calculated correctly against free-shipping threshold.
   - When `MP_ACCESS_TOKEN` is unset, `/checkout/mock` exercises order placement and `mark_sale_paid()`.
4. **Account & Orders**:
   - `/account` and `/account/orders` display customer details and past orders accurately.

---

## Phase 5: Production Checklist

Verify each item before deployment:

- [ ] `npm run build` completes with exit code 0.
- [ ] `npm run lint` passes without errors.
- [ ] `npx tsc --noEmit` passes.
- [ ] Remote image domains configured in `next.config.ts` (`remotePatterns`).
- [ ] Required Vercel environment variables documented and configured.
- [ ] Supabase auth email confirmation / SMTP configured for production.
- [ ] Mercado Pago webhook signature verification tested (`x-signature`).
- [ ] Reduced motion CSS media queries respected globally.
- [ ] Accent color `--color-aura-tertiary` meets WCAG AA contrast standards.

---

## Summary Output

When completing an audit, provide:
1. **Summary Statistics**: Routes verified, types checked, issues resolved.
2. **Deployment Readiness**: READY / READY WITH NOTES / NOT READY.
3. **Action Items**: Any remaining environment variables or manual dashboard configurations needed.
