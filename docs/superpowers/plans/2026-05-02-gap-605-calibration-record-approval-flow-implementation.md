# GAP-605 Calibration Record Approval Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the equipment/measuring/approval model during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make calibration records require unified approval before they update measuring equipment calibration status.

**Architecture:** Keep `MeasuringEquipment` as the instrument ledger and `CalibrationRecord` as the calibration evidence source. Add calibration approval state fields, create submitted calibration records inside the same transaction that starts `ApprovalInstance`, update the instrument ledger only from approval callbacks, and expose approval state to the measuring-equipment UI.

**Tech Stack:** NestJS, Prisma Client, Prisma migration SQL, class-validator, Jest, Vue 3, Element Plus, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-605 生成 spec 和本 implementation plan。
- **brainstorming 结论：** 采用“创建校准记录即提交审批，审批通过后才更新量器台账”的方案；不采用“先直接生效再复核”或“转成动态 RecordTemplate/Record”的方案。
- **grill-with-docs 校准结论：** `MeasuringEquipment` 是量器台账事实源，`CalibrationRecord` 是校准记录事实源，`ApprovalDefinition/Instance/Task/Action` 是审批事实源；不得新增平行量器台账、平行审批表或批次链路。
- **历史数据结论：** 既有校准记录已经直接影响台账，迁移时标记为 `approved`，不补造历史审批实例。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **命令约束：** 本计划只使用当前仓库 npm workspaces 命令；不得新增 pnpm 命令。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260502000000_gap_605_calibration_approval_flow/migration.sql`
- Modify: `server/src/modules/unified-approval/types.ts`
- Modify: `server/src/modules/unified-approval/approval-engine.service.ts`
- Modify: `server/src/modules/unified-approval/approval-engine.service.spec.ts`
- Modify: `server/src/modules/measuring-equipment/measuring-equipment.module.ts`
- Modify: `server/src/modules/measuring-equipment/measuring-equipment.service.ts`
- Modify: `server/src/modules/measuring-equipment/measuring-equipment.controller.ts`
- Modify: `server/src/modules/measuring-equipment/measuring-equipment.service.spec.ts`
- Modify: `server/src/prisma/seed.ts`
- Modify: `client/src/api/measuring-equipment.ts`
- Modify: `client/src/views/measuring-equipment/EquipmentList.vue`
- Do not modify: `server/src/modules/equipment/**`
- Do not modify: `server/src/modules/approval/**`
- Do not modify: `server/src/modules/workflow/**`
- Do not modify: `server/src/modules/record/**`
- Do not modify: `server/src/modules/record-task/**`
- Do not implement: GAP-604 inspection-record-to-measuring-equipment links

## Task 1: Add calibration approval schema and migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260502000000_gap_605_calibration_approval_flow/migration.sql`

- [ ] **Step 1: Update `CalibrationRecord` model fields**

In `server/src/prisma/schema.prisma`, replace the current `CalibrationRecord` model with:

```prisma
model CalibrationRecord {
  id                     String             @id @default(cuid())
  company_id             String
  measuring_equipment_id String
  measuring_equipment    MeasuringEquipment @relation(fields: [measuring_equipment_id], references: [id])
  calibrated_at          DateTime           @db.Date
  valid_until            DateTime           @db.Date
  calibration_body       String?
  certificate_no         String?
  result                 String             // 'pass'|'fail'|'conditional'
  notes                  String?
  status                 String             @default("submitted") // 'submitted'|'approved'|'rejected'
  approvalInstanceId     String?
  submitted_at           DateTime?
  approved_at            DateTime?
  rejected_at            DateTime?
  rejected_reason        String?
  reviewer_id            String?
  created_by             String?
  created_at             DateTime           @default(now())

  @@index([approvalInstanceId])
  @@index([company_id, status])
  @@index([company_id, measuring_equipment_id, status])
}
```

- [ ] **Step 2: Create the migration SQL**

Create `server/src/prisma/migrations/20260502000000_gap_605_calibration_approval_flow/migration.sql`:

```sql
-- GAP-605: calibration records require unified approval before becoming effective.
ALTER TABLE "CalibrationRecord"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'submitted',
  ADD COLUMN "approvalInstanceId" TEXT,
  ADD COLUMN "submitted_at" TIMESTAMP(3),
  ADD COLUMN "approved_at" TIMESTAMP(3),
  ADD COLUMN "rejected_at" TIMESTAMP(3),
  ADD COLUMN "rejected_reason" TEXT,
  ADD COLUMN "reviewer_id" TEXT;

UPDATE "CalibrationRecord"
SET
  "status" = 'approved',
  "submitted_at" = COALESCE("submitted_at", "created_at"),
  "approved_at" = COALESCE("approved_at", "created_at")
WHERE "status" = 'submitted';

CREATE INDEX "CalibrationRecord_approvalInstanceId_idx"
  ON "CalibrationRecord"("approvalInstanceId");

CREATE INDEX "CalibrationRecord_company_id_status_idx"
  ON "CalibrationRecord"("company_id", "status");

CREATE INDEX "CalibrationRecord_company_id_measuring_equipment_id_status_idx"
  ON "CalibrationRecord"("company_id", "measuring_equipment_id", "status");
```

- [ ] **Step 3: Validate Prisma schema**

Run:

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: command exits 0 and prints that the Prisma schema is valid.

- [ ] **Step 4: Commit schema and migration**

Run:

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260502000000_gap_605_calibration_approval_flow/migration.sql
git commit -m "feat: add calibration approval fields"
```

Expected: commit succeeds with only the schema and migration files staged.

## Task 2: Add optional reject callback support to unified approval

**Files:**
- Modify: `server/src/modules/unified-approval/types.ts`
- Modify: `server/src/modules/unified-approval/approval-engine.service.ts`
- Modify: `server/src/modules/unified-approval/approval-engine.service.spec.ts`

- [ ] **Step 1: Extend approval step type**

In `server/src/modules/unified-approval/types.ts`, update `ApprovalStepDefinition`:

```ts
export interface ApprovalStepDefinition {
  stepKey: string;
  stepName: string;
  mode: ApprovalMode;
  assignments: ApprovalAssignmentDefinition[];
  rejectPolicy?: RejectPolicy;
  onApproved: string;
  onRejected?: string;
  dueHours?: number;
}
```

- [ ] **Step 2: Add rejected callback invocation**

In `server/src/modules/unified-approval/approval-engine.service.ts`, inside `if (status === 'REJECTED') {` and before `await tx.approvalInstance.update({`, insert:

```ts
        const steps = task.instance.definition.steps as ApprovalStepDefinition[];
        const currentStep = steps.find((s) => s.stepKey === task.stepKey);
        if (currentStep?.onRejected) {
          await this.callbackRegistry.invoke(currentStep.onRejected, {
            tx,
            instanceId: task.instanceId,
            resourceType: task.instance.resourceType,
            resourceId: task.instance.resourceId,
            resourceStep: task.instance.resourceStep,
            triggerKey: task.instance.triggerKey,
            actorId,
            taskId: task.id,
            comment,
          });
        }
```

The rejected branch should still cancel pending tasks, update the instance to `REJECTED`, cancel todos, and notify the requester.

- [ ] **Step 3: Add approval-engine rejected callback test**

In `server/src/modules/unified-approval/approval-engine.service.spec.ts`, add a test that builds a task whose definition step contains `onRejected: 'calibration.rejected'`, calls `rejectTask`, and expects `callbackRegistry.invoke` to be called with that key and the resource context.

Use this assertion shape:

```ts
expect(callbackRegistry.invoke).toHaveBeenCalledWith(
  'calibration.rejected',
  expect.objectContaining({
    resourceType: 'calibration_record',
    resourceId: 'cal-1',
    triggerKey: 'submit',
    actorId: 'reviewer-1',
    comment: '证书不完整',
  }),
);
```

- [ ] **Step 4: Run approval-engine test**

Run:

```bash
(cd server && npm test -- approval-engine.service.spec.ts --runInBand)
```

Expected: PASS for `approval-engine.service.spec.ts`.

- [ ] **Step 5: Commit unified approval callback support**

Run:

```bash
git add server/src/modules/unified-approval/types.ts server/src/modules/unified-approval/approval-engine.service.ts server/src/modules/unified-approval/approval-engine.service.spec.ts
git commit -m "feat: support approval rejection callbacks"
```

Expected: commit succeeds with only unified-approval files staged.

## Task 3: Route calibration creation through unified approval

**Files:**
- Modify: `server/src/modules/measuring-equipment/measuring-equipment.module.ts`
- Modify: `server/src/modules/measuring-equipment/measuring-equipment.service.ts`
- Modify: `server/src/modules/measuring-equipment/measuring-equipment.controller.ts`
- Modify: `server/src/modules/measuring-equipment/measuring-equipment.service.spec.ts`

- [ ] **Step 1: Import unified approval in measuring module**

Replace `server/src/modules/measuring-equipment/measuring-equipment.module.ts` with:

```ts
import { Module, OnModuleInit } from '@nestjs/common';
import { MeasuringEquipmentController } from './measuring-equipment.controller';
import { MeasuringEquipmentService } from './measuring-equipment.service';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';

@Module({
  imports: [UnifiedApprovalModule],
  controllers: [MeasuringEquipmentController],
  providers: [MeasuringEquipmentService],
  exports: [MeasuringEquipmentService],
})
export class MeasuringEquipmentModule implements OnModuleInit {
  constructor(private readonly callbacks: ApprovalCallbackRegistry) {}

  onModuleInit() {
    this.callbacks.register('measuringEquipment.calibrationApproved', async (context: any) => {
      await MeasuringEquipmentService.applyCalibrationApproval(context.tx, context.resourceId, context.actorId);
    });
    this.callbacks.register('measuringEquipment.calibrationRejected', async (context: any) => {
      await MeasuringEquipmentService.applyCalibrationRejection(
        context.tx,
        context.resourceId,
        context.actorId,
        context.comment ?? '',
      );
    });
  }
}
```

- [ ] **Step 2: Inject `ApprovalEngineService` into service**

In `server/src/modules/measuring-equipment/measuring-equipment.service.ts`, change imports and constructor to:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from '../unified-approval/approval-engine.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreateCalibrationDto } from './dto/create-calibration.dto';

@Injectable()
export class MeasuringEquipmentService {
  constructor(
    private prisma: PrismaService,
    private approvalEngine: ApprovalEngineService,
  ) {}
```

- [ ] **Step 3: Replace `createCalibration` with approval-gated creation**

Replace `createCalibration` in `server/src/modules/measuring-equipment/measuring-equipment.service.ts`:

```ts
  async createCalibration(dto: CreateCalibrationDto, companyId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const equipment = await tx.measuringEquipment.findFirst({
        where: { id: dto.measuring_equipment_id, company_id: companyId },
      });
      if (!equipment) {
        throw new NotFoundException('计量器具不存在');
      }

      const record = await tx.calibrationRecord.create({
        data: {
          company_id: companyId,
          measuring_equipment_id: dto.measuring_equipment_id,
          calibrated_at: new Date(dto.calibrated_at),
          valid_until: new Date(dto.valid_until),
          result: dto.result,
          calibration_body: dto.calibration_body,
          certificate_no: dto.certificate_no,
          notes: dto.notes,
          status: 'submitted',
          submitted_at: new Date(),
          created_by: userId,
        },
      });

      const approval = await this.approvalEngine.startApproval({
        tx,
        resourceType: 'calibration_record',
        resourceId: record.id,
        resourceStep: 'submit',
        triggerKey: 'submit',
        title: `计量器具校准记录审批：${equipment.name}`,
        createdById: userId,
      });

      return tx.calibrationRecord.update({
        where: { id: record.id },
        data: { approvalInstanceId: approval.id },
      });
    });
  }
```

- [ ] **Step 4: Add approval callback helpers**

Add these static methods before `findCalibrationsByEquipment`:

```ts
  static async applyCalibrationApproval(tx: any, calibrationId: string, reviewerId: string) {
    const record = await tx.calibrationRecord.findUnique({ where: { id: calibrationId } });
    if (!record) throw new NotFoundException('校准记录不存在');
    if (record.status !== 'submitted') {
      throw new BadRequestException('只有待审批校准记录可以审批通过');
    }

    await tx.calibrationRecord.update({
      where: { id: calibrationId },
      data: {
        status: 'approved',
        approved_at: new Date(),
        reviewer_id: reviewerId,
      },
    });

    await tx.measuringEquipment.update({
      where: { id: record.measuring_equipment_id },
      data: {
        last_calibrated_at: record.calibrated_at,
        next_calibration_at: record.valid_until,
        status: record.result === 'fail' ? 'overdue' : 'normal',
      },
    });
  }

  static async applyCalibrationRejection(tx: any, calibrationId: string, reviewerId: string, reason: string) {
    const record = await tx.calibrationRecord.findUnique({ where: { id: calibrationId } });
    if (!record) throw new NotFoundException('校准记录不存在');
    if (record.status !== 'submitted') {
      throw new BadRequestException('只有待审批校准记录可以驳回');
    }

    await tx.calibrationRecord.update({
      where: { id: calibrationId },
      data: {
        status: 'rejected',
        rejected_at: new Date(),
        rejected_reason: reason,
        reviewer_id: reviewerId,
      },
    });
  }
```

- [ ] **Step 5: Filter list page's latest calibration to approved records**

In `findAllEquipment`, update the included calibration records:

```ts
        calibration_records: {
          where: { status: 'approved' },
          orderBy: { calibrated_at: 'desc' },
          take: 1,
        },
```

- [ ] **Step 6: Pass user id from controller**

In `server/src/modules/measuring-equipment/measuring-equipment.controller.ts`, replace the calibration endpoint body:

```ts
  @Post('calibrations')
  createCalibration(@Body() dto: CreateCalibrationDto, @Request() req: AuthenticatedRequest) {
    return this.service.createCalibration(dto, req.user.companyId, req.user.id ?? req.user.userId);
  }
```

- [ ] **Step 7: Update measuring service tests**

In `server/src/modules/measuring-equipment/measuring-equipment.service.spec.ts`:

1. Add `$transaction: jest.fn()` to the Prisma mock.
2. Add `const approvalEngine = { startApproval: jest.fn() };`.
3. Construct the service with `new MeasuringEquipmentService(prisma as any, approvalEngine as any)`.
4. In `beforeEach`, set:

```ts
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
```

5. Replace the existing successful calibration creation expectation with:

```ts
    prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'eq1', name: '电子秤' });
    prisma.calibrationRecord.create.mockResolvedValue({ id: 'cal1' });
    approvalEngine.startApproval.mockResolvedValue({ id: 'approval-1' });
    prisma.calibrationRecord.update.mockResolvedValue({ id: 'cal1', approvalInstanceId: 'approval-1' });

    await service.createCalibration({
      measuring_equipment_id: 'eq1',
      calibrated_at: '2026-05-01',
      valid_until: '2027-05-01',
      result: 'pass',
    } as any, 'company-2', 'user-1');

    expect(prisma.calibrationRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: 'company-2',
          status: 'submitted',
          created_by: 'user-1',
        }),
      }),
    );
    expect(approvalEngine.startApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'calibration_record',
        resourceId: 'cal1',
        triggerKey: 'submit',
        createdById: 'user-1',
      }),
    );
    expect(prisma.measuringEquipment.update).not.toHaveBeenCalled();
```

6. Add approval callback tests:

```ts
  it('approval callback marks calibration approved and updates equipment', async () => {
    prisma.calibrationRecord.findUnique = jest.fn().mockResolvedValue({
      id: 'cal1',
      status: 'submitted',
      measuring_equipment_id: 'eq1',
      calibrated_at: new Date('2026-05-01'),
      valid_until: new Date('2027-05-01'),
      result: 'pass',
    });
    prisma.calibrationRecord.update = jest.fn().mockResolvedValue({ id: 'cal1', status: 'approved' });
    prisma.measuringEquipment.update.mockResolvedValue({ id: 'eq1' });

    await MeasuringEquipmentService.applyCalibrationApproval(prisma as any, 'cal1', 'reviewer-1');

    expect(prisma.calibrationRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'approved', reviewer_id: 'reviewer-1' }) }),
    );
    expect(prisma.measuringEquipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'eq1' },
        data: expect.objectContaining({ status: 'normal' }),
      }),
    );
  });

  it('rejection callback marks calibration rejected without updating equipment', async () => {
    prisma.calibrationRecord.findUnique = jest.fn().mockResolvedValue({
      id: 'cal1',
      status: 'submitted',
      measuring_equipment_id: 'eq1',
    });
    prisma.calibrationRecord.update = jest.fn().mockResolvedValue({ id: 'cal1', status: 'rejected' });

    await MeasuringEquipmentService.applyCalibrationRejection(prisma as any, 'cal1', 'reviewer-1', '证书不完整');

    expect(prisma.calibrationRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'rejected',
          reviewer_id: 'reviewer-1',
          rejected_reason: '证书不完整',
        }),
      }),
    );
    expect(prisma.measuringEquipment.update).not.toHaveBeenCalled();
  });
```

- [ ] **Step 8: Run measuring-equipment tests**

Run:

```bash
(cd server && npm test -- measuring-equipment.service.spec.ts --runInBand)
```

Expected: PASS for measuring-equipment service tests.

- [ ] **Step 9: Commit backend measuring-equipment approval flow**

Run:

```bash
git add server/src/modules/measuring-equipment
git commit -m "feat: gate calibration records by approval"
```

Expected: commit succeeds with only measuring-equipment module files staged.

## Task 4: Seed calibration approval definition and permission

**Files:**
- Modify: `server/src/prisma/seed.ts`

- [ ] **Step 1: Add fine-grained permission**

In `server/src/prisma/seed.ts`, inside the `permissions` array after `perm_015`, add:

```ts
    {
      id: 'perm_016',
      code: 'approve:calibration_record',
      name: '校准记录审批',
      category: 'approval',
      scope: 'cross_department',
      status: 'active',
      description: '可审批计量器具校准记录',
    },
```

- [ ] **Step 2: Add approval definition**

In `server/src/prisma/seed.ts`, inside `approvalDefinitions` after the `maintenance_record` definition, add:

```ts
    {
      module: 'equipment',
      resourceType: 'calibration_record',
      triggerKey: 'submit',
      name: '计量器具校准记录审批',
      version: 1,
      steps: [
        {
          stepKey: 'calibration-record-review',
          stepName: '校准记录审核',
          mode: 'single',
          assignments: [{ type: 'permission', permissionCode: 'approve:calibration_record', label: '校准记录审核人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'measuringEquipment.calibrationApproved',
          onRejected: 'measuringEquipment.calibrationRejected',
        },
      ],
    },
```

- [ ] **Step 3: Run TypeScript build for seed/type coverage**

Run:

```bash
npm run build:server
```

Expected: Nest build exits 0.

- [ ] **Step 4: Commit seed updates**

Run:

```bash
git add server/src/prisma/seed.ts
git commit -m "feat: seed calibration approval definition"
```

Expected: commit succeeds with only `server/src/prisma/seed.ts` staged.

## Task 5: Expose calibration approval status in the frontend

**Files:**
- Modify: `client/src/api/measuring-equipment.ts`
- Modify: `client/src/views/measuring-equipment/EquipmentList.vue`

- [ ] **Step 1: Extend frontend calibration types**

In `client/src/api/measuring-equipment.ts`, add:

```ts
export type CalibrationApprovalStatus = 'submitted' | 'approved' | 'rejected';
```

Update `CalibrationRecord`:

```ts
export interface CalibrationRecord {
  id: string;
  company_id: string;
  measuring_equipment_id: string;
  calibrated_at: string;
  valid_until: string;
  calibration_body: string | null;
  certificate_no: string | null;
  result: CalibrationResult;
  notes: string | null;
  status: CalibrationApprovalStatus;
  approvalInstanceId: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  reviewer_id: string | null;
  created_by: string | null;
  created_at: string;
}
```

Add display helpers:

```ts
const CALIBRATION_STATUS_MAP: Record<CalibrationApprovalStatus, { text: string; type: string }> = {
  submitted: { text: '待审批', type: 'warning' },
  approved: { text: '已批准', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
};

export function getCalibrationApprovalStatusText(status: string): string {
  return CALIBRATION_STATUS_MAP[status as CalibrationApprovalStatus]?.text ?? status;
}

export function getCalibrationApprovalStatusType(status: string): string {
  return CALIBRATION_STATUS_MAP[status as CalibrationApprovalStatus]?.type ?? 'info';
}
```

- [ ] **Step 2: Update measuring-equipment page imports**

In `client/src/views/measuring-equipment/EquipmentList.vue`, add the new helpers to the existing import from `@/api/measuring-equipment`:

```ts
  getCalibrationApprovalStatusText,
  getCalibrationApprovalStatusType,
```

- [ ] **Step 3: Update calibration button and dialog text**

In `client/src/views/measuring-equipment/EquipmentList.vue`, change:

```vue
<el-button link type="primary" @click="openCalibrationDialog(row)">添加校准</el-button>
```

to:

```vue
<el-button link type="primary" @click="openCalibrationDialog(row)">提交校准</el-button>
```

Change the dialog comment:

```vue
<!-- 添加校准记录 dialog -->
```

to:

```vue
<!-- 提交校准记录审批 dialog -->
```

Change the dialog title:

```vue
title="添加校准记录"
```

to:

```vue
title="提交校准记录审批"
```

Change the footer button text:

```vue
确认添加
```

to:

```vue
提交审批
```

- [ ] **Step 4: Add approval status column to history table**

In the calibration history table, after the result column, add:

```vue
        <el-table-column label="审批状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getCalibrationApprovalStatusType(row.status)" effect="light" size="small">
              {{ getCalibrationApprovalStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
```

- [ ] **Step 5: Show rejection reason in history**

After the certificate number column, add:

```vue
        <el-table-column prop="rejected_reason" label="驳回原因" min-width="140">
          <template #default="{ row }">{{ row.rejected_reason ?? '-' }}</template>
        </el-table-column>
```

- [ ] **Step 6: Update success message**

In `handleCreateCalibration`, change:

```ts
    ElMessage.success('校准记录添加成功');
```

to:

```ts
    ElMessage.success('校准记录已提交审批');
```

- [ ] **Step 7: Run client build**

Run:

```bash
npm run build:client
```

Expected: Vite build exits 0.

- [ ] **Step 8: Commit frontend updates**

Run:

```bash
git add client/src/api/measuring-equipment.ts client/src/views/measuring-equipment/EquipmentList.vue
git commit -m "feat: show calibration approval status"
```

Expected: commit succeeds with only measuring-equipment frontend files staged.

## Task 6: Final verification

**Files:**
- Verify all files changed by Tasks 1-5

- [ ] **Step 1: Run focused backend tests**

Run:

```bash
(cd server && npm test -- approval-engine.service.spec.ts measuring-equipment.service.spec.ts --runInBand)
```

Expected: PASS for both specs.

- [ ] **Step 2: Validate Prisma schema**

Run:

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: command exits 0 and prints that the Prisma schema is valid.

- [ ] **Step 3: Run server build**

Run:

```bash
npm run build:server
```

Expected: Nest build exits 0.

- [ ] **Step 4: Run client build**

Run:

```bash
npm run build:client
```

Expected: Vite build exits 0.

- [ ] **Step 5: Confirm no direct calibration effect remains**

Run:

```bash
rg -n "createCalibration|measuringEquipment\\.update|calibration_record|calibrationApproved|calibrationRejected" server/src/modules/measuring-equipment server/src/modules/unified-approval server/src/prisma/seed.ts
```

Expected:
- `createCalibration` creates `CalibrationRecord` with `status: 'submitted'`.
- `createCalibration` calls `approvalEngine.startApproval`.
- `createCalibration` does not call `measuringEquipment.update`.
- `applyCalibrationApproval` is the only measuring-equipment path that updates `last_calibrated_at` and `next_calibration_at` from a calibration record.
- `seed.ts` contains `resourceType: 'calibration_record'`.

- [ ] **Step 6: Review migration history behavior**

Run:

```bash
rg -n "UPDATE \"CalibrationRecord\"|status' = 'approved|approvalInstanceId" server/src/prisma/migrations/20260502000000_gap_605_calibration_approval_flow/migration.sql server/src/prisma/schema.prisma
```

Expected:
- Migration updates existing `CalibrationRecord` rows to `approved`.
- Schema contains `approvalInstanceId` and indexes for calibration approval lookup.

- [ ] **Step 7: Commit final verification fixes if any**

If Steps 1-6 required fixes, run:

```bash
git add server/src client/src
git commit -m "fix: stabilize calibration approval flow"
```

Expected: commit is only created if there were fixes from verification.

## Execution Handoff

执行 agent 完成本计划后，PR 描述必须明确：

- GAP 编号：GAP-605
- spec：`docs/superpowers/specs/2026-05-02-gap-605-calibration-record-approval-flow-design.md`
- plan：`docs/superpowers/plans/2026-05-02-gap-605-calibration-record-approval-flow-implementation.md`
- 本实现只用 `superpowers:executing-plans`
- 校准记录创建后不再直接更新量器台账
- 审批通过才更新量器台账，审批驳回不更新量器台账
- 历史校准记录迁移为 `approved`，不补造历史审批实例
- 实际运行过的验证命令和结果
