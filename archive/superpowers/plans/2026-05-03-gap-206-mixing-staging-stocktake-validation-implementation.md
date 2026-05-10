# GAP-206 MixingService 班前盘点验证 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the production traceability model during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Before `MixingService.createExecution` deducts staging stock and creates an execution, it must verify that every material batch used in the mixing lines has an existing `StagingAreaStocktake` record of `kind = shift_start` on the same `work_date` and `shift_type_id` (when provided) with `status` in `('confirmed', 'exception')`. Missing or draft-only stocktake for any batch blocks the execution.

**Background:** `StagingAreaStocktake` records a physical count of materials in a staging area before a shift begins (班前盘点). Currently `MixingService.createExecution` validates recipe–product match, staging stock existence, material balance, and atomic stock decrement—but never checks whether a shift-start stocktake has been submitted for each batch. This allows operators to skip the mandatory pre-shift count and consume materials without an authoritative opening balance.

**Validation rule:**
- Only applied when `dto.shiftTypeId` is present (backward compatible with historical records and calls that omit shift type).
- For each unique `materialBatchId` in `dto.lines`, look up `StagingAreaStocktake` with:
  - `area_id = dto.areaId`
  - `batchId = materialBatchId`
  - `kind = 'shift_start'`
  - `work_date = new Date(dto.workDate)`
  - `shift_type_id = dto.shiftTypeId`
  - `status IN ('confirmed', 'exception')` — draft records are excluded (stocktake not yet submitted)
- If no such record found for any batch → throw `BadRequestException('物料批次 {batchId} 缺少班前盘点，请先完成班前盘点再执行配料')`.
- Both `confirmed` (zero-discrepancy) and `exception` (discrepancy logged) are accepted: the operator has submitted the count and the system has a recorded opening balance either way.

**Architecture:** Pure service-layer addition—no schema changes, no migration, no new models. The `StagingAreaStocktake` table already exists. The validation is a read-only `findFirst` inside the existing `$transaction` in `_doCreateExecution`, placed after shift-type validation and before recipe-line load.

**Tech Stack:** NestJS service, Prisma client, Jest unit tests.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `using-superpowers -> brainstorming -> writing-plans` 为 GAP-206 生成本 implementation plan。
- **校准结论：** `StagingAreaStocktake` 是班前盘点的唯一记录来源；`kind='shift_start'` 是班前盘点的唯一标识；`status IN ('confirmed','exception')` 表示盘点已提交；`draft` 表示盘点尚未提交，不能作为有效开班依据。本计划不新增表、不改 schema、不改 StagingAreaService、不改任何其他模块。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展到 GAP-204、GAP-207 或其他 GAP。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree 或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。
- **停止条件：** 如果执行 agent 发现本计划与当前代码或文档冲突，必须停止并回报主 agent。

## File Map

All commands assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/modules/mixing/mixing.service.ts`
- Modify: `server/src/modules/mixing/mixing.service.spec.ts`
- Do not modify: `server/src/prisma/schema.prisma`
- Do not modify: `server/src/modules/warehouse/`
- Do not modify: `server/src/modules/mixing/dto/mixing.dto.ts`
- Do not modify: `client/`

---

## Task 1: Add focused backend regression coverage (RED phase)

**Files:**
- Modify: `server/src/modules/mixing/mixing.service.spec.ts`

- [ ] **Step 1: Add `stagingAreaStocktake` mock to `beforeEach`**

In the `beforeEach` block where the `prisma` mock object is assembled, add a `stagingAreaStocktake` key:

```ts
      stagingAreaStocktake: {
        findFirst: jest.fn(),
      },
```

It should be placed alongside the existing `stagingAreaStock` entry.

- [ ] **Step 2: Add test — execution proceeds when shift-start stocktake is confirmed**

In `describe('createExecution', ...)`, add this test after the existing `rejects invalid shiftTypeId before decrementing staging stock` test:

```ts
    it('allows execution when shift-start stocktake is confirmed', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.shiftType.findFirst.mockResolvedValue({ id: 'shift-day', active: true });
      prisma.stagingAreaStocktake.findFirst.mockResolvedValue({
        id: 'stocktake-1',
        status: 'confirmed',
        kind: 'shift_start',
      });
      prisma.recipeLine.findMany.mockResolvedValue([
        { id: 'line-flour', material_id: 'mat-flour', qty_per_batch: 50 },
      ]);
      prisma.mixingExecution.count.mockResolvedValue(0);
      prisma.mixingExecution.create.mockResolvedValue({ id: 'mix-1' });
      prisma.stagingAreaStock.findFirst.mockResolvedValue({
        id: 'stock-1',
        batchId: 'mb-old',
        quantity: 80,
        batch: { materialId: 'mat-flour' },
      });
      prisma.stagingAreaStock.updateMany.mockResolvedValue({ count: 1 });
      prisma.mixingExecution.findUnique.mockResolvedValue({ id: 'mix-1', shift_type_id: 'shift-day', lines: [] });

      await expect(
        service.createExecution({
          recipeId: 'recipe-1',
          productId: 'product-1',
          areaId: 'area-small',
          shiftTypeId: 'shift-day',
          workDate: '2026-05-03',
          actualWeight: 50,
          lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
        }),
      ).resolves.toBeDefined();

      expect(prisma.stagingAreaStocktake.findFirst).toHaveBeenCalledWith({
        where: {
          area_id: 'area-small',
          batchId: 'mb-old',
          kind: 'shift_start',
          work_date: expect.any(Date),
          shift_type_id: 'shift-day',
          status: { in: ['confirmed', 'exception'] },
        },
        select: { id: true },
      });
    });
```

- [ ] **Step 3: Add test — execution proceeds when stocktake has exception status**

```ts
    it('allows execution when shift-start stocktake is exception (discrepancy logged)', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.shiftType.findFirst.mockResolvedValue({ id: 'shift-day', active: true });
      prisma.stagingAreaStocktake.findFirst.mockResolvedValue({
        id: 'stocktake-1',
        status: 'exception',
        kind: 'shift_start',
      });
      prisma.recipeLine.findMany.mockResolvedValue([
        { id: 'line-flour', material_id: 'mat-flour', qty_per_batch: 50 },
      ]);
      prisma.mixingExecution.count.mockResolvedValue(0);
      prisma.mixingExecution.create.mockResolvedValue({ id: 'mix-1' });
      prisma.stagingAreaStock.findFirst.mockResolvedValue({
        id: 'stock-1',
        batchId: 'mb-old',
        quantity: 80,
        batch: { materialId: 'mat-flour' },
      });
      prisma.stagingAreaStock.updateMany.mockResolvedValue({ count: 1 });
      prisma.mixingExecution.findUnique.mockResolvedValue({ id: 'mix-1', lines: [] });

      await expect(
        service.createExecution({
          recipeId: 'recipe-1',
          productId: 'product-1',
          areaId: 'area-small',
          shiftTypeId: 'shift-day',
          workDate: '2026-05-03',
          actualWeight: 50,
          lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
        }),
      ).resolves.toBeDefined();
    });
```

- [ ] **Step 4: Add test — execution blocked when no shift-start stocktake exists**

```ts
    it('blocks execution when shift-start stocktake is missing for a batch', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.shiftType.findFirst.mockResolvedValue({ id: 'shift-day', active: true });
      prisma.stagingAreaStocktake.findFirst.mockResolvedValue(null); // no stocktake

      await expect(
        service.createExecution({
          recipeId: 'recipe-1',
          productId: 'product-1',
          areaId: 'area-small',
          shiftTypeId: 'shift-day',
          workDate: '2026-05-03',
          actualWeight: 50,
          lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-missing', actualQuantity: 50, manualOverride: false }],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.recipeLine.findMany).not.toHaveBeenCalled();
      expect(prisma.stagingAreaStock.updateMany).not.toHaveBeenCalled();
      expect(prisma.mixingExecution.create).not.toHaveBeenCalled();
    });
```

- [ ] **Step 5: Add test — validation skipped when no shiftTypeId**

```ts
    it('skips stocktake validation when shiftTypeId is not provided', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.recipeLine.findMany.mockResolvedValue([
        { id: 'line-flour', material_id: 'mat-flour', qty_per_batch: 50 },
      ]);
      prisma.mixingExecution.count.mockResolvedValue(0);
      prisma.mixingExecution.create.mockResolvedValue({ id: 'mix-1' });
      prisma.stagingAreaStock.findFirst.mockResolvedValue({
        id: 'stock-1',
        batchId: 'mb-old',
        quantity: 80,
        batch: { materialId: 'mat-flour' },
      });
      prisma.stagingAreaStock.updateMany.mockResolvedValue({ count: 1 });
      prisma.mixingExecution.findUnique.mockResolvedValue({ id: 'mix-1', lines: [] });

      await expect(
        service.createExecution({
          recipeId: 'recipe-1',
          productId: 'product-1',
          areaId: 'area-small',
          // shiftTypeId intentionally omitted
          workDate: '2026-05-03',
          actualWeight: 50,
          lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
        }),
      ).resolves.toBeDefined();

      expect(prisma.stagingAreaStocktake.findFirst).not.toHaveBeenCalled();
    });
```

- [ ] **Step 6: Add test — blocks only for the batch missing stocktake when multiple batches used**

```ts
    it('blocks when one of multiple batches is missing a shift-start stocktake', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.shiftType.findFirst.mockResolvedValue({ id: 'shift-day', active: true });
      prisma.stagingAreaStocktake.findFirst
        .mockResolvedValueOnce({ id: 'stocktake-1', status: 'confirmed' }) // first batch ok
        .mockResolvedValueOnce(null); // second batch missing

      await expect(
        service.createExecution({
          recipeId: 'recipe-1',
          productId: 'product-1',
          areaId: 'area-small',
          shiftTypeId: 'shift-day',
          workDate: '2026-05-03',
          actualWeight: 100,
          lines: [
            { recipeLineId: 'line-flour', materialBatchId: 'mb-1', actualQuantity: 50, manualOverride: false },
            { recipeLineId: 'line-sugar', materialBatchId: 'mb-2', actualQuantity: 50, manualOverride: false },
          ],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.mixingExecution.create).not.toHaveBeenCalled();
    });
```

- [ ] **Step 7: Run focused tests and verify current failures**

```bash
(cd server && npm test -- mixing.service.spec.ts --runInBand)
```

Expected: The 5 new tests FAIL because `MixingService` does not yet perform stocktake validation. The existing tests should still PASS.

---

## Task 2: Implement stocktake validation in MixingService (GREEN phase)

**Files:**
- Modify: `server/src/modules/mixing/mixing.service.ts`

- [ ] **Step 1: Add stocktake validation block in `_doCreateExecution`**

In `_doCreateExecution()`, after the `shiftTypeId` validation block (which ends at `}`), and before `const recipeLines = await tx.recipeLine.findMany(...)`, add:

```ts
        if (dto.shiftTypeId) {
          const uniqueBatchIds = [...new Set(dto.lines.map((l) => l.materialBatchId))];
          for (const batchId of uniqueBatchIds) {
            const stocktake = await tx.stagingAreaStocktake.findFirst({
              where: {
                area_id: dto.areaId,
                batchId,
                kind: 'shift_start',
                work_date: new Date(dto.workDate),
                shift_type_id: dto.shiftTypeId,
                status: { in: ['confirmed', 'exception'] },
              },
              select: { id: true },
            });
            if (!stocktake) {
              throw new BadRequestException(`物料批次 ${batchId} 缺少班前盘点，请先完成班前盘点再执行配料`);
            }
          }
        }
```

The insertion point in context:

```ts
        if (dto.shiftTypeId) {
          const shiftType = await tx.shiftType.findFirst({
            where: { id: dto.shiftTypeId, active: true },
            select: { id: true },
          });
          if (!shiftType) {
            throw new BadRequestException('班次类型不存在或已停用');
          }
        }

        // ← INSERT the stocktake validation block HERE

        const recipeLines = await tx.recipeLine.findMany({
```

- [ ] **Step 2: Run focused tests and verify all pass**

```bash
(cd server && npm test -- mixing.service.spec.ts --runInBand)
```

Expected: ALL tests PASS, including the 5 new stocktake tests and all pre-existing tests.

---

## Task 3: Final verification and commit

- [ ] **Step 1: Run full mixing service test suite**

```bash
(cd server && npm test -- mixing.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 2: Run schema validation (no schema changes, must stay valid)**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS — `The schema at src/prisma/schema.prisma is valid`.

- [ ] **Step 3: Build server to verify TypeScript**

```bash
npm run build:server
```

Expected: PASS. If unrelated type errors appear, report them without fixing unrelated files.

- [ ] **Step 4: Inspect the final diff**

```bash
git diff -- server/src/modules/mixing/mixing.service.ts server/src/modules/mixing/mixing.service.spec.ts
```

Expected: Diff only touches these two files. No schema changes, no DTO changes, no client changes, no other modules.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/mixing/mixing.service.ts \
        server/src/modules/mixing/mixing.service.spec.ts
git commit -m "fix: block mixing execution when shift-start stocktake is missing (GAP-206)"
```

Expected: One focused commit. PR must state it used `superpowers:executing-plans`.
