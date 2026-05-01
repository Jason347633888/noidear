# GAP-200 ShiftInstance ShiftType FK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the master-data model during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make every `ShiftInstance` persistently linked to `ShiftType` while preserving the legacy `shift_type` text snapshot during the migration window.

**Architecture:** Add a required `shift_type_id` FK on `ShiftInstance`, backfill it from legacy `shift_type` values through a guarded migration, and move create/read flows to the `ShiftType` master-data contract. Keep `shift_type` as a derived display snapshot so existing records and old clients remain readable.

**Tech Stack:** Prisma schema/migration, NestJS DTO/service tests, Vue 3 + Element Plus, TypeScript API adapters, Jest, Prisma validate.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `using-superpowers -> using-git-worktrees -> brainstorming -> grill-with-docs -> writing-plans` 为 GAP-200 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 `ShiftType` 是班次类型唯一事实源；`ShiftInstance.shift_type` 是历史文本快照，不能继续作为新事实源；本计划不新增平行主数据，不改变生产批次、投料批次、库存流水主链。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展到 GAP-204、GAP-207、租户隔离或班组自动排班。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md、docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 如果 migration preflight 发现 `shift_instances.shift_type` 存在 `白班` / `夜班` 之外的值，必须停止并回报主 agent，不得自动创建未知班次类型。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260501000200_shift_instance_shift_type_fk/migration.sql`
- Modify: `server/src/modules/shift-instance/dto/create-shift-instance.dto.ts`
- Modify: `server/src/modules/shift-instance/shift-instance.service.ts`
- Modify: `server/src/modules/shift-instance/shift-instance.service.spec.ts`
- Modify: `client/src/api/shift-instance.ts`
- Modify: `client/src/views/shift/components/OpenShiftDialog.vue`
- Modify: `client/src/views/shift/ShiftDashboard.vue`
- Do not modify: `server/src/modules/mixing/`
- Do not modify: `server/src/modules/batch-trace/`
- Do not modify: `server/src/modules/team-shift/` unless a compile error requires a type-only adjustment.

## Task 1: Add backend regression tests for ShiftType-backed open shift

**Files:**
- Modify: `server/src/modules/shift-instance/shift-instance.service.spec.ts`

- [ ] **Step 1: Add `shiftType` mocks**

Replace the `mockPrisma` object with:

```ts
  const mockPrisma = {
    shiftType: {
      findFirst: jest.fn(),
    },
    shiftInstance: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
```

- [ ] **Step 2: Replace the existing create tests**

Replace the whole `describe('create', ...)` block with:

```ts
  describe('create', () => {
    const dayShiftType = {
      id: 'shift-day',
      code: 'DAY',
      name: '白班',
      start_time: '08:00',
      end_time: '20:00',
      crosses_day: false,
      active: true,
    };

    it('should throw ConflictException when shift already exists for shiftTypeId and date', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ shiftTypeId: 'shift-day', shift_date: '2026-04-22' }, 'user1'),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.shiftInstance.findUnique).toHaveBeenCalledWith({
        where: {
          company_id_shift_type_id_shift_date: {
            company_id: '1',
            shift_type_id: 'shift-day',
            shift_date: new Date('2026-04-22'),
          },
        },
      });
    });

    it('should create shift from shiftTypeId and persist the legacy name snapshot', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'new-id',
        status: 'open',
        shift_type_id: 'shift-day',
        shift_type: '白班',
      });

      const result = await service.create(
        { shiftTypeId: 'shift-day', shift_date: '2026-04-22' },
        'user1',
      );

      expect(result.status).toBe('open');
      expect(mockPrisma.shiftType.findFirst).toHaveBeenCalledWith({
        where: { id: 'shift-day', active: true },
      });
      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith({
        data: {
          company_id: '1',
          shift_type_id: 'shift-day',
          shift_type: '白班',
          shift_date: new Date('2026-04-22'),
          opened_by: 'user1',
          notes: undefined,
        },
        include: { shift_type_ref: true },
      });
    });

    it('should keep legacy shift_type payload working during migration window', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'new-id',
        status: 'open',
        shift_type_id: 'shift-day',
        shift_type: '白班',
      });

      await service.create({ shift_type: '白班', shift_date: '2026-04-22' }, 'user1');

      expect(mockPrisma.shiftType.findFirst).toHaveBeenCalledWith({
        where: { name: '白班', active: true },
      });
      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shift_type_id: 'shift-day',
            shift_type: '白班',
          }),
        }),
      );
    });

    it('should reject unknown legacy shift_type values', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(null);

      await expect(
        service.create({ shift_type: '中班', shift_date: '2026-04-22' }, 'user1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.shiftInstance.create).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 3: Run the focused test and verify current failure**

```bash
(cd server && npm test -- shift-instance.service.spec.ts --runInBand)
```

Expected: FAIL because `shiftTypeId` is not in the DTO/service contract and the service still queries by `shift_type` text.

## Task 2: Add ShiftInstance -> ShiftType schema relation

**Files:**
- Modify: `server/src/prisma/schema.prisma`

- [ ] **Step 1: Add the reverse relation on `ShiftType`**

In `model ShiftType`, replace:

```prisma
  batches     ProductionBatch[]
  records     StagingAreaStocktake[]
```

with:

```prisma
  batches        ProductionBatch[]
  records        StagingAreaStocktake[]
  shiftInstances ShiftInstance[]
```

- [ ] **Step 2: Add `shift_type_id` and relation to `ShiftInstance`**

In `model ShiftInstance`, replace:

```prisma
  shift_type      String   // '白班' | '夜班'
  shift_date      DateTime @db.Date
```

with:

```prisma
  shift_type_id   String
  shift_type_ref  ShiftType @relation(fields: [shift_type_id], references: [id], onDelete: Restrict)
  shift_type      String   // legacy display snapshot; derived from ShiftType.name
  shift_date      DateTime @db.Date
```

- [ ] **Step 3: Add the new unique key and index**

In `model ShiftInstance`, replace:

```prisma
  @@unique([company_id, shift_type, shift_date])
  @@index([company_id, shift_date])
```

with:

```prisma
  @@unique([company_id, shift_type, shift_date])
  @@unique([company_id, shift_type_id, shift_date])
  @@index([company_id, shift_date])
  @@index([shift_type_id])
```

## Task 3: Add guarded migration for legacy shift text

**Files:**
- Add: `server/src/prisma/migrations/20260501000200_shift_instance_shift_type_fk/migration.sql`

- [ ] **Step 1: Create migration SQL**

```sql
-- Link ShiftInstance to ShiftType while preserving shift_type as a legacy display snapshot.
-- This migration only auto-maps the two legacy values that the current DTO allowed.

ALTER TABLE "shift_instances" ADD COLUMN "shift_type_id" TEXT;

INSERT INTO "shift_types" ("id", "code", "name", "start_time", "end_time", "crosses_day", "active", "created_at", "updated_at")
SELECT 'shift-type-day', 'DAY', '白班', '08:00', '20:00', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "shift_types" WHERE "code" = 'DAY' OR "name" = '白班'
);

INSERT INTO "shift_types" ("id", "code", "name", "start_time", "end_time", "crosses_day", "active", "created_at", "updated_at")
SELECT 'shift-type-night', 'NIGHT', '夜班', '20:00', '08:00', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "shift_types" WHERE "code" = 'NIGHT' OR "name" = '夜班'
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "shift_instances"
    WHERE "shift_type" NOT IN ('白班', '夜班')
  ) THEN
    RAISE EXCEPTION 'Cannot backfill shift_instances.shift_type_id: unknown legacy shift_type exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "name"
      FROM "shift_types"
      WHERE "name" IN ('白班', '夜班')
      GROUP BY "name"
      HAVING COUNT(*) > 1
    ) duplicated
  ) THEN
    RAISE EXCEPTION 'Cannot backfill shift_instances.shift_type_id: duplicate ShiftType names for legacy values';
  END IF;
END $$;

UPDATE "shift_instances" si
SET "shift_type_id" = st."id"
FROM "shift_types" st
WHERE si."shift_type" = st."name"
  AND si."shift_type_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "shift_instances" WHERE "shift_type_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require shift_instances.shift_type_id: unmapped legacy rows remain';
  END IF;
END $$;

ALTER TABLE "shift_instances" ALTER COLUMN "shift_type_id" SET NOT NULL;

CREATE UNIQUE INDEX "shift_instances_company_id_shift_type_id_shift_date_key"
  ON "shift_instances"("company_id", "shift_type_id", "shift_date");

CREATE INDEX "shift_instances_shift_type_id_idx"
  ON "shift_instances"("shift_type_id");

ALTER TABLE "shift_instances"
  ADD CONSTRAINT "shift_instances_shift_type_id_fkey"
  FOREIGN KEY ("shift_type_id") REFERENCES "shift_types"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 2: Do not remove the old unique index**

Keep the existing unique index on `("company_id", "shift_type", "shift_date")`. The old text column remains during this migration window.

## Task 4: Update CreateShiftInstanceDto to prefer `shiftTypeId`

**Files:**
- Modify: `server/src/modules/shift-instance/dto/create-shift-instance.dto.ts`

- [ ] **Step 1: Replace the import**

Replace:

```ts
import { IsNotEmpty, IsIn, IsDateString, IsOptional, IsString } from 'class-validator';
```

with:

```ts
import { IsDateString, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
```

- [ ] **Step 2: Replace the shift type fields**

Replace:

```ts
  @IsNotEmpty()
  @IsIn(['白班', '夜班'])
  shift_type: string;
```

with:

```ts
  @ValidateIf((dto) => !dto.shift_type)
  @IsNotEmpty()
  @IsString()
  shiftTypeId?: string;

  @ValidateIf((dto) => !dto.shiftTypeId)
  @IsNotEmpty()
  @IsString()
  shift_type?: string;
```

## Task 5: Resolve ShiftType in ShiftInstanceService

**Files:**
- Modify: `server/src/modules/shift-instance/shift-instance.service.ts`

- [ ] **Step 1: Add a private resolver method inside the class**

Insert this method after the constructor:

```ts
  private async resolveShiftType(dto: CreateShiftInstanceDto) {
    const shiftType = dto.shiftTypeId
      ? await this.prisma.shiftType.findFirst({
          where: { id: dto.shiftTypeId, active: true },
        })
      : await this.prisma.shiftType.findFirst({
          where: { name: dto.shift_type, active: true },
        });

    if (!shiftType) {
      throw new BadRequestException('班次类型不存在或已停用');
    }

    return shiftType;
  }
```

- [ ] **Step 2: Replace `create()`**

Replace the existing `async create(dto: CreateShiftInstanceDto, userId: string) { ... }` method with:

```ts
  async create(dto: CreateShiftInstanceDto, userId: string) {
    const shiftType = await this.resolveShiftType(dto);
    const shiftDate = new Date(dto.shift_date);

    const existing = await this.prisma.shiftInstance.findUnique({
      where: {
        company_id_shift_type_id_shift_date: {
          company_id: '1',
          shift_type_id: shiftType.id,
          shift_date: shiftDate,
        },
      },
    });
    if (existing) throw new ConflictException('该班次已开班');

    return this.prisma.shiftInstance.create({
      data: {
        company_id: '1',
        shift_type_id: shiftType.id,
        shift_type: shiftType.name,
        shift_date: shiftDate,
        opened_by: userId,
        notes: dto.notes,
      },
      include: { shift_type_ref: true },
    });
  }
```

- [ ] **Step 3: Include `shift_type_ref` in list and detail reads**

In `findAll()`, change the include block from:

```ts
      include: {
        production_runs: {
          include: { product: true },
          orderBy: { started_at: 'asc' },
        },
      },
```

to:

```ts
      include: {
        shift_type_ref: true,
        production_runs: {
          include: { product: true },
          orderBy: { started_at: 'asc' },
        },
      },
```

In `findOne()`, change the include block from:

```ts
      include: {
        production_runs: {
          include: { product: true, recipe: true },
          orderBy: { started_at: 'asc' },
        },
      },
```

to:

```ts
      include: {
        shift_type_ref: true,
        production_runs: {
          include: { product: true, recipe: true },
          orderBy: { started_at: 'asc' },
        },
      },
```

- [ ] **Step 4: Run the backend focused test**

```bash
(cd server && npm test -- shift-instance.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 6: Update frontend API types for ShiftType-backed shifts

**Files:**
- Modify: `client/src/api/shift-instance.ts`

- [ ] **Step 1: Add `ShiftTypeSummary`**

After the imports, insert:

```ts
export interface ShiftTypeSummary {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  crosses_day: boolean;
  active: boolean;
}
```

- [ ] **Step 2: Extend `ShiftInstance`**

Replace:

```ts
  shift_type: string;
  shift_date: string;
```

with:

```ts
  shift_type_id: string;
  shift_type: string;
  shift_type_ref?: ShiftTypeSummary;
  shift_date: string;
```

- [ ] **Step 3: Update `CreateShiftInstancePayload`**

Replace:

```ts
export interface CreateShiftInstancePayload {
  shift_type: string;
  shift_date: string;
  notes?: string;
}
```

with:

```ts
export interface CreateShiftInstancePayload {
  shiftTypeId: string;
  shift_date: string;
  notes?: string;
}
```

## Task 7: Replace hard-coded shift radio buttons with ShiftType select

**Files:**
- Modify: `client/src/views/shift/components/OpenShiftDialog.vue`

- [ ] **Step 1: Replace the班次类型 form item**

Replace:

```vue
      <el-form-item label="班次类型" prop="shift_type">
        <el-radio-group v-model="form.shift_type">
          <el-radio value="白班">白班</el-radio>
          <el-radio value="夜班">夜班</el-radio>
        </el-radio-group>
      </el-form-item>
```

with:

```vue
      <el-form-item label="班次类型" prop="shiftTypeId">
        <el-select v-model="form.shiftTypeId" placeholder="请选择班次类型" style="width: 100%">
          <el-option
            v-for="shiftType in shiftTypes"
            :key="shiftType.id"
            :label="formatShiftTypeLabel(shiftType)"
            :value="shiftType.id"
          />
        </el-select>
      </el-form-item>
```

- [ ] **Step 2: Replace imports**

Replace:

```ts
import { ref, reactive } from 'vue';
```

with:

```ts
import { ref, reactive, onMounted } from 'vue';
```

Replace:

```ts
import { ShiftInstanceApi, type CreateShiftInstancePayload } from '@/api/shift-instance';
```

with:

```ts
import { ShiftInstanceApi, type CreateShiftInstancePayload, type ShiftTypeSummary } from '@/api/shift-instance';
import { teamShiftApi } from '@/api/team-shift';
```

- [ ] **Step 3: Add shift type state and loader**

After `const today = new Date().toISOString().slice(0, 10);`, insert:

```ts
const shiftTypes = ref<ShiftTypeSummary[]>([]);
```

Replace:

```ts
const form = reactive<CreateShiftInstancePayload>({
  shift_type: '白班',
  shift_date: today,
  notes: '',
});
```

with:

```ts
const form = reactive<CreateShiftInstancePayload>({
  shiftTypeId: '',
  shift_date: today,
  notes: '',
});
```

Replace:

```ts
const rules: FormRules = {
  shift_type: [{ required: true, message: '请选择班次类型', trigger: 'change' }],
  shift_date: [{ required: true, message: '请选择日期', trigger: 'change' }],
};
```

with:

```ts
const rules: FormRules = {
  shiftTypeId: [{ required: true, message: '请选择班次类型', trigger: 'change' }],
  shift_date: [{ required: true, message: '请选择日期', trigger: 'change' }],
};
```

Insert these functions before `async function submit()`:

```ts
onMounted(loadShiftTypes);

async function loadShiftTypes() {
  const response = await teamShiftApi.listShiftTypes();
  const data = Array.isArray((response as any).data)
    ? (response as any).data
    : Array.isArray(response)
      ? response
      : [];
  shiftTypes.value = data as ShiftTypeSummary[];
  if (!form.shiftTypeId && shiftTypes.value.length > 0) {
    form.shiftTypeId = shiftTypes.value[0].id;
  }
}

function formatShiftTypeLabel(shiftType: ShiftTypeSummary): string {
  return `${shiftType.name} ${shiftType.start_time}-${shiftType.end_time}`;
}
```

## Task 8: Display ShiftType relation on the dashboard

**Files:**
- Modify: `client/src/views/shift/ShiftDashboard.vue`

- [ ] **Step 1: Update the shift title display**

Replace:

```vue
            &nbsp;{{ shift.shift_type }} | {{ formatDate(shift.shift_date) }}
```

with:

```vue
            &nbsp;{{ displayShiftType(shift) }} | {{ formatDate(shift.shift_date) }}
```

- [ ] **Step 2: Add display helper**

After `function formatTime(d: string): string { ... }`, insert:

```ts
function displayShiftType(shift: ShiftInstance): string {
  return shift.shift_type_ref?.name ?? shift.shift_type;
}
```

## Task 9: Validate Prisma and frontend/backend focused tests

**Files:**
- Verify only.

- [ ] **Step 1: Run Prisma validation**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: exits 0 and reports the Prisma schema is valid.

- [ ] **Step 2: Run backend focused tests**

```bash
(cd server && npm test -- shift-instance.service.spec.ts team-shift.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 3: Run TypeScript checks used by the repo**

Run the narrowest existing typecheck/build command available in package scripts:

```bash
npm run build:server
```

Expected: exits 0.

If `npm run build:server` is unavailable in the current checkout, run:

```bash
(cd server && npm run build)
```

Expected: exits 0.

- [ ] **Step 4: Run GAP validation command**

```bash
pnpm test:e2e -- --grep GAP-200
```

Expected: PASS. If the repo has no GAP-200 E2E grep target, record the exact command output and rely on the focused backend checks plus Prisma validation.

## Task 10: Final review and commit

**Files:**
- Review changed files only.

- [ ] **Step 1: Confirm no out-of-scope code changed**

```bash
git diff --name-only
```

Expected: only the files listed in File Map are changed.

- [ ] **Step 2: Check whitespace**

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 3: Commit implementation**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260501000200_shift_instance_shift_type_fk/migration.sql server/src/modules/shift-instance/dto/create-shift-instance.dto.ts server/src/modules/shift-instance/shift-instance.service.ts server/src/modules/shift-instance/shift-instance.service.spec.ts client/src/api/shift-instance.ts client/src/views/shift/components/OpenShiftDialog.vue client/src/views/shift/ShiftDashboard.vue
git commit -m "fix: link shift instances to shift types"
```

Expected: commit succeeds on the execution agent branch.
