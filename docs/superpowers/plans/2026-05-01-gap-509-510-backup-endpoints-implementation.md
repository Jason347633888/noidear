# GAP-509/510 Backup Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Do not redesign backup storage, restore execution, or backup scheduling. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Add the missing backend backup endpoints already referenced by the frontend API adapter: `GET /backup/available` and `GET /backup/:id/status`.

**GAPs:** `GAP-509`, `GAP-510`

**Spec:** Not required. This is a small backend API contract completion with no schema or historical-data migration.

**Business boundary:** Backup records are operational support records stored in `BackupHistory`. This plan only exposes safe read endpoints for existing backup history and available restore candidates. It must not perform restore, delete files, or change backup execution behavior.

**Non-goals:**

- Do not implement actual restore execution.
- Do not change backup file storage layout.
- Do not change `POST /backup/restore` behavior.
- Do not alter Docker backup commands.
- Do not add schema fields or migrations.
- Do not delete backup files or records.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按项目文档和 superpowers 写计划要求完成上下文核对、范围收敛和 implementation plan 编写。
- **grill-me 校准结论：** 主 agent 已按 grill-me 方式质询本计划的必要性、事实源边界、schema/历史数据影响、可并行性和验收方式；能通过代码和文档确认的问题已直接核对，未发现需要用户额外确认的阻塞问题。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## File Map

- Modify: `server/src/modules/backup/backup.controller.ts`
- Modify: `server/src/modules/backup/backup.service.ts`
- Modify/add focused tests near `server/src/modules/backup/` if test patterns exist.

---

## Task 1: Add `GET /backup/available`

**Files:**

- `server/src/modules/backup/backup.controller.ts`

- [ ] Add `@Get('available')` before `@Delete(':id')` to avoid route ambiguity.
- [ ] Accept optional query params:
  - `backupType?: string`
  - `limit?: number`
- [ ] Delegate to existing `backupService.listAvailableForRestore(backupType, limit || 10)`.
- [ ] Preserve class-level `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth()`.
- [ ] Do not remove `POST /backup/restore`.

**Acceptance:**

- `GET /backup/available` returns the same available-backups shape as `listAvailableForRestore`.
- Existing `POST /backup/restore` remains available.

---

## Task 2: Add `GET /backup/:id/status`

**Files:**

- `server/src/modules/backup/backup.controller.ts`
- `server/src/modules/backup/backup.service.ts`

- [ ] Add `@Get(':id/status')` before `@Delete(':id')`.
- [ ] Add a service method such as `getBackupStatus(id: string)`.
- [ ] Convert `id` to `BigInt` consistently with `deleteBackup`.
- [ ] Return the matching `BackupHistory` record.
- [ ] Throw `NotFoundException` if the record does not exist.
- [ ] Do not infer file-system status by reading backup files; use `BackupHistory.status` as the current persisted status source.

**Acceptance:**

- `GET /backup/:id/status` returns the persisted backup record.
- Missing IDs return 404.

---

## Task 3: Preserve Route Ordering

**Files:**

- `server/src/modules/backup/backup.controller.ts`

- [ ] Ensure fixed routes (`history`, `stats`, `available`) and nested status route (`:id/status`) are declared before broad `@Delete(':id')`.
- [ ] Confirm no route path is renamed.
- [ ] Do not add a broad `@Get(':id')` unless current code already has one and tests require it.

**Acceptance:**

- `GET /backup/available` is not captured by an `:id` route.
- Existing `DELETE /backup/:id` behavior is unchanged.

---

## Task 4: Verification

- [ ] Run:

```bash
rg -n "@Get\\('available'\\)|@Get\\(':id/status'\\)|getBackupStatus" server/src/modules/backup
npm run build:server
node tools/check-module-usage-docs.mjs
git diff --check
```

- [ ] If backend tests exist for backup service/controller, run the focused test file.

**Final report must include:**

- executing-plans skill confirmation.
- Exact files modified.
- Test/build command results.
- Confirmation that no restore execution behavior was added.
- Confirmation that no backup deletion was performed.
