# GAP-202 BatchDetail 物料批次选择器设计

## 背景和现状

GAP-202 处理 `BatchDetail.vue` 中旧投料链路的添加物料弹窗。当前页面在“物料批次ID”表单项中使用裸文本输入：

- `client/src/views/batch-trace/BatchDetail.vue:118-119` 使用 `<el-input v-model="usageForm.materialBatchId" placeholder="请输入物料批次 ID" />`
- 用户需要手填 `MaterialBatch.id`
- 提交时 `handleAddUsage()` 直接把 `usageForm.materialBatchId` 传给 `materialUsageApi.addUsage()`

这会让旧链路 `BatchMaterialUsage` 的追溯数据质量依赖人工记忆和复制 ID。若用户填错 ID，后端会拦截不存在、物料不匹配或库存不足的情况，但 UI 仍然引导用户用手填 ID 的方式操作，不符合“名称只展示，ID 才关联”和“生产投料必须选择物料批次数据”的追溯主链规则。

## 当前代码事实源

- 旧投料入口：`client/src/views/batch-trace/BatchDetail.vue`
- 前端提交 API：`client/src/api/batch.ts` 中 `materialUsageApi.addUsage(payload)`
- 后端创建服务：`server/src/modules/batch-trace/services/material-usage.service.ts`
- 后端批次查询入口：`server/src/modules/batch-trace/controllers/material-batch.controller.ts`
- 后端批次查询服务：`server/src/modules/batch-trace/services/material-batch.service.ts`

后端 `MaterialUsageService.create()` 已经做了核心业务校验：

- 生产批次必须存在，且必须有关联配方。
- `recipeLineId` 必须属于该生产批次的 `recipeId`。
- `materialBatchId` 必须存在。
- `materialBatch.materialId` 必须等于配方行 `material_id`。
- `materialBatch.quantity` 必须足够。

现有批次查询能力为 `GET /batch-trace/material-batches?materialId=<id>`，返回 `MaterialBatch` 并 include `material`、`supplier`。该接口已能按配方行物料过滤可选批次，是本 GAP 的首选数据源。

## 业务边界

本 GAP 只修正旧投料弹窗的输入方式，不改变追溯主链：

- 业务标准名：`MaterialLot`、`IngredientUsage`
- 当前代码名：`MaterialBatch`、`BatchMaterialUsage`
- 旧链路仍为 `ProductionBatch -> BatchMaterialUsage -> MaterialBatch`
- 新链路 `MixingExecution + BatchMixingAggregation` 不受本 GAP 影响

用户必须先选择配方明细，再选择该配方物料对应的物料批次。选择器展示批次号、物料名称、供应商、剩余数量、有效期、状态等人可读信息；提交时仍只提交 `materialBatchId`。

## 不做什么

- 不新增 `MaterialBatch`、`MaterialLot` 或任何平行批次事实源。
- 不改 `ProductionBatch`、`BatchMaterialUsage`、`MaterialBatch` schema。
- 不写 migration。
- 不迁移历史 `BatchMaterialUsage` 数据。
- 不把旧链路升级为主投料链路；新功能仍应优先走 `MixingExecution + BatchMixingAggregation`。
- 不处理 GAP-100 的来料检验批次选择器。
- 不处理 GAP-201 的配料归集多对多业务决策。
- 不处理 GAP-203/GAP-204 的 FK 问题。

## 设计方案

### 方案 A：在 BatchDetail 内接入按配方行过滤的远程批次选择器

用户选择配方明细后，前端根据该配方行的 `material_id` 调用 `GET /batch-trace/material-batches?materialId=<material_id>`，把结果渲染为可搜索 `el-select`。选择器禁止普通文本输入，清空配方明细时同步清空物料批次。

优点：复用现有 batch-trace 入口，不新增事实源；后端校验保持不变；改动集中。  
缺点：若批次数量很多，仅靠前端过滤不够，需要接口支持分页或 keyword。

### 方案 B：新增通用 `MaterialBatchSelect` 组件

抽出 `client/src/components/master-data/MaterialBatchSelect.vue`，支持 `materialId`、remote search、清空、loading、格式化 label。BatchDetail 使用该组件，未来 GAP-100 等页面可复用。

优点：后续同类选择器可复用，避免每个页面重复拼选择器。  
缺点：需要新增组件和组件测试；当前项目只有 `ProductionBatchSelect.vue`，尚无 MaterialBatchSelect 组件。

### 方案 C：仅在输入框旁增加校验和提示

保留文本输入，仅在提交前查询批次存在性和物料匹配。

优点：改动最小。  
缺点：仍允许手填 ID，不满足本 GAP 的核心要求。

推荐采用方案 B，并在组件内部复用方案 A 的数据流。GAP-202 的真正边界不是“多写一个下拉框”，而是把 MaterialBatch 选择从页面局部文本输入收敛为可复用的批次引用控件。

## 数据、接口、页面影响

### 数据影响

数据库结构不变。`BatchMaterialUsage.materialBatchId` 仍然保存 `MaterialBatch.id`。

### 接口影响

首选复用：

- `GET /batch-trace/material-batches?materialId=<material_id>`

若执行 agent 发现该接口响应量过大或需要关键词过滤，可在同一路径上追加可选查询参数：

- `keyword`：匹配 `batchNumber`、`material.name` 或 `supplier.name`
- `limit`：默认 20

追加参数不得改变现有无参或仅 `materialId` 调用的返回语义。

### 页面影响

`BatchDetail.vue` 的添加物料弹窗改为：

1. 先选择配方明细。
2. 未选择配方明细时，物料批次选择器禁用。
3. 选择配方明细后，只加载该配方行 `material_id` 对应的批次。
4. 切换配方明细时清空已选批次，避免旧批次残留。
5. 提交按钮仍沿用 `materialUsageApi.addUsage()`。

### 测试影响

需要补前端组件或页面测试，覆盖：

- 页面不再渲染“请输入物料批次 ID”的普通输入框。
- 物料批次控件未选择配方明细时禁用。
- 选择配方明细后用该行 `material_id` 查询批次。
- 提交时使用选中批次的 `id` 作为 `materialBatchId`。

建议执行现有 e2e grep：

```bash
pnpm test:e2e -- --grep GAP-202
```

如果仓库当前使用 npm workspace，则执行 agent 可用等价命令：

```bash
npm run test -w client -- client/src/views/batch-trace/__tests__/BatchDetail.spec.ts
```

## 历史数据和迁移策略

不涉及历史数据迁移。

原因：本 GAP 不改变 `BatchMaterialUsage` 存储结构，也不改变已有 `materialBatchId` 的含义。历史记录若已经引用有效 `MaterialBatch.id`，继续按现有追溯链展示；若历史记录曾因人工手填产生错误引用，本 GAP 只阻断新增错误，不追溯修复旧记录。

## grill-with-docs 校准记录

- 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突：本设计继续使用 `MaterialBatch` 作为代码层的 `MaterialLot`，不新增批次表。
- 不重复造主数据或事实源：选择器只引用现有 `MaterialBatch`。
- 不引入平行批次链路：提交仍写 `BatchMaterialUsage.materialBatchId`。
- 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链：只改变前端选择方式和可选接口查询参数。
- 不需要迁移历史数据：存储字段不变。
- 不需要用户业务确认：GAP 已验证，目标是禁止普通手填 ID。
- 可拆成独立小 PR：只涉及 BatchDetail、MaterialBatch 选择器、前端测试和可选接口查询参数。
- 可由执行 agent 按 `executing-plans` 独立完成。

## 验收标准

- BatchDetail 添加物料弹窗不再出现裸文本 `materialBatchId` 输入框，也不出现“请输入物料批次 ID”占位文案。
- 用户必须通过物料批次选择器选择批次；选择器 value 为 `MaterialBatch.id`。
- 选择器按配方明细的 `material_id` 限定候选批次。
- 切换或清空配方明细时，已选物料批次被清空。
- 提交旧投料记录时，后端仍执行配方行归属、物料匹配和库存校验。
- 新链路 `MixingExecution + BatchMixingAggregation` 行为不变。
- `pnpm test:e2e -- --grep GAP-202` 或仓库等价验证通过。
