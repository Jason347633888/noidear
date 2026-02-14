# UI组件汇总

> **来源**: DESIGN.md 各模块的「前端界面」章节  
> **文档版本**: 1.0  
> **最后更新**: 2026-02-14  
> **UI 框架**: Vue 3 + Element Plus + Vite  
> **组件库**: Element Plus 2.5+

---

## 目录

- [1. MVP 模块页面](#1-mvp-模块页面)
- [2. Layer 0 核心架构页面](#2-layer-0-核心架构页面)
- [3. Layer 1 核心生产页面](#3-layer-1-核心生产页面)
- [4. Layer 2 体系管理页面](#4-layer-2-体系管理页面)
- [5. Layer 3 移动端页面](#5-layer-3-移动端页面)
- [6. 通用组件清单](#6-通用组件清单)
- [7. Element Plus 组件使用统计](#7-element-plus-组件使用统计)

---

## 1. MVP 模块页面

### 1.1 三级文档管理

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 一级文件列表 | `/documents/level1` | ElTable, ElButton, ElDialog | [01_三级文档管理.md](../mvp/01_三级文档管理.md#71-文档列表页面) |
| 二级文件列表 | `/documents/level2` | ElTable, ElButton, ElDialog | [01_三级文档管理.md](../mvp/01_三级文档管理.md#71-文档列表页面) |
| 三级文件列表 | `/documents/level3` | ElTable, ElButton, ElDialog | [01_三级文档管理.md](../mvp/01_三级文档管理.md#71-文档列表页面) |
| 文档上传对话框 | - | ElUpload, ElForm, ElInput | [01_三级文档管理.md](../mvp/01_三级文档管理.md#71-文档列表页面) |
| PDF 预览对话框 | - | PdfViewer（自定义） | [01_三级文档管理.md](../mvp/01_三级文档管理.md#71-文档列表页面) |

---

### 1.2 模板管理

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 模板列表 | `/templates` | ElTable, ElButton, ElTag | [02_模板管理.md](../mvp/02_模板管理.md#71-模板列表页面) |
| 创建模板 | `/templates/create` | ElForm, DynamicFormBuilder（自定义） | [02_模板管理.md](../mvp/02_模板管理.md#71-模板列表页面) |
| 编辑模板 | `/templates/:id/edit` | ElForm, DynamicFormBuilder（自定义） | [02_模板管理.md](../mvp/02_模板管理.md#71-模板列表页面) |
| 模板预览对话框 | - | ElDialog, DynamicFormPreview（自定义） | [02_模板管理.md](../mvp/02_模板管理.md#71-模板列表页面) |

**关键自定义组件**:
- `DynamicFormBuilder.vue` - 拖拽式表单设计器
- `DynamicFormPreview.vue` - 表单预览组件

---

### 1.3 任务管理

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 我的任务 | `/tasks/my` | ElTable, ElTag, ElButton | [03_任务管理.md](../mvp/03_任务管理.md#71-我的任务页面) |
| 任务填写 | `/tasks/:id/fill` | ElForm, DynamicFormRender（自定义） | [03_任务管理.md](../mvp/03_任务管理.md#72-任务填写页面) |
| 任务详情 | `/tasks/:id` | ElDescriptions, ElTimeline | [03_任务管理.md](../mvp/03_任务管理.md#71-我的任务页面) |

**关键自定义组件**:
- `DynamicFormRender.vue` - 动态表单渲染器（根据模板配置渲染表单）

---

### 1.4 审批流程

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 待审批列表 | `/approvals/pending` | ElTable, ElTag, ElButton | [04_审批流程.md](../mvp/04_审批流程.md#71-待审批页面) |
| 审批对话框 | - | ElDialog, ElForm, ElInput（审批意见） | [04_审批流程.md](../mvp/04_审批流程.md#72-审批对话框) |
| 审批历史 | `/approvals/history` | ElTable, ElTimeline | [04_审批流程.md](../mvp/04_审批流程.md#73-审批历史页面) |

---

### 1.5 权限管理

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 用户管理 | `/users` | ElTable, ElForm, ElSelect | [05_权限管理.md](../mvp/05_权限管理.md) |
| 角色管理 | `/roles` | ElTable, ElTree（权限树） | [05_权限管理.md](../mvp/05_权限管理.md) |
| 部门管理 | `/departments` | ElTree, ElForm | [05_权限管理.md](../mvp/05_权限管理.md) |

---

### 1.6 回收站

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 回收站列表 | `/trash` | ElTable, ElButton, ElTag | [06_回收站.md](../mvp/06_回收站.md#61-回收站页面待实现-) |

**实现状态**: ⏳ 待实现（MVP 最后 2% 未完成）

---

### 1.7 配方偏离检测

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 偏离检测配置 | `/deviation/config` | ElForm, ElInputNumber | [07_配方偏离检测.md](../mvp/07_配方偏离检测.md) |
| 偏离报告查看 | `/deviation/reports` | ElTable, ElTag | [07_配方偏离检测.md](../mvp/07_配方偏离检测.md) |

---

### 1.8 统计分析

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 统计报表 | `/statistics` | ElTable, ElDatePicker, ElSelect | [08_统计分析.md](../mvp/08_统计分析.md) |

---

### 1.9 数据导出

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 导出配置对话框 | - | ElDialog, ElForm, ElCheckbox | [09_数据导出.md](../mvp/09_数据导出.md) |

---

## 2. Layer 0 核心架构页面

### 2.1 动态表单引擎

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 表单设计器 | `/form-builder` | DynamicFormBuilder（自定义） | [10_动态表单引擎.md](../layer0_核心架构/10_动态表单引擎.md) |

**关键组件**:
- `FieldPalette.vue` - 字段拖拽面板
- `FormCanvas.vue` - 表单画布
- `FieldConfigurator.vue` - 字段属性配置器

---

### 2.2 批次追溯系统

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 正向追溯 | `/trace/forward` | ElForm, ElTree, ElTimeline | [11_批次追溯系统.md](../layer0_核心架构/11_批次追溯系统.md) |
| 反向追溯 | `/trace/backward` | ElForm, ElTree, ElTimeline | [11_批次追溯系统.md](../layer0_核心架构/11_批次追溯系统.md) |

---

## 3. Layer 1 核心生产页面

### 3.1 仓库管理系统

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 原料库存 | `/warehouse/materials` | ElTable, ElTag | [12_仓库管理系统.md](../layer1_核心生产/12_仓库管理系统.md) |
| 成品库存 | `/warehouse/products` | ElTable, ElTag | [12_仓库管理系统.md](../layer1_核心生产/12_仓库管理系统.md) |
| 入库单 | `/warehouse/inbound` | ElForm, ElTable | [12_仓库管理系统.md](../layer1_核心生产/12_仓库管理系统.md) |
| 出库单 | `/warehouse/outbound` | ElForm, ElTable | [12_仓库管理系统.md](../layer1_核心生产/12_仓库管理系统.md) |

---

### 3.2 设备管理系统

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 设备台账 | `/equipment/list` | ElTable, ElTag | [13_设备管理系统.md](../layer1_核心生产/13_设备管理系统.md) |
| 保养计划 | `/equipment/maintenance` | ElTable, ElCalendar | [13_设备管理系统.md](../layer1_核心生产/13_设备管理系统.md) |
| 设备履历 | `/equipment/:id/history` | ElTimeline, ElDescriptions | [13_设备管理系统.md](../layer1_核心生产/13_设备管理系统.md) |

---

## 4. Layer 2 体系管理页面

### 4.1 培训管理系统

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 培训计划 | `/training/plans` | ElTable, ElCalendar | [14_培训管理系统.md](../layer2_体系管理/14_培训管理系统.md) |
| 培训记录 | `/training/records` | ElTable, ElTag | [14_培训管理系统.md](../layer2_体系管理/14_培训管理系统.md) |
| 员工培训档案 | `/training/employee/:id` | ElDescriptions, ElTimeline | [14_培训管理系统.md](../layer2_体系管理/14_培训管理系统.md) |

---

### 4.2 内审管理系统

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 审核计划 | `/audit/plans` | ElTable, ElCalendar | [15_内审管理系统.md](../layer2_体系管理/15_内审管理系统.md) |
| 不符合项 | `/audit/findings` | ElTable, ElTag | [15_内审管理系统.md](../layer2_体系管理/15_内审管理系统.md) |
| 纠正措施 | `/audit/corrective-actions` | ElForm, ElTable | [15_内审管理系统.md](../layer2_体系管理/15_内审管理系统.md) |

---

## 5. Layer 3 移动端页面

### 5.1 移动端应用（uniapp）

| 页面 | 路由 | 主要组件 | 来源 |
|------|------|----------|------|
| 任务列表 | `/pages/tasks/list` | uni-list, uni-tag | [16_移动端应用.md](../layer3_移动端/16_移动端应用.md) |
| 任务填写 | `/pages/tasks/fill` | uni-forms, uni-file-picker | [16_移动端应用.md](../layer3_移动端/16_移动端应用.md) |
| 电子签名 | `/pages/signature` | canvas（自定义签名组件） | [16_移动端应用.md](../layer3_移动端/16_移动端应用.md) |

**UI 框架**: uni-ui（uniapp 官方组件库）

---

## 6. 通用组件清单

### 6.1 自定义业务组件

| 组件名 | 用途 | 依赖 | 来源 |
|--------|------|------|------|
| `DynamicFormBuilder.vue` | 表单设计器 | Element Plus, VueDraggable | [10_动态表单引擎.md](../layer0_核心架构/10_动态表单引擎.md) |
| `DynamicFormRender.vue` | 表单渲染器 | Element Plus | [10_动态表单引擎.md](../layer0_核心架构/10_动态表单引擎.md) |
| `PdfViewer.vue` | PDF 预览 | vue-pdf-embed, pdfjs-dist | [01_三级文档管理.md](../mvp/01_三级文档管理.md) |
| `SignaturePad.vue` | 电子签名 | canvas | [16_移动端应用.md](../layer3_移动端/16_移动端应用.md) |
| `FileUpload.vue` | 文件上传 | ElUpload, MinIO | [01_三级文档管理.md](../mvp/01_三级文档管理.md) |
| `BatchSelector.vue` | 批次选择器 | ElSelect | [11_批次追溯系统.md](../layer0_核心架构/11_批次追溯系统.md) |

---

### 6.2 通用功能组件

| 组件名 | 用途 | Element Plus 依赖 |
|--------|------|-------------------|
| `PageContainer.vue` | 页面容器 | - |
| `SearchBar.vue` | 搜索栏 | ElInput, ElButton, ElSelect |
| `DataTable.vue` | 数据表格（封装 ElTable） | ElTable, ElPagination |
| `FormDialog.vue` | 表单对话框 | ElDialog, ElForm |
| `ActionButtons.vue` | 操作按钮组 | ElButton, ElDropdown |

---

## 7. Element Plus 组件使用统计

### 7.1 高频组件（使用次数 > 10）

| 组件 | 用途 | 使用场景 |
|------|------|----------|
| **ElTable** | 数据表格 | 文档列表、任务列表、审批列表、审计日志等 |
| **ElForm** | 表单 | 创建/编辑文档、模板、任务、用户等 |
| **ElButton** | 按钮 | 所有页面的操作按钮 |
| **ElDialog** | 对话框 | 审批、上传、预览、删除确认等 |
| **ElInput** | 输入框 | 所有表单字段 |
| **ElSelect** | 下拉选择 | 部门选择、状态筛选、类型选择等 |
| **ElTag** | 标签 | 状态显示（草稿、已发布、已归档等） |
| **ElPagination** | 分页 | 所有列表页面 |

---

### 7.2 中频组件（使用次数 5-10）

| 组件 | 用途 | 使用场景 |
|------|------|----------|
| **ElDatePicker** | 日期选择 | 审计日志查询、任务截止时间、培训计划等 |
| **ElUpload** | 文件上传 | 文档上传、附件上传 |
| **ElTree** | 树形控件 | 部门树、权限树、批次追溯树 |
| **ElTimeline** | 时间线 | 审批历史、设备履历、批次流转 |
| **ElDescriptions** | 描述列表 | 详情页展示（文档详情、任务详情、设备详情） |
| **ElCheckbox** | 复选框 | 批量操作、权限配置、导出字段选择 |
| **ElRadio** | 单选框 | 表单字段类型选择、审批结果选择 |
| **ElBadge** | 徽标 | 未读通知数量 |

---

### 7.3 低频组件（使用次数 < 5）

| 组件 | 用途 | 使用场景 |
|------|------|----------|
| **ElCalendar** | 日历 | 培训计划、审核计划 |
| **ElNotification** | 通知 | 操作成功/失败提示 |
| **ElMessage** | 消息提示 | 轻量级提示 |
| **ElDropdown** | 下拉菜单 | 更多操作按钮 |
| **ElSwitch** | 开关 | 用户状态启用/禁用、权限开关 |
| **ElSteps** | 步骤条 | 工作流流程展示 |
| **ElProgress** | 进度条 | 文件上传进度、任务完成度 |

---

## 页面路由汇总

### Web 端（Vue Router）

```typescript
// 文档管理
/documents/level1          // 一级文件列表
/documents/level2          // 二级文件列表
/documents/level3          // 三级文件列表

// 模板管理
/templates                 // 模板列表
/templates/create          // 创建模板
/templates/:id/edit        // 编辑模板

// 任务管理
/tasks/my                  // 我的任务
/tasks/:id/fill            // 任务填写
/tasks/:id                 // 任务详情

// 审批流程
/approvals/pending         // 待审批列表
/approvals/history         // 审批历史

// 权限管理
/users                     // 用户管理
/roles                     // 角色管理
/departments               // 部门管理

// 批次追溯
/trace/forward             // 正向追溯
/trace/backward            // 反向追溯

// 系统功能
/trash                     // 回收站
/notifications             // 通知中心
/audit-logs                // 审计日志

// Layer 1 核心生产
/warehouse/materials       // 原料库存
/warehouse/products        // 成品库存
/equipment/list            // 设备台账
/equipment/maintenance     // 保养计划

// Layer 2 体系管理
/training/plans            // 培训计划
/training/records          // 培训记录
/audit/plans               // 审核计划
/audit/findings            // 不符合项
```

---

### 移动端（uniapp）

```typescript
// 任务管理
/pages/tasks/list          // 任务列表
/pages/tasks/fill          // 任务填写
/pages/signature           // 电子签名
```

---

**本文档完成 ✅**
