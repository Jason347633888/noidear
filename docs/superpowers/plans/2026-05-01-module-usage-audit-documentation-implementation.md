# Module Usage Audit Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生成一套 `docs/module-usage/` 模块使用逻辑与整改地图，覆盖全项目模块，说明每条业务链怎么走、每一步生成什么结果、缺失会造成什么后果、当前系统差距和后续整改优先级。

**Architecture:** 第一轮只读梳理，不实施任何业务整改，不修改业务代码、schema、API 或页面。用多 agent 并行按业务链读取现有代码、路由、API、Prisma schema 和已有 docs，再由主 agent 汇总成统一目录化文档、机器可读 manifest、覆盖矩阵、GAP 总表和文档一致性检查脚本。

**Tech Stack:** Markdown documentation, NestJS/Vue/Prisma code inspection, ripgrep, git worktree, subagent-driven documentation workflow.

---

## 0. Non-Negotiable Scope

- 第一轮只生成审计产物：模块使用逻辑文档、机器可读 manifest、覆盖矩阵、GAP 总表和文档一致性检查脚本。
- 第一轮禁止实施整改：不改业务代码、不改 schema、不改 API、不改页面、不迁移数据。
- 文档主结构按真实业务链组织，现有菜单、API、Prisma 模型作为映射层。
- 每篇模块文档同时写当前状态、目标状态、差距和后续整改建议。
- 每个发现必须进入 `99-current-gap-register.md`，使用稳定编号 `GAP-001` 起。
- P0 问题必须能指出具体页面、API、字段、模型或函数。
- 后续整改 PR 必须引用对应模块文档和 GAP 编号。

---

## 1. File Structure

### Create

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/00-index.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/01-business-chain-overview.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/02-master-data-and-boundaries.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/03-document-control-and-record-forms.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/04-supplier-procurement-incoming.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/05-warehouse-inventory.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/06-mixing-production-packaging.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/07-quality-qc-release.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/08-traceability-complaint-recall.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/09-nonconformance-capa.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/10-equipment-and-measuring.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/11-training-internal-audit.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/12-task-approval-workflow.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/13-system-admin-ops.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/module-usage.manifest.json`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/98-coverage-matrix.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/99-current-gap-register.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/tools/check-module-usage-docs.mjs`

### Read-Only Evidence Sources

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/CONTEXT.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/**`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/router/index.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/**`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/**`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/**`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/plans/**`

---

## 2. Shared Document Template

Every module document must follow this exact structure.

```markdown
# 模块名称

---
module_id: stable-module-id
business_chain:
  - 上游业务链
  - 当前业务链
  - 下游业务链
module_type:
  - 主数据
  - 批次数据
  - 桥接关系
source_of_truth:
  - PrismaModelOrService
facts_or_projections:
  - ModelName: fact_source
  - ViewOrTodo: projection
downstream_consumers:
  - 下游模块名称
current_entrypoints:
  - route_or_menu
last_verified_commit: git_sha
---

## 1. 模块定位

说明这个模块在食品安全 SaaS 里的职责边界，明确它是主数据、批次数据、桥接关系、过程记录、治理记录、动态表单还是系统能力。

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|---|---|---|
| 角色名称 | 业务目的 | 具体动作 |

## 3. 当前入口

| 入口 | 页面 | 前端 API | 后端 API | 后端模块 |
|---|---|---|---|---|
| `/example` | `client/src/views/example/Example.vue` | `client/src/api/example.ts` | `GET /example` | `server/src/modules/example` |

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|---|---|---|
| Prisma 模型 | `ModelName` | 当前事实源或快照字段 |
| Service | `ExampleService` | 当前业务动作 |
| Controller | `ExampleController` | 当前公开入口 |

## 5. 正确业务流程

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1 | 动作 | 生成或更新的数据 | 上下游模块 | 缺失或错误会造成的业务问题 |

## 6. 上下游绑定关系

```text
上游模块
  -> 当前模块
  -> 下游模块
```

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|---|---|---|---|---|---|---|
| GAP-001 | 问题描述 | 根因描述 | 后果描述 | P0 | 已验证 | 文件路径或字段名 |

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|---|---|---|---|---|---|
| GAP-001 | 具体整改动作 | 依赖模块 | 是/否 | PR 名称建议 | 否 |

## 9. 证据索引

- `client/src/views/warehouse/MaterialList.vue`
- `client/src/api/warehouse.ts`
- `server/src/modules/warehouse/material.controller.ts`
- `server/src/modules/warehouse/material.service.ts`
- `server/src/prisma/schema.prisma`
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|---|---|---|---|---|
| 产品 | `Product` | 产品名称、产品编号 | 下游模块自建产品名称事实字段 | 迁移为引用或标记历史兼容 |

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|---|---|---|---|---|---|
| 1 | GAP-001 | PR 名称建议 | 依赖模块或无 | 否 | `npm run verify` |
```

---

## 3. Gap Register Format

`99-current-gap-register.md` must use this table.

```markdown
# 当前差距整改总表

## 级别定义

| 级别 | 定义 |
|---|---|
| P0 | 影响追溯、批次、放行、库存、审批闭环或主数据事实源，必须优先整改 |
| P1 | 影响业务一致性、数据质量、跨模块联动或统计准确性 |
| P2 | 入口、命名、展示、体验或管理员配置问题 |

## GAP 总表

| 编号 | 业务链 | 模块 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 依赖模块 | 建议整改 | 涉及文件 | 是否涉及 schema/migration | 是否涉及历史数据迁移 | 测试/验收命令 | 不能破坏什么 | 是否需要新设计 | 建议 PR |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GAP-001 | 业务链名称 | 模块名称 | 当前问题 | 根因描述 | 业务后果 | P0 | 已验证 | 依赖模块 | 整改动作 | 文件列表 | 是/否 | 是/否 | `npm run verify` | 已有数据和接口合同 | 是 | PR 名称建议 |
```

---

## 3.0 Agent Execution Contract

These docs are primarily for future agents, not for manual reading only. Every GAP must be executable without re-discovering the whole project.

For every P0/P1 GAP, include:

```text
Root cause: why the current implementation is wrong or incomplete.
Files likely to change: exact files or directories, if known.
Schema or migration impact: yes/no, with model names.
Historical data impact: yes/no, with migration or compatibility note.
Tests to add or update: unit, e2e, integration, or manual smoke path.
Validation command: exact command or manual path.
Do not break: API contracts, existing records, approval history, traceability chain, or document audit chain.
Parallelization: whether another agent can work on it independently.
```

If the exact fix is not known, mark `是否需要新设计 = 是` and state the decision that must be made before implementation. Do not invent schema or fields just to make a GAP look actionable.

## 3.1 Coverage Matrix Format

`98-coverage-matrix.md` must prove the audit did not silently skip routes, modules, models or API adapters.

```markdown
# 覆盖矩阵

## 1. 前端路由覆盖表

| 路由 | 页面 | 所属模块文档 | 状态 | 备注 |
|---|---|---|---|---|
| `/warehouse/materials` | `client/src/views/warehouse/MaterialList.vue` | `05-warehouse-inventory.md` | 已覆盖 | 物料主数据入口 |

## 2. 后端模块覆盖表

| 后端模块 | 所属模块文档 | 模块类型 | 状态 | 备注 |
|---|---|---|---|---|
| `server/src/modules/warehouse` | `05-warehouse-inventory.md` | 业务主链 | 已覆盖 | 仓储、批次、库存 |

## 3. Prisma 模型覆盖表

| Prisma 模型 | 业务对象类型 | 所属业务链 | 所属模块文档 | 是否事实源 | 备注 |
|---|---|---|---|---|---|
| `MaterialBatch` | 批次数据 | 原辅料批次 | `05-warehouse-inventory.md` | 是 | 业务名为原辅料批次 |

## 4. API 覆盖表

| 前端 API | 后端 Controller | 后端 Service | 所属模块文档 | 状态 | 备注 |
|---|---|---|---|---|---|
| `client/src/api/warehouse.ts` | `WarehouseController` | `WarehouseService` | `05-warehouse-inventory.md` | 已覆盖 | 示例 |

## 5. 未覆盖或需判定对象

| 对象 | 类型 | 当前判断 | 处理方式 | 对应 GAP | 后续动作 |
|---|---|---|---|---|---|
| `server/src/modules/example` | 后端模块 | 未判定 | 待判定 | GAP-XXX | 补充归属或标记残留 |
```

Statuses:

```text
已覆盖: 已归入某篇模块使用逻辑文档。
支撑能力: 不属于食品安全主链，但为系统能力，需要在 13-system-admin-ops.md 或相关文档中说明。
残留模块: 当前可能是历史实现、旧入口或未接入模块，必须进入 GAP 表或说明清理建议。
未判定: 审计未完成前的临时状态，最终文档不得保留。
```

Residual handling:

```text
保留并归属: 模块仍有真实业务或系统用途，归入对应模块文档。
迁移到新模块: 模块语义正确但事实源位置错误，进入 GAP 表并给迁移方向。
标记废弃: 模块不应继续作为入口或事实源，进入 GAP 表并说明废弃条件。
删除入口: 页面或菜单入口不应保留，但后端历史兼容可暂留。
历史兼容: 数据或 API 暂时保留用于旧记录、迁移或审计，不作为新功能事实源。
基础设施: upload、redis、health 等基础能力不进入业务主链，但必须归入 13-system-admin-ops.md 或覆盖矩阵。
```

---

## 3.2 Machine-Readable Manifest Format

`module-usage.manifest.json` is the fast index for future agents. It must be valid JSON and must not contain comments.

```json
{
  "schemaVersion": 1,
  "generatedAtCommit": "git_sha",
  "documents": [
    {
      "moduleId": "warehouse-inventory",
      "path": "docs/module-usage/05-warehouse-inventory.md",
      "businessChains": ["供应商 -> 原辅料批次 -> 仓储库存 -> 配料执行"],
      "moduleTypes": ["批次数据", "库存事实源"],
      "routes": ["/warehouse/materials", "/warehouse/batches"],
      "serverModules": ["server/src/modules/warehouse"],
      "clientApis": ["client/src/api/warehouse.ts"],
      "prismaModels": ["Material", "MaterialBatch", "StockRecord", "InventoryMovement"],
      "facts": ["MaterialBatch", "InventoryMovement"],
      "projections": [],
      "gaps": ["GAP-100", "GAP-101"]
    }
  ],
  "gaps": [
    {
      "id": "GAP-100",
      "severity": "P0",
      "moduleId": "warehouse-inventory",
      "dependsOn": [],
      "blocks": ["GAP-210", "GAP-300"],
      "canParallelize": false,
      "needsDesign": true,
      "schemaImpact": false,
      "historicalDataImpact": false,
      "recommendedPr": "PR-来料批次主链整改",
      "validation": ["npm run build:server"]
    }
  ]
}
```

Rules:

```text
Every module document must have exactly one `documents[]` entry.
Every stable GAP in `99-current-gap-register.md` must have exactly one `gaps[]` entry.
`documents[].gaps` must match GAP IDs referenced in the module document.
`gaps[].dependsOn` and `gaps[].blocks` must use stable GAP IDs only.
Do not include provisional `AGENT-N-GAP-M` IDs in the final manifest.
```

---

## 3.3 GAP Dependency Graph And PR Split Rules

`99-current-gap-register.md` must include a section named `## GAP 依赖图`.

Format:

```text
GAP-100 统一库存流水事实源
  -> GAP-210 配料区库存扣减
  -> GAP-300 物料平衡追溯
```

Dependency rules:

```text
If a GAP changes a fact source, all downstream GAPs must depend on it.
If a GAP needs schema/migration, it must be split from UI-only work.
If a GAP fixes an API contract, dependent frontend GAPs must depend on it.
If a GAP only changes labels, menu placement or display wording, it must not block fact-source GAPs.
```

PR split rules for future implementation:

```text
P0 chain break: one dedicated PR.
Schema or migration: one dedicated PR.
Fact-source migration: one dedicated PR, with historical-data plan.
Frontend/backend field binding: one focused PR after backend contract is stable.
Copy, label, menu, and small UX changes: may be grouped if they do not alter data contracts.
Residual module entry removal: one dedicated PR.
Documentation-only follow-up: may be grouped, but must not hide behavior changes.
```

This plan only records these future PR boundaries. It must not implement them during the audit.

---

## 3.4 Evidence Confidence Rules

Agents must not present guesses as verified findings.

Use one of these labels for every important claim:

```text
已验证: confirmed from code, route, schema, test, or authoritative docs.
未验证: suspected but not proven from available evidence.
需要业务确认: requires user or domain decision.
需要运行系统确认: requires local/dev server behavior or browser/API test.
需要数据库样本确认: requires real database data or seeded sample inspection.
```

Rules:

```text
Only `已验证` issues may become P0 without qualification.
`未验证` issues may enter module docs, but must be marked as suspected and should not drive implementation PRs.
`需要业务确认` issues must not invent schema or process decisions.
`需要运行系统确认` issues must include the exact route, API, or manual test path.
`需要数据库样本确认` issues must state which table/model and what sample is needed.
```

---

## 3.5 Short Completed Example

Use this as the minimum quality bar for each module document. Real documents must be more complete, but should keep the same density and evidence style.

```markdown
# 仓储与库存

---
module_id: warehouse-inventory
business_chain:
  - 供应商 -> 原辅料批次
  - 仓储库存
  - 配料执行 -> 追溯
module_type:
  - 批次数据
  - 库存事实源
source_of_truth:
  - MaterialBatch
  - InventoryMovement
facts_or_projections:
  - MaterialBatch: fact_source
  - StockRecord: legacy_or_migration_source
downstream_consumers:
  - 配料执行
  - 追溯
current_entrypoints:
  - /warehouse/materials
  - /warehouse/batches
last_verified_commit: git_sha
---

## 1. 模块定位

仓储模块负责物料主数据展示、原辅料批次入库、库存移动、领退料、报废和盘点。它是原辅料批次和库存事实源，不应让下游模块重新维护物料名称、供应商名称或批次号。

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|---|---|---|---|---|---|---|
| GAP-100 | `StockRecord` 和 `InventoryMovement` 双轨并存 | 当前仓储 service 深度写入 `StockRecord`，`InventoryMovement` 语义更完整但接入浅 | 后续配料、盘点、追溯可能引用不同库存事实源 | P0 | 已验证 | `server/src/prisma/schema.prisma`, `server/src/modules/warehouse` |

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|---|---|---|---|---|
| 原辅料批次 | `MaterialBatch` | 批次号、供应商批号、剩余数量 | 配料模块手填批次号 | 改为选择或由库存上下文带出 |

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|---|---|---|---|---|---|
| 1 | GAP-100 | PR-统一库存流水事实源 | 无 | 否 | `npm run build:server` |
```

---

## 4. Agent Work Allocation

### Agent 1: Master Data, Product, Recipe, Process

**Output files:**
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/02-master-data-and-boundaries.md`

**Read targets:**
- `server/src/modules/product`
- `server/src/modules/recipe`
- `server/src/modules/process`
- `server/src/modules/process-step`
- `server/src/modules/production-run`
- `client/src/views/product`
- `client/src/views/recipe`
- `client/src/views/process`
- `client/src/views/process-step`
- `client/src/api/product.ts`
- `client/src/api/recipe.ts`
- `client/src/api/process.ts`
- `client/src/api/process-step.ts`
- `server/src/prisma/schema.prisma`
- `docs/superpowers/specs/2026-04-26-product-rd-redesign.md`
- `docs/superpowers/specs/2026-04-29-product-master-data-and-production-linkage-design.md`
- `docs/superpowers/specs/2026-04-29-product-archive-recipe-linkage-design.md`

**Required findings to verify:**
- `process.createInstance` and Step1 product fields still using `productName` text.
- Product, Recipe, ProcessStep archive behavior and downstream production selection.
- RecipeLine material and workshop area bindings.

### Agent 2: Supplier, Procurement, Incoming, Warehouse

**Output files:**
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/04-supplier-procurement-incoming.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/05-warehouse-inventory.md`

**Read targets:**
- `server/src/modules/warehouse`
- `server/src/modules/incoming-inspection`
- `server/src/modules/supplier-evaluation`
- `server/src/modules/external-party`
- `client/src/views/warehouse`
- `client/src/views/incoming-inspection`
- `client/src/views/supplier-evaluation`
- `client/src/api/warehouse.ts`
- `client/src/api/incoming-inspection.ts`
- `client/src/api/supplier-evaluation.ts`
- `server/src/prisma/schema.prisma`
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`

**Required findings to verify:**
- `StockRecord` versus `InventoryMovement` dual inventory fact source.
- `/warehouse/batches` route weakness or hidden entry.
- Incoming inspection `material_batch_id` field entry method.
- Supplier and external party boundary.

### Agent 3: Mixing, Production, Packaging, Product Batch

**Output files:**
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/06-mixing-production-packaging.md`

**Read targets:**
- `server/src/modules/mixing`
- `server/src/modules/batch-trace`
- `server/src/modules/team-shift`
- `server/src/modules/shift-instance`
- `server/src/modules/packaging-material-usage`
- `server/src/modules/metal-detection`
- `client/src/views/batch-trace`
- `client/src/views/production`
- `client/src/views/shift`
- `client/src/views/metal-detection`
- `client/src/api/batch.ts`
- `client/src/api/shift.ts`
- `server/src/prisma/schema.prisma`
- `docs/superpowers/specs/2026-04-29-staging-area-mixing-and-batch-aggregation-design.md`
- `docs/superpowers/plans/2026-04-30-staging-area-mixing-product-batch-implementation.md`

**Required findings to verify:**
- `BatchMaterialUsage` versus `MixingExecution/MixingExecutionLine/BatchMixingAggregation` handoff.
- Material batch selection still hand-filled in old batch detail surface.
- `ProductionBatch` as 产品批次 and residual `finished_goods` / `finished_goods_batch` wording or compatibility entry cleanup.
- `ShiftInstance.shift_type` text versus `ShiftType` master data.

### Agent 4: Quality, QC, Release, Traceability, Complaint, Recall, CAPA

**Output files:**
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/07-quality-qc-release.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/08-traceability-complaint-recall.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/09-nonconformance-capa.md`

**Read targets:**
- `server/src/modules/ccp`
- `server/src/modules/environment-record`
- `server/src/modules/process-record`
- `server/src/modules/fragile-item-inspection`
- `server/src/modules/non-conformance`
- `server/src/modules/corrective-action`
- `server/src/modules/customer-complaint`
- `server/src/modules/rework-record`
- `server/src/modules/traceability`
- `server/src/modules/batch-trace`
- `client/src/views/ccp`
- `client/src/views/environment-record`
- `client/src/views/process-record`
- `client/src/views/non-conformance`
- `client/src/views/corrective-action`
- `client/src/views/customer-complaint`
- `client/src/views/traceability`
- `client/src/api/traceability.ts`
- `server/src/prisma/schema.prisma`
- `docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`
- `docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`

**Required findings to verify:**
- Three traceability entry points: `batch-trace`, `warehouse/traceability`, `traceability`.
- Traceability service files that are not registered in module providers.
- CCP and non-conformance ID entry risks.
- Customer complaint `customer_name` and production batch relation status.

### Agent 5: Document Control, Record Forms, Training, Internal Audit

**Output files:**
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/03-document-control-and-record-forms.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/11-training-internal-audit.md`

**Read targets:**
- `server/src/modules/document`
- `server/src/modules/document-issuance`
- `server/src/modules/record`
- `server/src/modules/record-template`
- `server/src/modules/record-task`
- `server/src/modules/model-landing`
- `server/src/modules/training`
- `server/src/modules/internal-audit`
- `client/src/views/documents`
- `client/src/views/record`
- `client/src/views/records`
- `client/src/views/templates`
- `client/src/views/training`
- `client/src/views/internal-audit`
- `client/src/api/document-control.ts`
- `client/src/api/document-operations.ts`
- `client/src/api/record.ts`
- `client/src/api/record-template.ts`
- `client/src/api/training.ts`
- `docs/superpowers/specs/2026-04-28-document-control-and-record-form-governance-design.md`
- `docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`

**Required findings to verify:**
- 04 记录表单索引 versus dynamic form versus business module landing.
- Training archive route/API mismatch.
- Internal audit double `/api/v1` risk and `/audit` prefix collision.
- Document center should not duplicate training, audit, CAPA or traceability facts.

### Agent 6: Task, Approval, Workflow, Permission, System Ops

**Output files:**
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/12-task-approval-workflow.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/13-system-admin-ops.md`

**Read targets:**
- `server/src/modules/approval`
- `server/src/modules/unified-approval`
- `server/src/modules/workflow`
- `server/src/modules/task`
- `server/src/modules/todo`
- `server/src/modules/record-task`
- `server/src/modules/scheduled-task`
- `server/src/modules/permission`
- `server/src/modules/fine-grained-permission`
- `server/src/modules/user-permission`
- `server/src/modules/department-permission`
- `server/src/modules/auth`
- `server/src/modules/backup`
- `server/src/modules/monitoring`
- `server/src/modules/alert`
- `server/src/modules/audit`
- `client/src/views/approvals`
- `client/src/views/workflow`
- `client/src/views/tasks`
- `client/src/views/my-todos`
- `client/src/views/permission`
- `client/src/views/backup`
- `client/src/views/monitoring`
- `client/src/api/approval.ts`
- `client/src/api/unified-approval.ts`
- `client/src/api/workflow.ts`
- `client/src/api/permission.ts`
- `client/src/api/backup.ts`
- `client/src/api/monitoring.ts`
- `client/src/stores/user.ts`

**Required findings to verify:**
- Old approval, unified approval, workflow, task, todo, record-task and scheduled-task boundaries.
- Auth method mismatch: profile and change password.
- Monitoring and backup API mismatches.
- Multiple permission fact models and admin configuration boundary.

---

## 5. Coordinator Tasks

### Task 1: Create Documentation Directory And Index Skeleton

**Files:**
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/00-index.md`
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/01-business-chain-overview.md`
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/99-current-gap-register.md`

- [ ] **Step 1: Create directory**

```bash
mkdir -p /Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage
```

Expected: directory exists.

- [ ] **Step 2: Create `00-index.md`**

```markdown
# 模块使用逻辑与整改地图

## 文档定位

本目录是 noidear 后续业务整改的准入依据。它按业务链说明系统应该如何使用、当前代码如何实现、每一步执行后的数据结果、缺失步骤造成的后果，以及当前差距整改建议。

## 使用规则

- 后续涉及业务流程、字段绑定、追溯、主数据、审批、任务、文控、库存、检验、生产的整改 PR，必须引用本目录中的对应模块文档和 GAP 编号。
- 不允许新增绕开 Product、Material、Supplier、Employee、Location、MaterialBatch、ProductionBatch 的平行事实源。
- 不允许用自由文本字段替代可关联的主数据或批次数据。
- 动态表单只能承接不适合独立业务建模的记录，不替代核心业务对象。

## 文档清单

| 文件 | 范围 |
|---|---|
| `01-business-chain-overview.md` | 全业务链总览 |
| `02-master-data-and-boundaries.md` | 主数据、产品、配方、工序边界 |
| `03-document-control-and-record-forms.md` | 文控、记录表单、动态表单落地 |
| `04-supplier-procurement-incoming.md` | 供应商、采购、来料、来料检验 |
| `05-warehouse-inventory.md` | 仓储、库存、批次、调拨、盘点 |
| `06-mixing-production-packaging.md` | 配料、生产、包装、产品批次 |
| `07-quality-qc-release.md` | 过程控制、质检、放行 |
| `08-traceability-complaint-recall.md` | 追溯、投诉、召回 |
| `09-nonconformance-capa.md` | 不合格、CAPA、整改验证 |
| `10-equipment-and-measuring.md` | 设备、计量器具、维保、校准 |
| `11-training-internal-audit.md` | 培训、内审 |
| `12-task-approval-workflow.md` | 任务、审批、工作流 |
| `13-system-admin-ops.md` | 权限、账号、通知、备份、监控、审计 |
| `module-usage.manifest.json` | 机器可读索引：文档、路由、模块、模型、GAP、依赖 |
| `98-coverage-matrix.md` | 前端路由、后端模块、Prisma 模型、API 覆盖证明 |
| `99-current-gap-register.md` | 当前差距整改总表 |
```

- [ ] **Step 3: Create `99-current-gap-register.md`**

```markdown
# 当前差距整改总表

## 级别定义

| 级别 | 定义 |
|---|---|
| P0 | 影响追溯、批次、放行、库存、审批闭环或主数据事实源，必须优先整改 |
| P1 | 影响业务一致性、数据质量、跨模块联动或统计准确性 |
| P2 | 入口、命名、展示、体验或管理员配置问题 |

## GAP 总表

| 编号 | 业务链 | 模块 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 依赖模块 | 建议整改 | 涉及文件 | 是否涉及 schema/migration | 是否涉及历史数据迁移 | 测试/验收命令 | 不能破坏什么 | 是否需要新设计 | 建议 PR |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

## GAP 依赖图

```text
GAP-100 示例上游问题
  -> GAP-210 示例下游问题
```
```

- [ ] **Step 4: Create `01-business-chain-overview.md`**

```markdown
# 业务链总览

## 1. 主业务链

```text
供应商
  -> 物料
  -> 原辅料批次
  -> 来料检验
  -> 仓储库存
  -> 配料执行
  -> 产品批次
  -> 过程/质检/放行
  -> 发货
  -> 客户
  -> 投诉/召回/追溯
```

## 2. 支撑体系

```text
文控
  -> 记录表单索引
  -> 动态表单或业务模块落地
  -> 任务/审批/培训/内审
  -> CAPA/整改
```

## 3. 整改原则

- 业务链优先于当前菜单结构。
- 当前菜单、页面、API 和 Prisma 模型只作为映射层。
- 任何影响追溯的记录必须能回到原辅料批次或产品批次。
- 每个 GAP 必须有编号，后续 PR 必须引用编号。
```

- [ ] **Step 5: Create `module-usage.manifest.json` skeleton**

```json
{
  "schemaVersion": 1,
  "generatedAtCommit": "",
  "documents": [],
  "gaps": []
}
```

- [ ] **Step 6: Create `tools/check-module-usage-docs.mjs` skeleton**

The script must eventually validate:

```text
Required module docs exist.
Every module doc has metadata.
GAP IDs are unique.
GAP IDs referenced in module docs exist in `99-current-gap-register.md`.
Every GAP in `99-current-gap-register.md` exists in `module-usage.manifest.json`.
`98-coverage-matrix.md` has no unresolved `未判定` or `待判定` rows.
P0/P1 rows include root cause, likely files, schema impact, historical-data impact and validation path.
P0/P1 rows include a valid verification status.
```

The first skeleton may fail with a clear TODO message until Task 6 fills the docs.

- [ ] **Step 7: Commit skeleton**

```bash
git add docs/module-usage/00-index.md docs/module-usage/01-business-chain-overview.md docs/module-usage/99-current-gap-register.md docs/module-usage/module-usage.manifest.json tools/check-module-usage-docs.mjs
git commit -m "docs: add module usage documentation skeleton"
```

Expected: commit created with only documentation skeleton files and the documentation validation script skeleton.

### Task 2: Dispatch Six Read-Only Documentation Agents

**Files:**
- Modify: module usage files listed in section 4

- [ ] **Step 1: Start six subagents using the assignments in section 4**

Use the exact assignment text from section 4. Each agent must:

```text
1. Read AGENTS.md, docs/AGENT_GUIDE.md, docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md.
2. Read only assigned code and docs.
3. Do not modify files outside assigned output files.
4. Use the shared document template from section 2.
5. Add GAP rows in its output with provisional numbers using prefix AGENT-N-GAP-M.
6. Include evidence paths for every P0 issue.
7. Fill the metadata block at the top of every assigned module document.
8. Fill `禁止重复实现与事实源边界` so future agents know what not to recreate.
9. Fill `后续整改入口` so each GAP can be converted into an implementation PR.
10. Mark each important claim as `已验证`, `未验证`, `需要业务确认`, `需要运行系统确认`, or `需要数据库样本确认`.
```

- [ ] **Step 2: Require each agent to produce module docs and provisional GAP rows**

Expected output from each agent:

```text
Completed:
- Created or updated assigned docs/module-usage/*.md files
- Files modified
- Modules inspected
- Routes inspected
- API adapters inspected
- Controllers/services inspected
- Prisma models inspected
- GAPs created
- Suspected but unconfirmed issues
- Scope not covered
- Claims requiring business confirmation
- Claims requiring runtime or database-sample confirmation
- Did not modify business code, schema, API, page code, generated files, env files, reports or runtime artifacts
```

### Task 3: Normalize GAP Numbering

**Files:**
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/*.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/99-current-gap-register.md`

- [ ] **Step 1: Collect provisional GAP rows**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
rg -n "AGENT-[0-9]+-GAP-[0-9]+" docs/module-usage
```

Expected: every provisional GAP appears in its source module document.

- [ ] **Step 2: Rewrite provisional GAPs to stable IDs**

Stable order:

```text
GAP-001 to GAP-099: 主数据、产品、配方、工序
GAP-100 to GAP-199: 供应商、来料、仓储
GAP-200 to GAP-299: 配料、生产、包装、产品批次
GAP-300 to GAP-399: 品质、质检、放行、追溯、投诉、召回、CAPA
GAP-400 to GAP-499: 文控、记录表单、培训、内审
GAP-500 to GAP-599: 任务、审批、工作流、权限、系统运维
```

Example rewrite:

```text
AGENT-2-GAP-1 -> GAP-100
AGENT-2-GAP-2 -> GAP-101
AGENT-3-GAP-1 -> GAP-200
```

- [ ] **Step 3: Build `99-current-gap-register.md`**

For each stable GAP, add one row:

```markdown
| GAP-100 | 来料 -> 仓储 -> 投料 | 来料检验 | `material_batch_id` 录入方式需要核对是否仍可手填 | 来料检验和原辅料批次上下文绑定不稳定 | 后续投料可能无法稳定追溯到供应商、来料放行和原辅料批次 | P0 | 已验证 | MaterialBatch, IncomingInspection, Warehouse | 改为从原辅料批次选择器或到货批次上下文带出 | `client/src/views/incoming-inspection`, `server/src/modules/incoming-inspection` | 否 | 否 | `npm run build:server` | 已有来料检验记录和原辅料批次关联 | 是 | PR-来料批次主链整改 |
```

Each row must include enough execution detail for another agent to start a PR without re-auditing the entire module. If a row cannot name likely files, schema impact, historical-data impact and validation path, downgrade it to a design-needed GAP instead of pretending it is implementation-ready.

- [ ] **Step 4: Verify no provisional GAP IDs remain**

Run:

```bash
rg -n "AGENT-[0-9]+-GAP-[0-9]+" docs/module-usage
```

Expected: no output.

### Task 4: Coordinator Consistency Pass

**Files:**
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/*.md`

- [ ] **Step 1: Normalize terminology**

Apply these terms across all docs:

```text
产品批次: use for business concept
ProductionBatch: use only when naming code model
原辅料批次: use for business concept
MaterialBatch: use only when naming code model
投料记录: use for business action
BatchMaterialUsage: use only when naming code model
体系文件中心: use for document-control entry
记录表单索引: use for 04 form landing map
动态表单: use only for records without independent business object
```

- [ ] **Step 2: Enforce current state and target state sections**

Run:

```bash
for file in docs/module-usage/*.md; do
  echo "$file"
  rg -q "## 4\\. 当前实现" "$file" && rg -q "## 5\\. 正确业务流程" "$file" && rg -q "## 7\\. 当前系统差距" "$file"
done
```

Expected: command exits successfully for every module document except `00-index.md`, `01-business-chain-overview.md`, and `99-current-gap-register.md`.

- [ ] **Step 2.1: Enforce agent metadata and execution sections**

Run:

```bash
for file in docs/module-usage/0[2-9]-*.md docs/module-usage/1[0-3]-*.md; do
  echo "$file"
  rg -q "^module_id:" "$file" &&
  rg -q "^source_of_truth:" "$file" &&
  rg -q "^last_verified_commit:" "$file" &&
  rg -q "## 10\\. 禁止重复实现与事实源边界" "$file" &&
  rg -q "## 11\\. 后续整改入口" "$file"
done
```

Expected: command exits successfully for every module document.

- [ ] **Step 3: Enforce evidence paths for P0 rows**

Run:

```bash
rg -n "\\| GAP-[0-9]+ .*\\| P0 \\|" docs/module-usage
```

For every P0 row, confirm the same document has a matching evidence path in section `## 9. 证据索引`.

- [ ] **Step 4: Update `00-index.md` with PR admission rule**

Add this section:

```markdown
## 后续整改 PR 准入规则

每个涉及业务流程、字段绑定、追溯、主数据、审批、任务、文控、库存、检验、生产的整改 PR，必须说明：

1. 解决 `99-current-gap-register.md` 中哪个 GAP 编号。
2. 修改哪条业务链。
3. 是否新增或删除主数据、批次、桥接关系或动态表单承载。
4. 是否影响追溯、放行、库存、审批或任务闭环。
5. 是否同步更新对应模块使用逻辑文档。

## 后续整改完成后的回写规则

每个后续整改 PR 完成后必须回写：

1. 对应 `docs/module-usage/*.md` 的当前实现、差距和后续整改入口。
2. `docs/module-usage/99-current-gap-register.md` 的 GAP 状态、依赖和验收结果。
3. `docs/module-usage/98-coverage-matrix.md` 的路由、模块、模型或 API 覆盖状态。
4. `docs/module-usage/module-usage.manifest.json` 的文档、GAP、依赖和验证命令。
5. 如涉及术语、事实源或业务边界变化，同步更新 `CONTEXT.md`。
6. 运行 `node tools/check-module-usage-docs.mjs` 并保持通过。
```

### Task 5: Build Coverage Matrix

**Files:**
- Create or modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/98-coverage-matrix.md`

- [ ] **Step 1: Build frontend route coverage table**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
rg -n "path:|component:" client/src/router/index.ts
```

Expected: every business or admin route is mapped to one module usage document in `98-coverage-matrix.md`.

- [ ] **Step 2: Build backend module coverage table**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
find server/src/modules -maxdepth 1 -type d | sed 's#server/src/modules/##' | sort
```

Expected: every backend module is marked as one of:

```text
业务主链
支撑能力
残留模块
基础设施
```

No module may be omitted. Residual modules must either link to an existing GAP or include a cleanup note.

- [ ] **Step 3: Build Prisma model coverage table**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
rg -n "^model " server/src/prisma/schema.prisma
```

Expected: every business-relevant Prisma model is mapped to:

```text
主数据
批次数据
桥接关系
过程记录
治理记录
系统能力
审计/日志
历史兼容
```

P0/P1 traceability, stock, approval, release or master-data models must be explicitly marked as fact source or projection.

- [ ] **Step 4: Build API coverage table**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
find client/src/api -maxdepth 1 -type f | sort
find server/src/modules -name "*controller.ts" | sort
find server/src/modules -name "*service.ts" | sort
```

Expected: API adapters, controllers and services are mapped by module document. Unmatched adapters or controllers must be listed in `98-coverage-matrix.md` section `未覆盖或需判定对象`.

- [ ] **Step 5: Verify no final unresolved object remains**

Run:

```bash
rg -n "^\\| .*\\| .*\\| 未判定 \\|" docs/module-usage/98-coverage-matrix.md
rg -n "^\\| .*\\| .*\\| .*\\| 待判定 \\|" docs/module-usage/98-coverage-matrix.md
```

Expected: no unresolved table row remains before final commit.

### Task 6: Build Manifest And Validation Script

**Files:**
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/module-usage.manifest.json`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/tools/check-module-usage-docs.mjs`

- [ ] **Step 1: Populate `module-usage.manifest.json`**

Use the format in section 3.2. The manifest must include:

```text
All module documents.
Routes covered by each document.
Server modules covered by each document.
Client API adapters covered by each document.
Business-relevant Prisma models covered by each document.
Fact sources and projections.
Stable GAP IDs created by each document.
GAP dependency edges.
Recommended PR name and validation command for each GAP.
```

- [ ] **Step 2: Implement `tools/check-module-usage-docs.mjs`**

The script must fail with a non-zero exit code if:

```text
Required files are missing.
Any module doc is missing metadata.
Any module doc is missing `禁止重复实现与事实源边界`.
Any module doc is missing `后续整改入口`.
Any GAP ID is duplicated.
Any module-doc GAP is missing from `99-current-gap-register.md`.
Any register GAP is missing from `module-usage.manifest.json`.
Any manifest GAP references unknown dependencies.
`98-coverage-matrix.md` contains unresolved `未判定` or `待判定` rows.
Any P0/P1 row misses root cause, verification status, likely files, schema impact, historical-data impact, validation path or do-not-break note.
```

- [ ] **Step 3: Run validation script**

Run:

```bash
node tools/check-module-usage-docs.mjs
```

Expected: exit code 0.

### Task 7: Final Documentation Validation

**Files:**
- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/module-usage/**`
- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/tools/check-module-usage-docs.mjs`

- [ ] **Step 1: Verify only documentation artifacts changed**

Run:

```bash
git diff --name-only
```

Expected: only files under `docs/module-usage/` and `tools/check-module-usage-docs.mjs` are listed.

- [ ] **Step 2: Verify all expected docs exist**

Run:

```bash
for file in \
  docs/module-usage/00-index.md \
  docs/module-usage/01-business-chain-overview.md \
  docs/module-usage/02-master-data-and-boundaries.md \
  docs/module-usage/03-document-control-and-record-forms.md \
  docs/module-usage/04-supplier-procurement-incoming.md \
  docs/module-usage/05-warehouse-inventory.md \
  docs/module-usage/06-mixing-production-packaging.md \
  docs/module-usage/07-quality-qc-release.md \
  docs/module-usage/08-traceability-complaint-recall.md \
  docs/module-usage/09-nonconformance-capa.md \
  docs/module-usage/10-equipment-and-measuring.md \
  docs/module-usage/11-training-internal-audit.md \
  docs/module-usage/12-task-approval-workflow.md \
  docs/module-usage/13-system-admin-ops.md \
  docs/module-usage/module-usage.manifest.json \
  docs/module-usage/98-coverage-matrix.md \
  docs/module-usage/99-current-gap-register.md \
  tools/check-module-usage-docs.mjs; do
  test -s "$file" || exit 1
done
```

Expected: exit code 0.

- [ ] **Step 3: Verify gap register has rows**

Run:

```bash
rg -n "^\\| GAP-[0-9]{3} \\|" docs/module-usage/99-current-gap-register.md
```

Expected: at least one GAP row.

- [ ] **Step 4: Verify manifest and docs are internally consistent**

Run:

```bash
node tools/check-module-usage-docs.mjs
```

Expected: exit code 0.

- [ ] **Step 5: Commit docs**

```bash
git add docs/module-usage tools/check-module-usage-docs.mjs
git commit -m "docs: add module usage audit map"
```

Expected: commit contains only `docs/module-usage/**` and `tools/check-module-usage-docs.mjs`.

---

## 6. Initial Known GAP Seeds

Use these seeds only after verifying them from code.

| Seed | Business chain | Suspected issue | Expected severity |
|---|---|---|---|
| S-001 | 产品研发 -> 产品主数据 | 研发流程仍可能提交 `productName` 文本 | P0 |
| S-002 | 仓储库存 | `StockRecord` and `InventoryMovement` both appear as inventory facts | P0 |
| S-003 | 来料检验 | `material_batch_id` entry may be hand-filled or weakly bound | P0 |
| S-004 | 配料生产 | `BatchMaterialUsage` and `MixingExecution` chain handoff is not settled | P0 |
| S-005 | 追溯 | `batch-trace`, `warehouse/traceability`, `traceability` are parallel trace entry points | P0 |
| S-006 | 质量合规 | CCP and non-conformance may allow hand-filled source IDs | P0 |
| S-007 | 培训内审 | Some frontend API paths may double-prefix `/api/v1` | P1 |
| S-008 | 系统管理 | Auth, monitoring and backup frontend adapters may not match controllers | P1 |
| S-009 | 任务审批 | Old approval, unified approval, workflow, task, todo and record-task overlap | P1 |
| S-010 | 权限 | Multiple permission models may create unclear admin configuration boundary | P1 |

---

## 7. Final Success Criteria

- `docs/module-usage/` contains all 16 expected Markdown documents plus `module-usage.manifest.json`.
- `tools/check-module-usage-docs.mjs` exists and passes.
- Every module document uses the shared structure.
- Every module document has agent-readable metadata, source-of-truth boundaries, anti-duplication rules and remediation entry rows.
- `98-coverage-matrix.md` maps frontend routes, backend modules, business-relevant Prisma models and API adapters to module documents.
- No frontend route, backend module, business-relevant Prisma model or API adapter remains `未判定` or `待判定`.
- `module-usage.manifest.json` maps documents, routes, backend modules, client APIs, Prisma models, fact sources, projections, GAPs, dependencies and recommended PRs.
- `99-current-gap-register.md` has stable GAP IDs.
- `99-current-gap-register.md` includes a GAP dependency graph.
- P0/P1 issues include root cause, verification status, likely files, schema impact, historical-data impact, validation path, and concrete evidence paths or exact field/API/model names.
- Residual modules have an explicit handling path: keep and assign, migrate, deprecate, remove entry, keep for historical compatibility, or classify as infrastructure.
- No business code, schema, API, page code, generated, env, report or local runtime file is modified. The only allowed non-doc artifact is `tools/check-module-usage-docs.mjs`.
- The documentation gives enough detail for the user to understand:
  - each module can do what,
  - each function is used how,
  - each step creates or updates what data,
  - which upstream and downstream modules are bound,
  - what breaks if a step or binding is missing,
  - which整改 should be done first.
