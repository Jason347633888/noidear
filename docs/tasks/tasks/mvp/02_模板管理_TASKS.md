# 模板管理（四级文件模板） - Task 分解

> **来源**: docs/design/mvp/02_模板管理.md  
> **总工作量**: 320h  
> **优先级**: P0（MVP 核心功能）  
> **依赖**: 编号规则模块（复用 TASK-002）

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 数据模型 | 1 | 8h |
| 后端 API | 7 | 112h |
| 前端 UI | 8 | 128h |
| 测试 | 4 | 72h |
| **总计** | **20** | **320h** |

---

## TASK-021: 创建模板数据模型

**类型**: 数据模型

**工作量**: 8h

**优先级**: P0（阻塞其他 Task）

**依赖**: 无

**描述**:
根据 02_模板管理.md 第 157-172 行设计，创建 templates 表。

**验收标准**:
- [ ] Prisma Schema 编写完成（schema.prisma）
- [ ] templates 表包含所有字段（id, level, number, title, fields_json, version, status, creator_id, created_at, updated_at, deleted_at）
- [ ] fields_json 字段使用 Json 类型（存储 TemplateField[]）
- [ ] 唯一索引配置正确（number 字段 @unique）
- [ ] 外键约束配置正确（creator_id 引用 users(id)）
- [ ] 数据库迁移文件生成
- [ ] 软删除字段配置正确（deleted_at DateTime?）

**技术要点**:
- fields_json 使用 Prisma Json 类型
- version 字段使用 Decimal(3,1) 类型
- status 字段使用枚举类型（active, inactive）
- level 字段默认值为 4

**相关文件**:
- server/src/prisma/schema.prisma
- server/prisma/migrations/xxx_add_templates/

**后续 Task**: TASK-022（模板 CRUD API 依赖此表）

---

## TASK-022: 实现模板 CRUD API

**类型**: 后端 API

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-021

**描述**:
实现模板的创建、读取、更新、删除 API。

**API 端点**:
- POST /api/v1/templates - 创建模板
- GET /api/v1/templates - 查询模板列表
- GET /api/v1/templates/:id - 查询模板详情
- PUT /api/v1/templates/:id - 更新模板
- DELETE /api/v1/templates/:id - 删除模板

**验收标准**:
- [ ] 所有端点实现完成
- [ ] 请求/响应格式符合设计文档
- [ ] 创建模板时自动生成模板编号（复用 TASK-005 编号生成逻辑）
- [ ] 更新模板时版本号自动递增
- [ ] 异常处理完整（try-catch）
- [ ] 权限校验（@UseGuards(JwtAuthGuard)）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则校验**:
- BR-003: 四级文件（模板）创建后直接发布，无需审批
- BR-005: 模板停用后，不可再新建数据，历史数据可查询

**相关文件**:
- server/src/modules/template/template.controller.ts
- server/src/modules/template/template.service.ts
- server/src/modules/template/dto/*.dto.ts
- server/test/template.e2e-spec.ts

**后续 Task**: TASK-026（前端模板列表页面依赖此 API）

---

## TASK-023: 实现模板复制 API

**类型**: 后端 API

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-022

**描述**:
实现模板复制功能，快速基于已有模板创建新模板。

**API 端点**:
- POST /api/v1/templates/:id/copy

**业务逻辑**:
1. 读取源模板信息
2. 复制 fields_json 配置
3. 生成新模板编号
4. 标题添加"副本"后缀
5. 版本号重置为 1.0
6. 创建新模板记录

**验收标准**:
- [ ] 复制逻辑正确（复制 fields_json，生成新编号）
- [ ] 标题自动添加"（副本）"后缀
- [ ] 版本号重置为 1.0
- [ ] 权限校验（只有授权用户可复制）
- [ ] 异常处理（源模板不存在、无权限）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**相关文件**:
- server/src/modules/template/template.controller.ts
- server/src/modules/template/template.service.ts
- server/test/template.e2e-spec.ts

**后续 Task**: TASK-027（前端复制按钮依赖此 API）

---

## TASK-024: 实现模板启用/停用 API

**类型**: 后端 API

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-022

**描述**:
实现模板启用/停用 API，支持状态切换。

**API 端点**:
- POST /api/v1/templates/:id/toggle-status

**业务逻辑**:
- active → inactive（停用）
- inactive → active（启用）

**验收标准**:
- [ ] 状态切换逻辑正确
- [ ] 停用后不可再新建数据（BR-005）
- [ ] 权限校验（只有授权用户可操作）
- [ ] 异常处理（模板不存在、无权限）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**业务规则**:
- BR-005: 模板停用后，不可再新建数据，历史数据可查询

**相关文件**:
- server/src/modules/template/template.controller.ts
- server/src/modules/template/template.service.ts
- server/test/template.e2e-spec.ts

**后续 Task**: TASK-028（前端启用/停用按钮依赖此 API）

---

## TASK-025: 实现 Excel 上传解析服务

**类型**: 后端 API

**工作量**: 24h

**优先级**: P1

**依赖**: TASK-021

**描述**:
实现 Excel 文件上传解析功能，自动解析为模板字段。

**API 端点**:
- POST /api/v1/templates/parse-excel

**解析逻辑**:
1. 上传 Excel 文件
2. 使用 xlsx 库解析（已在技术栈中）
3. 识别表头作为字段标签
4. 自动推断字段类型（文本/数值/日期）
5. 返回字段配置 JSON

**验收标准**:
- [ ] 支持 .xlsx 和 .xls 格式
- [ ] 正确解析表头为字段标签
- [ ] 自动推断字段类型
- [ ] 返回 TemplateField[] 格式
- [ ] 文件大小限制（最大 5MB）
- [ ] 异常处理（文件格式错误、解析失败）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**技术要点**:
- 使用 xlsx 库解析 Excel
- 字段类型推断规则：
  - 数字 → number
  - 日期 → date
  - 布尔 → switch
  - 其他 → text

**相关文件**:
- server/src/modules/template/services/excel-parser.service.ts
- server/test/excel-parser.service.spec.ts

**后续 Task**: TASK-029（前端 Excel 上传组件依赖此 API）

---

## TASK-026: 实现模板列表页面（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-022

**描述**:
实现模板列表页面，支持搜索、筛选、分页。

**页面路由**: `/templates`

**功能要求**:
- 模板列表展示（表格）
- 关键词搜索
- 状态筛选（启用/停用）
- 分页
- 操作按钮（编辑、停用、删除、复制、分发任务）

**验收标准**:
- [ ] 页面布局符合设计稿（02_模板管理.md 第 287-298 行）
- [ ] 模板列表正确展示（编号、标题、版本、状态、创建人、创建时间）
- [ ] 搜索、筛选功能正常
- [ ] 分页功能正常
- [ ] 操作按钮根据状态动态显示
- [ ] 权限校验（无权限时隐藏操作按钮）
- [ ] 异常处理（加载失败、网络错误）
- [ ] 响应式布局（支持 1920x1080 分辨率）

**主要组件**:
- TemplateList.vue - 模板列表组件

**相关文件**:
- client/src/views/template/TemplateList.vue

**后续 Task**: TASK-027（模板编辑器）

---

## TASK-027: 实现模板编辑器（前端）

**类型**: 前端 UI

**工作量**: 32h

**优先级**: P0

**依赖**: TASK-022

**描述**:
实现可视化拖拽式模板编辑器，支持 20+ 种字段类型。

**页面路由**: `/templates/edit/:id?`

**功能要求**（三栏布局）:
- **左侧字段库**: 20+ 种字段类型（文本、数值、日期、下拉等）
- **中间预览区**: 实时预览表单效果
- **右侧属性配置**: 配置字段属性（标签、必填、默认值、验证规则）

**验收标准**:
- [ ] 页面布局符合设计稿（02_模板管理.md 第 302-316 行）
- [ ] 支持拖拽添加字段（sortablejs）
- [ ] 支持拖拽排序字段（sortablejs）
- [ ] 支持删除字段
- [ ] 支持配置字段属性（标签、必填、默认值、验证规则）
- [ ] 支持 20+ 种字段类型（02_模板管理.md 第 78-103 行）
- [ ] 实时预览表单效果
- [ ] 保存模板功能（调用 TASK-022 API）
- [ ] 权限校验
- [ ] 异常处理（保存失败、网络错误）
- [ ] 响应式布局

**主要组件**:
- TemplateEditor.vue - 模板编辑器组件
- FieldLibrary.vue - 字段库组件
- FieldConfig.vue - 字段配置组件
- FieldPreview.vue - 字段预览组件

**相关文件**:
- client/src/views/template/TemplateEditor.vue
- client/src/components/template/FieldLibrary.vue
- client/src/components/template/FieldConfig.vue
- client/src/components/template/FieldPreview.vue

**后续 Task**: TASK-030（动态表单渲染组件）

---

## TASK-028a: 实现基础字段组件库（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: 无

**描述**:
实现基础字段组件（10 种），用于模板编辑器和表单渲染。

**字段类型**:
- 基础字段：文本、长文本、数值、日期、时间、日期时间（6 种）
- 选择字段：下拉、多选、单选框、复选框（4 种）

**验收标准**:
- [ ] 实现 10 种基础字段组件
- [ ] 每个字段组件支持配置（label, required, defaultValue, validation, options）
- [ ] 字段验证逻辑正确（必填、最小值、最大值、正则）
- [ ] 字段组件符合 Element Plus 规范
- [ ] DynamicField.vue 统一入口组件正确路由到各字段组件
- [ ] 所有组件有对应单元测试

**主要组件**:
- DynamicField.vue - 动态字段渲染组件（统一入口）
- TextField.vue、LongTextField.vue、NumberField.vue
- DateField.vue、TimeField.vue、DateTimeField.vue
- SelectField.vue、MultiSelectField.vue、RadioField.vue、CheckboxField.vue

**相关文件**:
- client/src/components/fields/DynamicField.vue
- client/src/components/fields/TextField.vue
- client/src/components/fields/NumberField.vue
- client/src/components/fields/DateField.vue
- client/src/components/fields/SelectField.vue
- ...

**后续 Task**: TASK-028b（高级字段组件）、TASK-030（动态表单渲染）

---

## TASK-028b: 实现高级字段组件库（前端）

**类型**: 前端 UI

**工作量**: 24h

**优先级**: P1

**依赖**: TASK-028a

**描述**:
实现高级字段组件（10+ 种），用于模板编辑器和表单渲染。

**字段类型**:
- 高级字段：是/否、上传、图片、签名、富文本、位置、扫码（7 种）
- 级联字段：级联选择、树选择（2 种）
- 装饰字段：分割线、标题（2 种）

**验收标准**:
- [ ] 实现 10+ 种高级字段组件
- [ ] 每个字段组件支持配置（label, required, defaultValue, validation）
- [ ] 签名组件支持手写签名（使用 Canvas 或第三方库）
- [ ] 富文本组件集成 Tiptap 编辑器
- [ ] 位置组件支持地图选点（集成高德地图或腾讯地图）
- [ ] 扫码组件支持二维码/条形码扫描（使用 Camera API）
- [ ] 级联选择、树选择组件符合 Element Plus 规范
- [ ] 所有组件有对应单元测试

**主要组件**:
- SwitchField.vue、UploadField.vue、ImageField.vue
- SignatureField.vue、RichTextField.vue、LocationField.vue、ScanField.vue
- CascaderField.vue、TreeSelectField.vue
- DividerField.vue、HeadingField.vue

**相关文件**:
- client/src/components/fields/SignatureField.vue
- client/src/components/fields/RichTextField.vue
- client/src/components/fields/LocationField.vue
- client/src/components/fields/ScanField.vue
- ...

**后续 Task**: TASK-030（动态表单渲染依赖这些组件）

---

## TASK-029: 实现 Excel 上传解析组件（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-025

**描述**:
实现 Excel 上传解析组件，自动解析为模板字段。

**功能要求**:
- 文件上传（拖拽、点击）
- 文件类型校验（.xlsx, .xls）
- 文件大小校验（最大 5MB）
- 上传进度显示
- 解析结果预览
- 一键导入到模板编辑器

**验收标准**:
- [ ] 支持拖拽和点击上传
- [ ] 文件类型和大小校验
- [ ] 上传进度显示
- [ ] 调用 TASK-025 API 解析 Excel
- [ ] 解析结果预览（字段列表）
- [ ] 一键导入到模板编辑器
- [ ] 异常处理（文件格式错误、解析失败、上传失败）
- [ ] 响应式布局

**主要组件**:
- ExcelUpload.vue - Excel 上传组件

**相关文件**:
- client/src/components/template/ExcelUpload.vue

**后续 Task**: 无

---

## TASK-030: 实现动态表单渲染组件（前端）

**类型**: 前端 UI

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-028

**描述**:
实现动态表单渲染组件，根据模板配置动态渲染表单。

**功能要求**:
- 根据 fields_json 动态渲染表单
- 支持字段验证（必填、最小值、最大值、正则）
- 支持默认值填充
- 支持表单提交
- 支持表单重置

**验收标准**:
- [ ] 正确解析 fields_json 配置
- [ ] 动态渲染所有字段类型（调用 TASK-028 字段组件）
- [ ] 字段验证逻辑正确
- [ ] 默认值填充正确
- [ ] 表单提交功能正常
- [ ] 表单重置功能正常
- [ ] 异常处理（配置错误、验证失败）
- [ ] 响应式布局

**主要组件**:
- DynamicForm.vue - 动态表单渲染组件

**相关文件**:
- client/src/components/DynamicForm.vue

**后续 Task**: 无（此组件在任务填写时使用）

---

## TASK-031: 实现模板复制按钮（前端）

**类型**: 前端 UI

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-023

**描述**:
实现模板复制按钮，快速基于已有模板创建新模板。

**功能要求**:
- 复制按钮
- 确认对话框
- 复制成功后跳转到编辑页面

**验收标准**:
- [ ] 复制按钮正确显示（只在 active 状态显示）
- [ ] 点击后弹出确认对话框
- [ ] 调用 TASK-023 API 复制模板
- [ ] 复制成功后跳转到编辑页面
- [ ] 异常处理（复制失败、网络错误）
- [ ] 权限校验（无权限时禁用按钮）

**相关文件**:
- client/src/views/template/TemplateList.vue

**后续 Task**: 无

---

## TASK-032: 实现模板启用/停用按钮（前端）

**类型**: 前端 UI

**工作量**: 8h

**优先级**: P1

**依赖**: TASK-024

**描述**:
实现模板启用/停用按钮，支持状态切换。

**功能要求**:
- 启用/停用按钮
- 确认对话框
- 状态切换后刷新列表

**验收标准**:
- [ ] 启用/停用按钮根据状态动态显示
- [ ] 点击后弹出确认对话框
- [ ] 调用 TASK-024 API 切换状态
- [ ] 状态切换成功后刷新列表
- [ ] 异常处理（切换失败、网络错误）
- [ ] 权限校验（无权限时禁用按钮）

**相关文件**:
- client/src/views/template/TemplateList.vue

**后续 Task**: 无

---

## TASK-033: 编写模板管理单元测试（后端）

**类型**: 测试

**工作量**: 24h

**优先级**: P1

**依赖**: TASK-022, TASK-023, TASK-024, TASK-025

**描述**:
编写模板管理模块的单元测试，覆盖核心业务逻辑。

**测试范围**:
- 模板 CRUD 逻辑
- 模板复制逻辑
- 模板启用/停用逻辑
- Excel 解析逻辑

**验收标准**:
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 所有核心业务规则有对应测试用例
- [ ] Mock 外部依赖（Prisma、文件系统）
- [ ] 测试用例清晰、可读
- [ ] 所有测试通过

**相关文件**:
- server/test/template.service.spec.ts
- server/test/excel-parser.service.spec.ts

**后续 Task**: 无

---

## TASK-034: 编写模板管理集成测试（后端）

**类型**: 测试

**工作量**: 24h

**优先级**: P1

**依赖**: TASK-022, TASK-023, TASK-024, TASK-025

**描述**:
编写模板管理模块的集成测试，验证 API 端点。

**测试范围**:
- POST /api/v1/templates
- GET /api/v1/templates
- GET /api/v1/templates/:id
- PUT /api/v1/templates/:id
- DELETE /api/v1/templates/:id
- POST /api/v1/templates/:id/copy
- POST /api/v1/templates/:id/toggle-status
- POST /api/v1/templates/parse-excel

**验收标准**:
- [ ] 所有 API 端点有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 测试覆盖权限校验
- [ ] 测试覆盖业务规则校验
- [ ] 所有测试通过

**相关文件**:
- server/test/template.e2e-spec.ts

**后续 Task**: 无

---

## TASK-035: 编写前端组件单元测试

**类型**: 测试

**工作量**: 16h

**优先级**: P2

**依赖**: TASK-026, TASK-027, TASK-028, TASK-029, TASK-030

**描述**:
编写前端组件的单元测试，验证组件逻辑。

**测试范围**:
- TemplateList.vue
- TemplateEditor.vue
- DynamicField.vue（20+ 种字段组件）
- ExcelUpload.vue
- DynamicForm.vue

**验收标准**:
- [ ] 所有核心组件有对应测试用例
- [ ] 测试覆盖组件交互逻辑
- [ ] 测试覆盖数据渲染逻辑
- [ ] Mock API 请求
- [ ] 所有测试通过

**相关文件**:
- client/src/views/template/__tests__/TemplateList.spec.ts
- client/src/views/template/__tests__/TemplateEditor.spec.ts
- client/src/components/fields/__tests__/DynamicField.spec.ts
- client/src/components/template/__tests__/ExcelUpload.spec.ts
- client/src/components/__tests__/DynamicForm.spec.ts

**后续 Task**: 无

---

## TASK-036: 编写 E2E 测试（Playwright）

**类型**: 测试

**工作量**: 8h

**优先级**: P2

**依赖**: TASK-026, TASK-027, TASK-030

**描述**:
编写模板管理模块的 E2E 测试，验证关键用户流程。

**测试场景**:
1. 用户创建模板 → 配置字段 → 保存 → 发布
2. 用户上传 Excel → 自动解析 → 导入字段 → 保存
3. 用户复制模板 → 修改标题 → 保存
4. 用户停用模板 → 查看历史数据
5. 用户启用模板 → 分发任务

**验收标准**:
- [ ] 所有关键用户流程有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 所有测试通过

**相关文件**:
- client/e2e/template.spec.ts

**后续 Task**: 无

---

**本文档完成 ✅**
