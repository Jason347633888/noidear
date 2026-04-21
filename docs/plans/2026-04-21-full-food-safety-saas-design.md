# 食品安全 SaaS 全量实施设计文档

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Vault 中 260 份四级表单、18 个缺口实体、产品研发体系、二/三级文件落地规则全部实施到 SaaS 系统，并通过 Chrome DevTools MCP 完成端到端追溯演练验证。

**Architecture:** 四层映射驱动开发——一级管理手册→系统配置层，二级程序文件→业务逻辑层（工作流/审批链），三级作业指导书→操作引导层（表单内嵌说明），四级记录表单→数据层（数据库+录入界面）。260 份表单按语义归一化，同类记录共用数据实体，通过类型字段区分，不做"一表一模块"。

**Tech Stack:** NestJS + Prisma + PostgreSQL（后端），Vue 3 + Element Plus（前端），Chrome DevTools MCP（E2E 验证）

**Source of Truth:** `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/` — 特别是 `04-数据模型缺口汇总.md`、`01-数据模型.md`、`05-数据库Schema.md`

---

## 实施范围

### Group 1：追溯链路关键节点（优先级：最高）

7 步追溯链：接收原料 → 仓储移动 → 生产加工 → 包装 → 成品储存 → 发运 → 客户

**当前缺口：**
- 来料检验：后端 API 完整，缺前端页面
- 产品目录 + 配方：Prisma 模型存在，无后端 controller，无前端
- 配料表填写入口：BatchMaterialUsage 后端存在，无独立填写 UI

### Group 2：缺口汇总中尚未实施的实体（优先级：高/中）

来源：`04-数据模型缺口汇总.md`，519 个未覆盖字段归并为 18 实体，其中已实施 7 个，待实施 11 个：

| 实体 | 中文名 | 优先级 |
|------|--------|--------|
| ReworkRecord | 回料/返工记录 | 高 |
| FragileItemInspection | 玻璃及硬塑完整性检查 | 高 |
| ChangeVerificationRecord | 工艺/配料变更验证记录 | 高 |
| ChangeApproval | 变更审批记录 | 高 |
| LineChangeCheckRecord | 换产前检查确认记录 | 高 |
| ChangeComplianceRecord | 变更合规性评估记录 | 中 |
| FoodSafetyCultureRecord | 食品安全文化建设记录 | 中 |
| AssetLoanRecord | 资产借用记录 | 中 |
| DocumentIssuance | 表单领用记录 | 中 |
| ExternalParty | 外部方档案（客户+收运单位统一建模）| 中 |
| PackagingMaterialUsage | 包装材料用量记录 | 低 |

### Group 3：产品研发系统（优先级：高）

- 产品档案 CRUD（名称、规格、类别、状态）
- 配方管理（RecipeLine：物料+目标用量+单位+过敏原标识，版本管理：变更创建新版本，旧版本归档）
- 工艺参数（工序步骤、关键控制参数、CCP 点关联）
- 变更管理全流程审批链：ChangeEvent → ChangeComplianceRecord → ChangeVerificationRecord → ChangeApproval

### Group 4：二/三级文件落地到系统行为（优先级：中）

- 二级程序文件 → 自动化工作流触发规则：
  - 来料检验不合格 → 自动创建不合格品处置单
  - 变更提交 → 自动触发合规性评估流程
  - CCP 超标 → 自动创建纠正措施单
- 三级作业指导书 → 表单内嵌操作说明（填写时显示对应作业指导内容）

### Group 5：Chrome DevTools MCP 端到端演练验证

完整走通追溯链路，验证从原料到客户的正向/反向追溯，结果截图留档作为 BRCGS 审核备查材料。

---

## 关键数据模型决策（来自 Vault）

1. **配方版本**：每次变更创建新 Recipe 记录（版本号递增），历史生产批次保留原版本 FK；旧版本标记 `status: archived`
2. **不合格品多态**：`source_type`（material_lot / production_batch / product）+ `source_id` 单表承载多来源
3. **IngredientUsage 桥接**：MaterialLot → ProductionBatch 通过 IngredientUsage 桥接，存实投量、复核人
4. **260 份表单语义归一**：同类记录共用实体，用 `record_type` / `template_id` 区分，不一表一模块
5. **ExternalParty 统一建模**：营销部客户档案 + 行政人事部收运单位档案，用 `party_type` 区分

---

## 已实施模块（不重复实施）

CleaningRecord ✅、ProcessRecord ✅、EnvironmentRecord ✅、ViolationRecord ✅、MetalDetectionLog ✅、WasteDisposalRecord ✅、EmergencyDrillRecord ✅、MedicationRecord ✅、VisitorRecord ✅（共 9 个 Group 2 实体已实施）

---

## 实施顺序建议

1. Group 1（追溯链路）→ 2. Group 3（产品研发）→ 3. Group 2 高优先级实体 → 4. Group 2 中/低优先级实体 → 5. Group 4（工作流规则）→ 6. Group 5（E2E 验证）
