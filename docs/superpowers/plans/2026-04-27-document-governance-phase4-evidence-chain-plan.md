# Document Governance Phase 4 Evidence Chain Plan

> **For agentic workers:** This is a stage plan, not the final code-level execution checklist. Before implementation, refine this into a task-by-task implementation plan using `superpowers:writing-plans`, then execute with `superpowers:subagent-driven-development` or `superpowers:executing-plans`.

**Goal:** Build a navigable compliance evidence chain from files to forms, records, approvals, audits, corrective actions, training, and change events.

**Architecture:** Use existing domain tables as sources of truth and add a query layer that resolves graph edges across `Document`, `RecordTemplate`, `Record`, `ApprovalInstance`, `ChangeEvent`, `TrainingProject`, internal audit, and CAPA. Do not duplicate business facts into `Document`.

**Depends On:** Phase 0 through Phase 3 should be merged first. This phase requires stable status, strong references, change mainline, and actionable issue routes.

---

## Scope

This phase covers:

- Evidence-chain query API.
- Node/edge contract for document governance evidence.
- Chain explorer UI.
- Exportable evidence summary.
- Integration with document detail and change detail pages.

This phase does not implement:

- New CAPA or internal-audit business logic.
- Full traceability recall graph; batch traceability remains owned by traceability modules.
- Automatic legal compliance decisions.

---

## Files

- Create: `packages/types/document-evidence-chain.ts`
- Create: `server/src/modules/document/services/document-evidence-chain.service.ts`
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/document.module.ts`
- Modify: `client/src/api/document-control.ts`
- Modify: `client/src/views/documents/AuditChainExplorer.vue`
- Modify: `client/src/views/documents/DocumentDetail.vue`
- Create: `client/src/components/document/EvidenceChainGraph.vue`
- Test: `server/src/modules/document/services/document-evidence-chain.service.spec.ts`
- Test: `client/src/views/documents/__tests__/AuditChainExplorer.spec.ts`
- Test: `client/src/components/document/__tests__/EvidenceChainGraph.spec.ts`

---

## Task Outline

### Task 1: Shared Contract

Define shared types:

```text
EvidenceNode
  id
  type
  label
  status
  route
  metadata

EvidenceEdge
  id
  source
  target
  relationType
  strength
  label

EvidenceChainResult
  root
  nodes
  edges
  warnings
```

Relation strengths:

- `strong`: real FK or validated ID.
- `validated`: service-validated polymorphic relation.
- `weak`: route/string/snapshot relation.
- `missing`: referenced target cannot be resolved.

### Task 2: Backend Resolver

Add evidence resolver for roots:

- `document`
- `record_template`
- `record`
- `change_event`
- `audit_finding`
- `corrective_action`

First pass edges:

- `Document -> RecordTemplate` through `RecordFormLandingEntry` and document references.
- `RecordTemplate -> Record` through records.
- `Record -> ApprovalInstance` through `approvalInstanceId`.
- `Document -> ReadRequirement -> ReadConfirmation`.
- `Document -> DocumentTrainingNeed -> TrainingProject`.
- `ChangeEvent -> ChangeEventFormTask -> Record`.
- `ChangeEvent -> DocumentImpactReview -> DocumentImpactItem`.
- `AuditFinding -> CorrectiveAction` where existing relations exist.

### Task 3: API

Add:

```text
GET /documents/control/evidence-chain?sourceType=document&sourceId=<id>&maxDepth=4
```

Rules:

- Max depth default 4, max 8.
- Missing weak targets return warnings, not 500.
- Response includes route hints for frontend navigation.

### Task 4: Graph UI

Create `EvidenceChainGraph.vue`:

- Render nodes in grouped columns by type.
- Use status colors but keep labels readable.
- Clicking a node navigates to its route when present.
- Show warnings for weak/missing links.

Use existing UI libraries; avoid adding a new graph dependency unless necessary. A grouped list/flow layout is acceptable for first version.

### Task 5: Explorer Integration

Update `AuditChainExplorer.vue`:

- Rename visible copy to “证据链” if appropriate.
- Allow source type selection.
- Show graph/list result.
- Add empty and warning states.

Update `DocumentDetail.vue`:

- Add “查看证据链” action.
- Opens evidence chain route with `sourceType=document&sourceId=<document.id>`.

### Task 6: Export Summary

Add a lightweight export action:

- Frontend can copy/download JSON summary first.
- PDF/Excel evidence export can be deferred unless already available through export module.

---

## Acceptance Criteria

- From a document detail page, user can open evidence chain.
- Evidence chain shows related form templates, records, approvals, training needs, impact reviews, and change events when present.
- Weak/missing links are visible as warnings.
- Query does not fail just because one target is missing.
- Chain API has service tests for document root and change-event root.
- Frontend graph/list renders non-empty and empty states.

---

## Risks

- Existing data has many weak references; graph must distinguish weak and missing instead of pretending all links are strong.
- Audit/CAPA relations may be inconsistent; only include confirmed relations in first pass.
- Avoid copying traceability batch logic into evidence chain. If a node reaches batches/lots, link out to traceability query rather than recomputing it here.
