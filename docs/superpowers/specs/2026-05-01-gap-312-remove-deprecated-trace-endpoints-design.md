# GAP-312 旧 batch-trace 追溯端点清理设计

## 背景

权威追溯入口已经收敛到 `/traceability/query`。但后端仍保留 `TraceController`：

- `POST /batch-trace/trace/backward`
- `POST /batch-trace/trace/forward`

这两个接口虽然标记 deprecated，但仍在生产模块中注册，外部调用者可能继续使用旧端点，导致追溯入口无法真正收敛。

同时 `TraceExportController` 也挂在 `batch-trace/trace` 下，用于 PDF 导出；本 GAP 只移除 deprecated backward/forward，不移除 PDF 导出。

## 设计结论

删除旧 `TraceController` 并从 `BatchTraceModule.controllers` 移除。保留：

- `TraceExportController`
- `GET /batch-trace/trace/:batchId/export-pdf`
- `GET /batch-trace/trace/:batchId/forward/pdf`

前端已有 `/traceability` 权威入口，当前搜索未发现 `client/src` 调用 `batch-trace/trace/backward` 或 `forward`，因此不需要前端迁移。

## 边界

- 本设计不删除 `/batch-trace/query` 和 `/warehouse/traceability` 的前端 redirect；那是页面路由收敛，不是 API 端点。
- 本设计不改变 `TraceabilityService.traceBackward/traceForward` 方法；若还有服务内部调用，可继续保留到后续清理。
- 本设计不影响 PDF 导出。

## 验收标准

- `BatchTraceModule` 不再注册 `TraceController`。
- `server/src/modules/batch-trace/controllers/trace.controller.ts` 删除。
- `client/src` 不存在 `batch-trace/trace/backward` 或 `batch-trace/trace/forward` 调用。
- `TraceExportController` 仍注册，PDF 导出路径不变。
