#!/usr/bin/env bash
set -euo pipefail

if ! command -v trivy >/dev/null 2>&1; then
  echo "trivy is required. Install from https://aquasecurity.github.io/trivy/" >&2
  exit 2
fi

if [[ "${SKIP_DOCKER_BUILD:-0}" != "1" ]]; then
  docker compose build server client
fi

SERVER_IMAGE_ID="$(docker compose images -q server)"
CLIENT_IMAGE_ID="$(docker compose images -q client)"

if [[ -z "${SERVER_IMAGE_ID}" ]]; then
  echo "server image not found — run docker compose build first or unset SKIP_DOCKER_BUILD" >&2
  exit 1
fi
if [[ -z "${CLIENT_IMAGE_ID}" ]]; then
  echo "client image not found — run docker compose build first or unset SKIP_DOCKER_BUILD" >&2
  exit 1
fi

docker image tag "${SERVER_IMAGE_ID}" noidear-server:audit-local
docker image tag "${CLIENT_IMAGE_ID}" noidear-client:audit-local

mapfile -t THIRD_PARTY_IMAGES < <(
  docker compose config --format json | node -e '
    let input = "";
    process.stdin.on("data", (chunk) => { input += chunk; });
    process.stdin.on("end", () => {
      const config = JSON.parse(input);
      for (const name of ["postgres", "redis", "minio"]) {
        const ref = config.services?.[name]?.image;
        if (!ref) {
          console.error(`missing image ref for service ${name}`);
          process.exit(3);
        }
        console.log(ref);
      }
    });
  '
)
if (( ${#THIRD_PARTY_IMAGES[@]} != 3 )); then
  echo "docker compose config must expose postgres, redis, and minio image refs" >&2
  exit 3
fi

failures=()
for image in noidear-server:audit-local noidear-client:audit-local "${THIRD_PARTY_IMAGES[@]}"; do
  if [[ -z "${image}" || "${image}" == *":latest" || ( "${image}" != *@sha256:* && "${image}" != noidear-* ) ]]; then
    echo "invalid image ref for scan: ${image}" >&2
    failures+=("${image}:invalid-ref")
    continue
  fi
  if ! trivy image --severity HIGH,CRITICAL --exit-code 1 "${image}"; then
    failures+=("${image}")
  fi
done

if (( ${#failures[@]} > 0 )); then
  printf 'Docker image scan failed for:\n' >&2
  printf ' - %s\n' "${failures[@]}" >&2
  exit 1
fi
