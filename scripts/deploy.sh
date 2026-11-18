#!/usr/bin/env bash
# Skickar arbetskopian på Macen till aj-lab:~/kraft. Körs från repots rot.
set -euo pipefail
# Genvägen för hälsosynk signeras på Macen och checkas inte in; bygg den om den saknas.
# Sätt KRAFT_URL till appens publika adress första gången (se scripts/build-shortcut.mjs).
[ -f public/shortcuts/kraft-halsosynk.shortcut ] || node scripts/build-shortcut.mjs
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .env \
  --exclude data \
  --exclude '*.log' \
  ./ aj-lab:~/kraft/
echo "synkat till aj-lab:~/kraft"
