# GAP-315 NC Dispose to ReworkRecord 设计

## 背景和现状

`NonConformance` 是不合格治理事实源，`ReworkRecord` 是返工执行记录事实源。`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 要求过程与放行链回到 `ProductionBatch -> CCPRecord / EnvironmentRecord / ProcessMonitorRecord / MetalDetectionLog / ReworkRecord / Sample`，同时要求 CAPA/不合格/返工使用结构化来源，不能只存备注描述。

GAP-315 已验证：当 `NonConformance.disposition = 'rework'` 时，当前系统只把不合格记录更新为 `dispositioned`，不会自动创建 `ReworkRecord`。返工执行记录依赖用户之后手工补填，导致不合格处置决策与返工执行证据断链。

本设计把 `PATCH /non-conformances/:id/dispose` 的 `rework` 处置变成同事务联动：处置成功时自动创建一条待执行/待判定的 `ReworkRecord`，并通过 `nc_id` 关联原不合格记录。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：`ReworkRecord` 已实现，关联生产批次和不合格；过程与放行链包括 `ProductionBatch -> ... -> ReworkRecord`；CAPA/不合格/返工不能只存备注描述。
- 历史 Multica GAP 模块文档：GAP-315 是 P1、已验证；当前 `NonConformance.disposition='rework'` 不自动创建 `ReworkRecord`，建议在事务中自动创建。
- 历史 Multica GAP 模块文档：GAP-315 依赖 GAP-304 的 JWT `companyId` 多租户基础隔离；手动创建 `ReworkRecord` 路径不变。
- `server/src/modules/non-conformance/non-conformance.service.ts`：`dispose()` 先按 `id + company_id` 找 `NonConformance`，再直接 `nonConformance.update()`，没有事务，也没有 `reworkRecord.create()`。
- `server/src/modules/rework-record/rework-record.service.ts`：`create()` 只处理手工创建路径，写入 `company_id`、`rework_date`、`rework_qty`。
- `server/src/prisma/schema.prisma`：`ReworkRecord.production_batch_id` 是必填 FK，`nc_id` 是可选字符串；`NonConformance.source_type` 可为 `material_batch`、`production_batch`、`product`。
- `client/src/api/rework-record.ts` 和 `ReworkRecordList.vue`：质量判定展示只区分 `pass` / `fail`，没有“待判定”展示。

## 业务边界

- `NonConformance` 继续是不合格事实源；不在 CCP、来料检验或返工模块新增平行不合格表。
- `ReworkRecord` 继续是返工执行事实源；不把返工数量、返工过程或质量判定冗余写回 `NonConformance`。
- 自动创建只覆盖 `source_type = 'production_batch'` 的不合格记录。原因是当前 `ReworkRecord.production_batch_id` 必填，只有生产批次来源能无歧义得到生产批次 ID。
- `source_type = 'material_batch'` 或 `source_type = 'product'` 的不合格记录如果被处置为 `rework`，服务端返回 400，不创建 `ReworkRecord`。这些来源若未来要支持返工，必须先扩展 dispose 合同显式传入生产批次，不能靠系统猜测。
- 自动创建要求原 `NonConformance.qty` 和 `unit` 非空。缺少数量或单位时返回 400，避免创建数量为 0 或单位缺失的虚假返工记录。
- 自动创建的 `ReworkRecord.quality_verdict` 使用 `pending`，表示返工尚未完成或质量判定未录入。手工创建路径保持现有 `pass` / `fail` 体验。
- 为避免重复点击或重试造成多条返工记录，`dispose(rework)` 在事务中先按 `company_id + nc_id` 查询既有 `ReworkRecord`；已存在时只更新不合格处置，不再重复创建。

## 不做什么

- 不修改 Prisma schema，不新增 migration，不把 `ReworkRecord.nc_id` 改成 FK；这是 GAP-318 的范围。
- 不实现 GAP-313 的 `NonConformance.source_type + source_id` 全量来源校验。
- 不实现 GAP-314 的安全编号生成。
- 不自动创建 CAPA；CAPA 来源校验是 GAP-316，内审发现项自动 CAPA 是 GAP-410。
- 不新增返工审批流、返工任务模型或批次放行状态机。
- 不为 `material_batch` 或 `product` 来源猜测生产批次。
- 不迁移历史不合格或历史返工记录。

## 数据、接口和页面影响

### 数据影响

- 不涉及 schema 变更。
- 不涉及 migration。
- 新写入的自动返工记录使用现有 `rework_records` 表。
- 自动返工记录字段映射：
  - `company_id`：当前 JWT `companyId`。
  - `production_batch_id`：`NonConformance.source_id`，且 `source_type` 必须为 `production_batch`。
  - `nc_id`：当前 `NonConformance.id`。
  - `rework_reason`：`NonConformance.description`。
  - `rework_qty`：`NonConformance.qty`。
  - `unit`：`NonConformance.unit`。
  - `rework_date`：处置发生日期。
  - `operator_id`：当前处置用户 ID。
  - `quality_verdict`：`pending`。

### 接口影响

- `PATCH /non-conformances/:id/dispose` 保留请求体 `{ disposition }`，不新增必填入参。
- 当 `disposition !== 'rework'` 时，保持现有行为，只更新 `NonConformance`。
- 当 `disposition = 'rework'` 时：
  - 找不到当前公司内的不合格记录，返回现有 404。
  - 来源不是 `production_batch`，返回 400。
  - `qty` 或 `unit` 缺失，返回 400。
  - `source_id` 指向的生产批次不存在或不属于当前公司，返回 400。
  - 没有既有返工记录时，在同一事务中创建 `ReworkRecord`。
  - 已存在同公司同 `nc_id` 的返工记录时，不重复创建。

### 页面和前端 API 影响

- `ReworkRecordList.vue` 需要把 `quality_verdict='pending'` 显示为“待判定”，标签类型使用 warning。
- `client/src/api/rework-record.ts` 的展示映射需要支持 `pending`。
- `NonConformanceList.vue` 不要求新增表单字段；它继续调用 dispose 接口。

## 历史数据和迁移策略

不涉及历史数据迁移。

原因：

1. 本 GAP 不修改 schema，不新增 FK，不会让历史数据在 migration 阶段失败。
2. 既有 `disposition='rework'` 的不合格记录不自动补建返工记录，避免把缺少数量、单位或生产批次来源的历史数据强行转成不完整返工证据。
3. 若执行 agent 在验证中发现历史断链样例，只记录并回报主 agent，不自动修复历史数据。

## Brainstorming 备选方案

推荐方案：在 `NonConformanceService.dispose()` 内用事务直接创建 `ReworkRecord`。它能保证处置决策和返工记录同生同灭，不需要新增 API 入参，也不会引入新事实源。

备选方案 A：只在前端处置成功后跳转返工创建页。该方案不能阻止 API 或脚本调用造成断链，也不能保证用户完成返工记录创建。

备选方案 B：新增独立返工任务模型，处置时创建任务而非 `ReworkRecord`。该方案更适合完整返工审批/派工流程，但超出 GAP-315，且会在当前事实源旁新增任务态对象。

备选方案 C：扩展 dispose DTO，要求用户处置时填写完整返工字段。该方案数据更完整，但会改变现有处置交互，并把“处置决策”和“返工执行结果”混在一次操作中；当前 GAP 更需要先封住断链。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-315 当前为 `needs_spec`，影响不合格处置、返工执行、批次放行证据和跨模块闭环，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 采用事务内自动创建 `ReworkRecord`，只覆盖生产批次来源的不合格，缺少数量/单位时拒绝 rework 处置，自动记录以 `pending` 表示待判定。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化 `ProductionBatch -> NonConformance -> ReworkRecord` 的放行证据链。
  - 不重复造主数据或事实源；继续复用 `NonConformance`、`ReworkRecord` 和 `ProductionBatch`。
  - 不引入平行批次链路；生产批次 ID 来自 `NonConformance.source_type='production_batch' + source_id`，并继续回到 `ProductionBatch`。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；本 GAP 不触碰投料、库存或物料批次链路。
  - 不需要迁移历史数据；只影响新发生的 rework 处置。
  - 不需要新的业务确认；issue 已指定 GAP-315 已验证，且范围为 NC dispose 到 ReworkRecord 自动联动。
  - 可拆成独立小 PR：后端 service/spec + 返工列表 pending 展示。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- `PATCH /non-conformances/:id/dispose` 在非 `rework` 处置时不创建 `ReworkRecord`。
- `PATCH /non-conformances/:id/dispose` 在 `rework` 处置且来源为生产批次、数量/单位完整时，同事务更新 `NonConformance` 并创建一条 `ReworkRecord`。
- 自动创建的 `ReworkRecord` 包含 `company_id`、`production_batch_id`、`nc_id`、`rework_reason`、`rework_qty`、`unit`、`rework_date`、`operator_id`、`quality_verdict='pending'`。
- 同一 `NonConformance` 重复执行 `dispose(rework)` 不重复创建 `ReworkRecord`。
- `source_type !== 'production_batch'` 的不合格执行 `dispose(rework)` 返回 400，且不创建 `ReworkRecord`。
- 缺少 `qty` 或 `unit` 的不合格执行 `dispose(rework)` 返回 400，且不创建 `ReworkRecord`。
- `source_id` 指向的生产批次不存在或不属于当前公司时返回 400，且不创建 `ReworkRecord`。
- `ReworkRecordList.vue` 对 `quality_verdict='pending'` 显示“待判定”。
- `(cd server && npm test -- non-conformance.service.spec.ts rework-record.service.spec.ts --runInBand)` 通过。
- `(cd server && npx prisma validate --schema src/prisma/schema.prisma)` 通过。
- `npm run build:server` 通过。
- `npm run build:client` 通过。
