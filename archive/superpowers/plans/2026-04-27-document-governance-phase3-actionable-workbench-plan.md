# Document Governance Phase 3 Actionable Workbench Plan

> **For agentic workers:** This is a stage plan, not the final code-level execution checklist. Before implementation, refine this into a task-by-task implementation plan using `superpowers:writing-plans`, then execute with `superpowers:subagent-driven-development` or `superpowers:executing-plans`.

**Goal:** Upgrade the document-control workbench from a count dashboard into issue queues with detail lists, ownership, and direct remediation actions.

**Architecture:** Keep `DocumentControlWorkbenchService` as the aggregation layer. Add issue detail endpoints and issue-type-specific route/actions. The workbench should guide users to the existing source-of-truth pages instead of duplicating all editing surfaces.

**Depends On:** Phase 0 should be merged first. Phase 1 is strongly recommended because strong references make issue detection more reliable.

---

## Scope

This phase covers issue queues for:

- Pending review.
- Due for review.
- Expiring external files.
- Obsolete references.
- Broken references.
- Missing landing targets.
- Missing metadata.
- Training needs not processed.
- Open impact items.

This phase does not implement:

- Full evidence graph visualization.
- Automatic remediation.
- New notification engine.

---

## Files

- Modify: `server/src/modules/document/services/document-control-workbench.service.ts`
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/dto/document-control.dto.ts`
- Modify: `client/src/api/document-control.ts`
- Modify: `client/src/views/documents/DocumentControlWorkbench.vue`
- Create: `client/src/views/documents/DocumentControlIssueList.vue`
- Modify: `client/src/router/index.ts`
- Test: `server/src/modules/document/services/document-control-workbench.service.spec.ts`
- Test: `client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts`
- Create: `client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts`

---

## Task Outline

### Task 1: Issue Type Contract

Define issue types:

```text
pendingReview
dueForReview
expiringExternalFiles
obsoleteReferences
brokenReferences
missingLandingTargets
missingMetadata
trainingNeeds
openImpactItems
```

Each issue item returns:

```text
id
issueType
severity
title
description
sourceType
sourceId
sourceRoute
actionLabel
actionRoute
createdAt or detectedAt
```

### Task 2: Backend Detail Endpoint

Add:

```text
GET /documents/control/workbench/issues?type=<issueType>&page=1&limit=20
```

Rules:

- Pagination is required.
- Unknown issue type returns validation error.
- Each item has an action route.
- Count endpoint remains compatible.

### Task 3: Workbench UI

- Cards show count, severity hint, and click behavior.
- Clicking a card routes to `/documents/control/workbench/issues?type=...`.
- Keep the compact dashboard layout.
- Avoid editing directly inside cards.

### Task 4: Issue List UI

Create `DocumentControlIssueList.vue`:

- Shows issue title, severity, source, detected time, and action.
- Action button routes to source document, record-form index, impact analysis, training needs, or library filter.
- Supports refresh and pagination.

### Task 5: Remediation Route Mapping

Route mapping:

- `missingMetadata` -> document edit/detail metadata area.
- `missingLandingTargets` -> record-form index edit dialog.
- `obsoleteReferences` -> document detail reference section or impact analysis.
- `dueForReview` -> document detail with review context.
- `expiringExternalFiles` -> document detail.
- `trainingNeeds` -> training needs center.
- `openImpactItems` -> impact analysis workbench.

---

## Acceptance Criteria

- Every workbench card opens a detail issue list.
- Detail list shows concrete rows, not just counts.
- Every issue row has a meaningful action route.
- Closing or fixing an issue updates counts after refresh.
- Empty queues show a clear empty state.
- Existing workbench count API remains available.

---

## Risks

- Some issue sources are weak references until Phase 1 lands; show weak-reference labels instead of failing the whole queue.
- Some action routes may not yet support deep linking; implement query params first and avoid large page rewrites.
- Counts and detail queries must share predicates to avoid mismatched numbers.
