# GAP-203 PackagingMaterialUsage Batch FK 设计

## 背景和现状

`PackagingMaterialUsage` 承载蛋糕包装机用膜等包材用量记录。业务上它处在 `ProductionBatch -> PackagingMaterialUsage -> Material` 链路中，用来回答某个产品批次使用了哪些包材、实际用量和废料量是多少。

当前 `docs/module-usage/06-mixing-production-packaging.md`、`docs/module-usage/99-current-gap-register.md` 和 Prisma schema 均已验证 GAP-203：

- `PackagingMaterialUsage.production_batch_id` 是 `String?` 裸字段。
- `PackagingMaterialUsage` 没有 `@relation` 到 `ProductionBatch`。
- `ProductionBatch` 没有 `packagingMaterialUsages` 反向关系。
- 服务层只在传入 `production_batch_id` 时校验批次存在；不传时仍可产生脱离批次的包材用量记录。

这会导致包材用量无法通过 Prisma 关系参与批次追溯查询，也允许新记录脱离 `ProductionBatch` 主追溯节点。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：所有影响追溯、召回、放行、物料平衡的记录最终必须回到批次级别；下游模块不能自行维护平行批次事实源。
- `docs/module-usage/06-mixing-production-packaging.md`：已把包材用量定义为 `ProductionBatch -> PackagingMaterialUsage -> Material`，并标记 `production_batch_id` 无 FK 为 GAP-203。
- `docs/module-usage/99-current-gap-register.md`：GAP-203 是 P1、已验证、涉及 schema/migration、不涉及历史数据迁移。
- `server/src/prisma/schema.prisma`：`PackagingMaterialUsage.production_batch_id String?`；`material_id` 已 FK 到 `Material`；`ProductionBatch` 目前已有 `materialUsages`、`aggregations`、质量/发货/留样等关系，但缺少包材用量反向关系。
- `server/src/modules/packaging-material-usage/packaging-material-usage.service.ts`：创建记录时已校验 `material_id`，并在 `production_batch_id` 存在时校验批次；当前缺少“批次必填”门禁。
- `server/src/modules/packaging-material-usage/dto/create-packaging-material-usage.dto.ts`：`production_batch_id?: string` 仍可选。
- `client/src/views/packaging-material-usage/PackagingMaterialUsageList.vue`：页面已使用 `ProductionBatchSelect`，但表单规则未把生产批次设为必填，提交时仍会把空值转为 `undefined`。
- `client/src/api/packaging-material-usage.ts`：类型仍允许 `production_batch_id: string | null` 和创建 payload 可选批次。

## 业务边界

本 GAP 只补齐包材用量记录与产品批次的追溯锚点：

- `PackagingMaterialUsage.production_batch_id` 改为非空。
- `PackagingMaterialUsage.production_batch_id` 增加 FK 到 `ProductionBatch.id`。
- `ProductionBatch` 增加 `packagingMaterialUsages PackagingMaterialUsage[]` 反向 relation。
- 创建包材用量时，DTO、服务层和页面都必须要求选择已有生产批次。
- 继续复用 `Material` 作为包材主数据事实源；`material_name` / `material_code` 只作为快照展示字段。

## 不做什么

- 不新增包材主数据；包材仍是 `Material` 中的物料类型。
- 不新增平行的包装批次、成品批次或包材批次链路。
- 不修改 `ProductionBatch` 创建/放行状态机。
- 不实现包材库存扣减、FIFO、物料平衡公式扩展或废料统计报表。
- 不处理 GAP-201、GAP-202、GAP-204、GAP-205、GAP-206、GAP-207。
- 不改 `company_id: '1'` 硬编码问题；这是跨模块租户隔离问题，不属于本 GAP。
- 不自动猜测或回填历史空批次包材记录。

## 数据、接口和页面影响

### 数据影响

- `PackagingMaterialUsage.production_batch_id` 从 `String?` 改为 `String`。
- 增加 `production_batch ProductionBatch @relation(fields: [production_batch_id], references: [id], onDelete: Restrict)`。
- 增加 `@@index([production_batch_id])`。
- `ProductionBatch` 增加 `packagingMaterialUsages PackagingMaterialUsage[]`。
- migration 必须在设置 NOT NULL / FK 前检查：
  - 是否存在 `production_batch_id IS NULL` 的历史包材记录。
  - 是否存在引用不到 `production_batches.id` 的 orphan `production_batch_id`。

### 接口影响

- `POST /packaging-material-usages` 请求必须包含非空 `production_batch_id`。
- 如果 `production_batch_id` 缺失或为空，DTO 或服务层返回 400。
- 如果 `production_batch_id` 不存在，服务层返回业务错误，不依赖数据库 FK 暴露低层错误。
- `GET /packaging-material-usages` 可以继续返回现有字段；后续如需展示批次号，可另开独立页面优化。

### 页面影响

- `PackagingMaterialUsageList.vue` 新建对话框中的“生产批次”必须为必填。
- 页面继续使用已有 `ProductionBatchSelect`，但提交 payload 不得把空批次转成 `undefined`。
- `client/src/api/packaging-material-usage.ts` 的类型要与后端合同一致：读取结果和创建 payload 都把 `production_batch_id` 视为必填 string。

## 历史数据和迁移策略

本 GAP 标记为“不涉及历史数据迁移”，含义是本计划不自动修改历史业务数据。schema migration 采用 fail-fast：

1. 如果存在 `PackagingMaterialUsage.production_batch_id IS NULL`，migration 抛错并停止。
2. 如果存在 orphan `production_batch_id`，migration 抛错并停止。
3. 执行 agent 不得用使用日期、操作员、物料名、最近批次或其他启发式规则自动回填。
4. 如 preflight 失败，执行 agent 必须停止并回报主 agent，由业务确认历史记录真实归属后另开数据修复任务。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-203 是 `needs_spec`，影响 schema、追溯链和 ProductionBatch 批次事实源，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐采用数据库非空 FK + 服务层存在性校验 + 页面必选批次的组合。只做 nullable FK 不能阻止新包材记录脱离批次；只做服务层校验又无法防止绕过 API 的写入。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化“所有跨模块查询最终都要回到批次级别”。
  - 不重复造主数据或事实源；继续复用 `ProductionBatch` 和 `Material`。
  - 不引入平行批次链路；`PackagingMaterialUsage` 直接回到 `ProductionBatch`。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；只补齐包装包材用量的批次 FK。
  - 不自动迁移历史数据；发现空值或 orphan 时停止并回报。
  - 不需要新的业务确认；GAP 已验证且模块文档已定义包材用量属于批次追溯链。
  - 可拆成独立小 PR：只涉及 packaging-material-usage、Prisma schema/migration、页面字段合同和 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `PackagingMaterialUsage.production_batch_id` 为非空 `String`。
- Prisma schema 中 `PackagingMaterialUsage.production_batch` FK 指向 `ProductionBatch.id`，删除策略为 `Restrict`。
- Prisma schema 中 `ProductionBatch` 有 `packagingMaterialUsages PackagingMaterialUsage[]` 反向 relation。
- migration 在设置 NOT NULL / FK 前检查空值和 orphan，并在发现历史数据不满足时失败。
- `CreatePackagingMaterialUsageDto.production_batch_id` 必填且不能为空。
- `PackagingMaterialUsageService.create()` 在写入前要求生产批次存在；缺失或不存在时返回业务错误。
- `PackagingMaterialUsageList.vue` 新建记录时必须选择生产批次，不能提交空批次。
- `npx prisma validate --schema src/prisma/schema.prisma` 通过。
- `npm test -- packaging-material-usage.service.spec.ts --runInBand` 通过。
- `npm run test:e2e -w client -- --grep GAP-203` 通过；如果当前仓库没有 GAP-203 E2E 脚本或测试用例，执行 agent 不安装 pnpm，需明确记录该结果，并以 Prisma validate、focused Jest、client build 作为替代验证。
