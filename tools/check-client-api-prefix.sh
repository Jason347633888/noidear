#!/usr/bin/env bash
set -euo pipefail

if rg -n "request\.(get|post|put|patch|delete|head|options)\(\s*['\"]/api/v1/" client/src; then
  echo "Do not pass /api/v1-prefixed paths to the configured request client." >&2
  exit 1
fi
