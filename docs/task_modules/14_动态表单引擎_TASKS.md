# 动态表单引擎与记录管理 - Task 分解

> **来源**: docs/design/layer0_核心架构/10_动态表单引擎.md  
> **总工作量**: 560h  
> **优先级**: P0（核心架构）  
> **依赖**: 无

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 3 | 24h |
| 后端 API | 12 | 192h |
| 前端 UI | 10 | 240h |
| 测试 | 5 | 104h |
| **总计** | **30** | **560h** |

---

## TASK-127: 创建记录模板数据模型

**类型**: 数据模型
**工作量**: 8h
**优先级**: P0
**依赖**: 无

**描述**: 创建 RecordTemplate 表，存储记录模板配置。

**验收标准**:
- [ ] Prisma Schema 完成
- [ ] fields_json 使用 Json 类型（存储 formSchema）
- [ ] 唯一索引配置（code 字段）
- [ ] 版本号字段（version）
- [ ] 保留期限字段（retentionYears，默认值 **5 年**，符合 BRCGS 合规要求）
- [ ] 数据库迁移文件生成

**相关文件**:
- server/src/prisma/schema.prisma

---

## TASK-128: 创建记录实例数据模型

**类型**: 数据模型
**工作量**: 8h
**优先级**: P0
**依赖**: TASK-127

**描述**: 创建 Record 表，存储记录实例数据。

**验收标准**:
- [ ] Prisma Schema 完成
- [ ] data_json 使用 Json 类型（存储填写数据）
- [ ] 状态字段（draft/submitted/approved/rejected）
- [ ] 保留截止日期字段（retentionUntil）
- [ ] 外键约束（template_id 引用 RecordTemplate）

**相关文件**:
- server/src/prisma/schema.prisma

---

## TASK-129: 创建记录变更历史数据模型

**类型**: 数据模型
**工作量**: 8h
**优先级**: P0（BRCGS 合规）
**依赖**: TASK-128

**描述**: 创建 RecordChangeLog 表，防篡改机制核心。

**验收标准**:
- [ ] Prisma Schema 完成
- [ ] 记录变更前后数据（oldData, newData）
- [ ] 变更人和变更时间字段
- [ ] 变更原因字段（reason）

**相关文件**:
- server/src/prisma/schema.prisma

---

## TASK-130: 实现记录模板 CRUD API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P0
**依赖**: TASK-127

**描述**: 实现记录模板的增删改查 API。

**API 端点**:
- GET /api/v1/record-templates
- POST /api/v1/record-templates
- GET /api/v1/record-templates/:id
- PUT /api/v1/record-templates/:id
- DELETE /api/v1/record-templates/:id

**验收标准**:
- [ ] 模板编号唯一性校验（BR-211）
- [ ] 模板状态管理（active/archived）
- [ ] formSchema 验证（20+ 字段类型）
- [ ] 权限校验
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/record-template/

---

## TASK-131: 实现模板版本管理 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-130

**描述**: 实现模板版本管理功能（BR-213）。

**验收标准**:
- [ ] 修改模板时生成新版本
- [ ] 旧版本记录保留
- [ ] 查询模板历史版本
- [ ] 版本号自动递增

**相关文件**:
- server/src/modules/record-template/

---

## TASK-132: 实现模板归档 API

**类型**: 后端 API
**工作量**: 8h
**优先级**: P1
**依赖**: TASK-130

**描述**: 实现模板归档功能（BR-212）。

**API 端点**:
- POST /api/v1/record-templates/:id/archive

**验收标准**:
- [ ] 归档后不可新建记录
- [ ] 历史记录仍可查询
- [ ] 权限校验

**相关文件**:
- server/src/modules/record-template/

---

## TASK-133: 实现记录实例 CRUD API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P0
**依赖**: TASK-128

**描述**: 实现记录实例的增删改查 API。

**API 端点**:
- GET /api/v1/records
- POST /api/v1/records
- GET /api/v1/records/:id
- PUT /api/v1/records/:id
- DELETE /api/v1/records/:id

**验收标准**:
- [ ] 记录编号自动生成（BR-221）
- [ ] data_json 验证（根据模板 formSchema）
- [ ] 草稿自动保存
- [ ] 权限校验
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/record/

---

## TASK-134: 实现记录提交审批 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P0
**依赖**: TASK-133

**描述**: 实现记录提交审批功能（BR-222）。

**API 端点**:
- POST /api/v1/records/:id/submit

**验收标准**:
- [ ] 状态从 draft → submitted
- [ ] 触发审批流程
- [ ] data_json 完整性验证
- [ ] 发送通知

**相关文件**:
- server/src/modules/record/

---

## TASK-135: 实现服务器时间戳强制覆盖

**类型**: 后端 API
**工作量**: 16h
**优先级**: P0（BRCGS 合规）
**依赖**: TASK-133

**描述**: 防篡改机制核心 - 服务器时间戳（BR-254/BR-255）。

**验收标准**:
- [ ] 创建记录时强制使用服务器时间
- [ ] 客户端时间与服务器时间差 > 5分钟拒绝提交
- [ ] 签名时锁定服务器时间戳
- [ ] 单元测试覆盖率 ≥ 80%

**相关文件**:
- server/src/modules/record/
- server/src/middlewares/time-validation.middleware.ts

---

## TASK-136: 实现记录变更历史 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P0（BRCGS 合规）
**依赖**: TASK-129, TASK-133

**描述**: 防篡改机制 - 变更历史记录（BR-251）。

**API 端点**:
- GET /api/v1/records/:id/change-logs

**验收标准**:
- [ ] approved 后任何修改自动记录到 RecordChangeLog
- [ ] 记录变更前后数据
- [ ] 记录变更人和变更时间
- [ ] 查询变更历史 API

**相关文件**:
- server/src/modules/record/
- server/src/interceptors/change-log.interceptor.ts

---

## TASK-137: 实现电子签名时间戳 API

**类型**: 后端 API
**工作量**: 8h
**优先级**: P1（BRCGS 合规）
**依赖**: TASK-133

**描述**: 电子签名时间戳锁定（BR-256）。

**API 端点**:
- POST /api/v1/records/:id/signature

**验收标准**:
- [ ] 签名时锁定服务器时间戳
- [ ] 签名后不可修改
- [ ] 签名数据验证

**相关文件**:
- server/src/modules/record/

---

## TASK-138: 实现已审批记录修改 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P1（BRCGS 合规）
**依赖**: TASK-136

**描述**: 已审批记录修改（需特殊权限）。

**API 端点**:
- PUT /api/v1/records/:id/approved-modify

**验收标准**:
- [ ] 只有管理员可修改已审批记录
- [ ] 修改自动记录到 RecordChangeLog
- [ ] 必填修改原因
- [ ] 发送通知

**相关文件**:
- server/src/modules/record/

---

## TASK-139: 实现记录保留期限管理

**类型**: 后端 API
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-133

**描述**: 记录保留期限自动计算和管理（BR-261/BR-262）。

**验收标准**:
- [ ] 创建记录时自动计算 retentionUntil
- [ ] 定时任务检查过期记录
- [ ] 过期记录自动归档
- [ ] 查询即将过期记录

**相关文件**:
- server/src/modules/record/
- server/src/cron/retention.cron.ts

---

## TASK-140: 实现 PDF 导出 API

**类型**: 后端 API
**工作量**: 24h
**优先级**: P1
**依赖**: TASK-133

**描述**: 记录导出为 PDF（使用 pdfmake）。

**API 端点**:
- GET /api/v1/records/:id/export-pdf

**验收标准**:
- [ ] 使用 pdfmake 生成 PDF
- [ ] 包含所有表单数据
- [ ] 包含审批信息和签名
- [ ] 包含 BRCGS 防篡改信息（时间戳、变更历史）
- [ ] 支持自定义模板样式

**相关文件**:
- server/src/modules/export/pdf-export.service.ts

---

## TASK-141: 实现 Excel 批量导出 API

**类型**: 后端 API
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-133

**描述**: 记录批量导出为 Excel。

**API 端点**:
- GET /api/v1/records/export-excel

**验收标准**:
- [ ] 使用 xlsx 库生成 Excel
- [ ] 支持筛选条件导出
- [ ] 包含所有字段数据
- [ ] 大数据量分批导出

**相关文件**:
- server/src/modules/export/excel-export.service.ts

---

## TASK-142: 实现表单设计器（前端 PC）

**类型**: 前端 UI
**工作量**: 40h
**优先级**: P0
**依赖**: TASK-130

**描述**: 拖拽式表单设计器（三栏布局）。

**功能要求**:
- 左侧：字段库（20+ 种字段类型）
- 中间：表单预览区（拖拽式设计）
- 右侧：属性配置区（字段属性 + 显隐规则 + 联动规则）

**验收标准**:
- [ ] 支持拖拽添加字段
- [ ] 支持拖拽排序字段
- [ ] 支持删除字段
- [ ] 支持配置字段属性
- [ ] 支持配置显隐规则
- [ ] 支持配置联动规则
- [ ] 实时预览表单效果
- [ ] 保存 formSchema 到服务器

**相关文件**:
- client/src/views/record-template/TemplateDesigner.vue

---

## TASK-143: 实现动态表单渲染（前端 PC）

**类型**: 前端 UI
**工作量**: 32h
**优先级**: P0
**依赖**: TASK-028a, TASK-028b

**描述**: 根据 formSchema 动态渲染表单（PC 端）。

**验收标准**:
- [ ] 正确解析 formSchema
- [ ] 动态渲染 20+ 种字段类型
- [ ] 支持字段显隐规则
- [ ] 支持字段联动规则
- [ ] 支持字段计算规则
- [ ] 支持实时校验
- [ ] 支持自动保存草稿

**相关文件**:
- client/src/components/DynamicForm.vue

---

## TASK-144: 实现动态表单渲染（移动端）

**类型**: 前端 UI
**工作量**: 40h
**优先级**: P1
**依赖**: TASK-143

**描述**: 根据 formSchema 动态渲染表单（移动端 uniapp）。

**验收标准**:
- [ ] uniapp 实现动态渲染
- [ ] 支持所有字段类型
- [ ] 支持拍照、签名、扫码
- [ ] 支持离线填写
- [ ] 支持自动保存草稿

**相关文件**:
- mobile/src/pages/record/DynamicForm.vue

---

## TASK-145: 实现记录列表页面（前端）

**类型**: 前端 UI
**工作量**: 24h
**优先级**: P0
**依赖**: TASK-133

**描述**: 记录列表页面，支持筛选、分页。

**验收标准**:
- [ ] 记录列表展示
- [ ] 支持按模板/部门/状态筛选
- [ ] 支持分页
- [ ] 操作按钮（查看、编辑、删除、导出PDF）
- [ ] 权限校验

**相关文件**:
- client/src/views/record/RecordList.vue

---

## TASK-146: 实现记录详情页面（前端）

**类型**: 前端 UI
**工作量**: 24h
**优先级**: P0
**依赖**: TASK-133

**描述**: 记录详情页面，查看和编辑记录。

**验收标准**:
- [ ] 记录基本信息展示
- [ ] 动态表单数据展示
- [ ] 审批信息展示
- [ ] 变更历史展示
- [ ] 操作按钮（编辑、提交、导出PDF）

**相关文件**:
- client/src/views/record/RecordDetail.vue

---

## TASK-147: 实现记录变更历史组件（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-136

**描述**: 记录变更历史时间线组件。

**验收标准**:
- [ ] 时间线展示变更历史
- [ ] 显示变更前后数据对比
- [ ] 显示变更人和变更时间
- [ ] 显示变更原因

**相关文件**:
- client/src/components/RecordChangeLog.vue

---

## TASK-148: 实现电子签名组件（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-137

**描述**: 电子签名组件（Canvas 手写签名）。

**验收标准**:
- [ ] 支持手写签名
- [ ] 支持清除重写
- [ ] 签名保存为 base64
- [ ] 签名时锁定时间戳

**相关文件**:
- client/src/components/fields/SignatureField.vue

---

## TASK-149: 实现 PDF 预览和下载（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-140

**描述**: PDF 预览和下载功能。

**验收标准**:
- [ ] 导出 PDF 按钮
- [ ] PDF 预览对话框
- [ ] PDF 下载功能
- [ ] 显示导出进度

**相关文件**:
- client/src/components/PdfPreview.vue

---

## TASK-150: 实现批量导出功能（前端）

**类型**: 前端 UI
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-141

**描述**: 批量导出为 Excel 功能。

**验收标准**:
- [ ] 复选框选择多条记录
- [ ] 批量导出按钮
- [ ] 导出进度显示
- [ ] 下载成功提示

**相关文件**:
- client/src/views/record/RecordList.vue

---

## TASK-151: 实现离线填写功能（移动端）

**类型**: 前端 UI
**工作量**: 24h
**优先级**: P2
**依赖**: TASK-144

**描述**: 移动端离线填写记录，联网后自动同步。

**验收标准**:
- [ ] 离线时可填写表单
- [ ] 数据保存到本地存储
- [ ] 联网后自动同步到服务器
- [ ] 同步状态提示

**相关文件**:
- mobile/src/pages/record/DynamicForm.vue

---

## TASK-152: 编写记录模板单元测试

**类型**: 测试
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-130, TASK-131, TASK-132

**描述**: 记录模板模块单元测试。

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有测试通过

**相关文件**:
- server/test/record-template.service.spec.ts

---

## TASK-153: 编写记录实例单元测试

**类型**: 测试
**工作量**: 24h
**优先级**: P1
**依赖**: TASK-133, TASK-134, TASK-135, TASK-136

**描述**: 记录实例模块单元测试。

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有测试通过

**相关文件**:
- server/test/record.service.spec.ts

---

## TASK-154: 编写防篡改机制测试

**类型**: 测试
**工作量**: 24h
**优先级**: P0（BRCGS 合规）
**依赖**: TASK-135, TASK-136, TASK-137

**描述**: 防篡改机制专项测试（BRCGS 合规核心）。

**验收标准**:
- [ ] 服务器时间戳测试
- [ ] 时间差校验测试
- [ ] 变更历史记录测试
- [ ] 电子签名时间戳测试
- [ ] 所有测试通过

**相关文件**:
- server/test/tamper-proof.spec.ts

---

## TASK-155: 编写前端组件单元测试

**类型**: 测试
**工作量**: 24h
**优先级**: P1
**依赖**: TASK-142, TASK-143, TASK-145, TASK-146

**描述**: 前端组件单元测试。

**验收标准**:
- [ ] 所有核心组件有对应测试用例
- [ ] 所有测试通过

**相关文件**:
- client/src/**/__tests__/

---

## TASK-156: 编写 E2E 测试

**类型**: 测试
**工作量**: 16h
**优先级**: P1
**依赖**: TASK-142, TASK-143, TASK-145

**描述**: 动态表单引擎 E2E 测试。

**测试场景**:
1. 管理员创建记录模板 → 配置字段 → 保存
2. 用户填写记录 → 提交审批 → 审批通过
3. 查看变更历史 → 导出 PDF

**验收标准**:
- [ ] 所有关键用户流程有对应测试用例
- [ ] 所有测试通过

**相关文件**:
- client/e2e/dynamic-form.spec.ts

---

**本文档完成 ✅**
