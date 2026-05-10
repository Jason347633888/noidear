# GAP-002/003 生产批次强制绑定产品与配方设计

## 背景

`ProductionBatch` 是追溯链核心节点，但当前 schema 仍允许：

```prisma
productId String?
recipeId  String?
```

服务层和前端创建入口已经基本要求 `productId + recipeId`，但数据库仍允许空值或绕过服务层写入无产品、无配方的生产批次。这样会导致：

- 生产批次无法稳定追到产品主数据。
- 投料记录无法用批次配方校验理论用量。
- 物料平衡、正追、反追都可能从生产批次处断链。

## 目标

将 `ProductionBatch` 收敛为强主数据链节点：

- `productId` 数据库层非空。
- `recipeId` 数据库层非空。
- `productId` 外键指向 `Product.id`。
- `recipeId` 外键指向 `Recipe.id`。
- 应用层继续只允许 active 产品和 active 配方创建新批次。

## 非目标

- 不补录历史生产批次数据。
- 不自动猜测历史批次属于哪个产品或配方。
- 不改批次号规则。
- 不改包装入库确认语义。
- 不改 `productName` / `recipeName` 快照字段；它们继续作为展示快照，不作为事实源。

## 当前代码事实

- `CreateProductionBatchDto` 已要求 `productId` 和 `recipeId` 非空。
- `ConfirmProductBatchDto` 已要求 `productId` 和 `recipeId` 非空。
- `ProductionBatchService.create()` 已校验 active Product 和 active Recipe，并写入 `productId`、`recipeId`、`productName`、`recipeName`。
- `confirmProductBatch()` 已校验产品和配方，但 product/recipe 查询还没有统一 company 过滤。
- schema 仍未建立 Product/Recipe relation，也没有非空约束。

## 决策

### 1. 先做 schema 约束，不做历史自动修复

本 PR 增加数据库约束和 Prisma relation。迁移 SQL 需要显式检查历史数据：

- 如果存在 `productId IS NULL` 或 `recipeId IS NULL`，迁移必须失败并给出明确错误。
- 如果存在 orphan `productId` 或 orphan `recipeId`，迁移必须失败并给出明确错误。

这样可以避免“为了上线迁移而猜测数据”，保护历史追溯真实性。

### 2. `Product` 与 `Recipe` 增加反向 relation

`ProductionBatch` 增加：

```prisma
product Product @relation(fields: [productId], references: [id], onDelete: Restrict)
recipe  Recipe  @relation(fields: [recipeId], references: [id], onDelete: Restrict)
```

`Product` 和 `Recipe` 增加 `productionBatches ProductionBatch[]`。

### 3. 查询和更新继续使用现有字段名

前后端现有字段继续叫 `productId`、`recipeId`。不改为 `product_id` / `recipe_id`，避免扩大改动面。业务文档可继续用 `product_id` / `recipe_id` 表达语义。

### 4. 服务层补一层防御

虽然 DTO 已非空，服务层仍需要显式防御空字符串和不一致情况：

- `create()` 和 `confirmProductBatch()` 都必须通过 `productId + recipeId` 查到 active 产品和 active 配方。
- 配方必须属于该产品。
- `confirmProductBatch()` 的 product 和 recipe 查询也要补 `company_id: '1'`，与 `create()` 保持一致。

## 验收标准

- Prisma schema 中 `ProductionBatch.productId` 和 `ProductionBatch.recipeId` 为 `String`。
- Prisma schema 中 `ProductionBatch` 有 `product` 和 `recipe` relation。
- migration SQL 在设置 NOT NULL / FK 前检查历史空值和 orphan 数据。
- `ProductionBatchService` 测试覆盖：
  - 创建批次写入 product/recipe 快照。
  - product 不存在或未启用时报错。
  - recipe 不存在、未启用或不属于产品时报错。
  - 包装确认路径同样按 company + active + product 归属校验 recipe。
- 不修改 `productName` / `recipeName` 快照语义。

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** GAP-002/003 按 `brainstorming -> grill-me -> writing-plans` 处理。本 spec 基于现有生产批次服务、产品主数据设计和追溯总说明收敛。
- **grill-me 校准结论：** 已质询是否可以只靠服务层校验。结论是不够：ProductionBatch 是追溯核心节点，数据库层也必须阻止空产品/空配方；但不能自动猜测历史数据，因此迁移必须先检查再失败。
- **执行边界：** implementation plan 只允许修改 ProductionBatch schema、迁移、服务层 company/product/recipe 校验和聚焦测试；不处理历史补录、不改批次号、不改配料归集。
