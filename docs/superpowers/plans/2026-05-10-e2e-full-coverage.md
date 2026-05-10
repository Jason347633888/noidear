# E2E Full Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring E2E coverage from 58% (85/145 BDD scenarios) to 100% by addressing 60 remaining scenarios (automated target: 140/140).

**Architecture:** API-level Playwright tests share one hard-failing fixture builder that creates all business prerequisites through production endpoints. Ordinary automated E2E covers 140 scenarios; AUD-005 and BCK-003 are documented as non-ordinary verification; AUTH-020~022 are documented as not-current-target because SSO is outside the current product scope.

**Tech Stack:** Playwright, TypeScript, NestJS `/api/v1`, JWT bearer auth, Prisma, PostgreSQL.

---

## Final Digest Constraints

- `docs/BDD_SPEC.md` is the source of truth: 145 scenario IDs.
- Business prerequisite absence is a setup failure, not a covered BDD result.
- `AUD-005` and `BCK-003` must not be implemented as ordinary E2E tests.
- `AUTH-020`, `AUTH-021`, and `AUTH-022` must not be implemented as SSO endpoint tests in this plan.
- CCPPoint creation must use the production path: product process change with `haccp` scope, submit, approve, then verify the applied HACCP change.
- All commands are repo-relative, for example `cd client && npx playwright test ...`.

## File Structure

| Action | File | Responsibility |
| --- | --- | --- |
| Create | `client/e2e/support/e2e-fixture.ts` | Shared hard-failing fixture builder used by all new and strengthened specs. |
| Create | `client/e2e/permissions.spec.ts` | PERM-001~005 with data-backed assertions. |
| Modify | `client/e2e/auth.spec.ts` | AUTH-003/004/006/007 strengthened without SSO endpoint tests. |
| Modify | `client/e2e/approval-engine.spec.ts` | APPR-002/005/012/013 using fixture-created approval work. |
| Modify | `client/e2e/document-lifecycle.spec.ts` | DOC-006/007/010, SRC-001/004~007, RBN-003. |
| Modify | `client/e2e/audit-system.spec.ts` | AUD-001~003/011/020~022 and BCK-001/BCK-002/BCK-004 only. |
| Modify | `client/e2e/training.spec.ts` | TRN-004/011/022/024 using fixture training data. |
| Modify | `client/e2e/batch-trace.spec.ts` | BT-012/021/022/031 using fixture production batch. |
| Modify | `client/e2e/quality-compliance.spec.ts` | DEV-002/003/005, NC-003/006, REC-003/006~008. |
| Modify | `client/e2e/monitoring-alert.spec.ts` | ALT-006/007, MON-005. |
| Modify | `client/e2e/record-task.spec.ts` | TSK-005 with actual overdue task data. |
| Create | `client/e2e/ccp-records.spec.ts` | CCP-001~004. |
| Create | `client/e2e/e2e-integration/cross-module-chains.spec.ts` | BDD-E2E-001~003 cross-module business chains. |

## Task 0: Shared Hard-Failing E2E Fixture

**Files:**
- Create: `client/e2e/support/e2e-fixture.ts`
- Modify: every dependent spec imports `ensureE2EFixture(request)` in `test.beforeAll()`.

- [ ] **Step 1: Add fixture types and hard failure collector**

```typescript
import { expect, type APIRequestContext } from '@playwright/test';
import { getAuthToken } from '../helpers/api';
import { getCredentials } from '../fixtures/task-fixtures';
import { apiBaseUrl } from './urls';

const API_BASE = apiBaseUrl();

export interface E2EFixture {
  adminToken: string;
  memberToken: string;
  noRoleUserId: string;
  operatorUserId: string;
  departmentAId: string;
  departmentBId: string;
  documentRoleId: string;
  recordTemplateId: string;
  productionBatchId: string;
  productId: string;
  processStepId: string;
  ccpPointIds: string[];
  trainingPlanId: string;
  trainingProjectId: string;
  traineeUserId: string;
  approvalDocumentId: string;
  approvalTaskId: string;
}

let cached: E2EFixture | undefined;

async function requireId(label: string, value: unknown, failures: string[]): Promise<string> {
  expect.soft(value, `${label} must be created`).toBeTruthy();
  if (!value) failures.push(label);
  return String(value ?? '');
}
```

- [ ] **Step 2: Implement `ensureE2EFixture()` with `beforeAll`-compatible hard failure semantics**

Every spec that depends on shared data must use this shape:

```typescript
import { test, expect } from '@playwright/test';
import { ensureE2EFixture, type E2EFixture } from './support/e2e-fixture';

let fixture: E2EFixture;

test.beforeAll(async ({ request }) => {
  fixture = await ensureE2EFixture(request);
});
```

The helper itself must collect setup failures with `expect.soft`, then throw once if any required ID is missing:

```typescript
export async function ensureE2EFixture(request: APIRequestContext): Promise<E2EFixture> {
  if (cached) return cached;

  const failures: string[] = [];
  const { adminUser, adminPass, memberUser, memberPass } = getCredentials();
  const adminToken = await getAuthToken(request, adminUser, adminPass);
  const memberToken = await getAuthToken(request, memberUser, memberPass);

  const departmentAId = await requireId('departmentAId', await createDepartment(request, adminToken, 'E2E QA A'), failures);
  const departmentBId = await requireId('departmentBId', await createDepartment(request, adminToken, 'E2E QA B'), failures);
  const documentRoleId = await requireId('documentRoleId', await createDocumentRole(request, adminToken), failures);
  const noRoleUserId = await requireId('noRoleUserId', await createNoRoleUser(request, adminToken), failures);
  const operatorUserId = await requireId('operatorUserId', await createOperatorUser(request, adminToken, departmentAId), failures);
  const recordTemplateId = await requireId('recordTemplateId', await createRecordTemplate(request, adminToken), failures);
  const training = await createTrainingFixture(request, adminToken, memberToken);
  const approval = await createApprovalDocumentFixture(request, adminToken);
  const ccp = await createBatchAndCcpFixture(request, adminToken, operatorUserId);

  const fixture: E2EFixture = {
    adminToken,
    memberToken,
    noRoleUserId,
    operatorUserId,
    departmentAId,
    departmentBId,
    documentRoleId,
    recordTemplateId,
    productionBatchId: await requireId('productionBatchId', ccp.productionBatchId, failures),
    productId: await requireId('productId', ccp.productId, failures),
    processStepId: await requireId('processStepId', ccp.processStepId, failures),
    ccpPointIds: ccp.ccpPointIds,
    trainingPlanId: await requireId('trainingPlanId', training.planId, failures),
    trainingProjectId: await requireId('trainingProjectId', training.projectId, failures),
    traineeUserId: await requireId('traineeUserId', training.traineeUserId, failures),
    approvalDocumentId: await requireId('approvalDocumentId', approval.documentId, failures),
    approvalTaskId: await requireId('approvalTaskId', approval.approvalTaskId, failures),
  };

  expect.soft(fixture.ccpPointIds.length, 'at least two CCP points must be created').toBeGreaterThanOrEqual(2);
  if (fixture.ccpPointIds.length < 2) failures.push('ccpPointIds');

  if (failures.length > 0) {
    throw new Error(`Fixture setup failed: ${failures.join(', ')}`);
  }

  cached = fixture;
  return fixture;
}
```

- [ ] **Step 3: Implement the required CCPPoint production path exactly**

The `createBatchAndCcpFixture()` helper must follow this seven-step sequence. Do not add a test-only CCPPoint REST endpoint.

```typescript
async function createBatchAndCcpFixture(
  request: APIRequestContext,
  token: string,
  operatorUserId: string,
): Promise<{ productId: string; processStepId: string; productionBatchId: string; ccpPointIds: string[] }> {
  const product = await postJson(request, token, '/products', {
    name: `E2E CCP Product ${Date.now()}`,
    code: `E2E-CCP-${Date.now()}`,
  });
  const productId = product.data?.id ?? product.id;

  const processStep = await postJson(request, token, '/process-steps', {
    product_id: productId,
    name: 'E2E CCP Heat Treatment',
    sequence: 1,
  });
  const processStepId = processStep.data?.id ?? processStep.id;

  const change = await postJson(request, token, `/products/${productId}/process-changes`, {
    scopes: ['haccp'],
    reason: 'E2E HACCP fixture',
    payloadJson: {
      ccpPoints: [
        { ccp_no: 'CCP-01', process_step_id: processStepId, critical_limit: 'temperature <= 80', monitoring_method: 'probe' },
        { ccp_no: 'CCP-02', process_step_id: processStepId, critical_limit: 'temperature <= 90', monitoring_method: 'probe' },
        { ccp_no: 'CCP-03', process_step_id: processStepId, critical_limit: 'pressure <= 10', monitoring_method: 'gauge' },
      ],
    },
  });
  const planId = change.data?.id ?? change.id;

  await postJson(request, token, `/product-process-changes/${planId}/submit`, {});
  const approvalTask = await findApprovalTaskForSubject(request, token, planId);
  await approveTask(request, token, approvalTask.id, 'Approve HACCP fixture so applyHaccpChange creates CCPPoint rows');

  const productionBatch = await postJson(request, token, '/production-batches', {
    product_id: productId,
    batch_no: `E2E-BATCH-${Date.now()}`,
    operator_id: operatorUserId,
  });
  const productionBatchId = productionBatch.data?.id ?? productionBatch.id;

  const missing = await getJson(request, token, `/ccp/records/missing/${productionBatchId}`);
  const ccpPointIds = (missing.data ?? missing.items ?? missing)
    .filter((item: any) => ['CCP-01', 'CCP-02', 'CCP-03'].includes(item.ccp_no ?? item.ccpNo))
    .map((item: any) => item.id ?? item.ccp_point_id ?? item.ccpPointId);

  if (ccpPointIds.length < 2) {
    const batchRecords = await getJson(request, token, `/ccp/records/batch/${productionBatchId}`);
    const fromRecords = (batchRecords.data ?? batchRecords.items ?? [])
      .map((item: any) => item.ccp_point_id ?? item.ccpPointId)
      .filter(Boolean);
    ccpPointIds.push(...fromRecords);
  }

  if (ccpPointIds.length < 2) {
    throw new Error('Fixture setup failed: CCPPoint could not be created');
  }

  return { productId, processStepId, productionBatchId, ccpPointIds };
}
```

- [ ] **Step 4: Verify Task 0 in isolation**

Run:

```bash
cd client && npx playwright test e2e/ccp-records.spec.ts --grep "fixture smoke" --project=api
```

Expected: fixture setup passes and no test is counted as BDD-covered unless all required IDs exist.

## Task 1: Permissions, Auth, Approval, Document, Audit Weak Assertion Strengthening

**Files:**
- Create: `client/e2e/permissions.spec.ts`
- Modify: `client/e2e/auth.spec.ts`
- Modify: `client/e2e/approval-engine.spec.ts`
- Modify: `client/e2e/document-lifecycle.spec.ts`
- Modify: `client/e2e/audit-system.spec.ts`
- Modify: `client/e2e/record-task.spec.ts`

- [ ] **Step 1: Replace weak assertions with fixture-backed business consequences**

Implement these exact expectations:

| Scenario | Required setup | Required assertion |
| --- | --- | --- |
| PERM-003 | Task 0 creates document permission rows | Filter by `resource=document` and assert every returned row has `resource === 'document'`. |
| PERM-005 | Task 0 creates two departments and department-scoped users | User from department A cannot read or mutate department B data; response must be a denial status and no state change occurs. |
| AUTH-003 | Task 0 creates a disposable member account | Five wrong-password attempts are rejected; a subsequent correct-password attempt is rejected only if lockout is implemented, otherwise document current non-locking behavior as a product gap assertion. |
| APPR-002 | Task 0 creates a pending approval assigned to admin | Pending list contains that approval ID, then approving changes status. |
| APPR-012 | Task 0 creates ordered approval work | Level 2 approver cannot approve before level 1; after level 1 approval, level 2 can approve. |
| APPR-013 | Task 0 creates countersign work | Document remains pending until both A1 and A2 approve, then becomes approved/effective. |
| DOC-010 | Task 0 creates published and draft documents | Search returns published document and excludes draft unless the caller has draft visibility. |
| AUD-011 | Task 0 performs a permission mutation | Permission audit log contains actor, target, before/after values. |
| TSK-005 | Task 0 creates an overdue task | Overdue query returns the task and status transition removes it from overdue results. |

- [ ] **Step 2: Run strengthened suites**

Run:

```bash
cd client && npx playwright test e2e/permissions.spec.ts e2e/auth.spec.ts e2e/approval-engine.spec.ts e2e/document-lifecycle.spec.ts e2e/audit-system.spec.ts e2e/record-task.spec.ts --project=api
```

Expected: all ordinary automated scenarios pass; no scenario is counted covered from absent business data.

## Task 2: CCP-001~004

**Files:**
- Create: `client/e2e/ccp-records.spec.ts`

- [ ] **Step 1: Implement CCP records tests**

```typescript
import { test, expect } from '@playwright/test';
import { ensureE2EFixture, type E2EFixture } from './support/e2e-fixture';
import { apiBaseUrl } from './support/urls';

const API_BASE = apiBaseUrl();
let fixture: E2EFixture;

test.beforeAll(async ({ request }) => {
  fixture = await ensureE2EFixture(request);
});

test('CCP-001: in-limit record stays within CL and creates no NC', async ({ request }) => {
  const ncBefore = await request.get(`${API_BASE}/non-conformances?source_type=ccp_deviation`, {
    headers: { Authorization: `Bearer ${fixture.adminToken}` },
  });
  const beforeCount = ((await ncBefore.json()).data ?? []).length;

  const res = await request.post(`${API_BASE}/ccp/records`, {
    headers: { Authorization: `Bearer ${fixture.adminToken}` },
    data: {
      production_batch_id: fixture.productionBatchId,
      ccp_point_id: fixture.ccpPointIds[0],
      operator_id: fixture.operatorUserId,
      measured_value: 70,
      unit: 'C',
      is_within_cl: true,
      monitored_at: new Date().toISOString(),
    },
  });
  expect([200, 201]).toContain(res.status());
  const body = await res.json();
  expect(body.data?.is_within_cl ?? body.is_within_cl).toBe(true);

  const ncAfter = await request.get(`${API_BASE}/non-conformances?source_type=ccp_deviation`, {
    headers: { Authorization: `Bearer ${fixture.adminToken}` },
  });
  const afterCount = ((await ncAfter.json()).data ?? []).length;
  expect(afterCount).toBe(beforeCount);
});

test('CCP-002: out-of-limit record creates NC with CCP number and deviation value', async ({ request }) => {
  const res = await request.post(`${API_BASE}/ccp/records`, {
    headers: { Authorization: `Bearer ${fixture.adminToken}` },
    data: {
      production_batch_id: fixture.productionBatchId,
      ccp_point_id: fixture.ccpPointIds[0],
      operator_id: fixture.operatorUserId,
      measured_value: 99,
      unit: 'C',
      is_within_cl: false,
      deviation_action: 'E2E deviation action',
      monitored_at: new Date().toISOString(),
    },
  });
  expect([200, 201]).toContain(res.status());

  const nc = await request.get(`${API_BASE}/non-conformances?source_type=ccp_deviation`, {
    headers: { Authorization: `Bearer ${fixture.adminToken}` },
  });
  const items = (await nc.json()).data ?? [];
  expect(items.some((item: any) =>
    item.source_type === 'ccp_deviation' &&
    String(item.description ?? '').includes('CCP') &&
    String(item.description ?? '').includes('99')
  )).toBe(true);
});

test('CCP-003: missing CCP query returns unrecorded CCP-02 and CCP-03', async ({ request }) => {
  const res = await request.get(`${API_BASE}/ccp/records/missing/${fixture.productionBatchId}`, {
    headers: { Authorization: `Bearer ${fixture.adminToken}` },
  });
  expect(res.ok()).toBe(true);
  const items = (await res.json()).data ?? [];
  const numbers = items.map((item: any) => item.ccp_no ?? item.ccpNo);
  expect(numbers).toEqual(expect.arrayContaining(['CCP-02', 'CCP-03']));
});

test('CCP-004: operator_id and monitored_at are persisted inside time window', async ({ request }) => {
  const before = Date.now() - 5000;
  const monitoredAt = new Date().toISOString();
  const res = await request.post(`${API_BASE}/ccp/records`, {
    headers: { Authorization: `Bearer ${fixture.adminToken}` },
    data: {
      production_batch_id: fixture.productionBatchId,
      ccp_point_id: fixture.ccpPointIds[1],
      operator_id: fixture.operatorUserId,
      measured_value: 8,
      unit: 'bar',
      is_within_cl: true,
      monitored_at: monitoredAt,
    },
  });
  expect([200, 201]).toContain(res.status());
  const body = await res.json();
  const record = body.data ?? body;
  expect(record.operator_id ?? record.operatorId).toBe(fixture.operatorUserId);
  expect(new Date(record.monitored_at ?? record.monitoredAt).getTime()).toBeGreaterThanOrEqual(before);
  expect(new Date(record.monitored_at ?? record.monitoredAt).getTime()).toBeLessThanOrEqual(Date.now() + 5000);
});
```

- [ ] **Step 2: Run CCP tests**

Run:

```bash
cd client && npx playwright test e2e/ccp-records.spec.ts --project=api
```

Expected: CCP-001, CCP-002, CCP-003, and CCP-004 pass.

## Task 3: BDD-E2E-001~003 Cross-Module Chains

**Files:**
- Create: `client/e2e/e2e-integration/cross-module-chains.spec.ts`

- [ ] **Step 1: Implement BDD-E2E-001**

Chain: CCP deviation -> NC -> recall draft -> approval -> approved -> notified -> completed -> audit query.

Required assertions:
- The CCP deviation creates an NC with `source_type === 'ccp_deviation'`.
- The recall references the same `productionBatchId`.
- Status transitions reach `draft`, `approved`, `notified`, then `completed`.
- `GET /audit/sensitive-logs` contains entries for the CCP deviation, NC creation, recall creation, and recall status change. If an action lacks an audit record, the test fails with an explicit missing event label.

- [ ] **Step 2: Implement BDD-E2E-002**

Chain: training plan -> approval -> project -> learner task -> completion -> TrainingArchive.

Required assertions:
- Learner todo/task list contains the assigned training item.
- Completing training removes the todo from active list.
- TrainingArchive query returns the trainee, project, completion timestamp, and certificate/archive ID.

- [ ] **Step 3: Implement BDD-E2E-003**

Chain: document draft -> countersign approval A1 + A2 -> effective -> search visible -> new version -> old version superseded -> search ranks latest version first.

Required assertions:
- A1 approval alone does not publish the document.
- A2 approval makes the document effective.
- Search returns the effective document.
- Creating a new version marks the previous version superseded and search returns the latest version before the old version.

- [ ] **Step 4: Run cross-module chain tests**

Run:

```bash
cd client && npx playwright test e2e/e2e-integration/cross-module-chains.spec.ts --project=api
```

Expected: BDD-E2E-001, BDD-E2E-002, and BDD-E2E-003 pass.

## Task 4: Remaining Module Tasks

**Files:** the module specs listed in File Structure.

- [ ] **Step 1: Complete module-level additions**

Implement the remaining IDs from the coverage table in their owning files. Use `ensureE2EFixture()` for all business prerequisites. Keep each test focused on one observable business consequence.

- [ ] **Step 2: Keep manual and not-current-target items out of automated test code**

Do not add ordinary E2E tests for:
- AUD-005
- BCK-003
- AUTH-020
- AUTH-021
- AUTH-022

- [ ] **Step 3: Run the full automated target**

Run:

```bash
cd client && npx playwright test e2e --project=api
```

Expected: pass count >= 140 for BDD-mapped automated scenarios.

## Manual/Non-Ordinary Verification List

| Scenario | Reason ordinary E2E is not the right mechanism | Verification method |
| --- | --- | --- |
| AUD-005 | Cron cleanup cannot be reliably triggered in ordinary E2E. | Verify scheduler configuration and cleanup job in a controlled maintenance test or operational runbook. |
| BCK-003 | PostgreSQL outage requires fault injection outside normal E2E. | Verify backup failure alerting in an environment where database connectivity can be intentionally interrupted. |

## Not-Current-Target List

| Scenario | Reason | Follow-up trigger |
| --- | --- | --- |
| AUTH-020 | SSO login redirect is not implemented in current product scope. | Add automated coverage when SSO endpoints and provider config exist. |
| AUTH-021 | SSO callback handling is not implemented in current product scope. | Add automated coverage when callback route and token exchange exist. |
| AUTH-022 | SSO user binding is not implemented in current product scope. | Add automated coverage when account binding behavior exists. |

## Verification

Run these checks from repo root:

```bash
rg -n "85/145|140/140|140 BDD" docs/superpowers/plans/2026-05-10-e2e-full-coverage.md
rg -c "CCP-00[1-4]" docs/superpowers/plans/2026-05-10-e2e-full-coverage.md
rg -c "BDD-E2E-00[1-3]" docs/superpowers/plans/2026-05-10-e2e-full-coverage.md
rg -n "beforeAll|throw new Error" docs/superpowers/plans/2026-05-10-e2e-full-coverage.md
rg -n "Manual.*Non-Ordinary|Non-Ordinary.*Verification" docs/superpowers/plans/2026-05-10-e2e-full-coverage.md
rg -n "Coverage Accounting|145" docs/superpowers/plans/2026-05-10-e2e-full-coverage.md
rg -n "process-changes|applyHaccp|submit.*planId|product-process-changes" docs/superpowers/plans/2026-05-10-e2e-full-coverage.md
```

Expected:
- Target lines are present.
- CCP and BDD-E2E IDs are present.
- Task 0 contains `beforeAll`, `expect.soft`, and `throw new Error`.
- Manual/Non-Ordinary and Coverage Accounting sections exist.
- CCPPoint creation path includes process change draft, submit, approval, and applied HACCP verification.

## Coverage Accounting

| scenario_id | classification | notes |
| --- | --- | --- |
| ALT-001 | automated | covered by automated Playwright E2E |
| ALT-002 | automated | covered by automated Playwright E2E |
| ALT-003 | automated | covered by automated Playwright E2E |
| ALT-004 | automated | covered by automated Playwright E2E |
| ALT-005 | automated | covered by automated Playwright E2E |
| ALT-006 | automated | covered by automated Playwright E2E |
| ALT-007 | automated | covered by automated Playwright E2E |
| APPR-001 | automated | covered by automated Playwright E2E |
| APPR-002 | automated | covered by automated Playwright E2E |
| APPR-003 | automated | covered by automated Playwright E2E |
| APPR-004 | automated | covered by automated Playwright E2E |
| APPR-005 | automated | covered by automated Playwright E2E |
| APPR-006 | automated | covered by automated Playwright E2E |
| APPR-010 | automated | covered by automated Playwright E2E |
| APPR-011 | automated | covered by automated Playwright E2E |
| APPR-012 | automated | covered by automated Playwright E2E |
| APPR-013 | automated | covered by automated Playwright E2E |
| APPR-014 | automated | covered by automated Playwright E2E |
| AUD-001 | automated | covered by automated Playwright E2E |
| AUD-002 | automated | covered by automated Playwright E2E |
| AUD-003 | automated | covered by automated Playwright E2E |
| AUD-004 | automated | covered by automated Playwright E2E |
| AUD-005 | manual-non-ordinary | requires scheduler/fault-injection verification outside ordinary E2E |
| AUD-010 | automated | covered by automated Playwright E2E |
| AUD-011 | automated | covered by automated Playwright E2E |
| AUD-020 | automated | covered by automated Playwright E2E |
| AUD-021 | automated | covered by automated Playwright E2E |
| AUD-022 | automated | covered by automated Playwright E2E |
| AUTH-001 | automated | covered by automated Playwright E2E |
| AUTH-002 | automated | covered by automated Playwright E2E |
| AUTH-003 | automated | covered by automated Playwright E2E |
| AUTH-004 | automated | covered by automated Playwright E2E |
| AUTH-005 | automated | covered by automated Playwright E2E |
| AUTH-006 | automated | covered by automated Playwright E2E |
| AUTH-007 | automated | covered by automated Playwright E2E |
| AUTH-008 | automated | covered by automated Playwright E2E |
| AUTH-009 | automated | covered by automated Playwright E2E |
| AUTH-010 | automated | covered by automated Playwright E2E |
| AUTH-020 | not-current-target | SSO is not in current implementation scope |
| AUTH-021 | not-current-target | SSO is not in current implementation scope |
| AUTH-022 | not-current-target | SSO is not in current implementation scope |
| BCK-001 | automated | covered by automated Playwright E2E |
| BCK-002 | automated | covered by automated Playwright E2E |
| BCK-003 | manual-non-ordinary | requires scheduler/fault-injection verification outside ordinary E2E |
| BCK-004 | automated | covered by automated Playwright E2E |
| BT-001 | automated | covered by automated Playwright E2E |
| BT-002 | automated | covered by automated Playwright E2E |
| BT-003 | automated | covered by automated Playwright E2E |
| BT-010 | automated | covered by automated Playwright E2E |
| BT-011 | automated | covered by automated Playwright E2E |
| BT-012 | automated | covered by automated Playwright E2E |
| BT-020 | automated | covered by automated Playwright E2E |
| BT-021 | automated | covered by automated Playwright E2E |
| BT-022 | automated | covered by automated Playwright E2E |
| BT-030 | automated | covered by automated Playwright E2E |
| BT-031 | automated | covered by automated Playwright E2E |
| CCP-001 | automated | covered by automated Playwright E2E |
| CCP-002 | automated | covered by automated Playwright E2E |
| CCP-003 | automated | covered by automated Playwright E2E |
| CCP-004 | automated | covered by automated Playwright E2E |
| DEV-001 | automated | covered by automated Playwright E2E |
| DEV-002 | automated | covered by automated Playwright E2E |
| DEV-003 | automated | covered by automated Playwright E2E |
| DEV-004 | automated | covered by automated Playwright E2E |
| DEV-005 | automated | covered by automated Playwright E2E |
| DEV-006 | automated | covered by automated Playwright E2E |
| DOC-001 | automated | covered by automated Playwright E2E |
| DOC-002 | automated | covered by automated Playwright E2E |
| DOC-003 | automated | covered by automated Playwright E2E |
| DOC-004 | automated | covered by automated Playwright E2E |
| DOC-005 | automated | covered by automated Playwright E2E |
| DOC-006 | automated | covered by automated Playwright E2E |
| DOC-007 | automated | covered by automated Playwright E2E |
| DOC-010 | automated | covered by automated Playwright E2E |
| DOC-011 | automated | covered by automated Playwright E2E |
| DOC-020 | automated | covered by automated Playwright E2E |
| DOC-021 | automated | covered by automated Playwright E2E |
| DOC-022 | automated | covered by automated Playwright E2E |
| E2E-001 | automated | covered by automated Playwright E2E |
| E2E-002 | automated | covered by automated Playwright E2E |
| E2E-003 | automated | covered by automated Playwright E2E |
| MON-001 | automated | covered by automated Playwright E2E |
| MON-002 | automated | covered by automated Playwright E2E |
| MON-003 | automated | covered by automated Playwright E2E |
| MON-004 | automated | covered by automated Playwright E2E |
| MON-005 | automated | covered by automated Playwright E2E |
| NC-001 | automated | covered by automated Playwright E2E |
| NC-002 | automated | covered by automated Playwright E2E |
| NC-003 | automated | covered by automated Playwright E2E |
| NC-004 | automated | covered by automated Playwright E2E |
| NC-005 | automated | covered by automated Playwright E2E |
| NC-006 | automated | covered by automated Playwright E2E |
| PERM-001 | automated | covered by automated Playwright E2E |
| PERM-002 | automated | covered by automated Playwright E2E |
| PERM-003 | automated | covered by automated Playwright E2E |
| PERM-004 | automated | covered by automated Playwright E2E |
| PERM-005 | automated | covered by automated Playwright E2E |
| RBN-001 | automated | covered by automated Playwright E2E |
| RBN-002 | automated | covered by automated Playwright E2E |
| RBN-003 | automated | covered by automated Playwright E2E |
| RBN-004 | automated | covered by automated Playwright E2E |
| REC-001 | automated | covered by automated Playwright E2E |
| REC-002 | automated | covered by automated Playwright E2E |
| REC-003 | automated | covered by automated Playwright E2E |
| REC-004 | automated | covered by automated Playwright E2E |
| REC-005 | automated | covered by automated Playwright E2E |
| REC-006 | automated | covered by automated Playwright E2E |
| REC-007 | automated | covered by automated Playwright E2E |
| REC-008 | automated | covered by automated Playwright E2E |
| ROLE-001 | automated | covered by automated Playwright E2E |
| ROLE-002 | automated | covered by automated Playwright E2E |
| ROLE-003 | automated | covered by automated Playwright E2E |
| ROLE-004 | automated | covered by automated Playwright E2E |
| ROLE-005 | automated | covered by automated Playwright E2E |
| ROLE-006 | automated | covered by automated Playwright E2E |
| ROLE-007 | automated | covered by automated Playwright E2E |
| ROLE-008 | automated | covered by automated Playwright E2E |
| SRC-001 | automated | covered by automated Playwright E2E |
| SRC-002 | automated | covered by automated Playwright E2E |
| SRC-003 | automated | covered by automated Playwright E2E |
| SRC-004 | automated | covered by automated Playwright E2E |
| SRC-005 | automated | covered by automated Playwright E2E |
| SRC-006 | automated | covered by automated Playwright E2E |
| SRC-007 | automated | covered by automated Playwright E2E |
| SRC-008 | automated | covered by automated Playwright E2E |
| TRN-001 | automated | covered by automated Playwright E2E |
| TRN-002 | automated | covered by automated Playwright E2E |
| TRN-003 | automated | covered by automated Playwright E2E |
| TRN-004 | automated | covered by automated Playwright E2E |
| TRN-005 | automated | covered by automated Playwright E2E |
| TRN-010 | automated | covered by automated Playwright E2E |
| TRN-011 | automated | covered by automated Playwright E2E |
| TRN-012 | automated | covered by automated Playwright E2E |
| TRN-013 | automated | covered by automated Playwright E2E |
| TRN-020 | automated | covered by automated Playwright E2E |
| TRN-021 | automated | covered by automated Playwright E2E |
| TRN-022 | automated | covered by automated Playwright E2E |
| TRN-023 | automated | covered by automated Playwright E2E |
| TRN-024 | automated | covered by automated Playwright E2E |
| TSK-001 | automated | covered by automated Playwright E2E |
| TSK-002 | automated | covered by automated Playwright E2E |
| TSK-003 | automated | covered by automated Playwright E2E |
| TSK-004 | automated | covered by automated Playwright E2E |
| TSK-005 | automated | covered by automated Playwright E2E |
| TSK-006 | automated | covered by automated Playwright E2E |

## Self-Review Checklist

- [ ] Every ordinary automated scenario depends on Task 0 data or creates its own data through production APIs.
- [ ] `AUD-005`, `BCK-003`, and `AUTH-020~022` are documented only in their classification lists.
- [ ] Coverage Accounting has 145 scenario IDs: 140 automated, 2 manual-non-ordinary, 3 not-current-target.
- [ ] All commands use `cd client` or repo-root relative paths.
- [ ] Final automated verification reaches pass count >= 140.
