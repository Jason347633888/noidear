# GAP-400 Document Version Display 设计

## 背景和现状

GAP-400 已验证：`Document.version` 当前是 Prisma `Decimal @default(1.0) @db.Decimal(3, 1)`。该字段进入前端时会被通用 `convertBigIntToNumber()` 按普通 object 递归处理，导致 Decimal 对象被转换成不可读结构，用户在受控文件详情或相关展示面看到的版本号可能不是业务可读的 `V1`、`V2`、`V3`。

当前 schema 已经有 `Document.versionNo Int @default(1)`，且修订草稿流程已按 `versionNo` 计算下一版：

- `server/src/prisma/schema.prisma`：`Document.version` 是 Decimal；`Document.versionNo` 已存在。
- `server/src/modules/document/document.service.ts`：`createRevisionDraft()` 使用 `versionNo` 排序并生成下一版，同时仍写入 legacy `version`。
- `client/src/views/documents/DocumentDetail.vue`：主详情版本号已有局部 `V${versionNo}` fallback，但类型仍暴露 `version: number`，历史版本表仍直接显示 `row.version`。
- `server/src/common/utils/bigint.util.ts`：只声明处理 BigInt，但会递归普通 object，未识别 Prisma Decimal。
- `docs/module-usage/03-document-control-and-record-forms.md`：GAP-400 建议使用 `versionNo` 展示为 `V${versionNo}`，Decimal `version` 过渡期保留。

因此本 GAP 的核心不是新增一套版本事实源，而是把 `Document.versionNo` 明确为受控文件当前版本展示的唯一权威字段，并把 `Document.version` 降级为 legacy 兼容字段，避免继续把 Decimal 对象直接暴露给前端展示。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：`Document` 是跨模块高复用共享实体，体系文件中心是受控文件事实源；下游模块不得重新维护平行文件清单。
- `docs/module-usage/03-document-control-and-record-forms.md`：受控文件事实源为 `Document`，允许展示字段包括 `versionNo`，并明确 `Document.version` 过渡期保留、后续用 `versionNo` 替代。
- `docs/module-usage/99-current-gap-register.md`：GAP-400 为 P1，影响文控文件识别和合规审计，整改建议为使用 `versionNo` 和 `Vn` 展示。
- `docs/module-usage/97-gap-triage.md`：GAP-400 当前为 `needs_spec`，需走 `brainstorming -> grill-with-docs -> writing-plans`。
- `server/src/prisma/schema.prisma`：`Document.version` 是 Decimal，`Document.versionNo` 是 Int；`DocumentVersion.version` 仍是 Decimal，对应 GAP-406。
- `server/src/modules/document/document.service.ts`：文档列表、详情、版本历史均经 `convertBigIntToNumber()` 返回；文件更新会把 `Document.version` 增加 0.1，修订草稿会递增 `versionNo`。
- `client/src/api/document-control.ts`：`DocumentControlDocument` 类型目前不声明 `versionNo` / `versionLabel`。
- `client/src/views/documents/DocumentDetail.vue`：详情页主版本号已有计算属性，但仍依赖 raw `version` fallback，版本历史操作 URL 仍使用历史 `DocumentVersion.version`。

## 业务边界

本 GAP 只收敛受控文件当前版本号的展示和 API 合同：

- `Document.versionNo` 是当前受控文件业务版本号的事实字段。
- 前端当前文件版本展示统一为 `V${versionNo}`，并优先使用后端返回的 `versionLabel`。
- 后端 API 在返回 `Document` 或文档列表时，必须提供稳定的 `versionNo` 与 `versionLabel`。
- `Document.version` 继续保留为 Decimal legacy 兼容字段，迁移阶段不得删除列，不得让旧的历史版本下载、预览、对比、回滚路由失效。
- 历史数据只做低风险 backfill：对 legacy `Document.version >= 2.0` 且 `versionNo <= 1` 的行，用 Decimal 主版本整数部分补齐 `versionNo`。
- 对 `DocumentVersion.version` 的独立语义升级、历史版本表 `V1/V2/V3` 大修和修订草稿完整 UX，留给依赖 GAP-406。

## 不做什么

- 不删除 `Document.version` 数据库列。
- 不把 `Document.version` 改成当前业务展示事实源。
- 不新增平行 `DocumentVersionNo`、`DocumentRevision` 或其他文件版本事实表。
- 不重写 `DocumentVersion.version` 的 Decimal 历史版本机制；GAP-406 负责该部分。
- 不修改文件内容、文件状态、审批状态、归档/作废状态或 Document 生命周期状态机。
- 不改变历史版本下载、预览、对比、回滚的 URL 参数语义；这些接口仍可接收 legacy Decimal 版本参数。
- 不触碰培训、内审、CAPA、追溯、RecordTemplate/Record 的业务事实源。

## 数据、接口和页面影响

### 数据影响

- `Document.versionNo` 保持 `Int @default(1)`，作为当前文件版本展示权威字段。
- `Document.version` 保持 `Decimal @default(1.0) @db.Decimal(3, 1)`，只作为 legacy 兼容字段。
- 增加 migration 脚本做幂等 backfill：
  - 对 `"documents"."versionNo" <= 1` 且 `"documents"."version" >= 2.0` 的旧行，更新 `"versionNo" = GREATEST(1, FLOOR("version")::int)`。
  - 不覆盖已大于 1 的 `versionNo`。
  - 不修改 `document_versions`。

### 接口影响

- `GET /documents` 每条文档返回：
  - `versionNo: number`
  - `versionLabel: string`，格式为 `V1`、`V2`、`V3`
  - legacy `version` 可继续存在，但不得作为前端展示来源。
- `GET /documents/:id` 返回同样的 `versionNo` 与 `versionLabel`。
- `POST /documents/:id/revisions` 返回的修订草稿必须带有递增后的 `versionNo` 与 `versionLabel`。
- 通用 `convertBigIntToNumber()` 必须保留 Prisma Decimal 的可 JSON 序列化值，不能把 Decimal 对象递归成乱码结构。
- 历史版本接口 `GET /documents/:id/versions` 仍返回 legacy `DocumentVersion.version`，本 GAP 不改变其查找参数。

### 页面影响

- `client/src/api/document-control.ts` 的 `DocumentControlDocument` 类型补充 `versionNo?: number` 与 `versionLabel?: string`。
- `DocumentDetail.vue` 的当前版本展示优先使用 `document.versionLabel`，再回退到 `versionNo`，最后才兼容 legacy `version`。
- `DocumentDetail.vue` 不再把 raw Decimal `version` 当作当前版本展示字段。
- `DocumentVersion` 历史版本表的深层语义升级不在本 GAP；如果执行 agent 在实现时发现历史版本展示也直接出现 Decimal 对象，只允许增加局部格式化保护，不得重构版本历史模型。

## 历史数据和迁移策略

涉及低风险历史兼容迁移，但不做业务推断迁移。

迁移策略：

1. 保留 `Document.version`，确保旧版本回滚、预览、下载、对比继续可通过 legacy Decimal 参数查找 `DocumentVersion.version`。
2. 对 `Document.versionNo` 做幂等 backfill，仅在 `versionNo <= 1` 且 legacy `version >= 2.0` 时更新。
3. 不根据 `1.1`、`1.2` 等小数版本推导新的 `V2`；小数版本代表旧文件上传历史，不等于体系文件大版本。
4. 不修改 `document_versions` 历史表；GAP-406 再决定是否为历史版本表引入 `versionNo` 或 `versionLabel`。
5. migration 必须可重复执行，不能依赖业务运行时服务。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-400 是 `needs_spec`。它影响 schema 字段使用、历史数据兼容、受控文件识别和文控审计展示，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐采用 `versionNo` 作为当前文件展示事实字段，后端提供 `versionLabel`，前端不再展示 raw Decimal；`Document.version` 保留兼容旧历史版本机制。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计继续复用 `Document` 作为受控文件事实源。
  - 不重复造主数据或事实源；不新增平行文件清单或版本表。
  - 不引入平行批次链路；本 GAP 不触碰批次、投料、库存或追溯主链。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；无直接影响。
  - 需要低风险历史数据 backfill，但不做业务推断迁移。
  - 不需要新的业务确认；issue 已指定使用 `versionNo/Vn` 展示和历史兼容。
  - 可拆成独立小 PR：只涉及 Document 版本展示合同、Decimal 序列化保护、migration backfill、前端详情展示和 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成；若执行时发现 `DocumentVersion.version` 必须 schema 变更才能完成当前版本展示，应停止回报，不得把 GAP-406 合并进来。

## 验收标准

- `Document.versionNo` 仍是受控文件当前版本展示的唯一权威字段。
- 后端文档列表和详情接口返回 `versionNo` 与 `versionLabel`。
- `versionLabel` 格式稳定为 `V${versionNo}`，例如 `V1`、`V2`、`V3`。
- `Document.version` Decimal 字段保留，旧历史版本下载、预览、对比、回滚接口继续可用。
- `convertBigIntToNumber()` 不再把 Prisma Decimal 对象递归成乱码结构。
- migration 对 legacy `Document.version >= 2.0` 且 `versionNo <= 1` 的行补齐整数版号，且不修改已正确的 `versionNo`。
- `DocumentDetail.vue` 当前版本展示不再依赖 raw `version`。
- GAP-406 仍保留为后续依赖项，不在本 PR 内执行。
- `(cd server && npx prisma validate --schema src/prisma/schema.prisma)` 通过。
- `(cd server && npm test -- document.service.spec.ts bigint.util.spec.ts --runInBand)` 通过。
- `npm run build:client` 通过。
- 当前仓库未配置 GAP-400 专用 E2E；执行 agent 不得伪造不存在的 GAP-400 专用 E2E 命令，如需浏览器验收，使用现有 `npm run test:e2e -w client -- --grep <真实用例>` 或人工打开文档详情页验证。
