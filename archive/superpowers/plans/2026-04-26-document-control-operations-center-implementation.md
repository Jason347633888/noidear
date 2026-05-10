# Document Control Operations Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the phase-3 document-control operations center on top of the phase-2 document-control center, adding read requirements, training suggestions, audit coverage, impact reviews, health metrics, and audit-chain navigation.

**Architecture:** Keep `Document` as the controlled-document and reference hub, but store operational workflow data in separate focused models. Services derive read status, training needs, audit coverage, impact candidates, health counts, and audit chains from existing document references and target-module links without copying business records into the document module.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Jest, Vue 3, Element Plus, Vitest, TypeScript.

---

## Dependency Gate

Before executing this plan, verify phase 2 is complete:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
test -f docs/superpowers/plans/2026-04-26-document-control-center-implementation.md
rg -n "document_type|RecordFormLandingEntry|targetType|DocumentControlWorkbench" server/src/prisma/schema.prisma server/src/modules/document client/src/views/documents
```

Expected: matches exist for phase-2 schema fields, landing-entry model, generic reference fields, and workbench/frontend files.

If this check fails, stop and finish phase 2 first.

## File Structure

### Backend

- Modify: `server/src/prisma/schema.prisma`
  - Add `DocumentReadRequirement`, `DocumentTrainingNeed`, `DocumentImpactReview`, `DocumentImpactItem`, and `DocumentCoverageReview`.
- Create: `server/src/modules/document/dto/document-operations.dto.ts`
  - DTOs for read requirements, training needs, impact reviews, coverage queries, health queries, and audit-chain queries.
- Create: `server/src/modules/document/services/document-read-requirement.service.ts`
  - Manage read requirements and read status using existing `DocumentReadConfirmation`.
- Create: `server/src/modules/document/services/document-training-need.service.ts`
  - Generate, accept, dismiss, and link training suggestions.
- Create: `server/src/modules/document/services/document-audit-coverage.service.ts`
  - Compute document audit coverage from references and internal-audit relations.
- Create: `server/src/modules/document/services/document-impact.service.ts`
  - Generate impact reviews and impact items from references and landing entries.
- Create: `server/src/modules/document/services/document-health.service.ts`
  - Aggregate transparent health counts.
- Create: `server/src/modules/document/services/document-audit-chain.service.ts`
  - Traverse references and landing entries into expandable chains.
- Modify: `server/src/modules/document/document.controller.ts`
  - Add operations endpoints.
- Modify: `server/src/modules/document/document.module.ts`
  - Register services.
- Tests:
  - `server/src/modules/document/services/document-read-requirement.service.spec.ts`
  - `server/src/modules/document/services/document-training-need.service.spec.ts`
  - `server/src/modules/document/services/document-audit-coverage.service.spec.ts`
  - `server/src/modules/document/services/document-impact.service.spec.ts`
  - `server/src/modules/document/services/document-health.service.spec.ts`
  - `server/src/modules/document/services/document-audit-chain.service.spec.ts`

### Frontend

- Create: `client/src/api/document-operations.ts`
- Create: `client/src/views/documents/ReadConfirmationCenter.vue`
- Create: `client/src/views/documents/TrainingNeedCenter.vue`
- Create: `client/src/views/documents/AuditCoverageCenter.vue`
- Create: `client/src/views/documents/ImpactAnalysisWorkbench.vue`
- Create: `client/src/views/documents/DocumentHealthDashboard.vue`
- Create: `client/src/views/documents/AuditChainExplorer.vue`
- Modify: `client/src/router/index.ts`
- Modify: `client/src/views/Layout.vue`
- Tests:
  - `client/src/api/__tests__/document-operations.spec.ts`
  - `client/src/views/documents/__tests__/ReadConfirmationCenter.spec.ts`
  - `client/src/views/documents/__tests__/TrainingNeedCenter.spec.ts`
  - `client/src/views/documents/__tests__/DocumentHealthDashboard.spec.ts`

---

### Task 1: Add Operations Schema

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Generate migration: `server/src/prisma/migrations/<timestamp>_add_document_control_operations/migration.sql`

- [ ] **Step 1: Add `DocumentReadRequirement` model**

Add near `DocumentReadConfirmation`:

```prisma
model DocumentReadRequirement {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  scopeType  String
  scopeId    String
  requiredBy String
  requiredAt DateTime @default(now())
  dueAt      DateTime?
  reason     String?
  status     String   @default("active")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([documentId, scopeType, scopeId, status])
  @@index([documentId])
  @@index([scopeType, scopeId])
  @@index([status])
  @@map("document_read_requirements")
}
```

- [ ] **Step 2: Add training and impact models**

Add:

```prisma
model DocumentTrainingNeed {
  id                    String   @id @default(cuid())
  documentId             String
  document               Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  triggerType            String
  targetDepartment       String?
  targetRole             String?
  reason                 String
  status                 String   @default("suggested")
  linkedTrainingProjectId String?
  dismissedReason        String?
  createdBy              String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@index([documentId])
  @@index([status])
  @@index([targetDepartment])
  @@map("document_training_needs")
}

model DocumentImpactReview {
  id         String   @id @default(cuid())
  sourceType String
  sourceId   String
  title      String
  status     String   @default("draft")
  summary    String?
  reviewedBy String?
  reviewedAt DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  items      DocumentImpactItem[]

  @@index([sourceType, sourceId])
  @@index([status])
  @@map("document_impact_reviews")
}

model DocumentImpactItem {
  id              String   @id @default(cuid())
  reviewId        String
  review          DocumentImpactReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  targetType      String
  targetId        String?
  targetRoute     String?
  targetLabel     String
  relationType    String?
  impactLevel     String   @default("medium")
  suggestedAction String?
  status          String   @default("open")
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([reviewId])
  @@index([targetType, targetId])
  @@index([status])
  @@map("document_impact_items")
}
```

- [ ] **Step 3: Add coverage review model**

Add:

```prisma
model DocumentCoverageReview {
  id                 String   @id @default(cuid())
  periodStart        DateTime
  periodEnd          DateTime
  documentId         String
  document           Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  coverageStatus     String
  auditPlanId        String?
  findingId          String?
  correctiveActionId String?
  reviewedBy         String?
  reviewedAt         DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([documentId])
  @@index([periodStart, periodEnd])
  @@index([coverageStatus])
  @@map("document_coverage_reviews")
}
```

- [ ] **Step 4: Add reverse relations to `Document`**

Inside `model Document`, add:

```prisma
  readRequirements DocumentReadRequirement[]
  trainingNeeds    DocumentTrainingNeed[]
  coverageReviews  DocumentCoverageReview[]
```

- [ ] **Step 5: Create migration and generate client**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm run prisma:migrate -- --name add_document_control_operations
npm run prisma:generate
```

Expected: migration created and Prisma client generated. If local DB is unavailable, run:

```bash
npx prisma validate --schema=src/prisma/schema.prisma
```

Expected: schema is valid.

- [ ] **Step 6: Commit schema**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add server/src/prisma/schema.prisma server/src/prisma/migrations
git commit -m "feat: add document operations schema"
```

Expected: commit includes only schema and migration files.

---

### Task 2: Add Operations DTOs

**Files:**
- Create: `server/src/modules/document/dto/document-operations.dto.ts`
- Modify: `server/src/modules/document/dto/index.ts`

- [ ] **Step 1: Create DTO file**

Create `server/src/modules/document/dto/document-operations.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateReadRequirementDto {
  @IsIn(['department', 'role', 'user'])
  scopeType!: string;

  @IsString()
  scopeId!: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class TrainingNeedActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedTrainingProjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ImpactReviewCreateDto {
  @IsIn(['document', 'external_file', 'change_event', 'corrective_action', 'recall', 'traceability'])
  sourceType!: string;

  @IsString()
  sourceId!: string;

  @IsString()
  title!: string;
}

export class ImpactItemUpdateDto {
  @IsOptional()
  @IsIn(['open', 'accepted', 'dismissed', 'done'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CoverageQueryDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}

export class OperationsDaysQueryDto {
  @IsOptional()
  @Type(() => Number)
  days?: number = 30;
}

export class AuditChainQueryDto {
  @IsString()
  sourceType!: string;

  @IsString()
  sourceId!: string;

  @IsOptional()
  @Type(() => Number)
  maxDepth?: number = 4;
}
```

- [ ] **Step 2: Export DTOs**

Update `server/src/modules/document/dto/index.ts`:

```ts
export * from './document-operations.dto';
```

- [ ] **Step 3: Commit DTOs**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add server/src/modules/document/dto/document-operations.dto.ts server/src/modules/document/dto/index.ts
git commit -m "feat: add document operations dtos"
```

Expected: commit contains DTO exports only.

---

### Task 3: Implement Read Requirement Service

**Files:**
- Create: `server/src/modules/document/services/document-read-requirement.service.ts`
- Test: `server/src/modules/document/services/document-read-requirement.service.spec.ts`

- [ ] **Step 1: Create service**

Create `server/src/modules/document/services/document-read-requirement.service.ts`:

```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateReadRequirementDto } from '../dto/document-operations.dto';

@Injectable()
export class DocumentReadRequirementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(documentId: string, dto: CreateReadRequirementDto, requiredBy: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId, deletedAt: null } });
    if (!document) throw new NotFoundException('文件不存在');
    if (!['department', 'role', 'user'].includes(dto.scopeType)) {
      throw new BadRequestException('Unsupported read requirement scopeType');
    }

    const existing = await this.prisma.documentReadRequirement.findFirst({
      where: { documentId, scopeType: dto.scopeType, scopeId: dto.scopeId, status: 'active' },
    });
    if (existing) throw new ConflictException('Active read requirement already exists');

    return this.prisma.documentReadRequirement.create({
      data: {
        documentId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        requiredBy,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        reason: dto.reason,
      },
    });
  }

  async getStatus(documentId: string) {
    const requirements = await this.prisma.documentReadRequirement.findMany({
      where: { documentId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    const confirmations = await this.prisma.documentReadConfirmation.findMany({
      where: { document_id: documentId },
    });
    const confirmedUserIds = new Set(confirmations.map((item: any) => item.user_id));
    const now = new Date();

    return requirements.map((requirement: any) => {
      const directlyConfirmed = requirement.scopeType === 'user' && confirmedUserIds.has(requirement.scopeId);
      const overdue = Boolean(requirement.dueAt && new Date(requirement.dueAt) < now && !directlyConfirmed);
      return {
        ...requirement,
        confirmed: directlyConfirmed,
        overdue,
      };
    });
  }
}
```

- [ ] **Step 2: Add tests**

Create `server/src/modules/document/services/document-read-requirement.service.spec.ts`:

```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentReadRequirementService } from './document-read-requirement.service';

describe('DocumentReadRequirementService', () => {
  const prisma = {
    document: { findUnique: jest.fn() },
    documentReadRequirement: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    documentReadConfirmation: { findMany: jest.fn() },
  };
  let service: DocumentReadRequirementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentReadRequirementService(prisma as any);
  });

  it('creates an active read requirement', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
    prisma.documentReadRequirement.findFirst.mockResolvedValue(null);
    prisma.documentReadRequirement.create.mockResolvedValue({ id: 'req1' });
    const result = await service.create('doc1', { scopeType: 'user', scopeId: 'u1' }, 'admin');
    expect(result.id).toBe('req1');
  });

  it('rejects missing document', async () => {
    prisma.document.findUnique.mockResolvedValue(null);
    await expect(service.create('bad', { scopeType: 'user', scopeId: 'u1' }, 'admin')).rejects.toThrow(NotFoundException);
  });

  it('rejects duplicate active requirement', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
    prisma.documentReadRequirement.findFirst.mockResolvedValue({ id: 'req1' });
    await expect(service.create('doc1', { scopeType: 'user', scopeId: 'u1' }, 'admin')).rejects.toThrow(ConflictException);
  });

  it('marks direct user confirmation as confirmed', async () => {
    prisma.documentReadRequirement.findMany.mockResolvedValue([{ id: 'req1', scopeType: 'user', scopeId: 'u1' }]);
    prisma.documentReadConfirmation.findMany.mockResolvedValue([{ user_id: 'u1' }]);
    const result = await service.getStatus('doc1');
    expect(result[0].confirmed).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm test -- document-read-requirement.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 4: Commit service**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add server/src/modules/document/services/document-read-requirement.service.ts server/src/modules/document/services/document-read-requirement.service.spec.ts
git commit -m "feat: add document read requirements"
```

Expected: commit contains read requirement service and test.

---

### Task 4: Implement Training Need Service

**Files:**
- Create: `server/src/modules/document/services/document-training-need.service.ts`
- Test: `server/src/modules/document/services/document-training-need.service.spec.ts`

- [ ] **Step 1: Create service**

Create `server/src/modules/document/services/document-training-need.service.ts`:

```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DocumentTrainingNeedService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestForDocument(documentId: string, actorId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId, deletedAt: null } });
    if (!document) throw new NotFoundException('文件不存在');

    const targetDepartment = (document as any).owner_department ?? null;
    const existing = await this.prisma.documentTrainingNeed.findFirst({
      where: { documentId, targetDepartment, status: { in: ['suggested', 'accepted', 'linked'] } },
    });
    if (existing) return existing;

    return this.prisma.documentTrainingNeed.create({
      data: {
        documentId,
        triggerType: document.status === 'effective' ? 'revised_document' : 'manual',
        targetDepartment,
        reason: `文件 ${document.title} 已发布或变更，需要评估培训需求`,
        createdBy: actorId,
      },
    });
  }

  async list(status?: string) {
    return this.prisma.documentTrainingNeed.findMany({
      where: status ? { status } : {},
      include: { document: { select: { id: true, title: true, number: true, status: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async accept(id: string) {
    const need = await this.prisma.documentTrainingNeed.findUnique({ where: { id } });
    if (!need) throw new NotFoundException('培训需求不存在');
    if (need.status === 'dismissed') throw new ConflictException('已驳回的培训需求不能接受');
    return this.prisma.documentTrainingNeed.update({ where: { id }, data: { status: 'accepted' } });
  }

  async dismiss(id: string, reason?: string) {
    if (!reason) throw new BadRequestException('dismiss reason is required');
    return this.prisma.documentTrainingNeed.update({
      where: { id },
      data: { status: 'dismissed', dismissedReason: reason },
    });
  }

  async link(id: string, linkedTrainingProjectId?: string) {
    if (!linkedTrainingProjectId) throw new BadRequestException('linkedTrainingProjectId is required');
    return this.prisma.documentTrainingNeed.update({
      where: { id },
      data: { status: 'linked', linkedTrainingProjectId },
    });
  }
}
```

- [ ] **Step 2: Add tests**

Create `server/src/modules/document/services/document-training-need.service.spec.ts`:

```ts
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DocumentTrainingNeedService } from './document-training-need.service';

describe('DocumentTrainingNeedService', () => {
  const prisma = {
    document: { findUnique: jest.fn() },
    documentTrainingNeed: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
  let service: DocumentTrainingNeedService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentTrainingNeedService(prisma as any);
  });

  it('deduplicates suggestions by document and department', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1', title: 'SOP', status: 'effective', owner_department: '品质部' });
    prisma.documentTrainingNeed.findFirst.mockResolvedValue({ id: 'need1' });
    const result = await service.suggestForDocument('doc1', 'admin');
    expect(result.id).toBe('need1');
    expect(prisma.documentTrainingNeed.create).not.toHaveBeenCalled();
  });

  it('creates a new suggestion', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1', title: 'SOP', status: 'effective', owner_department: '品质部' });
    prisma.documentTrainingNeed.findFirst.mockResolvedValue(null);
    prisma.documentTrainingNeed.create.mockResolvedValue({ id: 'need1' });
    const result = await service.suggestForDocument('doc1', 'admin');
    expect(result.id).toBe('need1');
  });

  it('rejects accepting dismissed need', async () => {
    prisma.documentTrainingNeed.findUnique.mockResolvedValue({ id: 'need1', status: 'dismissed' });
    await expect(service.accept('need1')).rejects.toThrow(ConflictException);
  });

  it('requires reason when dismissing', async () => {
    await expect(service.dismiss('need1')).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 3: Run tests and commit**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm test -- document-training-need.service.spec.ts --runInBand
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add server/src/modules/document/services/document-training-need.service.ts server/src/modules/document/services/document-training-need.service.spec.ts
git commit -m "feat: add document training needs"
```

Expected: tests pass and commit is created.

---

### Task 5: Implement Impact, Coverage, Health, And Audit Chain Services

**Files:**
- Create: `server/src/modules/document/services/document-impact.service.ts`
- Create: `server/src/modules/document/services/document-audit-coverage.service.ts`
- Create: `server/src/modules/document/services/document-health.service.ts`
- Create: `server/src/modules/document/services/document-audit-chain.service.ts`
- Tests for each service.

- [ ] **Step 1: Create impact service**

Create `server/src/modules/document/services/document-impact.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ImpactReviewCreateDto, ImpactItemUpdateDto } from '../dto/document-operations.dto';

@Injectable()
export class DocumentImpactService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(dto: ImpactReviewCreateDto) {
    const references = dto.sourceType === 'document'
      ? await this.prisma.documentReference.findMany({ where: { sourceDocId: dto.sourceId } })
      : [];
    const landingEntries = dto.sourceType === 'document'
      ? await this.prisma.recordFormLandingEntry.findMany({ where: { relatedDocIds: { has: dto.sourceId } } })
      : [];

    return this.prisma.documentImpactReview.create({
      data: {
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        title: dto.title,
        items: {
          create: [
            ...references.map((ref: any) => ({
              targetType: ref.targetType,
              targetId: ref.targetId ?? ref.targetDocId,
              targetRoute: ref.targetRoute,
              targetLabel: ref.targetLabel ?? ref.targetId ?? ref.targetRoute ?? '未命名影响项',
              relationType: ref.relationType,
              impactLevel: 'medium',
              suggestedAction: 'Review linked target for impact',
            })),
            ...landingEntries.map((entry: any) => ({
              targetType: 'record_form_landing',
              targetId: entry.sourceCode,
              targetRoute: entry.targetRoute,
              targetLabel: entry.sourceCode,
              relationType: 'REQUIRES_RECORD',
              impactLevel: entry.targetRoute ? 'medium' : 'high',
              suggestedAction: entry.targetRoute ? 'Review record form entrance' : 'Complete missing target route',
            })),
          ],
        },
      },
      include: { items: true },
    });
  }

  async updateItem(id: string, dto: ImpactItemUpdateDto) {
    const item = await this.prisma.documentImpactItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('影响项不存在');
    return this.prisma.documentImpactItem.update({ where: { id }, data: dto });
  }
}
```

- [ ] **Step 2: Create audit coverage service**

Create `server/src/modules/document/services/document-audit-coverage.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DocumentAuditCoverageService {
  constructor(private readonly prisma: PrismaService) {}

  async getCoverage(periodStart: Date, periodEnd: Date) {
    const documents = await this.prisma.document.findMany({
      where: { deletedAt: null, status: 'effective', document_type: { in: ['PROCEDURE', 'WORK_INSTRUCTION'] } },
    });
    const reviews = await this.prisma.documentCoverageReview.findMany({
      where: { periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } },
    });
    const reviewMap = new Map(reviews.map((review: any) => [review.documentId, review]));

    return documents.map((document: any) => ({
      document,
      coverageStatus: reviewMap.get(document.id)?.coverageStatus ?? 'gap',
      review: reviewMap.get(document.id) ?? null,
    }));
  }
}
```

- [ ] **Step 3: Create health service**

Create `server/src/modules/document/services/document-health.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DocumentHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(days = 30) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    const [
      missingOwnerOrReview,
      overdueReview,
      expiredExternal,
      overdueReadRequirements,
      openTrainingNeeds,
      openImpactItems,
    ] = await Promise.all([
      this.prisma.document.count({ where: { deletedAt: null, OR: [{ owner_department: null }, { review_due_date: null }] } }),
      this.prisma.document.count({ where: { deletedAt: null, status: 'effective', review_due_date: { lt: new Date() } } }),
      this.prisma.document.count({ where: { deletedAt: null, document_type: 'EXTERNAL_FILE', external_expires_at: { lte: deadline } } }),
      this.prisma.documentReadRequirement.count({ where: { status: 'active', dueAt: { lt: new Date() } } }),
      this.prisma.documentTrainingNeed.count({ where: { status: { in: ['suggested', 'accepted'] } } }),
      this.prisma.documentImpactItem.count({ where: { status: 'open' } }),
    ]);

    return {
      missingOwnerOrReview,
      overdueReview,
      expiredExternal,
      overdueReadRequirements,
      openTrainingNeeds,
      openImpactItems,
    };
  }
}
```

- [ ] **Step 4: Create audit-chain service**

Create `server/src/modules/document/services/document-audit-chain.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DocumentAuditChainService {
  constructor(private readonly prisma: PrismaService) {}

  async getChain(sourceType: string, sourceId: string, maxDepth = 4) {
    if (sourceType !== 'document') {
      return { sourceType, sourceId, nodes: [], edges: [] };
    }

    const nodes: Array<Record<string, unknown>> = [];
    const edges: Array<Record<string, unknown>> = [];
    const visited = new Set<string>();

    const walk = async (docId: string, depth: number) => {
      if (depth > maxDepth || visited.has(docId)) return;
      visited.add(docId);
      const doc = await this.prisma.document.findUnique({ where: { id: docId } });
      if (!doc) return;
      nodes.push({ type: 'document', id: doc.id, label: doc.title, depth });
      const refs = await this.prisma.documentReference.findMany({ where: { sourceDocId: docId } });
      for (const ref of refs as any[]) {
        const targetId = ref.targetDocId ?? ref.targetId ?? ref.targetRoute;
        edges.push({ from: docId, to: targetId, relationType: ref.relationType });
        if (ref.targetType === 'document' && ref.targetDocId) {
          await walk(ref.targetDocId, depth + 1);
        } else {
          nodes.push({ type: ref.targetType, id: targetId, label: ref.targetLabel ?? targetId, depth: depth + 1 });
        }
      }
    };

    await walk(sourceId, 0);
    return { sourceType, sourceId, nodes, edges };
  }
}
```

- [ ] **Step 5: Add impact service test**

Create `server/src/modules/document/services/document-impact.service.spec.ts`:

```ts
import { DocumentImpactService } from './document-impact.service';

describe('DocumentImpactService', () => {
  it('creates impact items from document references and landing entries', async () => {
    const prisma = {
      documentReference: {
        findMany: jest.fn().mockResolvedValue([
          {
            targetType: 'business_module',
            targetId: 'process',
            targetRoute: '/process',
            targetLabel: '研发流程',
            relationType: 'REQUIRES_RECORD',
          },
        ]),
      },
      recordFormLandingEntry: {
        findMany: jest.fn().mockResolvedValue([
          { sourceCode: 'GRSS-KF-JL-01', targetRoute: '/process' },
        ]),
      },
      documentImpactReview: {
        create: jest.fn().mockResolvedValue({ id: 'review1', items: [{ id: 'item1' }, { id: 'item2' }] }),
      },
      documentImpactItem: { findUnique: jest.fn(), update: jest.fn() },
    };
    const service = new DocumentImpactService(prisma as any);
    const result = await service.createReview({ sourceType: 'document', sourceId: 'doc1', title: 'CX-11影响评估' });
    expect(result.items).toHaveLength(2);
    expect(prisma.documentImpactReview.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceType: 'document',
        sourceId: 'doc1',
        items: expect.objectContaining({ create: expect.any(Array) }),
      }),
    }));
  });
});
```

- [ ] **Step 6: Add audit coverage service test**

Create `server/src/modules/document/services/document-audit-coverage.service.spec.ts`:

```ts
import { DocumentAuditCoverageService } from './document-audit-coverage.service';

describe('DocumentAuditCoverageService', () => {
  it('marks effective procedure without review as coverage gap', async () => {
    const prisma = {
      document: {
        findMany: jest.fn().mockResolvedValue([{ id: 'doc1', title: 'CX-11', document_type: 'PROCEDURE' }]),
      },
      documentCoverageReview: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new DocumentAuditCoverageService(prisma as any);
    const result = await service.getCoverage(new Date('2026-01-01'), new Date('2026-12-31'));
    expect(result).toHaveLength(1);
    expect(result[0].coverageStatus).toBe('gap');
  });
});
```

- [ ] **Step 7: Add health service test**

Create `server/src/modules/document/services/document-health.service.spec.ts`:

```ts
import { DocumentHealthService } from './document-health.service';

describe('DocumentHealthService', () => {
  it('returns transparent health counts', async () => {
    const prisma = {
      document: { count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3) },
      documentReadRequirement: { count: jest.fn().mockResolvedValue(4) },
      documentTrainingNeed: { count: jest.fn().mockResolvedValue(5) },
      documentImpactItem: { count: jest.fn().mockResolvedValue(6) },
    };
    const service = new DocumentHealthService(prisma as any);
    const result = await service.getHealth(30);
    expect(result).toEqual(expect.objectContaining({
      missingOwnerOrReview: 1,
      overdueReview: 2,
      expiredExternal: 3,
      overdueReadRequirements: 4,
      openTrainingNeeds: 5,
      openImpactItems: 6,
    }));
  });
});
```

- [ ] **Step 8: Add audit chain service test**

Create `server/src/modules/document/services/document-audit-chain.service.spec.ts`:

```ts
import { DocumentAuditChainService } from './document-audit-chain.service';

describe('DocumentAuditChainService', () => {
  it('creates nodes and edges from document references', async () => {
    const prisma = {
      document: {
        findUnique: jest.fn().mockResolvedValueOnce({ id: 'doc1', title: 'CX-11' }),
      },
      documentReference: {
        findMany: jest.fn().mockResolvedValueOnce([
          {
            targetType: 'business_module',
            targetId: 'traceability',
            targetRoute: '/traceability',
            targetLabel: '追溯查询',
            relationType: 'EVIDENCE_FOR',
          },
        ]),
      },
    };
    const service = new DocumentAuditChainService(prisma as any);
    const result = await service.getChain('document', 'doc1', 4);
    expect(result.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'document', id: 'doc1' }),
      expect.objectContaining({ type: 'business_module', label: '追溯查询' }),
    ]));
    expect(result.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'doc1', relationType: 'EVIDENCE_FOR' }),
    ]));
  });
});
```

- [ ] **Step 9: Run tests and commit**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm test -- document-impact.service.spec.ts document-audit-coverage.service.spec.ts document-health.service.spec.ts document-audit-chain.service.spec.ts --runInBand
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add server/src/modules/document/services/document-impact.service.ts server/src/modules/document/services/document-audit-coverage.service.ts server/src/modules/document/services/document-health.service.ts server/src/modules/document/services/document-audit-chain.service.ts server/src/modules/document/services/*impact*.spec.ts server/src/modules/document/services/*coverage*.spec.ts server/src/modules/document/services/*health*.spec.ts server/src/modules/document/services/*chain*.spec.ts
git commit -m "feat: add document operations analysis services"
```

Expected: tests pass and commit is created.

---

### Task 6: Add Operations Controller Endpoints

**Files:**
- Modify: `server/src/modules/document/document.module.ts`
- Modify: `server/src/modules/document/document.controller.ts`

- [ ] **Step 1: Register operation services**

In `document.module.ts`, import and add these services to providers and exports:

```ts
DocumentReadRequirementService,
DocumentTrainingNeedService,
DocumentAuditCoverageService,
DocumentImpactService,
DocumentHealthService,
DocumentAuditChainService,
```

- [ ] **Step 2: Inject services in controller**

Add constructor dependencies:

```ts
private readonly readRequirementService: DocumentReadRequirementService,
private readonly trainingNeedService: DocumentTrainingNeedService,
private readonly auditCoverageService: DocumentAuditCoverageService,
private readonly impactService: DocumentImpactService,
private readonly healthService: DocumentHealthService,
private readonly auditChainService: DocumentAuditChainService,
```

- [ ] **Step 3: Add endpoints before `@Get(':id')`**

Add:

```ts
@Post(':id/read-requirements')
createReadRequirement(@Param('id') id: string, @Body() dto: CreateReadRequirementDto, @Req() req: any) {
  return this.readRequirementService.create(id, dto, req.user.id);
}

@Get(':id/read-status')
getReadStatus(@Param('id') id: string) {
  return this.readRequirementService.getStatus(id);
}

@Get('control/training-needs')
listTrainingNeeds(@Query('status') status?: string) {
  return this.trainingNeedService.list(status);
}

@Post(':id/training-needs/suggest')
suggestTrainingNeed(@Param('id') id: string, @Req() req: any) {
  return this.trainingNeedService.suggestForDocument(id, req.user.id);
}

@Post('control/training-needs/:id/accept')
acceptTrainingNeed(@Param('id') id: string) {
  return this.trainingNeedService.accept(id);
}

@Post('control/training-needs/:id/dismiss')
dismissTrainingNeed(@Param('id') id: string, @Body() dto: TrainingNeedActionDto) {
  return this.trainingNeedService.dismiss(id, dto.reason);
}

@Post('control/training-needs/:id/link')
linkTrainingNeed(@Param('id') id: string, @Body() dto: TrainingNeedActionDto) {
  return this.trainingNeedService.link(id, dto.linkedTrainingProjectId);
}

@Get('control/audit-coverage')
getAuditCoverage(@Query() dto: CoverageQueryDto) {
  return this.auditCoverageService.getCoverage(new Date(dto.periodStart), new Date(dto.periodEnd));
}

@Post('control/impact-reviews')
createImpactReview(@Body() dto: ImpactReviewCreateDto) {
  return this.impactService.createReview(dto);
}

@Patch('control/impact-items/:id')
updateImpactItem(@Param('id') id: string, @Body() dto: ImpactItemUpdateDto) {
  return this.impactService.updateItem(id, dto);
}

@Get('control/health')
getHealth(@Query('days') days?: string) {
  return this.healthService.getHealth(days ? parseInt(days, 10) : 30);
}

@Get('control/audit-chain')
getAuditChain(@Query() dto: AuditChainQueryDto) {
  return this.auditChainService.getChain(dto.sourceType, dto.sourceId, dto.maxDepth ?? 4);
}
```

- [ ] **Step 4: Run build and commit**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm run build
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add server/src/modules/document/document.module.ts server/src/modules/document/document.controller.ts
git commit -m "feat: expose document operations endpoints"
```

Expected: build exits 0 and commit is created.

---

### Task 7: Add Frontend Operations API And Pages

**Files:**
- Create: `client/src/api/document-operations.ts`
- Create: `client/src/views/documents/ReadConfirmationCenter.vue`
- Create: `client/src/views/documents/TrainingNeedCenter.vue`
- Create: `client/src/views/documents/DocumentHealthDashboard.vue`
- Test: `client/src/api/__tests__/document-operations.spec.ts`

- [ ] **Step 1: Create frontend API**

Create `client/src/api/document-operations.ts`:

```ts
import request from './request';

export const documentOperationsApi = {
  getReadStatus(documentId: string) {
    return request.get(`/documents/${documentId}/read-status`);
  },
  createReadRequirement(documentId: string, payload: Record<string, unknown>) {
    return request.post(`/documents/${documentId}/read-requirements`, payload);
  },
  listTrainingNeeds(status?: string) {
    return request.get('/documents/control/training-needs', { params: { status } });
  },
  suggestTrainingNeed(documentId: string) {
    return request.post(`/documents/${documentId}/training-needs/suggest`);
  },
  acceptTrainingNeed(id: string) {
    return request.post(`/documents/control/training-needs/${id}/accept`);
  },
  dismissTrainingNeed(id: string, reason: string) {
    return request.post(`/documents/control/training-needs/${id}/dismiss`, { reason });
  },
  linkTrainingNeed(id: string, linkedTrainingProjectId: string) {
    return request.post(`/documents/control/training-needs/${id}/link`, { linkedTrainingProjectId });
  },
  getAuditCoverage(params: { periodStart: string; periodEnd: string }) {
    return request.get('/documents/control/audit-coverage', { params });
  },
  createImpactReview(payload: Record<string, unknown>) {
    return request.post('/documents/control/impact-reviews', payload);
  },
  updateImpactItem(id: string, payload: Record<string, unknown>) {
    return request.patch(`/documents/control/impact-items/${id}`, payload);
  },
  getHealth(days = 30) {
    return request.get('/documents/control/health', { params: { days } });
  },
  getAuditChain(params: { sourceType: string; sourceId: string; maxDepth?: number }) {
    return request.get('/documents/control/audit-chain', { params });
  },
};
```

- [ ] **Step 2: Add API test**

Create `client/src/api/__tests__/document-operations.spec.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('../request', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

import { documentOperationsApi } from '../document-operations';

describe('documentOperationsApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads health metrics', () => {
    documentOperationsApi.getHealth(30);
    expect(mockGet).toHaveBeenCalledWith('/documents/control/health', { params: { days: 30 } });
  });

  it('dismisses training need with reason', () => {
    documentOperationsApi.dismissTrainingNeed('need1', 'not applicable');
    expect(mockPost).toHaveBeenCalledWith('/documents/control/training-needs/need1/dismiss', { reason: 'not applicable' });
  });
});
```

- [ ] **Step 3: Create minimal health dashboard**

Create `client/src/views/documents/DocumentHealthDashboard.vue`:

```vue
<template>
  <div class="document-health-dashboard">
    <el-card v-for="item in items" :key="item.key">
      <template #header>{{ item.label }}</template>
      <strong>{{ health?.[item.key] ?? 0 }}</strong>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const health = ref<Record<string, number> | null>(null);
const items = [
  { key: 'missingOwnerOrReview', label: '缺少负责人或复审日期' },
  { key: 'overdueReview', label: '复审逾期' },
  { key: 'expiredExternal', label: '外来文件即将/已经到期' },
  { key: 'overdueReadRequirements', label: '阅读确认逾期' },
  { key: 'openTrainingNeeds', label: '培训需求待处理' },
  { key: 'openImpactItems', label: '影响项待处理' },
];

const load = async () => {
  try {
    health.value = await documentOperationsApi.getHealth(30) as Record<string, number>;
  } catch {
    ElMessage.error('获取文控健康度失败');
  }
};

onMounted(load);
</script>

<style scoped>
.document-health-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
strong {
  font-size: 28px;
}
</style>
```

- [ ] **Step 4: Create read confirmation page**

Create `client/src/views/documents/ReadConfirmationCenter.vue`:

```vue
<template>
  <div class="read-confirmation-center">
    <div class="toolbar">
      <el-input v-model="documentId" placeholder="输入文档ID查看阅读状态" clearable />
      <el-button type="primary" @click="load">查询</el-button>
    </div>
    <el-table :data="rows" v-loading="loading" stripe>
      <el-table-column prop="scopeType" label="范围类型" width="120" />
      <el-table-column prop="scopeId" label="范围对象" width="180" />
      <el-table-column prop="dueAt" label="截止时间" width="180" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.confirmed ? 'success' : row.overdue ? 'danger' : 'warning'">
            {{ row.confirmed ? '已确认' : row.overdue ? '逾期' : '待确认' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="220" show-overflow-tooltip />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const documentId = ref('');
const rows = ref<any[]>([]);
const loading = ref(false);

const load = async () => {
  if (!documentId.value) {
    ElMessage.error('请输入文档ID');
    return;
  }
  loading.value = true;
  try {
    rows.value = await documentOperationsApi.getReadStatus(documentId.value) as any[];
  } catch {
    ElMessage.error('获取阅读确认状态失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
```

- [ ] **Step 5: Create training need page**

Create `client/src/views/documents/TrainingNeedCenter.vue`:

```vue
<template>
  <div class="training-need-center">
    <div class="toolbar">
      <el-select v-model="status" clearable placeholder="状态" @change="load">
        <el-option value="suggested" label="待评估" />
        <el-option value="accepted" label="已接受" />
        <el-option value="dismissed" label="已驳回" />
        <el-option value="linked" label="已关联培训" />
      </el-select>
      <el-button type="primary" @click="load">刷新</el-button>
    </div>
    <el-table :data="rows" v-loading="loading" stripe>
      <el-table-column prop="document.title" label="文件" min-width="220" show-overflow-tooltip />
      <el-table-column prop="targetDepartment" label="目标部门" width="140" />
      <el-table-column prop="status" label="状态" width="110" />
      <el-table-column prop="reason" label="原因" min-width="260" show-overflow-tooltip />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button link type="primary" @click="accept(row.id)">接受</el-button>
          <el-button link type="danger" @click="dismiss(row.id)">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const status = ref('');
const rows = ref<any[]>([]);
const loading = ref(false);

const load = async () => {
  loading.value = true;
  try {
    rows.value = await documentOperationsApi.listTrainingNeeds(status.value || undefined) as any[];
  } catch {
    ElMessage.error('获取培训需求失败');
  } finally {
    loading.value = false;
  }
};

const accept = async (id: string) => {
  await documentOperationsApi.acceptTrainingNeed(id);
  await load();
};

const dismiss = async (id: string) => {
  await documentOperationsApi.dismissTrainingNeed(id, '当前不适用');
  await load();
};

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
```

- [ ] **Step 6: Create audit coverage page**

Create `client/src/views/documents/AuditCoverageCenter.vue`:

```vue
<template>
  <div class="audit-coverage-center">
    <div class="toolbar">
      <el-date-picker v-model="period" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" />
      <el-button type="primary" @click="load">查询</el-button>
    </div>
    <el-table :data="rows" v-loading="loading" stripe>
      <el-table-column prop="document.number" label="编号" width="160" />
      <el-table-column prop="document.title" label="文件" min-width="240" />
      <el-table-column prop="coverageStatus" label="覆盖状态" width="140" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const period = ref<[Date, Date] | null>(null);
const rows = ref<any[]>([]);
const loading = ref(false);

const load = async () => {
  if (!period.value) {
    ElMessage.error('请选择审核周期');
    return;
  }
  loading.value = true;
  try {
    rows.value = await documentOperationsApi.getAuditCoverage({
      periodStart: period.value[0].toISOString(),
      periodEnd: period.value[1].toISOString(),
    }) as any[];
  } catch {
    ElMessage.error('获取审核覆盖失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
```

- [ ] **Step 7: Create impact and audit-chain pages**

Create `client/src/views/documents/ImpactAnalysisWorkbench.vue`:

```vue
<template>
  <div class="impact-analysis-workbench">
    <div class="toolbar">
      <el-select v-model="sourceType" placeholder="来源类型">
        <el-option value="document" label="文件" />
        <el-option value="external_file" label="外来文件" />
        <el-option value="change_event" label="变更" />
        <el-option value="corrective_action" label="CAPA" />
        <el-option value="recall" label="召回" />
        <el-option value="traceability" label="追溯" />
      </el-select>
      <el-input v-model="sourceId" placeholder="来源ID" />
      <el-input v-model="title" placeholder="评估标题" />
      <el-button type="primary" @click="createReview">生成影响评估</el-button>
    </div>
    <el-table :data="review?.items || []" v-loading="loading" stripe>
      <el-table-column prop="targetType" label="目标类型" width="150" />
      <el-table-column prop="targetLabel" label="目标" min-width="220" />
      <el-table-column prop="impactLevel" label="影响等级" width="120" />
      <el-table-column prop="suggestedAction" label="建议动作" min-width="240" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const sourceType = ref('document');
const sourceId = ref('');
const title = ref('');
const review = ref<any | null>(null);
const loading = ref(false);

const createReview = async () => {
  if (!sourceId.value || !title.value) {
    ElMessage.error('请输入来源ID和标题');
    return;
  }
  loading.value = true;
  try {
    review.value = await documentOperationsApi.createImpactReview({
      sourceType: sourceType.value,
      sourceId: sourceId.value,
      title: title.value,
    });
  } catch {
    ElMessage.error('生成影响评估失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: 160px 1fr 1fr auto;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
```

Create `client/src/views/documents/AuditChainExplorer.vue`:

```vue
<template>
  <div class="audit-chain-explorer">
    <div class="toolbar">
      <el-select v-model="sourceType" placeholder="来源类型">
        <el-option value="document" label="文件" />
      </el-select>
      <el-input v-model="sourceId" placeholder="来源ID" />
      <el-button type="primary" @click="load">查看链路</el-button>
    </div>
    <el-card>
      <template #header>链路节点</template>
      <el-table :data="chain?.nodes || []" v-loading="loading" stripe>
        <el-table-column prop="type" label="类型" width="140" />
        <el-table-column prop="label" label="节点" min-width="240" />
        <el-table-column prop="depth" label="层级" width="100" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const sourceType = ref('document');
const sourceId = ref('');
const chain = ref<any | null>(null);
const loading = ref(false);

const load = async () => {
  if (!sourceId.value) {
    ElMessage.error('请输入来源ID');
    return;
  }
  loading.value = true;
  try {
    chain.value = await documentOperationsApi.getAuditChain({
      sourceType: sourceType.value,
      sourceId: sourceId.value,
      maxDepth: 4,
    });
  } catch {
    ElMessage.error('获取审核链路失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: 160px minmax(260px, 1fr) auto;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
```

- [ ] **Step 8: Run tests and commit**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/client
npm test -- src/api/__tests__/document-operations.spec.ts
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add client/src/api/document-operations.ts client/src/api/__tests__/document-operations.spec.ts client/src/views/documents/ReadConfirmationCenter.vue client/src/views/documents/TrainingNeedCenter.vue client/src/views/documents/AuditCoverageCenter.vue client/src/views/documents/ImpactAnalysisWorkbench.vue client/src/views/documents/DocumentHealthDashboard.vue client/src/views/documents/AuditChainExplorer.vue
git commit -m "feat: add document operations frontend"
```

Expected: API test passes and commit is created.

---

### Task 8: Wire Routes, Menu, And Final Verification

**Files:**
- Modify: `client/src/router/index.ts`
- Modify: `client/src/views/Layout.vue`
- Optional docs update: `docs/PROJECT_STRUCTURE.md`

- [ ] **Step 1: Add routes**

Add:

```ts
{
  path: 'documents/operations/read-confirmations',
  name: 'ReadConfirmationCenter',
  component: () => import('@/views/documents/ReadConfirmationCenter.vue'),
  meta: { title: '阅读确认' },
},
{
  path: 'documents/operations/training-needs',
  name: 'TrainingNeedCenter',
  component: () => import('@/views/documents/TrainingNeedCenter.vue'),
  meta: { title: '培训需求' },
},
{
  path: 'documents/operations/health',
  name: 'DocumentHealthDashboard',
  component: () => import('@/views/documents/DocumentHealthDashboard.vue'),
  meta: { title: '文控健康度' },
},
{
  path: 'documents/operations/audit-coverage',
  name: 'AuditCoverageCenter',
  component: () => import('@/views/documents/AuditCoverageCenter.vue'),
  meta: { title: '审核覆盖' },
},
{
  path: 'documents/operations/impact',
  name: 'ImpactAnalysisWorkbench',
  component: () => import('@/views/documents/ImpactAnalysisWorkbench.vue'),
  meta: { title: '影响分析' },
},
{
  path: 'documents/operations/audit-chain',
  name: 'AuditChainExplorer',
  component: () => import('@/views/documents/AuditChainExplorer.vue'),
  meta: { title: '审核链路' },
},
```

- [ ] **Step 2: Add menu entries**

In `Layout.vue`, under the document-control group, add:

```ts
{ path: '/documents/operations/read-confirmations', title: '阅读确认', icon: Document },
{ path: '/documents/operations/training-needs', title: '培训需求', icon: List },
{ path: '/documents/operations/health', title: '文控健康度', icon: DataAnalysis },
{ path: '/documents/operations/audit-coverage', title: '审核覆盖', icon: DataAnalysis },
{ path: '/documents/operations/impact', title: '影响分析', icon: DataAnalysis },
{ path: '/documents/operations/audit-chain', title: '审核链路', icon: Connection },
```

- [ ] **Step 3: Run backend verification**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm test -- document-read-requirement.service.spec.ts document-training-need.service.spec.ts document-impact.service.spec.ts document-audit-coverage.service.spec.ts document-health.service.spec.ts document-audit-chain.service.spec.ts --runInBand
npm run build
npm run model-landing:verify
```

Expected: all commands exit 0.

- [ ] **Step 4: Run frontend verification**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/client
npm test -- src/api/__tests__/document-operations.spec.ts
npx vue-tsc --noEmit
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit route/menu/docs updates**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add client/src/router/index.ts client/src/views/Layout.vue docs/PROJECT_STRUCTURE.md
git commit -m "feat: wire document operations navigation"
```

Expected: commit contains only route/menu/docs updates. If `docs/PROJECT_STRUCTURE.md` did not change, omit it from `git add`.

---

## Self-Review

- Spec coverage: Tasks 1-2 cover schema and DTOs. Tasks 3-6 cover read confirmation, training needs, audit coverage, impact analysis, health, audit chain, and API endpoints. Tasks 7-8 cover frontend and verification.
- Placeholder scan: This plan avoids unresolved markers, deferred implementation markers, cross-task shorthand, and vague page-construction instructions.
- Type consistency: Backend models and services use the same names across schema, DTOs, services, and routes. Frontend API paths match the controller route plan.
