# Phase 15 — Governance Baseline (Task 1)

Captured: 2026-05-30

---

## 1. prisma:generate + validate

```
npm run prisma:generate -w server

✔ Generated Prisma Client (v5.22.0) to ./../node_modules/@prisma/client in ~505ms
```

`npx prisma validate` exits with P1012 (DATABASE_URL not set in env) — expected in
worktree context with no .env. Schema syntax is valid; generator succeeds cleanly.

---

## 2. Forbidden model name scan

```
rg "model DocumentRevision\b|model TrainingRecord\b|RecordTemplate|ModelLanding"
    server/src/prisma/schema.prisma server client packages
```

Matches found only in:
- `server/src/prisma/seed-e2e.ts` — comment line:
  `// 动态表单平台退役后，DeviationReport 不再关联 Record/RecordTemplate`
- `server/coverage/coverage-final.json` — transpiled path reference in coverage data

**No forbidden Prisma models present in schema.prisma.** PASS.

---

## 3. Phase 15 governance model pre-check

```
rg "model (AccessDeclaration|ExternalPartyEvaluation|LaundryWorkRecord|LaundryWorkRecordItem)"
    server/src/prisma/schema.prisma
```

Output: (empty) — none of the four Phase 15 target models exist yet. BASELINE CONFIRMED.

---

## 4. Governance-related table inventory

### Total models in schema

**147 Prisma models** as of this baseline.

### Document tables

| Model | Table | Key fields |
|-------|-------|------------|
| `Document` | `documents` | id, level, number, title, status, versionNo, revisionStatus, doc_code, doc_level, document_type, source_folder, fill_frequency, retention_years, effective_date, review_due_date |
| `DocumentVersion` | `document_versions` | id, documentId, version, filePath, fileName, fileSize, creatorId |
| `DocumentNumberCounter` | _(mapped)_ | counter for number generation |
| `DocumentReference` | _(mapped)_ | cross-document link (BR-305/306) |
| `BusinessDocumentLink` | _(mapped)_ | business entity ↔ document link |
| `SupplierDocument` | _(mapped)_ | supplier ↔ document association |

### Training tables

| Model | Table | Key fields |
|-------|-------|------------|
| `TrainingPlan` | `training_plans` | id, year (unique), title, status, approvalInstanceId |
| `TrainingProject` | `training_projects` | id, planId, title, department, quarter, trainerId, trainees[], documentIds[], passingScore, maxAttempts, status |
| `TrainingQuestion` | `training_questions` | id, projectId, type, content, options, correctAnswer, points, order |
| `LearningRecord` | `learning_records` | id, projectId, userId, examScore, attempts, passed, completedAt |
| `ExamRecord` | `exam_records` | id, learningRecordId, answers, score, submittedAt |
| `TrainingArchive` | `training_archives` | id, projectId (unique), documentId, pdfPath, generatedAt |

### Visitor tables

| Model | Table | Key fields |
|-------|-------|------------|
| `VisitorRecord` | `visitor_records` | id, company_id, visitor_name, organization, purpose, visit_date, escort, health_status, notes, created_by |

No `AccessDeclaration` model yet (Phase 15 target).

### External-party tables

| Model | Table | Key fields |
|-------|-------|------------|
| `ExternalParty` | _(no @@map)_ | id, company_id, party_type (customer/carrier/waste_collector), name, code, contact_name, contact_phone, license_no, approved_items, status |

No `ExternalPartyEvaluation` model yet (Phase 15 target).

### Laundry / hygiene tables

No `LaundryWorkRecord` or `LaundryWorkRecordItem` models yet (Phase 15 targets).

---

## 5. Latest migration

`server/src/prisma/migrations/20260530140000_extend_equipment_area_point/migration.sql`

Adds `area_point_id` FK on `equipment` table → `workshop_areas.id` (SET NULL).
No governance tables touched in this migration.

---

## 6. Phase 15 delta required

| Model | Status |
|-------|--------|
| `AccessDeclaration` | to create |
| `ExternalPartyEvaluation` | to create |
| `LaundryWorkRecord` | to create |
| `LaundryWorkRecordItem` | to create |

All four confirmed absent — schema is clean for Phase 15 implementation.
