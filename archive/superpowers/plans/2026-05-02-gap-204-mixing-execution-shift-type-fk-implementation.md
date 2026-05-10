# GAP-204 MixingExecution ShiftType FK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the production traceability model during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make `MixingExecution.shift_type_id` a real optional FK to `ShiftType` and let new配料执行 records persist a selected班次类型.

**Architecture:** Add the Prisma relation and guarded migration first, then extend the mixing API DTO/service contract with optional `shiftTypeId`, and finally expose a班次类型 select in the mixing workbench. Keep the field optional for historical records and compatibility; only validate when callers submit a value.

**Tech Stack:** Prisma schema/migration, NestJS DTO/service, class-validator, Jest, Vue 3, Element Plus, TypeScript API adapters, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `using-superpowers -> using-git-worktrees -> brainstorming -> grill-with-docs -> writing-plans` 为 GAP-204 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 `ShiftType` 是班次类型唯一事实源；`MixingExecution.shift_type_id` 不能继续作为无约束裸字符串；本计划不新增平行班次主数据，不改变 ProductionBatch、MaterialBatch、BatchMaterialUsage、InventoryMovement 主链。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展到 GAP-206 盘点阻断、GAP-207 班组自动排班、BatchMixingAggregation 多对多重构或租户隔离。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 如果 migration preflight 发现非空 `mixing_executions.shift_type_id` 无法匹配 `shift_types.id`，不得自动清空或猜测映射；停止并回报需要业务确认。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502110000_add_mixing_execution_shift_type_fk/migration.sql`
- Modify: `server/src/modules/mixing/dto/mixing.dto.ts`
- Modify: `server/src/modules/mixing/mixing.service.ts`
- Modify: `server/src/modules/mixing/mixing.service.spec.ts`
- Modify: `client/src/api/mixing.ts`
- Modify: `client/src/views/mixing/MixingWorkbench.vue`
- Do not modify: `server/src/modules/shift-instance/`
- Do not modify: `server/src/modules/batch-trace/`
- Do not modify: `server/src/modules/warehouse/`
- Do not modify: `server/src/modules/traceability/`

## Task 1: Add focused backend regression coverage

**Files:**
- Modify: `server/src/modules/mixing/mixing.service.spec.ts`

- [ ] **Step 1: Add a `shiftType` mock**

In the `beforeEach` mock Prisma object, add `shiftType.findFirst`:

```ts
      shiftType: { findFirst: jest.fn() },
      recipe: { findFirst: jest.fn() },
```

- [ ] **Step 2: Verify createExecution persists a submitted shift type**

In `describe('createExecution', ...)`, add this test after `deducts stock and creates execution lines`:

```ts
    it('validates and persists shiftTypeId when provided', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.recipeLine.findMany.mockResolvedValue([
        { id: 'line-flour', material_id: 'mat-flour', qty_per_batch: 50 },
      ]);
      prisma.shiftType.findFirst.mockResolvedValue({ id: 'shift-day', active: true, name: '白班' });
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

      await service.createExecution({
        recipeId: 'recipe-1',
        productId: 'product-1',
        areaId: 'area-small',
        shiftTypeId: 'shift-day',
        workDate: '2026-05-02',
        actualWeight: 50,
        lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
      });

      expect(prisma.shiftType.findFirst).toHaveBeenCalledWith({
        where: { id: 'shift-day', active: true },
        select: { id: true },
      });
      expect(prisma.mixingExecution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shift_type_id: 'shift-day',
        }),
      });
    });
```

- [ ] **Step 3: Verify invalid shift type fails before stock decrement**

Add this test after the previous test:

```ts
    it('rejects invalid shiftTypeId before decrementing staging stock', async () => {
      prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
      prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', product_id: 'product-1', status: 'active' });
      prisma.shiftType.findFirst.mockResolvedValue(null);

      await expect(service.createExecution({
        recipeId: 'recipe-1',
        productId: 'product-1',
        areaId: 'area-small',
        shiftTypeId: 'missing-shift',
        workDate: '2026-05-02',
        actualWeight: 50,
        lines: [{ recipeLineId: 'line-flour', materialBatchId: 'mb-old', actualQuantity: 50, manualOverride: false }],
      })).rejects.toThrow(BadRequestException);

      expect(prisma.recipeLine.findMany).not.toHaveBeenCalled();
      expect(prisma.stagingAreaStock.updateMany).not.toHaveBeenCalled();
      expect(prisma.mixingExecution.create).not.toHaveBeenCalled();
    });
```

- [ ] **Step 4: Run the focused test and verify current failure**

```bash
(cd server && npm test -- mixing.service.spec.ts --runInBand)
```

Expected: FAIL because `CreateMixingExecutionDto` does not yet define `shiftTypeId`, and `MixingService.createExecution()` does not validate or persist it.

## Task 2: Add the Prisma relation and guarded migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502110000_add_mixing_execution_shift_type_fk/migration.sql`

- [ ] **Step 1: Add the reverse relation on `ShiftType`**

In `model ShiftType`, replace:

```prisma
  shiftInstances ShiftInstance[]
```

with:

```prisma
  shiftInstances  ShiftInstance[]
  mixingExecutions MixingExecution[]
```

- [ ] **Step 2: Add the relation to `MixingExecution`**

In `model MixingExecution`, directly below the existing `area` relation:

```prisma
  area           WorkshopArea          @relation(fields: [area_id], references: [id])
```

add:

```prisma
  shift_type     ShiftType?            @relation(fields: [shift_type_id], references: [id], onDelete: SetNull)
```

- [ ] **Step 3: Add the shift type index**

In `model MixingExecution`, replace:

```prisma
  @@index([work_date, area_id])
  @@index([recipeId])
```

with:

```prisma
  @@index([work_date, area_id])
  @@index([recipeId])
  @@index([shift_type_id])
```

- [ ] **Step 4: Create migration SQL**

Create `server/src/prisma/migrations/20260502110000_add_mixing_execution_shift_type_fk/migration.sql` with:

```sql
-- Link MixingExecution.shift_type_id to ShiftType without guessing historical values.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "mixing_executions" me
    LEFT JOIN "shift_types" st ON st."id" = me."shift_type_id"
    WHERE me."shift_type_id" IS NOT NULL
      AND st."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add MixingExecution.shift_type_id FK: orphan shift_type_id rows exist';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "mixing_executions_shift_type_id_idx"
  ON "mixing_executions"("shift_type_id");

ALTER TABLE "mixing_executions"
  ADD CONSTRAINT "mixing_executions_shift_type_id_fkey"
  FOREIGN KEY ("shift_type_id") REFERENCES "shift_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 5: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

## Task 3: Extend the mixing API contract and service logic

**Files:**
- Modify: `server/src/modules/mixing/dto/mixing.dto.ts`
- Modify: `server/src/modules/mixing/mixing.service.ts`

- [ ] **Step 1: Add `shiftTypeId` to DTOs**

In `ListMixingExecutionsDto`, add:

```ts
  @IsOptional() @IsString() shiftTypeId?: string;
```

In `CreateMixingExecutionDto`, add directly after `areaId`:

```ts
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shiftTypeId?: string;
```

- [ ] **Step 2: Add list filtering and include shift type**

In `MixingService.listExecutions()`, add this where clause entry:

```ts
        ...(dto.shiftTypeId && { shift_type_id: dto.shiftTypeId }),
```

Replace the include with:

```ts
      include: {
        area: true,
        shift_type: true,
        lines: { include: { material: true, materialBatch: true } },
      },
```

- [ ] **Step 3: Validate submitted shift type inside the transaction**

In `_doCreateExecution()`, after the recipe check and before fetching recipe lines, add:

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
```

- [ ] **Step 4: Persist `shift_type_id` during create**

In the `tx.mixingExecution.create({ data: { ... } })` block, add:

```ts
            shift_type_id: dto.shiftTypeId,
```

directly after:

```ts
            area_id: dto.areaId,
```

- [ ] **Step 5: Include shift type in the returned execution**

At the end of `_doCreateExecution()`, replace:

```ts
          include: { lines: true },
```

with:

```ts
          include: { shift_type: true, lines: true },
```

- [ ] **Step 6: Run focused backend tests**

```bash
(cd server && npm test -- mixing.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 4: Send shiftTypeId from the mixing workbench

**Files:**
- Modify: `client/src/api/mixing.ts`
- Modify: `client/src/views/mixing/MixingWorkbench.vue`

- [ ] **Step 1: Extend the client payload type**

In `CreateMixingExecutionPayload`, add:

```ts
  shiftTypeId?: string;
```

after:

```ts
  areaId: string;
```

- [ ] **Step 2: Import the existing team-shift API**

In `MixingWorkbench.vue`, add:

```ts
import { teamShiftApi } from '@/api/team-shift';
```

after the existing API imports.

- [ ] **Step 3: Add local shift type state**

After:

```ts
const areas = ref<WorkshopArea[]>([]);
```

add:

```ts
const shiftTypes = ref<any[]>([]);
```

In the `form` object, add:

```ts
  shiftTypeId: '',
```

after:

```ts
  areaId: '',
```

- [ ] **Step 4: Add a班次类型 selector**

In the template, directly after the配料区 `<el-form-item>`, add:

```vue
        <el-form-item label="班次类型">
          <el-select v-model="form.shiftTypeId" placeholder="选择班次类型（可选）" style="width: 100%" clearable>
            <el-option
              v-for="shiftType in shiftTypes"
              :key="shiftType.id"
              :label="`${shiftType.name} ${shiftType.start_time}-${shiftType.end_time}`"
              :value="shiftType.id"
            />
          </el-select>
        </el-form-item>
```

- [ ] **Step 5: Submit `shiftTypeId` only when selected**

In the `mixingApi.createExecution({ ... })` payload, add:

```ts
      ...(form.value.shiftTypeId ? { shiftTypeId: form.value.shiftTypeId } : {}),
```

after:

```ts
      areaId: form.value.areaId,
```

- [ ] **Step 6: Load shift types on mount**

In `onMounted(async () => { ... })`, where products and areas are loaded, also load shift types with this pattern:

```ts
    const shiftRes: any = await teamShiftApi.listShiftTypes();
    shiftTypes.value = Array.isArray(shiftRes.data) ? shiftRes.data : (Array.isArray(shiftRes) ? shiftRes : []);
```

If the current `onMounted` implementation uses `Promise.all`, include `teamShiftApi.listShiftTypes()` in that `Promise.all` and assign `shiftTypes.value` using the same response normalization.

- [ ] **Step 7: Build the client**

```bash
npm run build:client
```

Expected: PASS. If Vue type checking fails in unrelated files, stop and report the exact errors; do not expand this GAP.

## Task 5: Final verification and commit

**Files:**
- Verify only the files listed in the File Map.

- [ ] **Step 1: Run schema validation**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS.

- [ ] **Step 2: Run focused service tests**

```bash
(cd server && npm test -- mixing.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 3: Run client build**

```bash
npm run build:client
```

Expected: PASS.

- [ ] **Step 4: Check for GAP-204 E2E availability**

```bash
rg -n "GAP-204|mixing.*shiftType|shiftTypeId" client/tests client/e2e e2e tests 2>/dev/null
```

Expected: If no GAP-204 E2E exists, report `GAP-204 E2E 未配置，已用 Prisma validate + mixing service Jest + client build 作为替代验证`. Do not invent a pnpm command.

- [ ] **Step 5: Inspect the final diff**

```bash
git diff -- server/src/prisma/schema.prisma server/src/prisma/migrations/20260502110000_add_mixing_execution_shift_type_fk/migration.sql server/src/modules/mixing/dto/mixing.dto.ts server/src/modules/mixing/mixing.service.ts server/src/modules/mixing/mixing.service.spec.ts client/src/api/mixing.ts client/src/views/mixing/MixingWorkbench.vue
```

Expected: Diff only touches GAP-204 files and does not modify unrelated GAPs.

- [ ] **Step 6: Commit**

```bash
git add server/src/prisma/schema.prisma \
  server/src/prisma/migrations/20260502110000_add_mixing_execution_shift_type_fk/migration.sql \
  server/src/modules/mixing/dto/mixing.dto.ts \
  server/src/modules/mixing/mixing.service.ts \
  server/src/modules/mixing/mixing.service.spec.ts \
  client/src/api/mixing.ts \
  client/src/views/mixing/MixingWorkbench.vue
git commit -m "fix: link mixing execution to shift type"
```

Expected: One implementation commit. The execution PR must state it used only `superpowers:executing-plans`.
