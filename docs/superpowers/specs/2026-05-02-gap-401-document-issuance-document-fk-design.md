# GAP-401 DocumentIssuance Document FK 设计

## 背景和现状

`DocumentIssuance` 是体系文件中心的文件发放/领用台账，承接 GRSS-XZ-JL-02、GRSS-XZ-JL-23、GRSS-XZ-JL-25 等文件收发表单。业务上它记录的是某份受控文件在某个时间被发放给谁、发放数量和用途；它本身不是受控文件事实源，必须回到 `Document` 才能判断发放的文件编号、名称、状态、版本和是否仍有效。

当前 GAP-401 已验证：`DocumentIssuance` 只存 `document_name` 和 `document_code` 文本，没有 `Document.id` 外键。现有新建页面也让用户手填文件名称和编号：

- `server/src/prisma/schema.prisma`：`DocumentIssuance` 只有 `document_name`、`document_code`、`template_id` 等字段，无 `document_id` / `documentId`，也无 relation。
- `server/src/modules/document-issuance/document-issuance.service.ts`：`create()` 直接展开 DTO，写入用户提交的文件名和编号。
- `server/src/modules/document-issuance/dto/create-document-issuance.dto.ts`：`document_name` 为必填，`document_code` 为可选，未要求受控文件 ID。
- `client/src/views/document-issuance/DocumentIssuanceList.vue`：新建记录弹窗用 `el-input` 手填“文件名称”和“文件编号”。
- `client/src/api/document-issuance.ts`：类型没有 `document_id` 字段。

这会导致发放台账与受控文件事实源断链。后续审计想确认“发放的是不是当前有效版本”时，只能依赖文本编号匹配，无法稳定关联 `Document.status`、`versionNo`、`doc_code`、`number` 或文件生命周期。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：`Document` 是高复用共享实体，所有下游模块不能重新维护平行文件清单；名称只展示，ID 才关联。
- `docs/module-usage/03-document-control-and-record-forms.md`：体系文件中心的事实源是 `Document`，文件发放记录是 `DocumentIssuance`；GAP-401 标记为 P1、已验证，问题是 `DocumentIssuance` 无 `documentId` 外键。
- `docs/module-usage/99-current-gap-register.md`：GAP-401 记录为 schema/migration + 历史数据迁移影响，验收命令要求迁移后 `document_issuances.document_id IS NULL` 数量为 0。
- `server/src/prisma/schema.prisma`：`Document` 已有 `number`、`doc_code`、`title`、`status`、`deletedAt`、`versionNo` 等文控事实字段；`DocumentIssuance` 当前没有 `@@map`，字段以 snake_case 存储。
- `server/src/modules/document/document.service.ts` 和 `client/src/api/document-control.ts`：已有受控文件列表查询能力，可复用于前端选择文件。

## 业务边界

本 GAP 只把文件发放台账接回受控文件事实源：

- `DocumentIssuance` 增加 `document_id`，数据库 FK 到 `Document.id`。
- `Document` 增加 `documentIssuances DocumentIssuance[]` 反向 relation。
- 新建发放记录时，API 必须提交 `document_id`，服务端校验该 `Document` 存在且未软删除。
- `document_name` 和 `document_code` 保留为发放时快照，但新记录的快照必须由服务端从 `Document.title` 与 `Document.doc_code ?? Document.number` 写入。
- 前端新建弹窗必须从受控文件列表选择文件，不再手填文件名称和编号。
- 历史发放记录必须在 migration 中通过现有 `document_code` 精确匹配 `Document.doc_code` 或 `Document.number` 回填；无法唯一匹配时 fail-fast。

代码字段采用当前 `DocumentIssuance` 模型的 snake_case 风格：业务文档可称 `documentId`，实际 Prisma 字段使用 `document_id`，避免在同一模型中混入 `company_id` 与 `documentId` 两种风格。

## 不做什么

- 不把 `DocumentIssuance` 合并进 `Document`；发放台账仍是独立治理记录。
- 不新增平行文件主数据、文件编号表或“发放文件”副本表。
- 不修改 `Document.version` / `DocumentVersion.version` 的展示问题；这属于 GAP-400 / GAP-406。
- 不处理培训需求、阅读确认、内审报告归档或 CAPA 联动。
- 不修改 `DocumentTrainingNeed`、`DocumentReadRequirement`、`BusinessDocumentLink` 的语义。
- 不用模糊匹配、最近创建时间、相似标题或人工猜测自动回填历史 `document_id`。
- 不修复 `DocumentIssuanceService` 当前 company_id 硬编码问题；这是多租户治理的独立 GAP。

## 数据、接口和页面影响

### 数据影响

- `DocumentIssuance` 新增 `document_id String`。
- `DocumentIssuance` 新增 `document Document @relation(fields: [document_id], references: [id], onDelete: Restrict)`。
- `Document` 新增 `documentIssuances DocumentIssuance[]`。
- `DocumentIssuance` 新增 `@@index([document_id])`。
- `document_name` / `document_code` 保留为发放时快照；它们不再是新建路径的事实源。

### 接口影响

- `POST /document-issuances` 请求必须包含非空 `document_id`。
- `POST /document-issuances` 可继续兼容 `document_name` / `document_code` 字段，但服务端必须忽略它们并从 `Document` 写快照。
- `DocumentIssuanceService.create()` 如果 `document_id` 缺失，返回 400“受控文件不能为空”。
- `DocumentIssuanceService.create()` 如果 `document_id` 不存在或已软删除，返回 400“受控文件不存在或已删除”。
- `GET /document-issuances` 返回每条记录的 `document_id`，并建议 include 精简 `document` 信息用于页面跳转或展示。

### 页面影响

- `DocumentIssuanceList.vue` 新建弹窗中的“文件名称/文件编号”改为“受控文件”选择器。
- 选择器复用 `documentControlApi.listDocuments()`，展示 `number` / `doc_code` 与 `title`，提交 `document_id`。
- 表单规则改为 `document_id` 必填。
- 列表继续展示 `document_name` 和 `document_code` 快照；可增加受控文件跳转但不是本 GAP 的必要条件。

## 历史数据和迁移策略

本 GAP 涉及历史数据迁移。migration 必须采用精确匹配 + fail-fast：

1. 先新增 nullable `document_id` 临时列。
2. 用 `DocumentIssuance.document_code` 精确匹配 `Document.doc_code` 或 `Document.number`，且只接受唯一候选。
3. 如果某条发放记录没有 `document_code`，或通过 `document_code` 匹配不到唯一未删除 `Document`，migration 必须抛错并停止。
4. 如果存在同一个发放记录匹配多个 `Document` 的情况，migration 必须抛错并停止。
5. 全部历史记录回填成功后，再将 `document_id` 设为 NOT NULL 并添加 FK。
6. 执行 agent 不得用标题模糊匹配、最近文件、默认文件、人工猜测或任何启发式规则自动回填。

如果 preflight 失败，执行 agent 必须停止并回报主 agent，由业务确认历史发放记录对应的受控文件后另开数据修复任务。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-401 是 `needs_spec`，影响 schema、历史数据和文控事实源，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐用非空 FK + 服务端快照写入 + 前端文件选择器。只做页面选择器无法阻止 API 写入文本断链；只做 nullable FK 又不能满足迁移后 `document_id IS NULL` 为 0 的验收。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化 `Document` 是文件事实源。
  - 不重复造主数据或事实源；继续复用 `Document`。
  - 不引入平行批次链路；本 GAP 不触碰追溯主链。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链。
  - 需要历史数据 migration；采用精确 `document_code` 匹配并 fail-fast。
  - 不需要新的业务确认；issue 已将 GAP-401 标记为已验证 P1。
  - 可拆成独立小 PR：只涉及 `DocumentIssuance` schema/migration、后端新建校验、前端选择器和 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- Prisma schema 中 `DocumentIssuance.document_id` 为非空 `String`。
- Prisma schema 中 `DocumentIssuance.document` FK 指向 `Document.id`，删除策略为 `Restrict`。
- Prisma schema 中 `Document` 有 `documentIssuances DocumentIssuance[]` 反向 relation。
- migration 在设置 NOT NULL / FK 前完成历史记录精确回填，并在缺失、orphan 或多候选时失败。
- `CreateDocumentIssuanceDto.document_id` 必填且不能为空。
- `DocumentIssuanceService.create()` 校验 `document_id` 存在且未软删除，并由服务端写入 `document_name` / `document_code` 快照。
- `DocumentIssuanceList.vue` 新建发放记录时必须选择受控文件，不能手填文件名称和编号。
- `client/src/api/document-issuance.ts` 类型包含必填创建字段 `document_id`。
- `(cd server && npx prisma validate --schema src/prisma/schema.prisma)` 通过。
- `(cd server && npm test -- document-issuance.service.spec.ts --runInBand)` 通过。
- `npm run build -w client` 通过。
