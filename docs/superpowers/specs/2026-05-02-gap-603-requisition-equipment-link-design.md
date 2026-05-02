# GAP-603 MaterialRequisition Equipment Link 设计

## 背景和现状

`MaterialRequisition` 是仓储模块的领料单事实表，当前通过 `requisitionType` 区分 `production`、`maintenance` 和 `other`。当 `requisitionType = maintenance` 时，业务语义是维修领料，但当前 schema 没有 `equipmentId/equipment_id` 字段，也没有到 `Equipment` 的关系。

这导致维修领料只能停留在普通库存出库记录：库存可以扣减，领料单可以审批和完成，但后续无法回答“这批维修耗材用于哪台设备”。设备台账、故障记录、保养记录和维修领料之间缺少可查询的 ID 关系，审计时只能靠备注文本或人工口径补充。

任务类型判断：GAP-603 属于 `needs_spec`。它影响 schema FK、仓储与设备模块的跨模块业务链和维修物料用量核查，必须先写轻量 spec，再写 implementation plan。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：名称只展示，ID 才关联；MaintenanceRecord、Equipment、InventoryMovement 是跨模块共享实体，不能靠备注建立事实关系。
- `docs/module-usage/05-warehouse-inventory.md`：仓储领料会影响库存移动事实源，出库必须保持批次级库存扣减与流水一致。
- `docs/module-usage/10-equipment-and-measuring.md`：
  - 设备台账链：`Equipment -> MaintenancePlan -> MaintenanceRecord`。
  - 仓储模块下游关系：`MaterialRequisition.requisitionType = 'maintenance'` 表示维修领料，但当前无 `equipmentId` 外键约束。
  - GAP-603 建议在 `MaterialRequisition` 增加可选 `equipment_id` 并关联 `Equipment`。
- `server/src/prisma/schema.prisma`：
  - `MaterialRequisition` 有 `requisitionType RequisitionType`、`targetZone`、`items`，没有设备字段。
  - `Equipment` 是设备台账事实源，已有 `maintenancePlans`、`maintenanceRecords`、`equipmentFaults` 反向关系。
  - `MaintenanceRecord` 和 `EquipmentFault` 均通过 `equipmentId` 关联 `Equipment`，说明设备域现有关系命名使用 camelCase 字段和 snake_case 映射由 Prisma 默认处理或 `@@map` 控制。
- `server/src/modules/warehouse/dto/requisition.dto.ts`：`CreateRequisitionDto` 没有 `equipmentId`，`requisitionType` 已支持 `maintenance`。
- `server/src/modules/warehouse/requisition.service.ts`：
  - `create()` 创建 `materialRequisition` 时未写设备。
  - `findAll()` 和 `findOne()` 只 include `items`，不 include 设备。
  - `complete()` 当前统一记录 `issue_to_production` 和 notes `生产领料`，本 GAP 只补关联设备，不重构库存移动类型枚举。
- `client/src/views/warehouse/RequisitionList.vue`：创建领料单弹窗只有目标区域，没有领料类型和设备选择；创建时直接 `request.post('/warehouse/requisitions', { targetZone })`。
- `client/src/api/warehouse.ts`：`Requisition` 类型没有 `requisitionType`、`equipmentId`、`equipment`、`targetZone`；`requisitionApi.create()` 类型也没有维修领料字段。
- `client/src/api/equipment.ts`：已有 `equipmentApi.getEquipmentList({ limit })`，可作为设备选择器数据源。

## 业务边界

本 GAP 只解决维修领料到设备台账的可选 FK 关联：

- `MaterialRequisition` 新增 `equipmentId String?` 和 `equipment Equipment? @relation(fields: [equipmentId], references: [id], onDelete: Restrict)`。
- `Equipment` 新增 `materialRequisitions MaterialRequisition[]` 反向关系。
- 仅当 `requisitionType = maintenance` 时，`equipmentId` 必须存在且引用未软删设备。
- 当 `requisitionType != maintenance` 时，服务端不得接受 `equipmentId`；避免生产领料或其他领料错误挂到设备台账。
- `findAll()`、`findOne()` include `equipment`，用于列表/详情展示设备编号和名称。
- 前端领料单创建弹窗提供领料类型选择；选择维修领料时显示必填设备选择器。

## 不做什么

- 不新增设备主数据表，不复制设备名称、位置或责任人字段到领料单。
- 不把 `Equipment` 改为带 `company_id` 的租户模型；设备租户隔离不是 GAP-603 范围。
- 不新增 `MaintenanceRecord -> MaterialRequisition` 或 `EquipmentFault -> MaterialRequisition` FK；本 GAP 先把维修领料锚定到设备台账。
- 不改变 `MaterialRequisitionItem -> MaterialBatch`、库存扣减、`StockRecord` 或 `InventoryMovementLedger` 的主逻辑。
- 不把现有历史 `maintenance` 领料强制回填设备；无可信来源时不能用备注猜测。
- 不实现 GAP-604 的检验记录关联量器。
- 不实现 GAP-605 的校准记录审批。
- 不修改统一审批平台的审批流定义。

## 数据、接口和页面影响

### 数据影响

- `MaterialRequisition.equipmentId` 为 nullable，避免阻塞历史数据。
- `MaterialRequisition.equipment` 通过 FK 指向 `Equipment.id`。
- `Equipment.materialRequisitions` 提供反向查询能力。
- 新增 `@@index([equipmentId])`，支持按设备查询维修领料。
- FK 删除策略为 `Restrict`：已有维修领料引用的设备不得被硬删除。业务删除设备仍应使用 `deletedAt` 软删。

### 迁移影响

本 GAP 涉及 schema migration，但不涉及历史数据回填：

1. 添加 nullable `equipmentId` 列。
2. 添加索引和 FK。
3. 不回填现有 `maintenance` 领料，因为当前记录没有可靠设备 ID。
4. 迁移后新增或更新领料单时由服务层强制校验维修领料必须选择设备。

### 接口影响

`POST /warehouse/requisitions` 增加可选字段：

```json
{
  "requisitionType": "maintenance",
  "equipmentId": "equipment-id",
  "targetZone": "小料房",
  "items": [
    { "batchId": "material-batch-id", "quantity": 1 }
  ],
  "remark": "更换筛网"
}
```

服务端行为：

- `requisitionType = maintenance` 且缺少 `equipmentId`：返回 400，不创建领料单。
- `requisitionType = maintenance` 且 `equipmentId` 不存在或设备已软删：返回 400，不创建领料单。
- `requisitionType = production` 或 `other` 且传入 `equipmentId`：返回 400，不创建领料单。
- 不传 `requisitionType` 时保留现有默认值 `production`，兼容旧调用方。
- `GET /warehouse/requisitions` 和 `GET /warehouse/requisitions/:id` 返回 `equipment` 摘要，至少包含 `id`、`code`、`name`、`status`。

### 页面影响

- `client/src/views/warehouse/RequisitionList.vue` 创建弹窗新增领料类型 select。
- 当类型为 `maintenance` 时，显示设备选择器，数据源为 `equipmentApi.getEquipmentList({ limit: 500 })`。
- 领料单列表新增“类型”和“设备”列；维修领料展示设备编号/名称，其他类型展示 `-`。
- 前端只做交互约束；服务端仍是最终校验点。

## 历史数据和迁移策略

本 GAP 不回填历史数据。

- 历史 `MaterialRequisition.requisitionType = maintenance` 记录的 `equipmentId` 保持 `null`。
- 不从 `remark`、`targetZone`、审批标题或库存流水里猜测设备，因为这些文本不是设备事实源。
- 新创建记录开始强制：维修领料必须选择设备，非维修领料不得携带设备。
- 如果业务以后要求补齐历史维修领料对应设备，应另开数据治理任务，由业务提供可靠映射表后再迁移。

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** GAP-603 当前是 `needs_spec`，本 spec 按 `using-superpowers -> brainstorming -> grill-with-docs` 流程产出，后续 plan 按 `writing-plans` 产出。
- **brainstorming 结论：** 推荐方案是在 `MaterialRequisition` 上新增可选设备 FK，并用服务层规则约束 `maintenance` 必填、非维修禁止传入；不选择仅备注记录设备，也不选择直接绑定 MaintenanceRecord/EquipmentFault。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化“ID 才关联”。
  - 不重复造主数据；继续复用 `Equipment` 作为设备台账事实源。
  - 不引入平行批次链路。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；只给维修领料增加设备锚点。
  - 需要 schema migration，但不需要历史数据回填。
  - 不需要新的业务确认；GAP-603 已在模块文档中验证为 schema 层面缺口。
  - 可拆成独立 schema/API/frontend PR。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `MaterialRequisition` 有可选 `equipmentId` relation 到 `Equipment.id`。
- `Equipment` 有 `materialRequisitions` 反向关系。
- migration 添加 nullable 设备列、索引和 FK，不回填历史数据。
- `CreateRequisitionDto` 支持可选 `equipmentId`，并保持 `requisitionType` 兼容旧默认值。
- `RequisitionService.create()` 校验维修领料必须关联未软删设备。
- `RequisitionService.create()` 拒绝非维修领料携带 `equipmentId`。
- `findAll()` 和 `findOne()` 返回设备摘要。
- 前端创建维修领料时可选择设备，提交 payload 包含 `requisitionType: 'maintenance'` 和 `equipmentId`。
- 前端创建生产/其他领料时不提交 `equipmentId`。
- `cd server && npx prisma validate --schema src/prisma/schema.prisma` 通过。
- `cd server && npm test -- requisition.service.spec.ts --runInBand` 通过。
- `npm run build:client` 通过。
- 当前仓库未配置根级 GAP-603 E2E 脚本；如执行 agent 添加 E2E，用 `npm run test:e2e -w client -- --grep GAP-603`，不得使用 pnpm。
