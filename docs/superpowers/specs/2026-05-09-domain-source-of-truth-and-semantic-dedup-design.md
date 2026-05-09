# 领域事实源与重复语义全面清理 设计说明

## 目标

在当前 `master` 已完成首登组织初始化与 `User.role` 字段下线之后，再做一轮全项目“事实源收口”。

这轮不是继续做零散补丁，而是把下面四类仍然分散、漂移或双口径的领域语义正式收口：

1. 用户角色正式来源与消费口径
2. 部门层级口径
3. 部门负责人事实源
4. 组织与权限初始化状态来源

## 背景

首登初始化与角色切换主线已经落地，当前代码基线相比旧阶段有两个重要变化：

- `User.role` 持久化字段已经从 schema 删除，正式持久化角色来源是 `User.roleId -> Role`
- 初始化流程、部门管理、角色管理已经上线

但代码审计显示，项目里仍然存在几类“同一概念多套表达”的问题：

- 正式角色主数据、运行时消费字段、导入导出展示/输入格式的边界没有完全约束清楚
- 产品口径已经按单层部门运行，但 schema / DTO / 权限页仍保留树形部门语义
- 部门负责人已经有正式字段 `managerId`，但前后端仍在多处各自推导
- 初始化状态同时有动态计算与 `SystemConfig` 持久化写入，但未明确权威来源

这会继续导致：

- 前后端契约漂移
- 文档先宣布完成、代码仍有残留
- 领域判断分散，后续修改成本高

## 范围

本设计只覆盖这四条主线：

1. 用户角色正式来源与消费口径统一
2. 单层部门口径收口
3. 部门负责人事实源收口
4. 初始化状态权威来源收口

## 不在本轮范围

以下字段名虽然相同或相似，但不是这轮的“重复语义”清理对象：

- `ProcessStepApproval.role`
- 文档阅读范围 / 覆盖范围中的 `scopeType = role`
- 任何前端 DOM / a11y 的 `role` 属性
- 自定义角色能力本身

这些概念与系统 RBAC 用户角色不是同一语义，不能并表处理。

## 决策一：用户角色只保留一个正式来源

### 正式来源

用户角色的唯一正式持久化来源是：

- `User.roleId -> Role`
- `Role.code`

### 约束

后续统一遵守：

1. 持久化写入只接受 `roleId`
2. 查询用户正式角色时，只看 `roleId -> Role.code`
3. 运行时不再保留独立 `req.user.role` / `CurrentUser.role` 影子字段
4. 前后端权限判断统一消费正式角色对象或正式角色 code
5. 导入允许继续使用 `role` 文本作为输入格式，但它只表示角色代码输入，不构成事实源
6. 导出允许继续显示“角色”列，但其值只能来自正式角色主数据
7. 业务模块不得再自行发明 `roleObj?.code ?? ...`、`roleId -> code`、或其他角色解释逻辑
8. 文档中不得再把展示列或输入格式描述成正式角色来源

### 结果

这轮之后，角色语义变成：

- 唯一正式来源：`roleId -> Role`
- 消费层统一读取正式角色对象或正式角色 code
- 导入/导出中的角色文本只属于输入格式或展示格式

不再允许项目中存在第二套 role 影子语义。

### `leader` 的正式语义

`leader` 的正式语义是：

- **部门级治理权限角色**

它表示某个用户具有部门级查看、审批或治理权限资格，但它本身不直接等于：

- 当前部门负责人

当前部门负责人仍然只由 `Department.managerId` 指定。

## 决策二：部门正式收口为单层

当前产品与初始化流程已经按单层部门工作，因此本轮正式决策为：

- 部门模型不再支持层级结构
- `parentId` 不再作为有效业务语义保留

### 约束

1. schema 删除 `Department.parentId`
2. department DTO / API types 删除 `parentId`
3. 部门管理页保持平铺列表
4. 权限页不再构建部门树
5. 部门权限不再存在 `subdepartment` 层级隔离语义
6. 初始化流程、负责人规则、用户归属都只在单层部门上成立

### 结果

“单层部门”不再只是产品约定，而变成代码、类型、页面一致的正式口径。

## 决策三：`managerId` 是唯一部门负责人事实源

部门负责人正式来源是：

- `Department.managerId`

`leader` 角色不再被描述成“负责人来源”，它只表示：

- 可被选为负责人候选的资格条件

### 约束

1. 页面上“是否为负责人”的判断都从 `managerId` 派生
2. `leader` 只用于候选资格校验，不再承担负责人事实源角色
3. 写入层必须硬拦非 active leader 被设置为负责人
4. 读取层保留负责人异常识别，用于识别历史脏数据或失效状态
5. 负责人异常、初始化状态、列表标签都以 `managerId + manager.roleObj.code/status` 为统一判断基础
6. 不允许前端各页面再各写一套负责人推导逻辑

### 结果

这轮之后，团队内对“负责人是谁”的回答只能有一个：

- 看 `Department.managerId`

## 决策四：初始化状态改为“动态进度 + 持久化完成标记”的分工模型

当前系统已经有两个相关机制：

- `OrgBootstrapService.getStatus()` 动态计算当前进度
- `SystemConfig.org_permission_bootstrap_completed` 持久化完成标记

本轮不再让它们处于竞争关系，而是明确职责：

### 动态状态的职责

在初始化尚未完成时，动态计算负责：

- 当前步骤
- 缺失原因
- 下一步引导

### 持久化完成标记的职责

一旦初始化满足完成条件并写入 `org_permission_bootstrap_completed = true`：

- 该标记成为登录路由与阶段判断的权威完成标记
- 后续日常治理异常不会把系统重新打回“首次初始化未完成”
- 初始化状态接口不再重新动态回判完成性

### 结果

初始化状态收口为：

- 未完成阶段：看动态进度
- 已完成阶段：看持久化完成标记

这不是两个事实源，而是一套分阶段模型。

### 组织治理异常

初始化完成后，部门负责人失效、用户未归属部门、用户挂在停用部门等问题统一归类为：

- **组织治理异常**

这类异常通过独立治理状态或治理统计暴露，不再混入初始化状态接口。
本轮只要求后端接口或统计能力，不强制同步交付新的治理页面。

### 初始化入口

`/bootstrap/org` 是未完成初始化阶段的受控入口：

- 初始化未完成时可达
- 初始化完成后不再作为常规菜单入口
- 初始化完成后访问该路由应直接跳回正常首页

## 文档要求

本轮必须同步修正文档漂移，尤其是：

1. 不再把”运行时 `role` 字段仍存在”误写成”`User.role` 持久化字段仍在使用”
2. 不再把”单层部门”只写在实现计划里，却让 schema / DTO / 页面继续保留树形语义
3. 不再把”初始化状态”写成单纯动态计算或单纯配置项，而要体现本设计里的分工模型

## 验收标准

本轮完成后，应同时满足：

1. 项目中不存在影子 `role` 正式语义，角色只以 `roleId -> Role` 为事实源
2. JWT、登录响应、认证上下文中的正式角色结果字段统一命名为 `roleCode`
3. 导入/导出中的角色文本仅保留为输入格式或展示格式
4. `parentId` 从 schema、DTO、共享类型、页面逻辑中消失
5. `subdepartment` 从部门权限模型与页面中消失
6. 部门负责人只通过 `managerId` 判定
7. `leader` 被明确定义为部门级治理权限角色，而非负责人事实源
8. 初始化路由与状态判断遵守”未完成看动态，已完成看持久化标记”
9. 组织治理异常与初始化状态分层
10. 文档与代码对这四条主线的表述一致

---

## 补充决策（2026-05-09 全项目审计新增）

> 以下决策来自全项目语义去重综合审计，对上方四个核心决策的范围以外的问题进行收口。
> 对应实现计划：`docs/superpowers/plans/2026-05-09-semantic-dedup-hotfix-pack.md`
> 和：`docs/superpowers/plans/2026-05-09-semantic-dedup-schema-status-cleanup.md`

### 决策五：Record.status 的 `'signed'` 是 BRCGS 合规术语，前端必须对齐

`signRecord` 方法写入的 `status: 'signed'` 代表 **BRCGS 电子签名**完成状态，不应改为 `'approved'`（两者语义不同：签名 ≠ 审批）。

**约束：**
1. 后端维持 `'signed'` 不变
2. `client/src/api/record.ts` 的 `Record.status` 类型扩展为 `'draft' | 'submitted' | 'signed' | 'approved' | 'rejected'`
3. 前端所有 statusTextMap 补全 `signed: '已签署'`
4. 已有 `'approved'` 状态保留用于独立审批流程（与签名独立存在）

### 决策六：`AuthenticatedUser` 删除冗余 `userId` 字段，统一用 `id`

`AuthenticatedUser.userId` 与 `.id` 始终相同，只造成混用。

**约束：**
1. `authenticated-user.ts` 删除 `userId` 字段
2. `auth.strategy.ts` 删除 `userId: payload.sub`
3. 全仓所有 `req.user.userId` 改为 `req.user.id`（含 auth、record、record-task、internal-audit 相关 controllers）
4. 本变更可与 Task 1（角色来源收口）在同一 PR 合并

### 决策七：`TaskStatus` 只保留一套定义，以 `client/src/api/task.ts` 为事实参考

`packages/types/task.ts` 的 `TaskStatus` 只有 3 个值（pending/completed/cancelled），与前端实际使用的 6 个值不符。`TaskRecord.status` 同理。

**约束：**
1. `packages/types/task.ts` 的 `TaskStatus` 更新为完整状态集：`'pending' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'overdue'`
2. `client/src/api/task.ts` 删除本地重定义，从 `@noidear/types` 导入
3. 后端 task service 的状态枚举值与 packages/types 对齐

### 决策八：`Supplier` 双状态字段分离为两个有类型约束的字段

`Supplier.status`（运营状态）和 `Supplier.supplier_status`（资质评估状态）是两个独立维度，不应合并，但必须有明确命名和类型约束。

**约束：**
1. `Supplier.supplier_status` 通过 `@map` 保持 DB 列名不变，Prisma 字段名改为 `evaluationStatus`
2. 新增 `SupplierEvaluationStatus` enum：`approved | suspended | eliminated | pending`
3. `status` 字段的合法值注释固化为 `active | disabled`（后续独立 enum 化）
4. 服务层同步使用新字段名，消除 snake_case 散落

### 决策九：`MaterialBatch.lot_status` 升级为有类型约束的字段

`MaterialBatch.lot_status` 当前为无类型约束的 String 字段，与同模型的 `status: BatchStatus` 形成双轨。

**约束：**
1. 新增 `LotInventoryStatus` enum：`in_stock | consumed | nonconforming | quarantined | disposed`
2. `lot_status` 字段类型改为 `LotInventoryStatus`，保持 `@map(“lot_status”)`
3. 写入 `lot_status` 的所有服务层代码改用 enum 值
4. `BatchStatus`（质量状态）与 `LotInventoryStatus`（库存状态）的语义边界写入注释：
   - `BatchStatus`：批次质量/锁定状态，由 QC 操作触发
   - `LotInventoryStatus`：批次库存流向状态，由仓储操作触发
