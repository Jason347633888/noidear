# GAP-008 RecipeLine area_id 非空设计

## 背景和现状

`RecipeLine` 是配方明细事实源，负责把 `Recipe`、`Material` 和 `WorkshopArea` 绑定在一起。主数据文档已明确：`WorkshopArea` 是配料区域主数据唯一事实源，`RecipeLine.area_id` 是配方行所属配料区域的关联事实，`area_name_snapshot` 只是在写入时保存的展示快照。

当前应用层已经把配料区域当成必填：

- `CreateRecipeDto.RecipeLineDto.area_id` 使用 `@IsString()` 和 `@IsNotEmpty()`。
- `CreateLegacyProductDto.LegacyProductRecipeLineDto.area_id` 使用 `@IsString()` 和 `@IsNotEmpty()`。
- `RecipeService.create()` 会查询 active 且未删除的 `WorkshopArea`，并写入 `area_name_snapshot`。
- `ProductService.createLegacy()` 会校验 `WorkshopArea` 并写入 `area_name_snapshot`。
- `ProductProcessChangeService.validatePayload()` 已要求产品工艺变更中的 recipe line 必须有 `area_id`。

但 Prisma schema 仍允许：

```prisma
area_id String?
area    WorkshopArea? @relation("RecipeLineArea", fields: [area_id], references: [id], onDelete: SetNull)
```

如果未来有批量导入、脚本、变更执行或绕过服务层的写入路径创建了没有 `area_id` 的 `RecipeLine`，区域配料单、投料区域快照和物料平衡都会缺少区域锚点。

## 当前代码事实源

- `docs/module-usage/02-master-data-and-boundaries.md`：GAP-008 已验证，问题是 schema 层面 `RecipeLine.area_id` 可空。
- `server/src/prisma/schema.prisma`：`RecipeLine.area_id String?`，`area` relation 为可选并使用 `onDelete: SetNull`。
- `server/src/modules/recipe/dto/create-recipe.dto.ts`：配方创建 DTO 要求 `area_id` 非空。
- `server/src/modules/recipe/recipe.service.ts`：创建配方时按 `area_id` 读取 `WorkshopArea` 并保存区域名快照。
- `server/src/modules/product/dto/create-legacy-product.dto.ts` 和 `server/src/modules/product/product.service.ts`：历史产品建档也要求并校验 `area_id`。
- `server/src/modules/product-process-change/product-process-change.service.ts`：提交产品工艺变更前校验 recipe line 的 `area_id`，但实际创建 recipe line 时仍存在 `area_id: l.area_id ?? null` 的可空写法。
- `server/src/modules/batch-trace/services/material-usage.service.ts` 与 `batch-material-usage.service.ts`：投料记录从 `recipeLine.area_id` 写入 `BatchMaterialUsage.area_id` 快照。

## 业务边界

本 GAP 只收紧配方明细到配料区域的持久化约束：

- `RecipeLine.area_id` 必须非空。
- `RecipeLine.area` 必须是必选 relation。
- `RecipeLine.area_id` 必须引用存在的 `WorkshopArea.id`。
- `WorkshopArea` 仍允许软删除；被配方引用的区域不应通过硬删除清空历史配方行。

`BatchMaterialUsage.area_id` 本次不改为非空。投料记录是历史业务事件，已有投料可能来自历史缺区域配方或旧流程；其收紧应作为独立 GAP 处理。

## 不做什么

- 不新增新的区域主数据表。
- 不把区域名字符串作为事实源。
- 不扩大旧的写死区域字符串（如“筛粉间/称油间/小料房”）使用范围。
- 不自动猜测历史 `recipe_lines.area_id`。
- 不修改 `BatchMaterialUsage.area_id` 的可空性。
- 不改前端页面交互，除非执行时发现类型生成导致现有前端类型必须同步。

## 数据、接口和页面影响

### 数据影响

- `server/src/prisma/schema.prisma` 中 `RecipeLine.area_id` 从 `String?` 改为 `String`。
- `RecipeLine.area` 从可选 relation 改为必选 relation。
- relation 删除策略从 `SetNull` 改为 `Restrict`。配料区域是主数据，历史配方行不能因硬删除区域而失去区域事实。系统已有 `deleted_at`，区域停用或归档应走软删除/状态变更。
- migration 必须在改非空前检查：
  - 是否存在 `recipe_lines.area_id IS NULL`。
  - 是否存在引用不到 `workshop_areas.id` 的 orphan `area_id`。

### 接口影响

- `POST /recipes` 对不带 `area_id` 的配方行继续返回 400。
- `POST /products/legacy` 对不带 `area_id` 的历史产品建档继续返回 400。
- 产品工艺变更执行路径必须不再向 Prisma 写入 `area_id: null`。

### 页面影响

当前 `RecipeEdit.vue`、`LegacyProductDrawer.vue` 和相关 API payload 已要求 `area_id`。本 GAP 不新增页面，不重做区域选择器。

## 历史数据和迁移策略

本次不自动补历史数据。迁移采用 fail-fast 策略：

1. 如果存在 `recipe_lines.area_id IS NULL`，migration 抛错并停止。
2. 如果存在 orphan `area_id`，migration 抛错并停止。
3. 执行 agent 不得用默认区域、第一条 active 区域或区域名快照自动回填历史数据。
4. 如 migration 因历史数据失败，执行 agent 必须停止并回报主 agent，由业务确认历史配方行的真实配料区域后另开数据修复任务。

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** GAP-008 当前是 `needs_spec`，已按 `brainstorming -> grill-with-docs -> writing-plans` 流程先形成本 spec。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化“名称只展示，ID 才关联”。
  - 不重复创建主数据；继续以 `WorkshopArea` 为唯一配料区域事实源。
  - 不引入平行批次链路；只是保证 `RecipeLine -> WorkshopArea` 稳定存在。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；投料仍从 `RecipeLine` 带出区域快照。
  - 需要 migration 检查历史数据，但不自动迁移。
  - 不需要新的业务决策，除非 migration 发现历史空值或 orphan。
  - 可拆成一个独立 schema/服务类型收敛 PR。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `RecipeLine.area_id` 为 `String`，`RecipeLine.area` 为必选 relation。
- `RecipeLine.area` 的 referential action 不再使用 `SetNull`。
- migration 在设置 NOT NULL / FK 前检查历史空值和 orphan 区域引用。
- 产品工艺变更执行路径不再向 `RecipeLine.area_id` 写入 `null`。
- 现有 recipe、legacy product、product process change 写入路径继续要求 `area_id`。
- `POST /recipes` 不带 `area_id` 的 RecipeLine 返回 400。
- `npm test -- recipe.service.spec.ts product-legacy.service.spec.ts product-process-change.service.spec.ts material-usage.service.spec.ts --runInBand` 通过，或执行 agent 明确报告与本 GAP 无关的既有失败。
- `npx prisma validate --schema src/prisma/schema.prisma` 通过。
