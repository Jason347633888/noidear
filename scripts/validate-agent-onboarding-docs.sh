#!/usr/bin/env bash
set -euo pipefail

ROOT='/Users/jiashenglin/Desktop/好玩的项目/noidear'
AGENTS_FILE="$ROOT/AGENTS.md"
GUIDE_FILE="$ROOT/docs/AGENT_GUIDE.md"
MODEL_FILE="$ROOT/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md"

check_contains() {
  local file="$1"
  local pattern="$2"
  if ! rg -q "$pattern" "$file"; then
    echo "[FAIL] Missing pattern '$pattern' in $file"
    exit 1
  fi
}

check_exists() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "[FAIL] Missing file: $file"
    exit 1
  fi
}

check_exists "$AGENTS_FILE"
check_exists "$GUIDE_FILE"
check_exists "$MODEL_FILE"

check_contains "$AGENTS_FILE" 'Mandatory Reading Order'
check_contains "$AGENTS_FILE" 'docs/AGENT_GUIDE.md'
check_contains "$AGENTS_FILE" 'MASTER_DATA_AND_TRACEABILITY_MODEL.md'

check_contains "$GUIDE_FILE" '## 1\. 文档优先级'
check_contains "$GUIDE_FILE" '## 2\. Mandatory Reading'
check_contains "$GUIDE_FILE" '## 3\. Task Triggers'
check_contains "$GUIDE_FILE" '## 4\. Behavior Constraints'
check_contains "$GUIDE_FILE" '## 5\. Conflict Handling'
check_contains "$GUIDE_FILE" 'MaterialLot\(MaterialBatch\) <-> IngredientUsage\(BatchMaterialUsage\) <-> ProductionBatch'
check_contains "$GUIDE_FILE" '## 7\. MCP / API / 运行操作'

check_contains "$MODEL_FILE" '283 张源表单'
check_contains "$MODEL_FILE" 'MaterialLot / 物料批次'
check_contains "$MODEL_FILE" 'IngredientUsage / 投料记录'

echo '[PASS] Agent onboarding docs validation succeeded.'
