# E2E Full Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Final Digest Constraints

This plan has been revised from the Design Final Digest for issue `606ab4b0-551a-43c7-b42e-9464b9dd6c3d`.

Hard rules for execution:

- `docs/BDD_SPEC.md` is read-only and authoritative.
- `grep "Scenario: BDD-" docs/BDD_SPEC.md | wc -l` currently returns **145** scenarios.
- Current explicit E2E overlap is **85/145** scenarios by BDD ID scan.
- This plan must add or strengthen coverage for the remaining **60** BDD scenarios.
- A `test.skip()` is not coverage. Skip may protect CI from missing infrastructure, but skipped scenarios must not be counted as BDD-covered.
- Do not preserve tests whose only assertion is "endpoint exists", "response has data", "not 500", or "can skip when data is missing".
- All shell commands must use relative paths from the repo root. Do not use user-machine absolute paths.

## Coverage Baseline

Run from the repo root:

```bash
grep "Scenario: BDD-" docs/BDD_SPEC.md | wc -l
python3 - <<'PY'
from pathlib import Path
import re

root = Path(".")
bdd_pat = re.compile(r"Scenario: BDD-([A-Z0-9]+)-([0-9]{3})")
test_pat = re.compile(r"\b(?:BDD-)?(AUTH|ROLE|PERM|DOC|APPR|TRN|BT|CCP|DEV|NC|REC|ALT|MON|AUD|BCK|SRC|RBN|TSK|E2E)-([0-9]{3})\b")

bdd = [f"{m.group(1)}-{m.group(2)}" for m in bdd_pat.finditer((root / "docs/BDD_SPEC.md").read_text())]
existing = set()
for spec in (root / "client/e2e").rglob("*.spec.ts"):
    for m in test_pat.finditer(spec.read_text(errors="ignore")):
        existing.add(f"{m.group(1)}-{m.group(2)}")

missing = [scenario for scenario in dict.fromkeys(bdd) if scenario not in existing]
print(f"BDD total: {len(bdd)}")
print(f"Existing explicit overlap: {len(set(bdd) & existing)}")
print(f"Missing explicit IDs: {len(missing)}")
print(",".join(missing))
PY
```

Expected baseline before implementing this plan:

- BDD total: `145`
- Existing explicit overlap: `85`
- Missing explicit IDs: `60`

## File Structure

| Action | File | Responsibility |
| --- | --- | --- |
| Create | `client/e2e/fixtures/full-coverage-fixtures.ts` | Deterministic fixture helpers used by all new or strengthened tests |
| Create | `client/e2e/permissions.spec.ts` | PERM-001~005 with deterministic data and real assertions |
| Modify | `client/e2e/auth.spec.ts` | AUTH-003~004, AUTH-006~007, AUTH-020~022 |
| Modify | `client/e2e/role-isolation.spec.ts` | ROLE-003~005 |
| Modify | `client/e2e/approval-engine.spec.ts` | APPR-002, APPR-005, APPR-012, APPR-013 |
| Modify | `client/e2e/document-lifecycle.spec.ts` | DOC-006~007, DOC-010, SRC-001, SRC-004~007, RBN-003 |
| Modify | `client/e2e/training.spec.ts` | TRN-004, TRN-011, TRN-022, TRN-024 |
| Modify | `client/e2e/batch-trace.spec.ts` | BT-012, BT-021~022, BT-031; replace static skip for BT-001 if still present |
| Create | `client/e2e/ccp-full-coverage.spec.ts` | CCP-001~004 |
| Modify | `client/e2e/quality-compliance.spec.ts` | DEV-002~003, DEV-005, NC-003, NC-006, REC-003, REC-006~008 |
| Modify | `client/e2e/monitoring-alert.spec.ts` | ALT-006~007; MON-005 only if implemented as meaningful refresh behavior |
| Modify | `client/e2e/audit-system.spec.ts` | AUD-001~003, AUD-011, AUD-020~022, BCK-001; remove AUD-005 and BCK-003 from ordinary E2E |
| Modify | `client/e2e/record-task.spec.ts` | TSK-005 with ApprovalInstance/ApprovalTask assertion |
| Create | `client/e2e/cross-module-bdd.spec.ts` | BDD-E2E-001~003 |

## Task 0: Deterministic Fixture Preparation

**Files:**

- Create: `client/e2e/fixtures/full-coverage-fixtures.ts`

- [ ] Create API-based fixture helpers. Do not write directly to the database.
- [ ] Helpers must create or verify:
  - admin user
  - member user
  - roleless user
  - at least two departments
  - roles with `document:create`, `document:delete`, and approval permissions
  - permissions `document:*` and at least one non-document permission
  - `RecordTemplate` with a numeric field and tolerance config
  - `Product`, `Recipe`, `ProductionBatch`, and `CCPPoint`
  - training plan, training project, and trainee membership
  - draft document with admin or deterministic user as assigned approver
  - searchable document and search index trigger helper

Fixture helper contract:

```typescript
export interface FullCoverageFixtures {
  adminToken: string;
  memberToken: string;
  rolelessUser: { username: string; password: string; id: string };
  departments: [{ id: string }, { id: string }];
  documentPermissionIds: string[];
  nonDocumentPermissionId: string;
  recordTemplateId: string;
  productId: string;
  recipeId: string;
  productionBatchId: string;
  ccpPointId: string;
  trainingPlanId: string;
  trainingProjectId: string;
  traineeUserId: string;
  approvableDocumentId: string;
}
```

Implementation rules:

- A missing prerequisite is a test failure for this fixture task, not a later skip.
- Fixture helpers should use idempotent names with an `e2e-full-coverage-` prefix.
- Cleanup may be best-effort, but must not delete shared seed data.

Run:

```bash
cd client
npx playwright test e2e/fixtures/full-coverage-fixtures.ts --reporter=line
```

Expected: fixture helper smoke checks pass with 0 skipped tests.

## Task 1: PERM-001~005 Permission Management

**Files:**

- Create: `client/e2e/permissions.spec.ts`

- [ ] PERM-001 creates a unique permission and asserts:
  - status is 200/201
  - response contains id
  - detail/list query can find the same `resource`, `action`, and unique key
- [ ] PERM-002 creates one permission, retries the same `resource:action`, and asserts 400/409.
- [ ] PERM-003 must first create `document:*` and non-document permissions, then filter by `resource=document`.

Required assertion for PERM-003:

```typescript
expect(items.length).toBeGreaterThan(0);
expect(items.every((item) => item.resource === 'document')).toBe(true);
expect(items.some((item) => item.action === createdDocumentAction)).toBe(true);
```

- [ ] PERM-004 uses a member without admin permission and asserts protected permission management returns 403 or 401, with 403 preferred when authenticated.
- [ ] PERM-005 creates data in department A and department B, logs in as a department A member, and asserts either:
  - response status is 403, or
  - response is 200 and no returned item has department B's id.

Forbidden:

- Returning early because the filtered list is empty.
- Passing on `status !== 401 && status < 500`.
- Counting skipped permission endpoint checks as BDD coverage.

## Task 2: AUTH-003~004, AUTH-006~007, AUTH-020~022

**Files:**

- Modify: `client/e2e/auth.spec.ts`

- [ ] AUTH-003 must verify lockout, not just failed password attempts:
  - submit four wrong passwords if needed
  - submit the fifth wrong password
  - immediately submit the correct password
  - assert correct password is rejected while locked
  - assert response status is 401 or 423 and the body contains a lock message or `lockedUntil`
- [ ] AUTH-004 must be implemented only with a stable time-control mechanism:
  - if backend exposes `lockedUntil` and the configured lock duration is safe for CI, wait until expiry and assert login succeeds
  - otherwise delete this E2E test and add it to the manual/time-control verification list
- [ ] AUTH-006 creates or uses the roleless fixture user and asserts login is rejected with an unassigned-role message.
- [ ] AUTH-007 uses a JWT missing `companyId` and asserts any protected endpoint returns 401.
- [ ] AUTH-020~022 must be handled explicitly:
  - if SSO is implemented and configurable, enable SSO in fixture config and assert redirect/success/invalid-code rejection
  - if SSO is not implemented, do not add 404-skip tests; add AUTH-020~022 to the "Not Current E2E Target" section.

Forbidden:

- `test.skip(true, 'SSO 未实现')` counted as coverage.
- Skipping AUTH-004 merely because the account is locked.

## Task 3: ROLE-003~005

**Files:**

- Modify: `client/e2e/role-isolation.spec.ts`

- [ ] ROLE-003 creates two uniquely named roles, queries with a keyword, and asserts the returned list is non-empty and every item matches the keyword in `name` or `code`.
- [ ] ROLE-004 assigns exactly three permissions to a role, queries role detail, and asserts the permission list contains those ids.
- [ ] ROLE-005 assigns a known permission id set to a role, re-fetches the role, and asserts exact membership.

Forbidden:

- Skipping because no seeded roles or permissions exist; Task 0 must create them.

## Task 4: APPR-002, APPR-005, APPR-012, APPR-013

**Files:**

- Modify: `client/e2e/approval-engine.spec.ts`

- [ ] APPR-002 must create a document and a countersign approval flow with deterministic approvers. Approve as every designated approver and assert document status becomes `effective` or the system's canonical published/effective state.
- [ ] APPR-005 must reject a reason longer than 500 characters and assert 400/422 when the actor is a designated approver.
- [ ] APPR-012 must create a sequential approval flow, reject at level 1, then query all associated approval records and assert:
  - level 1 is rejected
  - later waiting approvals become cancelled
  - document returns to draft or configured rejected state
- [ ] APPR-013 must create a sequential flow, approve all levels in order, and assert document status becomes effective.

Required APPR-012 assertion shape:

```typescript
const approvals = await fetchApprovalsForInstance(instanceId);
expect(approvals.some((item) => item.level === 1 && item.status === 'rejected')).toBe(true);
expect(approvals.filter((item) => item.level > 1).every((item) => item.status === 'cancelled')).toBe(true);
expect(document.status).toBe('draft');
```

Forbidden:

- Relying on existing pending records.
- Skipping because admin is not the designated approver.
- Passing after only checking `rejectRes.ok()`.

## Task 5: DOC, SRC, RBN Strengthening

**Files:**

- Modify: `client/e2e/document-lifecycle.spec.ts`

- [ ] DOC-006 creates documents at different levels, filters by level, and asserts every returned document has the requested level.
- [ ] DOC-007 creates a document, indexes/searches it, soft-deletes it, and asserts it is absent from document list and search results.
- [ ] DOC-010 creates a document with `review_due_date` earlier than today, queries the control center, and asserts that exact document is present with an overdue/review-due marker.

Required DOC-010 assertion shape:

```typescript
expect(overdueDocuments.some((doc) => doc.id === documentId)).toBe(true);
expect(target.overdue === true || target.reviewDue === true || target.status === 'review_due').toBe(true);
```

- [ ] SRC-001 creates or publishes a searchable document and asserts keyword search returns that document.
- [ ] SRC-004 and SRC-005 compare ordered result timestamps/scores, not only 200 responses.
- [ ] SRC-006 publishes a document, triggers indexing if supported, and asserts search finds it.
- [ ] SRC-007 deletes the indexed document and asserts search no longer finds it.
- [ ] RBN-003 soft-deletes a document, permanently deletes it from recycle bin, and asserts detail/list no longer returns it.

Forbidden:

- Treating endpoint availability as search or recycle-bin coverage.

## Task 6: TRN-004, TRN-011, TRN-022, TRN-024

**Files:**

- Modify: `client/e2e/training.spec.ts`

- [ ] TRN-004 creates a training plan, submits/approves it through the configured approval path, and asserts status is `approved`.
- [ ] TRN-011 creates a training project under an approved plan, publishes it, and asserts status changes to the canonical published/ongoing state.
- [ ] TRN-022 submits failing answers and asserts exam status is `failed` and score is below passing threshold.
- [ ] TRN-024 completes a training/exam path and asserts a training record/archive is created for the trainee.

Forbidden:

- Skipping because no plan, project, or exam exists; Task 0 must create or expose them.

## Task 7: BT-012, BT-021~022, BT-031

**Files:**

- Modify: `client/e2e/batch-trace.spec.ts`

- [ ] BT-012 creates a material batch, production batch, and `BatchMaterialUsage`; then asserts the usage record links the exact material and production batch.
- [ ] BT-021 performs backward traceability and asserts linked dynamic form records are included when they were created by the fixture.
- [ ] BT-022 creates or references a Mixing execution record and asserts backward traceability includes it.
- [ ] BT-031 performs forward traceability export and asserts response status, content type, and non-empty report body.
- [ ] Replace or remove the existing static skip for `BT-001`. If current warehouse rules require batches to be created via inbound flow, implement BT-001 through inbound creation rather than direct `POST /warehouse/batches`.

Forbidden:

- Static `test.skip('BT-001...')` remaining in a BDD full coverage suite.

## Task 8: CCP-001~004

**Files:**

- Create: `client/e2e/ccp-full-coverage.spec.ts`

- [ ] CCP-001 submits a CCP record within control limit and asserts:
  - HTTP 201
  - record id exists
  - `is_within_cl` is true
  - no new NonConformance is created for the record
- [ ] CCP-002 submits an out-of-limit CCP record and asserts:
  - HTTP 201
  - CCP record exists
  - a NonConformance is auto-created
  - NC `source_type` is `ccp_deviation`
  - NC description includes the CCP code and measured value
- [ ] CCP-003 creates a production batch requiring CCP-01, CCP-02, CCP-03; records only CCP-01; queries missing CCP items and asserts CCP-02 and CCP-03 are returned.
- [ ] CCP-004 submits a CCP record as a known operator and asserts:
  - `operatorId` equals the current user id
  - `monitored_at` exists
  - `monitored_at` is inside the submit-time window

Required CCP-004 assertion shape:

```typescript
const before = Date.now();
const created = await createCcpRecordAs(operatorToken, payload);
const after = Date.now();
expect(created.operatorId).toBe(operatorUserId);
expect(new Date(created.monitored_at).getTime()).toBeGreaterThanOrEqual(before);
expect(new Date(created.monitored_at).getTime()).toBeLessThanOrEqual(after + 1000);
```

Forbidden:

- Skipping because no CCP point exists; Task 0 must provide one.

## Task 9: DEV, NC, REC Strengthening

**Files:**

- Modify: `client/e2e/quality-compliance.spec.ts`

- [ ] DEV-002 must use the tolerance-enabled RecordTemplate from Task 0, submit an out-of-tolerance field value, and assert a new deviation report is created.
- [ ] DEV-003 must use percentage tolerance data and assert the deviation calculation/result matches percentage tolerance semantics.
- [ ] DEV-005 must assert dashboard trend data, including time bucket and count/severity distribution, matches fixture-created deviation records.
- [ ] NC-003 must construct a source belonging to another company or equivalent forbidden source; if creation succeeds, the test fails. Expected result is 400/403/422.
- [ ] NC-006 must be driven by the CCP-002 chain and assert NC source fields identify the CCP deviation.
- [ ] REC-003 creates a draft recall, submits it for review, and asserts status changed from draft to review/pending state.
- [ ] REC-006 creates a non-completed recall, cancels it, and asserts status is cancelled.
- [ ] REC-007 creates a recall notification, marks it sent, and asserts notification status and sent time. 400 is not acceptable as pass.
- [ ] REC-008 creates or links a traceability snapshot and customer complaint to a recall, then asserts the recall detail includes those exact links.

Required REC-008 assertion shape:

```typescript
expect(recall.traceSnapshotId).toBe(traceSnapshotId);
expect(recall.customerComplaintId ?? recall.complaints?.some((item) => item.id === complaintId)).toBeTruthy();
```

Forbidden:

- Computing `hasTraceOrComplaint` without asserting it.
- Skipping NC-006 because no CCP-origin NC exists.

## Task 10: ALT, MON, AUD, BCK

**Files:**

- Modify: `client/e2e/monitoring-alert.spec.ts`
- Modify: `client/e2e/audit-system.spec.ts`

- [ ] ALT-006 creates a temporary alert rule, updates it, and asserts the changed field persists after re-fetch.
- [ ] ALT-007 creates a temporary alert rule, deletes it, and asserts detail/list no longer returns it.
- [ ] MON-005 has two acceptable designs:
  - API-level: call the same monitoring metrics/dashboard endpoint twice after inserting or waiting for a new metric, then assert the second response has data and record count/version/timestamp is greater than or equal to the first in a meaningful way.
  - UI-level: verify dashboard polling triggers a second network request and the rendered timestamp or metric count updates.
- [ ] If neither meaningful design is supported by current code, delete MON-005 from ordinary E2E and move it to the manual/behavior verification list as a pure front-end polling behavior.
- [ ] AUD-001 logs in successfully, queries login logs, and asserts a `login`/`success` record for the same user/session.
- [ ] AUD-002 performs a failed login, queries login logs, and asserts a failed-login record for the same username.
- [ ] AUD-003 creates at least two log types and asserts multi-dimensional filters narrow the result set correctly.
- [ ] AUD-005 must be deleted from ordinary E2E. Add it to the manual/cron verification list.
- [ ] AUD-011 must first trigger a permission/role change and then query permission logs. Assert a new log record includes operator id plus before/after values.
- [ ] AUD-020 publishes a document and asserts a sensitive log is written for that document.
- [ ] AUD-021 deletes data and asserts a sensitive delete log is written for the deleted resource.
- [ ] AUD-022 filters sensitive logs by `resourceType` and `action`, then asserts every returned row matches both filters.
- [ ] BCK-001 triggers PostgreSQL backup and asserts a backup history record is created or updated with type `postgres`.
- [ ] BCK-003 must be deleted from ordinary E2E. Add it to the manual/fault-injection verification list.

Forbidden:

- AUD-005 code that only verifies login-log API availability.
- BCK-003 code with "test passes regardless".
- MON-005 code that only warns when timestamp is missing.

## Task 11: TSK-005

**Files:**

- Modify: `client/e2e/record-task.spec.ts`

- [ ] Create a task from the fixture RecordTemplate.
- [ ] Submit the form as the assigned user.
- [ ] Query `ApprovalInstance` or `ApprovalTask`.
- [ ] Assert an approval record exists and its source references the submitted task/record.

Required assertion shape:

```typescript
const approvals = await fetchApprovalsBySource({ sourceType: 'record_task', sourceId: taskId });
expect(approvals.length).toBeGreaterThan(0);
expect(approvals.some((approval) => approval.sourceId === taskId || approval.recordId === recordId)).toBe(true);
```

Forbidden:

- Passing only because task status is `submitted`, `pending`, or `pending_approval`.

## Task 12: BDD-E2E-001~003 Cross-Module Flows

**Files:**

- Create: `client/e2e/cross-module-bdd.spec.ts`

- [ ] BDD-E2E-001: 原料偏差触发召回的完整链路.
  - Create or reuse supplier/material.
  - Create material inbound and material batch through the supported warehouse path.
  - Create production batch and `BatchMaterialUsage`.
  - Submit out-of-limit CCP record.
  - Assert NC auto-creation.
  - Create recall linked to affected production batch.
  - Submit/approve recall.
  - Assert traceability snapshot and sensitive/audit logs reference the same chain.
- [ ] BDD-E2E-002: 培训任务出现在员工待办列表.
  - Create training plan.
  - Approve plan.
  - Create project with a deterministic trainee.
  - Publish/start project.
  - Assert `/todos` or UI todo list contains the training task for that trainee.
- [ ] BDD-E2E-003: 文档草稿 -> 审批 -> 发布 -> 搜索可见.
  - Create draft document.
  - Submit approval.
  - Approve through deterministic approval chain.
  - Publish/effective transition.
  - Trigger or wait for indexing.
  - Assert search returns the exact document.

Forbidden:

- Existing `client/e2e/cross-module-flows.spec.ts` may be reused only if the implementation removes soft-fail behavior and fails when the BDD business result is absent.

## Task 13: Non-BDD Cross-Module Additions

Add tasks or append scenarios for important business flows outside `BDD_SPEC.md`:

- [ ] Supplier/material inbound -> FIFO picking -> production batch -> `BatchMaterialUsage` -> forward/backward traceability -> export report.
- [ ] Customer complaint -> traceability snapshot -> recall -> notification -> recall evidence -> sensitive log.
- [ ] Document publish/read confirmation -> training project generation or linkage -> employee todo -> exam pass/fail -> training archive.
- [ ] Dynamic form submit -> deviation -> NC -> CAPA/disposition -> recall or close.
- [ ] Role/permission change -> protected endpoint effect -> permanent permission audit log.
- [ ] Recycle restore/permanent delete -> search index sync -> audit/sensitive log.
- [ ] Backup failure/recovery drill -> backup history -> monitoring alert trigger and recovery.

These scenarios do not change the 145 BDD count, but they close high-value end-to-end business gaps.

## Manual / Non-Ordinary-E2E Verification List

The following scenarios must not be represented as ordinary E2E tests unless the implementation provides deterministic fixtures:

| Scenario | Reason | Required verification type |
| --- | --- | --- |
| AUD-005 登录日志 90 天自动清理 | Needs cron/time control | Cron integration test or manual verification |
| BCK-003 备份失败时仍记录历史 | Needs fault injection such as stopping PostgreSQL | Dedicated fault-injection integration suite |
| AUTH-004 锁定到期可重新登录 | Needs stable time control if lock duration cannot be waited in CI | Time-control fixture or manual verification |
| AUTH-020~022 SSO | Only if SSO is not implemented/configurable | Mark as non-current implementation target |
| MON-005 自动刷新 | If API has no meaningful refresh signal | UI polling behavior verification |

## Verification

Run focused files after implementation:

```bash
cd client
npx playwright test \
  e2e/permissions.spec.ts \
  e2e/auth.spec.ts \
  e2e/role-isolation.spec.ts \
  e2e/approval-engine.spec.ts \
  e2e/document-lifecycle.spec.ts \
  e2e/training.spec.ts \
  e2e/batch-trace.spec.ts \
  e2e/ccp-full-coverage.spec.ts \
  e2e/quality-compliance.spec.ts \
  e2e/monitoring-alert.spec.ts \
  e2e/audit-system.spec.ts \
  e2e/record-task.spec.ts \
  e2e/cross-module-bdd.spec.ts \
  --reporter=line
```

Run all E2E:

```bash
cd client
npx playwright test --reporter=line
```

Coverage scan from repo root:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path(".")
bdd_pat = re.compile(r"Scenario: BDD-([A-Z0-9]+)-([0-9]{3})")
test_pat = re.compile(r"\b(?:BDD-)?(AUTH|ROLE|PERM|DOC|APPR|TRN|BT|CCP|DEV|NC|REC|ALT|MON|AUD|BCK|SRC|RBN|TSK|E2E)-([0-9]{3})\b")

bdd = [f"{m.group(1)}-{m.group(2)}" for m in bdd_pat.finditer((root / "docs/BDD_SPEC.md").read_text())]
covered = set()
for spec in (root / "client/e2e").rglob("*.spec.ts"):
    text = spec.read_text(errors="ignore")
    for m in test_pat.finditer(text):
        covered.add(f"{m.group(1)}-{m.group(2)}")

missing = [scenario for scenario in dict.fromkeys(bdd) if scenario not in covered]
print(f"BDD total: {len(bdd)}")
print(f"Covered explicit IDs: {len(set(bdd) & covered)}")
print("Missing:", ",".join(missing) if missing else "(none)")
raise SystemExit(1 if missing else 0)
PY
```

Expected after implementation:

- `BDD total: 145`
- `Covered explicit IDs: 145`
- `Missing: (none)`
- No ordinary E2E test counted as covered if it is permanently skipped or assertion-free.

## Self-Review Checklist

- [ ] No obsolete scenario-count statistics remain.
- [ ] No command contains a user-machine absolute repo path.
- [ ] `AUD-005` and `BCK-003` are removed from ordinary E2E code plans and listed in manual/fault-injection verification.
- [ ] `CCP-001~004` have a dedicated task.
- [ ] `E2E-001~003` have a dedicated cross-module task.
- [ ] `Task 0` exists and is required before APPR, CCP, DEV, NC, REC, and TSK tasks.
- [ ] PERM-003/005, AUTH-003, APPR-002/012/013, DOC-010, TSK-005 include strengthened assertion requirements.
- [ ] SSO scenarios are either implemented with enabled SSO config or explicitly marked non-current E2E target.
