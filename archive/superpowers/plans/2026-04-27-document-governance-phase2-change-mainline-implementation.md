# Document Governance Phase 2 Change Mainline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable unified change mainline so a real change creates `ChangeEvent`, generates default form tasks from existing `RecordTemplate` rows, and links filled `Record` instances back to the change.

**Architecture:** Keep `ChangeEvent` as the main event, add `ChangeEventRelation` for affected objects, and add `ChangeEventFormTask` for required form templates. `Record` receives `usageType/sourceType/sourceId/changeEventId` so one template can be used for initial, change, or periodic records without duplicating templates.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Jest, Vue 3, Element Plus, Vitest, Vite.

---

## File Structure

- Modify: `server/src/prisma/schema.prisma`  
  Adds `Record` source/use fields, `ChangeEventRelation`, `ChangeEventFormTask`, and `DocumentImpactReview.changeEventId`.
- Create: `server/src/prisma/migrations/20260427000002_change_mainline_form_tasks/migration.sql`  
  Adds additive columns, tables, indexes, and foreign keys.
- Modify: `server/src/modules/record/dto/create-record.dto.ts`  
  Adds optional `usageType/sourceType/sourceId/changeEventId`.
- Modify: `server/src/modules/record/record.service.ts`  
  Writes the new `Record` source/use fields and filters by `changeEventId`.
- Modify: `server/src/modules/record/dto/query-record.dto.ts`  
  Adds optional query filters for `usageType` and `changeEventId`.
- Modify: `server/src/modules/change-event/dto/create-change-event.dto.ts`  
  Adds supported phase-two change types and optional initial relations.
- Create: `server/src/modules/change-event/change-event-default-form-rules.ts`  
  Owns the first-pass mapping from `change_type` to source form codes and explicitly excludes `GRSS-KF-JL-03` and `GRSS-KF-JL-01`.
- Create: `server/src/modules/change-event/change-event-form-task.service.ts`  
  Generates default form tasks and fills a task by creating a `Record`.
- Create: `server/src/modules/change-event/change-event-relation.service.ts`  
  Validates known related object targets and creates `ChangeEventRelation` rows.
- Modify: `server/src/modules/change-event/change-event.service.ts`  
  Creates events in a transaction with relations and default form tasks, and returns detail includes.
- Modify: `server/src/modules/change-event/change-event.controller.ts`  
  Adds form-task list/fill endpoints and keeps existing routes stable.
- Modify: `server/src/modules/change-event/change-event.module.ts`  
  Provides the new services and imports `RecordModule` with `forwardRef` only if Nest requires it.
- Modify: `server/src/modules/document/dto/document-operations.dto.ts`  
  Adds optional `changeEventId` to impact review creation.
- Modify: `server/src/modules/document/services/document-impact.service.ts`  
  Sets `DocumentImpactReview.changeEventId` when source is a change event.
- Modify: `client/src/api/change-event.ts`  
  Adds form task, relation, and detail response types plus fill-task API.
- Modify: `client/src/views/change-event/ChangeEventList.vue`  
  Shows default form tasks in the existing detail dialog and navigates to record creation for pending tasks.
- Test: `server/src/modules/change-event/change-event.service.spec.ts`
- Test: `server/src/modules/change-event/change-event-form-task.service.spec.ts`
- Test: `server/src/modules/change-event/change-event-relation.service.spec.ts`
- Test: `server/src/modules/record/record.service.spec.ts`
- Test: `server/src/modules/document/services/document-impact.service.spec.ts`
- Test: `client/src/views/change-event/__tests__/ChangeEventList.spec.ts`

---

## Task 1: Schema And Migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260427000002_change_mainline_form_tasks/migration.sql`

- [ ] **Step 1: Write schema expectation test by validating generated Prisma types**

Run this command before editing and keep the failure as the red bar:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
./node_modules/.bin/prisma validate --schema=src/prisma/schema.prisma
```

Expected before this task: PASS, because no new fields exist yet. The real red bar comes in Task 2 service tests.

- [ ] **Step 2: Add Prisma fields and models**

In `server/src/prisma/schema.prisma`, update `Record`, `ChangeEvent`, and `DocumentImpactReview`, then add the two new models near `ChangeEvent`.

```prisma
model Record {
  id             String         @id @default(cuid())
  templateId     String
  template       RecordTemplate @relation(fields: [templateId], references: [id], onDelete: Restrict)
  number         String         @unique
  dataJson       Json
  status         String         @default("draft")
  retentionUntil DateTime?
  createdBy      String
  creator        User?          @relation("RecordCreator", fields: [createdBy], references: [id], onDelete: SetNull)
  submittedAt    DateTime?
  approvedAt     DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  deletedAt      DateTime?

  relatedBatchType     String?
  relatedBatchId       String?
  relatedBatchNumber   String?
  productionBatchId    String?
  productionBatch      ProductionBatch?    @relation("RecordProductionBatch", fields: [productionBatchId], references: [id], onDelete: SetNull)
  finishedGoodsBatchId String?
  finishedGoodsBatch   FinishedGoodsBatch? @relation("RecordFinishedGoodsBatch", fields: [finishedGoodsBatchId], references: [id], onDelete: SetNull)

  workflowId         String?
  workflow           WorkflowInstance? @relation("RecordWorkflow", fields: [workflowId], references: [id], onDelete: SetNull)
  approvalInstanceId String?
  taskInstanceId     String?
  taskInstance       RecordTaskInstance? @relation(fields: [taskInstanceId], references: [id], onDelete: SetNull)

  signatureTimestamp DateTime?
  offlineFilled      Boolean   @default(false)
  autoArchiveStatus  String    @default("active")
  shift_instance_id  String?
  shift_instance     ShiftInstance?  @relation(fields: [shift_instance_id], references: [id], onDelete: SetNull)
  production_run_id  String?
  production_run     ProductionRun?  @relation(fields: [production_run_id], references: [id], onDelete: SetNull)
  document_no        String?
  entity_links       Json?

  usageType      String?
  sourceType     String?
  sourceId       String?
  changeEventId  String?
  changeEvent    ChangeEvent? @relation("ChangeEventRecords", fields: [changeEventId], references: [id], onDelete: SetNull)
  changeFormTasks ChangeEventFormTask[]

  changeLogs       RecordChangeLog[]
  deviationReports DeviationReport[]

  @@index([templateId])
  @@index([number])
  @@index([status])
  @@index([retentionUntil])
  @@index([relatedBatchNumber])
  @@index([productionBatchId])
  @@index([finishedGoodsBatchId])
  @@index([workflowId])
  @@index([taskInstanceId])
  @@index([shift_instance_id])
  @@index([production_run_id])
  @@index([approvalInstanceId])
  @@index([usageType])
  @@index([sourceType, sourceId])
  @@index([changeEventId])
  @@map("records")
}

model ChangeEvent {
  id            String                     @id @default(cuid())
  company_id    String
  change_no     String
  change_type   String
  description   String
  reason        String
  applied_by    String?
  applied_at    DateTime                   @db.Date
  status        String                     @default("pending")
  approved_by   String?
  verifications ChangeVerificationRecord[]
  records       Record[]                   @relation("ChangeEventRecords")
  relations     ChangeEventRelation[]
  formTasks     ChangeEventFormTask[]
  impactReviews DocumentImpactReview[]
  created_at    DateTime                   @default(now())
  updated_at    DateTime                   @updatedAt

  @@unique([company_id, change_no])
}

model ChangeEventRelation {
  id             String      @id @default(cuid())
  changeEventId  String
  changeEvent    ChangeEvent @relation(fields: [changeEventId], references: [id], onDelete: Cascade)
  targetType     String
  targetId       String?
  targetRoute    String?
  targetLabel    String
  relationType   String?
  impactLevel    String      @default("medium")
  requiredAction String?
  status         String      @default("open")
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@index([changeEventId])
  @@index([targetType, targetId])
  @@index([status])
  @@map("change_event_relations")
}

model ChangeEventFormTask {
  id            String         @id @default(cuid())
  changeEventId String
  changeEvent   ChangeEvent    @relation(fields: [changeEventId], references: [id], onDelete: Cascade)
  templateId    String
  template      RecordTemplate @relation(fields: [templateId], references: [id], onDelete: Restrict)
  recordId      String?
  record        Record?        @relation(fields: [recordId], references: [id], onDelete: SetNull)
  sourceFormCode String
  title         String
  status        String         @default("pending")
  required      Boolean        @default(true)
  sortOrder     Int            @default(0)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@unique([changeEventId, templateId])
  @@index([changeEventId])
  @@index([templateId])
  @@index([recordId])
  @@index([status])
  @@map("change_event_form_tasks")
}

model DocumentImpactReview {
  id            String       @id @default(cuid())
  sourceType    String
  sourceId      String
  changeEventId String?
  changeEvent   ChangeEvent? @relation(fields: [changeEventId], references: [id], onDelete: SetNull)
  title         String
  status        String       @default("draft")
  summary       String?
  reviewedBy    String?
  reviewedAt    DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  items         DocumentImpactItem[]

  @@index([sourceType, sourceId])
  @@index([changeEventId])
  @@index([status])
  @@map("document_impact_reviews")
}
```

- [ ] **Step 3: Create migration SQL**

Create `server/src/prisma/migrations/20260427000002_change_mainline_form_tasks/migration.sql` with:

```sql
-- Phase 2: unified change mainline, form tasks, and record usage linkage.

ALTER TABLE "records"
  ADD COLUMN IF NOT EXISTS "usageType" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "changeEventId" TEXT;

ALTER TABLE "document_impact_reviews"
  ADD COLUMN IF NOT EXISTS "changeEventId" TEXT;

CREATE TABLE IF NOT EXISTS "change_event_relations" (
  "id" TEXT NOT NULL,
  "changeEventId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "targetRoute" TEXT,
  "targetLabel" TEXT NOT NULL,
  "relationType" TEXT,
  "impactLevel" TEXT NOT NULL DEFAULT 'medium',
  "requiredAction" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "change_event_relations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "change_event_form_tasks" (
  "id" TEXT NOT NULL,
  "changeEventId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "recordId" TEXT,
  "sourceFormCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "required" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "change_event_form_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "records_usageType_idx" ON "records"("usageType");
CREATE INDEX IF NOT EXISTS "records_sourceType_sourceId_idx" ON "records"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "records_changeEventId_idx" ON "records"("changeEventId");
CREATE INDEX IF NOT EXISTS "document_impact_reviews_changeEventId_idx" ON "document_impact_reviews"("changeEventId");
CREATE INDEX IF NOT EXISTS "change_event_relations_changeEventId_idx" ON "change_event_relations"("changeEventId");
CREATE INDEX IF NOT EXISTS "change_event_relations_targetType_targetId_idx" ON "change_event_relations"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "change_event_relations_status_idx" ON "change_event_relations"("status");
CREATE INDEX IF NOT EXISTS "change_event_form_tasks_changeEventId_idx" ON "change_event_form_tasks"("changeEventId");
CREATE INDEX IF NOT EXISTS "change_event_form_tasks_templateId_idx" ON "change_event_form_tasks"("templateId");
CREATE INDEX IF NOT EXISTS "change_event_form_tasks_recordId_idx" ON "change_event_form_tasks"("recordId");
CREATE INDEX IF NOT EXISTS "change_event_form_tasks_status_idx" ON "change_event_form_tasks"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'records_changeEventId_fkey') THEN
    ALTER TABLE "records"
      ADD CONSTRAINT "records_changeEventId_fkey"
      FOREIGN KEY ("changeEventId") REFERENCES "ChangeEvent"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_impact_reviews_changeEventId_fkey') THEN
    ALTER TABLE "document_impact_reviews"
      ADD CONSTRAINT "document_impact_reviews_changeEventId_fkey"
      FOREIGN KEY ("changeEventId") REFERENCES "ChangeEvent"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'change_event_relations_changeEventId_fkey') THEN
    ALTER TABLE "change_event_relations"
      ADD CONSTRAINT "change_event_relations_changeEventId_fkey"
      FOREIGN KEY ("changeEventId") REFERENCES "ChangeEvent"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'change_event_form_tasks_changeEventId_fkey') THEN
    ALTER TABLE "change_event_form_tasks"
      ADD CONSTRAINT "change_event_form_tasks_changeEventId_fkey"
      FOREIGN KEY ("changeEventId") REFERENCES "ChangeEvent"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'change_event_form_tasks_templateId_fkey') THEN
    ALTER TABLE "change_event_form_tasks"
      ADD CONSTRAINT "change_event_form_tasks_templateId_fkey"
      FOREIGN KEY ("templateId") REFERENCES "record_templates"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'change_event_form_tasks_recordId_fkey') THEN
    ALTER TABLE "change_event_form_tasks"
      ADD CONSTRAINT "change_event_form_tasks_recordId_fkey"
      FOREIGN KEY ("recordId") REFERENCES "records"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
```

- [ ] **Step 4: Validate schema**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
./node_modules/.bin/prisma validate --schema=src/prisma/schema.prisma
```

Expected: `The schema at src/prisma/schema.prisma is valid`.

- [ ] **Step 5: Commit schema**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260427000002_change_mainline_form_tasks/migration.sql
git commit -m "feat: add change mainline schema"
```

---

## Task 2: Record Usage Fields

**Files:**
- Modify: `server/src/modules/record/dto/create-record.dto.ts`
- Modify: `server/src/modules/record/dto/query-record.dto.ts`
- Modify: `server/src/modules/record/record.service.ts`
- Test: `server/src/modules/record/record.service.spec.ts`

- [ ] **Step 1: Add failing service test**

Append this test to `server/src/modules/record/record.service.spec.ts` inside the existing `RecordService` describe block. If the file uses a different mock factory, adapt only the surrounding setup and keep these expectations unchanged.

```ts
it('creates a change record with usage and source fields', async () => {
  prisma.recordTemplate.findUnique.mockResolvedValue({
    id: 'tpl1',
    code: 'GRSS-PZ-JL-07',
    fieldsJson: { fields: [] },
    retentionYears: 5,
    batchLinkEnabled: false,
  });
  prisma.record.create.mockResolvedValue({
    id: 'record1',
    templateId: 'tpl1',
    usageType: 'change',
    sourceType: 'change_event',
    sourceId: 'change1',
    changeEventId: 'change1',
  });

  await service.create({
    templateId: 'tpl1',
    dataJson: {},
    usageType: 'change',
    sourceType: 'change_event',
    sourceId: 'change1',
    changeEventId: 'change1',
  } as any, 'user1');

  expect(prisma.record.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      usageType: 'change',
      sourceType: 'change_event',
      sourceId: 'change1',
      changeEventId: 'change1',
    }),
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- record.service.spec.ts --runInBand
```

Expected: FAIL because `CreateRecordDto` and `RecordService.create()` do not write these fields yet.

- [ ] **Step 3: Add DTO fields**

In `server/src/modules/record/dto/create-record.dto.ts`, add:

```ts
  @ApiPropertyOptional({ description: '填写用途', enum: ['initial', 'change', 'periodic'] })
  @IsOptional()
  @IsString()
  usageType?: string;

  @ApiPropertyOptional({ description: '来源对象类型', example: 'change_event' })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional({ description: '来源对象ID', example: 'clxxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional({ description: '关联变更事件ID', example: 'clxxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  changeEventId?: string;
```

In `server/src/modules/record/dto/query-record.dto.ts`, add optional filters:

```ts
  @IsOptional()
  @IsString()
  usageType?: string;

  @IsOptional()
  @IsString()
  changeEventId?: string;
```

- [ ] **Step 4: Write minimal service implementation**

In `server/src/modules/record/record.service.ts`, inside `create()`, extend `prisma.record.create({ data })`:

```ts
        usageType: createDto.usageType ?? null,
        sourceType: createDto.sourceType ?? null,
        sourceId: createDto.sourceId ?? null,
        changeEventId: createDto.changeEventId ?? null,
```

Inside `findAll()`, after the existing `templateId` filter, add:

```ts
    if (query.usageType) {
      where.usageType = query.usageType;
    }

    if (query.changeEventId) {
      where.changeEventId = query.changeEventId;
    }
```

- [ ] **Step 5: Run record tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- record.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/modules/record/dto/create-record.dto.ts server/src/modules/record/dto/query-record.dto.ts server/src/modules/record/record.service.ts server/src/modules/record/record.service.spec.ts
git commit -m "feat: record change usage metadata"
```

---

## Task 3: Default Change Form Rules

**Files:**
- Create: `server/src/modules/change-event/change-event-default-form-rules.ts`
- Test: `server/src/modules/change-event/change-event-form-task.service.spec.ts`

- [ ] **Step 1: Create rule file**

Create `server/src/modules/change-event/change-event-default-form-rules.ts`:

```ts
export const RETIRED_CHANGE_FORM_CODES = new Set([
  'GRSS-KF-JL-03', // 产品更改申请表：由 ChangeEvent + ChangeApproval 承载
]);

export const PRODUCT_RND_ONLY_FORM_CODES = new Set([
  'GRSS-KF-JL-01', // 产品开发评审记录：固定挂产品研发流程 Step 4
]);

export const CHANGE_EVENT_DEFAULT_FORM_CODES: Record<string, string[]> = {
  document: [],
  record_form: [],
  recipe: [
    'GRSS-KF-JL-07',
    'GRSS-KF-JL-08',
  ],
  process: [
    'GRSS-KF-JL-08',
    'GRSS-PZ-JL-22',
  ],
  equipment: [
    'GRSS-PZ-JL-45',
  ],
  supplier: [],
  haccp: [
    'GRSS-PZ-JL-22',
  ],
  product: [
    'GRSS-KF-JL-07',
  ],
  other: [],
};

export function getDefaultFormCodesForChangeType(changeType: string): string[] {
  const codes = CHANGE_EVENT_DEFAULT_FORM_CODES[changeType] ?? [];
  return codes.filter(
    (code) => !RETIRED_CHANGE_FORM_CODES.has(code) && !PRODUCT_RND_ONLY_FORM_CODES.has(code),
  );
}
```

- [ ] **Step 2: Write rule tests**

Create `server/src/modules/change-event/change-event-form-task.service.spec.ts` with this first describe block:

```ts
import { getDefaultFormCodesForChangeType } from './change-event-default-form-rules';

describe('change event default form rules', () => {
  it('excludes product change application and product development review from generic changes', () => {
    const allCodes = [
      ...getDefaultFormCodesForChangeType('product'),
      ...getDefaultFormCodesForChangeType('recipe'),
      ...getDefaultFormCodesForChangeType('process'),
      ...getDefaultFormCodesForChangeType('document'),
      ...getDefaultFormCodesForChangeType('record_form'),
    ];

    expect(allCodes).not.toContain('GRSS-KF-JL-03');
    expect(allCodes).not.toContain('GRSS-KF-JL-01');
  });
});
```

- [ ] **Step 3: Run rule test**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- change-event-form-task.service.spec.ts --runInBand
```

Expected: PASS.

---

## Task 4: Change Event Form Task Service

**Files:**
- Create: `server/src/modules/change-event/change-event-form-task.service.ts`
- Modify: `server/src/modules/change-event/change-event-form-task.service.spec.ts`
- Modify: `server/src/modules/change-event/change-event.module.ts`

- [ ] **Step 1: Add failing generation test**

Append to `server/src/modules/change-event/change-event-form-task.service.spec.ts`:

```ts
import { ChangeEventFormTaskService } from './change-event-form-task.service';

describe('ChangeEventFormTaskService', () => {
  const prisma = {
    recordTemplate: { findMany: jest.fn() },
    changeEventFormTask: { createMany: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    record: { create: jest.fn() },
  };
  const recordService = { create: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('generates pending tasks from default form codes', async () => {
    prisma.recordTemplate.findMany.mockResolvedValue([
      { id: 'tpl1', code: 'GRSS-KF-JL-07', name: '产品验证记录表' },
    ]);
    prisma.changeEventFormTask.createMany.mockResolvedValue({ count: 1 });
    prisma.changeEventFormTask.findMany.mockResolvedValue([
      { id: 'task1', templateId: 'tpl1', sourceFormCode: 'GRSS-KF-JL-07', status: 'pending' },
    ]);

    const service = new ChangeEventFormTaskService(prisma as any, recordService as any);
    const result = await service.generateDefaultTasks('change1', 'recipe');

    expect(prisma.changeEventFormTask.createMany).toHaveBeenCalledWith({
      data: [{
        changeEventId: 'change1',
        templateId: 'tpl1',
        sourceFormCode: 'GRSS-KF-JL-07',
        title: '产品验证记录表',
        status: 'pending',
        required: true,
        sortOrder: 0,
      }],
      skipDuplicates: true,
    });
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- change-event-form-task.service.spec.ts --runInBand
```

Expected: FAIL because `ChangeEventFormTaskService` does not exist.

- [ ] **Step 3: Implement service**

Create `server/src/modules/change-event/change-event-form-task.service.ts`:

```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordService } from '../record/record.service';
import { getDefaultFormCodesForChangeType } from './change-event-default-form-rules';

@Injectable()
export class ChangeEventFormTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recordService: RecordService,
  ) {}

  async generateDefaultTasks(changeEventId: string, changeType: string) {
    const codes = getDefaultFormCodesForChangeType(changeType);
    if (codes.length === 0) return [];

    const templates = await this.prisma.recordTemplate.findMany({
      where: { code: { in: codes }, deletedAt: null, status: { not: 'retired' } },
      select: { id: true, code: true, name: true },
    });
    const byCode = new Map(templates.map((template) => [template.code, template]));
    const data = codes
      .map((code, index) => ({ code, template: byCode.get(code), index }))
      .filter((item): item is { code: string; template: { id: string; code: string; name: string }; index: number } => Boolean(item.template))
      .map((item) => ({
        changeEventId,
        templateId: item.template.id,
        sourceFormCode: item.code,
        title: item.template.name,
        status: 'pending',
        required: true,
        sortOrder: item.index,
      }));

    if (data.length === 0) return [];

    await this.prisma.changeEventFormTask.createMany({ data, skipDuplicates: true });
    return this.listForChange(changeEventId);
  }

  async listForChange(changeEventId: string) {
    return this.prisma.changeEventFormTask.findMany({
      where: { changeEventId },
      include: {
        template: { select: { id: true, code: true, name: true, status: true } },
        record: { select: { id: true, number: true, status: true, createdAt: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async fillTask(taskId: string, dataJson: object, userId: string) {
    const task = await this.prisma.changeEventFormTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('变更表单任务不存在');
    if (task.recordId) throw new ConflictException('变更表单任务已填写');
    if (task.status !== 'pending') throw new BadRequestException('只有待填写任务可以填写');

    const record = await this.recordService.create({
      templateId: task.templateId,
      dataJson,
      usageType: 'change',
      sourceType: 'change_event',
      sourceId: task.changeEventId,
      changeEventId: task.changeEventId,
    } as any, userId);

    return this.prisma.changeEventFormTask.update({
      where: { id: task.id },
      data: { recordId: record.id, status: 'filled' },
      include: {
        template: { select: { id: true, code: true, name: true, status: true } },
        record: { select: { id: true, number: true, status: true, createdAt: true } },
      },
    });
  }
}
```

- [ ] **Step 4: Register service**

In `server/src/modules/change-event/change-event.module.ts`, add `RecordModule` import and provider:

```ts
import { RecordModule } from '../record/record.module';
import { ChangeEventFormTaskService } from './change-event-form-task.service';

@Module({
  imports: [UnifiedApprovalModule, RecordModule],
  controllers: [ChangeEventController],
  providers: [ChangeEventService, ChangeEventFormTaskService],
  exports: [ChangeEventService, ChangeEventFormTaskService],
})
export class ChangeEventModule implements OnModuleInit {
  // keep existing callback registration
}
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- change-event-form-task.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/modules/change-event/change-event-default-form-rules.ts server/src/modules/change-event/change-event-form-task.service.ts server/src/modules/change-event/change-event-form-task.service.spec.ts server/src/modules/change-event/change-event.module.ts
git commit -m "feat: generate change form tasks"
```

---

## Task 5: Change Event Creation With Relations And Tasks

**Files:**
- Modify: `server/src/modules/change-event/dto/create-change-event.dto.ts`
- Create: `server/src/modules/change-event/change-event-relation.service.ts`
- Create: `server/src/modules/change-event/change-event-relation.service.spec.ts`
- Modify: `server/src/modules/change-event/change-event.service.ts`
- Create: `server/src/modules/change-event/change-event.service.spec.ts`

- [ ] **Step 1: Add DTO relation shape**

In `server/src/modules/change-event/dto/create-change-event.dto.ts`, replace the class with:

```ts
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ChangeEventRelationDto {
  @IsString()
  targetType: string;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsString()
  targetRoute?: string;

  @IsString()
  targetLabel: string;

  @IsOptional()
  @IsString()
  relationType?: string;

  @IsOptional()
  @IsString()
  impactLevel?: string;

  @IsOptional()
  @IsString()
  requiredAction?: string;
}

export class CreateChangeEventDto {
  @IsIn(['document', 'record_form', 'product', 'recipe', 'process', 'equipment', 'supplier', 'haccp', 'other'])
  change_type: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  initiator_id?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeEventRelationDto)
  relations?: ChangeEventRelationDto[];
}
```

- [ ] **Step 2: Add relation service test**

Create `server/src/modules/change-event/change-event-relation.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { ChangeEventRelationService } from './change-event-relation.service';

describe('ChangeEventRelationService', () => {
  const prisma = {
    document: { findUnique: jest.fn() },
    recordTemplate: { findUnique: jest.fn() },
    product: { findUnique: jest.fn() },
    recipe: { findUnique: jest.fn() },
    processStep: { findUnique: jest.fn() },
    material: { findUnique: jest.fn() },
    supplier: { findUnique: jest.fn() },
    changeEventRelation: { createMany: jest.fn() },
  };

  beforeEach(() => jest.clearAllMocks());

  it('rejects missing known relation targets', async () => {
    prisma.document.findUnique.mockResolvedValue(null);
    const service = new ChangeEventRelationService(prisma as any);

    await expect(service.createRelations('change1', [{
      targetType: 'document',
      targetId: 'missing-doc',
      targetLabel: '质量手册',
    }])).rejects.toThrow(NotFoundException);
  });

  it('creates validated relation rows', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
    prisma.changeEventRelation.createMany.mockResolvedValue({ count: 1 });
    const service = new ChangeEventRelationService(prisma as any);

    await service.createRelations('change1', [{
      targetType: 'document',
      targetId: 'doc1',
      targetLabel: '质量手册',
      relationType: 'affected',
    }]);

    expect(prisma.changeEventRelation.createMany).toHaveBeenCalledWith({
      data: [{
        changeEventId: 'change1',
        targetType: 'document',
        targetId: 'doc1',
        targetRoute: null,
        targetLabel: '质量手册',
        relationType: 'affected',
        impactLevel: 'medium',
        requiredAction: null,
        status: 'open',
      }],
    });
  });
});
```

- [ ] **Step 3: Implement relation service**

Create `server/src/modules/change-event/change-event-relation.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeEventRelationDto } from './dto/create-change-event.dto';

@Injectable()
export class ChangeEventRelationService {
  constructor(private readonly prisma: PrismaService) {}

  async createRelations(changeEventId: string, relations: ChangeEventRelationDto[] = []) {
    if (relations.length === 0) return { count: 0 };

    for (const relation of relations) {
      await this.assertTargetExists(relation);
    }

    return this.prisma.changeEventRelation.createMany({
      data: relations.map((relation) => ({
        changeEventId,
        targetType: relation.targetType,
        targetId: relation.targetId ?? null,
        targetRoute: relation.targetRoute ?? null,
        targetLabel: relation.targetLabel,
        relationType: relation.relationType ?? null,
        impactLevel: relation.impactLevel ?? 'medium',
        requiredAction: relation.requiredAction ?? null,
        status: 'open',
      })),
    });
  }

  private async assertTargetExists(relation: ChangeEventRelationDto) {
    if (!relation.targetId) return;

    const modelByType: Record<string, any> = {
      document: this.prisma.document,
      record_template: this.prisma.recordTemplate,
      product: this.prisma.product,
      recipe: this.prisma.recipe,
      process_step: this.prisma.processStep,
      material: this.prisma.material,
      supplier: this.prisma.supplier,
    };
    const model = modelByType[relation.targetType];
    if (!model) return;

    const target = await model.findUnique({ where: { id: relation.targetId } });
    if (!target || target.deletedAt) {
      throw new NotFoundException(`变更关联目标不存在: ${relation.targetType}/${relation.targetId}`);
    }
  }
}
```

- [ ] **Step 4: Add creation test**

Create `server/src/modules/change-event/change-event.service.spec.ts`:

```ts
import { ChangeEventService } from './change-event.service';

describe('ChangeEventService', () => {
  const prisma = {
    changeEvent: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const eventEmitter = { emit: jest.fn() };
  const approvalEngine = { startApproval: jest.fn() };
  const formTasks = { generateDefaultTasks: jest.fn() };
  const relations = { createRelations: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  });

  it('creates change event with relations and default form tasks', async () => {
    prisma.changeEvent.count.mockResolvedValue(0);
    prisma.changeEvent.create.mockResolvedValue({
      id: 'change1',
      change_no: 'CE-2026-0001',
      change_type: 'recipe',
    });
    formTasks.generateDefaultTasks.mockResolvedValue([{ id: 'task1' }]);
    relations.createRelations.mockResolvedValue({ count: 1 });

    const service = new ChangeEventService(
      prisma as any,
      eventEmitter as any,
      formTasks as any,
      relations as any,
      approvalEngine as any,
    );

    const result = await service.create({
      change_type: 'recipe',
      title: '配方调整',
      description: '调整配方参数',
      relations: [{ targetType: 'recipe', targetId: 'recipe1', targetLabel: '蛋液配方' }],
    } as any, 'user1');

    expect(result.id).toBe('change1');
    expect(relations.createRelations).toHaveBeenCalledWith('change1', [
      { targetType: 'recipe', targetId: 'recipe1', targetLabel: '蛋液配方' },
    ]);
    expect(formTasks.generateDefaultTasks).toHaveBeenCalledWith('change1', 'recipe');
  });
});
```

- [ ] **Step 5: Update service constructor and create logic**

In `server/src/modules/change-event/change-event.service.ts`, change constructor and `create()` to:

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly formTaskService: ChangeEventFormTaskService,
    private readonly relationService: ChangeEventRelationService,
    @Optional() private readonly approvalEngine?: ApprovalEngineService,
  ) {}

  async create(dto: CreateChangeEventDto, userId: string) {
    const year = new Date().getFullYear();
    const changeEvent = await this.prisma.$transaction(async (tx) => {
      const count = await tx.changeEvent.count();
      const change_no = `CE-${year}-${String(count + 1).padStart(4, '0')}`;
      const created = await tx.changeEvent.create({
        data: {
          company_id: '1',
          change_no,
          change_type: dto.change_type,
          description: dto.description,
          reason: dto.title,
          applied_by: userId,
          applied_at: new Date(),
          status: dto.status ?? 'pending',
        },
      });

      await this.relationService.createRelations(created.id, dto.relations ?? []);
      await this.formTaskService.generateDefaultTasks(created.id, dto.change_type);
      return created;
    });

    try {
      await this.approvalEngine?.startApproval({
        resourceType: 'change_event',
        resourceId: changeEvent.id,
        resourceStep: 'submit',
        triggerKey: 'submit',
        title: `变更事件审批：${changeEvent.change_no}`,
        createdById: userId,
      });
    } catch {
      // no definition = skip
    }

    return this.findOne(changeEvent.id);
  }
```

Also update `findAll()` and `findOne()` includes:

```ts
      include: {
        verifications: true,
        relations: true,
        formTasks: {
          include: {
            template: { select: { id: true, code: true, name: true, status: true } },
            record: { select: { id: true, number: true, status: true, createdAt: true } },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
```

- [ ] **Step 6: Register relation service**

In `server/src/modules/change-event/change-event.module.ts`, add `ChangeEventRelationService` to providers and exports:

```ts
providers: [ChangeEventService, ChangeEventFormTaskService, ChangeEventRelationService],
exports: [ChangeEventService, ChangeEventFormTaskService, ChangeEventRelationService],
```

- [ ] **Step 7: Run change event tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- change-event.service.spec.ts change-event-relation.service.spec.ts change-event-form-task.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/modules/change-event
git commit -m "feat: create change events with tasks"
```

---

## Task 6: Form Task API

**Files:**
- Modify: `server/src/modules/change-event/change-event.controller.ts`

- [ ] **Step 1: Add controller endpoints**

In `server/src/modules/change-event/change-event.controller.ts`, inject `ChangeEventFormTaskService`:

```ts
  constructor(
    private service: ChangeEventService,
    private formTaskService: ChangeEventFormTaskService,
  ) {}
```

Add these endpoints before `@Get(':id')`:

```ts
  @Get(':id/form-tasks')
  findFormTasks(@Param('id') id: string) {
    return this.formTaskService.listForChange(id);
  }

  @Post('form-tasks/:taskId/fill')
  fillFormTask(
    @Param('taskId') taskId: string,
    @Body('dataJson') dataJson: object,
    @Request() req: { user: { id?: string; userId?: string } },
  ) {
    return this.formTaskService.fillTask(taskId, dataJson ?? {}, req.user.id ?? req.user.userId!);
  }
```

- [ ] **Step 2: Run build**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/modules/change-event/change-event.controller.ts
git commit -m "feat: expose change form task api"
```

---

## Task 7: Document Impact Review Link

**Files:**
- Modify: `server/src/modules/document/dto/document-operations.dto.ts`
- Modify: `server/src/modules/document/services/document-impact.service.ts`
- Test: `server/src/modules/document/services/document-impact.service.spec.ts`

- [ ] **Step 1: Add failing impact review test**

Append to `server/src/modules/document/services/document-impact.service.spec.ts`:

```ts
it('links impact review to change event when provided', async () => {
  const prisma = {
    documentReference: { findMany: jest.fn().mockResolvedValue([]) },
    recordFormLandingEntry: { findMany: jest.fn().mockResolvedValue([]) },
    documentImpactReview: { create: jest.fn().mockResolvedValue({ id: 'review1', changeEventId: 'change1', items: [] }) },
    documentImpactItem: { findUnique: jest.fn(), update: jest.fn() },
  };
  const service = new DocumentImpactService(prisma as any);

  await service.createReview({
    sourceType: 'change_event',
    sourceId: 'change1',
    changeEventId: 'change1',
    title: '变更影响评审',
  } as any);

  expect(prisma.documentImpactReview.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      sourceType: 'change_event',
      sourceId: 'change1',
      changeEventId: 'change1',
    }),
  }));
});
```

- [ ] **Step 2: Add DTO field**

In `server/src/modules/document/dto/document-operations.dto.ts`, add to `ImpactReviewCreateDto`:

```ts
  @IsOptional()
  @IsString()
  changeEventId?: string;
```

- [ ] **Step 3: Set field in service**

In `server/src/modules/document/services/document-impact.service.ts`, inside `documentImpactReview.create({ data })`, add:

```ts
        changeEventId: dto.changeEventId ?? (dto.sourceType === 'change_event' ? dto.sourceId : null),
```

- [ ] **Step 4: Run test**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document-impact.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/modules/document/dto/document-operations.dto.ts server/src/modules/document/services/document-impact.service.ts server/src/modules/document/services/document-impact.service.spec.ts
git commit -m "feat: link document impact reviews to changes"
```

---

## Task 8: Client API And Detail UI

**Files:**
- Modify: `client/src/api/change-event.ts`
- Modify: `client/src/views/change-event/ChangeEventList.vue`
- Test: `client/src/views/change-event/__tests__/ChangeEventList.spec.ts`

- [ ] **Step 1: Add client API types**

In `client/src/api/change-event.ts`, add:

```ts
export interface ChangeEventRelation {
  id: string;
  targetType: string;
  targetId?: string | null;
  targetRoute?: string | null;
  targetLabel: string;
  relationType?: string | null;
  impactLevel: string;
  requiredAction?: string | null;
  status: string;
}

export interface ChangeEventFormTask {
  id: string;
  changeEventId: string;
  templateId: string;
  sourceFormCode: string;
  title: string;
  status: 'pending' | 'filled' | 'approved';
  required: boolean;
  sortOrder: number;
  template?: { id: string; code: string; name: string; status: string };
  record?: { id: string; number: string; status: string; createdAt: string } | null;
}
```

Extend `ChangeEvent`:

```ts
  relations?: ChangeEventRelation[];
  formTasks?: ChangeEventFormTask[];
```

Add API methods:

```ts
  getFormTasks(id: string) {
    return request.get<ChangeEventFormTask[]>(`/change-events/${id}/form-tasks`);
  },

  fillFormTask(taskId: string, dataJson: Record<string, unknown>) {
    return request.post<ChangeEventFormTask>(`/change-events/form-tasks/${taskId}/fill`, { dataJson });
  },
```

- [ ] **Step 2: Add UI section**

In `client/src/views/change-event/ChangeEventList.vue`, add this section in the detail dialog after basic information:

```vue
        <div class="detail-section">
          <div class="section-title">默认表单</div>
          <div v-if="!currentEvent.formTasks?.length" class="empty-hint">当前变更类型没有默认表单</div>
          <el-table v-else :data="currentEvent.formTasks" size="small" stripe>
            <el-table-column prop="sourceFormCode" label="表单编号" width="150" />
            <el-table-column prop="title" label="表单名称" min-width="180" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'filled' ? 'success' : 'warning'" effect="light" size="small">
                  {{ row.status === 'filled' ? '已填写' : '待填写' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="记录" width="140">
              <template #default="{ row }">
                <el-button v-if="row.record" link type="primary" @click="router.push(`/records/${row.record.id}`)">
                  {{ row.record.number }}
                </el-button>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
```

Make sure `router` is already defined with `const router = useRouter();`; if not, import and initialize it:

```ts
import { useRouter } from 'vue-router';
const router = useRouter();
```

- [ ] **Step 3: Add client test**

Create or update `client/src/views/change-event/__tests__/ChangeEventList.spec.ts`:

```ts
import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ChangeEventList from '../ChangeEventList.vue';
import changeEventApi from '@/api/change-event';

vi.mock('@/api/change-event', () => ({
  default: {
    getList: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    remove: vi.fn(),
  },
  getChangeTypeText: (type: string) => type,
  getStatusText: (status: string) => status,
  getStatusType: () => 'info',
}));

describe('ChangeEventList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows generated form tasks in change detail', async () => {
    vi.mocked(changeEventApi.getList).mockResolvedValue([]);
    vi.mocked(changeEventApi.getOne).mockResolvedValue({
      id: 'change1',
      company_id: '1',
      change_no: 'CE-2026-0001',
      title: '配方调整',
      change_type: 'recipe',
      description: '调整配方',
      status: 'pending',
      initiator_id: null,
      created_at: '2026-04-27T00:00:00.000Z',
      updated_at: '2026-04-27T00:00:00.000Z',
      deleted_at: null,
      formTasks: [{ id: 'task1', changeEventId: 'change1', templateId: 'tpl1', sourceFormCode: 'GRSS-KF-JL-07', title: '产品验证记录表', status: 'pending', required: true, sortOrder: 0 }],
    } as any);

    const wrapper = mount(ChangeEventList, {
      global: { stubs: ['el-card', 'el-table', 'el-table-column', 'el-dialog', 'el-button', 'el-tag', 'el-form', 'el-form-item', 'el-input', 'el-select', 'el-option', 'el-descriptions', 'el-descriptions-item', 'el-icon'] },
    });
    await flushPromises();

    await (wrapper.vm as any).openDetailDialog({ id: 'change1' });
    await flushPromises();

    expect(wrapper.text()).toContain('产品验证记录表');
    expect(wrapper.text()).toContain('GRSS-KF-JL-07');
  });
});
```

- [ ] **Step 4: Run client test**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- ChangeEventList.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add client/src/api/change-event.ts client/src/views/change-event/ChangeEventList.vue client/src/views/change-event/__tests__/ChangeEventList.spec.ts
git commit -m "feat: show change form tasks"
```

---

## Task 9: Verification And Repo Hygiene

**Files:**
- Track: `docs/raw/GRSS:PZ-JL-45监视设备台账表.xlsx`
- Track: `docs/raw/测量设备台账表.xlsx`
- Track: `docs/raw/设备台账.xlsx`
- Track: `.codex/environments/environment.toml`
- Do not track: `.env`, `server/.env`, `miniprogram/.env`, `.DS_Store`, build outputs, test reports
- Optional create: `.env.example`
- Optional create: `server/.env.example`
- Optional create: `miniprogram/.env.example`

- [ ] **Step 1: Run full targeted verification**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run build
npm test -- change-event.service.spec.ts change-event-relation.service.spec.ts change-event-form-task.service.spec.ts record.service.spec.ts document-impact.service.spec.ts --runInBand

cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- ChangeEventList.spec.ts
```

Expected: all commands PASS.

- [ ] **Step 2: Verify no retired/default-form regression**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- change-event-form-task.service.spec.ts --runInBand
```

Expected: tests prove `GRSS-KF-JL-03` and `GRSS-KF-JL-01` are not generated for generic change events.

- [ ] **Step 3: Track safe local context files**

Do not commit real `.env` files. They contain credentials and local infrastructure secrets. If the repository needs checked-in environment documentation, create examples with placeholder values instead.

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add .codex/environments/environment.toml
git add docs/raw/GRSS:PZ-JL-45监视设备台账表.xlsx docs/raw/测量设备台账表.xlsx docs/raw/设备台账.xlsx
```

- [ ] **Step 4: Confirm unsafe files are still untracked**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git status -sb
```

Expected: `.env`, `server/.env`, `miniprogram/.env`, `.DS_Store`, `client/playwright-report/`, `test-results/`, and build outputs are not staged.

- [ ] **Step 5: Commit verification and safe tracked assets if needed**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git commit -m "chore: track document governance source context"
```

Skip this commit if the project owner decides not to track `.codex/environments/environment.toml` or `docs/raw/*.xlsx`.

---

## Self-Review

**Spec coverage:** This plan covers phase-two schema, `Record` usage metadata, `ChangeEventRelation`, `ChangeEventFormTask`, default form generation, explicit exclusion of `产品更改申请表`, explicit exclusion of `产品开发评审记录`, impact-review linking, and a first UI display of generated form tasks. It intentionally leaves phase-three actionable workbench and phase-four evidence-chain visualization out of scope.

**Placeholder scan:** The plan has no `TBD`, no generic “add validation” step without concrete code, and no “write tests for the above” placeholder. Each code-changing task includes a file path, code snippet, command, and expected result.

**Type consistency:** The plan consistently uses `usageType`, `sourceType`, `sourceId`, `changeEventId`, `ChangeEventRelation`, and `ChangeEventFormTask`. The planned API paths are `/change-events/:id/form-tasks` and `/change-events/form-tasks/:taskId/fill`.

**Risk notes:** The migration references the Prisma table name for `ChangeEvent`. Before implementation, confirm the actual generated table name in the deployed database. If Prisma maps `ChangeEvent` to a quoted table name different from `"ChangeEvent"`, adjust only the migration FK references while keeping the Prisma model names unchanged.
