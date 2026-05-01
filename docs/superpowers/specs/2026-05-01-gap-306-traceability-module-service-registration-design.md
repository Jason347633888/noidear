# GAP-306 TraceabilityModule 服务注册设计

## 背景

追溯模块已经存在以下服务文件：

- `TraceabilityQueryService`
- `TraceabilityLinkageService`
- `TraceabilityExportService`
- `TraceabilityBalanceService`

但 `server/src/modules/traceability/traceability.module.ts` 当前只注册了 `TraceabilityService`。这会导致依赖这些服务的后续追溯链路无法通过 NestJS DI 注入。

## 设计决策

1. `TraceabilityModule` 必须注册并导出四个追溯子服务。
2. `TraceabilityService` 暂时保持当前对外接口不重写，避免把 GAP-307 的完整追溯查询一起混入本 PR。
3. 本 GAP 只打通 DI 和模块边界，不清理旧 `batch-trace/trace` 端点。
4. `ModelLandingModule` 如为 `TraceabilityQueryService` 依赖来源，必须由 `TraceabilityModule` import。

## 不做什么

- 不重写追溯查询算法。
- 不删除 `batch-trace/trace` legacy endpoints。
- 不修改前端追溯页面。
- 不改 DTO 合同。

## 验收标准

- `TraceabilityModule` providers 包含四个子服务。
- `TraceabilityModule` exports 包含 `TraceabilityService` 和可复用的查询/导出服务。
- 新增 module spec 能通过 Nest testing module compile。
- `npm --prefix server test -- traceability --runInBand` 通过，或失败项明确不是本模块 DI 导致。

## Superpower 与 grill-me 校准记录

- `brainstorming`：确认这是 P0 模块接线修复，不做追溯算法扩展。
- `grill-with-docs`：对齐权威链，`TraceabilityQueryService` 是追溯查询层的入口之一。
- `grill-me`：通过代码核对确认服务文件存在但 module 未注册；这是明确实现缺口，不需要业务确认。
- `writing-plans`：后续 plan 聚焦 module imports/providers/exports 与 DI 测试。
