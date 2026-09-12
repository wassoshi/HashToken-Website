#!/bin/sh
set -eu

mkdir -p backups
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
docker compose exec -T db pg_dump \
  --username hashtoken \
  --dbname hashtoken \
  --format=custom \
  --no-owner \
  --no-privileges > "backups/hashtoken-${timestamp}.dump"

echo "Database backup written to backups/hashtoken-${timestamp}.dump"
