# GAP-301 FragileItemInspection Batch FK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` only to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the quality release model during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make every `FragileItemInspection` persistently and explicitly linked to one `ProductionBatch`.

**Architecture:** Add a database-level non-null FK from `FragileItemInspection.production_batch_id` to `ProductionBatch.id`, guarded by migration preflight checks. Add DTO and service validation so API callers get clear 400 errors, and change the fragile-item inspection form to use the existing production-batch selector instead of optional free text.

**Tech Stack:** Prisma schema/migration, NestJS service/DTO/controller, class-validator, Vue 3, Element Plus, Jest.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-301 生成 spec 和本 implementation plan。
- **brainstorming 结论：** `FragileItemInspection` 在当前质量放行模块内是批次放行证据，不允许保留无批次例外；无批次日常巡检应走动态表单或未来独立设施巡检模型。
- **grill-with-docs 校准结论：** 已确认本计划复用 `ProductionBatch`，不新增平行批次链路，不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链，不自动猜测历史空批次记录。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 如果 migration preflight 发现 `FragileItemInspection.production_batch_id IS NULL` 或 orphan `production_batch_id`，不得自动回填；停止并回报需要业务确认具体生产批次。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260501100000_require_fragile_item_inspection_batch_id/migration.sql`
- Modify: `server/src/modules/fragile-item-inspection/dto/create-fragile-item-inspection.dto.ts`
- Modify: `server/src/modules/fragile-item-inspection/fragile-item-inspection.service.ts`
- Add: `server/src/modules/fragile-item-inspection/fragile-item-inspection.service.spec.ts`
- Modify: `client/src/api/fragile-item-inspection.ts`
- Modify: `client/src/views/fragile-item-inspection/FragileItemInspectionList.vue`
- Do not modify: `server/src/modules/environment-record/`
- Do not modify: `server/src/modules/ccp/`
- Do not modify: `server/src/modules/non-conformance/`
- 历史 Multica GAP 调度台已退役；当前不再修改

## Task 1: Add focused service coverage

**Files:**
- Add: `server/src/modules/fragile-item-inspection/fragile-item-inspection.service.spec.ts`

- [ ] **Step 1: Create the service spec**

Create `server/src/modules/fragile-item-inspection/fragile-item-inspection.service.spec.ts` with:

```ts
import { BadRequestException } from '@nestjs/common';
import { FragileItemInspectionService } from './fragile-item-inspection.service';

describe('FragileItemInspectionService', () => {
  it('rejects creation when the production batch does not exist', async () => {
    const prisma: any = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      fragileItemInspection: {
        create: jest.fn(),
      },
    };
    const service = new FragileItemInspectionService(prisma);

    await expect(
      service.create({
        production_batch_id: 'missing-batch',
        item_name: '玻璃量杯',
        total_qty: 10,
        intact_qty: 10,
        is_pass: true,
        inspected_at: '2026-05-01T09:00:00',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-batch' },
      select: { id: true },
    });
    expect(prisma.fragileItemInspection.create).not.toHaveBeenCalled();
  });

  it('creates an inspection linked to an existing production batch', async () => {
    const prisma: any = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      fragileItemInspection: {
        create: jest.fn().mockResolvedValue({ id: 'fii-1' }),
      },
    };
    const service = new FragileItemInspectionService(prisma);

    await service.create({
      production_batch_id: 'batch-1',
      location: '生产车间A区',
      item_name: '玻璃量杯',
      total_qty: 10,
      intact_qty: 10,
      is_pass: true,
      inspected_at: '2026-05-01T09:00:00',
      inspector_id: 'user-1',
    });

    expect(prisma.fragileItemInspection.create).toHaveBeenCalledWith({
      data: {
        production_batch_id: 'batch-1',
        location: '生产车间A区',
        item_name: '玻璃量杯',
        total_qty: 10,
        intact_qty: 10,
        is_pass: true,
        inspected_at: expect.any(Date),
        inspector_id: 'user-1',
        company_id: '1',
      },
    });
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails before implementation**

```bash
(cd server && npm test -- fragile-item-inspection.service.spec.ts --runInBand)
```

Expected: FAIL because `FragileItemInspectionService.create()` has not yet checked `productionBatch.findUnique`.

## Task 2: Make the Prisma relation required

**Files:**
- Modify: `server/src/prisma/schema.prisma`

- [ ] **Step 1: Add the reverse relation to `ProductionBatch`**

In `model ProductionBatch`, directly below:

```prisma
  process_monitor_records ProcessMonitorRecord[]
  metal_detection_logs    MetalDetectionLog[]
  environment_records     EnvironmentRecord[]
```

add:

```prisma
  fragile_item_inspections FragileItemInspection[]
```

- [ ] **Step 2: Replace the nullable fragile-item batch field**

In `model FragileItemInspection`, replace:

```prisma
  production_batch_id String?
```

with:

```prisma
  production_batch_id String
  production_batch    ProductionBatch @relation(fields: [production_batch_id], references: [id], onDelete: Restrict)
```

- [ ] **Step 3: Add a batch index to `FragileItemInspection`**

Before the closing brace of `model FragileItemInspection`, add:

```prisma
  @@index([production_batch_id])
```

- [ ] **Step 4: Validate the schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

## Task 3: Add guarded migration

**Files:**
- Add: `server/src/prisma/migrations/20260501100000_require_fragile_item_inspection_batch_id/migration.sql`

- [ ] **Step 1: Create the migration SQL**

```sql
-- Require every FragileItemInspection in the quality release chain to link to a ProductionBatch.
-- This migration intentionally fails if legacy data cannot satisfy the constraint.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "FragileItemInspection" WHERE "production_batch_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require FragileItemInspection.production_batch_id: legacy rows with NULL production_batch_id exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "FragileItemInspection" fii
    LEFT JOIN "production_batches" pb ON pb."id" = fii."production_batch_id"
    WHERE pb."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add FragileItemInspection.production_batch_id FK: orphan production_batch_id rows exist';
  END IF;
END $$;

ALTER TABLE "FragileItemInspection" DROP CONSTRAINT IF EXISTS "FragileItemInspection_production_batch_id_fkey";
ALTER TABLE "FragileItemInspection" ALTER COLUMN "production_batch_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "FragileItemInspection_production_batch_id_idx"
  ON "FragileItemInspection"("production_batch_id");

ALTER TABLE "FragileItemInspection"
  ADD CONSTRAINT "FragileItemInspection_production_batch_id_fkey"
  FOREIGN KEY ("production_batch_id") REFERENCES "production_batches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 2: Do not add data backfill**

Do not write `UPDATE "FragileItemInspection" SET "production_batch_id" = ...`. If the preflight fails, stop and report.

## Task 4: Require batch ID in DTO and service

**Files:**
- Modify: `server/src/modules/fragile-item-inspection/dto/create-fragile-item-inspection.dto.ts`
- Modify: `server/src/modules/fragile-item-inspection/fragile-item-inspection.service.ts`

- [ ] **Step 1: Update DTO imports**

Replace:

```ts
import { IsString, IsOptional, IsBoolean, IsInt, IsDateString } from 'class-validator';
```

with:

```ts
import { IsString, IsOptional, IsBoolean, IsInt, IsDateString, IsNotEmpty } from 'class-validator';
```

- [ ] **Step 2: Make `production_batch_id` required**

Replace:

```ts
  @IsOptional()
  @IsString()
  production_batch_id?: string;
```

with:

```ts
  @IsString()
  @IsNotEmpty()
  production_batch_id: string;
```

- [ ] **Step 3: Update service imports**

Replace:

```ts
import { Injectable } from '@nestjs/common';
```

with:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
```

- [ ] **Step 4: Add production batch existence validation**

Replace `create()` in `server/src/modules/fragile-item-inspection/fragile-item-inspection.service.ts` with:

```ts
  async create(dto: CreateFragileItemInspectionDto) {
    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.production_batch_id },
      select: { id: true },
    });

    if (!productionBatch) {
      throw new BadRequestException('生产批次不存在');
    }

    return this.prisma.fragileItemInspection.create({
      data: {
        ...dto,
        company_id: '1',
        inspected_at: new Date(dto.inspected_at),
      },
    });
  }
```

- [ ] **Step 5: Run the focused test and verify it passes**

```bash
(cd server && npm test -- fragile-item-inspection.service.spec.ts --runInBand)
```

Expected: PASS for both `FragileItemInspectionService` tests.

## Task 5: Update the client API contract

**Files:**
- Modify: `client/src/api/fragile-item-inspection.ts`

- [ ] **Step 1: Make response `production_batch_id` non-null**

Replace:

```ts
  production_batch_id: string | null;
```

with:

```ts
  production_batch_id: string;
```

- [ ] **Step 2: Make create payload require `production_batch_id`**

Replace:

```ts
  production_batch_id?: string;
```

with:

```ts
  production_batch_id: string;
```

## Task 6: Require a production batch in the page

**Files:**
- Modify: `client/src/views/fragile-item-inspection/FragileItemInspectionList.vue`

- [ ] **Step 1: Replace the optional free-text batch input**

Replace:

```vue
        <el-form-item label="批次号">
          <el-input v-model="createForm.production_batch_id" placeholder="可选" />
        </el-form-item>
```

with:

```vue
        <el-form-item label="生产批次" prop="production_batch_id">
          <ProductionBatchSelect v-model="createForm.production_batch_id" />
        </el-form-item>
```

- [ ] **Step 2: Import the existing selector**

Below:

```ts
import fragileItemInspectionApi, { type FragileItemInspection } from '@/api/fragile-item-inspection';
```

add:

```ts
import ProductionBatchSelect from '@/components/master-data/ProductionBatchSelect.vue';
```

- [ ] **Step 3: Add required form validation**

In `createRules`, below:

```ts
  intact_qty: [{ required: true, message: '请输入完好数量', trigger: 'blur' }],
```

add:

```ts
  production_batch_id: [{ required: true, message: '请选择生产批次', trigger: 'change' }],
```

- [ ] **Step 4: Submit the required batch ID**

Replace:

```ts
      production_batch_id: createForm.production_batch_id || undefined,
```

with:

```ts
      production_batch_id: createForm.production_batch_id,
```

- [ ] **Step 5: Keep reset behavior**

Leave this reset line unchanged so the dialog starts empty and validation requires a new selection:

```ts
  createForm.production_batch_id = '';
```

## Task 7: Run verification

**Files:**
- Verify only; no edits.

- [ ] **Step 1: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

- [ ] **Step 2: Run focused backend tests**

```bash
(cd server && npm test -- fragile-item-inspection.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 3: Build the client**

```bash
npm run build -w client
```

Expected: PASS. If dependency installation is missing in the isolated worktree, install with `npm ci` at repo root first.

- [ ] **Step 4: Run repository diff check**

```bash
git diff --check
```

Expected: no output and exit code 0.

## Task 8: Commit implementation

**Files:**
- Commit only implementation files listed in this plan.

- [ ] **Step 1: Review changed files**

```bash
git status --short
```

Expected: changes only in:

```text
server/src/prisma/schema.prisma
server/src/prisma/migrations/20260501100000_require_fragile_item_inspection_batch_id/migration.sql
server/src/modules/fragile-item-inspection/dto/create-fragile-item-inspection.dto.ts
server/src/modules/fragile-item-inspection/fragile-item-inspection.service.ts
server/src/modules/fragile-item-inspection/fragile-item-inspection.service.spec.ts
client/src/api/fragile-item-inspection.ts
client/src/views/fragile-item-inspection/FragileItemInspectionList.vue
```

- [ ] **Step 2: Commit**

```bash
git add server/src/prisma/schema.prisma \
  server/src/prisma/migrations/20260501100000_require_fragile_item_inspection_batch_id/migration.sql \
  server/src/modules/fragile-item-inspection/dto/create-fragile-item-inspection.dto.ts \
  server/src/modules/fragile-item-inspection/fragile-item-inspection.service.ts \
  server/src/modules/fragile-item-inspection/fragile-item-inspection.service.spec.ts \
  client/src/api/fragile-item-inspection.ts \
  client/src/views/fragile-item-inspection/FragileItemInspectionList.vue
git commit -m "fix: require production batch for fragile item inspections"
```

Expected: one commit containing only GAP-301 implementation files.
