# Semantic Dedup Hotfix Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> If current code conflicts with this plan, stop and report back instead of guessing.

**Goal:** 两类快速收口：(1) 前端 Record.status 补全 `'signed'`；(2) `packages/types/task.ts` TaskStatus 与前端对齐，前端删除本地重定义。

**Architecture:** 纯代码更改，无 schema migration。原 Task 2（删除 `AuthenticatedUser.userId`，统一用 `id`）已并入 `domain-source-of-truth` PR 1 的认证上下文收口，本计划不再修改 `authenticated-user.ts` / `auth.strategy.ts`。

**Spec:** `docs/superpowers/specs/2026-05-09-domain-source-of-truth-and-semantic-dedup-design.md`（决策五、六、七）

**Tech Stack:** TypeScript, NestJS, Vue 3, Prisma

**Pre-check（执行前）：**
```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git worktree list --porcelain
pwd
git branch --show-current
# 必须在独立 worktree 分支中执行，不得在主 checkout 上写代码
```

---

## File Map

### Task 1（Record.status 前端修复）
- Modify: `client/src/api/record.ts`（扩展 status 类型）
- Modify: `client/src/views/record/RecordDetail.vue`（补 statusTextMap 条目）
- Search and fix: 所有引用 `Record.status` 的前端视图文件

### Task 2（已迁移到 PR 1，不在本计划执行）
- 原内容：`req.user.id / userId` 统一
- 新归属：`docs/superpowers/plans/2026-05-09-domain-source-of-truth-and-semantic-dedup-implementation.md` Task 1
- 本计划不得修改：
  - `server/src/modules/auth/authenticated-user.ts`
  - `server/src/modules/auth/auth.strategy.ts`
  - `req.user.userId` 调用点

### Task 3（TaskStatus 统一）
- Modify: `packages/types/task.ts`
- Modify: `client/src/api/task.ts`（删除本地 TaskStatus 重定义，改为从 @noidear/types 导入）
- Verify: `server/src/modules/task/task.service.ts`（确认后端状态值与新 enum 对齐）

---

## Task 1: Record.status 前端补全 `'signed'`

**背景：** `signRecord`（BRCGS 电子签名）写入 `status: 'signed'`。前端类型只有 `'approved'`，导致已签署记录的状态标签显示为空。正确修复是前端对齐后端，而非修改 BRCGS 合规逻辑。

**Files:**
- Modify: `client/src/api/record.ts`
- Modify: `client/src/views/record/RecordDetail.vue`
- Search: `rg -n "approved.*rejected|draft.*submitted" client/src/views/record/`

- [ ] **Step 1.1: 扩展 `client/src/api/record.ts` 的 Record.status 类型**

打开 `client/src/api/record.ts` 第 13 行，将：
```typescript
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
```
改为：
```typescript
  status: 'draft' | 'submitted' | 'signed' | 'approved' | 'rejected';
```

- [ ] **Step 1.2: 确认 RecordDetail.vue 中的 statusTextMap 补全**

打开 `client/src/views/record/RecordDetail.vue`，找到 `statusTextMap` 定义（关键词：`statusTextMap`），确认改为：
```typescript
const statusTextMap: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
  signed: '已签署',
  approved: '已通过',
  rejected: '已驳回',
};
```

同文件找到状态 badge/tag 的颜色映射（通常叫 `statusTypeMap` 或 `getStatusType`），补全 `signed` 对应颜色：
```typescript
const statusTypeMap: Record<string, string> = {
  draft: 'info',
  submitted: 'warning',
  signed: 'success',
  approved: 'success',
  rejected: 'danger',
};
```

- [ ] **Step 1.3: 全局扫描其他前端文件中的状态映射**

```bash
rg -n "approved.*rejected|statusTextMap|statusTypeMap|status.*badge" client/src/views/record/ --type vue
```

对每个出现的文件，确认 `signed` 已被覆盖（或不涉及 Record.status）。

- [ ] **Step 1.4: 扫描前端中所有对 record status 的 `=== 'approved'` 判断**

```bash
rg -n "status.*===.*'approved'\|=== 'approved'" client/src/views/record/ client/src/api/
```

检查每处：若是判断"记录是否完成/通过"，需要增加 `|| status === 'signed'` 或用 `includes`：
```typescript
// 示例：判断记录是否已完成（签署也算完成）
const isDone = ['signed', 'approved'].includes(record.status);
```

- [ ] **Step 1.5: TypeScript 类型检查**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run build:client 2>&1 | head -50
```

期望：无新增类型错误。

- [ ] **Step 1.6: Commit**

```bash
git add client/src/api/record.ts client/src/views/record/RecordDetail.vue
git commit -m "fix: align Record.status 'signed' across frontend types and statusTextMap"
```

---

## Task 2: 已迁移到 PR 1，不在本计划执行

**决策：** `AuthenticatedUser.userId` 删除与 `role -> roleCode` 属于同一批认证上下文收口，已并入 `domain-source-of-truth` PR 1。PR 2 只处理 Record.status 与 TaskStatus，避免再次触碰同一批认证文件。

**执行要求：**

- 本计划不得修改 `server/src/modules/auth/authenticated-user.ts`
- 本计划不得修改 `server/src/modules/auth/auth.strategy.ts`
- 本计划不得批量替换 `req.user.userId`
- 若验证时发现 `req.user.userId` 残留，只记录为 PR 1 未完成项，不在 PR 2 修复

---

## Task 3: TaskStatus 统一到 `packages/types/task.ts`

**背景：**
- `packages/types/task.ts`：`TaskStatus = 'pending' | 'completed' | 'cancelled'`（3种，不完整）
- `client/src/api/task.ts`：本地重定义了 `TaskStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'overdue'`（6种，是实际完整集）

正确做法：以前端实际使用的 6 种状态为权威，更新 packages/types，前端改为导入而非重定义。

**Files:**
- Modify: `packages/types/task.ts`
- Modify: `client/src/api/task.ts`
- Verify: `server/src/modules/task/task.service.ts`（确认状态值对齐）

- [ ] **Step 3.1: 更新 `packages/types/task.ts` 中的 TaskStatus**

打开 `packages/types/task.ts` 第 3 行，将：
```typescript
export type TaskStatus = 'pending' | 'completed' | 'cancelled';
export type TaskRecordStatus = 'pending' | 'submitted' | 'approved' | 'rejected';
```
改为：
```typescript
export type TaskStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'overdue';

export type TaskRecordStatus = 'pending' | 'submitted' | 'approved' | 'rejected';
```

- [ ] **Step 3.2: 从 `client/src/api/task.ts` 中删除本地 TaskStatus 重定义，改为导入**

打开 `client/src/api/task.ts`，找到：
```typescript
export type TaskStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'overdue';
```

删除这段本地定义，在文件顶部添加导入（`packages/types/index.ts` 已 `export * from './task'`，`TaskStatus` 可从 `@noidear/types` 导入）：
```typescript
import type { TaskStatus } from '@noidear/types';
export type { TaskStatus };
```

- [ ] **Step 3.3: 检查 `client/src/api/task.ts` 中的 `Task` interface 类型一致性**

确认第 51 行附近的 `Task.status` 字段是 `TaskStatus`（来自导入），`TaskRecord.status` 字段类型合理（目前是 `string`，可暂不改）：
```typescript
export interface Task {
  // ...
  status: TaskStatus;  // 确认是从 @noidear/types 导入的类型
}
```

- [ ] **Step 3.4: 检查后端 task.service.ts 状态值对齐**

```bash
grep -n "status\|pending\|submitted\|approved\|rejected\|cancelled\|overdue" \
  server/src/modules/task/task.service.ts | head -30
```

确认后端写入的状态值均在 `'pending' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'overdue'` 集合内。若有写入 `'completed'` 的地方，按业务语义改为 `'approved'` 或 `'cancelled'`（与业务确认后修改）。

- [ ] **Step 3.5: 编译验证**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run build:client 2>&1 | head -50
npm run build:server 2>&1 | head -50
```

期望：无类型错误。

- [ ] **Step 3.6: 全局扫描残留的本地 TaskStatus 重定义**

```bash
rg -n "TaskStatus.*pending.*submitted\|type TaskStatus" client/src/ packages/ --type ts
```

期望：只剩 `packages/types/task.ts` 中的一处定义，前端中无重定义。

- [ ] **Step 3.7: Commit**

```bash
git add packages/types/task.ts client/src/api/task.ts
git commit -m "refactor: unify TaskStatus into packages/types, remove client local redefinition"
```

---

## Task 4: 验证与收口

- [ ] **Step 4.1: 旧语义全仓扫描（清零目标）**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear

# 认证上下文 userId 收口属于 PR 1；本 PR 只可旁路观察，不在这里修复
rg -n "req\.user\.userId\b|AuthenticatedUser.*userId" server/src/ --type ts || true

# 确认前端 Record.status 类型已含 'signed'
rg -n "'draft' | 'submitted' | 'approved'" client/src/api/record.ts

# 确认 TaskStatus 无本地重定义
rg -n "type TaskStatus" client/src/ --type ts
```

- [ ] **Step 4.2: 最终编译**

```bash
npm run build:client && npm run build:server
```

期望：0 错误。

- [ ] **Step 4.3: 汇总 PR**

```bash
git log --oneline origin/master..HEAD
```

确认 commit 数量与内容符合预期，再开 PR。
