# Data Analysis Module Removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全链路删除侧边栏"数据分析"菜单组及其专属前后端实现（统计中心三页、`/statistics/*` API、集中统计缓存拦截器），同时保留各业务域内部统计能力。

**Architecture:** 纯删除任务，无新增代码。按以下顺序执行：隔离 worktree + impact 基线 → 前端（菜单/路由/视图/e2e/权限常量）→ 后端（先清除 document 模块的 statistics 依赖，再整体删除 statistics/ 目录和 interceptor 文件）→ 全链路验收。后端两个清除动作在同一个任务内完成，中间不留编译失败的提交。

**Tech Stack:** Vue 3 + TypeScript / vue-tsc（前端）、NestJS + Prisma（后端）、Playwright（e2e）

---

## 文件变更地图

| 操作 | 路径 |
|------|------|
| 修改 | `client/src/navigation/menu.ts` |
| 修改 | `client/src/router/index.ts` |
| 删除 | `client/src/views/statistics/StatisticsIndex.vue` |
| 删除 | `client/src/views/statistics/Overview.vue` |
| 删除 | `client/src/views/statistics/DocumentStatistics.vue` |
| 删除 | `client/src/views/statistics/TaskStatistics.vue` |
| 删除 | `client/src/views/statistics/__tests__/DocumentStatistics.spec.ts` |
| 删除 | `client/src/views/statistics/__tests__/Overview.spec.ts` |
| 删除 | `client/src/views/statistics/__tests__/TaskStatistics.spec.ts` |
| 删除 | `client/src/api/statistics.ts` |
| 删除 | `client/e2e/statistics.spec.ts` |
| 修改 | `client/e2e/audit-system.spec.ts` |
| 修改 | `client/src/constants/permission.ts` |
| 修改 | `server/src/app.module.ts` |
| 修改 | `server/src/modules/document/document.module.ts` |
| 修改 | `server/src/modules/document/document.controller.ts` |
| 删除 | `server/src/common/interceptors/statistics-cache.interceptor.ts` |
| 删除 | `server/src/modules/statistics/` (整个目录) |

---

## Task 0: 隔离 worktree + GitNexus impact 基线

**Files:** 无代码修改，仅环境准备

- [ ] **Step 1: 创建隔离 worktree**

在仓库根目录执行：

```bash
git fetch origin master
git worktree add ../noidear-statistics-removal -b codex/remove-statistics origin/master
cd ../noidear-statistics-removal
```

后续所有操作在 `../noidear-statistics-removal` 内执行，不在主 checkout 直接写业务代码。

- [ ] **Step 2: 运行 GitNexus impact 基线（执行 agent 在 MCP 上下文中调用）**

```
gitnexus_impact({ target: "StatisticsModule", direction: "upstream" })
gitnexus_impact({ target: "StatisticsCacheInterceptor", direction: "upstream" })
gitnexus_impact({ target: "StatisticsService", direction: "upstream" })
```

**预期结果（已人工核实）：**

| Symbol | 直接上游调用方 | 风险级别 |
|--------|--------------|---------|
| `StatisticsModule` | `app.module.ts`、`document.module.ts` | MEDIUM |
| `StatisticsCacheInterceptor` | `document.module.ts`（providers + import）、`document.controller.ts`（装饰器 + import）| MEDIUM |
| `StatisticsService` | `statistics.controller.ts`、`statistics-cache.interceptor.ts` | LOW（随模块一起删除） |

若 impact 结果出现**预期之外的调用方**，在执行后续任务前报告并等待确认。

---

## Task 1: 前端 — 删除菜单入口和路由

**Files:**
- Modify: `client/src/navigation/menu.ts:123-131`
- Modify: `client/src/router/index.ts:179-198`

- [ ] **Step 1: 确认待删内容**

```bash
grep -n "数据分析\|statistics" client/src/navigation/menu.ts
grep -n "statistics" client/src/router/index.ts | grep -v "training"
```

预期：menu.ts 第 124-130 行出现数据分析条目；router 第 180-198 行出现 4 条 statistics 路由（`training/statistics` 行不在此范围，不应被删除）。

- [ ] **Step 2: 从 `menu.ts` 删除"数据分析"菜单组（第 123-131 行）**

找到并删除整个对象（含首行 `{` 至闭合 `},`）：

```typescript
  // 删除这整块（第 123-131 行）
  {
    title: '数据分析',
    icon: DataAnalysis,
    children: [
      { path: '/statistics/overview', title: '统计概览', icon: DataAnalysis },
      { path: '/statistics/documents', title: '文档统计', icon: DataAnalysis },
      { path: '/statistics/tasks', title: '任务统计', icon: DataAnalysis },
    ],
  },
```

删除后检查文件顶部是否有 `import { DataAnalysis }` — 如果 DataAnalysis 在文件其他地方没有其他用途，一并删除该 import。

- [ ] **Step 3: 从 `router/index.ts` 删除统计中心 4 条路由（第 179-198 行）**

删除以下 4 个路由对象（注意：第 456 行的 `training/statistics` 路由**不删**）：

```typescript
      // 删除这 4 个对象
      {
        path: 'statistics',
        name: 'StatisticsIndex',
        component: () => import('@/views/statistics/StatisticsIndex.vue'),
      },
      {
        path: 'statistics/overview',
        name: 'StatisticsOverview',
        component: () => import('@/views/statistics/Overview.vue'),
      },
      {
        path: 'statistics/documents',
        name: 'DocumentStatistics',
        component: () => import('@/views/statistics/DocumentStatistics.vue'),
      },
      {
        path: 'statistics/tasks',
        name: 'TaskStatistics',
        component: () => import('@/views/statistics/TaskStatistics.vue'),
      },
```

- [ ] **Step 4: 验证**

```bash
rg -n "title: '数据分析'|/statistics/(overview|documents|tasks)" client/src/navigation/menu.ts
# 预期：0 命中（DataAnalysis icon 仍被偏差分析、设备统计等其他菜单使用，不要求 DataAnalysis 消失）

grep -n "statistics" client/src/router/index.ts | grep -v "training"
# 预期：0 命中
```

- [ ] **Step 5: 前端类型检查**

```bash
npm run build:check -w client 2>&1 | tail -20
```

预期：`Build complete` 或编译成功，无 statistics 相关错误。

- [ ] **Step 6: 提交**

```bash
git add client/src/navigation/menu.ts client/src/router/index.ts
git commit -m "feat: remove statistics center menu entries and routes"
```

---

## Task 2: 前端 — 删除统计视图目录和 API adapter

**Files:**
- Delete: `client/src/views/statistics/` (4 Vue 文件 + 3 spec 文件)
- Delete: `client/src/api/statistics.ts`

- [ ] **Step 1: 确认待删文件的 import 仅限于 `statistics/` 目录本身**

```bash
rg -n "from ['\"]@/api/statistics['\"]|from ['\"]../api/statistics['\"]" client/src
```

此时预期：命中行应**只出现在** `client/src/views/statistics/**` 内部（如 `DocumentStatistics.vue:139`、`TaskStatistics.vue:143` 等）。若命中出现在 statistics 目录以外，说明有其他模块还在使用 `statistics.ts`，需先排查。

- [ ] **Step 2: 删除视图文件和 API adapter**

```bash
rm client/src/views/statistics/StatisticsIndex.vue \
   client/src/views/statistics/Overview.vue \
   client/src/views/statistics/DocumentStatistics.vue \
   client/src/views/statistics/TaskStatistics.vue \
   client/src/views/statistics/__tests__/DocumentStatistics.spec.ts \
   client/src/views/statistics/__tests__/Overview.spec.ts \
   client/src/views/statistics/__tests__/TaskStatistics.spec.ts \
   client/src/api/statistics.ts
# 清理空目录
rmdir client/src/views/statistics/__tests__ 2>/dev/null || true
rmdir client/src/views/statistics 2>/dev/null || true
```

- [ ] **Step 3: 验证 —— 删除后 0 命中**

```bash
rg -n "@/api/statistics|statisticsApi|/statistics/(overview|documents|tasks|dashboard)" client/src
# 预期：0 命中

rg -n "from ['\"]@/api/statistics['\"]" client/src
# 预期：0 命中（覆盖 default import 写法）
```

- [ ] **Step 4: 前端类型检查**

```bash
npm run build:check -w client 2>&1 | tail -20
```

预期：编译成功，无 statistics 引用缺失错误。

- [ ] **Step 5: 提交**

```bash
git add -u client/src/views/statistics/ client/src/api/statistics.ts
git commit -m "feat: delete statistics center views and API adapter"
```

---

## Task 3: 前端 — 清理 e2e 测试

**Files:**
- Delete: `client/e2e/statistics.spec.ts`
- Modify: `client/e2e/audit-system.spec.ts` (删 header 引用 + 删 test.describe 块)

- [ ] **Step 1: 删除 `statistics.spec.ts` 整文件**

```bash
rm client/e2e/statistics.spec.ts
```

- [ ] **Step 2: 修改 `audit-system.spec.ts` — 删除 header 中的 STAT 引用**

文件头注释（第 1-18 行）中，第 5 行改为去掉 `/ statistics.spec.ts`：

```typescript
 * Covers BDD scenarios NOT already tested in:
 *   audit.spec.ts / search.spec.ts
```

删除第 13-14 行：

```typescript
 *   STAT-001 /statistics/overview renders
 *   STAT-002 /statistics/documents renders
```

- [ ] **Step 3: 删除 `audit-system.spec.ts` 中的 `test.describe('统计 – Statistics')` 整个块**

找到并删除第 270-308 行（含前面的 `// ===` 分隔线）：

```typescript
// ===========================================================================

test.describe('统计 – Statistics', () => {
  // -------------------------------------------------------------------------
  // STAT-001: /statistics/overview renders
  // -------------------------------------------------------------------------
  test('STAT-001: /statistics/overview 页面渲染', async ({ page }) => {
    await loginViaApiCached(page, 'admin', 'ChangeMe123!');
    await page.goto('/statistics/overview');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    const statsContent = page.locator(
      'h2, h1, .stat-card, .overview-card, .el-card, .chart-container, canvas',
    );
    await expect(statsContent.first()).toBeAttached({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // STAT-002: /statistics/documents renders
  // -------------------------------------------------------------------------
  test('STAT-002: /statistics/documents 页面渲染', async ({ page }) => {
    await loginViaApiCached(page, 'admin', 'ChangeMe123!');
    await page.goto('/statistics/documents');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    const contentArea = page.locator(
      'h2, h1, .el-card, .chart-container, canvas, .el-table, .stat-card',
    );
    await expect(contentArea.first()).toBeAttached({ timeout: 10000 });
  });
});
```

删除后文件以前一个 `test.describe` 的 `});` 结尾。

- [ ] **Step 4: 验证**

```bash
rg -n "STAT-001\|STAT-002\|statistics\.spec\.ts\|/statistics/overview\|/statistics/documents" client/e2e
# 预期：0 命中
```

- [ ] **Step 5: 提交**

```bash
git add -u client/e2e/statistics.spec.ts client/e2e/audit-system.spec.ts
git commit -m "feat: remove statistics e2e tests (STAT-001, STAT-002)"
```

---

## Task 4: 前端 — 删除权限资源常量

**Files:**
- Modify: `client/src/constants/permission.ts:13`

- [ ] **Step 1: 确认当前状态**

```bash
cat -n client/src/constants/permission.ts
```

预期第 13 行为 `  { value: 'statistics', label: '统计分析' },`。

- [ ] **Step 2: 删除 `statistics` 资源条目**

删除第 13 行后，`PERMISSION_RESOURCES` 数组应为：

```typescript
export const PERMISSION_RESOURCES = [
  { value: 'document', label: '文档管理' },
  { value: 'template', label: '模板管理' },
  { value: 'task', label: '任务管理' },
  { value: 'approval', label: '审批管理' },
  { value: 'user', label: '用户管理' },
  { value: 'role', label: '角色管理' },
  { value: 'permission', label: '权限管理' },
  { value: 'warehouse', label: '仓库管理' },
  { value: 'record', label: '记录管理' },
  { value: 'batch', label: '批次管理' },
  { value: 'deviation', label: '偏离检测' },
];
```

- [ ] **Step 3: 验证**

```bash
rg -n "value: 'statistics'" client/src
# 预期：0 命中
```

- [ ] **Step 4: 前端类型检查**

```bash
npm run build:check -w client 2>&1 | tail -20
```

预期：编译成功（`RESOURCE_LABELS` 的 `Record<string, string>` 由 `Object.fromEntries` 动态推导，不受条目减少影响）。

- [ ] **Step 5: 提交**

```bash
git add client/src/constants/permission.ts
git commit -m "feat: remove statistics resource from permission constants"
```

---

## Task 5: 后端 — 全链路删除（依赖解除 → 删除目录）

> **顺序严格要求：** 必须先清除 `document.module.ts` 和 `document.controller.ts` 的 statistics 依赖，再删除 `statistics/` 目录和 `statistics-cache.interceptor.ts`。反向顺序会导致 TypeScript 编译失败，本任务中间不做 tsc check、不做中间提交，全部完成后统一 tsc + 提交。

**Files:**
- Modify: `server/src/modules/document/document.module.ts` (4 处)
- Modify: `server/src/modules/document/document.controller.ts` (2 处)
- Modify: `server/src/app.module.ts` (2 处)
- Delete: `server/src/common/interceptors/statistics-cache.interceptor.ts`
- Delete: `server/src/modules/statistics/` (整个目录)

- [ ] **Step 1: 修改 `document.module.ts` — 删除 4 处 statistics 引用**

**(1) 删除第 12 行：**

```typescript
import { StatisticsModule } from '../statistics/statistics.module';
```

**(2) 删除第 13 行：**

```typescript
import { StatisticsCacheInterceptor } from '../../common/interceptors/statistics-cache.interceptor';
```

**(3) 在 `imports` 数组（约第 34 行）中删除 `StatisticsModule` 项，结果应为：**

```typescript
  imports: [ConfigModule, PrismaModule, NotificationModule, OperationLogModule, DepartmentPermissionModule, RoleModule, UserPermissionModule, SearchModule, ModelLandingModule, UnifiedApprovalModule],
```

**(4) 在 `providers` 数组（约第 36 行）中删除 `StatisticsCacheInterceptor` 项，结果应为：**

```typescript
  providers: [DocumentService, DocumentCronService, DocumentReferenceService, MarkdownWikilinkService, DocumentReferenceHealthService, BusinessDocumentLinkService, DocumentExpiryService, DocumentLifecycleService, DocumentControlMetadataService, RecordFormLandingService, FilePreviewService, StorageService, DocumentsListener, NumberRuleService],
```

- [ ] **Step 2: 修改 `document.controller.ts` — 删除 2 处 statistics 引用**

**(1) 删除第 39 行：**

```typescript
import { StatisticsCacheInterceptor } from '../../common/interceptors/statistics-cache.interceptor';
```

**(2) 删除第 44 行（类级别装饰器，整行删除）：**

```typescript
@UseInterceptors(StatisticsCacheInterceptor)
```

删除后，controller 类声明部分应为：

```typescript
@ApiTags('文档管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentController {
```

> **注意：** `UseInterceptors` 装饰器的 import（来自 `@nestjs/common`）仅当该 import 行在文件中没有其他用途时才删除；若文件顶部同行还 import 了其他 `@nestjs/common` 成员，只删 `UseInterceptors` 项，不删整行。

- [ ] **Step 3: 修改 `server/src/app.module.ts` — 删除 StatisticsModule**

删除第 22 行：

```typescript
import { StatisticsModule } from './modules/statistics/statistics.module';
```

在 `imports` 数组（约第 100-110 行）中找到 `StatisticsModule,` 并删除该行。

- [ ] **Step 4: 删除 interceptor 文件和 statistics 模块目录**

```bash
rm server/src/common/interceptors/statistics-cache.interceptor.ts
rm -rf server/src/modules/statistics/
```

> **边界确认：** `server/src/modules/traceability/` 目录**不在此范围**，`rm -rf` 命令只删 `statistics/`，请核实路径正确。

- [ ] **Step 5: 验证无残留引用**

```bash
rg -n "StatisticsModule|StatisticsController|StatisticsService|StatisticsExportService|StatisticsCacheInterceptor|statistics-cache.interceptor" server/src --type ts
# 预期：0 命中

rg -n "from.*modules/statistics" server/src --type ts
# 预期：0 命中

# 确认 traceability 模块不受影响
rg -n "TraceabilityExportService" server/src/modules/traceability/ --type ts
# 预期：1+ 命中
```

- [ ] **Step 6: 后端 TypeScript 编译检查**

```bash
cd server && npx tsc --noEmit 2>&1 | head -40
```

预期：无错误。若出现非 statistics 相关错误，检查是否为 pre-existing 问题（和本次改动无关则记录后放行）。

- [ ] **Step 7: 运行 GitNexus detect-changes（提交前必做）**

在 MCP 上下文中调用：

```
gitnexus_detect_changes()
```

预期：变更范围仅覆盖 `document.module.ts`、`document.controller.ts`、`app.module.ts`、`statistics-cache.interceptor.ts`（删除）、`statistics/`（目录删除）。若出现预期外的符号变更，报告并等待确认。

- [ ] **Step 8: 提交（分文件 stage，不使用 `git add -A`）**

```bash
git add server/src/app.module.ts
git add server/src/modules/document/document.module.ts
git add server/src/modules/document/document.controller.ts
git add -u server/src/common/interceptors/statistics-cache.interceptor.ts
git add -u server/src/modules/statistics/
git commit -m "feat: remove StatisticsModule, StatisticsCacheInterceptor and all statistics server files"
```

---

## Task 6: 全链路验收

- [ ] **Step 1: 静态检查 — 前端**

```bash
rg -n "title: '数据分析'|/statistics/(overview|documents|tasks|dashboard)|@/api/statistics|statisticsApi" client/src client/e2e
# 预期：0 命中

rg -n "from ['\"]@/api/statistics['\"]" client/src
# 预期：0 命中

rg -n "value: 'statistics'" client/src
# 预期：0 命中
```

- [ ] **Step 2: 静态检查 — 后端**

```bash
rg -n "@Controller\('statistics'\)|StatisticsModule|StatisticsController|StatisticsService|StatisticsExportService|StatisticsCacheInterceptor|statistics-cache.interceptor" server/src --type ts
# 预期：0 命中
```

- [ ] **Step 3: 确认保留业务模块能力**

```bash
rg -n "training/statistics|exportTrainingStatistics" client/src server/src
# 预期：1+ 命中（培训统计保留）

rg -n "TraceabilityExportService" server/src/modules/traceability/ --type ts
# 预期：1+ 命中（追溯导出保留）

rg -n "DeviationAnalytics|deviation-analytics" client/src server/src
# 预期：1+ 命中（偏差分析保留）
```

- [ ] **Step 4: 前端完整构建**

```bash
npm run build:client 2>&1 | tail -20
```

预期：`✓ built in` 或 `Build complete`，无 error。

- [ ] **Step 5: 后端完整构建**

```bash
npm run build:server 2>&1 | tail -20
```

预期：`Compilation complete`，无 error。

- [ ] **Step 6: 后端单元/集成测试**

```bash
npm run test -w server -- --runInBand 2>&1 | tail -30
```

预期：所有测试通过。若有与本次改动无关的 pre-existing 噪声失败，记录后放行。

- [ ] **Step 7: 前端单元测试**

```bash
npm run test -w client -- --runInBand 2>&1 | tail -30
```

预期：所有测试通过。

- [ ] **Step 8: 浏览器验收**

启动开发服务后（`npm run dev -w client`），在浏览器中验证：

1. 打开应用首页，检查左侧导航栏 — **"数据分析"菜单组不再出现**，"培训"后直接为"系统治理"。
2. 直接访问 `/statistics/overview` — 应进入 404/NotFound 或重定向，**不应渲染统计中心页面**。
3. 以下页面仍可正常打开（确认业务模块未受影响）：
   - `/training/projects` → 培训项目列表
   - `/training/statistics` → 培训统计（这是本次明确保留的培训模块内部统计能力，必须验证）
   - `/equipment` 或设备统计相关路由 → 设备统计
   - `/deviation-analytics` → 偏差分析（含 echarts 图表正常渲染）
4. 控制台无 chunk 加载错误（`Failed to fetch dynamically imported module`）和 Vue runtime error。

- [ ] **Step 9: 最终 GitNexus detect-changes（合并前必做）**

```
gitnexus_detect_changes()
```

预期：本次 PR 的变更符号集合与 Task 0 impact 基线一致，无意外扩散。

- [ ] **Step 10: 如有验收期间发现的小调整，逐文件 stage（不使用 `git add -A`）**

若有任何调整，按实际修改的文件逐一 stage：

```bash
# 示例：只 stage 本 plan 涉及的路径
git add <具体文件路径>
git commit -m "chore: post-verification cleanup from statistics module removal"
```

---

## 自查

- 菜单删除 → Task 1 ✓
- 路由删除（4 条）→ Task 1 ✓
- 视图文件删除（4 Vue + 3 spec）→ Task 2 ✓
- API adapter 删除 → Task 2 ✓
- Task 2 前置检查：仅允许命中在 `statistics/` 目录内 → ✓（修复了原计划的假预期）
- e2e 整文件删除 → Task 3 ✓
- e2e 部分删除（STAT-001/002）→ Task 3 ✓
- 权限常量删除 → Task 4 ✓
- 后端任务顺序：先清 document 依赖，再删 statistics/ → Task 5 ✓（修复了原计划的顺序错误）
- document.module.ts 4 处清理 → Task 5 Step 1 ✓
- document.controller.ts 2 处清理 → Task 5 Step 2 ✓
- app.module.ts 解除 StatisticsModule → Task 5 Step 3 ✓
- interceptor 文件删除 → Task 5 Step 4 ✓
- statistics/ 目录删除 → Task 5 Step 4 ✓
- 中间无半断提交 → Task 5 单提交 ✓
- 所有 stage 命令指定明确路径，无 `git add -A` → ✓
- 前端类型检查使用 `npm run build:check -w client`（vue-tsc）→ Task 1/2/4 ✓
- 浏览器验收 → Task 6 Step 8 ✓（含 echarts 图表检查）
- GitNexus impact 基线 → Task 0 ✓
- GitNexus detect-changes（提交前）→ Task 5 Step 7 + Task 6 Step 9 ✓
- 隔离 worktree → Task 0 Step 1 ✓
- training/statistics 保留不动 ✓（路由第 456 行，未触碰）
- echarts 依赖保留 ✓（6 个其他消费者）
- 生产 Redis 键：TTL 300s 自然过期，无需操作 ✓（spec 已声明）
