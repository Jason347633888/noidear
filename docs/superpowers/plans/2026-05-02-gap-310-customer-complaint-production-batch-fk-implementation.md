# GAP-310 CustomerComplaint ProductionBatch FK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the complaint/recall model during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make every `CustomerComplaint` persistently and explicitly linked to one `ProductionBatch`.

**Architecture:** Add a database-level non-null FK from `CustomerComplaint.production_batch_id` to `ProductionBatch.id`, guarded by migration preflight checks. Add DTO and service validation so API callers get clear 400 errors, and tighten the existing customer-complaint form so it must submit a selected production batch.

**Tech Stack:** Prisma schema/migration, NestJS service/DTO/controller, class-validator, Vue 3, Element Plus, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-310 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认正式 `CustomerComplaint` 必须进入 `CustomerComplaint -> ProductionBatch -> BatchMaterialUsage -> MaterialBatch -> Supplier` 追溯链；不得新增平行批次字段、不得用备注解析批号、不得自动猜测历史空批次投诉。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 如果 migration preflight 发现 `CustomerComplaint.production_batch_id IS NULL` 或 orphan `production_batch_id`，不得自动回填；停止并回报需要业务确认具体生产批次。
- **命令约束：** 本计划只使用当前仓库 npm workspaces 命令；不得新增 pnpm 命令。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502093000_require_customer_complaint_batch_id/migration.sql`
- Modify: `server/src/modules/customer-complaint/dto/create-complaint.dto.ts`
- Modify: `server/src/modules/customer-complaint/customer-complaint.service.ts`
- Modify: `server/src/modules/customer-complaint/customer-complaint.service.spec.ts`
- Modify: `client/src/api/customer-complaint.ts`
- Modify: `client/src/views/customer-complaint/CustomerComplaintList.vue`
- Do not modify: `server/src/modules/traceability/`
- Do not modify: `server/src/modules/corrective-action/`
- Do not modify: `server/src/modules/non-conformance/`
- Do not modify: `server/src/modules/batch-trace/`

## Task 1: Add focused service coverage

**Files:**
- Modify: `server/src/modules/customer-complaint/customer-complaint.service.spec.ts`

- [ ] **Step 1: Extend the Prisma mock**

In `server/src/modules/customer-complaint/customer-complaint.service.spec.ts`, replace:

```ts
  const prisma = {
    customerComplaint: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
```

with:

```ts
  const prisma = {
    customerComplaint: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    productionBatch: {
      findUnique: jest.fn(),
    },
  };
```

- [ ] **Step 2: Update the existing create test to use a valid batch**

Replace the test body under `it('scopes complaint numbering and writes by company', async () => {` with:

```ts
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'batch-1' });
    prisma.customerComplaint.count.mockResolvedValue(5);
    prisma.customerComplaint.create.mockResolvedValue({ id: 'cc1' });

    await service.create(
      {
        customer_name: '客户',
        production_batch_id: 'batch-1',
        description: '投诉',
      },
      '2',
    );

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      select: { id: true },
    });
    expect(prisma.customerComplaint.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(prisma.customerComplaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: '2',
          complaint_no: expect.stringMatching(/-0006$/),
          production_batch_id: 'batch-1',
        }),
      }),
    );
```

- [ ] **Step 3: Add missing-batch and nonexistent-batch tests**

Add these tests before the resolve test:

```ts
  it('rejects creation when production_batch_id is missing', async () => {
    await expect(
      service.create(
        {
          customer_name: '客户',
          description: '投诉',
        } as any,
        '2',
      ),
    ).rejects.toThrow('生产批次不能为空');

    expect(prisma.productionBatch.findUnique).not.toHaveBeenCalled();
    expect(prisma.customerComplaint.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the production batch does not exist', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          customer_name: '客户',
          production_batch_id: 'missing-batch',
          description: '投诉',
        },
        '2',
      ),
    ).rejects.toThrow('生产批次不存在');

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-batch' },
      select: { id: true },
    });
    expect(prisma.customerComplaint.create).not.toHaveBeenCalled();
  });
```

- [ ] **Step 4: Run the focused test and verify it fails before implementation**

```bash
(cd server && npm test -- customer-complaint.service.spec.ts --runInBand)
```

Expected: FAIL because `CustomerComplaintService.create()` has not yet checked `productionBatch.findUnique` and still allows missing `production_batch_id`.

## Task 2: Make the Prisma relation required

**Files:**
- Modify: `server/src/prisma/schema.prisma`

- [ ] **Step 1: Add the reverse relation to `ProductionBatch`**

In `model ProductionBatch`, directly below:

```prisma
  relatedRecords   Record[]             @relation("RecordProductionBatch")
```

add:

```prisma
  customer_complaints CustomerComplaint[]
```

- [ ] **Step 2: Replace the nullable complaint batch field**

In `model CustomerComplaint`, replace:

```prisma
  production_batch_id String?
```

with:

```prisma
  production_batch_id String
  production_batch    ProductionBatch @relation(fields: [production_batch_id], references: [id], onDelete: Restrict)
```

- [ ] **Step 3: Add a batch index to `CustomerComplaint`**

Replace:

```prisma
  @@unique([company_id, complaint_no])
}
```

with:

```prisma
  @@unique([company_id, complaint_no])
  @@index([production_batch_id])
}
```

## Task 3: Add guarded migration

**Files:**
- Add: `server/src/prisma/migrations/20260502093000_require_customer_complaint_batch_id/migration.sql`

- [ ] **Step 1: Create the migration SQL**

```sql
-- Require every CustomerComplaint in the recall and traceability chain to link to a ProductionBatch.
-- This migration intentionally fails if legacy data cannot satisfy the constraint.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CustomerComplaint" WHERE "production_batch_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot require CustomerComplaint.production_batch_id: legacy rows with NULL production_batch_id exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CustomerComplaint" cc
    LEFT JOIN "production_batches" pb ON pb."id" = cc."production_batch_id"
    WHERE pb."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add CustomerComplaint.production_batch_id FK: orphan production_batch_id rows exist';
  END IF;
END $$;

ALTER TABLE "CustomerComplaint" DROP CONSTRAINT IF EXISTS "CustomerComplaint_production_batch_id_fkey";
ALTER TABLE "CustomerComplaint" ALTER COLUMN "production_batch_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "CustomerComplaint_production_batch_id_idx"
  ON "CustomerComplaint"("production_batch_id");

ALTER TABLE "CustomerComplaint"
  ADD CONSTRAINT "CustomerComplaint_production_batch_id_fkey"
  FOREIGN KEY ("production_batch_id") REFERENCES "production_batches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 2: Do not add data backfill**

Do not write `UPDATE "CustomerComplaint" SET "production_batch_id" = ...`. If the preflight fails, stop and report.

## Task 4: Require batch ID in DTO and service

**Files:**
- Modify: `server/src/modules/customer-complaint/dto/create-complaint.dto.ts`
- Modify: `server/src/modules/customer-complaint/customer-complaint.service.ts`

- [ ] **Step 1: Update DTO imports**

Replace:

```ts
import { IsString, IsOptional } from 'class-validator';
```

with:

```ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
```

- [ ] **Step 2: Make `production_batch_id` required**

Replace:

```ts
  @IsOptional() @IsString() production_batch_id?: string;
```

with:

```ts
  @IsString()
  @IsNotEmpty()
  production_batch_id: string;
```

- [ ] **Step 3: Update service imports**

Replace:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
```

with:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
```

- [ ] **Step 4: Add batch validation in `create()`**

Replace the current `create()` method with:

```ts
  async create(dto: CreateComplaintDto, companyId: string) {
    if (!dto.production_batch_id) {
      throw new BadRequestException('生产批次不能为空');
    }

    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.production_batch_id },
      select: { id: true },
    });

    if (!productionBatch) {
      throw new BadRequestException('生产批次不存在');
    }

    const count = await this.prisma.customerComplaint.count({ where: { company_id: companyId } });
    const complaint_no = `CC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.customerComplaint.create({
      data: { ...dto, company_id: companyId, complaint_no, received_at: new Date() },
    });
  }
```

- [ ] **Step 5: Keep complaint numbering unchanged**

Do not change the `CC-<year>-<sequence>` numbering strategy in this PR. Sequence race hardening is outside GAP-310.

## Task 5: Make the frontend require a selected production batch

**Files:**
- Modify: `client/src/api/customer-complaint.ts`
- Modify: `client/src/views/customer-complaint/CustomerComplaintList.vue`

- [ ] **Step 1: Tighten API read type**

In `client/src/api/customer-complaint.ts`, replace:

```ts
  production_batch_id: string | null;
```

with:

```ts
  production_batch_id: string;
```

- [ ] **Step 2: Tighten create payload type**

Replace:

```ts
  production_batch_id?: string;
```

with:

```ts
  production_batch_id: string;
```

- [ ] **Step 3: Add form validation for `production_batch_id`**

In `client/src/views/customer-complaint/CustomerComplaintList.vue`, replace:

```ts
const createRules: FormRules = {
  customer_name: [{ required: true, message: '请输入顾客名称', trigger: 'blur' }],
  description: [{ required: true, message: '请填写投诉描述', trigger: 'blur' }],
};
```

with:

```ts
const createRules: FormRules = {
  customer_name: [{ required: true, message: '请输入顾客名称', trigger: 'blur' }],
  production_batch_id: [{ required: true, message: '请选择相关批次', trigger: 'change' }],
  description: [{ required: true, message: '请填写投诉描述', trigger: 'blur' }],
};
```

- [ ] **Step 4: Submit the selected batch ID as required**

Replace:

```ts
      production_batch_id: createForm.production_batch_id || undefined,
```

with:

```ts
      production_batch_id: createForm.production_batch_id,
```

- [ ] **Step 5: Keep the existing selector**

Do not replace `ProductionBatchSelect`. The page already imports and renders the correct shared component:

```vue
<ProductionBatchSelect v-model="createForm.production_batch_id" />
```

## Task 6: Validate and commit

**Files:**
- Verify all modified files from Tasks 1-5.

- [ ] **Step 1: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with schema validation success.

- [ ] **Step 2: Run focused customer complaint tests**

```bash
(cd server && npm test -- customer-complaint.service.spec.ts --runInBand)
```

Expected: PASS for `CustomerComplaintService`.

- [ ] **Step 3: Build the client through npm workspace**

```bash
npm run build:client
```

Expected: PASS. TypeScript must accept required `production_batch_id` in `CreateComplaintPayload`.

- [ ] **Step 4: Run broad verification when time allows**

```bash
npm run verify
```

Expected: PASS for server and client builds.

- [ ] **Step 5: Handle GAP-310 E2E availability explicitly**

Current repository scripts expose client Playwright through npm workspace:

```bash
npm run test:e2e -w client -- --grep GAP-310
```

Expected: If no GAP-310 Playwright test exists, do not add pnpm or install alternate tooling. Record that no GAP-310 E2E exists and use Prisma validate, focused Jest, `npm run build:client`, and `npm run verify` as substitute verification.

- [ ] **Step 6: Check diff hygiene**

```bash
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 7: Commit implementation**

```bash
git add server/src/prisma/schema.prisma \
  server/src/prisma/migrations/20260502093000_require_customer_complaint_batch_id/migration.sql \
  server/src/modules/customer-complaint/dto/create-complaint.dto.ts \
  server/src/modules/customer-complaint/customer-complaint.service.ts \
  server/src/modules/customer-complaint/customer-complaint.service.spec.ts \
  client/src/api/customer-complaint.ts \
  client/src/views/customer-complaint/CustomerComplaintList.vue
git commit -m "fix: require production batch for customer complaints"
```

Expected: one implementation commit containing only GAP-310 runtime changes. Do not include spec, roadmap, or plan edits in the execution PR unless the main agent explicitly asks for plan corrections.
