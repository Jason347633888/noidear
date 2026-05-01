# GAP-008 RecipeLine Area Required Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the master-data model during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make every `RecipeLine` persistently linked to one `WorkshopArea`.

**Architecture:** Add a database-level non-null/FK constraint for `recipe_lines.area_id`, guarded by migration preflight checks. Keep existing DTO/service validation, remove nullable write paths that would conflict with the stricter schema, and update focused tests that still model nullable recipe-line areas.

**Tech Stack:** Prisma schema/migration, NestJS services, class-validator DTOs, Jest.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-008 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 `WorkshopArea` 是配料区域唯一事实源，`RecipeLine.area_id` 应作为必选主数据关联；不得新增区域字符串事实源，不得自动猜测历史数据，不改 `BatchMaterialUsage.area_id` 可空性。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md、docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 如果 migration preflight 发现 `recipe_lines.area_id IS NULL` 或 orphan `area_id`，不得自动回填；停止并回报需要业务确认具体配料区域。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260501000200_require_recipe_line_area_id/migration.sql`
- Modify: `server/src/modules/product-process-change/product-process-change.service.ts`
- Modify: `server/src/modules/recipe/recipe.service.spec.ts`
- Modify: `server/src/modules/batch-trace/services/material-usage.service.spec.ts`
- Do not modify: `client/src/`
- Do not modify: `server/src/modules/batch-trace/services/material-usage.service.ts`
- Do not modify: `server/src/modules/batch-trace/services/batch-material-usage.service.ts`

## Task 1: Add regression coverage for required recipe-line area

**Files:**
- Modify: `server/src/modules/recipe/recipe.service.spec.ts`

- [ ] **Step 1: Import `BadRequestException`**

At the top of the file, replace:

```ts
import { RecipeService } from './recipe.service';
```

with:

```ts
import { BadRequestException } from '@nestjs/common';
import { RecipeService } from './recipe.service';
```

- [ ] **Step 2: Add create-path tests at the bottom of the file**

Append this block after the existing `describe('RecipeService archive behavior', ...)` block:

```ts
describe('RecipeService create area validation', () => {
  it('rejects recipe lines without an active workshop area', async () => {
    const tx: any = {
      workshopArea: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      recipe: {
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    const prisma: any = {
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const service = new RecipeService(prisma);

    await expect(
      service.create({
        product_id: 'prod-1',
        lines: [
          {
            material_id: 'mat-1',
            qty_per_batch: 10,
            unit: 'kg',
            area_id: '',
          },
        ],
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(tx.recipe.create).not.toHaveBeenCalled();
  });

  it('writes area_name_snapshot from the selected workshop area', async () => {
    const tx: any = {
      workshopArea: {
        findFirst: jest.fn().mockResolvedValue({ id: 'area-1', name: '筛粉间' }),
      },
      recipe: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue({ version: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'recipe-2' }),
      },
    };
    const prisma: any = {
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const service = new RecipeService(prisma);

    await service.create({
      product_id: 'prod-1',
      lines: [
        {
          material_id: 'mat-1',
          qty_per_batch: 10,
          unit: 'kg',
          area_id: 'area-1',
          is_critical: true,
        },
      ],
    });

    expect(tx.workshopArea.findFirst).toHaveBeenCalledWith({
      where: { id: 'area-1', company_id: '1', status: 'active', deleted_at: null },
    });
    expect(tx.recipe.create).toHaveBeenCalledWith({
      data: {
        company_id: '1',
        product_id: 'prod-1',
        version: 2,
        version_note: undefined,
        status: 'active',
        lines: {
          create: [
            {
              material_id: 'mat-1',
              qty_per_batch: 10,
              unit: 'kg',
              area_id: 'area-1',
              is_critical: true,
              area_name_snapshot: '筛粉间',
            },
          ],
        },
      },
      include: { lines: true },
    });
  });
});
```

- [ ] **Step 3: Run the focused test and verify the current behavior**

```bash
(cd server && npm test -- recipe.service.spec.ts --runInBand)
```

Expected: PASS, or a failure caused by existing include-shape drift. If an existing include-shape failure appears, update only the stale expectation in `recipe.service.spec.ts` to match the current service include shape and rerun.

## Task 2: Make RecipeLine.area_id required in Prisma

**Files:**
- Modify: `server/src/prisma/schema.prisma`

- [ ] **Step 1: Change the RecipeLine area fields**

In `model RecipeLine`, replace:

```prisma
  area_id            String?
  area               WorkshopArea? @relation("RecipeLineArea", fields: [area_id], references: [id], onDelete: SetNull)
```

with:

```prisma
  area_id            String
  area               WorkshopArea @relation("RecipeLineArea", fields: [area_id], references: [id], onDelete: Restrict)
```

- [ ] **Step 2: Keep the area index**

Leave this index unchanged:

```prisma
  @@index([area_id])
```

## Task 3: Add guarded migration

**Files:**
- Add: `server/src/prisma/migrations/20260501000200_require_recipe_line_area_id/migration.sql`

- [ ] **Step 1: Create the migration SQL**

```sql
-- Require every recipe line to link to a WorkshopArea.
-- This migration intentionally fails if legacy data cannot satisfy the constraint.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "recipe_lines" WHERE "area_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require recipe_lines.area_id: legacy rows with NULL area_id exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "recipe_lines" rl
    LEFT JOIN "workshop_areas" wa ON wa."id" = rl."area_id"
    WHERE wa."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add recipe_lines.area_id FK: orphan area_id rows exist';
  END IF;
END $$;

ALTER TABLE "recipe_lines" DROP CONSTRAINT IF EXISTS "recipe_lines_area_id_fkey";
ALTER TABLE "recipe_lines" ALTER COLUMN "area_id" SET NOT NULL;

ALTER TABLE "recipe_lines"
  ADD CONSTRAINT "recipe_lines_area_id_fkey"
  FOREIGN KEY ("area_id") REFERENCES "workshop_areas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 2: Do not add data backfill**

Do not write `UPDATE recipe_lines SET area_id = ...`. If the preflight fails, stop and report.

## Task 4: Remove nullable recipe-line writes in product process change execution

**Files:**
- Modify: `server/src/modules/product-process-change/product-process-change.service.ts`

- [ ] **Step 1: Replace nullable area assignment in `applyRecipeChange()`**

Inside `lines: { create: recipeLines.map((l) => ({ ... })) }`, replace:

```ts
            area_id: l.area_id ?? null,
            area_name_snapshot: l.area_id ? areaName.get(l.area_id) ?? null : null,
```

with:

```ts
            area_id: l.area_id!,
            area_name_snapshot: areaName.get(l.area_id!) ?? null,
```

- [ ] **Step 2: Keep validation in `validatePayload()` unchanged**

Do not remove this existing guard:

```ts
        if (!line.area_id) throw new BadRequestException('配方行配料区不能为空');
```

## Task 5: Update tests that still model nullable RecipeLine.area_id

**Files:**
- Modify: `server/src/modules/batch-trace/services/material-usage.service.spec.ts`

- [ ] **Step 1: Replace nullable recipe-line fixtures**

Replace each of the three occurrences:

```ts
const mockRecipeLine = { id: 'line-1', recipe_id: 'recipe-1', material_id: 'mat-id-1', area_id: null, area_name_snapshot: null };
```

with:

```ts
const mockRecipeLine = { id: 'line-1', recipe_id: 'recipe-1', material_id: 'mat-id-1', area_id: 'area-1', area_name_snapshot: '筛粉间' };
```

- [ ] **Step 2: Do not change material usage service behavior**

Leave `server/src/modules/batch-trace/services/material-usage.service.ts` unchanged. It should continue copying `recipeLine.area_id` and `recipeLine.area_name_snapshot` to `BatchMaterialUsage`.

## Task 6: Validate Prisma and focused tests

- [ ] **Step 1: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: Prisma schema is valid.

- [ ] **Step 2: Run focused tests**

```bash
(cd server && npm test -- recipe.service.spec.ts product-legacy.service.spec.ts product-process-change.service.spec.ts material-usage.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 3: Run server build**

```bash
npm run build:server
```

Expected: build succeeds, or report the existing unrelated blocker exactly.

## Task 7: Commit

- [ ] **Step 1: Review the diff scope**

```bash
git diff -- server/src/prisma/schema.prisma server/src/prisma/migrations/20260501000200_require_recipe_line_area_id/migration.sql server/src/modules/product-process-change/product-process-change.service.ts server/src/modules/recipe/recipe.service.spec.ts server/src/modules/batch-trace/services/material-usage.service.spec.ts
```

Expected: diff only contains the GAP-008 schema constraint, migration, nullable-write cleanup, and focused tests.

- [ ] **Step 2: Commit scoped changes**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260501000200_require_recipe_line_area_id/migration.sql server/src/modules/product-process-change/product-process-change.service.ts server/src/modules/recipe/recipe.service.spec.ts server/src/modules/batch-trace/services/material-usage.service.spec.ts
git commit -m "fix: require area on recipe lines"
```
