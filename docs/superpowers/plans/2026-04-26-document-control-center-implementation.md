# Document Control Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the phase-1 document-control center from `docs/superpowers/specs/2026-04-26-document-control-center-design.md`, covering `01-06` controlled file categories, generic references, record-form landing index, and a basic workbench.

**Architecture:** Extend the existing `Document` module instead of creating a parallel document system. Keep completed records in `RecordTemplate/Record` or independent business modules, and expose only references and navigation entries from the document module. Add small focused backend services for document metadata, generic references, record-form landing, and workbench queues; add frontend pages that consume those APIs.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Jest, Vue 3, Element Plus, Vitest, TypeScript.

---

## Scope Check

This plan implements only phase 1 from the spec:

- `01-06` file type model and metadata
- system file library
- document detail metadata/reference expansion
- generic bidirectional references
- `04` record-form landing index
- basic document-control workbench

This plan does not implement automatic compliance scoring, automatic training generation, automatic internal-audit checklist generation, automatic CAPA/change/recall propagation, graph visualization, or reclassification of the 283 source forms.

## File Structure

### Backend Files

- Modify: `server/src/prisma/schema.prisma`
  - Add controlled-document metadata fields to `Document`.
  - Generalize `DocumentReference` so it can point to documents, record templates, record lists, modules, and business objects.
  - Add `RecordFormLandingEntry` for editable `04-记录表单` landing targets and routes.
- Create: `server/src/modules/document/constants/document-control.constants.ts`
  - Central enums for document types, source folders, statuses, reference target types, and relation types.
- Create: `server/src/modules/document/dto/document-control.dto.ts`
  - DTOs for type-specific metadata, reference creation, landing-entry updates, and workbench query options.
- Modify: `server/src/modules/document/dto/create-document.dto.ts`
  - Accept document-control metadata and make it explicit that `level` remains compatibility input.
- Modify: `server/src/modules/document/dto/update-document.dto.ts`
  - Accept metadata, tags, Markdown content, owner, review dates, and source folder fields.
- Modify: `server/src/modules/document/dto/document-query.dto.ts`
  - Add filters for document type, source folder, department, tags, due dates, and broken references.
- Create: `server/src/modules/document/services/document-control-metadata.service.ts`
  - Validate required metadata by document type and normalize incoming payloads.
- Modify: `server/src/modules/document/document.service.ts`
  - Persist new metadata, support metadata filters, include reference counts, and keep existing upload behavior compatible.
- Modify: `server/src/modules/document/document-lifecycle.service.ts`
  - Enforce one effective version per lineage and expose obsolete-reference warnings.
- Modify: `server/src/modules/document/services/document-reference.service.ts`
  - Replace document-only references with generic references while preserving document-to-document compatibility.
- Create: `server/src/modules/document/services/record-form-landing.service.ts`
  - Read model-landing generated rows and merge editable route/target entries.
- Create: `server/src/modules/document/services/document-control-workbench.service.ts`
  - Aggregate due review, expiring external files, obsolete references, broken entrances, missing metadata, and unmapped landing targets.
- Modify: `server/src/modules/document/document.controller.ts`
  - Add endpoints for metadata options, generic references, landing index, landing-entry target updates, and workbench.
- Modify: `server/src/modules/document/document.module.ts`
  - Register new services.
- Test: `server/src/modules/document/document-control-metadata.service.spec.ts`
- Test: `server/src/modules/document/document-lifecycle.service.spec.ts`
- Test: `server/src/modules/document/services/document-reference.service.spec.ts`
- Test: `server/src/modules/document/services/record-form-landing.service.spec.ts`
- Test: `server/src/modules/document/services/document-control-workbench.service.spec.ts`

### Frontend Files

- Create: `client/src/api/document-control.ts`
  - Typed API wrapper for document-control center endpoints.
- Create: `client/src/views/documents/SystemFileLibrary.vue`
  - Main `01-06` library page.
- Modify: `client/src/views/documents/DocumentDetail.vue`
  - Add document-control metadata, references, and business entrances.
- Create: `client/src/views/documents/RecordFormLandingIndex.vue`
  - `04-记录表单` landing index page.
- Create: `client/src/views/documents/DocumentControlWorkbench.vue`
  - Basic workbench queues.
- Modify: `client/src/router/index.ts`
  - Add routes.
- Modify: `client/src/views/Layout.vue`
  - Add menu entries.
- Test: `client/src/views/documents/__tests__/SystemFileLibrary.spec.ts`
- Test: `client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts`
- Test: `client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts`
- Test: update `client/src/views/documents/__tests__/DocumentDetail.spec.ts`

---

### Task 1: Extend Prisma Schema For Document Control Center

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Generate migration: `server/src/prisma/migrations/<timestamp>_add_document_control_center/migration.sql`
- Test: Prisma validation command

- [ ] **Step 1: Update `Document` model fields**

In `server/src/prisma/schema.prisma`, add these fields inside `model Document` after `doc_level`:

```prisma
  document_type      String?  // MANUAL | PROCEDURE | WORK_INSTRUCTION | RECORD_FORM_INDEX | COMPANY_FILE | EXTERNAL_FILE
  source_folder      String?  // 01 | 02 | 03 | 04 | 05 | 06
  owner_department   String?
  owner_user_id      String?
  tags               String[] @default([])
  metadata           Json?
  external_source    String?
  external_expires_at DateTime?
  lineage_key        String?
```

Expected: existing fields remain intact; `document_type` and `source_folder` are nullable for backward compatibility with existing rows.

- [ ] **Step 2: Generalize `DocumentReference`**

Replace the current `DocumentReference` model with this version:

```prisma
model DocumentReference {
  id          String   @id @default(cuid())
  sourceDocId String
  sourceDoc   Document @relation("SourceRefs", fields: [sourceDocId], references: [id], onDelete: Cascade)

  targetDocId String?
  targetDoc   Document? @relation("TargetRefs", fields: [targetDocId], references: [id], onDelete: Cascade)

  targetType  String   @default("document")
  targetId    String?
  targetRoute String?
  targetLabel String?
  relationType String @default("RELATED_TO")

  sectionId   String?
  snapshot    Json?
  syncedAt    DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([sourceDocId, targetType, targetId, targetRoute, sectionId])
  @@index([sourceDocId])
  @@index([targetDocId])
  @@index([targetType, targetId])
  @@index([relationType])
  @@map("document_references")
}
```

Expected: document-to-document references continue to use `targetDocId`; non-document targets use `targetType`, `targetId`, `targetRoute`, and `targetLabel`.

- [ ] **Step 3: Add `RecordFormLandingEntry` model**

Add this model near `DocumentReference`:

```prisma
model RecordFormLandingEntry {
  id              String   @id @default(cuid())
  sourceCode      String   @unique
  targetModule    String?
  targetModel     String?
  targetRoute     String?
  targetTemplateId String?
  landingStrategy String?
  relatedDocIds   String[] @default([])
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([targetModule])
  @@index([targetModel])
  @@index([landingStrategy])
  @@map("record_form_landing_entries")
}
```

Expected: model-landing generated rows remain the source for source form facts; this table stores editable route and target metadata only.

- [ ] **Step 4: Create migration**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm run prisma:migrate -- --name add_document_control_center
```

Expected: Prisma creates a migration directory and updates the local database. If local DB is unavailable, run this fallback to generate SQL after schema validation:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npx prisma validate --schema=src/prisma/schema.prisma
```

Expected fallback: `The schema at src/prisma/schema.prisma is valid`.

- [ ] **Step 5: Generate Prisma client**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm run prisma:generate
```

Expected: command exits 0 and Prisma Client is generated.

- [ ] **Step 6: Commit schema changes**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add server/src/prisma/schema.prisma server/src/prisma/migrations
git commit -m "feat: extend document control schema"
```

Expected: commit contains only Prisma schema and migration files.

---

### Task 2: Add Document Control Constants, DTOs, And Metadata Validation

**Files:**
- Create: `server/src/modules/document/constants/document-control.constants.ts`
- Create: `server/src/modules/document/dto/document-control.dto.ts`
- Modify: `server/src/modules/document/dto/create-document.dto.ts`
- Modify: `server/src/modules/document/dto/update-document.dto.ts`
- Modify: `server/src/modules/document/dto/document-query.dto.ts`
- Modify: `server/src/modules/document/dto/index.ts`
- Create: `server/src/modules/document/services/document-control-metadata.service.ts`
- Test: `server/src/modules/document/document-control-metadata.service.spec.ts`

- [ ] **Step 1: Add constants**

Create `server/src/modules/document/constants/document-control.constants.ts`:

```ts
export const DOCUMENT_TYPES = [
  'MANUAL',
  'PROCEDURE',
  'WORK_INSTRUCTION',
  'RECORD_FORM_INDEX',
  'COMPANY_FILE',
  'EXTERNAL_FILE',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const SOURCE_FOLDERS = ['01', '02', '03', '04', '05', '06'] as const;
export type SourceFolder = (typeof SOURCE_FOLDERS)[number];

export const DOCUMENT_CONTROL_STATUSES = [
  'draft',
  'pending_review',
  'pending',
  'approved',
  'effective',
  'under_review',
  'archived',
  'obsolete',
  'rejected',
  'inactive',
] as const;

export const REFERENCE_TARGET_TYPES = [
  'document',
  'record_template',
  'record_list',
  'business_module',
  'business_object',
  'external_file',
  'company_file',
] as const;

export type ReferenceTargetType = (typeof REFERENCE_TARGET_TYPES)[number];

export const DOCUMENT_RELATION_TYPES = [
  'IMPLEMENTS',
  'REQUIRES_RECORD',
  'EVIDENCE_FOR',
  'BASED_ON',
  'REPLACES',
  'RELATED_TO',
  'CONTROLLED_BY',
] as const;

export type DocumentRelationType = (typeof DOCUMENT_RELATION_TYPES)[number];

export const REQUIRED_METADATA_BY_TYPE: Record<DocumentType, string[]> = {
  MANUAL: ['systemScope'],
  PROCEDURE: ['processArea'],
  WORK_INSTRUCTION: ['department'],
  RECORD_FORM_INDEX: ['sourceCode', 'landingStrategy'],
  COMPANY_FILE: ['organizationScope'],
  EXTERNAL_FILE: ['externalSource', 'applicableScope'],
};
```

- [ ] **Step 2: Add document-control DTOs**

Create `server/src/modules/document/dto/document-control.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  DOCUMENT_RELATION_TYPES,
  DOCUMENT_TYPES,
  REFERENCE_TARGET_TYPES,
  SOURCE_FOLDERS,
} from '../constants/document-control.constants';

export class DocumentControlMetadataDto {
  @ApiPropertyOptional({ enum: DOCUMENT_TYPES })
  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  documentType?: string;

  @ApiPropertyOptional({ enum: SOURCE_FOLDERS })
  @IsOptional()
  @IsIn(SOURCE_FOLDERS)
  sourceFolder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerDepartment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  externalExpiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lineageKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reviewDueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  contentMd?: string;
}

export class CreateGenericDocumentReferenceDto {
  @ApiPropertyOptional({ enum: REFERENCE_TARGET_TYPES })
  @IsIn(REFERENCE_TARGET_TYPES)
  targetType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetDocId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetRoute?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetLabel?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_RELATION_TYPES })
  @IsIn(DOCUMENT_RELATION_TYPES)
  relationType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  snapshot?: Record<string, unknown>;
}

export class UpdateRecordFormLandingEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetModule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetRoute?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetTemplateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  landingStrategy?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedDocIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class WorkbenchQueryDto {
  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  days?: number = 30;
}
```

- [ ] **Step 3: Extend create/update/query DTOs**

Update `server/src/modules/document/dto/create-document.dto.ts`:

```ts
import { IsInt, IsString, IsNotEmpty, Min, Max, MinLength, MaxLength, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DocumentControlMetadataDto } from './document-control.dto';

export class CreateDocumentDto {
  @ApiProperty({ description: '文档级别', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  level: number;

  @ApiProperty({ description: '文档标题', example: '测试文档' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ type: DocumentControlMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentControlMetadataDto)
  control?: DocumentControlMetadataDto;
}
```

Update `server/src/modules/document/dto/update-document.dto.ts`:

```ts
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DocumentControlMetadataDto } from './document-control.dto';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: '文档标题' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ type: DocumentControlMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentControlMetadataDto)
  control?: DocumentControlMetadataDto;
}
```

Update `server/src/modules/document/dto/document-query.dto.ts` by adding fields:

```ts
  @ApiPropertyOptional({ description: '文档类型' })
  @IsString()
  @IsOptional()
  documentType?: string;

  @ApiPropertyOptional({ description: '来源文件夹 01-06' })
  @IsString()
  @IsOptional()
  sourceFolder?: string;

  @ApiPropertyOptional({ description: '负责部门' })
  @IsString()
  @IsOptional()
  ownerDepartment?: string;

  @ApiPropertyOptional({ description: '标签' })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ description: '复审到期天数' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  dueWithinDays?: number;
```

Update `server/src/modules/document/dto/index.ts` to export the new DTO file:

```ts
export * from './create-document.dto';
export * from './update-document.dto';
export * from './document-query.dto';
export * from './archive-document.dto';
export * from './approve-document.dto';
export * from './document-control.dto';
```

- [ ] **Step 4: Add metadata validation service**

Create `server/src/modules/document/services/document-control-metadata.service.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentControlMetadataDto } from '../dto/document-control.dto';
import {
  DOCUMENT_TYPES,
  DocumentType,
  REQUIRED_METADATA_BY_TYPE,
  SOURCE_FOLDERS,
} from '../constants/document-control.constants';

@Injectable()
export class DocumentControlMetadataService {
  normalize(control?: DocumentControlMetadataDto) {
    if (!control) return {};

    const documentType = control.documentType?.trim();
    const sourceFolder = control.sourceFolder?.trim();

    if (documentType && !DOCUMENT_TYPES.includes(documentType as DocumentType)) {
      throw new BadRequestException(`Unsupported documentType: ${documentType}`);
    }

    if (sourceFolder && !SOURCE_FOLDERS.includes(sourceFolder as any)) {
      throw new BadRequestException(`Unsupported sourceFolder: ${sourceFolder}`);
    }

    if (documentType) {
      this.validateRequiredMetadata(documentType as DocumentType, control.metadata ?? {});
    }

    return {
      document_type: documentType,
      source_folder: sourceFolder,
      owner_department: control.ownerDepartment?.trim() || null,
      owner_user_id: control.ownerUserId?.trim() || null,
      tags: control.tags ?? [],
      metadata: control.metadata ?? null,
      external_source: control.externalSource?.trim() || null,
      external_expires_at: control.externalExpiresAt ? new Date(control.externalExpiresAt) : null,
      lineage_key: control.lineageKey?.trim() || null,
      effective_date: control.effectiveDate ? new Date(control.effectiveDate) : undefined,
      review_due_date: control.reviewDueDate ? new Date(control.reviewDueDate) : undefined,
      content_md: control.contentMd ?? undefined,
    };
  }

  private validateRequiredMetadata(documentType: DocumentType, metadata: Record<string, unknown>) {
    const required = REQUIRED_METADATA_BY_TYPE[documentType];
    const missing = required.filter((key) => {
      const value = metadata[key];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      throw new BadRequestException(
        `${documentType} missing required metadata: ${missing.join(', ')}`,
      );
    }
  }
}
```

- [ ] **Step 5: Write metadata validation tests**

Create `server/src/modules/document/document-control-metadata.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { DocumentControlMetadataService } from './services/document-control-metadata.service';

describe('DocumentControlMetadataService', () => {
  let service: DocumentControlMetadataService;

  beforeEach(() => {
    service = new DocumentControlMetadataService();
  });

  it('normalizes valid procedure metadata', () => {
    const result = service.normalize({
      documentType: 'PROCEDURE',
      sourceFolder: '02',
      tags: ['追溯'],
      metadata: { processArea: 'traceability' },
    });

    expect(result.document_type).toBe('PROCEDURE');
    expect(result.source_folder).toBe('02');
    expect(result.tags).toEqual(['追溯']);
  });

  it('rejects unsupported document type', () => {
    expect(() => service.normalize({
      documentType: 'BAD',
      metadata: {},
    } as any)).toThrow(BadRequestException);
  });

  it('rejects missing required metadata by type', () => {
    expect(() => service.normalize({
      documentType: 'EXTERNAL_FILE',
      sourceFolder: '06',
      metadata: { externalSource: 'GB' },
    })).toThrow('EXTERNAL_FILE missing required metadata');
  });
});
```

- [ ] **Step 6: Run tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm test -- document-control-metadata.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit constants and DTOs**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add server/src/modules/document/constants server/src/modules/document/dto server/src/modules/document/services/document-control-metadata.service.ts server/src/modules/document/document-control-metadata.service.spec.ts
git commit -m "feat: add document control metadata validation"
```

Expected: commit contains constants, DTOs, metadata service, and tests.

---

### Task 3: Persist Document Control Metadata In Document APIs

**Files:**
- Modify: `server/src/modules/document/document.module.ts`
- Modify: `server/src/modules/document/document.service.ts`
- Test: create or update `server/src/modules/document/document.service.spec.ts`

- [ ] **Step 1: Register metadata service**

Modify `server/src/modules/document/document.module.ts` imports/providers:

```ts
import { DocumentControlMetadataService } from './services/document-control-metadata.service';
```

Add `DocumentControlMetadataService` to `providers` and `exports`:

```ts
providers: [
  DocumentService,
  DocumentCronService,
  DocumentReferenceService,
  DocumentLifecycleService,
  DocumentControlMetadataService,
  FilePreviewService,
  StorageService,
  StatisticsCacheInterceptor,
  PermissionGuard,
  DocumentsListener,
],
exports: [
  DocumentService,
  DocumentReferenceService,
  DocumentLifecycleService,
  DocumentControlMetadataService,
],
```

- [ ] **Step 2: Inject metadata service**

Modify the `DocumentService` constructor:

```ts
import { DocumentControlMetadataService } from './services/document-control-metadata.service';
```

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly storage: StorageService,
  private readonly notification: NotificationService,
  private readonly operationLog: OperationLogService,
  private readonly eventEmitter: EventEmitter2,
  private readonly metadataService: DocumentControlMetadataService,
) {
  this.snowflake = new Snowflake(1, 1);
}
```

- [ ] **Step 3: Persist metadata in `create`**

Inside `DocumentService.create`, before creating the document:

```ts
const controlData = this.metadataService.normalize(dto.control);
```

Add the normalized fields to the create `data`:

```ts
const result = await this.prisma.document.create({
  data: {
    id: this.snowflake.nextId(),
    level: dto.level,
    number,
    title: dto.title,
    filePath: uploadResult.path,
    fileName: file.originalname,
    fileSize: Number(file.size),
    fileType: file.mimetype,
    status: 'draft',
    creatorId: userId,
    departmentId: user.departmentId,
    ...controlData,
  },
});
```

Expected: existing uploads still work when `control` is omitted.

- [ ] **Step 4: Persist metadata in `update`**

Inside `DocumentService.update`, compute:

```ts
const controlData = dto.control ? this.metadataService.normalize(dto.control) : {};
```

When updating with a new file, include:

```ts
data: {
  title: dto.title ?? document.title,
  filePath: uploadResult.path,
  fileName: file.originalname,
  fileSize: Number(file.size),
  fileType: file.mimetype,
  version: { increment: new Prisma.Decimal(0.1) },
  ...controlData,
},
```

When updating without a file, include:

```ts
data: {
  title: dto.title ?? document.title,
  ...controlData,
},
```

- [ ] **Step 5: Extend list filters**

In `DocumentService.findAll`, add filters:

```ts
const {
  level,
  keyword,
  status,
  documentType,
  sourceFolder,
  ownerDepartment,
  tag,
  dueWithinDays,
} = query;
```

Then add:

```ts
if (documentType) where.document_type = documentType;
if (sourceFolder) where.source_folder = sourceFolder;
if (ownerDepartment) where.owner_department = ownerDepartment;
if (tag) where.tags = { has: tag };

if (dueWithinDays) {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + dueWithinDays);
  where.review_due_date = { lte: deadline };
}

if (keyword) {
  where.OR = [
    { title: { contains: keyword } },
    { number: { contains: keyword } },
    { content_md: { contains: keyword } },
  ];
}
```

Expected: old filters still work; new filters are additive.

- [ ] **Step 6: Include references in `findOne`**

Change the `findUnique` call in `findOne` to include references:

```ts
const document = await this.prisma.document.findUnique({
  where: { id, deletedAt: null },
  include: {
    sourceReferences: {
      include: { targetDoc: { select: { id: true, title: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    },
    targetReferences: {
      include: { sourceDoc: { select: { id: true, title: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    },
  },
}) as unknown as any;
```

- [ ] **Step 7: Add service tests**

Create `server/src/modules/document/document.service.spec.ts` if missing. Include at least:

```ts
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentService } from './document.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services';
import { NotificationService } from '../notification/notification.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { DocumentControlMetadataService } from './services/document-control-metadata.service';

describe('DocumentService document control metadata', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    document: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    department: { findUnique: jest.fn() },
    pendingNumber: { findFirst: jest.fn() },
    numberRule: { create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  const storage = { uploadFile: jest.fn() };
  const operationLog = { log: jest.fn() };
  const eventEmitter = { emit: jest.fn() };

  let service: DocumentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DocumentService,
        DocumentControlMetadataService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: NotificationService, useValue: { create: jest.fn() } },
        { provide: OperationLogService, useValue: operationLog },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();
    service = module.get(DocumentService);
  });

  it('persists document control metadata on create', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', departmentId: 'd1' });
    prisma.document.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (cb) => cb({
      pendingNumber: { findFirst: jest.fn().mockResolvedValue(null), delete: jest.fn() },
      department: { findUnique: jest.fn().mockResolvedValue({ id: 'd1', code: 'PZ' }) },
      $queryRaw: jest.fn().mockResolvedValue([]),
      numberRule: {
        create: jest.fn().mockResolvedValue({ id: 'rule1', sequence: 0 }),
        update: jest.fn(),
      },
    }));
    storage.uploadFile.mockResolvedValue({ path: 'documents/level2/file.pdf' });
    prisma.document.create.mockResolvedValue({ id: 'doc1', title: 'CX-11' });

    await service.create({
      level: 2,
      title: 'CX-11',
      control: {
        documentType: 'PROCEDURE',
        sourceFolder: '02',
        metadata: { processArea: 'traceability' },
      },
    } as any, { originalname: 'cx11.pdf', size: 100, mimetype: 'application/pdf' } as any, 'u1');

    expect(prisma.document.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        document_type: 'PROCEDURE',
        source_folder: '02',
        metadata: { processArea: 'traceability' },
        departmentId: 'd1',
      }),
    }));
  });
});
```

- [ ] **Step 8: Run tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm test -- document.service.spec.ts document-control-metadata.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 9: Commit document metadata persistence**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add server/src/modules/document/document.module.ts server/src/modules/document/document.service.ts server/src/modules/document/document.service.spec.ts
git commit -m "feat: persist document control metadata"
```

Expected: commit contains service/module updates and tests.

---

### Task 4: Enforce Lifecycle Rules And Workbench Queues

**Files:**
- Modify: `server/src/modules/document/document-lifecycle.service.ts`
- Create: `server/src/modules/document/services/document-control-workbench.service.ts`
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/document.module.ts`
- Test: `server/src/modules/document/document-lifecycle.service.spec.ts`
- Test: `server/src/modules/document/services/document-control-workbench.service.spec.ts`

- [ ] **Step 1: Add lifecycle uniqueness checks**

In `DocumentLifecycleService.publish`, after loading `doc`, add:

```ts
const lineageKey = (doc as any).lineage_key ?? doc.number;
const effectiveCount = await this.prisma.document.count({
  where: {
    id: { not: id },
    deletedAt: null,
    status: 'effective',
    OR: [
      { lineage_key: lineageKey },
      { number: doc.number },
    ],
  },
});

if (effectiveCount > 0) {
  throw new ConflictException(`同一受控文件谱系已存在有效版本: ${lineageKey}`);
}
```

Add import:

```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
```

- [ ] **Step 2: Keep superseded status compatible**

Update `supersede`:

```ts
async supersede(oldId: string, newId: string) {
  return this.prisma.document.update({
    where: { id: oldId },
    data: {
      status: 'obsolete',
      superseded_by_id: newId,
      obsoletedAt: new Date(),
    },
  });
}
```

Expected: the project uses `obsolete` as the controlled-file status, not a separate `superseded` queue.

- [ ] **Step 3: Create workbench service**

Create `server/src/modules/document/services/document-control-workbench.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DocumentControlWorkbenchService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkbench(days = 30) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);

    const [
      pendingReview,
      dueForReview,
      expiringExternalFiles,
      obsoleteReferences,
      brokenReferences,
      missingLandingTargets,
      missingMetadata,
    ] = await Promise.all([
      this.prisma.document.findMany({
        where: { deletedAt: null, status: { in: ['pending_review', 'pending'] } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.document.findMany({
        where: { deletedAt: null, status: 'effective', review_due_date: { lte: deadline } },
        orderBy: { review_due_date: 'asc' },
      }),
      this.prisma.document.findMany({
        where: {
          deletedAt: null,
          document_type: 'EXTERNAL_FILE',
          external_expires_at: { lte: deadline },
          status: { in: ['effective', 'approved'] },
        },
        orderBy: { external_expires_at: 'asc' },
      }),
      this.prisma.documentReference.findMany({
        where: { targetDoc: { status: { in: ['obsolete', 'archived'] } } },
        include: {
          sourceDoc: { select: { id: true, title: true, status: true } },
          targetDoc: { select: { id: true, title: true, status: true } },
        },
      }),
      this.prisma.documentReference.findMany({
        where: {
          targetType: { in: ['record_template', 'record_list', 'business_module', 'business_object'] },
          targetRoute: null,
        },
        include: { sourceDoc: { select: { id: true, title: true, status: true } } },
      }),
      this.prisma.recordFormLandingEntry.findMany({
        where: { OR: [{ targetRoute: null }, { targetModule: null }] },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.document.findMany({
        where: {
          deletedAt: null,
          OR: [
            { document_type: null },
            { source_folder: null },
            { review_due_date: null },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      pendingReview,
      dueForReview,
      expiringExternalFiles,
      obsoleteReferences,
      brokenReferences,
      missingLandingTargets,
      missingMetadata,
      counts: {
        pendingReview: pendingReview.length,
        dueForReview: dueForReview.length,
        expiringExternalFiles: expiringExternalFiles.length,
        obsoleteReferences: obsoleteReferences.length,
        brokenReferences: brokenReferences.length,
        missingLandingTargets: missingLandingTargets.length,
        missingMetadata: missingMetadata.length,
      },
    };
  }
}
```

- [ ] **Step 4: Register and expose workbench**

In `document.module.ts`, import and add `DocumentControlWorkbenchService` to providers and exports.

In `document.controller.ts`, inject:

```ts
private readonly workbenchService: DocumentControlWorkbenchService,
```

Add endpoint before `@Get(':id')`:

```ts
@Get('control/workbench')
@ApiOperation({ summary: '文控工作台' })
getControlWorkbench(@Query('days') days?: string) {
  return this.workbenchService.getWorkbench(days ? parseInt(days, 10) : 30);
}
```

- [ ] **Step 5: Add tests**

Append to `document-lifecycle.service.spec.ts`:

```ts
it('should reject publishing when another effective version exists in same lineage', async () => {
  mockPrisma.document.findFirst.mockResolvedValue({ id: 'd1', number: 'CX-01', status: 'approved', lineage_key: 'CX-01' });
  mockPrisma.document.count.mockResolvedValue(1);
  await expect(service.publish('d1', {})).rejects.toThrow('同一受控文件谱系已存在有效版本');
});
```

Create `server/src/modules/document/services/document-control-workbench.service.spec.ts`:

```ts
import { DocumentControlWorkbenchService } from './document-control-workbench.service';

describe('DocumentControlWorkbenchService', () => {
  const prisma = {
    document: { findMany: jest.fn() },
    documentReference: { findMany: jest.fn() },
    recordFormLandingEntry: { findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.document.findMany.mockResolvedValue([]);
    prisma.documentReference.findMany.mockResolvedValue([]);
    prisma.recordFormLandingEntry.findMany.mockResolvedValue([]);
  });

  it('returns queue counts for all workbench sections', async () => {
    prisma.document.findMany
      .mockResolvedValueOnce([{ id: 'pending' }])
      .mockResolvedValueOnce([{ id: 'due' }])
      .mockResolvedValueOnce([{ id: 'external' }])
      .mockResolvedValueOnce([{ id: 'missing' }]);
    prisma.documentReference.findMany
      .mockResolvedValueOnce([{ id: 'obsolete-ref' }])
      .mockResolvedValueOnce([{ id: 'broken-ref' }]);
    prisma.recordFormLandingEntry.findMany.mockResolvedValueOnce([{ id: 'landing-gap' }]);

    const service = new DocumentControlWorkbenchService(prisma as any);
    const result = await service.getWorkbench(30);

    expect(result.counts.pendingReview).toBe(1);
    expect(result.counts.dueForReview).toBe(1);
    expect(result.counts.expiringExternalFiles).toBe(1);
    expect(result.counts.obsoleteReferences).toBe(1);
    expect(result.counts.brokenReferences).toBe(1);
    expect(result.counts.missingLandingTargets).toBe(1);
    expect(result.counts.missingMetadata).toBe(1);
  });
});
```

- [ ] **Step 6: Run tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm test -- document-lifecycle.service.spec.ts document-control-workbench.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit lifecycle and workbench**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add server/src/modules/document/document-lifecycle.service.ts server/src/modules/document/document-lifecycle.service.spec.ts server/src/modules/document/document.controller.ts server/src/modules/document/document.module.ts server/src/modules/document/services/document-control-workbench.service.ts server/src/modules/document/services/document-control-workbench.service.spec.ts
git commit -m "feat: add document control workbench"
```

Expected: commit contains lifecycle guard and workbench API.

---

### Task 5: Generalize Document References

**Files:**
- Modify: `server/src/modules/document/services/document-reference.service.ts`
- Modify: `server/src/modules/document/document.controller.ts`
- Test: `server/src/modules/document/services/document-reference.service.spec.ts`

- [ ] **Step 1: Replace reference DTO import and interface**

In `document-reference.service.ts`, remove the local `CreateDocumentReferenceDto` interface and import:

```ts
import { CreateGenericDocumentReferenceDto } from '../dto/document-control.dto';
```

Update method signature:

```ts
async createReference(sourceDocId: string, dto: CreateGenericDocumentReferenceDto) {
```

- [ ] **Step 2: Validate document target only when targetType is document**

Replace the first validation block in `createReference` with:

```ts
const source = await this.prisma.document.findUnique({ where: { id: sourceDocId, deletedAt: null } });
if (!source) throw new NotFoundException(`源文档 ${sourceDocId} 不存在`);

let target: any = null;
if (dto.targetType === 'document') {
  if (!dto.targetDocId) throw new BadRequestException('document target requires targetDocId');
  target = await this.prisma.document.findUnique({ where: { id: dto.targetDocId, deletedAt: null } });
  if (!target) throw new NotFoundException(`目标文档 ${dto.targetDocId} 不存在`);
  if (sourceDocId === dto.targetDocId) throw new BadRequestException('不能引用自身文档');
  await this.validateNoCircularReference(sourceDocId, dto.targetDocId);
  await this.validateDepthLimit(sourceDocId, dto.targetDocId);
} else if (!dto.targetId && !dto.targetRoute) {
  throw new BadRequestException('non-document target requires targetId or targetRoute');
}
```

- [ ] **Step 3: Persist generic reference fields**

Replace create data with:

```ts
data: {
  sourceDocId,
  targetDocId: dto.targetType === 'document' ? dto.targetDocId : null,
  targetType: dto.targetType,
  targetId: dto.targetId ?? dto.targetDocId ?? null,
  targetRoute: dto.targetRoute ?? null,
  targetLabel: dto.targetLabel ?? target?.title ?? null,
  relationType: dto.relationType,
  sectionId: dto.sectionId,
  snapshot: dto.snapshot as any ?? null,
  syncedAt: dto.snapshot ? new Date() : null,
},
```

Expected: document references still return included target documents, while non-document references persist route and label.

- [ ] **Step 4: Return generic references**

In `getReferences`, keep the two queries but include generic fields. The existing `include` can remain:

```ts
include: { targetDoc: { select: { id: true, title: true, status: true } } },
```

Expected: non-document references have `targetDoc: null` and usable `targetRoute` / `targetLabel`.

- [ ] **Step 5: Update controller body type**

In `document.controller.ts`, replace import:

```ts
import { CreateGenericDocumentReferenceDto } from './dto';
```

Update endpoint:

```ts
async createReference(
  @Param('id') id: string,
  @Body() dto: CreateGenericDocumentReferenceDto,
) {
  return this.documentReferenceService.createReference(id, dto);
}
```

- [ ] **Step 6: Add service tests**

Create `server/src/modules/document/services/document-reference.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { DocumentReferenceService } from './document-reference.service';

describe('DocumentReferenceService generic references', () => {
  const prisma = {
    document: { findUnique: jest.fn() },
    documentReference: { create: jest.fn(), findMany: jest.fn() },
  };
  let service: DocumentReferenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentReferenceService(prisma as any);
  });

  it('creates a business module reference without targetDocId', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1', title: 'SOP' });
    prisma.documentReference.create.mockResolvedValue({ id: 'ref1', targetType: 'business_module' });

    const result = await service.createReference('doc1', {
      targetType: 'business_module',
      targetRoute: '/process',
      targetLabel: '研发流程',
      relationType: 'REQUIRES_RECORD',
    });

    expect(result.success).toBe(true);
    expect(prisma.documentReference.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        targetDocId: null,
        targetType: 'business_module',
        targetRoute: '/process',
        relationType: 'REQUIRES_RECORD',
      }),
    }));
  });

  it('rejects non-document references without targetId or route', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
    await expect(service.createReference('doc1', {
      targetType: 'business_module',
      relationType: 'RELATED_TO',
    } as any)).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 7: Run tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm test -- document-reference.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 8: Commit generic references**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add server/src/modules/document/services/document-reference.service.ts server/src/modules/document/services/document-reference.service.spec.ts server/src/modules/document/document.controller.ts
git commit -m "feat: generalize document references"
```

Expected: commit contains reference service/controller changes and tests.

---

### Task 6: Add Record Form Landing Index API

**Files:**
- Create: `server/src/modules/document/services/record-form-landing.service.ts`
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/document.module.ts`
- Test: `server/src/modules/document/services/record-form-landing.service.spec.ts`

- [ ] **Step 1: Create landing service**

Create `server/src/modules/document/services/record-form-landing.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ModelLandingService } from '../../model-landing/model-landing.service';
import { UpdateRecordFormLandingEntryDto } from '../dto/document-control.dto';

@Injectable()
export class RecordFormLandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelLanding: ModelLandingService,
  ) {}

  async list(query: { keyword?: string; department?: string; templateGroupId?: string }) {
    const groups = this.modelLanding.listGroups();
    const forms = groups.flatMap((group: any) =>
      this.modelLanding.getGroup(group.id).forms.map((form: any) => ({
        ...form,
        groupName: group.name,
        strategy: group.implementationMode ?? group.landingStrategy ?? group.strategy ?? null,
        targetModel: group.targetModel ?? null,
      })),
    );

    const filtered = forms.filter((form: any) => {
      if (query.keyword && !`${form.code} ${form.formName}`.includes(query.keyword)) return false;
      if (query.department && form.department !== query.department) return false;
      if (query.templateGroupId && form.templateGroupId !== query.templateGroupId) return false;
      return true;
    });

    const overrides = await this.prisma.recordFormLandingEntry.findMany({
      where: { sourceCode: { in: filtered.map((form: any) => form.code) } },
    });
    const overrideMap = new Map(overrides.map((entry: any) => [entry.sourceCode, entry]));

    return filtered.map((form: any) => ({
      ...form,
      landingEntry: overrideMap.get(form.code) ?? null,
    }));
  }

  async get(code: string) {
    const form = this.modelLanding.getFormByCode(code);
    const entry = await this.prisma.recordFormLandingEntry.findUnique({
      where: { sourceCode: code },
    });
    return { ...form, landingEntry: entry };
  }

  async upsertTarget(code: string, dto: UpdateRecordFormLandingEntryDto) {
    const form = this.modelLanding.getFormByCode(code);
    if (!form) throw new NotFoundException(`Unknown source form: ${code}`);

    return this.prisma.recordFormLandingEntry.upsert({
      where: { sourceCode: code },
      update: {
        targetModule: dto.targetModule,
        targetModel: dto.targetModel,
        targetRoute: dto.targetRoute,
        targetTemplateId: dto.targetTemplateId,
        landingStrategy: dto.landingStrategy,
        relatedDocIds: dto.relatedDocIds ?? [],
        notes: dto.notes,
      },
      create: {
        sourceCode: code,
        targetModule: dto.targetModule,
        targetModel: dto.targetModel,
        targetRoute: dto.targetRoute,
        targetTemplateId: dto.targetTemplateId,
        landingStrategy: dto.landingStrategy,
        relatedDocIds: dto.relatedDocIds ?? [],
        notes: dto.notes,
      },
    });
  }
}
```

- [ ] **Step 2: Register service and model-landing module**

In `document.module.ts`, import `ModelLandingModule`:

```ts
import { ModelLandingModule } from '../model-landing/model-landing.module';
```

Add it to `imports`:

```ts
imports: [
  ConfigModule,
  PrismaModule,
  NotificationModule,
  OperationLogModule,
  ExportModule,
  DepartmentPermissionModule,
  StatisticsModule,
  UserPermissionModule,
  SearchModule,
  ModelLandingModule,
],
```

Add `RecordFormLandingService` to providers and exports.

- [ ] **Step 3: Add controller endpoints**

In `document.controller.ts`, inject:

```ts
private readonly recordFormLandingService: RecordFormLandingService,
```

Add endpoints before `@Get(':id')`:

```ts
@Get('record-form-index')
@ApiOperation({ summary: '查询04记录表单落地索引' })
listRecordFormIndex(
  @Query('keyword') keyword?: string,
  @Query('department') department?: string,
  @Query('templateGroupId') templateGroupId?: string,
) {
  return this.recordFormLandingService.list({ keyword, department, templateGroupId });
}

@Get('record-form-index/:code')
@ApiOperation({ summary: '查询单张源表单落地信息' })
getRecordFormIndexEntry(@Param('code') code: string) {
  return this.recordFormLandingService.get(code);
}

@Patch('record-form-index/:code')
@ApiOperation({ summary: '维护源表单目标入口' })
updateRecordFormIndexEntry(
  @Param('code') code: string,
  @Body() dto: UpdateRecordFormLandingEntryDto,
) {
  return this.recordFormLandingService.upsertTarget(code, dto);
}
```

- [ ] **Step 4: Add tests**

Create `server/src/modules/document/services/record-form-landing.service.spec.ts`:

```ts
import { RecordFormLandingService } from './record-form-landing.service';

describe('RecordFormLandingService', () => {
  const prisma = {
    recordFormLandingEntry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };
  const modelLanding = {
    listGroups: jest.fn(),
    getGroup: jest.fn(),
    getFormByCode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    modelLanding.listGroups.mockReturnValue([{ id: 'FG-process', name: '研发流程', targetModel: 'ProcessInstance' }]);
    modelLanding.getGroup.mockReturnValue({
      forms: [{ code: 'GRSS-KF-JL-01', formName: '产品开发评审记录', department: '产品开发部', templateGroupId: 'FG-process' }],
    });
    modelLanding.getFormByCode.mockReturnValue({ code: 'GRSS-KF-JL-01', formName: '产品开发评审记录' });
    prisma.recordFormLandingEntry.findMany.mockResolvedValue([]);
  });

  it('lists model-landing forms with editable landing entry', async () => {
    const service = new RecordFormLandingService(prisma as any, modelLanding as any);
    const result = await service.list({ keyword: '产品开发' });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('GRSS-KF-JL-01');
  });

  it('upserts route target without copying record data', async () => {
    prisma.recordFormLandingEntry.upsert.mockResolvedValue({ sourceCode: 'GRSS-KF-JL-01', targetRoute: '/process' });
    const service = new RecordFormLandingService(prisma as any, modelLanding as any);
    const result = await service.upsertTarget('GRSS-KF-JL-01', { targetModule: 'process', targetRoute: '/process' });
    expect(result.targetRoute).toBe('/process');
    expect(prisma.recordFormLandingEntry.upsert).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm test -- record-form-landing.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit landing index API**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add server/src/modules/document/services/record-form-landing.service.ts server/src/modules/document/services/record-form-landing.service.spec.ts server/src/modules/document/document.controller.ts server/src/modules/document/document.module.ts
git commit -m "feat: add record form landing index"
```

Expected: commit contains landing service, endpoints, module wiring, and tests.

---

### Task 7: Add Frontend Document Control API

**Files:**
- Create: `client/src/api/document-control.ts`
- Test: `client/src/api/__tests__/document-control.spec.ts`

- [ ] **Step 1: Create typed API wrapper**

Create `client/src/api/document-control.ts`:

```ts
import request from './request';

export type DocumentType =
  | 'MANUAL'
  | 'PROCEDURE'
  | 'WORK_INSTRUCTION'
  | 'RECORD_FORM_INDEX'
  | 'COMPANY_FILE'
  | 'EXTERNAL_FILE';

export interface DocumentControlDocument {
  id: string;
  number: string;
  title: string;
  level: number;
  status: string;
  document_type?: DocumentType;
  source_folder?: string;
  owner_department?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  content_md?: string;
  review_due_date?: string;
  external_expires_at?: string;
  sourceReferences?: DocumentReference[];
  targetReferences?: DocumentReference[];
}

export interface DocumentReference {
  id: string;
  sourceDocId: string;
  targetDocId?: string | null;
  targetType: string;
  targetId?: string | null;
  targetRoute?: string | null;
  targetLabel?: string | null;
  relationType: string;
  targetDoc?: { id: string; title: string; status: string } | null;
  sourceDoc?: { id: string; title: string; status: string } | null;
}

export interface DocumentListResponse {
  list: DocumentControlDocument[];
  total: number;
  page: number;
  limit: number;
}

export interface RecordFormLandingEntry {
  code: string;
  formName: string;
  department: string;
  templateGroupId: string;
  groupName?: string;
  entities: string[];
  chain: string;
  basis: string;
  landingEntry?: {
    targetModule?: string;
    targetModel?: string;
    targetRoute?: string;
    targetTemplateId?: string;
    landingStrategy?: string;
    relatedDocIds?: string[];
    notes?: string;
  } | null;
}

export interface WorkbenchResponse {
  pendingReview: DocumentControlDocument[];
  dueForReview: DocumentControlDocument[];
  expiringExternalFiles: DocumentControlDocument[];
  obsoleteReferences: DocumentReference[];
  brokenReferences: DocumentReference[];
  missingLandingTargets: unknown[];
  missingMetadata: DocumentControlDocument[];
  counts: Record<string, number>;
}

export const documentControlApi = {
  listDocuments(params?: Record<string, unknown>) {
    return request.get<DocumentListResponse>('/documents', { params });
  },
  getDocument(id: string) {
    return request.get<DocumentControlDocument>(`/documents/${id}`);
  },
  createReference(documentId: string, payload: Partial<DocumentReference>) {
    return request.post(`/documents/${documentId}/references`, payload);
  },
  getReferences(documentId: string) {
    return request.get(`/documents/${documentId}/references`);
  },
  listRecordFormIndex(params?: { keyword?: string; department?: string; templateGroupId?: string }) {
    return request.get<RecordFormLandingEntry[]>('/documents/record-form-index', { params });
  },
  updateRecordFormIndex(code: string, payload: Record<string, unknown>) {
    return request.patch(`/documents/record-form-index/${code}`, payload);
  },
  getWorkbench(days = 30) {
    return request.get<WorkbenchResponse>('/documents/control/workbench', { params: { days } });
  },
};
```

- [ ] **Step 2: Add API test**

Create `client/src/api/__tests__/document-control.spec.ts`:

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

import { documentControlApi } from '../document-control';

describe('documentControlApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists documents with filters', () => {
    documentControlApi.listDocuments({ documentType: 'PROCEDURE' });
    expect(mockGet).toHaveBeenCalledWith('/documents', { params: { documentType: 'PROCEDURE' } });
  });

  it('lists record form landing index', () => {
    documentControlApi.listRecordFormIndex({ department: '产品开发部' });
    expect(mockGet).toHaveBeenCalledWith('/documents/record-form-index', { params: { department: '产品开发部' } });
  });

  it('loads workbench with days parameter', () => {
    documentControlApi.getWorkbench(45);
    expect(mockGet).toHaveBeenCalledWith('/documents/control/workbench', { params: { days: 45 } });
  });
});
```

- [ ] **Step 3: Run test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/client
npm test -- src/api/__tests__/document-control.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit frontend API**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add client/src/api/document-control.ts client/src/api/__tests__/document-control.spec.ts
git commit -m "feat: add document control api client"
```

Expected: commit contains typed API wrapper and test.

---

### Task 8: Build System File Library Page

**Files:**
- Create: `client/src/views/documents/SystemFileLibrary.vue`
- Test: `client/src/views/documents/__tests__/SystemFileLibrary.spec.ts`

- [ ] **Step 1: Create system file library page**

Create `client/src/views/documents/SystemFileLibrary.vue`:

```vue
<template>
  <div class="system-file-library">
    <aside class="library-tree">
      <button
        v-for="folder in folders"
        :key="folder.value"
        class="folder-button"
        :class="{ active: filters.sourceFolder === folder.value }"
        @click="selectFolder(folder.value)"
      >
        <strong>{{ folder.value }}</strong>
        <span>{{ folder.label }}</span>
      </button>
    </aside>

    <main class="library-main">
      <div class="toolbar">
        <el-input v-model="filters.keyword" placeholder="搜索编号、标题、正文" clearable @keyup.enter="fetchDocuments" />
        <el-select v-model="filters.documentType" clearable placeholder="文件类型">
          <el-option v-for="type in documentTypes" :key="type.value" :value="type.value" :label="type.label" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="状态">
          <el-option value="effective" label="有效" />
          <el-option value="draft" label="草稿" />
          <el-option value="pending_review" label="待审核" />
          <el-option value="archived" label="归档" />
          <el-option value="obsolete" label="作废" />
        </el-select>
        <el-button type="primary" @click="fetchDocuments">搜索</el-button>
      </div>

      <el-table :data="documents" v-loading="loading" stripe>
        <el-table-column prop="number" label="编号" width="160" />
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
        <el-table-column label="类型" width="150">
          <template #default="{ row }">{{ typeLabel(row.document_type) }}</template>
        </el-table-column>
        <el-table-column prop="owner_department" label="负责部门" width="140" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><el-tag>{{ row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column label="复审日期" width="140">
          <template #default="{ row }">{{ formatDate(row.review_due_date) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/documents/${row.id}`)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { documentControlApi, type DocumentControlDocument } from '@/api/document-control';

const router = useRouter();
const loading = ref(false);
const documents = ref<DocumentControlDocument[]>([]);

const folders = [
  { value: '01', label: '管理手册' },
  { value: '02', label: '程序文件' },
  { value: '03', label: '作业指导书' },
  { value: '04', label: '记录表单索引' },
  { value: '05', label: '公司文件' },
  { value: '06', label: '外来文件' },
];

const documentTypes = [
  { value: 'MANUAL', label: '管理手册' },
  { value: 'PROCEDURE', label: '程序文件' },
  { value: 'WORK_INSTRUCTION', label: '作业指导书' },
  { value: 'RECORD_FORM_INDEX', label: '记录表单索引' },
  { value: 'COMPANY_FILE', label: '公司文件' },
  { value: 'EXTERNAL_FILE', label: '外来文件' },
];

const filters = reactive({
  sourceFolder: '',
  documentType: '',
  status: '',
  keyword: '',
});

const typeLabel = (type?: string) => documentTypes.find((item) => item.value === type)?.label || '-';
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('zh-CN') : '-';

const selectFolder = (folder: string) => {
  filters.sourceFolder = folder;
  fetchDocuments();
};

const fetchDocuments = async () => {
  loading.value = true;
  try {
    const res = await documentControlApi.listDocuments({
      sourceFolder: filters.sourceFolder || undefined,
      documentType: filters.documentType || undefined,
      status: filters.status || undefined,
      keyword: filters.keyword || undefined,
      limit: 50,
    });
    documents.value = res.list;
  } catch {
    ElMessage.error('获取体系文件失败');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchDocuments);
</script>

<style scoped>
.system-file-library {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 16px;
}
.library-tree {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.folder-button {
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 6px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}
.folder-button.active {
  border-color: #409eff;
  color: #1677d2;
}
.folder-button span {
  margin-left: 8px;
}
.library-main {
  min-width: 0;
}
.toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 180px 150px auto;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
```

- [ ] **Step 2: Add test**

Create `client/src/views/documents/__tests__/SystemFileLibrary.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockListDocuments = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    listDocuments: (...args: unknown[]) => mockListDocuments(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
}));

const stubs = {
  'el-input': { template: '<input />', props: ['modelValue'] },
  'el-select': { template: '<select><slot /></select>', props: ['modelValue'] },
  'el-option': { template: '<option />' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-tag': { template: '<span><slot /></span>' },
};

import SystemFileLibrary from '../SystemFileLibrary.vue';

describe('SystemFileLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListDocuments.mockResolvedValue({ list: [], total: 0, page: 1, limit: 50 });
  });

  it('loads documents on mount', async () => {
    mount(SystemFileLibrary, { global: { stubs } });
    await flushPromises();
    expect(mockListDocuments).toHaveBeenCalled();
  });

  it('filters by selected source folder', async () => {
    const wrapper = mount(SystemFileLibrary, { global: { stubs } });
    await flushPromises();
    await (wrapper.vm as any).selectFolder('02');
    expect(mockListDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ sourceFolder: '02' }));
  });
});
```

- [ ] **Step 3: Run test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/client
npm test -- src/views/documents/__tests__/SystemFileLibrary.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit library page**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add client/src/views/documents/SystemFileLibrary.vue client/src/views/documents/__tests__/SystemFileLibrary.spec.ts
git commit -m "feat: add system file library"
```

Expected: commit contains only the page and its test.

---

### Task 9: Build Record Form Landing Index And Workbench Pages

**Files:**
- Create: `client/src/views/documents/RecordFormLandingIndex.vue`
- Create: `client/src/views/documents/DocumentControlWorkbench.vue`
- Test: `client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts`
- Test: `client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts`

- [ ] **Step 1: Create record form landing index page**

Create `client/src/views/documents/RecordFormLandingIndex.vue`:

```vue
<template>
  <div class="record-form-landing-index">
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索表单编号或名称" clearable @keyup.enter="fetchRows" />
      <el-button type="primary" @click="fetchRows">搜索</el-button>
    </div>

    <el-table :data="rows" v-loading="loading" stripe>
      <el-table-column prop="code" label="源编号" width="150" />
      <el-table-column prop="formName" label="表单名" min-width="220" show-overflow-tooltip />
      <el-table-column prop="department" label="部门" width="120" />
      <el-table-column prop="chain" label="链路定位" width="130" />
      <el-table-column label="目标入口" min-width="220">
        <template #default="{ row }">
          <el-link v-if="row.landingEntry?.targetRoute" type="primary" @click="openRoute(row.landingEntry.targetRoute)">
            {{ row.landingEntry.targetModule || row.landingEntry.targetRoute }}
          </el-link>
          <el-tag v-else type="warning">待补齐入口</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { documentControlApi, type RecordFormLandingEntry } from '@/api/document-control';

const router = useRouter();
const keyword = ref('');
const loading = ref(false);
const rows = ref<RecordFormLandingEntry[]>([]);

const fetchRows = async () => {
  loading.value = true;
  try {
    rows.value = await documentControlApi.listRecordFormIndex({
      keyword: keyword.value || undefined,
    });
  } catch {
    ElMessage.error('获取记录表单索引失败');
  } finally {
    loading.value = false;
  }
};

const openRoute = (route: string) => {
  router.push(route);
};

onMounted(fetchRows);
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
```

- [ ] **Step 2: Create workbench page**

Create `client/src/views/documents/DocumentControlWorkbench.vue`:

```vue
<template>
  <div class="document-control-workbench">
    <div class="queue-grid">
      <el-card v-for="card in cards" :key="card.key">
        <template #header>
          <span>{{ card.title }}</span>
        </template>
        <strong class="count">{{ workbench?.counts?.[card.key] ?? 0 }}</strong>
      </el-card>
    </div>

    <el-card class="queue-card">
      <template #header>即将复审</template>
      <el-table :data="workbench?.dueForReview || []" v-loading="loading" stripe>
        <el-table-column prop="number" label="编号" width="160" />
        <el-table-column prop="title" label="标题" min-width="220" />
        <el-table-column prop="review_due_date" label="复审日期" width="160" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentControlApi, type WorkbenchResponse } from '@/api/document-control';

const loading = ref(false);
const workbench = ref<WorkbenchResponse | null>(null);

const cards = computed(() => [
  { key: 'pendingReview', title: '待审核' },
  { key: 'dueForReview', title: '即将复审' },
  { key: 'expiringExternalFiles', title: '外来文件到期' },
  { key: 'obsoleteReferences', title: '作废仍被引用' },
  { key: 'brokenReferences', title: '入口失效' },
  { key: 'missingLandingTargets', title: '表单入口缺失' },
  { key: 'missingMetadata', title: '元数据缺失' },
]);

const fetchWorkbench = async () => {
  loading.value = true;
  try {
    workbench.value = await documentControlApi.getWorkbench(30);
  } catch {
    ElMessage.error('获取文控工作台失败');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchWorkbench);
</script>

<style scoped>
.queue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.count {
  font-size: 28px;
}
.queue-card {
  margin-top: 12px;
}
</style>
```

- [ ] **Step 3: Add tests**

Create `client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockList = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/document-control', () => ({
  documentControlApi: { listRecordFormIndex: (...args: unknown[]) => mockList(...args) },
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }));

const stubs = {
  'el-input': { template: '<input />', props: ['modelValue'] },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
  'el-link': { template: '<a @click="$emit(\'click\')"><slot /></a>' },
  'el-tag': { template: '<span><slot /></span>' },
};

import RecordFormLandingIndex from '../RecordFormLandingIndex.vue';

describe('RecordFormLandingIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

  it('loads landing rows on mount', async () => {
    mount(RecordFormLandingIndex, { global: { stubs } });
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('opens target route without owning record data', async () => {
    const wrapper = mount(RecordFormLandingIndex, { global: { stubs } });
    await flushPromises();
    (wrapper.vm as any).openRoute('/process');
    expect(mockPush).toHaveBeenCalledWith('/process');
  });
});
```

Create `client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockWorkbench = vi.fn();

vi.mock('@/api/document-control', () => ({
  documentControlApi: { getWorkbench: (...args: unknown[]) => mockWorkbench(...args) },
}));
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }));

const stubs = {
  'el-card': { template: '<div><slot name="header" /><slot /></div>' },
  'el-table': { template: '<div><slot /></div>', props: ['data'] },
  'el-table-column': { template: '<div />' },
};

import DocumentControlWorkbench from '../DocumentControlWorkbench.vue';

describe('DocumentControlWorkbench', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkbench.mockResolvedValue({
      counts: { pendingReview: 1, dueForReview: 2 },
      dueForReview: [],
    });
  });

  it('loads workbench queues on mount', async () => {
    const wrapper = mount(DocumentControlWorkbench, { global: { stubs } });
    await flushPromises();
    expect(mockWorkbench).toHaveBeenCalledWith(30);
    expect((wrapper.vm as any).workbench.counts.pendingReview).toBe(1);
  });
});
```

- [ ] **Step 4: Run tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/client
npm test -- src/views/documents/__tests__/RecordFormLandingIndex.spec.ts src/views/documents/__tests__/DocumentControlWorkbench.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit index and workbench pages**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add client/src/views/documents/RecordFormLandingIndex.vue client/src/views/documents/DocumentControlWorkbench.vue client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts
git commit -m "feat: add document control index pages"
```

Expected: commit contains both pages and tests.

---

### Task 10: Wire Routes, Menu, And Detail References

**Files:**
- Modify: `client/src/router/index.ts`
- Modify: `client/src/views/Layout.vue`
- Modify: `client/src/views/documents/DocumentDetail.vue`
- Test: update `client/src/views/documents/__tests__/DocumentDetail.spec.ts`

- [ ] **Step 1: Add routes**

In `client/src/router/index.ts`, add document-control routes near existing document routes:

```ts
{
  path: 'documents/control/library',
  name: 'SystemFileLibrary',
  component: () => import('@/views/documents/SystemFileLibrary.vue'),
  meta: { title: '体系文件库' },
},
{
  path: 'documents/control/record-form-index',
  name: 'RecordFormLandingIndex',
  component: () => import('@/views/documents/RecordFormLandingIndex.vue'),
  meta: { title: '记录表单索引' },
},
{
  path: 'documents/control/workbench',
  name: 'DocumentControlWorkbench',
  component: () => import('@/views/documents/DocumentControlWorkbench.vue'),
  meta: { title: '文控工作台' },
},
```

- [ ] **Step 2: Add menu entries**

In `client/src/views/Layout.vue`, add a document-control menu group:

```ts
{
  title: '文控中心',
  icon: Document,
  children: [
    { path: '/documents/control/library', title: '体系文件库', icon: Document },
    { path: '/documents/control/record-form-index', title: '记录表单索引', icon: List },
    { path: '/documents/control/workbench', title: '文控工作台', icon: DataAnalysis },
    { path: '/documents/level/1', title: '旧版文档列表', icon: Document },
  ],
},
```

If `List` or `DataAnalysis` is not already imported in `Layout.vue`, add it to the existing Element Plus icon import.

- [ ] **Step 3: Show metadata and references in detail**

In `DocumentDetail.vue`, add below the existing descriptions:

```vue
<el-card class="control-card" v-if="document">
  <template #header>文控信息</template>
  <el-descriptions :column="2" border>
    <el-descriptions-item label="文件类型">{{ document.document_type || '-' }}</el-descriptions-item>
    <el-descriptions-item label="来源分类">{{ document.source_folder || '-' }}</el-descriptions-item>
    <el-descriptions-item label="负责部门">{{ document.owner_department || '-' }}</el-descriptions-item>
    <el-descriptions-item label="复审日期">{{ document.review_due_date ? formatDate(document.review_due_date) : '-' }}</el-descriptions-item>
  </el-descriptions>
</el-card>

<el-card class="reference-card" v-if="document?.sourceReferences?.length || document?.targetReferences?.length">
  <template #header>引用关系</template>
  <el-table :data="document.sourceReferences || []" stripe>
    <el-table-column prop="relationType" label="关系" width="150" />
    <el-table-column label="目标">
      <template #default="{ row }">
        {{ row.targetDoc?.title || row.targetLabel || row.targetRoute || row.targetId }}
      </template>
    </el-table-column>
  </el-table>
</el-card>
```

Extend the `Document` interface in the same file:

```ts
  document_type?: string;
  source_folder?: string;
  owner_department?: string;
  review_due_date?: string;
  sourceReferences?: Array<{
    id: string;
    relationType: string;
    targetLabel?: string;
    targetRoute?: string;
    targetId?: string;
    targetDoc?: { id: string; title: string; status: string } | null;
  }>;
  targetReferences?: unknown[];
```

- [ ] **Step 4: Update detail test**

In `DocumentDetail.spec.ts`, extend `mockDocument`:

```ts
document_type: 'PROCEDURE',
source_folder: '02',
owner_department: '品质部',
review_due_date: '2026-05-30T00:00:00Z',
sourceReferences: [
  { id: 'ref1', relationType: 'REQUIRES_RECORD', targetLabel: '研发流程', targetRoute: '/process' },
],
targetReferences: [],
```

Add test:

```ts
it('renders document control metadata and references', async () => {
  const c = w();
  await flushPromises();
  expect((c.vm as any).document.document_type).toBe('PROCEDURE');
  expect((c.vm as any).document.sourceReferences).toHaveLength(1);
});
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/client
npm test -- src/views/documents/__tests__/DocumentDetail.spec.ts src/views/documents/__tests__/SystemFileLibrary.spec.ts src/views/documents/__tests__/RecordFormLandingIndex.spec.ts src/views/documents/__tests__/DocumentControlWorkbench.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit routing and detail updates**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add client/src/router/index.ts client/src/views/Layout.vue client/src/views/documents/DocumentDetail.vue client/src/views/documents/__tests__/DocumentDetail.spec.ts
git commit -m "feat: wire document control frontend"
```

Expected: commit contains route/menu/detail updates.

---

### Task 11: Final Verification And Documentation Notes

**Files:**
- Modify if needed: `docs/superpowers/specs/2026-04-26-document-control-center-design.md`
- Modify if needed: `docs/PROJECT_STRUCTURE.md`

- [ ] **Step 1: Run backend targeted tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm test -- document-control-metadata.service.spec.ts document.service.spec.ts document-lifecycle.service.spec.ts document-reference.service.spec.ts record-form-landing.service.spec.ts document-control-workbench.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run frontend targeted tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/client
npm test -- src/api/__tests__/document-control.spec.ts src/views/documents/__tests__/SystemFileLibrary.spec.ts src/views/documents/__tests__/RecordFormLandingIndex.spec.ts src/views/documents/__tests__/DocumentControlWorkbench.spec.ts src/views/documents/__tests__/DocumentDetail.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Run type checks**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm run build
```

Expected: Nest build exits 0.

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/client
npx vue-tsc --noEmit
```

Expected: type check exits 0.

- [ ] **Step 4: Verify model-landing artifact was not reclassified**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54/server
npm run model-landing:verify
```

Expected: verification exits 0. If it fails, inspect whether implementation accidentally modified generated model-landing artifacts; do not reclassify the 283 forms as part of this task.

- [ ] **Step 5: Check no `.superpowers/` artifacts are staged**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git status --short
```

Expected: no `.superpowers/` files are staged. It may remain untracked from brainstorming and should not be committed.

- [ ] **Step 6: Update project structure if routes changed**

If `docs/PROJECT_STRUCTURE.md` still describes document management only as `三级文档管理、版本控制、归档作废`, update its document module description to:

```markdown
| `document/` | 文控中心、01-06体系文件、记录表单落地索引、版本/审批/归档作废 | `document.service.ts`, `document.controller.ts` |
```

Then run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git add docs/PROJECT_STRUCTURE.md
git commit -m "docs: update document control structure"
```

Expected: commit only if the docs file changed.

- [ ] **Step 7: Final implementation commit if verification-only changes remain**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-54
git status --short
```

If only intended implementation files remain unstaged, run:

```bash
git add server client docs/PROJECT_STRUCTURE.md
git commit -m "feat: complete document control center phase one"
```

Expected: final commit contains only intended leftovers. If there are no leftovers, do not create an empty commit.

---

## Self-Review

- Spec coverage: Tasks 1-3 cover file type model, metadata, and library filters. Tasks 4-5 cover lifecycle, workbench, and references. Task 6 covers `04` record-form landing index without owning records. Tasks 7-10 cover frontend API, pages, routes, and detail references. Task 11 covers verification and documentation.
- Placeholder scan: This plan avoids unresolved markers, deferred implementation language, cross-task shorthand, and vague edge-case instructions.
- Type consistency: Backend uses snake_case Prisma fields to match the existing schema; frontend interfaces mirror API response fields. Generic reference fields use `targetType`, `targetId`, `targetRoute`, `targetLabel`, and `relationType` consistently.
