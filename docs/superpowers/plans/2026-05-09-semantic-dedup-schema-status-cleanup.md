# Schema Status Field Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> If current code conflicts with this plan, stop and report back instead of guessing.

**Goal:** 为供应商评估状态和原辅料批次库存流向状态添加 Prisma Enum 类型约束，并把外部 API 字段统一为 `evaluationStatus` / `lotStatus`。DB 列名继续通过 `@map("supplier_status")` / `@map("lot_status")` 封住，避免 breaking migration。

**Architecture:** Schema 新增两个 Enum（`SupplierEvaluationStatus`、`LotInventoryStatus`），字段类型从 String 改为 Enum，Prisma/API 字段名改为 `evaluationStatus` / `lotStatus`，DB 列名通过 `@map` 保持兼容。只改这两个字段，不顺手改 `Supplier.status` 或 `MaterialBatch.status`。需执行 `prisma migrate dev`。

**Spec:** `docs/superpowers/specs/2026-05-09-domain-source-of-truth-and-semantic-dedup-design.md`（决策八、九）

**Tech Stack:** Prisma, PostgreSQL, TypeScript, NestJS

**Pre-check（执行前）：**
```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git worktree list --porcelain
pwd
git branch --show-current
# 必须在独立 worktree 分支中执行
```

---

## 语义边界说明（理解本计划的基础）

### Supplier 两个状态维度

| 字段 | 含义 | 由谁触发 | 合法值 |
|------|------|---------|-------|
| `status` | **运营状态**（是否在使用） | 管理员启用/停用 | `active` / `disabled` |
| `evaluationStatus`（DB: `supplier_status`） | **资质评估状态** | 供应商评估流程 | `pending` / `approved` / `suspended` / `eliminated` |

两个字段独立，不应合并。PR 3 只改 `evaluationStatus`，不改 `Supplier.status` 的命名或 String -> Enum 技术债。

### MaterialBatch 两个状态维度

| 字段 | 含义 | 由谁触发 | 合法值 |
|------|------|---------|-------|
| `status` (BatchStatus) | **质量/锁定状态** | QC 操作（过期/锁定） | `normal` / `expired` / `locked` |
| `lotStatus` (DB: `lot_status`) | **库存流向状态** | 仓储操作 | `in_stock` / `consumed` / `nonconforming` / `quarantined` / `disposed` |

两个字段独立。`MaterialBatch.status` / `BatchStatus` 已有质量状态语义，本计划不改；`lotStatus` 当前主要依赖 schema default，写入缺口标注为后续仓储流转 PR 的范围。

---

## File Map

### Task 1（Supplier evaluationStatus）
- Modify: `server/src/prisma/schema.prisma`（新增 enum + 字段类型替换）
- Generate: `server/src/prisma/migrations/<timestamp>_supplier_evaluation_status_enum/migration.sql`
- Modify: `server/src/modules/warehouse/dto/supplier.dto.ts`
- Modify: `server/src/modules/supplier-evaluation/supplier-evaluation.service.ts`
- Modify: `server/src/modules/warehouse/services/supplier-access.service.ts`
- Modify: `server/src/modules/warehouse/services/supplier-access.service.spec.ts`（测试用字段名同步）
- Modify: `packages/types/api.ts`
- Modify: `docs/module-usage/04-supplier-procurement-incoming.md`（口径改成 `evaluationStatus`）
- Modify: `docs/module-usage/99-current-gap-register.md`（口径改成 `evaluationStatus`）
- Search and fix: 前端中所有 `supplier.supplier_status` / `supplier_status` 引用

### Task 2（MaterialBatch lotStatus）
- Modify: `server/src/prisma/schema.prisma`（新增 enum + 字段类型替换）
- Generate: `server/src/prisma/migrations/<timestamp>_lot_inventory_status_enum/migration.sql`
- Modify: `packages/types/api.ts`（如暴露 MaterialBatch）
- Verify: `server/src/modules/warehouse/` （lotStatus 当前无服务层写入，只需 schema 和类型对齐）
- Search: 前端 `lot_status` / `lotStatus` 引用，若为空记录为已确认

---

## Task 1: Supplier `evaluationStatus` Enum 化

- [ ] **Step 1.1: 在 schema.prisma 顶部 Enum 区新增 `SupplierEvaluationStatus`**

打开 `server/src/prisma/schema.prisma`，在文件顶部现有 enum 区（第 10-30 行附近），在 `BatchStatus` 之后加入：

```prisma
enum SupplierEvaluationStatus {
  pending
  approved
  suspended
  eliminated
}
```

- [ ] **Step 1.2: 修改 Supplier model 中的 `supplier_status` 字段**

找到 Supplier model（约第 1108-1140 行），将：
```prisma
  supplier_status   String    @default("approved") // 'approved'|'suspended'|'eliminated'|'pending'
```
改为：
```prisma
  // 资质评估状态（QC/采购评估流程写入），独立于运营状态 status
  evaluationStatus  SupplierEvaluationStatus @default(approved) @map("supplier_status")
```

`status` 字段保留不变（运营状态，后续独立 enum 化，不进本 PR）：
```prisma
  status       String    @default("active") // active | disabled（运营状态，由管理员操作）
```

- [ ] **Step 1.3: 生成并审查 migration**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx prisma migrate dev --name supplier_evaluation_status_enum
```

审查生成的 SQL 文件，确认：
- `CREATE TYPE "SupplierEvaluationStatus" AS ENUM ('pending', 'approved', 'suspended', 'eliminated');`
- `ALTER TABLE "suppliers" ALTER COLUMN "supplier_status" TYPE "SupplierEvaluationStatus" USING "supplier_status"::"SupplierEvaluationStatus";`
- DB 列名仍是 `supplier_status`（`@map` 生效）

若 migration 含 `DROP COLUMN` 或 `data loss` 警告，停止并回报。

- [ ] **Step 1.4: 修改 DTO / 共享类型 / API 字段名**

同步修改：

- `server/src/modules/warehouse/dto/supplier.dto.ts`
- `packages/types/api.ts`
- 前端所有 `supplier_status` 字段引用

要求：

- `CreateSupplierDto` / `UpdateSupplierDto` 对外使用 `evaluationStatus`
- `Supplier` interface 对外使用 `evaluationStatus`
- 不保留外部 `supplier_status`
- 不修改 `Supplier.status`

- [ ] **Step 1.5: 修改 `supplier-evaluation.service.ts`**

```bash
grep -n "supplier_status" server/src/modules/supplier-evaluation/supplier-evaluation.service.ts
```

找到写入处（约第 36 行），将字符串字面量改为 Prisma enum 引用：
```typescript
// 改前
supplier_status: 'approved',

// 改后（Prisma 生成的 enum 在 @prisma/client 中）
evaluationStatus: 'approved',  // SupplierEvaluationStatus.approved
```

- [ ] **Step 1.6: 修改 `supplier-access.service.ts`**

```bash
grep -n "supplier_status" server/src/modules/warehouse/services/supplier-access.service.ts
```

共 4 处，逐一修改：

第 8 行的接口定义：
```typescript
// 改前
supplier_status?: string | null;

// 改后
evaluationStatus?: string | null;
```

第 23、43 行的 Prisma select：
```typescript
// 改前
supplier_status: true,

// 改后
evaluationStatus: true,
```

第 72 行的条件判断：
```typescript
// 改前
if (supplier.supplier_status === 'eliminated') {

// 改后
if (supplier.evaluationStatus === 'eliminated') {
```

- [ ] **Step 1.7: 全局扫描残留的 `supplier_status` 字段引用**

```bash
rg -n "supplier_status" server/src client/src packages docs -g '!**/dist/**' -g '!server/src/prisma/migrations/**'
```

期望：正式 TS/Vue/API 文档中不再把 `supplier_status` 当外部字段；仅允许 schema/migration 或说明 DB column via `@map("supplier_status")` 的文字出现。

- [ ] **Step 1.8: TypeScript 编译验证**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run build:server 2>&1 | grep -i "error\|TS" | head -30
```

期望：0 错误。

- [ ] **Step 1.9: Commit**

```bash
git add server/src/prisma/schema.prisma \
        server/src/prisma/migrations/ \
        server/src/modules/supplier-evaluation/ \
        server/src/modules/warehouse/
git commit -m "feat: add SupplierEvaluationStatus enum, rename supplier_status to evaluationStatus"
```

---

## Task 2: MaterialBatch `lotStatus` Enum 化

**注意：** `lot_status` 当前在服务层无写入代码（只在 schema 中定义了 default）。本 Task 只做 schema/API 字段命名 + Prisma 类型约束，不新增仓储业务写入逻辑。

- [ ] **Step 2.1: 在 schema.prisma 顶部 Enum 区新增 `LotInventoryStatus`**

在 `SupplierEvaluationStatus` 之后加入：
```prisma
enum LotInventoryStatus {
  in_stock
  consumed
  nonconforming
  quarantined
  disposed
}
```

- [ ] **Step 2.2: 修改 MaterialBatch model 中的 `lot_status` 字段**

找到 MaterialBatch model（约第 987-1037 行），将：
```prisma
  lot_status        String   @default("in_stock") // 'in_stock'|'consumed'|'nonconforming'|'quarantined'|'disposed'
```
改为：
```prisma
  // 库存流向状态（仓储操作触发），独立于质量状态 status(BatchStatus)
  // BatchStatus = QC 质量/锁定状态；LotInventoryStatus = 库存流向状态
  lotStatus         LotInventoryStatus @default(in_stock) @map("lot_status")
```

- [ ] **Step 2.3: 生成并审查 migration**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx prisma migrate dev --name lot_inventory_status_enum
```

审查生成的 SQL，确认：
- 新增 `LotInventoryStatus` enum 类型
- `ALTER TABLE "material_batches" ALTER COLUMN "lot_status" TYPE "LotInventoryStatus" USING "lot_status"::"LotInventoryStatus";`
- DB 列名仍是 `lot_status`

若有 data loss 警告（如现有 DB 中存在不合法的状态值），需先执行 data fix：
```sql
-- 检查现有值
SELECT DISTINCT lot_status FROM material_batches;
-- 若有不在 enum 内的值，先 UPDATE 修正
```

- [ ] **Step 2.4: 验证服务层无 `lot_status` / `lotStatus` 字段写入**

```bash
rg -n "lot_status\|lotStatus" server/src/modules/ --type ts
```

期望：无服务层写入点。若只有类型/查询引用，改为 `lotStatus`。若发现写入逻辑，先确认它是否属于仓储库存流向状态；不新增新的业务写入流程。

记录该现象：`lotStatus` 目前只读不写（除 Prisma default 和可能的直接 DB 操作）。后续若仓储服务需要更新库存流向状态，应在独立 PR 中补写入逻辑，不在本 PR 范围。

- [ ] **Step 2.5: 扫描前端中是否直接依赖 lot_status 字段名**

```bash
rg -n "lot_status\|lotStatus" client/src/ --type ts --type vue 2>/dev/null
```

若前端有依赖，更新对应接口类型和字段引用。

- [ ] **Step 2.5b: 同步共享类型与 DTO**

如 `packages/types/api.ts` 或 DTO 暴露 MaterialBatch，统一使用 `lotStatus`，不保留外部 `lot_status`。

- [ ] **Step 2.6: TypeScript 编译验证**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run build:server 2>&1 | grep -i "error\|TS" | head -30
```

期望：0 错误。

- [ ] **Step 2.7: 在 schema 注释中写明两个 status 字段的语义边界**

确认 MaterialBatch model 中的注释如下（已在 Step 2.2 加入），再次确认措辞准确：
```prisma
  status            BatchStatus        @default(normal) // 质量/锁定状态，由 QC 操作触发
  lotStatus         LotInventoryStatus @default(in_stock) @map("lot_status") // 库存流向状态，由仓储操作触发
```

- [ ] **Step 2.8: Commit**

```bash
git add server/src/prisma/schema.prisma \
        server/src/prisma/migrations/
git commit -m "feat: add LotInventoryStatus enum, upgrade lot_status to typed field"
```

---

## Task 3: 验证收口

- [ ] **Step 3.1: Prisma client 重新生成确认**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx prisma generate
```

期望：正常生成，无警告。

- [ ] **Step 3.2: 全局扫描残留字符串字段名**

```bash
rg -n "supplier_status\|lot_status" server/src/ --type ts | grep -v schema.prisma | grep -v migration
```

期望：0 处（仅 schema、migration SQL、或明确说明 DB column via `@map` 的文档中可见，TypeScript/Vue/API 代码中不应出现）。

- [ ] **Step 3.3: 最终编译**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run build:server
```

期望：0 错误。

- [ ] **Step 3.4: 开 PR**

```bash
git log --oneline origin/master..HEAD
```

确认包含：supplier enum migration commit + materialBatch enum migration commit。
