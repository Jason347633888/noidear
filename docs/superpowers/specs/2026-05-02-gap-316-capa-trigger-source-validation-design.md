# GAP-316 CAPA Trigger Source Validation 设计

## 背景和现状

`CorrectiveAction` 是 CAPA 闭环的事实源，承接不合格、顾客投诉、内审发现项等上游问题，并向整改验证、管理评审、追溯证据链提供持续改进记录。当前模型用 `trigger_type + trigger_id` 表示触发来源：

- `trigger_type = 'non_conformance'`：来源应为同租户 `NonConformance.id`。
- `trigger_type = 'customer_complaint'`：来源应为同租户 `CustomerComplaint.id`。
- `trigger_type = 'internal_audit'`：来源应为 `AuditFinding.id`。
- `trigger_type = 'other'`：手工 CAPA，允许没有结构化来源。

GAP-316 已验证：创建 CAPA 时 `trigger_id` 是可选字符串，服务层直接展开 DTO 写入 `CorrectiveAction`，没有按 `trigger_type` 校验来源是否存在，也没有为上游来源提供稳定的 CAPA 反查入口。结果是 CAPA 可以指向不存在或跨公司来源，NonConformance / CustomerComplaint / AuditFinding 也无法通过 API 稳定查回相关 CAPA。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：CAPA/不合格/返工必须使用 `source_type + source_id`，不能只存备注描述；`CorrectiveAction` 是跨部门共享治理实体。
- `docs/module-usage/09-nonconformance-capa.md`：GAP-316 标记为 P1、已验证；当前问题是 `CorrectiveAction.trigger_id` 可选且无来源校验，影响 CAPA 与触发来源双向查询。
- `docs/module-usage/08-traceability-complaint-recall.md`：投诉触发 CAPA 时，`trigger_type='customer_complaint'` 且 `trigger_id` 应对应投诉 ID。
- `docs/module-usage/11-training-internal-audit.md`：内审发现项应进入 CAPA 闭环；当前 `CorrectiveAction.trigger_type` 已有 `internal_audit`，但无外键关联。
- `server/src/prisma/schema.prisma`：`CorrectiveAction.trigger_type String`，`trigger_id String?`；`NonConformance` 和 `CustomerComplaint` 均有 `company_id`；`AuditFinding` 当前无 `company_id`。
- `server/src/modules/corrective-action/dto/create-capa.dto.ts`：`trigger_type` 只是 `@IsString()`；`trigger_id` 是 `@IsOptional() @IsString()`。
- `server/src/modules/corrective-action/corrective-action.service.ts`：`create()` 只生成 `capa_no` 并直接 `prisma.correctiveAction.create()`，没有来源校验；`findAll()` 只支持 status 过滤。
- `server/src/modules/corrective-action/corrective-action.service.spec.ts`：当前只覆盖 company 编号和状态更新 ownership，不覆盖触发来源校验或反查过滤。
- `client/src/api/corrective-action.ts`：`getList(status?: string)` 只能传状态，不能按 `trigger_type + trigger_id` 查询。

## 业务边界

本 GAP 只做 CAPA 触发来源校验与反查能力，不改变 CAPA 的事实源位置：

- `CorrectiveAction` 仍是 CAPA 事实源。
- `NonConformance`、`CustomerComplaint`、`AuditFinding` 仍是各自来源事实源。
- 不新增 `CorrectiveAction` 到来源表的外键字段，不在 `NonConformance` 内嵌 CAPA 字段。
- 对 `non_conformance` 和 `customer_complaint`，创建 CAPA 必须提供 `trigger_id`，且来源必须属于当前 `companyId`。
- 对 `internal_audit`，创建 CAPA 必须提供 `trigger_id`，且 `AuditFinding` 必须存在。由于当前 `AuditFinding` 无 `company_id`，本 GAP 只做存在性校验；内审租户隔离不在本 GAP 内补建。
- 对 `other`，允许没有 `trigger_id`；如果调用方传入 `trigger_id`，只作为外部引用文本保存，不解析、不校验、不反查。
- `GET /corrective-actions` 扩展为支持 `trigger_type + trigger_id` 查询，作为来源记录反查 CAPA 的稳定接口。

## 不做什么

- 不修改 Prisma schema，不新增 migration，不添加数据库 FK 或反向字段。
- 不把 `CorrectiveAction.trigger_id` 改为非空字段；`other` 类型仍允许没有结构化来源。
- 不新增 `NonConformance.capa_ids`、`CustomerComplaint.capa_ids` 或 `AuditFinding.correctiveActionId` 字段。
- 不实现 GAP-315 的 NonConformance dispose 后自动创建 ReworkRecord。
- 不实现 GAP-410 的内审发现项自动触发 CAPA。
- 不实现 GAP-314 的 `capa_no` 安全序列号生成。
- 不实现 UI 页面上的“从来源跳转 CAPA”入口；本 GAP 只补后端查询合同和前端 API 适配。
- 不改变 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主追溯链。

## 数据、接口和页面影响

### 数据影响

- 不涉及 schema 变更。
- 不涉及数据库迁移。
- 既有 CAPA 历史记录不自动修复；历史上已经存在的无效 `trigger_id` 由后续数据治理任务处理。

### 接口影响

- `POST /corrective-actions`：
  - `trigger_type` 只能是 `non_conformance`、`customer_complaint`、`internal_audit`、`other`。
  - `trigger_type !== 'other'` 时，`trigger_id` 必须提供且不能为空。
  - `non_conformance` 来源按 `{ id: trigger_id, company_id: req.user.companyId }` 校验。
  - `customer_complaint` 来源按 `{ id: trigger_id, company_id: req.user.companyId }` 校验。
  - `internal_audit` 来源按 `AuditFinding.id` 校验存在。
  - 来源不存在或不属于当前公司时返回 400 业务错误，不写入 CAPA。
- `GET /corrective-actions`：
  - 保留现有 `status` 查询行为。
  - 新增可选查询参数 `trigger_type` 和 `trigger_id`。
  - 只提供其中一个反查参数时返回 400，要求二者同时出现，避免跨来源误匹配。
  - 同时提供时，按 `{ company_id, trigger_type, trigger_id }` 查询 CAPA 列表。

### 页面和前端 API 影响

- `client/src/api/corrective-action.ts` 增加 list filters 类型，支持 `status`、`trigger_type`、`trigger_id`。
- `correctiveActionApi.getList(status?: string)` 保持向后兼容，同时支持 `getList({ trigger_type, trigger_id })`。
- 增加 `getByTrigger(trigger_type, trigger_id)` 这类轻量封装，供 NonConformance、CustomerComplaint 或内审页面后续接入。
- 本 GAP 不要求修改 `CorrectiveActionList.vue` 页面交互。

## 历史数据和迁移策略

不涉及历史数据迁移。原因：

1. 本 GAP 不修改 schema，不创建 FK，不会让历史数据在 migration 阶段失败。
2. 运行时只阻断新建 CAPA 的无效来源，不追溯修改已存在记录。
3. 反查接口只返回当前有效匹配的 CAPA；历史无效 `trigger_id` 不会被自动清理或重写。
4. 如果执行 agent 在验证中发现历史无效 CAPA 数据，不得自动更改，应记录样例并回报主 agent，由后续数据治理任务处理。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-316 是 `needs_spec`，影响 CAPA 审批闭环、投诉/不合格/内审跨模块业务链和双向追踪能力，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐采用服务层来源校验 + DTO 枚举收紧 + `GET /corrective-actions?trigger_type&trigger_id` 反查接口。相较 schema FK，这能覆盖多态来源且不强行改动 `other` 类型；相较只做前端限制，能阻断 API 或脚本写入无效 CAPA。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；本设计强化 CAPA 必须通过结构化来源 ID 回到上游事实源。
  - 不重复造主数据或事实源；继续复用 `NonConformance`、`CustomerComplaint`、`AuditFinding` 和 `CorrectiveAction`。
  - 不引入平行批次链路；CAPA 只通过来源记录间接回到投诉、生产批次和不合格链路。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链；本 GAP 不触碰批次主链表。
  - 不需要迁移历史数据；只阻断新写入的无效 CAPA。
  - 不需要新的业务确认；issue 已指定 GAP-316 已验证且范围为 CAPA 触发来源校验与反查。
  - 可拆成独立小 PR：只涉及 corrective-action DTO/service/controller/spec 和前端 API 适配。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- `CreateCapaDto.trigger_type` 只接受 `non_conformance`、`customer_complaint`、`internal_audit`、`other`。
- `POST /corrective-actions` 在 `trigger_type !== 'other'` 且缺少 `trigger_id` 时返回 400。
- `POST /corrective-actions` 在 `non_conformance` 来源不存在或不属于当前公司时返回 400，且不创建 CAPA。
- `POST /corrective-actions` 在 `customer_complaint` 来源不存在或不属于当前公司时返回 400，且不创建 CAPA。
- `POST /corrective-actions` 在 `internal_audit` 来源不存在时返回 400，且不创建 CAPA。
- `POST /corrective-actions` 在 `other` 且没有 `trigger_id` 时仍可创建 CAPA。
- `GET /corrective-actions?trigger_type=non_conformance&trigger_id=<id>` 只返回当前公司下对应来源的 CAPA。
- `GET /corrective-actions` 只传 `trigger_type` 或只传 `trigger_id` 时返回 400。
- `correctiveActionApi.getList(status)` 旧调用方式保持可用。
- `correctiveActionApi.getByTrigger(triggerType, triggerId)` 能发出反查请求。
- `(cd server && npm test -- corrective-action.service.spec.ts --runInBand)` 通过。
- `npm run build:server` 通过。
- `npm run build:client` 通过。
