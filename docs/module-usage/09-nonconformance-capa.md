# 不合格品管理与 CAPA 模块

---
module_id: nonconformance-capa
business_chain:
  - CCPRecord(is_within_cl=false) / EnvironmentRecord / IncomingInspection -> NonConformance -> CorrectiveAction -> VerificationRecord
  - CustomerComplaint -> CorrectiveAction -> VerificationRecord
  - NonConformance -> ReworkRecord（disposition='rework' 时）
module_type:
  - 治理记录
  - 持续改进（CAPA 闭环）
source_of_truth:
  - server/src/prisma/schema.prisma: NonConformance, CorrectiveAction, VerificationRecord, ReworkRecord
  - server/src/modules/non-conformance/
  - server/src/modules/corrective-action/
  - server/src/modules/rework-record/
facts_or_projections:
  - NonConformance 使用 source_type + source_id 多态关联批次
  - CorrectiveAction 使用 trigger_type + trigger_id 多态关联不合格/投诉/审核
  - ReworkRecord 通过 nc_id 可选关联 NonConformance
downstream_consumers:
  - 追溯模块（不合格是批次放行的否决证据）
  - 管理评审（ManagementReview 汇总 CorrectiveAction 完成率）
  - 召回模块（不合格批次触发召回评估）
current_entrypoints:
  - /non-conformances → NonConformanceList.vue
  - /corrective-actions → CorrectiveActionList.vue
  - /corrective-actions/:id → CapaDetail.vue
  - /rework-records → ReworkRecordList.vue
last_verified_commit: 7bab98dc3ccd49e8e1d76b95b28a1b79207c483c
---

## 1. 模块定位

不合格品管理与 CAPA 是食品安全体系中"问题发现 → 处置 → 整改 → 验证"的治理闭环。在 `noidear` 中由三个独立模块协作实现：

| 模块 | 职责 | 代码路径 |
|---|---|---|
| `NonConformance`（不合格） | 记录不合格事实，关联来源批次，决定处置方式 | `server/src/modules/non-conformance/` |
| `CorrectiveAction`（CAPA） | 跟踪根因分析、整改措施、预防措施、关闭验证 | `server/src/modules/corrective-action/` |
| `ReworkRecord`（返工记录） | 记录不合格品返工过程，关联生产批次和不合格记录 | `server/src/modules/rework-record/` |

三个模块有关联路径但**均未自动联动**：NonConformance 处置为 `'rework'` 时，不会自动创建 ReworkRecord；CorrectiveAction 的 `trigger_id` 需要调用方手动填写，不会从 NonConformance 自动生成。

## 2. 使用角色

| 角色 | 使用目的 | 关键动作 |
|---|---|---|
| 制造部（ZZ）/ 质检组（ZJ） | 生产中发现不合格，登记不合格品 | 创建 NonConformance，填写 source_type + source_id |
| 品质部（PZ） | 评审不合格，决定处置方式 | Patch /non-conformances/:id/dispose |
| 品质部 / 全体 | 制定 CAPA，跟踪整改进度 | 创建 CorrectiveAction，添加验证记录 |
| 制造部 | 执行返工 | 创建 ReworkRecord，关联生产批次 |
| 管理层 | 跟踪 CAPA 趋势、超期率 | GET /corrective-actions/analytics/trends |

## 3. 当前入口

| 入口 | 页面 | 前端 API | 后端 API | 后端模块 |
|---|---|---|---|---|
| `/non-conformances` | `NonConformanceList.vue` | 无独立 API 文件 | `POST /non-conformances`, `GET /non-conformances`, `PATCH /non-conformances/:id/dispose` | `server/src/modules/non-conformance/` |
| `/corrective-actions` | `CorrectiveActionList.vue` | 无独立 API 文件 | `POST /corrective-actions`, `GET /corrective-actions`, `GET /corrective-actions/:id`, `PATCH /corrective-actions/:id`, `POST /corrective-actions/:id/close`, `GET /corrective-actions/analytics/trends` | `server/src/modules/corrective-action/` |
| `/corrective-actions/:id` | `CapaDetail.vue` | 无独立 API 文件 | `GET /corrective-actions/:id`, `POST /corrective-actions/:id/verifications`, `GET /corrective-actions/:id/verifications` | `server/src/modules/corrective-action/` |
| `/rework-records` | `ReworkRecordList.vue` | 无独立 API 文件 | `POST /rework-records`, `GET /rework-records`, `DELETE /rework-records/:id` | `server/src/modules/rework-record/` |

## 4. 当前实现

| 对象 | 当前实现 | 说明 |
|---|---|---|
| `NonConformance.source_type` | 枚举字符串 `'material_batch'｜'production_batch'｜'product'`，不是 FK | `已验证`: schema.prisma line 3034；create-nc.dto.ts |
| `NonConformance.source_id` | 字符串 ID，与 source_type 组合多态关联 | `已验证`: schema.prisma line 3035 |
| `NonConformance.nc_no` 生成 | 基于全量 `count()`，高并发下不安全（count+1 模式） | `已验证`: non-conformance.service.ts line 10–11 |
| `CorrectiveAction.trigger_type` | 枚举字符串 `'non_conformance'｜'customer_complaint'｜'internal_audit'｜'other'` | `已验证`: schema.prisma line 3057 |
| `CorrectiveAction.trigger_id` | 可选字符串，调用方手动填写触发来源 ID | `已验证`: schema.prisma line 3058；create-capa.dto.ts |
| `CorrectiveAction.capa_no` 生成 | 同样基于全量 `count()`，高并发下不安全 | `已验证`: corrective-action.service.ts line 10–11 |
| `CorrectiveAction` 审批 | 集成 `UnifiedApprovalModule`，验证审批通过时自动关闭 CAPA | `已验证`: corrective-action.module.ts onModuleInit 回调 |
| `VerificationRecord` | 独立服务，与 CAPA 通过 FK 关联，支持多次验证记录 | `已验证`: verification-record.service.ts |
| `CapaAnalyticsService` | 按状态统计、平均关闭天数、按 trigger_type 分类 | `已验证`: capa-analytics.service.ts |
| `ReworkRecord.nc_id` | 可选字段，允许返工不关联不合格记录 | `已验证`: schema.prisma line 3117；create-rework-record.dto.ts |
| `ReworkRecord.production_batch_id` | 强制 FK，必须关联生产批次 | `已验证`: schema.prisma line 3114–3115 |
| `company_id` | NonConformance / CorrectiveAction / VerificationRecord / CAPA analytics / ReworkRecord 已从 JWT `companyId` 写入与过滤 | `已验证`: GAP-304 spec/plan 与本轮实现 |

## 5. 正确业务流程

| 步骤 | 用户动作 | 系统结果 | 绑定模块 | 缺失后果 |
|---|---|---|---|---|
| 1 | 发现不合格，填写 NonConformance（选择 source_type 和 source_id） | NonConformance 创建，状态为 'open' | non-conformance | 无法追溯不合格来源批次 |
| 2 | 品质评审，决定处置方式（rework/destroy/concession/return） | NonConformance 状态变为 'dispositioned' | non-conformance | 无处置决策记录 |
| 3 | 若处置为 'rework'，手动创建 ReworkRecord 关联生产批次和 nc_id | ReworkRecord 记录返工过程 | rework-record | 返工过程无记录，无法证明质量合格 |
| 4 | 创建 CorrectiveAction（填写 trigger_type + trigger_id 关联不合格或投诉） | CAPA 创建，状态为 'open' | corrective-action | 根因分析和整改无记录 |
| 5 | 责任人实施整改，更新状态为 'implementing' | CAPA 状态流转 | corrective-action | - |
| 6 | 验证人添加 VerificationRecord | 验证记录归档 | corrective-action（VerificationRecord） | 无验证证据，无法关闭 CAPA |
| 7 | 审批通过，CAPA 自动关闭（UnifiedApproval 回调） | CAPA 状态变为 'closed'，verified_at 设置 | corrective-action | 无审批链，无法保证整改质量 |

## 6. 上下游绑定关系

- **上游**：`ProductionBatch`（NonConformance 通过 source_type='production_batch' + source_id 关联）；`MaterialBatch`（source_type='material_batch'）；`CustomerComplaint`（CorrectiveAction trigger_type='customer_complaint'）；`InternalAudit`（trigger_type='internal_audit'）
- **下游**：`ReworkRecord`（nc_id 可选关联）；追溯模块（批次放行证据）；管理评审汇总（CAPA 关闭率）
- **审批链**：`CorrectiveAction` 通过 `UnifiedApprovalModule` 集成审批流程，审批通过后自动关闭

## 7. 当前系统差距

| GAP 编号 | 当前问题 | 根因 | 影响后果 | 严重级别 | 验证状态 | 证据 |
|---|---|---|---|---|---|---|
| GAP-313 | `NonConformance.source_type + source_id` 为多态字符串关联，数据库层没有 FK 约束，source_id 可以指向不存在的 ID | schema 设计——多态关联无法用 Prisma 原生 FK | 不合格记录可能指向已删除的批次 ID，正确性无法保证；追溯时出现悬空引用 | P1 | 已验证 | schema.prisma line 3030–3050：无 FK 约束；仅 `source_type String` + `source_id String` |
| GAP-314 | `NonConformance.nc_no` 和 `CorrectiveAction.capa_no` 使用 `count()+1` 模式生成编号，高并发下会产生重复编号 | 服务层实现不安全 | 编号唯一性约束依赖 DB unique 约束报错，高并发下会产生异常 | P1 | 已验证 | non-conformance.service.ts line 10–11；corrective-action.service.ts line 10–11 |
| GAP-315 | `NonConformance.disposition='rework'` 时，系统不自动创建 `ReworkRecord`，依赖用户手动操作 | 功能缺失，无自动联动 | 不合格处置决策与返工执行之间存在断层，返工记录可能漏填 | P1 | 已验证（功能缺失） | non-conformance.service.ts：dispose 方法不创建 ReworkRecord；rework-record 模块无触发来源 |
| GAP-316 | `CorrectiveAction.trigger_id` 为可选字符串，创建 CAPA 时不验证触发来源（NonConformance/CustomerComplaint）是否存在 | 服务层无来源校验 | CAPA 与触发来源无法双向查询（NonConformance 无 CAPA 引用，CAPA 的 trigger_id 可以是无效 ID） | P1 | 已验证 | create-capa.dto.ts：trigger_id @IsOptional @IsString；corrective-action.service.ts：无来源校验 |
| GAP-317 | `NonConformance` 表没有 `@@index` 索引（除 unique nc_no），大批量查询时性能风险 | schema 缺索引 | 生产中不合格记录量大后，findAll 全量扫描性能下降 | P2 | 已验证 | schema.prisma line 3030–3050：无 @@index |
| GAP-318 | `ReworkRecord.nc_id` 为可选字段且无 FK 约束（仅字符串），返工与不合格记录关联不强制 | schema 设计 | 无法从 NonConformance 反查所有返工记录；返工记录可能指向不存在的 nc_id | P2 | 已验证 | schema.prisma line 3117：`nc_id String?`，无 @relation |
| GAP-304（复用） | 已完成：不合格、CAPA、验证记录、返工链路已从 JWT `companyId` 获取租户边界 | 见 07 文档 | 多租户基础隔离已补齐，下游自动联动可复用认证上下文 | P0 | 已验证 | non-conformance.service.ts, corrective-action.service.ts, verification-record.service.ts, rework-record.service.ts |

## 8. 整改建议

| GAP 编号 | 建议整改 | 依赖模块 | 是否需要新设计 | 建议 PR | 是否可并行 |
|---|---|---|---|---|---|
| GAP-313 | 在应用层对 source_id 校验其存在性（按 source_type 查对应表），添加 @@index([source_type, source_id]) | ProductionBatch, MaterialBatch | 否 | fix/nc-source-validation-and-index | 是 |
| GAP-314 | 将编号生成改为数据库序列或基于时间戳+随机数的安全方式 | 无 | 否 | fix/safe-sequence-number-generation | 是 |
| GAP-315 | dispose 处置方式为 'rework' 时，在事务中自动创建 ReworkRecord（或推送任务给返工模块） | rework-record | 是（需事务设计） | feat/nc-dispose-to-rework-auto-create | 否（依赖 GAP-5 修复） |
| GAP-316 | CorrectiveAction 创建时，按 trigger_type 校验 trigger_id 对应记录存在性；NonConformance 表新增 capa_ids 或反向查询接口 | non-conformance, customer-complaint | 否 | fix/capa-trigger-source-validation | 是 |
| GAP-317 | NonConformance 表添加 @@index([company_id, status])，@@index([company_id, source_type, source_id]) | 无 | 否 | fix/nc-add-indexes | 是 |
| GAP-318 | ReworkRecord.nc_id 改为真正 FK 关联 NonConformance，或明确业务语义后保留现有多态模式 | non-conformance | 需要业务确认 | fix/rework-nc-fk | 是 |

## 9. 证据索引

- `server/src/prisma/schema.prisma` line 3030–3050：NonConformance 模型（无 FK 约束，无 @@index）
- `server/src/prisma/schema.prisma` line 3051–3093：CorrectiveAction 模型
- `server/src/prisma/schema.prisma` line 3111–3165：ReworkRecord 模型（nc_id String?）
- `server/src/modules/non-conformance/non-conformance.service.ts` line 10–11：编号生成逻辑
- `server/src/modules/non-conformance/non-conformance.service.ts` line 31–40：dispose 方法（无 ReworkRecord 联动）
- `server/src/modules/corrective-action/corrective-action.service.ts` line 10–11：编号生成逻辑
- `server/src/modules/corrective-action/corrective-action.module.ts`：providers 包含 VerificationRecordService, CapaAnalyticsService；UnifiedApproval 回调注册
- `server/src/modules/corrective-action/dto/create-capa.dto.ts`：trigger_id 可选
- `client/src/router/index.ts` line 699–724：非合格品、CAPA 路由定义

## 10. 禁止重复实现与事实源边界

| 对象 | 当前事实源 | 允许展示字段 | 禁止新增的平行事实源 | 旧字段或旧模块处理 |
|---|---|---|---|---|
| 不合格记录 | `NonConformance` | nc_no, source_type, source_id, description, disposition, status | 禁止在 CCP 模块或检验模块中维护独立不合格事实 | - |
| CAPA 记录 | `CorrectiveAction` | capa_no, trigger_type, trigger_id, root_cause, status | 禁止在 NonConformance 中内嵌整改字段 | - |
| 返工记录 | `ReworkRecord` | production_batch_id, nc_id, rework_qty, quality_verdict | 禁止在 NonConformance 中冗余存储返工数量 | - |
| 批次来源 | `ProductionBatch`/`MaterialBatch`（主数据） | batch_number, product_name（展示） | NonConformance 禁止重新维护批次描述文本 | source_id 应始终为对应表的主键 |

## 11. 后续整改入口

| 优先级 | GAP 编号 | 推荐 PR | 前置依赖 | 可并行 | 验收命令 |
|---|---|---|---|---|---|
| P1 | GAP-313 | fix/nc-source-validation-and-index | 无 | 是 | npm run verify + 集成测试 |
| P1 | GAP-314 | fix/safe-sequence-number-generation | 无 | 是 | 并发压测编号唯一性 |
| P1 | GAP-315 | feat/nc-dispose-to-rework-auto-create | GAP-304 | 否 | E2E 不合格返工流程测试 |
| P1 | GAP-316 | fix/capa-trigger-source-validation | non-conformance, customer-complaint | 是 | 单元测试触发来源校验 |
| P2 | GAP-317 | fix/nc-add-indexes | 无 | 是 | npm run verify |
| P2 | GAP-318 | fix/rework-nc-fk | 业务确认 | 是 | npm run verify |
