# GAP-303 CCP Missing Product Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the quality release model during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make `GET /ccp/records/missing/:batchId` return only active CCP points that belong to the production batch's product or recipe and have not yet been recorded for that batch.

**Architecture:** Keep the existing API contract and database schema. Resolve the batch's `productId` and `recipeId`, query active `CCPPoint` rows through their `ProcessStep` relation, and subtract the current batch's recorded CCP point IDs. Add focused Jest coverage for product, recipe, company, archived, and missing-batch behavior.

**Tech Stack:** NestJS, Prisma relation filters, Jest.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-303 生成 spec 和本 implementation plan。
- **brainstorming 结论：** 复用现有 `ProductionBatch.productId/recipeId -> ProcessStep.product_id/recipe_id -> CCPPoint.process_step_id` 链路，避免在 `CCPPoint` 上重复维护产品或配方归属字段。
- **grill-with-docs 校准结论：** 已确认本 GAP 不新增主数据、不新增批次链路、不改 schema、不迁移历史数据；查询仍以 `ProductionBatch` 为批次锚点，CCP 控制点仍以 `CCPPoint` 为事实源。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 如果执行时发现某个业务必须纳入 missing 查询的 CCPPoint 无法通过 active `ProcessStep.product_id` 或 `ProcessStep.recipe_id` 归属到当前批次，不得自动补数据；停止并回报需要主数据/工艺数据修复任务。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/modules/ccp/ccp.service.ts`
- Modify: `server/src/modules/ccp/ccp.service.spec.ts`
- Do not modify: `server/src/prisma/schema.prisma`
- Do not modify: `server/src/modules/non-conformance/`
- Do not modify: `client/src/views/ccp/CcpRecordList.vue`
- Do not modify: `client/src/api/ccp.ts`

## Task 1: Add focused missing-query coverage

**Files:**
- Modify: `server/src/modules/ccp/ccp.service.spec.ts`

- [ ] **Step 1: Replace the service spec with product/recipe filtering coverage**

Replace the whole contents of `server/src/modules/ccp/ccp.service.spec.ts` with:

```ts
import { CcpService } from './ccp.service';

describe('CcpService', () => {
  const prisma = {
    cCPRecord: { create: jest.fn(), findMany: jest.fn() },
    cCPPoint: { findMany: jest.fn() },
    productionBatch: { findUnique: jest.fn() },
  };
  let service: CcpService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CcpService(prisma as any);
  });

  it('writes CCP records to the authenticated company', async () => {
    prisma.cCPRecord.create.mockResolvedValue({ id: 'r1' });

    await service.createRecord(
      { production_batch_id: 'b1', ccp_point_id: 'p1', is_within_cl: true },
      'u1',
      '2',
    );

    expect(prisma.cCPRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: '2', operator_id: 'u1' }) }),
    );
  });

  it('finds missing CCPs only from the batch product or recipe', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({
      id: 'b1',
      productId: 'prod-1',
      recipeId: 'recipe-1',
    });
    prisma.cCPRecord.findMany.mockResolvedValue([{ ccp_point_id: 'p-product-filled' }]);
    prisma.cCPPoint.findMany.mockResolvedValue([
      { id: 'p-product-filled', ccp_no: 'CCP-1' },
      { id: 'p-recipe-missing', ccp_no: 'CCP-2' },
    ]);

    await expect(service.findMissingCCPs('b1', '2')).resolves.toEqual([
      { id: 'p-recipe-missing', ccp_no: 'CCP-2' },
    ]);

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'b1' },
      select: { id: true, productId: true, recipeId: true },
    });
    expect(prisma.cCPRecord.findMany).toHaveBeenCalledWith({
      where: { production_batch_id: 'b1', company_id: '2' },
      select: { ccp_point_id: true },
    });
    expect(prisma.cCPPoint.findMany).toHaveBeenCalledWith({
      where: {
        company_id: '2',
        deleted_at: null,
        process_step: {
          company_id: '2',
          deleted_at: null,
          OR: [{ product_id: 'prod-1' }, { recipe_id: 'recipe-1' }],
        },
      },
      orderBy: [{ ccp_no: 'asc' }, { created_at: 'asc' }],
    });
  });

  it('returns an empty list when the production batch does not exist', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue(null);

    await expect(service.findMissingCCPs('missing-batch', '2')).resolves.toEqual([]);

    expect(prisma.cCPRecord.findMany).not.toHaveBeenCalled();
    expect(prisma.cCPPoint.findMany).not.toHaveBeenCalled();
  });

  it('keeps the company boundary in both recorded and expected CCP queries', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({
      id: 'b2',
      productId: 'prod-2',
      recipeId: 'recipe-2',
    });
    prisma.cCPRecord.findMany.mockResolvedValue([]);
    prisma.cCPPoint.findMany.mockResolvedValue([{ id: 'p-company-2' }]);

    await service.findMissingCCPs('b2', 'company-2');

    expect(prisma.cCPRecord.findMany).toHaveBeenCalledWith({
      where: { production_batch_id: 'b2', company_id: 'company-2' },
      select: { ccp_point_id: true },
    });
    expect(prisma.cCPPoint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          company_id: 'company-2',
          process_step: expect.objectContaining({ company_id: 'company-2' }),
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails before implementation**

```bash
(cd server && npm test -- ccp.service.spec.ts --runInBand)
```

Expected: FAIL because `findMissingCCPs()` still selects only `{ id }` from `productionBatch.findUnique` implicitly and calls `cCPPoint.findMany({ where: { company_id } })`.

## Task 2: Filter expected CCP points by batch product and recipe

**Files:**
- Modify: `server/src/modules/ccp/ccp.service.ts`

- [ ] **Step 1: Replace `findMissingCCPs()` with the product/recipe scoped implementation**

In `server/src/modules/ccp/ccp.service.ts`, replace the full `findMissingCCPs()` method with:

```ts
  async findMissingCCPs(productionBatchId: string, companyId: string) {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id: productionBatchId },
      select: { id: true, productId: true, recipeId: true },
    });
    if (!batch) return [];

    const records = await this.prisma.cCPRecord.findMany({
      where: { production_batch_id: productionBatchId, company_id: companyId },
      select: { ccp_point_id: true },
    });
    const filledIds = new Set(records.map((r) => r.ccp_point_id));

    const expectedCCPs = await this.prisma.cCPPoint.findMany({
      where: {
        company_id: companyId,
        deleted_at: null,
        process_step: {
          company_id: companyId,
          deleted_at: null,
          OR: [{ product_id: batch.productId }, { recipe_id: batch.recipeId }],
        },
      },
      orderBy: [{ ccp_no: 'asc' }, { created_at: 'asc' }],
    });

    return expectedCCPs.filter((ccp) => !filledIds.has(ccp.id));
  }
```

- [ ] **Step 2: Do not change the controller or API route**

Leave `server/src/modules/ccp/ccp.controller.ts` unchanged. The existing route remains:

```ts
  @Get('records/missing/:batchId')
  findMissingCCPs(@Param('batchId') batchId: string, @Request() req: AuthenticatedRequest) {
    return this.service.findMissingCCPs(batchId, req.user.companyId);
  }
```

## Task 3: Verify focused behavior

**Files:**
- Modify: `server/src/modules/ccp/ccp.service.ts`
- Modify: `server/src/modules/ccp/ccp.service.spec.ts`

- [ ] **Step 1: Run the focused unit test**

```bash
(cd server && npm test -- ccp.service.spec.ts --runInBand)
```

Expected: PASS. The test output should include `CcpService` and all four test cases passing.

- [ ] **Step 2: Run the server test target for nearby regressions**

```bash
(cd server && npm test -- --runInBand)
```

Expected: PASS. If unrelated pre-existing failures appear, capture the failing suite names and error messages, then stop and report them instead of changing unrelated modules.

## Task 4: Run project verification commands

**Files:**
- No additional edits.

- [ ] **Step 1: Validate Prisma schema was not changed**

```bash
git diff -- server/src/prisma/schema.prisma
```

Expected: no output.

- [ ] **Step 2: Record the missing GAP-303 E2E script and keep Jest as required verification**

```bash
npm run test:e2e -- --grep GAP-303
```

Expected: the repository currently has no configured GAP-303 E2E target. Record that the command is unavailable or has no matching GAP-303 test, then keep Task 3 Step 1 focused Jest and Task 3 Step 2 server Jest as the required behavioral verification. Do not install pnpm, do not add a new E2E script, and do not create unrelated E2E coverage in this PR.

- [ ] **Step 3: Run formatting whitespace check**

```bash
git diff --check
```

Expected: no whitespace errors.

## Task 5: Commit implementation only after verification

**Files:**
- Modify: `server/src/modules/ccp/ccp.service.ts`
- Modify: `server/src/modules/ccp/ccp.service.spec.ts`

- [ ] **Step 1: Review the final diff**

```bash
git diff -- server/src/modules/ccp/ccp.service.ts server/src/modules/ccp/ccp.service.spec.ts
```

Expected: the diff only changes `findMissingCCPs()` and its focused test coverage.

- [ ] **Step 2: Commit the implementation**

```bash
git add server/src/modules/ccp/ccp.service.ts server/src/modules/ccp/ccp.service.spec.ts
git commit -m "fix: filter missing CCPs by batch product"
```

Expected: commit succeeds. Do not include docs, schema, migrations, client files, or unrelated changes in this implementation commit unless the execution task explicitly asks for them.
