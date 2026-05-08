#!/usr/bin/env bash
# Scoped E2E runner — runs a subset of Playwright specs matching E2E_SCOPE.
# Designed to run against a live stack (local or Docker).
#
# Usage:
#   E2E_SCOPE=bootstrap PLAYWRIGHT_WORKERS=4 scripts/e2e/run-scoped.sh
#   E2E_SCOPE=login ./scripts/e2e/run-scoped.sh
#
# E2E_SCOPE values (grep pattern against spec filenames):
#   bootstrap      -> bootstrap.spec.ts
#   login          -> login-smoke.spec.ts
#   approval       -> approval-flow.spec.ts
#   workflow       -> workflow.spec.ts
#   <any pattern>  -> passed directly to --grep-file / --grep
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

: "${E2E_SCOPE:=bootstrap}"
: "${PLAYWRIGHT_WORKERS:=4}"
: "${PLAYWRIGHT_BASE_URL:=http://localhost:5173}"
: "${API_BASE_URL:=http://localhost:3000/api/v1}"
: "${E2E_ADMIN_USER:=admin}"
: "${E2E_ADMIN_PASS:=ChangeMe123!}"
: "${E2E_TIMEOUT:=60}"

# Map logical scope names to glob patterns
case "$E2E_SCOPE" in
  bootstrap)        SPEC_GLOB="**/bootstrap.spec.ts" ;;
  login)            SPEC_GLOB="**/login-smoke.spec.ts" ;;
  approval)         SPEC_GLOB="**/approval-flow.spec.ts" ;;
  workflow)         SPEC_GLOB="**/workflow.spec.ts" ;;
  permissions)      SPEC_GLOB="**/permissions-flow.spec.ts" ;;
  *)                SPEC_GLOB="**/${E2E_SCOPE}*.spec.ts" ;;
esac

echo "==> Running scoped E2E: scope=$E2E_SCOPE  glob=$SPEC_GLOB  workers=$PLAYWRIGHT_WORKERS"

cd "$REPO_ROOT/client"
PLAYWRIGHT_WORKERS="$PLAYWRIGHT_WORKERS" \
  PLAYWRIGHT_BASE_URL="$PLAYWRIGHT_BASE_URL" \
  API_BASE_URL="$API_BASE_URL" \
  E2E_ADMIN_USER="$E2E_ADMIN_USER" \
  E2E_ADMIN_PASS="$E2E_ADMIN_PASS" \
  npx playwright test \
    --workers="$PLAYWRIGHT_WORKERS" \
    --timeout="${E2E_TIMEOUT}000" \
    "$SPEC_GLOB" \
    "$@"

echo "==> Scoped E2E complete (scope=$E2E_SCOPE)"
