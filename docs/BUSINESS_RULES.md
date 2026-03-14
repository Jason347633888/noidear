# 业务规则文档（Agent 可读）

> 本文档描述系统的核心业务约束，供 AI Agent 理解业务语义。
> 代码中的业务规则以本文档为准，保持同步更新。

---

## 一、研发流程规则（ProcessInstance）

### 步骤顺序
- 必须从 Step1 开始，按序提交，不可跳步
- `stepNumber` 必须等于当前 `instance.currentStep`，否则返回 `PROCESS_WRONG_STEP`

### 草稿规则
- `saveAsDraft=true`：保存数据但不推进 `currentStep`，可重复保存
- `saveAsDraft=false`：提交并推进（Step7/8 除外）

### 步骤推进规则
- Step1~6 提交后：`currentStep + 1`
- Step7/8 提交后：**不自动推进**，等待 HACCP 角色调用 `POST /:id/approve`
- Step9 提交后：`processInstance.status → COMPLETED`，流程结束，不可再编辑

### 审批规则
- Step7/8 审批通过（action=approve）：`currentStep + 1`
- Step7/8 审批驳回（action=reject）：`currentStep - 1`，数据保留，申请人可重新填写

### 角色要求
- 审批 Step7/8：代码层面当前未强制限制角色，
  调用 POST /:id/approve 的任意认证用户均可执行。
  （注：ApprovalStepField 组件层面限制了角色为 admin/HACCP/manager，
  但后端无对应 Guard，仅作前端展示控制。）

---

## 二、仓库规则（Warehouse）

### 出库规则
- 遵循 **FIFO（先进先出）**：系统按入库时间自动选择最早批次出库
- **不可手动指定批次**，指定批次的请求会被拒绝

### 库存预警
- 当 `quantity < safetyStock` 时，系统触发采购预警通知
- 预警不阻止操作，仅通知

### 物料管理
- 删除物料前提：库存为 0 且无关联未完成订单
- 物料编码（`materialCode`）全局唯一，不可重复

---

## 三、权限规则

| 角色 | 权限 |
|------|------|
| `admin` | 全部操作 |
| `manager` | 查看所有记录 + 审批 Step7/8 |
| `HACCP` | 审批 Step7/8 |
| 普通用户 | 只能操作自己创建的记录，查看公开文档 |

---

## 四、不可逆操作清单（调用前必须二次确认）

| 操作 | API 端点 | 说明 |
|------|---------|------|
| 删除研发流程 | `DELETE /process/instances/:id` | 删除后数据不可恢复 |
| 文档归档 | `POST /documents/:id/archive` | 归档后变为只读 |
| 文档作废 | `POST /documents/:id/obsolete` | 作废后不可恢复为草稿 |
| 出库操作 | `POST /warehouse/requisitions/:id/complete` | 完成后触发 FIFO 扣库，不可撤销 |

---

## 五、数据模型关键说明

### ProcessInstance.status 枚举
- `DRAFT`：刚创建，未开始填写（创建时默认为 DRAFT，由 Prisma schema default 设定）
- `IN_PROGRESS`：填写中（Step1 提交后进入此状态）
- `COMPLETED`：Step9 提交后
- `REJECTED`：被驳回（当前未使用，保留用于扩展）

### ProcessStepData.status 枚举
- `PENDING`：未开始
- `IN_PROGRESS`：草稿保存中
- `SUBMITTED`：已提交待审批（Step7/8）或已完成（其他步骤）
- `APPROVED`：审批通过
- `REJECTED`：审批驳回
