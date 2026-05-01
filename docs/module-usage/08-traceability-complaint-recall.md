# 追溯查询、顾客投诉与召回模块

---
module_id: traceability-complaint-recall
business_chain:
  - CustomerComplaint -> ProductionBatch -> IngredientUsage(BatchMaterialUsage) -> MaterialLot -> Supplier
  - MaterialLot -> BatchMaterialUsage -> ProductionBatch -> DeliveryNote -> Customer（正追）
  - ProductionBatch -> IngredientUsage -> MaterialLot -> Supplier（反追）
module_type:
  - 追溯查询（主权威入口）
  - 顾客投诉记录
  - 召回（当前在 RecordTemplate/动态表单层，未独立建模）
source_of_truth:
  - server/src/modules/traceability/（权威追溯模块）
  - server/src/prisma/schema.prisma: CustomerComplaint, TraceabilitySnapshot
  - server/src/modules/customer-complaint/
  - docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md
  - docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md
facts_or_projections:
  - TraceabilitySnapshot 为异步导出快照存储
  - CustomerComplaint.customer_name 为自由文本，无 FK 关联 Customer/ExternalParty
  - CustomerComplaint.production_batch_id 为可选 FK
  - ProductRecall 未独立建模，仍通过 RecordTemplate/Record 动态表单处理
downstream_consumers:
  - CorrectiveAction（投诉触发 CAPA）
  - 召回评估（目前通过 /traceability/actions 接口桥接）
current_entrypoints:
  - /traceability → TraceabilityQuery.vue（权威入口）
  - /batch-trace/query → redirect: /traceability（已弃用）
  - /warehouse/traceability → redirect: /traceability（已弃用）
  - /customer-complaints → CustomerComplaintList.vue
last_verified_commit: 7bab98dc3ccd49e8e1d76b95b28a1b79207c483c
---

## 1. 模块定位

### 1.1 追溯查询

追溯查询是整个食品安全 SaaS 的核心查询能力，支持：

- **正向追溯**：物料批次 → 生产批次 → 发货/客户
- **反向追溯**：生产批次 → 原料批次 → 供应商
- **物料平衡**：批次投入/产出/损耗核算

系统已完成追溯入口收敛。权威入口为 `/traceability` → `TraceabilityQuery.vue`，旧入口 `/batch-trace/query` 和 `/warehouse/traceability` 均已重定向至权威入口。

**后端存在两套追溯服务**，是当前最重要的架构风险：

1. `server/src/modules/traceability/`（权威模块）：实现完整 API 契约，由 `TraceabilityService` 编排
2. `server/src/modules/batch-trace/services/traceability.service.ts`（旧批次追溯服务）：`TraceController` 下 `POST /batch-trace/trace/backward` 和 `POST /batch-trace/trace/forward` 端点明确标记为已弃用

### 1.2 顾客投诉

`CustomerComplaint` 是独立业务表，记录客户投诉信息。当前 `customer_name` 为自由文本，`production_batch_id` 为可选 FK，没有强制关联生产批次。

### 1.3 召回

`ProductRecall` 在 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 中明确标记为"未独立建模，当前更适合 RecordTemplate/Record"。当前系统通过动态表单处理召回记录（GRSS-YX-JL-02/03/04/05 等表单），无独立召回状态机。

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|---|---|---|
| 品质部（PZ） | 正追/反追、批次调查 | POST /traceability/query |
| 营销部（YX） | 投诉登记、召回申请 | CustomerComplaint CRUD，动态表单 ProductRecall |
| 品质部 / 管理层 | 召回评估 | /traceability/actions (actionType: recallAssessment) |
| 仓储组（CC） | 物料批次查询（入口已收敛） | /traceability 对象查询入口 |

## 3. 当前入口

| 入口 | 页面 | 前端 API | 后端 API | 后端模块 |
|---|---|---|---|---|
| `/traceability` | `TraceabilityQuery.vue` | `client/src/api/traceability.ts` | `POST /traceability/query`, `POST /traceability/balance`, `POST /traceability/actions`, `POST /traceability/export`, `POST /traceability/snapshots` | `server/src/modules/traceability/` |
| `/batch-trace/query` | redirect → `/traceability` | — | — | — |
| `/warehouse/traceability` | redirect → `/traceability` | — | — | — |
| `/batch-trace/trace/backward` | — | — | `POST /batch-trace/trace/backward` (已弃用) | `server/src/modules/batch-trace/controllers/trace.controller.ts` |
| `/batch-trace/trace/forward` | — | — | `POST /batch-trace/trace/forward` (已弃用) | `server/src/modules/batch-trace/controllers/trace.controller.ts` |
| `/customer-complaints` | `CustomerComplaintList.vue` | 无独立 API 文件 | `POST /customer-complaints`, `GET /customer-complaints`, `POST /customer-complaints/:id/resolve` | `server/src/modules/customer-complaint/` |

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|---|---|---|
| `TraceabilityService`（权威）| 仅实现物料批次正追（`objectType: materialLot`），其他查询模式返回空结果 | `已验证`: traceability.service.ts line 101–106 |
| `TraceabilityQueryService` | 存在独立服务文件（204行），但**未注册到 TraceabilityModule providers** | `已验证`: traceability.module.ts providers 仅有 `TraceabilityService`；文件存在 |
| `TraceabilityLinkageService` | 存在独立服务文件（21行），未注册到 providers | `已验证`: traceability.module.ts；文件存在 |
| `TraceabilityExportService` | 存在独立服务文件（27行），未注册到 providers | `已验证`: traceability.module.ts；文件存在 |
| `TraceabilityBalanceService` | 存在独立服务文件（64行），未注册到 providers | `已验证`: traceability.module.ts；文件存在 |
| `TraceabilitySnapshot` | 模型存在于 schema，export/snapshot 接口返回内存构造对象，**未持久化到数据库** | `已验证`: traceability.service.ts createExport/createSnapshot 方法 |
| `TraceController`（batch-trace）| 端点明确标注已弃用，返回 `deprecated: true` meta 标志 | `已验证`: trace.controller.ts line 16,31 |
| `CustomerComplaint.customer_name` | 自由文本字符串，无 FK 关联 Customer/ExternalParty | `已验证`: schema.prisma line 3098 |
| `CustomerComplaint.production_batch_id` | 可选字段 `String?`，允许不关联生产批次 | `已验证`: schema.prisma line 3099 |
| `ProductRecall` | 未独立建模 | `已验证`: MASTER_DATA_AND_TRACEABILITY_MODEL.md；schema 中无此模型 |

## 5. 正确业务流程

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1 | 营销/品质登记顾客投诉，选择关联生产批次 | CustomerComplaint 创建，关联 production_batch_id | customer-complaint | 无批次关联则无法进行投诉反追 |
| 2 | 品质进入 /traceability，以物料批次或生产批次为入口发起追溯查询 | POST /traceability/query，返回正追/反追链路 | traceability | - |
| 3 | 查询发现风险批次，触发联动动作 | POST /traceability/actions (recallAssessment) | traceability | 无动作记录，召回无证据 |
| 4 | 如需召回，填写召回申请/计划/通知动态表单（当前途径） | RecordTemplate/Record 动态表单归档 | record / record-template | 无独立状态机，无法查询召回进度 |
| 5 | 投诉触发 CAPA | 创建 CorrectiveAction，trigger_type='customer_complaint' | corrective-action | CAPA 与投诉无法双向追踪 |

## 6. 上下游绑定关系

- **上游**：`ProductionBatch`（追溯链核心节点）；`MaterialBatch`（MaterialLot 当前代码名）；`BatchMaterialUsage`（IngredientUsage 当前代码名）
- **平级**：`CustomerComplaint` 通过 `production_batch_id` 与批次挂接，反追查供应商
- **下游**：`CorrectiveAction`（trigger_type='customer_complaint'，trigger_id 对应投诉 ID）；`TraceabilitySnapshot`（异步导出持久化，当前未实际写库）

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|---|---|---|---|---|---|---|
| GAP-306 | `TraceabilityQueryService`、`TraceabilityLinkageService`、`TraceabilityExportService`、`TraceabilityBalanceService` 四个服务文件存在但**未注册到 TraceabilityModule providers** | 模块定义未更新 | 这四个服务无法被 NestJS DI 注入，代码实际上不可运行，追溯层设计与实现脱节 | P0 | 已验证 | traceability.module.ts providers: [TraceabilityService]（仅一个）；四个服务文件均存在 |
| GAP-307 | 权威 `TraceabilityService.query` 仅支持 `objectType: materialLot` 的正追，其他入口（ProductionBatch 反追、DeliveryNote 查询、场景工作台）返回空结果 | 服务层实现不完整 | 生产批次反追、发货批次查询无法使用，追溯能力严重缺失 | P0 | 已验证 | traceability.service.ts line 101–106 |
| GAP-308 | `TraceabilitySnapshot` 模型存在于 schema，但 `createExport`/`createSnapshot` 接口仅返回内存构造对象，**不写库** | 服务层实现不完整 | 追溯快照无法持久化，异步导出无法恢复，合规审查无历史记录 | P1 | 已验证 | traceability.service.ts createExport/createSnapshot 方法：纯内存返回，无 prisma 操作 |
| GAP-309 | `CustomerComplaint.customer_name` 为自由文本，无 FK 关联 `Customer`/`ExternalParty` 主数据 | schema 设计 | 同一客户多次投诉无法聚合分析；投诉趋势分析（GRSS-YX-JL-06）的客户维度失效 | P1 | 已验证 | schema.prisma line 3098：`customer_name String` |
| GAP-310 | `CustomerComplaint.production_batch_id` 为可选字段，允许投诉不关联生产批次 | schema 设计 | 投诉无法做反向追溯，召回时无法从投诉定位问题批次 | P1 | 已验证 | schema.prisma line 3099：`production_batch_id String?` |
| GAP-311 | `ProductRecall` 未独立建模，通过动态表单处理，无状态机 | 建模策略待决策（MASTER_DATA_AND_TRACEABILITY_MODEL.md 已标注） | 无法查询召回进度状态，无法触发客户通知链，不满足 BRCGS 审核要求 | P0 | 已验证（设计文档明确标注） | MASTER_DATA_AND_TRACEABILITY_MODEL.md 第 4.1 节 |
| GAP-312 | `batch-trace/trace/backward` 和 `forward` 端点仍在生产中运行，虽标记 deprecated，但未设定下线时间 | 遗留端点未清理 | 前端或外部调用者可能仍在使用旧端点，无法强制收敛到权威路径 | P2 | 已验证 | trace.controller.ts line 13–47 |

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|---|---|---|---|---|---|
| GAP-306 | 将四个服务注册到 TraceabilityModule providers，并在 TraceabilityService 中注入调用 | 无 | 否 | fix/traceability-module-register-services | 否（需先理解服务接口） |
| GAP-307 | 扩展 TraceabilityService.query 支持 productionBatch 反追和 deliveryNote 查询 | batch-trace, ProductionBatch, DeliveryNote | 是（参考 traceability-query-layer-design.md） | feat/traceability-query-full-chain | 否（依赖 GAP-7） |
| GAP-308 | createExport 和 createSnapshot 实现持久化，写入 TraceabilitySnapshot 表 | prisma | 否 | fix/traceability-snapshot-persist | 是 |
| GAP-309 | CustomerComplaint 新增 customer_id FK（关联 ExternalParty 或 Customer），customer_name 保留展示用 | ExternalParty/Customer 主数据 | 需要业务确认 | fix/complaint-customer-fk | 是 |
| GAP-310 | 在业务层校验 production_batch_id 必填，或 schema 改为非空 | ProductionBatch | 需要业务确认（部分投诉可能无批次） | fix/complaint-batch-required | 是 |
| GAP-311 | 将 ProductRecall 从动态表单中抽出，建立独立状态机（pending/notified/completed/cancelled） | 营销部表单 GRSS-YX-JL-02/03/04 | 是（需独立设计） | feat/product-recall-independent-model | 否（高优先级，需单独排期） |
| GAP-312 | 设定 batch-trace 旧端点下线日期，迁移后移除 TraceController | 无活跃使用方确认 | 否 | chore/remove-deprecated-trace-endpoints | 是 |

## 9. 证据索引

- `server/src/modules/traceability/traceability.module.ts`：providers 仅 TraceabilityService（1个）
- `server/src/modules/traceability/traceability.service.ts` line 100–106：query 仅处理 materialLot
- `server/src/modules/traceability/traceability-query.service.ts`：存在（204行），未注册
- `server/src/modules/traceability/traceability-linkage.service.ts`：存在（21行），未注册
- `server/src/modules/traceability/traceability-export.service.ts`：存在（27行），未注册
- `server/src/modules/traceability/traceability-balance.service.ts`：存在（64行），未注册
- `server/src/modules/batch-trace/controllers/trace.controller.ts` line 16,31：deprecated 标注
- `server/src/prisma/schema.prisma` line 3094–3110：CustomerComplaint 模型
- `server/src/prisma/schema.prisma` line 3692–3705：TraceabilitySnapshot 模型
- `client/src/api/traceability.ts`：完整 API 适配器
- `client/src/router/index.ts` line 377–450：追溯路由及 redirect 定义
- `docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`：冻结追溯设计规范
- `docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`：冻结 API 契约

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|---|---|---|---|---|
| 追溯查询 | `server/src/modules/traceability/`（权威） | 所有追溯结果字段 | 禁止在 batch-trace 或 warehouse 页面实现独立追溯逻辑 | /batch-trace/query, /warehouse/traceability 已 redirect，/batch-trace/trace/* 后端端点应下线 |
| 追溯 API 契约 | `packages/types/traceability.ts`（共享类型） | TraceQueryRequest, TraceQueryResult 等 | 禁止在页面层或 E2E 测试中使用自定义字段 | 旧 sourceQueryHash 临时字段禁止使用 |
| 顾客投诉 | `CustomerComplaint` | customer_name, complaint_type, description | 禁止在其他模块中重新存储客户投诉信息 | - |
| 召回 | 当前 RecordTemplate/Record（待迁移） | - | 整改后禁止保留两套召回入口 | GRSS-YX-JL-02/03/04/05 表单映射需随独立模型迁移 |

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|---|---|---|---|---|---|
| P0 | GAP-306 | fix/traceability-module-register-services | 无 | 否 | npm run traceability:test |
| P0 | GAP-307 | feat/traceability-query-full-chain | GAP-306 | 否 | npm run traceability:test |
| P0 | GAP-311 | feat/product-recall-independent-model | 业务设计确认 | 否 | E2E 召回流程测试 |
| P1 | GAP-308 | fix/traceability-snapshot-persist | 无 | 是 | query_db SELECT * FROM traceability_snapshots |
| P1 | GAP-309 | fix/complaint-customer-fk | 需业务确认 | 是 | npm run verify |
| P1 | GAP-310 | fix/complaint-batch-required | 需业务确认 | 是 | npm run verify |
| P2 | GAP-312 | chore/remove-deprecated-trace-endpoints | 确认无活跃调用者 | 是 | grep -r "batch-trace/trace" client/src |
