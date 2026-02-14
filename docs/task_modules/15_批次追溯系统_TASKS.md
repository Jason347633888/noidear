# 批次追溯系统（BRCGS 核心） - Task 分解

> **来源**: docs/design/layer0_核心架构/11_批次追溯系统.md  
> **总工作量**: 400h  
> **优先级**: P0（BRCGS 认证核心）  
> **依赖**: 动态表单引擎（TASK-127）、仓库管理系统

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 5 | 40h |
| 后端 API | 8 | 128h |
| 前端 UI | 6 | 96h |
| 测试 | 5 | 136h |
| **总计** | **24** | **400h** |

---

## TASK-157: 创建原料批次数据模型

**类型**: 数据模型
**工作量**: 8h
**优先级**: P0
**依赖**: 无

**描述**: 创建 MaterialBatch 表（原料批次）。

**验收标准**:
- [ ] Prisma Schema 完成
- [ ] 批次号唯一索引（@unique）
- [ ] 外键约束（onDelete: Restrict）
- [ ] 关联仓库管理系统

**相关文件**:
- server/src/prisma/schema.prisma

---

## TASK-158: 创建生产批次数据模型

**类型**: 数据模型
**工作量**: 8h
**优先级**: P0
**依赖**: 无

**描述**: 创建 ProductionBatch 表（生产批次，核心追溯表）。

**验收标准**:
- [ ] Prisma Schema 完成
- [ ] 批次号唯一索引
- [ ] 外键约束（onDelete: Restrict）
- [ ] 关联产品和配方信息

**相关文件**:
- server/src/prisma/schema.prisma

---

## TASK-159: 创建批次物料使用数据模型

**类型**: 数据模型
**工作量**: 8h
**优先级**: P0（追溯链核心）
**依赖**: TASK-157, TASK-158

**描述**: 创建 BatchMaterialUsage 表（关联原料批次和生产批次）。

**验收标准**:
- [ ] Prisma Schema 完成
- [ ] 外键约束（materialBatch, productionBatch）
- [ ] 复合唯一索引
- [ ] onDelete: Restrict（保证追溯链完整性，BR-243/BR-245）

**相关文件**:
- server/src/prisma/schema.prisma

---

## TASK-160: 创建成品批次数据模型

**类型**: 数据模型
**工作量**: 8h
**优先级**: P0
**依赖**: TASK-158

**描述**: 创建 FinishedGoodsBatch 表（成品批次）。

**验收标准**:
- [ ] Prisma Schema 完成
- [ ] 外键约束（productionBatch）
- [ ] 批次号唯一索引
- [ ] onDelete: Restrict

**相关文件**:
- server/src/prisma/schema.prisma

---

## TASK-161: 创建系统配置数据模型

**类型**: 数据模型
**工作量**: 8h
**优先级**: P1
**依赖**: 无

**描述**: 创建 SystemConfig 表（批次号格式配置等）。

**验收标准**:
- [ ] Prisma Schema 完成
- [ ] key 字段唯一索引
- [ ] 支持多种配置类型（text/number/json/boolean）
- [ ] 分类字段（system/batch/notification）

**相关文件**:
- server/src/prisma/schema.prisma

---

## TASK-162: 实现批次号生成服务

**类型**: 后端 API
**工作量**: 16h
**优先级**: P0
**依赖**: TASK-161

**描述**: 实现批次号自动生成服务（可配置格式，BR-246）。

**验收标准**:
- [ ] 读取 SystemConfig 配置的批次号格式
- [ ] 支持格式变量（{YYYYMMDD}, {序号}, {原料编号}）
- [ ] 并发安全（使用事务锁）
- [ ] 批次号唯一性校验（BR-241）
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/batch/services/batch-number-generator.service.ts

---

## TASK-163: 实现原料批次 CRUD API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P0
**依赖**: TASK-157, TASK-162

**描述**: 实现原料批次管理 API。

**API 端点**:
- GET /api/material-batches
- POST /api/material-batches
- GET /api/material-batches/:id
- PUT /api/material-batches/:id

**验收标准**:
- [ ] 入库自动创建 MaterialBatch
- [ ] 批次号自动生成
- [ ] 批次号不可修改（BR-242）
- [ ] 权限校验
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/batch/material-batch.controller.ts

---

## TASK-164: 实现生产批次 CRUD API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P0
**依赖**: TASK-158, TASK-162

**描述**: 实现生产批次管理 API。

**API 端点**:
- GET /api/production-batches
- POST /api/production-batches
- GET /api/production-batches/:id
- PUT /api/production-batches/:id

**验收标准**:
- [ ] 生产计划自动创建 ProductionBatch
- [ ] 批次号自动生成
- [ ] 批次号不可修改
- [ ] 关联产品和配方
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/batch/production-batch.controller.ts

---

## TASK-165: 实现批次物料关联 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P0（追溯链核心）
**依赖**: TASK-159

**描述**: 实现批次物料使用关联 API。

**API 端点**:
- POST /api/batch-material-usage
- GET /api/production-batches/:id/materials

**验收标准**:
- [ ] 领料完成自动关联 BatchMaterialUsage
- [ ] 外键约束保证追溯链完整性（BR-243/BR-245）
- [ ] 不允许删除有关联的批次
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/batch/batch-material-usage.controller.ts

---

## TASK-166: 实现反向追溯 API

**类型**: 后端 API
**工作量**: 24h
**优先级**: P0（BRCGS 核心）
**依赖**: TASK-159, TASK-160

**描述**: 实现反向追溯 API（成品 → 原料）。

**API 端点**:
- POST /api/trace/backward

**验收标准**:
- [ ] 成品批次 → 生产批次 → 原料批次完整追溯
- [ ] 4 小时内完成追溯（BR-244）
- [ ] 返回关联的动态表单记录
- [ ] 查询性能优化（毫秒级响应）
- [ ] 追溯链完整性校验
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/trace/trace.controller.ts
- server/src/modules/trace/trace.service.ts

---

## TASK-167: 实现正向追溯 API

**类型**: 后端 API
**工作量**: 24h
**优先级**: P0（BRCGS 核心）
**依赖**: TASK-159, TASK-160

**描述**: 实现正向追溯 API（原料 → 成品 → 客户）。

**API 端点**:
- POST /api/trace/forward

**验收标准**:
- [ ] 原料批次 → 生产批次 → 成品批次 → 客户完整追溯
- [ ] 4 小时内完成追溯
- [ ] 查询性能优化
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/trace/trace.controller.ts
- server/src/modules/trace/trace.service.ts

---

## TASK-168: 实现追溯报告导出 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P1（BRCGS 审核必需）
**依赖**: TASK-166, TASK-167

**描述**: 实现追溯报告 PDF 导出（BR-248）。

**API 端点**:
- GET /api/trace/:batchNumber/export-pdf

**验收标准**:
- [ ] 使用 pdfmake 生成 PDF
- [ ] 包含完整追溯链
- [ ] 包含批次关联的动态表单记录
- [ ] 格式符合 BRCGS 审核要求
- [ ] 生成速度 < 3 秒

**相关文件**:
- server/src/modules/trace/trace-export.service.ts

---

## TASK-169: 实现动态表单批次关联

**类型**: 后端 API
**工作量**: 16h
**优先级**: P0
**依赖**: TASK-127, TASK-158

**描述**: 实现动态表单记录自动关联到批次。

**验收标准**:
- [ ] RecordTemplate 支持批次关联配置
- [ ] Record 自动关联到 ProductionBatch/FinishedGoodsBatch
- [ ] 追溯报告包含关联的动态表单记录
- [ ] 批次号字段自动填充

**相关文件**:
- server/src/modules/record/record.service.ts

---

## TASK-170: 实现批次列表页面（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P0
**依赖**: TASK-163, TASK-164

**描述**: 实现批次列表页面（原料批次、生产批次、成品批次）。

**验收标准**:
- [ ] 批次列表展示（表格）
- [ ] 支持筛选（批次号、产品、日期范围）
- [ ] 支持分页
- [ ] 操作按钮（查看、追溯、导出）
- [ ] 权限校验（只有质量部和管理层可查看，BR-247）

**相关文件**:
- client/src/views/batch/BatchList.vue

---

## TASK-171: 实现批次详情页面（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P0
**依赖**: TASK-163, TASK-164

**描述**: 实现批次详情页面，查看批次信息。

**验收标准**:
- [ ] 批次基本信息展示
- [ ] 关联的物料信息展示
- [ ] 关联的动态表单记录展示
- [ ] 追溯按钮

**相关文件**:
- client/src/views/batch/BatchDetail.vue

---

## TASK-172: 实现追溯可视化页面（前端）

**类型**: 前端 UI
**工作量**: 24h
**优先级**: P0（BRCGS 核心）
**依赖**: TASK-166, TASK-167

**描述**: 实现追溯可视化页面（图形化展示追溯链）。

**功能要求**:
- 反向追溯：成品 → 生产 → 原料（树状图）
- 正向追溯：原料 → 生产 → 成品 → 客户（树状图）
- 点击节点查看详情
- 导出追溯报告

**验收标准**:
- [ ] 使用 ECharts 或 D3.js 绘制追溯树
- [ ] 节点点击查看详情
- [ ] 追溯链完整性可视化验证
- [ ] 导出 PDF 按钮
- [ ] 4 小时内完成追溯（性能要求）

**相关文件**:
- client/src/views/trace/TraceVisualization.vue

---

## TASK-173: 实现批次号格式配置页面（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-161, TASK-162

**描述**: 实现批次号格式配置页面（系统配置）。

**验收标准**:
- [ ] 配置项列表展示
- [ ] 批次号格式配置（支持变量）
- [ ] 格式预览功能
- [ ] 保存配置
- [ ] 权限校验（只有管理员可配置）

**相关文件**:
- client/src/views/settings/BatchConfig.vue

---

## TASK-174: 实现追溯报告预览（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-168

**描述**: 实现追溯报告预览和下载功能。

**验收标准**:
- [ ] 导出 PDF 按钮
- [ ] PDF 预览对话框
- [ ] PDF 下载功能
- [ ] 导出进度显示

**相关文件**:
- client/src/components/TraceReportPreview.vue

---

## TASK-175: 实现动态表单批次关联（前端）

**类型**: 前端 UI
**工作量**: 8h
**优先级**: P0
**依赖**: TASK-169

**描述**: 实现动态表单中批次号字段自动关联。

**验收标准**:
- [ ] 批次号字段自动填充
- [ ] 批次号选择器（下拉）
- [ ] 批次信息实时显示

**相关文件**:
- client/src/components/fields/BatchField.vue

---

## TASK-176: 编写批次管理单元测试

**类型**: 测试
**工作量**: 24h
**优先级**: P1
**依赖**: TASK-163, TASK-164, TASK-165

**描述**: 批次管理模块单元测试。

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有测试通过

**相关文件**:
- server/test/batch.service.spec.ts

---

## TASK-177: 编写追溯功能单元测试

**类型**: 测试
**工作量**: 32h
**优先级**: P0（BRCGS 核心）
**依赖**: TASK-166, TASK-167

**描述**: 追溯功能单元测试（BRCGS 核心）。

**验收标准**:
- [ ] 反向追溯测试
- [ ] 正向追溯测试
- [ ] 追溯链完整性测试
- [ ] 性能测试（4 小时内完成）
- [ ] 所有测试通过

**相关文件**:
- server/test/trace.service.spec.ts

---

## TASK-178: 编写追溯链完整性测试

**类型**: 测试
**工作量**: 24h
**优先级**: P0（BRCGS 合规）
**依赖**: TASK-159, TASK-166, TASK-167

**描述**: 追溯链完整性专项测试（BR-243/BR-245）。

**验收标准**:
- [ ] 外键约束测试（onDelete: Restrict）
- [ ] 追溯链不能断裂测试
- [ ] 批次删除限制测试
- [ ] 所有测试通过

**相关文件**:
- server/test/trace-integrity.spec.ts

---

## TASK-179: 编写追溯性能测试

**类型**: 测试
**工作量**: 32h
**优先级**: P0（BRCGS 4小时要求）
**依赖**: TASK-166, TASK-167

**描述**: 追溯性能测试（4 小时内完成要求）。

**验收标准**:
- [ ] 大数据量测试（10000+ 批次）
- [ ] 追溯速度测试（< 1 秒）
- [ ] 数据库索引优化
- [ ] 所有测试通过

**相关文件**:
- server/test/trace-performance.spec.ts

---

## TASK-180: 编写 E2E 测试

**类型**: 测试
**工作量**: 24h
**优先级**: P1
**依赖**: TASK-170, TASK-172

**描述**: 批次追溯系统 E2E 测试。

**测试场景**:
1. 原料入库 → 生产领料 → 成品入库 → 追溯验证
2. 反向追溯：成品批次 → 查看追溯树 → 导出报告
3. 正向追溯：原料批次 → 查看使用情况 → 追溯到客户

**验收标准**:
- [ ] 所有关键用户流程有对应测试用例
- [ ] 所有测试通过

**相关文件**:
- client/e2e/batch-trace.spec.ts

---

**本文档完成 ✅**
