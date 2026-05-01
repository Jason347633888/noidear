# GAP-203 PackagingMaterialUsage Batch FK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the production traceability model during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make every `PackagingMaterialUsage` persistently and explicitly linked to one `ProductionBatch`.

**Architecture:** Add a database-level non-null FK from `PackagingMaterialUsage.production_batch_id` to `ProductionBatch.id`, guarded by migration preflight checks. Add DTO and service validation so API callers get clear 400/404 business errors, and tighten the existing packaging-material-usage form so it must submit a selected production batch.

**Tech Stack:** Prisma schema/migration, NestJS service/DTO/controller, class-validator, Vue 3, Element Plus, Jest.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-203 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 `PackagingMaterialUsage` 是 `ProductionBatch -> PackagingMaterialUsage -> Material` 批次追溯链的一部分；不得新增平行批次字段、不得新增包材主数据、不得自动猜测历史空批次记录。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 如果 migration preflight 发现 `PackagingMaterialUsage.production_batch_id IS NULL` 或 orphan `production_batch_id`，不得自动回填；停止并回报需要业务确认具体生产批次。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260501103000_require_packaging_material_usage_batch_id/migration.sql`
- Modify: `server/src/modules/packaging-material-usage/dto/create-packaging-material-usage.dto.ts`
- Modify: `server/src/modules/packaging-material-usage/packaging-material-usage.service.ts`
- Add: `server/src/modules/packaging-material-usage/packaging-material-usage.service.spec.ts`
- Modify: `client/src/api/packaging-material-usage.ts`
- Modify: `client/src/views/packaging-material-usage/PackagingMaterialUsageList.vue`
- Do not modify: `server/src/modules/mixing/`
- Do not modify: `server/src/modules/batch-trace/`
- Do not modify: `server/src/modules/warehouse/`
- Do not modify: `server/src/modules/traceability/`

## Task 1: Add focused service coverage

**Files:**
- Add: `server/src/modules/packaging-material-usage/packaging-material-usage.service.spec.ts`

- [ ] **Step 1: Create the service spec**

Create `server/src/modules/packaging-material-usage/packaging-material-usage.service.spec.ts` with:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PackagingMaterialUsageService } from './packaging-material-usage.service';

describe('PackagingMaterialUsageService', () => {
  const activeMaterial = {
    id: 'mat-1',
    name: '包装膜',
    materialCode: 'PM-001',
    unit: 'kg',
  };

  it('rejects creation when production_batch_id is missing', async () => {
    const prisma: any = {
      material: {
        findFirst: jest.fn().mockResolvedValue(activeMaterial),
      },
      productionBatch: {
        findUnique: jest.fn(),
      },
      packagingMaterialUsage: {
        create: jest.fn(),
      },
    };
    const service = new PackagingMaterialUsageService(prisma);

    await expect(
      service.create({
        material_id: 'mat-1',
        used_weight: 12.5,
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.productionBatch.findUnique).not.toHaveBeenCalled();
    expect(prisma.packagingMaterialUsage.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the production batch does not exist', async () => {
    const prisma: any = {
      material: {
        findFirst: jest.fn().mockResolvedValue(activeMaterial),
      },
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      packagingMaterialUsage: {
        create: jest.fn(),
      },
    };
    const service = new PackagingMaterialUsageService(prisma);

    await expect(
      service.create({
        material_id: 'mat-1',
        production_batch_id: 'missing-batch',
        used_weight: 12.5,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-batch' },
      select: { id: true },
    });
    expect(prisma.packagingMaterialUsage.create).not.toHaveBeenCalled();
  });

  it('creates a packaging material usage linked to an existing production batch', async () => {
    const prisma: any = {
      material: {
        findFirst: jest.fn().mockResolvedValue(activeMaterial),
      },
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      packagingMaterialUsage: {
        create: jest.fn().mockResolvedValue({ id: 'pmu-1' }),
      },
    };
    const service = new PackagingMaterialUsageService(prisma);

    await service.create({
      material_id: 'mat-1',
      production_batch_id: 'batch-1',
      used_weight: 12.5,
      waste_weight: 0.2,
      unit: 'kg',
      usage_date: '2026-05-01T08:30:00.000Z',
      operator_id: 'user-1',
      notes: '包装线A',
    });

    expect(prisma.packagingMaterialUsage.create).toHaveBeenCalledWith({
      data: {
        company_id: '1',
        production_batch_id: 'batch-1',
        material_id: 'mat-1',
        material_name: '包装膜',
        material_code: 'PM-001',
        used_weight: 12.5,
        waste_weight: 0.2,
        unit: 'kg',
        usage_date: new Date('2026-05-01T08:30:00.000Z'),
        operator_id: 'user-1',
        notes: '包装线A',
      },
    });
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails before implementation**

```bash
(cd server && npm test -- packaging-material-usage.service.spec.ts --runInBand)
```

Expected: FAIL because `PackagingMaterialUsageService.create()` currently allows a missing `production_batch_id`.

## Task 2: Make the Prisma relation required

**Files:**
- Modify: `server/src/prisma/schema.prisma`

- [ ] **Step 1: Add the reverse relation to `ProductionBatch`**

In `model ProductionBatch`, directly below:

```prisma
  aggregations     BatchMixingAggregation[]
```

add:

```prisma
  packagingMaterialUsages PackagingMaterialUsage[]
```

- [ ] **Step 2: Replace the nullable packaging-usage batch field**

In `model PackagingMaterialUsage`, replace:

```prisma
  production_batch_id String?
```

with:

```prisma
  production_batch_id String
  production_batch    ProductionBatch @relation(fields: [production_batch_id], references: [id], onDelete: Restrict)
```

- [ ] **Step 3: Add a batch index to `PackagingMaterialUsage`**

Before the closing brace of `model PackagingMaterialUsage`, keep the existing material index and add the production batch index:

```prisma
  @@index([production_batch_id])
  @@index([material_id])
```

## Task 3: Add guarded migration

**Files:**
- Add: `server/src/prisma/migrations/20260501103000_require_packaging_material_usage_batch_id/migration.sql`

- [ ] **Step 1: Create the migration SQL**

```sql
-- Require every PackagingMaterialUsage in the production traceability chain to link to a ProductionBatch.
-- This migration intentionally fails if legacy data cannot satisfy the constraint.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "PackagingMaterialUsage" WHERE "production_batch_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require PackagingMaterialUsage.production_batch_id: legacy rows with NULL production_batch_id exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PackagingMaterialUsage" pmu
    LEFT JOIN "production_batches" pb ON pb."id" = pmu."production_batch_id"
    WHERE pb."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add PackagingMaterialUsage.production_batch_id FK: orphan production_batch_id rows exist';
  END IF;
END $$;

ALTER TABLE "PackagingMaterialUsage" DROP CONSTRAINT IF EXISTS "PackagingMaterialUsage_production_batch_id_fkey";
ALTER TABLE "PackagingMaterialUsage" ALTER COLUMN "production_batch_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "PackagingMaterialUsage_production_batch_id_idx"
  ON "PackagingMaterialUsage"("production_batch_id");

ALTER TABLE "PackagingMaterialUsage"
  ADD CONSTRAINT "PackagingMaterialUsage_production_batch_id_fkey"
  FOREIGN KEY ("production_batch_id") REFERENCES "production_batches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 2: Do not add data backfill**

Do not write `UPDATE "PackagingMaterialUsage" SET "production_batch_id" = ...`. If the preflight fails, stop and report.

## Task 4: Require batch ID in DTO and service

**Files:**
- Modify: `server/src/modules/packaging-material-usage/dto/create-packaging-material-usage.dto.ts`
- Modify: `server/src/modules/packaging-material-usage/packaging-material-usage.service.ts`

- [ ] **Step 1: Make `production_batch_id` required**

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

- [ ] **Step 2: Add an explicit missing-batch guard in the service**

In `PackagingMaterialUsageService.create()`, replace:

```ts
    if (dto.production_batch_id) {
      const batch = await this.prisma.productionBatch.findUnique({
        where: { id: dto.production_batch_id },
        select: { id: true },
      });
      if (!batch) throw new NotFoundException('生产批次不存在');
    }
```

with:

```ts
    if (!dto.production_batch_id) {
      throw new BadRequestException('生产批次不能为空');
    }

    const batch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.production_batch_id },
      select: { id: true },
    });
    if (!batch) throw new NotFoundException('生产批次不存在');
```

- [ ] **Step 3: Run the focused service test**

```bash
(cd server && npm test -- packaging-material-usage.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 5: Tighten client API and form contract

**Files:**
- Modify: `client/src/api/packaging-material-usage.ts`
- Modify: `client/src/views/packaging-material-usage/PackagingMaterialUsageList.vue`

- [ ] **Step 1: Update API types**

In `client/src/api/packaging-material-usage.ts`, replace:

```ts
  production_batch_id: string | null;
```

with:

```ts
  production_batch_id: string;
```

Then replace the `CreatePackagingMaterialUsagePayload` interface with:

```ts
export interface CreatePackagingMaterialUsagePayload {
  material_id: string;
  production_batch_id: string;
  used_weight?: number;
  waste_weight?: number;
  unit?: string;
  usage_date?: string;
  operator_id?: string;
  notes?: string;
}
```

- [ ] **Step 2: Update form validation rules**

In `client/src/views/packaging-material-usage/PackagingMaterialUsageList.vue`, replace:

```ts
const formRules: FormRules = {
  material_name: [{ required: true, message: '请选择物料', trigger: 'change' }],
};
```

with:

```ts
const formRules: FormRules = {
  material_id: [{ required: true, message: '请选择物料', trigger: 'change' }],
  production_batch_id: [{ required: true, message: '请选择生产批次', trigger: 'change' }],
};
```

- [ ] **Step 3: Bind form items to the required properties**

In the template, replace:

```vue
        <el-form-item label="物料" prop="material_name">
          <MaterialSelect v-model="form.material_id" />
        </el-form-item>
        <el-form-item label="生产批次">
          <ProductionBatchSelect v-model="form.production_batch_id" />
        </el-form-item>
```

with:

```vue
        <el-form-item label="物料" prop="material_id">
          <MaterialSelect v-model="form.material_id" />
        </el-form-item>
        <el-form-item label="生产批次" prop="production_batch_id">
          <ProductionBatchSelect v-model="form.production_batch_id" />
        </el-form-item>
```

- [ ] **Step 4: Submit `material_id` and required `production_batch_id`**

In `handleCreate()`, replace:

```ts
    await packagingMaterialUsageApi.create({
      material_name: form.material_name || form.material_id,
      material_code: form.material_code || undefined,
      production_batch_id: form.production_batch_id || undefined,
      used_weight: form.used_weight,
      waste_weight: form.waste_weight,
      unit: form.unit || undefined,
      usage_date: form.usage_date || undefined,
      operator_id: form.operator_id || undefined,
      notes: form.notes || undefined,
    });
```

with:

```ts
    await packagingMaterialUsageApi.create({
      material_id: form.material_id,
      production_batch_id: form.production_batch_id,
      used_weight: form.used_weight,
      waste_weight: form.waste_weight,
      unit: form.unit || undefined,
      usage_date: form.usage_date || undefined,
      operator_id: form.operator_id || undefined,
      notes: form.notes || undefined,
    });
```

- [ ] **Step 5: Run a client type check or build**

```bash
npm run build:client
```

Expected: PASS. If this repository does not have a working client build in the execution environment, run the nearest existing client type-check/build command and report the exact command and result.

## Task 6: Validate Prisma and full targeted checks

**Files:**
- No file changes.

- [ ] **Step 1: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: `The schema at src/prisma/schema.prisma is valid`.

- [ ] **Step 2: Regenerate Prisma client if the repository requires generated type updates**

```bash
(cd server && npm run prisma:generate)
```

Expected: Prisma Client generation succeeds. Do not commit generated dependency folders.

- [ ] **Step 3: Re-run focused service test**

```bash
(cd server && npm test -- packaging-material-usage.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 4: Run the GAP acceptance command**

```bash
npm run test:e2e -w client -- --grep GAP-203
```

Expected: PASS if the repository has a matching GAP-203 E2E target. If the command is unavailable or no GAP-203 E2E exists, do not install pnpm; report the exact npm command result and the successful substitute checks from Steps 1-3 plus `npm run build:client`.

- [ ] **Step 5: Inspect the final diff**

```bash
git diff -- server/src/prisma/schema.prisma server/src/modules/packaging-material-usage client/src/api/packaging-material-usage.ts client/src/views/packaging-material-usage/PackagingMaterialUsageList.vue
```

Expected: diff only contains GAP-203 changes described in this plan.

- [ ] **Step 6: Commit implementation changes**

```bash
git add server/src/prisma/schema.prisma \
  server/src/prisma/migrations/20260501103000_require_packaging_material_usage_batch_id/migration.sql \
  server/src/modules/packaging-material-usage \
  client/src/api/packaging-material-usage.ts \
  client/src/views/packaging-material-usage/PackagingMaterialUsageList.vue
git commit -m "fix: require batch link for packaging material usage"
```

Expected: one implementation commit containing only GAP-203 code/schema/test changes.
