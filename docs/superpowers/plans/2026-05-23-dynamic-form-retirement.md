# Dynamic Form Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除 noidear 当前未使用的动态填报平台、04 记录表单索引和 model-landing 运行时索引，保留独立业务表模块、文控、审批、主数据、批次和追溯主链。

**Architecture:** 先移除运行时依赖和前端入口，让系统不再调用动态平台；再删除 Prisma 模型、迁移和 seed 中的旧数据定义；最后收口当前协议文档和 ADR，防止后续执行者继续把动态表单当合法兜底。整个实施按 buildable slices 推进，避免在中间提交留下无法编译的主分支。

**Tech Stack:** NestJS, Prisma, PostgreSQL, Vue 3, Vite, Pinia, Element Plus, Jest, Vitest.

**Source spec:** `docs/superpowers/specs/2026-05-23-dynamic-form-retirement-design.md`

---

## Execution Rules

- 只能在独立 worktree 执行实现，不要在主 checkout 直接改业务代码。
- 每个 task 开始前先看 `git status --short`，只 stage 本 task 涉及文件。
- 修改函数、类、方法前先跑 GitNexus upstream impact；HIGH/CRITICAL 必须停下来汇报。
- `archive/superpowers/` 下的 model-landing 相关 spec/plan/csv **保留为历史资料**；只删除运行时代码、生成物、脚本、活跃协议引用和当前 hard-gate 事实源。历史资料不能继续作为当前实现合同。
- `ApprovalTask`、`TodoTask`、`ProcessTemplate`、独立业务 `*Record` 模型必须保留。

## File Structure

### Delete

```
server/src/modules/record-template/
server/src/modules/record/
server/src/modules/record-task/
server/src/modules/task/
server/src/modules/scheduled-task/
server/src/modules/model-landing/
server/src/modules/change-event/change-event-form-task.service.ts
server/src/modules/change-event/change-event-form-task.service.spec.ts
server/src/modules/change-event/change-event-default-form-rules.ts
server/src/modules/document/services/record-form-landing.service.ts
server/src/modules/document/services/record-form-landing.service.spec.ts
server/scripts/generate-model-landing-artifacts.ts
server/scripts/verify-model-landing-artifacts.ts
server/test/model-landing-freeze.spec.ts
client/src/api/record-template.ts
client/src/api/record.ts
client/src/api/new-record.ts
client/src/api/record-task.ts
client/src/api/task.ts
client/src/views/templates/
client/src/views/record/
client/src/views/records/
client/src/views/record-tasks/
client/src/views/tasks/
client/src/views/documents/RecordFormLandingIndex.vue
client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts
client/src/components/DynamicForm.vue
client/src/components/FormBuilder.vue
packages/types/task.ts
```

### Modify

```
server/src/app.module.ts
server/package.json
server/src/prisma/schema.prisma
server/src/prisma/seed.ts
server/src/prisma/seed-baseline.ts
server/src/prisma/seed-dev.ts
server/src/prisma/seed-e2e.ts
server/src/modules/change-event/change-event.controller.ts
server/src/modules/change-event/change-event.service.ts
server/src/modules/change-event/change-event.module.ts
server/src/modules/change-event/change-event.service.spec.ts
server/src/modules/change-event/change-event.module.spec.ts
server/src/modules/document/document.controller.ts
server/src/modules/document/document.module.ts
server/src/modules/document/dto/document-control.dto.ts
server/src/modules/document/services/markdown-wikilink.service.ts
server/src/modules/traceability/traceability.module.ts
server/src/modules/traceability/traceability-query.service.ts
server/src/modules/traceability/traceability.module.spec.ts
server/src/modules/batch-trace/services/traceability.service.ts
server/src/modules/batch-trace/services/trace-export.service.ts
server/src/modules/deviation/deviation.service.ts
server/src/modules/deviation/deviation-analytics.service.ts
server/src/modules/deviation/deviation-analytics.service.spec.ts
server/src/modules/shift-instance/shift-completion.service.ts
server/src/modules/shift-instance/shift-completion.service.spec.ts
server/src/modules/unified-approval/approval-callback-coverage.spec.ts
client/src/router/index.ts
client/src/navigation/menu.ts
client/src/api/change-event.ts
client/src/api/deviation.ts
client/src/api/document-control.ts
client/src/views/change-event/
client/src/views/deviation/DeviationReportView.vue
client/src/views/deviation/__tests__/DeviationReportView.spec.ts
docs/adr/0001-retire-dynamic-form-platform.md
AGENTS.md
docs/AGENT_GUIDE.md
docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md
CONTEXT.md
CLAUDE.md
```

### Create

```
server/src/prisma/migrations/20260523193000_retire_dynamic_forms/migration.sql
```

If the `simple-role-module-access` implementation has already landed in the target worktree, also modify:

```
server/src/modules/module-access/registry-config.ts
server/src/modules/module-access/coverage.spec.ts
docs/superpowers/plans/2026-05-23-simple-role-module-access.md
```

---

## Task 0: Worktree, Current State, and Impact Gate

**Files:**
- Read: `docs/superpowers/specs/2026-05-23-dynamic-form-retirement-design.md`
- Read: `docs/superpowers/plans/2026-05-23-simple-role-module-access.md`
- Read: `server/src/prisma/schema.prisma`
- Write: `tmp/retire-dynamic-forms-impact.md`

- [ ] **Step 1: Create or enter an isolated worktree**

```bash
# Default repo root (project default). Override WORKTREE_BASE if your local layout differs.
REPO_ROOT="${REPO_ROOT:-/Users/jiashenglin/Desktop/project/noidear}"
WORKTREE_BASE="${WORKTREE_BASE:-$(dirname "$REPO_ROOT")}"
WORKTREE="$WORKTREE_BASE/noidear-retire-dynamic-forms"

cd "$REPO_ROOT"
git fetch origin master
git worktree add "$WORKTREE" -b codex/retire-dynamic-forms origin/master
cd "$WORKTREE"
pwd
git branch --show-current
git status --short
```

Expected:
- With the default `REPO_ROOT`, `pwd` prints `/Users/jiashenglin/Desktop/project/noidear-retire-dynamic-forms`. If `REPO_ROOT` was explicitly overridden, `pwd` must print `$WORKTREE`.
- branch is `codex/retire-dynamic-forms`.
- no unrelated dirty files in this worktree.

- [ ] **Step 2: Confirm simple-role sequencing**

```bash
test -d server/src/modules/module-access && echo "module-access present" || echo "module-access absent"
rg -n "record-templates|records|dynamic-forms|model-landing|path: 'tasks'" server/src/modules/module-access docs/superpowers/plans/2026-05-23-simple-role-module-access.md 2>/dev/null || true
```

Expected:
- If `module-access absent`, continue with this plan; Task 7 will only update the simple-role plan document (no `registry-config.ts` edits needed).
- If `module-access present`, do not delete dynamic controllers until `simple-role-module-access` Task 33 is green, then execute Task 7 in this plan to clean up `registry-config.ts` + coverage spec.

- [ ] **Step 3: Run GitNexus impact analysis before edits**

Run these GitNexus MCP calls and paste the summaries into `tmp/retire-dynamic-forms-impact.md`:

```text
impact(repo: "noidear", target: "RecordTemplateService",     file_path: "server/src/modules/record-template/record-template.service.ts", direction: "upstream", maxDepth: 3)
impact(repo: "noidear", target: "RecordService",             file_path: "server/src/modules/record/record.service.ts",                  direction: "upstream", maxDepth: 3)
impact(repo: "noidear", target: "RecordTaskInstanceService", file_path: "server/src/modules/record-task/record-task-instance.service.ts", direction: "upstream", maxDepth: 3)
impact(repo: "noidear", target: "RecordTaskCronService",     file_path: "server/src/modules/record-task/record-task-cron.service.ts",    direction: "upstream", maxDepth: 3)
impact(repo: "noidear", target: "TaskService",               file_path: "server/src/modules/task/task.service.ts",                       direction: "upstream", maxDepth: 3)
impact(repo: "noidear", target: "ChangeEventService",        file_path: "server/src/modules/change-event/change-event.service.ts",        direction: "upstream", maxDepth: 3)
impact(repo: "noidear", target: "ChangeEventFormTaskService",file_path: "server/src/modules/change-event/change-event-form-task.service.ts", direction: "upstream", maxDepth: 3)
impact(repo: "noidear", target: "TraceabilityQueryService",  file_path: "server/src/modules/traceability/traceability-query.service.ts", direction: "upstream", maxDepth: 3)
impact(repo: "noidear", target: "TraceabilityService",       file_path: "server/src/modules/batch-trace/services/traceability.service.ts", direction: "upstream", maxDepth: 3)
impact(repo: "noidear", target: "DeviationAnalyticsService", file_path: "server/src/modules/deviation/deviation-analytics.service.ts",   direction: "upstream", maxDepth: 3)
impact(repo: "noidear", target: "ShiftCompletionService",    file_path: "server/src/modules/shift-instance/shift-completion.service.ts", direction: "upstream", maxDepth: 3)
impact(repo: "noidear", target: "RecordFormLandingService",  file_path: "server/src/modules/document/services/record-form-landing.service.ts", direction: "upstream", maxDepth: 3)
impact(repo: "noidear", target: "ModelLandingService",       file_path: "server/src/modules/model-landing/model-landing.service.ts",    direction: "upstream", maxDepth: 3)
```

> `file_path` 用于 disambiguation，避免同名 service 撞名。`TraceabilityQueryService` 和 batch-trace 的 `TraceabilityService` 是两个不同服务，本 plan 会分别修改它们，impact 不能合并。

Expected:
- Each entry records risk, direct callers, affected processes.
- If any result is HIGH or CRITICAL, stop and report the exact symbol and direct callers before editing.

- [ ] **Step 4: Snapshot current dynamic references**

```bash
mkdir -p tmp
rg -n "recordTemplate|recordTaskAssignment|recordTaskInstance|taskRecord|changeEventFormTask|RecordFormLanding|ModelLanding|targetTemplateId|relatedRecords|DynamicForm|FormBuilder|record\\.submitApproved|taskRecord\\.|resourceType: 'task_record'" \
  server/src client/src packages/types --glob '!**/coverage/**' \
  > tmp/retire-dynamic-forms-before.txt
wc -l tmp/retire-dynamic-forms-before.txt
```

Expected: non-zero line count. This file is an execution aid and should not be committed.

---

## Task 1: Retire model-landing and Record Form Landing Backend

**Files:**
- Modify: `server/src/app.module.ts`
- Modify: `server/package.json`
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/document.module.ts`
- Modify: `server/src/modules/document/dto/document-control.dto.ts`
- Modify: `server/src/modules/document/services/markdown-wikilink.service.ts`
- Modify: `server/src/modules/traceability/traceability.module.ts`
- Modify: `server/src/modules/traceability/traceability-query.service.ts`
- Modify: `server/src/modules/traceability/traceability.module.spec.ts`
- Delete: `server/src/modules/model-landing/`
- Delete: `server/src/modules/document/services/record-form-landing.service.ts`
- Delete: `server/src/modules/document/services/record-form-landing.service.spec.ts`
- Delete: `server/scripts/generate-model-landing-artifacts.ts`
- Delete: `server/scripts/verify-model-landing-artifacts.ts`
- Delete: `server/test/model-landing-freeze.spec.ts`

- [ ] **Step 1: Verify current failure target exists**

```bash
rg -n "ModelLandingModule|ModelLandingService|RecordFormLandingService|record-form-index|model-landing:verify|model-landing:generate" \
  server/src server/scripts server/test server/package.json
```

Expected: matches in app module, document module/controller/service, traceability module/query service, model-landing files, scripts, and package scripts.

- [ ] **Step 2: Remove document record-form-index endpoints**

In `server/src/modules/document/document.controller.ts`:
- Remove `RecordFormLandingService` import.
- Remove `BatchConfirmRecordFormLandingDto`, `ConfirmRecordFormLandingDto`, `UpdateRecordFormLandingEntryDto` import.
- Remove constructor parameter `recordFormLandingService`.
- Delete all handlers whose path starts with `record-form-index`.
- Keep `reference-health`, `documents`, upload, lifecycle, preview, business document link behavior unchanged.

Run:

```bash
rg -n "record-form-index|RecordFormLanding|recordFormLandingService|UpdateRecordFormLandingEntryDto|ConfirmRecordFormLandingDto|BatchConfirmRecordFormLandingDto" server/src/modules/document/document.controller.ts
```

Expected: zero output.

- [ ] **Step 3: Remove document module model-landing wiring**

In `server/src/modules/document/document.module.ts`:
- Remove `ModelLandingModule` import.
- Remove `RecordFormLandingService` import.
- Remove `ModelLandingModule` from `imports`.
- Remove `RecordFormLandingService` from `providers`.

Run:

```bash
rg -n "ModelLandingModule|RecordFormLandingService" server/src/modules/document/document.module.ts
```

Expected: zero output.

- [ ] **Step 4: Remove record-form DTO classes**

In `server/src/modules/document/dto/document-control.dto.ts`, delete these class declarations:

```text
UpdateRecordFormLandingEntryDto
BatchConfirmRecordFormLandingDto
ConfirmRecordFormLandingDto
```

Do not delete `CreateGenericDocumentReferenceDto`, `UpdateMarkdownDto`, `WorkbenchQueryDto`, or document lifecycle DTOs.

Run:

```bash
rg -n "RecordFormLanding|targetTemplateId" server/src/modules/document/dto/document-control.dto.ts
```

Expected: zero output.

- [ ] **Step 5: Remove model-landing from traceability DI**

In `server/src/modules/traceability/traceability-query.service.ts`:
- Remove `ModelLandingService` import.
- Remove constructor parameter `private readonly modelLandingService: ModelLandingService`.
- Keep all trace query methods unchanged.

In `server/src/modules/traceability/traceability.module.ts`:
- Remove `ModelLandingModule` import.
- Remove `ModelLandingModule` from `imports`.

In `server/src/modules/traceability/traceability.module.spec.ts`:
- Remove `ModelLandingService` import.
- Remove `.overrideProvider(ModelLandingService).useValue({})`.

Run:

```bash
rg -n "ModelLanding" server/src/modules/traceability
```

Expected: zero output.

- [ ] **Step 6: Delete model-landing runtime assets and scripts**

```bash
rm -rf server/src/modules/model-landing
rm -f server/scripts/generate-model-landing-artifacts.ts
rm -f server/scripts/verify-model-landing-artifacts.ts
rm -f server/test/model-landing-freeze.spec.ts

# archive/superpowers 下的历史 spec/plan/csv 不删除；它们只允许作为历史资料存在。
```

In `server/package.json`, remove scripts:

```json
"model-landing:generate": "tsx scripts/generate-model-landing-artifacts.ts",
"model-landing:verify": "tsx scripts/verify-model-landing-artifacts.ts"
```

Run:

```bash
rg -n "model-landing|ModelLanding|record-form-landing|RecordFormLanding|model-landing:generate|model-landing:verify" \
   server/src server/scripts server/test server/package.json
```

Expected: zero output. Old migration SQL under `server/src/prisma/migrations` and archive history under `archive/superpowers/` are allowed and should not be edited in this task.

- [ ] **Step 7: Build server slice**

```bash
npm run build:server
```

Expected: PASS. If it fails on `RecordFormLandingEntry` Prisma type only, defer that failure to Task 5 only after confirming no TypeScript source still imports record-form landing services.

- [ ] **Step 8: Commit**

```bash
git add server/src/app.module.ts server/package.json server/src/modules/document/ server/src/modules/traceability/ server/scripts/ server/test/
git add -u server/src/modules/model-landing server/src/modules/document/services/record-form-landing.service.ts server/src/modules/document/services/record-form-landing.service.spec.ts
git commit -m "refactor(document): retire model landing and record form index backend"
```

---

## Task 2: Retire ChangeEventFormTask

**Files:**
- Modify: `server/src/modules/change-event/change-event.service.ts`
- Modify: `server/src/modules/change-event/change-event.controller.ts`
- Modify: `server/src/modules/change-event/change-event.module.ts`
- Modify: `server/src/modules/change-event/change-event.service.spec.ts`
- Modify: `server/src/modules/change-event/change-event.module.spec.ts`
- Delete: `server/src/modules/change-event/change-event-form-task.service.ts`
- Delete: `server/src/modules/change-event/change-event-form-task.service.spec.ts`
- Delete: `server/src/modules/change-event/change-event-default-form-rules.ts`

- [ ] **Step 1: Verify current dynamic form-task references**

```bash
rg -n "ChangeEventFormTaskService|formTaskService|formTasks|generateDefaultTasks|change-event-default-form-rules|form-tasks" server/src/modules/change-event
```

Expected: matches in controller, service, module, specs, form-task service, default-form-rules.

- [ ] **Step 2: Remove service dependency and generation calls**

In `server/src/modules/change-event/change-event.service.ts`:
- Remove `ChangeEventFormTaskService` import.
- Remove constructor parameter `private readonly formTaskService: ChangeEventFormTaskService`.
- In `createDraftEvent`, delete both branches that call:

```ts
this.formTaskService.generateDefaultTasksForScopes(created.id, options.scopes, db)
this.formTaskService.generateDefaultTasks(created.id, dto.change_type, db)
```

- In `findAll` and `findOne`, remove `formTasks` from `include`.
- Keep `verifications` and `relations` includes.

Run:

```bash
rg -n "formTask|formTasks|generateDefaultTasks|ChangeEventFormTaskService" server/src/modules/change-event/change-event.service.ts
```

Expected: zero output.

- [ ] **Step 3: Remove controller endpoints**

In `server/src/modules/change-event/change-event.controller.ts`:
- Remove `ChangeEventFormTaskService` import.
- Remove `BadRequestException` import if it becomes unused.
- Remove constructor parameter `private formTaskService: ChangeEventFormTaskService`.
- Delete `GET :id/form-tasks`.
- Delete `POST form-tasks/:taskId/fill`.

Run:

```bash
rg -n "form-tasks|formTaskService|ChangeEventFormTaskService|BadRequestException" server/src/modules/change-event/change-event.controller.ts
```

Expected: zero output.

- [ ] **Step 4: Remove module provider and RecordModule dependency**

In `server/src/modules/change-event/change-event.module.ts`:
- Remove `ChangeEventFormTaskService` import.
- Remove `RecordModule` import.
- Remove `RecordModule` from `imports`.
- Remove `ChangeEventFormTaskService` from `providers` and `exports`.
- Keep `UnifiedApprovalModule`, `ProductProcessChangeModule`, `ChangeEventService`, `ChangeEventRelationService`.

Run:

```bash
rg -n "ChangeEventFormTaskService|RecordModule|../record/record.module" server/src/modules/change-event/change-event.module.ts
```

Expected: zero output.

- [ ] **Step 5: Delete form-task files and update specs**

```bash
rm -f server/src/modules/change-event/change-event-form-task.service.ts
rm -f server/src/modules/change-event/change-event-form-task.service.spec.ts
rm -f server/src/modules/change-event/change-event-default-form-rules.ts
```

Update `change-event.service.spec.ts` and `change-event.module.spec.ts` so they do not provide or assert `ChangeEventFormTaskService`.

Run:

```bash
npm run test -w server -- change-event.service change-event.module
```

Expected: PASS.

- [ ] **Step 6: Build server slice**

```bash
npm run build:server
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/change-event/
git commit -m "refactor(change-event): remove dynamic form task generation"
```

---

## Task 3: Delete Dynamic Backend Modules

**Files:**
- Modify: `server/src/app.module.ts`
- Delete: `server/src/modules/record-template/`
- Delete: `server/src/modules/record/`
- Delete: `server/src/modules/record-task/`
- Delete: `server/src/modules/task/`
- Delete: `server/src/modules/scheduled-task/`

- [ ] **Step 1: Remove app module imports**

In `server/src/app.module.ts`, remove imports and `imports` array entries for:

```ts
RecordTemplateModule
RecordModule
RecordTaskModule
TaskModule
ScheduledTaskModule
ModelLandingModule
```

Run:

```bash
rg -n "RecordTemplateModule|RecordModule|RecordTaskModule|TaskModule|ScheduledTaskModule|ModelLandingModule" server/src/app.module.ts
```

Expected: zero output.

- [ ] **Step 2: Delete module directories**

```bash
rm -rf server/src/modules/record-template
rm -rf server/src/modules/record
rm -rf server/src/modules/record-task
rm -rf server/src/modules/task
rm -rf server/src/modules/scheduled-task
```

Run:

```bash
test ! -d server/src/modules/record-template
test ! -d server/src/modules/record
test ! -d server/src/modules/record-task
test ! -d server/src/modules/task
test ! -d server/src/modules/scheduled-task
```

Expected: all commands exit 0.

- [ ] **Step 3: Verify no runtime imports target deleted modules**

```bash
rg -n "modules/(record-template|record-task|record|task|scheduled-task)|../record-template|../record-task|../record/record.module|../task|../scheduled-task" server/src --glob '!prisma/migrations/**'
```

Expected: zero output.

- [ ] **Step 4: Build server slice**

```bash
npm run build:server
```

Expected: PASS while Prisma schema still contains dynamic models; the deleted modules are no longer imported.

- [ ] **Step 5: Commit**

```bash
git add server/src/app.module.ts
git add -u server/src/modules/record-template server/src/modules/record server/src/modules/record-task server/src/modules/task server/src/modules/scheduled-task
git commit -m "refactor(records): remove dynamic record backend modules"
```

---

## Task 4: Remove Dynamic Record Dependencies from Remaining Backend Services

**Files:**
- Modify: `server/src/modules/batch-trace/services/traceability.service.ts`
- Modify: `server/src/modules/batch-trace/services/trace-export.service.ts`
- Modify: `server/src/modules/deviation/deviation.service.ts`
- Modify: `server/src/modules/deviation/deviation-analytics.service.ts`
- Modify: `server/src/modules/deviation/deviation-analytics.service.spec.ts`
- Modify: `server/src/modules/deviation/deviation-export.service.ts`
- Modify: `server/src/modules/shift-instance/shift-completion.service.ts`
- Modify: `server/src/modules/shift-instance/shift-completion.service.spec.ts`
- Modify: `server/src/modules/unified-approval/approval-callback-coverage.spec.ts`

- [ ] **Step 1: Remove `relatedRecords` from batch trace**

In `server/src/modules/batch-trace/services/traceability.service.ts`:
- Delete calls to `this.prisma.record.findMany`.
- Remove `relatedRecords` from returned trace payloads.
- Keep supplier, material, material batch, usage, production batch, delivery, complaint and recall chain logic.

In `server/src/modules/batch-trace/services/trace-export.service.ts`:
- Delete sections that render `traceData.relatedRecords`.
- Keep product/batch/material/export sections unchanged.

Run:

```bash
rg -n "relatedRecords|prisma\\.record|动态表单记录" server/src/modules/batch-trace
```

Expected: zero output.

- [ ] **Step 2: Convert deviation service away from dynamic records**

In `server/src/modules/deviation/deviation.service.ts`:
- Remove `templateId` and `recordId` from `DeviationReportQueryDto`.
- Remove `detectDeviations` and `createDeviationReports`; these were dynamic-template tolerance helpers called by deleted `RecordService`.
- Remove now-unused imports and constructor dependencies that only supported dynamic auto-detection: `BusinessException`, `ErrorCode`, `ApprovalEngineService`, and `private readonly approvalEngine`.
- In `findDeviationReports`, remove filters for `templateId` and `recordId`.
- In `findDeviationReports`, remove `include: { record: { include: { template: true } } }`.
- Return `{ list, total, page, limit }` as before.
- Do not add a generic replacement create endpoint in this retirement plan. After dynamic records are removed, `DeviationReport` is a retained independent table for read/export and future independent business writers; this task only removes the old dynamic-template auto-detection writer.

Run:

```bash
rg -n "templateId|recordId|detectDeviations|createDeviationReports|include:\\s*\\{\\s*record|BusinessException|ErrorCode|ApprovalEngineService|approvalEngine" server/src/modules/deviation/deviation.service.ts
```

Expected: zero output.

- [ ] **Step 3: Remove dynamic template/task analytics**

In `server/src/modules/deviation/deviation-analytics.service.ts`:
- In `getDeviationTrend`, replace denominator `this.prisma.record.count` with `this.prisma.deviationReport.count` using the same date/deleted filter.
- In `getDeviationRateByDepartment`, return `[]` because the previous department metric was based on deleted `tasks` and `task_records`.
- In `getDeviationRateByTemplate`, return `[]` because `record_templates` and `task_records` are deleted.
- Keep `getFieldDistribution` and `getDeviationReasonWordCloud`.

Update `server/src/modules/deviation/deviation-analytics.service.spec.ts`:
- Assert department stats returns `[]`.
- Assert template stats returns `[]`.
- Assert trend uses `deviationReport.count`, not `record.count`.

Run:

```bash
npm run test -w server -- deviation-analytics.service
rg -n "record_templates|task_records|prisma\\.record|TaskRecord|template_id" server/src/modules/deviation
```

Expected:
- Jest PASS.
- `rg` zero output.

- [ ] **Step 4: Strip dynamic record/template fields from deviation export**

打开 `server/src/modules/deviation/deviation-export.service.ts`，**直接执行**：

1. 删除所有 `recordId / templateId / record. / template. / taskRecord / TaskRecord` 命中行（这些都来自被退役的 Record/RecordTemplate/TaskRecord 三个模型）。
2. 导出字段只保留 `DeviationReport` 实际字段：`id, fieldName, expectedValue, actualValue, deviationAmount, deviationRate, deviationType, reason, status, reporterId, reportedAt, approvedBy, approvedAt, comment, createdAt`。

实施前先确认文件存在（避免空运行）：

```bash
test -f server/src/modules/deviation/deviation-export.service.ts && echo "present" || echo "absent — skip Step 4"
```

如果 `present`，按上面 1-2 改写；改完跑验证：

```bash
rg -n "recordId|templateId|record\\.|template\\.|taskRecord|TaskRecord" server/src/modules/deviation/deviation-export.service.ts
```

Expected: zero output（命中等于改漏）。

如果 `absent`（service 已经不存在或之前被删除），跳过本步骤，在 commit message 里记一行说明。

- [ ] **Step 5: Remove shift completion dependency on RecordTemplate**

In `server/src/modules/shift-instance/shift-completion.service.ts`:
- Remove calls to `this.prisma.recordTemplate.findMany`.
- Remove `records: { include: { template: true } }` from productionRun include.
- For each run, return:

```ts
{
  run_id: run.id,
  product_name: run.product.name,
  production_line: run.production_line,
  status: run.status,
  total_mandatory: 0,
  filled: 0,
  missing_templates: [],
  completion_rate: '100.0',
}
```

Update `shift-completion.service.spec.ts` to mock only `productionRun.findMany`.

Run:

```bash
npm run test -w server -- shift-completion.service
rg -n "recordTemplate|missing_templates.*template|records:\\s*\\{\\s*include:\\s*\\{\\s*template" server/src/modules/shift-instance
```

Expected:
- Jest PASS.
- `rg` zero output.

- [ ] **Step 6: Remove deleted approval callbacks from coverage**

In `server/src/modules/unified-approval/approval-callback-coverage.spec.ts`, remove required callback names:

```ts
'record.submitApproved'
'taskRecord.approvalApproved'
'taskRecord.approvalRejected'
```

Run:

```bash
npm run test -w server -- approval-callback-coverage
rg -n "record\\.submitApproved|taskRecord\\.|formTask" server/src/modules/unified-approval
```

Expected:
- Jest PASS.
- zero output for removed dynamic callbacks.

- [ ] **Step 7: Build server slice**

```bash
npm run build:server
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/batch-trace/ server/src/modules/deviation/ server/src/modules/shift-instance/ server/src/modules/unified-approval/
git commit -m "refactor(records): remove dynamic record dependencies from services"
```

---

## Task 5: Prisma Schema, Migration, and Seeds

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260523193000_retire_dynamic_forms/migration.sql`
- Modify: `server/src/prisma/seed.ts`
- Modify: `server/src/prisma/seed-baseline.ts`
- Modify: `server/src/prisma/seed-dev.ts`
- Modify: `server/src/prisma/seed-e2e.ts`

- [ ] **Step 1: Remove dynamic models and relations from schema**

In `server/src/prisma/schema.prisma`, delete models:

```text
RecordTemplate
Record
RecordChangeLog
RecordTaskAssignment
RecordTaskInstance
Task
TaskRecord
ChangeEventFormTask
RecordFormLandingEntry
```

Also remove relation fields（已与 2026-05-23 真实 schema 对照）：

```text
User.recordsCreated
User.recordChanges
User.recordTaskAssignments
User.tasksCreated
User.taskRecordsSubmitted
User.taskRecordsApproved
Department.recordTaskAssignments
Department.tasks
Document.landingEntries          # 反向到 RecordFormLandingEntry[]，schema line 654，漏删会让 prisma generate panic
ProductionBatch.relatedRecords
ChangeEvent.records
ChangeEvent.formTasks
ProductionRun.records             # schema line 3188 区附近实际存在 records Record[]，必须删
ProductRecallEvidence.record_id
ProductRecallEvidence.record
DeviationReport.recordId
DeviationReport.record
DeviationReport.templateId
```

**额外验证**：执行 Step 1 前先跑下面这段，确认 schema 中只剩这些指向被删模型的反向关系，没有遗漏：

```bash
rg -nE "\\b(Record|RecordTemplate|RecordTaskAssignment|RecordTaskInstance|Task|TaskRecord|ChangeEventFormTask|RecordFormLandingEntry)\\b\\s*\\[" \
   server/src/prisma/schema.prisma
```

输出每一行都应该出现在上方的删除清单里；若有未列出的关系，先把它加进清单再继续。

Keep independent models such as `EnvironmentRecord`, `ProcessMonitorRecord`, `CleaningRecord`, `ViolationRecord`, `MedicationRecord`, `VisitorRecord`, `ReworkRecord`, `ChangeComplianceRecord`, `ChangeVerificationRecord`, `WasteDisposalRecord`, `MetalDetectionLog`, `CCPRecord`, `LearningRecord`, `ExamRecord`.

Run:

```bash
rg -n "model (RecordTemplate|Record |RecordChangeLog|RecordTaskAssignment|RecordTaskInstance|Task |TaskRecord|ChangeEventFormTask|RecordFormLandingEntry)|records\\s+Record\\[\\]|records\\s+TaskRecord\\[\\]|relatedRecords|targetTemplateId|record_id.*Record|recordId.*Record|taskRecordsSubmitted|taskRecordsApproved" server/src/prisma/schema.prisma
```

Expected: zero output.

- [ ] **Step 2: Write migration SQL**

Create `server/src/prisma/migrations/20260523193000_retire_dynamic_forms/migration.sql` with destructive cleanup in dependency order:

```sql
-- Retire dynamic form platform and model-landing runtime index.

DELETE FROM approval_actions
WHERE "instanceId" IN (
  SELECT id FROM approval_instances
  WHERE "resourceType" IN ('record', 'task_record', 'taskRecord')
);

DELETE FROM approval_tasks
WHERE "instanceId" IN (
  SELECT id FROM approval_instances
  WHERE "resourceType" IN ('record', 'task_record', 'taskRecord')
);

DELETE FROM approval_instances
WHERE "resourceType" IN ('record', 'task_record', 'taskRecord');

DELETE FROM approval_definitions
WHERE "resourceType" IN ('record', 'task_record', 'taskRecord')
   OR module IN ('record', 'task');

DELETE FROM approval_tasks WHERE "instanceId" NOT IN (SELECT id FROM approval_instances);

ALTER TABLE IF EXISTS product_recall_evidence DROP CONSTRAINT IF EXISTS product_recall_evidence_record_id_fkey;
DROP INDEX IF EXISTS product_recall_evidence_record_id_idx;
ALTER TABLE IF EXISTS product_recall_evidence DROP COLUMN IF EXISTS record_id;

ALTER TABLE IF EXISTS deviation_reports DROP CONSTRAINT IF EXISTS deviation_reports_recordId_fkey;
ALTER TABLE IF EXISTS deviation_reports DROP COLUMN IF EXISTS "recordId";
ALTER TABLE IF EXISTS deviation_reports DROP COLUMN IF EXISTS "templateId";
-- `deviation_reports_approvalInstanceId_idx` 是独立索引（schema line 526），删除 recordId / templateId 不影响它，无需 drop-recreate。

DROP TABLE IF EXISTS change_event_form_tasks CASCADE;
DROP TABLE IF EXISTS record_change_logs CASCADE;
DROP TABLE IF EXISTS task_records CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS record_task_instances CASCADE;
DROP TABLE IF EXISTS record_task_assignments CASCADE;
DROP TABLE IF EXISTS records CASCADE;
DROP TABLE IF EXISTS record_form_landing_entries CASCADE;
DROP TABLE IF EXISTS record_templates CASCADE;
```

Run:

```bash
sed -n '1,220p' server/src/prisma/migrations/20260523193000_retire_dynamic_forms/migration.sql
```

Expected: SQL includes approval cleanup before dropping dynamic tables.

- [ ] **Step 3: Clean dynamic seed data**

Remove from `server/src/prisma/seed-dev.ts`:

```text
prisma.recordTemplate.createMany
```

Remove from `server/src/prisma/seed-baseline.ts` the `PRODUCT_RD_7STEP_TEMPLATE_*` record template fixture block.

Remove from `server/src/prisma/seed-e2e.ts` the block that touches:

```ts
prisma.recordTemplate
prisma.recordTaskAssignment
prisma.recordTaskInstance
prisma.record
```

Remove from `server/src/prisma/seed.ts` the two dynamic approval definitions:

```ts
module: 'record', resourceType: 'record', onApproved: 'record.submitApproved'
module: 'task', resourceType: 'task_record', onApproved: 'taskRecord.approvalApproved', onRejected: 'taskRecord.approvalRejected'
```

Run:

```bash
rg -nE "prisma\\.(recordTemplate|record|recordChangeLog|recordTaskAssignment|recordTaskInstance|task|taskRecord|changeEventFormTask|recordFormLandingEntry)\\." server/src/prisma/seed*.ts
rg -nE "record\\.submitApproved|taskRecord\\.|module: 'record'|module: 'task'|resourceType: 'record'|resourceType: 'task_record'" server/src/prisma/seed*.ts
```

Expected: both commands return zero output.

- [ ] **Step 4: Generate Prisma client and build server**

```bash
npm run prisma:generate -w server
npm run build:server
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/prisma/schema.prisma \
        server/src/prisma/migrations/20260523193000_retire_dynamic_forms/migration.sql \
        server/src/prisma/seed.ts \
        server/src/prisma/seed-baseline.ts \
        server/src/prisma/seed-dev.ts \
        server/src/prisma/seed-e2e.ts
git commit -m "refactor(prisma): drop dynamic form models and seed fixtures"
```

---

## Task 6: Frontend Route, Menu, API, and Page Removal

**Files:**
- Modify: `client/src/router/index.ts`
- Modify: `client/src/navigation/menu.ts`
- Modify: `client/src/api/change-event.ts`
- Modify: `client/src/api/deviation.ts`
- Modify: `client/src/api/document-control.ts`
- Modify: `client/src/views/deviation/DeviationReportView.vue`
- Modify: `client/src/views/deviation/__tests__/DeviationReportView.spec.ts`
- Delete: dynamic frontend files listed in File Structure.
- Delete: `packages/types/task.ts`

- [ ] **Step 1: Remove dynamic routes**

In `client/src/router/index.ts`, delete routes:

```text
documents/control/record-form-index
templates
templates/create
templates/:id/edit
templates/:id/tolerance
templates/designer
record-templates/:id/designer
tasks
tasks/create
tasks/:id
records
records/:id
records/fill/:templateId
records/task/:instanceId
record-tasks/my
record-tasks/manage
```

Run（按真实动态路由 path 精准 grep，避免误命中 `equipment/records / training/records / process-records` 等独立业务路由）：

```bash
rg -nE "path:\\s*['\"](documents/control/record-form-index|templates(/[^'\"]*)?|record-templates/[^'\"]*|tasks(/[^'\"]*)?|records(/[^'\"]*)?|record-tasks/[^'\"]*)['\"]" \
   client/src/router/index.ts
rg -nE "RecordFormLandingIndex|TemplateList|TemplateDesigner|TemplateEditor|TaskList|TaskCreate|TaskDetail|RecordFill|RecordList|RecordTaskMy|RecordTaskManage" \
   client/src/router/index.ts
```

Expected: 两段命令都返回零输出。

> 注：上面 `path:` 正则只匹配以 `documents/control/record-form-index / templates / record-templates / tasks / records / record-tasks` **整段**开头的路由 path，不会命中 `equipment/records`、`training/records`、`process-records` 这种独立业务路由。第二段 grep 匹配的是具体的动态填报 Vue 组件名，独立业务组件不会撞名。

- [ ] **Step 2: Remove dynamic menu entries**

In `client/src/navigation/menu.ts`, delete menu entries:

```text
/record-tasks/my
/templates
/documents/control/record-form-index
/records
/record-tasks/manage
```

Keep:

```text
/my-todos
/approvals/pending
/documents
/approvals/history
/deviation-reports
/deviation-analytics
/equipment/records
/training/projects
```

Run:

```bash
rg -nE "待填任务|模板管理|记录表单索引|任务配置|['\"]/record-tasks|['\"]/templates|['\"]/records" client/src/navigation/menu.ts
```

Expected: zero output for removed menu entries. Do not treat independent routes such as `/equipment/records` as a failure.

- [ ] **Step 3: Delete dynamic frontend assets**

```bash
rm -f client/src/api/record-template.ts
rm -f client/src/api/record.ts
rm -f client/src/api/new-record.ts
rm -f client/src/api/record-task.ts
rm -f client/src/api/task.ts
rm -rf client/src/views/templates
rm -rf client/src/views/record
rm -rf client/src/views/records
rm -rf client/src/views/record-tasks
rm -rf client/src/views/tasks
rm -f client/src/views/documents/RecordFormLandingIndex.vue
rm -f client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts
rm -f client/src/components/DynamicForm.vue
rm -f client/src/components/FormBuilder.vue
rm -f packages/types/task.ts
```

Run:

```bash
rg -nE "from '@/components/(DynamicForm|FormBuilder)'|DynamicForm\\b|FormBuilder\\b" client/src --type vue --type ts
rg -nE "from '@/api/(record|record-template|record-task|new-record)'|from '@/api/task'" client/src --type vue --type ts
test ! -f packages/types/task.ts
```

Expected:
- first two commands return zero output.
- `test` exits 0.

- [ ] **Step 4: Remove change-event dynamic form-task client API**

In `client/src/api/change-event.ts`:
- Delete `ChangeEventFormTask` interface.
- Remove `formTasks?: ChangeEventFormTask[]`.
- Delete API methods:

```ts
getFormTasks(id: string)
fillFormTask
```

Run:

```bash
rg -n "ChangeEventFormTask|formTasks|getFormTasks|fillFormTask|form-tasks" client/src/api/change-event.ts client/src/views/change-event
```

Expected: zero output.

- [ ] **Step 5: Remove record-form-index client API**

In `client/src/api/document-control.ts`:
- Delete `RecordFormLandingEntry` interface.
- Delete `targetTemplateId`.
- Delete API methods:

```text
getRecordFormIndex
getRecordFormLandingSuggestion
confirmRecordFormLanding
batchConfirmRecordFormLanding
```

Run:

```bash
rg -n "RecordFormLanding|record-form-index|targetTemplateId|LandingSuggestion|batchConfirmRecordFormLanding|confirmRecordFormLanding" client/src/api/document-control.ts client/src
```

Expected: zero output.

- [ ] **Step 6: Update deviation client shape**

In `client/src/api/deviation.ts`:
- Remove tolerance config API methods that call `/record-templates/:id/tolerance`.
- Replace `taskRecordId` with no dynamic source field.
- Keep list params `status`, `startDate`, `endDate`, `keyword`, `page`, `pageSize`.

In `client/src/views/deviation/DeviationReportView.vue`:
- Remove table/detail display of `taskRecordId`.
- Change keyword placeholder from `字段名/任务ID` to `字段名/原因`.
- Keep status/date filtering and detail modal.

Run:

```bash
rg -n "taskRecordId|record-templates|Tolerance|模板公差|任务记录ID" client/src/api/deviation.ts client/src/views/deviation
npm run test -w client -- DeviationReportView
```

Expected:
- `rg` returns zero output.
- Vitest PASS.

- [ ] **Step 7: Build client and types**

```bash
npm run typecheck:types
npm run build:client
```

Expected: both PASS.

- [ ] **Step 8: Commit**

```bash
git add client/src/router/index.ts client/src/navigation/menu.ts client/src/api/ client/src/views/deviation/
git add -u client/src/views/templates client/src/views/record client/src/views/records client/src/views/record-tasks client/src/views/tasks client/src/views/documents/RecordFormLandingIndex.vue client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts client/src/components/DynamicForm.vue client/src/components/FormBuilder.vue packages/types/task.ts
git commit -m "refactor(client): remove dynamic form routes and pages"
```

---

## Task 7: Module Access Plan Reconciliation

**Files:**
- Modify if present: `server/src/modules/module-access/registry-config.ts`
- Modify if present: `server/src/modules/module-access/coverage.spec.ts`
- Modify: `docs/superpowers/plans/2026-05-23-simple-role-module-access.md`

- [ ] **Step 1: Check whether module-access exists in this worktree**

```bash
test -d server/src/modules/module-access && echo "module-access present" || echo "module-access absent"
```

Expected:
- If `module-access absent`, skip Steps 2-4 and complete Step 5 only.
- If `module-access present`, execute every step.

- [ ] **Step 2: Remove retired route prefixes from registry**

In `server/src/modules/module-access/registry-config.ts`, remove route entries:

```text
tasks
templates
dynamic-forms
record-templates
records
model-landing
```

Keep:

```text
todos
approval-tasks
approval-instances
documents
approval-definitions
products
recipes
change-events
change-verification-records
change-compliance-records
```

Run:

```bash
rg -nE "['\"](tasks|templates|dynamic-forms|record-templates|records|model-landing)['\"]" server/src/modules/module-access/registry-config.ts
npm run test -w server -- module-access/coverage
```

Expected:
- `rg` returns zero output for retired route entries.
- Independent entries such as `todos`, `approval-tasks`, `approval-instances`, `documents`, and `approval-definitions` must remain.
- coverage test PASS.

- [ ] **Step 3: Remove ownership rows for deleted models**

In `docs/superpowers/plans/2026-05-23-simple-role-module-access.md`:
- Mark `Task`, `Record`, `RecordTemplate`, `RecordFormLandingEntry` rows as removed by this plan.
- Remove implementation instructions that create `TaskService.listForOwnership`, `RecordService.listForOwnership`, or `RecordTemplateService` write ownership gates.
- Remove `model-landing.controller.ts` from Task 40 product_rd ownership instructions.

Run:

```bash
rg -n "TaskService\\.listForOwnership|RecordService\\.listForOwnership|RecordTemplateService|model-landing.controller|record-template.controller|records.controller|Task,|RecordTemplate,|Record," docs/superpowers/plans/2026-05-23-simple-role-module-access.md
```

Expected: only historical explanation lines that explicitly say `removed by dynamic-form-retirement` remain.

- [ ] **Step 4: Build server if module-access exists**

```bash
npm run test -w server -- module-access/coverage
npm run build:server
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-05-23-simple-role-module-access.md
test ! -d server/src/modules/module-access || git add server/src/modules/module-access/
git commit -m "chore(module-access): remove retired dynamic form routes from plan and registry"
```

---

## Task 8: Top-Level Docs and ADR

**Files:**
- Modify: `docs/adr/0001-retire-dynamic-form-platform.md`
- Modify: `AGENTS.md`
- Modify: `docs/AGENT_GUIDE.md`
- Modify: `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- Modify: `CONTEXT.md`
- Modify: `CLAUDE.md`（line 7 仍引用"283 张源表单"作为 deep-read trigger，需同步去除）

- [ ] **Step 1: Align ADR archive policy with the source spec**

ADR `docs/adr/0001-retire-dynamic-form-platform.md` 如仍要求删除 archive 历史资料，必须改为与 source spec 一致：

- 删除运行时代码、生成物、脚本、当前 hard-gate 事实源和活跃协议引用。
- `archive/superpowers/` 下的 model-landing 历史 spec/plan/csv 保留为历史资料。
- archive 历史资料不得作为当前实现合同、运行时输入、hard gate 或 model-landing 冻结事实源。

Run:

```bash
rg -n "archive 副本|archive/superpowers" docs/adr/0001-retire-dynamic-form-platform.md
```

Expected: 命中行均明确语义为"archive 历史资料保留，但不再是当前事实源"。不得出现要求删除 archive 历史资料或 archive CSV 的表述。

- [ ] **Step 2: Update AGENTS and AGENT_GUIDE**

In `AGENTS.md`, remove hard-gate bullet:

```text
deciding between `RecordTemplate/Record` and independent business tables
```

In `docs/AGENT_GUIDE.md`:
- Remove model-landing from the opening summary.
- Remove dynamic form object classification.
- Delete the entire `Model Landing 合同` section.
- Renumber following sections if needed.

Run:

```bash
rg -n "RecordTemplate|RecordTaskAssignment|RecordTaskInstance|动态表单|model-landing|283 张|Model Landing" AGENTS.md docs/AGENT_GUIDE.md
```

Expected: zero output.

- [ ] **Step 3: Update master data and traceability hard gate**

In `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`:
- Remove `server/src/modules/model-landing/` as source of truth.
- Remove 283 source form mapping paragraph and model-landing verification command.
- Remove `RecordTemplate / Record` as a valid dynamic record option.
- Change split guidance to “检查项进入对应业务记录模型”.
- Remove document-control boundary rows for `RecordTemplate` and `Record`.
- Remove checklist items about `Record.data` and `model-landing.generated.ts`.

Run:

```bash
rg -n "RecordTemplate|RecordTaskAssignment|RecordTaskInstance|动态记录表单|model-landing|283 张|model-landing.generated|Record\\.data|记录表单或" docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md
```

Expected: zero output.

- [ ] **Step 4: Update CONTEXT terminology**

`CONTEXT.md` 在 spec 起草期间已收口（删除 6 个术语），本步骤只做 final 校验：

```bash
rg -n "RecordTemplate|动态填报|动态表单|model-landing|283 张|记录表单索引|record-task|scheduled-task|RecordFormLandingEntry" CONTEXT.md
```

Expected: 命中行均出现在"已退役/已决议/同步移除"语境，附近能看到 `docs/adr/0001-retire-dynamic-form-platform.md` 引用。如果发现任何"仍声称支持"或"未来如何用"之类的非退役措辞，必须改写。

- [ ] **Step 5: Update CLAUDE.md trigger 列表**

`CLAUDE.md` line 7 当前是：

```text
如果任务涉及 `noidear` 运行时协议、食品安全、283 张源表单、主数据、批次、追溯、召回、MCP/API/测试操作，再继续阅读 `docs/AGENT_GUIDE.md`。
```

改写为：

```text
如果任务涉及 `noidear` 运行时协议、食品安全、主数据、批次、追溯、召回、MCP/API/测试操作，再继续阅读 `docs/AGENT_GUIDE.md`。
```

即去掉 "283 张源表单、" 子句（model-landing 已退役，AGENT_GUIDE 已不再以"283 张源表单"作为 trigger 概念）。

Run:

```bash
rg -n "283 张|动态填报|动态表单|RecordTemplate|model-landing" CLAUDE.md
```

Expected: zero output.

- [ ] **Step 6: Commit**

```bash
git add docs/adr/0001-retire-dynamic-form-platform.md AGENTS.md docs/AGENT_GUIDE.md docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md CONTEXT.md CLAUDE.md
git commit -m "docs: document dynamic form platform retirement"
```

---

## Task 9: Final Verification and Residual Reference Cleanup

**Files:**
- Read: whole repo
- Write: `tmp/retire-dynamic-forms-final-check.md`

- [ ] **Step 1: Run dynamic reference scans**

```bash
mkdir -p tmp
{
  echo "## Runtime dynamic references"
  rg -n "RecordTemplate|RecordTaskAssignment|RecordTaskInstance|RecordFormLandingEntry|ChangeEventFormTask|recordTemplate|recordTaskAssignment|recordTaskInstance|changeEventFormTask|targetTemplateId|relatedRecords|DynamicForm|FormBuilder|record\\.submitApproved|taskRecord\\.|resourceType: 'task_record'" \
    server/src client/src packages/types \
    --glob '!**/prisma/migrations/**' \
    --glob '!**/coverage/**' || true
  echo
  echo "## Retired routes"
  rg -nE "['\"]/(record-templates|templates|records|record-tasks)(/|['\"?])|/api/v1/(record-templates|templates|records|record-tasks)(/|['\"?])|record-form-index|model-landing" \
    client/src server/src packages/types \
    --glob '!**/coverage/**' || true
} > tmp/retire-dynamic-forms-final-check.md
cat tmp/retire-dynamic-forms-final-check.md
```

Expected:
- No runtime references outside retired-history docs.
- Independent routes containing `records` as a later path segment, such as `/equipment/records`, are not retired dynamic routes and must not be counted as residual dynamic references.
- Old migration SQL under `server/src/prisma/migrations` is ignored.
- If `CONTEXT.md` appears, it must be retired-history wording only.

- [ ] **Step 2: Run required verification commands**

```bash
npm run prisma:generate -w server
npm run build:server
npm run build:client
npm run typecheck:types
npm run traceability:verify -w server
```

Expected: all PASS.

- [ ] **Step 3: Run focused tests for touched modules**

```bash
npm run test -w server -- change-event traceability deviation shift-completion approval-callback-coverage
npm run test -w client -- DeviationReportView
```

Expected: all PASS. If a test file was deleted because it only covered retired dynamic forms, Jest/Vitest should report no matching tests only for deleted file names; do not treat missing deleted tests as a failure.

- [ ] **Step 4: Run GitNexus detect changes**

Run GitNexus MCP tool `mcp__gitnexus__detect_changes` for all local changes:

```text
detect_changes(repo: "noidear", scope: "all")
```

如果索引提示 stale，先在终端执行 `npx gitnexus analyze`，再重跑。

Expected:
- Changed symbols are limited to dynamic form retirement, model-landing retirement, related docs, and dependent services explicitly listed in this plan.
- If unrelated modules appear, inspect each listed file with `git diff -- <path>` before committing.

- [ ] **Step 5: Final status**

```bash
rm -f tmp/retire-dynamic-forms-impact.md \
      tmp/retire-dynamic-forms-before.txt \
      tmp/retire-dynamic-forms-final-check.md
git status --short
```

Expected:
- Only intended files are dirty before final commit.
- No `tmp/retire-dynamic-forms-*` execution-aid files are staged or left dirty.
- No dynamic runtime references remain.

---

## Completion Checklist

- [ ] Dynamic backend modules deleted.
- [ ] Dynamic frontend routes, menus, API wrappers, views and components deleted.
- [ ] `RecordTemplate`, `Record`, `RecordChangeLog`, `RecordTaskAssignment`, `RecordTaskInstance`, dynamic `Task`, `TaskRecord`, `ChangeEventFormTask`, `RecordFormLandingEntry` removed from Prisma schema.
- [ ] `record_form_landing_entries`, `record_templates`, `records`, `record_task_*`, `task_records`, `tasks`, `change_event_form_tasks` dropped by migration.
- [ ] `approval_definitions`, `approval_instances`, `approval_tasks`, `approval_actions` cleaned for dynamic resource types.
- [ ] model-landing runtime removed, archive history retained.
- [ ] Top-level docs no longer describe dynamic fill as a valid current path.
- [ ] Required verification commands pass.

Plan complete and saved to `docs/superpowers/plans/2026-05-23-dynamic-form-retirement.md`.
