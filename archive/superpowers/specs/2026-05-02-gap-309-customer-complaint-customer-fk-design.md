# GAP-309 CustomerComplaint Customer FK 设计

## 背景和现状

`CustomerComplaint` 是顾客投诉的独立业务表，处在 `CustomerComplaint -> ProductionBatch -> IngredientUsage(BatchMaterialUsage) -> MaterialLot -> Supplier` 的投诉调查与召回链路入口。投诉记录既要能从生产批次进入追溯链，也要能按客户维度聚合投诉趋势、复盘召回通知和统计 GRSS-YX-JL-06 等营销/品质分析。

当前 GAP-309 已验证：`CustomerComplaint.customer_name` 是自由文本，投诉没有 FK 关联客户主数据。同一客户可以被录入为多个拼写、简称或错别字，导致客户投诉统计、复诉分析和召回客户范围核对失真。

现有代码事实显示，当前系统没有独立 `Customer` Prisma model；客户、承运商、废弃物收运单位已经由 `ExternalParty` 模型承接，并用 `party_type` 区分 `customer | carrier | waste_collector`。因此本 GAP 不新增 `Customer` 表，而是让 `CustomerComplaint` 引用 `ExternalParty` 中 `party_type = 'customer'` 的记录。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：下游模块禁止重新维护客户、产品、批次等事实源；名称只用于展示，ID 才用于关联。
- 历史 Multica GAP 模块文档：GAP-309 标记为 P1、已验证，问题是 `CustomerComplaint.customer_name` 无 FK 关联 `Customer`/`ExternalParty` 主数据。
- 历史 Multica GAP 模块文档：GAP-309 建议整改为 `CustomerComplaint` 新增客户 FK，`customer_name` 保留展示用。
- `server/src/prisma/schema.prisma`：`CustomerComplaint.customer_name String`，无客户 FK；`ExternalParty` 已存在，字段包含 `party_type`、`name`、`status`、`deleted_at`。
- `server/src/modules/customer-complaint/customer-complaint.service.ts`：创建投诉时直接展开 DTO，未校验客户主数据。
- `server/src/modules/customer-complaint/dto/create-complaint.dto.ts`：只要求 `customer_name` 文本。
- `client/src/views/customer-complaint/CustomerComplaintList.vue`：新建投诉用普通文本框输入顾客名称。
- `client/src/api/external-party.ts`：已有 `/external-parties` 客户列表 API 适配器，可按 `party_type` 过滤。
- `server/src/modules/external-party/external-party.controller.ts`：当前接口虽然有 `JwtAuthGuard`，但没有读取 `req.user.companyId`，导致列表、详情、新增、更新、软删除都无法按登录租户传递 companyId。
- `server/src/modules/external-party/external-party.service.ts`：当前 `findAll/findOne/create` 的 `company_id` 写死为 `'1'`，`update/remove` 只按 `id` 写入，存在跨租户读取、创建到错误租户、更新和软删除其他租户外部方的缺口。GAP-309 页面选择器依赖 `/external-parties?party_type=customer`，所以此租户隔离必须纳入本 GAP 执行范围。

## 业务边界

本 GAP 只收敛顾客投诉的客户主数据关联：

- `CustomerComplaint` 新增 `customer_id`，FK 到 `ExternalParty.id`。
- `CustomerComplaint.customer_name` 保留为投诉创建时的客户名称快照，用于历史展示和报表稳定性。
- `/external-parties` 的列表、详情、新增、更新、软删除必须全部使用 JWT 中的 `companyId`，禁止任何接口继续硬编码 `company_id='1'` 或只按 `id` 更新。
- 新创建的正式投诉必须选择当前租户内 `ExternalParty.party_type = 'customer'` 且 `status = 'active'`、`deleted_at IS NULL` 的客户。
- `CustomerComplaintService` 必须再次按当前 `company_id` 校验客户存在，禁止跨公司客户被投诉引用；即使页面选择器被绕过，写入服务仍不能信任客户端。
- 创建投诉时，`customer_name` 由服务层从 `ExternalParty.name` 快照填充，客户端不得作为事实源提交客户名称。
- 历史投诉允许暂时保留空 `customer_id`；本 GAP 不自动猜测历史客户。

## 不做什么

- 不新增独立 `Customer` model；当前客户主数据事实源是 `ExternalParty(party_type='customer')`。
- 不把 `customer_name` 删除或改成唯一事实源；它只是快照。
- 不自动按 `customer_name` 模糊匹配历史投诉并回填 `customer_id`。
- 不实现客户合并、客户去重、客户别名或主数据清洗流程。
- 不修改 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主追溯链。
- 不修改或回退 GAP-310 已完成的生产批次必填 FK；投诉仍必须关联 `ProductionBatch`。
- 不实现 GAP-311 的 ProductRecall 独立状态机。
- 不实现投诉自动触发 CAPA；该联动属于 CAPA/不合格闭环的独立 GAP。

## 数据、接口和页面影响

### 数据影响

- `CustomerComplaint` 增加可空迁移字段 `customer_id String?`。
- `CustomerComplaint` 增加 `customer ExternalParty? @relation(fields: [customer_id], references: [id], onDelete: SetNull)`。
- `ExternalParty` 增加 `customer_complaints CustomerComplaint[]` 反向 relation。
- `CustomerComplaint` 增加 `@@index([customer_id])`。
- `customer_name` 保留并继续必填，由服务层用 `ExternalParty.name` 生成快照。
- 迁移只加 nullable FK 和索引，不改历史投诉数据。
- 迁移 preflight 只检查非空 `customer_id` 的 orphan 或非 customer 类型外部方；历史空 `customer_id` 不阻塞迁移。

### 接口影响

- `POST /customer-complaints` 请求必须包含非空 `customer_id`。
- `CreateComplaintDto.customer_name` 变为可选兼容字段；服务层忽略它作为事实源，只从 `ExternalParty.name` 写入快照。
- 如果 `customer_id` 缺失、不是当前公司客户、不是 `party_type='customer'`、已停用或已软删除，服务层返回 400 业务错误。
- `GET /customer-complaints` 返回结构保留 snake_case，并可包含 `customer_id`；是否 include `customer` 详细对象不作为本 GAP 的强制要求。
- `ExternalPartyController` 必须从 `AuthenticatedRequest` 读取 `req.user.companyId` 并传给 service。
- `ExternalPartyService.findAll/findOne/create/update/remove` 必须以传入的 `companyId` 为租户边界；`update/remove` 必须先用 `id + company_id + deleted_at IS NULL` 限定目标，不得继续只按 `id` 修改。
- `/external-parties?party_type=customer` 返回当前租户的客户主数据，不返回其他公司客户，也不返回软删除记录。
- 创建外部方时 `company_id` 由服务层从 JWT companyId 写入，客户端不得提交或覆盖。
- 对其他租户或已删除外部方执行详情、更新、软删除时必须返回 404 或等价 NotFound 业务错误。

### 页面影响

- `CustomerComplaintList.vue` 新建投诉中的“顾客名称”文本框替换为客户主数据选择器。
- 客户选择器调用 `externalPartyApi.getList('customer')`，只显示 `party_type='customer'` 的外部方。
- 表单提交 `customer_id`，不再提交用户手填的 `customer_name`。
- 列表仍展示 `customer_name` 快照；客户主数据名称后续变更不改写历史投诉展示。
- 未配置客户主数据时，页面应允许用户去外部方管理维护客户，但不在投诉页面临时创建平行客户事实源。
- 因 ExternalParty API 已在本 GAP 内改为 JWT 租户隔离，客户选择器不得使用前端硬编码公司 ID 或本地过滤替代服务端租户过滤。

## 历史数据和迁移策略

本 GAP 不自动迁移历史业务数据：

1. migration 增加 nullable `customer_id`、FK 和索引，历史 `customer_id IS NULL` 记录保留。
2. 如果库里已有非空 `customer_id`，migration 必须确认它指向存在的 `ExternalParty`，且 `party_type = 'customer'`。
3. 执行 agent 不得用客户名称、电话号码、地址或相似度自动回填历史投诉。
4. 历史数据回填必须另开数据清洗任务，由业务确认客户主数据映射后执行。
5. 新投诉从本 GAP 完成后必须通过服务层和页面选择客户主数据，避免继续产生空 `customer_id`。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-309 是 `needs_spec`，影响主数据事实源、schema、投诉统计和召回客户维度，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐采用 `ExternalParty(party_type='customer')` 作为客户主数据 FK；不新增 `Customer` 表。原因是现有代码和模块文档已经把客户/承运商/废弃物收运单位收敛到 `ExternalParty`，新建 `Customer` 会制造平行事实源。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化“名称只展示，ID 才关联”。
  - 不重复造主数据；复用已有 `ExternalParty`。
  - 不引入平行投诉事实源；投诉仍由 `CustomerComplaint` 承载。
  - 不引入平行批次链路，不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链。
  - 需要 schema migration，但不需要自动迁移历史投诉客户；历史空 FK 暂留。
  - 不需要新的业务确认；现有 `ExternalParty.party_type='customer'` 已是客户主数据承载口径。
  - reviewer blocker 已纳入：由于投诉页面客户选择器依赖 `/external-parties`，ExternalPartyController/Service 的 JWT companyId 租户隔离必须和投诉 FK 一起执行，不能另行留空。
  - 可拆成独立小 PR：ExternalParty 租户隔离、Prisma 关系、CustomerComplaint 创建合同、页面选择器和 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `CustomerComplaint.customer_id` FK 指向 `ExternalParty.id`，并有 `@@index([customer_id])`。
- Prisma schema 中 `ExternalParty` 有 `customer_complaints CustomerComplaint[]` 反向 relation。
- migration 不修改历史 `customer_name`，不自动回填历史 `customer_id`。
- `ExternalPartyController` 从 `req.user.companyId` 传递租户上下文，`ExternalPartyService` 不再出现 `company_id: '1'` 硬编码。
- `/external-parties` 列表、详情、新增、更新、软删除均按当前公司过滤；跨租户 id 不能被读、改、删。
- `POST /customer-complaints` 缺少 `customer_id` 时返回 400。
- `POST /customer-complaints` 传入非当前公司、非 customer、inactive 或 deleted 的 `ExternalParty` 时返回 400。
- 创建投诉成功时，`customer_name` 从 `ExternalParty.name` 快照写入。
- `CustomerComplaintList.vue` 新建投诉必须选择客户主数据，不再手填客户名称。
- `(cd server && npx prisma validate --schema src/prisma/schema.prisma)` 通过。
- `(cd server && npm test -- external-party.service.spec.ts --runInBand)` 通过。
- `(cd server && npm test -- customer-complaint.service.spec.ts --runInBand)` 通过。
- `npm run build:server` 通过。
- `npm run build:client` 通过。
