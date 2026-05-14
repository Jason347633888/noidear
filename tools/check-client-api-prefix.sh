#!/usr/bin/env bash
set -euo pipefail

# Block any HTTP client (configured request adapter or raw axios) from prepending
# the `/api/v1/...` prefix in client source. `request` already sets baseURL to
# `/api/v1`, so adding it again produces `/api/v1/api/v1/...`. Raw axios callers
# must either move onto the request adapter or pass an absolute URL via window
# helpers (window.open, file download, etc.) outside of `client/src`.

hit=0

if rg -n "(request|axios)\.(get|post|put|patch|delete|head|options)\(\s*['\"]/api/v1/" client/src; then
  echo "Do not pass /api/v1-prefixed paths to request/axios in client/src." >&2
  hit=1
fi

if rg -n "axios\.create\(\{[^}]*baseURL:\s*['\"]/api/v1" client/src; then
  echo "Do not create extra axios instances with baseURL='/api/v1'; reuse client/src/api/request.ts." >&2
  hit=1
fi

exit $hit
