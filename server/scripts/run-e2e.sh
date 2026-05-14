#!/usr/bin/env bash
# Wrapper for jest e2e suites: skip gracefully when DATABASE_URL is missing so
# that `npm run traceability:verify` and `npm run test:e2e` are usable in
# environments without a live Postgres/MinIO (CI smoke, local agent runs).
#
# When DATABASE_URL is set we forward all arguments to jest using the e2e
# config. The exit code is jest's exit code in that branch.
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[run-e2e.sh] DATABASE_URL not set; skipping e2e suite (set DATABASE_URL + JWT_SECRET + MINIO_* to actually run)." >&2
  exit 0
fi

exec npx jest --config=jest.e2e.config.js "$@" --runInBand
