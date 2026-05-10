# GAP-308 TraceabilitySnapshot 持久化设计

## 背景和现状

GAP-308 解决追溯查询、导出、复核和审计证据链中的快照持久化问题。追溯 API 契约已经冻结，`SnapshotCreateRequest`、`TraceSnapshotResult`、`TraceExportResult` 均以 `sourceQueryRef` 作为查询上下文引用；数据库也已经存在 `TraceabilitySnapshot` 模型。

当前问题是权威 controller 路径仍由 `TraceabilityService.createExport`、`TraceabilityService.createSnapshot`、`TraceabilityService.getSnapshot` 和 `TraceabilityService.getSnapshotResult` 返回内存对象：

- `POST /traceability/export` 返回 `export:${Date.now()}`，`snapshotId` 为 `null`，不写库。
- `POST /traceability/snapshots` 返回 `snapshot:${Date.now()}`，不写库。
- `GET /traceability/snapshots/:snapshotId` 不查库，返回固定 `query-hash`。
- `GET /traceability/snapshots/:snapshotId/result` 返回临时 `{ snapshotId, resultType: 'query' }`，不是正式结果对象。

GAP-306 已执行，`TraceabilityModule` 已注册 `TraceabilityExportService` 等子服务；该服务目前只对 `fullPackage` 导出直接写入 `TraceabilitySnapshot`，但 controller 仍未使用它，且 snapshot 读写路径仍不完整。GAP-307 正在补完整查询链路，本 GAP 不重复设计查询算法，只补快照持久化边界。

## 当前代码事实源

- `server/src/modules/traceability/traceability.controller.ts`：权威追溯入口，`POST /traceability/export`、`POST /traceability/snapshots`、`GET /traceability/snapshots/:snapshotId`、`GET /traceability/snapshots/:snapshotId/result` 都委托 `TraceabilityService`。
- `server/src/modules/traceability/traceability.service.ts`：`createExport`、`createSnapshot`、`getSnapshot`、`getSnapshotResult` 均为内存返回。
- `server/src/modules/traceability/traceability-export.service.ts`：对 `fullPackage` 已使用 `prisma.traceabilitySnapshot.create`，但返回的是 Prisma row，不符合 `TraceExportResult` 合同。
- `server/src/prisma/schema.prisma`：`TraceabilitySnapshot` 已存在，字段为 `id`、`sourceQueryHash`、`exportMode`、`requesterId`、`status`、`snapshotType`、`summary`、`filePath`、`createdAt`、`updatedAt`。
- `packages/types/traceability.ts`：`ExportCreateRequest`、`TraceExportResult`、`SnapshotCreateRequest`、`TraceSnapshotResult` 为共享合同。
- `docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`：要求 snapshot endpoint 固定，snapshot/result 必须返回正式结果对象，export 必须能追溯到查询条件、时间模式、权限裁剪后的结果依据和 result snapshot。
- `docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`：要求 async 查询和导出生成包含查询条件、time mode、requester、generation time、result summary、result retrieval link 的快照。

## 业务边界

本 GAP 的业务对象是 `TraceabilitySnapshot`，属于追溯证据快照和异步导出支撑，不是新的追溯事实源。

设计边界如下：

1. `sourceQueryRef` 是 API 合同字段，服务层持久化时映射到现有 schema 字段 `sourceQueryHash`。
2. `TraceabilitySnapshot.summary` 保存快照元数据和结果依据，至少包含 `sourceQueryRef`、`snapshotType`、`exportMode`、`retentionPolicy`、`queryContext`、`resultSummary`、`payloadRef`、`createdBy`。
3. `TraceabilitySnapshot.filePath` 仅保存导出文件引用；当前未生成真实文件时保持 `null`，不得伪造可下载文件。
4. `retentionPolicy` 和 `expiresAt` 不新增 schema 字段；执行时将 retention 信息放入 `summary.retention`，响应从该 JSON 中还原，缺省 `expiresAt: null`。
5. `createExport` 必须为 `fullPackage` 创建 snapshot，并在 `TraceExportResult.snapshotId` 中返回真实 snapshot id。`simple` 导出可继续同步返回，但必须写入 snapshot 或明确记录不可恢复依据。本 GAP 选择让 `simple` 也写入 `TraceabilitySnapshot`，以满足审计证据链一致性。
6. `getSnapshot` 必须按 `id` 查询 `traceability_snapshots`，找不到时返回 404，而不是构造假对象。
7. `getSnapshotResult` 必须返回 `summary.resultPayload` 中保存的正式 `TraceQueryResult` 或 `BalanceQueryResult`；如果快照只保存了 summary 而没有正式 payload，返回 409/400 类错误并说明该 snapshot 无可回放结果。

## 不做什么

- 不重写 `TraceabilityService.query` 的完整正追、反追、发货查询；这是 GAP-307 的边界。
- 不新增 `TraceabilitySnapshot` 平行表或通用缓存表。
- 不修改 `packages/types/traceability.ts` 的字段名，不引入旧 `sourceQueryHash` 到前端合同。
- 不新增 Prisma schema 字段或 migration；本 GAP 使用现有 `summary Json` 承载 retention 与 payload 元数据。
- 不实现真实文件生成、对象存储上传或下载 endpoint；`downloadRef` 只能在已有可下载文件时返回。
- 不独立建模 `ProductRecall`，不改投诉、CAPA 或召回状态机。

## 数据 / 接口 / 页面影响

### 数据影响

- 写入现有 `traceability_snapshots` 表。
- `summary` JSON 结构由服务层约定，不作为新的跨模块事实源。
- 不回填历史 snapshot，不清理已有 snapshot。

### 接口影响

- `POST /traceability/export` 返回合同形状的 `TraceExportResult`，且 `snapshotId` 为真实持久化记录 id。
- `POST /traceability/snapshots` 返回合同形状的 `TraceSnapshotResult`，`snapshotId` 为真实 id。
- `GET /traceability/snapshots/:snapshotId` 从数据库读取并映射为 `TraceSnapshotResult`。
- `GET /traceability/snapshots/:snapshotId/result` 从持久化 payload 还原正式结果对象；没有正式 payload 时返回明确错误。
- 仍使用 `sourceQueryRef` 作为请求字段，禁止在 DTO 或前端 API 中改回 `sourceQueryHash`。

### 页面影响

本 GAP 不要求改页面结构。前端现有 `client/src/api/traceability.ts` 的 `export`、`createSnapshot`、`getSnapshot`、`getSnapshotResult` 方法合同保持不变。若页面当前未展示 snapshot 详情，执行 agent 不新增页面。

## 历史数据和迁移策略

不涉及 schema migration。

已有 `traceability_snapshots` 记录若存在，执行 agent 只保证新逻辑能读取字段完整的记录；对于旧记录缺失 `summary.retention` 或 `summary.resultPayload` 的情况，返回兼容的 `TraceSnapshotResult`，`expiresAt` 为 `null`，`meta.legacyShape: true`。不做批量回填。

## 方案比较和选择

### 方案 A：在 `TraceabilityService` 内直接写 `prisma.traceabilitySnapshot`

优点是改动最小，controller 无需改造；缺点是继续让 `TraceabilityService` 承担导出快照细节，和 GAP-306 引入的 `TraceabilityExportService` 分工不一致。

### 方案 B：让 `TraceabilityService` 注入并委托 `TraceabilityExportService`

优点是复用 GAP-306 的服务边界，导出和 snapshot 持久化逻辑集中；缺点是需要调整 `TraceabilityExportService` 返回合同形状，并补 snapshot 读取/映射辅助方法。

### 方案 C：新增独立 `TraceabilitySnapshotService`

优点是边界最清楚；缺点是当前模块已有 `TraceabilityExportService`，新增服务会扩大 PR 范围，并可能与后续 GAP-307 的查询编排重叠。

推荐方案：选择方案 B。执行 agent 应让 `TraceabilityService.createExport/createSnapshot/getSnapshot/getSnapshotResult` 委托 `TraceabilityExportService`，由后者统一负责 `TraceabilitySnapshot` 的 create/read/map。这样不重复查询链路，也不新增平行服务。

## grill-with-docs 校准记录

- 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突：本 GAP 不改变 `ProductionBatch -> BatchMaterialUsage -> MaterialBatch -> Supplier` 主链，只保存追溯结果证据快照。
- 不重复造主数据或事实源：`TraceabilitySnapshot` 是导出/复核证据，不是产品、物料、客户或批次事实源。
- 不引入平行批次链路：snapshot 保存的是查询依据和结果 payload，不创建新的批次关系。
- 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链：执行计划不得改这些模型关系。
- 历史数据迁移：不需要 schema migration 或批量回填；旧 snapshot 只做兼容读取。
- 用户业务确认：不需要。GAP 已验证，且本设计只让既有模型真实持久化。
- 独立小 PR：可以。只涉及 traceability service/export service 的持久化和测试，不依赖 GAP-307 完整查询算法。
- 可被执行 agent 按 `executing-plans` 独立完成：可以。plan 会列出具体文件、测试、停止条件和禁止范围。

## 验收标准

1. `POST /traceability/snapshots` 调用后会写入 `traceability_snapshots`，返回真实 `snapshotId`。
2. `POST /traceability/export` 对 `simple` 和 `fullPackage` 均写入 `traceability_snapshots`，返回合同形状的 `TraceExportResult`，且 `snapshotId` 不为 `null`。
3. `GET /traceability/snapshots/:snapshotId` 查询数据库并返回合同形状的 `TraceSnapshotResult`。
4. `GET /traceability/snapshots/:snapshotId/result` 对保存了正式 result payload 的 snapshot 返回正式结果对象；无 payload 时返回明确错误，不返回临时 `{ resultType: 'query' }`。
5. 单元测试覆盖 create export、create snapshot、get snapshot、get snapshot result、not found、legacy shape。
6. 不修改业务代码以外的 schema、migration、前端页面或完整查询算法。
7. `npm --prefix server test -- traceability-export.service --runInBand` 通过。
8. `npm --prefix server test -- traceability --runInBand` 通过，或失败项明确不是 GAP-308 引入。
