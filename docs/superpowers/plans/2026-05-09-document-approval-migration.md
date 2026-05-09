# Document Approval Migration to ApprovalInstance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> If current code conflicts with this plan, stop and report back instead of guessing.

**Goal:** 将文档审批从双轨制（旧 `Approval` 表 + 新 `ApprovalInstance`）彻底迁移到统一审批平台，补全缺失的 level2/level3 ApprovalDefinition，使 `approveDocument`/`rejectDocument` 通过新系统路由，移除 `submitForApproval` 中的旧系统并写。

**Architecture:**
- 当前状态：`submitForApproval` 同时写 `Approval`（旧）和 `ApprovalInstance`（新，仅 level1 有定义），`approveDocument` 只读旧 `Approval` 表
- 迁移后：新文档全部走 `ApprovalInstance`；`approveDocument`/`rejectDocument` 通过检查 `document.approvalInstanceId` 路由到新/旧系统（兼容历史数据）；新 `submitForApproval` 不再写旧 `Approval` 表
- 旧 `Approval` 表保留用于历史兼容、证据链查询、file-preview 签名显示，不立即 drop
- PR 4 合并后，生产代码中 `prisma.approval.create` 必须为 0；历史文档兼容路径只允许读取或更新已存在旧记录

**Spec:** `docs/superpowers/specs/2026-05-09-domain-source-of-truth-and-semantic-dedup-design.md`（P1-C 审批系统双轨）

**ADR:** [docs/decisions/2026-05-09-document-approval-legacy-compatibility.md](/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/decisions/2026-05-09-document-approval-legacy-compatibility.md)

**Tech Stack:** NestJS, Prisma, TypeScript

**Pre-check（执行前）：**
```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git worktree list --porcelain && pwd && git branch --show-current
# 必须在独立 worktree 分支执行
```

---

## 现状说明

### 旧系统（`Approval` 表）
- `submitForApproval`：`prisma.approval.create()` 写入 `approverId = creator.superiorId`
- `approveDocument`：`prisma.approval.findFirst()` 读，`prisma.approval.update()` 写
- `rejectDocument`：同上
- `file-preview.service.ts`：`prisma.approval.findFirst()` 读审批人

### 新系统（`ApprovalInstance`）
- seed 中只有 `publish.level1` 的 ApprovalDefinition（level2、level3 缺失）
- `submitForApproval` 中有 try/catch：有定义则写 `ApprovalInstance`，无定义时静默降级到旧系统
- `document.module.ts` 已注册 `document.approvalApproved` 回调：审批通过后自动把 Document.status 改为 EFFECTIVE

### 迁移策略
| 场景 | 迁移前 | 迁移后 |
|------|--------|--------|
| 新文档提交 | 写旧 Approval + 尝试写 ApprovalInstance | 只写 ApprovalInstance（必须成功） |
| 历史文档审批（无 approvalInstanceId） | 旧系统 | 旧系统（兼容保留） |
| 新文档审批（有 approvalInstanceId） | 旧系统 | 新系统（通过 ApprovalTask 动作） |

---

## File Map

### Task 1（补全 seed 中的 level2/level3 定义）
- Modify: `server/src/prisma/seed.ts`

### Task 2（submitForApproval：移除旧系统并写）
- Modify: `server/src/modules/document/document.service.ts`（`submitForApproval` 方法）

### Task 3（approveDocument/rejectDocument：路由到新系统）
- Modify: `server/src/modules/document/document.service.ts`（`approveDocument` / `rejectDocument` 方法）

### Task 4（file-preview.service.ts：兼容读取）
- Modify: `server/src/modules/document/services/file-preview.service.ts`

### Task 5（验证收口）
- Run: build + manual test via seed data

---

## Task 1: 补全 seed 中的 level2 / level3 ApprovalDefinition

**背景：** `seed.ts` 第 468 行只有 `publish.level1`。`document.service.ts:520` 生成 triggerKey 为 `publish.level${document.level ?? 3}`。level2、level3 文档提交时没有匹配定义，当前静默降级。本 Task 补全两个定义，使所有级别的文档都能走新系统。

- [ ] **Step 1.1: 阅读现有 level1 定义结构**

打开 `server/src/prisma/seed.ts` 第 465-490 行，理解 steps 结构（`stepKey`, `stepName`, `mode`, `assignments`, `rejectPolicy`, `onApproved`）。

- [ ] **Step 1.2: 在 `approvalDefinitions` 数组中补全 level2、level3**

在 `publish.level1` 定义之后，添加：
```typescript
    {
      module: 'document',
      resourceType: 'document',
      triggerKey: 'publish.level2',
      name: '二级文件发布审批',
      version: 1,
      steps: [
        {
          stepKey: 'document-level2',
          stepName: '二级文件审批',
          mode: 'sequential',
          assignments: [{ type: 'role', roleCode: 'leader', label: '部门负责人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'document.approvalApproved',
        },
      ],
    },
    {
      module: 'document',
      resourceType: 'document',
      triggerKey: 'publish.level3',
      name: '三级文件发布审批',
      version: 1,
      steps: [
        {
          stepKey: 'document-level3',
          stepName: '三级文件审批',
          mode: 'sequential',
          assignments: [{ type: 'role', roleCode: 'leader', label: '部门负责人' }],
          rejectPolicy: 'reject_instance',
          onApproved: 'document.approvalApproved',
        },
      ],
    },
```

**注意：** `assignments` 中的 `roleCode` 需与实际业务对齐。`leader` 适合三级文件（部门内审批），`gm` 适合一级文件（总经理审批）。如业务对 level2 有特殊要求（如质量部门负责人），需业务确认后再修改。

- [ ] **Step 1.3: 验证 seed 中 level3 的 `@default(3)` 逻辑**

在 `document.service.ts:520` 中，`publish.level${document.level ?? 3}` 表示：文档无 level 字段时默认为 3。确认 `Document` schema 中 `level` 字段的含义：
```bash
grep -n "level\b" server/src/prisma/schema.prisma | grep -i document | head -5
```

若 `level` 字段可为 null 且 null 代表"未分级"，则 fallback 到 3 是合理的。无需修改。

- [ ] **Step 1.4: Commit**

```bash
git add server/src/prisma/seed.ts
git commit -m "feat: add publish.level2 and publish.level3 ApprovalDefinitions to seed"
```

---

## Task 2: `submitForApproval` 移除旧系统并写

**背景：** 当前 `submitForApproval` 同时写旧 `Approval` 表和新 `ApprovalInstance`（有定义时）。Task 1 完成后，所有文档都有匹配定义，新系统会成功，旧系统的写入变为冗余。本 Task 将 startApproval 从 optional try/catch 改为必须成功，移除旧 Approval 写入。

- [ ] **Step 2.1: 修改 `submitForApproval` 方法结构**

打开 `server/src/modules/document/document.service.ts`，找到 `submitForApproval` 方法（约第 471 行）。

在新系统提交逻辑上方加注释，明确新文档审批全部走 `ApprovalInstance`：
```typescript
// 新文档审批全部走 ApprovalInstance。旧 Approval 表自 PR-4 起不再新增写入。
```

将现有逻辑：
```typescript
// 创建审批记录（旧 Approval 表保持兼容）
await this.prisma.approval.create({
  data: {
    id: this.snowflake.nextId(),
    documentId: id,
    approverId: creator.superiorId,
    status: 'pending',
  },
});

// 尝试通过统一审批引擎发起新流程（无匹配定义时降级，不影响旧流程）
if (this.approvalEngine) {
  const triggerKey = `publish.level${document.level ?? 3}`;
  try {
    const instance = await this.approvalEngine.startApproval({
      resourceType: 'document',
      resourceId: id,
      resourceStep: 'publish',
      triggerKey,
      title: `文件发布审批：${document.title || id}`,
      createdById: userId,
    });
    await this.prisma.document.update({
      where: { id },
      data: { approvalInstanceId: instance.id },
    });
  } catch {
    // 无匹配 ApprovalDefinition 时跳过统一追踪，旧 Approval 表继续工作
  }
}
```

改为：
```typescript
// 新文档审批全部走 ApprovalInstance。旧 Approval 表自 PR-4 起不再新增写入。
// 通过统一审批引擎发起审批（ApprovalDefinition 必须存在）
const triggerKey = `publish.level${document.level ?? 3}`;
const instance = await this.approvalEngine.startApproval({
  resourceType: 'document',
  resourceId: id,
  resourceStep: 'publish',
  triggerKey,
  title: `文件发布审批：${document.title || id}`,
  createdById: userId,
});
await this.prisma.document.update({
  where: { id },
  data: { approvalInstanceId: instance.id },
});
```

**注意：** 此变更要求 Task 1 已完成（所有 level 都有对应 ApprovalDefinition）。若 `startApproval` 抛出错误，文档提交会失败并返回 500 —— 这是期望行为，比静默降级更好（配置问题应该显现，而非被吞掉）。

- [ ] **Step 2.2: 检查 `approvalEngine` 是否需要 null 检查**

在原代码中，`if (this.approvalEngine)` 是 optional injection guard。检查 `DocumentModule` 是否有条件注入 `ApprovalEngineService`：

```bash
grep -n "approvalEngine\|ApprovalEngineService" server/src/modules/document/document.module.ts server/src/modules/document/document.service.ts | head -15
```

若 `ApprovalEngineService` 总是注入（非 optional），可以直接删除 null check。若是 optional，需在调用前加断言：
```typescript
if (!this.approvalEngine) {
  throw new Error('ApprovalEngineService not available — check document.module.ts');
}
```

- [ ] **Step 2.3: 构建验证**

```bash
npm run build:server 2>&1 | grep -i "error\|TS" | head -20
```

- [ ] **Step 2.4: Commit**

```bash
git add server/src/modules/document/document.service.ts
git commit -m "refactor: remove legacy Approval write from submitForApproval, require ApprovalInstance"
```

---

## Task 3: `approveDocument` / `rejectDocument` 路由到新系统

**背景：** `approveDocument`（约第 640 行）从 `prisma.approval.findFirst()` 读取，在事务内 `prisma.approval.update()` 写回。迁移后，当 `document.approvalInstanceId` 有值时，应通过 `ApprovalEngineService` 的 act（claim + approve/reject）接口处理，由引擎回调来更新 Document 状态。

- [ ] **Step 3.1: 理解 ApprovalEngineService 的 act API**

```bash
grep -n "async.*act\|async.*approve\|async.*reject\|async.*claim" \
  server/src/modules/unified-approval/approval-engine.service.ts | head -15
```

记录 act 方法的签名（参数类型和返回值），后续步骤会用到。

- [ ] **Step 3.2: 修改 `approveDocument` 方法**

找到 `approveDocument`（约第 620 行），在验证 document status 之后，加入路由分支：

```typescript
async approveDocument(id: string, approverId: string, status: 'approved' | 'rejected', comment?: string) {
  const document = await this.findOne(id, approverId, 'user');

  if (document.status !== 'pending') {
    throw new BusinessException(ErrorCode.CONFLICT, `只能审批待审批状态的文档，当前状态：${document.status}`);
  }

  if (status === 'rejected' && !comment) {
    throw new BusinessException(ErrorCode.VALIDATION_ERROR, '驳回时必须填写原因');
  }

  // 新系统路由：有 approvalInstanceId 时走 ApprovalInstance
  if (document.approvalInstanceId && this.approvalEngine) {
    // 找出该 instance 下当前 PENDING 的 task
    const pendingTask = await this.prisma.approvalTask.findFirst({
      where: { instanceId: document.approvalInstanceId, status: 'PENDING' },
    });
    if (!pendingTask) {
      throw new BusinessException(ErrorCode.CONFLICT, '该文档审批流程中无待处理任务');
    }
    if (status === 'approved') {
      return this.approvalEngine.approveTask(pendingTask.id, approverId, comment ?? '');
    } else {
      return this.approvalEngine.rejectTask(pendingTask.id, approverId, comment ?? '');
    }
    // 注意：document 状态由 document.approvalApproved 回调更新，无需手动修改
  }

  // LEGACY: 旧 Approval 表自 PR-4 起不再新增写入。
  // 以下 findFirst/update 仅用于历史文档（approvalInstanceId = null）的审批兼容路径。
  // 新文档审批全部走 ApprovalInstance，见 submitForApproval() 上方注释。
  // 旧系统路由：无 approvalInstanceId（历史数据兼容）
  const pendingApproval = await this.prisma.approval.findFirst({
    where: { documentId: id, status: 'pending' },
  });
  // ... 以下保持原有旧系统逻辑不变
```

**注意：** `ApprovalEngineService` 的方法是 `approveTask(taskId, actorId, comment)` 和 `rejectTask(taskId, actorId, comment)`。需要先查出当前 PENDING 的 `ApprovalTask.id`，再调用对应方法。

- [ ] **Step 3.3: 确认 `approveTask` / `rejectTask` 的权限逻辑**

旧系统的权限检查是：`pendingApproval.approverId === approverId || isAdmin`。新系统的权限检查在 `ApprovalEngineService` 内部（通过 `assigneeUserId`, `assigneeRoleCode` 等）。

确认 `ApprovalEngineService.approveTask` / `rejectTask` 是否已包含权限检查：
```bash
grep -n "FORBIDDEN\|permission\|assignee\|roleCode" \
  server/src/modules/unified-approval/approval-engine.service.ts | head -20
```

若新系统内部已有权限控制，旧系统的手动权限检查可保留（defense in depth），但不应重复执行。

- [ ] **Step 3.4: 修改 `rejectDocument`（若独立实现）**

检查是否有独立的 `rejectDocument` 方法：
```bash
grep -n "async rejectDocument\|async.*reject.*document" \
  server/src/modules/document/document.service.ts
```

若有，同样加入 `approvalInstanceId` 路由分支，与 Step 3.2 逻辑一致。若 approve/reject 合并在同一个方法，Step 3.2 已覆盖。

- [ ] **Step 3.5: 构建验证**

```bash
npm run build:server 2>&1 | grep -i "error\|TS" | head -30
```

- [ ] **Step 3.6: Commit**

```bash
git add server/src/modules/document/document.service.ts
git commit -m "feat: route document approve/reject through ApprovalInstance when available"
```

---

## Task 4: `file-preview.service.ts` 兼容审批状态读取

**背景：** `file-preview.service.ts:257` 读 `prisma.approval.findFirst()` 来获取文档审批人（用于预览权限或签名显示）。迁移后，新文档的审批人在 `ApprovalInstance` / `ApprovalAction` 中，旧文档仍在 `Approval` 表。

- [ ] **Step 4.1: 读取 file-preview.service.ts 的审批查询代码**

打开 `server/src/modules/document/services/file-preview.service.ts` 第 255-275 行，理解它读 `Approval` 表的目的（权限验证？签名人显示？）。

- [ ] **Step 4.2: 补充新系统查询路径**

找到 `prisma.approval.findFirst()` 调用，在其之前加入新系统查询：

```typescript
// 优先从新系统查询（有 approvalInstanceId 的文档）
if (document.approvalInstanceId) {
  const latestAction = await this.prisma.approvalAction.findFirst({
    where: {
      instanceId: document.approvalInstanceId,
      action: { in: ['APPROVE', 'REJECT'] },
    },
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { id: true, name: true } } },
  });
  if (latestAction) {
    // 用 latestAction.actor 替代旧 approval.approver 逻辑
    // 按原有逻辑使用 latestAction 数据
  }
}

// 兼容旧系统（历史文档）
const approval = await this.prisma.approval.findFirst({ ... });
```

**注意：** 具体的返回结构需对照原有代码中 `approval` 对象的字段用法，逐字段替换。

- [ ] **Step 4.3: 构建验证**

```bash
npm run build:server 2>&1 | grep -i "error\|TS" | head -20
```

- [ ] **Step 4.4: Commit**

```bash
git add server/src/modules/document/services/file-preview.service.ts
git commit -m "fix: file-preview approval lookup supports both ApprovalInstance and legacy Approval"
```

---

## Task 5: 验证收口

- [ ] **Step 5.1: 重建数据库并运行 seed**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx prisma migrate reset --force
npm run seed 2>&1 | tail -20
```

确认 seed 输出中包含：
```
✅ 统一审批定义配置完成（共 X 个）
```
X 应比迁移前多 2（新增 level2、level3）。

- [ ] **Step 5.2: 手动验证文档审批流程**

通过 MCP 工具或直接 API 调用（若 MCP 可用）：

```
# 1. 创建一个三级文档（level3）
call_api({ path: '/documents', method: 'POST', body: { title: '迁移测试文档', level: 3, ... } })
# → 取 documentId

# 2. 提交审批
call_api({ path: '/documents/<documentId>/submit-for-approval', method: 'POST' })
# → 期望：成功，不报错，document.approvalInstanceId 非空

# 3. 确认 ApprovalInstance 已创建
call_api({ path: '/approval/instances?resourceType=document&resourceId=<documentId>', method: 'GET' })
# → 期望：返回 1 个 instance，status=PENDING

# 4. 找出 PENDING 的 ApprovalTask
call_api({ path: '/approval/tasks?instanceId=<instanceId>&status=PENDING', method: 'GET' })
# → 取 taskId

# 5. 审批通过（POST /approval/tasks/:taskId/approve）
call_api_as({ role: 'admin', path: '/approval/tasks/<taskId>/approve', method: 'POST',
  body: { comment: '测试通过' } })
# → 期望：Document.status 变为 published/effective

# 5. 确认旧 Approval 表无新记录
query_db({ sql: "SELECT count(*) FROM approvals WHERE \"documentId\" = '<documentId>'" })
# → 期望：count = 0（新系统不再写旧表）
```

- [ ] **Step 5.3: 全局扫描残留的旧 Approval 写入**

```bash
rg -n "prisma\.approval\.create\b" server/src/modules/ --type ts
```

期望：0 处。若有，必须停止并确认是否为 PR 4 前遗留代码；PR 4 合并后生产代码不得新增旧 `Approval` 记录。旧有历史兼容读取 / update 可以保留，但必须有 LEGACY 注释说明。

- [ ] **Step 5.4: 扫描 `approval-instance.controller.ts` 中的 userId 兼容代码**

```bash
grep -n "userId\|user\.userId" server/src/modules/unified-approval/approval-instance.controller.ts
```

若发现 `req.user?.userId ?? req.user?.id ?? req.user?.sub`，在 Task 2（hotfix-pack req.user.id 统一）完成后，改为直接 `req.user.id`。

- [ ] **Step 5.5: 开 PR**

```bash
git log --oneline origin/master..HEAD
```

---

## 完成定义

1. seed 中存在 `publish.level1`、`publish.level2`、`publish.level3` 三个 ApprovalDefinition
2. 新文档提交审批后：`document.approvalInstanceId` 非空，旧 `Approval` 表无新记录
3. 审批通过/驳回走 `ApprovalInstance` 路由，Document 状态由回调自动更新
4. 旧文档（`approvalInstanceId` 为 null）仍可通过旧系统路由完成审批
5. `rg -n "prisma\.approval\.create\b" server/src/modules/ --type ts` 返回 0 处
6. `npm run build:server` 0 错误

## 注意事项

- 旧 `Approval` 表不 drop，保留历史数据的兼容路径（文档证据链、审计日志、file-preview 签名显示）
- 下一步（未来 plan）：待所有旧文档审批完成后，再下线旧系统的读路径并 drop `Approval` model
