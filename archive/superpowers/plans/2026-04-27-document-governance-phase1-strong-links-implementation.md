# Document Governance Phase 1 Strong Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten document-control weak references so new writes cannot point at missing owners, record templates, training projects, documents, users, departments, or roles.

**Architecture:** Add narrow nullable foreign keys where the target table is stable, keep legacy text/string fields for compatibility, and enforce polymorphic scope validation in services. Schema changes are additive; service writes prefer ID fields, reads continue to include old fields so phase 0 UI remains usable.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Jest, Vue 3, Element Plus, Vitest, Vite.

---

## File Structure

- Modify: `server/src/prisma/schema.prisma`  
  Adds strong relations for document owners, record-form target templates, and linked training projects.
- Create: `server/src/prisma/migrations/20260427000001_document_governance_phase1_strong_links/migration.sql`  
  Adds additive columns, indexes, foreign keys, and a safe cleanup step for invalid weak IDs.
- Modify: `server/src/modules/document/dto/document-control.dto.ts`  
  Adds `ownerDepartmentId` and preserves legacy `ownerDepartment`.
- Modify: `server/src/modules/document/services/document-control-metadata.service.ts`  
  Normalizes both legacy text and new ID metadata.
- Modify: `server/src/modules/document/document.service.ts`  
  Validates document owner IDs before create/update.
- Modify: `server/src/modules/document/services/record-form-landing.service.ts`  
  Uses real `targetTemplate` relation and validates related documents.
- Modify: `server/src/modules/document/services/document-training-need.service.ts`  
  Validates `linkedTrainingProjectId` and includes linked project metadata.
- Modify: `server/src/modules/document/services/document-read-requirement.service.ts`  
  Validates `scopeType/scopeId` targets for new read requirements.
- Test: `server/src/modules/document/document.service.spec.ts`
- Test: `server/src/modules/document/services/record-form-landing.service.spec.ts`
- Test: `server/src/modules/document/services/document-training-need.service.spec.ts`
- Test: `server/src/modules/document/services/document-read-requirement.service.spec.ts`
- Modify: `client/src/api/document-control.ts`  
  Adds owner ID fields to the API types.
- Modify: `client/src/views/documents/DocumentDetail.vue`  
  Displays resolved owner when present and legacy owner text as fallback.
- Modify: `client/src/views/documents/DocumentUpload.vue`  
  Sends owner ID fields only when selected by the user.
- Modify: `client/src/views/documents/RecordFormLandingIndex.vue`  
  Keeps using the same save endpoint and surfaces backend validation messages.
- Test: `client/src/views/documents/__tests__/DocumentDetail.spec.ts`
- Test: `client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts`

---

### Task 1: Schema And Migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260427000001_document_governance_phase1_strong_links/migration.sql`

- [ ] **Step 1: Add Prisma relations**

In `server/src/prisma/schema.prisma`, update `User`, `Department`, `RecordTemplate`, `TrainingProject`, `Document`, `RecordFormLandingEntry`, and `DocumentTrainingNeed` with these exact additions.

```prisma
model User {
  // keep existing fields
  ownedDocuments Document[] @relation("DocumentOwnerUser")
  // keep existing fields
}

model Department {
  // keep existing fields
  ownedDocuments Document[] @relation("DocumentOwnerDepartment")
  // keep existing fields
}

model RecordTemplate {
  // keep existing fields
  landingEntries RecordFormLandingEntry[]
  // keep existing fields
}

model TrainingProject {
  // keep existing fields
  documentTrainingNeeds DocumentTrainingNeed[]
  // keep existing fields
}

model Document {
  // keep existing document-control fields
  owner_department   String?
  owner_user_id      String?
  ownerDepartmentId  String?
  ownerDepartment    Department? @relation("DocumentOwnerDepartment", fields: [ownerDepartmentId], references: [id], onDelete: SetNull)
  ownerUserId        String?
  ownerUser          User?       @relation("DocumentOwnerUser", fields: [ownerUserId], references: [id], onDelete: SetNull)
  // keep existing fields

  @@index([ownerDepartmentId])
  @@index([ownerUserId])
  @@map("documents")
}

model RecordFormLandingEntry {
  id               String          @id @default(cuid())
  sourceCode       String          @unique
  targetModule     String?
  targetModel      String?
  targetRoute      String?
  targetTemplateId String?
  targetTemplate   RecordTemplate? @relation(fields: [targetTemplateId], references: [id], onDelete: SetNull)
  landingStrategy  String?
  relatedDocIds    String[]        @default([])
  notes            String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  @@index([targetModule])
  @@index([targetModel])
  @@index([targetTemplateId])
  @@index([landingStrategy])
  @@map("record_form_landing_entries")
}

model DocumentTrainingNeed {
  // keep existing fields before linkedTrainingProjectId
  linkedTrainingProjectId String?
  linkedTrainingProject   TrainingProject? @relation(fields: [linkedTrainingProjectId], references: [id], onDelete: SetNull)
  // keep existing fields after linkedTrainingProjectId

  @@index([documentId])
  @@index([status])
  @@index([targetDepartment])
  @@index([linkedTrainingProjectId])
  @@map("document_training_needs")
}
```

- [ ] **Step 2: Create additive migration**

Create `server/src/prisma/migrations/20260427000001_document_governance_phase1_strong_links/migration.sql` with:

```sql
-- Phase 1: tighten document-governance weak links without deleting legacy fields.

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "ownerDepartmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT;

UPDATE "record_form_landing_entries" r
SET "targetTemplateId" = NULL
WHERE r."targetTemplateId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "record_templates" t
    WHERE t."id" = r."targetTemplateId"
      AND t."deletedAt" IS NULL
  );

UPDATE "document_training_needs" n
SET "linkedTrainingProjectId" = NULL,
    "status" = CASE WHEN n."status" = 'linked' THEN 'accepted' ELSE n."status" END
WHERE n."linkedTrainingProjectId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "training_projects" p
    WHERE p."id" = n."linkedTrainingProjectId"
  );

CREATE INDEX IF NOT EXISTS "documents_ownerDepartmentId_idx"
  ON "documents"("ownerDepartmentId");

CREATE INDEX IF NOT EXISTS "documents_ownerUserId_idx"
  ON "documents"("ownerUserId");

CREATE INDEX IF NOT EXISTS "record_form_landing_entries_targetTemplateId_idx"
  ON "record_form_landing_entries"("targetTemplateId");

CREATE INDEX IF NOT EXISTS "document_training_needs_linkedTrainingProjectId_idx"
  ON "document_training_needs"("linkedTrainingProjectId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documents_ownerDepartmentId_fkey'
      AND conrelid = 'documents'::regclass
  ) THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_ownerDepartmentId_fkey"
      FOREIGN KEY ("ownerDepartmentId") REFERENCES "departments"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documents_ownerUserId_fkey'
      AND conrelid = 'documents'::regclass
  ) THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_ownerUserId_fkey"
      FOREIGN KEY ("ownerUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'record_form_landing_entries_targetTemplateId_fkey'
      AND conrelid = 'record_form_landing_entries'::regclass
  ) THEN
    ALTER TABLE "record_form_landing_entries"
      ADD CONSTRAINT "record_form_landing_entries_targetTemplateId_fkey"
      FOREIGN KEY ("targetTemplateId") REFERENCES "record_templates"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_training_needs_linkedTrainingProjectId_fkey'
      AND conrelid = 'document_training_needs'::regclass
  ) THEN
    ALTER TABLE "document_training_needs"
      ADD CONSTRAINT "document_training_needs_linkedTrainingProjectId_fkey"
      FOREIGN KEY ("linkedTrainingProjectId") REFERENCES "training_projects"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
```

- [ ] **Step 3: Validate Prisma schema**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/noidear" npx prisma validate --schema=src/prisma/schema.prisma
```

Expected: PASS or only existing warnings about unrelated required fields with `onDelete: SetNull`. There must be no new relation-name or missing-opposite-relation errors.

- [ ] **Step 4: Generate client and build server**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run prisma:generate
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit schema and migration**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260427000001_document_governance_phase1_strong_links/migration.sql
git commit -m "feat: add document governance strong link schema"
```

---

### Task 2: Document Owner ID Validation And Writes

**Files:**
- Modify: `server/src/modules/document/dto/document-control.dto.ts`
- Modify: `server/src/modules/document/services/document-control-metadata.service.ts`
- Modify: `server/src/modules/document/document.service.ts`
- Test: `server/src/modules/document/document.service.spec.ts`

- [ ] **Step 1: Write failing document owner tests**

Add this block to `server/src/modules/document/document.service.spec.ts`:

```ts
describe('document owner strong references', () => {
  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.department.findUnique = jest.fn();
  });

  it('rejects a missing ownerDepartmentId during document create', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', departmentId: 'dep1' });
    prisma.department.findUnique.mockResolvedValue(null);

    await expect(service.create({
      level: 2,
      title: 'SOP',
      control: { ownerDepartmentId: 'missing-dep' },
    } as any, { originalname: 'sop.pdf', size: 10, mimetype: 'application/pdf' } as any, 'u1'))
      .rejects.toThrow('负责部门不存在');
  });

  it('writes ownerDepartmentId and ownerUserId when both targets exist', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'u1', departmentId: 'dep1' })
      .mockResolvedValueOnce({ id: 'owner1', deletedAt: null });
    prisma.department.findUnique.mockResolvedValue({ id: 'dep-owner', deletedAt: null });
    prisma.document.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));
    prisma.pendingNumber.findFirst.mockResolvedValue(null);
    prisma.department.findUnique.mockResolvedValueOnce({ id: 'dep-owner', deletedAt: null });
    prisma.$queryRaw.mockResolvedValue([{ id: 'rule1', sequence: 1 }]);
    prisma.numberRule.update.mockResolvedValue({});
    storage.uploadFile.mockResolvedValue({ path: 'documents/sop.pdf' });
    prisma.document.create.mockResolvedValue({ id: 'doc1', ownerDepartmentId: 'dep-owner', ownerUserId: 'owner1' });
    operationLog.log.mockResolvedValue({});

    await service.create({
      level: 2,
      title: 'SOP',
      control: { ownerDepartmentId: 'dep-owner', ownerUserId: 'owner1', ownerDepartment: '品质部' },
    } as any, { originalname: 'sop.pdf', size: 10, mimetype: 'application/pdf' } as any, 'u1');

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerDepartmentId: 'dep-owner',
        ownerUserId: 'owner1',
        owner_department: '品质部',
      }),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document.service.spec.ts --runInBand
```

Expected: FAIL because DTO normalization and owner validation are not implemented.

- [ ] **Step 3: Add owner ID DTO fields**

In `server/src/modules/document/dto/document-control.dto.ts`, add after `ownerDepartment`:

```ts
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerDepartmentId?: string;
```

Keep the existing `ownerUserId` field.

- [ ] **Step 4: Normalize owner ID fields**

In `server/src/modules/document/services/document-control-metadata.service.ts`, change the returned object owner section to:

```ts
      owner_department: control.ownerDepartment?.trim() || null,
      ownerDepartmentId: control.ownerDepartmentId?.trim() || null,
      owner_user_id: control.ownerUserId?.trim() || null,
      ownerUserId: control.ownerUserId?.trim() || null,
```

- [ ] **Step 5: Add owner validation helper**

In `server/src/modules/document/document.service.ts`, add this private method near other helpers:

```ts
  private async validateOwnerReferences(controlData: Record<string, unknown>) {
    const ownerDepartmentId = typeof controlData.ownerDepartmentId === 'string'
      ? controlData.ownerDepartmentId
      : undefined;
    const ownerUserId = typeof controlData.ownerUserId === 'string'
      ? controlData.ownerUserId
      : undefined;

    if (ownerDepartmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: ownerDepartmentId, deletedAt: null },
      });
      if (!department) {
        throw new BusinessException(ErrorCode.NOT_FOUND, '负责部门不存在');
      }
    }

    if (ownerUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: ownerUserId, deletedAt: null },
      });
      if (!user) {
        throw new BusinessException(ErrorCode.NOT_FOUND, '负责人不存在');
      }
    }
  }
```

Call it after `const controlData = this.metadataService.normalize(...)` in both `create()` and `update()`:

```ts
    await this.validateOwnerReferences(controlData as Record<string, unknown>);
```

- [ ] **Step 6: Run test and commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document.service.spec.ts --runInBand
```

Expected: PASS.

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/modules/document/dto/document-control.dto.ts server/src/modules/document/services/document-control-metadata.service.ts server/src/modules/document/document.service.ts server/src/modules/document/document.service.spec.ts
git commit -m "feat: validate document owner references"
```

---

### Task 3: Record Form Landing Strong Template Relation

**Files:**
- Modify: `server/src/modules/document/services/record-form-landing.service.ts`
- Test: `server/src/modules/document/services/record-form-landing.service.spec.ts`

- [ ] **Step 1: Write failing relation include tests**

Add this test to `server/src/modules/document/services/record-form-landing.service.spec.ts`:

```ts
it('returns targetTemplate details for landing entries', async () => {
  modelLanding.listGroups.mockReturnValue([{ id: 'grp1' }]);
  modelLanding.getGroup.mockReturnValue({
    id: 'grp1',
    forms: [{ code: 'GRSS-PZ-JL-01', formName: '记录表', department: 'PZ', templateGroupId: 'g1' }],
  });
  prisma.recordFormLandingEntry.findMany.mockResolvedValue([{
    sourceCode: 'GRSS-PZ-JL-01',
    targetTemplateId: 'tmpl1',
    targetTemplate: { id: 'tmpl1', code: 'TMP-01', name: '记录模板', status: 'active' },
  }]);

  const result = await service.list({});

  expect(result[0].landingEntry.targetTemplate).toEqual({
    id: 'tmpl1',
    code: 'TMP-01',
    name: '记录模板',
    status: 'active',
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- record-form-landing.service.spec.ts --runInBand
```

Expected: FAIL because `targetTemplate` is not included.

- [ ] **Step 3: Include target template on list and get**

In `server/src/modules/document/services/record-form-landing.service.ts`, change both `findMany` and `findUnique` calls:

```ts
    const overrides = await this.prisma.recordFormLandingEntry.findMany({
      where: { sourceCode: { in: filtered.map((form) => form.code) } },
      include: {
        targetTemplate: { select: { id: true, code: true, name: true, status: true } },
      },
    });
```

```ts
    const entry = await this.prisma.recordFormLandingEntry.findUnique({
      where: { sourceCode: code },
      include: {
        targetTemplate: { select: { id: true, code: true, name: true, status: true } },
      },
    });
```

- [ ] **Step 4: Keep validation strict on writes**

Confirm `upsertTarget()` still rejects deleted templates:

```ts
      const template = await this.prisma.recordTemplate.findFirst({
        where: { id: dto.targetTemplateId, deletedAt: null },
      });
      if (!template) throw new NotFoundException(`记录模板不存在: ${dto.targetTemplateId}`);
```

Confirm related document validation remains:

```ts
      const count = await this.prisma.document.count({
        where: { id: { in: dto.relatedDocIds }, deletedAt: null },
      });
      if (count !== dto.relatedDocIds.length) {
        throw new NotFoundException('相关文件不存在或已删除');
      }
```

- [ ] **Step 5: Run test and commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- record-form-landing.service.spec.ts --runInBand
```

Expected: PASS.

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/modules/document/services/record-form-landing.service.ts server/src/modules/document/services/record-form-landing.service.spec.ts
git commit -m "feat: return record form landing template links"
```

---

### Task 4: Training Need Project Link Validation

**Files:**
- Modify: `server/src/modules/document/services/document-training-need.service.ts`
- Test: `server/src/modules/document/services/document-training-need.service.spec.ts`

- [ ] **Step 1: Write failing training project validation tests**

Add:

```ts
describe('link', () => {
  it('rejects a missing linkedTrainingProjectId', async () => {
    prisma.documentTrainingNeed.findUnique.mockResolvedValue({ id: 'need1', status: 'accepted' });
    prisma.trainingProject.findUnique.mockResolvedValue(null);

    await expect(service.link('need1', 'missing-project')).rejects.toThrow('培训项目不存在');
  });

  it('links only to an existing training project and includes project data in list', async () => {
    prisma.documentTrainingNeed.findUnique.mockResolvedValue({ id: 'need1', status: 'accepted' });
    prisma.trainingProject.findUnique.mockResolvedValue({ id: 'project1', title: '换版培训', status: 'planned' });
    prisma.documentTrainingNeed.update.mockResolvedValue({
      id: 'need1',
      status: 'linked',
      linkedTrainingProjectId: 'project1',
    });

    await service.link('need1', 'project1');

    expect(prisma.documentTrainingNeed.update).toHaveBeenCalledWith({
      where: { id: 'need1' },
      data: { status: 'linked', linkedTrainingProjectId: 'project1' },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document-training-need.service.spec.ts --runInBand
```

Expected: FAIL because `trainingProject.findUnique` is not checked.

- [ ] **Step 3: Validate project before linking**

In `server/src/modules/document/services/document-training-need.service.ts`, replace `link()` with:

```ts
  async link(id: string, linkedTrainingProjectId?: string) {
    if (!linkedTrainingProjectId) throw new BadRequestException('linkedTrainingProjectId is required');

    const need = await this.prisma.documentTrainingNeed.findUnique({ where: { id } });
    if (!need) throw new NotFoundException('培训需求不存在');

    const project = await this.prisma.trainingProject.findUnique({
      where: { id: linkedTrainingProjectId },
      select: { id: true, title: true, status: true },
    });
    if (!project) throw new NotFoundException('培训项目不存在');

    return this.prisma.documentTrainingNeed.update({
      where: { id },
      data: { status: 'linked', linkedTrainingProjectId },
    });
  }
```

- [ ] **Step 4: Include linked project in list**

In the `list()` query, change `include` to:

```ts
      include: {
        document: { select: { id: true, title: true, number: true, status: true } },
        linkedTrainingProject: { select: { id: true, title: true, status: true, scheduledDate: true } },
      },
```

- [ ] **Step 5: Run test and commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document-training-need.service.spec.ts --runInBand
```

Expected: PASS.

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/modules/document/services/document-training-need.service.ts server/src/modules/document/services/document-training-need.service.spec.ts
git commit -m "feat: validate training project links"
```

---

### Task 5: Read Requirement Scope Validation

**Files:**
- Modify: `server/src/modules/document/services/document-read-requirement.service.ts`
- Test: `server/src/modules/document/services/document-read-requirement.service.spec.ts`

- [ ] **Step 1: Write failing scope validation tests**

Add:

```ts
describe('scope validation', () => {
  it('rejects a missing user scope target', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.create('doc1', {
      scopeType: 'user',
      scopeId: 'missing-user',
    } as any, 'admin1')).rejects.toThrow('阅读范围用户不存在');
  });

  it('rejects a missing department scope target', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
    prisma.department.findUnique.mockResolvedValue(null);

    await expect(service.create('doc1', {
      scopeType: 'department',
      scopeId: 'missing-dep',
    } as any, 'admin1')).rejects.toThrow('阅读范围部门不存在');
  });

  it('rejects a missing role scope target', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'doc1' });
    prisma.role.findUnique.mockResolvedValue(null);

    await expect(service.create('doc1', {
      scopeType: 'role',
      scopeId: 'missing-role',
    } as any, 'admin1')).rejects.toThrow('阅读范围角色不存在');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document-read-requirement.service.spec.ts --runInBand
```

Expected: FAIL because target existence is not checked.

- [ ] **Step 3: Add validation helper**

In `server/src/modules/document/services/document-read-requirement.service.ts`, add:

```ts
  private async validateScopeTarget(scopeType: string, scopeId: string) {
    if (scopeType === 'user') {
      const user = await this.prisma.user.findUnique({ where: { id: scopeId, deletedAt: null } });
      if (!user) throw new NotFoundException('阅读范围用户不存在');
      return;
    }

    if (scopeType === 'department') {
      const department = await this.prisma.department.findUnique({ where: { id: scopeId, deletedAt: null } });
      if (!department) throw new NotFoundException('阅读范围部门不存在');
      return;
    }

    if (scopeType === 'role') {
      const role = await this.prisma.role.findUnique({ where: { id: scopeId, deletedAt: null } });
      if (!role) throw new NotFoundException('阅读范围角色不存在');
      return;
    }

    throw new BadRequestException('Unsupported read requirement scopeType');
  }
```

Call it in `create()` immediately after the allowed-type check:

```ts
    await this.validateScopeTarget(dto.scopeType, dto.scopeId);
```

- [ ] **Step 4: Run test and commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document-read-requirement.service.spec.ts --runInBand
```

Expected: PASS.

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/src/modules/document/services/document-read-requirement.service.ts server/src/modules/document/services/document-read-requirement.service.spec.ts
git commit -m "feat: validate read requirement scopes"
```

---

### Task 6: Frontend Compatibility And Validation Surfaces

**Files:**
- Modify: `client/src/api/document-control.ts`
- Modify: `client/src/views/documents/DocumentDetail.vue`
- Modify: `client/src/views/documents/DocumentUpload.vue`
- Modify: `client/src/views/documents/RecordFormLandingIndex.vue`
- Test: `client/src/views/documents/__tests__/DocumentDetail.spec.ts`
- Test: `client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts`

- [ ] **Step 1: Write failing detail fallback test**

In `client/src/views/documents/__tests__/DocumentDetail.spec.ts`, add:

```ts
it('shows resolved owner department before legacy owner_department', async () => {
  request.get.mockResolvedValueOnce({
    id: 'doc1',
    title: '质量手册',
    number: 'QM-001',
    level: 1,
    status: 'effective',
    version: 1,
    fileName: 'qm.pdf',
    fileSize: 100,
    creatorId: 'u1',
    creator: { name: 'Admin' },
    approver: null,
    approvedAt: null,
    createdAt: '2026-04-27T00:00:00.000Z',
    owner_department: '旧品质部',
    ownerDepartment: { id: 'dep1', name: '品质部' },
  });
  documentManagementApi.getVersions.mockResolvedValueOnce({ versions: [] });

  const wrapper = mount(DocumentDetail, { global: { stubs } });
  await flushPromises();

  expect(wrapper.text()).toContain('品质部');
  expect(wrapper.text()).not.toContain('旧品质部');
});
```

- [ ] **Step 2: Run frontend test to verify it fails**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentDetail.spec.ts
```

Expected: FAIL because the resolved owner relation is not rendered.

- [ ] **Step 3: Extend API types**

In `client/src/api/document-control.ts`, add owner fields to the document type used by document-control APIs:

```ts
  ownerDepartmentId?: string | null;
  ownerUserId?: string | null;
  ownerDepartment?: { id: string; name: string; code?: string } | null;
  ownerUser?: { id: string; name: string; username?: string } | null;
```

- [ ] **Step 4: Render resolved owner in detail**

In `client/src/views/documents/DocumentDetail.vue`, add helper functions in `<script setup>`:

```ts
const ownerDepartmentLabel = computed(() =>
  document.value?.ownerDepartment?.name || document.value?.owner_department || '-',
);

const ownerUserLabel = computed(() =>
  document.value?.ownerUser?.name || document.value?.owner_user_id || '-',
);
```

Change the owner descriptions to use:

```vue
<el-descriptions-item label="负责部门">{{ ownerDepartmentLabel }}</el-descriptions-item>
<el-descriptions-item label="负责人">{{ ownerUserLabel }}</el-descriptions-item>
```

- [ ] **Step 5: Send owner IDs only when present**

In `client/src/views/documents/DocumentUpload.vue`, when building the upload `FormData`, use this structure for control metadata:

```ts
const controlPayload: Record<string, unknown> = {
  documentType: formData.documentType || undefined,
  sourceFolder: formData.sourceFolder || undefined,
  ownerDepartment: formData.ownerDepartment || undefined,
  ownerDepartmentId: formData.ownerDepartmentId || undefined,
  ownerUserId: formData.ownerUserId || undefined,
  tags: formData.tags || [],
};
form.append('control', JSON.stringify(controlPayload));
```

If the current component does not yet expose department/user selectors, keep the existing text inputs and leave `ownerDepartmentId` / `ownerUserId` unset. Do not invent fake IDs.

- [ ] **Step 6: Surface record landing save errors**

In `client/src/views/documents/RecordFormLandingIndex.vue`, ensure the save catch block reads the backend message:

```ts
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || '保存落地入口失败');
  }
```

- [ ] **Step 7: Run frontend tests and commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentDetail.spec.ts RecordFormLandingIndex.spec.ts
```

Expected: PASS.

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add client/src/api/document-control.ts client/src/views/documents/DocumentDetail.vue client/src/views/documents/DocumentUpload.vue client/src/views/documents/RecordFormLandingIndex.vue client/src/views/documents/__tests__/DocumentDetail.spec.ts client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts
git commit -m "feat: surface document strong link metadata"
```

---

### Task 7: Final Verification

**Files:**
- Verify all files changed by Tasks 1-6.

- [ ] **Step 1: Run targeted backend tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document.service.spec.ts record-form-landing.service.spec.ts document-training-need.service.spec.ts document-read-requirement.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run server build**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run targeted frontend tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentDetail.spec.ts RecordFormLandingIndex.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Run frontend type build**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run build:check
```

Expected: PASS. If this fails only on pre-existing `TS6133` unused-variable issues outside phase 1 files, record the exact files in the PR notes and do not hide the failure.

- [ ] **Step 5: Inspect final diff**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git diff --stat origin/master...HEAD
git diff --check origin/master...HEAD
```

Expected: `git diff --check` exits 0.

- [ ] **Step 6: Final commit if verification changed generated files**

If `npm run prisma:generate` or frontend auto-import updated tracked generated files, commit them:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git status -sb
git add server/src/prisma/schema.prisma client/components.d.ts
git commit -m "chore: refresh generated metadata"
```

Skip this commit when `git status -sb` shows no tracked generated-file changes.

---

## Acceptance Criteria

- New document writes reject missing `ownerDepartmentId` and `ownerUserId`.
- Legacy `owner_department` and `owner_user_id` fields still display and do not block old documents.
- `RecordFormLandingEntry.targetTemplateId` has a real FK and deleted/missing templates are rejected on new writes.
- `RecordFormLandingEntry.relatedDocIds` rejects missing or soft-deleted documents.
- `DocumentTrainingNeed.linkedTrainingProjectId` has a real FK and cannot link to a missing training project.
- `DocumentReadRequirement.scopeType/scopeId` validates user, department, and role targets on create.
- Server build passes.
- Targeted backend and frontend tests pass.
- Any remaining `client npm run build:check` failure is documented with exact files and confirmed not introduced by phase 1.

## Self-Review

Spec coverage:
- Document owner strong references are covered in Tasks 1, 2, and 6.
- Record-form landing template and document validation are covered in Tasks 1 and 3.
- Training project strong link is covered in Tasks 1 and 4.
- Read requirement scope validation is covered in Task 5.
- Legacy compatibility is covered in Tasks 2 and 6.
- Final verification is covered in Task 7.

Placeholder scan:
- This plan contains no placeholder markers, no deferred validation language, and no cross-task shorthand implementation steps.

Type consistency:
- The plan consistently uses `ownerDepartmentId`, `ownerUserId`, `targetTemplate`, `linkedTrainingProject`, and `linkedTrainingProjectId`.
