# 仓库管理系统 - TASKS.md

> **来源**: docs/design/layer1_核心生产/12_仓库管理系统.md
> **模块分类**: Layer 1 核心生产
> **实现状态**: ⏳ 未实现（PRD + LLD 已完成）
> **优先级**: ⭐⭐⭐ 最高（Phase B 核心生产）
> **依赖**: 动态表单引擎、批次追溯系统、移动端应用

---

## 任务统计

| 统计项 | 数量 |
|--------|------|
| **总任务数** | 28 |
| **数据模型任务** | 7 |
| **后端 API 任务** | 10 |
| **前端 UI 任务** | 7 |
| **测试任务** | 4 |
| **预计总工时** | 480h |

---

## 任务列表

### 一、数据模型（7 个任务，120h）

#### TASK-181: 物料基础表设计（16h）

**任务描述**:
- 创建 Material 表（物料基础信息）
- 创建 MaterialCategory 表（物料分类）
- 定义物料属性：编码、名称、规格、单位、分类、保质期、安全库存
- 支持自定义字段（JSON）
- 添加索引：materialCode、categoryId

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 索引创建成功（materialCode UNIQUE、categoryId）
- [ ] 种子数据包含常见物料（面粉、鸡蛋、糖等）
- [ ] 支持扩展字段（customFields JSON）

**依赖**: 无

**相关文件**:
- `server/src/prisma/schema.prisma`
- `server/src/prisma/seed.ts`

---

#### TASK-182: 物料批次表设计（20h）

**任务描述**:
- 创建 MaterialBatch 表（物料批次）
- 定义批次属性：批次号、供应商批次号、生产日期、到期日期、保质期、库存数量、条形码
- 批次状态：normal（正常）、expired（过期）、locked（锁定）
- 支持 FIFO（先进先出）排序

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 批次号唯一约束（@unique）
- [ ] 外键约束：materialId → Material（onDelete: Restrict）
- [ ] 索引：batchNumber、expiryDate、status
- [ ] 过期物料自动锁定逻辑（定时任务）

**依赖**: TASK-181

**技术要点**:
- 使用 Prisma Transaction + SELECT FOR UPDATE 保证批次号唯一性
- expiryDate 索引用于过期物料查询
- onDelete: Restrict 防止误删除有库存的批次

**相关文件**:
- `server/src/prisma/schema.prisma`
- `server/src/modules/warehouse/batch.service.ts`

---
#### TASK-183: 库存记录表设计（16h）

**任务描述**:
- 创建 StockRecord 表（库存流水）
- 定义记录类型：in（入库）、out（出库）、return（退料）、scrap（报废）
- 记录字段：批次ID、数量、类型、关联单据ID、操作人、操作时间、备注
- 支持追溯：每笔出入库都有源头单据

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 外键约束：batchId → MaterialBatch（onDelete: Restrict）
- [ ] 索引：batchId、recordType、createdAt
- [ ] 种子数据包含典型入库/出库记录

**依赖**: TASK-182

**相关文件**:
- `server/src/prisma/schema.prisma`

---

#### TASK-184: 领料单表设计（20h）

**任务描述**:
- 创建 MaterialRequisition 表（领料单）
- 创建 MaterialRequisitionItem 表（领料明细）
- 领料单状态：draft（草稿）、pending（待审批）、approved（已审批）、rejected（已驳回）、completed（已完成）
- 领料类型：production（生产领料）、maintenance（维修领料）、other（其他）
- 支持审批流程（工作流引擎）

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 外键约束：requisitionId → MaterialRequisition（onDelete: Cascade）
- [ ] 外键约束：batchId → MaterialBatch（onDelete: Restrict）
- [ ] 索引：status、createdAt、requisitionType
- [ ] 领料明细支持多批次（同一物料可选多个批次）

**依赖**: TASK-182

**技术要点**:
- 领料明细的批次选择遵循 FIFO 规则（前端推荐最旧批次）
- 审批通过后自动扣减库存（Prisma Transaction）
- 领料单删除时明细自动删除（Cascade）

**相关文件**:
- `server/src/prisma/schema.prisma`
- `server/src/modules/warehouse/requisition.service.ts`

---

#### TASK-185: 供应商表设计（16h）

**任务描述**:
- 创建 Supplier 表（供应商）
- 创建 SupplierQualification 表（供应商资质）
- 供应商属性：编码、名称、联系人、电话、地址、状态
- 资质属性：资质类型、证书编号、有效期、附件

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 供应商编码唯一约束（@unique）
- [ ] 外键约束：supplierId → Supplier（onDelete: Cascade）
- [ ] 索引：supplierCode、status
- [ ] 种子数据包含 2-3 个典型供应商

**依赖**: 无

**相关文件**:
- `server/src/prisma/schema.prisma`
- `server/src/prisma/seed.ts`

---

#### TASK-186: 暂存间管理表设计（16h）

**任务描述**:
- 创建 StagingAreaStock 表（暂存间库存）
- 创建 StagingAreaRecord 表（暂存间盘点记录）
- 暂存间库存：批次ID、数量、位置
- 盘点记录：盘点类型（期初/期末）、盘点数量、盘点人、盘点时间

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 外键约束：batchId → MaterialBatch（onDelete: Restrict）
- [ ] 索引：batchId、recordType、createdAt
- [ ] 支持每日盘点（期初/期末）

**依赖**: TASK-182

**技术要点**:
- 期初盘点记录上一班次的期末数量
- 期末盘点计算实际消耗：期初 + 领料 - 期末

**相关文件**:
- `server/src/prisma/schema.prisma`

---

#### TASK-187: 物料平衡表设计（16h）

**任务描述**:
- 创建 MaterialBalance 表（物料平衡记录）
- 记录字段：生产批次ID、物料ID、期初数量、领料数量、期末数量、实际消耗、理论消耗、偏差率
- 偏差率 = (实际消耗 - 理论消耗) / 理论消耗 × 100%
- 偏差 > 5% 时标记为异常

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 外键约束：productionBatchId → ProductionBatch（onDelete: Restrict）
- [ ] 索引：productionBatchId、materialId、deviationRate
- [ ] 支持偏差预警（deviation > 5%）

**依赖**: TASK-182

**技术要点**:
- 理论消耗 = 配方用量 × 产量
- 实际消耗 = 期初 + 领料 - 期末

**相关文件**:
- `server/src/prisma/schema.prisma`
- `server/src/modules/warehouse/balance.service.ts`

---

### 二、后端 API（10 个任务，180h）

#### TASK-188: 物料管理 CRUD API（16h）

**任务描述**:
- 实现物料创建、查询、更新、删除 API
- 支持分页、搜索、筛选（按分类、状态）
- 支持批量导入物料（Excel）

**验收标准**:
- [ ] POST /api/v1/materials - 创建物料
- [ ] GET /api/v1/materials - 分页查询物料
- [ ] GET /api/v1/materials/:id - 查询物料详情
- [ ] PUT /api/v1/materials/:id - 更新物料
- [ ] DELETE /api/v1/materials/:id - 删除物料（软删除）
- [ ] POST /api/v1/materials/import - 批量导入（Excel）
- [ ] 所有 API 有异常处理

**依赖**: TASK-181

**相关文件**:
- `server/src/modules/warehouse/material.controller.ts`
- `server/src/modules/warehouse/material.service.ts`
- `server/src/modules/warehouse/dto/material.dto.ts`

---

#### TASK-189: 批次管理 CRUD API（20h）

**任务描述**:
- 实现批次创建、查询、更新、锁定 API
- 支持过期批次自动锁定（定时任务）
- 支持 FIFO 推荐（获取最旧批次）

**验收标准**:
- [ ] POST /api/v1/batches - 创建批次
- [ ] GET /api/v1/batches - 分页查询批次（支持过滤过期/锁定批次）
- [ ] GET /api/v1/batches/:id - 查询批次详情
- [ ] PUT /api/v1/batches/:id - 更新批次
- [ ] PUT /api/v1/batches/:id/lock - 锁定批次
- [ ] GET /api/v1/batches/fifo?materialId=xxx - 获取最旧批次（FIFO）
- [ ] 定时任务：每日检查过期批次并锁定

**依赖**: TASK-182

**技术要点**:
- FIFO 排序：ORDER BY expiryDate ASC, createdAt ASC
- 定时任务使用 @nestjs/schedule

**相关文件**:
- `server/src/modules/warehouse/batch.controller.ts`
- `server/src/modules/warehouse/batch.service.ts`
- `server/src/modules/warehouse/batch.scheduler.ts`

---

#### TASK-190: 领料单管理 API（24h）

**任务描述**:
- 实现领料单创建、提交审批、审批、完成 API
- 支持领料明细批次选择（FIFO 推荐）
- 审批通过后自动扣减仓库库存、增加暂存间库存

**验收标准**:
- [ ] POST /api/v1/requisitions - 创建领料单（草稿）
- [ ] PUT /api/v1/requisitions/:id - 更新领料单
- [ ] POST /api/v1/requisitions/:id/submit - 提交审批
- [ ] POST /api/v1/requisitions/:id/approve - 审批通过
- [ ] POST /api/v1/requisitions/:id/reject - 审批驳回
- [ ] POST /api/v1/requisitions/:id/complete - 完成领料（扣减库存）
- [ ] 库存扣减使用 Prisma Transaction
- [ ] 库存不足时禁止完成

**依赖**: TASK-184

**技术要点**:
- 使用 Prisma Transaction 保证库存扣减原子性
- 扣减逻辑：仓库库存 -、暂存间库存 +、StockRecord +
- 集成工作流引擎（审批流程）

**相关文件**:
- `server/src/modules/warehouse/requisition.controller.ts`
- `server/src/modules/warehouse/requisition.service.ts`

---
#### TASK-191: 供应商管理 API（16h）

**任务描述**:
- 实现供应商创建、查询、更新、停用 API
- 实现供应商资质管理 API
- 支持资质到期提醒

**验收标准**:
- [ ] POST /api/v1/suppliers - 创建供应商
- [ ] GET /api/v1/suppliers - 分页查询供应商
- [ ] PUT /api/v1/suppliers/:id - 更新供应商
- [ ] PUT /api/v1/suppliers/:id/disable - 停用供应商
- [ ] POST /api/v1/suppliers/:id/qualifications - 添加资质
- [ ] GET /api/v1/suppliers/:id/qualifications - 查询资质列表
- [ ] 定时任务：资质到期前 30 天提醒

**依赖**: TASK-185

**相关文件**:
- `server/src/modules/warehouse/supplier.controller.ts`
- `server/src/modules/warehouse/supplier.service.ts`

---

#### TASK-192: 暂存间盘点 API（20h）

**任务描述**:
- 实现暂存间期初盘点、期末盘点 API
- 计算实际消耗：期初 + 领料 - 期末
- 支持盘点记录查询

**验收标准**:
- [ ] POST /api/v1/staging/opening - 期初盘点
- [ ] POST /api/v1/staging/closing - 期末盘点
- [ ] GET /api/v1/staging/records - 查询盘点记录
- [ ] GET /api/v1/staging/stock - 查询暂存间当前库存
- [ ] 自动计算实际消耗并记录

**依赖**: TASK-186

**技术要点**:
- 期初盘点自动读取上一班次的期末数量
- 期末盘点计算消耗并生成报告

**相关文件**:
- `server/src/modules/warehouse/staging.controller.ts`
- `server/src/modules/warehouse/staging.service.ts`

---

#### TASK-193: 物料平衡校验 API（24h）

**任务描述**:
- 实现物料平衡校验逻辑
- 计算偏差率：(实际消耗 - 理论消耗) / 理论消耗 × 100%
- 偏差 > 5% 时生成预警通知

**验收标准**:
- [ ] POST /api/v1/balance/check - 执行物料平衡校验
- [ ] GET /api/v1/balance/records - 查询平衡记录
- [ ] GET /api/v1/balance/alerts - 查询偏差预警
- [ ] 偏差 > 5% 时自动生成通知（集成通知系统）

**依赖**: TASK-187

**技术要点**:
- 理论消耗 = 配方用量 × 产量
- 实际消耗 = 期初 + 领料 - 期末
- 集成通知系统发送预警

**相关文件**:
- `server/src/modules/warehouse/balance.controller.ts`
- `server/src/modules/warehouse/balance.service.ts`

---

#### TASK-194: 批次追溯 API（20h）

**任务描述**:
- 实现反向追溯：成品批次 → 生产批次 → 原料批次 → 供应商
- 实现正向追溯：供应商批次 → 原料批次 → 生产批次 → 成品批次
- 追溯报告生成（PDF）

**验收标准**:
- [ ] POST /api/v1/traceability/backward - 反向追溯
- [ ] POST /api/v1/traceability/forward - 正向追溯
- [ ] GET /api/v1/traceability/report/:id - 生成追溯报告（PDF）
- [ ] 追溯时间 < 4 小时（满足 BRCGS 要求）
- [ ] 报告包含完整链路：批次号、数量、时间、操作人

**依赖**: TASK-182, TASK-183

**技术要点**:
- 使用递归查询或 CTE（Common Table Expression）优化追溯性能
- 追溯报告使用 pdfmake 生成

**相关文件**:
- `server/src/modules/warehouse/traceability.controller.ts`
- `server/src/modules/warehouse/traceability.service.ts`

---

#### TASK-195: 退料单管理 API（16h）

**任务描述**:
- 实现退料单创建、审批、完成 API
- 退料完成后自动增加仓库库存

**验收标准**:
- [ ] POST /api/v1/returns - 创建退料单
- [ ] POST /api/v1/returns/:id/approve - 审批通过
- [ ] POST /api/v1/returns/:id/complete - 完成退料（增加库存）
- [ ] 库存增加使用 Prisma Transaction

**依赖**: TASK-182

**相关文件**:
- `server/src/modules/warehouse/return.controller.ts`
- `server/src/modules/warehouse/return.service.ts`

---

#### TASK-196: 报废单管理 API（16h）

**任务描述**:
- 实现报废单创建、审批、完成 API
- 报废完成后自动扣减库存、记录报废原因

**验收标准**:
- [ ] POST /api/v1/scraps - 创建报废单
- [ ] POST /api/v1/scraps/:id/approve - 审批通过
- [ ] POST /api/v1/scraps/:id/complete - 完成报废（扣减库存）
- [ ] 报废记录归档（不可删除）

**依赖**: TASK-182

**相关文件**:
- `server/src/modules/warehouse/scrap.controller.ts`
- `server/src/modules/warehouse/scrap.service.ts`

---

#### TASK-197: 物料入库 API（20h）

**任务描述**:
- 实现物料入库单创建、审批、完成 API
- 入库完成后自动创建 MaterialBatch、增加库存

**验收标准**:
- [ ] POST /api/v1/inbound - 创建入库单
- [ ] POST /api/v1/inbound/:id/approve - 审批通过
- [ ] POST /api/v1/inbound/:id/complete - 完成入库（创建批次 + 增加库存）
- [ ] 自动生成批次号（系统规则）
- [ ] 记录供应商批次号

**依赖**: TASK-182

**技术要点**:
- 使用 Prisma Transaction 保证批次创建 + 库存增加的原子性
- 批次号生成规则：MAT-{物料编号}-{YYYYMMDD}-{序号}

**相关文件**:
- `server/src/modules/warehouse/inbound.controller.ts`
- `server/src/modules/warehouse/inbound.service.ts`

---

### 三、前端 UI（7 个任务，120h）

#### TASK-198: 物料管理页面（16h）

**任务描述**:
- 实现物料列表页面（搜索、筛选、分页）
- 实现物料创建/编辑对话框
- 实现物料详情页面
- 支持批量导入物料（Excel）

**验收标准**:
- [ ] 物料列表显示：编码、名称、规格、单位、分类、安全库存、状态
- [ ] 支持按名称/编码搜索、按分类/状态筛选
- [ ] 创建/编辑对话框表单验证正确
- [ ] 批量导入功能可用（上传 Excel → 预览 → 确认导入）
- [ ] 删除物料时确认对话框

**依赖**: TASK-188

**相关文件**:
- `client/src/views/warehouse/MaterialList.vue`
- `client/src/views/warehouse/MaterialForm.vue`
- `client/src/api/warehouse.ts`

---

#### TASK-199: 批次管理页面（20h）

**任务描述**:
- 实现批次列表页面（支持过滤过期/锁定批次）
- 实现批次详情页面（显示库存流水）
- 支持批次锁定/解锁操作
- 显示 FIFO 推荐批次

**验收标准**:
- [ ] 批次列表显示：批次号、物料名称、生产日期、到期日期、库存数量、状态
- [ ] 过期批次标红显示
- [ ] 锁定批次显示锁定图标
- [ ] 批次详情显示完整库存流水（入库、出库、退料、报废）
- [ ] FIFO 推荐批次排序正确（最旧批次优先）

**依赖**: TASK-189

**相关文件**:
- `client/src/views/warehouse/BatchList.vue`
- `client/src/views/warehouse/BatchDetail.vue`

---

#### TASK-200: 领料单管理页面（24h）

**任务描述**:
- 实现领料单列表页面
- 实现领料单创建/编辑页面（支持多批次选择）
- 实现领料单审批对话框
- 实现领料单完成确认对话框

**验收标准**:
- [ ] 领料单列表显示：单号、类型、申请人、状态、申请时间
- [ ] 创建领料单时支持选择多个批次（FIFO 推荐）
- [ ] 审批对话框显示领料明细、审批意见输入
- [ ] 完成确认对话框显示库存扣减明细
- [ ] 状态流转正确：草稿 → 待审批 → 已审批 → 已完成

**依赖**: TASK-190

**技术要点**:
- 批次选择组件复用（支持 FIFO 排序）
- 审批对话框集成工作流引擎

**相关文件**:
- `client/src/views/warehouse/RequisitionList.vue`
- `client/src/views/warehouse/RequisitionForm.vue`
- `client/src/components/BatchSelector.vue`

---

#### TASK-201: 供应商管理页面（16h）

**任务描述**:
- 实现供应商列表页面
- 实现供应商创建/编辑对话框
- 实现供应商资质管理页面

**验收标准**:
- [ ] 供应商列表显示：编码、名称、联系人、电话、状态
- [ ] 创建/编辑对话框表单验证正确
- [ ] 资质管理页面显示资质列表、到期提醒
- [ ] 停用供应商时确认对话框

**依赖**: TASK-191

**相关文件**:
- `client/src/views/warehouse/SupplierList.vue`
- `client/src/views/warehouse/SupplierForm.vue`
- `client/src/views/warehouse/SupplierQualification.vue`

---

#### TASK-202: 暂存间盘点页面（20h）

**任务描述**:
- 实现暂存间库存页面
- 实现期初盘点页面
- 实现期末盘点页面
- 实现盘点记录页面

**验收标准**:
- [ ] 暂存间库存显示：批次号、物料名称、数量、位置
- [ ] 期初盘点页面自动加载上一班次期末数量
- [ ] 期末盘点页面自动计算实际消耗
- [ ] 盘点记录显示：盘点类型、数量、盘点人、时间

**依赖**: TASK-192

**相关文件**:
- `client/src/views/warehouse/StagingStock.vue`
- `client/src/views/warehouse/StagingOpening.vue`
- `client/src/views/warehouse/StagingClosing.vue`

---

#### TASK-203: 物料平衡报告页面（16h）

**任务描述**:
- 实现物料平衡记录列表页面
- 实现物料平衡详情页面
- 实现偏差预警列表页面

**验收标准**:
- [ ] 平衡记录列表显示：生产批次、物料名称、实际消耗、理论消耗、偏差率
- [ ] 偏差 > 5% 时标红显示
- [ ] 详情页面显示完整计算过程：期初 + 领料 - 期末 = 实际消耗
- [ ] 预警列表显示高偏差记录

**依赖**: TASK-193

**相关文件**:
- `client/src/views/warehouse/BalanceList.vue`
- `client/src/views/warehouse/BalanceDetail.vue`

---

#### TASK-204: 批次追溯页面（24h）

**任务描述**:
- 实现批次追溯查询页面
- 实现追溯结果可视化（流程图）
- 实现追溯报告下载（PDF）

**验收标准**:
- [ ] 追溯查询页面支持输入成品批次号或原料批次号
- [ ] 追溯结果以流程图形式展示（Mermaid 或 ECharts）
- [ ] 流程图显示完整链路：供应商 → 原料 → 生产 → 成品 → 客户
- [ ] 支持下载追溯报告（PDF）

**依赖**: TASK-194

**技术要点**:
- 使用 Mermaid 或 ECharts 绘制追溯流程图
- 追溯报告 PDF 由后端生成，前端下载

**相关文件**:
- `client/src/views/warehouse/Traceability.vue`
- `client/src/components/TraceabilityGraph.vue`

---

### 四、测试（4 个任务，60h）

#### TASK-205: 批次管理单元测试（16h）

**任务描述**:
- 测试批次创建、锁定、FIFO 推荐逻辑
- 测试过期批次自动锁定定时任务
- 测试批次号唯一性约束

**验收标准**:
- [ ] 批次创建成功测试
- [ ] 批次号重复报错测试
- [ ] FIFO 推荐排序正确测试
- [ ] 过期批次自动锁定测试
- [ ] 单元测试覆盖率 > 85%

**依赖**: TASK-189

**相关文件**:
- `server/src/modules/warehouse/batch.service.spec.ts`

---

#### TASK-206: 领料单集成测试（16h）

**任务描述**:
- 测试领料单创建、审批、完成流程
- 测试库存扣减事务（成功/失败回滚）
- 测试库存不足时的错误处理

**验收标准**:
- [ ] 领料单完整流程测试（草稿 → 审批 → 完成）
- [ ] 库存扣减事务成功测试
- [ ] 库存扣减失败时回滚测试
- [ ] 库存不足时禁止完成测试
- [ ] 集成测试覆盖率 > 80%

**依赖**: TASK-190

**相关文件**:
- `server/src/modules/warehouse/requisition.service.spec.ts`

---

#### TASK-207: 批次追溯性能测试（16h）

**任务描述**:
- 测试批次追溯查询性能（< 4 小时要求）
- 测试大数据量下的追溯性能
- 测试追溯报告生成时间

**验收标准**:
- [ ] 单批次追溯时间 < 5 秒（满足 4 小时要求）
- [ ] 10 层追溯深度时查询时间 < 10 秒
- [ ] 追溯报告 PDF 生成时间 < 3 秒
- [ ] 性能测试通过

**依赖**: TASK-194

**相关文件**:
- `server/src/modules/warehouse/traceability.service.spec.ts`

---

#### TASK-208: 仓库管理 E2E 测试（12h）

**任务描述**:
- 测试物料入库 → 领料 → 暂存间盘点 → 物料平衡完整流程
- 测试批次追溯完整流程

**验收标准**:
- [ ] 物料入库流程 E2E 测试通过
- [ ] 领料流程 E2E 测试通过
- [ ] 暂存间盘点流程 E2E 测试通过
- [ ] 物料平衡校验流程 E2E 测试通过
- [ ] 批次追溯流程 E2E 测试通过

**依赖**: TASK-197, TASK-190, TASK-192, TASK-193, TASK-194

**相关文件**:
- `e2e/warehouse.spec.ts`

---

## 实施说明

### 关键技术点

1. **FIFO 规则实现**:
   - 领料时推荐最旧批次：ORDER BY expiryDate ASC, createdAt ASC
   - 前端默认选中 FIFO 推荐批次

2. **库存事务安全**:
   - 所有库存变更使用 Prisma Transaction
   - 使用 SELECT FOR UPDATE 防止并发冲突

3. **批次追溯优化**:
   - 使用递归查询或 CTE 优化追溯性能
   - 追溯结果缓存（Redis）

4. **过期物料管理**:
   - 定时任务每日检查过期批次并锁定
   - 锁定批次前端禁止选择

5. **物料平衡校验**:
   - 偏差率 = (实际消耗 - 理论消耗) / 理论消耗 × 100%
   - 偏差 > 5% 时自动生成预警通知

### 依赖关系

```
TASK-181 (物料表) → TASK-182 (批次表) → TASK-183 (库存记录表)
                                      → TASK-184 (领料单表)
                                      → TASK-186 (暂存间表)
                                      → TASK-187 (物料平衡表)

TASK-185 (供应商表) → TASK-197 (物料入库 API)

TASK-188 ~ TASK-197 (后端 API) → TASK-198 ~ TASK-204 (前端 UI) → TASK-205 ~ TASK-208 (测试)
```

### 实施顺序建议

1. **Phase 1 - 基础数据模型**（80h）: TASK-181 ~ TASK-187
2. **Phase 2 - 核心 API**（120h）: TASK-188 ~ TASK-197
3. **Phase 3 - 前端界面**（120h）: TASK-198 ~ TASK-204
4. **Phase 4 - 测试验证**（60h）: TASK-205 ~ TASK-208

---

**文档版本**: 1.0
**最后更新**: 2026-02-14
**任务总数**: 28
**预计总工时**: 480h
