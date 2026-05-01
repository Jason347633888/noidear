# GAP-405/413 Audit Report Document Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not redesign Document or InternalAudit. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Stop archived internal audit report PDFs from appearing as normal controlled system files by tagging their `Document` records with a dedicated audit-report type.

**Architecture:** Reuse the existing nullable `Document.document_type` string field and document filtering logic. Add `AUDIT_REPORT` to the allowed type constants, write that type during audit report archival, and keep system file library filtering unchanged so audit reports are excluded by default.

**Tech Stack:** NestJS internal audit report service, document constants/DTO validation, Vue document list filtering, Jest.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按项目文档和 `writing-plans` 要求完成上下文核对、范围收敛和 implementation plan 编写。
- **grill-me 校准结论：** 已确认内审报告 PDF 可以继续归档到 `Document` 用于预览/下载，但不应被当作 01-06 体系文件展示；本次选择 `document_type = 'AUDIT_REPORT'`，不新增业务表、不移动文件存储。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## File Map

- Modify: `server/src/modules/document/constants/document-control.constants.ts`
- Modify: `server/src/modules/internal-audit/report/report.service.ts`
- Modify: `server/src/modules/internal-audit/report/report.service.spec.ts`
- Check only: `client/src/views/documents/SystemFileLibrary.vue`

## Task 1: Add audit report document type

**Files:**
- Modify: `server/src/modules/document/constants/document-control.constants.ts`

- [ ] **Step 1: Add `AUDIT_REPORT` to `DOCUMENT_TYPES`**

```ts
export const DOCUMENT_TYPES = [
  'MANUAL',
  'PROCEDURE',
  'WORK_INSTRUCTION',
  'RECORD_FORM_INDEX',
  'COMPANY_FILE',
  'EXTERNAL_FILE',
  'AUDIT_REPORT',
] as const;
```

Do not add a `source_folder` value; audit report is not part of 01-06 system file categories.

## Task 2: Tag audit report archive documents

**Files:**
- Modify: `server/src/modules/internal-audit/report/report.service.ts`

- [ ] **Step 1: Add document type to `archiveToDocumentSystem()` create data**

Inside `this.prisma.document.create({ data: { ... } })`, add:

```ts
        document_type: 'AUDIT_REPORT',
        source_folder: null,
```

Keep the existing `level`, `filePath`, `fileName`, `status`, and `creatorId` behavior unchanged.

- [ ] **Step 2: Do not alter `AuditReport.documentId`**

The relation remains the archival pointer for preview/download. Do not remove it.

## Task 3: Update focused tests

**Files:**
- Modify: `server/src/modules/internal-audit/report/report.service.spec.ts`

- [ ] **Step 1: Extend the existing document archive expectation**

In the test that expects `mockPrismaService.document.create` to be called with `REC-AUDIT-${year}-006`, add:

```ts
            document_type: 'AUDIT_REPORT',
            source_folder: null,
```

The expectation should remain inside `expect.objectContaining({ data: expect.objectContaining(...) })`.

- [ ] **Step 2: Run focused test**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- report.service.spec.ts
```

Expected: PASS.

## Task 4: Verify system file library exclusion

**Files:**
- Check only: `client/src/views/documents/SystemFileLibrary.vue`

- [ ] **Step 1: Confirm filter does not include `AUDIT_REPORT`**

```bash
rg -n "systemLibraryDocumentTypes|AUDIT_REPORT" client/src/views/documents/SystemFileLibrary.vue
```

Expected: `AUDIT_REPORT` is not in the system library allowed type set. If the set is generated from `DOCUMENT_TYPES`, explicitly exclude `AUDIT_REPORT`.

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/document/constants/document-control.constants.ts server/src/modules/internal-audit/report/report.service.ts server/src/modules/internal-audit/report/report.service.spec.ts client/src/views/documents/SystemFileLibrary.vue
git commit -m "fix: tag audit report documents separately"
```
