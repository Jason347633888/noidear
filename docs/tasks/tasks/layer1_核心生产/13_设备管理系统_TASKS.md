# 设备管理系统 - TASKS.md

> **来源**: docs/design/layer1_核心生产/13_设备管理系统.md
> **模块分类**: Layer 1 核心生产
> **实现状态**: ⏳ 未实现（PRD + LLD 已完成）
> **优先级**: ⭐⭐ 高（Phase B 核心生产）
> **依赖**: 动态表单引擎、TodoTask 统一待办、工作流引擎、移动端应用

---

## 任务统计

| 统计项 | 数量 |
|--------|------|
| **总任务数** | 26 |
| **数据模型任务** | 4 |
| **后端 API 任务** | 10 |
| **前端 UI 任务** | 8 |
| **移动端任务** | 2 |
| **测试任务** | 2 |
| **预计总工时** | 480h |

---

## 任务列表

### 一、数据模型（4 个任务，64h）

#### TASK-209: 设备台账表设计（16h）

**任务描述**:
- 创建 Equipment 表（设备台账）
- 定义设备属性：编号、名称、型号、分类、位置、购买日期、启用日期
- 支持分级保养配置（maintenanceConfig JSON）
- 设备状态：active（启用）、inactive（停用）、scrapped（报废）
- 添加索引：code、category、status、responsiblePerson

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 设备编号唯一约束（@unique）
- [ ] 索引创建成功
- [ ] maintenanceConfig 支持 JSON 存储（日/周/月/季/年保养配置）
- [ ] 种子数据包含 3-5 个典型设备

**依赖**: 无

**技术要点**:
- maintenanceConfig 示例：
```json
{
  "daily": { "enabled": true, "cycle": 1, "reminderDays": 0 },
  "weekly": { "enabled": true, "cycle": 7, "reminderDays": 1 },
  "monthly": { "enabled": true, "cycle": 30, "reminderDays": 3 },
  "quarterly": { "enabled": false, "cycle": 90, "reminderDays": 7 },
  "annual": { "enabled": true, "cycle": 365, "reminderDays": 14 }
}
```

**相关文件**:
- `server/src/prisma/schema.prisma`
- `server/src/prisma/seed.ts`

---

#### TASK-210: 维护计划表设计（16h）

**任务描述**:
- 创建 MaintenancePlan 表（维护计划）
- 定义计划属性：计划编号、设备ID、计划日期、保养级别、状态、责任人
- 保养级别：daily | weekly | monthly | quarterly | annual
- 计划状态：pending | in_progress | completed | cancelled
- 添加索引：equipmentId、maintenanceLevel、plannedDate

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 外键约束：equipmentId → Equipment（onDelete: Cascade）
- [ ] 索引创建成功
- [ ] 计划编号唯一约束（@unique）
- [ ] 支持待办任务关联（todoTaskId）

**依赖**: TASK-209

**技术要点**:
- 一个设备可以有多个不同级别的保养计划（并行）
- 不同级别的提前提醒天数不同
- 计划编号生成规则：MP-{YYYYMMDD}-{序号}

**相关文件**:
- `server/src/prisma/schema.prisma`

---

#### TASK-211: 维保记录表设计（16h）

**任务描述**:
- 创建 MaintenanceRecord 表（维保记录）
- 定义记录属性：记录编号、设备ID、维保日期、保养级别、维保内容、现场照片、维保人签名
- 记录状态：draft | submitted | approved | rejected
- 支持审批流程（workflowId）
- 添加索引：equipmentId、maintenanceLevel、maintenanceDate

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 外键约束：equipmentId → Equipment（onDelete: Restrict）
- [ ] 索引创建成功
- [ ] 记录编号唯一约束（@unique）
- [ ] photos 字段使用 JSON 存储数组
- [ ] 支持维保人员和审核人员签名（图片URL）

**依赖**: TASK-209

**技术要点**:
- 维保记录是四级记录文件（动态表单引擎）
- 支持电子签名（手写签字板）
- 记录编号生成规则：MAINT-{YYYYMMDD}-{序号}

**相关文件**:
- `server/src/prisma/schema.prisma`

---

#### TASK-212: 设备报修表设计（16h）

**任务描述**:
- 创建 EquipmentFault 表（设备报修单）
- 定义报修属性：报修单号、设备ID、报修人、故障描述、紧急程度、维修记录
- 紧急程度：urgent | normal | low
- 报修状态：pending | in_progress | completed | cancelled
- 添加索引：equipmentId、reporterId、status、urgencyLevel、reportTime

**验收标准**:
- [ ] Prisma Schema 定义完成
- [ ] 外键约束：equipmentId → Equipment（onDelete: Restrict）
- [ ] 索引创建成功
- [ ] 报修单号唯一约束（@unique）
- [ ] 支持待办任务关联（todoTaskId）
- [ ] 支持维修人员签名（图片URL）

**依赖**: TASK-209

**技术要点**:
- 所有员工可发起报修
- 报修单号生成规则：FR-{YYYYMMDD}-{序号}
- 接单后状态变为 in_progress
- 完成维修后关闭待办任务

**相关文件**:
- `server/src/prisma/schema.prisma`

---

### 二、后端 API（10 个任务，200h）

#### TASK-213: 设备台账 CRUD API（20h）

**任务描述**:
- 实现设备创建、查询、更新、删除、状态变更 API
- 支持分页、搜索、筛选（按分类、状态、责任人）
- 支持设备编号自动生成

**验收标准**:
- [ ] POST /api/equipment - 创建设备（自动生成编号）
- [ ] GET /api/equipment - 分页查询设备
- [ ] GET /api/equipment/:id - 查询设备详情
- [ ] PUT /api/equipment/:id - 更新设备
- [ ] DELETE /api/equipment/:id - 删除设备（软删除）
- [ ] PUT /api/equipment/:id/status - 更新设备状态
- [ ] 所有 API 有异常处理

**依赖**: TASK-209

**技术要点**:
- 设备编号生成规则：EQ-{YYYYMMDD}-{序号}
- 设备报废时自动取消未完成的维护计划

**相关文件**:
- `server/src/modules/equipment/equipment.controller.ts`
- `server/src/modules/equipment/equipment.service.ts`
- `server/src/modules/equipment/dto/equipment.dto.ts`

---

#### TASK-214: 维护计划自动生成逻辑（24h）

**任务描述**:
- 实现设备启用后自动生成多个保养计划
- 根据 maintenanceConfig 配置生成对应级别的计划
- 维保记录审批通过后自动生成下次计划

**验收标准**:
- [ ] 设备启用时自动生成启用的保养级别计划
- [ ] 计划生成逻辑正确（启用日期 + 对应级别周期）
- [ ] 维保记录审批通过后自动生成该级别下次计划
- [ ] 计划生成时自动分配责任人
- [ ] 定时任务：每日检查临期计划并生成待办任务

**依赖**: TASK-210

**技术要点**:
- 使用 @nestjs/schedule 实现定时任务
- 定时任务检查逻辑：计划日期 - 提醒天数 ≤ 今天
- 不同级别提前提醒天数不同

**相关文件**:
- `server/src/modules/equipment/plan.service.ts`
- `server/src/modules/equipment/plan.scheduler.ts`

---

#### TASK-215: 维护计划管理 API（20h）

**任务描述**:
- 实现维护计划查询、开始、完成、取消 API
- 支持日历视图数据获取
- 支持看板视图数据获取

**验收标准**:
- [ ] GET /api/maintenance-plans - 分页查询维护计划
- [ ] GET /api/maintenance-plans/:id - 查询维护计划详情
- [ ] GET /api/maintenance-plans/calendar - 日历视图数据（按月）
- [ ] POST /api/maintenance-plans/:id/start - 开始维保
- [ ] POST /api/maintenance-plans/:id/complete - 完成维保
- [ ] POST /api/maintenance-plans/:id/cancel - 取消维保
- [ ] 日历视图数据格式正确

**依赖**: TASK-214

**技术要点**:
- 日历视图数据格式：{ [date]: MaintenancePlan[] }
- 开始维保时创建维保记录（草稿）
- 完成维保时更新计划状态并生成下次计划

**相关文件**:
- `server/src/modules/equipment/plan.controller.ts`
- `server/src/modules/equipment/plan.service.ts`

---

#### TASK-216: 维保记录 CRUD API（24h）

**任务描述**:
- 实现维保记录创建、查询、更新、提交审批 API
- 支持现场照片上传（MinIO）
- 支持电子签名上传

**验收标准**:
- [ ] POST /api/maintenance-records - 创建维保记录（草稿）
- [ ] GET /api/maintenance-records - 分页查询维保记录
- [ ] GET /api/maintenance-records/:id - 查询维保记录详情
- [ ] PUT /api/maintenance-records/:id - 更新维保记录（仅草稿）
- [ ] POST /api/maintenance-records/:id/submit - 提交审批
- [ ] POST /api/maintenance-records/:id/approve - 审批通过
- [ ] POST /api/maintenance-records/:id/reject - 审批驳回
- [ ] 照片上传到 MinIO

**依赖**: TASK-211

**技术要点**:
- 提交审批时集成工作流引擎
- 审批通过后自动生成下次维护计划
- 审批通过后关闭待办任务

**相关文件**:
- `server/src/modules/equipment/record.controller.ts`
- `server/src/modules/equipment/record.service.ts`

---

#### TASK-217: 设备报修 API（24h）

**任务描述**:
- 实现设备报修发起、接单、完成维修 API
- 支持报修单查询（普通员工 vs 工程部）
- 支持报修统计

**验收标准**:
- [ ] POST /api/equipment/faults - 发起报修（所有员工）
- [ ] GET /api/equipment/faults - 查询报修单列表（工程部）
- [ ] GET /api/equipment/faults/my - 查询我的报修单（普通员工）
- [ ] GET /api/equipment/faults/:id - 查询报修单详情
- [ ] POST /api/equipment/faults/:id/accept - 接单（工程部）
- [ ] POST /api/equipment/faults/:id/complete - 完成维修
- [ ] POST /api/equipment/faults/:id/cancel - 取消报修
- [ ] GET /api/equipment/faults/stats - 报修统计
- [ ] 发起报修时自动生成待办任务给工程部

**依赖**: TASK-212

**技术要点**:
- 报修单提交时自动创建待办任务（集成 TodoTask）
- 接单时状态变为 in_progress
- 完成维修时关闭待办任务
- 统计指标：总报修数、平均响应时间、完成率

**相关文件**:
- `server/src/modules/equipment/fault.controller.ts`
- `server/src/modules/equipment/fault.service.ts`

---

#### TASK-218: 文件上传服务（16h）

**任务描述**:
- 实现照片上传 MinIO 服务
- 实现电子签名上传服务
- 支持移动端图片压缩

**验收标准**:
- [ ] POST /api/upload/photo - 上传照片（维保记录/报修单）
- [ ] POST /api/upload/signature - 上传电子签名
- [ ] 照片上传到 MinIO，返回 URL
- [ ] 支持图片压缩（移动端上传前压缩）
- [ ] 文件大小限制（照片 5MB、签名 1MB）

**依赖**: 无

**相关文件**:
- `server/src/modules/upload/upload.controller.ts`
- `server/src/modules/upload/upload.service.ts`

---

#### TASK-219: 待办任务集成（20h）

**任务描述**:
- 实现维护计划到期生成待办任务
- 实现设备报修生成待办任务
- 实现维保记录审批生成待办任务
- 实现待办任务完成关闭逻辑

**验收标准**:
- [ ] 维护计划到期前N天生成待办任务（不同级别N不同）
- [ ] 设备报修提交时生成待办任务给工程部
- [ ] 维保记录提交审批时生成待办任务给审批人
- [ ] 维保记录审批通过后关闭待办任务
- [ ] 设备报修完成后关闭待办任务
- [ ] 待办任务优先级正确（urgent > normal > low）

**依赖**: TASK-214, TASK-216, TASK-217

**技术要点**:
- 集成 TodoTask 统一待办系统
- 待办任务类型：maintenance_plan、equipment_fault、maintenance_record
- 优先级映射：urgent → high, normal → medium, low → low

**相关文件**:
- `server/src/modules/equipment/todo.service.ts`

---

#### TASK-220: 设备统计 API（20h）

**任务描述**:
- 实现设备统计分析 API
- 统计维保次数、故障率、维保成本
- 统计报修次数、平均响应时间、完成率

**验收标准**:
- [ ] GET /api/equipment/stats/overview - 设备概览统计
- [ ] GET /api/equipment/stats/maintenance - 维保统计（按级别）
- [ ] GET /api/equipment/stats/fault-rate - 故障率统计（按设备）
- [ ] GET /api/equipment/stats/cost - 维保成本统计（按月）
- [ ] GET /api/equipment/stats/repair - 报修统计（按月）
- [ ] 统计数据缓存（Redis）

**依赖**: TASK-211, TASK-212

**相关文件**:
- `server/src/modules/equipment/stats.controller.ts`
- `server/src/modules/equipment/stats.service.ts`

---

#### TASK-221: 定时任务调度（16h）

**任务描述**:
- 实现维护计划到期提醒定时任务
- 实现过期维护计划提醒定时任务
- 实现保修到期提醒定时任务

**验收标准**:
- [ ] 定时任务：每日检查临期维护计划（提前N天）
- [ ] 定时任务：每日检查过期维护计划
- [ ] 定时任务：保修到期前30天提醒
- [ ] 定时任务日志记录正确
- [ ] 定时任务失败时告警

**依赖**: TASK-214

**技术要点**:
- 使用 @nestjs/schedule 实现定时任务
- 定时任务执行时间：每日凌晨 2 点
- 定时任务异常处理

**相关文件**:
- `server/src/modules/equipment/scheduler.service.ts`

---

#### TASK-222: 通知服务集成（20h）

**任务描述**:
- 实现维护计划到期微信通知
- 实现设备报修微信通知
- 实现维保记录审批通知

**验收标准**:
- [ ] 维护计划到期前N天发送微信通知给责任人
- [ ] 设备报修提交后发送微信通知给工程部
- [ ] 维保记录提交审批后发送微信通知给审批人
- [ ] 维保记录审批通过后发送微信通知给维保人员
- [ ] 设备报修完成后发送微信通知给报修人

**依赖**: TASK-219

**技术要点**:
- 集成企业微信或微信公众号模板消息
- 通知内容包含：设备名称、保养级别/故障描述、截止时间
- 通知发送失败时记录日志

**相关文件**:
- `server/src/modules/notification/notification.service.ts`

---
### 三、前端 UI（8 个任务，136h）

#### TASK-223: 设备台账页面（16h）

**任务描述**:
- 实现设备列表页面（搜索、筛选、分页）
- 实现设备创建/编辑对话框
- 实现设备详情页面
- 实现设备状态管理

**验收标准**:
- [ ] 设备列表显示：编号、名称、型号、分类、位置、状态、责任人
- [ ] 支持按名称/编号搜索、按分类/状态筛选
- [ ] 创建/编辑对话框表单验证正确
- [ ] 分级保养配置界面（勾选启用的级别）
- [ ] 设备详情页面显示维保历史、维护计划

**依赖**: TASK-213

**相关文件**:
- `client/src/views/equipment/EquipmentList.vue`
- `client/src/views/equipment/EquipmentForm.vue`
- `client/src/views/equipment/EquipmentDetail.vue`
- `client/src/api/equipment.ts`

---

#### TASK-224: 维护计划列表页面（16h）

**任务描述**:
- 实现维护计划列表页面
- 实现维护计划筛选（按设备、保养级别、状态）
- 实现开始/完成/取消维保操作

**验收标准**:
- [ ] 维护计划列表显示：计划编号、设备名称、保养级别、计划日期、状态、责任人
- [ ] 支持按设备/保养级别/状态筛选
- [ ] 保养级别标签显示（日/周/月/季/年）
- [ ] 开始维保时跳转到维保记录填写页面
- [ ] 完成/取消维保时显示确认对话框

**依赖**: TASK-215

**相关文件**:
- `client/src/views/equipment/PlanList.vue`

---

#### TASK-225: 维护计划日历页面（20h）

**任务描述**:
- 实现维护计划日历视图
- 实现日历上显示维护计划标记
- 实现点击日期查看当天计划

**验收标准**:
- [ ] 日历显示当月所有维护计划
- [ ] 不同保养级别用不同颜色标记（日保养-绿色、周保养-蓝色、月保养-橙色、年保养-红色）
- [ ] 点击日期显示当天所有维护计划列表
- [ ] 支持月份切换
- [ ] 维护计划点击跳转到详情页面

**依赖**: TASK-215

**技术要点**:
- 使用 Element Plus Calendar 组件
- 日历数据格式：{ [date]: MaintenancePlan[] }

**相关文件**:
- `client/src/views/equipment/PlanCalendar.vue`

---

#### TASK-226: 维保记录列表页面（16h）

**任务描述**:
- 实现维保记录列表页面
- 实现维保记录筛选（按设备、保养级别、状态、日期）
- 实现维保记录查看详情

**验收标准**:
- [ ] 维保记录列表显示：记录编号、设备名称、保养级别、维保日期、维保人员、状态
- [ ] 支持按设备/保养级别/状态/日期筛选
- [ ] 维保记录详情显示完整信息（照片、签名）
- [ ] 支持审批操作（审批对话框）

**依赖**: TASK-216

**相关文件**:
- `client/src/views/equipment/RecordList.vue`
- `client/src/views/equipment/RecordDetail.vue`

---

#### TASK-227: 维保记录创建页面（20h）

**任务描述**:
- 实现维保记录创建页面（PC端）
- 实现现场照片上传
- 实现电子签名功能

**验收标准**:
- [ ] 维保记录表单显示：设备信息、维保日期、保养级别、维保内容、维保前后状态
- [ ] 照片上传组件（最多9张）
- [ ] 电子签名组件（手写签字板）
- [ ] 表单验证正确（必填字段、签名）
- [ ] 提交时显示确认对话框

**依赖**: TASK-216

**技术要点**:
- 使用 signature_pad 库实现电子签名
- 照片上传组件支持拖拽、预览、删除

**相关文件**:
- `client/src/views/equipment/RecordForm.vue`
- `client/src/components/SignaturePad.vue`

---

#### TASK-228: 设备报修页面（16h）

**任务描述**:
- 实现设备报修发起页面
- 实现报修单列表页面（普通员工 vs 工程部）
- 实现报修单详情页面

**验收标准**:
- [ ] 报修发起页面：选择区域 → 选择设备 → 填写故障描述 → 选择紧急程度 → 上传照片
- [ ] 区域选择后自动过滤设备
- [ ] 报修单列表显示：报修单号、设备名称、故障描述、紧急程度、状态、报修人
- [ ] 紧急报修标红显示
- [ ] 报修单详情显示完整信息（照片、维修记录）

**依赖**: TASK-217

**相关文件**:
- `client/src/views/equipment/FaultCreate.vue`
- `client/src/views/equipment/FaultList.vue`
- `client/src/views/equipment/FaultDetail.vue`

---

#### TASK-229: 设备报修统计页面（16h）

**任务描述**:
- 实现设备报修统计页面
- 实现报修趋势图表
- 实现故障率排行

**验收标准**:
- [ ] 统计概览卡片：总报修数、平均响应时间、完成率
- [ ] 报修趋势图表（按月）
- [ ] 故障率排行（按设备）
- [ ] 支持日期范围筛选

**依赖**: TASK-217

**技术要点**:
- 使用 ECharts 绘制图表

**相关文件**:
- `client/src/views/equipment/FaultStats.vue`

---

#### TASK-230: 设备统计分析页面（16h）

**任务描述**:
- 实现设备概览统计页面
- 实现维保统计图表（按级别）
- 实现维保成本分析图表

**验收标准**:
- [ ] 设备概览卡片：总设备数、启用数、停用数、报废数
- [ ] 维保统计图表（按保养级别）
- [ ] 维保成本分析（按月）
- [ ] 故障率分析（按设备分类）

**依赖**: TASK-220

**技术要点**:
- 使用 ECharts 绘制图表

**相关文件**:
- `client/src/views/equipment/EquipmentStats.vue`

---

### 四、移动端（2 个任务，64h）

#### TASK-231: 移动端维保记录填写页面（32h）

**任务描述**:
- 实现移动端维保记录填写页面（uniapp）
- 实现拍照上传功能
- 实现电子签名功能
- 实现离线填写、联网同步

**验收标准**:
- [ ] 维保待办列表显示（从 TodoTask 获取）
- [ ] 维保记录表单显示：设备信息、维保日期、保养级别、维保内容、维保前后状态
- [ ] 拍照功能（调用相机）
- [ ] 照片预览、删除
- [ ] 电子签名功能（手写签字板）
- [ ] 离线填写时数据存储到本地
- [ ] 联网后自动同步到服务器
- [ ] 提交时显示确认对话框

**依赖**: TASK-216

**技术要点**:
- 使用 uniapp 开发（支持微信小程序 + H5 + APP）
- 离线存储使用 uni.setStorageSync
- 照片压缩后上传

**相关文件**:
- `mobile/pages/maintenance/todo.vue`
- `mobile/pages/maintenance/create.vue`
- `mobile/components/SignaturePad.vue`

---

#### TASK-232: 移动端设备报修页面（32h）

**任务描述**:
- 实现移动端设备报修发起页面（uniapp）
- 实现移动端报修单接单页面（工程部）
- 实现移动端完成维修页面

**验收标准**:
- [ ] 报修发起页面：选择区域 → 选择设备 → 填写故障描述 → 选择紧急程度 → 拍照
- [ ] 区域选择后自动过滤设备
- [ ] 我的报修单列表（报修人查看）
- [ ] 待处理报修单列表（工程部查看）
- [ ] 接单操作（指派给自己）
- [ ] 完成维修页面：填写故障原因、处理措施、拍照、电子签名
- [ ] 离线填写、联网同步

**依赖**: TASK-217

**技术要点**:
- 使用 uniapp 开发
- 离线存储使用 uni.setStorageSync

**相关文件**:
- `mobile/pages/fault/create.vue`
- `mobile/pages/fault/list.vue`
- `mobile/pages/fault/complete.vue`

---

### 五、测试（2 个任务，16h）

#### TASK-233: 设备管理集成测试（8h）

**任务描述**:
- 测试设备创建 → 启用 → 自动生成保养计划流程
- 测试维护计划到期 → 生成待办任务 → 维保记录填写 → 审批 → 生成下次计划流程
- 测试设备报修 → 接单 → 完成维修 → 关闭待办流程

**验收标准**:
- [ ] 设备启用后自动生成多级保养计划测试通过
- [ ] 维护计划到期提醒测试通过
- [ ] 维保记录审批通过后生成下次计划测试通过
- [ ] 设备报修完整流程测试通过
- [ ] 集成测试覆盖率 > 80%

**依赖**: TASK-213, TASK-214, TASK-216, TASK-217

**相关文件**:
- `server/src/modules/equipment/equipment.service.spec.ts`
- `server/src/modules/equipment/plan.service.spec.ts`

---

#### TASK-234: 设备管理 E2E 测试（8h）

**任务描述**:
- 测试完整设备管理业务流程（PC + 移动端）
- 测试离线填写、联网同步功能

**验收标准**:
- [ ] 设备台账管理 E2E 测试通过
- [ ] 维护计划日历视图 E2E 测试通过
- [ ] 维保记录填写 → 审批 E2E 测试通过
- [ ] 设备报修 → 接单 → 完成 E2E 测试通过
- [ ] 移动端离线填写 E2E 测试通过

**依赖**: TASK-223~232

**相关文件**:
- `e2e/equipment.spec.ts`
- `e2e/mobile/maintenance.spec.ts`

---

## 实施说明

### 关键技术点

1. **分级保养配置**:
   - 支持日/周/月/季/年保养级别
   - 每个级别可独立启用/禁用
   - 不同级别提前提醒天数不同

2. **自动生成维护计划**:
   - 设备启用后自动生成多个保养计划
   - 维保记录审批通过后自动生成该级别下次计划
   - 定时任务每日检查临期计划并生成待办

3. **移动端支持**:
   - 支持微信小程序 + H5 + APP
   - 支持拍照、电子签名
   - 支持离线填写、联网同步

4. **待办任务集成**:
   - 维护计划到期生成待办任务
   - 设备报修生成待办任务
   - 维保记录审批生成待办任务

5. **统计分析**:
   - 维保次数统计（按级别）
   - 故障率统计（按设备）
   - 维保成本统计（按月）
   - 报修统计（按月）

### 依赖关系

```
TASK-209 (设备台账表) → TASK-210 (维护计划表)
                      → TASK-211 (维保记录表)
                      → TASK-212 (设备报修表)

TASK-213 (设备台账 API) → TASK-214 (维护计划自动生成) → TASK-215 (维护计划管理 API)
                                                      → TASK-219 (待办任务集成)
                                                      → TASK-221 (定时任务调度)

TASK-211 (维保记录表) → TASK-216 (维保记录 API) → TASK-219 (待办任务集成)
                                              → TASK-222 (通知服务集成)

TASK-212 (设备报修表) → TASK-217 (设备报修 API) → TASK-219 (待办任务集成)
                                              → TASK-222 (通知服务集成)

TASK-213 ~ TASK-222 (后端 API) → TASK-223 ~ TASK-230 (前端 UI) → TASK-233 ~ TASK-234 (测试)
                              → TASK-231 ~ TASK-232 (移动端)
```

### 实施顺序建议

1. **Phase 1 - 基础数据模型**（64h）: TASK-209 ~ TASK-212
2. **Phase 2 - 核心 API**（200h）: TASK-213 ~ TASK-222
3. **Phase 3 - PC 端界面**（136h）: TASK-223 ~ TASK-230
4. **Phase 4 - 移动端**（64h）: TASK-231 ~ TASK-232
5. **Phase 5 - 测试验证**（16h）: TASK-233 ~ TASK-234

---

**文档版本**: 1.0
**最后更新**: 2026-02-14
**任务总数**: 26
**预计总工时**: 480h
