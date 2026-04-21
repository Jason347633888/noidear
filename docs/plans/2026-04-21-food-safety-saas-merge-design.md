# 食品安全 SaaS 合并设计文档

> 创建日期：2026-04-21
> 状态：已确认，待实施
> 基础项目：noidear（Vue 3 + NestJS + Prisma + PostgreSQL）

---

## 背景

将食品安全管理 SaaS 产品构思（48 个实体、20 个业务模块）合并进 noidear 现有代码库。noidear 完成度 85.6%，技术栈成熟，直接在其基础上扩展，不新建仓库。

目标：将揭阳市港荣时尚食品有限公司 260 份纸质记录表单数字化，支持 BRCGS 4 小时追溯演练，提供完整的食品安全管理体系 SaaS。

---

## 执行方案：方案一（先清理再扩展）

三个阶段顺序执行：

```
阶段一：清理冗余模块（1-2 天）
阶段二：食品安全数据层（3-5 天）
阶段三：逐批开发业务模块（按追溯链优先级）
```

---

## 第一节：整体架构

### 基础设施（不变）
- **PostgreSQL 15+**：主数据库
- **Redis 7+**：缓存、会话
- **MinIO 8+**：文件存储（文档附件、图片）
- **ElasticSearch**：移除，改用 PostgreSQL 全文搜索

### 客户端
- **PC Web**：Vue 3 + Element Plus（现有 noidear client）
- **微信小程序**：uni-app，独立客户端，连接同一套后端 API

### 后端
- NestJS 10+，Prisma ORM，现有模块结构不变

---

## 第二节：模块清理决策

### 删除模块
| 模块 | 原因 |
|------|------|
| `agent` | MCP/AI 审计日志，改用 CLI，无需此模块 |
| `recommendation` | 推荐引擎，食品安全场景无用 |
| `i18n` | 国际化，目标市场国内，中文足够 |
| `todo` | 个人待办，并入 `record-task` 正式派发流程 |
| `search`（ES 部分） | 移除 ElasticSearch 依赖，保留 PostgreSQL LIKE 查询 |

### 合并模块
| 模块 | 合并去向 |
|------|----------|
| `process`（RD-001 产品研发流程） | 并入工作流引擎（`workflow`），作为一种工作流模板配置 |

### 保留模块（全部）
`approval` / `audit` / `auth` / `backup` / `batch-trace` / `department` / `deviation` / `document` / `equipment` / `export` / `fine-grained-permission` / `health` / `import` / `internal-audit` / `mobile` / `monitoring` / `notification` / `operation-log` / `permission` / `record` / `record-task` / `record-template` / `recycle-bin` / `role` / `statistics` / `system-config` / `training` / `user` / `warehouse` / `wechat` / `workflow`

### 修改模块
- **`auth`**：移除企业 OAuth2，保留 JWT + LDAP（可选配置）；新增微信小程序登录（`wx.login` → openid → JWT）
- **`document`**：文档内容改为 Markdown 存库，加食品安全元数据字段，加图片上传至 MinIO
- **`deviation`**：连接新增的 `NonConformance` + `CorrectiveAction` 模型
- **`warehouse`**：扩展现有入出库逻辑，对接新 `InventoryMovement` 模型

---

## 第三节：数据层

### 修改现有 Prisma 模型
| 模型 | 新增字段 |
|------|----------|
| `Document` | `doc_code`、`doc_level`（一/二/三/四级）、`department`、`fill_frequency`、`retention_years`、`reviewer`、`approver`、`effective_date`、`content_md`（Markdown 正文） |
| `Material` | `material_type`（raw/auxiliary/packaging）、`is_allergen`、`allergen_notes`、`shelf_life_days` |
| `MaterialBatch` | `supplier_lot_no`、`storage_confirmed`、`lot_status` enum |
| `ProductionBatch` | `output_qty`、`loss_qty`、`sample_qty`、`waste_qty`、`released_by`、`released_at`、`shift`、`production_line` |
| `Supplier` | `status` enum（approved/suspended/eliminated）、`last_evaluated_at` |
| `Equipment` | `process_step_id`（关联工序步骤） |

### 新增 Prisma 模型（约 30 个）

**追溯链支撑**
- `SupplierDocument`（供应商资质文件，含到期提醒）
- `IncomingInspection` + `IncomingInspectionResult`（来料检验）
- `InventoryMovement`（统一入/出/调拨/成品记录）
- `StockCount`（库存盘点）
- `DeliveryNote`（发货记录，ProductionBatch ↔ SalesOrder 桥接）
- `Sample`（留样，独立生命周期）

**产品/配方**
- `Product`（成品档案）
- `Recipe` + `RecipeLines`（配方版本管理）
- `ProcessStep`（工序步骤）
- `CCPPoint`（CCP 监控点定义）
- `CCPRecord`（CCP 监控记录）
- `InspectionStandard` + `InspectionItems`（检验标准）

**质量合规**
- `NonConformance`（不合格品，多态：来料/生产/成品）
- `CorrectiveAction`（纠正措施 CAPA）
- `CustomerComplaint`（顾客投诉）
- `ReworkRecord`（返工记录）
- `FragileItemInspection`（易碎品检查）
- `MeasuringEquipment`（测量设备）
- `CalibrationRecord`（校准记录）

**过程监控**
- `EnvironmentRecord`（温湿度/压差）
- `ProcessRecord`（炉温、炉速等工艺参数）
- `MetalDetectionLog`（金属探测）
- `CleaningRecord`（清洁消毒）

**人员合规**
- `ViolationRecord`（违规记录）
- `MedicationRecord`（员工用药）
- `VisitorRecord`（访客登记）
- `EmergencyDrillRecord`（应急演练）

**变更 / 废弃物**
- `ChangeEvent`（变更申请）
- `ChangeVerificationRecord`（变更验证）
- `DocumentIssuance`（文件领用）
- `WasteDisposalRecord`（废弃物销毁）
- `WasteRecord`（废料统计）

**评估层**
- `SupplierEvaluation`（供应商评估）

所有新模型统一包含：`company_id`（多租户）、`created_at`、`updated_at`、`deleted_at`（软删除）。

---

## 第四节：后端模块开发顺序

按追溯链优先级分批开发：

### 第一批（追溯链核心，MVP 必须）
```
incoming-inspection/    来料检验
inventory-movement/     库存移动（统一出入库）
production-release/     生产批次放行
delivery-note/          发货记录
traceability/           追溯查询（正向/反向/物料平衡）
```

### 第二批（质量合规）
```
ccp/                    CCP 监控点 + 监控记录
non-conformance/        不合格品处置
corrective-action/      纠正措施 CAPA
customer-complaint/     顾客投诉
```

### 第三批（过程监控）
```
environment-record/     环境温湿度
process-record/         过程参数（炉温等）
metal-detection/        金属探测
cleaning-record/        清洁消毒
```

### 第四批（人员/设备/合规）
```
measuring-equipment/    测量设备 + 校准
violation-record/       员工违规
supplier-evaluation/    供应商评估
change-event/           变更管理
waste/                  废弃物管理
```

每个模块结构：`module → controller → service → dto`，复用现有权限守卫、审计日志、异常拦截器。

---

## 第五节：前端

### 删除
- `client/src/views/todo/`
- `client/src/views/search/`（保留搜索框，移除 ES 逻辑）
- `client/src/i18n/`（整个目录）

### 修改
- 文档管理页：加元数据表头表单 + Markdown 编辑器（`md-editor-v3`）
- 仓库页面：扩展入出库表单字段
- 偏离页面：连接不合格品处置流程

### 新增页面（与后端同批次开发）
四批与后端模块对应，每批前后端同步开发。

---

## 第六节：微信小程序

### 技术栈
**uni-app**（一套代码编译微信小程序，后期可扩展 H5/APP）

### 目录
```
miniprogram/    ← 新建在 noidear 根目录下
```

### 三个核心页面
| 页面 | 功能 |
|------|------|
| 表单填写 | 接收派发任务 → 填四级记录 → 提交 |
| 审批 | 待审批列表 → 查看内容 → 通过/驳回 |
| 数据看板 | 产率趋势、人均产出、本月汇总图表（ECharts） |

### 登录
`wx.login()` → 后端换取 JWT → 后续请求带 token，与 PC 端同一套 API。

---

## 第七节：工作流引擎与体系程序的关系

体系程序（如 CX-26 产品研发流程）通过工作流引擎配置，无需单独写代码：

1. 管理员创建 `WorkflowTemplate`，每个步骤绑定一个 `RecordTemplate`
2. 发起 `WorkflowInstance` 后，系统自动派发第一步的填表任务
3. 表单提交 + 审批通过 → 工作流引擎自动推进到下一步
4. 所有体系程序（CX-26 产研、CX-10 来料、内审流程等）均用此机制配置

原 `process` 模块（RD-001）的逻辑完全被此机制覆盖，不再单独维护。

---

## 第八节：错误处理与测试

### 错误处理
复用 noidear 现有全局异常拦截器和 `ApiResponse<T>` 格式。新增食品安全业务错误码：
- `TRACEABILITY_CHAIN_BROKEN`：批次找不到上游原料
- `CCP_RECORD_MISSING`：批次未完成所有 CCP 监控
- `DOCUMENT_VERSION_CONFLICT`：审批中文档不可编辑

### 测试策略
- 新模块按 noidear 规范写 E2E 测试
- 追溯查询（正向/反向/物料平衡）单独写集成测试
- 微信小程序暂用手动测试验证主流程

---

## 决策记录

| 决策 | 结论 | 原因 |
|------|------|------|
| 是否新建仓库 | 否，在 noidear 原地扩展 | 架构成熟，无需重建 |
| 文档内容存储 | Markdown 存库 + MinIO 图片 | 可搜索，迁移成本低，支持插图 |
| 搜索引擎 | 移除 ES，用 PostgreSQL | 降低部署复杂度 |
| 登录方式 | JWT + 微信小程序登录 | 满足工厂场景，LDAP 保留为可选配置 |
| 移动端方案 | uni-app 微信小程序 | 覆盖填表/审批/看板三个场景 |
| process 模块 | 并入工作流引擎 | 本质相同，统一配置更灵活 |
| i18n | 删除 | 国内市场，中文足够 |
| ElasticSearch | 删除 | 食品安全场景精确查找为主，PG 够用 |
