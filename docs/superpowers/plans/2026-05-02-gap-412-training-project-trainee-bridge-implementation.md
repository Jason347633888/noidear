# GAP-412 TrainingProject Trainee Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the training domain during execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `TrainingProject.trainees String[]` with a `TrainingProjectTrainee` bridge table while keeping the existing training project API compatible for callers.

**Architecture:** The bridge table becomes the only persisted source of truth for project trainees. Service methods validate active `User` records before new writes, write all related TrainingProject / TrainingProjectTrainee / LearningRecord / TodoTask changes inside one Prisma transaction, and return a derived `trainees: string[]` projection for the current frontend. Migration runs fail-fast preflight before any DDL so orphan trainee IDs or historical empty trainee arrays cannot leave partial schema changes behind.

**Tech Stack:** Prisma schema and SQL migration, NestJS services/controllers/DTOs, class-validator, Vue 3 TypeScript types/API adapter, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-412 生成 spec 和本 implementation plan。
- **brainstorming 结论：** 采用“桥接表唯一事实源 + API 兼容数组投影”。只做服务层校验不能建立数据库完整性；双写过渡会留下两个事实源。
- **grill-with-docs 校准结论：** 本 GAP 复用当前代码中的 `User` 作为业务 Employee 口径落点，不新增人员主数据；培训模块不进入 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 追溯主链；桥接表、学习记录和待办属于同一培训名单一致性边界，执行时必须使用同一个 Prisma transaction client。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展到 trainerId FK、documentIds 重构、培训状态机、考试评分或归档流程重设计。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现当前代码已经移除了 `TrainingProject.trainees`、已存在同名桥接表，或本计划与 `AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`、spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 如果 migration preflight 发现 `training_projects.trainees` 中存在 orphan `User.id` 或空学员数组，不得自动修复；停止并回报需要业务确认。Preflight 必须放在任何 DDL、INSERT、DROP COLUMN 之前，避免失败后遗留半成品结构。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502110000_training_project_trainee_bridge/migration.sql`
- Modify: `server/src/modules/training/dto/update-project.dto.ts`
- Modify: `server/src/modules/training/training.controller.ts`
- Modify: `server/src/modules/training/training.service.ts`
- Modify: `server/src/modules/training/exam.service.ts`
- Modify: `server/src/modules/training/archive.service.ts`
- Modify: `server/src/modules/training/training.service.spec.ts`
- Modify: `client/src/types/training.ts`
- Modify: `client/src/api/training.ts`
- Do not modify: `server/src/modules/internal-audit/**`
- Do not modify: `server/src/modules/traceability/**`
- Do not modify: `server/src/modules/non-conformance/**`
- Do not modify: `server/src/modules/corrective-action/**`

## Task 1: Add focused failing service tests

**Files:**
- Modify: `server/src/modules/training/training.service.spec.ts`

- [ ] **Step 1: Extend the Prisma mock**

In the `mockPrisma` object in `beforeEach`, add `$transaction`, `trainingProjectTrainee`, `user`, and `learningRecord.deleteMany`. The transaction mock deliberately passes the same mock client into the callback so focused tests can assert the methods called through the transaction client.

```ts
      $transaction: jest.fn(async (callback: any) => callback(mockPrisma)),
      trainingProjectTrainee: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
```

Change the existing `learningRecord` mock from:

```ts
      learningRecord: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
```

to:

```ts
      learningRecord: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
```

- [ ] **Step 2: Add bridge links to `mockProject`**

Update the top-level `mockProject` fixture so it still has the API projection `trainees`, and also has the relation data used by the new service:

```ts
    trainees: ['user-2', 'user-3'],
    traineeLinks: [
      {
        id: 'link-1',
        projectId: 'project-1',
        userId: 'user-2',
        createdAt: new Date('2026-01-15'),
        user: {
          id: 'user-2',
          username: 'u2',
          name: '员工2',
          status: 'active',
          deletedAt: null,
          departmentId: 'QA',
        },
      },
      {
        id: 'link-2',
        projectId: 'project-1',
        userId: 'user-3',
        createdAt: new Date('2026-01-15'),
        user: {
          id: 'user-3',
          username: 'u3',
          name: '员工3',
          status: 'active',
          deletedAt: null,
          departmentId: 'QA',
        },
      },
    ],
```

- [ ] **Step 3: Replace the successful createProject test body**

In `describe('createProject')`, replace the body of `it('应该成功创建培训项目', async () => { ... })` with:

```ts
      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-2', status: 'active', deletedAt: null },
        { id: 'user-3', status: 'active', deletedAt: null },
      ]);
      prisma.trainingProject.create.mockResolvedValue({
        ...mockProject,
        traineeLinks: undefined,
      });
      prisma.trainingProject.findUnique.mockResolvedValue(mockProject);
      prisma.trainingProjectTrainee.createMany.mockResolvedValue({ count: 2 });
      prisma.learningRecord.findMany.mockResolvedValue([]);
      prisma.learningRecord.createMany.mockResolvedValue({ count: 2 });
      prisma.todoTask.createMany.mockResolvedValue({ count: 3 });

      const result = await service.createProject({
        planId: 'plan-1',
        title: 'GMP培训',
        department: 'QA',
        quarter: 2,
        trainerId: 'user-1',
        trainees: ['user-2', 'user-3'],
        scheduledDate: new Date('2026-06-01'),
        passingScore: 60,
        maxAttempts: 3,
      }, 'user-1');

      expect(result.trainees).toEqual(['user-2', 'user-3']);
      expect(result.traineeCount).toBe(2);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['user-2', 'user-3'] },
          status: 'active',
          deletedAt: null,
        },
        select: { id: true },
      });
      expect(prisma.trainingProject.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({
          trainees: expect.anything(),
        }),
      });
      expect(prisma.trainingProjectTrainee.createMany).toHaveBeenCalledWith({
        data: [
          { projectId: 'project-1', userId: 'user-2' },
          { projectId: 'project-1', userId: 'user-3' },
        ],
        skipDuplicates: true,
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
```

- [ ] **Step 4: Add invalid trainee tests**

Add these tests inside `describe('createProject')` after the successful create test:

```ts
    it('GAP-412: 创建项目时应该拒绝不存在或非 active 学员', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-2', status: 'active', deletedAt: null },
      ]);

      await expect(service.createProject({
        planId: 'plan-1',
        title: 'GMP培训',
        department: 'QA',
        quarter: 2,
        trainerId: 'user-1',
        trainees: ['user-2', 'missing-user'],
        passingScore: 60,
        maxAttempts: 3,
      }, 'user-1')).rejects.toThrow('学员不存在或已停用');

      expect(prisma.trainingProject.create).not.toHaveBeenCalled();
      expect(prisma.trainingProjectTrainee.createMany).not.toHaveBeenCalled();
    });

    it('GAP-412: 创建项目时应该拒绝空学员名单', async () => {
      prisma.trainingPlan.findUnique.mockResolvedValue(mockPlan);

      await expect(service.createProject({
        planId: 'plan-1',
        title: 'GMP培训',
        department: 'QA',
        quarter: 2,
        trainerId: 'user-1',
        trainees: [],
        passingScore: 60,
        maxAttempts: 3,
      }, 'user-1')).rejects.toThrow('学员数量必须在 1 到 100 人之间');

      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(prisma.trainingProject.create).not.toHaveBeenCalled();
    });
```

- [ ] **Step 5: Run the focused test and confirm it fails before implementation**

```bash
(cd server && npm test -- training.service.spec.ts --runInBand)
```

Expected: FAIL. The current service still writes `trainees` directly on `trainingProject.create`, does not call `trainingProjectTrainee.createMany`, and does not validate `User`.

## Task 2: Add the Prisma bridge model and guarded migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502110000_training_project_trainee_bridge/migration.sql`

- [ ] **Step 1: Add reverse relation on `User`**

In `model User`, below the existing dynamic form / task relation block, add:

```prisma
  // Training relations
  trainingProjectTrainees TrainingProjectTrainee[]
```

- [ ] **Step 2: Replace the `TrainingProject.trainees` persisted field**

In `model TrainingProject`, delete:

```prisma
  trainees      String[] // 学员ID数组
```

Then in the reverse relations section of `TrainingProject`, add:

```prisma
  traineeLinks          TrainingProjectTrainee[]
```

- [ ] **Step 3: Add `TrainingProjectTrainee` model**

Place this model between `TrainingProject` and `TrainingQuestion`:

```prisma
// GAP-412: 培训项目学员桥接表
model TrainingProjectTrainee {
  id        String          @id @default(cuid())
  projectId String
  userId    String
  createdAt DateTime        @default(now())

  project TrainingProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User            @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
  @@map("training_project_trainees")
}
```

- [ ] **Step 4: Create migration SQL**

Create `server/src/prisma/migrations/20260502110000_training_project_trainee_bridge/migration.sql` with this content:

```sql
-- GAP-412: move TrainingProject.trainees String[] into a relational bridge table.
-- This migration intentionally fails if legacy trainee data cannot satisfy User FK constraints.
-- Keep preflight before every DDL statement so a failed migration leaves no partial bridge table behind.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "training_projects" tp
    WHERE COALESCE(array_length(tp."trainees", 1), 0) = 0
  ) THEN
    RAISE EXCEPTION 'Cannot migrate TrainingProject.trainees: projects with empty trainee arrays exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "training_projects" tp
    CROSS JOIN LATERAL unnest(COALESCE(tp."trainees", ARRAY[]::TEXT[])) AS trainee("userId")
    LEFT JOIN "users" u ON u."id" = trainee."userId"
    WHERE u."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot migrate TrainingProject.trainees: orphan user ids exist';
  END IF;
END $$;

CREATE TABLE "training_project_trainees" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "training_project_trainees_pkey" PRIMARY KEY ("id")
);

INSERT INTO "training_project_trainees" ("id", "projectId", "userId", "createdAt")
SELECT
  'tpt_' || md5(src."projectId" || ':' || src."userId") AS "id",
  src."projectId",
  src."userId",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT tp."id" AS "projectId", trainee."userId" AS "userId"
  FROM "training_projects" tp
  CROSS JOIN LATERAL unnest(COALESCE(tp."trainees", ARRAY[]::TEXT[])) AS trainee("userId")
) src;

CREATE UNIQUE INDEX "training_project_trainees_projectId_userId_key"
  ON "training_project_trainees"("projectId", "userId");

CREATE INDEX "training_project_trainees_projectId_idx"
  ON "training_project_trainees"("projectId");

CREATE INDEX "training_project_trainees_userId_idx"
  ON "training_project_trainees"("userId");

ALTER TABLE "training_project_trainees"
  ADD CONSTRAINT "training_project_trainees_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "training_projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "training_project_trainees"
  ADD CONSTRAINT "training_project_trainees_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "training_projects" DROP COLUMN "trainees";
```

- [ ] **Step 5: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

## Task 3: Update DTO and controller contracts

**Files:**
- Modify: `server/src/modules/training/dto/update-project.dto.ts`
- Modify: `server/src/modules/training/training.controller.ts`

- [ ] **Step 1: Add trainee validation to update DTO**

In `server/src/modules/training/dto/update-project.dto.ts`, add `ArrayMinSize` and `ArrayMaxSize` to the import from `class-validator`:

```ts
  ArrayMinSize,
  ArrayMaxSize,
```

Then add this property at the end of `UpdateTrainingProjectDto`:

```ts
  @ApiPropertyOptional({ description: '学员ID数组', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsOptional()
  trainees?: string[];
```

- [ ] **Step 2: Make `addTrainees` controller compatible with current frontend**

Replace the body of `addTrainees` in `server/src/modules/training/training.controller.ts` with:

```ts
  async addTrainees(@Param('id') id: string, @Body() body: { userId?: string; userIds?: string[] }) {
    const userIds = body.userIds ?? (body.userId ? [body.userId] : []);
    return this.trainingService.addTrainees(id, userIds);
  }
```

- [ ] **Step 3: Run TypeScript-focused server build check**

```bash
npm run build:server
```

Expected after later implementation tasks: PASS. At this step it may fail until service code is updated because Prisma generated types still expect old schema until install/generate state is refreshed.

## Task 4: Rewrite `TrainingService` to use bridge rows

**Files:**
- Modify: `server/src/modules/training/training.service.ts`

- [ ] **Step 1: Add response hydrator helpers**

At the top of `server/src/modules/training/training.service.ts`, add the Prisma type import used by transaction callbacks:

```ts
import { Prisma } from '@prisma/client';
```

Inside `TrainingService`, before `createProject()`, add these helpers:

```ts
  private readonly traineeUserSelect = {
    id: true,
    username: true,
    name: true,
    status: true,
    deletedAt: true,
    departmentId: true,
  };

  private get traineeLinkInclude() {
    return {
      traineeLinks: {
        include: {
          user: {
            select: this.traineeUserSelect,
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private toProjectResponse(project: any) {
    const traineeLinks = project.traineeLinks || [];
    const trainees = traineeLinks.map((link: any) => link.userId);
    const traineeList = traineeLinks
      .map((link: any) => link.user)
      .filter(Boolean);
    const { traineeLinks: _links, ...rest } = project;

    return {
      ...rest,
      trainees,
      traineeList,
      traineeCount: trainees.length,
    };
  }

  private toProjectListResponse(projects: any[]) {
    return projects.map((project) => this.toProjectResponse(project));
  }
```

- [ ] **Step 2: Add trainee ID normalization and validation helpers**

Below the hydrator helpers, add:

```ts
  private normalizeTraineeIds(trainees: string[] | undefined): string[] {
    const normalized = Array.from(new Set((trainees || []).filter(Boolean)));

    if (normalized.length < 1 || normalized.length > 100) {
      throw new BadRequestException('学员数量必须在 1 到 100 人之间');
    }

    return normalized;
  }

  private async validateActiveTrainees(userIds: string[]) {
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        status: 'active',
        deletedAt: null,
      },
      select: { id: true },
    });

    const validIds = new Set(users.map((user: { id: string }) => user.id));
    const invalidIds = userIds.filter((userId) => !validIds.has(userId));

    if (invalidIds.length > 0) {
      throw new BadRequestException(`学员不存在或已停用: ${invalidIds.join(', ')}`);
    }
  }
```

- [ ] **Step 3: Replace `createProject()` implementation**

In `createProject()`, remove `trainees: dto.trainees` from `trainingProject.create`, validate trainees before create, write the project, bridge rows, learning records, and todo tasks inside one Prisma transaction, and return the hydrated project:

```ts
    const traineeIds = this.normalizeTraineeIds(dto.trainees);
    await this.validateActiveTrainees(traineeIds);

    const project = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.trainingProject.create({
        data: {
          planId: dto.planId,
          title: dto.title,
          description: dto.description,
          department: dto.department,
          quarter: dto.quarter,
          trainerId: dto.trainerId,
          scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
          documentIds: dto.documentIds || [],
          passingScore: dto.passingScore || 60,
          maxAttempts: dto.maxAttempts || 3,
          status: 'planned',
        },
      });

      await tx.trainingProjectTrainee.createMany({
        data: traineeIds.map((userId) => ({
          projectId: created.id,
          userId,
        })),
        skipDuplicates: true,
      });

      await this.createLearningRecordsForTrainees(tx, created.id, traineeIds);
      await this.createTodoTasksForProject(tx, created, traineeIds);

      return created;
    });

    return this.findProjectById(project.id);
```

- [ ] **Step 4: Update project list query**

In `findProjects()`, add trainee links to the include:

```ts
          ...this.traineeLinkInclude,
```

Then replace `items` in the return object with:

```ts
      items: this.toProjectListResponse(items),
```

- [ ] **Step 5: Update project detail query**

In `findProjectById()`, add:

```ts
        ...this.traineeLinkInclude,
```

to the `include` object, and replace the final `return project;` with:

```ts
    return this.toProjectResponse(project);
```

- [ ] **Step 6: Replace `updateProject()` trainee handling**

At the top of `updateProject()`, after loading `project`, add:

```ts
    const { trainees, scheduledDate, ...projectFields } = dto;
```

Replace the update call with:

```ts
    const traineeIds = trainees ? this.normalizeTraineeIds(trainees) : undefined;
    if (traineeIds) {
      await this.validateActiveTrainees(traineeIds);
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (Object.keys(projectFields).length > 0 || scheduledDate !== undefined) {
        await tx.trainingProject.update({
          where: { id },
          data: {
            ...projectFields,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : scheduledDate,
          },
        });
      }

      if (traineeIds) {
        await this.syncTraineeLinks(tx, id, traineeIds);
        await this.syncLearningRecords(tx, id, traineeIds);
      }
    });

    return this.findProjectById(id);
```

- [ ] **Step 7: Add `syncTraineeLinks()` helper**

Below `syncLearningRecords()`, add:

```ts
  private async syncTraineeLinks(tx: Prisma.TransactionClient, projectId: string, traineeIds: string[]) {
    await tx.trainingProjectTrainee.deleteMany({
      where: {
        projectId,
        userId: { notIn: traineeIds },
      },
    });

    await tx.trainingProjectTrainee.createMany({
      data: traineeIds.map((userId) => ({
        projectId,
        userId,
      })),
      skipDuplicates: true,
    });
  }
```

- [ ] **Step 8: Replace `addTrainees()` implementation**

Replace `addTrainees()` with:

```ts
  async addTrainees(id: string, userIds: string[]) {
    const project = await this.getProjectWithTraineeLinks(id);
    const incomingIds = Array.from(new Set((userIds || []).filter(Boolean)));

    if (incomingIds.length === 0) {
      throw new BadRequestException('请至少选择一名学员');
    }

    const existingIds = project.traineeLinks.map((link: any) => link.userId);
    const newTrainees = Array.from(new Set([...existingIds, ...incomingIds]));

    if (newTrainees.length > 100) {
      throw new BadRequestException('学员数量不能超过100人');
    }

    const toCreate = incomingIds.filter((userId) => !existingIds.includes(userId));
    await this.validateActiveTrainees(toCreate);

    if (toCreate.length > 0) {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.trainingProjectTrainee.createMany({
          data: toCreate.map((userId) => ({
            projectId: id,
            userId,
          })),
          skipDuplicates: true,
        });

        await this.createLearningRecordsForTrainees(tx, id, toCreate);
        await this.createTodoTasksForNewTrainees(tx, project, toCreate);
      });
    }

    return this.findProjectById(id);
  }
```

- [ ] **Step 9: Replace `removeTrainee()` implementation**

Replace the array update block in `removeTrainee()` with:

```ts
    const project = await this.getProjectWithTraineeLinks(id);
    const traineeIds = project.traineeLinks.map((link: any) => link.userId);

    if (!traineeIds.includes(userId)) {
      throw new BadRequestException('该用户不在学员列表中');
    }

    if (traineeIds.length <= 1) {
      throw new BadRequestException('培训项目至少需要保留一名学员');
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.trainingProjectTrainee.deleteMany({
        where: { projectId: id, userId },
      });

      await tx.learningRecord.deleteMany({
        where: { projectId: id, userId },
      });

      await tx.todoTask.deleteMany({
        where: {
          type: 'training_attend',
          relatedId: id,
          userId,
        },
      });
    });
```

Remove the old standalone `learningRecord.deleteMany()` and `todoTask.deleteMany()` calls outside the transaction, and replace `return updated;` with:

```ts
    return this.findProjectById(id);
```

- [ ] **Step 10: Add `getProjectWithTraineeLinks()` helper**

Below `getProjectById()`, add:

```ts
  private async getProjectWithTraineeLinks(id: string) {
    const project = await this.prisma.trainingProject.findUnique({
      where: { id },
      include: {
        traineeLinks: true,
      },
    });

    if (!project) {
      throw new NotFoundException('培训项目不存在');
    }

    return project;
  }
```

- [ ] **Step 11: Update learning-record and todo helper signatures to use the transaction client**

Change:

```ts
  private async createLearningRecordsForTrainees(projectId: string, trainees: string[]) {
```

to:

```ts
  private async createLearningRecordsForTrainees(tx: Prisma.TransactionClient, projectId: string, trainees: string[]) {
```

Inside that helper, replace `this.prisma.learningRecord.findMany` and `this.prisma.learningRecord.createMany` with `tx.learningRecord.findMany` and `tx.learningRecord.createMany`.

Change:

```ts
  private async syncLearningRecords(projectId: string, newTrainees: string[]) {
```

to:

```ts
  private async syncLearningRecords(tx: Prisma.TransactionClient, projectId: string, newTrainees: string[]) {
```

Inside `syncLearningRecords()`, replace `this.prisma.learningRecord.findMany`, `this.prisma.learningRecord.deleteMany`, and `this.createLearningRecordsForTrainees(projectId, newTrainees)` with `tx.learningRecord.findMany`, `tx.learningRecord.deleteMany`, and `this.createLearningRecordsForTrainees(tx, projectId, newTrainees)`.

Change:

```ts
  private async createTodoTasksForProject(project: any) {
```

to:

```ts
  private async createTodoTasksForProject(tx: Prisma.TransactionClient, project: any, traineeIds: string[]) {
```

Then replace:

```ts
    for (const traineeId of project.trainees) {
```

with:

```ts
    for (const traineeId of traineeIds) {
```

Inside `createTodoTasksForProject()`, replace `this.prisma.todoTask.createMany` with `tx.todoTask.createMany`.

Change:

```ts
  private async createTodoTasksForNewTrainees(project: any, userIds: string[]) {
```

to:

```ts
  private async createTodoTasksForNewTrainees(tx: Prisma.TransactionClient, project: any, userIds: string[]) {
```

Inside `createTodoTasksForNewTrainees()`, replace `this.prisma.todoTask.createMany` with `tx.todoTask.createMany`.

- [ ] **Step 12: Search for remaining persisted trainee writes**

```bash
rg -n "data: \\{ trainees|project\\.trainees|trainees:" server/src/modules/training/training.service.ts
```

Expected: no `data: { trainees` writes remain. Any remaining `trainees:` in `toProjectResponse()` or DTO handling is acceptable because it is an API projection, not a Prisma column write.

## Task 5: Update exam and archive services

**Files:**
- Modify: `server/src/modules/training/exam.service.ts`
- Modify: `server/src/modules/training/archive.service.ts`

- [ ] **Step 1: Add trainee membership helper to `ExamService`**

In `server/src/modules/training/exam.service.ts`, add this private helper before `getLearningRecord()`:

```ts
  private async ensureProjectTrainee(projectId: string, userId: string) {
    const trainee = await this.prisma.trainingProjectTrainee.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      select: { id: true },
    });

    if (!trainee) {
      throw new BadRequestException('只有学员可以参加考试');
    }
  }
```

- [ ] **Step 2: Replace start exam membership check**

In `startExam()`, replace:

```ts
    if (!project.trainees.includes(userId)) {
      throw new BadRequestException('只有学员可以参加考试');
    }
```

with:

```ts
    await this.ensureProjectTrainee(dto.projectId, userId);
```

- [ ] **Step 3: Replace submit exam membership check**

In `submitExam()`, replace:

```ts
    if (!project.trainees.includes(userId)) {
      throw new BadRequestException('只有学员可以提交考试');
    }
```

with:

```ts
    await this.ensureProjectTrainee(dto.projectId, userId);
```

- [ ] **Step 4: Update archive trainee count**

In `server/src/modules/training/archive.service.ts`, replace:

```ts
      doc.text(`总人数：${project.trainees.length} 人`);
```

with:

```ts
      const traineeCount = project.traineeLinks?.length ?? project.learningRecords.length;
      doc.text(`总人数：${traineeCount} 人`);
```

- [ ] **Step 5: Ensure archive generation includes trainee links**

Find the `trainingProject.findUnique` or equivalent query in `ArchiveService.generateArchive()`. In its `include`, add:

```ts
        traineeLinks: true,
```

- [ ] **Step 6: Search for stale array membership**

```bash
rg -n "project\\.trainees|trainees\\.includes|trainees\\.length" server/src/modules/training
```

Expected: no service code reads `project.trainees` from Prisma results. Test fixtures may still include `trainees` as API projection only.

## Task 6: Update frontend API adapter and types

**Files:**
- Modify: `client/src/types/training.ts`
- Modify: `client/src/api/training.ts`

- [ ] **Step 1: Extend `traineeList` type**

In `client/src/types/training.ts`, replace the current `traineeList` element type with:

```ts
  traineeList?: Array<{
    id: string;
    username: string;
    name: string;
    status?: string;
    deletedAt?: string | null;
    departmentId?: string | null;
  }>;
```

Keep `trainees: string[]` on `TrainingProject` and `CreateTrainingProjectDto`; it remains the API compatibility projection.

- [ ] **Step 2: Allow trainee replacement in update DTO**

In `UpdateTrainingProjectDto`, add:

```ts
  trainees?: string[];
```

- [ ] **Step 3: Align `addTrainee()` request body with server batch endpoint**

In `client/src/api/training.ts`, replace:

```ts
  return request.post(`/training/projects/${projectId}/trainees`, { userId });
```

with:

```ts
  return request.post(`/training/projects/${projectId}/trainees`, { userIds: [userId] });
```

- [ ] **Step 4: Run client type/build verification**

```bash
npm run build:client
```

Expected after service/schema tasks are complete: PASS.

## Task 7: Update service tests to pass

**Files:**
- Modify: `server/src/modules/training/training.service.spec.ts`

- [ ] **Step 1: Add mock defaults before each test that calls project methods**

For existing project tests that do not care about trainees, add these defaults before calling service methods:

```ts
      prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-2', status: 'active', deletedAt: null },
        { id: 'user-3', status: 'active', deletedAt: null },
      ]);
      prisma.trainingProjectTrainee.createMany.mockResolvedValue({ count: 2 });
      prisma.trainingProject.findUnique.mockResolvedValue(mockProject);
```

Use the smallest scope possible: put these lines inside tests that create, update, add, remove, or fetch projects, not in unrelated plan tests.

- [ ] **Step 2: Add update trainee replacement transaction assertion**

If there is no existing `updateProject` trainee replacement test, add:

```ts
  describe('updateProject', () => {
    it('GAP-412: 替换学员时应该在事务内同步桥接表和学习记录', async () => {
      prisma.trainingProject.findUnique.mockResolvedValue({
        ...mockProject,
        status: 'planned',
        traineeLinks: [{ userId: 'user-2' }, { userId: 'user-3' }],
      });
      prisma.user.findMany.mockResolvedValue([{ id: 'user-2' }, { id: 'user-4' }]);
      prisma.trainingProject.update.mockResolvedValue(mockProject);
      prisma.trainingProjectTrainee.deleteMany.mockResolvedValue({ count: 1 });
      prisma.trainingProjectTrainee.createMany.mockResolvedValue({ count: 1 });
      prisma.learningRecord.findMany.mockResolvedValue([
        { id: 'lr-1', userId: 'user-2' },
        { id: 'lr-2', userId: 'user-3' },
      ]);
      prisma.learningRecord.deleteMany.mockResolvedValue({ count: 1 });
      prisma.learningRecord.createMany.mockResolvedValue({ count: 1 });

      await service.updateProject('project-1', { trainees: ['user-2', 'user-4'] });

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
      expect(prisma.trainingProjectTrainee.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1', userId: { notIn: ['user-2', 'user-4'] } },
      });
      expect(prisma.trainingProjectTrainee.createMany).toHaveBeenCalledWith({
        data: [
          { projectId: 'project-1', userId: 'user-2' },
          { projectId: 'project-1', userId: 'user-4' },
        ],
        skipDuplicates: true,
      });
    });
  });
```

- [ ] **Step 3: Add add trainee bridge assertion**

If `training.service.spec.ts` has an `addTrainees` test, update it to assert:

```ts
      expect(prisma.trainingProjectTrainee.createMany).toHaveBeenCalledWith({
        data: [{ projectId: 'project-1', userId: 'user-4' }],
        skipDuplicates: true,
      });
```

If there is no existing `addTrainees` test, add:

```ts
  describe('addTrainees', () => {
    it('GAP-412: 应该通过桥接表添加新学员', async () => {
      prisma.trainingProject.findUnique.mockResolvedValue({
        ...mockProject,
        traineeLinks: [{ userId: 'user-2' }, { userId: 'user-3' }],
      });
      prisma.user.findMany.mockResolvedValue([{ id: 'user-4' }]);
      prisma.trainingProjectTrainee.createMany.mockResolvedValue({ count: 1 });
      prisma.learningRecord.findMany.mockResolvedValue([]);
      prisma.learningRecord.createMany.mockResolvedValue({ count: 1 });
      prisma.todoTask.createMany.mockResolvedValue({ count: 1 });

      await service.addTrainees('project-1', ['user-4']);

      expect(prisma.trainingProjectTrainee.createMany).toHaveBeenCalledWith({
        data: [{ projectId: 'project-1', userId: 'user-4' }],
        skipDuplicates: true,
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });
  });
```

- [ ] **Step 4: Add remove trainee bridge assertion**

If there is no existing `removeTrainee` test, add:

```ts
  describe('removeTrainee', () => {
    it('GAP-412: 应该通过桥接表移除学员并清理学习记录和待办', async () => {
      prisma.trainingProject.findUnique.mockResolvedValue({
        ...mockProject,
        traineeLinks: [{ userId: 'user-2' }, { userId: 'user-3' }],
      });
      prisma.trainingProjectTrainee.deleteMany.mockResolvedValue({ count: 1 });
      prisma.learningRecord.deleteMany.mockResolvedValue({ count: 1 });
      prisma.todoTask.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeTrainee('project-1', 'user-3');

      expect(prisma.trainingProjectTrainee.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1', userId: 'user-3' },
      });
      expect(prisma.learningRecord.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1', userId: 'user-3' },
      });
      expect(prisma.todoTask.deleteMany).toHaveBeenCalledWith({
        where: {
          type: 'training_attend',
          relatedId: 'project-1',
          userId: 'user-3',
        },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });
  });
```

- [ ] **Step 5: Run focused tests**

```bash
(cd server && npm test -- training.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 8: Run schema and repository verification

**Files:**
- No code edits expected in this task.

- [ ] **Step 1: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

- [ ] **Step 2: Run focused training tests**

```bash
(cd server && npm test -- training.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 3: Check whether an active exam service test exists**

```bash
test -f server/src/modules/training/exam.service.spec.ts && echo "exam spec exists" || echo "exam spec missing"
```

Expected in current repo: `exam spec missing`, because only `exam.service.spec.ts.skip` exists. If a real `exam.service.spec.ts` has been added by another branch before execution, run:

```bash
(cd server && npm test -- exam.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 4: Run client build**

```bash
npm run build:client
```

Expected: PASS.

- [ ] **Step 5: Run doc consistency checks if this implementation also touches module-usage docs**

Implementation agents should normally not touch module-usage docs for this plan. If docs are changed during execution, run:

```bash
node tools/check-module-usage-docs.mjs
git diff --check
```

Expected: both commands PASS.

## Task 9: Commit implementation branch

**Files:**
- Commit only implementation files touched by the executing agent.

- [ ] **Step 1: Inspect status**

```bash
git status --short
```

Expected: only planned files are modified or added.

- [ ] **Step 2: Commit**

```bash
git add server/src/prisma/schema.prisma \
  server/src/prisma/migrations/20260502110000_training_project_trainee_bridge/migration.sql \
  server/src/modules/training/dto/update-project.dto.ts \
  server/src/modules/training/training.controller.ts \
  server/src/modules/training/training.service.ts \
  server/src/modules/training/exam.service.ts \
  server/src/modules/training/archive.service.ts \
  server/src/modules/training/training.service.spec.ts \
  client/src/types/training.ts \
  client/src/api/training.ts
git commit -m "refactor: move training trainees to bridge table"
```

Expected: one commit containing only GAP-412 implementation files. If any file outside the plan is present, stop and explain why before committing.
