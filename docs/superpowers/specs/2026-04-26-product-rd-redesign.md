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
  ├── processTemplateId    ← 7步模板ID
  ├── status               ← DRAFT/IN_PROGRESS/COMPLETED
  └── currentStep          ← 当前可操作步骤（审批通过才推进）

ProcessStepData (每步一条记录)
  ├── instanceId
  ├── stepNumber (1-7)
  ├── data (JSON)          ← 各步骤字段
  ├── status               ← PENDING/SUBMITTED/APPROVED/REJECTED
  ├── submittedById
  └── approvedById

Recipe (Step6 提交时创建/更新)
  └── RecipeLine[]         ← 由 Step6.recipeLines 写入

Product (流程COMPLETED时更新状态)
  └── status: 'ACTIVE'
```

**步骤推进规则**（取代当前的 currentStep+1 逻辑）：

| 步骤 | 解锁下一步的条件 |
|------|----------------|
| Step 1 | `gmApproval.status === 'APPROVED'` |
| Step 2 | `managerApproval.status === 'APPROVED'` |
| Step 3 | `trialConclusion === '通过'` + 研发员签名 |
| Step 4 | 5个 `departmentSignoffs` 全部 `APPROVED` |
| Step 5 | `gmConfirmation.status === 'APPROVED'` |
| Step 6 | 品质+制造两个审核均 `APPROVED` |
| Step 7 | `foodSafetyLeaderApproval.status === 'APPROVED'` → COMPLETED |

**已批准步骤锁定规则**：`status === 'APPROVED'` 的 ProcessStepData 不允许前端表单编辑（所有字段只读）

---

## 5. 数据库变更

### 需要修改的 Schema

```prisma
model ProcessInstance {
  // 现有字段保持不变
  // 新增:
  productId   String?  // 关联已有产品（可选）
  product     Product? @relation(fields: [productId], references: [id])
}

model ProcessStepData {
  // 现有字段保持不变，status 枚举值确认包含:
  // PENDING / SUBMITTED / APPROVED / REJECTED
}
```

> 配方数据写入已有的 `Recipe` + `RecipeLine` 表，无需新建模型

### 需要创建的 ProcessTemplate 种子数据

在 `prisma/seed.ts` 中插入7步模板，`steps` JSON 字段描述每步的 name/description/requiredApprovers。

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

### 需要修改的接口

```typescript
// POST /process/instances/:id/steps
// 新增逻辑：
// 1. 写入 stepData 后，检查审批条件
// 2. 条件满足时自动推进 currentStep
// 3. Step1 提交审批时同步更新 ProcessInstance.productName
// 4. Step6 APPROVED 时写入 Recipe/RecipeLine
// 5. Step7 食品安全组长批准时将 status 改为 COMPLETED

// GET /process/instances/:id/step-context/:stepNumber
// 新接口：返回前序步骤的关联数据（rawMaterials, processSteps等）
// 供前端预填表单使用
```

---

## 8. 实施顺序（分阶段）

**Phase 1 — 后端基础（不影响现有功能）**
1. 更新 ProcessTemplate 种子数据（7步模板）
2. 新增 `GET /process/instances/:id/step-context/:stepNumber` 接口
3. 修改步骤推进逻辑（审批条件驱动）

**Phase 2 — 前端步骤重写（逐步替换）**
4. 新建公共组件：ApprovalPanel、DeptSignoffTable、RecipeLineEditor
5. 逐步重写 Step1~7（每步独立可测试）
6. 更新 ProcessDetail.vue 的锁定逻辑
7. 删除旧的 Step8、Step9

**Phase 3 — 数据联动**
8. Step2 rawMaterials → Step3/Step6 预填
9. Step6 APPROVED → 写入 Recipe/RecipeLine
10. Step1 → ProcessInstance.productName 同步

**Phase 4 — 变更记录模块**
11. ChangeRecordDialog 组件
12. 变更记录后端 API

---

## 9. 不在本次范围内

- 流程模板管理页（管理员自定义步骤）
- 流程实例的导出（PDF/Excel）
- 与 HACCP 危害分析模块的集成
- 多语言支持
