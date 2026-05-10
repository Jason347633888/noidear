# GAP-002/003 Production Batch Product Recipe Required Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not redesign batch numbering, packaging confirmation, or historical data remediation. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make every `ProductionBatch` persistently linked to one `Product` and one `Recipe`.

**Architecture:** Add Prisma relations and database NOT NULL/FK constraints, guarded by migration preflight checks for legacy null/orphan rows. Keep existing service creation flow, with focused tests and a small company-scope correction in confirm path.

**Tech Stack:** Prisma schema/migration, NestJS service, Jest.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-me -> writing-plans` 为 GAP-002/003 生成 spec 和本 implementation plan。
- **grill-me 校准结论：** 已确认不能只靠 DTO；ProductionBatch 是追溯核心节点，数据库必须阻止空 `productId` / `recipeId`。同时不能自动猜测历史批次，所以 migration 要先检查历史空值和 orphan 数据，发现问题直接失败。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## File Map

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/prisma/migrations/20260501_require_production_batch_product_recipe/migration.sql`
- Modify: `server/src/modules/batch-trace/services/production-batch.service.ts`
- Modify: `server/src/modules/batch-trace/services/production-batch.service.spec.ts`
- Do not modify: `client/src/`
- Do not modify: `server/src/modules/batch-trace/services/batch-number-generator.service.ts`

## Task 1: Add ProductionBatch relations in Prisma schema

**Files:**
- Modify: `server/src/prisma/schema.prisma`

- [ ] **Step 1: Change `ProductionBatch.productId` and `recipeId` to non-null**

In `model ProductionBatch`, replace:

```prisma
  productId       String? // 产品ID
  productName     String
  recipeId        String? // 配方ID
  recipeName      String?
```

with:

```prisma
  productId       String // 产品ID
  product         Product @relation(fields: [productId], references: [id], onDelete: Restrict)
  productName     String
  recipeId        String // 配方ID
  recipe          Recipe  @relation(fields: [recipeId], references: [id], onDelete: Restrict)
  recipeName      String?
```

- [ ] **Step 2: Add Product reverse relation**

In `model Product`, below `production_runs  ProductionRun[]`, add:

```prisma
  productionBatches ProductionBatch[]
```

- [ ] **Step 3: Add Recipe reverse relation**

In `model Recipe`, below `production_runs ProductionRun[]`, add:

```prisma
  productionBatches ProductionBatch[]
```

- [ ] **Step 4: Add indexes for relation lookups**

In `model ProductionBatch`, near existing indexes, add:

```prisma
  @@index([productId])
  @@index([recipeId])
```

## Task 2: Add guarded migration

**Files:**
- Add: `server/prisma/migrations/20260501_require_production_batch_product_recipe/migration.sql`

- [ ] **Step 1: Create migration SQL**

```sql
-- Require every production batch to link to Product and Recipe.
-- This migration intentionally fails if legacy data cannot satisfy the constraint.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "production_batches" WHERE "productId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require production_batches.productId: legacy rows with NULL productId exist';
  END IF;

  IF EXISTS (SELECT 1 FROM "production_batches" WHERE "recipeId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require production_batches.recipeId: legacy rows with NULL recipeId exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "production_batches" pb
    LEFT JOIN "products" p ON p."id" = pb."productId"
    WHERE p."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add production_batches.productId FK: orphan productId rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "production_batches" pb
    LEFT JOIN "recipes" r ON r."id" = pb."recipeId"
    WHERE r."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add production_batches.recipeId FK: orphan recipeId rows exist';
  END IF;
END $$;

ALTER TABLE "production_batches" ALTER COLUMN "productId" SET NOT NULL;
ALTER TABLE "production_batches" ALTER COLUMN "recipeId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "production_batches_productId_idx" ON "production_batches"("productId");
CREATE INDEX IF NOT EXISTS "production_batches_recipeId_idx" ON "production_batches"("recipeId");

ALTER TABLE "production_batches"
  ADD CONSTRAINT "production_batches_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_batches"
  ADD CONSTRAINT "production_batches_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "recipes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

## Task 3: Tighten confirm path company/product/recipe validation

**Files:**
- Modify: `server/src/modules/batch-trace/services/production-batch.service.ts`

- [ ] **Step 1: Add company scope to `confirmProductBatch()` product lookup**

Replace:

```ts
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, status: 'active', deleted_at: null },
    });
```

with:

```ts
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, company_id: '1', status: 'active', deleted_at: null },
    });
```

- [ ] **Step 2: Add company scope to `confirmProductBatch()` recipe lookup**

Replace:

```ts
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: dto.recipeId, product_id: dto.productId, status: 'active' },
    });
```

with:

```ts
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: dto.recipeId, product_id: dto.productId, company_id: '1', status: 'active' },
    });
```

## Task 4: Update focused service tests

**Files:**
- Modify: `server/src/modules/batch-trace/services/production-batch.service.spec.ts`

- [ ] **Step 1: Assert `create()` product lookup includes company scope**

In the `创建生产批次时根据产品和配方写入快照` test, after calling `service.create`, add:

```ts
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p1', company_id: '1', status: 'active', deleted_at: null },
      });
      expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', product_id: 'p1', company_id: '1', status: 'active' },
      });
```

- [ ] **Step 2: Update confirm test expectation**

In `should confirm product batch successfully`, after `const result = await service.confirmProductBatch(validDto);`, add:

```ts
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p1', company_id: '1', status: 'active', deleted_at: null },
      });
      expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', product_id: 'p1', company_id: '1', status: 'active' },
      });
```

- [ ] **Step 3: Add test for recipe belonging to another product**

Inside `describe('confirmProductBatch')`, add:

```ts
    it('should reject recipe that does not belong to the selected product', async () => {
      mockPrisma.productionBatch.findUnique.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', name: '蛋糕', status: 'active' });
      mockPrisma.recipe.findFirst.mockResolvedValue(null);

      await expect(service.confirmProductBatch(validDto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', product_id: 'p1', company_id: '1', status: 'active' },
      });
    });
```

## Task 5: Validate schema and tests

- [ ] **Step 1: Run Prisma validation**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx prisma validate --schema src/prisma/schema.prisma
```

Expected: Prisma schema is valid.

- [ ] **Step 2: Run focused service tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- production-batch.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run server build**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run build:server
```

Expected: build succeeds, or report the existing unrelated blocker exactly.

## Task 6: Commit

- [ ] **Step 1: Commit scoped changes**

```bash
git add server/src/prisma/schema.prisma server/prisma/migrations/20260501_require_production_batch_product_recipe/migration.sql server/src/modules/batch-trace/services/production-batch.service.ts server/src/modules/batch-trace/services/production-batch.service.spec.ts
git commit -m "fix: require product and recipe on production batches"
```
