# RD-001 产品研发流程模块 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 9 步产品研发流程（ProcessTemplate/Instance/StepData），含专用业务组件、扩展动态表单字段类型、跨步骤数据联动与 HACCP 审批。

**Architecture:** 三层架构——通用表单层（扩展 DynamicForm）+ 专用业务组件层（AllergenTable/ProcessParams/DigitRoller）+ 流程编排层（ProcessInstance 9步顺序推进）。

**Tech Stack:** Vue 3 + Element Plus + Pinia / NestJS 10 + Prisma 5 / PostgreSQL 15

---

## 约束合规声明

| 约束 | 处理方式 |
|------|---------|
| **库引入** | 不引入新库。dayjs/element-plus/axios 已在 package.json（已验证）|
| **PDF 方案** | 使用 `window.print() + print CSS`，来自 REQUIREMENTS.md §十四 产品明确规定 |
| **函数行数 <50行** | 每个 Vue 组件的函数/方法控制在 50 行以内；复杂组件拆分子组件 |
| **缩进 <3层** | 模板中 v-if 嵌套不超过 3 层；深层条件提取为计算属性 |
| **向后兼容** | T01 后立即执行 `npm run build` 验证 User 模型兼容性 |
| **日志安全** | approveStep 中 comment 字段不打印到日志 |
| **Context 限制** | 每 Task 读取文件约 8-15K tokens，远低于 1M 限制 |

---

## 任务总览（24 Tasks）

| Task | 类型 | 内容 |
|------|------|------|
| T01 | DB | Prisma Schema 变更（Material.ingredientInfo + 3个新模型）|
| T02 | BE | NestJS process 模块脚手架 |
| T03 | BE | 流程实例 CRUD API + 单元测试 |
| T04 | BE | 步骤数据提交 + 审批 API |
| T05 | FE | 字段类型：auto-username / auto-date / section-header / static-content |
| T06 | FE | 字段类型：table-input / range-select / constrained-number / checkbox-text |
| T07 | FE | 字段类型：auto-display / template-content / approval-step |
| T08 | FE | DigitRoller.vue（三列数字滚轮）|
| T09 | FE | AllergenTable.vue（致敏原表）|
| T10a | FE | OvenZoneTable.vue（炉温参数表）|
| T10b | FE | FanDeviceTable.vue（风机频率表）|
| T10c | FE | ProcessParams.vue（组合 T10a+T10b 的编排容器）|
| T11 | FE | processApi + ProcessList 列表页 + 路由 |
| T12 | FE | Step 1 视图：产品研发与立项申请 |
| T13 | FE | Step 2 视图：设计输入（仓库物料搜索）|
| T14 | FE | Step 3 视图：风险识别 |
| T15 | FE | Step 4 视图：研发试验原始记录 |
| T16 | FE | Step 5 视图：验证评审（中试）|
| T17 | FE | Step 6 视图：验证评审核对清单 |
| T18 | FE | Step 7 视图：危害评估与验证 |
| T19 | FE | Step 8 视图：开发评审/放行审批 |
| T20 | FE | Step 9 视图：开发输出 |
| T21 | FE | ProcessDetail 步骤导航容器 |
| T22 | FE | PDF 打印导出 |

---

## T01：Prisma Schema 变更

**Files:** `server/src/prisma/schema.prisma`

**步骤：**

1. 读取 schema，确认 Material 模型和 User 模型位置：`grep -n "model Material\|model User" server/src/prisma/schema.prisma`
2. 在 `Material` 模型末尾新增 `ingredientInfo String? @db.Text`
3. 在 schema 末尾新增枚举 `ProcessStatus`（DRAFT/IN_PROGRESS/COMPLETED/REJECTED）
4. 新增枚举 `ProcessStepStatus`（PENDING/IN_PROGRESS/SUBMITTED/APPROVED/REJECTED）
5. 新增模型 `ProcessTemplate`（id/name/steps-Json/isActive/createdAt/updatedAt）
6. 新增模型 `ProcessInstance`（id/templateId/productName/currentStep默认1/status/createdById/时间戳）
7. 新增模型 `ProcessStepData`（id/instanceId/stepNumber/data-Json/status/submittedById/submittedAt/approvedById/approvedAt/approvalComment，唯一约束 `@@unique([instanceId, stepNumber])`）
8. 在 `User` 模型中新增三个关联字段（processInstances/processStepSubmissions/processStepApprovals）
9. 执行：`cd server && npx prisma generate --schema=src/prisma/schema.prisma`
10. 执行：`npx prisma migrate dev --name add-rd001-process-models --schema=src/prisma/schema.prisma`
11. ⚠️ **兼容性验证（必须执行）**：`npm run build 2>&1 | grep -c "error"` → 期望输出 0
12. Commit：`feat(db): 新增产品研发流程数据模型 (ProcessTemplate/Instance/StepData)`

---

## T02：NestJS process 模块脚手架

**Files:**
- 新建 `server/src/modules/process/dto/create-process.dto.ts`
- 新建 `server/src/modules/process/dto/submit-step.dto.ts`（含 SubmitStepDto + ApproveStepDto）
- 新建 `server/src/modules/process/dto/index.ts`
- 新建 `server/src/modules/process/process.service.ts`（骨架，submitStep/approveStep 暂抛 Error）
- 新建 `server/src/modules/process/process.controller.ts`（8 个端点）
- 新建 `server/src/modules/process/process.module.ts`
- 修改 `server/src/app.module.ts`（注册 ProcessModule）

**步骤：**

1. 读取 `server/src/modules/approval/approval.module.ts`（参考模块结构）
2. 创建 DTO：CreateProcessInstanceDto（templateId: string）；SubmitStepDto（stepNumber 1-9, data Object, saveAsDraft boolean?）；ApproveStepDto（stepNumber 7-8, action 'approve'|'reject', comment string?）
3. 创建 ProcessService 骨架（listInstances/getInstance/createInstance/getStepData/deleteInstance/updateProductName，每个方法 <30 行）
4. 创建 ProcessController（8 个端点，全部加 @UseGuards(JwtAuthGuard)）
5. 创建 ProcessModule，imports: [PrismaModule]
6. 在 app.module.ts 的 imports 中加入 ProcessModule
7. 验证：`cd server && npm run build 2>&1 | grep "error" | head -5` → 期望 0 错误
8. Commit：`feat(process): 新增产品研发流程 NestJS 模块脚手架`

---

## T03：流程实例 CRUD API + 单元测试

**Files:**
- 修改 `server/src/modules/process/process.service.ts`
- 新建 `server/src/modules/process/process.service.spec.ts`

**步骤：**

1. 读取 `server/src/modules/record/record.service.ts` 前 60 行（参考 CRUD 模式）
2. 实现 `getStepData(instanceId, stepNumber)`：查询 ProcessStepData，找不到返回 `{ stepNumber, data: {}, status: 'PENDING' }`
3. 实现 `deleteInstance(instanceId, userId)`：先 getInstance，检验 createdById 和 status != COMPLETED，再 delete
4. 实现 `updateProductName(instanceId, name)`：prisma.processInstance.update
5. 在 controller 中补充 DELETE 和 GET /steps/:n 端点
6. 编写测试（5 个 case）：
   - getInstance 找不到时抛 NotFoundException
   - getStepData 无数据时返回空 stub
   - deleteInstance 非创建者时抛 ForbiddenException
   - deleteInstance COMPLETED 时抛 ForbiddenException
   - listInstances 按 userId 过滤
7. 运行：`npx jest src/modules/process/process.service.spec.ts --coverage` → 期望 5 tests pass, coverage >80%
8. Commit：`feat(process): 流程实例 CRUD API 及单元测试（5 tests, >80% coverage）`

---

## T04：步骤数据提交 + 审批 API

**Files:** `server/src/modules/process/process.service.ts`

**步骤：**

1. 读取 `server/src/modules/approval/approval.service.ts` 前 80 行（参考状态流转）
2. 实现 `submitStep(instanceId, userId, dto)` (<40 行)：
   - 校验 `dto.stepNumber === instance.currentStep`，否则 ForbiddenException
   - Upsert ProcessStepData（saveAsDraft → status=IN_PROGRESS，否则 SUBMITTED）
   - 非草稿 + 非 Step 7/8：currentStep = stepNumber + 1（Step 1 额外更新 productName）
   - Step 9 提交：processInstance.status = COMPLETED
3. 实现 `approveStep(instanceId, userId, dto)` (<30 行)：
   - 查询 ProcessStepData，status 须为 SUBMITTED，否则 ForbiddenException
   - approve：status=APPROVED，currentStep+1
   - reject：status=REJECTED，currentStep-1，重置该步 status=PENDING
   - comment 字段不记录到日志
4. 补充 2 个测试（submitStep 错误步骤、approveStep 未提交）
5. 运行：`npx jest src/modules/process/ --coverage` → 全部通过
6. Commit：`feat(process): 步骤提交和 HACCP 审批 API`

---

## T05：字段类型 A（auto-username / auto-date / section-header / static-content）

**Files:**
- 读取 `client/src/components/fields/TextField.vue`（参考结构）
- 读取 `client/src/components/DynamicForm.vue`（找字段类型映射）
- 新建（各 <40 行）：
  - `client/src/components/fields/AutoUsernameField.vue`
  - `client/src/components/fields/AutoDateField.vue`
  - `client/src/components/fields/SectionHeaderField.vue`
  - `client/src/components/fields/StaticContentField.vue`
- 修改 `client/src/components/DynamicForm.vue`

**实现要点：**
- AutoUsernameField：`useUserStore().currentUser?.name`，disabled el-input，mounted 时自动 emit
- AutoDateField：`dayjs().format('YYYY-MM-DD')`，disabled el-input，mounted 时自动 emit
- SectionHeaderField：渲染 `<h4>{{ field.label }}</h4> + <el-divider />`，无 modelValue
- StaticContentField：`v-html="field.content.replace(/\n/g, '<br>')"` （内容来自系统配置，非用户输入）
- DynamicForm 注册：section-header/static-content 使用 col span=24，跳过 label 渲染

**验证：** `cd client && npx vite build 2>&1 | tail -5`

**Commit：** `feat(form): 新增字段类型 auto-username/auto-date/section-header/static-content`

---

## T06：字段类型 B（table-input / range-select / constrained-number / checkbox-text）

**Files（各 <60 行）：**
- `client/src/components/fields/TableInputField.vue`
- `client/src/components/fields/RangeSelectField.vue`
- `client/src/components/fields/ConstrainedNumberField.vue`
- `client/src/components/fields/CheckboxTextField.vue`
- 修改 `client/src/components/DynamicForm.vue`

**实现要点：**
- TableInputField：接收 `field.columns[]`（含 readonly 属性），ref rows，addRow/removeRow 各 <10 行，emit update:modelValue
- RangeSelectField：computed options（for 循环 min→max step），el-select
- ConstrainedNumberField：el-input-number，handleChange 验证范围，违规时 emit validation-error 并 return（不 emit update:modelValue）
- CheckboxTextField：el-checkbox + el-input，`v-model="checked"` 控制 input disabled

**Commit：** `feat(form): 新增字段类型 table-input/range-select/constrained-number/checkbox-text`

---

## T07：字段类型 C（auto-display / template-content / approval-step）

**Files（各 <70 行）：**
- `client/src/components/fields/AutoDisplayField.vue`
- `client/src/components/fields/TemplateContentField.vue`
- `client/src/components/fields/ApprovalStepField.vue`
- 修改 `client/src/components/DynamicForm.vue`

**实现要点：**
- AutoDisplayField：props 接收 `allStepsData: Record<number, Record<string,unknown>>`，computed displayValue 读取对应步骤字段
- TemplateContentField：props 接收 `field.template + field.bindings` 和 `currentStepData`，computed rendered 用 replaceAll 替换占位符
- ApprovalStepField：3 个状态分支（v-if/v-else-if/v-else），canApprove 用 computed 计算，emit approve/reject

**Commit：** `feat(form): 新增字段类型 auto-display/template-content/approval-step`

---

## T08：DigitRoller.vue（数字滚轮，<90 行）

**File:** `client/src/components/DigitRoller.vue`

**实现要点：**
- props：modelValue（数值）、min（默认0）、max（默认300）
- max ≤50 → 2列（十/个）；max >50 → 3列（百/十/个）
- 每列：标签 + overflow:hidden 视口 + translateY 定位数字列表
- toDigits(v)/fromDigits(ds) 各 <10 行的转换函数
- @wheel.prevent 和 @touchmove.prevent 各触发 setDigit（<10 行）

**Commit：** `feat(components): 新增 DigitRoller 数字滚轮组件`

---

## T09：AllergenTable.vue（致敏原表，<100 行）

**File:** `client/src/components/process/AllergenTable.vue`

**实现要点：**
- props：rawMaterials（Step 2 传入）、modelValue、disabled
- ALLERGENS 常量数组（9 个过敏原）
- watch rawMaterials → 初始化 rows（合并已有 modelValue 数据）
- presentAllergens computed（过滤有勾选的类型）
- el-scrollbar 包裹（min-width: 1400px）

**Commit：** `feat(process): 新增 AllergenTable 致敏原信息表`

---

## T10a：OvenZoneTable.vue（炉温表，<90 行）

**File:** `client/src/components/process/OvenZoneTable.vue`

**实现要点：**
- 固定 4 行（ROWS 常量）× 动态列（默认一区~八区）
- addZone/removeZone 各 <8 行
- 每单元格：`<DigitRoller :max="300" />`
- emitUpdate 1 行

**Commit：** `feat(process): 新增 OvenZoneTable 炉温参数表`

---

## T10b：FanDeviceTable.vue（风机频率表，<70 行）

**File:** `client/src/components/process/FanDeviceTable.vue`

**实现要点：**
- DEFAULT_DEVICES 常量（11 条设备名称）
- el-table，低速/高速频率列各用 `<DigitRoller :max="50" />`
- addDevice/removeDevice 各 <8 行

**Commit：** `feat(process): 新增 FanDeviceTable 风机频率表`

---

## T10c：ProcessParams.vue（工艺参数容器，<100 行）

**File:** `client/src/components/process/ProcessParams.vue`

**实现要点：**
- props：processType（string[]）、modelValue、disabled
- `isFendan = computed(() => processType.includes('戚风分蛋工艺'))`（控制条件显示，避免 3 层嵌套）
- 暂存锅温度（v-if isFendan 控制蛋黄/蛋清）、打发机数据（v-if isFendan 整块）
- 出炉温度/包装温度用 ConstrainedNumberField
- 末尾嵌入 `<OvenZoneTable>` 和 `<FanDeviceTable>`

**Commit：** `feat(process): 新增 ProcessParams 工艺参数容器（组合 OvenZoneTable + FanDeviceTable）`

---

## T11：processApi + ProcessList + 路由注册

**Files:**
- 新建 `client/src/api/process.ts`
- 新建 `client/src/views/process/ProcessList.vue`
- 修改 `client/src/router/index.ts`
- 修改 `client/src/views/Layout.vue`

**步骤：**

1. 读取 `client/src/api/request.ts` 前 20 行（确认 axios 封装）
2. 读取 `client/src/views/warehouse/RequisitionList.vue`（参考列表页结构）
3. 读取 `client/src/views/Layout.vue` 末尾 50 行（找菜单位置）
4. 创建 processApi（8 个方法：getDefaultTemplate/listInstances/getInstance/createInstance/deleteInstance/getStepData/submitStep/approveStep）
5. 创建 ProcessList.vue（loadInstances/handleCreate/handleDelete 各 <20 行）
6. 注册路由：`/process`（列表）、`/process/instances/:id`（详情）、`/process/instances/:id/print`（打印，hideLayout:true）
7. 在 Layout.vue 侧边栏新增菜单项
8. 验证 + Commit：`feat(process): 新增流程实例列表页和路由`

---

## T12-T20：步骤视图

> 执行每个 Task 时，先读取 REQUIREMENTS.md 对应章节，再创建对应视图文件。
> 共同约定：emit `saved(data)` / `submitted(data)`；props：instanceId / modelValue / allStepsData / disabled；el-form validate 必填。

| Task | Step | REQUIREMENTS.md 章节 | 关键依赖 |
|------|------|----------------------|---------|
| T12 | Step 1 | §三 | AutoUsernameField, AutoDateField, StaticContentField |
| T13 | Step 2 | §四 | AutoDisplayField, el-autocomplete（仓库物料搜索 GET /warehouse/materials?search=）|
| T14 | Step 3 | §五 | AllergenTable（rawMaterials 来自 allStepsData[2]）, StaticContentField |
| T15 | Step 4 | §六 | ProcessParams（processType 来自 allStepsData[1]）|
| T16 | Step 5 | §七 | ProcessParams, StaticContentField（CCP/OPRP 表格硬编码）|
| T17 | Step 6 | §八 | el-checkbox/radio（全部默认选中）|
| T18 | Step 7 | §九 | AutoDisplayField, TemplateContentField（{验证时间}占位符）, ApprovalStepField |
| T19 | Step 8 | §十 | ApprovalStepField |
| T20 | Step 9 | §十一 | TableInputField, el-autocomplete（仓库搜索）|

**Commit 格式：** `feat(process): 实现 Step{N} {步骤名称}视图`

---

## T21：ProcessDetail 步骤导航容器

**File:** `client/src/views/process/ProcessDetail.vue`

**拆分方式（满足函数 <50 行）：**
- 组合式函数 `useProcessInstance(id)` (<40 行)：加载实例 + stepData，返回 instance/allStepsData/reload
- 组合式函数 `useStepActions(instanceId)` (<40 行)：submitStep/approveStep/rejectStep 方法
- ProcessDetail.vue 主体：仅负责 el-steps + 动态组件渲染 + 事件连接（<80 行）

**实现要点：**
- el-steps（:active=currentStep-1，9步）
- defineAsyncComponent 懒加载 Step1-9
- allStepsData 为 `computed(() => Object.fromEntries(stepData.map(s => [s.stepNumber, s.data])))`
- stepNumber > instance.currentStep → disabled=true

**Commit：** `feat(process): 实现 ProcessDetail 步骤导航容器`

---

## T22：PDF 打印导出

**Files:**
- 新建 `client/src/views/process/ProcessPrint.vue` (<80 行)
- 新建 `client/src/assets/styles/process-print.css` (<25 行)

**方案说明：** `window.print() + @media print CSS`。来源：REQUIREMENTS.md §十四 产品明确规定，无需后端库。

**实现要点：**
- 从 route.params.id 加载实例，遍历已完成步骤
- 每步用对应 Step 组件以 disabled=true 只读渲染
- `.print-page { page-break-after: always }` 分页
- 打印时隐藏导航/侧边栏/按钮（.no-print）
- 含每步提交人姓名和时间戳

**Commit：** `feat(process): 新增 PDF 打印导出（window.print + print CSS，无需额外库）`

---

## 执行顺序

```
T01 → T02 → T03 → T04                          后端（串行）
T05 ‖ T06 ‖ T07 ‖ T08                         前端基础组件（并行）
T09 ‖ T10a ‖ T10b                               等 T08 完成（并行）
T10c                                             等 T10a + T10b
T11                                              等后端 T01-T04 + 组件 T05-T10c
T12 ‖ T13 ‖ T14 ‖ T15 ‖ T16 ‖ T17 ‖ T18 ‖ T19 ‖ T20  步骤视图（并行）
T21 → T22                                        等所有步骤视图
```

---

## Context 大小验证（每 Task ≤ 1M tokens）

| Task 组 | 主要读取文件 | 估算 tokens |
|---------|------------|------------|
| T01 | schema.prisma (~500行) | ~8K |
| T02-T04 | 参考文件 + process/*.ts | ~12K |
| T05-T07 | DynamicForm.vue + TextField.vue (~200行) | ~8K |
| T08-T10c | 新建组件（各 <100行）| ~5K 每个 |
| T11-T22 | REQUIREMENTS.md 章节 (~100行) + 视图 (~150行) | ~8K 每个 |

**所有 Task 均远低于 1M token 限制（实际最大 ~15K tokens）。**
