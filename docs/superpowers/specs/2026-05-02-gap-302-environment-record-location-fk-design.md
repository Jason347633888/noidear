# GAP-302 EnvironmentRecord Location FK 设计

## 背景和现状

`EnvironmentRecord` 承载生产环境温湿度、压差等前提方案监控记录，属于品质管控与放行证据链的一部分。`docs/module-usage/07-quality-qc-release.md` 已验证 GAP-302：`EnvironmentRecord.location` 仍是自由文本，无法稳定按位置维度查询，也无法证明记录位置来自受控主数据。

当前 `origin/master` 的代码事实比模块文档略新：GAP-300 的批次 FK 已落地，`EnvironmentRecord.production_batch_id` 已非空并 FK 到 `ProductionBatch`。GAP-302 的问题仍存在：

- `server/src/prisma/schema.prisma`：`EnvironmentRecord.location String` 是自由文本。
- `server/src/modules/environment-record/dto/create-environment-record.dto.ts`：创建 DTO 要求传 `location` 字符串。
- `server/src/modules/environment-record/environment-record.service.ts`：创建时直接展开 DTO，未校验位置主数据。
- `client/src/views/environment-record/EnvironmentRecordList.vue`：新建记录使用 `el-input` 手填“监测位置”。
- `client/src/api/environment-record.ts`：创建 payload 只包含 `location` 字符串。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：`Location` 是高复用主数据，名称只展示，ID 才关联；环境类、清洁类、质检类记录大量使用位置维度。
- `docs/module-usage/02-master-data-and-boundaries.md`：当前代码中的区域主数据事实源是 `WorkshopArea`，`workshop_areas` 表是“区域主数据的唯一事实源”，旧代码写死或手填区域字符串不得扩大使用。
- `docs/module-usage/07-quality-qc-release.md`：GAP-302 建议“将 EnvironmentRecord.location 改为 FK 关联 Location 表，或新增 location_id 字段”。
- `docs/module-usage/99-current-gap-register.md`：GAP-302 已验证，影响位置维度查询，建议 PR 为 `fix/environment-record-location-fk`。
- `server/src/prisma/schema.prisma`：没有独立 `Location` model；已有 `WorkshopArea(id, company_id, code, name, status, deleted_at)`，并被 RecipeLine、BatchMaterialUsage、MixingExecution、StagingAreaStock 等生产链路复用。
- `server/src/modules/workshop-area/` 与 `client/src/api/workshop-area.ts`：已有受 JWT 保护的 `/workshop-areas` 列表接口和前端 API，可供环境记录表单复用。

## 业务边界

本 GAP 将“环境监测位置”从自由文本收敛到当前实现中的区域主数据 `WorkshopArea`：

- 新增 `EnvironmentRecord.location_id`，FK 到 `WorkshopArea.id`。
- 保留 `EnvironmentRecord.location` 作为位置名称快照，用于列表展示和历史记录兼容；新记录的快照必须由服务端从 `WorkshopArea.name` 写入，不接受前端手填。
- 创建环境记录时，服务层必须校验 `location_id` 指向当前公司内 active 且未删除的 `WorkshopArea`。
- 前端新建环境记录时使用 `/workshop-areas` 下拉选择，不再允许手填位置文本。
- 查询结果继续返回 `location` 文本；可同时返回 `location_id`，为后续按区域筛选、报表和追溯聚合提供稳定键。

## 不做什么

- 不新增独立 `Location` model。当前代码已有 `WorkshopArea` 作为生产区域主数据；直接新增 `Location` 会与现有区域主数据形成平行事实源。
- 不迁移或重构 `WorkshopArea` 为通用 `Location`。这属于更大的主数据命名收敛任务，不放入 GAP-302。
- 不处理设备位置、仓库库位、审计登录地理位置等其他 `location` 字符串字段。
- 不实现批次放行状态机。
- 不实现环境超标自动触发 `NonConformance`。
- 不改 `company_id` 硬编码问题；本 GAP 只处理位置主数据绑定。
- 不用自由文本近似匹配自动回填历史 `location_id`。

## 数据、接口和页面影响

### 数据影响

- `EnvironmentRecord` 新增 `location_id String?` 与可选 relation，指向 `WorkshopArea.id`。
- `WorkshopArea` 增加 `environmentRecords EnvironmentRecord[]` 反向 relation。
- `EnvironmentRecord.location` 保留为 `String` 快照，不再作为新记录的位置事实源。
- 新增 `@@index([location_id])`，并建议新增 `@@index([company_id, location_id, measured_at])` 支撑按公司、位置、时间查询。

`location_id` 在 schema 层先允许为空，原因是历史 `EnvironmentRecord.location` 只有文本，当前任务不做自动历史数据迁移。新写入路径通过 DTO、服务层和前端强制传入 `location_id`。

### 接口影响

- `POST /environment-records` 新请求必须包含 `location_id`。
- `POST /environment-records` 不再需要前端传 `location`；若保留兼容字段，也不得信任它作为事实源。
- 如果 `location_id` 缺失，DTO 校验返回 400。
- 如果 `location_id` 不存在、非当前公司、非 active 或已删除，服务层返回 400，错误语义为“监测位置不存在或已停用”。
- `GET /environment-records` 日期筛选保持不变；列表返回值包含历史 `location` 快照，允许 `location_id` 为空以兼容旧记录。

### 页面影响

- `EnvironmentRecordList.vue` 新建对话框中的“监测位置”改为 `el-select`。
- 选项来自 `workshopAreaApi.getList()`，显示 `name`，提交 `id`。
- 表单规则从 `location` 必填改为 `location_id` 必填。
- 提交 payload 使用 `location_id`，不再提交用户手填 `location`。
- 列表仍展示 `row.location`；历史无 `location_id` 的记录继续可读。

## 历史数据和迁移策略

本 GAP 不自动迁移历史业务数据。迁移只新增 nullable `location_id` 与 FK 约束，不根据文本 `location` 自动匹配 `WorkshopArea`。

执行 agent 必须遵守：

1. 不写 `UPDATE "EnvironmentRecord" SET "location_id" = ...` 的启发式回填。
2. 不用同名、模糊名、拼音、包含关系或默认区域猜测历史归属。
3. 如果业务要求历史记录也具备位置维度查询，另开数据治理任务，由业务确认每个历史位置文本到 `WorkshopArea.id` 的映射。
4. 新记录从本 PR 后必须具备 `location_id`，旧记录的 `location_id` 可为空但 `location` 快照必须保留。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-302 是 `needs_spec`，影响主数据事实源、schema 关系和历史数据策略，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐新增 `location_id` FK 并保留 `location` 快照，而不是把 `location` 字段直接替换掉。这样能阻断新数据继续手填，同时避免破坏历史环境记录展示。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计落实“名称只展示，ID 才关联”。
  - 不重复造主数据；当前代码没有 `Location` model，且 `docs/module-usage/02-master-data-and-boundaries.md` 已声明 `WorkshopArea` 是区域主数据唯一事实源。
  - 不引入平行批次链路；`EnvironmentRecord` 继续通过 `production_batch_id` 回到 `ProductionBatch`。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；只补齐环境记录的位置维度 FK。
  - 不自动迁移历史数据；历史 `location` 文本保留为快照，`location_id` 可为空。
  - 不需要新的业务确认；GAP 已验证，当前代码的 `WorkshopArea` 足以承载生产环境监测位置。
  - 可拆成独立小 PR：只涉及 `EnvironmentRecord` schema、environment-record 服务与页面，以及 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `EnvironmentRecord` 有 `location_id String?`。
- Prisma schema 中 `EnvironmentRecord.location_ref` 或等价 relation FK 指向 `WorkshopArea.id`，且 `WorkshopArea` 有反向 relation。
- Prisma schema 中 `EnvironmentRecord.location` 仍为 `String` 快照。
- migration 只新增 nullable `location_id`、索引和 FK；不自动回填历史数据。
- `CreateEnvironmentRecordDto.location_id` 必填且不能为空；`location` 不再是新建 payload 的必填事实源。
- `EnvironmentRecordService.create()` 校验 `location_id` 存在、active、未删除，并由服务端写入 `location: workshopArea.name`。
- `EnvironmentRecordList.vue` 新建记录时必须从 `WorkshopArea` 下拉选择监测位置，不能手填位置文本。
- `npm test -- environment-record.service.spec.ts --runInBand` 通过。
- `cd server && npx prisma validate --schema src/prisma/schema.prisma` 通过。
- `npm run build -w client` 通过。
