# Agent Onboarding Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the agent onboarding layer so any agent entering `noidear` follows the same document entry flow, task classification rules, and food-safety domain hard gates before changing code or models.

**Architecture:** Keep `AGENTS.md` minimal and routing-only, upgrade `docs/AGENT_GUIDE.md` into the operational protocol center, and keep `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` as the domain truth source. Add a lightweight validation script so the onboarding contract can be checked without reading every document manually.

**Tech Stack:** Markdown documentation, shell validation script, git, ripgrep

---

## File Structure

### Files To Modify

- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md`
  - Replace the current generic agent guide body with a short root-entry document.
  - Keep only project entry purpose, mandatory reading order, and the link to `docs/AGENT_GUIDE.md`.

- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`
  - Turn this into the operational protocol center.
  - Add mandatory reading rules, task trigger rules, behavior constraints, document priority, and conflict handling.
  - Preserve useful MCP quick-start content, but demote it below onboarding protocol.

### Files To Create

- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/scripts/validate-agent-onboarding-docs.sh`
  - A shell script that checks required headings, required links, and required trigger content in the onboarding docs.

### Files To Read During Implementation

- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-agent-onboarding-layer-design.md`
- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md`
- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`

### Testing / Verification Surface

- Run: `bash /Users/jiashenglin/Desktop/好玩的项目/noidear/scripts/validate-agent-onboarding-docs.sh`
- Run: `rg -n "MASTER_DATA_AND_TRACEABILITY_MODEL|Mandatory Reading|Document Priority|Task Triggers|Behavior Constraints" '/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md' '/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md'`
- Run: `git -C '/Users/jiashenglin/Desktop/好玩的项目/noidear' diff -- AGENTS.md docs/AGENT_GUIDE.md scripts/validate-agent-onboarding-docs.sh`

---

### Task 1: Rewrite The Root Entry Document

**Files:**
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md`
- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-agent-onboarding-layer-design.md`

- [ ] **Step 1: Snapshot the current root entry doc**

Run:
```bash
cp '/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md' '/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md.bak-2026-04-24'
```

Expected: backup file created with no terminal output.

- [ ] **Step 2: Write the new minimal `AGENTS.md` content**

Replace the full file with:

```md
# AGENTS

This file is the root entry point for any agent working in `noidear`.

## Mandatory Reading Order

Every agent must read these documents in order before analysis, implementation, schema decisions, or behavior changes:

1. `/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md`
2. `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`

## Food-Safety Hard Gate

If the task involves any of the following, the agent must also read:

`/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`

Trigger topics include:

- food-safety SaaS
- the 283 source forms
- master data
- products, materials, suppliers, customers, employees, locations
- material lots, production batches, finished-goods batches
- traceability, forward trace, backward trace, material balance
- recall, complaint, nonconformance, rework
- warehouse / manufacturing / QA / QC / R&D cross-module linkage
- deciding between `RecordTemplate/Record` and independent business tables

## Root Entry Responsibility

This document must stay short.
It only does three things:

- identify itself as the root entry point
- enforce the reading order
- route agents into `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`

For operating rules, continue in:

`/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`
```

- [ ] **Step 3: Verify the root doc now contains only entry-layer content**

Run:
```bash
sed -n '1,220p' '/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md'
```

Expected: the file is short, routes into `docs/AGENT_GUIDE.md`, and does not contain old quick-start/build/lint sections.

- [ ] **Step 4: Commit the root entry rewrite**

Run:
```bash
git -C '/Users/jiashenglin/Desktop/好玩的项目/noidear' add AGENTS.md
git -C '/Users/jiashenglin/Desktop/好玩的项目/noidear' commit -m 'docs: convert AGENTS to root onboarding entry'
```

Expected: one commit created for `AGENTS.md` only.

---

### Task 2: Upgrade `docs/AGENT_GUIDE.md` Into The Operational Protocol Center

**Files:**
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`
- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-agent-onboarding-layer-design.md`
- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`

- [ ] **Step 1: Preserve a copy of the current guide before rewrite**

Run:
```bash
cp '/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md' '/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md.bak-2026-04-24'
```

Expected: backup file created with no terminal output.

- [ ] **Step 2: Rewrite the top of `docs/AGENT_GUIDE.md` so onboarding protocol comes before MCP usage**

Replace the top section of the file with this structure and wording, then keep the existing MCP quick-start content below it:

```md
# Agent 操作指南

> 本文档是 `noidear` 的 agent 操作协议中心。所有 agent 在进入实现、改 schema、改接口、改行为前，必须先读完本文件要求的前置文档和硬规则。

## 1. 文档优先级

1. `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单`
2. `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
3. `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思`
4. `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma`

## 2. Mandatory Reading

所有 agent 必须先读：

1. `/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md`
2. `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`

如果任务涉及食品安全、283 张表单、主数据、批次、追溯、召回、仓储/制造/品质跨模块关系，必须继续读：

3. `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`

## 3. Task Triggers

命中以下任一条件，视为食品安全领域任务：

- 食品安全 SaaS
- 表单 / 记录表单 / 模板 / 283 张源表单
- 产品 / 物料 / 供应商 / 客户 / 员工 / 位置
- 物料批次 / 生产批次 / 成品批次
- 正追 / 反追 / 物料平衡 / 召回 / 投诉 / 不合格 / 返工
- 决定 `RecordTemplate/Record` 和独立业务表如何取舍

## 4. Behavior Constraints

### 4.1 先判断对象类型

先判断当前任务处理的是：主数据、批次数据、桥接关系、过程/检验记录、治理记录、还是通用动态表单。

### 4.2 不得复制主数据

系统已有统一语义的 `Product`、`Material`、`Supplier`、`Employee`、`Location` 不能在下游模块再创建平行事实源。

### 4.3 批次问题必须回到主链

涉及投料、来料、放行、留样、发货、投诉、召回、正追、反追、物料平衡时，必须从以下链路出发：

`MaterialLot(MaterialBatch) <-> IngredientUsage(BatchMaterialUsage) <-> ProductionBatch`

### 4.4 表单不自动等于独立表

任何表单落表前，先判断它是核心业务对象、桥接记录、治理记录，还是动态表单表现层。

### 4.5 业务名和代码名分开用

讨论业务关系时使用业务标准名，例如 `MaterialLot`、`IngredientUsage`；查看代码和 schema 时使用实现名，例如 `MaterialBatch`、`BatchMaterialUsage`。

## 5. Conflict Handling

发现冲突时必须：

1. 说明冲突发生在哪两个层级之间
2. 区分命名差异还是语义差异
3. 命名差异保留双口径说明
4. 语义差异按高优先级文档处理
5. 会影响实现边界时，必须写进当前 spec 或 plan

## 6. Continue To Operational Tools

完成上述阅读和判断后，再使用下方 MCP、API、测试与运行说明。
```

- [ ] **Step 3: Append the existing operational quick-start below the new protocol sections**

Keep and reflow the existing content under a new heading:

```md
## 7. MCP / API / 运行操作
```

The preserved sections should include, after that heading:

- 快速开始
- 常用操作最短路径
- 系统账号说明
- 工具完整列表
- oh-my-opencode 使用说明
- ultrawork 使用提示
- 已知限制

- [ ] **Step 4: Verify the new guide has all required protocol headings**

Run:
```bash
rg -n "## 1\. 文档优先级|## 2\. Mandatory Reading|## 3\. Task Triggers|## 4\. Behavior Constraints|## 5\. Conflict Handling|## 6\. Continue To Operational Tools|## 7\. MCP / API / 运行操作" '/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md'
```

Expected: one match for each heading.

- [ ] **Step 5: Commit the operational guide rewrite**

Run:
```bash
git -C '/Users/jiashenglin/Desktop/好玩的项目/noidear' add docs/AGENT_GUIDE.md
git -C '/Users/jiashenglin/Desktop/好玩的项目/noidear' commit -m 'docs: promote agent guide to onboarding protocol center'
```

Expected: one commit created for `docs/AGENT_GUIDE.md` only.

---

### Task 3: Add A Validation Script For The Onboarding Contract

**Files:**
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/scripts/validate-agent-onboarding-docs.sh`
- Test: `/Users/jiashenglin/Desktop/好玩的项目/noidear/scripts/validate-agent-onboarding-docs.sh`

- [ ] **Step 1: Create the validation script**

Write this file exactly:

```bash
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
```

- [ ] **Step 2: Make the script executable**

Run:
```bash
chmod +x '/Users/jiashenglin/Desktop/好玩的项目/noidear/scripts/validate-agent-onboarding-docs.sh'
```

Expected: no terminal output.

- [ ] **Step 3: Run the validation script and verify it passes**

Run:
```bash
bash '/Users/jiashenglin/Desktop/好玩的项目/noidear/scripts/validate-agent-onboarding-docs.sh'
```

Expected:
```text
[PASS] Agent onboarding docs validation succeeded.
```

- [ ] **Step 4: Commit the validation script**

Run:
```bash
git -C '/Users/jiashenglin/Desktop/好玩的项目/noidear' add scripts/validate-agent-onboarding-docs.sh
git -C '/Users/jiashenglin/Desktop/好玩的项目/noidear' commit -m 'chore: add onboarding docs validation script'
```

Expected: one commit created for the script only.

---

### Task 4: Final Verification And Handoff

**Files:**
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/scripts/validate-agent-onboarding-docs.sh`

- [ ] **Step 1: Diff only the intended onboarding files**

Run:
```bash
git -C '/Users/jiashenglin/Desktop/好玩的项目/noidear' diff -- AGENTS.md docs/AGENT_GUIDE.md scripts/validate-agent-onboarding-docs.sh
```

Expected: diff shows only onboarding-layer changes and no unrelated file content.

- [ ] **Step 2: Re-run the validation script as a final check**

Run:
```bash
bash '/Users/jiashenglin/Desktop/好玩的项目/noidear/scripts/validate-agent-onboarding-docs.sh'
```

Expected:
```text
[PASS] Agent onboarding docs validation succeeded.
```

- [ ] **Step 3: Check the root entry remains short**

Run:
```bash
wc -l '/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md'
```

Expected: line count stays low enough to function as a short root-entry document rather than a handbook.

- [ ] **Step 4: Final documentation review in terminal**

Run:
```bash
sed -n '1,160p' '/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md'
printf '\n---\n'
sed -n '1,220p' '/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md'
```

Expected: root entry routes into the guide, and the guide begins with onboarding protocol before MCP/API operational content.

- [ ] **Step 5: Final commit for any touch-ups**

Run:
```bash
git -C '/Users/jiashenglin/Desktop/好玩的项目/noidear' add AGENTS.md docs/AGENT_GUIDE.md scripts/validate-agent-onboarding-docs.sh
git -C '/Users/jiashenglin/Desktop/好玩的项目/noidear' commit -m 'docs: finalize agent onboarding layer'
```

Expected: final cleanup commit only if needed after review.

---

## Self-Review

### Spec Coverage

This plan covers all approved design sections from `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-agent-onboarding-layer-design.md`:

- goal and boundary: implemented by converting `AGENTS.md` and `docs/AGENT_GUIDE.md` into the intended two-layer entry flow
- entry structure: implemented explicitly in Task 1 and Task 2
- mandatory reading protocol: implemented explicitly in Task 1 and Task 2 content blocks
- behavior constraints: implemented explicitly in Task 2 content block
- document priority and conflict handling: implemented explicitly in Task 2 content block
- relationship to later specs: preserved by limiting this implementation to onboarding docs only
- validation/hard-gate durability: implemented by Task 3 validation script

No spec coverage gaps remain for this onboarding-layer implementation.

### Placeholder Scan

- no `TODO`, `TBD`, or “implement later” placeholders remain
- all commands are concrete
- all file paths are exact
- all content blocks to be inserted are concrete

### Type And Name Consistency

The plan consistently uses:

- `AGENTS.md` as root entry
- `docs/AGENT_GUIDE.md` as operational protocol center
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` as domain truth source
- `MaterialLot(MaterialBatch) <-> IngredientUsage(BatchMaterialUsage) <-> ProductionBatch` as the canonical batch-chain wording

