# Aura Research Fragrance — Catalog

A public, login-free catalog landing page for browsing a perfume catalog — built with Next.js (App Router) and Supabase.

Repository: [github.com/yayorome/auracatalog](https://github.com/yayorome/auracatalog). This is a from-scratch Next.js rewrite of a prior Flutter app (same Supabase backend); it lives in its own repo rather than the old Flutter one.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local` (see `.env.example`) — these are read server-side only, never exposed to the browser.

## Commands

```bash
npm run dev      # start the dev server (Turbopack)
npm run build    # production build
npm run start    # run the production build locally
npm run lint     # eslint
```

See `CLAUDE.md` for architecture notes and the Supabase schema this app reads from.
