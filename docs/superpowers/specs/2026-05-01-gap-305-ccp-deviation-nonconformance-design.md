# GAP-305 CCP Deviation NonConformance 设计

## 背景和现状

`CCPRecord` 是生产批次放行证据链中的关键记录。`docs/module-usage/07-quality-qc-release.md` 已明确：当 `CCPRecord.is_within_cl = false` 时，应进入 `NonConformance` 闭环，而不是只把偏差停留在 CCP 记录自身。

当前系统已经具备两端事实源：

- `CCPRecord` 强制关联 `ProductionBatch` 和 `CCPPoint`。
- `NonConformance` 已作为质量异常主表，使用 `source_type + source_id` 关联来源批次。
- GAP-304 已完成 JWT `companyId` 在 CCP / NonConformance / CAPA / 投诉 / 返工链路的写入与过滤，自动联动可以沿用当前租户边界。

缺口在于 `CcpService.createRecord()` 只创建 CCP 记录，不会在偏离临界限时创建不合格记录。操作员必须手动再去不合格品模块登记，存在漏报和批次放行证据断链风险。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：过程与放行链为 `ProductionBatch -> CCPRecord / EnvironmentRecord / ProcessMonitorRecord / MetalDetectionLog / ReworkRecord / Sample`；CAPA/不合格/返工应使用 `source_type + source_id`，不能只存备注描述。
- `docs/module-usage/07-quality-qc-release.md`：GAP-305 已验证，建议在 `CCPRecord` 创建时，若 `is_within_cl=false`，自动创建 `NonConformance`。
- `docs/module-usage/09-nonconformance-capa.md`：`NonConformance.source_type` 当前业务枚举为 `material_batch | production_batch | product`，上游批次来源应优先回到 `ProductionBatch` 或 `MaterialBatch`。
- `server/src/prisma/schema.prisma`：
  - `CCPRecord.production_batch_id` 为必填 FK，指向 `ProductionBatch.id`。
  - `CCPRecord.ccp_point_id` 为必填 FK，指向 `CCPPoint.id`。
  - `NonConformance` 有 `company_id`、`nc_no`、`source_type`、`source_id`、`nc_type`、`description`、`status` 等字段，并有 `@@index([company_id, source_type, source_id])`。
- `server/src/modules/ccp/ccp.service.ts`：`createRecord()` 直接调用 `prisma.cCPRecord.create()`，无事务、无 NonConformance 联动。
- `server/src/modules/non-conformance/non-conformance.service.ts`：`create()` 按 `company_id` 计数生成 `nc_no` 并写入不合格；没有 CCP 专用触发方法。
- `client/src/api/non-conformance.ts` 和 `NonConformanceList.vue`：前端类型和表单只识别 `material_batch | production_batch | product`。

## 业务边界

本 GAP 只补齐 CCP 偏差到不合格主表的自动联动：

- 当 `CreateCcpRecordDto.is_within_cl === false` 时，系统必须在同一事务中创建一条 `NonConformance`。
- 自动创建的不合格记录使用：
  - `source_type = 'production_batch'`
  - `source_id = CCPRecord.production_batch_id`
  - `nc_type = 'ccp_deviation'`
  - `description` 包含 CCP 编号、实测值/文本、单位和偏差处置措施，便于追溯到具体 CCP 记录。
- 自动记录的 `company_id` 必须来自当前 JWT `req.user.companyId`。
- 自动记录的 `discovered_by` 使用创建 CCP 记录的 `operatorId`。
- 如果 CCP 记录创建失败，不得创建不合格记录；如果不合格记录创建失败，CCP 记录也必须回滚。

这保持 `NonConformance` 为唯一不合格事实源，`CCPRecord` 仍是过程监控事实源。

## 不做什么

- 不新增 `NonConformance.source_type = 'ccp_record'`，避免与当前非合格模块文档、前端类型和 GAP-313 的多态校验范围冲突。
- 不新增 `ccp_record_id` 字段或 Prisma relation；本 GAP 无 schema/migration。
- 不实现完整批次放行状态机，不修改 `ProductionBatch.status` 或放行字段。
- 不处理 `EnvironmentRecord.is_within_spec=false` 自动触发不合格；该路径应单独分诊。
- 不修改 `CcpService.findMissingCCPs` 的产品/配方过滤；这是 GAP-303。
- 不修复 `NonConformance.nc_no` 的并发编号问题；这是 GAP-314。
- 不自动创建 CAPA 或 ReworkRecord；CAPA 来源校验是 GAP-316，rework 联动是 GAP-315。
- 不改前端新建不合格品表单的来源类型范围。

## 数据、接口和页面影响

### 数据影响

- 不改 Prisma schema，不新增 migration。
- 新增数据行为：偏差 CCP 记录会自动产生一条 `NonConformance`。
- 既有 `CCPRecord` 和 `NonConformance` 历史数据保持不变，不回填历史偏差。

### 接口影响

- `POST /ccp/records` 入参保持不变。
- `is_within_cl=true` 时，返回行为保持现状。
- `is_within_cl=false` 时，服务层在同一事务内额外写入 `NonConformance`。接口可继续返回 CCP 记录；是否在响应中附带创建出的 NC 不作为本 GAP 验收要求，避免前端合同扩大。
- `GET /non-conformances` 能看到自动创建的不合格记录，状态为 `open`。

### 页面影响

- 不要求改 CCP 页面和不合格品页面。
- 偏差提交后，操作员可以在不合格品列表中看到自动生成的记录。
- 若执行 agent 选择增加成功提示或跳转入口，必须先回报主 agent，因为这超出本计划范围。

## 历史数据和迁移策略

不涉及 schema 和历史数据迁移。

本 GAP 不回填历史 `CCPRecord.is_within_cl=false` 的记录。原因是历史偏差是否已经由人工创建了 `NonConformance` 无法从现有数据可靠判断，自动回填可能重复生成质量异常。若业务需要补历史闭环，应另开数据修复任务，先按批次和 CCP 记录人工确认。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-305 是 `needs_spec`，影响跨模块质量异常闭环，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐在 `CcpService.createRecord()` 事务内创建 `CCPRecord` 和 `NonConformance`，而不是用前端二次调用或后置人工提醒。原因是偏差和质量异常必须原子一致，不能依赖用户记得登记。
- **方案取舍：**
  - 推荐方案：`source_type='production_batch'`，`source_id=production_batch_id`，`description` 记录 CCP 证据。优点是符合当前不合格模块来源枚举和追溯批次主链；缺点是精确 CCPRecord ID 只能通过描述定位。
  - 备选方案：新增 `source_type='ccp_record'`。优点是精确指向 CCP 记录；缺点是会扩大前端类型、模块文档和 GAP-313 来源校验范围，本 GAP 不采用。
  - 备选方案：事件总线异步触发。优点是模块解耦；缺点是当前需求要求闭环不可漏报，异步失败会造成 CCP 与 NC 不一致，本 GAP不采用。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化 `ProductionBatch -> CCPRecord -> NonConformance` 的放行异常闭环。
  - 不重复创建主数据或事实源；继续复用 `CCPRecord` 和 `NonConformance`。
  - 不引入平行批次链路；不合格来源继续锚定 `ProductionBatch`。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；本 GAP 只在质量治理层建立自动记录。
  - 不需要迁移历史数据；历史偏差不自动回填。
  - 不需要新的业务确认；模块文档和 gap register 已确认功能缺失与整改方向。
  - 可拆成独立小 PR：只涉及 CCP service/module、NonConformance service 的内部方法和 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- `CcpService.createRecord()` 在 `is_within_cl=false` 时使用 `prisma.$transaction` 原子写入 CCP 记录和不合格记录。
- 自动创建的 `NonConformance` 使用当前 JWT companyId，不写死公司 ID。
- 自动创建的 `NonConformance.source_type` 为 `production_batch`，`source_id` 为 CCP 记录的 `production_batch_id`。
- 自动创建的 `NonConformance.nc_type` 为 `ccp_deviation`，`status` 保持默认 `open`。
- 自动创建的 `NonConformance.description` 至少包含 CCP 编号或 CCP point ID、实测值/文本和偏差处置措施。
- `is_within_cl=true` 时不创建不合格记录。
- 如果不合格记录创建失败，CCP 记录创建必须回滚。
- `server/src/modules/ccp/ccp.service.spec.ts` 覆盖正常记录、偏差自动触发、事务回滚。
- `server/src/modules/non-conformance/non-conformance.service.spec.ts` 覆盖 CCP 偏差创建辅助方法。
- `npm test -- ccp.service.spec.ts non-conformance.service.spec.ts --runInBand` 通过。
- `npm run build:server` 通过，或执行 agent 明确说明当前仓库没有该脚本并提供替代验证。
