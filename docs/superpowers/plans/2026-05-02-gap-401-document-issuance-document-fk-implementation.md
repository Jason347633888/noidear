# GAP-401 DocumentIssuance Document FK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the document-control model during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make every `DocumentIssuance` persistently linked to one controlled `Document` while preserving issuance-time name and code snapshots.

**Architecture:** Add a database-level non-null FK from `DocumentIssuance.document_id` to `Document.id`, guarded by exact-code migration checks. Add DTO and service validation so API callers get clear 400 errors, write `document_name` / `document_code` from the selected `Document`, and change the Vue form from free-text file fields to a controlled-document selector.

**Tech Stack:** Prisma schema/migration, NestJS service/DTO/controller, class-validator, Vue 3, Element Plus, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-401 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** `Document` 是体系文件事实源；`DocumentIssuance` 是发放台账，不得继续以 `document_name` / `document_code` 文本作为新记录事实源，也不得新增平行文件清单。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展到 GAP-400/GAP-406 版本展示、多租户 company_id、培训需求、阅读确认、内审报告归档或 CAPA。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 如果 migration preflight 发现发放记录缺少 `document_code`、无法唯一匹配 `Document.doc_code` / `Document.number`、或存在 orphan `document_id`，不得自动猜测回填；停止并回报需要业务确认具体受控文件。
- **命令约束：** 本计划只使用当前仓库 npm workspaces 命令；不得新增 pnpm 命令。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502113000_document_issuance_document_fk/migration.sql`
- Modify: `server/src/modules/document-issuance/dto/create-document-issuance.dto.ts`
- Modify: `server/src/modules/document-issuance/document-issuance.service.ts`
- Add: `server/src/modules/document-issuance/document-issuance.service.spec.ts`
- Modify: `client/src/api/document-issuance.ts`
- Modify: `client/src/views/document-issuance/DocumentIssuanceList.vue`
- Do not modify: `server/src/modules/document/document.service.ts`
- Do not modify: `server/src/modules/document/services/document-training-need.service.ts`
- Do not modify: `server/src/modules/document/services/document-read-requirement.service.ts`
- Do not modify: `server/src/modules/internal-audit/`

## Task 1: Add focused service coverage

**Files:**
- Add: `server/src/modules/document-issuance/document-issuance.service.spec.ts`

- [ ] **Step 1: Create the service spec**

Create `server/src/modules/document-issuance/document-issuance.service.spec.ts` with:

```ts
import { BadRequestException } from '@nestjs/common';
import { DocumentIssuanceService } from './document-issuance.service';

describe('DocumentIssuanceService', () => {
  function createPrismaMock(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      document: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'doc-1',
          title: '文件发放控制程序',
          doc_code: 'GRSS-CX-01',
          number: 'CX-001',
        }),
      },
      documentIssuance: {
        create: jest.fn().mockResolvedValue({ id: 'di-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: 'di-1', deleted_at: expect.any(Date) }),
      },
      ...overrides,
    } as any;
  }

  it('rejects creation when document_id is missing', async () => {
    const prisma = createPrismaMock();
    const service = new DocumentIssuanceService(prisma);

    await expect(
      service.create({
        document_name: '用户手填文件',
        quantity: 1,
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.document.findFirst).not.toHaveBeenCalled();
    expect(prisma.documentIssuance.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the selected document does not exist', async () => {
    const prisma = createPrismaMock({
      document: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new DocumentIssuanceService(prisma);

    await expect(
      service.create({
        document_id: 'missing-doc',
        quantity: 1,
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: { id: 'missing-doc', deletedAt: null },
      select: { id: true, title: true, doc_code: true, number: true },
    });
    expect(prisma.documentIssuance.create).not.toHaveBeenCalled();
  });

  it('creates an issuance linked to a controlled document and writes snapshots from Document', async () => {
    const prisma = createPrismaMock();
    const service = new DocumentIssuanceService(prisma);

    await service.create({
      document_id: 'doc-1',
      document_name: '用户手填名称应被忽略',
      document_code: 'USER-CODE',
      issued_to: '张三',
      issued_by: '李四',
      quantity: 2,
      purpose: '岗位使用',
      issued_at: '2026-05-02T10:30:00',
      notes: '纸质版',
    } as any);

    expect(prisma.documentIssuance.create).toHaveBeenCalledWith({
      data: {
        document_id: 'doc-1',
        document_name: '文件发放控制程序',
        document_code: 'GRSS-CX-01',
        issued_to: '张三',
        issued_by: '李四',
        quantity: 2,
        purpose: '岗位使用',
        issued_at: new Date('2026-05-02T10:30:00'),
        notes: '纸质版',
        company_id: '1',
      },
    });
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails before implementation**

```bash
(cd server && npm test -- document-issuance.service.spec.ts --runInBand)
```

Expected: FAIL because `DocumentIssuanceService.create()` has not yet checked `document.findFirst` and still requires free-text `document_name`.

## Task 2: Add the Prisma relation and migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502113000_document_issuance_document_fk/migration.sql`

- [ ] **Step 1: Add the reverse relation to `Document`**

In `model Document`, directly below:

```prisma
  businessLinks       BusinessDocumentLink[]
```

add:

```prisma
  documentIssuances  DocumentIssuance[]
```

- [ ] **Step 2: Add `document_id` and relation to `DocumentIssuance`**

In `model DocumentIssuance`, replace:

```prisma
  company_id      String
  document_name   String
```

with:

```prisma
  company_id      String
  document_id     String
  document        Document  @relation(fields: [document_id], references: [id], onDelete: Restrict)
  document_name   String
```

- [ ] **Step 3: Add the document index**

At the end of `model DocumentIssuance`, replace:

```prisma
  deleted_at      DateTime?
}
```

with:

```prisma
  deleted_at      DateTime?

  @@index([document_id])
}
```

- [ ] **Step 4: Create the guarded migration SQL**

Create `server/src/prisma/migrations/20260502113000_document_issuance_document_fk/migration.sql` with:

```sql
-- Link every document issuance ledger row to the controlled Document fact source.
-- Historical rows are matched only by exact document_code against Document.doc_code or Document.number.
-- The migration intentionally fails when a row cannot be matched uniquely.

ALTER TABLE "DocumentIssuance"
  ADD COLUMN "document_id" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "DocumentIssuance" di
    WHERE di."document_code" IS NULL OR btrim(di."document_code") = ''
  ) THEN
    RAISE EXCEPTION 'Cannot backfill DocumentIssuance.document_id: legacy rows without document_code exist';
  END IF;

  IF EXISTS (
    WITH candidates AS (
      SELECT di."id" AS issuance_id, d."id" AS document_id
      FROM "DocumentIssuance" di
      JOIN "documents" d
        ON d."deletedAt" IS NULL
       AND (d."doc_code" = di."document_code" OR d."number" = di."document_code")
    )
    SELECT 1
    FROM candidates
    GROUP BY issuance_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot backfill DocumentIssuance.document_id: document_code matches multiple Documents';
  END IF;

  UPDATE "DocumentIssuance" di
  SET "document_id" = matched."document_id"
  FROM (
    SELECT di_inner."id" AS issuance_id, MAX(d."id") AS document_id
    FROM "DocumentIssuance" di_inner
    JOIN "documents" d
      ON d."deletedAt" IS NULL
     AND (d."doc_code" = di_inner."document_code" OR d."number" = di_inner."document_code")
    GROUP BY di_inner."id"
  ) matched
  WHERE di."id" = matched."issuance_id";

  IF EXISTS (SELECT 1 FROM "DocumentIssuance" WHERE "document_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require DocumentIssuance.document_id: unmatched legacy rows exist';
  END IF;
END $$;

ALTER TABLE "DocumentIssuance" ALTER COLUMN "document_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "DocumentIssuance_document_id_idx"
  ON "DocumentIssuance"("document_id");

ALTER TABLE "DocumentIssuance"
  ADD CONSTRAINT "DocumentIssuance_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 5: Do not add heuristic backfill**

Do not write any migration that matches by `document_name`, fuzzy title, latest version, source folder, or default document. If the preflight fails, stop and report.

- [ ] **Step 6: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

## Task 3: Require `document_id` in DTO and service

**Files:**
- Modify: `server/src/modules/document-issuance/dto/create-document-issuance.dto.ts`
- Modify: `server/src/modules/document-issuance/document-issuance.service.ts`

- [ ] **Step 1: Update DTO imports**

Replace:

```ts
import { IsString, IsOptional, IsInt, Min, IsDateString } from 'class-validator';
```

with:

```ts
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
```

- [ ] **Step 2: Add required `document_id` and make snapshots optional in DTO**

Replace:

```ts
  @IsString()
  document_name: string;
```

with:

```ts
  @IsString()
  @IsNotEmpty()
  document_id: string;

  @IsOptional()
  @IsString()
  document_name?: string;
```

Keep the existing optional `document_code?: string` field; it remains accepted for compatibility but is ignored by the service for new records.

- [ ] **Step 3: Update service imports**

Replace:

```ts
import { Injectable } from '@nestjs/common';
```

with:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
```

- [ ] **Step 4: Replace `create()` with document validation and snapshot writing**

Replace the full `create()` method in `server/src/modules/document-issuance/document-issuance.service.ts` with:

```ts
  async create(dto: CreateDocumentIssuanceDto) {
    if (!dto.document_id) {
      throw new BadRequestException('受控文件不能为空');
    }

    const document = await this.prisma.document.findFirst({
      where: { id: dto.document_id, deletedAt: null },
      select: { id: true, title: true, doc_code: true, number: true },
    });

    if (!document) {
      throw new BadRequestException('受控文件不存在或已删除');
    }

    const {
      document_name: _ignoredDocumentName,
      document_code: _ignoredDocumentCode,
      ...issuanceData
    } = dto;

    return this.prisma.documentIssuance.create({
      data: {
        ...issuanceData,
        document_name: document.title,
        document_code: document.doc_code ?? document.number,
        company_id: '1',
        quantity: dto.quantity ?? 1,
        issued_at: dto.issued_at ? new Date(dto.issued_at) : new Date(),
      },
    });
  }
```

- [ ] **Step 5: Include the linked document in list responses**

In `findAll()`, replace:

```ts
    return this.prisma.documentIssuance.findMany({
      where: { deleted_at: null },
      orderBy: { issued_at: 'desc' },
      take: 200,
    });
```

with:

```ts
    return this.prisma.documentIssuance.findMany({
      where: { deleted_at: null },
      include: {
        document: {
          select: { id: true, title: true, number: true, doc_code: true, status: true, versionNo: true },
        },
      },
      orderBy: { issued_at: 'desc' },
      take: 200,
    });
```

- [ ] **Step 6: Run focused service tests**

```bash
(cd server && npm test -- document-issuance.service.spec.ts --runInBand)
```

Expected: PASS, including missing document, nonexistent document, and snapshot-from-`Document` cases.

## Task 4: Update the client API contract

**Files:**
- Modify: `client/src/api/document-issuance.ts`

- [ ] **Step 1: Add linked document fields to the response type**

In `DocumentIssuance`, replace:

```ts
  document_name: string;
```

with:

```ts
  document_id: string;
  document_name: string;
```

Then add this field before the closing `}` of `DocumentIssuance`:

```ts
  document?: {
    id: string;
    title: string;
    number: string;
    doc_code?: string | null;
    status: string;
    versionNo: number;
  } | null;
```

- [ ] **Step 2: Tighten create payload**

Replace:

```ts
export interface CreateDocumentIssuancePayload {
  document_name: string;
  document_code?: string;
```

with:

```ts
export interface CreateDocumentIssuancePayload {
  document_id: string;
  document_name?: string;
  document_code?: string;
```

## Task 5: Make the frontend select a controlled document

**Files:**
- Modify: `client/src/views/document-issuance/DocumentIssuanceList.vue`

- [ ] **Step 1: Replace free-text document fields in the dialog**

Replace:

```vue
        <el-form-item label="文件名称" prop="document_name">
          <el-input v-model="createForm.document_name" placeholder="请输入文件名称" />
        </el-form-item>
        <el-form-item label="文件编号">
          <el-input v-model="createForm.document_code" placeholder="可选" />
        </el-form-item>
```

with:

```vue
        <el-form-item label="受控文件" prop="document_id">
          <el-select
            v-model="createForm.document_id"
            filterable
            remote
            reserve-keyword
            :remote-method="searchDocuments"
            :loading="documentLoading"
            placeholder="搜索文件编号或名称"
            style="width: 100%"
          >
            <el-option
              v-for="doc in documentOptions"
              :key="doc.id"
              :label="`${doc.doc_code || doc.number} - ${doc.title}`"
              :value="doc.id"
            />
          </el-select>
        </el-form-item>
```

- [ ] **Step 2: Update imports**

Replace:

```ts
import documentIssuanceApi, { type DocumentIssuance } from '@/api/document-issuance';
```

with:

```ts
import documentIssuanceApi, { type DocumentIssuance } from '@/api/document-issuance';
import { documentControlApi, type DocumentControlDocument } from '@/api/document-control';
```

- [ ] **Step 3: Add document selector state**

Below:

```ts
const loading = ref(false);
```

add:

```ts
const documentLoading = ref(false);
const documentOptions = ref<DocumentControlDocument[]>([]);
```

- [ ] **Step 4: Update create form state**

Replace:

```ts
const createForm = reactive({
  document_name: '',
  document_code: '',
```

with:

```ts
const createForm = reactive({
  document_id: '',
```

Remove every `createForm.document_name = ''` and `createForm.document_code = ''` assignment from `openCreateDialog()`, and add:

```ts
  createForm.document_id = '';
```

- [ ] **Step 5: Update form rules**

Replace:

```ts
const createRules: FormRules = {
  document_name: [{ required: true, message: '请输入文件名称', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
};
```

with:

```ts
const createRules: FormRules = {
  document_id: [{ required: true, message: '请选择受控文件', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
};
```

- [ ] **Step 6: Add document search helper**

Add this helper below `formatDate()`:

```ts
async function searchDocuments(keyword = '') {
  documentLoading.value = true;
  try {
    const res = await documentControlApi.listDocuments({
      keyword: keyword || undefined,
      limit: 20,
    });
    documentOptions.value = res.list || [];
  } catch {
    ElMessage.error('加载受控文件失败');
  } finally {
    documentLoading.value = false;
  }
}
```

- [ ] **Step 7: Preload selector options when opening the dialog**

In `openCreateDialog()`, after `createDialogVisible.value = true;`, add:

```ts
  searchDocuments();
```

- [ ] **Step 8: Submit `document_id` instead of free text**

In `handleCreate()`, replace:

```ts
      document_name: createForm.document_name,
      document_code: createForm.document_code || undefined,
```

with:

```ts
      document_id: createForm.document_id,
```

Do not submit `document_name` or `document_code`; the server writes snapshots from the selected `Document`.

## Task 6: Verify the implementation

**Files:**
- No additional edits unless a verification failure points to a file already listed in this plan.

- [ ] **Step 1: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

- [ ] **Step 2: Run focused backend tests**

```bash
(cd server && npm test -- document-issuance.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 3: Build the client**

```bash
npm run build -w client
```

Expected: PASS. If unrelated pre-existing TypeScript errors block the full client build, stop and report the exact errors to the main agent.

- [ ] **Step 4: Run repository-level verification if dependencies are already installed**

```bash
npm run verify
```

Expected: PASS. If dependency installation is missing or this command fails outside files touched by this plan, report the exact failure and do not broaden the scope.

## Task 7: Commit and hand off

**Files:**
- All implementation files listed in File Map.

- [ ] **Step 1: Inspect diff scope**

```bash
git status --short
git diff -- server/src/prisma/schema.prisma server/src/prisma/migrations/20260502113000_document_issuance_document_fk/migration.sql server/src/modules/document-issuance/dto/create-document-issuance.dto.ts server/src/modules/document-issuance/document-issuance.service.ts server/src/modules/document-issuance/document-issuance.service.spec.ts client/src/api/document-issuance.ts client/src/views/document-issuance/DocumentIssuanceList.vue
```

Expected: only the files listed in this plan changed.

- [ ] **Step 2: Commit implementation changes**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260502113000_document_issuance_document_fk/migration.sql server/src/modules/document-issuance/dto/create-document-issuance.dto.ts server/src/modules/document-issuance/document-issuance.service.ts server/src/modules/document-issuance/document-issuance.service.spec.ts client/src/api/document-issuance.ts client/src/views/document-issuance/DocumentIssuanceList.vue
git commit -m "feat: link document issuances to documents"
```

Expected: commit succeeds. Do not include unrelated files.
