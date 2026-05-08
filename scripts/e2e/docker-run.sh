#!/usr/bin/env bash
# Docker E2E runner — spins up an isolated compose project, runs all E2E tests,
# then tears everything down.  Uses COMPOSE_PROJECT_NAME to guarantee isolation.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

: "${COMPOSE_PROJECT_NAME:=noidear-e2e-$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo local)}"
: "${PLAYWRIGHT_WORKERS:=4}"
: "${E2E_TIMEOUT:=120}"
: "${API_BASE_URL:=http://localhost:3100/api/v1}"
: "${PLAYWRIGHT_BASE_URL:=http://localhost:8080}"
: "${E2E_ADMIN_USER:=admin}"
: "${E2E_ADMIN_PASS:=ChangeMe123!}"

export COMPOSE_PROJECT_NAME

COMPOSE_FILE="$REPO_ROOT/docker-compose.e2e.yml"

cleanup() {
  echo "==> Cleaning up compose project: $COMPOSE_PROJECT_NAME"
  docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT_NAME" down -v --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "==> Starting E2E stack (project: $COMPOSE_PROJECT_NAME)"
docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT_NAME" up -d --build --wait

echo "==> Running Playwright E2E tests (workers=$PLAYWRIGHT_WORKERS)"
cd "$REPO_ROOT/client"
PLAYWRIGHT_WORKERS="$PLAYWRIGHT_WORKERS" \
  API_BASE_URL="$API_BASE_URL" \
  PLAYWRIGHT_BASE_URL="$PLAYWRIGHT_BASE_URL" \
  E2E_ADMIN_USER="$E2E_ADMIN_USER" \
  E2E_ADMIN_PASS="$E2E_ADMIN_PASS" \
  npx playwright test --timeout="${E2E_TIMEOUT}000" "$@"

echo "==> E2E tests complete"
