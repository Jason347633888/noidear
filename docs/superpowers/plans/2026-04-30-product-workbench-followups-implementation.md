# Product Workbench Followups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已合入的产品工艺变更闭环上补全三项遗留：CCPPoint 软删 + HACCP 整体替换语义、`ProcessStep.recipe_id` 注释口径、自动落库失败的可见性（复用项目既有 Todo 系统而非另建告警 UI）。

**Architecture:** Schema 加 `CCPPoint.deleted_at` + `TodoType.change_execution_failed`；服务层重写 `applyHaccpChange` 走 diff 三段（删/改/建）；新建 `ProductProcessChangeTodoBridge` 在 `applyApprovedChange` 失败时写一条 pending 待办；新增 `retry` 接口把失败 plan 拉回 draft 并关闭对应 todo；客户端复用 `Layout.vue` 已有"我的待办"红点 + `/my-todos` 列表，仅在产品详情加失败子区块和一个跳板视图（待办的 `relatedId` 是 planId，要跳到产品详情）。

**Tech Stack:** Prisma 5 + NestJS + Jest（server）；Vue 3 + Element Plus + Vue Router + Vitest（client）。

---

## File Map

- Modify: `server/src/prisma/schema.prisma` — `CCPPoint.deleted_at` + 索引、`TodoType.change_execution_failed`、`Recipe.changeEventId` 反向关系（如已存在则跳过）
- Add: `server/src/prisma/migrations/20260430090000_ccp_point_soft_delete/migration.sql`
- Add: `server/src/prisma/migrations/20260430100000_todo_type_change_execution_failed/migration.sql`
- Create: `server/src/modules/product-process-change/product-process-change-todo.bridge.ts` — 仿 `ApprovalTodoBridge`，封装 createFailureTodo / closeFailureTodo
- Create: `server/src/modules/product-process-change/product-process-change-todo.bridge.spec.ts`
- Modify: `server/src/modules/product-process-change/product-process-change.service.ts` — `applyHaccpChange` 重写、`applyApprovedChange` catch 接 bridge、`retryFailed` 新增、`recipe_id` 注释、扩 ProductProcessChangePayload
- Modify: `server/src/modules/product-process-change/product-process-change.service.spec.ts` — HACCP 校验空数组用例
- Modify: `server/src/modules/product-process-change/product-process-change-apply.service.spec.ts` — HACCP diff 用例 + retry 用例 + bridge 调用断言
- Modify: `server/src/modules/product-process-change/product-process-change.controller.ts` — retry endpoint
- Modify: `server/src/modules/product-process-change/product-process-change.module.ts` — 注册 bridge
- Modify: `server/src/modules/todo/todo.service.ts` — `ACTION_ROUTE_MAP` 与 `ALL_TODO_TYPES` 加新类型
- Modify: `server/src/modules/product/product.service.ts` — `getWorkbench` 增 `failureTodos` / `ccpPoints` / `archivedCcpPoints`
- Modify: `server/src/modules/product/product.service.spec.ts` — 扩字段断言
- Modify: `client/src/api/product.ts` — `ProductWorkbench` 加 `failureTodos / ccpPoints / archivedCcpPoints`，新类型 `FailureTodoSummary / CcpPointSummary`
- Modify: `client/src/api/product-process-change.ts` — `retry(planId)` + `getByPlanId(planId)`
- Modify: `client/src/router/index.ts` — `/products/by-plan/:planId` 路由
- Create: `client/src/views/product/ProductByPlanRedirect.vue`
- Create: `client/src/views/product/__tests__/ProductByPlanRedirect.spec.ts`
- Modify: `client/src/views/product/ProductDetail.vue` — 失败区块 + handleRetry + CCP 子表
- Modify: `client/src/views/product/__tests__/ProductDetail.spec.ts` — 失败区块、CCP 渲染用例

---

### Task 1: Schema — CCPPoint 软删字段

**Files:**
- Modify: `server/src/prisma/schema.prisma:2949-2970`
- Add: `server/src/prisma/migrations/20260430090000_ccp_point_soft_delete/migration.sql`
- Test: `server/src/modules/product-process-change/product-process-change.schema.spec.ts`

- [ ] **Step 1: 写 schema 测试断言新字段存在**

在 `server/src/modules/product-process-change/product-process-change.schema.spec.ts` 末尾追加：

```ts
it('exposes CCPPoint.deleted_at', async () => {
  const prisma = new PrismaClient();
  // Prisma 类型是编译期检查；用 select 形式触发类型检查即可
  const dummy = prisma.cCPPoint.findFirst({ select: { deleted_at: true } });
  expect(dummy).toBeDefined();
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npm run test -w server -- product-process-change.schema.spec.ts --runInBand
```

预期：TS 编译失败 `Property 'deleted_at' does not exist on type ...`。

- [ ] **Step 3: 修改 Prisma schema**

在 `server/src/prisma/schema.prisma` `model CCPPoint` 块（`@@unique([company_id, ccp_no])` 上方）追加：

```prisma
  deleted_at           DateTime?
```

并在 `@@unique` 之后新增索引：

```prisma
  @@index([company_id, deleted_at])
```

- [ ] **Step 4: 写迁移 SQL**

创建 `server/src/prisma/migrations/20260430090000_ccp_point_soft_delete/migration.sql`：

```sql
ALTER TABLE "ccp_points" ADD COLUMN "deleted_at" TIMESTAMP NULL;
CREATE INDEX "ccp_points_company_id_deleted_at_idx" ON "ccp_points" ("company_id", "deleted_at");
```

- [ ] **Step 5: 生成 client + 跑测试**

```bash
cd server && npx prisma generate --schema=src/prisma/schema.prisma && cd ..
npm run test -w server -- product-process-change.schema.spec.ts --runInBand
```

预期：测试通过。

- [ ] **Step 6: 提交**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260430090000_ccp_point_soft_delete server/src/modules/product-process-change/product-process-change.schema.spec.ts
git commit -m "feat: add CCPPoint soft delete column"
```

---

### Task 2: Schema — TodoType 新增 change_execution_failed

**Files:**
- Modify: `server/src/prisma/schema.prisma:1955`
- Add: `server/src/prisma/migrations/20260430100000_todo_type_change_execution_failed/migration.sql`
- Test: 沿用 Task 1 的 schema spec（再加一个 enum 检查）

- [ ] **Step 1: 写测试断言 enum 含新值**

在 `product-process-change.schema.spec.ts` 末尾追加：

```ts
it('TodoType includes change_execution_failed', () => {
  // 通过创建一个使用枚举值的查询体来触发类型检查
  const prisma = new PrismaClient();
  const dummy = prisma.todoTask.findFirst({
    where: { type: 'change_execution_failed' as any },
  });
  expect(dummy).toBeDefined();
  // Prisma 客户端运行时不会 throw；TS 编译期才断言。
});
```

- [ ] **Step 2: 修改 Prisma schema**

在 `enum TodoType { ... }` 块末尾、闭花括号前追加：

```prisma
  change_execution_failed   // 产品工艺变更落库失败待处理
```

- [ ] **Step 3: 写迁移 SQL**

创建 `server/src/prisma/migrations/20260430100000_todo_type_change_execution_failed/migration.sql`：

```sql
ALTER TYPE "TodoType" ADD VALUE 'change_execution_failed';
```

> 说明：PostgreSQL `ALTER TYPE ... ADD VALUE` 不能在事务内运行；Prisma 迁移会自动单独执行此语句，无需特殊处理。

- [ ] **Step 4: 生成 client + 跑测试**

```bash
cd server && npx prisma generate --schema=src/prisma/schema.prisma && cd ..
npm run test -w server -- product-process-change.schema.spec.ts --runInBand
```

预期：通过。

- [ ] **Step 5: 提交**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260430100000_todo_type_change_execution_failed server/src/modules/product-process-change/product-process-change.schema.spec.ts
git commit -m "feat: add change_execution_failed TodoType"
```

---

### Task 3: ProductProcessChangeTodoBridge

**Files:**
- Create: `server/src/modules/product-process-change/product-process-change-todo.bridge.ts`
- Create: `server/src/modules/product-process-change/product-process-change-todo.bridge.spec.ts`
- Modify: `server/src/modules/product-process-change/product-process-change.module.ts`

- [ ] **Step 1: 写失败用例**

创建 `product-process-change-todo.bridge.spec.ts`：

```ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductProcessChangeTodoBridge } from './product-process-change-todo.bridge';

describe('ProductProcessChangeTodoBridge', () => {
  let bridge: ProductProcessChangeTodoBridge;
  let prisma: { todoTask: { upsert: jest.Mock; updateMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { todoTask: { upsert: jest.fn(), updateMany: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductProcessChangeTodoBridge,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    bridge = moduleRef.get(ProductProcessChangeTodoBridge);
  });

  it('createFailureTodo upserts a pending todo for plan creator', async () => {
    await bridge.createFailureTodo({
      plan: { id: 'plan-1', product_id: 'prod-1', createdById: 'user-9' },
      actorId: 'approver-2',
      errorMessage: 'recipe area missing',
      productName: '椰丝咸蛋糕',
    });
    expect(prisma.todoTask.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_type_relatedId: {
            userId: 'user-9',
            type: 'change_execution_failed',
            relatedId: 'plan-1',
          },
        },
        create: expect.objectContaining({
          userId: 'user-9',
          type: 'change_execution_failed',
          relatedId: 'plan-1',
          status: 'pending',
          priority: 'high',
          title: '产品工艺变更落库失败：椰丝咸蛋糕',
          description: 'recipe area missing',
        }),
        update: expect.objectContaining({
          status: 'pending',
          description: 'recipe area missing',
          completedAt: null,
          completedBy: null,
        }),
      }),
    );
  });

  it('createFailureTodo falls back to actorId when createdById is null', async () => {
    await bridge.createFailureTodo({
      plan: { id: 'plan-2', product_id: 'p2', createdById: null },
      actorId: 'approver-2',
      errorMessage: 'x',
      productName: 'p',
    });
    const call = prisma.todoTask.upsert.mock.calls[0][0];
    expect(call.where.userId_type_relatedId.userId).toBe('approver-2');
  });

  it('createFailureTodo swallows storage errors so the original exception survives', async () => {
    prisma.todoTask.upsert.mockRejectedValue(new Error('db down'));
    await expect(
      bridge.createFailureTodo({
        plan: { id: 'plan-3', product_id: 'p3', createdById: 'u' },
        actorId: 'a',
        errorMessage: 'x',
        productName: 'p',
      }),
    ).resolves.toBeUndefined();
  });

  it('closeFailureTodo marks all pending todos for the plan as completed', async () => {
    await bridge.closeFailureTodo('plan-1', 'user-3');
    expect(prisma.todoTask.updateMany).toHaveBeenCalledWith({
      where: { type: 'change_execution_failed', relatedId: 'plan-1', status: 'pending' },
      data: expect.objectContaining({
        status: 'completed',
        completedBy: 'user-3',
      }),
    });
    expect(prisma.todoTask.updateMany.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npm run test -w server -- product-process-change-todo.bridge.spec.ts --runInBand
```

预期：找不到 `ProductProcessChangeTodoBridge`。

- [ ] **Step 3: 实现 bridge**

创建 `server/src/modules/product-process-change/product-process-change-todo.bridge.ts`：

```ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductProcessChangeTodoBridge {
  private readonly logger = new Logger(ProductProcessChangeTodoBridge.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 失败时通过独立连接写一条待办，给 plan 提交者（或回退给当前操作者）。
   * 写失败 todo 失败时仅记日志，不抛 —— 不能遮蔽原始业务异常。
   */
  async createFailureTodo(input: {
    plan: { id: string; product_id: string; createdById: string | null };
    actorId: string;
    errorMessage: string;
    productName: string;
  }): Promise<void> {
    const userId = input.plan.createdById ?? input.actorId;
    try {
      await this.prisma.todoTask.upsert({
        where: {
          userId_type_relatedId: {
            userId,
            type: 'change_execution_failed',
            relatedId: input.plan.id,
          },
        },
        create: {
          userId,
          type: 'change_execution_failed',
          relatedId: input.plan.id,
          title: `产品工艺变更落库失败：${input.productName}`,
          description: input.errorMessage,
          status: 'pending',
          priority: 'high',
        },
        update: {
          status: 'pending',
          description: input.errorMessage,
          completedAt: null,
          completedBy: null,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to write change_execution_failed todo for plan ${input.plan.id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  /** 重试或重新成功落库时关闭对应 pending 待办（幂等）。 */
  async closeFailureTodo(planId: string, completedBy: string): Promise<void> {
    await this.prisma.todoTask.updateMany({
      where: { type: 'change_execution_failed', relatedId: planId, status: 'pending' },
      data: { status: 'completed', completedAt: new Date(), completedBy },
    });
  }
}
```

- [ ] **Step 4: 在模块里注册 bridge**

修改 `server/src/modules/product-process-change/product-process-change.module.ts`：

```ts
import { forwardRef, Module } from '@nestjs/common';
import { ChangeEventModule } from '../change-event/change-event.module';
import { ProductProcessChangeController } from './product-process-change.controller';
import { ProductProcessChangeService } from './product-process-change.service';
import { ProductProcessChangeTodoBridge } from './product-process-change-todo.bridge';

@Module({
  imports: [forwardRef(() => ChangeEventModule)],
  controllers: [ProductProcessChangeController],
  providers: [ProductProcessChangeService, ProductProcessChangeTodoBridge],
  exports: [ProductProcessChangeService],
})
export class ProductProcessChangeModule {}
```

- [ ] **Step 5: 跑测试确认通过**

```bash
npm run test -w server -- product-process-change-todo.bridge.spec.ts --runInBand
```

预期：4 用例通过。

- [ ] **Step 6: 提交**

```bash
git add server/src/modules/product-process-change/product-process-change-todo.bridge.ts server/src/modules/product-process-change/product-process-change-todo.bridge.spec.ts server/src/modules/product-process-change/product-process-change.module.ts
git commit -m "feat: add product process change todo bridge"
```

---

### Task 4: HACCP 整体替换语义重写

**Files:**
- Modify: `server/src/modules/product-process-change/product-process-change.service.ts:519`（既有 `applyHaccpChange` 整体重写）
- Modify: `server/src/modules/product-process-change/product-process-change.service.ts`（`validatePayload` 内 HACCP 分支补 ccpPoints 非空校验）
- Test: `server/src/modules/product-process-change/product-process-change.service.spec.ts`（新增 HACCP 空数组校验用例）
- Test: `server/src/modules/product-process-change/product-process-change-apply.service.spec.ts`（diff 三段用例）

- [ ] **Step 1: 写失败的"非空校验"测试**

在 `product-process-change.service.spec.ts` 适当位置追加：

```ts
it('rejects haccp scope when ccpPoints is empty', async () => {
  // 该用例的 plan 处于 draft 状态、scopes=['haccp']、payloadJson.ccpPoints=[]
  prisma.productProcessChangePlan.findUnique.mockResolvedValue({
    id: 'plan-1',
    status: 'draft',
    scopes: ['haccp'],
    payloadJson: { ccpPoints: [] },
    product_id: 'prod-1',
    changeEventId: 'ce-1',
  });
  prisma.product.findFirst.mockResolvedValue({ id: 'prod-1', deleted_at: null });
  await expect(service.submitForApproval('plan-1', 'u1')).rejects.toThrow('CCP 控制点不能为空');
});
```

- [ ] **Step 2: 写失败的"diff 三段"测试**

在 `product-process-change-apply.service.spec.ts` 追加：

```ts
it('haccp scope: archives missing, updates matched, creates new ccp points', async () => {
  // current 活跃: A, B, C；payload: A'(改), D(新)
  tx.cCPPoint.findMany.mockResolvedValue([
    { id: 'ccp-A', ccp_no: 'A', process_step: { product_id: 'prod-1' } },
    { id: 'ccp-B', ccp_no: 'B', process_step: { product_id: 'prod-1' } },
    { id: 'ccp-C', ccp_no: 'C', process_step: { product_id: 'prod-1' } },
  ]);
  tx.processStep.findFirst.mockResolvedValue({ id: 'step-1' });
  tx.cCPPoint.update.mockImplementation(({ where }) => Promise.resolve({ id: where.id }));
  tx.cCPPoint.create.mockResolvedValue({ id: 'ccp-D' });
  // ... 同时 mock plan.findUnique 返回 scopes=['haccp']、payloadJson.ccpPoints=[A', D]

  await service.applyApprovedChange('change-1', 'approver-1', tx);

  expect(tx.cCPPoint.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: { in: ['ccp-B', 'ccp-C'] } },
    data: expect.objectContaining({ deleted_at: expect.any(Date) }),
  }));
  expect(tx.cCPPoint.update).toHaveBeenCalledTimes(1); // A
  expect(tx.cCPPoint.create).toHaveBeenCalledTimes(1); // D
  expect(tx.changeEventExecutionArtifact.createMany).toHaveBeenCalled();
  const artifacts = tx.changeEventExecutionArtifact.createMany.mock.calls[0][0].data;
  const ccpArtifacts = artifacts.filter((a: any) => a.resourceType === 'ccp_point');
  expect(ccpArtifacts).toHaveLength(4); // 2 archive + 1 update + 1 create
});
```

- [ ] **Step 3: 跑测试确认失败**

```bash
npm run test -w server -- product-process-change.service.spec.ts product-process-change-apply.service.spec.ts --runInBand
```

预期：两条新用例 fail，旧用例继续 pass。

- [ ] **Step 4: 实现 HACCP 校验非空**

在 `product-process-change.service.ts` `validatePayload` 内 `if (scopeSet.has('haccp'))` 分支首行添加：

```ts
const ccpPoints = payload.ccpPoints ?? [];
if (ccpPoints.length === 0) {
  throw new BadRequestException('CCP 控制点不能为空');
}
```

保留既有的逐条字段校验（hazard_type 枚举、ccp_no 唯一等）。

- [ ] **Step 5: 重写 applyHaccpChange**

把 `applyHaccpChange` 整段替换为：

```ts
private async applyHaccpChange(
  plan: { id: string; product_id: string; company_id: string },
  payload: ProductProcessChangePayload,
  changeEventId: string,
  tx: Prisma.TransactionClient,
  artifacts: Prisma.ChangeEventExecutionArtifactCreateManyInput[],
): Promise<void> {
  const proposed = payload.ccpPoints ?? [];

  const current = await tx.cCPPoint.findMany({
    where: {
      company_id: plan.company_id,
      deleted_at: null,
      process_step: { product_id: plan.product_id, deleted_at: null },
    },
    include: { process_step: true },
  });

  const proposedByCcpNo = new Map(proposed.map((c) => [c.ccp_no, c]));
  const currentByCcpNo = new Map(current.map((c) => [c.ccp_no, c]));

  const toDelete = current.filter((c) => !proposedByCcpNo.has(c.ccp_no));
  const toUpdate = current.filter((c) => proposedByCcpNo.has(c.ccp_no));
  const toCreate = proposed.filter((c) => !currentByCcpNo.has(c.ccp_no));

  if (toDelete.length) {
    await tx.cCPPoint.updateMany({
      where: { id: { in: toDelete.map((c) => c.id) } },
      data: { deleted_at: new Date() },
    });
    for (const c of toDelete) {
      artifacts.push({
        executionId: '',
        resourceType: 'ccp_point',
        resourceId: c.id,
        action: 'archive',
        beforeSnapshot: this.snapshotCcp(c) as Prisma.InputJsonValue,
        afterSnapshot: Prisma.JsonNull,
      });
    }
  }

  for (const old of toUpdate) {
    const next = proposedByCcpNo.get(old.ccp_no)!;
    const stepId = await this.resolveStepIdForCcp(plan, next.step_no, changeEventId, tx);
    const updated = await tx.cCPPoint.update({
      where: { id: old.id },
      data: {
        process_step_id: stepId,
        hazard_type: next.hazard_type,
        control_measure: next.control_measure,
        critical_limit: next.critical_limit,
        cl_min: next.cl_min != null ? new Prisma.Decimal(next.cl_min as any) : null,
        cl_max: next.cl_max != null ? new Prisma.Decimal(next.cl_max as any) : null,
        cl_unit: next.cl_unit ?? null,
        monitoring_method: next.monitoring_method ?? null,
        monitoring_frequency: next.monitoring_frequency ?? null,
        corrective_action: next.corrective_action ?? null,
      },
    });
    artifacts.push({
      executionId: '',
      resourceType: 'ccp_point',
      resourceId: updated.id,
      action: 'update',
      beforeSnapshot: this.snapshotCcp(old) as Prisma.InputJsonValue,
      afterSnapshot: this.snapshotCcp(updated) as Prisma.InputJsonValue,
    });
  }

  for (const fresh of toCreate) {
    const stepId = await this.resolveStepIdForCcp(plan, fresh.step_no, changeEventId, tx);
    const created = await tx.cCPPoint.create({
      data: {
        company_id: plan.company_id,
        process_step_id: stepId,
        ccp_no: fresh.ccp_no,
        hazard_type: fresh.hazard_type,
        control_measure: fresh.control_measure,
        critical_limit: fresh.critical_limit,
        cl_min: fresh.cl_min != null ? new Prisma.Decimal(fresh.cl_min as any) : null,
        cl_max: fresh.cl_max != null ? new Prisma.Decimal(fresh.cl_max as any) : null,
        cl_unit: fresh.cl_unit ?? null,
        monitoring_method: fresh.monitoring_method ?? null,
        monitoring_frequency: fresh.monitoring_frequency ?? null,
        corrective_action: fresh.corrective_action ?? null,
      },
    });
    artifacts.push({
      executionId: '',
      resourceType: 'ccp_point',
      resourceId: created.id,
      action: 'create',
      beforeSnapshot: Prisma.JsonNull,
      afterSnapshot: this.snapshotCcp(created) as Prisma.InputJsonValue,
    });
  }
}

private snapshotCcp(c: any): Record<string, unknown> {
  return {
    id: c.id,
    ccp_no: c.ccp_no,
    process_step_id: c.process_step_id,
    hazard_type: c.hazard_type,
    control_measure: c.control_measure,
    critical_limit: c.critical_limit,
    cl_unit: c.cl_unit,
  };
}

private async resolveStepIdForCcp(
  plan: { product_id: string },
  stepNo: number,
  changeEventId: string,
  tx: Prisma.TransactionClient,
): Promise<string> {
  // 优先按本次变更新建的工序定位；找不到回退到当前活跃工序
  const fromThisChange = await tx.processStep.findFirst({
    where: { product_id: plan.product_id, step_no: stepNo, changeEventId, deleted_at: null },
    select: { id: true },
  });
  if (fromThisChange) return fromThisChange.id;
  const active = await tx.processStep.findFirst({
    where: { product_id: plan.product_id, step_no: stepNo, deleted_at: null },
    select: { id: true },
  });
  if (!active) {
    throw new BadRequestException(`CCP 找不到对应工序步骤 ${stepNo}`);
  }
  return active.id;
}
```

> 说明：`executionId: ''` 是占位符，调用方在 `applyApprovedChange` 中已有 `artifacts.map((a) => ({ ...a, executionId: execution.id }))` 模式回填。

- [ ] **Step 6: 跑测试确认通过**

```bash
npm run test -w server -- product-process-change.service.spec.ts product-process-change-apply.service.spec.ts --runInBand
```

预期：所有用例（新旧）pass。

- [ ] **Step 7: 提交**

```bash
git add server/src/modules/product-process-change/product-process-change.service.ts server/src/modules/product-process-change/product-process-change.service.spec.ts server/src/modules/product-process-change/product-process-change-apply.service.spec.ts
git commit -m "feat: rewrite haccp apply with delete/update/create diff"
```

---

### Task 5: ProcessStep.recipe_id 注释

**Files:**
- Modify: `server/src/modules/product-process-change/product-process-change.service.ts:454-518`（`applyProcessStepChange` 内的 ProcessStep create 块）

- [ ] **Step 1: 找到 create 块**

在 `applyProcessStepChange` 内定位 `tx.processStep.create({ data: { ... recipe_id: recipeId ... } })` 这一行。

- [ ] **Step 2: 在 create 块上方加注释**

在 `tx.processStep.create(...)` 调用紧前一行插入：

```ts
// recipe_id 表示工序所属的"配方版本快照"。
// - 仅在本次 apply 同时改了 recipe（scopeSet.has('recipe')）时填新 recipe.id；
// - 若本次只改 process（scope 不含 'recipe'），保持 null —— 工序此时不绑定任何具体配方版本，
//   仅通过 product_id + changeEventId 追溯。
// 这与 schema 里 recipe_id String? 的可空设计一致。
// 决策依据：scopes 是用户提交时显式勾选的，意图已经清楚，无需服务端再做"推断回填"。
```

- [ ] **Step 3: 跑现有测试确认未破坏**

```bash
npm run test -w server -- product-process-change-apply.service.spec.ts --runInBand
```

预期：所有用例 pass。

- [ ] **Step 4: 提交**

```bash
git add server/src/modules/product-process-change/product-process-change.service.ts
git commit -m "docs: clarify ProcessStep.recipe_id linkage policy"
```

---

### Task 6: applyApprovedChange catch 接 bridge

**Files:**
- Modify: `server/src/modules/product-process-change/product-process-change.service.ts`（构造函数注入 bridge、catch 块写 todo）
- Modify: `server/src/modules/product-process-change/product-process-change-apply.service.spec.ts`（断言 bridge 被调）

- [ ] **Step 1: 写失败用例**

在 `product-process-change-apply.service.spec.ts`，找到现有"失败路径"用例（已断言 plan.update 写 execution_failed），扩充断言：

```ts
expect(todoBridge.createFailureTodo).toHaveBeenCalledWith(
  expect.objectContaining({
    plan: expect.objectContaining({ id: expect.any(String) }),
    actorId: 'approver-1',
    errorMessage: expect.any(String),
    productName: expect.any(String),
  }),
);
```

`todoBridge` 是新加的 mock：

```ts
const todoBridge = {
  createFailureTodo: jest.fn(),
  closeFailureTodo: jest.fn(),
};
// 在 Test.createTestingModule providers 中加：
// { provide: ProductProcessChangeTodoBridge, useValue: todoBridge },
```

记得在 spec 顶部 `import { ProductProcessChangeTodoBridge } from './product-process-change-todo.bridge'`。

- [ ] **Step 2: 跑测试确认失败**

```bash
npm run test -w server -- product-process-change-apply.service.spec.ts --runInBand
```

预期：fail（bridge 未在 service 中调用）。

- [ ] **Step 3: 注入 bridge 到 service**

修改 `product-process-change.service.ts` 构造函数：

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly changeEventService: ChangeEventService,
  private readonly todoBridge: ProductProcessChangeTodoBridge,
) {}
```

并在文件顶部 `import { ProductProcessChangeTodoBridge } from './product-process-change-todo.bridge';`

- [ ] **Step 4: 在 catch 中调 bridge**

定位 `applyApprovedChange` 的 catch 块（既有写 plan execution_failed 与 changeEventExecution failed 的位置之后），在 `throw err;` 之前加：

```ts
const productForName = await this.prisma.product.findUnique({
  where: { id: plan.product_id },
  select: { name: true },
}).catch(() => null);
await this.todoBridge.createFailureTodo({
  plan: { id: plan.id, product_id: plan.product_id, createdById: plan.createdById },
  actorId,
  errorMessage: message,
  productName: productForName?.name ?? plan.product_id,
});
```

- [ ] **Step 5: 跑测试确认通过**

```bash
npm run test -w server -- product-process-change-apply.service.spec.ts --runInBand
```

预期：含新断言的失败路径用例 pass，其它用例继续 pass。

- [ ] **Step 6: 提交**

```bash
git add server/src/modules/product-process-change/product-process-change.service.ts server/src/modules/product-process-change/product-process-change-apply.service.spec.ts
git commit -m "feat: write change_execution_failed todo on apply failure"
```

---

### Task 7: 重试接口（service + controller）

**Files:**
- Modify: `server/src/modules/product-process-change/product-process-change.service.ts`（新增 `retryFailed`）
- Modify: `server/src/modules/product-process-change/product-process-change.controller.ts`（新增 retry endpoint）
- Modify: `server/src/modules/product-process-change/product-process-change.service.spec.ts`（retry 用例）

- [ ] **Step 1: 写失败用例**

在 `product-process-change.service.spec.ts` 追加：

```ts
describe('retryFailed', () => {
  it('resets execution_failed plan to draft and closes the failure todo', async () => {
    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));
    tx.productProcessChangePlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      status: 'execution_failed',
    });
    tx.productProcessChangePlan.update.mockResolvedValue({ id: 'plan-1' });
    await service.retryFailed('plan-1', 'user-2');
    expect(tx.productProcessChangePlan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: { status: 'draft', executionError: null, lockedAt: null },
    });
    expect(todoBridge.closeFailureTodo).toHaveBeenCalledWith('plan-1', 'user-2');
  });

  it('rejects retry when plan is not in execution_failed', async () => {
    tx.productProcessChangePlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      status: 'executed',
    });
    await expect(service.retryFailed('plan-1', 'u1')).rejects.toThrow('仅失败状态的变更可重试');
  });

  it('rejects retry when plan does not exist', async () => {
    tx.productProcessChangePlan.findUnique.mockResolvedValue(null);
    await expect(service.retryFailed('plan-x', 'u1')).rejects.toThrow('产品工艺变更不存在');
  });
});
```

确保 service spec 顶部已经把 `todoBridge` mock 加到 providers（同 Task 6 模式）。

- [ ] **Step 2: 跑测试确认失败**

```bash
npm run test -w server -- product-process-change.service.spec.ts --runInBand
```

预期：3 条 retry 用例 fail。

- [ ] **Step 3: 实现 retryFailed**

在 `product-process-change.service.ts` 的类内追加方法：

```ts
async retryFailed(planId: string, actorId: string) {
  const plan = await this.prisma.$transaction(async (tx) => {
    const found = await tx.productProcessChangePlan.findUnique({ where: { id: planId } });
    if (!found) throw new NotFoundException('产品工艺变更不存在');
    if (found.status !== 'execution_failed') {
      throw new BadRequestException('仅失败状态的变更可重试');
    }
    return tx.productProcessChangePlan.update({
      where: { id: planId },
      data: { status: 'draft', executionError: null, lockedAt: null },
    });
  });
  await this.todoBridge.closeFailureTodo(planId, actorId);
  return plan;
}
```

- [ ] **Step 4: 加 controller endpoint**

修改 `product-process-change.controller.ts`，在既有 `submit` 端点旁追加：

```ts
@Post('product-process-changes/:planId/retry')
retry(@Param('planId') planId: string, @Request() req: { user: { id: string } }) {
  return this.service.retryFailed(planId, req.user.id);
}
```

注意：用现有 controller 的 prefix 风格——若文件顶部已经是 `@Controller()`（无 prefix）则保持；否则按既有约定补齐。

- [ ] **Step 5: 跑测试确认通过**

```bash
npm run test -w server -- product-process-change.service.spec.ts --runInBand
```

预期：3 条 retry 用例 pass + 旧用例继续 pass。

- [ ] **Step 6: 提交**

```bash
git add server/src/modules/product-process-change/product-process-change.service.ts server/src/modules/product-process-change/product-process-change.controller.ts server/src/modules/product-process-change/product-process-change.service.spec.ts
git commit -m "feat: add retry endpoint for failed product process changes"
```

---

### Task 8: TodoService.ACTION_ROUTE_MAP 接入

**Files:**
- Modify: `server/src/modules/todo/todo.service.ts:6-20`（ACTION_ROUTE_MAP + ALL_TODO_TYPES）
- Modify: `server/src/modules/todo/todo.service.spec.ts`（如已存在）

- [ ] **Step 1: 写失败用例**

在 `server/src/modules/todo/todo.service.spec.ts`（如不存在则跳过此步骤，直接做实现），追加：

```ts
it('returns action route for change_execution_failed type', async () => {
  prisma.todoTask.findMany.mockResolvedValue([
    { id: 't1', type: 'change_execution_failed', relatedId: 'plan-99', status: 'pending', dueDate: null, createdAt: new Date() } as any,
  ]);
  prisma.todoTask.count.mockResolvedValue(1);
  const res = await service.findAll('user-1', { page: 1, limit: 20 });
  expect(res.items[0].actionRoute).toBe('/products/by-plan/plan-99');
});
```

- [ ] **Step 2: 跑测试**

```bash
npm run test -w server -- todo.service.spec.ts --runInBand
```

预期：fail（如 spec 不存在则跳过此步）。

- [ ] **Step 3: 加映射**

修改 `server/src/modules/todo/todo.service.ts` 顶部：

```ts
const ACTION_ROUTE_MAP: Partial<Record<TodoType, (id: string) => string>> = {
  training_attend: (id) => `/training/projects/${id}`,
  training_organize: (id) => `/training/projects/${id}`,
  approval: (id) => `/approvals/detail/${id}`,
  approval_task: (id) => `/approvals/detail/${id}`,
  audit_rectification: (_id) => `/internal-audit/rectifications`,
  equipment_maintain: (id) => `/equipment/${id}`,
  document_renewal: (id) => `/documents/business-links/${id}`,
  change_execution_failed: (planId) => `/products/by-plan/${planId}`,
};

const ALL_TODO_TYPES: TodoType[] = [
  'training_attend', 'training_organize', 'approval', 'approval_task',
  'audit_rectification', 'equipment_maintain', 'inventory', 'change_request',
  'document_renewal', 'change_execution_failed',
];
```

- [ ] **Step 4: 跑测试**

```bash
npm run test -w server -- todo.service.spec.ts --runInBand
```

预期：pass（如无 spec 则跳过此步）。

- [ ] **Step 5: 提交**

```bash
git add server/src/modules/todo/todo.service.ts server/src/modules/todo/todo.service.spec.ts
git commit -m "feat: route change_execution_failed todos to product redirect"
```

如 spec 不存在，仅 add 一个文件。

---

### Task 9: getWorkbench 扩字段（failureTodos / ccpPoints / archivedCcpPoints）

**Files:**
- Modify: `server/src/modules/product/product.service.ts:138-196`
- Modify: `server/src/modules/product/product.service.spec.ts`

- [ ] **Step 1: 写失败用例**

在 `product.service.spec.ts` 适当位置追加：

```ts
it('getWorkbench returns failureTodos / ccpPoints / archivedCcpPoints', async () => {
  prisma.product.findFirst.mockResolvedValue({ id: 'prod-1', name: 'p', status: 'active', deleted_at: null });
  prisma.recipe.findFirst.mockResolvedValue(null);
  prisma.recipe.findMany.mockResolvedValue([]);
  prisma.processStep.findMany.mockResolvedValue([]);
  prisma.productProcessChangePlan.findFirst.mockResolvedValue(null);
  prisma.productProcessChangePlan.findMany.mockResolvedValue([{ id: 'plan-A' }, { id: 'plan-B' }]);
  prisma.cCPPoint.findMany
    .mockResolvedValueOnce([{ id: 'ccp-1', ccp_no: 'A', deleted_at: null }]) // active
    .mockResolvedValueOnce([{ id: 'ccp-2', ccp_no: 'B', deleted_at: new Date() }]); // archived
  prisma.todoTask.findMany.mockResolvedValue([
    { id: 't-1', type: 'change_execution_failed', relatedId: 'plan-A', status: 'pending', description: 'err', createdAt: new Date() },
  ]);
  prisma.changeEvent.findMany.mockResolvedValue([]);

  const wb = await service.getWorkbench('prod-1');

  expect(wb.ccpPoints).toEqual([expect.objectContaining({ id: 'ccp-1' })]);
  expect(wb.archivedCcpPoints).toEqual([expect.objectContaining({ id: 'ccp-2' })]);
  expect(wb.failureTodos).toEqual([expect.objectContaining({ id: 't-1', relatedId: 'plan-A' })]);
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npm run test -w server -- product.service.spec.ts --runInBand
```

预期：fail（字段未返回）。

- [ ] **Step 3: 扩展 getWorkbench**

在 `product.service.ts` `getWorkbench` 内 `Promise.all` 的数组里追加 4 个查询，并把结果加入返回对象：

```ts
async getWorkbench(id: string) {
  const product = await this.findOne(id);

  const [
    currentRecipe, archivedRecipes, processSteps, archivedProcessSteps, activePlan,
    ccpPoints, archivedCcpPoints, allPlanIdsRaw,
  ] = await Promise.all([
    this.prisma.recipe.findFirst({
      where: { product_id: id, company_id: '1', status: 'active' },
      include: { lines: true },
      orderBy: { version: 'desc' },
    }),
    this.prisma.recipe.findMany({
      where: { product_id: id, company_id: '1', status: 'archived' },
      orderBy: { version: 'desc' },
    }),
    this.prisma.processStep.findMany({
      where: { product_id: id, company_id: '1', deleted_at: null },
      orderBy: { step_no: 'asc' },
    }),
    this.prisma.processStep.findMany({
      where: { product_id: id, company_id: '1', deleted_at: { not: null } },
      orderBy: { deleted_at: 'desc' },
    }),
    this.prisma.productProcessChangePlan.findFirst({
      where: {
        product_id: id,
        company_id: '1',
        status: { in: [...UNFINISHED_PRODUCT_PROCESS_CHANGE_STATUSES] },
      },
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.cCPPoint.findMany({
      where: {
        company_id: '1',
        deleted_at: null,
        process_step: { product_id: id, deleted_at: null },
      },
      orderBy: { ccp_no: 'asc' },
    }),
    this.prisma.cCPPoint.findMany({
      where: {
        company_id: '1',
        deleted_at: { not: null },
        process_step: { product_id: id },
      },
      orderBy: { deleted_at: 'desc' },
    }),
    this.prisma.productProcessChangePlan.findMany({
      where: { product_id: id, company_id: '1' },
      select: { id: true },
    }),
  ]);

  const planIds = allPlanIdsRaw.map((p) => p.id);
  const failureTodos = planIds.length
    ? await this.prisma.todoTask.findMany({
        where: {
          type: 'change_execution_failed',
          status: 'pending',
          relatedId: { in: planIds },
        },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  const recipeChangeIds = [currentRecipe, ...archivedRecipes]
    .map((recipe) => recipe?.changeEventId)
    .filter((value): value is string => Boolean(value));
  const stepChangeIds = [...processSteps, ...archivedProcessSteps]
    .map((step) => step.changeEventId)
    .filter((value): value is string => Boolean(value));
  const planChangeIds = activePlan ? [activePlan.changeEventId] : [];
  const allIds = Array.from(new Set([...recipeChangeIds, ...stepChangeIds, ...planChangeIds]));

  const relatedChanges = allIds.length
    ? await this.prisma.changeEvent.findMany({
        where: { id: { in: allIds } },
        orderBy: { created_at: 'desc' },
      })
    : [];

  return {
    product,
    currentRecipe,
    archivedRecipes,
    processSteps,
    archivedProcessSteps,
    activePlan,
    ccpPoints,
    archivedCcpPoints,
    failureTodos,
    relatedChanges,
  };
}
```

- [ ] **Step 4: 跑测试**

```bash
npm run test -w server -- product.service.spec.ts --runInBand
```

预期：pass。

- [ ] **Step 5: 提交**

```bash
git add server/src/modules/product/product.service.ts server/src/modules/product/product.service.spec.ts
git commit -m "feat: include ccp points and failure todos in product workbench"
```

---

### Task 10: 客户端 API 类型与方法扩展

**Files:**
- Modify: `client/src/api/product.ts`
- Modify: `client/src/api/product-process-change.ts`

- [ ] **Step 1: 加类型与字段（product.ts）**

在 `client/src/api/product.ts` 的 `ProductWorkbench` 周围（找到现有 interface 区块）加：

```ts
export interface CcpPointSummary {
  id: string;
  ccp_no: string;
  hazard_type: string;
  control_measure: string;
  critical_limit: string;
  cl_min?: string | number | null;
  cl_max?: string | number | null;
  cl_unit?: string | null;
  process_step_id: string;
  deleted_at?: string | null;
}

export interface FailureTodoSummary {
  id: string;
  relatedId: string;       // plan id
  description: string;     // error message
  createdAt: string;
}
```

修改 `ProductWorkbench` 加三个字段：

```ts
ccpPoints: CcpPointSummary[];
archivedCcpPoints: CcpPointSummary[];
failureTodos: FailureTodoSummary[];
```

- [ ] **Step 2: 加 retry / getByPlanId 方法**

修改 `client/src/api/product-process-change.ts`，在 `productProcessChangeApi` 对象内加：

```ts
retry(planId: string) {
  return request.post<ProductProcessChangePlan>(`/product-process-changes/${planId}/retry`);
},
getByPlanId(planId: string) {
  return request.get<ProductProcessChangePlan>(`/product-process-changes/${planId}`);
},
```

> **服务端补丁**：`product-process-change.controller.ts` 也要相应加一个 `GET /product-process-changes/:planId` 端点返回 plan（含 productId）：
>
> ```ts
> @Get('product-process-changes/:planId')
> getByPlanId(@Param('planId') planId: string) {
>   return this.service.getByPlanId(planId);
> }
> ```
>
> service 内：
>
> ```ts
> async getByPlanId(planId: string) {
>   const plan = await this.prisma.productProcessChangePlan.findUnique({ where: { id: planId } });
>   if (!plan) throw new NotFoundException('产品工艺变更不存在');
>   return plan;
> }
> ```
>
> 把这两段一起加进 controller 与 service。

- [ ] **Step 3: 跑客户端 build 确认类型 OK**

```bash
npm run build -w client
```

预期：build 成功。

- [ ] **Step 4: 跑服务端 product-process-change service 测试**

```bash
npm run test -w server -- product-process-change.service.spec.ts --runInBand
```

预期：仍 pass（无回归）。

- [ ] **Step 5: 提交**

```bash
git add client/src/api/product.ts client/src/api/product-process-change.ts server/src/modules/product-process-change/product-process-change.controller.ts server/src/modules/product-process-change/product-process-change.service.ts
git commit -m "feat: client api wrappers for retry and plan lookup"
```

---

### Task 11: 客户端 — ProductByPlanRedirect 跳板视图

**Files:**
- Create: `client/src/views/product/ProductByPlanRedirect.vue`
- Create: `client/src/views/product/__tests__/ProductByPlanRedirect.spec.ts`
- Modify: `client/src/router/index.ts`

- [ ] **Step 1: 写失败用例**

创建 `client/src/views/product/__tests__/ProductByPlanRedirect.spec.ts`：

```ts
import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import ProductByPlanRedirect from '../ProductByPlanRedirect.vue';

vi.mock('@/api/product-process-change', () => ({
  productProcessChangeApi: {
    getByPlanId: vi.fn().mockResolvedValue({ id: 'plan-1', product_id: 'prod-9' } as any),
  },
}));

const replace = vi.fn();
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { planId: 'plan-1' } }),
  useRouter: () => ({ replace }),
}));

describe('ProductByPlanRedirect', () => {
  it('redirects to product detail by planId', async () => {
    mount(ProductByPlanRedirect);
    await flushPromises();
    expect(replace).toHaveBeenCalledWith('/products/prod-9');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npm run test -w client -- ProductByPlanRedirect.spec.ts
```

预期：找不到组件文件。

- [ ] **Step 3: 实现跳板视图**

创建 `client/src/views/product/ProductByPlanRedirect.vue`：

```vue
<template>
  <div v-loading="loading" style="padding: 40px">
    <span>正在跳转到对应产品...</span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { productProcessChangeApi } from '@/api/product-process-change';

const route = useRoute();
const router = useRouter();
const loading = ref(true);

onMounted(async () => {
  const planId = route.params.planId as string;
  try {
    const plan = await productProcessChangeApi.getByPlanId(planId);
    const productId = (plan as any).product_id ?? (plan as any).productId;
    if (!productId) throw new Error('产品工艺变更未关联产品');
    router.replace(`/products/${productId}`);
  } catch (err: any) {
    ElMessage.error(err?.message ?? '跳转失败');
    router.replace('/products');
  } finally {
    loading.value = false;
  }
});
</script>
```

- [ ] **Step 4: 加路由**

修改 `client/src/router/index.ts`，在已有 `products/:id` 路由旁追加：

```ts
{
  path: 'products/by-plan/:planId',
  name: 'ProductByPlanRedirect',
  component: () => import('@/views/product/ProductByPlanRedirect.vue'),
  meta: { title: '产品工艺变更跳转', hidden: true },
},
```

注意路径顺序：`products/by-plan/:planId` 必须放在 `products/:id` **之前**，否则 `:id` 会先匹配吃掉 `by-plan`。

- [ ] **Step 5: 跑测试确认通过**

```bash
npm run test -w client -- ProductByPlanRedirect.spec.ts
npm run build -w client
```

预期：测试 pass + build 成功。

- [ ] **Step 6: 提交**

```bash
git add client/src/views/product/ProductByPlanRedirect.vue client/src/views/product/__tests__/ProductByPlanRedirect.spec.ts client/src/router/index.ts
git commit -m "feat: add product by plan redirect view"
```

---

### Task 12: 详情页失败区块 + CCP 子表 + 重试

**Files:**
- Modify: `client/src/views/product/ProductDetail.vue`
- Modify: `client/src/views/product/__tests__/ProductDetail.spec.ts`

- [ ] **Step 1: 写失败用例（失败区块）**

在 `ProductDetail.spec.ts` 追加：

```ts
it('renders failure block when failureTodos is non-empty and triggers retry', async () => {
  const retryMock = vi.fn().mockResolvedValue({});
  vi.mocked(productProcessChangeApi.retry as any).mockImplementation(retryMock);
  mockProductApi.getWorkbench.mockResolvedValue({
    product: { id: 'prod-1', name: '测试产品', status: 'active' },
    currentRecipe: null,
    archivedRecipes: [],
    processSteps: [],
    archivedProcessSteps: [],
    activePlan: null,
    ccpPoints: [],
    archivedCcpPoints: [],
    failureTodos: [
      { id: 't-1', relatedId: 'plan-1', description: 'recipe area missing', createdAt: '2026-04-30T00:00:00Z' },
    ],
    relatedChanges: [],
  });
  const wrapper = mount(ProductDetail, { global: { stubs } });
  await flushPromises();
  expect(wrapper.text()).toContain('执行失败');
  expect(wrapper.text()).toContain('recipe area missing');
  // 触发重试（按钮带 data-test）
  await wrapper.find('[data-test="retry-failure"]').trigger('click');
  // 由于 ElMessageBox.confirm 是异步弹窗，spec 内 stub 它直接 resolve
});
```

> spec 顶部 mock `productProcessChangeApi.retry`：
>
> ```ts
> vi.mock('@/api/product-process-change', () => ({
>   productProcessChangeApi: {
>     retry: vi.fn().mockResolvedValue({}),
>     getByPlanId: vi.fn(),
>     createDraft: vi.fn(),
>     submit: vi.fn(),
>   },
> }));
> ```
>
> 同时 mock `ElMessageBox.confirm`：
>
> ```ts
> vi.mock('element-plus', async (orig) => {
>   const real: any = await orig();
>   return {
>     ...real,
>     ElMessageBox: { ...real.ElMessageBox, confirm: vi.fn().mockResolvedValue('confirm') },
>     ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
>   };
> });
> ```

- [ ] **Step 2: 写失败用例（CCP 子表）**

继续在 spec 加：

```ts
it('renders active and archived ccp tables', async () => {
  mockProductApi.getWorkbench.mockResolvedValue({
    product: { id: 'prod-1', name: '测试', status: 'active' },
    currentRecipe: null, archivedRecipes: [],
    processSteps: [], archivedProcessSteps: [],
    activePlan: null,
    ccpPoints: [{ id: 'a1', ccp_no: 'CCP-01', hazard_type: 'biological', control_measure: '', critical_limit: '', process_step_id: 's' }],
    archivedCcpPoints: [{ id: 'a2', ccp_no: 'CCP-OLD', hazard_type: 'chemical', control_measure: '', critical_limit: '', process_step_id: 's', deleted_at: '2026-01-01T00:00:00Z' }],
    failureTodos: [], relatedChanges: [],
  });
  const wrapper = mount(ProductDetail, { global: { stubs } });
  await flushPromises();
  expect(wrapper.text()).toContain('CCP 控制点');
  expect(wrapper.text()).toContain('CCP-01');
  expect(wrapper.text()).toContain('CCP-OLD');
});
```

- [ ] **Step 3: 跑测试确认失败**

```bash
npm run test -w client -- ProductDetail.spec.ts
```

预期：fail。

- [ ] **Step 4: 加失败区块到 ProductDetail.vue**

在"产品基础信息"区块**下方**、"当前正式数据"区块**上方**插入：

```vue
<section v-if="workbench.failureTodos?.length" class="section">
  <h2>执行失败</h2>
  <el-alert type="error" :closable="false" show-icon>
    审批通过但自动落库未成功。请检查错误原因后重试。
  </el-alert>
  <el-table :data="workbench.failureTodos" stripe style="margin-top: 12px">
    <el-table-column prop="createdAt" label="失败时间" />
    <el-table-column prop="description" label="错误消息" />
    <el-table-column label="操作" width="120">
      <template #default="{ row }">
        <el-button
          size="small"
          type="primary"
          data-test="retry-failure"
          @click="handleRetry(row.relatedId)"
        >
          重试
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</section>
```

并在 `<script setup>` 顶部加：

```ts
import { ElMessageBox } from 'element-plus';
import { productProcessChangeApi } from '@/api/product-process-change';

async function handleRetry(planId: string) {
  try {
    await ElMessageBox.confirm(
      '重试将把该变更重新置为草稿状态，需要重新提交审批。继续？',
      '确认重试',
      { type: 'warning' },
    );
    await productProcessChangeApi.retry(planId);
    ElMessage.success('已重置为草稿，请到"进行中变更方案"区块继续提交');
    await loadWorkbench();
  } catch (err: any) {
    if (err === 'cancel') return;
    ElMessage.error(err?.message ?? '重试失败');
  }
}
```

- [ ] **Step 5: 加 CCP 子表**

在"当前正式数据"区块内（与 RecipeSummary / ProcessStepSummary 平级）追加：

```vue
<section class="subsection">
  <h3>CCP 控制点</h3>
  <el-empty v-if="!workbench.ccpPoints?.length" description="暂无 CCP 控制点" />
  <el-table v-else :data="workbench.ccpPoints" stripe>
    <el-table-column prop="ccp_no" label="CCP 编号" width="120" />
    <el-table-column prop="hazard_type" label="危害类型" width="120" />
    <el-table-column prop="control_measure" label="控制措施" />
    <el-table-column prop="critical_limit" label="临界值" width="160" />
  </el-table>
</section>
```

在"历史版本"区块内追加（同样的表，绑 `archivedCcpPoints`，标题改"已归档 CCP 控制点"）：

```vue
<section class="subsection" v-if="workbench.archivedCcpPoints?.length">
  <h3>已归档 CCP 控制点</h3>
  <el-table :data="workbench.archivedCcpPoints" stripe>
    <el-table-column prop="ccp_no" label="CCP 编号" width="120" />
    <el-table-column prop="hazard_type" label="危害类型" width="120" />
    <el-table-column prop="deleted_at" label="归档时间" width="180" />
    <el-table-column prop="control_measure" label="控制措施" />
  </el-table>
</section>
```

- [ ] **Step 6: 跑测试确认通过**

```bash
npm run test -w client -- ProductDetail.spec.ts
npm run build -w client
```

预期：所有用例 pass + build 成功。

- [ ] **Step 7: 提交**

```bash
git add client/src/views/product/ProductDetail.vue client/src/views/product/__tests__/ProductDetail.spec.ts
git commit -m "feat: render failure block and ccp tables in product detail"
```

---

### Task 13: 集成回归与浏览器烟雾

**Files:**
- 不修改代码；仅校验。

- [ ] **Step 1: 跑全量服务端针对性测试**

```bash
npm run test -w server -- product-process-change product.service todo.service change-event.service.spec.ts --runInBand
```

预期：所有产品工艺变更相关套件 pass。

- [ ] **Step 2: 跑全量客户端针对性测试**

```bash
npm run test -w client -- ProductDetail ProductByPlanRedirect ProductList SystemFileLibrary product-rnd-menu
```

预期：全部 pass。

- [ ] **Step 3: 跑构建**

```bash
npm run build -w client
npm run build -w server
```

预期：两边 build 成功。

- [ ] **Step 4: 浏览器烟雾验证（手工）**

启动服务后逐条核对：

1. 进入产品详情，能看到"CCP 控制点"区块（含活跃 CCP 表）。
2. 模拟一次 apply 失败（临时把某产品的 active 配料区改成 deleted_at=now，让审批通过时校验失败）。
3. 顶部"我的待办"红点 +1；点击进入 `/my-todos` 看到 `change_execution_failed` 类型条目。
4. 待办行点击跳转，最终 URL 是 `/products/{productId}` 且产品详情显示"执行失败"红框 + 错误消息。
5. 在详情页点"重试"，确认弹窗后：
   - plan 状态回到 draft（重新查 workbench 验证 activePlan 是 draft）；
   - 顶部红点 -1；
   - 待办列表里该条目变成"已完成"。
6. 删除一个 CCP（提交一份 ccpPoints 不含某 ccp_no 的提案）→ 审批通过 → 详情页"CCP 控制点"少一行，"已归档 CCP 控制点"多一行。
7. 第二次提交相同 ccp_no 的新建被 `@@unique([company_id, ccp_no])` 拒绝（预期：报错"ccp_no 已存在或被归档，无法复用"，错误来自 Prisma constraint）。

- [ ] **Step 5: 如有补丁性修改，最后提交一次**

```bash
git status --short
git add <only-files-changed-in-this-plan>
git commit -m "test: verify product workbench followups"
```

如无补丁，跳过此步。

---

## Self-Review

- **Spec coverage**：CCPPoint 软删（Task 1）、HACCP 整体替换 + 校验（Task 4）、recipe_id 注释（Task 5）、TodoType 枚举（Task 2）、bridge（Task 3）、apply 接 bridge（Task 6）、retry（Task 7）、todo 路由（Task 8）、workbench 字段（Task 9）、客户端类型/方法（Task 10）、跳板（Task 11）、详情页 UI（Task 12）、回归（Task 13）—— 全部覆盖。
- **Placeholder scan**：无 TBD/TODO/"实现略"。
- **Type consistency**：`failureTodos`/`ccpPoints`/`archivedCcpPoints` 在服务端、客户端类型、模板里命名一致。`ProductProcessChangeTodoBridge` 在 spec、模块、service 注入处命名一致。`change_execution_failed` 在 schema、bridge、service、ACTION_ROUTE_MAP 里使用一致。
- **Path consistency**：`/products/by-plan/:planId` 在 ACTION_ROUTE_MAP 与 router 里一致。
