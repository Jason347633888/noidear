# GAP-300 EnvironmentRecord Batch FK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the quality release model during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make every `EnvironmentRecord` persistently and explicitly linked to one `ProductionBatch`.

**Architecture:** Add a database-level non-null FK from `EnvironmentRecord.production_batch_id` to `ProductionBatch.id`, guarded by migration preflight checks. Add DTO and service validation so API callers get clear 400 errors, and change the environment-record form to use the existing production-batch selector instead of optional free text.

**Tech Stack:** Prisma schema/migration, NestJS service/DTO/controller, class-validator, Vue 3, Element Plus, Jest.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-300 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 `EnvironmentRecord` 在质量放行模块内是批次放行证据链的一部分，必须回到 `ProductionBatch`；不得新增平行批次字段、不得自动猜测历史空批次记录、不得顺手实现 GAP-301/GAP-302/GAP-305。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 如果 migration preflight 发现 `EnvironmentRecord.production_batch_id IS NULL` 或 orphan `production_batch_id`，不得自动回填；停止并回报需要业务确认具体生产批次。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260501093000_require_environment_record_batch_id/migration.sql`
- Modify: `server/src/modules/environment-record/dto/create-environment-record.dto.ts`
- Modify: `server/src/modules/environment-record/environment-record.service.ts`
- Add: `server/src/modules/environment-record/environment-record.service.spec.ts`
- Modify: `client/src/api/environment-record.ts`
- Modify: `client/src/views/environment-record/EnvironmentRecordList.vue`
- Do not modify: `server/src/modules/fragile-item-inspection/`
- Do not modify: `server/src/modules/ccp/`
- Do not modify: `server/src/modules/non-conformance/`

## Task 1: Add focused service coverage

**Files:**
- Add: `server/src/modules/environment-record/environment-record.service.spec.ts`

- [ ] **Step 1: Create the service spec**

Create `server/src/modules/environment-record/environment-record.service.spec.ts` with:

```ts
import { BadRequestException } from '@nestjs/common';
import { EnvironmentRecordService } from './environment-record.service';

describe('EnvironmentRecordService', () => {
  it('rejects creation when the production batch does not exist', async () => {
    const prisma: any = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      environmentRecord: {
        create: jest.fn(),
      },
    };
    const service = new EnvironmentRecordService(prisma);

    await expect(
      service.create(
        {
          location: '生产车间A区',
          record_type: 'temperature_humidity',
          temperature: 25.5,
          humidity: 61,
          is_within_spec: true,
          production_batch_id: 'missing-batch',
        },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-batch' },
      select: { id: true },
    });
    expect(prisma.environmentRecord.create).not.toHaveBeenCalled();
  });

  it('creates an environment record linked to an existing production batch', async () => {
    const prisma: any = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      environmentRecord: {
        create: jest.fn().mockResolvedValue({ id: 'er-1' }),
      },
    };
    const service = new EnvironmentRecordService(prisma);

    await service.create(
      {
        location: '生产车间A区',
        record_type: 'temperature_humidity',
        temperature: 25.5,
        humidity: 61,
        is_within_spec: true,
        production_batch_id: 'batch-1',
      },
      'user-1',
    );

    expect(prisma.environmentRecord.create).toHaveBeenCalledWith({
      data: {
        location: '生产车间A区',
        record_type: 'temperature_humidity',
        temperature: 25.5,
        humidity: 61,
        is_within_spec: true,
        production_batch_id: 'batch-1',
        company_id: '1',
        operator_id: 'user-1',
        measured_at: expect.any(Date),
      },
    });
  });
});
```

- [ ] **Step 2: Run the new focused test and verify it fails before implementation**

```bash
(cd server && npm test -- environment-record.service.spec.ts --runInBand)
```

Expected: FAIL because `EnvironmentRecordService.create()` has not yet checked `productionBatch.findUnique`.

## Task 2: Make the Prisma relation required

**Files:**
- Modify: `server/src/prisma/schema.prisma`

- [ ] **Step 1: Add the reverse relation to `ProductionBatch`**

In `model ProductionBatch`, directly below:

```prisma
  process_monitor_records ProcessMonitorRecord[]
  metal_detection_logs    MetalDetectionLog[]
```

add:

```prisma
  environment_records     EnvironmentRecord[]
```

- [ ] **Step 2: Replace the nullable environment-record batch field**

In `model EnvironmentRecord`, replace:

```prisma
  production_batch_id String?
```

with:

```prisma
  production_batch_id String
  production_batch    ProductionBatch @relation(fields: [production_batch_id], references: [id], onDelete: Restrict)
```

- [ ] **Step 3: Add a batch index to `EnvironmentRecord`**

Before the closing brace of `model EnvironmentRecord`, add:

```prisma
  @@index([production_batch_id])
```

## Task 3: Add guarded migration

**Files:**
- Add: `server/src/prisma/migrations/20260501093000_require_environment_record_batch_id/migration.sql`

- [ ] **Step 1: Create the migration SQL**

```sql
-- Require every EnvironmentRecord in the quality release chain to link to a ProductionBatch.
-- This migration intentionally fails if legacy data cannot satisfy the constraint.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "EnvironmentRecord" WHERE "production_batch_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require EnvironmentRecord.production_batch_id: legacy rows with NULL production_batch_id exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "EnvironmentRecord" er
    LEFT JOIN "production_batches" pb ON pb."id" = er."production_batch_id"
    WHERE pb."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add EnvironmentRecord.production_batch_id FK: orphan production_batch_id rows exist';
  END IF;
END $$;

ALTER TABLE "EnvironmentRecord" DROP CONSTRAINT IF EXISTS "EnvironmentRecord_production_batch_id_fkey";
ALTER TABLE "EnvironmentRecord" ALTER COLUMN "production_batch_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "EnvironmentRecord_production_batch_id_idx"
  ON "EnvironmentRecord"("production_batch_id");

ALTER TABLE "EnvironmentRecord"
  ADD CONSTRAINT "EnvironmentRecord_production_batch_id_fkey"
  FOREIGN KEY ("production_batch_id") REFERENCES "production_batches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 2: Do not add data backfill**

Do not write `UPDATE "EnvironmentRecord" SET "production_batch_id" = ...`. If the preflight fails, stop and report.

## Task 4: Require batch ID in DTO and service

**Files:**
- Modify: `server/src/modules/environment-record/dto/create-environment-record.dto.ts`
- Modify: `server/src/modules/environment-record/environment-record.service.ts`

- [ ] **Step 1: Update DTO imports**

Replace:

```ts
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
```

with:

```ts
import { IsString, IsOptional, IsBoolean, IsNumber, IsNotEmpty } from 'class-validator';
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

- [ ] **Step 4: Add batch existence validation in `create()`**

Replace the current `create()` method with:

```ts
  async create(dto: CreateEnvironmentRecordDto, userId: string) {
    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.production_batch_id },
      select: { id: true },
    });

    if (!productionBatch) {
      throw new BadRequestException('生产批次不存在');
    }

    return this.prisma.environmentRecord.create({
      data: {
        ...dto,
        company_id: '1',
        operator_id: userId,
        measured_at: new Date(),
      },
    });
  }
```

- [ ] **Step 5: Keep company_id unchanged**

Do not change `company_id: '1'` in this PR. Tenant isolation for this module is outside GAP-300.

## Task 5: Make the frontend require a selected production batch

**Files:**
- Modify: `client/src/api/environment-record.ts`
- Modify: `client/src/views/environment-record/EnvironmentRecordList.vue`

- [ ] **Step 1: Tighten API types**

In `client/src/api/environment-record.ts`, replace:

```ts
  production_batch_id: string | null;
```

with:

```ts
  production_batch_id: string;
```

and replace:

```ts
  production_batch_id?: string;
```

with:

```ts
  production_batch_id: string;
```

- [ ] **Step 2: Replace the optional free-text field**

In `EnvironmentRecordList.vue`, replace:

```vue
        <el-form-item label="生产批次号">
          <el-input v-model="createForm.production_batch_id" placeholder="可选" />
        </el-form-item>
```

with:

```vue
        <el-form-item label="生产批次" prop="production_batch_id">
          <ProductionBatchSelect v-model="createForm.production_batch_id" />
        </el-form-item>
```

- [ ] **Step 3: Import the existing selector**

Below the existing `import { Plus } from '@element-plus/icons-vue';`, add:

```ts
import ProductionBatchSelect from '@/components/master-data/ProductionBatchSelect.vue';
```

- [ ] **Step 4: Add the form rule**

In `createRules`, add:

```ts
  production_batch_id: [{ required: true, message: '请选择生产批次', trigger: 'change' }],
```

- [ ] **Step 5: Submit the selected batch ID directly**

In `handleCreate()`, replace:

```ts
      production_batch_id: createForm.production_batch_id || undefined,
```

with:

```ts
      production_batch_id: createForm.production_batch_id,
```

## Task 6: Run focused verification

**Files:**
- No edits unless a listed verification reveals a mismatch directly caused by this GAP.

- [ ] **Step 1: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema=src/prisma/schema.prisma)
```

Expected: PASS.

- [ ] **Step 2: Run focused service test**

```bash
(cd server && npm test -- environment-record.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 3: Run focused frontend type/build check**

```bash
npm run build:client
```

Expected: PASS. If unrelated existing client build failures appear, stop and report the exact failure.

- [ ] **Step 4: Run the GAP validation command**

```bash
pnpm test:e2e -- --grep GAP-300
```

Expected: PASS. If the repository has no `pnpm test:e2e` script in the execution environment, report that fact and include the successful Prisma/service/client checks above as the executed verification.

## Task 7: Commit only GAP-300 implementation files

**Files:**
- Commit only the files listed in this plan.

- [ ] **Step 1: Inspect changed files**

```bash
git status --short
```

Expected: only the schema, migration, environment-record service/DTO/spec, API type, and environment-record Vue page changed.

- [ ] **Step 2: Commit**

```bash
git add server/src/prisma/schema.prisma \
  server/src/prisma/migrations/20260501093000_require_environment_record_batch_id/migration.sql \
  server/src/modules/environment-record/dto/create-environment-record.dto.ts \
  server/src/modules/environment-record/environment-record.service.ts \
  server/src/modules/environment-record/environment-record.service.spec.ts \
  client/src/api/environment-record.ts \
  client/src/views/environment-record/EnvironmentRecordList.vue
git commit -m "fix: require batch link for environment records"
```
