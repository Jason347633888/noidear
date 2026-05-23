# noidear-chat 前端推导 Shortcut Registry 草稿规则

**日期：** 2026-05-22
**状态：** 草稿生成规则，供实现 `frontend-derived-shortcut-registry.json` 使用
**目标：** 尽量用现有前端推导 CLI shortcut 覆盖面，先生成完整草稿，再由用户最后一次性检查。

---

## 推进口径

本轮不要求用户逐个补业务闭环。实现时先用前端推导：

1. 从 `client/src/navigation/menu.ts` 抽菜单域和页面入口。
2. 从 `client/src/router/index.ts` 抽 path 到 Vue view 的映射。
3. 从 `client/src/views/**/*.vue` 抽按钮、表单、页面方法和调用顺序。
4. 从 `client/src/api/*.ts` 抽前端 API adapter 的 method/path。
5. 从 `server/src/modules/**/*controller.ts` 校验后端 route 和 handler。

风险、确认门、幂等、审计、E2E 样例仍然是 registry 字段，但不阻塞草稿生成。推不出来就写 `needs-review`，保留 `sourceEvidence`，最后交给用户统一检查。

---

## 推导规则

| 前端信号 | 推导结果 |
|---|---|
| 菜单入口 | 生成 read/list shortcut 或 API command alias |
| `openCreateDialog`、`handleCreate`、`create*` | 生成 `+*-create` 或领域命名 shortcut |
| `handleSubmit`、`submit*` | 生成 submit/transition shortcut |
| `handleApprove`、`handleReject` | 生成审批 decision shortcut |
| `handleComplete`、`complete*` | 生成 complete shortcut |
| `handleCancel`、`cancel*` | 生成 cancel shortcut |
| `handleArchive`、`archive*`、`publish*` | 生成归档/发布 shortcut |
| `handleDelete`、`remove*` | 生成 delete/destructive shortcut 草稿 |
| `export*`、`download*` | 生成 export/download shortcut |
| 直接 `request.*` 调用 | 记录为 view-level source evidence |
| API adapter 调用 | 绑定 operationIds 和 schema |

置信度规则：

| Confidence | 解释 |
|---|---|
| `high` | 单页面、单 API 或清晰列表/创建/导出动作，字段来自前端表单和 DTO |
| `medium` | 多 API 串联，前端调用顺序清楚，但有状态流转 |
| `low` | 涉及多个页面或详情页、批量动作、上传、库存、审批、追溯 |
| `needs-review` | 前端有动作但 API/DTO/状态含义无法稳定推断 |

`low` 和 `needs-review` 不阻塞生成，只影响最后 review 报告分组。

---

## Registry 字段

```json
{
  "name": "+environment-record",
  "domain": "equipment-site",
  "description": "创建环境温湿度/压差记录",
  "triggerExamples": ["补一条环境温湿度记录"],
  "sourceRoute": "/environment-records",
  "sourceView": "client/src/views/environment-record/EnvironmentRecordList.vue",
  "startObject": "ProductionBatch",
  "operationIds": ["environment-records.list", "environment-records.create"],
  "risk": "write",
  "requiresConfirmation": false,
  "idempotency": "client-key-required",
  "checkpointSteps": ["create-environment-record"],
  "dryRunFixture": "environment-record.ok.json",
  "liveE2EFixture": "environment-record.live.json",
  "skillName": "noidear-quality-records",
  "sourceEvidence": [
    {
      "kind": "view",
      "file": "client/src/views/environment-record/EnvironmentRecordList.vue",
      "symbols": ["openCreateDialog", "handleCreate"]
    },
    {
      "kind": "api",
      "file": "client/src/api/environment-record.ts",
      "routes": ["GET /environment-records", "POST /environment-records"]
    },
    {
      "kind": "controller",
      "file": "server/src/modules/environment-record/environment-record.controller.ts",
      "routes": ["GET /environment-records", "POST /environment-records"]
    }
  ],
  "confidence": "high",
  "reviewNotes": []
}
```

---

## 首轮前端推导范围

首轮至少覆盖当前菜单域：

| Domain | 菜单域 | 默认草稿来源 |
|---|---|---|
| `work-execution` | 工作执行 | Dashboard、MyTodos、record-task、approval pending 页面 |
| `document-control` | 文控与审批 | documents、templates、record-form-index、approval history 页面 |
| `production-execution` | 生产执行 | records、record-task manage、workshop-staging、requisition、deviation 页面 |
| `product-rd` | 产品研发 | products、process、product detail/workbench 页面 |
| `quality-compliance` | 质量与合规 | ccp、non-conformance、CAPA、complaint、recall、supplier evaluation、change event 页面 |
| `equipment-site` | 设备与现场 | equipment、maintenance、现场记录类页面 |
| `traceability-batch` | 追溯与批次 | batch-trace、warehouse batches、traceability、material balance、incoming inspection 页面 |
| `warehouse` | 仓库管理 | materials、suppliers、inbound、returns、scraps 页面/API |
| `training` | 培训 | training plan/project/question/exam/archive 页面 |
| `analytics` | 数据分析 | statistics、deviation analytics、audit export、traceability export 页面/API |
| `admin-governance` | 系统治理 | users、departments、roles、permissions、notifications、search、audit 页面 |

---

## 最后给用户看的 Review Report

实现时生成：

```text
tools/noidear-chat/reports/frontend-derived-shortcut-review.md
```

报告结构：

```text
# Frontend-Derived Shortcut Review

## Summary
- total shortcuts:
- high confidence:
- medium confidence:
- low confidence:
- needs review:

## Missing API Or Ambiguous Evidence
...

## High Confidence
...

## Medium Confidence
...

## Low Confidence
...

## Needs Review
...
```

用户最后只需要看这个报告，集中处理遗漏、命名和明显业务顺序错误。实现前不要求用户逐条补模板。
