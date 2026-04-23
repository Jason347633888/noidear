# Vault SaaS 构思同步实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以当前更新后的 `04-记录表单` 与整个 vault 为唯一 source of truth，全面更新 `SaaS产品构思`、其字段映射、数据模型缺口和仓库内相关引用。

**Architecture:** 先建立“差异清单”，再按文档层级回写：总览层、数据模型层、功能设想层、字段映射层、缺口汇总层。所有更新以最新编号、最新字段表达和最新实体关系为准，避免继续沿用旧编号或旧语义。

**Tech Stack:** Markdown 文档、Node.js 脚本、现有 vault 路径、仓库内文档引用同步。

---

### Task 1: 生成 vault 与现有构思的差异清单

**Files:**
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/**/*.md`
- Read: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/**/*.md`
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/plans/2026-04-22-vault-saas-construct-sync.md`

- [ ] **Step 1: 统计当前 vault 的表单总数、部门分布、编号列表**
- [ ] **Step 2: 统计现有 SaaS 构思里的表单总数、编号列表、字段映射文件列表**
- [ ] **Step 3: 输出三类差异：新增表单、编号变更、字段表达新增**
- [ ] **Step 4: 保存差异摘要到计划文档末尾，作为后续回写依据**

### Task 2: 更新产品总览与数据模型总览

**Files:**
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/00-产品总览.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/01-数据模型.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/04-数据模型缺口汇总.md`

- [ ] **Step 1: 用最新 vault 口径更新表单总数、部门总数、来源说明**
- [ ] **Step 2: 按最新字段映射修正核心实体清单、补充实体和优先级描述**
- [ ] **Step 3: 将“未覆盖”条目改成最新缺口状态，并删除已被新语义覆盖的旧缺口**
- [ ] **Step 4: 检查总览中的旧编号、旧表单名和旧统计值并全部替换**

### Task 3: 更新功能设想与字段语义层

**Files:**
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/02-功能设想.md`

- [ ] **Step 1: 用最新实体关系和表单语义重写模块边界**
- [ ] **Step 2: 把新增表达补进功能层，例如表格字段、审批节点、条件显隐、自动带出**
- [ ] **Step 3: 校准各模块中的实体引用名称、字段语义和说明文字**

### Task 4: 更新字段映射总表与分部映射表

**Files:**
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-产品开发部.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-制造部1.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-制造部2.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-制造部3.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-制造部4.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-品质部1.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-品质部2.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-品质部3.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-品质部4.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-行政人事部1.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-行政人事部2.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-仓储组.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-工程部.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-采购部.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-质检组.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-营销部.md`

- [ ] **Step 1: 统一修正表单编号、表单名称、字段名与实体映射**
- [ ] **Step 2: 补足新增字段表达对应的映射类型**
- [ ] **Step 3: 把已废弃或已改名的旧字段从映射表中剔除**
- [ ] **Step 4: 更新总表里的部门表单数和完成状态**

### Task 5: 同步仓库内引用与说明文档

**Files:**
- Modify: `docs/DESIGN.md`
- Modify: `docs/REQUIREMENTS.md`
- Modify: `docs/BUSINESS_RULES.md`
- Modify: `docs/AGENT_GUIDE.md`
- Modify: `README.md`

- [ ] **Step 1: 查找并更新所有引用旧编号或旧统计值的段落**
- [ ] **Step 2: 将项目说明中的表单总数、阶段说明、数据来源改为最新口径**
- [ ] **Step 3: 保持仓库内与 vault 口径一致，不再保留旧版数字作为事实描述**

### Task 6: 做一致性复查与收尾

**Files:**
- Read: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/**/*.md`
- Read: `docs/**/*.md`

- [ ] **Step 1: 检查是否仍存在旧编号、旧总数、旧实体名**
- [ ] **Step 2: 检查字段映射和数据模型是否互相引用一致**
- [ ] **Step 3: 记录剩余差异与后续可继续拆分的子任务**
- [ ] **Step 4: 确认计划完成后进入实施节奏**

---

## 差异摘要

### 已确认的主要变化

- vault 目录中的表单编号和内容已更新，不能继续沿用旧版 `SaaS产品构思` 的编号口径。
- `SaaS产品构思` 当前文档里仍保留旧统计值和旧编号，需要整体回写。
- 字段映射中需要补上新增表达的语义层，不只是实体映射。
- 仓库内说明文档也需要同步最新总数、来源和口径。

