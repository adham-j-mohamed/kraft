#!/usr/bin/env bash
# Skickar arbetskopian på Macen till aj-lab:~/kraft. Körs från repots rot.
set -euo pipefail
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .env \
  --exclude data \
  --exclude '*.log' \
  ./ aj-lab:~/kraft/
echo "synkat till aj-lab:~/kraft"
