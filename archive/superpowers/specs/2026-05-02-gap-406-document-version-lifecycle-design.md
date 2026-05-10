# GAP-406 Document Version Lifecycle 设计

## 背景和现状

GAP-406 已验证：`DocumentVersion.version` 仍是 Prisma `Decimal @db.Decimal(3, 1)`，历史版本页面以 `v{{ row.version }}` 展示旧 Decimal 版本。用户无法稳定区分“受控文件大版本 V1/V2/V3”和“同一受控版本内的文件快照 1.0/1.1”，影响体系文件修订管理、审批发布和审计说明。

GAP-400 的边界是当前 `Document` 版本展示：用已存在的 `Document.versionNo` 作为当前受控文件版本事实字段，并展示为 `Vn`。GAP-406 不重复解决 GAP-400，而是在 GAP-400 已合并后，把文件修订生命周期和历史版本展示合同补齐：

- `Document` 行代表一个受控文件大版本节点，`versionNo` 是大版本号。
- `DocumentVersion` 行代表同一个 `Document` 大版本节点内的文件快照，用于预览、下载、对比和回滚兼容。
- 发起修订必须创建 `versionNo + 1` 的修订草稿。
- 新修订发布后，上一版有效文件必须被标记为 `superseded`，并通过 `superseded_by_id` 指向新版。
- 前端必须展示 `V1/V2/V3` 修订链，同时保留 legacy Decimal 快照版本作为技术兼容标识。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：`Document` 是跨模块高复用共享实体，不得由培训、内审或记录表单模块创建平行文件清单。
- 历史 Multica GAP 模块文档：治理记录链为 `Document -> DocumentVersion -> DocumentIssuance -> DocumentReadRequirement -> DocumentReadConfirmation`，受控文件事实源是 `Document`。
- `docs/superpowers/specs/2026-05-02-gap-400-document-version-display-design.md`：GAP-400 明确 `Document.versionNo` 是当前文件展示权威字段，`DocumentVersion.version` 的语义升级留给 GAP-406。
- `server/src/prisma/schema.prisma`：`Document` 已有 `versionNo Int @default(1)`、`revisionOfId`、`revisionStatus`、`superseded_by_id`；`DocumentVersion.version` 仍是 Decimal。
- `server/src/modules/document/document.service.ts`：`createRevisionDraft()` 已按最新 `versionNo` 生成下一版草稿，但返回值没有统一 `versionLabel`；`getVersionHistory()` 只返回 `DocumentVersion` 快照；`approve()` 直接把文件设为 effective，未处理修订发布后的旧版本 supersede。
- `server/src/modules/document/document-lifecycle.service.ts`：`publish()` 已能把同 lineage 的旧 effective 文件置为 `superseded`，但当前直接审批路径没有复用该生命周期逻辑。
- `client/src/api/document-management.ts`：历史版本类型只有 `version: number`，没有受控大版本 label 或快照 label。
- `client/src/views/documents/DocumentDetail.vue`：当前版本展示已局部使用 `Vn`，但历史版本表仍显示 `v{{ row.version }}`，发起修订后只跳转草稿，缺少用户可见的修订链上下文。

## 业务边界

本 GAP 只处理文控模块内的受控文件版本生命周期：

- `Document.versionNo` 继续作为受控文件大版本事实字段。
- `DocumentVersion.version` 继续作为同一 `Document` 内的 legacy 文件快照版本和 URL 查找参数。
- 修订链展示基于 `Document` 的 `lineage_key / revisionOfId / number` 和 `versionNo`，不是新建版本事实表。
- 发布新版时同 lineage 的旧 effective/approved 文件必须成为 `superseded`，形成可审计的大版本替代关系。
- 前端历史区域必须清晰区分“修订链 Vn”和“文件快照 1.x”。

## 不做什么

- 不删除或重命名 `Document.version`、`DocumentVersion.version`。
- 不新增 `DocumentRevision`、`DocumentVersionNo` 或其他平行版本事实源。
- 不改变历史版本下载、预览、对比、回滚 URL 的 Decimal 参数语义。
- 不改变培训、内审、CAPA、追溯或动态表单的事实源边界。
- 不迁移旧 `DocumentVersion.version` 为 `Vn`，因为它不是受控大版本事实字段。
- 不把 GAP-401 的发放台账外键、GAP-405/413 的内审归档边界合并进本 PR。

## 数据、接口和页面影响

### 数据影响

本 GAP 不需要 schema 变更或历史数据迁移。执行 agent 应复用现有字段：

- `Document.versionNo`：受控大版本号。
- `Document.revisionOfId`：修订草稿来源。
- `Document.revisionStatus`：`current / revision_draft / superseded`。
- `Document.superseded_by_id`：旧版指向新版。
- `DocumentVersion.version`：legacy 文件快照版本。

### 接口影响

- `GET /documents/:id/versions` 返回值应扩展为：
  - `document`：当前查看文件，带 `versionNo`、`versionLabel`。
  - `revisions`：同 lineage 的 `Document` 大版本链，每条带 `versionNo`、`versionLabel`、`status`、`revisionStatus`、`superseded_by_id`。
  - `versions`：原有 `DocumentVersion` 快照列表，保留 `version`，并增加 `snapshotVersionLabel` 和所属 `documentVersionLabel`。
- `POST /documents/:id/revisions` 返回修订草稿时必须带 `versionNo`、`versionLabel`，前端可直接展示 `V${versionNo}`。
- 直接审批发布路径必须在新版 approved/effective 后 supersede 同 lineage 的旧 effective/approved 版本。
- `GET /documents/:id/versions/:version/preview|download`、compare、rollback 继续按 legacy Decimal `version` 查找 `DocumentVersion`。

### 页面影响

- `DocumentDetail.vue` 当前版本展示优先使用 `versionLabel`。
- 历史区域拆分或明确标注：
  - 修订链：展示 `V1/V2/V3`、状态、是否当前有效、来源/替代关系。
  - 文件快照：展示 `documentVersionLabel` + `snapshotVersionLabel`，操作仍使用 legacy `version`。
- 发起修订成功后跳转草稿，页面可见草稿版本为 `Vn`，不再需要用户从 Decimal 版本推断。

## 历史数据和迁移策略

不涉及数据库 migration。

历史兼容策略：

1. 旧 `DocumentVersion.version` 保持 Decimal，用于查找历史快照和回滚。
2. 旧 `Document` 若缺少 `lineage_key`，查询修订链时可回退到 `number` 与 `revisionOfId` 关系。
3. 不根据 `DocumentVersion.version = 1.1/1.2` 推导大版本，因为这些值只表示同一大版本内文件快照。
4. 如执行时发现 GAP-400 的 `versionLabel` 合同尚未合并，必须先停止回报，不得在 GAP-406 中重复实现 GAP-400 全部范围。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-406 是 `needs_spec`。它影响文控审批闭环、版本生命周期和 API/页面合同，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 采用“`Document` 管大版本、`DocumentVersion` 管文件快照”的单事实源方案；不新增版本表，不把 Decimal 快照字段升级成大版本事实源。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；继续复用 `Document` 作为受控文件事实源。
  - 不重复造主数据或事实源；不新增平行文件清单或版本链表。
  - 不引入平行批次链路；本 GAP 不触碰物料批次、生产批次、投料或库存。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；无直接影响。
  - 不需要历史数据迁移；只做运行时展示和生命周期状态补齐。
  - 不需要新的业务确认；issue 已指定依赖 GAP-400 后补齐 `DocumentVersion` 生命周期管理。
  - 可拆成独立小 PR：只涉及 Document 版本历史合同、发布 supersede、前端版本历史展示和 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成；如果当前代码与 GAP-400 产物冲突，必须停止回报。

## 验收标准

- 发起修订草稿后，新草稿返回并展示 `V${versionNo}`，且 `versionNo = 当前 lineage 最大 versionNo + 1`。
- `GET /documents/:id/versions` 返回受控修订链 `revisions`，每条修订用 `V1/V2/V3` 展示。
- `DocumentVersion` 文件快照仍保留 legacy Decimal `version`，下载、预览、对比、回滚不破坏。
- 新修订发布或审批通过后，旧 effective/approved 文件被标记为 `superseded`，并写入 `superseded_by_id`。
- `DocumentDetail.vue` 不再把历史快照表的 raw Decimal 当作受控大版本展示。
- 不新增平行版本事实源，不修改非文控模块事实源。
- `(cd server && npm test -- document.service.spec.ts document-lifecycle.service.spec.ts --runInBand)` 通过。
- `(cd client && npm test -- DocumentDetail.spec.ts)` 通过。
- `npm run build:client` 通过。
