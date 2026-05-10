# GAP-311 ProductRecall 独立建模设计

## 背景和现状

GAP-311 的任务类型是 `needs_spec`。`ProductRecall` 在 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 中被列为治理层对象，并明确处于“未独立建模”状态。当前 历史 Multica GAP 模块文档 也记录：召回仍通过 `RecordTemplate/Record` 动态表单处理，没有独立状态机、客户通知链、批次追溯范围和整改闭环。

营销部召回相关源表单已经在 model-landing 生成物中识别为同一组：

- `GRSS-YX-JL-02`：产品召回申请单
- `GRSS-YX-JL-03`：产品召回计划
- `GRSS-YX-JL-04`：产品召回通知单
- `GRSS-YX-JL-05`：召回演练记录与报告

这些表单目前只能作为动态记录归档，不能回答“某个召回事件处于什么状态、涉及哪些生产批次、通知了哪些客户、是否已完成 CAPA/验证关闭”等审核问题。

## 当前代码事实源

当前代码与文档事实源如下：

- `server/src/prisma/schema.prisma` 没有 `ProductRecall` 模型。
- `server/src/prisma/schema.prisma` 已有 `ProductionBatch`，并通过 `BatchMaterialUsage` 连接 `MaterialBatch`，这是召回范围追溯的主链。
- `server/src/prisma/schema.prisma` 已有 `DeliveryNote`，记录 `production_batch_id`、`customer_name`、发货数量和日期，可作为受影响客户通知范围的初始来源。
- `server/src/prisma/schema.prisma` 已有 `CustomerComplaint`，但投诉与召回之间目前无结构化关联。
- `server/src/prisma/schema.prisma` 已有 `CorrectiveAction`，通过 `trigger_type + trigger_id` 多态关联来源，可承接召回后的整改闭环。
- `server/src/modules/traceability/traceability-linkage.service.ts` 和 `TraceabilityService.createAction` 对 `actionType = 'recallAssessment'` 只返回 `pendingReview` 的内存对象，不写入召回业务表。
- `server/src/app.module.ts` 已注册 `TraceabilityModule`、`CustomerComplaintModule`、`CorrectiveActionModule`、`ExternalPartyModule`，没有 `ProductRecallModule`。
- `client/src/router/index.ts` 有 `/customer-complaints` 和 `/corrective-actions`，没有召回列表或详情入口。
- `client/src/api/customer-complaint.ts` 已有投诉 API 适配器；没有 `product-recall` API 适配器。
- `server/src/modules/model-landing/generated/model-landing.generated.ts` 将 `GRSS-YX-JL-02/03/04/05` 映射到 `ProductRecall`，但这只是表单落地映射，不是运行时业务模型。

## 业务边界

本 GAP 将 `ProductRecall` 从普通动态表单中抽出为独立业务对象。召回对象必须复用现有追溯主链，不创建新的批次事实源：

```text
ProductRecall
  -> ProductRecallBatch -> ProductionBatch
  -> BatchMaterialUsage -> MaterialBatch -> Supplier
  -> DeliveryNote -> ProductRecallNotification -> ExternalParty/customer_name
  -> CorrectiveAction(trigger_type = 'product_recall', trigger_id = ProductRecall.id)
```

召回状态机采用受控状态，不允许只靠动态表单状态表达：

```text
draft -> pending_review -> approved -> notified -> in_progress -> completed
draft -> cancelled
pending_review -> rejected
approved -> cancelled
notified -> cancelled
in_progress -> cancelled
```

状态含义：

- `draft`：召回申请已创建，范围可补充。
- `pending_review`：申请已提交审核，等待质量或管理层确认。
- `approved`：召回已批准，允许生成通知。
- `notified`：至少一个客户通知已发出或记录为已通知。
- `in_progress`：召回执行中，等待回收、隔离、销毁或验证。
- `completed`：召回关闭，必须有完成摘要和关闭时间。
- `rejected`：审核驳回，不进入通知和执行。
- `cancelled`：业务取消，保留审计记录。

## 不做什么

- 不重新实现追溯查询算法；追溯范围必须调用或复用 `server/src/modules/traceability/` 的权威服务。
- 不创建平行的 `ProductionBatch`、`MaterialBatch`、`BatchMaterialUsage`、`DeliveryNote` 或客户主数据表。
- 不把动态表单引擎删除；既有 `RecordTemplate/Record` 继续作为历史归档与表单证据来源。
- 不在本 GAP 内修复 GAP-307、GAP-308、GAP-309、GAP-310、GAP-316。
- 不自动执行召回；`recallAssessment` 只能创建或关联召回申请，通知和关闭仍需显式用户动作。

## 数据影响

新增独立召回模型，建议最小表结构为：

- `ProductRecall`：召回主表，包含编号、公司、标题、原因、风险等级、状态、来源投诉、来源追溯查询、申请/审核/关闭字段。
- `ProductRecallBatch`：召回涉及的生产批次桥接表，FK 到 `ProductionBatch`，记录召回数量、处置方式、状态和快照字段。
- `ProductRecallNotification`：客户通知记录，FK 到 `ProductRecall`，可选 FK 到 `ExternalParty`，保留 `customer_name` 快照，记录通知方式、通知状态和通知时间。
- `ProductRecallEvidence`：召回证据桥接，关联动态 `Record`、追溯快照、外部附件或 CAPA 记录；用于保留 GRSS-YX-JL-02/03/04/05 的历史表单证据。

历史动态表单迁移策略：

- 以 `RecordTemplate.code in ('GRSS-YX-JL-02','GRSS-YX-JL-03','GRSS-YX-JL-04','GRSS-YX-JL-05')` 识别历史召回表单记录。
- 迁移脚本只创建 `ProductRecallEvidence` 和可识别的 `ProductRecall` 草稿，不删除原 `Record`。
- 能从 `Record.productionBatchId`、`relatedBatchId` 或 `dataJson` 中解析到生产批次时，创建 `ProductRecallBatch`；无法解析时保留证据并写入迁移日志。
- 历史通知表单能解析客户名称时，创建 `ProductRecallNotification` 的 `customer_name` 快照；不能解析 `ExternalParty` 时不强行造客户主数据。

## 接口影响

后端新增 `server/src/modules/product-recall/`：

- `POST /product-recalls`：创建召回草稿。
- `GET /product-recalls`：按状态、风险、批次、投诉、时间筛选。
- `GET /product-recalls/:id`：返回召回详情、批次范围、通知和证据。
- `POST /product-recalls/:id/submit`：提交审核，进入 `pending_review`。
- `POST /product-recalls/:id/approve`：批准，进入 `approved`。
- `POST /product-recalls/:id/reject`：驳回，进入 `rejected`。
- `POST /product-recalls/:id/notifications`：为受影响客户创建通知记录。
- `POST /product-recalls/:id/notifications/:notificationId/mark-sent`：标记通知发出，必要时推进到 `notified`。
- `POST /product-recalls/:id/complete`：关闭召回，进入 `completed`。
- `POST /product-recalls/:id/cancel`：取消召回。

追溯联动影响：

- `TraceabilityLinkageService` 对 `recallAssessment` 不再只返回内存对象，应创建 `ProductRecall` 草稿或返回已创建召回引用。
- 如果 `sourceQueryRef` 对应 `TraceabilitySnapshot` 已持久化，应把快照 ID 写入 `ProductRecall.source_traceability_snapshot_id` 或证据表。
- 若快照尚未持久化，允许先写 `source_query_ref`，但不能把追溯结果复制成新的批次事实源。

## 页面影响

前端新增召回工作台：

- `/product-recalls`：召回列表，展示编号、状态、风险等级、关联批次数量、通知进度、申请时间。
- `/product-recalls/:id`：召回详情，包含状态流转、批次范围、客户通知、证据记录、CAPA 链接。
- `/traceability` 的 `recallAssessment` 动作返回召回 ID 后，页面应能跳转到召回详情。

## Superpower 与 grill-with-docs 校准记录

- 已使用 `brainstorming`：从 GAP 摘要、模块文档、主数据追溯模型和当前代码事实源收敛出独立召回模型设计。
- 已使用 `grill-with-docs`：校准结论是不与 `MASTER_DATA_AND_TRACEABILITY_MODEL.md` 冲突；召回属于治理层对象，但必须回到 `ProductionBatch -> BatchMaterialUsage -> MaterialBatch` 主链。
- 不重复造主数据：客户通知优先引用 `ExternalParty`，无法匹配时保留 `customer_name` 快照，不创建平行客户事实源。
- 不引入平行批次链路：召回范围使用 `ProductRecallBatch -> ProductionBatch`，原料来源继续通过 `BatchMaterialUsage` 查询。
- 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链。
- 需要历史数据迁移：只做从动态表单到召回证据/草稿的非破坏性迁移，原记录保留。
- 需要用户业务确认：召回状态机如上固定；如业务要求更多审批层级，应通过 `UnifiedApprovalModule` 扩展，不改变本 GAP 的核心对象边界。
- 可拆为独立 PR：一个 schema + service + API + 页面 + 迁移的召回独立建模 PR；不依赖 GAP-307 的完整追溯查询算法落地，但依赖 GAP-306 的 traceability module 服务注册。
- 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- `ProductRecall` 不再只是动态表单概念，schema 中存在独立召回主表和批次、通知、证据关系表。
- 召回范围 FK 到 `ProductionBatch`，不保存新的生产批次事实源。
- 客户通知可引用 `ExternalParty`，同时保留通知时的客户名称快照。
- `recallAssessment` 追溯联动能创建或返回召回草稿引用。
- `/product-recalls` 和 `/product-recalls/:id` 可查询召回进度、批次范围和通知状态。
- 历史 `GRSS-YX-JL-02/03/04/05` 动态表单记录保留，并通过证据关系关联到召回对象。
- 召回关闭后能通过 `CorrectiveAction.trigger_type = 'product_recall'` 和 `trigger_id = ProductRecall.id` 建立整改闭环。
- 所有验证命令使用 npm workspaces，不新增 pnpm 命令。
