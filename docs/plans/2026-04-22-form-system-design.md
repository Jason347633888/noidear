# 食品安全 SaaS 全量表单系统设计文档

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 vault 263 张四级记录表单全量复刻到 SaaS 系统，同时落地 ProductionRun 生产追溯体系、文件生命周期管理、定期任务引擎、移动端、管理层仪表盘、完整 CAPA 闭环。

**Architecture:** 四层锚点驱动——Company → ShiftInstance（班次）→ ProductionRun（生产段）→ FormRecord（表单记录）。表单引擎升级支持 9 类字段类型 + 9 类实体关联，解析脚本批量导入 263 张表单模板，追溯链路核心表单单独精确实现。

**Tech Stack:** NestJS + Prisma + PostgreSQL（后端），Vue 3 + Element Plus（前端），移动端 PWA

**Source of Truth:** `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/` — 263 张表单 .md 文件

---

## 一、核心锚点体系

### 四层结构

```
Company
└── ShiftInstance（班次实例）
    ├── shift_type: '白班' | '夜班'
    ├── shift_date: 开班日期（夜班跨午夜取开班当天日期）
    ├── opened_by: 开班人
    └── ProductionRun（生产运行段）
        ├── production_line: 产线编号
        ├── product_id: 产品
        ├── started_at / ended_at
        └── FormRecord（表单记录）
            ├── template_id
            ├── document_no: 单据号
            ├── data_json
            └── entity_links[]
```

### ShiftInstance 生命周期

```
开班（创建 ShiftInstance）→ 开产（创建 ProductionRun）→ 填表 →
换产（触发 LineChangeCheckRecord → 关闭当前 Run → 开新 Run）→
关班（所有 Run 汇总，生成班次报告）
```

### ProductionRun 生命周期

```
开产 → [生产中，填配料表/CCP/金检等] → 换产检查（LineChangeCheckRecord）→
关产 → 自动生成 ProductionBatch，汇总关联所有 FormRecord
```

---

## 二、表单引擎升级

### fieldsJson 新增字段类型

| 类型 | 用途 | 示例 |
|------|------|------|
| `text` | 文本输入 | 备注 |
| `number` | 数值输入 | 温度、重量 |
| `enum` | 单选，带 options 列表 | 班次、结论 |
| `multi-enum` | 多选 | 不合格原因 |
| `inspection-table` | 三列检验表：标准要求\|实测值\|单项结论 | CCP 监控 |
| `checklist` | 多项勾选确认 | 换产前检查项 |
| `date` / `datetime` | 日期时间 | 生产日期 |
| `photo` | 拍照附件 | 玻璃完整性检查 |
| `signature` | 数字签名 | 操作员确认 |

### fieldsJson 结构示例

```json
{
  "sections": [
    {
      "title": "A 部分：基本信息",
      "fields": [
        {
          "name": "shift_instance_id",
          "label": "班次",
          "type": "entity-link",
          "entity": "shift_instance",
          "required": true,
          "autoFill": true
        },
        {
          "name": "temperature",
          "label": "中心温度",
          "type": "number",
          "unit": "°C",
          "required": true,
          "defaultValue": null,
          "validRange": { "min": -5, "max": 200 }
        },
        {
          "name": "result",
          "label": "检验结论",
          "type": "enum",
          "options": ["合格", "不合格", "待定"],
          "required": true
        }
      ]
    }
  ],
  "conditionalRules": [
    {
      "when": { "field": "result", "equals": "不合格" },
      "show": ["remark", "action_taken"]
    }
  ]
}
```

### 实体关联扩展（9 类）

| 实体类型 | 说明 |
|---------|------|
| `shift_instance` | 班次 |
| `production_run` | 生产段 |
| `material_lot` | 原料批次 |
| `supplier` | 供应商 |
| `production_batch` | 生产批次 |
| `finished_goods_batch` | 成品批次 |
| `product` | 产品档案 |
| `recipe` | 配方版本 |
| `equipment` | 设备 |

### 单据号规则

格式：`{模板代码}-{YYYYMMDD}-{4位序号}`

示例：`PL-RECIPE-20260422-0003`（当日第3张配料表）

序号按模板代码 + 日期维度自增，每天从 0001 重置。

---

## 三、263 张表单落地策略

### 自动解析（~240 张）

vault 中每张 .md 记录表单均含字段清单表格，格式固定：

```
| 字段名 | 类型 | 单位 | 必填 | 填写方式 | 默认值/取值范围 |
```

写解析脚本：
1. 遍历 `04-记录表单/**/*.md`
2. 提取字段清单表格 → 转换为 `fieldsJson`
3. 提取表单名称、编号、所属部门 → 生成 `RecordTemplate` 记录
4. 批量 upsert 到数据库

### 精确实现（核心追溯表单 ~20 张）

以下表单需要单独精确页面，支持智能预填和强实体关联：

- 配料表（BatchMaterialUsage，预填原料批次）
- 生产记录（关联 ProductionRun + ProductionBatch）
- 来料检验单（关联 MaterialLot + Supplier）
- CCP 监控记录（关联 CCP 控制点）
- 金属探测记录（关联 ProductionRun）
- 成品检验单（关联 FinishedGoodsBatch）
- 换产检查确认（LineChangeCheckRecord，触发 ProductionRun 切换）

---

## 四、智能预填

当工人打开配料表时：
1. 系统读取当前 ProductionRun 的 `product_id`
2. 查询该产品当前激活配方的 `RecipeLine`（物料清单）
3. 对每种物料，查询仓库已分配给该 ProductionRun 的 `MaterialLot`
4. 预填批号栏，工人确认实投量即可

---

## 五、班次完成度看板

当前班次实时显示：

- 每个 ProductionRun 的必填表完成率（百分比 + 进度条）
- 缺失记录类型列表（红色高亮）：CCP 未填、金检未录、环境温度未记录
- 超时未操作提醒（距上次 CCP 记录超过设定间隔）

必填表清单由 `RecordTemplate.is_mandatory + linked_trigger` 配置。

---

## 六、文件生命周期管理

### Document 模型扩展

```
Document
├── level: 1 | 2 | 3 | 4  // 文件层级
├── status: 'draft' | 'review' | 'approved' | 'effective' | 'superseded'
├── version: string        // 如 v2.1
├── effective_date: Date
├── review_due_date: Date  // 下次评审日期
├── approved_by: User
└── superseded_by: Document  // 被哪个新版本替代
```

### 文件更新通知 + 培训确认

文件状态变为 `effective` 时：
1. 系统查询该文件关联岗位（通过 DocumentScope 表）
2. 向相关员工发送通知
3. 员工在系统内确认已阅读 → 生成培训记录
4. 管理员可查看各员工确认状态

---

## 七、定期任务引擎

### 程序文件驱动周期性任务

新增 `ScheduledTaskRule` 模型：

```
ScheduledTaskRule
├── source_document_id: Document  // 来源程序文件
├── task_name: string
├── cron_expression: string       // 如 "0 0 1 * *"（每月1日）
├── assignee_role: string         // 指派角色
├── form_template_id: string      // 触发填写的表单模板
└── reminder_days_before: number  // 提前N天提醒
```

系统按 cron 自动生成 `RecordTask`，到期未完成则升级告警。

---

## 八、移动端 + 图片附件

- 前端所有表单页面响应式设计，支持手机填写
- `photo` 类型字段：调用设备摄像头，图片上传 OSS，存 URL
- 关键页面（填表、开产、开班）优先完成移动端适配
- PWA 配置，支持添加到主屏幕

---

## 九、完整 CAPA 闭环

```
NonConformance（不合格品/事项）
    ↓ 自动或手动触发
CorrectiveAction（纠正措施）
    ├── root_cause: string
    ├── action_plan: string
    ├── due_date: Date
    ├── assigned_to: User
    └── status: 'open' | 'in_progress' | 'pending_verification' | 'closed'
    ↓ 措施实施完成
VerificationRecord（验证记录）
    ├── verified_by: User
    ├── verification_method: string
    ├── result: 'effective' | 'ineffective'
    └── evidence_links: FormRecord[]
    ↓ 验证有效
[关闭] 统计进入趋势分析
```

趋势分析：按类别/部门/时段统计不合格发生率、平均关闭周期、复发率。

---

## 十、管理层仪表盘

### KPI 看板

| 指标 | 数据来源 |
|------|---------|
| 不合格品率（本月） | NonConformance |
| 纠正措施按时关闭率 | CorrectiveAction |
| CCP 合格率 | FormRecord（CCP 类型） |
| 供应商合格率 | IncomingInspection |
| 内审发现项关闭率 | InternalAudit |
| 员工培训完成率 | TrainingRecord |

### BRCGS 审核准备度

- 哪些必备记录本月有缺失（按程序文件要求）
- 哪些体系文件即将过审核期（`review_due_date` 在 30 天内）
- 哪些纠正措施超期未关闭

### 成品批次追溯 PDF 导出

任意成品批次 → 一键生成 PDF：
- 封面：批次基本信息、生产日期、产品规格
- 原料追溯：所有原料批次 + 供应商 + 来料检验结论
- 生产过程：ProductionRun 记录 + CCP 监控数据
- 质量检验：在线检验 + 出货检验结论
- 签名页：各环节操作员、班长、QC 确认签名

---

## 实施顺序

| 阶段 | 内容 | 优先级 |
|------|------|--------|
| 1 | ShiftInstance + ProductionRun 模型 + 开班/开产/换产/关产流程 | 最高 |
| 2 | fieldsJson 引擎升级（9 类字段 + 9 类实体关联 + 单据号） | 最高 |
| 3 | 263 张表单自动解析脚本 + 批量导入 | 高 |
| 4 | 核心追溯表单精确实现 + 智能预填 | 高 |
| 5 | 班次完成度看板 | 高 |
| 6 | 文件生命周期管理 + 更新通知 + 培训确认 | 中 |
| 7 | 定期任务引擎（cron 驱动） | 中 |
| 8 | 移动端适配 + 图片附件 | 中 |
| 9 | 完整 CAPA 闭环 + 趋势分析 | 中 |
| 10 | 管理层仪表盘 + BRCGS 准备度 + 批次追溯 PDF | 中 |
