# GAP-603 Requisition Equipment Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` only to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign warehouse/equipment boundaries during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Link maintenance material requisitions to the `Equipment` ledger so repair material usage can be audited by equipment.

**Architecture:** Add a nullable Prisma FK from `MaterialRequisition` to `Equipment`, then enforce the business rule in `RequisitionService.create()`: maintenance requisitions require an active equipment reference, while non-maintenance requisitions must not carry one. Finally, expose requisition type and equipment selection in the warehouse requisition UI using the existing equipment API.

**Tech Stack:** Prisma schema/migration, NestJS DTO/controller/service, class-validator, Jest, Vue 3, Element Plus, TypeScript API adapters, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `using-superpowers -> brainstorming -> grill-with-docs -> writing-plans` 为 GAP-603 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 `Equipment` 是设备台账唯一事实源；维修领料不能继续只靠备注或目标区域表达设备关系；本计划不新增平行设备主数据，不改变 MaterialBatch、InventoryMovement 或生产批次追溯主链。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展到 GAP-604 检验记录关联量器、GAP-605 校准记录审批、设备租户隔离或库存流水枚举重构。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 本计划不回填历史维修领料。如果业务要求历史 `maintenance` 领料必须补设备，执行 agent 必须停止并回报需要业务提供可靠映射表。
- **PR #166 blocker 校准：** 当前全局 `ValidationPipe` 使用 `whitelist: true` 和 `forbidNonWhitelisted: true`。因此本计划必须同时更新 `CreateRequisitionDto` 的 `targetZone`、`equipmentId`、`requisitionType` 和 `items` 字段；`requisitionType` 与 `items` 必须保持可选，以兼容旧调用方只提交 `{ targetZone }` 且 service 默认 `production`、空明细草稿可创建的现有行为。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502110000_add_material_requisition_equipment_id/migration.sql`
- Modify: `server/src/modules/warehouse/dto/requisition.dto.ts`
- Modify: `server/src/modules/warehouse/requisition.controller.ts`
- Modify: `server/src/modules/warehouse/requisition.service.ts`
- Modify: `server/src/modules/warehouse/requisition.service.spec.ts`
- Modify: `client/src/api/warehouse.ts`
- Modify: `client/src/views/warehouse/RequisitionList.vue`
- Do not modify: `server/src/modules/equipment/maintenance*`
- Do not modify: `server/src/modules/measuring-equipment/`
- Do not modify: `server/src/modules/traceability/`
- Do not modify: `server/src/modules/warehouse/services/inventory-movement-ledger.service.ts`

## Task 0: Confirm isolated execution context

**Files:**
- Read only: repository metadata

- [ ] **Step 1: Verify worktree isolation**

Run:

```bash
git worktree list --porcelain
pwd
git branch --show-current
git status --short --branch
```

Expected: `pwd` is not `/Users/jiashenglin/Desktop/好玩的项目/noidear`; branch is a task branch or Multica run branch; status is clean except for changes made while executing this plan.

- [ ] **Step 2: Read required project documents**

Run:

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,260p' docs/AGENT_GUIDE.md
sed -n '1,260p' docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md
sed -n '1,260p' docs/module-usage/10-equipment-and-measuring.md
sed -n '1,220p' docs/superpowers/specs/2026-05-02-gap-603-requisition-equipment-link-design.md
```

Expected: documents confirm Chinese project rules, isolated worktree requirement, `Equipment` as equipment ledger fact source, and GAP-603 scope.

## Task 1: Add backend regression coverage

**Files:**
- Modify: `server/src/modules/warehouse/requisition.service.spec.ts`

- [ ] **Step 1: Add an equipment mock to the Prisma test double**

In the `PrismaService` mock under `useValue`, add `equipment.findFirst` next to `materialRequisition`:

```ts
            equipment: {
              findFirst: jest.fn(),
            },
            materialRequisition: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
```

- [ ] **Step 2: Add a test that maintenance requisitions require equipment**

Inside `describe('create', ...)`, add:

```ts
    it('requires equipmentId for maintenance requisitions', async () => {
      const txClient = {
        equipment: { findFirst: jest.fn() },
        materialRequisition: { create: jest.fn() },
        materialRequisitionItem: { createMany: jest.fn() },
      };
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(txClient));

      await expect(service.create({
        requisitionType: 'maintenance',
        applicantId: 'user-001',
        items: [],
      })).rejects.toThrow(BadRequestException);

      expect(txClient.equipment.findFirst).not.toHaveBeenCalled();
      expect(txClient.materialRequisition.create).not.toHaveBeenCalled();
    });
```

- [ ] **Step 3: Add a test that valid maintenance equipment is persisted**

Inside `describe('create', ...)`, add:

```ts
    it('validates and persists equipmentId for maintenance requisitions', async () => {
      const createDto = {
        requisitionType: 'maintenance',
        equipmentId: 'eq-001',
        applicantId: 'user-001',
        items: [{ batchId: 'batch-001', quantity: 2 }],
      };

      const mockRequisition = {
        id: 'req-001',
        requisitionNo: 'REQ-20260502-001',
        requisitionType: 'maintenance',
        equipmentId: 'eq-001',
        status: 'draft',
      };

      const txClient = {
        equipment: {
          findFirst: jest.fn().mockResolvedValue({ id: 'eq-001', deletedAt: null }),
        },
        materialRequisition: {
          create: jest.fn().mockResolvedValue(mockRequisition),
        },
        materialRequisitionItem: {
          createMany: jest.fn(),
        },
      };
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(txClient));

      const result = await service.create(createDto);

      expect(txClient.equipment.findFirst).toHaveBeenCalledWith({
        where: { id: 'eq-001', deletedAt: null },
        select: { id: true },
      });
      expect(txClient.materialRequisition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requisitionType: 'maintenance',
          equipmentId: 'eq-001',
        }),
      });
      expect(result.equipmentId).toBe('eq-001');
    });
```

- [ ] **Step 4: Add a test that non-maintenance requisitions reject equipmentId**

Inside `describe('create', ...)`, add:

```ts
    it('rejects equipmentId for non-maintenance requisitions', async () => {
      const txClient = {
        equipment: { findFirst: jest.fn() },
        materialRequisition: { create: jest.fn() },
        materialRequisitionItem: { createMany: jest.fn() },
      };
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(txClient));

      await expect(service.create({
        requisitionType: 'production',
        equipmentId: 'eq-001',
        applicantId: 'user-001',
        items: [],
      })).rejects.toThrow(BadRequestException);

      expect(txClient.equipment.findFirst).not.toHaveBeenCalled();
      expect(txClient.materialRequisition.create).not.toHaveBeenCalled();
    });
```

- [ ] **Step 5: Add a test that the legacy target-zone-only payload stays compatible**

Inside `describe('create', ...)`, add:

```ts
    it('keeps legacy targetZone-only requisition creation compatible', async () => {
      const txClient = {
        equipment: { findFirst: jest.fn() },
        materialRequisition: {
          create: jest.fn().mockResolvedValue({
            id: 'req-legacy',
            requisitionNo: 'REQ-20260502-legacy',
            requisitionType: 'production',
            targetZone: '小料房',
            status: 'draft',
          }),
        },
        materialRequisitionItem: { createMany: jest.fn() },
      };
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(txClient));

      const result = await service.create({ targetZone: '小料房', applicantId: 'user-001' });

      expect(txClient.equipment.findFirst).not.toHaveBeenCalled();
      expect(txClient.materialRequisition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requisitionType: 'production',
          targetZone: '小料房',
          applicantId: 'user-001',
        }),
      });
      expect(txClient.materialRequisitionItem.createMany).not.toHaveBeenCalled();
      expect(result.requisitionType).toBe('production');
    });
```

- [ ] **Step 6: Run the focused test and verify current failure**

Run:

```bash
(cd server && npm test -- requisition.service.spec.ts --runInBand)
```

Expected: FAIL because `RequisitionService.create()` does not yet validate or persist `equipmentId`.

## Task 2: Add Prisma schema relation and migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502110000_add_material_requisition_equipment_id/migration.sql`

- [ ] **Step 1: Add the reverse relation on `Equipment`**

In `model Equipment`, replace:

```prisma
  maintenancePlans   MaintenancePlan[]
  maintenanceRecords MaintenanceRecord[]
  equipmentFaults    EquipmentFault[]
```

with:

```prisma
  maintenancePlans     MaintenancePlan[]
  maintenanceRecords   MaintenanceRecord[]
  equipmentFaults      EquipmentFault[]
  materialRequisitions MaterialRequisition[]
```

- [ ] **Step 2: Add optional equipment relation to `MaterialRequisition`**

In `model MaterialRequisition`, directly after `targetZone`, add:

```prisma
  equipmentId     String?
  equipment       Equipment? @relation(fields: [equipmentId], references: [id], onDelete: Restrict)
```

- [ ] **Step 3: Add an index for equipment lookups**

In `model MaterialRequisition`, directly after:

```prisma
  @@index([requisitionType])
```

add:

```prisma
  @@index([equipmentId])
```

- [ ] **Step 4: Create migration SQL**

Create `server/src/prisma/migrations/20260502110000_add_material_requisition_equipment_id/migration.sql` with:

```sql
-- Link maintenance material requisitions to the Equipment ledger.
-- Existing rows remain nullable because no trusted historical equipment mapping exists.

ALTER TABLE "material_requisitions"
  ADD COLUMN "equipmentId" TEXT;

CREATE INDEX IF NOT EXISTS "material_requisitions_equipmentId_idx"
  ON "material_requisitions"("equipmentId");

ALTER TABLE "material_requisitions"
  ADD CONSTRAINT "material_requisitions_equipmentId_fkey"
  FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 5: Validate Prisma schema**

Run:

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

## Task 3: Enforce backend API rules

**Files:**
- Modify: `server/src/modules/warehouse/dto/requisition.dto.ts`
- Modify: `server/src/modules/warehouse/requisition.controller.ts`
- Modify: `server/src/modules/warehouse/requisition.service.ts`
- Modify: `server/src/modules/warehouse/requisition.service.spec.ts`

- [ ] **Step 1: Make the create DTO match the global ValidationPipe contract**

Replace the full `CreateRequisitionDto` class in `server/src/modules/warehouse/dto/requisition.dto.ts` with:

```ts
export class CreateRequisitionDto {
  @ApiPropertyOptional({
    description: '领料类型；省略时保持旧行为，服务端默认 production',
    enum: ['production', 'maintenance', 'other'],
  })
  @IsOptional()
  @IsEnum(['production', 'maintenance', 'other'], {
    message: '领料类型必须为 production、maintenance 或 other',
  })
  requisitionType?: string;

  @ApiPropertyOptional({ description: '维修领料关联设备ID，仅 requisitionType=maintenance 时允许' })
  @IsOptional()
  @IsString()
  equipmentId?: string;

  @ApiPropertyOptional({ description: '目标区域' })
  @IsOptional()
  @IsString()
  targetZone?: string;

  @ApiPropertyOptional({ description: '领料明细；允许省略或传空数组以创建草稿领料单', type: [CreateRequisitionItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequisitionItemDto)
  items?: CreateRequisitionItemDto[];

  @ApiPropertyOptional({ description: '部门ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
```

Expected: with global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, payloads containing `targetZone` and `equipmentId` are no longer rejected as non-whitelisted. Payloads that omit `requisitionType` or `items` still pass validation so the service can preserve `requisitionType ?? 'production'` and `items?.length` behavior.

- [ ] **Step 2: Type the controller with existing DTOs**

In `server/src/modules/warehouse/requisition.controller.ts`, add:

```ts
import { CreateRequisitionDto, QueryRequisitionDto } from './dto/requisition.dto';
```

Replace:

```ts
  create(@Body() createDto: any, @Request() req: any) {
```

with:

```ts
  create(@Body() createDto: CreateRequisitionDto, @Request() req: any) {
```

Replace:

```ts
  findAll(@Query() query: any) {
```

with:

```ts
  findAll(@Query() query: QueryRequisitionDto) {
```

- [ ] **Step 3: Add a focused equipment validation helper**

In `RequisitionService`, add this private method after `generateRequisitionNo()`:

```ts
  private async validateEquipmentLink(tx: Prisma.TransactionClient, requisitionType: string, equipmentId?: string) {
    if (requisitionType === 'maintenance' && !equipmentId) {
      throw new BadRequestException('维修领料必须关联设备');
    }

    if (requisitionType !== 'maintenance' && equipmentId) {
      throw new BadRequestException('只有维修领料可以关联设备');
    }

    if (!equipmentId) {
      return;
    }

    const equipment = await tx.equipment.findFirst({
      where: { id: equipmentId, deletedAt: null },
      select: { id: true },
    });
    if (!equipment) {
      throw new BadRequestException('设备不存在或已删除');
    }
  }
```

- [ ] **Step 4: Persist `equipmentId` during create**

In `create()`, replace:

```ts
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const requisition = await tx.materialRequisition.create({
        data: {
          requisitionNo,
          requisitionType: createDto.requisitionType ?? 'production',
          applicantId: createDto.applicantId ?? 'system',
          departmentId: createDto.departmentId,
          remark: createDto.remark,
          targetZone: createDto.targetZone,
          status: 'draft',
        },
      });
```

with:

```ts
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const requisitionType = createDto.requisitionType ?? 'production';
      await this.validateEquipmentLink(tx, requisitionType, createDto.equipmentId);

      const requisition = await tx.materialRequisition.create({
        data: {
          requisitionNo,
          requisitionType,
          applicantId: createDto.applicantId ?? 'system',
          departmentId: createDto.departmentId,
          remark: createDto.remark,
          targetZone: createDto.targetZone,
          equipmentId: createDto.equipmentId,
          status: 'draft',
        },
      });
```

- [ ] **Step 5: Include equipment in list and detail reads**

In `findAll()`, replace:

```ts
        include: { items: true },
```

with:

```ts
        include: {
          items: true,
          equipment: { select: { id: true, code: true, name: true, status: true } },
        },
```

In `findOne()`, replace:

```ts
      include: { items: true },
```

with:

```ts
      include: {
        items: true,
        equipment: { select: { id: true, code: true, name: true, status: true } },
      },
```

- [ ] **Step 6: Run focused backend tests**

Run:

```bash
(cd server && npm test -- requisition.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 4: Expose requisition type and equipment selector in the client

**Files:**
- Modify: `client/src/api/warehouse.ts`
- Modify: `client/src/views/warehouse/RequisitionList.vue`

- [ ] **Step 1: Update warehouse API types**

In `client/src/api/warehouse.ts`, replace the `Requisition` interface with:

```ts
export interface Requisition {
  id: string;
  requisitionNo?: string;
  number?: string;
  requisitionType: 'production' | 'maintenance' | 'other';
  requesterId?: string;
  applicantId?: string;
  departmentId?: string;
  targetZone?: string;
  equipmentId?: string;
  equipment?: { id: string; code: string; name: string; status: string };
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  items: RequisitionItem[];
  createdAt: string;
  requester?: { id: string; name: string };
  department?: { id: string; name: string };
}
```

Replace `requisitionApi.create()` with:

```ts
  create(payload: {
    requisitionType?: 'production' | 'maintenance' | 'other';
    equipmentId?: string;
    departmentId?: string;
    targetZone?: string;
    remark?: string;
    items?: { batchId: string; quantity: number }[];
  }) {
    return request.post<Requisition>('/warehouse/requisitions', payload);
  },
```

- [ ] **Step 2: Import the existing equipment API in the page**

In `client/src/views/warehouse/RequisitionList.vue`, replace:

```ts
import { requisitionApi } from '@/api/warehouse';
import request from '@/api/request';
```

with:

```ts
import { requisitionApi } from '@/api/warehouse';
import equipmentApi, { type Equipment } from '@/api/equipment';
import request from '@/api/request';
```

- [ ] **Step 3: Add table columns for requisition type and equipment**

In the `<el-table>`, after the department column, add:

```vue
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ reqTypeText(row.requisitionType || 'production') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="设备" min-width="160">
          <template #default="{ row }">
            <span v-if="row.equipment">{{ row.equipment.code }} / {{ row.equipment.name }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
```

- [ ] **Step 4: Add form controls for type and equipment**

In the create dialog `<el-form>`, before the target zone form item, add:

```vue
        <el-form-item label="领料类型" prop="requisitionType">
          <el-select v-model="createForm.requisitionType" placeholder="请选择领料类型" style="width:100%">
            <el-option value="production" label="生产领料" />
            <el-option value="maintenance" label="维修领料" />
            <el-option value="other" label="其他领料" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="createForm.requisitionType === 'maintenance'" label="设备" prop="equipmentId">
          <el-select v-model="createForm.equipmentId" placeholder="请选择设备" filterable clearable style="width:100%">
            <el-option
              v-for="equipment in equipmentOptions"
              :key="equipment.id"
              :value="equipment.id"
              :label="`${equipment.code} / ${equipment.name}`"
            />
          </el-select>
        </el-form-item>
```

- [ ] **Step 5: Extend page state and helper text**

Replace:

```ts
const createForm = reactive({ targetZone: '' });
const createRules = {
  targetZone: [{ required: true, message: '请选择目标区域', trigger: 'change' }],
};

const reqStatusText = (s: string) => ({ draft: '草稿', pending: '已提交', approved: '已批准', rejected: '已驳回', completed: '已完成' }[s] || s);
```

with:

```ts
const equipmentOptions = ref<Equipment[]>([]);
const createForm = reactive({
  requisitionType: 'production' as 'production' | 'maintenance' | 'other',
  equipmentId: '',
  targetZone: '',
});
const createRules = {
  requisitionType: [{ required: true, message: '请选择领料类型', trigger: 'change' }],
  equipmentId: [{
    validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
      if (createForm.requisitionType === 'maintenance' && !value) {
        callback(new Error('维修领料必须选择设备'));
        return;
      }
      callback();
    },
    trigger: 'change',
  }],
  targetZone: [{ required: true, message: '请选择目标区域', trigger: 'change' }],
};

const reqStatusText = (s: string) => ({ draft: '草稿', pending: '已提交', approved: '已批准', rejected: '已驳回', completed: '已完成' }[s] || s);
const reqTypeText = (s: string) => ({ production: '生产领料', maintenance: '维修领料', other: '其他领料' }[s] || s);
```

- [ ] **Step 6: Load equipment options and reset form correctly**

Add this function before `fetchData`:

```ts
const fetchEquipmentOptions = async () => {
  try {
    const res: any = await equipmentApi.getEquipmentList({ limit: 500 });
    equipmentOptions.value = res.data ?? res.list ?? [];
  } catch {
    equipmentOptions.value = [];
  }
};
```

Replace `openCreateDialog()` with:

```ts
const openCreateDialog = async () => {
  createForm.requisitionType = 'production';
  createForm.equipmentId = '';
  createForm.targetZone = '';
  createFormRef.value?.resetFields();
  await fetchEquipmentOptions();
  createVisible.value = true;
};
```

- [ ] **Step 7: Submit the typed payload through the API adapter**

Replace:

```ts
    await request.post('/warehouse/requisitions', { targetZone: createForm.targetZone });
```

with:

```ts
    await requisitionApi.create({
      requisitionType: createForm.requisitionType,
      equipmentId: createForm.requisitionType === 'maintenance' ? createForm.equipmentId : undefined,
      targetZone: createForm.targetZone,
      items: [],
    });
```

- [ ] **Step 8: Keep dispatch behavior unchanged**

Leave this existing `complete` call in place:

```ts
await request.post(`/warehouse/requisitions/${row.id}/complete`);
```

Expected: this plan does not change stock dispatch behavior or inventory movement ledger behavior.

## Task 5: Verify the full targeted change set

**Files:**
- Verify only

- [ ] **Step 1: Validate Prisma schema**

Run:

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

- [ ] **Step 2: Run focused backend tests**

Run:

```bash
(cd server && npm test -- requisition.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 3: Build the client**

Run:

```bash
npm run build:client
```

Expected: PASS. If TypeScript reports an API type mismatch, fix only the GAP-603 touched types and rerun this command.

- [ ] **Step 4: Run the module usage docs check if docs were touched**

Run:

```bash
node tools/check-module-usage-docs.mjs
```

Expected: PASS.

- [ ] **Step 5: Check whitespace against the PR diff**

Run:

```bash
git diff --check origin/master...HEAD
```

Expected: no output and exit code 0.

## Task 6: Commit handoff

**Files:**
- Commit only files changed by this execution

- [ ] **Step 1: Review changed files**

Run:

```bash
git status --short
git diff -- server/src/prisma/schema.prisma server/src/modules/warehouse/dto/requisition.dto.ts server/src/modules/warehouse/requisition.controller.ts server/src/modules/warehouse/requisition.service.ts server/src/modules/warehouse/requisition.service.spec.ts client/src/api/warehouse.ts client/src/views/warehouse/RequisitionList.vue
```

Expected: changed files match this plan. If unrelated user changes exist, leave them untouched and do not include them in the commit.

- [ ] **Step 2: Commit GAP-603 implementation**

Run:

```bash
git add server/src/prisma/schema.prisma \
  server/src/prisma/migrations/20260502110000_add_material_requisition_equipment_id/migration.sql \
  server/src/modules/warehouse/dto/requisition.dto.ts \
  server/src/modules/warehouse/requisition.controller.ts \
  server/src/modules/warehouse/requisition.service.ts \
  server/src/modules/warehouse/requisition.service.spec.ts \
  client/src/api/warehouse.ts \
  client/src/views/warehouse/RequisitionList.vue
git commit -m "feat: link maintenance requisitions to equipment"
```

Expected: commit contains only GAP-603 implementation files.
