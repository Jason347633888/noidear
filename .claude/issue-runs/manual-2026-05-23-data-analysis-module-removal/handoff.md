# Handoff

## Branch / HEAD

- **Branch:** `codex/remove-statistics`
- **HEAD SHA:** `1e2d2345a416f389d876aac48e7bf5d3c4f45295`
- **PR:** https://github.com/Jason347633888/noidear/pull/216

## Commit 列表

```
1e2d2345 feat: remove statistics server test files missed in initial plan
9d004c9c feat: remove StatisticsModule, StatisticsCacheInterceptor and all statistics server files
7baff43a feat: remove statistics resource from permission constants
d9442e6a feat: remove statistics e2e tests (STAT-001, STAT-002)
2e439217 feat: delete statistics center views and API adapter
f0b7d237 feat: remove statistics center menu entries and routes
```

## 修改 / 删除文件

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
| 删除 | `server/src/modules/statistics/` (整个目录，含 controller/service/module/dto/interfaces) |
| 删除 | `server/test/statistics.e2e-spec.ts` *(plan 遗漏，补充删除)* |
| 删除 | `server/test/statistics.integration.spec.ts` *(plan 遗漏，补充删除)* |
| 删除 | `server/test/statistics.service.spec.ts` *(plan 遗漏，补充删除)* |

## 验证结果

| 验证项 | 结果 |
|--------|------|
| 前端静态检查（statistics center 残留引用） | 0 命中 ✓ |
| 后端静态检查（StatisticsModule/StatisticsCacheInterceptor 残留引用） | 0 命中 ✓ |
| 培训统计 `/training/statistics` 路由保留 | ✓ |
| TraceabilityExportService 保留 | ✓ |
| DeviationAnalytics 保留 | ✓ |
| 前端完整构建 (`npm run build:client`) | `✓ built in 6.25s`，无 error |
| 后端完整构建 (`npm run build:server`) | exit code 0 ✓ |
| 后端单元测试 | 144 suites / 1078 tests，全部通过 ✓ |
| 前端单元测试 | 65 files / 369 tests，全部通过 ✓ |
| 浏览器验收 | 未执行（需部署环境） |
| GitNexus detect-changes | 未执行（MCP 工具不可用于当前上下文） |

## pre-existing 错误（与本次变更无关）

- 前端 `vue-tsc`：多处 TS6133 未使用变量、`ProductRecallDetail.evidence` TS2339 等，均为已存在问题
- 后端 `tsc --noEmit`：多处 TS7006 implicit any、`business-document-link.service.ts` Prisma `InputJsonValue` TS2694 等，均为已存在问题

## 剩余风险

1. **浏览器验收未完成**：需在部署环境确认导航栏无"数据分析"、`/statistics/overview` 进入 404、`/training/statistics` 正常渲染、控制台无 chunk 加载错误
2. **GitNexus detect-changes 未运行**：MCP 工具在当前 agent 上下文中不可用，无法确认符号变更范围与 Task 0 基线一致
3. **AGENTS.md / CLAUDE.md / package-lock.json** 主 checkout 有未提交修改，已确认与本次任务无关，未纳入提交
4. **Redis 统计缓存键**：TTL 300s 自然过期，无需主动清除（plan spec 已声明）
