# 文控文件与记录表单治理中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于现有文控、记录表单、动态表单、编号规则和 Markdown 引用能力，完成“受控文件修订 + 04 记录表单落地治理 + 编号规则 + 引用健康 + 工作台问题闭环”。

**Architecture:** 不新建平行系统，所有能力都在现有 `Document`、`DocumentVersion`、`NumberRule`、`RecordFormLandingEntry`、`RecordTemplate`、`DocumentReference`、`DocumentControlWorkbenchService` 上增强。后端先补 Prisma schema、DTO、service、controller 契约，前端复用现有文控页面和动态表单页面，只重整详情展示、落地治理和问题处理入口。

**Tech Stack:** NestJS, Prisma, PostgreSQL, Vue 3, Element Plus, Vitest, Jest, npm workspaces, Node 20。

---

## 0. 前置阅读与执行边界

实施前必须阅读：

- `docs/AGENT_GUIDE.md`
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `docs/superpowers/specs/2026-04-28-document-control-and-record-form-governance-design.md`
- `server/src/prisma/schema.prisma`

执行边界：

- `04 记录表单索引` 只做索引、落地关系、引用目标和治理入口。
- 已由研发、供应商、检验、生产等业务模块承接的表单，不复制为动态表单。
- 动态表单只承接没有独立业务模块的简单记录。
- 供应商证照、外检报告、产品外检 PDF 的有效期维护不放进体系文件中心主流程。
- 证据链服务和 API 保留，左侧主菜单不恢复独立入口。

## 1. 文件结构

### 后端

- Modify: `server/src/prisma/schema.prisma`  
  扩展 `NumberRule`、`RecordFormLandingEntry`、`RecordTemplate`、`Document` 字段，不重建表。
- Create: `server/src/prisma/migrations/20260428000000_document_control_record_form_governance/migration.sql`  
  添加字段、索引、默认值和兼容迁移。
- Modify: `server/src/modules/document/constants/document-control.constants.ts`  
  增加编号规则 scope、落地状态、确认状态、字段覆盖状态、引用 targetType 常量。
- Modify: `server/src/modules/document/dto/document-control.dto.ts`  
  扩展记录表单索引、编号规则、引用健康、工作台 issue DTO。
- Create: `server/src/modules/document/services/number-rule.service.ts`  
  统一负责文控范围编号规则的格式化、序号生成、锁定和预览。
- Modify: `server/src/modules/document/document.module.ts`  
  注册 `NumberRuleService`。
- Modify: `server/src/modules/document/document.controller.ts`  
  新增编号规则、文档修订、记录表单落地建议和确认 API。
- Modify: `server/src/modules/document/document.service.ts`  
  复用 `NumberRuleService` 生成文档编号，增加修订草稿创建和 Markdown 草稿保存约束。
- Modify: `server/src/modules/document/document-lifecycle.service.ts`  
  发布新版本时 supersede 旧版本，保持旧版本历史可查。
- Modify: `server/src/modules/document/services/record-form-landing.service.ts`  
  增加落地状态、系统建议、管理员确认、字段覆盖摘要。
- Modify: `server/src/modules/document/services/markdown-wikilink.service.ts`  
  扩展 wikilink 解析，让记录表单编号解析到 `RecordFormLandingEntry`。
- Modify: `server/src/modules/document/services/document-reference-health.service.ts`  
  引用健康扩展 `unimplemented` 和记录表单落地状态。
- Modify: `server/src/modules/document/services/document-control-workbench.service.ts`  
  把记录表单落地问题、引用问题并入现有文控工作台问题清单。
- Modify: `server/src/modules/record-template/record-template.controller.ts`  
  补齐 `PUT /record-templates/:id/fields`，新增模板修订、提交、启用 API。
- Modify: `server/src/modules/record-template/record-template.service.ts`  
  改造模板版本语义，禁止已启用模板原地改字段。

### 前端

- Modify: `client/src/api/document-control.ts`  
  增加编号规则、文档修订、落地建议、落地确认、字段覆盖、引用问题 API。
- Modify: `client/src/api/record-template.ts`  
  对齐后端 `PUT /record-templates/:id/fields`，补模板修订 API 类型。
- Modify: `client/src/views/documents/DocumentDetail.vue`  
  合并文档信息区、修正版本显示、改按钮为“发起修订/编辑草稿”。
- Modify: `client/src/views/documents/RecordFormLandingIndex.vue`  
  增加落地状态、确认状态、字段覆盖、系统建议和一键处理。
- Create: `client/src/views/documents/NumberRuleCenter.vue`  
  文控范围编号规则配置页。
- Modify: `client/src/router/index.ts`  
  增加编号规则路由，保留证据链路由但不作为主菜单入口。
- Modify: `client/src/views/Layout.vue`  
  增加“编号规则”菜单，确认不恢复“审核链路/证据链”入口。
- Modify: `client/src/views/templates/TemplateDesigner.vue`  
  使用契约一致的字段保存 API，已启用模板引导走“发起改版”。
- Modify: `client/src/views/documents/SystemDocumentCenter.vue`  
  聚合文件引用问题和记录表单引用问题。
- Modify: `client/src/views/documents/DocumentControlIssueList.vue`  
  支持新的记录表单落地问题类型。
- Modify: `client/src/views/documents/DocumentControlWorkbench.vue`  
  显示记录表单落地问题和引用健康问题计数。

### 测试

- Modify: `server/src/modules/document/document.service.spec.ts`
- Modify: `server/src/modules/document/document-lifecycle.service.spec.ts`
- Modify: `server/src/modules/document/services/record-form-landing.service.spec.ts`
- Modify: `server/src/modules/document/services/markdown-wikilink.service.spec.ts`
- Modify: `server/src/modules/document/services/document-reference-health.service.spec.ts`
- Modify: `server/src/modules/document/services/document-control-workbench.service.spec.ts`
- Modify: `server/src/modules/record-template/record-template.service.spec.ts`
- Create: `server/src/modules/document/services/number-rule.service.spec.ts`
- Modify: `client/src/views/documents/__tests__/DocumentDetail.spec.ts`
- Modify: `client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts`
- Create: `client/src/views/documents/__tests__/NumberRuleCenter.spec.ts`
- Modify: `client/src/views/templates/__tests__/TemplateDesigner.spec.ts`
- Modify: `client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts`
- Modify: `client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts`

---

### Task 1: Prisma Schema 与共享常量

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260428000000_document_control_record_form_governance/migration.sql`
- Modify: `server/src/modules/document/constants/document-control.constants.ts`
- Modify: `server/src/modules/document/dto/document-control.dto.ts`

- [ ] **Step 1: 扩展 Prisma schema**

在 `server/src/prisma/schema.prisma` 中修改现有模型，不新建平行表。

```prisma
model NumberRule {
  id              String     @id
  level           Int
  departmentId    String
  department      Department @relation(fields: [departmentId], references: [id], onDelete: Restrict)
  sequence        Int        @default(0)
  scope           String     @default("document")
  sourceFolder    String?
  prefix          String?
  categoryCode    String?
  format          String?
  sequencePadding Int        @default(3)
  separator       String     @default("-")
  resetPolicy     String     @default("none")
  isActive        Boolean    @default(true)
  lockedAfterUse  Boolean    @default(true)
  usedCount       Int        @default(0)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@unique([scope, level, departmentId, sourceFolder])
  @@index([scope])
  @@index([sourceFolder])
  @@index([isActive])
  @@map("number_rules")
}

model PendingNumber {
  id           String     @id
  level        Int
  departmentId String
  department   Department @relation(fields: [departmentId], references: [id], onDelete: Restrict)
  number       String
  scope        String     @default("document")
  sourceFolder String?
  deletedAt    DateTime   @default(now())

  @@unique([scope, level, departmentId, sourceFolder, number])
  @@map("pending_numbers")
}

model Document {
  id         String    @id
  level      Int
  number     String    @unique
  title      String
  filePath   String
  fileName   String
  fileSize   Int
  fileType   String
  version    Decimal   @default(1.0) @db.Decimal(3, 1)
  versionNo  Int       @default(1)
  revisionOfId String?
  revisionOf   Document?  @relation("DocumentRevisions", fields: [revisionOfId], references: [id], onDelete: SetNull)
  revisions    Document[] @relation("DocumentRevisions")
  revisionStatus String   @default("current")
  status     String
  creatorId  String
  creator    User      @relation("DocumentCreator", fields: [creatorId], references: [id], onDelete: Restrict)
  approverId         String?
  approver           User?     @relation("DocumentApprover", fields: [approverId], references: [id], onDelete: SetNull)
  approvedAt         DateTime?
  approvalInstanceId String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?
}

model RecordTemplate {
  id             String    @id @default(cuid())
  code           String    @unique
  name           String
  fieldsJson     Json
  version        Int       @default(1)
  templateFamilyId String?
  baseCode       String?
  versionStatus  String    @default("active")
  supersedesId   String?
  supersedes     RecordTemplate?  @relation("RecordTemplateVersions", fields: [supersedesId], references: [id], onDelete: SetNull)
  supersededBy   RecordTemplate[] @relation("RecordTemplateVersions")
  effectiveAt    DateTime?
  retiredAt      DateTime?
  approvedBy     String?
  approvedAt     DateTime?
  retentionYears Int       @default(5)
  status         String    @default("active")
  description    String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  @@index([code])
  @@index([baseCode])
  @@index([templateFamilyId])
  @@index([versionStatus])
  @@index([status])
  @@map("record_templates")
}

model RecordFormLandingEntry {
  id              String   @id @default(cuid())
  sourceCode      String   @unique
  targetModule    String?
  targetModel     String?
  targetRoute     String?
  targetTemplateId String?
  targetTemplate   RecordTemplate? @relation(fields: [targetTemplateId], references: [id], onDelete: SetNull)
  landingStrategy String?
  landingStatus   String   @default("unimplemented")
  confirmationStatus String @default("unconfirmed")
  confidence      String?
  confirmedBy     String?
  confirmedAt     DateTime?
  fieldCoverageStatus String @default("unknown")
  fieldCoverageSummary Json?
  primaryRoute    String?
  sourceFormVersion String?
  relatedDocIds   String[] @default([])
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([targetModule])
  @@index([targetModel])
  @@index([landingStrategy])
  @@index([landingStatus])
  @@index([confirmationStatus])
  @@index([fieldCoverageStatus])
  @@index([targetTemplateId])
  @@map("record_form_landing_entries")
}
```

- [ ] **Step 2: 创建迁移 SQL**

Create `server/src/prisma/migrations/20260428000000_document_control_record_form_governance/migration.sql`:

```sql
ALTER TABLE "number_rules"
  ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS "source_folder" TEXT,
  ADD COLUMN IF NOT EXISTS "prefix" TEXT,
  ADD COLUMN IF NOT EXISTS "category_code" TEXT,
  ADD COLUMN IF NOT EXISTS "format" TEXT,
  ADD COLUMN IF NOT EXISTS "sequence_padding" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "separator" TEXT NOT NULL DEFAULT '-',
  ADD COLUMN IF NOT EXISTS "reset_policy" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "locked_after_use" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "used_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "pending_numbers"
  ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS "source_folder" TEXT;

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "version_no" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "revision_of_id" TEXT,
  ADD COLUMN IF NOT EXISTS "revision_status" TEXT NOT NULL DEFAULT 'current';

ALTER TABLE "record_templates"
  ADD COLUMN IF NOT EXISTS "template_family_id" TEXT,
  ADD COLUMN IF NOT EXISTS "base_code" TEXT,
  ADD COLUMN IF NOT EXISTS "version_status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "supersedes_id" TEXT,
  ADD COLUMN IF NOT EXISTS "effective_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retired_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approved_by" TEXT,
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);

UPDATE "record_templates"
SET "base_code" = regexp_replace("code", '-v[0-9]+$', ''),
    "template_family_id" = COALESCE("template_family_id", regexp_replace("code", '-v[0-9]+$', ''))
WHERE "base_code" IS NULL OR "template_family_id" IS NULL;

ALTER TABLE "record_form_landing_entries"
  ADD COLUMN IF NOT EXISTS "landing_status" TEXT NOT NULL DEFAULT 'unimplemented',
  ADD COLUMN IF NOT EXISTS "confirmation_status" TEXT NOT NULL DEFAULT 'unconfirmed',
  ADD COLUMN IF NOT EXISTS "confidence" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmed_by" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "field_coverage_status" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "field_coverage_summary" JSONB,
  ADD COLUMN IF NOT EXISTS "primary_route" TEXT,
  ADD COLUMN IF NOT EXISTS "source_form_version" TEXT;

CREATE INDEX IF NOT EXISTS "number_rules_scope_idx" ON "number_rules"("scope");
CREATE INDEX IF NOT EXISTS "number_rules_source_folder_idx" ON "number_rules"("source_folder");
CREATE INDEX IF NOT EXISTS "number_rules_is_active_idx" ON "number_rules"("is_active");
CREATE INDEX IF NOT EXISTS "record_templates_base_code_idx" ON "record_templates"("base_code");
CREATE INDEX IF NOT EXISTS "record_templates_template_family_id_idx" ON "record_templates"("template_family_id");
CREATE INDEX IF NOT EXISTS "record_templates_version_status_idx" ON "record_templates"("version_status");
CREATE INDEX IF NOT EXISTS "record_form_landing_entries_landing_status_idx" ON "record_form_landing_entries"("landing_status");
CREATE INDEX IF NOT EXISTS "record_form_landing_entries_confirmation_status_idx" ON "record_form_landing_entries"("confirmation_status");
CREATE INDEX IF NOT EXISTS "record_form_landing_entries_field_coverage_status_idx" ON "record_form_landing_entries"("field_coverage_status");
```

- [ ] **Step 3: 增加共享常量**

Modify `server/src/modules/document/constants/document-control.constants.ts`:

```ts
export const NUMBER_RULE_SCOPES = ['document', 'record_template'] as const;
export type NumberRuleScope = typeof NUMBER_RULE_SCOPES[number];

export const LANDING_STRATEGIES = [
  'business_module',
  'dynamic_form',
  'partial',
  'unimplemented',
  'not_suitable',
] as const;

export const LANDING_STATUSES = [
  'business_module',
  'dynamic_form',
  'partial',
  'unimplemented',
  'not_suitable',
  'conflict',
] as const;

export const LANDING_CONFIRMATION_STATUSES = [
  'unconfirmed',
  'suggested',
  'confirmed',
  'rejected',
] as const;

export const FIELD_COVERAGE_STATUSES = [
  'unknown',
  'covered',
  'partial',
  'missing',
  'not_required',
] as const;

export const REFERENCE_TARGET_TYPES = [
  'document',
  'unresolved_document',
  'conflict_document',
  'record_form_landing',
  'unresolved_record_form',
  'conflict_record_form',
  'record_template',
  'business_module',
  'business_object',
] as const;
```

- [ ] **Step 4: 扩展 DTO**

Modify `server/src/modules/document/dto/document-control.dto.ts`:

```ts
export class UpsertNumberRuleDto {
  @IsIn(NUMBER_RULE_SCOPES)
  scope!: string;

  @Type(() => Number)
  level!: number;

  @IsString()
  departmentId!: string;

  @IsOptional()
  @IsString()
  sourceFolder?: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsString()
  categoryCode?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @Type(() => Number)
  sequencePadding?: number;

  @IsOptional()
  @IsString()
  separator?: string;

  @IsOptional()
  @IsString()
  resetPolicy?: string;
}

export class ConfirmRecordFormLandingDto extends UpdateRecordFormLandingEntryDto {
  @IsIn(LANDING_STATUSES)
  landingStatus!: string;

  @IsOptional()
  @IsIn(LANDING_CONFIRMATION_STATUSES)
  confirmationStatus?: string;

  @IsOptional()
  @IsString()
  confidence?: string;

  @IsOptional()
  @IsIn(FIELD_COVERAGE_STATUSES)
  fieldCoverageStatus?: string;

  @IsOptional()
  @IsObject()
  fieldCoverageSummary?: Record<string, unknown>;
}
```

- [ ] **Step 5: 验证 Prisma 生成**

Run:

```bash
npm run prisma:generate -w server
```

Expected:

```text
Generated Prisma Client
```

- [ ] **Step 6: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260428000000_document_control_record_form_governance/migration.sql server/src/modules/document/constants/document-control.constants.ts server/src/modules/document/dto/document-control.dto.ts
git commit -m "feat: extend document control governance schema"
```

---

### Task 2: 编号规则后端

**Files:**
- Create: `server/src/modules/document/services/number-rule.service.ts`
- Create: `server/src/modules/document/services/number-rule.service.spec.ts`
- Modify: `server/src/modules/document/document.module.ts`
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/document.service.ts`

- [ ] **Step 1: 写失败测试**

Create `server/src/modules/document/services/number-rule.service.spec.ts`:

```ts
import { NumberRuleService } from './number-rule.service';

describe('NumberRuleService', () => {
  const department = { id: 'dept-pz', code: 'PZ' };

  function createPrisma(rule?: any, pending?: any) {
    const tx: any = {
      pendingNumber: {
        findFirst: jest.fn().mockResolvedValue(pending ?? null),
        delete: jest.fn().mockResolvedValue({}),
      },
      department: {
        findUnique: jest.fn().mockResolvedValue(department),
      },
      $queryRaw: jest.fn().mockResolvedValue(rule ? [{ id: rule.id, sequence: rule.sequence }] : []),
      numberRule: {
        create: jest.fn().mockResolvedValue({ id: 'rule-1', sequence: 0 }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    return {
      tx,
      prisma: {
        $transaction: jest.fn((callback) => callback(tx)),
        numberRule: {
          findMany: jest.fn().mockResolvedValue([]),
          upsert: jest.fn(),
          update: jest.fn(),
        },
      },
    };
  }

  it('uses configured format for document numbers', async () => {
    const { prisma } = createPrisma({
      id: 'rule-1',
      sequence: 7,
      prefix: 'GRSS',
      categoryCode: 'ZD',
      format: '{prefix}-{departmentCode}-{categoryCode}-{sequence}',
      sequencePadding: 2,
      separator: '-',
    });
    const service = new NumberRuleService(prisma as any);

    const result = await service.generate({
      scope: 'document',
      level: 3,
      departmentId: 'dept-pz',
      sourceFolder: '03',
      fallbackCategoryCode: 'ZD',
    });

    expect(result).toBe('GRSS-PZ-ZD-08');
  });

  it('keeps pending number reuse in the same scope', async () => {
    const { prisma, tx } = createPrisma(undefined, { id: 'pending-1', number: 'GRSS-PZ-ZD-03' });
    const service = new NumberRuleService(prisma as any);

    const result = await service.generate({
      scope: 'document',
      level: 3,
      departmentId: 'dept-pz',
      sourceFolder: '03',
    });

    expect(result).toBe('GRSS-PZ-ZD-03');
    expect(tx.pendingNumber.delete).toHaveBeenCalledWith({ where: { id: 'pending-1' } });
  });
});
```

- [ ] **Step 2: 运行失败测试**

Run:

```bash
npm run test -w server -- number-rule.service.spec.ts --runInBand
```

Expected:

```text
FAIL server/src/modules/document/services/number-rule.service.spec.ts
Cannot find module './number-rule.service'
```

- [ ] **Step 3: 实现 `NumberRuleService`**

Create `server/src/modules/document/services/number-rule.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Snowflake } from '../../../common/utils';

export interface GenerateNumberInput {
  scope: 'document' | 'record_template';
  level: number;
  departmentId: string;
  sourceFolder?: string | null;
  fallbackCategoryCode?: string | null;
}

@Injectable()
export class NumberRuleService {
  private readonly snowflake = new Snowflake(1, 1);

  constructor(private readonly prisma: PrismaService) {}

  async generate(input: GenerateNumberInput): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const pending = await tx.pendingNumber.findFirst({
        where: {
          scope: input.scope,
          level: input.level,
          departmentId: input.departmentId,
          sourceFolder: input.sourceFolder ?? null,
        },
        orderBy: { deletedAt: 'asc' },
      });

      if (pending) {
        await tx.pendingNumber.delete({ where: { id: pending.id } });
        return pending.number;
      }

      const department = await tx.department.findUnique({ where: { id: input.departmentId } });
      if (!department) throw new NotFoundException('部门不存在');

      const rows = await tx.$queryRaw<Array<{
        id: string;
        sequence: number;
        prefix?: string | null;
        category_code?: string | null;
        format?: string | null;
        sequence_padding?: number | null;
        separator?: string | null;
      }>>`
        SELECT id, sequence, prefix, category_code, format, sequence_padding, separator
        FROM number_rules
        WHERE scope = ${input.scope}
          AND level = ${input.level}
          AND department_id = ${input.departmentId}
          AND (source_folder IS NOT DISTINCT FROM ${input.sourceFolder ?? null})
          AND is_active = true
        FOR UPDATE
      `;

      let rule = rows[0];
      if (!rule) {
        const created = await tx.numberRule.create({
          data: {
            id: this.snowflake.nextId(),
            scope: input.scope,
            level: input.level,
            departmentId: input.departmentId,
            sourceFolder: input.sourceFolder ?? null,
            sequence: 0,
            categoryCode: input.fallbackCategoryCode ?? null,
          },
        });
        rule = {
          id: created.id,
          sequence: created.sequence,
          prefix: created.prefix,
          category_code: created.categoryCode,
          format: created.format,
          sequence_padding: created.sequencePadding,
          separator: created.separator,
        };
      }

      const nextSequence = rule.sequence + 1;
      await tx.numberRule.update({
        where: { id: rule.id },
        data: { sequence: nextSequence, usedCount: { increment: 1 } },
      });

      return this.formatNumber({
        level: input.level,
        departmentCode: department.code,
        sequence: nextSequence,
        prefix: rule.prefix ?? '',
        categoryCode: rule.category_code ?? input.fallbackCategoryCode ?? '',
        format: rule.format ?? '{level}-{departmentCode}-{sequence}',
        sequencePadding: rule.sequence_padding ?? 3,
        separator: rule.separator ?? '-',
      });
    });
  }

  formatNumber(input: {
    level: number;
    departmentCode: string;
    sequence: number;
    prefix: string;
    categoryCode: string;
    format: string;
    sequencePadding: number;
    separator: string;
  }) {
    if (input.sequencePadding < 1 || input.sequencePadding > 8) {
      throw new BadRequestException('序号位数必须在 1 到 8 之间');
    }
    const sequence = String(input.sequence).padStart(input.sequencePadding, '0');
    return input.format
      .replaceAll('{prefix}', input.prefix)
      .replaceAll('{level}', String(input.level))
      .replaceAll('{departmentCode}', input.departmentCode)
      .replaceAll('{categoryCode}', input.categoryCode)
      .replaceAll('{sequence}', sequence)
      .replaceAll('--', input.separator)
      .replace(new RegExp(`${input.separator}$`), '');
  }
}
```

- [ ] **Step 4: 注册 service**

Modify `server/src/modules/document/document.module.ts` providers:

```ts
providers: [
  DocumentService,
  DocumentCronService,
  DocumentReferenceService,
  MarkdownWikilinkService,
  DocumentReferenceHealthService,
  BusinessDocumentLinkService,
  DocumentExpiryService,
  DocumentLifecycleService,
  DocumentControlMetadataService,
  DocumentControlWorkbenchService,
  RecordFormLandingService,
  NumberRuleService,
  DocumentReadRequirementService,
  DocumentTrainingNeedService,
  DocumentAuditCoverageService,
  DocumentImpactService,
  DocumentHealthService,
  DocumentAuditChainService,
  DocumentEvidenceChainService,
  FilePreviewService,
  StorageService,
  StatisticsCacheInterceptor,
  PermissionGuard,
  DocumentsListener,
],
```

- [ ] **Step 5: 文档编号改用 `NumberRuleService`**

Modify `server/src/modules/document/document.service.ts` constructor and method:

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly storage: StorageService,
  private readonly notification: NotificationService,
  private readonly operationLog: OperationLogService,
  private readonly eventEmitter: EventEmitter2,
  private readonly metadataService: DocumentControlMetadataService,
  private readonly filePreviewService: FilePreviewService,
  private readonly markdownWikilinkService: MarkdownWikilinkService,
  private readonly numberRuleService: NumberRuleService,
  @Optional() private readonly approvalEngine?: ApprovalEngineService,
) {
  this.snowflake = new Snowflake(1, 1);
}

async generateDocumentNumber(level: number, departmentId: string, sourceFolder?: string | null): Promise<string> {
  return this.numberRuleService.generate({
    scope: 'document',
    level,
    departmentId,
    sourceFolder: sourceFolder ?? null,
    fallbackCategoryCode: this.categoryCodeForSourceFolder(sourceFolder),
  });
}

private categoryCodeForSourceFolder(sourceFolder?: string | null) {
  const map: Record<string, string> = {
    '01': 'SC',
    '02': 'CX',
    '03': 'ZD',
    '04': 'JL',
    '05': 'GS',
    '06': 'WL',
  };
  return sourceFolder ? map[sourceFolder] : undefined;
}
```

In `create()`, call:

```ts
const number = await this.generateDocumentNumber(dto.level, user.departmentId, controlData.source_folder as string | undefined);
```

- [ ] **Step 6: 增加编号规则 API**

Modify `server/src/modules/document/document.controller.ts`:

```ts
@Get('number-rules')
@UseGuards(PermissionGuard)
@CheckPermission('document:number_rule_manage')
@ApiOperation({ summary: '查询文控编号规则' })
listNumberRules() {
  return this.numberRuleService.list();
}

@Post('number-rules')
@UseGuards(PermissionGuard)
@CheckPermission('document:number_rule_manage')
@ApiOperation({ summary: '创建或更新文控编号规则' })
upsertNumberRule(@Body() dto: UpsertNumberRuleDto) {
  return this.numberRuleService.upsert(dto);
}

@Post('number-rules/:id/deactivate')
@UseGuards(PermissionGuard)
@CheckPermission('document:number_rule_manage')
@ApiOperation({ summary: '停用文控编号规则' })
deactivateNumberRule(@Param('id') id: string) {
  return this.numberRuleService.deactivate(id);
}
```

- [ ] **Step 7: 运行测试**

Run:

```bash
npm run test -w server -- number-rule.service.spec.ts document.service.spec.ts --runInBand
```

Expected:

```text
PASS server/src/modules/document/services/number-rule.service.spec.ts
PASS server/src/modules/document/document.service.spec.ts
```

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/document/services/number-rule.service.ts server/src/modules/document/services/number-rule.service.spec.ts server/src/modules/document/document.module.ts server/src/modules/document/document.controller.ts server/src/modules/document/document.service.ts
git commit -m "feat: add configurable document number rules"
```

---

### Task 3: 受控文件修订闭环

**Files:**
- Modify: `server/src/modules/document/document.service.ts`
- Modify: `server/src/modules/document/document-lifecycle.service.ts`
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/document.service.spec.ts`
- Modify: `server/src/modules/document/document-lifecycle.service.spec.ts`
- Modify: `client/src/views/documents/DocumentDetail.vue`
- Modify: `client/src/views/documents/__tests__/DocumentDetail.spec.ts`

- [ ] **Step 1: 写后端失败测试**

Add to `server/src/modules/document/document.service.spec.ts`:

```ts
it('creates a revision draft instead of editing an effective document in place', async () => {
  prisma.document.findFirst.mockResolvedValue({
    id: 'doc-v1',
    number: 'GRSS-PZ-ZD-08',
    title: '原物料及产品放行制度',
    level: 3,
    versionNo: 1,
    version: '1.0',
    status: 'effective',
    filePath: 'documents/v1.md',
    fileName: '原物料及产品放行制度.md',
    fileSize: 4900,
    fileType: 'text/markdown',
    creatorId: 'user-1',
    departmentId: 'dept-pz',
    document_type: 'WORK_INSTRUCTION',
    source_folder: '03',
    lineage_key: 'GRSS-PZ-ZD-08',
  });
  prisma.document.create.mockResolvedValue({ id: 'doc-v2', versionNo: 2, status: 'draft', revisionOfId: 'doc-v1' });

  const result = await service.createRevisionDraft('doc-v1', 'user-2');

  expect(prisma.document.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      number: 'GRSS-PZ-ZD-08',
      versionNo: 2,
      status: 'draft',
      revisionOfId: 'doc-v1',
      revisionStatus: 'revision_draft',
    }),
  }));
  expect(result.id).toBe('doc-v2');
});
```

- [ ] **Step 2: 运行失败测试**

Run:

```bash
npm run test -w server -- document.service.spec.ts --runInBand
```

Expected:

```text
FAIL
Property 'createRevisionDraft' does not exist
```

- [ ] **Step 3: 实现修订草稿**

Modify `server/src/modules/document/document.service.ts`:

```ts
async createRevisionDraft(id: string, userId: string) {
  const current = await this.prisma.document.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw new BusinessException(ErrorCode.NOT_FOUND, '文件不存在');
  if (!isEffectiveCompatible(current.status)) {
    throw new BusinessException(ErrorCode.VALIDATION_ERROR, '只有已发布文件可以发起修订');
  }

  const latest = await this.prisma.document.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { id },
        { revisionOfId: id },
        { lineage_key: (current as any).lineage_key ?? current.number },
      ],
    },
    orderBy: { versionNo: 'desc' },
  });

  const nextVersionNo = (latest?.versionNo ?? current.versionNo ?? 1) + 1;
  return this.prisma.document.create({
    data: {
      id: this.snowflake.nextId(),
      level: current.level,
      number: current.number,
      title: current.title,
      filePath: current.filePath,
      fileName: current.fileName,
      fileSize: current.fileSize,
      fileType: current.fileType,
      version: nextVersionNo,
      versionNo: nextVersionNo,
      status: 'draft',
      revisionOfId: current.id,
      revisionStatus: 'revision_draft',
      creatorId: userId,
      departmentId: current.departmentId,
      content: current.content as any,
      document_type: (current as any).document_type,
      source_folder: (current as any).source_folder,
      owner_department: (current as any).owner_department,
      owner_user_id: (current as any).owner_user_id,
      ownerDepartmentId: (current as any).ownerDepartmentId,
      ownerUserId: (current as any).ownerUserId,
      tags: (current as any).tags ?? [],
      metadata: (current as any).metadata as any,
      lineage_key: (current as any).lineage_key ?? current.number,
      review_due_date: (current as any).review_due_date,
      content_md: (current as any).content_md,
    } as any,
  });
}

private assertEditableDraft(document: { status: string; revisionStatus?: string | null }) {
  if (!['draft', 'rejected'].includes(document.status)) {
    throw new BusinessException(ErrorCode.VALIDATION_ERROR, '已发布文件不能原地编辑，请先发起修订');
  }
}
```

In `updateMarkdown()`, before update:

```ts
const document = await this.prisma.document.findFirst({ where: { id, deletedAt: null } });
if (!document) throw new BusinessException(ErrorCode.NOT_FOUND, '文件不存在');
this.assertEditableDraft(document);
```

- [ ] **Step 4: 发布新版本时替代旧版本**

Modify `server/src/modules/document/document-lifecycle.service.ts`:

```ts
async publish(id: string, dto: PublishDocumentDto) {
  const doc = await this.prisma.document.findFirst({ where: { id } });
  if (!doc) throw new NotFoundException('文件不存在');

  const lineageKey = (doc as any).lineage_key ?? doc.number;
  const currentEffective = await this.prisma.document.findFirst({
    where: {
      id: { not: id },
      deletedAt: null,
      status: { in: [...EFFECTIVE_COMPAT_STATUSES] },
      OR: [{ lineage_key: lineageKey }, { number: doc.number }],
    },
  });

  return this.prisma.$transaction(async (tx) => {
    const published = await tx.document.update({
      where: { id },
      data: {
        status: 'effective',
        revisionStatus: 'current',
        effective_date: dto.effective_date ? new Date(dto.effective_date) : new Date(),
        ...(dto.review_due_date ? { review_due_date: new Date(dto.review_due_date) } : {}),
      } as any,
    });

    if (currentEffective) {
      await tx.document.update({
        where: { id: currentEffective.id },
        data: {
          status: 'superseded',
          revisionStatus: 'superseded',
          superseded_by_id: id,
        } as any,
      });
    }

    return published;
  });
}
```

- [ ] **Step 5: 增加 API**

Modify `server/src/modules/document/document.controller.ts`:

```ts
@Post(':id/revisions')
@UseGuards(PermissionGuard)
@CheckPermission('document:revise')
@ApiOperation({ summary: '发起文件修订草稿' })
createRevision(@Param('id') id: string, @Req() req: any) {
  return this.documentService.createRevisionDraft(id, req.user.id);
}
```

- [ ] **Step 6: 前端详情页合并信息与按钮**

Modify `client/src/views/documents/DocumentDetail.vue` script helper:

```ts
const displayVersion = computed(() => {
  const versionNo = Number(document.value?.versionNo || document.value?.version || 1);
  return `V${Number.isFinite(versionNo) ? Math.trunc(versionNo) : 1}`;
});

const fileCategory = computed(() => {
  const sourceFolder = document.value?.source_folder || document.value?.sourceFolder;
  const typeName = documentTypeLabel(document.value?.document_type || document.value?.documentType);
  return sourceFolder ? `${sourceFolder} ${typeName}` : typeName;
});

const canEditDraft = computed(() => ['draft', 'rejected'].includes(document.value?.status || ''));
const canCreateRevision = computed(() => ['effective', 'approved'].includes(document.value?.status || ''));

async function createRevision() {
  const res = await documentControlApi.createRevision(route.params.id as string);
  router.push(`/documents/${res.data.id}`);
}
```

Template field list must include only:

```vue
<el-descriptions :column="2" border>
  <el-descriptions-item label="文档编号">{{ document.number }}</el-descriptions-item>
  <el-descriptions-item label="文件名称">{{ document.title }}</el-descriptions-item>
  <el-descriptions-item label="文件分类">{{ fileCategory }}</el-descriptions-item>
  <el-descriptions-item label="文件类型">{{ document.fileType }}</el-descriptions-item>
  <el-descriptions-item label="状态"><el-tag>{{ statusLabel(document.status) }}</el-tag></el-descriptions-item>
  <el-descriptions-item label="版本号">{{ displayVersion }}</el-descriptions-item>
  <el-descriptions-item label="责任部门">{{ document.owner_department || document.ownerDepartment?.name || '-' }}</el-descriptions-item>
  <el-descriptions-item label="负责人">{{ document.ownerUser?.name || '-' }}</el-descriptions-item>
  <el-descriptions-item label="复审日期">{{ formatDate(document.review_due_date) }}</el-descriptions-item>
  <el-descriptions-item label="创建人">{{ document.creator?.name || '-' }}</el-descriptions-item>
  <el-descriptions-item label="创建时间">{{ formatDateTime(document.createdAt) }}</el-descriptions-item>
</el-descriptions>
```

Button area:

```vue
<el-button v-if="canEditDraft" type="primary" @click="showMarkdownEditor = true">编辑草稿</el-button>
<el-button v-if="canCreateRevision" type="primary" @click="createRevision">发起修订</el-button>
<el-button @click="previewDocument">查看</el-button>
<el-button @click="downloadDocument">下载</el-button>
```

- [ ] **Step 7: 增加前端 API**

Modify `client/src/api/document-control.ts`:

```ts
createRevision(documentId: string) {
  return request.post<DocumentControlDocument>(`/documents/${documentId}/revisions`);
},
```

- [ ] **Step 8: 运行测试**

Run:

```bash
npm run test -w server -- document.service.spec.ts document-lifecycle.service.spec.ts --runInBand
npm run test -w client -- DocumentDetail.spec.ts
```

Expected:

```text
PASS server/src/modules/document/document.service.spec.ts
PASS server/src/modules/document/document-lifecycle.service.spec.ts
PASS client/src/views/documents/__tests__/DocumentDetail.spec.ts
```

- [ ] **Step 9: Commit**

```bash
git add server/src/modules/document/document.service.ts server/src/modules/document/document-lifecycle.service.ts server/src/modules/document/document.controller.ts server/src/modules/document/document.service.spec.ts server/src/modules/document/document-lifecycle.service.spec.ts client/src/views/documents/DocumentDetail.vue client/src/views/documents/__tests__/DocumentDetail.spec.ts client/src/api/document-control.ts
git commit -m "feat: add controlled document revision flow"
```

---

### Task 4: 记录表单索引落地治理

**Files:**
- Modify: `server/src/modules/document/services/record-form-landing.service.ts`
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/services/record-form-landing.service.spec.ts`
- Modify: `client/src/api/document-control.ts`
- Modify: `client/src/views/documents/RecordFormLandingIndex.vue`
- Modify: `client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts`

- [ ] **Step 1: 写后端失败测试**

Add to `server/src/modules/document/services/record-form-landing.service.spec.ts`:

```ts
it('suggests business module landing when model landing has a known route', async () => {
  modelLanding.getFormByCode.mockReturnValue({
    code: 'GRSS-KF-JL-11',
    formName: '研发试验记录',
    department: '产品开发部',
    primaryEntity: 'ProductDevelopment',
    targetRoute: '/process/instances',
  });
  prisma.recordFormLandingEntry.findUnique.mockResolvedValue(null);

  const result = await service.suggest('GRSS-KF-JL-11');

  expect(result).toEqual(expect.objectContaining({
    sourceCode: 'GRSS-KF-JL-11',
    landingStatus: 'business_module',
    confirmationStatus: 'suggested',
    confidence: 'high',
    targetRoute: '/process/instances',
  }));
});

it('confirms landing and stores governance fields', async () => {
  modelLanding.getFormByCode.mockReturnValue({ code: 'GRSS-PZ-JL-01', formName: '检查表' });
  prisma.recordFormLandingEntry.upsert.mockResolvedValue({
    sourceCode: 'GRSS-PZ-JL-01',
    landingStatus: 'dynamic_form',
    confirmationStatus: 'confirmed',
  });

  const result = await service.confirm('GRSS-PZ-JL-01', {
    landingStatus: 'dynamic_form',
    confirmationStatus: 'confirmed',
    targetTemplateId: 'tpl-1',
    fieldCoverageStatus: 'covered',
  } as any, 'admin-1');

  expect(prisma.recordFormLandingEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
    update: expect.objectContaining({
      landingStatus: 'dynamic_form',
      confirmationStatus: 'confirmed',
      confirmedBy: 'admin-1',
    }),
  }));
  expect(result.confirmationStatus).toBe('confirmed');
});
```

- [ ] **Step 2: 运行失败测试**

Run:

```bash
npm run test -w server -- record-form-landing.service.spec.ts --runInBand
```

Expected:

```text
FAIL
Property 'suggest' does not exist
```

- [ ] **Step 3: 实现 suggest / confirm / field coverage**

Modify `server/src/modules/document/services/record-form-landing.service.ts`:

```ts
async suggest(code: string) {
  const form = this.modelLanding.getFormByCode(code);
  if (!form) throw new NotFoundException(`Unknown source form: ${code}`);
  const existing = await this.prisma.recordFormLandingEntry.findUnique({ where: { sourceCode: code } });
  if (existing?.confirmationStatus === 'confirmed') return existing;

  const targetRoute = (form as any).targetRoute || this.inferRoute(form);
  const landingStatus = targetRoute ? 'business_module' : 'unimplemented';
  return {
    sourceCode: code,
    landingStatus,
    landingStrategy: landingStatus,
    confirmationStatus: 'suggested',
    confidence: targetRoute ? 'high' : 'low',
    targetModule: (form as any).primaryEntity || null,
    targetModel: (form as any).primaryEntity || null,
    targetRoute,
    fieldCoverageStatus: targetRoute ? 'partial' : 'unknown',
    reason: targetRoute ? 'model-landing 已存在候选业务入口' : '未识别到业务入口或动态模板',
  };
}

async confirm(code: string, dto: ConfirmRecordFormLandingDto, userId: string) {
  const form = this.modelLanding.getFormByCode(code);
  if (!form) throw new NotFoundException(`Unknown source form: ${code}`);
  return this.upsertGovernance(code, dto, userId);
}

async getFieldCoverage(code: string) {
  const form = this.modelLanding.getFormByCode(code);
  const entry = await this.prisma.recordFormLandingEntry.findUnique({
    where: { sourceCode: code },
    include: { targetTemplate: true },
  });
  if (!form) throw new NotFoundException(`Unknown source form: ${code}`);

  const sourceFields = ((form as any).fields ?? []).map((field: any) => String(field.name || field.label));
  const templateFields = ((entry?.targetTemplate?.fieldsJson as any)?.fields ?? []).map((field: any) => String(field.name || field.label));
  const covered = sourceFields.filter((field) => templateFields.includes(field));
  const missing = sourceFields.filter((field) => !templateFields.includes(field));

  return {
    sourceCode: code,
    status: missing.length === 0 && sourceFields.length > 0 ? 'covered' : covered.length > 0 ? 'partial' : 'unknown',
    sourceFields,
    coveredFields: covered,
    missingFields: missing,
  };
}

private inferRoute(form: Record<string, unknown>) {
  const entity = String(form.primaryEntity || form.targetModel || '');
  const routeMap: Record<string, string> = {
    ProductDevelopment: '/process/instances',
    Supplier: '/suppliers',
    IncomingInspection: '/quality/incoming-inspection',
    ProductionBatch: '/production/batches',
  };
  return routeMap[entity] ?? null;
}
```

Update `upsertTarget()` so it writes governance fields:

```ts
landingStatus: dto.landingStatus ?? dto.landingStrategy ?? 'unimplemented',
confirmationStatus: dto.confirmationStatus ?? 'unconfirmed',
confidence: dto.confidence,
fieldCoverageStatus: dto.fieldCoverageStatus ?? 'unknown',
fieldCoverageSummary: dto.fieldCoverageSummary,
primaryRoute: dto.primaryRoute ?? dto.targetRoute,
```

- [ ] **Step 4: 增加 API**

Modify `server/src/modules/document/document.controller.ts`:

```ts
@Get('record-form-index/:code/suggestion')
@ApiOperation({ summary: '获取源表单落地建议' })
getRecordFormLandingSuggestion(@Param('code') code: string) {
  return this.recordFormLandingService.suggest(code);
}

@Post('record-form-index/:code/confirm')
@UseGuards(PermissionGuard)
@CheckPermission('record_form:landing_manage')
@ApiOperation({ summary: '确认源表单落地关系' })
confirmRecordFormLanding(@Param('code') code: string, @Body() dto: ConfirmRecordFormLandingDto, @Req() req: any) {
  return this.recordFormLandingService.confirm(code, dto, req.user.id);
}

@Get('record-form-index/:code/field-coverage')
@ApiOperation({ summary: '查询源表单字段覆盖差异' })
getRecordFormFieldCoverage(@Param('code') code: string) {
  return this.recordFormLandingService.getFieldCoverage(code);
}
```

- [ ] **Step 5: 前端 API**

Modify `client/src/api/document-control.ts`:

```ts
getRecordFormLandingSuggestion(code: string) {
  return request.get(`/documents/record-form-index/${code}/suggestion`);
},

confirmRecordFormLanding(code: string, payload: Record<string, unknown>) {
  return request.post(`/documents/record-form-index/${code}/confirm`, payload);
},

getRecordFormFieldCoverage(code: string) {
  return request.get(`/documents/record-form-index/${code}/field-coverage`);
},
```

- [ ] **Step 6: 前端索引页展示状态**

Modify `client/src/views/documents/RecordFormLandingIndex.vue` table columns:

```vue
<el-table-column prop="code" label="源编号" width="180" />
<el-table-column prop="formName" label="表单名称" min-width="220" />
<el-table-column prop="department" label="部门" width="120" />
<el-table-column label="落地方式" width="140">
  <template #default="{ row }">
    <el-tag :type="landingTagType(row.landingEntry?.landingStatus)">
      {{ landingStatusLabel(row.landingEntry?.landingStatus) }}
    </el-tag>
  </template>
</el-table-column>
<el-table-column label="确认状态" width="120">
  <template #default="{ row }">
    {{ confirmationLabel(row.landingEntry?.confirmationStatus) }}
  </template>
</el-table-column>
<el-table-column label="字段覆盖" width="120">
  <template #default="{ row }">
    {{ fieldCoverageLabel(row.landingEntry?.fieldCoverageStatus) }}
  </template>
</el-table-column>
<el-table-column label="目标入口" min-width="220">
  <template #default="{ row }">
    <el-link v-if="row.landingEntry?.primaryRoute || row.landingEntry?.targetRoute" @click="openRoute(row.landingEntry.primaryRoute || row.landingEntry.targetRoute)">
      {{ row.landingEntry.primaryRoute || row.landingEntry.targetRoute }}
    </el-link>
    <span v-else>-</span>
  </template>
</el-table-column>
```

Add handlers:

```ts
async function loadSuggestion(row: any) {
  const res = await documentControlApi.getRecordFormLandingSuggestion(row.code);
  activeSuggestion.value = res.data;
}

async function confirmSuggestion() {
  if (!activeSuggestion.value?.sourceCode) return;
  await documentControlApi.confirmRecordFormLanding(activeSuggestion.value.sourceCode, {
    ...activeSuggestion.value,
    confirmationStatus: 'confirmed',
  });
  await loadData();
}
```

- [ ] **Step 7: 运行测试**

Run:

```bash
npm run test -w server -- record-form-landing.service.spec.ts --runInBand
npm run test -w client -- RecordFormLandingIndex.spec.ts
```

Expected:

```text
PASS server/src/modules/document/services/record-form-landing.service.spec.ts
PASS client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts
```

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/document/services/record-form-landing.service.ts server/src/modules/document/document.controller.ts server/src/modules/document/services/record-form-landing.service.spec.ts client/src/api/document-control.ts client/src/views/documents/RecordFormLandingIndex.vue client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts
git commit -m "feat: add record form landing governance"
```

---

### Task 5: 记录模板版本与字段更新契约

**Files:**
- Modify: `server/src/modules/record-template/record-template.controller.ts`
- Modify: `server/src/modules/record-template/record-template.service.ts`
- Modify: `server/src/modules/record-template/record-template.service.spec.ts`
- Modify: `client/src/api/record-template.ts`
- Modify: `client/src/views/templates/TemplateDesigner.vue`
- Modify: `client/src/views/templates/__tests__/TemplateDesigner.spec.ts`

- [ ] **Step 1: 写失败测试**

Add to `server/src/modules/record-template/record-template.service.spec.ts`:

```ts
it('does not create code-v2 when creating a template revision', async () => {
  prisma.recordTemplate.findUnique.mockResolvedValue({
    id: 'tpl-v1',
    code: 'GRSS-PZ-JL-01',
    baseCode: 'GRSS-PZ-JL-01',
    templateFamilyId: 'GRSS-PZ-JL-01',
    version: 1,
    fieldsJson: { fields: [{ name: 'date', label: '日期', type: 'date' }] },
    status: 'active',
    versionStatus: 'active',
  });
  prisma.recordTemplate.findFirst.mockResolvedValue(null);
  prisma.recordTemplate.create.mockResolvedValue({
    id: 'tpl-v2',
    code: 'GRSS-PZ-JL-01',
    version: 2,
    versionStatus: 'draft',
  });

  const result = await service.createRevision('tpl-v1', {
    fieldsJson: { fields: [{ name: 'date', label: '日期', type: 'date' }] },
  } as any);

  expect(prisma.recordTemplate.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      code: 'GRSS-PZ-JL-01',
      version: 2,
      versionStatus: 'draft',
      supersedesId: 'tpl-v1',
    }),
  }));
  expect(result.version).toBe(2);
});

it('rejects field updates on active templates', async () => {
  prisma.recordTemplate.findUnique.mockResolvedValue({
    id: 'tpl-v1',
    status: 'active',
    versionStatus: 'active',
    fieldsJson: { fields: [] },
  });

  await expect(service.updateFields('tpl-v1', [{ name: 'x', label: 'X', type: 'text' }]))
    .rejects.toThrow('已启用模板不能原地修改字段');
});
```

- [ ] **Step 2: 运行失败测试**

Run:

```bash
npm run test -w server -- record-template.service.spec.ts --runInBand
```

Expected:

```text
FAIL
Property 'createRevision' does not exist
```

- [ ] **Step 3: 实现模板修订和字段更新**

Modify `server/src/modules/record-template/record-template.service.ts`:

```ts
async updateFields(id: string, fields: Array<Record<string, unknown>>) {
  const template = await this.findOne(id);
  if (template.status === 'active' || (template as any).versionStatus === 'active') {
    throw new BadRequestException('已启用模板不能原地修改字段，请发起模板改版');
  }
  const fieldsJson = { fields };
  this.validateFieldsJson(fieldsJson);
  return this.prisma.recordTemplate.update({
    where: { id },
    data: { fieldsJson },
  });
}

async createRevision(id: string, updateDto: UpdateRecordTemplateDto) {
  const existing = await this.findOne(id);
  if (updateDto.fieldsJson) this.validateFieldsJson(updateDto.fieldsJson);

  const baseCode = (existing as any).baseCode || existing.code.replace(/-v\d+$/, '');
  const templateFamilyId = (existing as any).templateFamilyId || baseCode;
  const latest = await this.prisma.recordTemplate.findFirst({
    where: { templateFamilyId },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (latest?.version ?? existing.version) + 1;

  return this.prisma.recordTemplate.create({
    data: {
      code: baseCode,
      baseCode,
      templateFamilyId,
      name: updateDto.name || existing.name,
      fieldsJson: updateDto.fieldsJson || existing.fieldsJson,
      retentionYears: updateDto.retentionYears || existing.retentionYears,
      description: updateDto.description || existing.description,
      approvalRequired: updateDto.approvalRequired ?? (existing as any).approvalRequired ?? false,
      workflowConfig: updateDto.workflowConfig ?? (existing as any).workflowConfig,
      version: nextVersion,
      versionStatus: 'draft',
      status: 'draft',
      supersedesId: existing.id,
    } as any,
  });
}

async activateRevision(id: string, userId: string) {
  const template = await this.findOne(id);
  if ((template as any).versionStatus !== 'draft') {
    throw new BadRequestException('只有草稿模板版本可以启用');
  }
  return this.prisma.$transaction(async (tx) => {
    await tx.recordTemplate.updateMany({
      where: {
        templateFamilyId: (template as any).templateFamilyId || (template as any).baseCode || template.code,
        id: { not: id },
        status: 'active',
      },
      data: { status: 'retired', versionStatus: 'retired', retiredAt: new Date() } as any,
    });
    return tx.recordTemplate.update({
      where: { id },
      data: {
        status: 'active',
        versionStatus: 'active',
        effectiveAt: new Date(),
        approvedAt: new Date(),
        approvedBy: userId,
      } as any,
    });
  });
}
```

- [ ] **Step 4: 补齐 controller 契约**

Modify `server/src/modules/record-template/record-template.controller.ts`:

```ts
@Put(':id/fields')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: '更新草稿模板字段' })
updateFields(@Param('id') id: string, @Body() body: { fields: Array<Record<string, unknown>> }) {
  return this.templateService.updateFields(id, body.fields);
}

@Post(':id/revisions')
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: '发起模板改版草稿' })
createRevision(@Param('id') id: string, @Body() updateDto: UpdateRecordTemplateDto) {
  return this.templateService.createRevision(id, updateDto);
}

@Post(':id/activate')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: '启用模板版本' })
activateRevision(@Param('id') id: string, @Req() req: any) {
  return this.templateService.activateRevision(id, req.user.id);
}
```

- [ ] **Step 5: 前端 API 对齐**

Modify `client/src/api/record-template.ts`:

```ts
updateFields(id: string, fields: RecordTemplateField[]) {
  return request.put<RecordTemplate>(`/record-templates/${id}/fields`, { fields });
},

createRevision(id: string, payload: Partial<RecordTemplate>) {
  return request.post<RecordTemplate>(`/record-templates/${id}/revisions`, payload);
},

activateRevision(id: string) {
  return request.post<RecordTemplate>(`/record-templates/${id}/activate`);
},
```

- [ ] **Step 6: 模板设计器阻止启用模板原地改字段**

Modify `client/src/views/templates/TemplateDesigner.vue`:

```ts
const isActiveTemplate = computed(() => ['active'].includes(template.value?.status || template.value?.versionStatus || ''));

async function saveFields() {
  if (isActiveTemplate.value) {
    ElMessage.warning('已启用模板不能原地修改字段，请先发起改版');
    return;
  }
  await recordTemplateApi.updateFields(templateId.value, [...formFields] as any);
  ElMessage.success('字段已保存');
}

async function createRevision() {
  const res = await recordTemplateApi.createRevision(templateId.value, {
    fieldsJson: { fields: [...formFields] },
  } as any);
  router.push(`/templates/${res.data.id}/design`);
}
```

- [ ] **Step 7: 运行测试**

Run:

```bash
npm run test -w server -- record-template.service.spec.ts --runInBand
npm run test -w client -- TemplateDesigner.spec.ts
```

Expected:

```text
PASS server/src/modules/record-template/record-template.service.spec.ts
PASS client/src/views/templates/__tests__/TemplateDesigner.spec.ts
```

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/record-template/record-template.controller.ts server/src/modules/record-template/record-template.service.ts server/src/modules/record-template/record-template.service.spec.ts client/src/api/record-template.ts client/src/views/templates/TemplateDesigner.vue client/src/views/templates/__tests__/TemplateDesigner.spec.ts
git commit -m "feat: govern record template revisions"
```

---

### Task 6: Markdown 引用记录表单与引用健康

**Files:**
- Modify: `server/src/modules/document/services/markdown-wikilink.service.ts`
- Modify: `server/src/modules/document/services/document-reference-health.service.ts`
- Modify: `server/src/modules/document/services/markdown-wikilink.service.spec.ts`
- Modify: `server/src/modules/document/services/document-reference-health.service.spec.ts`
- Modify: `client/src/views/documents/SystemDocumentCenter.vue`
- Modify: `client/src/views/documents/__tests__/SystemDocumentCenter.spec.ts`

- [ ] **Step 1: 写 wikilink 失败测试**

Add to `server/src/modules/document/services/markdown-wikilink.service.spec.ts`:

```ts
it('resolves source form wikilinks to record form landing entries', async () => {
  prisma.document.findUnique.mockResolvedValue({ id: 'doc-1', title: '程序文件', number: 'QP-001' });
  prisma.document.findMany.mockResolvedValue([]);
  prisma.recordFormLandingEntry.findMany.mockResolvedValue([{
    id: 'landing-1',
    sourceCode: 'GRSS-ZZ-JL-43',
    landingStatus: 'dynamic_form',
    targetRoute: '/records/fill/tpl-1',
  }]);

  await service.syncDocumentWikilinks('doc-1', '生产过程应填写 [[GRSS-ZZ-JL-43 玻璃及硬塑制品检查表]]');

  expect(prisma.documentReference.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      targetType: 'record_form_landing',
      targetId: 'GRSS-ZZ-JL-43',
      targetRoute: '/records/fill/tpl-1',
    }),
  }));
});
```

- [ ] **Step 2: 写健康失败测试**

Add to `server/src/modules/document/services/document-reference-health.service.spec.ts`:

```ts
it('marks record form reference without landing target as unimplemented', async () => {
  prisma.documentReference.findMany.mockResolvedValue([{
    id: 'ref-1',
    sourceDocId: 'doc-1',
    targetType: 'record_form_landing',
    targetId: 'GRSS-ZZ-JL-43',
    targetLabel: '玻璃及硬塑制品检查表',
    sourceDoc: { id: 'doc-1', title: '生产过程控制程序', number: 'QP-001' },
    snapshot: { landingStatus: 'unimplemented' },
  }]);

  const result = await service.listIssues();

  expect(result.issues[0]).toEqual(expect.objectContaining({
    status: 'unimplemented',
    reason: '记录表单存在，但尚未确认业务入口或动态表单模板。',
  }));
});
```

- [ ] **Step 3: 运行失败测试**

Run:

```bash
npm run test -w server -- markdown-wikilink.service.spec.ts document-reference-health.service.spec.ts --runInBand
```

Expected:

```text
FAIL
record_form_landing
```

- [ ] **Step 4: 扩展 MarkdownWikilinkService**

Modify `server/src/modules/document/services/markdown-wikilink.service.ts` client type:

```ts
type WikilinkPrismaClient = Pick<PrismaService, 'document' | 'documentReference' | 'recordFormLandingEntry'>;
```

Inside `syncDocumentWikilinks()`, after document target lookup and before unresolved document creation:

```ts
const formCode = this.extractSourceFormCode(target);
if (formCode) {
  const entries = await client.recordFormLandingEntry.findMany({
    where: { sourceCode: formCode },
    take: 10,
  });

  if (entries.length === 1) {
    const entry = entries[0];
    await client.documentReference.create({
      data: {
        sourceDocId,
        targetDocId: null,
        targetType: 'record_form_landing',
        targetId: entry.sourceCode,
        targetRoute: entry.primaryRoute || entry.targetRoute,
        targetLabel: displayLabel || target,
        relationType: 'WIKILINK',
        sectionId,
        wikilinkTarget: target,
        snapshot: {
          landingStatus: entry.landingStatus,
          confirmationStatus: entry.confirmationStatus,
          targetTemplateId: entry.targetTemplateId,
        },
        syncedAt: new Date(),
      },
    });
    continue;
  }

  await client.documentReference.create({
    data: {
      sourceDocId,
      targetDocId: null,
      targetType: entries.length > 1 ? 'conflict_record_form' : 'unresolved_record_form',
      targetId: formCode,
      targetLabel: displayLabel || target,
      relationType: 'WIKILINK',
      sectionId,
      wikilinkTarget: target,
      snapshot: entries.length > 1 ? { candidates: entries } : undefined,
      syncedAt: new Date(),
    },
  });
  continue;
}
```

Add helper:

```ts
private extractSourceFormCode(target: string) {
  const match = target.match(/(GRSS-[A-Z]{2}-JL-\d+)/);
  return match?.[1] ?? null;
}
```

- [ ] **Step 5: 扩展引用健康状态**

Modify `server/src/modules/document/services/document-reference-health.service.ts`:

```ts
export type ReferenceHealthStatus = 'healthy' | 'dangling' | 'unimplemented' | 'invalid' | 'conflict' | 'superseded';
```

Update totals:

```ts
{ total: 0, healthy: 0, dangling: 0, unimplemented: 0, invalid: 0, conflict: 0, superseded: 0 }
```

Update `findReferences()` target types:

```ts
{ targetType: { in: ['document', 'unresolved_document', 'conflict_document', 'record_form_landing', 'unresolved_record_form', 'conflict_record_form'] } },
```

Add to `evaluate()` before document checks:

```ts
if (reference.targetType === 'conflict_record_form') {
  return {
    ...base,
    status: 'conflict',
    reason: '引用文本匹配到多个记录表单入口，需要文控人员确认目标。',
    candidates: this.extractCandidates(reference.snapshot),
  };
}

if (reference.targetType === 'unresolved_record_form') {
  return {
    ...base,
    status: 'dangling',
    reason: '引用文本未匹配到记录表单索引。',
  };
}

if (reference.targetType === 'record_form_landing') {
  const snapshot = this.isRecord(reference.snapshot) ? reference.snapshot : {};
  const landingStatus = String(snapshot.landingStatus || '');
  if (landingStatus === 'unimplemented') {
    return { ...base, status: 'unimplemented', reason: '记录表单存在，但尚未确认业务入口或动态表单模板。' };
  }
  if (landingStatus === 'conflict') {
    return { ...base, status: 'conflict', reason: '记录表单存在多个冲突入口，需要管理员确认。' };
  }
  if (['not_suitable', 'partial'].includes(landingStatus)) {
    return { ...base, status: 'invalid', reason: '记录表单当前落地状态不能直接作为可填写入口。' };
  }
  return { ...base, status: 'healthy', reason: '记录表单已确认落地，可作为当前引用依据。' };
}
```

- [ ] **Step 6: 前端全局问题清单显示新状态**

Modify `client/src/views/documents/SystemDocumentCenter.vue`:

```ts
const referenceStatusLabels: Record<string, string> = {
  healthy: '正常',
  dangling: '悬空',
  unimplemented: '未落地',
  invalid: '无效',
  conflict: '冲突',
  superseded: '已被替代',
};
```

- [ ] **Step 7: 运行测试**

Run:

```bash
npm run test -w server -- markdown-wikilink.service.spec.ts document-reference-health.service.spec.ts --runInBand
npm run test -w client -- SystemDocumentCenter.spec.ts
```

Expected:

```text
PASS server/src/modules/document/services/markdown-wikilink.service.spec.ts
PASS server/src/modules/document/services/document-reference-health.service.spec.ts
PASS client/src/views/documents/__tests__/SystemDocumentCenter.spec.ts
```

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/document/services/markdown-wikilink.service.ts server/src/modules/document/services/document-reference-health.service.ts server/src/modules/document/services/markdown-wikilink.service.spec.ts server/src/modules/document/services/document-reference-health.service.spec.ts client/src/views/documents/SystemDocumentCenter.vue client/src/views/documents/__tests__/SystemDocumentCenter.spec.ts
git commit -m "feat: resolve record form wikilinks"
```

---

### Task 7: 编号规则前端页面

**Files:**
- Modify: `client/src/api/document-control.ts`
- Create: `client/src/views/documents/NumberRuleCenter.vue`
- Create: `client/src/views/documents/__tests__/NumberRuleCenter.spec.ts`
- Modify: `client/src/router/index.ts`
- Modify: `client/src/views/Layout.vue`

- [ ] **Step 1: 写失败测试**

Create `client/src/views/documents/__tests__/NumberRuleCenter.spec.ts`:

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import NumberRuleCenter from '../NumberRuleCenter.vue';
import { documentControlApi } from '@/api/document-control';

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    listNumberRules: vi.fn().mockResolvedValue({ data: [{ id: 'rule-1', scope: 'document', sourceFolder: '03', prefix: 'GRSS', categoryCode: 'ZD', format: '{prefix}-{departmentCode}-{categoryCode}-{sequence}', usedCount: 3, isActive: true }] }),
    upsertNumberRule: vi.fn().mockResolvedValue({ data: {} }),
    deactivateNumberRule: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('NumberRuleCenter', () => {
  it('renders configured document number rules', async () => {
    const wrapper = mount(NumberRuleCenter, {
      global: {
        stubs: ['el-card', 'el-table', 'el-table-column', 'el-button', 'el-dialog', 'el-form', 'el-form-item', 'el-input', 'el-select', 'el-option', 'el-input-number', 'el-switch'],
      },
    });
    await Promise.resolve();
    expect(documentControlApi.listNumberRules).toHaveBeenCalled();
    expect(wrapper.text()).toContain('编号规则');
  });
});
```

- [ ] **Step 2: 运行失败测试**

Run:

```bash
npm run test -w client -- NumberRuleCenter.spec.ts
```

Expected:

```text
FAIL
Cannot find module '../NumberRuleCenter.vue'
```

- [ ] **Step 3: 前端 API**

Modify `client/src/api/document-control.ts`:

```ts
listNumberRules() {
  return request.get('/documents/number-rules');
},

upsertNumberRule(payload: Record<string, unknown>) {
  return request.post('/documents/number-rules', payload);
},

deactivateNumberRule(id: string) {
  return request.post(`/documents/number-rules/${id}/deactivate`);
},
```

- [ ] **Step 4: 创建编号规则页面**

Create `client/src/views/documents/NumberRuleCenter.vue`:

```vue
<template>
  <div class="number-rule-center">
    <div class="page-header">
      <h2>编号规则</h2>
      <el-button type="primary" @click="openCreate">新建规则</el-button>
    </div>

    <el-card>
      <el-table :data="rules" border>
        <el-table-column prop="scope" label="适用对象" width="130" />
        <el-table-column prop="sourceFolder" label="分类" width="100" />
        <el-table-column prop="prefix" label="固定前缀" width="120" />
        <el-table-column prop="categoryCode" label="分类代码" width="120" />
        <el-table-column prop="format" label="格式模板" min-width="260" />
        <el-table-column prop="sequencePadding" label="序号位数" width="100" />
        <el-table-column prop="usedCount" label="已使用" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">{{ row.isActive ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button link type="danger" :disabled="!row.isActive" @click="deactivate(row)">停用</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="编号规则" width="640px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="适用对象"><el-select v-model="form.scope"><el-option label="体系文件" value="document" /><el-option label="记录表单模板" value="record_template" /></el-select></el-form-item>
        <el-form-item label="文件分类"><el-select v-model="form.sourceFolder"><el-option label="01 管理手册" value="01" /><el-option label="02 程序文件" value="02" /><el-option label="03 作业指导书" value="03" /><el-option label="04 记录表单" value="04" /><el-option label="05 公司文件" value="05" /><el-option label="06 外来文件" value="06" /></el-select></el-form-item>
        <el-form-item label="固定前缀"><el-input v-model="form.prefix" /></el-form-item>
        <el-form-item label="分类代码"><el-input v-model="form.categoryCode" /></el-form-item>
        <el-form-item label="格式模板"><el-input v-model="form.format" /></el-form-item>
        <el-form-item label="序号位数"><el-input-number v-model="form.sequencePadding" :min="1" :max="8" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentControlApi } from '@/api/document-control';

const rules = ref<any[]>([]);
const dialogVisible = ref(false);
const form = reactive({
  scope: 'document',
  level: 3,
  departmentId: '',
  sourceFolder: '03',
  prefix: 'GRSS',
  categoryCode: 'ZD',
  format: '{prefix}-{departmentCode}-{categoryCode}-{sequence}',
  sequencePadding: 2,
  separator: '-',
  resetPolicy: 'none',
});

async function loadRules() {
  const res = await documentControlApi.listNumberRules();
  rules.value = res.data;
}

function openCreate() {
  dialogVisible.value = true;
}

async function save() {
  await documentControlApi.upsertNumberRule({ ...form });
  ElMessage.success('编号规则已保存');
  dialogVisible.value = false;
  await loadRules();
}

async function deactivate(row: any) {
  await documentControlApi.deactivateNumberRule(row.id);
  ElMessage.success('编号规则已停用');
  await loadRules();
}

onMounted(loadRules);
</script>
```

- [ ] **Step 5: 增加路由和菜单**

Modify `client/src/router/index.ts`:

```ts
{
  path: '/documents/control/number-rules',
  name: 'DocumentNumberRules',
  component: () => import('@/views/documents/NumberRuleCenter.vue'),
  meta: { title: '编号规则', requiresAuth: true },
}
```

Modify `client/src/views/Layout.vue` 文控中心菜单：

```ts
{ path: '/documents/control/number-rules', title: '编号规则', icon: Hash },
```

- [ ] **Step 6: 运行测试**

Run:

```bash
npm run test -w client -- NumberRuleCenter.spec.ts
```

Expected:

```text
PASS client/src/views/documents/__tests__/NumberRuleCenter.spec.ts
```

- [ ] **Step 7: Commit**

```bash
git add client/src/api/document-control.ts client/src/views/documents/NumberRuleCenter.vue client/src/views/documents/__tests__/NumberRuleCenter.spec.ts client/src/router/index.ts client/src/views/Layout.vue
git commit -m "feat: add document number rule center"
```

---

### Task 8: 文控工作台问题闭环

**Files:**
- Modify: `server/src/modules/document/dto/document-control.dto.ts`
- Modify: `server/src/modules/document/services/document-control-workbench.service.ts`
- Modify: `server/src/modules/document/services/document-control-workbench.service.spec.ts`
- Modify: `client/src/views/documents/DocumentControlWorkbench.vue`
- Modify: `client/src/views/documents/DocumentControlIssueList.vue`
- Modify: `client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts`
- Modify: `client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts`

- [ ] **Step 1: 扩展 issue types**

Modify `server/src/modules/document/dto/document-control.dto.ts`:

```ts
export const WORKBENCH_ISSUE_TYPES = [
  'pendingReview',
  'dueForReview',
  'expiringExternalFiles',
  'obsoleteReferences',
  'brokenReferences',
  'missingLandingTargets',
  'unconfirmedLandingTargets',
  'partialFieldCoverage',
  'unimplementedRecordReferences',
  'missingMetadata',
  'trainingNeeds',
  'openImpactItems',
] as const;
```

- [ ] **Step 2: 写失败测试**

Add to `server/src/modules/document/services/document-control-workbench.service.spec.ts`:

```ts
it('lists unconfirmed record form landing targets', async () => {
  prisma.recordFormLandingEntry.count.mockResolvedValue(1);
  prisma.recordFormLandingEntry.findMany.mockResolvedValue([{
    id: 'landing-1',
    sourceCode: 'GRSS-PZ-JL-01',
    confirmationStatus: 'suggested',
    landingStatus: 'dynamic_form',
    updatedAt: new Date('2026-04-28T00:00:00Z'),
  }]);
  const service = new DocumentControlWorkbenchService(prisma as any);

  const result = await service.listIssues({ type: 'unconfirmedLandingTargets', page: 1, limit: 20 });

  expect(result.items[0]).toEqual(expect.objectContaining({
    issueType: 'unconfirmedLandingTargets',
    sourceType: 'record_form_landing',
    actionLabel: '确认落地关系',
  }));
});
```

- [ ] **Step 3: 运行失败测试**

Run:

```bash
npm run test -w server -- document-control-workbench.service.spec.ts --runInBand
```

Expected:

```text
FAIL
Unsupported workbench issue type
```

- [ ] **Step 4: 后端查询和映射**

Modify `server/src/modules/document/services/document-control-workbench.service.ts` in `queryIssueRows()`:

```ts
if (type === 'unconfirmedLandingTargets') {
  const where = { confirmationStatus: { in: ['unconfirmed', 'suggested'] } };
  const [total, rows] = await Promise.all([
    this.prisma.recordFormLandingEntry.count({ where }),
    this.prisma.recordFormLandingEntry.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
  ]);
  return { total, rows };
}

if (type === 'partialFieldCoverage') {
  const where = { fieldCoverageStatus: { in: ['partial', 'missing'] } };
  const [total, rows] = await Promise.all([
    this.prisma.recordFormLandingEntry.count({ where }),
    this.prisma.recordFormLandingEntry.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
  ]);
  return { total, rows };
}

if (type === 'unimplementedRecordReferences') {
  const where = { targetType: 'record_form_landing', snapshot: { path: ['landingStatus'], equals: 'unimplemented' } };
  const [total, rows] = await Promise.all([
    this.prisma.documentReference.count({ where }),
    this.prisma.documentReference.findMany({
      where,
      include: { sourceDoc: { select: { id: true, title: true, number: true } } },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
  ]);
  return { total, rows };
}
```

Modify `toIssueItem()`:

```ts
if (type === 'unconfirmedLandingTargets') {
  const code = row.sourceCode;
  return {
    id: row.id,
    issueType: type,
    severity: 'medium',
    title: `${code} 落地关系未确认`,
    description: '系统已有落地建议或手工入口，但尚未由管理员确认。',
    sourceType: 'record_form_landing',
    sourceId: code,
    sourceLabel: code,
    sourceRoute: `/documents/control/record-form-index?code=${encodeURIComponent(code)}`,
    actionLabel: '确认落地关系',
    actionRoute: `/documents/control/record-form-index?code=${encodeURIComponent(code)}&action=confirm`,
    detectedAt: row.updatedAt ?? row.createdAt ?? null,
  };
}

if (type === 'partialFieldCoverage') {
  const code = row.sourceCode;
  return {
    id: row.id,
    issueType: type,
    severity: 'medium',
    title: `${code} 字段覆盖不完整`,
    description: '源表单字段与业务入口或动态模板字段存在差异，需要确认处理方式。',
    sourceType: 'record_form_landing',
    sourceId: code,
    sourceLabel: code,
    sourceRoute: `/documents/control/record-form-index?code=${encodeURIComponent(code)}`,
    actionLabel: '查看字段覆盖',
    actionRoute: `/documents/control/record-form-index?code=${encodeURIComponent(code)}&section=fieldCoverage`,
    detectedAt: row.updatedAt ?? row.createdAt ?? null,
  };
}
```

- [ ] **Step 5: 前端工作台展示新问题**

Modify `client/src/views/documents/DocumentControlWorkbench.vue` issue cards:

```ts
const issueCards = computed(() => [
  { type: 'pendingReview', label: '待审批文件', count: workbench.value?.counts?.pendingReview ?? 0 },
  { type: 'dueForReview', label: '复审到期', count: workbench.value?.counts?.dueForReview ?? 0 },
  { type: 'missingLandingTargets', label: '缺少表单入口', count: workbench.value?.counts?.missingLandingTargets ?? 0 },
  { type: 'unconfirmedLandingTargets', label: '落地未确认', count: workbench.value?.counts?.unconfirmedLandingTargets ?? 0 },
  { type: 'partialFieldCoverage', label: '字段覆盖异常', count: workbench.value?.counts?.partialFieldCoverage ?? 0 },
  { type: 'brokenReferences', label: '引用异常', count: workbench.value?.counts?.brokenReferences ?? 0 },
]);
```

Modify `client/src/views/documents/DocumentControlIssueList.vue` labels:

```ts
const issueTypeLabels: Record<string, string> = {
  pendingReview: '待审批文件',
  dueForReview: '复审到期',
  expiringExternalFiles: '外来文件到期',
  obsoleteReferences: '引用已失效',
  brokenReferences: '引用缺少入口',
  missingLandingTargets: '缺少表单入口',
  unconfirmedLandingTargets: '落地未确认',
  partialFieldCoverage: '字段覆盖异常',
  unimplementedRecordReferences: '引用表单未落地',
  missingMetadata: '文控信息缺失',
  trainingNeeds: '培训需求',
  openImpactItems: '影响项未关闭',
};
```

- [ ] **Step 6: 运行测试**

Run:

```bash
npm run test -w server -- document-control-workbench.service.spec.ts --runInBand
npm run test -w client -- DocumentControlWorkbench.spec.ts DocumentControlIssueList.spec.ts
```

Expected:

```text
PASS server/src/modules/document/services/document-control-workbench.service.spec.ts
PASS client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts
PASS client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts
```

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/document/dto/document-control.dto.ts server/src/modules/document/services/document-control-workbench.service.ts server/src/modules/document/services/document-control-workbench.service.spec.ts client/src/views/documents/DocumentControlWorkbench.vue client/src/views/documents/DocumentControlIssueList.vue client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts
git commit -m "feat: surface record form governance issues"
```

---

### Task 9: 全量验证与回归

**Files:**
- Modify only if verification exposes real defects.

- [ ] **Step 1: Prisma 校验**

Run:

```bash
npm run prisma:generate -w server
```

Expected:

```text
Generated Prisma Client
```

- [ ] **Step 2: 后端定向测试**

Run:

```bash
npm run test -w server -- number-rule.service.spec.ts document.service.spec.ts document-lifecycle.service.spec.ts record-form-landing.service.spec.ts markdown-wikilink.service.spec.ts document-reference-health.service.spec.ts document-control-workbench.service.spec.ts record-template.service.spec.ts --runInBand
```

Expected:

```text
Test Suites: 8 passed
Tests: all passed
```

- [ ] **Step 3: 前端定向测试**

Run:

```bash
npm run test -w client -- DocumentDetail.spec.ts RecordFormLandingIndex.spec.ts NumberRuleCenter.spec.ts TemplateDesigner.spec.ts SystemDocumentCenter.spec.ts DocumentControlWorkbench.spec.ts DocumentControlIssueList.spec.ts
```

Expected:

```text
Test Files 7 passed
Tests all passed
```

- [ ] **Step 4: 类型与构建**

Run:

```bash
npm run build:server
npm run build:client
```

Expected:

```text
server build success
client build success
```

- [ ] **Step 5: 手工业务冒烟**

Run local stack or dev servers, then verify in browser:

```text
1. 打开体系文件详情页，已发布文件只显示“发起修订”，不显示原地编辑。
2. 点击“发起修订”，生成 V2 草稿，V1 仍可查看。
3. 草稿 Markdown 可以编辑并保存。
4. 文档信息区只显示一个信息表，版本号为 V1/V2，不显示 Decimal 对象。
5. 打开记录表单索引，能看到落地方式、确认状态、字段覆盖。
6. 对一张未确认表单点击系统建议并确认，状态变为已确认。
7. Markdown 中写入记录表单 wikilink 后，引用健康能显示 healthy/unimplemented/conflict。
8. 编号规则页可以新建、查看、停用规则。
9. 文控工作台能看到落地未确认、字段覆盖异常、引用表单未落地问题。
10. 左侧菜单没有“审核链路/证据链”独立入口。
```

- [ ] **Step 6: 最终状态检查**

Run:

```bash
git status --short --branch
git log --oneline --max-count=10
```

Expected:

```text
当前功能分支只包含本计划相关提交；无意外修改和无关未跟踪文件被 staged。
```

- [ ] **Step 7: Commit verification fixes**

If Step 1-6 exposed defects and fixes were made:

```bash
git add <fixed-files>
git commit -m "fix: stabilize document control governance flow"
```

If no fixes were needed:

```bash
git status --short --branch
```

---

## Self-Review

### Spec coverage

- 受控文件修订闭环：Task 3 覆盖。
- 文档详情字段合并、版本显示、按钮规则：Task 3 覆盖。
- 04 记录表单索引定位、系统预识别、管理员确认、字段覆盖：Task 4 覆盖。
- 动态表单承接边界：Task 4 和 Task 5 覆盖，不创建第二套动态表单。
- 记录模板版本：Task 5 覆盖。
- 编号规则复用增强：Task 1、Task 2、Task 7 覆盖。
- Markdown 引用记录表单和引用健康：Task 6 覆盖。
- 工作台问题清单：Task 8 覆盖。
- 证据链降级为上下文能力：当前菜单入口已移除；本计划不恢复入口，Task 9 冒烟验证。
- 供应商证照、外检报告有效期不进入体系文件中心主流程：前置边界覆盖。

### Placeholder scan

本计划已完成内容扫描。每个实现步骤都给出了目标文件、代码片段、运行命令和期望输出。

### Type consistency

- 落地状态统一使用 `landingStatus`。
- 确认状态统一使用 `confirmationStatus`。
- 字段覆盖状态统一使用 `fieldCoverageStatus`。
- 记录表单引用统一使用 `targetType = record_form_landing | unresolved_record_form | conflict_record_form`。
- 版本展示统一使用 `versionNo -> V${versionNo}`。
- 模板版本族统一使用 `templateFamilyId` 和 `baseCode`。
