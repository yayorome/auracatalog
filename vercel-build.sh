#!/usr/bin/env bash
# Vercel has no Flutter buildpack, so this clones the stable SDK at build
# time (Vercel's build image is ephemeral per-deploy, so there's no local
# cache to reuse) and runs a release web build. SUPABASE_URL and
# SUPABASE_PUBLISHABLE_KEY must be set as Vercel project env vars -- see the
# "Mercado Pago setup" style note in CLAUDE.md for why real values never
# belong in this file or in git.
set -euo pipefail

git clone https://github.com/flutter/flutter.git -b stable --depth 1 "$HOME/flutter"
export PATH="$PATH:$HOME/flutter/bin"

flutter doctor
flutter pub get
flutter build web --release \
  --dart-define=SUPABASE_URL="$SUPABASE_URL" \
  --dart-define=SUPABASE_PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY"
