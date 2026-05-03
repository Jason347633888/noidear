# GAP-505 User.role 弃用 — 迁移字符串角色检查至 Role 模型 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Start every execution reply with: `I'm using the executing-plans skill to implement this plan.`
> If you discover any conflict between this plan and the current code / AGENTS.md / docs/AGENT_GUIDE.md, stop immediately and report back to the main agent. Do NOT guess or expand scope.

**Goal:** 消除所有使用 `User.role`（Prisma 已标 `@deprecated`）字符串值做权限判断的代码，统一改为从 `Role.code`（`User.roleId → Role.code`）获取角色标识。不删除数据库字段（字段删除是后续独立迁移任务）。

**GAP:** `GAP-505`

**Spec:** 本计划为自描述，不依赖独立 spec 文件。

**Business boundary:** 本计划只涉及服务端角色判断逻辑；不改前端；不改 Prisma schema；不删 `User.role` 字段；不改 seed 数据；不改任何 API 响应字段名。

---

## 背景与问题描述

`User.role`（类型 `String @default("user")`）字段在 Prisma schema 已标注：

```
/// @deprecated 请使用 roleId 外键代替此字段。此字段将在后续版本删除。
role  String  @default("user")  // 保留（向后兼容）
roleId  String?  // P1-2: 新增角色外键
roleObj  Role?  @relation("UserRole", ...)
```

`Role` 模型有 `code String @unique`，系统预置值为 `admin`、`leader`、`user`，与旧 `User.role` 字符串值语义相同。

**当前问题**（两类）：

**类型 A：JWT 生成时读取 `User.role`（弃用字段）**
- `auth.service.ts`（`login()`）— 将 `user.role` 写入 JWT payload
- `sso.service.ts` — 同上（3 处）

**类型 B：从数据库直接查 User 后读取 `user.role`（弃用字段）**
- `document.service.ts:645` — `approver?.role === 'admin'`（DB 查询 approver）
- `user-permission.service.ts:127` — `revoker.role !== 'admin'`（DB 查询 revoker）

**不需要修改的文件**（这些文件的 `role` 来自 JWT `req.user`，只要 JWT 修复即可）：
- `roles.guard.ts`、`permission.guard.ts` — 从 `req.user.role` 读取，JWT 修复后自动正确
- `task.service.ts`、`document.service.ts`（多数 role 参数）、`document.controller.ts`、`document-query.service.ts`、`file-preview.service.ts`、`record-task.controller.ts`、`export.service.ts`、`recycle-bin.service.ts`、`workflow-instance.controller.ts` — 均从 JWT `req.user.role` 传入，JWT 修复后行为不变

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已直接检查 schema、auth.service、sso.service、guards、task/document/record-task/user-permission 等模块，确认弃用字段使用范围。
- **grill-me 校准结论：**
  - Role.code 与 User.role 字符串值完全一致（admin/leader/user），迁移不改变运行时角色语义。
  - JWT role 字段名保持不变（仍为 `role`），所有下游守卫与业务模块无需感知变更。
  - 仅 2 处 DB 直接查 User 后检查 `.role`，需专项修复。
  - 需要在 login/SSO 时用 `include: { roleObj: true }` 拉取角色关系。
  - 无 schema migration，无历史数据迁移，无前端变更，风险极低。
- **执行限制：** 执行 agent 只能使用 `superpowers:executing-plans`；不得扩展范围、重写 spec、修改 schema。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。
- **停止条件：** 若发现任何用户的 `roleId` 为 null 且 `role` 非标准值，或 `Role.code` 不包含 `admin`/`leader`/`user`，必须停止并回报主 agent。

---

## File Map

修改文件（共 4 个）：
- `server/src/modules/auth/auth.service.ts` — login 查询加 include roleObj，JWT payload 改用 `roleObj?.code ?? role`
- `server/src/modules/auth/sso.service.ts` — 同上（3 处 JWT 构造）
- `server/src/modules/document/document.service.ts` — 第 645 行 approver 查询加 include roleObj，改读 `approver.roleObj?.code ?? approver.role`
- `server/src/modules/user-permission/user-permission.service.ts` — 第 127 行 revoker 查询加 include roleObj，改读 `revoker.roleObj?.code ?? revoker.role`

不修改文件：
- `server/src/prisma/schema.prisma`（不删字段、不加字段、不加 migration）
- 所有 guard 文件
- 所有从 JWT `req.user.role` 获取 role 的控制器 / 服务

---

## Task 1: 前置检查 — 验证 Role 表与用户 roleId 覆盖率

**目的：** 确认 Role.code 包含全部预期值，且当前用户数据覆盖情况已知（即使部分用户 roleId 为 null，迁移后仍有 fallback）。

- [ ] 检查 `server/src/prisma/schema.prisma` 确认 `Role.code` 为 `@unique`，`User.roleId` 可为 null（已有 fallback）。
- [ ] 搜索 seed 文件确认 `admin`/`leader`/`user` 三个系统角色均存在于 Role 表初始数据：
  ```bash
  grep -n "admin\|leader\|user" server/src/prisma/seed.ts | grep -i "role\|code" | head -20
  ```
- [ ] 确认 `Role` 模型字段 `code: String @unique`，可用 `findUnique({ where: { code: ... } })` 查询。
- [ ] 记录：若发现非标准 role 字符串值（例如 `quality_manager`）在 User.role 中存在，但 Role 表无对应 code，必须停止并回报主 agent（本计划 fallback 逻辑 `roleObj?.code ?? role` 可处理此情况，但需确认业务意图）。

**Acceptance:**
- 已确认 seed 包含三个系统角色 Role 行。
- 已确认 User.roleId nullable，fallback 逻辑安全。

---

## Task 2: 修复 auth.service.ts — login 时用 Role.code 生成 JWT

**File:** `server/src/modules/auth/auth.service.ts`

**当前代码（约第 25 行）：**
```typescript
const user = await this.prisma.user.findUnique({
  where: { username: dto.username },
});
// ...
const payload = {
  sub: user.id,
  username: user.username,
  role: user.role,   // ← 弃用字段
  name: user.name,
  companyId: user.company_id,
};
```

**修改步骤：**

- [ ] 在 `login()` 方法的 `prisma.user.findUnique` 中加入 `include: { roleObj: true }`：
  ```typescript
  const user = await this.prisma.user.findUnique({
    where: { username: dto.username },
    include: { roleObj: true },
  });
  ```
- [ ] 将 JWT payload 的 `role` 字段改为：
  ```typescript
  role: user.roleObj?.code ?? user.role,
  ```
- [ ] 将 `return` 块中返回给前端的 `role` 字段也改为：
  ```typescript
  role: user.roleObj?.code ?? user.role,
  ```
- [ ] 不改 `changePassword()`、`validateUser()` 等其他方法（不涉及 JWT 构造）。
- [ ] 不改 `AuthTokenPayload` 接口（字段名 `role: string` 不变）。

**Acceptance:**
- `auth.service.ts` 中 `user.role` 出现次数减少到仅剩 fallback（`?? user.role`），不再作为唯一来源。
- TypeScript 编译通过（roleObj 为 `Role | null`，`?.code` 为 `string | undefined`，`?? user.role` 补全为 `string`）。

---

## Task 3: 修复 sso.service.ts — SSO 登录时用 Role.code 生成 JWT

**File:** `server/src/modules/auth/sso.service.ts`

- [ ] 检查 sso.service.ts 中所有 `prisma.user.findUnique` / `prisma.user.findFirst` / `prisma.user.create` / `prisma.user.update` 调用，找出构造 JWT payload 的代码（约第 56、85、211 行附近）。
- [ ] 对每个构造 JWT payload 的 user 查询，加入 `include: { roleObj: true }`（若已有 include 则添加 `roleObj: true` 到现有 include 对象）。
- [ ] 将 payload 中的 `role: user.role` 改为 `role: user.roleObj?.code ?? user.role`（共 3 处）。
- [ ] 若某处 user 对象来自 `prisma.user.create`（返回类型不含 roleObj），改为先 create 再用 ID 重新 findUnique with include，或用 `user.roleId ? (await prisma.role.findUnique({ where: { id: user.roleId } }))?.code ?? user.role : user.role`。

**Acceptance:**
- sso.service.ts 中 JWT 构造处不再直接读 `user.role` 作为唯一来源。
- TypeScript 编译通过。

---

## Task 4: 修复 document.service.ts — approver DB 查询用 Role.code

**File:** `server/src/modules/document/document.service.ts`

**当前代码（约第 639-648 行）：**
```typescript
const approver = await this.prisma.user.findUnique({
  where: { id: approverId },
  // ← 无 include
});
// ...
const isAdmin = approver?.role === 'admin';  // ← 弃用字段
```

- [ ] 将 approver 查询改为：
  ```typescript
  const approver = await this.prisma.user.findUnique({
    where: { id: approverId },
    include: { roleObj: true },
  });
  ```
- [ ] 将 `isAdmin` 判断改为：
  ```typescript
  const approverRoleCode = approver?.roleObj?.code ?? approver?.role;
  const isAdmin = approverRoleCode === 'admin';
  ```
- [ ] 不改同文件其他 role 参数（它们从 JWT `req.user.role` 传入，由 Task 2 修复覆盖）。

**Acceptance:**
- 该函数不再直接读 `approver.role` 做判断。
- TypeScript 编译通过。

---

## Task 5: 修复 user-permission.service.ts — revoker DB 查询用 Role.code

**File:** `server/src/modules/user-permission/user-permission.service.ts`

**当前代码（约第 122-128 行）：**
```typescript
const revoker = await this.prisma.user.findUnique({
  where: { id: revokedBy },
  // ← 无 include
});
if (revoker && revoker.role !== 'admin' && userPermission.grantedBy !== revokedBy) {
  throw new ForbiddenException('仅原授权人或管理员可撤销此权限');
}
```

- [ ] 将 revoker 查询改为：
  ```typescript
  const revoker = await this.prisma.user.findUnique({
    where: { id: revokedBy },
    include: { roleObj: true },
  });
  ```
- [ ] 将角色判断改为：
  ```typescript
  const revokerRoleCode = revoker?.roleObj?.code ?? revoker?.role;
  if (revoker && revokerRoleCode !== 'admin' && userPermission.grantedBy !== revokedBy) {
    throw new ForbiddenException('仅原授权人或管理员可撤销此权限');
  }
  ```

**Acceptance:**
- `revoker.role` 不再直接用于判断。
- TypeScript 编译通过。

---

## Task 6: 验证与回归

- [ ] 运行 TypeScript 编译检查：
  ```bash
  cd server && npx tsc --noEmit
  ```
- [ ] 运行现有单元测试：
  ```bash
  cd server && npm test -- --testPathPattern="auth|sso|document|user-permission" --passWithNoTests
  ```
- [ ] 搜索确认弃用字段使用已全部处理：
  ```bash
  # 应只剩 fallback 用法（?? user.role）和 schema 本身的定义；不应有裸的 user.role / revoker.role / approver.role 作为唯一判断源
  grep -rn "\.role\b" server/src/modules --include="*.ts" | grep -v ".spec.ts" | grep -v "roleId\|roleObj\|roleCode\|?? \|RolesGuard\|roles.decorator\|role:" | grep "=== '\|!== '\|includes(user"
  ```
  预期：无输出（或只剩守卫/装饰器中已审查过的合理用法）。
- [ ] 运行 git diff --check 确认无空白字符错误。

**Final report must include:**
- executing-plans skill 使用确认：是/否
- executing-plans skill 文件已读取：是/否
- 执行的 plan 路径
- 完成的 Task 列表（含子项 checkbox 状态）
- 未完成 Task 及原因
- 修改文件列表（含具体行号变更摘要）
- TypeScript 编译结果
- 单元测试结果
- 验证命令 grep 结果
- 是否有 schema/migration 变更（本计划预期：否）
- 是否有剩余风险
- PR 链接（标题含 GAP-505）

---

## 非目标（本计划不做）

- 不删除 `User.role` 字段（需独立 schema migration PR，历史数据处理复杂）
- 不修改任何 Prisma migration 文件
- 不改 `AuthenticatedUser` 接口（`role: string` 语义不变）
- 不改 `roles.guard.ts` / `permission.guard.ts`（已通过 JWT role 正确工作）
- 不改任何从 `req.user.role` 透传 role 参数的控制器/服务文件
- 不改前端代码
- 不增加新 API 端点
- 不改 seed 数据
