# GAP-001/006 研发流程绑定产品主数据设计

## 背景

模块审计发现研发流程仍以 `productName` 文本为主要事实源：

- `ProcessInstance` schema 已有 `productId`，但 `POST /process/instances` 只写 `productName`。
- 前端 `processApi.createInstance()` 不能传 `productId`。
- Step1 只有“开发产品名称”文本框，无法选择已有产品。
- Step1 审批回调在 `instance.productId` 为空时会新建 `Product`，因此已有产品如果重新走研发流程，可能被创建成重复产品。

这与项目主规则冲突：名称只用于展示，ID 才用于跨模块关联。

## 目标

让研发流程同时支持两种合法场景：

1. **已有产品发起研发/变更流程**：流程实例必须绑定已有 `Product.id`，审批通过后不能再创建重复 Product。
2. **真正新产品研发流程**：允许先填写产品名称，Step1 审批通过后由系统创建新的 `Product` 并回填 `ProcessInstance.productId`。

## 非目标

- 不改 Prisma schema。`ProcessInstance.productId` 已存在且必须继续可空，以支持新产品研发在 Step1 审批前尚未建档的状态。
- 不改产品编号生成机制。本次只消除重复建档风险；统一编号服务另行处理。
- 不重构 9 步研发流程、不改变审批定义。
- 不迁移历史流程实例。

## 当前代码事实

- `server/src/prisma/schema.prisma` 中 `ProcessInstance.productId String?` 已存在。
- `server/src/modules/process/process-instance.controller.ts` 的 `create()` 只写 `productName`。
- `client/src/api/process.ts` 的 `createInstance(templateId, productName?)` 不接收 `productId`。
- `client/src/views/process/Step1.vue` 只有 `productName` 文本输入。
- `server/src/modules/process/process-approval.callbacks.ts` 与 `process-step-approval.service.ts` 在 Step1 审批时，如果 `instance.productId` 为空，会创建 Product。

## 决策

### 1. `productName` 保留为快照，不再作为唯一事实源

`ProcessInstance.productName` 继续保留，用于审批标题、列表显示和历史快照。绑定已有产品时，后端必须从 `Product.name` 回填 `productName`，不能信任前端传入的产品名称。

### 2. 创建实例时支持可选 `productId`

`POST /process/instances` 接受：

```json
{
  "templateId": "template-id",
  "productId": "product-id",
  "productName": "仅新产品或兼容旧调用时使用"
}
```

当 `productId` 存在时：

- 后端验证 Product 存在、未删除。
- `ProcessInstance.productId = product.id`
- `ProcessInstance.productName = product.name`

当 `productId` 不存在时：

- 维持现有新产品研发路径。
- `productName` 可以为空或文本。

### 3. Step1 支持“关联已有产品”

Step1 增加一个可选产品选择器：

- 选择已有产品后，`productId` 写入 step data。
- `productName` 自动同步为产品名称，但仍允许显示为表单字段。
- 清空选择后，回到新产品研发模式，用户手填产品名称。

### 4. Step1 审批回调必须优先使用 `productId`

Step1 审批通过时：

1. 如果 step data 中有 `productId`：
   - 验证 Product 存在、未删除。
   - 更新 `ProcessInstance.productId` 与 `productName` 快照。
   - 不创建 Product。
2. 如果 instance 已有 `productId`：
   - 只更新 `productName` 快照，不创建 Product。
3. 如果没有任何 `productId`，但有 `productName`：
   - 保留现有新产品建档路径，创建 draft Product 并回填。

`process-approval.callbacks.ts` 是统一审批主路径；`process-step-approval.service.ts` 是旧审批兼容路径。两处都必须同步，避免不同审批入口产生不同行为。

## 验收标准

- 调用 `processApi.createInstance(templateId, undefined, productId)` 后，`GET /process/instances/:id` 返回对应 `productId`。
- Step1 选择已有产品并审批通过后，不会创建新的 Product。
- Step1 未选择已有产品但填写新产品名称，审批通过后仍会创建 draft Product。
- 审批标题和流程列表仍显示产品名称快照。
- 不修改 `ProcessInstance` schema，不迁移历史数据。

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** GAP-001/006 按 `brainstorming -> grill-me -> writing-plans` 处理。本 spec 是基于项目现状和既有产品主数据设计收敛出的执行规格。
- **grill-me 校准结论：** 已质询“是否直接强制所有研发流程创建时必须选择 Product”。结论是否定：新产品研发在 Step1 审批前可以没有 Product；已有产品流程必须能绑定 Product，且不能重复创建。
- **执行边界：** implementation plan 只允许修改 ProcessInstance 创建合同、Step1 产品选择、Step1 审批回调与聚焦测试；不改产品编号、配方生成、审批定义或历史数据。
