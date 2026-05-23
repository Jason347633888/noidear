# Team Log: simple-role-module-access

## 2026-05-24 Round 10 Repairs (head 432d878b)

### Implementer
- 完成 P1-R10-1: getEnabledModulesFor 改为 default-true 模型 — 从 DB 取所有行（不限 enabled=true），对无行模块默认 enabled；空表返回全部 9 个 moduleKey
- 完成 P1-R10-2: request.ts 添加 _silent 标志；MODULE_DISABLED 403 处理跳过 router.push 当 config._silent=true；todoApi.statistics() 标记 _silent:true
- 完成 P2-R10-3: /warehouse/requisitions 移至 warehouse 菜单组；/deviation-reports 和 /deviation-analytics 移至 quality_compliance 菜单组，与后端 @ModuleKey 对齐
- 完成 P2-R10-4: inbound.service create() 写入 operatorId: createdById；补充回归测试验证创建人可见性
- 完成 P2-R10-5: approval-definition PATCH 处理器在 body.status==='active' 时调用 assertStepsValid，防止绕过步骤验证
- 更新 module-access.service.spec.ts: 修正旧的 default-deny 断言，添加空表场景覆盖（P1-R10-1）
- 验证: tsc 0 errors, jest 1159/1159 passed (184 suites), client build 成功
- commit: 432d878b, 已推送至 origin feat/simple-role-module-access

implementer_status: standby_waiting_for_review_feedback

---

## 2026-05-24 Round 10 Review (head 0c9accc8)

### Reviewer
- R9 三项修复已验证 OK
  * P0 migration: 20260523100001_role_code_check_constraint/migration.sql 用 DO$$ ... RAISE EXCEPTION 替代 DELETE FROM roles；错误信息含可直接复制的诊断 SQL，能让 ops 立刻定位违规 role
  * P1(a) duplicate controller: server/src/modules/operation-log/permission-audit-log.controller.ts 已删，OperationLogModule 仅引 OperationLogController；GET /permission-audit-logs 唯一实现位于 server/src/modules/audit/permission-log-readonly.controller.ts，返回数组与 client/src/views/audit/AuditSearchPage.vue 期望对齐
  * P1(b) role e2e: server/test/role.e2e-spec.ts 改用 upsert 处理系统 role code（admin/leader/user），避免 baseline seed 唯一约束冲突

- Reviewer 自查阶段发现的潜在验证缺口：
  * role.e2e-spec.ts afterAll(line 181-188) 把 baseline 'user' 角色 name 回写为字符串 'user'（非 baseline 的 '普通用户'）、description 设为 null；测试中段(line 172-178) 软删除 user 角色后才在 afterAll 恢复 deletedAt:null。跨 spec 并发场景下 module-access.e2e-spec.ts findFirstOrThrow({code:'user', deletedAt:null}) 可能在恢复前的窗口内抛错。属 P3 测试基础设施风险，非本 PR 引入的新缺陷

### Codex adversarial-review 结论（commit 0c9accc8 vs master）
- **[P1] module-access service 与 listMatrix 行为不一致** — server/src/modules/module-access/module-access.service.ts:33-40 vs :43-53
  * `getEnabledModulesFor` 把空 module_access_configs 表当成"零模块开启"，leader/user 拿到空数组 → 所有 @ModuleKey 接口 403
  * `listMatrix()` 把缺失行 `?? true` 当成"已开启"，admin 在 UI 看到 leader/user 全绿
  * **结果**：admin UI 显示"已全开"，但实际 leader/user 全 403，且 admin 完全感知不到
  * 触发场景：仅执行 prisma migrate deploy，未跑 seed-baseline（seed-baseline.ts:253-261 才有 backfill）的部署环境（升级、staging、灾备恢复等）
  * 修复方向（任选其一）：迁移内 INSERT 默认行；service 在 getEnabledModulesFor 把缺失键视为 true 与 listMatrix 对齐；应用启动钩子 ensure backfill

- **[P1] request 拦截器对后台请求也强制跳转 /no-access** — client/src/api/request.ts:76-79
  * 凡是 status==403 且 code=='MODULE_DISABLED' 都 router.push('/no-access?module=...')，不区分 user-initiated vs background polling
  * 实证场景：work_execution 关闭时，Layout.vue:171 / Dashboard.vue 等触发 todoStore.refreshPendingCount() → /todos/statistics → 403 MODULE_DISABLED → 用户被强制从仓库/培训页面跳走
  * todoStore.ts 已 catch 403 静默 console，但拦截器先调 router.push 才 reject，前端 catch 无法阻止跳转
  * 修复方向：axios config 加 `meta.silent` 或 `meta.background`，拦截器只对非 silent 请求跳转；或前端 todoStore 调用前先按 moduleAccess store 判断 work_execution 是否开启

- **[P2] 菜单 moduleKey 过滤与后端 @ModuleKey 不匹配** — client/src/navigation/menu.ts:46
  * '生产执行' 分组 moduleKey='production_execution'，但子项 `/warehouse/requisitions` 后端是 @ModuleKey('warehouse')、`/deviation-reports` 是 @ModuleKey('quality_compliance')
  * production_execution 开+warehouse 关 → 菜单显示 /warehouse/requisitions，点击必 403
  * warehouse 开+production_execution 关 → 隐藏本可访问的领料入口
  * 修复：按真实后端模块给每个子菜单单独设 moduleKey，或重排子项到对应分组

- **[P2] inbound 创建未写 operatorId，导致创建人自己看不到刚建的单** — server/src/modules/warehouse/inbound.service.ts:34-50 vs :109-118
  * create() 只写 supplierId/status/remark，operatorId 留空直到 complete() 才设置
  * buildOwnershipWhere 对 user 用 `{operatorId: ownership.userId}` 过滤
  * 后果：user 创建的 draft/pending 单 operatorId 是 null → 自己 /warehouse/inbound 列表里看不到 → 完成不了流程；leader 也看不到团队成员未完成单据
  * 修复方向：create 时写入 operatorId 或新增 createdById 字段，ownership filter 改用真实创建人字段

- **[P2] PATCH /approval-definitions/:id 绕过 step 校验** — server/src/modules/unified-approval/approval-definition.controller.ts:56-59
  * activate 端点会 assertStepsValid，但 PATCH 直接 `data: body as any`，admin 可发 `{status:'active'}` 把 disabled_legacy 模板原地激活
  * 激活后启动审批 → resolver 见到 permission/小写 role 抛"不支持的审批分配类型"运行时错误
  * 修复：UpdateApprovalDefinitionDto 中 status 改为 active 或更新 steps 时复用 assertStepsValid

### 合并判断
存在 2 个 P1 + 3 个 P2 共 5 处由本 PR 引入的契约/行为缺陷，全部由 Codex adversarial-review 命中、Reviewer 已逐项验证文件/行号属实。Reviewer 初步"可放行"结论被反驳。NOT ready for closeout。

固定信号：review_blocked_needs_repair

---

## 2026-05-24 Round 8 Repairs

### Implementer
- 完成 P0：RecordTaskController 拆分为 RecordTaskAssignmentController + RecordTaskInstanceController（各有独立 base path）
- 完成 P0：ProductProcessChangeController 改为 @Controller('product-process-changes')，createDraft 路由统一到 product-process-changes 前缀，前端同步更新
- 完成 P0：registry-config.ts 添加 record-task-assignments、record-task-instances（work_execution）和 product-process-changes（product_rd）
- 完成 P1：role.e2e-spec.ts 移除所有 permission/rolePermission 引用，修正 role code 为合法枚举值
- 完成 P2：migration 20260523100001 添加 preflight DELETE 语句
- 验证：tsc 0 errors，jest 1157/1157 passed，client build 成功
- implementer_status: standby_waiting_for_review_feedback

## 2026-05-24 Round 7 Repairs

### Implementer
- 完成 P1-R7-1：coverage.e2e-spec.ts import 路径修正
- 完成 P1-R7-2：RecordTaskController / ProductProcessChangeController 补 @ModuleKey，移除 registry-config hack
- 完成 P2-R7-3：CustomerComplaintService.create 写 createdById，controller 传 req.user.id
- 完成 P2-R7-4：EquipmentDto 新增 responsiblePersonId，mapDtoToData 覆盖，测试补充
- 完成 P2-R7-5：plan.service 自动生成维保计划时传播 equipment.responsiblePersonId，测试补充
- commit: 4d344363
- 推送至 origin feat/simple-role-module-access

implementer_status: standby_waiting_for_review_feedback
