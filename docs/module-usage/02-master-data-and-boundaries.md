# 主数据、产品、配方、工序

---
module_id: master-data-and-boundaries
business_chain:
  - Product → Recipe → RecipeLine → ProcessStep → CCPPoint
  - Product → ProductionRun → ProductionBatch → BatchMaterialUsage(IngredientUsage)
  - ProcessInstance(研发流程) → Product(draft) → Recipe/RecipeLine → Product(active)
module_type:
  - 主数据层（Product、WorkshopArea）
  - 桥接层（RecipeLine，连接 Material 和 Recipe；BatchMaterialUsage，连接 MaterialBatch 和 ProductionBatch）
  - 流程/治理层（ProcessInstance/ProcessStep，研发流程审批）
source_of_truth:
  - Product：products 表，Product.id 是系统内所有产品关联的唯一事实源
  - Recipe：recipes 表，Recipe.product_id 关联产品；Recipe.status (draft/active/archived)
  - RecipeLine：recipe_lines 表，material_id + area_id 是物料和配料区域的关联事实源
  - WorkshopArea：workshop_areas 表，区域主数据的唯一事实源
  - ProcessStep：process_steps 表，product_id/recipe_id 是工序与产品/配方关联的事实源
facts_or_projections:
  - Product.name 是可修改的展示字段，历史批次应保留产品名快照（ProductionBatch.productName）
  - RecipeLine.area_name_snapshot 是写入时的区域名快照，不作为区域事实源
  - ProductionBatch.productName 是创建时的产品名快照，不作为产品事实源
downstream_consumers:
  - ProductionRun（生产开工）：强引用 product_id + recipe_id
  - ProductionBatch（生产批次）：引用 productId + recipeId + 快照字段
  - BatchMaterialUsage(IngredientUsage)：通过 recipeLineId + area_id 关联配方明细和区域
  - CCPRecord：通过 ProductionBatch → Recipe → ProcessStep → CCPPoint 追溯
  - ProcessMonitorRecord/MetalDetectionLog/ReworkRecord：通过 production_batch_id 追溯
  - DeliveryNote/CustomerComplaint：通过 production_batch_id 回溯到产品
  - Traceability 正追/反追查询服务
current_entrypoints:
  - /products → ProductList.vue → GET /products
  - /products/:id → ProductDetail.vue → GET /products/:id/workbench
  - /recipes → RecipeList.vue（已重定向到 /products）
  - /recipes/:id/edit → 已重定向到 /products
  - /process-steps → 已重定向到 /products
  - /process → ProcessList.vue → GET /process/instances
  - /process/instances/:id → ProcessDetail.vue → POST /process/instances
  - /process/instances/:id/print → ProcessPrint.vue
last_verified_commit: 7bab98dc3ccd49e8e1d76b95b28a1b79207c483c
---

## 1. 模块定位

本模块是 noidear 食品安全 SaaS 的产品主数据层，承担以下职责：

1. **产品主数据管理**：维护 `Product` 实体，是所有下游业务（生产、检验、出库、投诉、召回、追溯）的产品事实源。Product 关联了 283 张源表单中约 60 张（CC/KF/PZ/YX/ZJ/ZZ 六个部门跨部门使用）。
2. **配方版本管理**：`Recipe` + `RecipeLine` 维护产品的版本化理论配方，包含物料用量和配料区域绑定，是生产开工和区域配料单的理论依据。
3. **配料区域主数据**：`WorkshopArea` 是配料区域的公司级主数据，取代旧代码中写死的区域字符串（筛粉间/称油间/小料房）。
4. **工序与 CCP 管理**：`ProcessStep` + `CCPPoint` 维护产品的工艺步骤和关键控制点，是食品安全危害分析和过程记录的结构基础。
5. **研发流程**：`ProcessInstance`（7步研发流程）是新产品从 0 到 1 进入产品主数据链的正式通道，审批通过后写入 `Product`、`Recipe`、`RecipeLine`。

**职责边界**：本模块是主数据层，不负责生产执行（由 ProductionBatch 模块负责），不负责批次追溯（由 Traceability 模块负责），不负责检验放行（由 IncomingInspection/CCPRecord 模块负责）。

---

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|---|---|---|
| 产品开发部（KF） | 新产品研发立项、配方工艺固化 | 发起研发流程（ProcessInstance）、填写研发各步骤、建立 Recipe/RecipeLine |
| 产品开发部（KF） | 历史产品补录建档 | 通过历史产品建档入口一次性创建 Product + Recipe + RecipeLine |
| 研发经理 / 总经理 | 研发流程审批 | 在 ProcessDetail 页面签署 ProcessStepApproval |
| 品质部（PZ）/ 制造部（ZZ） | 查阅产品配方和工序作为生产过程的标准依据 | 查看产品工作台（workbench）、配方明细、工序和 CCP 参数 |
| 生产排班/开工人员 | 依据已有产品和 active 配方开工 | 在生产开工入口选择 Product + Recipe |
| 追溯演练人员（PZ） | 通过产品溯源到配方版本和物料 | 从产品工作台查看历史配方版本 |
| 系统管理员 | 管理配料区域主数据 | 维护 WorkshopArea 清单 |

---

## 3. 当前入口

| 入口 | 页面 | 前端 API | 后端 API | 后端模块 |
|---|---|---|---|---|
| 产品目录 | `views/product/ProductList.vue` | `productApi.getList()` | `GET /products` | `server/src/modules/product/product.controller.ts` |
| 产品工作台 | `views/product/ProductDetail.vue` | `productApi.getWorkbench(id)` | `GET /products/:id/workbench` | `product.service.ts#getWorkbench` |
| 历史产品建档（抽屉） | `views/product/LegacyProductDrawer.vue` | `productApi.createLegacy()` | `POST /products/legacy` | `product.service.ts#createLegacy` |
| 产品归档 | ProductList 操作列 | `productApi.archive(id)` | `POST /products/:id/archive` | `product.service.ts#archive` |
| 产品报告文件 | ProductDetail | `productApi.uploadReport()` | `POST /products/:id/reports` | `product.service.ts#uploadReport` |
| 配方列表（已重定向） | `views/recipe/RecipeList.vue`（路由重定向到 /products） | `recipeApi.getList()` | `GET /recipes` | `recipe.controller.ts` |
| 配方编辑（已重定向） | `views/recipe/RecipeEdit.vue`（路由重定向到 /products） | `recipeApi.create()` | `POST /recipes` | `recipe.service.ts#create` |
| 配方归档 | 配方管理操作列 | `recipeApi.archive(id)` | `POST /recipes/:id/archive` | `recipe.service.ts#archive` |
| 研发流程列表 | `views/process/ProcessList.vue` | `processApi.listInstances()` | `GET /process/instances` | `process-instance.controller.ts` |
| 研发流程详情/步骤填写 | `views/process/ProcessDetail.vue` + `Step1.vue~Step7.vue` | `processApi.submitStep()` | `POST /process/instances/:id/steps` | `process-instance.controller.ts` |
| 研发步骤审批 | ProcessDetail 内 ApprovalTaskPanel | `processApi.submitApproval()` | `POST /process/instances/:id/steps/:stepNumber/approvals` | `process-step-approval.service.ts` |
| 工序管理（已重定向） | routes `/process-steps` 重定向到 `/products` | `processStepApi.*` | `GET/POST/PATCH/DELETE /process-steps` | `process-step.controller.ts` |
| 生产开工 | `views/production/WorkshopStaging.vue` 等 | `productionRunApi.*` | `POST /production-runs` | `production-run.controller.ts` |

---

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|---|---|---|
| Product | `products` 表，`Product.id`（cuid）+ `Product.code`（系统自动生成，`ProductCodeGeneratorService`）+ `Product.status`（active/inactive/discontinued）+ `Product.source`（rd_process/legacy_import/manual_admin）+ `Product.deleted_at`（归档软删） | 已实现；`已验证` |
| Recipe | `recipes` 表，`Recipe.product_id` 外键，`Recipe.version`（整数自增），`Recipe.status`（draft/active/archived），`Recipe.approved_by/at` | 已实现；`已验证` |
| RecipeLine | `recipe_lines` 表，`RecipeLine.material_id`（Material 外键），`RecipeLine.area_id`（WorkshopArea 外键），`RecipeLine.area_name_snapshot`（区域名快照），`RecipeLine.qty_per_batch/unit/is_critical` | 已实现；`已验证` |
| WorkshopArea | `workshop_areas` 表，`WorkshopArea.id/code/name/status/deleted_at`，公司级区域主数据，支持配料区域分配 | 已实现；`已验证` |
| ProcessStep | `process_steps` 表，`ProcessStep.product_id`（可选）和 `ProcessStep.recipe_id`（可选），`ProcessStep.deleted_at`（软删/归档），`ProcessStep.is_ccp/control_measures/critical_limit` | 已实现；`已验证` |
| CCPPoint | `ccp_points` 表，挂在 `ProcessStep` 下，`CCPPoint.process_step_id`，含控制限值 `cl_min/cl_max/cl_unit` | 已实现；`已验证` |
| ProcessInstance（研发流程） | `process_instances` 表，`ProcessInstance.productName`（纯文本）+ `ProcessInstance.productId`（可选外键，Step1 审批通过后写入）+ `ProcessInstance.templateId`（7步模板）+ `ProcessInstance.currentStep/status` | `productId` 字段已存在；`productName` 仍在部分流程中作为主要显示来源；`已验证` |
| ProcessStepData | `process_step_data` 表，每步一条，`ProcessStepData.data`（JSON），`ProcessStepData.status`（PENDING/SUBMITTED/APPROVED/REJECTED） | 已实现；`已验证` |
| ProcessStepApproval | `process_step_approvals` 表，多人会签，`ProcessStepApproval.role/department/status` | 已实现；`已验证` |
| ProductionRun | `production_runs` 表，`ProductionRun.product_id`（必填）+ `ProductionRun.recipe_id`（可选但业务必选）；后端已校验 `Product.status=active` 且 `Recipe.status=active` | `recipe_id` 已在业务层强制校验；`已验证` |
| ProductionBatch | `production_batches` 表，`ProductionBatch.productId`（可选）+ `ProductionBatch.productName`（字符串，仍为历史快照，但 schema 未设 NOT NULL 约束在 productId 上）+ `ProductionBatch.recipeId`（可选） | `productId/recipeId` 字段为可选；`productName` 字段为非空字符串，语义为快照；`已验证` |
| 产品归档级联 | `ProductService.archive()`：事务内 Product.deleted_at 置位，Recipe.status→archived，ProcessStep.deleted_at 置位 | 已实现且经单元测试覆盖；`已验证` |

---

## 5. 正确业务流程

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1. 新产品研发立项 | 研发人员发起研发流程（ProcessInstance），Step1 填写产品名称和开发申请，提交后触发总经理审批 | 创建 ProcessInstance，productName 写入实例；Step1 审批通过后系统创建 Product(draft)，写入 ProcessInstance.productId | ProcessInstance → Product（draft） | 若跳过：Product 不在主数据链中，后续生产无法选择该产品 |
| 2. 研发流程推进（Step2～Step6） | 研发人员逐步填写计划书、试验记录、评审、标签信息、操作规程与配方 | Step6 审批通过后，系统创建 Recipe + RecipeLine，写入 product_id 和 material_id；RecipeLine 包含 area_id（配料区域）| ProcessInstance → Recipe + RecipeLine + WorkshopArea | 若 RecipeLine 缺少 area_id：生产无法按区域拆分配料单；若 RecipeLine 只存物料名：违反"名称只展示，ID 才关联"规则 |
| 3. 新产品激活 | Step7（产品验证记录）食品安全小组长审批通过 | Product.status → active；ProcessInstance.status → COMPLETED | ProcessInstance → Product（active） | 若跳过激活：Product 仍为 draft，不能用于开工 |
| 4. 历史产品建档（备选路径） | 管理员通过"历史产品建档"入口，一次性填写产品名称 + 配方明细 + 区域分配 | 事务创建 Product(active) + Recipe(v1,active) + RecipeLine[]；product.source = legacy_import | Product + Recipe + RecipeLine（单事务） | 若事务失败回滚：避免产品和配方数据不一致 |
| 5. 生产开工 | 生产人员在生产排班模块选择 Product + Recipe 开工 | 后端校验 Product.status=active 且 deleted_at=null，Recipe.status=active 且 product_id 匹配；创建 ProductionRun | ProductionRun → Product + Recipe | 若后端校验缺失：可用归档/停产产品开工，破坏追溯一致性 |
| 6. 生产批次投料 | 区域人员在配料单填写实际物料批次和用量 | 创建 BatchMaterialUsage（IngredientUsage），关联 productionBatchId + materialBatchId + recipeLineId + area_id | BatchMaterialUsage → RecipeLine → MaterialBatch → ProductionBatch | 若 recipeLineId 为空：无法做配方物料平衡；若只存物料名：追溯断链 |
| 7. 产品归档 | 管理员在产品目录点击"归档" | 事务内：Product.deleted_at 置位；Recipe.status→archived；ProcessStep.deleted_at 置位；历史生产批次/投料/追溯数据不变 | Product → Recipe + ProcessStep（级联归档） | 若归档不级联：配方仍显示在可用列表，下次开工误用归档产品配方 |

---

## 6. 上下游绑定关系

```text
[研发流程入口]
ProcessInstance (7步研发流程)
  └── Step1 审批通过 → 创建 Product(draft)
  └── Step6 审批通过 → 创建 Recipe + RecipeLine
  └── Step7 审批通过 → Product.status = active

[历史建档入口]
POST /products/legacy
  └── 事务创建 Product(active, source=legacy_import)
        └── Recipe(v1, active)
              └── RecipeLine[] (material_id + area_id)

[产品主数据层]
Product (产品事实源)
  └── Recipe (版本化配方，product_id 外键)
        └── RecipeLine (material_id → Material, area_id → WorkshopArea)
        └── ProcessStep (recipe_id 外键，或 product_id 外键)
              └── CCPPoint (process_step_id 外键)

[生产执行层]
ProductionRun (product_id + recipe_id，强校验 active)
  └── ProductionBatch (productId 可选外键 + productName 快照 + recipeId)
        └── BatchMaterialUsage/IngredientUsage
              (productionBatchId + materialBatchId + recipeLineId + area_id)
        └── CCPRecord / ProcessMonitorRecord / MetalDetectionLog / ReworkRecord
              (production_batch_id)
        └── DeliveryNote (production_batch_id)

[追溯链]
正追：ProductionBatch → BatchMaterialUsage → MaterialBatch → Supplier
反追：MaterialBatch → BatchMaterialUsage → ProductionBatch → DeliveryNote → Customer
```

---

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|---|---|---|---|---|---|---|
| GAP-001 | `ProcessInstance.productName` 仍为纯文本字段，`ProcessInstance` 创建时（`POST /process/instances`）只传 `productName`字符串，不关联 Product 主数据 | `process-instance.controller.ts` `create()` 方法只写 `productName: data.productName`；Step1.vue 只有文本输入框，无产品选择器 | 研发流程实例显示名称与产品主数据断链；报表和审批标题使用文本名而非主数据 ID；变更控制和追溯链无法通过研发实例反查 Product | P1 | 已验证 | `server/src/modules/process/process-instance.controller.ts:66-72`；`client/src/views/process/Step1.vue:14-15` |
| GAP-002 | `ProductionBatch.productId` 在 schema 中为可选（`String?`），意味着可以创建没有 product_id 关联的生产批次 | `schema.prisma:1465` `productId String?`；历史遗留设计 | 创建无 productId 的生产批次会导致正追/反追链路中断，无法通过生产批次查到产品主数据 | P1 | 已验证 | `server/src/prisma/schema.prisma:1465-1467` |
| GAP-003 | `ProductionBatch.recipeId` 在 schema 中为可选（`String?`），意味着生产批次不保证有配方关联 | `schema.prisma:1467` `recipeId String?` | 无 recipeId 的生产批次无法做配方-投料物料平衡；无法验证实际投料是否符合配方理论用量 | P1 | 已验证 | `server/src/prisma/schema.prisma:1465-1468` |
| GAP-004 | 前端路由 `/recipes`、`/recipes/:id/edit`、`/process-steps` 均重定向到 `/products`，但重定向是静默的，用户从外部链接或文档中访问配方/工序老 URL 会无感跳转，没有任何提示 | `client/src/router/index.ts:849-860` 只做 `redirect` 不做提示 | 用户体验不一致；外部集成或测试若依赖旧 URL 会无法感知已变化 | P3 | 已验证 | `client/src/router/index.ts:849-860` |
| GAP-005 | `ProcessStep.recipe_id` 和 `ProcessStep.product_id` 均为可选，导致工序可以既不挂配方也不挂产品，成为孤立工序 | `schema.prisma:2922-2924` `product_id String?; recipe_id String?`；创建 ProcessStep 时两者均非必填 | 孤立工序无法参与产品归档联动（`archive()` 按 `product_id OR recipe_id` 查询）；也无法被产品工作台正确聚合 | P2 | 已验证 | `server/src/prisma/schema.prisma:2922-2924`；`product.service.ts:277-284` |
| GAP-006 | `processApi.createInstance()` 前端调用时只传 `productName` 文本，无法传入 `productId`（即使产品已存在于主数据中），导致已有产品也无法在研发流程创建时绑定 | `client/src/api/process.ts:75-77` `createInstance(templateId, productName?)` 签名不含 productId | 已在主数据中的产品无法在新研发流程实例上做精确绑定，Step1 审批通过后会另建重复 Product | P1 | 已验证 | `client/src/api/process.ts:75-77` |
| GAP-007 | `ProductionBatch.productName` 字段在 schema 中为 `String`（非空），但语义上应为快照，当前没有数据库层面约束确保写入时同步了 `productId`；若只填 productName 而不填 productId，约束无法检测 | `schema.prisma:1466` `productName String`（必填）vs `productId String?`（可选），两者逻辑约束不对称 | 产品名快照和产品主键可能存在不一致，追溯时产品名与主数据不匹配；已在设计规范中要求两者同时填写，但 schema 层面没有保障 | P2 | 已验证 | `server/src/prisma/schema.prisma:1465-1466` |
| GAP-008 | `RecipeLine.area_id` 在当前代码中为必填（`create()`/`createLegacy()` 中有 `area_id` 校验），但 schema 层面为可选（`String?`），且未来如果有代码路径绕过服务层直接写库，area_id 可能缺失 | `schema.prisma:2911` `area_id String?` | 缺少 area_id 的 RecipeLine 无法生成区域配料单，生产配料无法按区域拆分，BatchMaterialUsage 的 area_id 快照也无法填充 | P2 | 已验证 | `server/src/prisma/schema.prisma:2911`；`recipe.service.ts:71-79` |

---

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|---|---|---|---|---|---|
| GAP-001 | 在 `processApi.createInstance()` 签名中补加可选 `productId` 参数；`ProcessDetail.vue` Step1 步骤增加"关联已有产品"可选选择器；后端 `process-instance.controller.ts` `create()` 接受 `productId` 并写入 | Process 模块、Product 模块 | 否（扩展现有字段，productId 已在 schema 中存在） | feat: link-process-instance-to-product | 是（可与 GAP-6 合并） |
| GAP-002 | 在 `ProductionBatch` schema 中将 `productId` 改为 `String`（非空），或在 `ProductionBatchService.create()` 中强制要求 `productId` 并在应用层校验；同步更新前端创建批次入口，改为产品选择器 | ProductionBatch 模块、Product 模块 | 否（业务规则已在设计规范中明确，实施收敛即可） | fix: enforce-product-id-on-production-batch | 否（依赖前端入口整改） |
| GAP-003 | 在 `ProductionBatch` schema 中将 `recipeId` 改为 `String`（非空），或在服务层强制要求；`ProductionRun` 的 `recipe_id` 已业务必填，从 ProductionRun 向下传递时不丢弃 recipeId | ProductionBatch 模块、Recipe 模块 | 否 | fix: enforce-recipe-id-on-production-batch | 是（可与 GAP-2 合并） |
| GAP-004 | 在重定向路由上增加 `beforeEnter` 守卫，向用户展示"该地址已迁移到产品工作台"的短暂提示，避免静默跳转 | Router | 否 | chore: add-redirect-notice-for-legacy-routes | 是 |
| GAP-005 | 在 `CreateProcessStepDto` 中增加业务校验：`product_id` 和 `recipe_id` 至少提供其一；`ProcessStepService.create()` 在应用层加断言 | ProcessStep 模块 | 否 | fix: require-product-or-recipe-on-process-step | 是 |
| GAP-006 | 与 GAP-1 合并处理：在创建研发流程实例时允许传入 `productId`，并在 Step1 步骤中展示关联产品信息 | Process 模块、Product 模块 | 否 | feat: link-process-instance-to-product | 是（与 GAP-1 合并） |
| GAP-007 | 在 `ProductionBatch` 应用层增加以下约束：若 `productId` 存在，则 `productName` 必须从 `Product.name` 快照填充，禁止手填；若 `productId` 为空，需明确标记为历史遗留数据 | ProductionBatch 模块 | 否 | fix: sync-product-name-snapshot-from-product | 否（依赖 GAP-2） |
| GAP-008 | 在 `recipe_lines` schema 中将 `area_id` 改为 `String`（非空），增加 migration；或维持可选但补全所有写入路径的 area_id 校验（当前 `recipe.service.ts` 已有校验，但 `createLegacy` 路径需确认） | Recipe 模块 | 否 | fix: enforce-area-id-on-recipe-line | 是 |

---

## 9. 证据索引

以下文件在审计过程中被直接读取并发现证据：

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma`（行 2427-2510, 2751-2940, 1463-1560, 3663-3700）
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/product/product.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/product/product.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/recipe/recipe.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/recipe/recipe.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/process/process-instance.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/process-step/process-step.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/production-run/production-run.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/production-run/production-run.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/product.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/recipe.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/process.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/process-step.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/process/Step1.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/router/index.ts`（行 395-940 中关于 product/recipe/process 路由部分）
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-26-product-rd-redesign.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-29-product-master-data-and-production-linkage-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-29-product-archive-recipe-linkage-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`

---

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|---|---|---|---|---|
| 产品 | `Product.id`（products 表） | `productName`（快照）、`productCode`（展示用） | 不能在 ProcessInstance、ProductionBatch、PackagingMaterialUsage 等地方新建"产品事实字段" | `ProductionBatch.productName` 语义改为快照，不作为事实源；研发流程的 `ProcessInstance.productName` 需绑定到 `productId` |
| 配方 | `Recipe.id`（recipes 表），`RecipeLine.material_id + area_id` | `recipeName`（快照）、版本号 | 不能在研发流程 Step6 data JSON 中建 RecipeLine 平行事实；Step6 审批通过必须写入正式 recipes/recipe_lines 表 | `ProcessStepData.data` 中的 recipeLines 字段只是填写暂存，正式事实在 recipes 表 |
| 配料区域 | `WorkshopArea.id`（workshop_areas 表） | `areaNameSnapshot`（快照） | 不能在 BatchMaterialUsage 或 RecipeLine 中重新手填区域字符串；旧代码写死的"筛粉间/称油间/小料房"字符串不得扩大使用 | 已有 `RecipeLine.area_name_snapshot` 和 `BatchMaterialUsage.areaNameSnapshot` 作为历史快照，不作为新写入事实源 |
| 物料 | `Material.id`（materials 表） | 物料名称、编码（快照） | 不能在 RecipeLine 中只填物料名；不能在 BatchMaterialUsage 中只填物料名 | `RecipeLine.material_id` 已为外键约束；如有历史遗留手填物料名数据，需数据清洗后补入 material_id |
| 工序 | `ProcessStep.id`（process_steps 表），绑定 product_id 或 recipe_id | 工序名称、序号 | 不能在研发流程 JSON 数据中建独立工序事实源；过程记录通过 ProductionBatch → Recipe → ProcessStep 追溯 | `/process-steps` 路由已重定向到 `/products`，工序管理入口收归产品工作台 |
| 生产批次 | `ProductionBatch.id`（production_batches 表）+ `productId + recipeId` | `productName`（快照）、`recipeName`（快照） | 不能在 DeliveryNote、CustomerComplaint 等下游模块直接加 productId 外键绕过批次链路 | `FinishedGoodsBatch` 已从 Prisma schema 中移除（TASK-9），历史数据在 `finished_goods_batches` 表 |

---

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|---|---|---|---|---|---|
| P0（食品安全追溯链断点） | GAP-002 | fix: enforce-product-id-on-production-batch | 前端生产批次创建入口改为产品选择器 | 否 | `cd server && npx prisma migrate dev`；查询 `SELECT * FROM production_batches WHERE product_id IS NULL` 返回空 |
| P0（食品安全追溯链断点） | GAP-003 | fix: enforce-recipe-id-on-production-batch | GAP-002 完成后 | 否（与 GAP-2 合并 PR） | 同上，验证 `recipe_id IS NULL` 返回空 |
| P1（研发流程主数据断链） | GAP-001 + GAP-006 | feat: link-process-instance-to-product | 无 | 是 | `processApi.createInstance` 传入 productId 后，`GET /process/instances/:id` 返回的 `productId` 不为空 |
| P1（孤立工序导致归档联动失效） | GAP-005 | fix: require-product-or-recipe-on-process-step | 无 | 是 | `POST /process-steps` 不带 product_id 和 recipe_id 时返回 400 |
| P2（快照一致性） | GAP-007 | fix: sync-product-name-snapshot-from-product | GAP-002 完成后 | 否 | 创建 ProductionBatch 时不允许手填 productName，productName 由系统从 Product.name 填充 |
| P2（schema 层面 area_id 约束） | GAP-008 | fix: enforce-area-id-on-recipe-line | 无 | 是 | `POST /recipes` 不带 area_id 的 RecipeLine 返回 400 |
| P3（用户体验） | GAP-004 | chore: add-redirect-notice-for-legacy-routes | 无 | 是 | 访问 `/recipes` 看到跳转提示 |
