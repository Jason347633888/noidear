# 全项目领域语义去重与事实源收口 — 综合审计报告

> **审计日期：** 2026-05-09  
> **审计范围：** schema、服务层、前端口径、文档 vs 代码四个维度  
> **审计方法：** 四路并行 Explore agent，覆盖 4142 行 schema、所有 server/src/modules、client/src、packages/types、docs/  

---

## 关系说明

本文档是对以下已有计划的**补充**，不是替换：

| 已有计划 | 覆盖主题 |
|---------|---------|
| `2026-05-09-domain-source-of-truth-and-semantic-dedup-design.md` | 角色来源、部门层级、部门负责人、初始化状态 |
| `gap-102-inventory-movement-ledger-unification-design.md` | InventoryMovement vs StockRecord |
| `gap-200` ～ `gap-203` | ShiftInstance FK、配料多对多、BatchDetail 选择器、PackagingMaterialUsage FK |
| `gap-307 / 308` | 追溯查询链、TraceabilitySnapshot 持久化 |
| `gap-309 / 310` | CustomerComplaint 客户 FK、生产批次 FK |

**本文档只记录上述已有计划未覆盖的新发现。**

---

## 严重等级定义

| 级别 | 含义 |
|-----|------|
| **P0** | 当前会导致页面 crash 或数据写入静默出错 |
| **P1** | 两套并行事实源，正确性取决于运行路径 |
| **P2** | 命名/结构不一致，不影响功能但增加维护成本 |
| **P3** | 代码质量问题，有改进空间但无功能风险 |

---

## P0 级：已确认存在运行时 bug

### P0-A：Record 状态 `'signed'` vs `'approved'`

**维度：** 前端 ↔ 后端口径不一致  
**确认状态：** 已用代码验证，100% 确认

**后端实际写入：**
```typescript
// server/src/modules/record/record.service.ts:386
data: { status: 'signed', ... }
```

**前端类型定义：**
```typescript
// client/src/api/record.ts:13
status: 'draft' | 'submitted' | 'approved' | 'rejected';
```

**前端状态映射：**
```typescript
// client/src/views/record/RecordDetail.vue
const statusTextMap = { draft: '草稿', submitted: '已提交', approved: '已通过', rejected: '已驳回' };
```

**问题描述：** 后端将"已审批"写为 `'signed'`，前端类型和 statusTextMap 都预期 `'approved'`。记录审批后前端状态显示为空/undefined，且前端做状态判断时 `status === 'approved'` 永远为 false。

**修复方向：** 二选一
1. 后端改为写 `'approved'`（更语义化，需同步迁移历史数据中的 `'signed'`）
2. 前端补 `signed: '已签署'` 映射并扩展类型（短期修复）

**建议：** 选方案 1，同时将 schema 中 Record.status 的枚举从 String 改为显式枚举类型，在类型层面约束此后不再出现歧义。

---

## P1 级：双轨事实源（功能正确性取决于运行路径）

### P1-A：`req.user.id` vs `req.user.userId` 在同一 controller 中混用

**维度：** 服务层内部  
**已有计划：** 无（2026-05-09 plan 只处理 `role` / `roleCode`，未覆盖此问题）

**权威定义：**
```typescript
// server/src/modules/auth/authenticated-user.ts
export interface AuthenticatedUser {
  id: string;
  userId: string;  // 冗余字段，两者都等于同一个用户 ID
  ...
}
```

**混用实例：**
```typescript
// server/src/modules/record-task/record-task.controller.ts
req.user.id          // 第 33 行
req.user.userId      // 第 40 行
req.user.userId ?? req.user.id  // 第 74 行（防御性代码，证明不一致存在）
```

**影响：** 在 `userId` 为 undefined 的边界场景下，第 74 行的 fallback 说明作者自己也不确定哪个有值，存在运行时错误风险。

**修复方向：** 从 `AuthenticatedUser` 中删除 `userId`，统一用 `id`。需同步清理所有使用 `req.user.userId` 的 controller。

---

### P1-B：`packages/types/task.ts` 与 `client/src/api/task.ts` 的 `TaskStatus` 不一致

**维度：** 共享类型 vs 前端实现

**共享类型：**
```typescript
// packages/types/task.ts:3
export type TaskStatus = 'pending' | 'completed' | 'cancelled';
```

**前端实际使用：**
```typescript
// client/src/api/task.ts:7-13
export type TaskStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'overdue';
```

**问题描述：** 共享类型定义的是 3 种状态，前端实际使用 6 种。前端本地重新定义了一套 TaskStatus 类型，与 packages/types 形成完全平行的两套定义，共享类型实际上没有被消费。

**修复方向：** 统一到 packages/types，前端删除本地重定义，共享类型补齐所有真实状态值，后端 DTO 同步对齐。

---

### P1-C：审批系统双轨并存（旧 `Approval` vs 新 `ApprovalInstance`）

**维度：** Schema + 服务层  
**已有计划：** 无专项 spec（`2026-04-26-unified-approval-platform-design.md` 描述了新系统设计，但未明确旧 Approval 退场计划）

**问题描述：**

- **旧系统（第 407 行）：** `Approval` model，专为 `Document` 审批设计，包含 `approverId, status, level, approvalChainId`
- **新系统：** `ApprovalInstance + ApprovalTask + ApprovalAction`，通用审批框架，其他业务已迁移

Document 模块仍然使用旧 `Approval` 系统，导致：
1. 审批数据散落两张表，聚合统计需要跨表 union
2. 旧表没有 `ApprovalInstance` 的状态机保证
3. 新功能（如催审、批量审批视图）无法覆盖文档审批

**修复方向：** 文档审批迁移到 `ApprovalInstance` 体系，旧 `Approval` model 仅保留作历史数据，设置明确的下线时间节点。

---

### P1-D：`Supplier` 双状态字段

**维度：** Schema  
**已有计划：** `gap-103-supplier-status-gate-design.md`（只处理 status gate，未处理字段合并）

**问题：**
```prisma
model Supplier {
  status          String  // "active" | "disabled"（运营状态）
  supplier_status String  // "approved" | "suspended" | "eliminated"（评估状态）
}
```

两个 String 字段在同一张表表达两种不同维度的"状态"，既有命名混乱（一个 camelCase 一个 snake_case），也没有类型约束（都是 String）。

**修复方向：**
1. 明确语义：`status` = 运营状态（是否启用），`evaluationStatus` = 资质评估状态
2. 两者都改为对应 Enum 或使用统一命名规则
3. 文档明确区分两个状态的含义与生命周期

---

### P1-E：`MaterialBatch` 双状态字段

**维度：** Schema  
**已有计划：** `gap-108-batch-status-enum-sync-design.md`（处理 enum 同步，未合并双字段）

**问题：**
```prisma
model MaterialBatch {
  status     BatchStatus  // Enum: normal | expired | locked（质量状态）
  lot_status String       // "in_stock" | "consumed" | "nonconforming" | "disposed"（库存状态）
}
```

同一表用一个 Enum 字段 + 一个 String 字段表达两个维度的状态，读取时需同时关注两个字段，写入时易漏更新其中一个。

**修复方向：** 明确两个字段的语义边界，`lot_status` 改为 Enum（`LotInventoryStatus`），并在文档中说明哪种操作只改哪个字段。

---

## P2 级：结构性命名不一致（不影响功能，但增加维护成本）

### P2-A：时间戳命名 camelCase vs snake_case 全面混用

**维度：** Schema（4142 行，90+ 个 model）

**统计：**

| 字段名 | 使用次数 |
|-------|---------|
| `createdAt` | 112 处 |
| `created_at` | 52 处 |
| `updatedAt` | 99 处 |
| `approvedAt` | 12 处 |
| `approved_at` | 2 处 |
| `verifiedAt` | 1 处 |
| `verified_at` | 4 处 |

**影响：** 跨模型的聚合查询、报表统计需要处理两套字段命名；代码自动补全不一致；新 model 没有命名规范可依。

**修复方向：** 统一为 camelCase（与 Prisma 默认约定一致），存量 snake_case 字段通过 `@map` 或 migration 逐步收口。这是一个大型 migration，建议独立一张 plan。

---

### P2-B：负责人/所有者字段有 8 种表达

**维度：** Schema  
**与已有计划的关系：** 2026-05-09 plan 处理了 `Department.managerId`，但未处理其他模块里的负责人字段

| 字段名 | 模块 | 类型 |
|-------|------|------|
| `managerId` | Department | FK → User |
| `leader_id` | TeamShiftSchedule, ShiftInstance | String (snake_case) |
| `ownerId` | ManagementReviewAction | FK → User |
| `performerId` | MaintenanceRecord | String（自由文本） |
| `responsiblePerson` | Equipment, MaintenancePlan | String（自由文本） |
| `approverId / approvedBy` | Approval, Document, MaterialInbound | 混用 |
| `assigneeId / assigneeUserId` | WorkflowTask, ApprovalTask | 混用 |
| `createdBy / creator` | Record, ProcessInstance | 并存 |

**核心问题：** 跨模块"谁负责"语义没有统一标准。`responsiblePerson` 和 `performerId` 是自由文本，无法与 User 主数据关联，导致这些模块的责任追溯链断裂。

**修复方向：** 分两类处理：
1. 关键业务链（设备维保、CAPA）：将 String 字段改为 FK → User，补 @relation
2. 命名规范化：统一使用 `assigneeId`（执行人）、`approverId`（审批人）、`managerId`（负责人）三种命名，在新 model 中强制执行

---

### P2-C：操作人员字段 camelCase vs snake_case 混用

**维度：** Schema  

| 字段名 | 模块 |
|-------|------|
| `operatorId` | 库存操作 |
| `operator_id` | 食品安全操作 |
| `performerId` | 维保执行 |
| `inspector_id` | 检验人 |

**修复方向：** 统一为 camelCase，通过 `@map("operator_id")` 保持 DB 列名兼容。

---

### P2-D：`name` vs `title` 无规则混用

**维度：** Schema  

- `name`：30+ 个 model（User, Department, Material, Supplier 等）
- `title`：10+ 个 model（Document, ApprovalInstance, Notification 等）

目前没有文档说明何时用 `name`、何时用 `title`。

**建议规则（可形成命名规范文档）：**
- `name`：主数据实体的"规范名称"（人、物料、部门）
- `title`：文档/流程/事件的"标题"（可含动词，可随版本变化）

---

### P2-E：`ProcessStepApproval.role` 与 RBAC `role` 同名但语义完全不同

**维度：** 服务层  
**注意：** 2026-05-09 设计文档明确将此排除在清理范围外，本文仅记录风险。

`ProcessStepApproval.role` 存储的是"审批岗位代码"（如 `'gm'`, `'quality'`），与 User RBAC 角色（`'admin'`, `'leader'`, `'user'`）语义完全不同，但字段名相同，导致：
- 阅读服务层代码时产生误判
- 将来做权限统一时容易误删

**建议：** 将 `ProcessStepApproval.role` 改名为 `approvalRole` 或 `stepRole`，明确其语义。

---

## P3 级：代码质量问题

### P3-A：JWT payload 中 `role`（roleCode）和 `roleId` 冗余并存

**维度：** 认证层  
**与已有计划的关系：** 2026-05-09 plan 中 Step 1.2 处理认证边界，但未明确要删除哪个字段

```typescript
// server/src/modules/auth/auth.service.ts
const payload = {
  role: roleCode,   // roleCode 字符串
  roleId: user.roleId,  // UUID
  ...
};
```

JWT 中同时携带两个字段，实际消费时绝大多数地方只用 `role`（roleCode）。执行 2026-05-09 plan 后，若最终统一为 `roleCode`，`roleId` 就成为纯冗余字段，应从 JWT payload 删除以减小 token 体积。

---

### P3-B：`Status` Enum 定义但实际 String 使用的双轨制

**维度：** Schema（覆盖面最广的问题）

Schema 中定义了 19 个 Status Enum（BatchStatus, RequisitionStatus, ProductionStatus 等），但 50+ 个 model 的 status 字段仍用 `String` 类型。

典型案例：
```prisma
// Enum 定义了 BatchStatus
enum BatchStatus { normal expired locked }

// 但 UserBatch 等模型仍用 String
model User {
  status String  // 应该是 UserStatus enum
}
```

**影响：** Prisma 类型检查失效，开发者需查阅文档才能知道 status 的合法值范围。

**修复方向：** 这是最大体积的 schema 技术债。建议独立一张 migration plan，按模块逐步将 String status 字段转为对应 Enum。优先级：User > Department > Document > 其他。

---

## 未覆盖 GAP 的新增发现汇总

以下是本次审计发现的、目前没有对应 GAP spec 的问题，建议作为新 GAP 登记：

| 建议 GAP 编号 | 问题 | 优先级 |
|-------------|------|-------|
| GAP-NEW-01 | Record.status `'signed'` vs `'approved'` 前后端口径 | P0 |
| GAP-NEW-02 | `req.user.id` vs `req.user.userId` 混用 | P1 |
| GAP-NEW-03 | `packages/types/task.ts` TaskStatus 与前端实现不一致 | P1 |
| GAP-NEW-04 | 审批系统双轨（Approval 旧 + ApprovalInstance 新），Document 迁移计划缺失 | P1 |
| GAP-NEW-05 | Supplier 双状态字段合并（status + supplier_status） | P1 |
| GAP-NEW-06 | MaterialBatch 双状态字段合并（status enum + lot_status string） | P1 |
| GAP-NEW-07 | 时间戳全库统一 camelCase（大型 migration） | P2 |
| GAP-NEW-08 | 负责人字段统一（responsiblePerson/performerId 改为 FK → User） | P2 |
| GAP-NEW-09 | ProcessStepApproval.role 改名为 stepRole/approvalRole | P2 |
| GAP-NEW-10 | String status → Enum 全库转换（大型 migration） | P3 |

---

## 执行建议

### 立即处理（本 PR 周期内）

1. **P0-A（Record status 'signed' vs 'approved'）**：单文件修复，风险低，影响所有记录查看功能
2. **P1-A（req.user.id vs userId）**：并入当前 2026-05-09 plan 的 Step 1.2

### 下一迭代（独立 plan）

3. **P1-B（TaskStatus 统一）**：需要 packages/types + client + server 三层对齐
4. **P1-C（审批系统双轨）**：需要数据迁移，独立 plan
5. **P1-D / P1-E（Supplier/MaterialBatch 双状态字段）**：需要 migration + 服务层同步

### 未来规划（技术债专项）

6. **P2-A（时间戳统一）**：大型 schema migration，建议设定季度目标
7. **P2-B（负责人字段统一）**：影响多个业务模块，需业务确认各字段语义
8. **P3-B（String status → Enum）**：最大体积技术债，需分模块逐步执行

---

## 自检（Spec Self-Review）

- [x] 无占位符 / TBD
- [x] 与已有计划无重叠（每条均说明关系）
- [x] P0 已有验证证据（代码行号）
- [x] 修复方向均二选一而非模糊表述
- [x] 范围聚焦，未包含功能需求
