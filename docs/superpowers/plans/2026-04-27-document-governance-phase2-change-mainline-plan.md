# Document Governance Phase 2 Change Mainline Plan

> **For agentic workers:** This is a stage plan, not the final code-level execution checklist. Before implementation, refine this into a task-by-task implementation plan using `superpowers:writing-plans`, then execute with `superpowers:subagent-driven-development` or `superpowers:executing-plans`.

**Goal:** Introduce the unified change mainline so real changes create `ChangeEvent`, generate the right form tasks, and link resulting records back to the change without duplicating form templates.

**Architecture:** `ChangeEvent` remains the main event. `ChangeEventRelation` stores impacted business objects. `ChangeEventFormTask` stores which existing `RecordTemplate` instances must be filled for this change. `Record` instances get source/use fields so the same template can support initial, change, and periodic use.

**Depends On:** Phase 0 and Phase 1 should be merged first. This phase assumes document status and strong-link validations are stable.

---

## Scope

This phase covers:

- `Record.usageType/sourceType/sourceId/changeEventId`.
- `ChangeEventRelation`.
- `ChangeEventFormTask`.
- Default form-task generation by `changeType`.
- Excluding `产品更改申请表`.
- Keeping `产品开发评审记录` only in product R&D Step 4 unless a separate future product-review scenario is approved.
- Linking `DocumentImpactReview` to `ChangeEvent`.

This phase does not implement:

- Full visual evidence chain.
- CAPA/internal-audit closure.
- Physical deletion of retired form templates.

---

## Files

- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/<timestamp>_change_mainline_form_tasks/migration.sql`
- Modify: `server/src/modules/change-event/change-event.service.ts`
- Modify: `server/src/modules/change-event/change-event.controller.ts`
- Modify: `server/src/modules/change-event/dto/create-change-event.dto.ts`
- Create: `server/src/modules/change-event/change-event-form-task.service.ts`
- Create: `server/src/modules/change-event/change-event-relation.service.ts`
- Modify: `server/src/modules/document/services/document-impact.service.ts`
- Modify: `server/src/modules/record/` or the existing record service that creates `Record`
- Modify: `client/src/api/change-event.ts`
- Create or modify: `client/src/views/change-event/ChangeEventDetail.vue`
- Modify: `client/src/views/change-event/ChangeEventList.vue`
- Test: `server/src/modules/change-event/change-event.service.spec.ts`
- Test: `server/src/modules/change-event/change-event-form-task.service.spec.ts`
- Test: `server/src/modules/document/services/document-impact.service.spec.ts`

---

## Task Outline

### Task 1: Schema

- Add nullable fields to `Record`:
  - `usageType`
  - `sourceType`
  - `sourceId`
  - `changeEventId`
- Add `ChangeEventRelation`.
- Add `ChangeEventFormTask`.
- Add relation indexes:
  - `[changeEventId]`
  - `[sourceType, sourceId]`
  - `[usageType]`
- Add `DocumentImpactReview.changeEventId`.

### Task 2: Change Type Form Rules

Define a first-pass internal map:

```text
document -> document impact review, read/training checks
record_form -> record-form landing review
recipe -> recipe/process verification forms
process -> process/HACCP verification forms
```

Rules:

- Do not include `产品更改申请表`.
- Do not include `产品开发评审记录` in default change form tasks.
- Do not ask users to manually pick form tasks in first version.

### Task 3: Create Change Event With Tasks

- `POST /change-events` creates `ChangeEvent`.
- Service generates `ChangeEventFormTask` rows from `change_type`.
- If no default form tasks exist for a type, still create the event.
- Return event with tasks and relations.

### Task 4: Fill Form Task

- Add endpoint to attach a `Record` to a `ChangeEventFormTask`.
- When attaching, set:
  - `Record.usageType = change`
  - `Record.sourceType = change_event`
  - `Record.sourceId = ChangeEvent.id`
  - `Record.changeEventId = ChangeEvent.id`
- Task status moves from `pending` to `filled`.

### Task 5: Impact Review Link

- `DocumentImpactReview` can be created from `ChangeEvent`.
- `DocumentImpactReview.changeEventId` is set when source is a change event.
- Existing sourceType/sourceId remains for compatibility.

### Task 6: UI

- Change event detail page shows:
  - basic info
  - related objects
  - default form tasks
  - linked records
  - document impact review
- Users can open a form task and fill or navigate to the existing record flow.
- First version may use route navigation instead of embedded form filling.

---

## Acceptance Criteria

- Creating a `document`, `record_form`, `recipe`, or `process` change creates the expected default form tasks.
- No new change event defaults to `产品更改申请表`.
- No generic change event defaults to `产品开发评审记录`.
- Filling a form task creates or attaches a `Record` marked `usageType=change`.
- A change detail page shows its form tasks and linked records.
- Existing non-change record creation still works without `changeEventId`.

---

## Risks

- Existing record creation APIs may be scattered; identify the actual `Record` creation service before implementation.
- Form task generation needs stable mapping from source form codes to `RecordTemplate.id`; Phase 1 validation should land first.
- If change approval already uses unified approval, avoid starting duplicate approval instances.
