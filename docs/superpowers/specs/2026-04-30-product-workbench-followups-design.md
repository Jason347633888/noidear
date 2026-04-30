# 产品工艺变更联动 —— 三项遗留补全设计

**日期**：2026-04-30
**前置**：`docs/superpowers/plans/2026-04-30-product-workbench-change-linkage-implementation.md` 已实现并合入。
**范围**：在已完成的产品工艺变更闭环基础上补全三项边角，不动核心审批流。

---

## 1. 总体

### 1.1 目标

| # | 遗留项 | 决策 |
|---|---|---|
| ① | HACCP 控制点删除语义未定 | 软删（`deleted_at`），payload 整体替换语义 |
| ② | 只改工艺时新工序的 `recipe_id` 行为 | 维持现状（null），仅加注释把口径写死 |
| ③ | 自动落库失败无人发现 | 前端可见：顶部红点告警 + 详情页失败区块 + 重试入口 |

### 1.2 不动的部分

- 审批引擎 `ApprovalEngineService`
- `applyApprovedChange` 主链路（recipe / process / haccp 三个 scope 的 dispatcher 不变）
- `ProductProcessChangePlan` schema（status 枚举、字段）
- `ChangeEvent` schema
- 产品列表页路由与列表展示

### 1.3 改动一览

| 改动 | 涉及层 | 风险 |
|---|---|---|
| CCPPoint 加 `deleted_at` + 索引 | DB 迁移 + Prisma schema | 低（可空列） |
| HACCP 整体替换语义重写 `applyHaccpChange` | server 服务层 | 中（diff 三段） |
| `ProcessStep.recipe_id` 注释 | server 注释 | 0 |
| `TodoType` 新增 `change_execution_failed` 枚举值 + 迁移 | server schema | 低 |
| `ProductProcessChangeTodoBridge`（新建，仿 ApprovalTodoBridge） | server | 低 |
| `applyApprovedChange` catch 块调 bridge 写 todo | server | 低 |
| 重试接口 `POST /product-process-changes/:planId/retry` | server | 低 |
| `getWorkbench` 扩 `failureTodos` 字段（反查 TodoTask） | server | 低 |
| `TodoService.ACTION_ROUTE_MAP` 新增类型路由 | server | 低 |
| 详情页失败区块（数据源 = workbench.failureTodos） | client `ProductDetail.vue` | 低 |
| 按 plan 跳转产品详情的跳板视图 `ProductByPlanRedirect.vue` | client | 低 |
| **复用**：顶部"我的待办"红点 / `/my-todos` 列表页 / `todoStore` 轮询 | client（无新建） | 0 |

---

## 2. HACCP 软删 + 整体替换

### 2.1 Schema

`CCPPoint` 加可空 `deleted_at`：

```prisma
model CCPPoint {
  // ...既有字段不变...
  deleted_at DateTime?

  @@unique([company_id, ccp_no])  // 保持不变
  @@index([company_id, deleted_at]) // 新增，便于按"在用"过滤
  @@map("ccp_points")
}
```

迁移文件：`server/src/prisma/migrations/<ts>_ccp_point_soft_delete/migration.sql`

```sql
ALTER TABLE "ccp_points" ADD COLUMN "deleted_at" TIMESTAMP NULL;
CREATE INDEX "ccp_points_company_id_deleted_at_idx" ON "ccp_points" ("company_id", "deleted_at");
```

**有意保留**：`@@unique([company_id, ccp_no])` 不变，意味着软删后该 `ccp_no` 不能立即被新建复用，要先在归档区改名。代价是限制重名复用，收益是审计链不断。

### 2.2 提案 payload 语义（整体替换）

`payloadJson.ccpPoints` 表示"审批通过后这个产品最终活跃的 CCP 全集"。

- 不在数组里的 `ccp_no` = 软删
- 数组里和当前活跃集匹配的 `ccp_no` = 更新
- 数组里和当前活跃集没有匹配的 = 新建

### 2.3 校验

`validatePayload` 在 scope 含 `'haccp'` 时：

- `ccpPoints` 必须**非空**——禁止"清空全部 CCP"，错误消息 `'CCP 控制点不能为空'`
- 现有的字段级校验保留：`step_no`、`ccp_no`、`hazard_type`、`control_measure`、`critical_limit`、`ccp_no` 不重复

### 2.4 应用流程（重写 `applyHaccpChange`）

```ts
private async applyHaccpChange(plan, payload, changeEventId, tx, artifacts) {
  // 1. 当前活跃集：按 product_id 反向 join，仅活跃步骤上的活跃 CCP
  const current = await tx.cCPPoint.findMany({
    where: {
      company_id: plan.company_id,
      deleted_at: null,
      process_step: { product_id: plan.product_id, deleted_at: null },
    },
    include: { process_step: true },
  });

  const payloadByCcpNo = new Map(payload.ccpPoints.map(c => [c.ccp_no, c]));
  const currentByCcpNo = new Map(current.map(c => [c.ccp_no, c]));

  // 2. 三段 diff
  const toDelete = current.filter(c => !payloadByCcpNo.has(c.ccp_no));
  const toUpdate = current.filter(c => payloadByCcpNo.has(c.ccp_no));
  const toCreate = payload.ccpPoints.filter(c => !currentByCcpNo.has(c.ccp_no));

  // 3. 软删
  if (toDelete.length) {
    await tx.cCPPoint.updateMany({
      where: { id: { in: toDelete.map(c => c.id) } },
      data: { deleted_at: new Date() },
    });
    for (const c of toDelete) {
      artifacts.push({
        resourceType: 'ccp_point', resourceId: c.id, action: 'archive',
        beforeSnapshot: snapshotCcp(c), afterSnapshot: Prisma.JsonNull,
      });
    }
  }

  // 4. 更新（按 ccp_no 配对，全字段覆盖）
  for (const old of toUpdate) {
    const next = payloadByCcpNo.get(old.ccp_no)!;
    const stepId = await this.resolveStepIdForCcp(next.step_no, plan, tx);
    const updated = await tx.cCPPoint.update({
      where: { id: old.id },
      data: {
        process_step_id: stepId,
        hazard_type: next.hazard_type,
        control_measure: next.control_measure,
        critical_limit: next.critical_limit,
        cl_min: toDecimal(next.cl_min),
        cl_max: toDecimal(next.cl_max),
        cl_unit: next.cl_unit ?? null,
        monitoring_method: next.monitoring_method ?? null,
        monitoring_frequency: next.monitoring_frequency ?? null,
        corrective_action: next.corrective_action ?? null,
      },
    });
    artifacts.push({
      resourceType: 'ccp_point', resourceId: updated.id, action: 'update',
      beforeSnapshot: snapshotCcp(old), afterSnapshot: snapshotCcp(updated),
    });
  }

  // 5. 新建
  for (const fresh of toCreate) {
    const stepId = await this.resolveStepIdForCcp(fresh.step_no, plan, tx);
    const created = await tx.cCPPoint.create({
      data: { company_id: plan.company_id, process_step_id: stepId, ...fresh },
    });
    artifacts.push({
      resourceType: 'ccp_point', resourceId: created.id, action: 'create',
      beforeSnapshot: Prisma.JsonNull, afterSnapshot: snapshotCcp(created),
    });
  }
}
```

`resolveStepIdForCcp` 沿用既有逻辑：先按本次 changeEventId 的新工序找，找不到回退到当前活跃工序，再找不到抛 `'CCP {ccp_no} 找不到对应工序步骤 {step_no}'`。

### 2.5 客户端

`ProductWorkbench` 增加：
```ts
ccpPoints: CcpPointSummary[];           // 当前活跃
archivedCcpPoints: CcpPointSummary[];   // 已软删
```

详情页"当前正式数据"区块和"历史版本"区块各加一个 CCP 子表，与配方/工序的展示风格一致。提案预览区块（已实现）需要展示"将被删除的 CCP"——payload diff 在前端做一次（前端已经拿到 current vs payload）。

### 2.6 测试（新增）

- `cCPPoint.deleted_at` 字段在 schema spec 中可被引用
- `applyHaccpChange`：current=[A,B,C] payload=[A',D] → 1 update + 2 archive + 1 create + 4 artifacts
- 校验：scope=['haccp'] payload.ccpPoints=[] → 抛 `'CCP 控制点不能为空'`

---

## 3. ProcessStep.recipe_id 注释

唯一改动是 `server/src/modules/product-process-change/product-process-change.service.ts` 的 `applyProcessStepChange` 内创建 ProcessStep 的代码块上方加注释：

```ts
// recipe_id 表示工序所属的"配方版本快照"。
// - 仅在本次 apply 同时改了 recipe（scopeSet.has('recipe')）时填新 recipe.id；
// - 若本次只改 process（scope 不含 'recipe'），保持 null —— 工序此时不绑定任何具体配方版本，
//   仅通过 product_id + changeEventId 追溯。
// 这与 schema 里 recipe_id String? 的可空设计一致。
// 决策依据：scopes 是用户提交时显式勾选的，意图已经清楚，无需服务端再做"推断回填"。
```

不动逻辑、不动测试、不动 schema。0 风险。

---

## 4. 失败可见性（复用现有 Todo 系统）

### 4.1 复用决策

项目已有完整的"待办"基础设施，本节几乎不新建组件，只接入：

| 已有 | 用途 |
|---|---|
| `TodoTask` 表 + `TodoType` 枚举 + `TodoStatus`（pending/completed） | 业务待办的统一存储 |
| `TodoService.findAll(userId, query)` + `getStatistics(userId)` | 列表 + 计数 API |
| `client/src/stores/todo.ts` `todoStore.pendingTodoCount` | 顶部"我的待办"红点数据源（已轮询） |
| `Layout.vue` 顶部"我的待办"菜单项（已含 `el-badge`） | 红点 UI（无需新增组件） |
| `/my-todos` 路由 | 全局待办列表页（已存在） |
| `ApprovalTodoBridge`（在审批引擎事务里写 TodoTask） | 桥接服务模式参考 |

### 4.2 数据来源

`ChangeEventExecution.status='failed'` 与 `ProductProcessChangePlan.status='execution_failed'` 已经在 catch 块写入，**这一节不增加失败侧写入路径**，只多写一条 `TodoTask` 让待办系统知道这件事需要人处理。

### 4.3 新增 TodoType 枚举值

`server/src/prisma/schema.prisma`：

```prisma
enum TodoType {
  // ...既有值不变...
  change_execution_failed   // 产品工艺变更落库失败待处理
}
```

迁移：`server/src/prisma/migrations/<ts>_todo_type_change_execution_failed/migration.sql`

```sql
ALTER TYPE "TodoType" ADD VALUE 'change_execution_failed';
```

### 4.4 ProductProcessChangeTodoBridge（新建，模仿 ApprovalTodoBridge）

`server/src/modules/product-process-change/product-process-change-todo.bridge.ts`：

```ts
@Injectable()
export class ProductProcessChangeTodoBridge {
  constructor(private readonly prisma: PrismaService) {}

  /** 失败时写一条待办给计划提交者；走 this.prisma 而非 tx，确保失败标记同样能 survive 外层事务回滚。 */
  async createFailureTodo(input: {
    plan: { id: string; product_id: string; createdById: string | null };
    actorId: string;
    errorMessage: string;
    productName: string;
  }) {
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
          // 重新失败：把已 completed 的旧条目重新置 pending，刷新错误消息。
          status: 'pending',
          description: input.errorMessage,
          completedAt: null,
          completedBy: null,
        },
      });
    } catch (err) {
      // 写失败 todo 失败不应遮蔽原始异常 —— 只 log，不抛。
    }
  }

  /** 重试 / 成功落库后关闭对应的失败待办。 */
  async closeFailureTodo(planId: string, completedBy: string) {
    await this.prisma.todoTask.updateMany({
      where: { type: 'change_execution_failed', relatedId: planId, status: 'pending' },
      data: { status: 'completed', completedAt: new Date(), completedBy },
    });
  }
}
```

### 4.5 接入 applyApprovedChange 的 catch 路径

`product-process-change.service.ts` 的 `applyApprovedChange` catch 块在已有的"写 plan 失败标记 + 写 ChangeEventExecution failed 行"之后，再调一次：

```ts
} catch (err) {
  // ...既有的 plan 标记 + execution 标记...
  await this.todoBridge.createFailureTodo({
    plan: { id: plan.id, product_id: plan.product_id, createdById: plan.createdById },
    actorId,
    errorMessage: message,
    productName: product?.name ?? plan.product_id,
  });
  throw err;
}
```

`product` 由 catch 块前的 `validatePayload` 阶段查得到（如未查到，回退用 product_id 当 fallback 文案）。

### 4.6 重试接口（仅这条是真新增）

`POST /product-process-changes/:planId/retry`：

```ts
async retryFailed(planId: string, actorId: string) {
  return this.prisma.$transaction(async (tx) => {
    const plan = await tx.productProcessChangePlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('产品工艺变更不存在');
    if (plan.status !== 'execution_failed') {
      throw new BadRequestException('仅失败状态的变更可重试');
    }
    await tx.productProcessChangePlan.update({
      where: { id: planId },
      data: { status: 'draft', executionError: null, lockedAt: null },
    });
    return plan;
  });
  // 关闭失败待办（事务外，幂等）
  await this.todoBridge.closeFailureTodo(planId, actorId);
}
```

注意调整顺序：先关 todo 再返回 plan（或者 retry 内部调 closeFailureTodo 后 return plan）。具体伪代码以实现期为准，关 todo 必须发生在 plan 状态改成 draft 之后。

**口径**：retry = 把 plan 拉回 `draft` 状态 + 关闭对应失败 todo。用户随后在详情页"进行中变更方案"区块决定改不改 payload，然后调既有 `submitForApproval` 重新进入审批。

### 4.7 路由 ACTION_ROUTE_MAP 接入

`server/src/modules/todo/todo.service.ts` 顶部：

```ts
const ACTION_ROUTE_MAP: Partial<Record<TodoType, (id: string) => string>> = {
  // ...既有...
  change_execution_failed: (planId) => `/products/by-plan/${planId}`,  // 见下
};

const ALL_TODO_TYPES: TodoType[] = [
  // ...既有...
  'change_execution_failed',
];
```

`/products/by-plan/:planId` 是一条新路由跳板：因为待办里 `relatedId` 存的是 planId，但用户实际要去的是这个 plan 对应的产品详情页。两种实现方式：

- 方式 A：客户端做跳板组件，进入后调一次 `productProcessChangeApi.getByPlanId(planId)` 拿到 productId，再 `replace('/products/{productId}')`。
- 方式 B：服务端 `ACTION_ROUTE_MAP` 用占位符 + 前端 `/my-todos` 页在生成跳转 url 时已经把 planId → productId 解析好。

推荐 **A**，简单且不需要服务端再 join 一次。`getByPlanId(planId)` 是一个轻量服务方法，复用现有 service。

### 4.8 详情页失败区块（保留，数据源换成 todo 反查）

详情页的失败区块继续渲染，但**数据源不再是新建的 `failedExecutions`**，而是 `TodoTask`。

`ProductService.getWorkbench(id)` 增加：

```ts
const failureTodos = await this.prisma.todoTask.findMany({
  where: {
    type: 'change_execution_failed',
    status: 'pending',
    relatedId: { in: planIdsForThisProduct },  // 该产品所有 plan id
  },
  orderBy: { createdAt: 'desc' },
});
// failureTodos 与 ChangeEventExecution / ProductProcessChangePlan 的 errorMessage 一致
```

返回字段命名为 `failureTodos`（与"todo 系统"语义对齐）。前端区块表格列：失败时间（`createdAt`）/ 错误消息（`description`）/ 操作（"重试"）。

### 4.9 客户端改动总结

新建：
- `client/src/api/product-process-change.ts` 增 `retry(planId)` 与 `getByPlanId(planId)` 方法
- 一个轻量"按 plan 跳产品"的路由跳板视图 `client/src/views/product/ProductByPlanRedirect.vue`（见 4.7）

修改：
- `client/src/api/product.ts`：`ProductWorkbench` 加 `failureTodos: FailureTodoSummary[]`，删掉之前提到的 `failedExecutions`
- `client/src/views/product/ProductDetail.vue`：失败区块的数据绑定改 `workbench.failureTodos`
- `client/src/router/index.ts`：加 `/products/by-plan/:planId` → `ProductByPlanRedirect.vue`

**不动**：`Layout.vue`、`<FailedExecutionBadge>`（不需要建）、全局列表页（不需要建，沿用 `/my-todos`）、`todoStore`。

### 4.10 测试

- `ProductProcessChangeTodoBridge.createFailureTodo`：失败 → todoTask 写一条 pending；二次失败 → upsert 把旧条目刷新回 pending 并更新 description
- `ProductProcessChangeTodoBridge.closeFailureTodo`：调用 → 对应 pending todo 变 completed
- `applyApprovedChange` 失败路径：catch 中调用 createFailureTodo（mock bridge 断言被调）
- `retryFailed`：plan.status='execution_failed' → 调 retry → status=draft、executionError=null、bridge.closeFailureTodo 被调
- `retryFailed` 拒绝非失败状态
- `getWorkbench`：返回 `failureTodos` 仅含本产品 pending 的失败 todo
- 详情页：`workbench.failureTodos` 非空 → 渲染失败区块、点重试调 API
- `ProductByPlanRedirect`：mount → getByPlanId → router.replace 到产品详情

---

## 5. 风险与权衡

1. **CCPPoint `ccp_no` 不可即时复用**——`@@unique([company_id, ccp_no])` 保留。如运营反馈强烈，可在后续迭代改成 `@@unique([company_id, ccp_no, deleted_at])`，本期不做。
2. **顶部红点轮询节奏沿用 todoStore 现状**——本期不动 todoStore 轮询频率。如失败发生到红点显示之间感觉延迟过久，再单独优化 todoStore（本设计不涉及）。
3. **重试时审批定义已被修改**——重新创建的 ApprovalInstance 走最新审批定义。这是预期行为，文档需写明。
4. **HACCP 整体替换的 UI 风险**——前端必须先把当前活跃 CCP 一并塞进 payload 数组，少塞会被静默软删。详情页提案预览必须显示 diff（"将删除：CCP-03 / 将更新：CCP-01 / 将新建：CCP-04"）让用户在提交前看见。

---

## 6. 文件改动清单

### Server
- `server/src/prisma/schema.prisma` —— `CCPPoint.deleted_at` 字段 + 索引；`TodoType` 加 `change_execution_failed`
- `server/src/prisma/migrations/<ts>_ccp_point_soft_delete/migration.sql` —— 新增
- `server/src/prisma/migrations/<ts>_todo_type_change_execution_failed/migration.sql` —— 新增
- `server/src/modules/product-process-change/product-process-change.service.ts` —— `applyHaccpChange` 重写、`retryFailed` 新增、`applyApprovedChange` catch 接 bridge、`recipe_id` 注释
- `server/src/modules/product-process-change/product-process-change.controller.ts` —— retry endpoint
- `server/src/modules/product-process-change/product-process-change-todo.bridge.ts` —— 新增
- `server/src/modules/product-process-change/product-process-change.module.ts` —— 注册 bridge
- `server/src/modules/product/product.service.ts` —— `getWorkbench` 增 `failureTodos / ccpPoints / archivedCcpPoints`
- `server/src/modules/todo/todo.service.ts` —— `ACTION_ROUTE_MAP` + `ALL_TODO_TYPES` 加新类型
- 测试 spec：`product-process-change-apply.service.spec.ts` 扩、`product-process-change.service.spec.ts` 扩、新增 `product-process-change-todo.bridge.spec.ts`、`product.service.spec.ts` 扩

### Client
- `client/src/api/product.ts` —— `ProductWorkbench` 加 `failureTodos / ccpPoints / archivedCcpPoints`，新类型 `FailureTodoSummary` `CcpPointSummary`
- `client/src/api/product-process-change.ts` —— `retry(planId)`、`getByPlanId(planId)`
- `client/src/router/index.ts` —— `/products/by-plan/:planId` 路由
- `client/src/views/product/ProductByPlanRedirect.vue` —— 新增跳板视图
- `client/src/views/product/ProductDetail.vue` —— 失败区块（数据源 `workbench.failureTodos`）+ handleRetry + CCP 子表（活跃/归档）
- 测试：`ProductByPlanRedirect.spec.ts`、`ProductDetail.spec.ts` 扩

---

## 7. 实施顺序建议（写计划时拆成的 Task）

1. CCPPoint schema + 迁移
2. `TodoType` 枚举值 + 迁移
3. `applyHaccpChange` 重写 + 测试（含整体替换 diff、校验、artifact）
4. `recipe_id` 注释
5. `ProductProcessChangeTodoBridge` + 单测
6. `applyApprovedChange` catch 接 bridge + 测试
7. `retryFailed` 服务/控制器 + 测试（含关 todo）
8. `TodoService.ACTION_ROUTE_MAP` 接入新类型
9. `getWorkbench` 扩 `failureTodos` / `ccpPoints` / `archivedCcpPoints` + 测试
10. 客户端 API：`productProcessChangeApi.retry / getByPlanId`、`ProductWorkbench` 类型扩
11. 客户端：`ProductByPlanRedirect.vue` 跳板 + 路由 + 测试
12. 客户端：`ProductDetail.vue` 失败区块（数据源 failureTodos） + CCP 子表 + handleRetry
13. 集成测试 + 浏览器烟雾验证（含"待办红点 +1 / 重试后 -1"链路）

每步独立可测可回滚。
