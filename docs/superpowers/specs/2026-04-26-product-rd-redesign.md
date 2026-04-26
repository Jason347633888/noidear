# 产品研发流程重设计规格说明

**版本**: 1.0  
**日期**: 2026-04-26  
**依据文件**: CX-26 产品研发和设计控制程序 (GRSS-CX-26 A/0)

---

## 1. 背景与目标

### 问题诊断

当前系统（9步流程）存在以下硬伤：

1. **数据断层**：Step 2 填写的原辅料与 Step 4 配料表、Step 9 配方完全脱节，重复手填
2. **productName 从不同步**：ProcessInstance.productName 始终显示"未命名"
3. **已批准步骤仍可编辑**：合规风险，违反食品安全体系要求
4. **流程与 CX-26 不对应**：当前9步不覆盖标签信息记录、操作规程、正式验证等关键环节

### 目标

按 CX-26 官方程序文件重建7步主流程，确保：
- 每一步对应一个正式记录表单
- 数据在步骤间自动传递（不重复填写）
- 已提交/已审批步骤锁定不可回编
- 变更记录作为独立按需触发模块，不强制在主流程中

---

## 2. 新流程结构（7步）

```
Step 1: 新产品开发申请书 (JL-09)
  ↓ [总经理批准后解锁 Step 2]
Step 2: 新产品开发计划书 (JL-10)
  ↓ [研发经理审批后解锁 Step 3]
Step 3: 研发试验记录 (JL-11)
  ↓ [提交后解锁 Step 4]
Step 4: 产品开发评审 (JL-01)
  ↓ [5部门签署后解锁 Step 5]
Step 5: 产品标签信息记录 (JL-04)
  ↓ [总经理确认后解锁 Step 6]
Step 6: 产品操作规程 (JL-02) + 内嵌配方工艺参数 (JL-06)
  ↓ [品质部/制造部审核后解锁 Step 7]
Step 7: 产品验证记录 (JL-07)
  ↓ [3部门签署 → 食品安全小组组长批准 → 流程完成]

[按需] 工艺配料变更记录（独立入口，不在主流程序列中）
```

---

## 3. 各步骤字段设计

### Step 1 — 新产品开发申请书 (JL-09)

**填写人**: 产品开发部/营销部  
**审批人**: 总经理

| 字段 | 类型 | 说明 |
|------|------|------|
| productName | string | 产品名称（同步至 ProcessInstance.productName）|
| requestDate | date | 申请日期 |
| requestDept | string | 申请部门 |
| requestSource | enum | 市场信息/内部建议/客户委托 |
| productCategory | string | 产品类别 |
| targetMarket | string | 目标市场/客户 |
| referenceProducts | string | 参考产品 |
| productSpec | string | 规格要求 |
| packagingRequirement | string | 包装要求 |
| legalStandards | string[] | 适用法规标准（GB7099等）|
| allergenInfo | string | 过敏原说明 |
| customerRequirements | string | 客户特殊要求 |
| developmentReason | string | 立项依据 |
| gmApproval | ApprovalField | 总经理批准（批准后解锁Step2）|

### Step 2 — 新产品开发计划书 (JL-10)

**填写人**: 产品开发部  
**审批人**: 研发经理

| 字段 | 类型 | 说明 |
|------|------|------|
| productName | string | 自动从Step1带入（只读）|
| planVersion | string | 计划书版本 |
| developmentStages | StageItem[] | 各阶段：名称/负责人/计划完成时间 |
| deptResponsibilities | DeptItem[] | 各部门分工（产品开发/制造/采购/品质）|
| rawMaterials | RawMaterial[] | 初步原辅料清单（后续步骤复用）|
| estimatedCost | number | 预估开发成本 |
| targetCompletionDate | date | 目标完成日期 |
| managerApproval | ApprovalField | 研发经理审批 |

> **关键**: rawMaterials 在此定义，Step 3、Step 6 自动带入，不重填

### Step 3 — 研发试验记录 (JL-11)

**填写人**: 产品开发部研发员  
**关联数据**: 自动带入 Step 2 的 rawMaterials

| 字段 | 类型 | 说明 |
|------|------|------|
| productName | string | 只读，来自Step1 |
| trialDate | date | 试验日期 |
| trialBatch | string | 批次号 |
| rawMaterialsUsed | RawMaterial[] | 预填自Step2，可调整用量 |
| processSteps | ProcessStep[] | 工艺步骤记录（操作/参数/时间）|
| organolepticEval | OrganolepticEval | 感官评价（色/香/味/形）|
| physicalChemical | TestResult[] | 理化检测结果 |
| shelfLifeTest | ShelfLifeTest | 保质期测试记录 |
| trialConclusion | enum | 通过/需改进/终止 |
| improvementNotes | string | 改进意见 |
| researcherSignature | string | 研发员签名 |

### Step 4 — 产品开发评审 (JL-01)

**填写人**: 产品开发部（组织）  
**签署方**: 研发总监、采购经理、制造经理、品质经理、食品安全小组长

| 字段 | 类型 | 说明 |
|------|------|------|
| productName | string | 只读 |
| reviewDate | date | 评审日期 |
| standardCompliance | ReviewItem | 标准符合性评审 |
| rawMaterialFeasibility | ReviewItem | 原辅料采购可行性 |
| processFeasibility | ReviewItem | 生产工艺可行性 |
| testability | ReviewItem | 可检验性 |
| productCharacteristics | ReviewItem | 产品特性确认 |
| rdGoalConformity | ReviewItem | 研发目标符合性 |
| reviewConclusion | enum | 通过/需改进/终止 |
| departmentSignoffs | DeptSignoff[] | 5部门签字（全部签署后解锁Step5）|

### Step 5 — 产品标签信息记录 (JL-04)

**填写人**: 产品开发部  
**审批**: 总经理最终确认

| 字段 | 类型 | 说明 |
|------|------|------|
| productName | string | 只读 |
| brandName | string | 品牌名称 |
| productFullName | string | 产品全称 |
| netWeight | string | 净含量 |
| ingredientList | string | 配料表（文字描述，对应正式标签）|
| allergens | string[] | 过敏原声明 |
| nutritionFacts | NutritionFact[] | 营养成分表 |
| storageConditions | string | 储存条件 |
| shelfLife | string | 保质期 |
| manufacturer | string | 生产商信息 |
| productStandard | string | 执行标准（GB7099等）|
| labelDesignFile | string | 设计稿文件路径（MinIO）|
| gmConfirmation | ApprovalField | 总经理最终确认 |

### Step 6 — 产品操作规程 (JL-02) + 配方工艺参数 (JL-06)

**填写人**: 产品开发部研发员  
**审核**: 品质部、制造部  
**关联数据**: 自动带入 Step 2 rawMaterials 和 Step 3 processSteps

| 字段（操作规程 JL-02）| 类型 | 说明 |
|------|------|------|
| productName | string | 只读 |
| sopVersion | string | SOP版本 |
| productionFlow | FlowStep[] | 生产工艺流程（预填自Step3）|
| criticalControlPoints | CCP[] | 关键控制点及参数 |
| qualityCheckpoints | QCPoint[] | 质检要点 |
| cleaningProcedure | string | 清洁规程 |
| allergenControl | string | 过敏原控制措施 |

| 字段（配方工艺参数 JL-06）| 类型 | 说明 |
|------|------|------|
| recipeLines | RecipeLine[] | 配料表（自动带入Step2，含用量/单位/供应商）|
| yieldRate | number | 出品率 |
| batchSize | number | 标准批量 |
| processParameters | ProcessParam[] | 工艺参数（温度/时间/压力等）|

| 字段（审核）| 类型 | 说明 |
|------|------|------|
| qualityDeptReview | ApprovalField | 品质部审核 |
| manufacturingDeptReview | ApprovalField | 制造部审核 |

> **关键**: RecipeLine 数据同步写入 `Recipe`/`RecipeLine` 表，作为产品正式配方

### Step 7 — 产品验证记录 (JL-07)

**填写人**: 制造部（试生产执行）+ 产品开发部（组织）  
**签署**: 制造经理、品质经理、食品安全小组长（组长批准后流程COMPLETED）

| 字段 | 类型 | 说明 |
|------|------|------|
| productName | string | 只读 |
| trialProductionDate | date | 试生产日期 |
| batchNumber | string | 试生产批次 |
| actualRecipeUsed | RecipeLine[] | 实际使用配方（只读，来自Step6）|
| productionObservations | string | 试生产过程观察记录 |
| physicalChemicalResults | TestResult[] | 理化检验结果 |
| microbiologyResults | TestResult[] | 微生物检验结果 |
| organolepticResults | OrganolepticEval | 感官检验结果 |
| storageTransportTest | string | 储运测试结果（必要时）|
| customerFeedback | string | 顾客试吃意见（必要时）|
| verificationConclusion | enum | 合格/不合格/需修改 |
| manufacturingMgrSignoff | ApprovalField | 制造经理签署 |
| qualityMgrSignoff | ApprovalField | 品质经理签署 |
| foodSafetyLeaderApproval | ApprovalField | 食品安全小组长批准（最终放行）|

### [按需] 工艺配料变更记录

**触发条件**: 已完成流程的产品需要修改配方/工艺  
**入口**: 产品详情页独立按钮，不在主流程序列中  
**流转**: 提交→产品开发部负责人审核→总经理批准→自动更新对应 RecipeLine

---

## 4. 数据流转设计

```
ProcessInstance
  ├── productName          ← 由 Step1.productName 写入
  ├── productId            ← Step1 提交时创建 Product(draft)，写入此字段
  ├── processTemplateId    ← 7步模板ID
  ├── status               ← DRAFT/IN_PROGRESS/COMPLETED
  └── currentStep          ← 当前可操作步骤（审批通过才推进）

Product
  ├── status: 'draft'      ← Step1 提交时创建
  ├── status: 'active'     ← Step7 食品安全组长批准后变更
  └── nutrition fields     ← Step5 提交时同步写入

ProcessStepData (每步一条记录)
  ├── instanceId
  ├── stepNumber (1-7)
  ├── data (JSON)          ← 各步骤字段
  ├── status               ← PENDING/SUBMITTED/APPROVED/REJECTED
  └── submittedById

ProcessStepApproval (多人会签，每人每次独立一行)
  ├── instanceId
  ├── stepNumber
  ├── approverId
  ├── department
  ├── status               ← PENDING/APPROVED/REJECTED
  ├── comment
  └── signedAt

Recipe (Step6 提交时创建/更新，关联 Step1 创建的 Product)
  └── RecipeLine[]         ← 由 Step6.recipeLines 写入，material_id 来自仓库
```

**步骤推进规则**（取代当前的 currentStep+1 逻辑，后端校验）：

| 步骤 | 解锁下一步的条件 | 触发的副作用 |
|------|----------------|-------------|
| Step 1 | GM 在 ProcessStepApproval 中 APPROVED | 创建 Product(draft)，写入 ProcessInstance.productId，同步 productName |
| Step 2 | 研发经理在 ProcessStepApproval 中 APPROVED | — |
| Step 3 | `trialConclusion === '通过'` + 研发员提交 | — |
| Step 4 | 5条 ProcessStepApproval 全部 APPROVED | — |
| Step 5 | GM 在 ProcessStepApproval 中 APPROVED | 同步营养成分字段到 Product |
| Step 6 | 品质+制造两条 ProcessStepApproval 均 APPROVED | 创建/更新 Recipe + RecipeLine |
| Step 7 | 食品安全组长在 ProcessStepApproval 中 APPROVED | Product.status → 'active'，ProcessInstance.status → COMPLETED |

**已批准步骤锁定规则**：`ProcessStepData.status === 'APPROVED'` 的步骤，前端所有表单字段只读

---

## 5. 数据库变更

### 新增表

```prisma
model ProcessStepApproval {
  id          String    @id @default(cuid())
  instanceId  String
  instance    ProcessInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  stepNumber  Int
  approverId  String
  approver    User      @relation(fields: [approverId], references: [id])
  department  String    // '品质部'|'制造部'|'采购部'|'产品开发部'|'总经办'
  role        String    // 'gm'|'manager'|'quality'|'manufacture'|'purchase'|'food_safety_leader'
  status      String    @default("PENDING") // 'PENDING'|'APPROVED'|'REJECTED'
  comment     String?
  signedAt    DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([instanceId, stepNumber, approverId])
  @@index([instanceId, stepNumber])
  @@index([approverId, status])
  @@map("process_step_approvals")
}
```

> `@@index([approverId, status])` 支持"查我的待签任务"场景，后续做消息通知也用这个索引。

### 修改现有 Schema

```prisma
model ProcessInstance {
  // 新增:
  productId   String?
  product     Product? @relation(fields: [productId], references: [id])
  approvals   ProcessStepApproval[]
}

model Product {
  // 新增营养成分字段（对应 JL-04 字段映射表）：
  shelf_life_days      Int?
  nutrition_energy     Decimal? @db.Decimal(10,2)  // kJ/100g
  nutrition_protein    Decimal? @db.Decimal(10,2)  // g/100g
  nutrition_fat        Decimal? @db.Decimal(10,2)  // g/100g
  nutrition_trans_fat  Decimal? @db.Decimal(10,2)  // g/100g
  nutrition_carb       Decimal? @db.Decimal(10,2)  // g/100g
  nutrition_sodium     Decimal? @db.Decimal(10,2)  // mg/100g
  product_type         String?  // 默认'烘烤类糕点'
  processing_method    String?  // 默认'热加工'
  standard_code        String?  // 默认'GB 7099'
  storage_method       String?  // 默认'阴凉干燥处'
  consumption_method   String?  // 默认'开袋即食'
  label_allergens      String?  // 过敏原文本
  consumer_notice      String?
}
```

### ProcessTemplate 种子数据更新

将现有9步模板改为7步，`steps` JSON：
```json
[
  { "stepNumber": 1, "name": "新产品开发申请书", "formCode": "JL-09", "requiredApprovals": [{"role": "gm", "dept": "总经办"}] },
  { "stepNumber": 2, "name": "新产品开发计划书", "formCode": "JL-10", "requiredApprovals": [{"role": "manager", "dept": "产品开发部"}] },
  { "stepNumber": 3, "name": "研发试验记录",     "formCode": "JL-11", "requiredApprovals": [] },
  { "stepNumber": 4, "name": "产品开发评审",     "formCode": "JL-01", "requiredApprovals": [{"role": "quality"},{"role": "manufacture"},{"role": "purchase"},{"role": "development"},{"role": "gm"}] },
  { "stepNumber": 5, "name": "产品标签信息记录", "formCode": "JL-04", "requiredApprovals": [{"role": "gm", "dept": "总经办"}] },
  { "stepNumber": 6, "name": "产品操作规程",     "formCode": "JL-02+JL-06", "requiredApprovals": [{"role": "quality"},{"role": "manufacture"}] },
  { "stepNumber": 7, "name": "产品验证记录",     "formCode": "JL-07", "requiredApprovals": [{"role": "manufacture"},{"role": "quality"},{"role": "food_safety_leader"}] }
]
```

---

## 6. 前端组件改造

### 需要修改的文件

| 文件 | 改造内容 |
|------|---------|
| `ProcessDetail.vue` | 步骤锁定逻辑：`isStepEditable` 改为检查 status；去掉 `viewStep > currentStep` 判断 |
| `ProcessList.vue` | 无需改动（删除功能已修复）|
| `Step1.vue` | 完全重写，对应 JL-09 字段 |
| `Step2.vue` | 完全重写，对应 JL-10 字段，rawMaterials 为后续步骤数据源 |
| `Step3.vue` | 完全重写，对应 JL-11，rawMaterials 从 Step2 预填 |
| `Step4.vue` | 完全重写，对应 JL-01，5部门签署组件 |
| `Step5.vue` | 完全重写，对应 JL-04 |
| `Step6.vue` | 完全重写，合并 JL-02 + JL-06，recipeLines 从 Step2 预填 |
| `Step7.vue` | 完全重写，对应 JL-07，配方只读来自Step6 |
| `Step8.vue`, `Step9.vue` | 删除 |

### 新增组件

| 组件 | 用途 |
|------|------|
| `ApprovalPanel.vue` | 通用审批面板（显示审批人/时间/意见，已批准则只读）|
| `DeptSignoffTable.vue` | 多部门签署表格（Step4/5/7使用）|
| `RecipeLineEditor.vue` | 配料行编辑器（Step2/6共用，Step3/7只读）|
| `ChangeRecordDialog.vue` | 变更记录对话框（按需触发）|

---

## 7. 后端 API 改造

### 新增接口

```typescript
// POST /process/instances/:id/steps/:stepNumber/approvals
// 提交会签（创建或更新一条 ProcessStepApproval 记录）
// Body: { action: 'approve'|'reject', comment?: string }
// 后端逻辑：
// 1. 写入/更新 ProcessStepApproval
// 2. 检查该步骤所有必要审批人是否全部 APPROVED
// 3. 全部通过 → 将 ProcessStepData.status 改为 APPROVED，推进 currentStep
// 4. 触发副作用（见步骤推进规则表）

// GET /process/instances/:id/approvals?stepNumber=4
// 查询某步骤的所有会签记录（供前端显示签署面板）

// GET /process/approvals/pending?approverId=xxx
// 查我的待签任务（跨所有流程实例）
```

### 修改现有接口

```typescript
// POST /process/instances/:id/steps
// 修改逻辑：
// - saveAsDraft=false 时不再自动推进 currentStep（改由 approval 驱动）
// - Step3 特殊处理：无审批人，提交即推进（trialConclusion==='通过'时）
// - 删除旧的 approveStep 端点（由新的 approvals 端点替代）

// 副作用处理（在 approvals 端点中）：
// Step1 全部通过 → prisma.$transaction([创建Product, 更新ProcessInstance.productId+productName])
// Step5 全部通过 → 同步营养成分到 Product
// Step6 全部通过 → 创建/更新 Recipe + RecipeLine
// Step7 全部通过 → Product.status='active', ProcessInstance.status='COMPLETED'
```

---

## 8. 实施顺序（分阶段）

**Phase 1 — 数据库 Migration**
1. 新增 `ProcessStepApproval` 表
2. `ProcessInstance` 加 `productId` 字段
3. `Product` 加营养成分字段（8个）
4. 更新 ProcessTemplate 种子数据（7步模板 JSON）

**Phase 2 — 后端 API**
5. 新增 `POST /process/instances/:id/steps/:stepNumber/approvals`（含副作用逻辑）
6. 新增 `GET /process/instances/:id/approvals`
7. 新增 `GET /process/approvals/pending`
8. 修改 `POST /process/instances/:id/steps`（去掉自动推进，保留暂存）
9. 删除旧的 `POST /process/instances/:id/approve`

**Phase 3 — 前端公共组件**
10. `DeptSignoffPanel.vue`（多人签署面板，含"我要签字"按钮）
11. `RecipeLineEditor.vue`（配料行编辑，复用 Step2 物料选择器逻辑）
12. `processApi.ts` 新增 approvals 相关方法

**Phase 4 — 前端步骤重写（逐步，不影响旧流程）**
13. Step1.vue（JL-09，提交后触发 GM 会签）
14. Step2.vue（JL-10，rawMaterials 加 qty_per_batch 字段）
15. Step3.vue（JL-11，rawMaterials 从 Step2 预填名称，数量可调整）
16. Step4.vue（JL-01，5部门签署面板）
17. Step5.vue（JL-04，营养成分表，提交后触发 GM 会签）
18. Step6.vue（JL-02+JL-06，RecipeLineEditor，工艺参数）
19. Step7.vue（JL-07，配方只读，3人签署）
20. 删除 Step8.vue、Step9.vue
21. ProcessDetail.vue 更新：步骤数量7、isStepDisabled 加 APPROVED 锁定逻辑

**Phase 5 — 变更记录模块（按需）**
22. `ChangeRecordDialog.vue`
23. 变更记录后端 API（关联 Product + Recipe 更新）

---

## 9. 不在本次范围内

- 流程模板管理页（管理员自定义步骤）
- 流程实例的导出（PDF/Excel）
- 与 HACCP 危害分析模块的集成
- 多语言支持
