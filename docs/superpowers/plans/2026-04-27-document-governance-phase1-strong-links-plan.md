# Document Governance Phase 1 Strong Links Plan

> **For agentic workers:** This is a stage plan, not the final code-level execution checklist. Before implementation, refine this into a task-by-task implementation plan using `superpowers:writing-plans`, then execute with `superpowers:subagent-driven-development` or `superpowers:executing-plans`.

**Goal:** Tighten weak document-control references so new data cannot point at missing departments, users, roles, record templates, training projects, or documents.

**Architecture:** Keep existing tables where possible and add narrow nullable FK fields plus service-layer validation for polymorphic references. Migrate writes first, preserve legacy reads, then backfill only when data can be mapped safely.

**Depends On:** Phase 0 status and document-management usability work should be merged first, because this phase assumes status labels and document edit flows are stable.

---

## Scope

This phase covers:

- `Document.ownerDepartmentId` and `Document.ownerUserId`.
- `RecordFormLandingEntry.targetTemplateId -> RecordTemplate.id`.
- `RecordFormLandingEntry.relatedDocIds` validation.
- `DocumentTrainingNeed.linkedTrainingProjectId -> TrainingProject.id`.
- `DocumentReadRequirement.scopeType/scopeId` service-layer validation.
- Compatibility for legacy string fields.

This phase does not implement:

- `ChangeEventFormTask`.
- `Record.usageType`.
- Evidence-chain graph traversal.
- Full workbench remediation UX beyond validation errors.

---

## Files

- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/<timestamp>_document_governance_strong_links/migration.sql`
- Modify: `server/src/modules/document/document.service.ts`
- Modify: `server/src/modules/document/services/document-control-metadata.service.ts`
- Modify: `server/src/modules/document/services/record-form-landing.service.ts`
- Modify: `server/src/modules/document/services/document-training-need.service.ts`
- Modify: `server/src/modules/document/services/document-read-requirement.service.ts`
- Modify: `server/src/modules/document/dto/document-control.dto.ts`
- Modify: `client/src/api/document-control.ts`
- Modify: `client/src/views/documents/DocumentUpload.vue`
- Modify: `client/src/views/documents/DocumentDetail.vue`
- Modify: `client/src/views/documents/RecordFormLandingIndex.vue`
- Test: `server/src/modules/document/document.service.spec.ts`
- Test: `server/src/modules/document/services/record-form-landing.service.spec.ts`
- Test: `server/src/modules/document/services/document-training-need.service.spec.ts`
- Test: `server/src/modules/document/services/document-read-requirement.service.spec.ts`

---

## Task Outline

### Task 1: Schema And Migration

- Add nullable `ownerDepartmentId` and `ownerUserId` to `Document`.
- Add optional relations from `Document` to `Department` and `User`.
- Convert `RecordFormLandingEntry.targetTemplateId` to a real optional FK if current data allows it; otherwise add service validation first and FK after cleanup.
- Add optional FK relation from `DocumentTrainingNeed.linkedTrainingProjectId` to `TrainingProject`.
- Add indexes for new FK fields.
- Migration must not drop legacy `owner_department` or `owner_user_id`.

Validation command:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run prisma:generate
npm run build
```

### Task 2: Document Owner Strong Reference Writes

- Normalize incoming document control metadata so new writes prefer `ownerDepartmentId` and `ownerUserId`.
- Preserve `owner_department` as a display snapshot.
- When both ID and text are provided, ID wins for permissions, filtering, and health checks.
- Add tests for valid owner IDs, missing owner IDs, and legacy text-only compatibility.

### Task 3: Record Form Landing Validation

- Reject `targetTemplateId` when no `RecordTemplate` exists.
- Reject `relatedDocIds` when any document ID does not exist or is soft-deleted.
- Keep `targetRoute` as a route string, not a database FK.
- Update `RecordFormLandingIndex` to surface validation errors clearly.

### Task 4: Training Need Project Relation

- Validate `linkedTrainingProjectId` before link.
- Link should only move to `linked` when project exists.
- Keep historical project title snapshot if available in the UI/API response.
- Add tests for missing project, valid link, and idempotent relink.

### Task 5: Read Requirement Scope Validation

- `scopeType=user` validates `User.id`.
- `scopeType=department` validates `Department.id`.
- `scopeType=role` validates `Role.id`.
- Unknown `scopeType` is rejected.
- Existing historical rows with weak references still render but cannot be newly created.

### Task 6: Backward Compatibility And UI

- Document detail displays both old `owner_department` and resolved owner if available.
- Document upload/edit lets the user choose department/user by ID where lookup UI already exists; otherwise keep text field and add backend validation only when ID is sent.
- Workbench missing metadata should treat either legacy text or new ID as acceptable during transition.

---

## Acceptance Criteria

- New document metadata cannot reference a missing owner department/user when ID fields are provided.
- New record-form landing entries cannot reference missing templates or documents.
- Training needs cannot link to nonexistent projects.
- Read requirements cannot target nonexistent user/department/role IDs.
- Legacy documents with only `owner_department` still list and open.
- `npm run build` passes in `server`.
- Targeted Jest service tests pass.

---

## Risks

- Existing bad `targetTemplateId` data may block FK creation. If found, keep FK out of the first migration and enforce validation in service first.
- Department naming may not map cleanly to `Department.id`; do not auto-backfill without a reviewed mapping.
- `TrainingProject` model names and module boundaries must be verified before implementing the FK.
