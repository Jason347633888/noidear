# Unified Approval Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scattered approval implementations with a single approval platform that powers documents, R&D signoff, workflow-backed records, warehouse approvals, training-plan approval, equipment review, audit verification, CAPA verification, deviation approval, change approval, unified todos, notifications, and approval history.

**Architecture:** Add `ApprovalDefinition`, `ApprovalInstance`, `ApprovalTask`, and `ApprovalAction` as the only new approval fact source. Business modules keep their own status fields as snapshots, but all new approve/reject decisions go through `ApprovalEngineService`, which resolves assignees server-side, writes audit actions, synchronizes `TodoTask` and `Notification`, and invokes registered business callbacks in the same Prisma transaction when required.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Vue 3, Pinia, Element Plus, Vitest/Jest, Playwright.

---

## Context and Constraints

- Read before implementation:
  - `docs/AGENT_GUIDE.md`
  - `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
  - `docs/superpowers/specs/2026-04-26-unified-approval-platform-design.md`
  - `docs/superpowers/specs/2026-04-26-product-rd-redesign.md`
- Existing untracked directories `client/dist/` and `server/dist/` are unrelated build output. Do not stage or delete them unless the user explicitly asks.
- The product R&D review findings are blocking acceptance:
  - Backend must not trust client-provided role or department.
  - Approval must require existing `ProcessStepData.status === 'SUBMITTED'`.
  - Multi-role steps must render all pending roles and allow only authorized users to act.
  - Step1 Product creation happens only after Step1 approval completes.
  - Frontend reads `stepData`, not stale `stepDataList`.
  - Step5/6/7 approval, side effects, step status, and process advance run in one transaction.
- Execute with frequent commits. Commit after each task that passes its task-level checks.

---

## File Structure

### New Backend Approval Platform

- Create: `server/src/modules/unified-approval/unified-approval.module.ts`  
  Nest module exporting the engine, resolver, bridges, callback registry, and controllers.
- Create: `server/src/modules/unified-approval/types.ts`  
  Shared TypeScript types for approval definitions, assignments, callbacks, task actions, and resource metadata.
- Create: `server/src/modules/unified-approval/dto/start-approval.dto.ts`  
  DTO for explicit approval instance creation.
- Create: `server/src/modules/unified-approval/dto/approval-task-action.dto.ts`  
  DTO for approve/reject/claim/transfer.
- Create: `server/src/modules/unified-approval/approval-assignment.resolver.ts`  
  Server-side authorization and assignee expansion.
- Create: `server/src/modules/unified-approval/approval-engine.service.ts`  
  Starts approvals and processes task actions.
- Create: `server/src/modules/unified-approval/approval-todo.bridge.ts`  
  Synchronizes `ApprovalTask` with `TodoTask`.
- Create: `server/src/modules/unified-approval/approval-notification.bridge.ts`  
  Sends notifications for approval requests and outcomes.
- Create: `server/src/modules/unified-approval/approval-callback.registry.ts`  
  Registers business callbacks and invokes them by key.
- Create: `server/src/modules/unified-approval/approval-definition.controller.ts`  
  CRUD/read API for approval definitions.
- Create: `server/src/modules/unified-approval/approval-instance.controller.ts`  
  Approval instance query/start API.
- Create: `server/src/modules/unified-approval/approval-task.controller.ts`  
  My pending/history and approve/reject/claim/transfer API.
- Create: `server/src/modules/unified-approval/*.spec.ts`  
  Unit tests for resolver, engine, bridge behavior, and callback invocation.

### Schema and Seed

- Modify: `server/src/prisma/schema.prisma`  
  Add approval platform models, `TodoType.approval_task`, and optional `approvalInstanceId` fields to business models.
- Modify: `server/src/prisma/seed.ts`  
  Seed active `ApprovalDefinition` rows for all first-batch resource types.

### Backend Business Integration

- Modify: `server/src/app.module.ts`  
  Import `UnifiedApprovalModule`.
- Modify: `server/src/modules/approval/approval.service.ts` and `server/src/modules/approval/approval.controller.ts`  
  Convert old document approval endpoints into compatibility wrappers.
- Modify: `server/src/modules/document/document.service.ts`  
  Start document approvals and register document approval callback.
- Modify: `server/src/modules/process/process.module.ts`  
  Import unified approval and register process callbacks.
- Modify: `server/src/modules/process/process-instance.controller.ts`  
  Start approval instances on submitted R&D steps and stop using `ProcessStepApproval`.
- Modify: `server/src/modules/process/process-step-approval.service.ts`  
  Keep read-only compatibility or remove provider usage after process migration.
- Modify: `server/src/modules/record/record.service.ts`  
  Start approval for templates with `approvalRequired`.
- Modify: `server/src/modules/task/task.service.ts`  
  Route `TaskRecord` approval through unified approval.
- Modify: `server/src/modules/workflow/workflow-instance.service.ts` and `server/src/modules/workflow/workflow-task.service.ts`  
  Route new workflow approvals through unified approval and keep old instances compatible.
- Modify: warehouse services:
  - `server/src/modules/warehouse/requisition.service.ts`
  - `server/src/modules/warehouse/inbound.service.ts`
  - `server/src/modules/warehouse/services/return.service.ts`
  - `server/src/modules/warehouse/services/scrap.service.ts`
- Modify: `server/src/modules/training/training.service.ts`
- Modify: `server/src/modules/equipment/record.service.ts`
- Modify: `server/src/modules/internal-audit/rectification/rectification.service.ts`
- Modify: `server/src/modules/internal-audit/verification/verification.service.ts`
- Modify: `server/src/modules/corrective-action/verification-record.service.ts`
- Modify: `server/src/modules/deviation/deviation.service.ts`
- Modify: `server/src/modules/change-event/change-event.service.ts`

### Frontend Integration

- Create: `client/src/api/unified-approval.ts`
- Create: `client/src/components/approval/ApprovalTaskPanel.vue`
- Modify: `client/src/api/process.ts`
- Modify: `client/src/api/approval.ts`
- Modify: `client/src/api/todo.ts`
- Modify: `client/src/types/todo.ts`
- Modify: `client/src/views/process/ProcessDetail.vue`
- Modify: `client/src/views/process/Step1.vue`
- Modify: `client/src/views/process/Step2.vue`
- Modify: `client/src/views/process/Step4.vue`
- Modify: `client/src/views/process/Step5.vue`
- Modify: `client/src/views/process/Step6.vue`
- Modify: `client/src/views/process/Step7.vue`
- Modify: `client/src/views/approvals/ApprovalPending.vue`
- Modify: `client/src/views/approvals/ApprovalDetail.vue`
- Modify: `client/src/views/approvals/ApprovalHistory.vue`
- Modify: `client/src/views/my-todos/MyTodos.vue`
- Modify: `client/src/views/my-todos/TodoTable.vue`

---

## Task 1: Schema and Prisma Migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Generate: `server/src/prisma/migrations/<timestamp>_unified_approval_platform/migration.sql`

- [ ] **Step 1: Add schema models and fields**

In `server/src/prisma/schema.prisma`, add `approval_task` to `TodoType`:

```prisma
enum TodoType {
  training_organize
  training_attend
  approval
  approval_task
  audit_rectification
  equipment_maintain
  inventory
  change_request
}
```

Add relations to `User`:

```prisma
  approvalInstancesCreated ApprovalInstance[] @relation("ApprovalInstanceCreator")
  approvalTasksAssigned    ApprovalTask[]     @relation("ApprovalTaskAssignee")
  approvalTasksClaimed     ApprovalTask[]     @relation("ApprovalTaskClaimer")
  approvalTasksActed       ApprovalTask[]     @relation("ApprovalTaskActor")
  approvalActions          ApprovalAction[]   @relation("ApprovalActionActor")
```

Add the approval platform models after `Approval`:

```prisma
model ApprovalDefinition {
  id           String   @id @default(cuid())
  module       String
  resourceType String
  triggerKey   String
  name         String
  version      Int
  status       String   @default("active")
  steps        Json
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  instances ApprovalInstance[]

  @@unique([module, resourceType, triggerKey, version])
  @@index([resourceType, triggerKey, status])
  @@map("approval_definitions")
}

model ApprovalInstance {
  id                String   @id @default(cuid())
  definitionId      String
  definition        ApprovalDefinition @relation(fields: [definitionId], references: [id], onDelete: Restrict)
  definitionVersion Int
  resourceType      String
  resourceId        String
  resourceStep      String?
  triggerKey        String
  title             String
  status            String   @default("PENDING")
  currentStepKey    String?
  createdById       String
  createdBy         User     @relation("ApprovalInstanceCreator", fields: [createdById], references: [id], onDelete: Restrict)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  completedAt       DateTime?

  tasks   ApprovalTask[]
  actions ApprovalAction[]

  @@index([resourceType, resourceId])
  @@index([resourceType, resourceId, resourceStep])
  @@index([status])
  @@map("approval_instances")
}

model ApprovalTask {
  id                       String   @id @default(cuid())
  instanceId               String
  instance                 ApprovalInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  stepKey                  String
  stepName                 String
  approvalMode             String
  assignmentType           String
  assigneeUserId           String?
  assigneeUser             User?    @relation("ApprovalTaskAssignee", fields: [assigneeUserId], references: [id], onDelete: SetNull)
  assigneeRoleCode         String?
  assigneeDepartmentId     String?
  assigneePermissionCode   String?
  claimMode                String   @default("DIRECT")
  status                   String   @default("PENDING")
  claimedById              String?
  claimedBy                User?    @relation("ApprovalTaskClaimer", fields: [claimedById], references: [id], onDelete: SetNull)
  actedById                String?
  actedBy                  User?    @relation("ApprovalTaskActor", fields: [actedById], references: [id], onDelete: SetNull)
  comment                  String?
  actedAt                  DateTime?
  dueAt                    DateTime?
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  actions ApprovalAction[]

  @@index([instanceId, stepKey])
  @@index([status])
  @@index([assigneeUserId, status])
  @@index([assigneeRoleCode, status])
  @@index([assigneeDepartmentId, status])
  @@index([assigneePermissionCode, status])
  @@map("approval_tasks")
}

model ApprovalAction {
  id         String   @id @default(cuid())
  instanceId String
  instance   ApprovalInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  taskId     String?
  task       ApprovalTask? @relation(fields: [taskId], references: [id], onDelete: SetNull)
  actorId    String
  actor      User     @relation("ApprovalActionActor", fields: [actorId], references: [id], onDelete: Restrict)
  action     String
  comment    String?
  snapshot   Json?
  createdAt  DateTime @default(now())

  @@index([instanceId])
  @@index([taskId])
  @@index([actorId])
  @@map("approval_actions")
}
```

Add optional `approvalInstanceId String?` and an index to these models:

```prisma
model Document {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model ProcessStepData {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model Record {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model TaskRecord {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model MaterialRequisition {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model MaterialInbound {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model MaterialReturn {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model MaterialScrap {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model TrainingPlan {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model MaintenanceRecord {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model AuditFinding {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model CorrectiveAction {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model DeviationReport {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}

model ChangeApproval {
  approvalInstanceId String?
  @@index([approvalInstanceId])
}
```

When inserting these fields, place them near existing `workflowId`, `approvedBy`, or status fields in each model rather than at the end of the file.

- [ ] **Step 2: Validate schema**

Run:

```bash
cd server
npx prisma validate --schema=src/prisma/schema.prisma
```

Expected: `The schema at src/prisma/schema.prisma is valid`.

- [ ] **Step 3: Create migration**

Run:

```bash
cd server
npx prisma migrate dev --name unified_approval_platform --schema=src/prisma/schema.prisma
```

Expected: Prisma creates a migration under `server/src/prisma/migrations/` and regenerates the client.

- [ ] **Step 4: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations
git commit -m "feat: add unified approval schema"
```

---

## Task 2: Shared Approval Types and DTOs

**Files:**
- Create: `server/src/modules/unified-approval/types.ts`
- Create: `server/src/modules/unified-approval/dto/start-approval.dto.ts`
- Create: `server/src/modules/unified-approval/dto/approval-task-action.dto.ts`
- Create: `server/src/modules/unified-approval/dto/index.ts`

- [ ] **Step 1: Create shared types**

Create `server/src/modules/unified-approval/types.ts`:

```ts
import type { Prisma } from '@prisma/client';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ApprovalTaskStatus = ApprovalStatus;
export type ApprovalActionType = 'APPROVE' | 'REJECT' | 'CLAIM' | 'TRANSFER' | 'CANCEL' | 'COMMENT';
export type ApprovalMode = 'single' | 'countersign_all' | 'countersign_any' | 'sequential' | 'parallel_groups';
export type AssignmentType = 'user' | 'role' | 'department' | 'permission';
export type ClaimMode = 'DIRECT' | 'CLAIMABLE';
export type RejectPolicy = 'reject_instance' | 'back_to_submitter';

export interface ApprovalAssignmentDefinition {
  type: AssignmentType;
  userId?: string;
  roleCode?: string;
  departmentCode?: string;
  departmentId?: string;
  permissionCode?: string;
  label?: string;
}

export interface ApprovalStepDefinition {
  stepKey: string;
  stepName: string;
  mode: ApprovalMode;
  assignments: ApprovalAssignmentDefinition[];
  rejectPolicy?: RejectPolicy;
  onApproved: string;
  dueHours?: number;
}

export interface StartApprovalInput {
  resourceType: string;
  resourceId: string;
  resourceStep?: string;
  triggerKey: string;
  title: string;
  createdById: string;
  tx?: Prisma.TransactionClient;
}

export interface ApprovalCallbackContext {
  tx: Prisma.TransactionClient;
  instanceId: string;
  resourceType: string;
  resourceId: string;
  resourceStep?: string | null;
  triggerKey: string;
  actorId: string;
  taskId?: string;
  comment?: string;
}

export type ApprovalCallback = (context: ApprovalCallbackContext) => Promise<void>;

export interface ResolvedAssignment {
  assignment: ApprovalAssignmentDefinition;
  assigneeUserIds: string[];
  assigneeRoleCode?: string;
  assigneeDepartmentId?: string;
  assigneePermissionCode?: string;
  claimMode: ClaimMode;
}
```

- [ ] **Step 2: Create DTOs**

Create `server/src/modules/unified-approval/dto/start-approval.dto.ts`:

```ts
import { IsOptional, IsString, MinLength } from 'class-validator';

export class StartApprovalDto {
  @IsString()
  resourceType!: string;

  @IsString()
  resourceId!: string;

  @IsOptional()
  @IsString()
  resourceStep?: string;

  @IsString()
  triggerKey!: string;

  @IsString()
  @MinLength(1)
  title!: string;
}
```

Create `server/src/modules/unified-approval/dto/approval-task-action.dto.ts`:

```ts
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ApprovalTaskActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class RejectApprovalTaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  comment!: string;
}

export class TransferApprovalTaskDto {
  @IsString()
  targetUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
```

Create `server/src/modules/unified-approval/dto/index.ts`:

```ts
export * from './start-approval.dto';
export * from './approval-task-action.dto';
```

- [ ] **Step 3: Type-check the server**

Run:

```bash
cd server
npx tsc --noEmit
```

Expected: no TypeScript errors from the new DTO/type files.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/unified-approval
git commit -m "feat: add unified approval shared types"
```

---

## Task 3: Assignment Resolver

**Files:**
- Create: `server/src/modules/unified-approval/approval-assignment.resolver.ts`
- Create: `server/src/modules/unified-approval/approval-assignment.resolver.spec.ts`

- [ ] **Step 1: Write resolver tests**

Create `server/src/modules/unified-approval/approval-assignment.resolver.spec.ts`:

```ts
import { ForbiddenException } from '@nestjs/common';
import { ApprovalAssignmentResolver } from './approval-assignment.resolver';

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
    ...overrides,
  } as any;
}

describe('ApprovalAssignmentResolver', () => {
  it('resolves a direct user assignment', async () => {
    const prisma = makePrisma();
    const resolver = new ApprovalAssignmentResolver(prisma);

    const result = await resolver.resolveAssignment({ type: 'user', userId: 'u1' });

    expect(result.assigneeUserIds).toEqual(['u1']);
    expect(result.claimMode).toBe('DIRECT');
  });

  it('resolves role assignments from active users', async () => {
    const prisma = makePrisma();
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    const resolver = new ApprovalAssignmentResolver(prisma);

    const result = await resolver.resolveAssignment({ type: 'role', roleCode: 'quality_manager' });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        status: 'active',
        OR: [{ role: 'quality_manager' }, { roleObj: { code: 'quality_manager' } }],
      },
      select: { id: true },
    });
    expect(result).toMatchObject({
      assigneeUserIds: ['u1', 'u2'],
      assigneeRoleCode: 'quality_manager',
      claimMode: 'CLAIMABLE',
    });
  });

  it('does not trust a client role when authorizing a task', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      role: 'user',
      roleObj: { code: 'user' },
      departmentId: 'dept-user',
      userPermissions: [],
    });
    const resolver = new ApprovalAssignmentResolver(prisma);

    await expect(
      resolver.assertCanAct({
        userId: 'u1',
        task: {
          assigneeUserId: null,
          assigneeRoleCode: 'gm',
          assigneeDepartmentId: null,
          assigneePermissionCode: null,
          status: 'PENDING',
        },
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows admin override', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin',
      role: 'admin',
      roleObj: { code: 'admin' },
      departmentId: null,
      userPermissions: [],
    });
    const resolver = new ApprovalAssignmentResolver(prisma);

    await expect(
      resolver.assertCanAct({
        userId: 'admin',
        task: {
          assigneeUserId: null,
          assigneeRoleCode: 'gm',
          assigneeDepartmentId: null,
          assigneePermissionCode: null,
          status: 'PENDING',
        },
      }),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd server
npx jest src/modules/unified-approval/approval-assignment.resolver.spec.ts --runInBand
```

Expected: FAIL because `approval-assignment.resolver.ts` does not exist.

- [ ] **Step 3: Implement resolver**

Create `server/src/modules/unified-approval/approval-assignment.resolver.ts`:

```ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ApprovalAssignmentDefinition, ResolvedAssignment } from './types';

interface CanActInput {
  userId: string;
  task: {
    assigneeUserId?: string | null;
    assigneeRoleCode?: string | null;
    assigneeDepartmentId?: string | null;
    assigneePermissionCode?: string | null;
    status: string;
  };
}

@Injectable()
export class ApprovalAssignmentResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAssignment(assignment: ApprovalAssignmentDefinition): Promise<ResolvedAssignment> {
    if (assignment.type === 'user') {
      if (!assignment.userId) throw new NotFoundException('审批定义缺少 userId');
      return { assignment, assigneeUserIds: [assignment.userId], claimMode: 'DIRECT' };
    }

    if (assignment.type === 'role') {
      if (!assignment.roleCode) throw new NotFoundException('审批定义缺少 roleCode');
      const users = await this.prisma.user.findMany({
        where: {
          status: 'active',
          OR: [{ role: assignment.roleCode }, { roleObj: { code: assignment.roleCode } }],
        },
        select: { id: true },
      });
      return {
        assignment,
        assigneeUserIds: users.map((u) => u.id),
        assigneeRoleCode: assignment.roleCode,
        claimMode: 'CLAIMABLE',
      };
    }

    if (assignment.type === 'department') {
      const department = assignment.departmentId
        ? { id: assignment.departmentId }
        : await this.prisma.department.findUnique({
            where: { code: assignment.departmentCode ?? '' },
            select: { id: true },
          });
      if (!department?.id) throw new NotFoundException('审批定义找不到部门');

      const users = await this.prisma.user.findMany({
        where: { status: 'active', departmentId: department.id },
        select: { id: true },
      });
      return {
        assignment,
        assigneeUserIds: users.map((u) => u.id),
        assigneeDepartmentId: department.id,
        claimMode: 'CLAIMABLE',
      };
    }

    if (assignment.type === 'permission') {
      if (!assignment.permissionCode) throw new NotFoundException('审批定义缺少 permissionCode');
      const users = await this.prisma.user.findMany({
        where: {
          status: 'active',
          OR: [
            { userPermissions: { some: { permission: { code: assignment.permissionCode }, granted: true } } },
            { roleObj: { permissions: { some: { permission: { code: assignment.permissionCode } } } } },
          ],
        },
        select: { id: true },
      });
      return {
        assignment,
        assigneeUserIds: users.map((u) => u.id),
        assigneePermissionCode: assignment.permissionCode,
        claimMode: 'CLAIMABLE',
      };
    }

    throw new NotFoundException('不支持的审批分配类型');
  }

  async assertCanAct(input: CanActInput): Promise<void> {
    if (input.task.status !== 'PENDING') {
      throw new ForbiddenException('审批任务不是待处理状态');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      include: {
        roleObj: true,
        userPermissions: { include: { permission: true } },
      },
    });
    if (!user) throw new ForbiddenException('用户不存在');

    const roleCode = user.roleObj?.code ?? user.role;
    if (roleCode === 'admin') return;
    if (input.task.assigneeUserId && input.task.assigneeUserId === input.userId) return;
    if (input.task.assigneeRoleCode && input.task.assigneeRoleCode === roleCode) return;
    if (input.task.assigneeDepartmentId && input.task.assigneeDepartmentId === user.departmentId) return;
    if (
      input.task.assigneePermissionCode &&
      user.userPermissions.some((p: any) => p.granted && p.permission?.code === input.task.assigneePermissionCode)
    ) {
      return;
    }

    throw new ForbiddenException('无权处理该审批任务');
  }
}
```

- [ ] **Step 4: Run resolver tests**

Run:

```bash
cd server
npx jest src/modules/unified-approval/approval-assignment.resolver.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/unified-approval/approval-assignment.resolver.ts server/src/modules/unified-approval/approval-assignment.resolver.spec.ts
git commit -m "feat: add approval assignment resolver"
```

---

## Task 4: Todo and Notification Bridges

**Files:**
- Create: `server/src/modules/unified-approval/approval-todo.bridge.ts`
- Create: `server/src/modules/unified-approval/approval-notification.bridge.ts`
- Create: `server/src/modules/unified-approval/approval-todo.bridge.spec.ts`

- [ ] **Step 1: Write bridge tests**

Create `server/src/modules/unified-approval/approval-todo.bridge.spec.ts`:

```ts
import { ApprovalTodoBridge } from './approval-todo.bridge';

describe('ApprovalTodoBridge', () => {
  it('creates one todo per direct approval task', async () => {
    const prisma = {
      todoTask: { create: jest.fn(), updateMany: jest.fn() },
      approvalTask: { findUnique: jest.fn() },
    } as any;
    const bridge = new ApprovalTodoBridge(prisma);

    await bridge.createTaskTodos({
      tx: prisma,
      task: { id: 'task-1', assigneeUserId: 'user-1', stepName: '审批', instance: { title: '标题' } },
      candidateUserIds: ['user-1'],
    });

    expect(prisma.todoTask.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: 'approval_task',
        relatedId: 'task-1',
        title: '审批：标题',
        status: 'pending',
      }),
    });
  });

  it('closes all todos for a completed approval task', async () => {
    const prisma = {
      todoTask: { create: jest.fn(), updateMany: jest.fn() },
      approvalTask: { findUnique: jest.fn() },
    } as any;
    const bridge = new ApprovalTodoBridge(prisma);

    await bridge.closeTaskTodos(prisma, 'task-1', 'user-1');

    expect(prisma.todoTask.updateMany).toHaveBeenCalledWith({
      where: { type: 'approval_task', relatedId: 'task-1', status: 'pending' },
      data: { status: 'completed', completedAt: expect.any(Date), completedBy: 'user-1' },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server
npx jest src/modules/unified-approval/approval-todo.bridge.spec.ts --runInBand
```

Expected: FAIL because the bridge does not exist.

- [ ] **Step 3: Implement todo bridge**

Create `server/src/modules/unified-approval/approval-todo.bridge.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApprovalTodoBridge {
  constructor(private readonly prisma: PrismaService) {}

  async createTaskTodos(input: {
    tx: any;
    task: { id: string; assigneeUserId?: string | null; stepName: string; instance: { title: string } };
    candidateUserIds: string[];
  }) {
    const userIds = input.task.assigneeUserId ? [input.task.assigneeUserId] : input.candidateUserIds;
    for (const userId of [...new Set(userIds)]) {
      await input.tx.todoTask.create({
        data: {
          userId,
          type: 'approval_task',
          relatedId: input.task.id,
          title: `${input.task.stepName}：${input.task.instance.title}`,
          description: input.task.instance.title,
          status: 'pending',
          priority: 'normal',
        },
      });
    }
  }

  async closeTaskTodos(tx: any, taskId: string, completedBy: string) {
    await tx.todoTask.updateMany({
      where: { type: 'approval_task', relatedId: taskId, status: 'pending' },
      data: { status: 'completed', completedAt: new Date(), completedBy },
    });
  }

  async cancelInstanceTodos(tx: any, instanceId: string, actorId: string) {
    const tasks = await tx.approvalTask.findMany({ where: { instanceId }, select: { id: true } });
    await tx.todoTask.updateMany({
      where: { type: 'approval_task', relatedId: { in: tasks.map((t: any) => t.id) }, status: 'pending' },
      data: { status: 'completed', completedAt: new Date(), completedBy: actorId },
    });
  }
}
```

- [ ] **Step 4: Implement notification bridge**

Create `server/src/modules/unified-approval/approval-notification.bridge.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ApprovalNotificationBridge {
  constructor(private readonly notificationService: NotificationService) {}

  async notifyTaskCreated(userIds: string[], title: string, taskId: string) {
    if (userIds.length === 0) return;
    await this.notificationService.createMany(
      [...new Set(userIds)].map((userId) => ({
        userId,
        type: 'approval_task',
        title: '您有新的审批待办',
        content: `${title} 等待审批，任务 ${taskId}`,
      })),
    );
  }

  async notifyRequester(userId: string, type: 'approved' | 'rejected', title: string) {
    await this.notificationService.create({
      userId,
      type: type === 'approved' ? 'approval_approved' : 'approval_rejected',
      title: type === 'approved' ? '审批已通过' : '审批已驳回',
      content: title,
    });
  }
}
```

- [ ] **Step 5: Run bridge tests**

```bash
cd server
npx jest src/modules/unified-approval/approval-todo.bridge.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/unified-approval/approval-todo.bridge.ts server/src/modules/unified-approval/approval-notification.bridge.ts server/src/modules/unified-approval/approval-todo.bridge.spec.ts
git commit -m "feat: sync approval tasks to todos and notifications"
```

---

## Task 5: Callback Registry

**Files:**
- Create: `server/src/modules/unified-approval/approval-callback.registry.ts`
- Create: `server/src/modules/unified-approval/approval-callback.registry.spec.ts`

- [ ] **Step 1: Write registry tests**

Create `server/src/modules/unified-approval/approval-callback.registry.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { ApprovalCallbackRegistry } from './approval-callback.registry';

describe('ApprovalCallbackRegistry', () => {
  it('registers and invokes a callback', async () => {
    const registry = new ApprovalCallbackRegistry();
    const cb = jest.fn().mockResolvedValue(undefined);
    registry.register('process.stepApproved', cb);

    await registry.invoke('process.stepApproved', {
      tx: {} as any,
      instanceId: 'i1',
      resourceType: 'process_instance',
      resourceId: 'p1',
      triggerKey: 'step:1',
      actorId: 'u1',
    });

    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ resourceId: 'p1' }));
  });

  it('fails when callback key is missing', async () => {
    const registry = new ApprovalCallbackRegistry();
    await expect(
      registry.invoke('missing.key', {
        tx: {} as any,
        instanceId: 'i1',
        resourceType: 'document',
        resourceId: 'd1',
        triggerKey: 'publish',
        actorId: 'u1',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server
npx jest src/modules/unified-approval/approval-callback.registry.spec.ts --runInBand
```

Expected: FAIL because registry does not exist.

- [ ] **Step 3: Implement registry**

Create `server/src/modules/unified-approval/approval-callback.registry.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import type { ApprovalCallback, ApprovalCallbackContext } from './types';

@Injectable()
export class ApprovalCallbackRegistry {
  private readonly callbacks = new Map<string, ApprovalCallback>();

  register(key: string, callback: ApprovalCallback) {
    this.callbacks.set(key, callback);
  }

  async invoke(key: string, context: ApprovalCallbackContext) {
    const callback = this.callbacks.get(key);
    if (!callback) {
      throw new NotFoundException(`审批回调未注册: ${key}`);
    }
    await callback(context);
  }
}
```

- [ ] **Step 4: Run registry tests**

```bash
cd server
npx jest src/modules/unified-approval/approval-callback.registry.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/unified-approval/approval-callback.registry.ts server/src/modules/unified-approval/approval-callback.registry.spec.ts
git commit -m "feat: add approval callback registry"
```

---

## Task 6: Approval Engine

**Files:**
- Create: `server/src/modules/unified-approval/approval-engine.service.ts`
- Create: `server/src/modules/unified-approval/approval-engine.service.spec.ts`

- [ ] **Step 1: Write engine tests**

Create `server/src/modules/unified-approval/approval-engine.service.spec.ts`:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApprovalEngineService } from './approval-engine.service';

function makeDeps() {
  const tx: any = {
    approvalDefinition: { findFirst: jest.fn() },
    approvalInstance: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    approvalTask: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    approvalAction: { create: jest.fn() },
  };
  const prisma: any = {
    $transaction: jest.fn((fn) => fn(tx)),
    ...tx,
  };
  const resolver: any = {
    resolveAssignment: jest.fn(),
    assertCanAct: jest.fn(),
  };
  const todo: any = { createTaskTodos: jest.fn(), closeTaskTodos: jest.fn(), cancelInstanceTodos: jest.fn() };
  const notification: any = { notifyTaskCreated: jest.fn(), notifyRequester: jest.fn() };
  const callbacks: any = { invoke: jest.fn() };
  return { tx, prisma, resolver, todo, notification, callbacks };
}

describe('ApprovalEngineService', () => {
  it('starts an approval and creates first-step tasks', async () => {
    const deps = makeDeps();
    deps.tx.approvalDefinition.findFirst.mockResolvedValue({
      id: 'def-1',
      version: 2,
      steps: [{ stepKey: 's1', stepName: '审批', mode: 'single', assignments: [{ type: 'user', userId: 'u2' }], onApproved: 'x.done' }],
    });
    deps.resolver.resolveAssignment.mockResolvedValue({ assigneeUserIds: ['u2'], claimMode: 'DIRECT' });
    deps.tx.approvalInstance.create.mockResolvedValue({ id: 'inst-1', title: '标题' });
    deps.tx.approvalTask.create.mockResolvedValue({ id: 'task-1', assigneeUserId: 'u2', stepName: '审批', instance: { title: '标题' } });

    const service = new ApprovalEngineService(deps.prisma, deps.resolver, deps.todo, deps.notification, deps.callbacks);
    const result = await service.startApproval({
      resourceType: 'document',
      resourceId: 'doc-1',
      triggerKey: 'publish.level1',
      title: '标题',
      createdById: 'u1',
    });

    expect(result.id).toBe('inst-1');
    expect(deps.tx.approvalTask.create).toHaveBeenCalled();
    expect(deps.todo.createTaskTodos).toHaveBeenCalled();
    expect(deps.notification.notifyTaskCreated).toHaveBeenCalledWith(['u2'], '标题', 'task-1');
  });

  it('rejects start when definition is missing', async () => {
    const deps = makeDeps();
    deps.tx.approvalDefinition.findFirst.mockResolvedValue(null);
    const service = new ApprovalEngineService(deps.prisma, deps.resolver, deps.todo, deps.notification, deps.callbacks);

    await expect(
      service.startApproval({ resourceType: 'document', resourceId: 'd1', triggerKey: 'missing', title: '标题', createdById: 'u1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('approves a single task and invokes callback', async () => {
    const deps = makeDeps();
    deps.tx.approvalTask.findUnique.mockResolvedValue({
      id: 'task-1',
      status: 'PENDING',
      stepKey: 's1',
      approvalMode: 'single',
      instance: {
        id: 'inst-1',
        title: '标题',
        resourceType: 'document',
        resourceId: 'doc-1',
        resourceStep: null,
        triggerKey: 'publish.level1',
        createdById: 'creator',
        definition: { steps: [{ stepKey: 's1', onApproved: 'document.approvalApproved' }] },
      },
    });

    const service = new ApprovalEngineService(deps.prisma, deps.resolver, deps.todo, deps.notification, deps.callbacks);
    await service.approveTask('task-1', 'approver', '通过');

    expect(deps.resolver.assertCanAct).toHaveBeenCalled();
    expect(deps.tx.approvalTask.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { status: 'APPROVED', actedById: 'approver', claimedById: 'approver', comment: '通过', actedAt: expect.any(Date) },
    });
    expect(deps.callbacks.invoke).toHaveBeenCalledWith('document.approvalApproved', expect.objectContaining({ resourceId: 'doc-1' }));
  });

  it('rejects an already completed task', async () => {
    const deps = makeDeps();
    deps.tx.approvalTask.findUnique.mockResolvedValue({ id: 'task-1', status: 'APPROVED', instance: {} });
    const service = new ApprovalEngineService(deps.prisma, deps.resolver, deps.todo, deps.notification, deps.callbacks);

    await expect(service.approveTask('task-1', 'u1')).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server
npx jest src/modules/unified-approval/approval-engine.service.spec.ts --runInBand
```

Expected: FAIL because `ApprovalEngineService` does not exist.

- [ ] **Step 3: Implement engine**

Create `server/src/modules/unified-approval/approval-engine.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalAssignmentResolver } from './approval-assignment.resolver';
import { ApprovalTodoBridge } from './approval-todo.bridge';
import { ApprovalNotificationBridge } from './approval-notification.bridge';
import { ApprovalCallbackRegistry } from './approval-callback.registry';
import type { ApprovalStepDefinition, StartApprovalInput } from './types';

@Injectable()
export class ApprovalEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: ApprovalAssignmentResolver,
    private readonly todoBridge: ApprovalTodoBridge,
    private readonly notificationBridge: ApprovalNotificationBridge,
    private readonly callbackRegistry: ApprovalCallbackRegistry,
  ) {}

  async startApproval(input: StartApprovalInput) {
    const runner = async (tx: any) => {
      const definition = await tx.approvalDefinition.findFirst({
        where: { resourceType: input.resourceType, triggerKey: input.triggerKey, status: 'active' },
        orderBy: { version: 'desc' },
      });
      if (!definition) throw new NotFoundException('审批定义不存在');

      const steps = definition.steps as ApprovalStepDefinition[];
      const firstStep = steps[0];
      if (!firstStep) throw new BadRequestException('审批定义缺少步骤');

      const instance = await tx.approvalInstance.create({
        data: {
          definitionId: definition.id,
          definitionVersion: definition.version,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          resourceStep: input.resourceStep,
          triggerKey: input.triggerKey,
          title: input.title,
          currentStepKey: firstStep.stepKey,
          createdById: input.createdById,
        },
      });

      await this.createTasksForStep(tx, instance, firstStep);
      await tx.approvalAction.create({
        data: {
          instanceId: instance.id,
          actorId: input.createdById,
          action: 'COMMENT',
          comment: '审批流程已发起',
          snapshot: { resourceType: input.resourceType, resourceId: input.resourceId, triggerKey: input.triggerKey },
        },
      });

      return instance;
    };

    return input.tx ? runner(input.tx) : this.prisma.$transaction(runner);
  }

  private async createTasksForStep(tx: any, instance: any, step: ApprovalStepDefinition) {
    for (const assignment of step.assignments) {
      const resolved = await this.resolver.resolveAssignment(assignment);
      const directUserIds = resolved.claimMode === 'DIRECT' ? resolved.assigneeUserIds : [null];

      for (const userId of directUserIds) {
        const task = await tx.approvalTask.create({
          data: {
            instanceId: instance.id,
            stepKey: step.stepKey,
            stepName: step.stepName,
            approvalMode: step.mode,
            assignmentType: assignment.type,
            assigneeUserId: userId,
            assigneeRoleCode: resolved.assigneeRoleCode,
            assigneeDepartmentId: resolved.assigneeDepartmentId,
            assigneePermissionCode: resolved.assigneePermissionCode,
            claimMode: resolved.claimMode,
            dueAt: step.dueHours ? new Date(Date.now() + step.dueHours * 60 * 60 * 1000) : undefined,
          },
          include: { instance: true },
        });
        await this.todoBridge.createTaskTodos({ tx, task, candidateUserIds: resolved.assigneeUserIds });
        await this.notificationBridge.notifyTaskCreated(resolved.assigneeUserIds, instance.title, task.id);
      }
    }
  }

  async approveTask(taskId: string, actorId: string, comment = '') {
    return this.completeTask(taskId, actorId, 'APPROVED', comment);
  }

  async rejectTask(taskId: string, actorId: string, comment: string) {
    return this.completeTask(taskId, actorId, 'REJECTED', comment);
  }

  private async completeTask(taskId: string, actorId: string, status: 'APPROVED' | 'REJECTED', comment: string) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.approvalTask.findUnique({
        where: { id: taskId },
        include: { instance: { include: { definition: true } } },
      });
      if (!task) throw new NotFoundException('审批任务不存在');
      if (task.status !== 'PENDING') throw new BadRequestException('审批任务已经处理');

      await this.resolver.assertCanAct({ userId: actorId, task });

      const updated = await tx.approvalTask.update({
        where: { id: taskId },
        data: { status, actedById: actorId, claimedById: actorId, comment, actedAt: new Date() },
      });
      await tx.approvalAction.create({
        data: {
          instanceId: task.instanceId,
          taskId,
          actorId,
          action: status === 'APPROVED' ? 'APPROVE' : 'REJECT',
          comment,
          snapshot: {
            stepKey: task.stepKey,
            approvalMode: task.approvalMode,
            assignmentType: task.assignmentType,
            assigneeUserId: task.assigneeUserId,
            assigneeRoleCode: task.assigneeRoleCode,
            assigneeDepartmentId: task.assigneeDepartmentId,
            assigneePermissionCode: task.assigneePermissionCode,
          },
        },
      });
      await this.todoBridge.closeTaskTodos(tx, taskId, actorId);

      if (status === 'REJECTED') {
        await tx.approvalTask.updateMany({
          where: { instanceId: task.instanceId, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        await tx.approvalInstance.update({
          where: { id: task.instanceId },
          data: { status: 'REJECTED', completedAt: new Date() },
        });
        await this.todoBridge.cancelInstanceTodos(tx, task.instanceId, actorId);
        await this.notificationBridge.notifyRequester(task.instance.createdById, 'rejected', task.instance.title);
        return updated;
      }

      await this.advanceIfStepComplete(tx, task, actorId, comment);
      return updated;
    });
  }

  private async advanceIfStepComplete(tx: any, task: any, actorId: string, comment: string) {
    const pending = await tx.approvalTask.findMany({
      where: { instanceId: task.instanceId, stepKey: task.stepKey, status: 'PENDING' },
    });

    const isComplete =
      task.approvalMode === 'single' ||
      task.approvalMode === 'countersign_any' ||
      pending.length === 0;

    if (!isComplete) return;

    if (task.approvalMode === 'countersign_any') {
      await tx.approvalTask.updateMany({
        where: { instanceId: task.instanceId, stepKey: task.stepKey, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      await this.todoBridge.cancelInstanceTodos(tx, task.instanceId, actorId);
    }

    const steps = task.instance.definition.steps as ApprovalStepDefinition[];
    const currentIndex = steps.findIndex((s) => s.stepKey === task.stepKey);
    const currentStep = steps[currentIndex];
    const nextStep = steps[currentIndex + 1];

    if (nextStep) {
      await tx.approvalInstance.update({
        where: { id: task.instanceId },
        data: { currentStepKey: nextStep.stepKey },
      });
      await this.createTasksForStep(tx, task.instance, nextStep);
      return;
    }

    await this.callbackRegistry.invoke(currentStep.onApproved, {
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
    await tx.approvalInstance.update({
      where: { id: task.instanceId },
      data: { status: 'APPROVED', completedAt: new Date() },
    });
    await this.notificationBridge.notifyRequester(task.instance.createdById, 'approved', task.instance.title);
  }
}
```

- [ ] **Step 4: Run engine tests**

```bash
cd server
npx jest src/modules/unified-approval/approval-engine.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/unified-approval/approval-engine.service.ts server/src/modules/unified-approval/approval-engine.service.spec.ts
git commit -m "feat: implement unified approval engine"
```

---

## Task 7: Module and Controllers

**Files:**
- Create: `server/src/modules/unified-approval/unified-approval.module.ts`
- Create: `server/src/modules/unified-approval/approval-definition.controller.ts`
- Create: `server/src/modules/unified-approval/approval-instance.controller.ts`
- Create: `server/src/modules/unified-approval/approval-task.controller.ts`
- Modify: `server/src/app.module.ts`

- [ ] **Step 1: Create module**

Create `server/src/modules/unified-approval/unified-approval.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { ApprovalAssignmentResolver } from './approval-assignment.resolver';
import { ApprovalEngineService } from './approval-engine.service';
import { ApprovalTodoBridge } from './approval-todo.bridge';
import { ApprovalNotificationBridge } from './approval-notification.bridge';
import { ApprovalCallbackRegistry } from './approval-callback.registry';
import { ApprovalDefinitionController } from './approval-definition.controller';
import { ApprovalInstanceController } from './approval-instance.controller';
import { ApprovalTaskController } from './approval-task.controller';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [ApprovalDefinitionController, ApprovalInstanceController, ApprovalTaskController],
  providers: [
    ApprovalAssignmentResolver,
    ApprovalEngineService,
    ApprovalTodoBridge,
    ApprovalNotificationBridge,
    ApprovalCallbackRegistry,
  ],
  exports: [ApprovalEngineService, ApprovalCallbackRegistry, ApprovalAssignmentResolver],
})
export class UnifiedApprovalModule {}
```

- [ ] **Step 2: Create definition controller**

Create `server/src/modules/unified-approval/approval-definition.controller.ts`:

```ts
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('approval-definitions')
export class ApprovalDefinitionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(@Query('resourceType') resourceType?: string) {
    return this.prisma.approvalDefinition.findMany({
      where: { ...(resourceType ? { resourceType } : {}) },
      orderBy: [{ resourceType: 'asc' }, { triggerKey: 'asc' }, { version: 'desc' }],
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.approvalDefinition.findUnique({ where: { id } });
  }

  @Post()
  create(@Body() body: any) {
    return this.prisma.approvalDefinition.create({ data: body });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.approvalDefinition.update({ where: { id }, data: body });
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.prisma.approvalDefinition.update({ where: { id }, data: { status: 'active' } });
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.prisma.approvalDefinition.update({ where: { id }, data: { status: 'inactive' } });
  }
}
```

- [ ] **Step 3: Create instance controller**

Create `server/src/modules/unified-approval/approval-instance.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from './approval-engine.service';
import { StartApprovalDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('approval-instances')
export class ApprovalInstanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ApprovalEngineService,
  ) {}

  @Post()
  start(@Body() dto: StartApprovalDto, @Request() req: any) {
    return this.engine.startApproval({ ...dto, createdById: req.user?.id ?? req.user?.userId ?? req.user?.sub });
  }

  @Get()
  findAll() {
    return this.prisma.approvalInstance.findMany({
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('by-resource/:resourceType/:resourceId')
  findByResource(@Param('resourceType') resourceType: string, @Param('resourceId') resourceId: string) {
    return this.prisma.approvalInstance.findMany({
      where: { resourceType, resourceId },
      include: { tasks: true, actions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.approvalInstance.findUnique({
      where: { id },
      include: { tasks: true, actions: true, definition: true },
    });
  }
}
```

- [ ] **Step 4: Create task controller**

Create `server/src/modules/unified-approval/approval-task.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from './approval-engine.service';
import { ApprovalAssignmentResolver } from './approval-assignment.resolver';
import { ApprovalTaskActionDto, RejectApprovalTaskDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('approval-tasks')
export class ApprovalTaskController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ApprovalEngineService,
    private readonly resolver: ApprovalAssignmentResolver,
  ) {}

  @Get('my-pending')
  async findMyPending(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    const rows = await this.prisma.approvalTask.findMany({
      where: { status: 'PENDING' },
      include: { instance: true },
      orderBy: { createdAt: 'desc' },
    });
    const visible = [];
    for (const row of rows) {
      try {
        await this.resolver.assertCanAct({ userId, task: row });
        visible.push(row);
      } catch {
        // The resolver is the authorization boundary; unauthorized claimable tasks are hidden.
      }
    }
    return visible;
  }

  @Get('history')
  history(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    return this.prisma.approvalAction.findMany({
      where: { actorId: userId },
      include: { instance: true, task: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.approvalTask.findUnique({
      where: { id },
      include: { instance: { include: { tasks: true, actions: true } } },
    });
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApprovalTaskActionDto, @Request() req: any) {
    return this.engine.approveTask(id, req.user?.id ?? req.user?.userId ?? req.user?.sub, dto.comment ?? '');
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectApprovalTaskDto, @Request() req: any) {
    return this.engine.rejectTask(id, req.user?.id ?? req.user?.userId ?? req.user?.sub, dto.comment);
  }
}
```

- [ ] **Step 5: Import module in AppModule**

Modify `server/src/app.module.ts`:

```ts
import { UnifiedApprovalModule } from './modules/unified-approval/unified-approval.module';

// add UnifiedApprovalModule to imports
```

- [ ] **Step 6: Run server type-check**

```bash
cd server
npx tsc --noEmit
```

Expected: no TypeScript errors from unified approval module/controllers.

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/unified-approval server/src/app.module.ts
git commit -m "feat: expose unified approval APIs"
```

---

## Task 8: Approval Definition Seed

**Files:**
- Modify: `server/src/prisma/seed.ts`
- Test: `server/src/modules/unified-approval/approval-definition.seed.spec.ts`

- [ ] **Step 1: Add definition factory to seed**

In `server/src/prisma/seed.ts`, add this helper near the product R&D template seed:

```ts
const approvalDefinitions = [
  {
    module: 'document',
    resourceType: 'document',
    triggerKey: 'publish.level1',
    name: '一级文件发布审批',
    version: 1,
    steps: [{ stepKey: 'document-level1', stepName: '一级文件审批', mode: 'sequential', assignments: [{ type: 'role', roleCode: 'gm', label: '总经理' }], rejectPolicy: 'reject_instance', onApproved: 'document.approvalApproved' }],
  },
  {
    module: 'process',
    resourceType: 'process_instance',
    triggerKey: 'step:4',
    name: '产品开发评审五部门会签',
    version: 1,
    steps: [{
      stepKey: 'process-step4-review',
      stepName: '产品开发评审会签',
      mode: 'countersign_all',
      assignments: [
        { type: 'role', roleCode: 'quality', label: '品质部' },
        { type: 'role', roleCode: 'manufacture', label: '制造部' },
        { type: 'role', roleCode: 'purchase', label: '采购部' },
        { type: 'role', roleCode: 'development', label: '产品开发部' },
        { type: 'role', roleCode: 'gm', label: '总经理' },
      ],
      rejectPolicy: 'reject_instance',
      onApproved: 'process.stepApproved',
    }],
  },
  { module: 'record', resourceType: 'record', triggerKey: 'submit', name: '记录提交审批', version: 1, steps: [{ stepKey: 'record-submit', stepName: '记录审批', mode: 'single', assignments: [{ type: 'permission', permissionCode: 'approve:record', label: '记录审批人' }], rejectPolicy: 'reject_instance', onApproved: 'record.submitApproved' }] },
  { module: 'task', resourceType: 'task_record', triggerKey: 'submit', name: '任务记录审批', version: 1, steps: [{ stepKey: 'task-record-submit', stepName: '任务记录审批', mode: 'single', assignments: [{ type: 'permission', permissionCode: 'approve:task_record', label: '任务记录审批人' }], rejectPolicy: 'reject_instance', onApproved: 'taskRecord.approvalApproved' }] },
  { module: 'warehouse', resourceType: 'material_requisition', triggerKey: 'submit', name: '领料单审批', version: 1, steps: [{ stepKey: 'warehouse-requisition', stepName: '领料审批', mode: 'single', assignments: [{ type: 'permission', permissionCode: 'approve:warehouse', label: '仓储审批人' }], rejectPolicy: 'reject_instance', onApproved: 'warehouse.requisitionApproved' }] },
  { module: 'warehouse', resourceType: 'material_inbound', triggerKey: 'submit', name: '入库单审批', version: 1, steps: [{ stepKey: 'warehouse-inbound', stepName: '入库审批', mode: 'single', assignments: [{ type: 'permission', permissionCode: 'approve:warehouse', label: '仓储审批人' }], rejectPolicy: 'reject_instance', onApproved: 'warehouse.inboundApproved' }] },
  { module: 'warehouse', resourceType: 'material_return', triggerKey: 'submit', name: '退料单审批', version: 1, steps: [{ stepKey: 'warehouse-return', stepName: '退料审批', mode: 'single', assignments: [{ type: 'permission', permissionCode: 'approve:warehouse', label: '仓储审批人' }], rejectPolicy: 'reject_instance', onApproved: 'warehouse.returnApproved' }] },
  { module: 'warehouse', resourceType: 'material_scrap', triggerKey: 'submit', name: '报废单审批', version: 1, steps: [{ stepKey: 'warehouse-scrap', stepName: '报废审批', mode: 'single', assignments: [{ type: 'permission', permissionCode: 'approve:warehouse', label: '仓储审批人' }], rejectPolicy: 'reject_instance', onApproved: 'warehouse.scrapApproved' }] },
  { module: 'training', resourceType: 'training_plan', triggerKey: 'submit', name: '培训计划审批', version: 1, steps: [{ stepKey: 'training-plan', stepName: '培训计划审批', mode: 'single', assignments: [{ type: 'permission', permissionCode: 'approve:training_plan', label: '培训审批人' }], rejectPolicy: 'reject_instance', onApproved: 'training.planApproved' }] },
  { module: 'equipment', resourceType: 'maintenance_record', triggerKey: 'submit', name: '设备维保审核', version: 1, steps: [{ stepKey: 'maintenance-record', stepName: '维保审核', mode: 'single', assignments: [{ type: 'permission', permissionCode: 'approve:maintenance_record', label: '设备审核人' }], rejectPolicy: 'reject_instance', onApproved: 'equipment.maintenanceApproved' }] },
  { module: 'audit', resourceType: 'audit_finding', triggerKey: 'rectification_submitted', name: '内审整改复审', version: 1, steps: [{ stepKey: 'audit-finding-verification', stepName: '整改复审', mode: 'single', assignments: [{ type: 'permission', permissionCode: 'approve:audit_finding', label: '内审复审人' }], rejectPolicy: 'reject_instance', onApproved: 'audit.findingVerified' }] },
  { module: 'capa', resourceType: 'corrective_action', triggerKey: 'verify_close', name: 'CAPA验证关闭', version: 1, steps: [{ stepKey: 'capa-verify-close', stepName: 'CAPA验证', mode: 'single', assignments: [{ type: 'permission', permissionCode: 'approve:capa', label: 'CAPA验证人' }], rejectPolicy: 'reject_instance', onApproved: 'capa.verificationApproved' }] },
  { module: 'deviation', resourceType: 'deviation_report', triggerKey: 'submit', name: '偏离报告审批', version: 1, steps: [{ stepKey: 'deviation-submit', stepName: '偏离审批', mode: 'single', assignments: [{ type: 'permission', permissionCode: 'approve:deviation', label: '偏离审批人' }], rejectPolicy: 'reject_instance', onApproved: 'deviation.approvalApproved' }] },
  { module: 'change', resourceType: 'change_event', triggerKey: 'approve_change', name: '变更审批', version: 1, steps: [{ stepKey: 'change-approval', stepName: '变更审批', mode: 'single', assignments: [{ type: 'permission', permissionCode: 'approve:change_event', label: '变更审批人' }], rejectPolicy: 'reject_instance', onApproved: 'changeEvent.approvalApproved' }] },
];

for (const definition of approvalDefinitions) {
  await prisma.approvalDefinition.upsert({
    where: {
      module_resourceType_triggerKey_version: {
        module: definition.module,
        resourceType: definition.resourceType,
        triggerKey: definition.triggerKey,
        version: definition.version,
      },
    },
    update: { name: definition.name, steps: definition.steps as any, status: 'active' },
    create: { ...definition, steps: definition.steps as any, status: 'active' },
  });
}
```

Also seed individual process step definitions for `step:1`, `step:2`, `step:5`, `step:6`, and `step:7` using the same structure:

```ts
const processApprovalDefinitions = [
  { triggerKey: 'step:1', name: '新产品开发申请审批', roleCode: 'gm', stepName: '总经理审批' },
  { triggerKey: 'step:2', name: '新产品开发计划审批', roleCode: 'manager', stepName: '研发经理审批' },
  { triggerKey: 'step:5', name: '产品标签信息确认', roleCode: 'gm', stepName: '总经理确认' },
];

for (const row of processApprovalDefinitions) {
  await prisma.approvalDefinition.upsert({
    where: {
      module_resourceType_triggerKey_version: {
        module: 'process',
        resourceType: 'process_instance',
        triggerKey: row.triggerKey,
        version: 1,
      },
    },
    update: {
      name: row.name,
      status: 'active',
      steps: [{ stepKey: `process-${row.triggerKey}`, stepName: row.stepName, mode: 'single', assignments: [{ type: 'role', roleCode: row.roleCode, label: row.stepName }], rejectPolicy: 'reject_instance', onApproved: 'process.stepApproved' }] as any,
    },
    create: {
      module: 'process',
      resourceType: 'process_instance',
      triggerKey: row.triggerKey,
      name: row.name,
      version: 1,
      status: 'active',
      steps: [{ stepKey: `process-${row.triggerKey}`, stepName: row.stepName, mode: 'single', assignments: [{ type: 'role', roleCode: row.roleCode, label: row.stepName }], rejectPolicy: 'reject_instance', onApproved: 'process.stepApproved' }] as any,
    },
  });
}
```

- [ ] **Step 2: Validate seed compiles**

```bash
cd server
npx tsc --noEmit
```

Expected: no seed type errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/prisma/seed.ts
git commit -m "feat: seed unified approval definitions"
```

---

## Task 9: R&D Process Integration and Review-Finding Fixes

**Files:**
- Modify: `server/src/modules/process/process.module.ts`
- Modify: `server/src/modules/process/process-instance.controller.ts`
- Modify: `server/src/modules/process/process-step-approval.service.ts`
- Modify: `client/src/api/process.ts`
- Modify: `client/src/views/process/ProcessDetail.vue`
- Create: `client/src/components/approval/ApprovalTaskPanel.vue`
- Modify: `client/src/views/process/Step1.vue`
- Modify: `client/src/views/process/Step2.vue`
- Modify: `client/src/views/process/Step4.vue`
- Modify: `client/src/views/process/Step5.vue`
- Modify: `client/src/views/process/Step6.vue`
- Modify: `client/src/views/process/Step7.vue`
- Test: `server/src/modules/process/process-instance.controller.spec.ts`

- [ ] **Step 1: Write backend R&D approval tests**

Create or extend `server/src/modules/process/process-instance.controller.spec.ts` with these cases:

```ts
describe('ProcessInstanceController unified approval integration', () => {
  it('submits an approval-required step without advancing the process', async () => {
    const prisma: any = {
      processInstance: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', currentStep: 1, templateId: 'tpl1' }) },
      processTemplate: { findUnique: jest.fn().mockResolvedValue({ steps: [{ stepNumber: 1, requiredApprovals: [{ role: 'gm' }] }] }) },
      processStepData: { upsert: jest.fn().mockResolvedValue({ id: 'sd1', stepNumber: 1, status: 'SUBMITTED' }), update: jest.fn() },
    };
    const engine: any = { startApproval: jest.fn().mockResolvedValue({ id: 'appr1' }) };
    const controller = new ProcessInstanceController(prisma, engine);

    const result = await controller.submitStep('p1', { stepNumber: 1, data: { productName: '新品' }, saveAsDraft: false }, { user: { id: 'u1' } });

    expect(engine.startApproval).toHaveBeenCalledWith(expect.objectContaining({
      resourceType: 'process_instance',
      resourceId: 'p1',
      resourceStep: 'step:1',
      triggerKey: 'step:1',
    }));
    expect(result.data.status).toBe('SUBMITTED');
  });

  it('auto-approves only Step3 when trial conclusion passes', async () => {
    const prisma: any = {
      processInstance: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', currentStep: 3, templateId: 'tpl1' }), update: jest.fn() },
      processTemplate: { findUnique: jest.fn().mockResolvedValue({ steps: [{ stepNumber: 3, requiredApprovals: [] }] }) },
      processStepData: { upsert: jest.fn().mockResolvedValue({ id: 'sd3', stepNumber: 3, status: 'SUBMITTED' }), update: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };
    const engine: any = { startApproval: jest.fn() };
    const controller = new ProcessInstanceController(prisma, engine);

    await controller.submitStep('p1', { stepNumber: 3, data: { trialConclusion: '通过' }, saveAsDraft: false }, { user: { id: 'u1' } });

    expect(engine.startApproval).not.toHaveBeenCalled();
    expect(prisma.processInstance.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ currentStep: 4 }),
    }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server
npx jest src/modules/process/process-instance.controller.spec.ts --runInBand
```

Expected: FAIL because constructor still expects `ProcessStepApprovalService` or tests do not exist yet.

- [ ] **Step 3: Update process module**

Modify `server/src/modules/process/process.module.ts`:

```ts
import { Module, OnModuleInit } from '@nestjs/common';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';

@Module({
  imports: [PrismaModule, UnifiedApprovalModule],
  controllers: [ProcessInstanceController, ProcessTemplateController],
  providers: [ProcessStepApprovalService],
})
export class ProcessModule implements OnModuleInit {
  constructor(
    private readonly callbacks: ApprovalCallbackRegistry,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.callbacks.register('process.stepApproved', async (context) => {
      await applyProcessStepApproved(this.prisma, context);
    });
  }
}
```

Create a local helper in the same file or a new `process-approval.callbacks.ts` if the module becomes too large:

```ts
async function applyProcessStepApproved(prisma: PrismaService, context: any) {
  const tx = context.tx;
  const stepNumber = Number(String(context.resourceStep ?? '').replace('step:', ''));
  const instance = await tx.processInstance.findUnique({
    where: { id: context.resourceId },
    include: { template: true },
  });
  if (!instance) throw new Error('流程实例不存在');

  const stepData = await tx.processStepData.findUnique({
    where: { instanceId_stepNumber: { instanceId: instance.id, stepNumber } },
  });
  if (!stepData || stepData.status !== 'SUBMITTED') {
    throw new Error('步骤必须先提交后才能审批');
  }

  const steps = (instance.template.steps as any[]) ?? [];
  const maxStep = steps.length;
  const isLast = stepNumber >= maxStep;
  const data = (stepData.data as any) ?? {};
  const instanceUpdate: any = {
    currentStep: isLast ? maxStep : stepNumber + 1,
    status: isLast ? 'COMPLETED' : 'IN_PROGRESS',
  };

  if (stepNumber === 1) {
    const productName = data.productName;
    if (productName && !instance.productId) {
      const product = await tx.product.create({
        data: { company_id: '1', code: `RD-${Date.now()}`, name: productName, status: 'draft' },
      });
      instanceUpdate.productName = productName;
      instanceUpdate.productId = product.id;
    }
  }

  if (stepNumber === 5 && instance.productId) {
    await tx.product.update({
      where: { id: instance.productId },
      data: {
        shelf_life_days: data.shelfLifeDays ? parseInt(data.shelfLifeDays, 10) : undefined,
        nutrition_energy: data.nutritionEnergy ? parseFloat(data.nutritionEnergy) : undefined,
        nutrition_protein: data.nutritionProtein ? parseFloat(data.nutritionProtein) : undefined,
        nutrition_fat: data.nutritionFat ? parseFloat(data.nutritionFat) : undefined,
        nutrition_trans_fat: data.nutritionTransFat ? parseFloat(data.nutritionTransFat) : undefined,
        nutrition_carb: data.nutritionCarb ? parseFloat(data.nutritionCarb) : undefined,
        nutrition_sodium: data.nutritionSodium ? parseFloat(data.nutritionSodium) : undefined,
        product_type: data.productType,
        processing_method: data.processingMethod,
        standard_code: data.productStandard,
        storage_method: data.storageConditions,
        consumption_method: data.consumptionMethod,
        label_allergens: Array.isArray(data.allergens) ? data.allergens.join('、') : data.allergens,
        consumer_notice: data.consumerNotice,
      },
    });
  }

  if (stepNumber === 6 && instance.productId) {
    const recipe = await tx.recipe.create({
      data: { company_id: '1', product_id: instance.productId, version: 1, version_note: '研发首版', status: 'draft' },
    });
    await tx.recipeLine.createMany({
      data: ((data.recipeLines as any[]) ?? [])
        .filter((line) => line.materialId)
        .map((line) => ({
          recipe_id: recipe.id,
          material_id: line.materialId,
          qty_per_batch: parseFloat(line.qtyPerBatch) || 0,
          unit: line.unit || 'kg',
          is_critical: line.isCritical ?? false,
          notes: line.notes ?? '',
        })),
    });
  }

  if (isLast && instance.productId) {
    await tx.product.update({ where: { id: instance.productId }, data: { status: 'active' } });
  }

  await tx.processStepData.update({
    where: { instanceId_stepNumber: { instanceId: instance.id, stepNumber } },
    data: { status: 'APPROVED', approvedById: context.actorId, approvedAt: new Date() },
  });
  await tx.processInstance.update({ where: { id: instance.id }, data: instanceUpdate });
}
```

- [ ] **Step 4: Update ProcessInstanceController**

Modify constructor to inject `ApprovalEngineService`:

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly approvalEngine: ApprovalEngineService,
) {}
```

Replace submit-step approval logic with:

```ts
if (!saveAsDraft) {
  const actualStepNumber = stepNumber || instance.currentStep;
  const template = await this.prisma.processTemplate.findUnique({ where: { id: instance.templateId } });
  const steps = (template?.steps as any[]) ?? [];
  const stepConfig = steps.find((s: any) => s.stepNumber === actualStepNumber);
  if (!stepConfig) throw new BadRequestException('步骤配置不存在');

  const requiredApprovals = stepConfig.requiredApprovals ?? [];
  if (requiredApprovals.length > 0) {
    const approval = await this.approvalEngine.startApproval({
      resourceType: 'process_instance',
      resourceId: id,
      resourceStep: `step:${actualStepNumber}`,
      triggerKey: `step:${actualStepNumber}`,
      title: `${stepConfig.name ?? `Step ${actualStepNumber}`} - ${instance.productName || (data as any)?.productName || id}`,
      createdById: userId,
    });
    await this.prisma.processStepData.update({
      where: { instanceId_stepNumber: { instanceId: id, stepNumber: actualStepNumber } },
      data: { approvalInstanceId: approval.id },
    });
  } else {
    const isStep3Pass = actualStepNumber === 3 && (data as any)?.trialConclusion === '通过';
    if (!isStep3Pass) throw new BadRequestException('无审批步骤必须满足通过条件后才能提交');
    const maxStep = steps.length;
    await this.prisma.$transaction([
      this.prisma.processStepData.update({
        where: { instanceId_stepNumber: { instanceId: id, stepNumber: actualStepNumber } },
        data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
      }),
      this.prisma.processInstance.update({
        where: { id },
        data: { currentStep: Math.min(actualStepNumber + 1, maxStep), status: 'IN_PROGRESS' },
      }),
    ]);
  }
}
```

Remove or mark deprecated the old endpoint `POST :id/steps/:stepNumber/approvals`. If retained for compatibility, make it find the linked `approvalInstanceId`, choose the current pending `ApprovalTask` authorized for the user server-side, and call `ApprovalEngineService.approveTask` or `rejectTask`. Do not accept client role/department.

- [ ] **Step 5: Update frontend API**

Modify `client/src/api/process.ts`:

```ts
export interface ProcessInstance {
  stepData?: ProcessStepData[];
}

export interface ProcessStepData {
  approvalInstanceId?: string;
}

getInstance: (id: string) =>
  request.get<ProcessInstance>(`/process/instances/${id}`),
```

Remove `stepDataList` from the type. Process detail must use `res.stepData ?? []`.

- [ ] **Step 6: Create ApprovalTaskPanel**

Create `client/src/components/approval/ApprovalTaskPanel.vue`:

```vue
<template>
  <div class="approval-task-panel">
    <el-table :data="tasks" border size="small">
      <el-table-column prop="stepName" label="审批环节" min-width="150" />
      <el-table-column label="指派" min-width="160">
        <template #default="{ row }">
          {{ row.assigneeRoleCode || row.assigneeDepartmentId || row.assigneePermissionCode || row.assigneeUserId || '候选人' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'warning'" size="small">
            {{ statusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="comment" label="意见" min-width="160" />
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button v-if="row.status === 'PENDING' && !disabled" link type="success" @click="act(row.id, 'approve')">同意</el-button>
          <el-button v-if="row.status === 'PENDING' && !disabled" link type="danger" @click="act(row.id, 'reject')">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-input v-if="!disabled" v-model="comment" class="approval-comment" placeholder="审批意见" />
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { ElMessage } from 'element-plus';
import { unifiedApprovalApi, type ApprovalTask } from '@/api/unified-approval';

const props = defineProps<{ approvalInstanceId?: string; disabled?: boolean }>();
const emit = defineEmits<{ signed: [] }>();
const tasks = ref<ApprovalTask[]>([]);
const comment = ref('');

function statusText(status: string) {
  return { PENDING: '待审批', APPROVED: '已通过', REJECTED: '已驳回', CANCELLED: '已取消' }[status] ?? status;
}

async function load() {
  if (!props.approvalInstanceId) {
    tasks.value = [];
    return;
  }
  const instance = await unifiedApprovalApi.getInstance(props.approvalInstanceId);
  tasks.value = instance.tasks ?? [];
}

async function act(taskId: string, action: 'approve' | 'reject') {
  try {
    if (action === 'approve') await unifiedApprovalApi.approveTask(taskId, { comment: comment.value });
    else await unifiedApprovalApi.rejectTask(taskId, { comment: comment.value || '驳回' });
    await load();
    emit('signed');
  } catch {
    ElMessage.error('审批失败');
  }
}

watchEffect(load);
</script>

<style scoped>
.approval-task-panel { margin-top: 12px; }
.approval-comment { margin-top: 12px; max-width: 360px; }
</style>
```

- [ ] **Step 7: Update process views**

In `ProcessDetail.vue`, load steps like:

```ts
const stepDataList = ref<ProcessStepData[]>([]);

async function loadInstance() {
  const res = await processApi.getInstance(instanceId.value);
  instance.value = res;
  stepDataList.value = res.stepData ?? [];
}
```

In Step1/2/4/5/6/7 components, replace `DeptSignoffPanel` with:

```vue
<ApprovalTaskPanel
  v-if="stepData?.approvalInstanceId"
  :approval-instance-id="stepData.approvalInstanceId"
  :disabled="readonly"
  @signed="$emit('refresh')"
/>
```

Do not pass `my-role` or `my-dept` anywhere.

- [ ] **Step 8: Run focused tests**

```bash
cd server
npx jest src/modules/process/process-instance.controller.spec.ts --runInBand
cd ../client
npx vue-tsc --noEmit
```

Expected: backend process tests pass, frontend type-check passes.

- [ ] **Step 9: Commit**

```bash
git add server/src/modules/process client/src/api/process.ts client/src/views/process client/src/components/approval/ApprovalTaskPanel.vue
git commit -m "feat: route rd process approvals through unified approval"
```

---

## Task 10: Document Approval Compatibility

**Files:**
- Modify: `server/src/modules/document/document.service.ts`
- Modify: `server/src/modules/document/document.module.ts`
- Modify: `server/src/modules/approval/approval.service.ts`
- Modify: `server/src/modules/approval/approval.controller.ts`
- Modify: `client/src/api/approval.ts`
- Modify: `client/src/views/approvals/ApprovalPending.vue`
- Modify: `client/src/views/approvals/ApprovalDetail.vue`
- Modify: `client/src/views/approvals/ApprovalHistory.vue`

- [ ] **Step 1: Register document callback**

In `DocumentModule`, import `UnifiedApprovalModule` and register:

```ts
this.callbacks.register('document.approvalApproved', async ({ tx, resourceId, actorId, comment }) => {
  await tx.document.update({
    where: { id: resourceId },
    data: { status: 'approved', approverId: actorId, approvedAt: new Date() },
  });
});
```

- [ ] **Step 2: Start document approvals from document service**

In `DocumentService`, when a document enters pending approval, call:

```ts
const triggerKey = `publish.level${document.level ?? 3}`;
const approval = await this.approvalEngine.startApproval({
  resourceType: 'document',
  resourceId: document.id,
  resourceStep: 'publish',
  triggerKey,
  title: `文件发布审批：${document.title}`,
  createdById,
  tx,
});
await tx.document.update({ where: { id: document.id }, data: { approvalInstanceId: approval.id, status: 'pending' } });
```

- [ ] **Step 3: Convert old ApprovalService to compatibility**

In `ApprovalService.getPendingApprovals`, return unified approval tasks first:

```ts
const tasks = await this.prisma.approvalTask.findMany({
  where: { status: 'PENDING', OR: [{ assigneeUserId: approverId }, { assigneeUserId: null }] },
  include: { instance: true },
  orderBy: { createdAt: 'desc' },
});
```

Keep old `this.prisma.approval.findMany` as a second query and return a combined list with a discriminator:

```ts
return [
  ...tasks.map((task) => ({ source: 'unified', task })),
  ...legacy.map((approval) => ({ source: 'legacy', approval })),
];
```

For `approveUnified`, if `id` matches `ApprovalTask`, call `ApprovalEngineService.approveTask` or `rejectTask`; otherwise retain old legacy behavior.

- [ ] **Step 4: Update frontend approval API**

In `client/src/api/approval.ts`, add unified-compatible types:

```ts
export interface UnifiedApprovalListItem {
  source: 'unified';
  task: {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    stepName: string;
    instance: { id: string; title: string; resourceType: string; resourceId: string };
  };
}

export type ApprovalPendingItem = UnifiedApprovalListItem | { source: 'legacy'; approval: Approval };
```

- [ ] **Step 5: Run tests**

```bash
cd server
npx jest src/modules/approval/approval.service.spec.ts src/modules/document/document-lifecycle.service.spec.ts --runInBand
cd ../client
npx vitest run src/views/approvals/__tests__/ApprovalPending.spec.ts src/views/approvals/__tests__/ApprovalDetail.spec.ts
```

Expected: approval/document compatibility tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/document server/src/modules/approval client/src/api/approval.ts client/src/views/approvals
git commit -m "feat: migrate document approvals to unified platform"
```

---

## Task 11: Record, TaskRecord, and Workflow Integration

**Files:**
- Modify: `server/src/modules/record/record.service.ts`
- Modify: `server/src/modules/task/task.service.ts`
- Modify: `server/src/modules/workflow/workflow-instance.service.ts`
- Modify: `server/src/modules/workflow/workflow-task.service.ts`
- Test: existing service specs in these modules.

- [ ] **Step 1: Record submit starts unified approval**

In `RecordService.create`, replace workflow start for approval-required templates with:

```ts
if (templateAny.approvalRequired) {
  const approval = await this.approvalEngine.startApproval({
    resourceType: 'record',
    resourceId: record.id,
    resourceStep: 'submit',
    triggerKey: 'submit',
    title: `记录审批：${template.name} ${record.number}`,
    createdById: createDto.createdBy,
  });
  await this.prisma.record.update({
    where: { id: record.id },
    data: { status: 'submitted', approvalInstanceId: approval.id },
  });
}
```

Register callback:

```ts
this.callbacks.register('record.submitApproved', async ({ tx, resourceId }) => {
  await tx.record.update({ where: { id: resourceId }, data: { status: 'approved', approvedAt: new Date() } });
});
```

- [ ] **Step 2: TaskRecord submit starts unified approval**

In `TaskService.submit`, when a `TaskRecord` is created or submitted, start:

```ts
const approval = await this.approvalEngine.startApproval({
  resourceType: 'task_record',
  resourceId: taskRecord.id,
  resourceStep: 'submit',
  triggerKey: 'submit',
  title: `任务记录审批：${task.title ?? task.id}`,
  createdById: userId,
});
await this.prisma.taskRecord.update({
  where: { id: taskRecord.id },
  data: { status: 'submitted', approvalInstanceId: approval.id },
});
```

Register callback:

```ts
this.callbacks.register('taskRecord.approvalApproved', async ({ tx, resourceId, actorId, comment }) => {
  await tx.taskRecord.update({
    where: { id: resourceId },
    data: { status: 'approved', approverId: actorId, approvedAt: new Date(), comment },
  });
});
```

- [ ] **Step 3: Workflow compatibility**

In `WorkflowInstanceService.create`, if the workflow is an approval workflow, start unified approval instead of creating new `WorkflowTask` rows:

```ts
const approval = await this.approvalEngine.startApproval({
  resourceType: 'workflow_resource',
  resourceId: instance.resourceId,
  resourceStep: template.code,
  triggerKey: template.code,
  title: instance.resourceTitle,
  createdById: initiatorId,
});
await tx.workflowInstance.update({
  where: { id: instance.id },
  data: { status: 'pending', currentStep: 0 },
});
```

In `WorkflowTaskService.approve`, for old tasks keep legacy behavior; for new workflow records that have unified approval, redirect callers to `ApprovalEngineService`.

- [ ] **Step 4: Run tests**

```bash
cd server
npx jest src/modules/record/record.service.spec.ts src/modules/task/task.service.spec.ts src/modules/workflow/workflow-instance.service.spec.ts src/modules/workflow/workflow-task.service.spec.ts --runInBand
```

Expected: specs pass after updating mocks to include `ApprovalEngineService` and `ApprovalCallbackRegistry`.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/record server/src/modules/task server/src/modules/workflow
git commit -m "feat: route record and workflow approvals through unified platform"
```

---

## Task 12: Warehouse Integration

**Files:**
- Modify: `server/src/modules/warehouse/requisition.service.ts`
- Modify: `server/src/modules/warehouse/inbound.service.ts`
- Modify: `server/src/modules/warehouse/services/return.service.ts`
- Modify: `server/src/modules/warehouse/services/scrap.service.ts`
- Modify: `server/src/modules/warehouse/warehouse.module.ts`

- [ ] **Step 1: Register warehouse callbacks**

In `WarehouseModule`, import `UnifiedApprovalModule` and register:

```ts
this.callbacks.register('warehouse.requisitionApproved', async ({ tx, resourceId, actorId }) => {
  await tx.materialRequisition.update({ where: { id: resourceId }, data: { status: 'approved', approvedBy: actorId, approvedAt: new Date() } });
});
this.callbacks.register('warehouse.inboundApproved', async ({ tx, resourceId, actorId }) => {
  await tx.materialInbound.update({ where: { id: resourceId }, data: { status: 'approved', approvedBy: actorId, approvedAt: new Date() } });
});
this.callbacks.register('warehouse.returnApproved', async ({ tx, resourceId, actorId }) => {
  await tx.materialReturn.update({ where: { id: resourceId }, data: { status: 'approved', approvedBy: actorId, approvedAt: new Date() } });
});
this.callbacks.register('warehouse.scrapApproved', async ({ tx, resourceId, actorId }) => {
  await tx.materialScrap.update({ where: { id: resourceId }, data: { status: 'approved', approvedBy: actorId, approvedAt: new Date() } });
});
```

- [ ] **Step 2: Replace direct approve endpoints with approval start/action**

In each service `submit` method, call `startApproval` after setting status to `pending`:

```ts
const approval = await this.approvalEngine.startApproval({
  resourceType: 'material_requisition',
  resourceId: requisition.id,
  resourceStep: 'submit',
  triggerKey: 'submit',
  title: `领料单审批：${requisition.requisitionNo}`,
  createdById: requisition.applicantId,
});
await this.prisma.materialRequisition.update({
  where: { id: requisition.id },
  data: { approvalInstanceId: approval.id, status: 'pending', submittedAt: new Date() },
});
```

For legacy `approve(id, approverId)` methods, find the pending approval task and call the engine:

```ts
const req = await this.prisma.materialRequisition.findUnique({ where: { id } });
if (!req?.approvalInstanceId) throw new BadRequestException('领料单没有审批实例');
const task = await this.prisma.approvalTask.findFirst({
  where: { instanceId: req.approvalInstanceId, status: 'PENDING' },
});
if (!task) throw new BadRequestException('没有待审批任务');
return this.approvalEngine.approveTask(task.id, approverId, '审批通过');
```

Repeat with correct resource type and title for inbound, return, and scrap.

- [ ] **Step 3: Run warehouse tests**

```bash
cd server
npx jest src/modules/warehouse/requisition.service.spec.ts src/modules/warehouse/inbound.service.spec.ts src/modules/warehouse/services/return.service.spec.ts src/modules/warehouse/services/scrap.service.spec.ts --runInBand
```

Expected: warehouse tests pass after updating mocks.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/warehouse
git commit -m "feat: migrate warehouse approvals to unified platform"
```

---

## Task 13: Training, Equipment, Audit, CAPA, Deviation, and Change Integrations

**Files:**
- Modify: `server/src/modules/training/training.module.ts`
- Modify: `server/src/modules/training/training.service.ts`
- Modify: `server/src/modules/equipment/equipment.module.ts`
- Modify: `server/src/modules/equipment/record.service.ts`
- Modify: `server/src/modules/internal-audit/internal-audit.module.ts`
- Modify: `server/src/modules/internal-audit/rectification/rectification.service.ts`
- Modify: `server/src/modules/internal-audit/verification/verification.service.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.module.ts`
- Modify: `server/src/modules/corrective-action/verification-record.service.ts`
- Modify: `server/src/modules/deviation/deviation.module.ts`
- Modify: `server/src/modules/deviation/deviation.service.ts`
- Modify: `server/src/modules/change-event/change-event.module.ts`
- Modify: `server/src/modules/change-event/change-event.service.ts`

- [ ] **Step 1: Register callbacks**

Register these callbacks in the owning modules:

```ts
this.callbacks.register('training.planApproved', async ({ tx, resourceId }) => {
  await tx.trainingPlan.update({ where: { id: resourceId }, data: { status: 'approved' } });
});

this.callbacks.register('equipment.maintenanceApproved', async ({ tx, resourceId, actorId }) => {
  await tx.maintenanceRecord.update({ where: { id: resourceId }, data: { status: 'approved', reviewerId: actorId, approvedAt: new Date() } });
});

this.callbacks.register('audit.findingVerified', async ({ tx, resourceId, actorId }) => {
  await tx.auditFinding.update({ where: { id: resourceId }, data: { status: 'verified', verifiedBy: actorId, verifiedAt: new Date() } });
});

this.callbacks.register('capa.verificationApproved', async ({ tx, resourceId, actorId }) => {
  await tx.correctiveAction.update({ where: { id: resourceId }, data: { status: 'closed', verified_by: actorId, verified_at: new Date(), closed_at: new Date() } });
});

this.callbacks.register('deviation.approvalApproved', async ({ tx, resourceId }) => {
  await tx.deviationReport.update({ where: { id: resourceId }, data: { status: 'approved' } });
});

this.callbacks.register('changeEvent.approvalApproved', async ({ tx, resourceId, actorId, comment }) => {
  await tx.changeApproval.updateMany({ where: { change_event_id: resourceId }, data: { approver_id: actorId, decision: 'approved', comments: comment, approved_at: new Date() } });
});
```

- [ ] **Step 2: Start approvals from submit/verification points**

For each module, replace direct status transition to pending approval with `ApprovalEngineService.startApproval`.

Training plan:

```ts
const approval = await this.approvalEngine.startApproval({
  resourceType: 'training_plan',
  resourceId: plan.id,
  resourceStep: 'submit',
  triggerKey: 'submit',
  title: `培训计划审批：${plan.title}`,
  createdById: userId,
});
await this.prisma.trainingPlan.update({
  where: { id: plan.id },
  data: { status: 'pending_approval', approvalInstanceId: approval.id },
});
```

Audit finding rectification submitted:

```ts
const approval = await this.approvalEngine.startApproval({
  resourceType: 'audit_finding',
  resourceId: finding.id,
  resourceStep: 'rectification_submitted',
  triggerKey: 'rectification_submitted',
  title: `内审整改复审：${finding.description ?? finding.id}`,
  createdById: userId,
});
await this.prisma.auditFinding.update({
  where: { id: finding.id },
  data: { status: 'pending_verification', approvalInstanceId: approval.id },
});
```

CAPA verification:

```ts
const approval = await this.approvalEngine.startApproval({
  resourceType: 'corrective_action',
  resourceId: capa.id,
  resourceStep: 'verify_close',
  triggerKey: 'verify_close',
  title: `CAPA验证关闭：${capa.capa_no}`,
  createdById: userId,
});
await this.prisma.correctiveAction.update({
  where: { id: capa.id },
  data: { status: 'pending_verification', approvalInstanceId: approval.id },
});
```

Use the same pattern for equipment maintenance, deviation report, and change event with their resource types from the spec.

- [ ] **Step 3: Run module tests**

```bash
cd server
npx jest src/modules/training/training.service.spec.ts src/modules/equipment/record.service.spec.ts src/modules/internal-audit/verification/verification.service.spec.ts src/modules/internal-audit/rectification/rectification.service.spec.ts src/modules/corrective-action/verification-record.service.spec.ts src/modules/deviation/deviation.service.spec.ts --runInBand
```

Expected: tests pass after mocks include `ApprovalEngineService` and callbacks.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/training server/src/modules/equipment server/src/modules/internal-audit server/src/modules/corrective-action server/src/modules/deviation server/src/modules/change-event
git commit -m "feat: migrate remaining approval flows to unified platform"
```

---

## Task 14: Unified Todo and Frontend Approval Center

**Files:**
- Create: `client/src/api/unified-approval.ts`
- Modify: `client/src/types/todo.ts`
- Modify: `client/src/api/todo.ts`
- Modify: `server/src/modules/todo/todo.service.ts`
- Modify: `client/src/views/my-todos/TodoTable.vue`
- Modify: `client/src/views/approvals/ApprovalPending.vue`
- Modify: `client/src/views/approvals/ApprovalDetail.vue`
- Modify: `client/src/views/approvals/ApprovalHistory.vue`

- [ ] **Step 1: Add frontend unified approval API**

Create `client/src/api/unified-approval.ts`:

```ts
import request from './request';

export interface ApprovalTask {
  id: string;
  instanceId: string;
  stepKey: string;
  stepName: string;
  approvalMode: string;
  assignmentType: string;
  assigneeUserId?: string | null;
  assigneeRoleCode?: string | null;
  assigneeDepartmentId?: string | null;
  assigneePermissionCode?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  comment?: string | null;
}

export interface ApprovalInstance {
  id: string;
  title: string;
  resourceType: string;
  resourceId: string;
  resourceStep?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  tasks?: ApprovalTask[];
}

export const unifiedApprovalApi = {
  myPending: () => request.get<ApprovalTask[]>('/approval-tasks/my-pending'),
  history: () => request.get('/approval-tasks/history'),
  getTask: (id: string) => request.get<ApprovalTask & { instance: ApprovalInstance }>(`/approval-tasks/${id}`),
  getInstance: (id: string) => request.get<ApprovalInstance>(`/approval-instances/${id}`),
  getByResource: (resourceType: string, resourceId: string) =>
    request.get<ApprovalInstance[]>(`/approval-instances/by-resource/${resourceType}/${resourceId}`),
  approveTask: (id: string, payload: { comment?: string }) =>
    request.post<ApprovalTask>(`/approval-tasks/${id}/approve`, payload),
  rejectTask: (id: string, payload: { comment: string }) =>
    request.post<ApprovalTask>(`/approval-tasks/${id}/reject`, payload),
};
```

- [ ] **Step 2: Update TodoType and routes**

In `client/src/types/todo.ts`:

```ts
export type TodoType =
  | 'training_attend'
  | 'training_organize'
  | 'approval'
  | 'approval_task'
  | 'audit_rectification'
  | 'equipment_maintain'
  | 'inventory'
  | 'change_request';
```

In `server/src/modules/todo/todo.service.ts`, add:

```ts
approval_task: (id) => `/approvals/detail/${id}`,
```

and add `'approval_task'` to `ALL_TODO_TYPES`.

- [ ] **Step 3: Update TodoTable labels**

In `client/src/views/my-todos/TodoTable.vue`:

```ts
const TYPE_LABELS: Record<TodoType, string> = {
  training_attend: '培训参加',
  training_organize: '培训组织',
  approval: '审批',
  approval_task: '审批',
  audit_rectification: '内审整改',
  equipment_maintain: '设备维护',
  inventory: '盘点',
  change_request: '变更请求',
};
```

For `approval_task`, hide the manual “完成” button and let users jump to approval detail:

```vue
<el-button
  v-if="row.status === 'pending' && row.type !== 'approval_task'"
  type="primary"
  size="small"
  :loading="completing === row.id"
  @click="emit('complete', row)"
>完成</el-button>
```

- [ ] **Step 4: Update approval pages**

In `ApprovalPending.vue`, call `unifiedApprovalApi.myPending()` and render tasks by `instance.title`, `stepName`, and `status`. Approve/reject actions call `unifiedApprovalApi.approveTask` and `unifiedApprovalApi.rejectTask`.

In `ApprovalDetail.vue`, treat the route param as an `ApprovalTask.id` and fetch `GET /approval-tasks/:id`:

```ts
const task = await unifiedApprovalApi.getTask(route.params.id as string);
const instance = task.instance;
```

In `ApprovalHistory.vue`, render `ApprovalAction` rows from `/approval-tasks/history`.

- [ ] **Step 5: Run frontend tests**

```bash
cd client
npx vitest run src/views/approvals/__tests__/ApprovalPending.spec.ts src/views/approvals/__tests__/ApprovalDetail.spec.ts src/views/my-todos
npx vue-tsc --noEmit
```

Expected: tests pass and type-check passes.

- [ ] **Step 6: Commit**

```bash
git add client/src/api/unified-approval.ts client/src/types/todo.ts client/src/api/todo.ts server/src/modules/todo/todo.service.ts client/src/views/my-todos client/src/views/approvals
git commit -m "feat: show unified approvals in todos and approval center"
```

---

## Task 15: End-to-End and Regression Verification

**Files:**
- Create or modify E2E specs under `client/e2e/` and backend tests under `server/test/`.
- No production files should change in this task unless a verification failure exposes a bug.

- [ ] **Step 1: Add R&D E2E acceptance checks**

Add or update an R&D E2E test to verify:

```ts
test('R&D Step1 creates Product only after approval', async ({ page }) => {
  // create process instance
  // submit Step1 with productName
  // assert process detail remains on Step1 with submitted status
  // assert Product is not visible/created yet via API helper
  // approve the linked ApprovalTask as admin
  // assert Product draft exists and ProcessInstance.productId is set
});
```

Also verify Step4 shows all approval tasks, Step6 recipe side effect happens only after approval, and Step7 activates Product only after all tasks approve.

- [ ] **Step 2: Add backend integration checks**

Add backend integration tests for:

```ts
it('rolls back Step6 approval when recipe line creation fails', async () => {
  // arrange a submitted Step6 with invalid material id
  // approve the pending ApprovalTask
  // expect transaction rejection
  // expect ApprovalTask remains PENDING or transaction leaves no APPROVED action
  // expect ProcessStepData is still SUBMITTED
  // expect ProcessInstance.currentStep is still 6
});
```

- [ ] **Step 3: Run targeted backend tests**

```bash
cd server
npx jest src/modules/unified-approval src/modules/process src/modules/approval src/modules/warehouse src/modules/training src/modules/internal-audit src/modules/corrective-action --runInBand
```

Expected: all targeted tests pass.

- [ ] **Step 4: Run backend type-check**

```bash
cd server
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 5: Run frontend type-check and tests**

```bash
cd client
npx vue-tsc --noEmit
npx vitest run
```

Expected: type-check passes and Vitest tests pass.

- [ ] **Step 6: Run E2E smoke**

```bash
cd client
npx playwright test
```

Expected: Playwright suite passes. If the full suite is too slow, run the R&D, approval, warehouse, and record specs first, then run the full suite before final completion.

- [ ] **Step 7: Final review commands**

```bash
git status --short
rg -n "my-role|my-dept|stepDataList|ProcessStepApprovalService\\(|processStepApproval\\.create|advanceStep\\(|updateMany\\(\\{\\s*where: \\{ instanceId.*stepNumber" server/src client/src docs/superpowers/plans/2026-04-26-unified-approval-platform.md
```

Expected:

- `git status --short` only shows intended source changes and known untracked `client/dist/`, `server/dist/` if still present.
- `rg` has no risky R&D approval-role or old step-data hits in active implementation code.

- [ ] **Step 8: Commit verification fixes**

If no production fixes were needed:

```bash
git add client/e2e server/test
git commit -m "test: cover unified approval flows"
```

If verification required production fixes, commit the related source and tests together with a specific message such as:

```bash
git add server/src/modules/unified-approval server/src/modules/process client/src/views/process client/e2e
git commit -m "fix: stabilize unified approval rd flow"
```

---

## Self-Review

### Spec Coverage

- Unified models are covered in Task 1.
- Shared types, DTOs, resolver, engine, bridges, callbacks, module, and controllers are covered in Tasks 2-7.
- Approval definition seed is covered in Task 8.
- R&D integration and all six review findings are covered in Task 9 and Task 15.
- Document approval compatibility is covered in Task 10.
- Dynamic record, task record, and workflow integration are covered in Task 11.
- Warehouse approvals are covered in Task 12.
- Training, equipment, audit, CAPA, deviation, and change approval integrations are covered in Task 13.
- Unified todos, approval center, and frontend API are covered in Task 14.
- Backend, frontend, E2E, and stale-pattern verification are covered in Task 15.

### Placeholder Scan

This plan avoids unresolved placeholders. The migration folder name uses Prisma’s generated timestamp format because Prisma creates it at runtime; all source file paths and code-level interfaces are explicit.

### Type Consistency

- `ApprovalDefinition`, `ApprovalInstance`, `ApprovalTask`, and `ApprovalAction` names match schema, service, controller, and frontend API.
- `approvalInstanceId` is consistently used as the business object back-reference.
- `resourceType`, `resourceId`, `resourceStep`, and `triggerKey` are consistently used across engine inputs, schema, controllers, and callbacks.
- `ApprovalTaskPanel` reads unified `ApprovalInstance.tasks` and never sends role or department from the client.
