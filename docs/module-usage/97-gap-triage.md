# GAP 分诊表

## 分诊规则

| 条件 | 处理方式 | 必须调用的 superpower |
|---|---|---|
| 影响事实源、schema、历史数据、追溯、库存、审批闭环 | 先用 brainstorming 写 spec 初稿，再用 grill-with-docs 校准，最后写 implementation plan | `brainstorming` -> `grill-with-docs` -> `writing-plans` |
| 影响跨模块业务链但不改 schema | 先用 brainstorming 写轻量 spec 或 decision note，再用 grill-with-docs 校准，最后写 implementation plan | `brainstorming` -> `grill-with-docs` -> `writing-plans` |
| 只改页面展示、入口、文案、低风险校验 | 可直接写小型 implementation plan | `writing-plans` |
| 证据不足 | 不排 PR，先补验证任务 | `grill-me` 或运行系统验证 |
| 需要业务判断 | 不排 PR，先业务确认 | `grill-with-docs` |

## GAP 分诊总表

| GAP | 严重级别 | 验证状态 | 是否确认 | 是否需要 spec | 是否需要 implementation plan | 推荐 superpower | spec 路径 | plan 路径 | 分诊结论 |
|---|---|---|---|---|---|---|---|---|---|
| GAP-001 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（ProcessInstance↔Product 绑定），与 GAP-006 合并 PR |
| GAP-002 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/migration spec（productId 非空约束 + 历史数据迁移） |
| GAP-003 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/migration spec（recipeId 非空约束），可与 GAP-002 合并 |
| GAP-004 | P3 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | 低优先级，写小型 implementation plan 后直接实现 |
| GAP-005 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 显示/校验类，写小型 implementation plan 后实现 |
| GAP-006 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 与 GAP-001 合并，先用 brainstorming 写 spec |
| GAP-007 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | 依赖 GAP-002 先完成；GAP-002 spec 完成后写 plan |
| GAP-008 | P2 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P2 schema 变更（area_id 非空），先用 brainstorming 写轻量 spec |
| GAP-100 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（IncomingInspection↔MaterialBatch 选择器） |
| GAP-101 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（批次手工创建门禁） |
| GAP-102 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/设计 spec（库存流水单一事实源决策） |
| GAP-103 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（Supplier 双状态门禁逻辑） |
| GAP-104 | P2 | 需要运行系统确认 | 否 | 否 | 否 | `grill-me` | | | 先运行系统确认菜单可见性，待确认后重新分诊 |
| GAP-105 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 多租户 companyId 修复，写小型 plan 直接实现 |
| GAP-106 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | 依赖 GAP-102；GAP-102 完成后写 plan |
| GAP-107 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 spec（物料平衡公式 scrap/return 纳入） |
| GAP-108 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 前端枚举同步，写小型 plan 直接实现 |
| GAP-109 | P3 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P3 配置化优化，低优先级写 plan 后实现 |
| GAP-110 | P2 | 需要运行系统确认 | 否 | 否 | 否 | `grill-me` | | | 先运行系统确认 FIFO 推荐现状，待确认后重新分诊 |
| GAP-200 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/migration spec（ShiftInstance shift_type_id FK） |
| GAP-201 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写业务设计 spec（配料归集多对多 vs 唯一约束决策） |
| GAP-202 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（BatchDetail 批次选择器） |
| GAP-203 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema spec（PackagingMaterialUsage FK 到 ProductionBatch） |
| GAP-204 | P2 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P2 schema FK，先用 brainstorming 写轻量 spec |
| GAP-205 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 历史数据清理，写 plan 直接执行 |
| GAP-206 | P2 | 需要运行系统确认 | 否 | 否 | 否 | `grill-me` | | | 先确认盘点校验是否已有实现，待确认后重新分诊 |
| GAP-207 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | 依赖 GAP-200；GAP-200 spec 完成后写 plan |
| GAP-300 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/migration spec（EnvironmentRecord batch FK） |
| GAP-301 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/业务 spec（FragileItemInspection batch FK，需确认哪些场景可无批次） |
| GAP-302 | P2 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P2 schema FK，先用 brainstorming 写轻量 spec |
| GAP-303 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（CCP missing 按产品过滤） |
| GAP-304 | P0 | 已验证 | 是 | 是 | 是 | - | docs/superpowers/specs/2026-05-01-gap-304-company-id-from-jwt-design.md | docs/superpowers/plans/2026-05-01-gap-304-company-id-from-jwt-implementation.md | 已执行：认证上下文补齐 companyId，CCP/不合格/CAPA/投诉/返工链路按 JWT companyId 写入与过滤；ProductionBatch 租户归属另行分诊 |
| GAP-305 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（CCP 偏差自动触发 NonConformance） |
| GAP-306 | P0 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P0 追溯服务未注册，先用 brainstorming 写 spec；GAP-307/308/309/310/311/312 依赖此 |
| GAP-307 | P0 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P0 追溯查询完整链路，依赖 GAP-306，先用 brainstorming 写 spec |
| GAP-308 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 依赖 GAP-306；先用 brainstorming 写跨模块 spec（快照持久化） |
| GAP-309 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema spec（CustomerComplaint customer FK） |
| GAP-310 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/业务 spec（投诉必须关联批次） |
| GAP-311 | P0 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P0 召回独立建模，先用 brainstorming 写架构 spec（状态机设计） |
| GAP-312 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 废弃端点清理，写 plan 直接执行 |
| GAP-313 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema spec（NC 多态关联校验+索引） |
| GAP-314 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（安全序列号生成机制） |
| GAP-315 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（NC dispose→ReworkRecord 自动创建） |
| GAP-316 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（CAPA 触发来源校验） |
| GAP-317 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 索引添加，写小型 plan 直接执行 |
| GAP-318 | P2 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P2 schema FK，先用 brainstorming 写轻量 spec（ReworkRecord→NC FK） |
| GAP-400 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/migration spec（Document version 字段类型变更） |
| GAP-401 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写 schema/migration spec（DocumentIssuance→Document FK） |
| GAP-402 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 入口/体验优化，写小型 plan 直接执行 |
| GAP-403 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 记录表单落地批量确认，写 plan 直接执行 |
| GAP-404 | P2 | 未验证（需运行系统确认） | 否 | 否 | 否 | `grill-me` | | | 先运行系统确认 updateFields 接口不一致问题，待确认后重新分诊 |
| GAP-405 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 document_type 标签，写小型 plan 直接执行 |
| GAP-406 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | 依赖 GAP-400；GAP-400 完成后写 plan |
| GAP-407 | P0 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P0 内审 API 双前缀，先用 brainstorming 写 spec（受影响路径全量梳理） |
| GAP-408 | P0 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P0 培训档案路径错误，先用 brainstorming 写 spec |
| GAP-409 | P0 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P0 培训项目状态端点缺失，先用 brainstorming 写 spec |
| GAP-410 | P1 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | 先用 brainstorming 写跨模块 spec（AuditFinding→CAPA 自动联动） |
| GAP-411 | P1 | 未验证（需要运行系统确认） | 否 | 否 | 否 | `grill-me` | | | 先运行系统确认路由冲突是否实际存在，待确认后重新分诊 |
| GAP-412 | P2 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P2 schema 重构（trainees String[] → 桥接表），先用 brainstorming 写 spec |
| GAP-413 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | 与 GAP-405 合并，写 plan 直接执行 |
| GAP-414 | P2 | 需要业务确认 | 否 | 否 | 否 | `grill-with-docs` | | | 先业务确认 ManagementReview 建模需求，待确认后重新分诊 |
| GAP-500 | P1 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P1 旧接口删除，写小型 plan 直接执行 |
| GAP-501 | P0 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P0 auth GET/POST 方法不匹配，先用 brainstorming 写 spec |
| GAP-502 | P1 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P1 架构决策文档，写 plan（废弃计划文档） |
| GAP-503 | P1 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P1 决策文档补充，写 plan（Workflow vs UnifiedApproval 决策树） |
| GAP-504 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 文档补充，写 plan 直接执行 |
| GAP-505 | P1 | 需要运行系统确认 | 否 | 否 | 否 | `grill-me` | | | 先运行系统确认 User.role String 使用残留范围，待确认后重新分诊 |
| GAP-506 | P2 | 未验证 | 否 | 否 | 否 | `grill-me` | | | 先运行系统验证权限审计日志端点，待确认后重新分诊 |
| GAP-507 | P1 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P1 前后端 HTTP 方法不匹配，写小型 plan 直接执行 |
| GAP-508 | P1 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P1 前后端路径不匹配，写小型 plan 直接执行 |
| GAP-509 | P1 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P1 后端端点缺失，写小型 plan 直接执行 |
| GAP-510 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 后端端点缺失，写小型 plan 直接执行 |
| GAP-511 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 路由去重，写小型 plan 直接执行 |
| GAP-512 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P2 权限模型文档补充，写 plan 直接执行 |
| GAP-600 | P0 | 已验证 | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P0 计量多租户隔离，依赖 GAP-304，先用 brainstorming 写 spec |
| GAP-601 | P1 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | P1 认证守卫缺失，写小型 plan 直接执行 |
| GAP-602 | P1 | 已验证 | 是 | 否 | 是 | `writing-plans` | | | 与 GAP-600 合并 PR；写 plan |
| GAP-603 | P2 | 已验证（schema 层面） | 是 | 是 | 是 | `brainstorming` -> `grill-with-docs` -> `writing-plans` | | | P2 schema FK，先用 brainstorming 写轻量 spec |
| GAP-604 | P2 | 需要运行系统确认 | 否 | 否 | 否 | `grill-with-docs` | | | 先业务确认检验记录是否需要关联量器，待确认后重新分诊 |
| GAP-605 | P2 | 已验证（模块定义无审批） | 是 | 否 | 是 | `writing-plans` | | | P2 校准记录审批，先业务确认后写 plan |
