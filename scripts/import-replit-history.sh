#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ] || [ ! -r "$1" ]; then
  echo "Usage: bash scripts/import-replit-history.sh /root/hashtoken-replit-history.json" >&2
  exit 2
fi

source_file="$1"
expected_count=3353
forward_checkpoint=26005942
history_checkpoint=15500540

# Validate the entire file before taking the application offline.
python3 scripts/prepare-replit-history-import.py "$source_file" \
  --expected-count "$expected_count" \
  --forward-checkpoint "$forward_checkpoint" \
  --history-checkpoint "$history_checkpoint" --check-only

sh scripts/backup-database.sh

restart_app() { docker compose up -d app; }
trap restart_app EXIT
docker compose stop app

python3 scripts/prepare-replit-history-import.py "$source_file" \
  --expected-count "$expected_count" \
  --forward-checkpoint "$forward_checkpoint" \
  --history-checkpoint "$history_checkpoint" \
  | docker compose exec -T db psql -X -v ON_ERROR_STOP=1 -U hashtoken -d hashtoken

restart_app
trap - EXIT
docker compose ps
