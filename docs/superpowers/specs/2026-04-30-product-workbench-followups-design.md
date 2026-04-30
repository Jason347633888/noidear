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
| 失败列表 API：`GET /change-event-executions/failed` | server 控制器 + 服务 | 低 |
| 工作台扩 `failedExecutions` 字段 | server `ProductService.getWorkbench` | 低 |
| 顶部红点 `<FailedExecutionBadge>` | client `Layout.vue` | 低 |
| 全局失败列表页 `/alerts/failed-executions` | client 新视图 + 路由 | 低 |
| 详情页失败区块 + 重试 | client `ProductDetail.vue` | 低 |
| 重试接口 `POST /product-process-changes/:planId/retry` | server | 低 |

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

## 4. 失败可见性

### 4.1 来源（已存在）

- `ChangeEventExecution.status` 已有 `'failed'` 写入路径（`applyApprovedChange` catch 块通过 `this.prisma.upsert`）。
- `ProductProcessChangePlan.status = 'execution_failed'` 同步存在。

本节只做读取与展示，不增加失败侧的写入路径。

### 4.2 服务端 API

#### 新增 `GET /change-event-executions/failed`

```ts
// 控制器：server/src/modules/change-event/change-event-execution.controller.ts（新文件）
@Controller()
@UseGuards(JwtAuthGuard)
export class ChangeEventExecutionController {
  constructor(private readonly service: ChangeEventExecutionService) {}

  @Get('change-event-executions/failed')
  listFailed() {
    return this.service.listFailed();
  }
}

// 服务：server/src/modules/change-event/change-event-execution.service.ts
async listFailed(): Promise<FailedExecutionItem[]> {
  const rows = await this.prisma.changeEventExecution.findMany({
    where: { company_id: '1', status: 'failed' },
    orderBy: { executedAt: 'desc' },
    take: 50,
    include: {
      changeEvent: {
        select: {
          id: true,
          change_no: true,
          title: true,
          productProcessChangePlan: {
            select: {
              id: true,
              product: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  return rows
    .filter(r => r.changeEvent.productProcessChangePlan) // 只关心产品工艺类失败
    .map(r => ({
      id: r.id,
      changeEventId: r.changeEventId,
      change_no: r.changeEvent.change_no,
      title: r.changeEvent.title,
      errorMessage: r.errorMessage,
      executedAt: r.executedAt!,
      planId: r.changeEvent.productProcessChangePlan!.id,
      productId: r.changeEvent.productProcessChangePlan!.product.id,
      productName: r.changeEvent.productProcessChangePlan!.product.name,
    }));
}
```

返回结构：

```ts
type FailedExecutionItem = {
  id: string;
  changeEventId: string;
  change_no: string;
  title: string;
  errorMessage: string | null;
  executedAt: Date;
  productId: string;
  productName: string;
  planId: string;
};
```

#### 扩 `GET /products/:id/workbench`

新增字段：

```ts
failedExecutions: FailedExecutionItem[]; // 仅这个产品最近 N 条失败，N=10
```

#### 新增 `POST /product-process-changes/:planId/retry`

```ts
// ProductProcessChangeController
@Post('product-process-changes/:planId/retry')
retry(@Param('planId') planId: string, @Req() req) {
  return this.service.retryFailed(planId, req.user.id);
}

// ProductProcessChangeService
async retryFailed(planId: string, actorId: string) {
  return this.prisma.$transaction(async (tx) => {
    const plan = await tx.productProcessChangePlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('产品工艺变更不存在');
    if (plan.status !== 'execution_failed') {
      throw new BadRequestException('仅失败状态的变更可重试');
    }

    // 重置为 draft，让用户选择改不改 payload 后再 submit
    await tx.productProcessChangePlan.update({
      where: { id: planId },
      data: { status: 'draft', executionError: null, lockedAt: null },
    });

    return plan;
  });
}
```

**口径明确**：retry 只把 plan 状态拉回 `draft`。用户在详情页继续选择"立即重新提交审批"或"先改 payload 再提交"。重新提交走既有的 `submitForApproval`，会重新创建 ApprovalInstance。

### 4.3 客户端

#### `<FailedExecutionBadge>`（新组件）

放置：`Layout.vue` 顶部用户头像左边。

行为：
- `onMounted` 调一次 `GET /change-event-executions/failed`，取 `length` 显示数字。
- `setInterval` 60 秒轮询一次。`onBeforeUnmount` 清掉。
- 数 = 0 隐藏；> 99 显示 `99+`。
- 点击：`router.push('/alerts/failed-executions')`。

#### 全局失败列表页 `/alerts/failed-executions`（新视图）

`client/src/views/alerts/FailedExecutionList.vue`，路由：

```ts
{ path: 'alerts/failed-executions', name: 'FailedExecutionList',
  component: () => import('@/views/alerts/FailedExecutionList.vue'),
  meta: { title: '执行失败列表' } }
```

表格列：失败时间 / 产品 / 变更编号 / 错误消息 / 操作（"查看产品" + "重试"）。

#### 详情页失败区块

在"进行中变更方案"区块之上插入：

```vue
<section v-if="workbench.failedExecutions?.length">
  <h2>执行失败</h2>
  <el-alert type="error" :closable="false">
    审批通过但自动落库未成功。请检查错误原因后重试。
  </el-alert>
  <el-table :data="workbench.failedExecutions">
    <el-table-column prop="executedAt" label="失败时间" />
    <el-table-column prop="change_no" label="变更编号" />
    <el-table-column prop="errorMessage" label="错误消息" />
    <el-table-column label="操作">
      <template #default="{ row }">
        <el-button size="small" @click="handleRetry(row.planId)">重试</el-button>
      </template>
    </el-table-column>
  </el-table>
</section>
```

`handleRetry` 弹 `ElMessageBox.confirm('重试将把该变更重新置为草稿状态，需要重新提交审批。继续？')`，确认后调 `productProcessChangeApi.retry(planId)`，成功后重载工作台 + 提示用户去"进行中变更方案"区块继续提交。

### 4.4 重试语义（已敲定为 X）

失败 → 重试 → plan 回到 `draft` → 用户重新提交 → 重审。

**不允许**跳过审批直接重跑落库（避免用户改了 payload 而不重审的隐患）。

### 4.5 测试

- `listFailed` API：mock prisma 返回 N 条 → service 正确组装包含 product 信息的 items
- `retryFailed`：plan.status='execution_failed' → 调 retry → status=draft、executionError=null
- `retryFailed` 拒绝非失败状态：plan.status='executed' → 抛 `'仅失败状态的变更可重试'`
- 详情页：`workbench.failedExecutions` 非空 → 渲染失败区块；空 → 不渲染
- 顶部红点：`listFailed` 返回 3 条 → 徽标显示 3；返回 0 → 徽标隐藏
- 失败列表页：渲染、点"查看产品"跳转、点"重试"调 retry API

---

## 5. 风险与权衡

1. **CCPPoint `ccp_no` 不可即时复用**——`@@unique([company_id, ccp_no])` 保留。如运营反馈强烈，可在后续迭代改成 `@@unique([company_id, ccp_no, deleted_at])`，本期不做。
2. **顶部红点 60s 轮询**——5–50 人团队没问题；上百人需换 SSE / WebSocket，本期不做。
3. **重试时审批定义已被修改**——重新创建的 ApprovalInstance 走最新审批定义。这是预期行为，文档需写明。
4. **HACCP 整体替换的 UI 风险**——前端必须先把当前活跃 CCP 一并塞进 payload 数组，少塞会被静默软删。详情页提案预览必须显示 diff（"将删除：CCP-03 / 将更新：CCP-01 / 将新建：CCP-04"）让用户在提交前看见。

---

## 6. 文件改动清单

### Server
- `server/src/prisma/schema.prisma` —— `CCPPoint.deleted_at` 字段 + 索引
- `server/src/prisma/migrations/<ts>_ccp_point_soft_delete/migration.sql` —— 新增
- `server/src/modules/product-process-change/product-process-change.service.ts` —— `applyHaccpChange` 重写、`retryFailed` 新增、`recipe_id` 注释
- `server/src/modules/product-process-change/product-process-change.controller.ts` —— retry endpoint
- `server/src/modules/product-process-change/dto/product-process-change.dto.ts` —— `CcpPointPayloadDto` 已有，无需改
- `server/src/modules/change-event/change-event-execution.controller.ts` —— 新增
- `server/src/modules/change-event/change-event-execution.service.ts` —— 新增
- `server/src/modules/change-event/change-event.module.ts` —— 注册新 controller/service
- `server/src/modules/product/product.service.ts` —— `getWorkbench` 增 `failedExecutions / ccpPoints / archivedCcpPoints`
- 测试 spec：`product-process-change-apply.service.spec.ts` 扩、`product-process-change.service.spec.ts` 扩、新增 `change-event-execution.service.spec.ts`

### Client
- `client/src/api/product.ts` —— `ProductWorkbench` 加 `failedExecutions / ccpPoints / archivedCcpPoints`，新类型 `FailedExecutionItem` `CcpPointSummary`
- `client/src/api/product-process-change.ts` —— `retry(planId)`
- `client/src/api/change-event-execution.ts` —— 新文件，`listFailed()`
- `client/src/views/Layout.vue` —— 引入 `<FailedExecutionBadge>`
- `client/src/components/FailedExecutionBadge.vue` —— 新组件
- `client/src/views/alerts/FailedExecutionList.vue` —— 新视图
- `client/src/router/index.ts` —— `/alerts/failed-executions` 路由
- `client/src/views/product/ProductDetail.vue` —— 失败区块 + handleRetry
- 测试：`FailedExecutionBadge.spec.ts`、`FailedExecutionList.spec.ts`、`ProductDetail.spec.ts` 扩

---

## 7. 实施顺序建议（写计划时拆成的 Task）

1. CCPPoint schema + 迁移
2. `applyHaccpChange` 重写 + 测试
3. `recipe_id` 注释
4. `change-event-execution` 服务/控制器 + 测试
5. `getWorkbench` 扩字段 + 测试
6. `retryFailed` 服务/控制器 + 测试
7. 客户端 API wrapper（`change-event-execution.ts` + `productProcessChangeApi.retry`）
8. `<FailedExecutionBadge>` 组件 + 集成进 Layout
9. `/alerts/failed-executions` 列表页
10. 详情页失败区块 + handleRetry
11. 集成测试 + 浏览器烟雾验证

每步独立可测可回滚。
