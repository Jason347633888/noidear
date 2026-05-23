# Data Analysis Module Removal — Design Spec

**Date:** 2026-05-23
**Scope:** 删除侧边栏“数据分析”模块、统计中心三页、集中式 `/statistics/*` API 与其专属前后端实现
**Decision:** 彻底剔除截图中的“数据分析”菜单组：统计概览、文档统计、任务统计。保留其他业务模块内部自己的统计能力。
**Premise:** 当前项目没有历史业务数据，不需要为已剔除的页面或 API 保留软兼容、空壳 route 或迁移旧统计结果。

---

## 背景

当前侧边栏存在一个独立“数据分析”菜单组：

- `/statistics/overview`：统计概览
- `/statistics/documents`：文档统计
- `/statistics/tasks`：任务统计

这组页面是一个横跨文档、任务、用户、设备等领域的集中统计中心。它和当前产品收敛方向不一致：各业务模块已经开始把统计能力放回自己的领域，例如设备统计在设备模块内，培训统计在培训模块内，审计日志统计在审计模块内，待办统计在待办模块内。

用户已确认本轮目标是彻底删除这组三个页面及其专属前后端 API，但保留其他业务模块内部自己的统计能力。

---

## 当前代码事实

前端入口：

- `client/src/navigation/menu.ts` 中的“数据分析”菜单组。
- `client/src/router/index.ts` 中的 `statistics`、`statistics/overview`、`statistics/documents`、`statistics/tasks` route。
- `client/src/views/statistics/StatisticsIndex.vue`
- `client/src/views/statistics/Overview.vue`
- `client/src/views/statistics/DocumentStatistics.vue`
- `client/src/views/statistics/TaskStatistics.vue`
- `client/src/views/statistics/__tests__/*.spec.ts`
- `client/src/api/statistics.ts`

后端入口：

- `server/src/app.module.ts` 注册 `StatisticsModule`。
- `server/src/modules/statistics/statistics.module.ts`
- `server/src/modules/statistics/statistics.controller.ts`
- `server/src/modules/statistics/statistics.service.ts`
- `server/src/modules/statistics/statistics-export.service.ts`
- `server/src/modules/statistics/dto/*`
- `server/src/modules/statistics/interfaces/*`

旁路依赖：

- `server/src/common/interceptors/statistics-cache.interceptor.ts` 注入 `StatisticsService`，用于文档等变更后清理集中统计缓存。
- `server/src/modules/document/document.module.ts` 引入 `StatisticsModule` 并注册 `StatisticsCacheInterceptor`。
- `server/src/modules/statistics/traceability-export.service.ts` 和 `GET /statistics/traceability/:batchId/pdf` 属于追溯导出能力被放错模块的历史残留。
- 当前正式追溯模块已经存在 `server/src/modules/traceability/traceability-export.service.ts`、`TraceabilityModule` 和相关测试，因此删除集中统计模块时不得删除追溯模块自己的导出服务。

---

## 方案比较

### 方案 A：只隐藏菜单和路由

删除侧边栏“数据分析”菜单组，保留前端页面文件、`client/src/api/statistics.ts` 和后端 `/statistics/*`。

优点：改动最小。

缺点：旧 API 和测试继续存在，后续系统地图和契约检查仍会把它们当作活跃产品面；页面可通过直达 URL 访问，不是真正剔除。

结论：不采用。

### 方案 B：删除前端统计中心，保留后端 `/statistics/*`

删除菜单、路由和三页，保留后端集中统计接口作为潜在内部 API。

优点：用户侧模块消失。

缺点：后端仍保留跨域统计中心，职责不清；`StatisticsCacheInterceptor` 和 `StatisticsService` 继续影响文档模块；未来误以为集中统计仍是产品事实源。

结论：不采用。

### 方案 C：全链路删除统计中心，保留业务内统计

删除截图中的独立统计中心：菜单、路由、页面、前端 adapter、后端 `StatisticsModule`、集中统计 controller/service/export/dto/interface、集中统计缓存拦截器和相关测试。保留设备、培训、审计、待办、追溯等业务域自己的统计或导出能力。

优点：产品面和代码边界一致；删除后没有直达 URL、旧 API、缓存拦截器和测试残留；符合当前“功能瘦身”口径。

缺点：改动面跨前后端，需要仔细区分“集中统计中心”和“业务模块内部统计”。

结论：采用。

---

## 目标

1. 侧边栏不再显示“数据分析”菜单组。
2. `/statistics`、`/statistics/overview`、`/statistics/documents`、`/statistics/tasks` 不再作为前端可访问页面。
3. 前端不再存在 `client/src/views/statistics/**` 和 `client/src/api/statistics.ts` 的活跃引用。
4. 后端不再注册集中式 `StatisticsModule`，不再暴露 `/api/v1/statistics/*` 统计中心 API。
5. 删除集中统计缓存拦截器，不再让文档模块依赖 `StatisticsService`。
6. 保留其他业务模块内部统计能力，不把它们误删或迁入集中统计。
7. 系统地图和全文搜索中不再出现截图三页对应的活跃统计中心产品面。

---

## 非目标

- 不删除培训模块的 `/training/statistics/export` 或 `client/src/views/training/statistics/StatisticsPage.vue`。
- 不删除设备模块内部统计页、设备 stats service 或设备统计 API。
- 不删除审计模块内部的登录/敏感操作/权限日志统计。
- 不删除待办模块的 `/todos/statistics`。
- 不删除追溯模块自己的导出、快照或物料平衡能力。
- 不新增替代统计中心、大屏、驾驶舱或统一报表模块。
- 不做历史统计数据迁移。

---

## 前端设计

### 菜单

从 `client/src/navigation/menu.ts` 删除整个“数据分析”菜单组：

- 统计概览
- 文档统计
- 任务统计

删除后，侧边栏中“培训”后直接进入“系统治理”，或保持当前菜单顺序中的下一组。

### 路由

从 `client/src/router/index.ts` 删除以下 route：

- `statistics`
- `statistics/overview`
- `statistics/documents`
- `statistics/tasks`

不要新增 redirect 到首页，也不要保留空页面。已删除产品面通过直达 URL 进入时应走现有 404/NotFound 机制；如果当前路由没有统一 404，本轮只删除 route，不为统计中心单独做兼容跳转。

### 页面和 API adapter

删除：

- `client/src/views/statistics/StatisticsIndex.vue`
- `client/src/views/statistics/Overview.vue`
- `client/src/views/statistics/DocumentStatistics.vue`
- `client/src/views/statistics/TaskStatistics.vue`
- `client/src/views/statistics/__tests__/DocumentStatistics.spec.ts`
- `client/src/views/statistics/__tests__/Overview.spec.ts`
- `client/src/views/statistics/__tests__/TaskStatistics.spec.ts`
- `client/src/api/statistics.ts`

删除后必须验证：

- `rg -n "@/api/statistics|statisticsApi|/statistics/(overview|documents|tasks)|statistics/export" client/src` 无活跃命中。
- `client/src/views/training/statistics/StatisticsPage.vue` 仍保留，因为它属于培训模块。

---

## 后端设计

### 删除集中统计模块

删除或解除注册：

- `server/src/app.module.ts` 中的 `StatisticsModule` import 和 imports 注册。
- `server/src/modules/statistics/statistics.module.ts`
- `server/src/modules/statistics/statistics.controller.ts`
- `server/src/modules/statistics/statistics.service.ts`
- `server/src/modules/statistics/statistics-export.service.ts`
- `server/src/modules/statistics/dto/*`
- `server/src/modules/statistics/interfaces/*`

删除后 `/api/v1/statistics/documents`、`/api/v1/statistics/tasks`、`/api/v1/statistics/overview`、`/api/v1/statistics/export`、`/api/v1/statistics/users`、`/api/v1/statistics/equipment`、`/api/v1/statistics/approvals` 都不再作为有效 API 存在。

这些集中 API 不迁移到其他模块，除非已有业务模块内部已经有对应统计能力。未来若某个业务域需要统计，应在该业务域内设计明确的 route，例如设备统计继续归设备模块，培训统计继续归培训模块。

### 删除统计缓存拦截器

删除：

- `server/src/common/interceptors/statistics-cache.interceptor.ts`

同步修改：

- `server/src/modules/document/document.module.ts` 不再 import `StatisticsModule`。
- `server/src/modules/document/document.module.ts` 不再注册 `StatisticsCacheInterceptor`。
- `server/src/modules/document/document.controller.ts` 不再使用 `@UseInterceptors(StatisticsCacheInterceptor)`。

原因：集中统计中心删除后，文档变更不再需要清理集中统计缓存。文档模块不应为了已删除页面保留跨域服务依赖。

### 追溯导出边界

`server/src/modules/statistics/traceability-export.service.ts` 和 `StatisticsController.exportTraceabilityPdf()` 不随统计中心保留。

处理规则：

1. 删除统计模块里的重复 `traceability-export.service.ts`。
2. 保留 `server/src/modules/traceability/traceability-export.service.ts`、`TraceabilityModule` 和相关测试。
3. 如果存在活跃前端或后端调用 `/statistics/traceability/:batchId/pdf`，实施前必须迁到追溯域接口；当前代码搜索未发现前端活跃调用。
4. 不因为删除统计中心而削弱追溯查询、导出、快照或物料平衡。

---

## 保留清单

以下能力明确保留：

| 能力 | 当前归属 | 保留理由 |
|------|----------|----------|
| 培训统计导出 | `server/src/modules/training`、`client/src/views/training/statistics/StatisticsPage.vue` | 培训模块内部能力 |
| 设备统计 | `server/src/modules/equipment`、设备相关前端页面 | 设备模块内部能力 |
| 审计日志统计 | `server/src/modules/audit`、审计日志前端页面 | 系统治理日志能力 |
| 待办统计 | `server/src/modules/todo`、工作台/待办投影 | 工作执行入口需要 |
| 偏差分析 | `server/src/modules/deviation`、`client/src/views/deviation/DeviationAnalytics.vue` | 生产执行/质量分析下的业务域能力，不属于截图“数据分析”菜单 |
| 追溯导出/快照 | `server/src/modules/traceability` | 追溯域能力 |

---

## 验收标准

### 静态检查

以下命令应无活跃命中，测试快照或历史 spec 除外：

```bash
rg -n "title: '数据分析'|/statistics/overview|/statistics/documents|/statistics/tasks|@/api/statistics|statisticsApi" client/src
rg -n "@Controller\\('statistics'\\)|StatisticsModule|StatisticsController|StatisticsService|StatisticsExportService|statistics-cache.interceptor" server/src
```

以下命令应仍能命中保留业务模块能力：

```bash
rg -n "training/statistics|exportTrainingStatistics" client/src server/src
rg -n "todos/statistics|getStatistics" client/src server/src/modules/todo
rg -n "DeviationAnalytics|deviation-analytics" client/src server/src
rg -n "TraceabilityExportService" server/src/modules/traceability
```

### 构建与测试

必须通过：

```bash
npm run build:client
npm run build:server
```

建议补充运行：

```bash
npm run test -w client -- --runInBand
npm run test -w server -- --runInBand
```

如果全量测试受既有环境噪声影响，至少运行受影响的前端路由/布局测试、后端 module 编译测试和系统地图脚本。

### 浏览器验证

部署后检查：

1. 侧边栏不再出现“数据分析”菜单组。
2. `/statistics/overview`、`/statistics/documents`、`/statistics/tasks` 不再显示统计中心页面。
3. 培训、设备统计、审计日志、待办、偏差分析、追溯查询仍可打开。
4. 控制台没有因为删除统计中心产生 chunk 加载错误或 Vue runtime error。

### 系统地图

若仓库内系统地图脚本可用，重新生成后应满足：

- 截图三页不再作为活跃菜单入口。
- `client/src/api/statistics.ts` 不再参与 API adapter 扫描。
- `/statistics/*` 集中统计 API 不再作为活跃后端 route。
- 不产生新的 direct client/API adapter 缺口。

---

## 实施注意事项

- 删除要全链路完成，不得只隐藏菜单。
- 不得删除业务域内部统计，只删除独立统计中心。
- 不得把 `/statistics/users` 或 `/statistics/equipment` 迁成新的全局统计 API；如果未来需要用户/设备统计，应归属到用户或设备域。
- 删除 `StatisticsCacheInterceptor` 后，需要确认文档 controller 不再 import 已删除文件。
- 删除后如有测试引用旧统计中心，应删除或改写测试目标，不能为了测试恢复已删除 API。
- 当前工作区可能有其他未提交改动，实施时应只提交本轮相关文件，不回滚无关变更。

---

## 自查

- 无 TBD/TODO。
- “彻底删除截图三页”和“保留业务模块内部统计”没有冲突。
- 追溯导出被明确归回追溯域，不会因删除统计中心误删。
- 文档模块与集中统计缓存的耦合有明确清理动作。
- 验收命令覆盖前端、后端、浏览器和系统地图。
