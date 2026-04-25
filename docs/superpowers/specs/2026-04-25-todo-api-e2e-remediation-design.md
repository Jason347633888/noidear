# Todo API、vue-tsc 修复与 E2E 全量运行 设计文档

**日期**：2026-04-25  
**状态**：已审批  
**作者**：JIASHENG1204

---

## 背景

系统内部试运行就绪评审后，遗留三项未关闭问题：

1. `TodoTask` 数据模型存在于数据库且被多个业务模块写入，但无 HTTP API 暴露给前端，导致用户无法看到跨模块统一待办
2. `vue-tsc --noEmit` 报 78 个类型错误（不影响 vite 构建，但影响 TypeScript 类型安全）
3. Playwright E2E 因缺少 Docker 环境未运行，状态矩阵全为 `NOT_RUN`

三项独立推进，本文覆盖全部设计决策。

---

## 第一节：Todo API 后端模块

### 模块结构

新建 `server/src/modules/todo/`：

```
todo.module.ts
todo.controller.ts
todo.service.ts
dto/query-todo.dto.ts
```

### Schema 变更

在 `TodoTask` 模型中新增字段（需生成 migration）：

```prisma
completedBy String? // 完成人ID，始终等于本人 userId，用于审计
```

### 端点定义

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/todos` | 当前用户待办列表，支持 `status`/`type` 过滤，分页 |
| `GET` | `/api/v1/todos/statistics` | 当前用户待办统计 |
| `POST` | `/api/v1/todos/:id/complete` | 标记指定待办为已完成（非幂等） |

所有端点通过 JWT 守卫保护，`where: { userId: currentUser.id }` 严格限制数据范围。

### 列表返回结构

```ts
{
  items: [{
    id: string,
    type: TodoType,
    status: TodoStatus,
    priority: TodoPriority,
    title: string,
    description: string | null,
    relatedId: string,
    actionRoute: string | null,  // 后端计算，前端直接 router.push
    dueDate: DateTime | null,
    createdAt: DateTime,
    completedAt: DateTime | null,
    completedBy: string | null,
  }],
  total: number,
  page: number,
  limit: number,
  hasMore: boolean,
}
```

**默认排序**：`status asc, dueDate asc nulls last, createdAt desc`

### 列表查询参数

```ts
status: 'all' | 'pending' | 'completed'  // 不使用 undefined 表达"全部"
type: 'all' | TodoType                    // 不使用 undefined 表达"全部"
page: number
limit: number
```

### Statistics 返回结构

```ts
{
  total: number,
  byType: Partial<Record<TodoType, number>>,  // 后端补零，所有类型始终出现，值可为 0
  byStatus: {
    pending: number,
    completed: number,
  }
}
```

### Complete 端点规则

`complete` **非幂等操作**，行为：

1. 写入 `status = 'completed'`
2. 写入 `completedAt = now()`
3. 写入 `completedBy = currentUser.id`

错误码：

| 情况 | HTTP 状态码 |
|------|------------|
| 记录不存在 / 不属于当前用户 | `404`（不泄露记录存在性） |
| `status !== 'pending'`（含已完成重复提交） | `409` |
| 请求参数非法 | `400` |

### actionRoute 映射表

后端根据 `type` 计算 `actionRoute`，前端不自行维护映射。  
映射表以**当前 `client/src/router/index.ts` 中实际存在的路由**为准：

| type | actionRoute 模板 | 状态 |
|------|-----------------|------|
| `training_attend` | `/training/projects/{relatedId}` | ✅ 路由存在（router:444） |
| `training_organize` | `/training/projects/{relatedId}` | ✅ 路由存在（router:444） |
| `approval` | `/approvals/detail/{relatedId}` | ✅ 路由存在（router:94） |
| `audit_rectification` | `/internal-audit/rectifications` | ⚠️ 仅列表页，无详情路由；跳转至列表，用户自行定位 |
| `equipment_maintain` | `/equipment/{relatedId}` | ✅ 路由存在（router:373） |
| `inventory` | `null` | ❌ 路由不存在，本次不新增，返回 null |
| `change_request` | `null` | ❌ 路由不存在，本次不新增，返回 null |

**兜底规则**：`type` 未命中映射，或映射值为 `null` 时，返回 `actionRoute: null`，前端显示"暂不支持跳转"。

**后续**：`inventory` / `change_request` 路由待对应业务模块就绪后再补映射，后端映射表集中在 `todo.service.ts` 一处修改即可，不影响前端。

---

## 第二节：前端 `/my-todos` 页面

### 新建文件

```
client/src/views/my-todos/MyTodos.vue
client/src/api/todo.ts
client/src/stores/todo.ts   (useTodoStore)
```

### 旧 Todo 类型迁移

`client/src/types/training.ts` 中当前存在以下类型定义（第 258 行起）：

```ts
// 需要废弃的旧定义
export interface TodoTask { ... }        // 缺 actionRoute、completedBy
export interface TodoStatistics { ... }  // byType 是 Record（非 Partial），含 overdue（新设计不含）
```

**处理规则**：

1. 新建 `client/src/types/todo.ts`，定义权威 `TodoItem`、`TodoListResponse`、`TodoStatisticsResponse` 类型（与后端 API 返回结构一致，含 `actionRoute`、`completedBy`、`Partial<Record<TodoType, number>>`）
2. `client/src/api/todo.ts` 只从 `client/src/types/todo.ts` 引用类型
3. `client/src/types/training.ts` 中的 `TodoTask` / `TodoStatistics` 标记 `@deprecated`，不删除（避免破坏已有调用方），待后续统一清理
4. `client/src/views/my-todos/` 只使用新类型，不引用旧 `training.ts` 的 Todo 相关类型

### 路由

新增路由：`/my-todos` → `MyTodos.vue`，加入主导航菜单，图标 `Bell`。

### API Client

```ts
// client/src/api/todo.ts
todoApi.list({ status, type, page, limit }): Promise<TodoListResponse>
todoApi.statistics(): Promise<TodoStatisticsResponse>
todoApi.complete(id: string): Promise<TodoItem>
```

### 页面结构

- **顶部**：状态 Tab（全部 / 待处理 / 已完成）+ 类型下拉过滤
- **中部**：`el-table`，每行显示 `title`、`type`（el-tag）、`priority`、`dueDate`、`createdAt`、`status`
- **操作列**：完成按钮（`status === 'pending'` 时显示）+ 跳转按钮（`actionRoute !== null` 时可用）
- **底部**：`el-pagination`

### 完成动作（非乐观更新）

1. 调 `todoApi.complete(id)`
2. 成功后刷新当前页列表 + 调 `todoStore.refreshPendingCount()`
3. 失败按状态码提示：`404` → "待办不存在"，`409` → "该待办已完成"，其他 → "操作失败，请重试"

### 跳转动作

- `actionRoute !== null`：`router.push(item.actionRoute)`
- `actionRoute === null`：按钮禁用，tooltip"暂不支持跳转"

### 空状态

- 当前筛选条件下无待办：展示空态提示"暂无待办"
- `actionRoute = null` 但记录存在：可查看/完成，跳转按钮禁用
- 页面本身不做匿名/无权限处理，依赖全局 JWT 守卫

---

## 第三节：导航角标与全局待办入口

### useTodoStore

新建独立 store（不合并进用户 store，业务态与身份态分离）：

```ts
// client/src/stores/todo.ts
const pendingTodoCount = ref(0)

async function refreshPendingCount() {
  // 内部做并发去重：若已有请求进行中，不重复发第二个
  const stats = await todoApi.statistics()
  pendingTodoCount.value = stats.byStatus.pending
}
```

**错误处理**：
- `401/403`：静默忽略，由全局鉴权流程处理
- 其他错误：不弹阻断 UI，`console.warn` 记录

### 刷新时机

1. `Layout.vue` 初次 mounted
2. `/my-todos` 页面 mounted
3. 完成一条待办成功后
4. 页面手动刷新后重新挂载（等同于 1）

### 菜单集成

`Layout.vue` 菜单项静态定义，badge 只做展示装饰：

```ts
{ path: '/my-todos', title: '我的待办', icon: Bell }
```

用 `el-badge` 包裹菜单项，`value` 绑定 `todoStore.pendingTodoCount`，值为 0 时隐藏。  
**Store 负责拉数据，Layout 只读 Store 渲染**，todo 拉取逻辑不写入菜单配置对象。

---

## 第四节：vue-tsc 78 个类型错误修复策略

### 错误分组与修法

**组 1 — AxiosResponse unwrap 漂移（约 25 个）**

- 先修 `client/src/api/request.ts` 的返回类型，使其与拦截器实际 unwrap 行为一致
- 再跑 `vue-tsc --noEmit`，清理残留调用侧对旧 `AxiosResponse<T>` 语义的依赖
- 不假设"只改一个文件就结束"

**组 2 — Vitest 全局类型缺失（约 9 个）**

- 优先新建或使用独立 `tsconfig.vitest.json`，加 `"types": ["vitest/globals"]`
- 次选：若项目结构共用配置，再补到 `client/tsconfig.app.json`
- 目标：测试与应用代码类型边界清晰

**组 3 — 未使用导入/变量（约 15 个）**

- 批量删除，不改业务逻辑

**组 4 — 组件 Prop 类型不匹配（约 29 个）**

- 优先修组件 prop 定义（源头）
- 其次在测试里补缺失的必填 props（造最小合法 factory）
- 只有在明确测试目标与该 prop 无关且补齐成本不合理时，才允许极少量测试专用 `as any`

### 执行顺序

```
组 1 → vue-tsc 验证 → 组 2 → vue-tsc 验证 → 组 3 → vue-tsc 验证 → 组 4 → vue-tsc 验证
```

目标：最终 `vue-tsc --noEmit` 零错误。

---

## 第五节：Playwright E2E 全量运行策略

### 前提

Docker 基础服务已就绪（postgres/redis/minio）。

### 启动顺序

1. `cd server && npm run start:dev`（监听 3000）
2. `cd client && npm run dev`（监听 5173）
3. **健康检查**（端口就绪不等于服务就绪）：
   - 后端：`GET http://localhost:3000/api/v1/health` 返回 2xx（全局前缀 `api/v1` 已在 `server/src/main.ts:51` 确认，`HealthController` 挂载在 `@Controller('health')`)
   - 前端：`GET http://localhost:5173` 返回 200
4. 确认就绪后运行：`cd client && npx playwright test --reporter=list`

### 认证规则

- 优先复用 `client/e2e/.auth/admin-token.json`（含 1 小时 token 缓存）
- 若缓存 token 存在但首个受保护请求返回 `401/403`，立即删除缓存并重新执行 global-setup 登录流程
- 不带坏 token 跑整轮

### 失败分类与修复策略

| 类型 | 特征 | 处理 |
|------|------|------|
| 环境类 | 超时、连接拒绝、5xx | 重跑确认，排查服务状态 |
| 数据类 | 断言数据不存在、前置状态不干净 | 检查 global-setup 或 fixtures |
| 代码类 | 元素找不到、API 响应不符合预期 | 定位并修复 |

### 重跑策略

1. 全量跑，记录所有失败
2. 修复后按文件重跑：`npx playwright test e2e/xxx.spec.ts`
3. 最终再全量确认

### 中止策略

若失败用例占比超过 **30%**，且初判主要原因为环境/认证/数据问题（非代码问题），则：

- 停止盲修
- 输出分类报告（环境类 N 个 / 数据类 N 个 / 代码类 N 个）
- 确认环境正常后重新评估

### 结果回写

全量通过后同步更新两份报告：

- `docs/superpowers/reports/2026-04-25-full-business-e2e-matrix.md`：将对应行 `NOT_RUN` 改为 `PASS`/`FAIL`
- `docs/superpowers/reports/2026-04-25-internal-go-live-readiness-report.md`：更新 E2E gate 状态

---

## 依赖关系

```
Todo API 后端 ──┐
                ├──→ 训练测试修复（3 个 todo 测试改打新端点）
前端页面 ───────┘

vue-tsc 修复 ──→ 独立，可并行

Playwright E2E ──→ 依赖 Todo API 完成后运行（避免待办相关测试全失败干扰分析）
```

---

## 不在本次范围内

- `/tasks` 路由与 `RecordTaskAssignment` 的合并（第二阶段）
- TodoTask 跨模块聚合（目前只读 `TodoTask` 表，不合并 workflow/record-task）
- 通知系统、消息中心
