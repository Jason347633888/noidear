# GAP-410 Audit Finding to CAPA Linkage 设计

## 背景和现状

GAP-410 关注内部审核不符合项与 CAPA 闭环之间的断链。当前内审流程已经能从 `AuditPlan` 创建 `AuditFinding`，责任人提交整改证据后由内审员验证，通过后 `AuditFinding.status` 变为 `verified`，对应的 `audit_rectification` 待办也会完成。

问题是这个闭环只停留在内审模块内部。食品安全体系中，内部审核发现的不符合项应进入全厂 CAPA 事实源，供纠正措施执行、后续验证、管理评审统计和持续改进分析使用。当前 `CorrectiveAction.trigger_type` 已支持 `internal_audit`，但 `VerificationService.verifyRectification()` 没有自动创建或反查 CAPA，因此管理评审无法稳定汇总“内审触发的 CAPA 数量”。

## 当前代码事实源

- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：`CorrectiveAction` 是跨部门共享治理实体；CAPA/不合格/返工必须使用结构化来源，不能只存备注描述。
- 历史 Multica GAP 模块文档：内审事实源是 `AuditPlan` 和 `AuditFinding`；CAPA 事实源是 `CorrectiveAction`，禁止在内审模块内建立替代 CAPA 的平行闭环。
- `docs/superpowers/specs/2026-05-02-gap-316-capa-trigger-source-validation-design.md`：`CorrectiveAction.trigger_type + trigger_id` 是 CAPA 的多态来源合同；`internal_audit` 来源对应 `AuditFinding.id`。
- `server/src/prisma/schema.prisma`：`AuditFinding` 无 `correctiveActionId` 字段；`CorrectiveAction` 已有 `trigger_type String` 和 `trigger_id String?`。
- `server/src/modules/internal-audit/verification/verification.service.ts`：`verifyRectification()` 只更新 `AuditFinding.status = 'verified'`、写入 `verifiedBy/verifiedAt`、完成待办和写操作日志。
- `server/src/modules/corrective-action/corrective-action.service.ts`：`create()` 可创建 CAPA 并生成 `capa_no`，当前由 controller 传入 `companyId`。
- `server/src/modules/internal-audit/verification/verification.controller.ts`：认证用户对象当前只显式声明 `userId/username/role`，但 JWT strategy 已向 `req.user` 暴露 `companyId`。

## 业务边界

本 GAP 把“内审整改验证通过”定义为 CAPA 自动创建时点：

- 只有 `auditResult = '不符合'` 且验证通过到 `verified` 的 `AuditFinding` 会触发 CAPA。
- 现有 `issueType` 只有 `需要修改 / 缺失记录 / 文档缺失`，没有“重大不符合”或严重程度字段；因此本 GAP 不按严重程度筛选，所有完成验证的不符合项都进入 CAPA。
- 自动 CAPA 使用 `CorrectiveAction.trigger_type = 'internal_audit'` 和 `trigger_id = AuditFinding.id` 关联来源。
- 自动 CAPA 必须幂等：同一公司、同一 `AuditFinding.id` 已存在 CAPA 时，不再创建第二条。
- 自动 CAPA 的 `responsible_id` 取 `AuditFinding.assigneeId`；`due_date` 可沿用 `AuditFinding.dueDate`；`description` 由内审发现描述、问题类型和文档标题组成。
- `AuditFinding` 仍是内审发现事实源；`CorrectiveAction` 仍是 CAPA 事实源。

## 不做什么

- 不新增 `AuditFinding.correctiveActionId`，不新增 Prisma migration。
- 不把 CAPA 状态、原因分析、纠正措施内容写回 `AuditFinding`。
- 不新增“重大不符合”字段；如业务后续要区分 CAPA 触发等级，应另起 GAP 做 schema 和历史数据设计。
- 不改变 `CorrectiveAction` 的状态机和验证记录模型。
- 不实现 GAP-316 的 CAPA 来源校验与反查；本 GAP 依赖其合同，执行顺序应在 GAP-316 之后。
- 不改变 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 追溯主链。
- 不修改培训模块、内审报告归档或管理评审建模。

## 数据、接口和页面影响

### 数据影响

- 不涉及 schema 变更。
- 新增的运行时数据是 `corrective_actions` 表中的 CAPA 记录。
- 自动 CAPA 写入当前 JWT `companyId`，来源使用 `trigger_type = 'internal_audit'` 与 `trigger_id = AuditFinding.id`。
- 历史上已经 `verified` 的内审发现项不在本 GAP 中批量补 CAPA。

### 接口影响

- `POST /api/v1/audit/findings/:id/verify` 的成功路径会在验证通过后自动创建 CAPA。
- 响应主体仍返回 `AuditFinding`，不改变前端当前合同。
- 执行 agent 可在服务层通过操作日志记录 `auto_create_capa_from_audit_finding`，便于审计；不要求新增公开 API。
- CAPA 反查仍通过 GAP-316 的 `GET /corrective-actions?trigger_type=internal_audit&trigger_id=<findingId>` 合同完成。

### 页面影响

- 本 GAP 不要求新增页面控件。
- 后续页面可利用 GAP-316 的 CAPA 反查接口展示“已生成 CAPA”，但不属于本 PR。

## 历史数据和迁移策略

不涉及历史数据迁移。原因：

1. 本 GAP 不修改 schema，不会触发迁移失败或历史字段回填。
2. 自动 CAPA 只针对执行后新验证通过的内审不符合项。
3. 历史 `verified` 发现项是否需要补 CAPA 涉及管理口径和重复治理风险，需要单独数据治理任务。
4. 如果执行 agent 在测试环境发现同一 `AuditFinding` 已有多条 `internal_audit` CAPA，不得自动清理；应记录样例并停止回报。

## Superpower 与 grill-me 校准记录

- **任务类型判断：** GAP-410 是 `needs_spec`，影响跨模块 CAPA 闭环和管理评审统计，必须走 `brainstorming -> grill-with-docs -> writing-plans`。
- **brainstorming 结论：** 推荐复用 `CorrectiveAction.trigger_type + trigger_id`，在内审验证通过时幂等创建 CAPA；不新增 `AuditFinding.correctiveActionId`，避免和 GAP-316 的多态来源合同冲突。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；CAPA 仍是治理层共享事实源。
  - 不重复造主数据或事实源；内审事实仍在 `AuditFinding`，CAPA 事实仍在 `CorrectiveAction`。
  - 不引入平行批次链路；内审审核对象是 `Document`，不直接挂 `ProductionBatch` 或 `MaterialBatch`。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链。
  - 不需要迁移历史数据；历史补录另行治理。
  - 不需要新的业务确认；“所有已验证不符合项触发 CAPA”是当前 schema 下唯一可执行且不新增严重程度字段的规则。
  - 可拆成独立小 PR：只涉及内审验证服务、模块依赖、测试和必要的 API 类型透传。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成。

## 验收标准

- 验证通过 `auditResult = '不符合'` 的 `AuditFinding` 后，会创建一条 CAPA。
- 自动 CAPA 的 `trigger_type` 为 `internal_audit`，`trigger_id` 为对应 `AuditFinding.id`。
- 自动 CAPA 的 `responsible_id` 来自 `AuditFinding.assigneeId`。
- 自动 CAPA 的 `description` 能定位内审发现项的问题描述、问题类型和文档。
- 同一公司、同一 `AuditFinding.id` 重复验证或重复调用服务时不会创建重复 CAPA。
- `auditResult = '符合'` 的发现项不会触发 CAPA。
- 缺失 `companyId` 或 CAPA 创建失败时服务返回明确错误，不写入 CAPA，不把 `AuditFinding` 标记为 `verified`，也不完成 `audit_rectification` 待办。
- 既有响应仍返回 `AuditFinding`，前端验证页面无需改合同。
- `(cd server && npm test -- verification.service.spec.ts corrective-action.service.spec.ts --runInBand)` 通过。
- `npm run build:server` 通过。
