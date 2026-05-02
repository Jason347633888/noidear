# GAP-302 EnvironmentRecord Location FK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the Location/WorkshopArea domain during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make every newly created `EnvironmentRecord` reference controlled area master data through `location_id` while preserving the existing `location` text as a display snapshot.

**Architecture:** Reuse the existing `WorkshopArea` model as the current code's production area master data. Add an optional Prisma FK from `EnvironmentRecord.location_id` to `WorkshopArea.id`, require `location_id` in the create DTO and service, write `location` from `WorkshopArea.name`, and change the Vue form from free text to the existing `/workshop-areas` selector data source.

**Tech Stack:** Prisma schema/migration, NestJS service/DTO/controller, class-validator, Vue 3, Element Plus, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-302 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 当前代码没有独立 `Location` model；`docs/module-usage/02-master-data-and-boundaries.md` 已定义 `WorkshopArea` 为区域主数据唯一事实源。因此本计划把 GAP-302 的“Location 主数据”落到 `WorkshopArea`，不得新建平行 `Location` 表。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展到设备位置、仓库库位、通用 Location 重构、批次放行状态机或环境超标自动 NC。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 不允许按 `EnvironmentRecord.location` 文本自动回填 `location_id`。如果业务要求历史位置也主数据化，停止并回报需要独立数据治理任务。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502110000_environment_record_location_id/migration.sql`
- Modify: `server/src/modules/environment-record/dto/create-environment-record.dto.ts`
- Modify: `server/src/modules/environment-record/environment-record.service.ts`
- Modify: `server/src/modules/environment-record/environment-record.service.spec.ts`
- Modify: `client/src/api/environment-record.ts`
- Modify: `client/src/views/environment-record/EnvironmentRecordList.vue`
- Do not modify: `server/src/modules/workshop-area/workshop-area.service.ts`
- Do not modify: `server/src/modules/ccp/`
- Do not modify: `server/src/modules/non-conformance/`

## Task 1: Add focused service coverage

**Files:**
- Modify: `server/src/modules/environment-record/environment-record.service.spec.ts`

- [ ] **Step 1: Replace the service spec with location-aware coverage**

Replace `server/src/modules/environment-record/environment-record.service.spec.ts` with:

```ts
import { BadRequestException } from '@nestjs/common';
import { EnvironmentRecordService } from './environment-record.service';

describe('EnvironmentRecordService', () => {
  function createPrismaMock(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      workshopArea: {
        findFirst: jest.fn().mockResolvedValue({ id: 'area-1', name: '生产车间A区' }),
      },
      environmentRecord: {
        create: jest.fn().mockResolvedValue({ id: 'er-1' }),
      },
      ...overrides,
    } as any;
  }

  it('rejects creation when the production batch does not exist', async () => {
    const prisma = createPrismaMock({
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new EnvironmentRecordService(prisma);

    await expect(
      service.create(
        {
          location_id: 'area-1',
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
    expect(prisma.workshopArea.findFirst).not.toHaveBeenCalled();
    expect(prisma.environmentRecord.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the monitoring location does not exist or is inactive', async () => {
    const prisma = createPrismaMock({
      workshopArea: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new EnvironmentRecordService(prisma);

    await expect(
      service.create(
        {
          location_id: 'missing-area',
          record_type: 'temperature_humidity',
          temperature: 25.5,
          humidity: 61,
          is_within_spec: true,
          production_batch_id: 'batch-1',
        },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.workshopArea.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'missing-area',
        company_id: '1',
        status: 'active',
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
    expect(prisma.environmentRecord.create).not.toHaveBeenCalled();
  });

  it('creates an environment record linked to an existing production batch and location', async () => {
    const prisma = createPrismaMock();
    const service = new EnvironmentRecordService(prisma);

    await service.create(
      {
        location_id: 'area-1',
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
        location_id: 'area-1',
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

- [ ] **Step 2: Run the focused test and verify it fails before implementation**

```bash
(cd server && npm test -- environment-record.service.spec.ts --runInBand)
```

Expected: FAIL because `CreateEnvironmentRecordDto` and `EnvironmentRecordService.create()` still use free-text `location`.

## Task 2: Add the Prisma relation and migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502110000_environment_record_location_id/migration.sql`

- [ ] **Step 1: Add the reverse relation to `WorkshopArea`**

In `model WorkshopArea`, below:

```prisma
  mixingExecutions MixingExecution[]
```

add:

```prisma
  environmentRecords EnvironmentRecord[] @relation("EnvironmentRecordLocation")
```

- [ ] **Step 2: Add `location_id` and relation to `EnvironmentRecord`**

In `model EnvironmentRecord`, replace:

```prisma
  location            String
```

with:

```prisma
  location_id         String?
  location_ref        WorkshopArea?   @relation("EnvironmentRecordLocation", fields: [location_id], references: [id], onDelete: Restrict)
  location            String
```

- [ ] **Step 3: Add location indexes to `EnvironmentRecord`**

In `model EnvironmentRecord`, keep the existing `@@index([production_batch_id])` and add:

```prisma
  @@index([location_id])
  @@index([company_id, location_id, measured_at])
```

- [ ] **Step 4: Create the migration SQL**

Create `server/src/prisma/migrations/20260502110000_environment_record_location_id/migration.sql` with:

```sql
-- Add a controlled area reference for EnvironmentRecord while preserving legacy location snapshots.
-- Existing rows keep location_id NULL; historical text mapping requires a separate data governance task.

ALTER TABLE "EnvironmentRecord"
  ADD COLUMN "location_id" TEXT;

CREATE INDEX "EnvironmentRecord_location_id_idx"
  ON "EnvironmentRecord"("location_id");

CREATE INDEX "EnvironmentRecord_company_id_location_id_measured_at_idx"
  ON "EnvironmentRecord"("company_id", "location_id", "measured_at");

ALTER TABLE "EnvironmentRecord"
  ADD CONSTRAINT "EnvironmentRecord_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "workshop_areas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 5: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

## Task 3: Require `location_id` in DTO and service

**Files:**
- Modify: `server/src/modules/environment-record/dto/create-environment-record.dto.ts`
- Modify: `server/src/modules/environment-record/environment-record.service.ts`

- [ ] **Step 1: Update the DTO fields**

Replace the current `location` field in `CreateEnvironmentRecordDto`:

```ts
  @IsString()
  location: string;
```

with:

```ts
  @IsString()
  @IsNotEmpty()
  location_id: string;

  @IsOptional()
  @IsString()
  location?: string;
```

Keep the existing `IsNotEmpty` import. If the import line already includes `IsNotEmpty`, do not add a duplicate.

- [ ] **Step 2: Replace `EnvironmentRecordService.create()`**

In `server/src/modules/environment-record/environment-record.service.ts`, replace the full `create()` method with:

```ts
  async create(dto: CreateEnvironmentRecordDto, userId: string) {
    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.production_batch_id },
      select: { id: true },
    });

    if (!productionBatch) {
      throw new BadRequestException('生产批次不存在');
    }

    const location = await this.prisma.workshopArea.findFirst({
      where: {
        id: dto.location_id,
        company_id: '1',
        status: 'active',
        deleted_at: null,
      },
      select: { id: true, name: true },
    });

    if (!location) {
      throw new BadRequestException('监测位置不存在或已停用');
    }

    const { location: _ignoredLocation, location_id, ...recordData } = dto;

    return this.prisma.environmentRecord.create({
      data: {
        ...recordData,
        location_id,
        location: location.name,
        company_id: '1',
        operator_id: userId,
        measured_at: new Date(),
      },
    });
  }
```

- [ ] **Step 3: Run focused service tests**

```bash
(cd server && npm test -- environment-record.service.spec.ts --runInBand)
```

Expected: PASS, including the missing batch, missing location, and snapshot-from-`WorkshopArea.name` cases.

## Task 4: Update the client API contract

**Files:**
- Modify: `client/src/api/environment-record.ts`

- [ ] **Step 1: Add `location_id` to response type**

In `EnvironmentRecord`, replace:

```ts
  location: string;
```

with:

```ts
  location_id: string | null;
  location: string;
```

- [ ] **Step 2: Replace create payload location field**

In `CreateEnvironmentRecordPayload`, replace:

```ts
  location: string;
```

with:

```ts
  location_id: string;
```

The payload must not require free-text `location`.

## Task 5: Replace the free-text location input with a master-data selector

**Files:**
- Modify: `client/src/views/environment-record/EnvironmentRecordList.vue`

- [ ] **Step 1: Import `workshopAreaApi`**

Add this import near the other API imports:

```ts
import { workshopAreaApi, type WorkshopArea } from '@/api/workshop-area';
```

- [ ] **Step 2: Add area state**

Below:

```ts
const dateRange = ref<[string, string] | null>(null);
```

add:

```ts
const areas = ref<WorkshopArea[]>([]);
```

- [ ] **Step 3: Change create form state**

In `createForm`, replace:

```ts
  location: '',
```

with:

```ts
  location_id: '',
```

- [ ] **Step 4: Change form rules**

In `createRules`, replace the `location` rule:

```ts
  location: [{ required: true, message: '请输入监测位置', trigger: 'blur' }],
```

with:

```ts
  location_id: [{ required: true, message: '请选择监测位置', trigger: 'change' }],
```

- [ ] **Step 5: Add area loading helper**

Below `loadList()`, add:

```ts
async function loadAreas() {
  try {
    const res = await workshopAreaApi.getList();
    areas.value = (res as unknown as WorkshopArea[]) ?? [];
  } catch {
    ElMessage.error('加载监测位置列表失败');
  }
}
```

- [ ] **Step 6: Reset `location_id` when opening the dialog**

In `openCreateDialog()`, replace:

```ts
  createForm.location = '';
```

with:

```ts
  createForm.location_id = '';
```

- [ ] **Step 7: Submit `location_id`**

In `handleCreate()`, replace:

```ts
      location: createForm.location,
```

with:

```ts
      location_id: createForm.location_id,
```

- [ ] **Step 8: Load areas on mount**

Replace:

```ts
onMounted(() => {
  loadList();
});
```

with:

```ts
onMounted(() => {
  loadList();
  loadAreas();
});
```

- [ ] **Step 9: Replace the template input**

In the new-record dialog, replace:

```vue
        <el-form-item label="监测位置" prop="location">
          <el-input v-model="createForm.location" placeholder="例如：生产车间A区" />
        </el-form-item>
```

with:

```vue
        <el-form-item label="监测位置" prop="location_id">
          <el-select v-model="createForm.location_id" placeholder="请选择监测位置" filterable style="width: 100%">
            <el-option
              v-for="area in areas"
              :key="area.id"
              :label="area.name"
              :value="area.id"
            />
          </el-select>
        </el-form-item>
```

- [ ] **Step 10: Build the client**

```bash
npm run build -w client
```

Expected: PASS. If dependencies are missing, run `npm ci` at the repository root first, then rerun the build.

## Task 6: Final verification and commit

**Files:**
- Verify all modified files above

- [ ] **Step 1: Run server focused test**

```bash
(cd server && npm test -- environment-record.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 2: Run Prisma validation**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

- [ ] **Step 3: Run client build**

```bash
npm run build -w client
```

Expected: PASS.

- [ ] **Step 4: Review git diff scope**

```bash
git status --short
```

Expected: only the files listed in this plan are modified or added.

- [ ] **Step 5: Commit**

```bash
git add server/src/prisma/schema.prisma \
  server/src/prisma/migrations/20260502110000_environment_record_location_id/migration.sql \
  server/src/modules/environment-record/dto/create-environment-record.dto.ts \
  server/src/modules/environment-record/environment-record.service.ts \
  server/src/modules/environment-record/environment-record.service.spec.ts \
  client/src/api/environment-record.ts \
  client/src/views/environment-record/EnvironmentRecordList.vue
git commit -m "fix: link environment records to area master data"
```
