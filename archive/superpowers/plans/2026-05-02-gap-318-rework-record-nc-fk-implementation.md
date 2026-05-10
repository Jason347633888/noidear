# GAP-318 ReworkRecord NonConformance FK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the nonconformance/rework/traceability model during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make every `ReworkRecord` explicitly and persistently linked to one current-company `NonConformance`.

**Architecture:** Add a required Prisma/database FK from `ReworkRecord.nc_id` to `NonConformance.id`, guarded by migration preflight checks. Tighten DTO, service validation, and the existing rework creation form so API callers cannot create orphan rework evidence.

**Tech Stack:** Prisma schema/migration, NestJS service/DTO, class-validator, Vue 3, Element Plus, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-318 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认本 GAP 强化 `NonConformance -> ReworkRecord -> ProductionBatch` 质量证据链；不得新增平行不合格事实源，不得移除 `ReworkRecord.production_batch_id`，不得自动猜测历史返工记录的真实 NC 来源。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 如果 migration preflight 发现空 `nc_id`、orphan `nc_id`、跨公司 NC 关联，或生产批次来源 NC 与返工生产批次不一致，不得自动回填；停止并回报需要业务确认。
- **命令约束：** 本计划只使用当前仓库 npm workspaces 命令；不得新增 pnpm 命令。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502110000_rework_record_nc_fk/migration.sql`
- Modify: `server/src/modules/rework-record/dto/create-rework-record.dto.ts`
- Modify: `server/src/modules/rework-record/rework-record.service.ts`
- Modify: `server/src/modules/rework-record/rework-record.service.spec.ts`
- Modify: `client/src/api/rework-record.ts`
- Modify: `client/src/views/rework-record/ReworkRecordList.vue`
- Do not modify: `server/src/modules/non-conformance/`
- Do not modify: `server/src/modules/corrective-action/`
- Do not modify: `server/src/modules/traceability/`
- Do not modify: `server/src/modules/ccp/`

## Task 1: Add focused ReworkRecord service coverage

**Files:**
- Modify: `server/src/modules/rework-record/rework-record.service.spec.ts`

- [ ] **Step 1: Extend the Prisma mock**

In `server/src/modules/rework-record/rework-record.service.spec.ts`, replace:

```ts
  const prisma = {
    reworkRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };
```

with:

```ts
  const prisma = {
    reworkRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    nonConformance: {
      findFirst: jest.fn(),
    },
  };
```

- [ ] **Step 2: Update the existing create test to use a valid current-company NC**

In the test `it('writes rework records to the authenticated company', async () => {`, replace the body with:

```ts
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc1',
      source_type: 'production_batch',
      source_id: 'b1',
    });
    prisma.reworkRecord.create.mockResolvedValue({ id: 'r1' });

    await service.create(
      {
        production_batch_id: 'b1',
        nc_id: 'nc1',
        rework_reason: '返工',
        rework_qty: 1,
        unit: 'kg',
        rework_date: '2026-05-01',
        quality_verdict: 'pass',
      },
      '2',
    );

    expect(prisma.nonConformance.findFirst).toHaveBeenCalledWith({
      where: { id: 'nc1', company_id: '2' },
      select: { id: true, source_type: true, source_id: true },
    });
    expect(prisma.reworkRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: '2',
          production_batch_id: 'b1',
          nc_id: 'nc1',
        }),
      }),
    );
```

- [ ] **Step 3: Add missing and invalid NC tests**

Add these tests before `it('blocks delete when rework record is outside current company', async () => {`:

```ts
  it('rejects creation when nc_id is missing', async () => {
    await expect(
      service.create(
        {
          production_batch_id: 'b1',
          rework_reason: '返工',
          rework_qty: 1,
          unit: 'kg',
          rework_date: '2026-05-01',
          quality_verdict: 'pass',
        } as any,
        '2',
      ),
    ).rejects.toThrow('关联不合格记录不能为空');

    expect(prisma.nonConformance.findFirst).not.toHaveBeenCalled();
    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the nonconformance is missing or outside current company', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          production_batch_id: 'b1',
          nc_id: 'missing-nc',
          rework_reason: '返工',
          rework_qty: 1,
          unit: 'kg',
          rework_date: '2026-05-01',
          quality_verdict: 'pass',
        },
        '2',
      ),
    ).rejects.toThrow('关联不合格记录不存在');

    expect(prisma.nonConformance.findFirst).toHaveBeenCalledWith({
      where: { id: 'missing-nc', company_id: '2' },
      select: { id: true, source_type: true, source_id: true },
    });
    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
  });
```

- [ ] **Step 4: Add production-batch source consistency coverage**

Add this test after the invalid NC test:

```ts
  it('rejects creation when production batch differs from the NC source production batch', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc1',
      source_type: 'production_batch',
      source_id: 'batch-from-nc',
    });

    await expect(
      service.create(
        {
          production_batch_id: 'different-batch',
          nc_id: 'nc1',
          rework_reason: '返工',
          rework_qty: 1,
          unit: 'kg',
          rework_date: '2026-05-01',
          quality_verdict: 'pass',
        },
        '2',
      ),
    ).rejects.toThrow('返工生产批次必须与不合格来源批次一致');

    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
  });
```

- [ ] **Step 5: Run the focused test and verify it fails before implementation**

```bash
(cd server && npm test -- rework-record.service.spec.ts --runInBand)
```

Expected: FAIL because `ReworkRecordService.create()` does not yet validate `nc_id` or call `nonConformance.findFirst`.

## Task 2: Make the Prisma relation required

**Files:**
- Modify: `server/src/prisma/schema.prisma`

- [ ] **Step 1: Add the reverse relation to `NonConformance`**

In `model NonConformance`, directly after:

```prisma
  updated_at      DateTime  @updatedAt
```

add:

```prisma

  rework_records  ReworkRecord[]
```

- [ ] **Step 2: Replace the bare nullable `nc_id` field**

In `model ReworkRecord`, replace:

```prisma
  nc_id               String?
```

with:

```prisma
  nc_id               String
  non_conformance     NonConformance @relation(fields: [nc_id], references: [id], onDelete: Restrict)
```

- [ ] **Step 3: Add an index for NC reverse lookup**

In `model ReworkRecord`, replace:

```prisma
  updated_at          DateTime        @updatedAt
}
```

with:

```prisma
  updated_at          DateTime        @updatedAt

  @@index([nc_id])
}
```

## Task 3: Add guarded migration

**Files:**
- Add: `server/src/prisma/migrations/20260502110000_rework_record_nc_fk/migration.sql`

- [ ] **Step 1: Create the migration SQL**

```sql
-- Require every ReworkRecord to link to a real current-company NonConformance.
-- This migration intentionally fails if legacy data cannot satisfy the constraint.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ReworkRecord"
    WHERE "nc_id" IS NULL OR btrim("nc_id") = ''
  ) THEN
    RAISE EXCEPTION 'Cannot require ReworkRecord.nc_id: legacy rows with NULL or empty nc_id exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ReworkRecord" rw
    LEFT JOIN "NonConformance" nc ON nc."id" = rw."nc_id"
    WHERE nc."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add ReworkRecord.nc_id FK: orphan nc_id rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ReworkRecord" rw
    JOIN "NonConformance" nc ON nc."id" = rw."nc_id"
    WHERE rw."company_id" <> nc."company_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add ReworkRecord.nc_id FK: cross-company NC links exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ReworkRecord" rw
    JOIN "NonConformance" nc ON nc."id" = rw."nc_id"
    WHERE nc."source_type" = 'production_batch'
      AND rw."production_batch_id" <> nc."source_id"
  ) THEN
    RAISE EXCEPTION 'Cannot add ReworkRecord.nc_id FK: production batch does not match NC source_id';
  END IF;
END $$;

ALTER TABLE "ReworkRecord" DROP CONSTRAINT IF EXISTS "ReworkRecord_nc_id_fkey";
ALTER TABLE "ReworkRecord" ALTER COLUMN "nc_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "ReworkRecord_nc_id_idx"
  ON "ReworkRecord"("nc_id");

ALTER TABLE "ReworkRecord"
  ADD CONSTRAINT "ReworkRecord_nc_id_fkey"
  FOREIGN KEY ("nc_id") REFERENCES "NonConformance"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 2: Do not add data backfill**

Do not write `UPDATE "ReworkRecord" SET "nc_id" = ...`. If the preflight fails, stop and report.

## Task 4: Require and validate NC ID in the backend contract

**Files:**
- Modify: `server/src/modules/rework-record/dto/create-rework-record.dto.ts`
- Modify: `server/src/modules/rework-record/rework-record.service.ts`

- [ ] **Step 1: Require `nc_id` in the DTO**

In `server/src/modules/rework-record/dto/create-rework-record.dto.ts`, replace:

```ts
  @IsOptional()
  @IsString()
  nc_id?: string;
```

with:

```ts
  @IsString()
  nc_id: string;
```

- [ ] **Step 2: Import `BadRequestException`**

In `server/src/modules/rework-record/rework-record.service.ts`, replace:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
```

with:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
```

- [ ] **Step 3: Add NC validation before create**

In `server/src/modules/rework-record/rework-record.service.ts`, replace the full `create()` method with:

```ts
  async create(dto: CreateReworkRecordDto, companyId: string) {
    const ncId = dto.nc_id?.trim();
    if (!ncId) {
      throw new BadRequestException('关联不合格记录不能为空');
    }

    const nonConformance = await this.prisma.nonConformance.findFirst({
      where: { id: ncId, company_id: companyId },
      select: { id: true, source_type: true, source_id: true },
    });
    if (!nonConformance) {
      throw new BadRequestException('关联不合格记录不存在');
    }

    if (nonConformance.source_type === 'production_batch' && nonConformance.source_id !== dto.production_batch_id) {
      throw new BadRequestException('返工生产批次必须与不合格来源批次一致');
    }

    return this.prisma.reworkRecord.create({
      data: {
        ...dto,
        nc_id: ncId,
        company_id: companyId,
        rework_date: new Date(dto.rework_date),
        rework_qty: dto.rework_qty,
      },
    });
  }
```

- [ ] **Step 4: Run the focused test and verify it passes**

```bash
(cd server && npm test -- rework-record.service.spec.ts --runInBand)
```

Expected: PASS. Tests cover current-company NC validation, required `nc_id`, invalid NC rejection, production batch source consistency, and delete scoping.

## Task 5: Tighten frontend API types and form validation

**Files:**
- Modify: `client/src/api/rework-record.ts`
- Modify: `client/src/views/rework-record/ReworkRecordList.vue`

- [ ] **Step 1: Make API `nc_id` non-null and required**

In `client/src/api/rework-record.ts`, replace:

```ts
  nc_id: string | null;
```

with:

```ts
  nc_id: string;
```

In the same file, replace:

```ts
  nc_id?: string;
```

with:

```ts
  nc_id: string;
```

- [ ] **Step 2: Make the form field required**

In `client/src/views/rework-record/ReworkRecordList.vue`, replace:

```vue
        <el-form-item label="关联不合格品">
          <el-input v-model="createForm.nc_id" placeholder="可选，不合格品记录ID" />
        </el-form-item>
```

with:

```vue
        <el-form-item label="关联不合格品" prop="nc_id">
          <el-input v-model="createForm.nc_id" placeholder="请输入不合格品记录ID" />
        </el-form-item>
```

- [ ] **Step 3: Add a required validation rule**

In `client/src/views/rework-record/ReworkRecordList.vue`, replace:

```ts
  rework_date: [{ required: true, message: '请选择返工日期', trigger: 'change' }],
  quality_verdict: [{ required: true, message: '请选择质量判定', trigger: 'change' }],
```

with:

```ts
  rework_date: [{ required: true, message: '请选择返工日期', trigger: 'change' }],
  quality_verdict: [{ required: true, message: '请选择质量判定', trigger: 'change' }],
  nc_id: [{ required: true, message: '请输入关联不合格品', trigger: 'blur' }],
```

- [ ] **Step 4: Submit the required `nc_id`**

In `client/src/views/rework-record/ReworkRecordList.vue`, replace:

```ts
      nc_id: createForm.nc_id || undefined,
```

with:

```ts
      nc_id: createForm.nc_id,
```

- [ ] **Step 5: Do not add a new selector in this PR**

Do not add a `NonConformanceSelect` component in this GAP. The FK and service validation are the source-of-truth hardening; selector UX can be planned separately if needed.

## Task 6: Run schema and build verification

**Files:**
- Verify: `server/src/prisma/schema.prisma`
- Verify: `server/src/prisma/migrations/20260502110000_rework_record_nc_fk/migration.sql`
- Verify: `server/src/modules/rework-record/rework-record.service.spec.ts`
- Verify: `client/src/api/rework-record.ts`
- Verify: `client/src/views/rework-record/ReworkRecordList.vue`

- [ ] **Step 1: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS. Prisma reports the schema is valid and recognizes the `NonConformance` to `ReworkRecord` relation.

- [ ] **Step 2: Run focused Jest coverage**

```bash
(cd server && npm test -- rework-record.service.spec.ts --runInBand)
```

Expected: PASS. Tests cover create validation and existing delete scoping.

- [ ] **Step 3: Build the server**

```bash
npm run build:server
```

Expected: PASS. Nest build completes without TypeScript errors.

- [ ] **Step 4: Build the client**

```bash
npm run build:client
```

Expected: PASS. Vue build completes without TypeScript errors.

## Task 7: Final diff review and commit

**Files:**
- Verify all files changed by this plan.

- [ ] **Step 1: Confirm only planned files changed**

```bash
git status --short
```

Expected:

```text
 M client/src/api/rework-record.ts
 M client/src/views/rework-record/ReworkRecordList.vue
 M server/src/modules/rework-record/dto/create-rework-record.dto.ts
 M server/src/modules/rework-record/rework-record.service.spec.ts
 M server/src/modules/rework-record/rework-record.service.ts
 M server/src/prisma/schema.prisma
?? server/src/prisma/migrations/20260502110000_rework_record_nc_fk/
```

- [ ] **Step 2: Check whitespace**

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 3: Review the migration for forbidden backfill**

```bash
rg -n 'UPDATE "ReworkRecord"|SET "nc_id"' server/src/prisma/migrations/20260502110000_rework_record_nc_fk/migration.sql
```

Expected: no output. The migration must only preflight, set NOT NULL, add index, and add FK.

- [ ] **Step 4: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260502110000_rework_record_nc_fk/migration.sql server/src/modules/rework-record/dto/create-rework-record.dto.ts server/src/modules/rework-record/rework-record.service.ts server/src/modules/rework-record/rework-record.service.spec.ts client/src/api/rework-record.ts client/src/views/rework-record/ReworkRecordList.vue
git commit -m "fix: require nc fk for rework records"
```

Expected: one commit containing only the GAP-318 implementation files.
