# BDD 行为规格说明书 — noidear

> 本文件基于源码全量阅读生成，覆盖 server 全部模块 + client E2E 场景。
> 语言：Gherkin（Given / When / Then）。
> 场景编号：`BDD-<模块缩写>-<三位数>`。

---

## 目录

1. [AUTH — 认证与授权](#auth)
2. [ROLE — 角色管理](#role)
3. [PERMISSION — 权限管理](#permission)
4. [DOCUMENT — 文档生命周期](#document)
5. [APPROVAL — 审批流程](#approval)
6. [TRAINING — 培训管理](#training)
7. [BATCH-TRACE — 批次与追溯](#batch-trace)
8. [CCP — 关键控制点](#ccp)
9. [DEVIATION — 偏差检测](#deviation)
10. [NON-CONFORMANCE — 不合格品](#non-conformance)
11. [PRODUCT-RECALL — 产品召回](#product-recall)
12. [ALERT — 告警规则](#alert)
13. [MONITORING — 系统监控](#monitoring)
14. [AUDIT — 审计日志](#audit)
15. [BACKUP — 备份管理](#backup)
16. [SEARCH — 全文搜索](#search)
17. [RECYCLE-BIN — 回收站](#recycle-bin)
18. [TASK / RECORD — 动态表单与任务](#task-record)

---

## AUTH — 认证与授权 {#auth}

```gherkin
Feature: 用户登录
  系统必须对所有访问者进行身份验证，
  并在账号异常时触发锁定保护机制。

  Background:
    Given 系统中已存在状态为 active 的用户 "zhangsan"，密码为 "Password@123"

  Scenario: BDD-AUTH-001 用户使用正确凭据登录成功
    When 用户提交用户名 "zhangsan"、密码 "Password@123" 发起登录
    Then 系统返回 HTTP 200
    And 响应体包含有效的 JWT token
    And 响应体包含 userId、username、roleCode、companyId 字段
    And 登录日志表中新增一条 action=login、status=success 的记录

  Scenario: BDD-AUTH-002 用户使用错误密码登录失败
    When 用户提交用户名 "zhangsan"、密码 "WrongPassword" 发起登录
    Then 系统返回 HTTP 401
    And 响应体包含错误提示
    And 登录日志表中新增一条 action=login_failed 的记录
    And 该账号的失败次数计数器加 1

  Scenario: BDD-AUTH-003 账号 5 分钟内连续失败 5 次后被锁定
    Given 用户 "zhangsan" 在 5 分钟内已连续失败 4 次
    When 用户再次提交错误密码
    Then 系统返回 HTTP 401
    And 响应体包含账号被锁定的提示
    And 该账号的 lockedUntil 被设置为当前时间 + 1 分钟

  Scenario: BDD-AUTH-004 被锁定账号在锁定期到期后可以重新登录
    Given 用户 "zhangsan" 的 lockedUntil 已过期
    When 用户提交正确凭据
    Then 系统返回 HTTP 200
    And 失败次数计数器被重置为 0

  Scenario: BDD-AUTH-005 状态为 disabled 的账号无法登录
    Given 用户 "zhangsan" 的状态为 disabled
    When 用户提交正确凭据
    Then 系统返回 HTTP 401
    And 错误消息表明账号已被禁用

  Scenario: BDD-AUTH-006 无角色的账号登录被拒绝
    Given 用户 "zhangsan" 未分配任何角色
    When 用户提交正确凭据
    Then 系统返回 HTTP 401
    And 错误消息表明账号未分配角色

  Scenario: BDD-AUTH-007 JWT 缺少 companyId 时鉴权失败
    Given 请求携带的 JWT payload 中不含 companyId 字段
    When 请求任意受保护接口
    Then 系统返回 HTTP 401

  Scenario: BDD-AUTH-008 用户修改密码成功
    Given 用户 "zhangsan" 已登录
    When 用户提交旧密码 "Password@123" 和新密码 "NewPass@456"
    Then 系统返回 HTTP 200
    And 使用新密码可以成功登录
    And 使用旧密码登录返回 HTTP 401

  Scenario: BDD-AUTH-009 修改密码时旧密码错误被拒绝
    Given 用户 "zhangsan" 已登录
    When 用户提交错误的旧密码
    Then 系统返回 HTTP 400 或 HTTP 401
    And 密码未被修改

  Scenario: BDD-AUTH-010 登出时记录日志
    Given 用户 "zhangsan" 已登录
    When 用户调用登出接口
    Then 系统返回 HTTP 200
    And 登录日志表中新增一条 action=logout 的记录
```

```gherkin
Feature: SSO 单点登录
  系统支持通过外部 SSO 提供者（LDAP / SAML）进行单点登录。

  Scenario: BDD-AUTH-020 SSO 登录跳转
    Given SSO 已在系统配置中启用
    When 用户访问 SSO 登录入口
    Then 系统将用户重定向到 SSO 提供者的认证页面

  Scenario: BDD-AUTH-021 SSO 回调成功，系统颁发 JWT
    Given SSO 提供者回调携带有效的授权码
    When 系统处理回调
    Then 系统向用户颁发 JWT token
    And 用户被标记为 SSO 登录来源

  Scenario: BDD-AUTH-022 SSO 回调携带无效授权码时拒绝
    Given SSO 提供者回调携带无效的授权码
    When 系统处理回调
    Then 系统返回 HTTP 401
```

---

## ROLE — 角色管理 {#role}

```gherkin
Feature: 角色 CRUD
  管理员可以创建、查询、修改和删除系统角色。
  系统内置角色（admin、leader、user）受到保护。

  Background:
    Given 当前用户为系统管理员

  Scenario: BDD-ROLE-001 创建新角色成功
    When 管理员提交 code="quality_manager"、name="质量经理" 创建角色
    Then 系统返回 HTTP 201
    And 数据库中新增该角色记录
    And deletedAt 为 null

  Scenario: BDD-ROLE-002 角色 code 重复时创建失败
    Given 已存在 code="quality_manager" 的角色
    When 管理员再次提交相同 code 创建角色
    Then 系统返回 HTTP 400 或 HTTP 409
    And 错误消息说明 code 已存在

  Scenario: BDD-ROLE-003 查询角色列表支持关键字过滤
    Given 系统中存在多个角色
    When 管理员使用关键字 "质量" 查询角色列表
    Then 返回结果仅包含名称或 code 含 "质量" 的角色

  Scenario: BDD-ROLE-004 查询角色详情包含权限列表
    Given 已存在角色 "quality_manager" 并分配了 3 个权限
    When 管理员查询该角色详情
    Then 响应体包含 permissions 数组，共 3 条

  Scenario: BDD-ROLE-005 为角色分配权限
    Given 已存在角色 "quality_manager" 和权限 ID 列表 [1, 2, 3]
    When 管理员调用分配权限接口提交 permissionIds=[1,2,3]
    Then 系统返回 HTTP 200
    And 该角色的权限列表包含指定的 3 个权限

  Scenario: BDD-ROLE-006 删除未被使用的角色成功
    Given 已存在角色 "temp_role"，且没有用户关联该角色
    When 管理员删除该角色
    Then 系统返回 HTTP 200
    And 该角色的 deletedAt 被设置为当前时间

  Scenario: BDD-ROLE-007 删除被用户关联的角色时被拒绝
    Given 已存在角色 "quality_manager"，且有用户关联该角色
    When 管理员尝试删除该角色
    Then 系统返回 HTTP 400 或 HTTP 409
    And 错误消息说明该角色正在被使用

  Scenario: BDD-ROLE-008 系统内置角色 admin 不可删除
    When 管理员尝试删除 code="admin" 的内置角色
    Then 系统返回 HTTP 403 或 HTTP 400
    And admin 角色仍然存在于数据库中
```

---

## PERMISSION — 权限管理 {#permission}

```gherkin
Feature: 权限定义与分配
  管理员管理系统权限，并通过角色-权限关联进行授权。

  Background:
    Given 当前用户为系统管理员

  Scenario: BDD-PERM-001 创建新权限成功
    When 管理员提交 resource="document"、action="create" 创建权限
    Then 系统返回 HTTP 201
    And 数据库中新增 uniqueKey="document:create" 的权限

  Scenario: BDD-PERM-002 resource:action 组合重复时创建失败
    Given 已存在 uniqueKey="document:create" 的权限
    When 管理员再次提交相同的 resource 和 action
    Then 系统返回 HTTP 400 或 HTTP 409

  Scenario: BDD-PERM-003 按 resource 过滤权限列表
    Given 系统中存在 document:create、document:delete、training:create 等权限
    When 管理员按 resource="document" 查询
    Then 返回结果仅包含 document 相关权限

  Scenario: BDD-PERM-004 无对应权限的用户访问受保护接口被拒绝
    Given 用户 "zhangsan" 的角色不含 "document:delete" 权限
    When zhangsan 尝试调用删除文档接口
    Then 系统返回 HTTP 403

  Scenario: BDD-PERM-005 细粒度权限控制—按部门隔离
    Given 用户 "zhangsan" 所属部门 A，仅有部门 A 的数据访问权限
    When zhangsan 尝试访问部门 B 的文档
    Then 系统返回 HTTP 403 或返回空列表
```

---

## DOCUMENT — 文档生命周期 {#document}

```gherkin
Feature: 文档创建与编辑
  质量人员创建并维护文档，文档在提交审批前允许自由编辑。

  Background:
    Given 当前用户已登录，具有 document:create 权限

  Scenario: BDD-DOC-001 创建一级文档成功
    When 用户提交 title="质量管理手册"、level=1、上传附件文件
    Then 系统返回 HTTP 201
    And 文档状态为 draft
    And 文档编号按规则自动生成（格式如 SC-2024-0001）
    And 文件被上传至对象存储

  Scenario: BDD-DOC-002 同一级别内标题重复时创建失败
    Given level=1 下已存在 title="质量管理手册"
    When 用户再次提交 level=1、title="质量管理手册"
    Then 系统返回 HTTP 400 或 HTTP 409
    And 错误消息说明标题已存在

  Scenario: BDD-DOC-003 draft 状态文档可以被更新
    Given 文档 D001 状态为 draft
    When 用户更新 D001 的标题为 "质量管理手册 v2"
    Then 系统返回 HTTP 200
    And 文档标题被更新

  Scenario: BDD-DOC-004 非 draft 状态文档不可直接编辑
    Given 文档 D001 状态为 effective
    When 用户尝试直接修改 D001 的内容
    Then 系统返回 HTTP 400 或 HTTP 403
    And 文档内容不变

  Scenario: BDD-DOC-005 软删除文档进入回收站
    Given 文档 D001 状态为 draft
    When 用户删除 D001
    Then 系统返回 HTTP 200
    And 文档的 deletedAt 被设置为当前时间
    And 文档不出现在正常列表查询结果中
    And 文档出现在回收站列表中

  Scenario: BDD-DOC-006 文档列表按 level 过滤
    Given 系统中存在 level=1、level=2、level=3 的文档各若干
    When 用户查询 level=2 的文档列表
    Then 返回结果仅包含 level=2 的文档

  Scenario: BDD-DOC-007 已删除文档不出现在搜索结果中
    Given 文档 D001 已被软删除
    When 用户搜索 D001 的标题关键词
    Then D001 不在搜索结果中
```

```gherkin
Feature: 文档审阅期与到期提醒

  Scenario: BDD-DOC-010 超过 review_due_date 的文档在控制中心中标记提示
    Given 文档 D001 的 review_due_date 早于今天
    When 管理员访问文档控制中心
    Then D001 被标记为"需复审"状态
    And 管理员可以向负责人发送提醒通知

  Scenario: BDD-DOC-011 文档确认阅读
    Given 文档 D001 状态为 effective，用户 U001 尚未确认阅读
    When U001 调用确认阅读接口
    Then 系统记录 U001 对 D001 的阅读确认时间
    And 再次查询时 U001 的阅读状态为 confirmed
```

```gherkin
Feature: 文档版本控制与超版

  Scenario: BDD-DOC-020 发布新版本时旧版本被自动超版
    Given 文档 D001 已有版本 v1（状态 effective）
    And 用户基于 D001 创建了新草稿 D001-v2 并通过审批
    When 系统执行发布操作
    Then D001-v2 状态变为 effective
    And D001-v1 状态变为 superseded
    And D001-v1 的 superseded_by_id 指向 D001-v2

  Scenario: BDD-DOC-021 文档可被归档
    Given 文档 D001 状态为 effective 或 superseded
    When 管理员执行归档操作
    Then 系统返回 HTTP 200
    And D001 的 revisionStatus 变为 archived

  Scenario: BDD-DOC-022 归档文档不可再被提交审批
    Given 文档 D001 的 revisionStatus 为 archived
    When 用户尝试提交 D001 进入审批
    Then 系统返回 HTTP 400 或 HTTP 403
```

---

## APPROVAL — 审批流程 {#approval}

```gherkin
Feature: 会签（并行审批）
  多名审批人同时审批，全部通过文档才生效，任一驳回则流程终止。

  Background:
    Given 文档 D001 状态为 draft
    And 审批人 A1、A2、A3 均已存在

  Scenario: BDD-APPR-001 创建会签审批流
    When 发起人为 D001 创建会签审批，指定审批人 [A1, A2, A3]
    Then 系统生成 3 条状态为 pending 的 Approval 记录
    And 文档状态变为 pending
    And 3 位审批人均收到待审批通知

  Scenario: BDD-APPR-002 全部审批人通过后文档生效
    Given D001 的会签审批链已创建，A1、A2 已通过
    When A3 通过审批
    Then 系统返回 HTTP 200
    And 文档 D001 状态变为 effective
    And approvedAt 被设置为当前时间
    And 发起人收到审批通过通知

  Scenario: BDD-APPR-003 任一审批人驳回时全部取消
    Given D001 的会签审批链已创建，A1 已通过
    When A2 驳回审批，并填写驳回原因 "格式不符合要求，请修改后重新提交"
    Then 系统返回 HTTP 200
    And A3 的 Approval 状态变为 cancelled
    And 文档 D001 状态变回 draft
    And 发起人收到审批驳回通知

  Scenario: BDD-APPR-004 驳回原因少于 10 个字符时被拒绝
    When 审批人 A1 提交驳回，rejectionReason="太差了"（不足 10 字符）
    Then 系统返回 HTTP 400
    And 错误消息说明驳回原因长度不足

  Scenario: BDD-APPR-005 驳回原因超过 500 个字符时被拒绝
    When 审批人 A1 提交驳回，rejectionReason 超过 500 字符
    Then 系统返回 HTTP 400

  Scenario: BDD-APPR-006 非指定审批人无权审批
    Given D001 的会签审批链中不包含用户 U999
    When U999 尝试通过 D001 的审批
    Then 系统返回 HTTP 403
```

```gherkin
Feature: 顺签（顺序审批）
  审批人按顺序依次审批，每一级通过后才激活下一级。

  Background:
    Given 文档 D002 状态为 draft
    And 顺签链：第1级 A1 → 第2级 A2 → 第3级 A3

  Scenario: BDD-APPR-010 创建顺签审批流
    When 发起人为 D002 创建顺签审批
    Then 第1级 A1 的 Approval 状态为 pending
    And 第2级 A2 的 Approval 状态为 waiting
    And 第3级 A3 的 Approval 状态为 waiting
    And 文档状态变为 pending

  Scenario: BDD-APPR-011 第1级通过后第2级激活
    Given D002 顺签链已创建，A1 的 Approval 状态为 pending
    When A1 通过审批
    Then A1 的 Approval 状态变为 approved
    And A2 的 Approval 状态从 waiting 变为 pending
    And A2 收到待审批通知

  Scenario: BDD-APPR-012 第1级驳回后后续全部取消
    When A1 驳回，填写驳回原因 "请重新核查数据再提交审批"
    Then A2 的 Approval 状态变为 cancelled
    And A3 的 Approval 状态变为 cancelled
    And 文档 D002 状态变回 draft

  Scenario: BDD-APPR-013 全部顺签通过后文档生效
    Given A1、A2 已顺序通过审批
    When A3 通过审批
    Then 文档 D002 状态变为 effective

  Scenario: BDD-APPR-014 待审批列表同时包含旧 Approval 和统一审批记录
    Given 系统同时存在旧版 Approval 记录和统一审批引擎记录
    When 审批人 A1 查询待审批列表
    Then 两类记录均出现在列表中，无重复或遗漏
```

---

## TRAINING — 培训管理 {#training}

```gherkin
Feature: 年度培训计划
  HR 或培训管理员创建年度培训计划，每年只能有一份。

  Scenario: BDD-TRN-001 创建年度培训计划成功
    Given 2025 年度尚无培训计划
    When 管理员提交 year=2025、title="2025年食品安全培训计划"
    Then 系统返回 HTTP 201
    And 计划状态为 draft

  Scenario: BDD-TRN-002 同年度第二次创建被拒绝
    Given 已存在 year=2025 的培训计划
    When 管理员再次提交 year=2025 的计划
    Then 系统返回 HTTP 400 或 HTTP 409
    And 错误消息说明该年度计划已存在

  Scenario: BDD-TRN-003 提交审批后计划状态变为 pending
    Given 培训计划 P001 状态为 draft
    When 管理员提交 P001 进入审批
    Then P001 状态变为 pending
    And 审批记录被创建

  Scenario: BDD-TRN-004 审批通过后计划状态变为 approved
    Given 培训计划 P001 正在审批中
    When 管理员审批通过
    Then P001 状态变为 approved

  Scenario: BDD-TRN-005 只有 draft 状态的计划可被删除
    Given 培训计划 P001 状态为 approved
    When 管理员尝试删除 P001
    Then 系统返回 HTTP 400 或 HTTP 403
```

```gherkin
Feature: 培训项目管理

  Scenario: BDD-TRN-010 在已审批的计划下创建培训项目
    Given 培训计划 P001 状态为 approved
    When 管理员创建培训项目：title="清洁消毒培训"、department="生产部"、quarter=2、scheduledDate="2025-06-01"
    Then 系统返回 HTTP 201
    And 项目状态为 draft

  Scenario: BDD-TRN-011 发布培训项目
    Given 培训项目 PR001 状态为 draft，已添加题目
    When 管理员发布 PR001
    Then PR001 状态变为 published
    And 受训人员收到培训通知

  Scenario: BDD-TRN-012 已发布项目不可直接修改，需重新走审批
    Given 培训项目 PR001 状态为 published
    When 管理员尝试直接修改 PR001 的标题
    Then 系统返回 HTTP 400 或 HTTP 403

  Scenario: BDD-TRN-013 取消培训项目
    Given 培训项目 PR001 状态为 published
    When 管理员取消 PR001
    Then PR001 状态变为 cancelled
    And 相关任务提醒被撤销
```

```gherkin
Feature: 考试与自动评分

  Background:
    Given 培训项目 PR001 已发布，最大考试次数 maxAttempts=2，及格分 passingScore=80
    And PR001 共有 10 道题，每题 10 分
    And 用户 U001 是 PR001 的受训人员

  Scenario: BDD-TRN-020 受训人员开始考试
    When U001 调用开始考试接口
    Then 系统返回 HTTP 201
    And 生成一条 status=in_progress 的 ExamRecord
    And 返回题目列表（不含正确答案）

  Scenario: BDD-TRN-021 提交答案后系统自动评分
    Given U001 的 ExamRecord 状态为 in_progress
    When U001 提交 10 道题的答案（8 道正确，2 道错误）
    Then 系统返回 HTTP 200
    And score=80
    And 因 80 >= passingScore，ExamRecord 状态变为 passed

  Scenario: BDD-TRN-022 低于及格分时考试状态为 failed
    When U001 提交 10 道题的答案（7 道正确，3 道错误）
    Then score=70
    And ExamRecord 状态变为 failed
    And 系统提示 U001 可以重考（剩余次数 = maxAttempts - attempts）

  Scenario: BDD-TRN-023 达到最大重考次数后无法再考
    Given U001 已考试 2 次（等于 maxAttempts），均未通过
    When U001 再次尝试开始考试
    Then 系统返回 HTTP 400 或 HTTP 403
    And 错误消息说明考试次数已用完

  Scenario: BDD-TRN-024 生成培训档案
    Given 培训项目 PR001 已到期，所有受训人员均已完成考试
    When 管理员或系统自动调用归档接口
    Then 系统为每个受训人员生成一条 TrainingArchive 记录
    And 归档记录包含 status、completedAt
```

---

## BATCH-TRACE — 批次与追溯 {#batch-trace}

```gherkin
Feature: 物料批次管理

  Background:
    Given 当前用户已登录，具有 batch:create 权限

  Scenario: BDD-BT-001 创建物料批次成功
    When 用户提交 materialId="MAT001"、supplierId="SUP001"、quantity=500、unit="kg"、expiryDate="2026-01-01"
    Then 系统返回 HTTP 201
    And 批次记录状态为 normal
    And batchNumber 由系统自动生成，不可由用户输入

  Scenario: BDD-BT-002 物料批次创建后批号不可修改
    Given 物料批次 MB001 已创建，batchNumber="MB-20250101-001"
    When 用户尝试修改 MB001 的 batchNumber
    Then 系统返回 HTTP 400
    And batchNumber 保持原值

  Scenario: BDD-BT-003 查询物料批次详情包含库存和使用记录
    Given 物料批次 MB001 已被部分使用
    When 用户查询 MB001 详情
    Then 响应体包含 warehouseRecords 和 usageRecords 字段
```

```gherkin
Feature: 生产批次管理

  Scenario: BDD-BT-010 创建生产批次必须关联有效的产品和配方
    When 用户提交 productId="PROD001"、recipeId="REC001"、plannedQuantity=1000
    Then 系统验证 productId 和 recipeId 均存在且属于当前 company
    And 系统返回 HTTP 201
    And 生产批次状态为 pending
    And batchNumber 由系统自动生成

  Scenario: BDD-BT-011 关联不存在的产品时创建失败
    When 用户提交 productId="INVALID"
    Then 系统返回 HTTP 400 或 HTTP 404

  Scenario: BDD-BT-012 关联物料使用记录
    Given 生产批次 PB001 已创建
    When 用户记录物料 MB001 的使用，quantity=200kg
    Then 系统创建 BatchMaterialUsage 记录
    And usedAt 被记录为当前时间
```

```gherkin
Feature: 批次反向追溯（成品 → 原料）

  Background:
    Given 生产批次 PB001 已使用 3 个物料批次：MB001(小麦粉)、MB002(糖)、MB003(食盐)
    And MB001 来自供应商 SUP001

  Scenario: BDD-BT-020 反向追溯返回完整原材料链
    When 用户对 PB001 执行反向追溯
    Then 系统返回追溯结果，包含：
      | 层级  | 节点        | 字段              |
      | 生产  | PB001       | batchNumber       |
      | 原料  | MB001       | batchNumber, qty  |
      | 原料  | MB002       | batchNumber, qty  |
      | 原料  | MB003       | batchNumber, qty  |
      | 供应商| SUP001      | name              |

  Scenario: BDD-BT-021 反向追溯结果包含关联的动态表单记录
    Given PB001 关联了 2 条动态表单填报记录 R001、R002
    When 用户对 PB001 执行反向追溯
    Then 追溯结果中包含 records=[R001, R002]

  Scenario: BDD-BT-022 反向追溯包含 Mixing 执行记录
    Given PB001 关联了混料执行记录 MIX001
    When 用户对 PB001 执行反向追溯
    Then 追溯结果中包含 mixingAggregations 字段
```

```gherkin
Feature: 批次正向追溯（原料 → 成品）

  Background:
    Given 物料批次 MB001 被用于 3 个生产批次：PB001、PB002、PB003

  Scenario: BDD-BT-030 正向追溯返回所有使用该原料的生产批次
    When 用户对 MB001 执行正向追溯
    Then 系统返回追溯结果，包含 [PB001, PB002, PB003] 的基本信息

  Scenario: BDD-BT-031 正向追溯可导出报告
    When 用户对 MB001 执行正向追溯并请求导出
    Then 系统生成 Excel 报告，包含所有追溯节点
    And 响应头 Content-Type 为 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

---

## CCP — 关键控制点 {#ccp}

```gherkin
Feature: CCP 监测记录
  在生产过程中记录关键控制点的实测值，超出控制限时自动创建不合格品记录。

  Background:
    Given 生产批次 PB001 关联了 CCP 点 CCP-01（控制限：pH 3.5~4.5）

  Scenario: BDD-CCP-001 在控制限内的 CCP 记录正常创建
    When 操作员提交：production_batch_id=PB001、ccp_point_id=CCP-01、measured_value=4.0、is_within_cl=true
    Then 系统返回 HTTP 201
    And 记录被创建，不触发 NonConformance

  Scenario: BDD-CCP-002 超出控制限时自动创建不合格品记录
    When 操作员提交：measured_value=5.5、is_within_cl=false、deviation_action="已通知质检员"
    Then 系统返回 HTTP 201
    And CCP 记录被创建
    And 同时自动生成 NonConformance 记录，source_type="ccp_deviation"
    And NonConformance 的 description 包含 CCP-01 编号和偏差值 5.5

  Scenario: BDD-CCP-003 查询生产批次缺失的 CCP 监测项
    Given PB001 的配方要求监测 CCP-01、CCP-02、CCP-03
    And 只有 CCP-01 有记录
    When 用户查询 PB001 的缺失 CCP 项
    Then 响应返回 [CCP-02, CCP-03]

  Scenario: BDD-CCP-004 每条记录包含操作员信息
    When 操作员 U001 提交 CCP 记录
    Then 记录的 operatorId 为 U001
    And monitored_at 被设置为当前时间
```

---

## DEVIATION — 偏差检测 {#deviation}

```gherkin
Feature: 动态表单提交时自动偏差检测
  当动态表单记录中的数值字段超出配置的公差范围时，系统自动生成偏差报告。

  Background:
    Given 表单模板 T001 有字段 "发酵温度"，预期值=30°C，tolerance=±2°C（type=range）

  Scenario: BDD-DEV-001 字段值在公差范围内时不产生偏差报告
    When 用户提交记录，发酵温度=31°C
    Then 系统不创建 DeviationReport

  Scenario: BDD-DEV-002 字段值超出公差范围时自动生成偏差报告
    When 用户提交记录，发酵温度=34°C（超出上限 32°C）
    Then 系统自动生成 DeviationReport
    And 报告包含：fieldName="发酵温度"、expectedValue=30、actualValue=34
    And deviationAmount=4、deviationType="range"

  Scenario: BDD-DEV-003 百分比类型公差检测
    Given 表单模板 T002 有字段 "水分含量"，预期值=15%，tolerance=10%（type=percentage）
    When 用户提交记录，水分含量=17%（偏差率=13.3%，超出 10%）
    Then 系统自动生成 DeviationReport
    And deviationRate ≈ 13.3

  Scenario: BDD-DEV-004 偏差报告列表支持按严重程度过滤
    Given 系统中存在 critical、high、medium 级别的偏差报告
    When 用户按 severity=critical 过滤
    Then 返回结果仅包含 critical 级别的报告

  Scenario: BDD-DEV-005 偏差分析仪表板展示趋势数据
    Given 系统中存在过去 30 天的偏差报告
    When 用户访问偏差分析仪表板
    Then 系统返回按天聚合的偏差数量趋势数据
    And 数据按 templateId 分组

  Scenario: BDD-DEV-006 偏差报告状态流转
    Given DeviationReport DR001 状态为 pending
    When 质检员审阅后将 DR001 状态变为 reviewed
    Then 系统返回 HTTP 200
    And DR001 状态为 reviewed
    When 质检员关闭 DR001
    Then DR001 状态变为 closed
```

---

## NON-CONFORMANCE — 不合格品 {#non-conformance}

```gherkin
Feature: 不合格品记录管理

  Background:
    Given 当前用户具有 nc:create 权限

  Scenario: BDD-NC-001 手动创建不合格品记录
    When 用户提交 source_type="material_batch"、source_id="MB001"、description="色泽异常，怀疑氧化"
    Then 系统返回 HTTP 201
    And nc_no 由系统自动生成（格式如 NC-20250101-001）
    And discovered_at 被记录为当前时间

  Scenario: BDD-NC-002 source 不存在时创建失败
    When 用户提交 source_type="material_batch"、source_id="INVALID"
    Then 系统返回 HTTP 404 或 HTTP 400
    And 错误消息说明 source 不存在

  Scenario: BDD-NC-003 source 属于其他公司时创建失败
    Given 物料批次 MB999 属于 companyId=99
    When companyId=1 的用户尝试以 MB999 为来源创建 NC
    Then 系统返回 HTTP 403 或 HTTP 404

  Scenario: BDD-NC-004 处置不合格品（报废）
    Given 不合格品 NC001 处于初始状态
    When 质检员提交处置方式 disposition="scrap"、dispositionDetails="全批报废，通知采购退货"
    Then 系统返回 HTTP 200
    And NC001 的 disposition 被更新为 scrap

  Scenario: BDD-NC-005 四种处置方式均被接受
    Then 处置方式 disposition 允许的值为 [scrap, rework, concession, return]
    And 其他值应返回 HTTP 400

  Scenario: BDD-NC-006 CCP 偏差自动创建的 NC 包含来源标识
    Given CCP 监测发现偏差，自动创建了 NC002
    When 查询 NC002 详情
    Then source_type="ccp_deviation"
    And description 包含 CCP 点编号和实测值
```

---

## PRODUCT-RECALL — 产品召回 {#product-recall}

```gherkin
Feature: 产品召回管理

  Background:
    Given 当前用户具有 recall:create 权限

  Scenario: BDD-REC-001 创建召回记录成功
    When 用户提交 title="批次 PB001 铅超标召回"、risk_level="high"、reason="铅含量超出国标 0.3mg/kg"
    Then 系统返回 HTTP 201
    And recall_no 由系统自动生成（格式 RC-2025-0001）
    And 召回状态为 draft

  Scenario: BDD-REC-002 召回记录可关联受影响的生产批次
    Given 召回记录 RC001 已创建
    When 用户关联生产批次 PB001 和 PB002
    Then 系统创建 ProductRecallBatch 记录
    And 记录中保存 batch_number_snapshot 和 product_name_snapshot
    And 后续修改 PB001 批号不影响已保存的快照

  Scenario: BDD-REC-003 召回状态机 — draft 提交审核
    Given 召回 RC001 状态为 draft
    When 用户将状态转换为 pending_review
    Then 系统返回 HTTP 200
    And RC001 状态变为 pending_review

  Scenario: BDD-REC-004 召回状态机 — 不允许的跳转被拒绝
    Given 召回 RC001 状态为 draft
    When 用户尝试直接将状态设为 in_progress（跳过中间步骤）
    Then 系统返回 HTTP 400
    And 错误消息说明状态转换不合法

  Scenario: BDD-REC-005 完整状态流转
    Given 召回 RC001 状态为 draft
    When 按顺序执行：draft→pending_review→approved→notified→in_progress→completed
    Then 每步转换均返回 HTTP 200
    And 最终状态为 completed

  Scenario: BDD-REC-006 任何非 completed 状态均可取消
    Given 召回 RC001 状态为 in_progress
    When 用户将状态设为 cancelled
    Then 系统返回 HTTP 200
    And RC001 状态变为 cancelled

  Scenario: BDD-REC-007 创建通知记录并标记发送
    Given 召回 RC001 状态为 notified
    When 用户创建通知记录：notificationType="email"、recipientType="distributor"
    Then 系统创建 ProductRecallNotification 记录，status 为初始值
    When 用户标记该通知已发送
    Then 通知记录的 sentAt 被设置为当前时间

  Scenario: BDD-REC-008 召回记录可关联溯源快照和客诉
    When 创建召回记录时提供 source_complaint_id 或 source_traceability_snapshot_id
    Then 系统关联对应记录
    And 查询召回详情时可通过关联 ID 跳转到原始记录
```

---

## ALERT — 告警规则 {#alert}

```gherkin
Feature: 告警规则管理

  Scenario: BDD-ALT-001 创建告警规则
    When 管理员提交 name="文档逾期未审阅"、metricName="doc.overdue_count"、condition=">"、threshold=5、severity="high"、enabled=true
    Then 系统返回 HTTP 201
    And 规则被保存，enabled=true

  Scenario: BDD-ALT-002 disabled 的告警规则不触发告警
    Given 告警规则 R001 的 enabled=false
    When 监控指标满足触发条件
    Then 不产生 AlertHistory 记录
    And 不发送通知

  Scenario: BDD-ALT-003 enabled 的告警规则触发时产生历史记录
    Given 告警规则 R001 的 enabled=true，threshold=5
    When 对应指标值变为 8（超过阈值）
    Then 系统创建 AlertHistory 记录，status=triggered、value=8
    And 按配置的 notifyChannels 发送通知

  Scenario: BDD-ALT-004 告警恢复时历史记录状态更新为 resolved
    Given AlertHistory AH001 状态为 triggered
    When 对应指标值降至 3（低于阈值）
    Then AH001 状态变为 resolved

  Scenario: BDD-ALT-005 查询告警历史支持按规则过滤
    When 查询告警历史，指定 ruleId=R001
    Then 返回结果仅包含 R001 触发的历史记录

  Scenario: BDD-ALT-006 更新告警规则
    Given 已存在告警规则 R001
    When 管理员更新 threshold=10
    Then 系统返回 HTTP 200
    And R001 的 threshold 更新为 10

  Scenario: BDD-ALT-007 删除告警规则
    Given 已存在告警规则 R001
    When 管理员删除 R001
    Then 系统返回 HTTP 200
    And R001 不再出现在规则列表中
```

---

## MONITORING — 系统监控 {#monitoring}

```gherkin
Feature: 系统指标记录与查询

  Scenario: BDD-MON-001 单条指标记录入库
    When 系统提交 metricName="api.response_time"、metricValue=120、metricType="histogram"
    Then 系统返回 HTTP 201
    And 记录被存入 SystemMetric 表，附带当前 timestamp

  Scenario: BDD-MON-002 批量指标记录入库
    When 提交包含 5 条指标的批量请求
    Then 系统返回 HTTP 201
    And 5 条记录均被保存

  Scenario: BDD-MON-003 按指标名称和时间范围查询
    Given 系统中存在过去 24 小时的 api.response_time 记录
    When 查询 metricName="api.response_time"、startTime=过去24小时
    Then 返回结果仅包含指定时间范围内的记录

  Scenario: BDD-MON-004 系统健康状态检查
    When 调用系统健康检查接口
    Then 响应包含以下组件的健康状态：
      | 组件       | 状态字段   |
      | PostgreSQL | status     |
      | Redis      | status     |
      | MinIO      | status     |
      | 磁盘       | usagePercent |
    And 每个组件状态为 healthy 或 unhealthy

  Scenario: BDD-MON-005 监控仪表板自动刷新
    Given 用户在监控仪表板页面
    When 仪表板启用自动刷新（间隔 30 秒）
    Then 每 30 秒请求一次最新指标数据
    And 图表数据实时更新
```

---

## AUDIT — 审计日志 {#audit}

```gherkin
Feature: 登录日志
  系统记录所有登录、登出、登录失败事件，保留 90 天后自动清理。

  Scenario: BDD-AUD-001 成功登录产生登录日志
    When 用户 zhangsan 成功登录
    Then 登录日志表新增一条记录：action=login、status=success、包含 ipAddress 和 userAgent

  Scenario: BDD-AUD-002 登录失败产生失败日志
    When 用户提交错误密码
    Then 登录日志表新增 action=login_failed、status=failed 的记录

  Scenario: BDD-AUD-003 登录日志支持多维度查询过滤
    Given 系统中存在过去 30 天的登录日志
    When 管理员按 userId、日期范围、action 过滤查询
    Then 返回结果满足过滤条件

  Scenario: BDD-AUD-004 登录日志可导出为 Excel
    When 管理员点击导出，指定日期范围为过去 7 天
    Then 系统生成 Excel 文件
    And 文件包含 userId、username、action、ipAddress、loginTime 列
    And 响应 Content-Type 为 application/vnd.openxmlformats...

  Scenario: BDD-AUD-005 登录日志 90 天自动清理
    Given 系统中存在 91 天前的登录日志
    When 定时清理任务运行
    Then 91 天前的记录被删除
    And 90 天内的记录保留完整
```

```gherkin
Feature: 权限变更日志
  权限变更事件永久保留，不受时间清理影响。

  Scenario: BDD-AUD-010 角色权限变更时自动记录日志
    When 管理员修改用户 U001 的角色
    Then 权限日志表新增一条记录，包含 operatorId、targetUserId、beforeValue、afterValue、ipAddress

  Scenario: BDD-AUD-011 权限日志永久保留
    Given 系统中存在 180 天前的权限变更日志
    When 定时清理任务运行
    Then 权限日志记录不被删除
```

```gherkin
Feature: 敏感操作审计日志
  包括文档发布、数据删除、配置修改在内的敏感操作均被自动记录。

  Scenario: BDD-AUD-020 文档发布时记录敏感日志
    When 用户发布文档 D001
    Then 敏感日志表新增记录：action="document:publish"、resourceId=D001、包含 ipAddress 和 userAgent

  Scenario: BDD-AUD-021 数据删除时记录敏感日志
    When 用户删除任意业务数据
    Then 敏感日志表新增对应的删除操作记录

  Scenario: BDD-AUD-022 敏感日志按 resourceType 和 action 过滤查询
    When 管理员查询 resourceType="document"、action="publish" 的敏感日志
    Then 返回结果仅包含文档发布操作记录
```

---

## BACKUP — 备份管理 {#backup}

```gherkin
Feature: 数据库与对象存储备份

  Scenario: BDD-BCK-001 触发 PostgreSQL 备份
    When 管理员调用 PostgreSQL 备份接口
    Then 系统执行 pg_dump，生成 custom format 备份文件
    And 文件名格式为 backup_YYYYMMDD_HHmmss.dump
    And 备份历史表新增一条 backupType=postgres、status=success 的记录

  Scenario: BDD-BCK-002 触发 MinIO 备份
    When 管理员调用 MinIO 备份接口
    Then 系统执行压缩打包，生成 .tar.gz 文件
    And 备份历史表新增 backupType=minio 的记录

  Scenario: BDD-BCK-003 备份失败时仍记录历史
    Given PostgreSQL 容器不可用
    When 管理员触发 PostgreSQL 备份
    Then 备份历史表新增一条 status=failed 的记录
    And 记录包含 errorMessage 字段

  Scenario: BDD-BCK-004 查询备份历史支持按类型过滤
    When 管理员查询 backupType=postgres 的备份历史
    Then 返回结果仅包含 postgres 类型的备份记录
    And 结果支持分页（page、limit 参数）
```

---

## SEARCH — 全文搜索 {#search}

```gherkin
Feature: 文档全文搜索

  Background:
    Given 系统中存在多份已生效的文档，标题和内容各不相同

  Scenario: BDD-SRC-001 关键词搜索返回相关文档
    When 用户搜索关键词 "GMP"
    Then 返回标题或内容包含 "GMP" 的文档列表
    And 已删除文档（deletedAt != null）不出现在结果中

  Scenario: BDD-SRC-002 搜索结果支持按 documentLevel 过滤
    When 用户搜索 keyword="GMP"、documentLevel=1
    Then 返回结果仅包含 level=1 的文档

  Scenario: BDD-SRC-003 搜索结果支持按状态过滤
    When 用户搜索 keyword="GMP"、documentStatus="effective"
    Then 返回结果仅包含 status=effective 的文档

  Scenario: BDD-SRC-004 搜索结果支持按时间排序
    When 用户搜索，sortBy="time"
    Then 返回结果按 createdAt 降序排列

  Scenario: BDD-SRC-005 搜索结果支持按相关度排序
    When 用户搜索，sortBy="relevance"
    Then 返回结果按关键词匹配度排序

  Scenario: BDD-SRC-006 文档索引在文档发布时自动更新
    Given 文档 D001 正在审批
    When 审批通过，文档状态变为 effective
    Then 搜索服务自动更新 D001 的全文索引

  Scenario: BDD-SRC-007 文档删除时索引被移除
    When 管理员软删除文档 D001
    Then D001 的搜索索引被删除或标记为不可搜索
    And 后续搜索不返回 D001

  Scenario: BDD-SRC-008 搜索结果分页
    Given 搜索 "质量" 共有 50 条结果
    When 用户请求 page=2、limit=10
    Then 返回第 11~20 条结果
    And 响应包含 total=50 的元数据
```

---

## RECYCLE-BIN — 回收站 {#recycle-bin}

```gherkin
Feature: 文档回收站
  已软删除的文档进入回收站，可被恢复或永久删除。

  Background:
    Given 文档 D001 已被软删除（deletedAt 已设置）

  Scenario: BDD-RBN-001 回收站列表仅显示已删除文档
    When 管理员查询回收站列表
    Then 仅显示 deletedAt != null 的文档
    And 正常文档不出现在回收站列表中

  Scenario: BDD-RBN-002 从回收站恢复文档
    When 管理员对 D001 执行恢复操作
    Then 系统返回 HTTP 200
    And D001 的 deletedAt 被重置为 null
    And D001 重新出现在正常文档列表中

  Scenario: BDD-RBN-003 永久删除回收站中的文档
    When 管理员对 D001 执行永久删除
    Then 系统返回 HTTP 200
    And D001 从数据库中彻底删除（或标记为不可恢复）
    And D001 不再出现在回收站列表中

  Scenario: BDD-RBN-004 正常文档无法永久删除（需先进回收站）
    Given 文档 D002 状态为 effective，deletedAt 为 null
    When 管理员尝试对 D002 执行永久删除接口
    Then 系统返回 HTTP 400 或 HTTP 403
```

---

## TASK / RECORD — 动态表单与任务 {#task-record}

```gherkin
Feature: 动态表单任务创建与填报

  Background:
    Given 模板 T001 已发布，字段包括：文本字段"操作人"、数值字段"温度"、日期字段"记录日期"
    And 当前用户 U001 已收到基于 T001 的填报任务

  Scenario: BDD-TSK-001 创建填报任务
    When 管理员基于模板 T001 向部门 D-A 创建任务，指定截止时间
    Then 系统创建 RecordTask 记录
    And 部门 D-A 的成员收到待办提醒

  Scenario: BDD-TSK-002 用户填写动态表单并提交
    Given U001 打开任务
    When U001 填写：操作人="张三"、温度=35、记录日期="2025-05-10"，并提交
    Then 系统创建 Record 记录，fields 字段包含以上数据
    And 任务状态变为 submitted

  Scenario: BDD-TSK-003 保存草稿后续继续填写
    Given U001 已填写部分字段，保存为草稿
    When U001 重新打开草稿任务
    Then 已填写的字段值被还原
    And U001 可继续编辑并提交

  Scenario: BDD-TSK-004 提交表单触发偏差检测
    Given 模板 T001 中温度字段的容差为 30±3°C
    When U001 提交温度=37°C（超出容差）
    Then 系统自动生成 DeviationReport
    And 偏差报告包含 fieldName="温度"、expectedValue=30、actualValue=37

  Scenario: BDD-TSK-005 提交的表单进入审批流程
    Given 模板 T001 配置了提交后需要审批
    When U001 提交表单
    Then 系统自动发起审批
    And 指定审批人收到待审批通知

  Scenario: BDD-TSK-006 锁定状态的文档任务不可编辑
    Given Record R001 已被锁定
    When U001 尝试修改 R001
    Then 系统返回 HTTP 403
    And R001 内容不变
```

---

## 跨模块端到端场景

```gherkin
Feature: 食品安全事件完整响应链
  模拟一次完整的"原料偏差 → 不合格品 → 召回"场景。

  Scenario: BDD-E2E-001 原料偏差触发召回的完整链路
    Given 物料批次 MB001（面粉，supplierId=SUP001）已入库
    And 生产批次 PB001 使用了 MB001

    When 操作员在 CCP-01 监测中发现实测值 pH=5.8，超出控制限（4.5）
    Then 系统自动创建 NonConformance NC001，source_type="ccp_deviation"

    When 质检主管审查 NC001，决定发起召回
    And 创建召回记录 RC001，关联生产批次 PB001
    Then RC001 状态为 draft，recall_no 自动生成

    When 管理员批准召回（draft→pending_review→approved）
    Then RC001 状态为 approved

    When 通知外部分销商（创建 notificationType="email" 通知记录）
    And 标记通知已发送
    Then 召回状态变为 notified

    When 完成召回处理
    Then RC001 状态变为 completed

    When 审计员查询审计日志
    Then 能查到 CCP 偏差、NC 创建、召回发起、状态变更的完整日志链

Feature: 培训 + 待办集成场景

  Scenario: BDD-E2E-002 培训任务出现在员工待办列表
    Given 培训项目 PR001 已发布，U001 是受训员工
    When 系统将 PR001 推送为待办任务
    Then U001 的待办列表中出现"参加培训考试"条目
    When U001 完成考试，score=85，通过
    Then 待办条目状态变为已完成
    And TrainingArchive 为 U001 生成档案记录

Feature: 文档从草稿到发布的完整流程

  Scenario: BDD-E2E-003 文档草稿 → 审批 → 发布 → 搜索可见
    When 用户创建文档 D001（draft）
    And 提交会签审批，审批人 A1、A2 依次通过
    Then D001 状态变为 effective
    And D001 可通过全文搜索找到

    When 用户创建 D001 的新版本 D001-v2，并通过审批
    Then D001-v2 状态变为 effective
    And D001-v1 状态变为 superseded
    And 搜索 D001 标题时，置顶结果为 D001-v2
```

---

*本文档由源码全量阅读自动生成，版本时间：2025-05-10。*
*如业务规则有变，请同步更新 BDD_SPEC.md。*
