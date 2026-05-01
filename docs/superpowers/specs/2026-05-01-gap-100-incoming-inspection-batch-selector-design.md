# GAP-100 Incoming Inspection Batch Selector Design

## 背景和现状

GAP-100 来自供应商、采购来料与来料检验模块审计。来料检验创建表单当前要求用户手工输入 `material_batch_id`，字段标题为“物料批次ID”。这与食品安全追溯模型的要求不一致：来料检验应绑定已经存在的 `MaterialBatch`（业务口径 `MaterialLot`），而不是让用户凭记忆录入裸 ID。

当前数据库外键可以阻止不存在的批次最终落库，但错误会在提交后才暴露，用户只能看到创建失败。更重要的是，页面没有把批次号、物料、供应商、库存状态这些上下文展示给检验员，导致来料检验和物料批次主链的绑定质量依赖人工抄写。

本 GAP 的任务类型是 `needs_spec`。虽然不需要新增 schema/migration，但它影响 `IncomingInspection -> MaterialBatch -> BatchMaterialUsage -> ProductionBatch` 追溯主链的绑定质量，因此按 `brainstorming -> grill-with-docs -> writing-plans` 处理。

## 当前代码事实源

已核对的代码事实：

- `client/src/views/incoming-inspection/IncomingInspectionList.vue`
  - 第 91-93 行：`material_batch_id` 使用 `<el-input>`，placeholder 为“请输入物料批次 ID”。
  - 第 243-255 行：创建表单字段名为 `material_batch_id`，校验提示也是“请输入物料批次 ID”。
  - 第 319-330 行：提交 payload 保持 `material_batch_id` 字段。
- `client/src/api/incoming-inspection.ts`
  - `CreateInspectionPayload.material_batch_id` 是后端合同字段。
  - `IncomingInspection.material_batch` 已包含 `lot_number`、`material`、`supplier` 投影，列表页已经展示物料名称、批次号和供应商。
- `client/src/api/warehouse.ts`
  - `batchApi.getList(params)` 调用 `GET /warehouse/batches`。
  - `MaterialBatch` 前端类型包含 `id`、`batchNumber`、`quantity`、`expiryDate`、`supplierId`、`status`、`material`、`supplier`。
- `server/src/modules/warehouse/batch.controller.ts`
  - `GET /warehouse/batches` 已存在。
  - `GET /warehouse/batches/fifo?materialId=...` 已存在，但本 GAP 不需要 FIFO 推荐。
- `server/src/modules/warehouse/batch.service.ts`
  - `findAll(query)` 支持 `page`、`limit`、`status`、`materialId`、`search`。
  - 搜索字段当前覆盖 `batchNumber` 和 `supplierBatchNo`。
- `server/src/modules/incoming-inspection/incoming-inspection.service.ts`
  - `create()` 仍以 `material_batch_id` 创建 `IncomingInspection`。
  - `findAll()` include `material_batch.material`，当前未 include `material_batch.supplier`，但创建选择器不依赖列表响应。

## 业务边界

本 GAP 的核心边界是：来料检验只能选择系统中已经存在、未删除的物料批次。

执行后应满足：

- 检验员在“新建检验单”弹窗中通过批次选择器选择 `MaterialBatch.id`。
- 选择器展示可读业务信息：批次号、物料名称、供应商名称、当前数量、状态。
- 表单提交字段仍然是 `material_batch_id`，不改变后端合同。
- 批次选择数据来自现有 `/warehouse/batches` API，不新增批次事实源。
- 默认候选项优先展示可用批次，即 `status: normal`，避免用户误选已过期或已锁定批次。
- 如执行 agent 发现 `normal` 过滤会漏掉真实业务必须检验的批次，应停止并回报主 agent，而不是自行扩大到所有状态。

## 不做什么

本 GAP 不做以下事情：

- 不新增 Prisma model、字段、enum 或 migration。
- 不修改 `IncomingInspection` 后端 DTO 字段名。
- 不修改 `IncomingInspection.material_batch_id` 外键关系。
- 不新增独立 `MaterialBatch` 事实源或缓存表。
- 不改变 `MaterialBatch` 创建来源；GAP-101 单独处理手工创建批次门禁。
- 不实现 FIFO 推荐；FIFO 属于领料场景，不属于来料检验创建。
- 不把批次选择器抽象为全局组件，除非执行 agent 发现仓库已有可复用组件。
- 不清洗历史来料检验记录。

## 数据、接口、页面影响

数据影响：

- 不新增表。
- 不新增字段。
- 不修改历史数据。
- 仍写入 `IncomingInspection.material_batch_id`。

接口影响：

- 复用 `GET /warehouse/batches` 读取候选批次。
- 复用 `POST /incoming-inspections` 创建检验单。
- `CreateInspectionPayload` 不变。
- 如前端 `MaterialBatch` 类型与后端字段存在 `batchNumber` / `lot_number` 命名差异，执行 agent 必须在前端显示层兼容已有响应字段，不得改后端合同来适配页面。

页面影响：

- `IncomingInspectionList.vue` 新建弹窗中，“物料批次ID”改为“物料批次”。
- `<el-input>` 替换为可搜索的 `<el-select>` 或现有批次选择组件。
- 选择项 label 必须包含批次号和物料名；供应商、数量、状态作为辅助信息展示。
- 校验提示改为“请选择物料批次”。
- 打开弹窗时预加载一页正常批次；用户输入关键词时调用 `batchApi.getList({ search, status: 'normal', limit: 20 })`。
- 网络失败时提示“加载物料批次失败”，但不影响关闭弹窗或重试。

## 历史数据和迁移策略

不涉及历史数据迁移。

既有来料检验记录保留原样。页面列表已经通过 `material_batch` 投影展示批次号、物料名称和供应商；本 GAP 只约束后续新建检验单的输入方式。

## 方案比较

推荐方案：在 `IncomingInspectionList.vue` 内部直接接入 `batchApi.getList()`，使用 Element Plus 远程搜索选择器。

- 优点：改动集中在 GAP 证据文件；不引入新的跨页面抽象；复用现有 API；验收直接。
- 代价：后续 GAP-202 仍可能需要类似选择器，届时再根据第二个真实使用点抽组件。

备选方案一：新增全局 `MaterialBatchSelector.vue` 组件。

- 优点：未来可复用到投料、领料、检验等页面。
- 代价：当前仓库没有现成组件约定，GAP-100 只有一个页面需要修复；过早抽象会扩大测试面。

备选方案二：新增后端专用搜索接口。

- 优点：可以一次性返回完全为选择器裁剪的数据结构。
- 代价：现有 `/warehouse/batches` 已支持分页、状态和搜索；新增接口会制造平行读取入口，不符合最小修复原则。

## grill-with-docs 校准

校准结论：

- 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 一致：`MaterialBatch` 是业务口径 `MaterialLot` 的当前实现名，来料检验必须回到批次主链。
- 不重复创建主数据或批次事实源；页面只选择已有 `MaterialBatch.id`。
- 不引入平行批次链路；提交仍落 `IncomingInspection.material_batch_id`。
- 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；本 GAP 只加强 `IncomingInspection -> MaterialBatch` 绑定入口。
- 不需要迁移历史数据。
- 不需要新的业务确认：已验证 GAP 明确要求替换裸文本 ID 输入框。
- 可拆成独立小 PR：只涉及来料检验前端、前端 API 类型兼容和测试。
- 可由执行 agent 按 `superpowers:executing-plans` 独立完成；若发现 API 响应结构或批次状态语义与 plan 不一致，必须停止回报。

## 验收标准

执行 agent 完成 implementation plan 后，必须满足：

1. `IncomingInspectionList.vue` 新建表单不再出现裸 `material_batch_id` 文本输入框。
2. 新建表单使用可搜索批次选择器，候选数据来自 `batchApi.getList()` 或仓库已有等价批次查询 API。
3. 选择器提交的值仍是 `MaterialBatch.id`，payload 字段仍为 `material_batch_id`。
4. 选择项至少展示批次号和物料名称，辅助展示供应商、数量、状态。
5. 默认候选批次过滤为 `status: normal`。
6. 未选择批次时表单校验提示“请选择物料批次”。
7. 批次加载失败时展示错误提示，页面不崩溃。
8. 前端单元测试覆盖选择器渲染、调用批次 API、选择后提交 `material_batch_id`。
9. 建议 E2E 验收命令 `pnpm test:e2e -- --grep GAP-100` 通过，或执行 agent 明确说明环境中无对应 E2E 用例。
10. 不包含 schema、migration 或后端业务代码改动。
