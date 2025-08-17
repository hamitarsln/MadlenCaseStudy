#!/bin/sh
set -e

if [ "${SEED_ON_START}" = "true" ]; then
  echo "[entrypoint] Running seed (RESET_DB=${RESET_DB})"
  node seedDatabase.js || echo "[entrypoint] Seed script failed (continuing)"
else
  echo "[entrypoint] Skipping seed (SEED_ON_START!=true)"
fi

exec "$@"
