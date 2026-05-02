# GAP-414 ManagementReview Modeling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the management-review domain during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Add an independent `ManagementReview` governance object that can collect annual internal-audit and training inputs, preserve source snapshots, and track management-review improvement actions.

**Architecture:** Create three Prisma models: `ManagementReview`, `ManagementReviewInput`, and `ManagementReviewAction`. Add a NestJS module with create/list/detail/source-collection/action endpoints, where source collection reads existing `AuditReport.summary` and `TrainingArchive` data without copying their facts. Add Vue routes and pages for annual review management, input collection, and action tracking.

**Tech Stack:** Prisma schema/migration, NestJS controller/service/DTOs, class-validator, Vue 3, Element Plus, TypeScript API adapters, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-414 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** `ManagementReview` 是治理与闭环层的年度聚合对象；`RecordTemplate/Record` 和 `Document` 只保留原始表单、会议纪要、报告和附件证据，不再作为管理评审事实源。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展到 ProductRecall、TraceabilityDrill、SupplierEvaluation、CorrectiveAction 自动汇总适配器，也不得修改追溯主链。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 本计划不迁移历史动态表单记录；如果执行时有人要求自动回填历史 GRSS-PZ-JL-50/51/52/53 Record 到 ManagementReview，必须停止并回报需要单独数据归属确认。
- **命令约束：** 本计划只使用当前仓库 npm workspaces 命令；不得新增 pnpm 命令。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502143000_management_review_models/migration.sql`
- Add: `server/src/modules/management-review/management-review.module.ts`
- Add: `server/src/modules/management-review/management-review.controller.ts`
- Add: `server/src/modules/management-review/management-review.service.ts`
- Add: `server/src/modules/management-review/management-review.service.spec.ts`
- Add: `server/src/modules/management-review/dto/create-management-review.dto.ts`
- Add: `server/src/modules/management-review/dto/query-management-review.dto.ts`
- Add: `server/src/modules/management-review/dto/create-management-review-action.dto.ts`
- Add: `server/src/modules/management-review/dto/update-management-review-action.dto.ts`
- Modify: `server/src/app.module.ts`
- Add: `client/src/api/management-review.ts`
- Add: `client/src/views/management-review/ReviewList.vue`
- Add: `client/src/views/management-review/ReviewDetail.vue`
- Modify: `client/src/router/index.ts`
- Do not modify: `server/src/modules/training/archive.service.ts`
- Do not modify: `server/src/modules/internal-audit/report/report.service.ts`
- Do not modify: `server/src/modules/traceability/`
- Do not modify: `server/src/modules/product-recall/`

## Task 1: Add focused service coverage

**Files:**
- Add: `server/src/modules/management-review/management-review.service.spec.ts`

- [ ] **Step 1: Create the service spec**

Create `server/src/modules/management-review/management-review.service.spec.ts` with:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ManagementReviewService } from './management-review.service';

describe('ManagementReviewService', () => {
  function createPrismaMock(overrides: Record<string, any> = {}) {
    const prisma = {
      managementReview: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      managementReviewInput: {
        upsert: jest.fn(),
      },
      managementReviewAction: {
        create: jest.fn(),
        update: jest.fn(),
      },
      auditReport: {
        findMany: jest.fn(),
      },
      trainingArchive: {
        findMany: jest.fn(),
      },
    };
    return { ...prisma, ...overrides } as any;
  }

  it('rejects duplicate management review year per company', async () => {
    const prisma = createPrismaMock();
    prisma.managementReview.findFirst.mockResolvedValue({ id: 'mr-existing' });
    const service = new ManagementReviewService(prisma);

    await expect(
      service.create({ year: 2026, title: '2026 年管理评审' } as any, {
        id: 'user-1',
        companyId: 'company-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates one annual review with company and creator context', async () => {
    const prisma = createPrismaMock();
    prisma.managementReview.findFirst.mockResolvedValue(null);
    prisma.managementReview.create.mockResolvedValue({ id: 'mr-1', year: 2026 });
    const service = new ManagementReviewService(prisma);

    await service.create(
      {
        year: 2026,
        title: '2026 年管理评审',
        reviewDate: '2026-12-15T00:00:00.000Z',
        location: '会议室',
        materialDueDate: '2026-12-14T00:00:00.000Z',
      } as any,
      { id: 'user-1', companyId: 'company-1' },
    );

    expect(prisma.managementReview.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company-1',
        year: 2026,
        title: '2026 年管理评审',
        status: 'draft',
        reviewDate: new Date('2026-12-15T00:00:00.000Z'),
        location: '会议室',
        materialDueDate: new Date('2026-12-14T00:00:00.000Z'),
        purpose:
          '评审质量和食品安全管理体系的适宜性、充分性和有效性。',
        scope: [],
        participants: [],
        createdBy: 'user-1',
      },
      include: {
        inputs: true,
        actions: true,
      },
    });
  });

  it('collects audit reports and training archives as idempotent review inputs', async () => {
    const prisma = createPrismaMock();
    prisma.managementReview.findUnique.mockResolvedValue({
      id: 'mr-1',
      companyId: 'company-1',
      year: 2026,
    });
    prisma.auditReport.findMany.mockResolvedValue([
      {
        id: 'audit-report-1',
        plan: {
          title: '2026 年度内审',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-10'),
        },
        summary: {
          totalDocuments: 10,
          conformCount: 8,
          nonConformCount: 2,
        },
      },
    ]);
    prisma.trainingArchive.findMany.mockResolvedValue([
      {
        id: 'archive-1',
        project: {
          title: 'FSSC22000 专项培训',
          department: '行政人事部',
          scheduledDate: new Date('2026-08-20'),
          learningRecords: [{ passed: true }, { passed: false }],
        },
      },
    ]);
    const service = new ManagementReviewService(prisma);

    const result = await service.collectSources('mr-1', 'company-1');

    expect(result).toEqual({ auditReports: 1, trainingArchives: 1 });
    expect(prisma.managementReviewInput.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.managementReviewInput.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          reviewId_sourceType_sourceId: {
            reviewId: 'mr-1',
            sourceType: 'audit_report',
            sourceId: 'audit-report-1',
          },
        },
      }),
    );
    expect(prisma.managementReviewInput.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          reviewId_sourceType_sourceId: {
            reviewId: 'mr-1',
            sourceType: 'training_archive',
            sourceId: 'archive-1',
          },
        },
      }),
    );
  });

  it('throws NotFoundException when collecting sources for another company', async () => {
    const prisma = createPrismaMock();
    prisma.managementReview.findUnique.mockResolvedValue({
      id: 'mr-1',
      companyId: 'company-2',
      year: 2026,
    });
    const service = new ManagementReviewService(prisma);

    await expect(service.collectSources('mr-1', 'company-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails before implementation**

```bash
(cd server && npm test -- management-review.service.spec.ts --runInBand)
```

Expected: FAIL because `server/src/modules/management-review/management-review.service.ts` does not exist yet.

## Task 2: Add Prisma models and migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502143000_management_review_models/migration.sql`

- [ ] **Step 1: Add reverse relations to existing models**

In `model User`, add these relation fields near other reverse relations:

```prisma
  managementReviewsCreated ManagementReview[]       @relation("ManagementReviewCreator")
  managementReviewActions  ManagementReviewAction[] @relation("ManagementReviewActionOwner")
```

In `model Document`, add this relation near other governance relations:

```prisma
  managementReviewReports ManagementReview[] @relation("ManagementReviewReportDocument")
```

In `model Record`, add these relation fields near `product_recall_evidence`:

```prisma
  managementReviewMeetingMinutes ManagementReview[] @relation("ManagementReviewMeetingMinutes")
  managementReviewReports        ManagementReview[] @relation("ManagementReviewReportRecord")
```

- [ ] **Step 2: Add the three ManagementReview models**

Append these models after `AuditReport` and before `DocumentViewLog`:

```prisma
model ManagementReview {
  id                 String   @id @default(cuid())
  companyId          String
  year               Int
  title              String
  status             String   @default("draft")
  reviewDate         DateTime?
  location           String?
  materialDueDate    DateTime?
  purpose            String   @default("评审质量和食品安全管理体系的适宜性、充分性和有效性。")
  scope              Json     @default("[]")
  participants       Json     @default("[]")
  createdBy          String
  completedAt        DateTime?
  reportDocumentId   String?
  reportRecordId     String?
  meetingMinutesRecordId String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  creator              User      @relation("ManagementReviewCreator", fields: [createdBy], references: [id], onDelete: Restrict)
  reportDocument       Document? @relation("ManagementReviewReportDocument", fields: [reportDocumentId], references: [id], onDelete: SetNull)
  reportRecord         Record?   @relation("ManagementReviewReportRecord", fields: [reportRecordId], references: [id], onDelete: SetNull)
  meetingMinutesRecord Record?   @relation("ManagementReviewMeetingMinutes", fields: [meetingMinutesRecordId], references: [id], onDelete: SetNull)
  inputs               ManagementReviewInput[]
  actions              ManagementReviewAction[]

  @@unique([companyId, year])
  @@index([companyId, status])
  @@index([year])
  @@index([reportDocumentId])
  @@index([reportRecordId])
  @@index([meetingMinutesRecordId])
  @@map("management_reviews")
}

model ManagementReviewInput {
  id         String   @id @default(cuid())
  reviewId   String
  sourceType String
  sourceId   String
  department String?
  title      String
  summary    Json
  included   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  review ManagementReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@unique([reviewId, sourceType, sourceId])
  @@index([reviewId, sourceType])
  @@map("management_review_inputs")
}

model ManagementReviewAction {
  id                    String   @id @default(cuid())
  reviewId              String
  action                String
  responsibleDepartment String
  ownerId               String?
  dueDate               DateTime?
  status                String   @default("open")
  verificationNote      String?
  completedAt           DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  review ManagementReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  owner  User?            @relation("ManagementReviewActionOwner", fields: [ownerId], references: [id], onDelete: SetNull)

  @@index([reviewId, status])
  @@index([ownerId])
  @@map("management_review_actions")
}
```

- [ ] **Step 3: Create the migration SQL**

Create `server/src/prisma/migrations/20260502143000_management_review_models/migration.sql` with:

```sql
CREATE TABLE "management_reviews" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "reviewDate" TIMESTAMP(3),
  "location" TEXT,
  "materialDueDate" TIMESTAMP(3),
  "purpose" TEXT NOT NULL DEFAULT '评审质量和食品安全管理体系的适宜性、充分性和有效性。',
  "scope" JSONB NOT NULL DEFAULT '[]',
  "participants" JSONB NOT NULL DEFAULT '[]',
  "createdBy" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "reportDocumentId" TEXT,
  "reportRecordId" TEXT,
  "meetingMinutesRecordId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "management_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "management_review_inputs" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "department" TEXT,
  "title" TEXT NOT NULL,
  "summary" JSONB NOT NULL,
  "included" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "management_review_inputs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "management_review_actions" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "responsibleDepartment" TEXT NOT NULL,
  "ownerId" TEXT,
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'open',
  "verificationNote" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "management_review_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "management_reviews_companyId_year_key" ON "management_reviews"("companyId", "year");
CREATE INDEX "management_reviews_companyId_status_idx" ON "management_reviews"("companyId", "status");
CREATE INDEX "management_reviews_year_idx" ON "management_reviews"("year");
CREATE INDEX "management_reviews_reportDocumentId_idx" ON "management_reviews"("reportDocumentId");
CREATE INDEX "management_reviews_reportRecordId_idx" ON "management_reviews"("reportRecordId");
CREATE INDEX "management_reviews_meetingMinutesRecordId_idx" ON "management_reviews"("meetingMinutesRecordId");
CREATE UNIQUE INDEX "management_review_inputs_reviewId_sourceType_sourceId_key" ON "management_review_inputs"("reviewId", "sourceType", "sourceId");
CREATE INDEX "management_review_inputs_reviewId_sourceType_idx" ON "management_review_inputs"("reviewId", "sourceType");
CREATE INDEX "management_review_actions_reviewId_status_idx" ON "management_review_actions"("reviewId", "status");
CREATE INDEX "management_review_actions_ownerId_idx" ON "management_review_actions"("ownerId");

ALTER TABLE "management_reviews"
  ADD CONSTRAINT "management_reviews_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "management_reviews"
  ADD CONSTRAINT "management_reviews_reportDocumentId_fkey"
  FOREIGN KEY ("reportDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "management_reviews"
  ADD CONSTRAINT "management_reviews_reportRecordId_fkey"
  FOREIGN KEY ("reportRecordId") REFERENCES "records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "management_reviews"
  ADD CONSTRAINT "management_reviews_meetingMinutesRecordId_fkey"
  FOREIGN KEY ("meetingMinutesRecordId") REFERENCES "records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "management_review_inputs"
  ADD CONSTRAINT "management_review_inputs_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "management_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "management_review_actions"
  ADD CONSTRAINT "management_review_actions_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "management_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "management_review_actions"
  ADD CONSTRAINT "management_review_actions_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 4: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

## Task 3: Add DTOs and backend service

**Files:**
- Add: `server/src/modules/management-review/dto/create-management-review.dto.ts`
- Add: `server/src/modules/management-review/dto/query-management-review.dto.ts`
- Add: `server/src/modules/management-review/dto/create-management-review-action.dto.ts`
- Add: `server/src/modules/management-review/dto/update-management-review-action.dto.ts`
- Add: `server/src/modules/management-review/management-review.service.ts`

- [ ] **Step 1: Add create/query DTOs**

Create `server/src/modules/management-review/dto/create-management-review.dto.ts`:

```ts
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateManagementReviewDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  reviewDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  materialDueDate?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsArray()
  scope?: string[];

  @IsOptional()
  @IsArray()
  participants?: Record<string, unknown>[];
}
```

Create `server/src/modules/management-review/dto/query-management-review.dto.ts`:

```ts
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryManagementReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
```

- [ ] **Step 2: Add action DTOs**

Create `server/src/modules/management-review/dto/create-management-review-action.dto.ts`:

```ts
import { IsOptional, IsString } from 'class-validator';

export class CreateManagementReviewActionDto {
  @IsString()
  action!: string;

  @IsString()
  responsibleDepartment!: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}
```

Create `server/src/modules/management-review/dto/update-management-review-action.dto.ts`:

```ts
import { IsOptional, IsString } from 'class-validator';

export class UpdateManagementReviewActionDto {
  @IsOptional()
  @IsString()
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled';

  @IsOptional()
  @IsString()
  verificationNote?: string;
}
```

- [ ] **Step 3: Add the service implementation**

Create `server/src/modules/management-review/management-review.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateManagementReviewDto } from './dto/create-management-review.dto';
import { QueryManagementReviewDto } from './dto/query-management-review.dto';
import { CreateManagementReviewActionDto } from './dto/create-management-review-action.dto';
import { UpdateManagementReviewActionDto } from './dto/update-management-review-action.dto';

type Actor = { id: string; companyId: string };

@Injectable()
export class ManagementReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateManagementReviewDto, actor: Actor) {
    const existing = await this.prisma.managementReview.findFirst({
      where: { companyId: actor.companyId, year: dto.year },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('该年度管理评审已存在');
    }

    return this.prisma.managementReview.create({
      data: {
        companyId: actor.companyId,
        year: dto.year,
        title: dto.title,
        status: 'draft',
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
        location: dto.location,
        materialDueDate: dto.materialDueDate ? new Date(dto.materialDueDate) : undefined,
        purpose: dto.purpose ?? '评审质量和食品安全管理体系的适宜性、充分性和有效性。',
        scope: dto.scope ?? [],
        participants: dto.participants ?? [],
        createdBy: actor.id,
      },
      include: { inputs: true, actions: true },
    });
  }

  findAll(companyId: string, query: QueryManagementReviewDto) {
    return this.prisma.managementReview.findMany({
      where: {
        companyId,
        ...(query.year ? { year: query.year } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      include: { inputs: true, actions: true },
    });
  }

  async findOne(id: string, companyId: string) {
    const review = await this.prisma.managementReview.findUnique({
      where: { id },
      include: { inputs: true, actions: true },
    });
    if (!review || review.companyId !== companyId) {
      throw new NotFoundException('管理评审不存在');
    }
    return review;
  }

  async collectSources(id: string, companyId: string) {
    const review = await this.findOwnedReview(id, companyId);
    const start = new Date(Date.UTC(review.year, 0, 1));
    const end = new Date(Date.UTC(review.year + 1, 0, 1));

    const auditReports = await this.prisma.auditReport.findMany({
      where: {
        plan: {
          startDate: { gte: start, lt: end },
        },
      },
      include: {
        plan: { select: { title: true, startDate: true, endDate: true } },
      },
    });

    const trainingArchives = await this.prisma.trainingArchive.findMany({
      where: {
        project: {
          OR: [
            { plan: { year: review.year } },
            { scheduledDate: { gte: start, lt: end } },
          ],
        },
      },
      include: {
        project: {
          include: {
            plan: { select: { year: true, title: true } },
            learningRecords: { select: { passed: true } },
          },
        },
      },
    });

    for (const report of auditReports) {
      await this.prisma.managementReviewInput.upsert({
        where: {
          reviewId_sourceType_sourceId: {
            reviewId: id,
            sourceType: 'audit_report',
            sourceId: report.id,
          },
        },
        create: {
          reviewId: id,
          sourceType: 'audit_report',
          sourceId: report.id,
          department: '品质部',
          title: report.plan?.title ?? `${review.year} 年内审报告`,
          summary: {
            planStartDate: report.plan?.startDate,
            planEndDate: report.plan?.endDate,
            ...(report.summary as Record<string, unknown>),
          },
        },
        update: {
          title: report.plan?.title ?? `${review.year} 年内审报告`,
          summary: {
            planStartDate: report.plan?.startDate,
            planEndDate: report.plan?.endDate,
            ...(report.summary as Record<string, unknown>),
          },
        },
      });
    }

    for (const archive of trainingArchives) {
      const records = archive.project?.learningRecords ?? [];
      const attendeeCount = records.length;
      const passedCount = records.filter((r: any) => r.passed).length;
      const passRate = attendeeCount === 0 ? 0 : Math.round((passedCount / attendeeCount) * 10000) / 100;
      await this.prisma.managementReviewInput.upsert({
        where: {
          reviewId_sourceType_sourceId: {
            reviewId: id,
            sourceType: 'training_archive',
            sourceId: archive.id,
          },
        },
        create: {
          reviewId: id,
          sourceType: 'training_archive',
          sourceId: archive.id,
          department: archive.project?.department,
          title: archive.project?.title ?? `${review.year} 年培训档案`,
          summary: {
            projectId: archive.projectId,
            trainingDate: archive.project?.scheduledDate,
            attendeeCount,
            passedCount,
            passRate,
          },
        },
        update: {
          department: archive.project?.department,
          title: archive.project?.title ?? `${review.year} 年培训档案`,
          summary: {
            projectId: archive.projectId,
            trainingDate: archive.project?.scheduledDate,
            attendeeCount,
            passedCount,
            passRate,
          },
        },
      });
    }

    await this.prisma.managementReview.update({
      where: { id },
      data: { status: 'input_collection' },
    });

    return { auditReports: auditReports.length, trainingArchives: trainingArchives.length };
  }

  async createAction(reviewId: string, companyId: string, dto: CreateManagementReviewActionDto) {
    await this.findOwnedReview(reviewId, companyId);
    return this.prisma.managementReviewAction.create({
      data: {
        reviewId,
        action: dto.action,
        responsibleDepartment: dto.responsibleDepartment,
        ownerId: dto.ownerId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async updateAction(reviewId: string, actionId: string, companyId: string, dto: UpdateManagementReviewActionDto) {
    await this.findOwnedReview(reviewId, companyId);
    return this.prisma.managementReviewAction.update({
      where: { id: actionId },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.verificationNote !== undefined ? { verificationNote: dto.verificationNote } : {}),
        ...(dto.status === 'completed' ? { completedAt: new Date() } : {}),
      },
    });
  }

  async complete(id: string, companyId: string, body: { reportDocumentId?: string; reportRecordId?: string }) {
    await this.findOwnedReview(id, companyId);
    return this.prisma.managementReview.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        reportDocumentId: body.reportDocumentId,
        reportRecordId: body.reportRecordId,
      },
      include: { inputs: true, actions: true },
    });
  }

  private async findOwnedReview(id: string, companyId: string) {
    const review = await this.prisma.managementReview.findUnique({ where: { id } });
    if (!review || review.companyId !== companyId) {
      throw new NotFoundException('管理评审不存在');
    }
    return review;
  }
}
```

- [ ] **Step 4: Run the focused service test**

```bash
(cd server && npm test -- management-review.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 4: Add backend module, controller, and app registration

**Files:**
- Add: `server/src/modules/management-review/management-review.module.ts`
- Add: `server/src/modules/management-review/management-review.controller.ts`
- Modify: `server/src/app.module.ts`

- [ ] **Step 1: Add the module**

Create `server/src/modules/management-review/management-review.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ManagementReviewController } from './management-review.controller';
import { ManagementReviewService } from './management-review.service';

@Module({
  imports: [PrismaModule],
  controllers: [ManagementReviewController],
  providers: [ManagementReviewService],
  exports: [ManagementReviewService],
})
export class ManagementReviewModule {}
```

- [ ] **Step 2: Add the controller**

Create `server/src/modules/management-review/management-review.controller.ts`:

```ts
import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { ManagementReviewService } from './management-review.service';
import { CreateManagementReviewDto } from './dto/create-management-review.dto';
import { QueryManagementReviewDto } from './dto/query-management-review.dto';
import { CreateManagementReviewActionDto } from './dto/create-management-review-action.dto';
import { UpdateManagementReviewActionDto } from './dto/update-management-review-action.dto';

@Controller('management-reviews')
@UseGuards(JwtAuthGuard)
export class ManagementReviewController {
  constructor(private readonly service: ManagementReviewService) {}

  @Post()
  create(@Body() dto: CreateManagementReviewDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Get()
  findAll(@Query() query: QueryManagementReviewDto, @Request() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.companyId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post(':id/collect-sources')
  collectSources(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.collectSources(id, req.user.companyId);
  }

  @Post(':id/actions')
  createAction(
    @Param('id') id: string,
    @Body() dto: CreateManagementReviewActionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createAction(id, req.user.companyId, dto);
  }

  @Patch(':id/actions/:actionId')
  updateAction(
    @Param('id') id: string,
    @Param('actionId') actionId: string,
    @Body() dto: UpdateManagementReviewActionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateAction(id, actionId, req.user.companyId, dto);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @Body() body: { reportDocumentId?: string; reportRecordId?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.complete(id, req.user.companyId, body);
  }
}
```

- [ ] **Step 3: Register the module**

In `server/src/app.module.ts`, add:

```ts
import { ManagementReviewModule } from './modules/management-review/management-review.module';
```

Then add `ManagementReviewModule` in the `imports` array near `InternalAuditModule` and `TrainingModule`:

```ts
    TrainingModule,
    InternalAuditModule,
    ManagementReviewModule,
```

- [ ] **Step 4: Run server build**

```bash
npm run build:server
```

Expected: PASS.

## Task 5: Add the frontend API adapter

**Files:**
- Add: `client/src/api/management-review.ts`

- [ ] **Step 1: Create the API adapter**

Create `client/src/api/management-review.ts`:

```ts
import request from './request';

export interface ManagementReviewInput {
  id: string;
  sourceType: 'audit_report' | 'training_archive' | 'record' | 'document' | 'manual';
  sourceId: string;
  department?: string;
  title: string;
  summary: Record<string, unknown>;
  included: boolean;
}

export interface ManagementReviewAction {
  id: string;
  action: string;
  responsibleDepartment: string;
  ownerId?: string;
  dueDate?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  verificationNote?: string;
}

export interface ManagementReview {
  id: string;
  companyId: string;
  year: number;
  title: string;
  status: 'draft' | 'input_collection' | 'ready_for_meeting' | 'completed' | 'archived';
  reviewDate?: string;
  location?: string;
  materialDueDate?: string;
  purpose: string;
  scope: string[];
  participants: Record<string, unknown>[];
  inputs: ManagementReviewInput[];
  actions: ManagementReviewAction[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateManagementReviewPayload {
  year: number;
  title: string;
  reviewDate?: string;
  location?: string;
  materialDueDate?: string;
}

export const managementReviewApi = {
  list(params?: { year?: number; status?: string }) {
    return request.get<ManagementReview[]>('/management-reviews', { params });
  },
  create(payload: CreateManagementReviewPayload) {
    return request.post<ManagementReview>('/management-reviews', payload);
  },
  get(id: string) {
    return request.get<ManagementReview>(`/management-reviews/${id}`);
  },
  collectSources(id: string) {
    return request.post<{ auditReports: number; trainingArchives: number }>(`/management-reviews/${id}/collect-sources`);
  },
  createAction(id: string, payload: { action: string; responsibleDepartment: string; ownerId?: string; dueDate?: string }) {
    return request.post<ManagementReviewAction>(`/management-reviews/${id}/actions`, payload);
  },
  updateAction(id: string, actionId: string, payload: { status?: string; verificationNote?: string }) {
    return request.patch<ManagementReviewAction>(`/management-reviews/${id}/actions/${actionId}`, payload);
  },
};
```

- [ ] **Step 2: Run client type checking through build**

```bash
npm run build -w client
```

Expected: PASS or fail only because pages/routes are not added yet; after Task 6 it must pass.

## Task 6: Add list/detail pages and routes

**Files:**
- Add: `client/src/views/management-review/ReviewList.vue`
- Add: `client/src/views/management-review/ReviewDetail.vue`
- Modify: `client/src/router/index.ts`

- [ ] **Step 1: Add the list page**

Create `client/src/views/management-review/ReviewList.vue` with a table, create dialog, and navigation:

```vue
<template>
  <div class="management-review-list">
    <div class="page-header">
      <h2>管理评审</h2>
      <el-button type="primary" @click="dialogVisible = true">新建年度评审</el-button>
    </div>

    <el-table :data="reviews" v-loading="loading" border>
      <el-table-column prop="year" label="年度" width="100" />
      <el-table-column prop="title" label="标题" min-width="220" />
      <el-table-column prop="status" label="状态" width="140" />
      <el-table-column prop="reviewDate" label="评审时间" width="160">
        <template #default="{ row }">{{ formatDate(row.reviewDate) }}</template>
      </el-table-column>
      <el-table-column label="输入材料" width="120">
        <template #default="{ row }">{{ row.inputs?.length || 0 }}</template>
      </el-table-column>
      <el-table-column label="改进措施" width="120">
        <template #default="{ row }">{{ row.actions?.length || 0 }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button type="primary" link @click="router.push(`/management-reviews/${row.id}`)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="新建年度管理评审" width="520px">
      <el-form :model="form" label-width="130px">
        <el-form-item label="年度" required>
          <el-input-number v-model="form.year" :min="2000" :max="2100" />
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="评审时间">
          <el-date-picker v-model="form.reviewDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="地点">
          <el-input v-model="form.location" />
        </el-form-item>
        <el-form-item label="材料截止日期">
          <el-date-picker v-model="form.materialDueDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="createReview">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { managementReviewApi, type ManagementReview } from '@/api/management-review';

const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const reviews = ref<ManagementReview[]>([]);
const currentYear = new Date().getFullYear();
const form = reactive({
  year: currentYear,
  title: `${currentYear} 年管理评审`,
  reviewDate: '',
  location: '会议室',
  materialDueDate: '',
});

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '-';
}

async function loadReviews() {
  loading.value = true;
  try {
    const res = await managementReviewApi.list();
    reviews.value = (res as any).data || res;
  } finally {
    loading.value = false;
  }
}

async function createReview() {
  if (!form.year || !form.title.trim()) {
    ElMessage.warning('年度和标题不能为空');
    return;
  }
  saving.value = true;
  try {
    const res = await managementReviewApi.create({ ...form });
    const review = (res as any).data || res;
    ElMessage.success('已创建管理评审');
    dialogVisible.value = false;
    router.push(`/management-reviews/${review.id}`);
  } finally {
    saving.value = false;
  }
}

onMounted(loadReviews);
</script>

<style scoped>
.management-review-list {
  padding: 16px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
</style>
```

- [ ] **Step 2: Add the detail page**

Create `client/src/views/management-review/ReviewDetail.vue` with source collection and action creation:

```vue
<template>
  <div class="management-review-detail" v-loading="loading">
    <div class="page-header">
      <div>
        <h2>{{ review?.title || '管理评审详情' }}</h2>
        <p>{{ review?.year }} 年 · {{ review?.status }}</p>
      </div>
      <el-button type="primary" :loading="collecting" @click="collectSources">收集输入材料</el-button>
    </div>

    <el-tabs>
      <el-tab-pane label="输入材料">
        <el-table :data="review?.inputs || []" border>
          <el-table-column prop="sourceType" label="来源" width="150" />
          <el-table-column prop="department" label="部门" width="150" />
          <el-table-column prop="title" label="标题" min-width="220" />
          <el-table-column label="摘要" min-width="260">
            <template #default="{ row }">
              <pre>{{ formatSummary(row.summary) }}</pre>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="改进措施">
        <div class="action-bar">
          <el-button @click="actionDialogVisible = true">新增改进措施</el-button>
        </div>
        <el-table :data="review?.actions || []" border>
          <el-table-column prop="action" label="改进措施" min-width="260" />
          <el-table-column prop="responsibleDepartment" label="责任部门" width="160" />
          <el-table-column prop="status" label="状态" width="140" />
          <el-table-column prop="dueDate" label="期限" width="150">
            <template #default="{ row }">{{ formatDate(row.dueDate) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="actionDialogVisible" title="新增改进措施" width="560px">
      <el-form :model="actionForm" label-width="110px">
        <el-form-item label="改进措施" required>
          <el-input v-model="actionForm.action" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="责任部门" required>
          <el-input v-model="actionForm.responsibleDepartment" />
        </el-form-item>
        <el-form-item label="期限">
          <el-date-picker v-model="actionForm.dueDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="actionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingAction" @click="createAction">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { managementReviewApi, type ManagementReview } from '@/api/management-review';

const route = useRoute();
const reviewId = route.params.id as string;
const loading = ref(false);
const collecting = ref(false);
const savingAction = ref(false);
const actionDialogVisible = ref(false);
const review = ref<ManagementReview | null>(null);
const actionForm = reactive({
  action: '',
  responsibleDepartment: '',
  dueDate: '',
});

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '-';
}

function formatSummary(summary: Record<string, unknown>) {
  return JSON.stringify(summary, null, 2);
}

async function loadReview() {
  loading.value = true;
  try {
    const res = await managementReviewApi.get(reviewId);
    review.value = (res as any).data || res;
  } finally {
    loading.value = false;
  }
}

async function collectSources() {
  collecting.value = true;
  try {
    const res = await managementReviewApi.collectSources(reviewId);
    const result = (res as any).data || res;
    ElMessage.success(`已收集 ${result.auditReports} 份内审报告、${result.trainingArchives} 份培训档案`);
    await loadReview();
  } finally {
    collecting.value = false;
  }
}

async function createAction() {
  if (!actionForm.action.trim() || !actionForm.responsibleDepartment.trim()) {
    ElMessage.warning('改进措施和责任部门不能为空');
    return;
  }
  savingAction.value = true;
  try {
    await managementReviewApi.createAction(reviewId, { ...actionForm });
    ElMessage.success('已新增改进措施');
    actionDialogVisible.value = false;
    actionForm.action = '';
    actionForm.responsibleDepartment = '';
    actionForm.dueDate = '';
    await loadReview();
  } finally {
    savingAction.value = false;
  }
}

onMounted(loadReview);
</script>

<style scoped>
.management-review-detail {
  padding: 16px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.page-header p {
  margin: 4px 0 0;
  color: #606266;
}
.action-bar {
  margin-bottom: 12px;
}
pre {
  margin: 0;
  white-space: pre-wrap;
  font-size: 12px;
}
</style>
```

- [ ] **Step 3: Register routes**

In `client/src/router/index.ts`, add these route entries near the internal-audit routes:

```ts
      {
        path: 'management-reviews',
        name: 'ManagementReviewList',
        component: () => import('@/views/management-review/ReviewList.vue'),
        meta: { title: '管理评审' },
      },
      {
        path: 'management-reviews/:id',
        name: 'ManagementReviewDetail',
        component: () => import('@/views/management-review/ReviewDetail.vue'),
        meta: { title: '管理评审详情' },
      },
```

- [ ] **Step 4: Run client build**

```bash
npm run build -w client
```

Expected: PASS.

## Task 7: Final verification and commit

**Files:**
- All files from Tasks 1-6

- [ ] **Step 1: Run backend focused test**

```bash
(cd server && npm test -- management-review.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 2: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

- [ ] **Step 3: Run server build**

```bash
npm run build:server
```

Expected: PASS.

- [ ] **Step 4: Run client build**

```bash
npm run build -w client
```

Expected: PASS.

- [ ] **Step 5: Check changed files**

```bash
git status --short
```

Expected: only the files listed in this plan are modified or added.

- [ ] **Step 6: Commit implementation**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260502143000_management_review_models/migration.sql server/src/modules/management-review server/src/app.module.ts client/src/api/management-review.ts client/src/views/management-review client/src/router/index.ts
git commit -m "feat: add management review model"
```
