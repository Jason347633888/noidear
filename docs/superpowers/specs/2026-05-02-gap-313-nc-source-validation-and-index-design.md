# GAP-313 NonConformance Source Validation And Index 设计

## 背景和现状

`NonConformance` 是不合格品治理事实源，处在 `ProductionBatch / MaterialBatch / Product -> NonConformance -> CorrectiveAction / ReworkRecord` 的质量闭环中。`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 明确要求 CAPA、不合格、返工必须通过 `source_type + source_id` 回到来源对象，不能只存备注描述。

当前 GAP-313 已验证：`NonConformance.source_type + source_id` 是多态字符串关联，Prisma 不能为这种多态关系声明原生 FK。数据库层无法阻止 `source_id` 指向不存在的 `ProductionBatch`、`MaterialBatch` 或 `Product`，因此必须在应用层创建入口校验来源存在性。

当前代码还存在一个额外事实：`origin/master` 中 `NonConformance` schema 已经有 `@@index([company_id, source_type, source_id])`。因此本 GAP 的索引部分不应重复添加 unscoped `@@index([source_type, source_id])`，而应把 tenant-scoped source lookup index 作为必须保留的验收条件。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：`NonConformance` 是跨模块共享实体；CAPA/不合格/返工必须以 `source_type + source_id` 关联来源。
- `docs/module-usage/09-nonconformance-capa.md`：`NonConformance.source_type` 当前支持 `'material_batch' | 'production_batch' | 'product'`；`source_id` 是对应来源 ID；GAP-313 建议应用层校验并添加索引。
- `docs/module-usage/99-current-gap-register.md`：GAP-313 标记为 P1、已验证，建议 PR 为 `fix/nc-source-validation-and-index`。
- `server/src/prisma/schema.prisma`：`NonConformance` 当前字段为 `source_type String` 和 `source_id String`，已有 `@@unique([company_id, nc_no])`、`@@index([company_id, status])`、`@@index([company_id, source_type, source_id])`。
- `server/src/modules/non-conformance/dto/create-nc.dto.ts`：`source_type` 和 `source_id` 仅用 `@IsString()`，未限制枚举值，也未要求非空字符串。
- `server/src/modules/non-conformance/non-conformance.service.ts`：`create()` 直接展开 DTO 写入，不按 `source_type` 查询来源对象是否存在。
- `server/src/modules/non-conformance/non-conformance.service.ts`：`createFromCcpDeviation()` 是 CCP 偏差自动创建 `NonConformance` 的写入路径，当前直接使用 `ccpRecord.production_batch_id` 写入 `source_id`，也未校验生产批次是否属于当前 company。
- `server/src/modules/ccp/ccp.service.ts`：`createRecord()` 在 `is_within_cl=false` 时通过事务调用 `NonConformanceService.createFromCcpDeviation()`，因此 GAP-313 必须覆盖该自动路径，不能只覆盖手工 `create()`。
- `server/src/prisma/schema.prisma`：`ProductionBatch` 没有 `company_id` 字段，但它通过 `productId` 关联 `Product`；`Product` 具有 `company_id` 和 `deleted_at`，是校验生产批次租户归属的现有链路。
- `server/src/modules/workflow-triggers/workflow-triggers.service.ts`：`incoming-inspection.created` 事件失败时直接通过 Prisma 创建 `NonConformance`，绕过 `NonConformanceService.create()`，也未校验 `material_batch_id` 是否存在。
- `client/src/api/non-conformance.ts` 和 `client/src/views/non-conformance/NonConformanceList.vue`：前端类型和页面允许三类 source type，并把来源 ID 作为手工输入；前端体验不是本 GAP 的主改动点。

## 业务边界

本 GAP 只收紧新建 `NonConformance` 时的来源引用正确性：

- 支持的 `source_type` 固定为 `material_batch`、`production_batch`、`product`。
- `source_id` 必须是非空字符串。
- `source_type='material_batch'` 时，`source_id` 必须能查到 `MaterialBatch.id`。
- `source_type='production_batch'` 时，`source_id` 必须能查到 `ProductionBatch.id`，并且必须沿用现有链路通过 `ProductionBatch.productId -> Product.company_id` 确认该生产批次归属当前 company。
- `source_type='product'` 时，`source_id` 必须能查到当前 company 下未删除的 `Product.id`。
- 手工 API 创建路径、CCP 偏差自动创建路径和事件自动创建路径都必须在写入 `NonConformance` 前完成来源校验。
- Prisma schema 必须保留 `@@index([company_id, source_type, source_id])`，用于按租户和来源查询不合格记录。

`ProductionBatch` 和 `MaterialBatch` 当前 schema 没有直接 `company_id` 字段。本 GAP 不新增批次租户字段，也不伪造不存在的直接 tenant 字段；但 `ProductionBatch` 必须通过现有 `productId` 关联到 `Product.company_id` 校验租户归属。`MaterialBatch` 及其上游 `Material` 当前也没有 `company_id`，本轮只能校验 `MaterialBatch.id` 存在性，物料批次租户归属另行分诊。

## 不做什么

- 不把 `source_type + source_id` 改成多个 nullable FK 字段。
- 不新增 `source_batch_no`、`source_product_name` 等平行事实字段。
- 不修改 `ProductionBatch`、`MaterialBatch`、`BatchMaterialUsage`、`InventoryMovement` 主追溯链。
- 不实现 GAP-314 的安全编号生成。
- 不实现 GAP-315 的 `disposition='rework'` 自动创建 `ReworkRecord`。
- 不实现 GAP-316 的 CAPA 触发来源校验。
- 不实现 GAP-317 的其他查询索引；`@@index([company_id, status])` 已存在，source lookup index 本 GAP只要求保留。
- 不修复前端来源 ID 手工输入体验；批次/产品选择器可另开 UX GAP。
- 不迁移或自动修复历史 orphan `NonConformance.source_id`。
- 不绕过 `ProductionBatch.productId -> Product.company_id` 做生产批次租户判断。

## 数据、接口和页面影响

### 数据影响

- 不改变 `NonConformance.source_type` 和 `source_id` 字段形态。
- 不新增数据库 FK，因为 Prisma 无法对多态来源声明单一 FK。
- 保留 `@@index([company_id, source_type, source_id])`。
- 如执行分支缺失该索引，执行 agent 应在 schema 中补回；如已存在，不得新增重复索引或 unscoped source index。

### 接口影响

- `POST /non-conformances` 对不支持的 `source_type`、空 `source_id`、不存在的来源 ID 返回 400。
- `source_type='production_batch'` 的来源必须先查到 `ProductionBatch.id + productId`，再查 `Product.id + company_id + deleted_at: null`；生产批次不存在、缺失 `productId` 或其产品不属于当前 company 时均返回 400。
- `source_type='product'` 的来源必须限定当前 `companyId` 且 `deleted_at: null`。
- `createFromCcpDeviation()` 必须在同一事务 client 内复用生产批次来源校验；校验失败时 CCP 记录事务回滚，不创建悬空或跨租户的 `NonConformance`。
- `GET /non-conformances` 和 `PATCH /non-conformances/:id/dispose` 不改变。
- `WorkflowTriggersService.handleInspectionFail()` 在自动创建 NC 前必须确认 `payload.material_batch_id` 对应 `MaterialBatch` 存在；不存在时记录错误并不创建 NC。

### 页面影响

- 本 GAP 不要求修改 `NonConformanceList.vue`。
- 前端可继续提交 `source_type + source_id`；后端成为最终校验边界。
- 前端后续若改为批次/产品选择器，仍应复用本 GAP 建立的后端校验。

## 历史数据和迁移策略

本 GAP 不迁移历史数据。原因：

1. 当前问题是新增记录缺少应用层门禁；历史 orphan 需要业务确认真实来源后才能修复。
2. 不能用批号文本、描述、创建时间或最近批次自动猜测来源。
3. 当前 schema 已有 source lookup index，通常不需要新 migration。

执行 agent 可运行只读 SQL 或 Prisma 查询评估历史 orphan 数量，但不得自动更新历史 `source_id`。如果用户要求历史修复，必须停止并回报，另开数据修复任务。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-313 是 `needs_spec`。它影响不合格事实源与追溯引用正确性，并涉及 schema 索引验收，所以必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐保留现有多态字段，在应用层集中校验来源存在性，并把 tenant-scoped source lookup index 作为验收条件。改成多个 FK 会扩大 schema 和迁移范围，不适合本 GAP。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化 `NonConformance` 必须回到真实批次或产品来源。
  - 不重复造主数据或事实源；继续复用 `ProductionBatch`、`MaterialBatch`、`Product`。
  - 不引入平行批次链路；`source_id` 仍是对应来源表主键。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链。
  - `ProductionBatch` 租户归属必须沿用现有 `ProductionBatch.productId -> Product.company_id`，不得只按批次 `id` 查存在性。
  - `createFromCcpDeviation()` 是现有 CCP 偏差自动写入 `NonConformance` 的路径，必须纳入 GAP-313，不得只覆盖手工 `create()`。
  - 不需要历史数据迁移；历史 orphan 不自动猜测修复。
  - 不需要用户业务确认；issue 与 GAP register 已确认 GAP-313 已验证。
  - 可拆成独立小 PR：只涉及 NC 创建校验、自动触发路径校验、focused tests 和 schema index 保留验证。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- `CreateNcDto.source_type` 只接受 `material_batch`、`production_batch`、`product`。
- `CreateNcDto.source_id` 必填且不能为空字符串。
- `NonConformanceService.create()` 在生成编号和写入前按 `source_type` 校验来源存在。
- `NonConformanceService.createFromCcpDeviation()` 在生成编号和写入前校验 `ccpRecord.production_batch_id` 对应生产批次存在且通过 `Product.company_id` 属于当前 company。
- `source_type='material_batch'` 且 `source_id` 不存在时，`POST /non-conformances` 返回 400，不创建记录。
- `source_type='production_batch'` 且 `source_id` 不存在、缺失 `productId` 或其 `Product.company_id` 不等于当前 company 时，`POST /non-conformances` 返回 400，不创建记录。
- `source_type='product'` 且 `source_id` 不存在、已删除或不属于当前 company 时，`POST /non-conformances` 返回 400，不创建记录。
- CCP 偏差自动创建路径遇到不存在或跨 company 的生产批次时返回 400，事务内不创建 `NonConformance`。
- `WorkflowTriggersService.handleInspectionFail()` 在 `payload.material_batch_id` 不存在时不创建 `NonConformance`。
- Prisma schema 中 `NonConformance` 保留 `@@index([company_id, source_type, source_id])`。
- `(cd server && npm test -- non-conformance.service.spec.ts --runInBand)` 通过。
- `(cd server && npm test -- ccp.service.spec.ts --runInBand)` 通过。
- `(cd server && npm test -- workflow-triggers.service.spec.ts --runInBand)` 通过。
- `(cd server && npx prisma validate --schema src/prisma/schema.prisma)` 通过。
- `npm run build:server` 通过。
