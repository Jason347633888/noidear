# GAP-315 NC Dispose to ReworkRecord Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the nonconformance/rework/traceability model during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Automatically create one pending `ReworkRecord` when a production-batch `NonConformance` is disposed as `rework`.

**Architecture:** Keep `NonConformance` as the disposition decision source and `ReworkRecord` as the execution evidence source. Wrap `dispose(rework)` in a Prisma transaction, validate that the NC points to a current-company `ProductionBatch`, require qty/unit, create a single idempotent pending rework record, and keep manual rework creation unchanged.

**Tech Stack:** NestJS, Prisma Client, class-validator, Vue 3, Element Plus, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-315 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认本 GAP 强化 `ProductionBatch -> NonConformance -> ReworkRecord` 放行证据链；不得新增平行不合格事实源，不得新增返工任务模型，不得把返工字段冗余写回 `NonConformance`。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 本计划不补建历史返工记录。若验证发现历史 `disposition='rework'` 但无 `ReworkRecord`，不得自动修复；记录样例并回报主 agent。
- **命令约束：** 本计划只使用当前仓库 npm workspaces 命令；不得新增 pnpm 命令。
- **E2E 约束：** 当前计划不新增 Playwright E2E；仓库虽有 `npm run test:e2e -w client` 脚本，但若执行 agent 未新增 GAP-315 E2E，不得伪造 E2E 通过结果。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/modules/non-conformance/non-conformance.service.spec.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.service.ts`
- Modify: `client/src/api/rework-record.ts`
- Modify: `client/src/views/rework-record/ReworkRecordList.vue`
- Do not modify: `server/src/prisma/schema.prisma`
- Do not add: `server/src/prisma/migrations/**`
- Do not modify: `server/src/modules/rework-record/rework-record.service.ts`
- Do not modify: `server/src/modules/corrective-action/**`
- Do not modify: `server/src/modules/ccp/**`
- Do not modify: `docs/module-usage/**`

## Task 1: Add failing NonConformanceService coverage

**Files:**
- Modify: `server/src/modules/non-conformance/non-conformance.service.spec.ts`

- [ ] **Step 1: Extend the Prisma mock for transactions and rework creation**

In `server/src/modules/non-conformance/non-conformance.service.spec.ts`, replace:

```ts
  const prisma = {
    nonConformance: {
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
    nonConformance: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    productionBatch: {
      findFirst: jest.fn(),
    },
    reworkRecord: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => callback(prisma)),
  };
```

- [ ] **Step 2: Add the happy-path auto-rework test**

Add this test after `it('blocks dispose when record is outside current company', async () => { ... });`:

```ts
  it('auto-creates one pending ReworkRecord when disposing a production-batch NC as rework', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc1',
      company_id: '2',
      nc_no: 'NC-2026-0001',
      source_type: 'production_batch',
      source_id: 'batch-1',
      description: '烘烤不足，需要返工',
      qty: 12.5,
      unit: 'kg',
    });
    prisma.productionBatch.findFirst.mockResolvedValue({ id: 'batch-1' });
    prisma.reworkRecord.findFirst.mockResolvedValue(null);
    prisma.nonConformance.update.mockResolvedValue({ id: 'nc1', disposition: 'rework' });
    prisma.reworkRecord.create.mockResolvedValue({ id: 'rw1' });

    await service.dispose('nc1', { disposition: 'rework' }, 'u1', '2');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.productionBatch.findFirst).toHaveBeenCalledWith({
      where: { id: 'batch-1', product: { company_id: '2' } },
      select: { id: true },
    });
    expect(prisma.reworkRecord.findFirst).toHaveBeenCalledWith({
      where: { company_id: '2', nc_id: 'nc1' },
      select: { id: true },
    });
    expect(prisma.reworkRecord.create).toHaveBeenCalledWith({
      data: {
        company_id: '2',
        production_batch_id: 'batch-1',
        nc_id: 'nc1',
        rework_reason: '烘烤不足，需要返工',
        rework_qty: 12.5,
        unit: 'kg',
        rework_date: expect.any(Date),
        operator_id: 'u1',
        quality_verdict: 'pending',
      },
    });
    expect(prisma.nonConformance.update).toHaveBeenCalledWith({
      where: { id: 'nc1' },
      data: {
        disposition: 'rework',
        disposition_by: 'u1',
        disposition_at: expect.any(Date),
        status: 'dispositioned',
      },
    });
  });
```

- [ ] **Step 3: Add duplicate protection coverage**

Add this test after the happy-path test:

```ts
  it('does not create a duplicate ReworkRecord when one already exists for the NC', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc1',
      company_id: '2',
      nc_no: 'NC-2026-0001',
      source_type: 'production_batch',
      source_id: 'batch-1',
      description: '烘烤不足，需要返工',
      qty: 12.5,
      unit: 'kg',
    });
    prisma.productionBatch.findFirst.mockResolvedValue({ id: 'batch-1' });
    prisma.reworkRecord.findFirst.mockResolvedValue({ id: 'rw-existing' });
    prisma.nonConformance.update.mockResolvedValue({ id: 'nc1', disposition: 'rework' });

    await service.dispose('nc1', { disposition: 'rework' }, 'u1', '2');

    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
    expect(prisma.nonConformance.update).toHaveBeenCalled();
  });
```

- [ ] **Step 4: Add validation failure coverage**

Add these tests after the duplicate protection test:

```ts
  it('rejects rework disposition when NC source is not a production batch', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc-material',
      company_id: '2',
      source_type: 'material_batch',
      source_id: 'material-batch-1',
      description: '原料异常',
      qty: 1,
      unit: 'kg',
    });

    await expect(service.dispose('nc-material', { disposition: 'rework' }, 'u1', '2')).rejects.toThrow(
      '返工处置仅支持来源为生产批次的不合格记录',
    );

    expect(prisma.nonConformance.update).not.toHaveBeenCalled();
    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
  });

  it('rejects rework disposition when NC quantity or unit is missing', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc-no-qty',
      company_id: '2',
      source_type: 'production_batch',
      source_id: 'batch-1',
      description: '未填写数量',
      qty: null,
      unit: 'kg',
    });

    await expect(service.dispose('nc-no-qty', { disposition: 'rework' }, 'u1', '2')).rejects.toThrow(
      '返工处置需要不合格数量和单位',
    );

    expect(prisma.productionBatch.findFirst).not.toHaveBeenCalled();
    expect(prisma.nonConformance.update).not.toHaveBeenCalled();
    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
  });

  it('rejects rework disposition when the production batch is missing or outside company', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc1',
      company_id: '2',
      source_type: 'production_batch',
      source_id: 'missing-batch',
      description: '批次不存在',
      qty: 1,
      unit: 'kg',
    });
    prisma.productionBatch.findFirst.mockResolvedValue(null);

    await expect(service.dispose('nc1', { disposition: 'rework' }, 'u1', '2')).rejects.toThrow(
      '返工处置的生产批次不存在或不属于当前公司',
    );

    expect(prisma.nonConformance.update).not.toHaveBeenCalled();
    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
  });
```

- [ ] **Step 5: Add non-rework coverage**

Add this test after the validation failure tests:

```ts
  it('does not touch ReworkRecord when disposition is not rework', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc1',
      company_id: '2',
      source_type: 'production_batch',
      source_id: 'batch-1',
      description: '让步接收',
      qty: 1,
      unit: 'kg',
    });
    prisma.nonConformance.update.mockResolvedValue({ id: 'nc1', disposition: 'concession' });

    await service.dispose('nc1', { disposition: 'concession' }, 'u1', '2');

    expect(prisma.productionBatch.findFirst).not.toHaveBeenCalled();
    expect(prisma.reworkRecord.findFirst).not.toHaveBeenCalled();
    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
    expect(prisma.nonConformance.update).toHaveBeenCalledWith({
      where: { id: 'nc1' },
      data: {
        disposition: 'concession',
        disposition_by: 'u1',
        disposition_at: expect.any(Date),
        status: 'dispositioned',
      },
    });
  });
```

- [ ] **Step 6: Run the focused test and confirm it fails**

Run:

```bash
(cd server && npm test -- non-conformance.service.spec.ts --runInBand)
```

Expected: FAIL because `dispose()` does not call `$transaction`, does not validate production batch, and does not create `reworkRecord`.

## Task 2: Implement transactional auto ReworkRecord creation

**Files:**
- Modify: `server/src/modules/non-conformance/non-conformance.service.ts`

- [ ] **Step 1: Extend imports**

Replace:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
```

with:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NonConformance, Prisma } from '@prisma/client';
```

- [ ] **Step 2: Replace `dispose()` with transaction-aware logic**

Replace the full `dispose()` method with:

```ts
  async dispose(id: string, dto: DisposeNcDto, userId: string, companyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.nonConformance.findFirst({
        where: { id, company_id: companyId },
      });
      if (!record) throw new NotFoundException('不合格记录不存在');

      if (dto.disposition === 'rework') {
        await this.ensureReworkRecordForDisposition(record, userId, companyId, tx);
      }

      return tx.nonConformance.update({
        where: { id },
        data: {
          disposition: dto.disposition,
          disposition_by: userId,
          disposition_at: new Date(),
          status: 'dispositioned',
        },
      });
    });
  }
```

- [ ] **Step 3: Add the private helper below `dispose()`**

Add this method inside `NonConformanceService`, after `dispose()` and before the class closing brace:

```ts
  private async ensureReworkRecordForDisposition(
    record: NonConformance,
    userId: string,
    companyId: string,
    tx: Prisma.TransactionClient,
  ) {
    if (record.source_type !== 'production_batch') {
      throw new BadRequestException('返工处置仅支持来源为生产批次的不合格记录');
    }

    if (record.qty == null || !record.unit?.trim()) {
      throw new BadRequestException('返工处置需要不合格数量和单位');
    }

    const productionBatch = await tx.productionBatch.findFirst({
      where: { id: record.source_id, product: { company_id: companyId } },
      select: { id: true },
    });
    if (!productionBatch) {
      throw new BadRequestException('返工处置的生产批次不存在或不属于当前公司');
    }

    const existingReworkRecord = await tx.reworkRecord.findFirst({
      where: { company_id: companyId, nc_id: record.id },
      select: { id: true },
    });
    if (existingReworkRecord) return;

    await tx.reworkRecord.create({
      data: {
        company_id: companyId,
        production_batch_id: record.source_id,
        nc_id: record.id,
        rework_reason: record.description,
        rework_qty: record.qty,
        unit: record.unit.trim(),
        rework_date: new Date(),
        operator_id: userId,
        quality_verdict: 'pending',
      },
    });
  }
```

- [ ] **Step 4: Run the focused service tests**

Run:

```bash
(cd server && npm test -- non-conformance.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 3: Display pending rework verdicts in the frontend

**Files:**
- Modify: `client/src/api/rework-record.ts`
- Modify: `client/src/views/rework-record/ReworkRecordList.vue`

- [ ] **Step 1: Extend verdict helper in the API file**

In `client/src/api/rework-record.ts`, replace:

```ts
const VERDICT_MAP: Record<string, string> = {
  pass: '合格',
  fail: '不合格',
};
```

with:

```ts
const VERDICT_MAP: Record<string, string> = {
  pass: '合格',
  fail: '不合格',
  pending: '待判定',
};
```

Then add this function immediately after `getVerdictText()`:

```ts
export function getVerdictTagType(verdict: string): 'success' | 'warning' | 'danger' | 'info' {
  if (verdict === 'pass') return 'success';
  if (verdict === 'pending') return 'warning';
  if (verdict === 'fail') return 'danger';
  return 'info';
}
```

- [ ] **Step 2: Use the tag helper in the list page**

In `client/src/views/rework-record/ReworkRecordList.vue`, replace:

```vue
            <el-tag :type="row.quality_verdict === 'pass' ? 'success' : 'danger'" effect="light" size="small">
              {{ getVerdictText(row.quality_verdict) }}
            </el-tag>
```

with:

```vue
            <el-tag :type="getVerdictTagType(row.quality_verdict)" effect="light" size="small">
              {{ getVerdictText(row.quality_verdict) }}
            </el-tag>
```

- [ ] **Step 3: Update the import**

In `client/src/views/rework-record/ReworkRecordList.vue`, replace:

```ts
import reworkRecordApi, { type ReworkRecord, getVerdictText } from '@/api/rework-record';
```

with:

```ts
import reworkRecordApi, { type ReworkRecord, getVerdictTagType, getVerdictText } from '@/api/rework-record';
```

- [ ] **Step 4: Run the client build**

Run:

```bash
npm run build:client
```

Expected: PASS.

## Task 4: Verification and commit

**Files:**
- Verify: `server/src/modules/non-conformance/non-conformance.service.spec.ts`
- Verify: `server/src/modules/rework-record/rework-record.service.spec.ts`
- Verify: `server/src/modules/non-conformance/non-conformance.service.ts`
- Verify: `client/src/api/rework-record.ts`
- Verify: `client/src/views/rework-record/ReworkRecordList.vue`

- [ ] **Step 1: Run backend focused tests**

Run:

```bash
(cd server && npm test -- non-conformance.service.spec.ts rework-record.service.spec.ts --runInBand)
```

Expected: PASS. `NonConformanceService` tests cover auto rework creation, duplicate prevention, invalid source rejection, missing qty/unit rejection, missing production batch rejection, and non-rework no-op behavior. `ReworkRecordService` manual create/delete behavior remains passing.

- [ ] **Step 2: Validate Prisma schema**

Run:

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS. No schema or migration changes are part of GAP-315.

- [ ] **Step 3: Run server build**

Run:

```bash
npm run build:server
```

Expected: PASS.

- [ ] **Step 4: Run client build**

Run:

```bash
npm run build:client
```

Expected: PASS.

- [ ] **Step 5: Inspect changed files**

Run:

```bash
git status --short
```

Expected: only these files are modified:

```text
M  server/src/modules/non-conformance/non-conformance.service.spec.ts
M  server/src/modules/non-conformance/non-conformance.service.ts
M  client/src/api/rework-record.ts
M  client/src/views/rework-record/ReworkRecordList.vue
```

- [ ] **Step 6: Commit implementation**

Run:

```bash
git add server/src/modules/non-conformance/non-conformance.service.spec.ts server/src/modules/non-conformance/non-conformance.service.ts client/src/api/rework-record.ts client/src/views/rework-record/ReworkRecordList.vue
git commit -m "feat: auto-create rework record from nc disposition"
```

Expected: commit succeeds on the execution branch.
