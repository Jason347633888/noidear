# GAP-310 CustomerComplaint ProductionBatch FK 设计

## 背景和现状

`CustomerComplaint` 是顾客投诉的独立业务表，处在 `CustomerComplaint -> ProductionBatch -> IngredientUsage(BatchMaterialUsage) -> MaterialLot -> Supplier` 追溯链入口。营销或品质登记投诉后，系统必须能从投诉反查问题生产批次，再进入原料批次、供应商、发货和召回证据链。

当前 GAP-310 已验证：投诉可以不关联生产批次。更具体地看，当前代码不仅允许空批次，而且 `CustomerComplaint.production_batch_id` 在 Prisma schema 中只是 `String?` 裸字段，没有 `@relation` 到 `ProductionBatch`：

- `server/src/prisma/schema.prisma`：`CustomerComplaint.production_batch_id String?`，无 `production_batch` relation，`ProductionBatch` 也无投诉反向关系。
- `server/src/modules/customer-complaint/dto/create-complaint.dto.ts`：`production_batch_id?: string` 且 `@IsOptional()`。
- `server/src/modules/customer-complaint/customer-complaint.service.ts`：创建时直接展开 DTO，不校验生产批次存在。
- `client/src/views/customer-complaint/CustomerComplaintList.vue`：页面已经使用 `ProductionBatchSelect`，但表单规则没有把相关批次设为必填，提交时空值会转为 `undefined`。
- `client/src/api/customer-complaint.ts`：读取类型允许 `production_batch_id: string | null`，创建 payload 中该字段可选。

这会让投诉成为孤立治理记录。召回或投诉调查时，用户只能依赖顾客口述批号、备注或描述文本，无法稳定进入权威追溯查询链。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：发货、投诉、召回必须引用 `production_batch_id`，不能只存客户口述批号文本；投诉召回链是 `CustomerComplaint / ProductRecall -> ProductionBatch -> IngredientUsage -> MaterialLot -> Supplier`。
- `docs/module-usage/08-traceability-complaint-recall.md`：GAP-310 标记为 P1、已验证，当前问题是 `CustomerComplaint.production_batch_id` 可选，影响投诉反追与召回定位问题批次。
- `docs/module-usage/99-current-gap-register.md`：GAP-310 已验证，建议整改为投诉必须关联生产批次。
- `server/src/prisma/schema.prisma`：`CustomerComplaint` 独立模型存在；`production_batch_id` 当前为 nullable 裸字符串；`ProductionBatch` 已是追溯链核心节点，并已关联投料、物料平衡、发货、留样、过程、环境、金检、返工等记录。
- `server/src/modules/customer-complaint/customer-complaint.controller.ts`：接口受 `JwtAuthGuard` 保护，创建时从 `req.user.companyId` 写入投诉的 `company_id`。
- `server/src/modules/customer-complaint/customer-complaint.service.spec.ts`：当前单测覆盖 company 作用域和跨公司处理阻断，但未覆盖批次必填或批次存在性。
- `client/src/components/master-data/ProductionBatchSelect.vue`：已有可复用生产批次选择器。

## 业务边界

本 GAP 只收紧顾客投诉的生产批次追溯锚点：

- `CustomerComplaint.production_batch_id` 必须非空。
- `CustomerComplaint.production_batch_id` 必须 FK 到 `ProductionBatch.id`。
- `ProductionBatch` 增加 `customer_complaints CustomerComplaint[]` 反向 relation，便于后续从批次详情或追溯结果聚合投诉。
- 创建投诉时，DTO、服务层和页面都必须要求选择已有生产批次。
- 批次不存在时，服务层返回明确业务错误，不依赖数据库 FK 暴露底层错误。

业务口径采用：进入正式 `CustomerComplaint` 表的投诉必须已定位到生产批次。若顾客暂时无法提供批号或系统无法定位批次，本 GAP 不自动创建无批次投诉；应先补采证据或由业务另行设计“投诉线索/受理前登记”流程。

## 不做什么

- 不实现 GAP-309 的客户主数据 FK；`customer_name` 暂时仍为展示和搜索用文本。
- 不新增 `Customer`、`ExternalParty`、投诉线索或投诉受理前登记模型。
- 不新增平行批次字段、手填批号字段或备注解析逻辑。
- 不修改 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主追溯链。
- 不实现完整投诉反追查询页面；追溯查询权威入口仍是 `/traceability`。
- 不实现投诉自动触发 CAPA；该联动属于 CAPA/不合格闭环的独立 GAP。
- 不实现 ProductRecall 独立状态机；这是 GAP-311。
- 不自动猜测或回填历史空批次投诉记录。

## 数据、接口和页面影响

### 数据影响

- `CustomerComplaint.production_batch_id` 从 `String?` 改为 `String`。
- 增加 `production_batch ProductionBatch @relation(fields: [production_batch_id], references: [id], onDelete: Restrict)`。
- `ProductionBatch` 增加 `customer_complaints CustomerComplaint[]` 反向 relation。
- `CustomerComplaint` 增加 `@@index([production_batch_id])`。
- migration 必须在设置 NOT NULL / FK 前检查：
  - 是否存在 `CustomerComplaint.production_batch_id IS NULL` 的历史投诉。
  - 是否存在引用不到 `production_batches.id` 的 orphan `production_batch_id`。

### 接口影响

- `POST /customer-complaints` 请求必须包含非空 `production_batch_id`。
- 如果 `production_batch_id` 缺失或为空，DTO 或服务层返回 400。
- 如果 `production_batch_id` 不存在，`CustomerComplaintService.create()` 返回 400，错误语义为“生产批次不存在”。
- `GET /customer-complaints` 继续按 company 和 status 查询，返回字段保持现有 snake_case 形态。
- `POST /customer-complaints/:id/resolve` 不改变；处理投诉不允许修改批次归属。

### 页面影响

- `CustomerComplaintList.vue` 新建对话框中的“相关批次”必须为必填。
- 页面继续使用已有 `ProductionBatchSelect`，但提交 payload 不再把空批次转为 `undefined`。
- `client/src/api/customer-complaint.ts` 的类型与后端合同一致：读取结果和创建 payload 都把 `production_batch_id` 视为必填 string。
- 列表仍可直接展示 `production_batch_id`；批次号展示优化不属于本 GAP。

## 历史数据和迁移策略

本 GAP 不自动迁移历史业务数据。schema migration 采用 fail-fast：

1. 如果存在 `CustomerComplaint.production_batch_id IS NULL`，migration 抛错并停止。
2. 如果存在 orphan `production_batch_id`，migration 抛错并停止。
3. 执行 agent 不得用投诉日期、客户名称、描述文本、最近批次或任何启发式规则自动回填。
4. 如 preflight 失败，执行 agent 必须停止并回报主 agent，由业务确认历史投诉真实批次后另开数据修复任务。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-310 是 `needs_spec`，影响 schema、投诉反追和召回证据链，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐采用数据库非空 FK + 服务层存在性校验 + 页面必选生产批次的组合。只做前端必填无法防止 API 或脚本写入断链投诉；只做服务层校验无法防止绕过 API 写库。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化“发货/投诉/召回必须引用 `production_batch_id`”。
  - 不重复造主数据或事实源；继续复用 `ProductionBatch`。
  - 不引入平行批次链路；`CustomerComplaint` 直接回到 `ProductionBatch`。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；只是让投诉入口接入主链。
  - 需要历史数据 preflight，但不自动迁移历史数据；发现空值或 orphan 时停止并回报。
  - 不需要新的业务确认；issue 已将 GAP-310 指定为已验证 `needs_spec`，正式投诉必须可进入批次追溯链。
  - 可拆成独立小 PR：只涉及 customer-complaint、Prisma schema/migration、页面字段合同和 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `CustomerComplaint.production_batch_id` 为非空 `String`。
- Prisma schema 中 `CustomerComplaint.production_batch` FK 指向 `ProductionBatch.id`，删除策略为 `Restrict`。
- Prisma schema 中 `ProductionBatch` 有 `customer_complaints CustomerComplaint[]` 反向 relation。
- migration 在设置 NOT NULL / FK 前检查空值和 orphan，并在发现历史数据不满足时失败。
- `CreateComplaintDto.production_batch_id` 必填且不能为空。
- `CustomerComplaintService.create()` 在写入前校验生产批次存在；缺失或不存在时返回业务错误。
- `CustomerComplaintList.vue` 新建投诉时必须选择生产批次，不能提交空批次。
- `client/src/api/customer-complaint.ts` 不再把创建 payload 的 `production_batch_id` 标为可选。
- `(cd server && npx prisma validate --schema src/prisma/schema.prisma)` 通过。
- `(cd server && npm test -- customer-complaint.service.spec.ts --runInBand)` 通过。
- `npm run build:client` 通过。
- 当前仓库没有 GAP-310 专用 E2E 时，不新增 pnpm 命令；执行 agent 需记录该结果，并以上述 Prisma validate、focused Jest、client build 作为替代验证。
