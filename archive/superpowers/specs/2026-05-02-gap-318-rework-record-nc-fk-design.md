# GAP-318 ReworkRecord NonConformance FK 设计

## 背景和现状

`NonConformance` 是不合格事实源，`ReworkRecord` 是返工执行证据。返工记录必须能从不合格处置回到生产批次，再进入 `ProductionBatch -> BatchMaterialUsage(IngredientUsage) -> MaterialBatch(MaterialLot)` 的追溯链。

GAP-318 已验证：当前 `ReworkRecord.nc_id` 只是可选 `String?` 字段，没有 Prisma `@relation`，也没有数据库 FK。系统允许返工记录不关联不合格记录，也允许 `nc_id` 指向不存在或跨租户的不合格记录。这会让 `NonConformance -> ReworkRecord` 反查断裂，返工证据无法稳定支撑批次放行、追溯复核和管理评审。

本设计将 `ReworkRecord.nc_id` 收紧为必填 FK，显式关联 `NonConformance.id`，并在服务层校验当前公司内的不合格记录存在。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：`ReworkRecord` 已实现，业务口径为“关联生产批次和不合格”；CAPA/不合格/返工必须使用结构化来源，不能只存备注描述。
- 历史 Multica GAP 模块文档：GAP-318 是 P2、已验证，问题是 `ReworkRecord.nc_id` 为可选字段且无 FK；建议改为真正 FK 关联 `NonConformance`。
- `server/src/prisma/schema.prisma`：
  - `NonConformance` 当前无 `rework_records` 反向 relation。
  - `ReworkRecord.production_batch_id` 已是必填 FK 到 `ProductionBatch`。
  - `ReworkRecord.nc_id String?` 当前可为空且无 `@relation`。
- `server/src/modules/rework-record/dto/create-rework-record.dto.ts`：`nc_id?: string` 且 `@IsOptional()`。
- `server/src/modules/rework-record/rework-record.service.ts`：`create()` 直接展开 DTO 写库，不校验 `nc_id` 是否存在或属于当前 `companyId`。
- `client/src/api/rework-record.ts`：读取类型允许 `nc_id: string | null`，创建 payload 中 `nc_id` 可选。
- `client/src/views/rework-record/ReworkRecordList.vue`：新建返工记录时“关联不合格品”是可选文本输入。

## 业务边界

本 GAP 只收紧返工记录与不合格记录之间的结构化关系：

- `ReworkRecord.nc_id` 必须非空。
- `ReworkRecord.nc_id` 必须 FK 到 `NonConformance.id`。
- `NonConformance` 增加 `rework_records ReworkRecord[]` 反向 relation，支撑从不合格反查所有返工记录。
- 手工创建返工记录时，API 必须要求 `nc_id` 并校验该不合格记录属于当前 `companyId`。
- 如果被关联的 `NonConformance.source_type = 'production_batch'`，则 `ReworkRecord.production_batch_id` 必须等于 `NonConformance.source_id`，避免同一不合格关联到错误生产批次。
- `ReworkRecord` 继续保留 `production_batch_id`，因为返工执行证据必须直接落回生产批次放行链。

## 不做什么

- 不修改 `NonConformance.source_type + source_id` 多态来源模型；GAP-313 已单独处理来源校验。
- 不实现 GAP-315 的 dispose 自动创建返工记录；本 GAP 只保证创建出来的 `ReworkRecord` 必须有真实 NC FK。
- 不实现 GAP-314 的安全编号生成。
- 不新增返工任务、返工审批流、批次放行状态机或 CAPA 自动创建。
- 不把返工数量、返工过程、质量判定冗余写回 `NonConformance`。
- 不新增平行不合格表、平行批次字段或备注解析逻辑。
- 不自动猜测历史 `nc_id` 为空或 orphan 的返工记录应该关联哪个不合格记录。

## 数据、接口和页面影响

### 数据影响

- `ReworkRecord.nc_id` 从 `String?` 改为 `String`。
- `ReworkRecord` 增加 `non_conformance NonConformance @relation(fields: [nc_id], references: [id], onDelete: Restrict)`。
- `NonConformance` 增加 `rework_records ReworkRecord[]`。
- `ReworkRecord` 增加 `@@index([nc_id])`，支撑从不合格反查返工记录。
- migration 必须在设置 NOT NULL / FK 前检查：
  - 是否存在 `ReworkRecord.nc_id IS NULL` 或空字符串。
  - 是否存在引用不到 `NonConformance.id` 的 orphan `nc_id`。
  - 是否存在 `ReworkRecord.company_id` 与被关联 `NonConformance.company_id` 不一致。
  - 当 `NonConformance.source_type = 'production_batch'` 时，是否存在 `ReworkRecord.production_batch_id != NonConformance.source_id`。

### 接口影响

- `POST /rework-records` 请求必须包含非空 `nc_id`。
- `nc_id` 缺失、为空、指向不存在记录或跨公司记录时，服务层返回 400。
- 当关联 NC 的来源是生产批次且与请求的 `production_batch_id` 不一致时，服务层返回 400。
- `GET /rework-records` 继续按 `company_id` 与日期范围查询，返回字段保持现有 snake_case 形态。
- `DELETE /rework-records/:id` 不改变；删除返工记录不级联删除不合格记录。

### 页面影响

- `client/src/api/rework-record.ts` 读取类型和创建 payload 都把 `nc_id` 视为必填 string。
- `ReworkRecordList.vue` 新建返工记录时“关联不合格品”必须填写。
- 本 GAP 不新增不合格记录选择器；页面可以暂时保留 ID 输入，但不能继续把该字段作为可选项提交。后续若要优化为选择器，应基于 `NonConformance` 列表 API 单独规划，不与 FK schema PR 混做。

## 历史数据和迁移策略

本 GAP 不自动迁移历史业务数据。schema migration 采用 fail-fast：

1. 如果存在 `ReworkRecord.nc_id IS NULL` 或空字符串，migration 抛错并停止。
2. 如果存在 orphan `nc_id`，migration 抛错并停止。
3. 如果存在跨公司 `ReworkRecord -> NonConformance` 关联，migration 抛错并停止。
4. 如果 `NonConformance.source_type = 'production_batch'` 但返工记录生产批次与 NC 来源批次不一致，migration 抛错并停止。
5. 执行 agent 不得根据返工日期、描述、生产批次、最近不合格记录或任何启发式规则自动回填。
6. 如 preflight 失败，执行 agent 必须停止并回报主 agent，由业务确认历史返工记录真实不合格来源后另开数据修复任务。

## Brainstorming 备选方案

推荐方案：将 `ReworkRecord.nc_id` 改为必填 FK，并在服务层做 current-company NC 存在性校验。该方案同时封住 API 写入和数据库绕写，能保证 `NonConformance -> ReworkRecord` 反查成立。

备选方案 A：保持 `nc_id` 可选，但增加服务层校验。该方案不能防止绕过 API 的孤立返工记录，也无法满足显式 FK 关联要求。

备选方案 B：只在前端把 `nc_id` 设为必填。该方案不能保护 API、脚本或数据导入路径，也不能解决已有 schema 无 FK 的事实。

备选方案 C：把 `ReworkRecord` 完全挂到 `NonConformance`，移除 `production_batch_id`。该方案会削弱返工执行记录对生产批次放行链的直接锚点，与主追溯模型中 `ProductionBatch -> ReworkRecord` 的过程/放行链不一致。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-318 是 `needs_spec`，影响 schema、历史数据 preflight、返工执行证据和不合格治理链，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 采用数据库必填 FK + 服务层 current-company 校验 + 页面/API 必填合同。只做前端或服务层都不足以保证追溯证据链。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化 `NonConformance -> ReworkRecord -> ProductionBatch` 的放行证据链。
  - 不重复造主数据或事实源；继续复用 `NonConformance`、`ReworkRecord`、`ProductionBatch`。
  - 不引入平行批次链路；`ReworkRecord.production_batch_id` 继续回到 `ProductionBatch`。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；本 GAP 只给返工证据补齐 NC FK。
  - 需要历史数据 preflight，但不自动迁移历史数据；发现空值、orphan、跨租户或批次不一致时停止并回报。
  - 不需要新的业务确认；issue 已指定 GAP-318 已验证，目标是 ReworkRecord 到 NonConformance 的显式 FK 关联。
  - 可拆成独立小 PR：Prisma schema/migration、rework-record DTO/service/spec、最小前端类型与必填校验。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `ReworkRecord.nc_id` 为非空 `String`。
- Prisma schema 中 `ReworkRecord.non_conformance` FK 指向 `NonConformance.id`，删除策略为 `Restrict`。
- Prisma schema 中 `NonConformance` 有 `rework_records ReworkRecord[]` 反向 relation。
- migration 在设置 NOT NULL / FK 前检查空值、orphan、跨公司关联和生产批次来源不一致，并在发现历史数据不满足时失败。
- `CreateReworkRecordDto.nc_id` 必填且不能为空。
- `ReworkRecordService.create()` 在写入前校验当前公司内的 `NonConformance` 存在。
- 当关联 NC 的 `source_type='production_batch'` 时，服务层校验 `production_batch_id === source_id`。
- `client/src/api/rework-record.ts` 不再把 `nc_id` 标为可选或 nullable。
- `ReworkRecordList.vue` 新建返工记录时必须填写关联不合格记录。
- `(cd server && npx prisma validate --schema src/prisma/schema.prisma)` 通过。
- `(cd server && npm test -- rework-record.service.spec.ts --runInBand)` 通过。
- `npm run build:server` 通过。
- `npm run build:client` 通过。
