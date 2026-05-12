# Architecture Cleanup — Full Spec

**Date:** 2026-05-12
**Scope:** 7 architectural bugs identified via GitNexus graph analysis
**Strategy:** Phase A → Phase B → Phase C，每阶段独立可测可合并
**Constraint:** 系统尚未上线，无需兼容旧接口，可直接切换

---

## 背景

通过 GitNexus 对 noidear 代码库（25,216 symbols，300 execution flows）的图谱分析，发现 7 个架构问题，分为三类：

- **重复轮子**：平行 Controller、工具函数散落多处
- **联动缺失**：业务模块绕过审批引擎直接写 DB
- **职责边界错乱**：Statistics 跨域承载导出逻辑、ExportService 过度膨胀

---

## Phase A — 横切基础层

> 目标：稳定共享工具 + 统一权限门，为 Phase B 扫清干扰变量

### A1. 格式化工具统一（Bug #4）

**问题**：`formatDate` / `formatStatus` 在三处独立实现，枚举映射不同步会导致同一数据在不同页面展示不一致。

| 位置 | 函数 |
|------|------|
| `server/src/modules/export/export.service.ts` | `formatDate`, `formatStatus` |
| `server/src/modules/internal-audit/report/report.service.ts` | `formatDate`, `formatDateRange` |
| `client/src/views/internal-audit/RectificationList.vue` | `formatStatus` |

**方案**：

后端新建 `server/src/shared/utils/format.util.ts`：

```ts
export function formatDate(d: Date | string | null, pattern = 'YYYY-MM-DD'): string
export function formatStatus(status: string, map: Record<string, string>): string
export function formatDateRange(start: Date | null, end: Date | null): string
```

- `ExportService` 私有方法 `formatDate` / `formatStatus` 删除，改为 import 共享函数
- `ReportService` 私有方法 `formatDate` / `formatDateRange` 删除，改为 import 共享函数
- 各业务域的状态枚举 map（deviation status、document status 等）保留在自身模块，调用时传入共享 `formatStatus`

前端新建 `client/src/composables/useFormat.ts`：

```ts
export function useFormat() {
  function formatDate(d: string | null, pattern?: string): string
  function formatStatus(status: string, map: Record<string, string>): string
  return { formatDate, formatStatus }
}
```

- `RectificationList.vue` 内联 `formatStatus` 删除，改为 `useFormat()`
- 其他有内联格式化的 Vue 文件同步替换

**验证**：
- 单元测试覆盖 `format.util.ts` 所有函数（含 null/undefined 边界）
- grep 确认原私有方法已无残留调用

---

### A2. 权限统一 Guard（Bug #6）

**问题**：权限判断分散在三条路径，某些接口可能只做了角色检查、漏掉部门数据权限。

| 模块 | 职责 |
|------|------|
| `role/role.service.ts` → `getRolePermissions` | 功能权限（能否操作） |
| `department-permission/` → `CheckDepartmentAccessDto` | 数据权限（能看哪些部门） |
| `user-permission/` | 用户与权限 key 的绑定管理 |

**方案**：

新建 `server/src/shared/guards/unified-permission.guard.ts`：

```ts
@Injectable()
export class UnifiedPermissionGuard implements CanActivate {
  // 1. 从 @RequirePermission() 装饰器读取 permissionKey
  // 2. 调用 RoleService.getRolePermissions 校验功能权限
  // 3. 若接口有部门数据范围要求，调用 DepartmentPermissionService 校验
  // 4. 两层均通过才放行
}
```

新建 `@RequirePermission(key: string)` 装饰器。

`UserPermission` 模块职责收窄为：管理用户与权限 key 的绑定关系，不再参与运行时鉴权。

**接入方式**：现有各 Controller 中散落的直接权限判断，逐步替换为 `@RequirePermission(key)` 装饰器。`JwtAuthGuard` 继续负责身份验证，`UnifiedPermissionGuard` 只做授权。

**验证**：
- 单元测试覆盖 guard 的三种场景：通过、角色不足拒绝、部门不足拒绝
- E2E `role-isolation.spec.ts` 全量通过

---

## Phase B — 核心业务层

> 目标：审批引擎接管旁路模块，导出层按域拆分

### B1. 审批引擎统一（Bug #2）

**重要澄清**：`WorkflowInstance`（schema:729）和 `ApprovalInstance`（schema:471）是两套有意并存的系统，服务不同语义，**不在本次合并范围内**。

本次只修三处绕过 `ApprovalEngineService` 的旁路：

#### B1-a. DeviationService.approveDeviationReport

**现状**：方法已标 `@deprecated`，注入了 `ApprovalEngineService` 但标为 `@Optional()` 从未实际调用，最终退化为直接写 DB。

```ts
// 现状（有问题）
@Optional() private readonly approvalEngine?: ApprovalEngineService
// 最终走的是:
return this.prisma.deviationReport.update({ ... })  // 直接写 DB，不触发引擎
```

**修法**：
1. 移除 `@Optional()`，改为强依赖注入
2. 删除直接写 DB 的降级逻辑
3. 调用 `ApprovalEngineService.act(instanceId, action, actorId, comment)` 完成审批
4. 在 `ApprovalCallbackRegistry` 注册 deviation 的 `onApproved` 回调，由引擎完成审批后触发偏差状态更新

#### B1-b. ChangeEventService.approve

**现状**：直接写 DB + 只发 `eventEmitter` 事件，不经过审批引擎。

```ts
// 现状（有问题）
async approve(id: string, userId: string) {
  return this.updateStatus(id, 'approved', userId);  // 直接写 DB
}
```

**修法**：
1. 检查 ChangeEvent 是否已在 `ApprovalInstance` 中有对应实例
2. 若有：委托 `ApprovalEngineService.act()` 处理，引擎触发通知 + todo 关闭
3. 若无（旧数据）：保留直接写 DB 作为降级，但记录警告日志
4. `onApproved` 回调负责同步 `ChangeEvent.status` 字段

#### B1-c. ProductRecallService（补通知）

**现状**：有完整的本地状态机（`allowedTransitions`），状态流转逻辑正确，**但 `approve` 时不发通知**。

**修法**：状态机保留不动，在 `approve` / `reject` 方法内补调 `NotificationBridge`：

```ts
async approve(id, dto, currentUser) {
  const result = await this.transition(id, currentUser, 'approved', { ... });
  await this.notificationBridge.notifyRequester(recall.requested_by, 'approved', recall.title);
  return result;
}
```

不引入 `ApprovalEngineService` 依赖（ProductRecall 的多步骤工作流语义与引擎不匹配）。

**验证**：
- 集成测试覆盖：deviation 提交审批 → 引擎推进 → 通知触发 → 状态更新全链路
- 集成测试覆盖：change-event 审批 → todo 关闭 → 通知发送
- 集成测试覆盖：product recall approve → 通知发送
- E2E 回归 approval 相关 spec

---

### B2. ExportService 拆分（Bug #5）

**问题**：`export.service.ts` 882 行，承载 6 类数据导出，7 个模块直接 import，任何改动波及面极大。

**拆分目标结构**：

```
server/src/modules/export/
  export.service.ts          → 保留为薄 Facade（仅路由调用，不含业务逻辑）
  services/
    document-export.service.ts   — exportDocuments, fillDocuments, mapDocumentRow, buildDocumentWhere
    task-export.service.ts       — exportTasks, exportTaskRecords, fillTasks, mapTaskRow, mapRecordRow, buildTaskWhere
    deviation-export.service.ts  — exportDeviationReports, fillDeviations, mapDeviationRow, buildDeviationWhere
    approval-export.service.ts   — exportApprovals, fillApprovals, mapApprovalRow, buildApprovalWhere
    user-export.service.ts       — exportUsers, fillUsers, formatUserRole, buildUserWhere
```

共享工具提取到 `server/src/shared/utils/excel.util.ts`：
- `setupWorksheet`
- `filterRow`
- `addDateRange`
- `getFilteredFields`

`ExportService`（Facade）保持原有方法签名，内部委托给对应 domain service，**外部调用方零改动**。

**验证**：
- `export.service.spec.ts` 全量通过
- E2E `task-batch-export.e2e-spec.ts` 通过
- 单文件行数均 ≤ 300 行

---

### B3. Statistics 导出职责归位（Bug #3）

**问题**：`ExportService` 混入三个统计专属方法（`exportDocumentStatistics`、`exportTaskStatistics`、`exportApprovalStatistics`），属于 Statistics 域却放在通用 Export 模块。

**现状路由**（前后端一致，无需改路由）：
- 前端：`client/src/api/export.ts` → `GET /statistics/export`
- 后端：`StatisticsController.export` 处理，已调用 `exportService.export*Statistics()`

**修法**：将三个统计导出方法从 `ExportService` 迁出，新建 `statistics-export.service.ts`：

```
server/src/modules/statistics/
  statistics.controller.ts        — 不变，调用本域 service
  statistics.service.ts           — 不变
  statistics-export.service.ts    — 新增，承接三个统计导出方法
```

`StatisticsController` 注入 `StatisticsExportService` 替代 `ExportService`。`ExportService`（及拆分后的各 domain service）中删除这三个方法。

**验证**：
- `/statistics/export?type=documents|tasks|approvals` 三种请求均返回正确 xlsx
- `ExportService` 不再 import 任何 StatisticsService 依赖

---

## Phase C — 路由与模块清理

> 目标：删除死代码，整理低 cohesion 模块

### C1. 删除 DeviationAliasController（Bug #1）

**确认**：
- `DeviationAliasController` → `@Controller('deviation')`（`/deviation/*`）
- `DeviationController` → `@Controller('deviation-reports')`（`/deviation-reports/*`）
- 前端 `client/src/api/deviation.ts` 全部调用 `/deviation-reports`，`/deviation` 零调用

**操作**：
1. 删除 `server/src/modules/deviation/deviation-alias.controller.ts`
2. 从 `deviation.module.ts` 的 `controllers` 数组中移除 `DeviationAliasController`
3. grep 确认零残留引用

**验证**：
- deviation 相关 E2E 全量通过
- `deviation.module.ts` 编译无报错

---

### C2. Recycle-bin 模块整理（Bug #7）

**现状**：cohesion 76%（全局最低），内部 symbols 跨业务域混杂。

**操作**：
1. 用 `gitnexus_context` 枚举 Recycle-bin cluster 内所有 symbol，按业务域归类
2. 判断属于哪种情况：
   - **情况 A**：混入了各业务域逻辑 → 迁回对应模块，`RecycleBinService` 仅保留跨域查询聚合
   - **情况 B**：cohesion 低但职责清晰 → 仅补充模块边界注释，不动代码
3. 无论哪种情况，不新增功能，不改接口

**验证**：
- 与 Recycle-bin 相关的现有测试全量通过

---

## 测试策略

| 阶段 | 单元测试 | 集成测试 | E2E |
|------|----------|----------|-----|
| Phase A | `format.util.spec.ts`、`unified-permission.guard.spec.ts` | — | `role-isolation.spec.ts` |
| Phase B | 各 domain export service spec | deviation/change-event/recall 审批全链路 | approval、export E2E |
| Phase C | — | — | deviation E2E 全量 |

每个 Phase 结束前：`pnpm test` 全量单元测试 + `playwright test` 全量 E2E，全绿才合并。

---

## 文件变更清单

### 新增
- `server/src/shared/utils/format.util.ts`
- `server/src/shared/utils/excel.util.ts`
- `server/src/shared/guards/unified-permission.guard.ts`
- `server/src/shared/decorators/require-permission.decorator.ts`
- `server/src/modules/export/services/document-export.service.ts`
- `server/src/modules/export/services/task-export.service.ts`
- `server/src/modules/export/services/deviation-export.service.ts`
- `server/src/modules/export/services/approval-export.service.ts`
- `server/src/modules/export/services/user-export.service.ts`
- `server/src/modules/statistics/statistics-export.service.ts`

### 修改
- `server/src/modules/export/export.service.ts` → 瘦身为 Facade
- `server/src/modules/deviation/deviation.service.ts` → 移除 `@Optional()`，接入引擎
- `server/src/modules/change-event/change-event.service.ts` → approve 委托引擎
- `server/src/modules/product-recall/product-recall.service.ts` → 补通知调用
- `server/src/modules/internal-audit/report/report.service.ts` → 用共享 format util
- `server/src/modules/statistics/statistics.controller.ts` → 注入 StatisticsExportService
- `client/src/composables/useFormat.ts` → 新建（前端共享格式化）
- `client/src/views/internal-audit/RectificationList.vue` → 用 useFormat

### 删除
- `server/src/modules/deviation/deviation-alias.controller.ts`

---

## 风险与注意事项

| 风险 | 缓解方式 |
|------|----------|
| B1-a 移除 `@Optional()` 后 deviation 模块启动报错 | 确认 `UnifiedApprovalModule` 已在 `DeviationModule` imports 中注册 |
| B2 ExportService Facade 拆分后外部调用方签名变化 | Facade 保持原方法名，外部零改动 |
| B1-b ChangeEvent 旧数据无 ApprovalInstance | 降级路径保留，加 warn 日志，不抛错 |
| Phase C Recycle-bin 改动引入回归 | 先只读分析，情况 B 则完全不改代码 |
