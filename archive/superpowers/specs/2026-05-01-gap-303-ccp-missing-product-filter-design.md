# GAP-303 CCP Missing Product Filter 设计

## 背景和现状

`GET /ccp/records/missing/:batchId` 用于判断某个生产批次还有哪些 CCP 控制点没有填写监控记录。该接口是质量放行证据链的一部分，后续会被批次放行、追溯、召回复核使用。

当前 `CcpService.findMissingCCPs()` 已按 `req.user.companyId` 过滤 `CCPRecord` 和 `CCPPoint`，但仍把当前租户下所有 CCP 控制点都作为该批次应填控制点。不同产品、配方、工序对应的 CCP 要求不同，全量扫描会把其他产品的 CCP 错报为本批次缺失；如果执行人员据此补录，还会污染批次放行证据。

GAP-303 的目标是让 missing 查询只比较“该生产批次所属产品/配方下的 CCPPoint”和“该批次已填写的 CCPRecord”，避免跨产品误报或漏报。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：产品主数据链为 `Product -> Recipe -> RecipeLine -> ProcessStep -> CCPPoint/Inspection 标准`；过程与放行链为 `ProductionBatch -> CCPRecord / EnvironmentRecord / ProcessMonitorRecord / MetalDetectionLog / ReworkRecord / Sample`。
- 历史 Multica GAP 模块文档：GAP-303 已验证，根因是 `findMissingCCPs` 未按产品/配方过滤 CCPPoint。
- 历史 Multica GAP 模块文档：GAP-303 为 P1、已验证、`needs_spec`，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- `server/src/prisma/schema.prisma`：
  - `ProductionBatch.productId`、`ProductionBatch.recipeId` 已为必填，并 FK 到 `Product`、`Recipe`。
  - `Recipe.steps` 指向 `ProcessStep[]`。
  - `ProcessStep.product_id` 和 `ProcessStep.recipe_id` 是 CCP 控制点的产品/配方归属来源。
  - `CCPPoint.process_step_id` FK 到 `ProcessStep`。
  - `CCPRecord.production_batch_id` 和 `CCPRecord.ccp_point_id` 分别 FK 到 `ProductionBatch` 和 `CCPPoint`。
- `server/src/modules/ccp/ccp.service.ts`：`findMissingCCPs()` 当前先查批次，再查当前批次已填记录，最后查询 `where: { company_id: companyId }` 的全部 CCPPoint 并做差集。
- `server/src/modules/product-process-change/product-process-change.service.ts`：HACCP 变更应用时以产品的 `ProcessStep` 为当前 CCPPoint 的归属集合，软删除旧 CCPPoint 时写 `deleted_at`。
- `server/src/modules/ccp/ccp.service.spec.ts`：已有测试只覆盖公司过滤，尚未覆盖产品/配方过滤和软删除过滤。
- `client/src/api/ccp.ts` 与 `client/src/views/ccp/CcpRecordList.vue`：前端只调用现有 missing 端点并展示结果，不需要新的查询参数。

## 业务边界

本 GAP 只收紧 CCP missing 查询的“应填 CCPPoint 集合”：

- 以 `ProductionBatch.id` 查到当前批次。
- 从批次读取 `productId` 和 `recipeId`。
- 应填 CCPPoint 必须满足：
  - `CCPPoint.company_id = req.user.companyId`
  - `CCPPoint.deleted_at IS NULL`
  - 关联的 `ProcessStep.deleted_at IS NULL`
  - 关联的 `ProcessStep.company_id = req.user.companyId`
  - 关联工序满足 `process_step.product_id = batch.productId` 或 `process_step.recipe_id = batch.recipeId`
- 已填 CCPRecord 仍只按当前生产批次和当前公司过滤。
- 返回值仍为缺失的 `CCPPoint[]`，接口路径和前端调用不变。

如果一个 CCPPoint 挂在产品级工序或配方级工序上，只要它能通过上述 product/recipe 任一条件归属到当前批次，就属于该批次应填 CCP。

## 不做什么

- 不新增 `CCPPoint.product_id` 或 `CCPPoint.recipe_id` 字段；产品/配方归属继续由 `ProcessStep` 承载。
- 不新增 CCP 统计表、放行表或平行产品事实源。
- 不修改 `ProductionBatch` schema。
- 不实现批次放行状态机。
- 不实现 CCP 偏差自动触发 `NonConformance`；这是 GAP-305。
- 不改 CCP 录入页面中的“CCP 点 ID”输入方式；本 GAP 只处理 missing 查询准确性。
- 不处理 `ProductionBatch` 自身缺少 `company_id` 的租户归属问题；本 GAP 通过 `CCPPoint`、`CCPRecord`、`ProcessStep` 的 `company_id` 维持现有查询边界。

## 数据、接口和页面影响

### 数据影响

不需要 schema 变更和 migration。GAP-303 使用现有关系链：

```text
ProductionBatch.productId / recipeId
  -> ProcessStep.product_id / recipe_id
  -> CCPPoint.process_step_id
  -> CCPRecord.ccp_point_id + production_batch_id
```

历史 CCPPoint、ProcessStep、CCPRecord、ProductionBatch 数据不做批量修改。

### 接口影响

- `GET /ccp/records/missing/:batchId` 路径不变。
- 请求参数不变。
- 响应仍为缺失 `CCPPoint[]`。
- 批次不存在时维持现状返回空数组。
- 结果集合变窄：只返回当前批次产品/配方范围内尚未填写的 active CCPPoint。

### 页面影响

前端 `CcpRecordList.vue` 不需要交互变化。用户点击“检查缺失 CCP”后，展示结果会更准确，不再出现其他产品的 CCP 控制点。

## 历史数据和迁移策略

不涉及历史数据迁移。

执行 agent 不得为旧 CCPPoint 或 ProcessStep 自动补 product/recipe 归属。如果实施时发现现有 CCPPoint 无法通过 `ProcessStep.product_id` 或 `ProcessStep.recipe_id` 归属到批次，但业务认为它应属于该批次，必须停止并回报主 agent，由后续主数据/工艺数据修复任务处理。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-303 是 `needs_spec`，影响质量放行查询准确性和跨模块产品/配方链路，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐复用现有 `ProductionBatch -> Product/Recipe -> ProcessStep -> CCPPoint` 链路，在 `findMissingCCPs()` 中按产品/配方归属过滤；不在 `CCPPoint` 上重复存 product/recipe 字段。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化“产品主数据链”和“过程与放行链”。
  - 不重复创建主数据或事实源；继续复用 `Product`、`Recipe`、`ProcessStep`、`ProductionBatch`。
  - 不引入平行批次链路；查询仍以 `ProductionBatch` 为批次锚点。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；只收紧 CCP 查询 where 条件。
  - 不需要迁移历史数据；发现无法归属的历史 CCPPoint 时停止并回报，不自动猜测。
  - 不需要新的业务确认；GAP 已验证，模块文档已明确不同产品 CCP 要求不同。
  - 可拆成独立小 PR：只涉及 `ccp.service.ts` 和 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- `CcpService.findMissingCCPs(batchId, companyId)` 只查询当前批次 `productId` 或 `recipeId` 归属下的 active CCPPoint。
- 查询排除 `CCPPoint.deleted_at IS NOT NULL` 的归档控制点。
- 查询排除关联 `ProcessStep.deleted_at IS NOT NULL` 的旧工序控制点。
- 查询排除其他产品、其他配方、其他公司的 CCPPoint。
- 已填写的 CCPRecord 不再出现在 missing 结果中。
- 批次不存在时返回空数组。
- `server/src/modules/ccp/ccp.service.spec.ts` 覆盖产品/配方过滤、归档过滤和批次不存在场景。
- `npm test -- ccp.service.spec.ts --runInBand` 通过。
- 当前仓库未配置 GAP-303 专属 E2E 脚本；执行 agent 需记录该缺失，并以 focused Jest 和 server Jest 作为必需验证。
