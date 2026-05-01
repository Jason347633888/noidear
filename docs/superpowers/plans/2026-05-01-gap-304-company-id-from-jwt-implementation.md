# GAP-304 Company ID From JWT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Do not redesign the business boundary. If a task appears wrong, stop and report the mismatch to the main agent.

**Goal:** Remove hardcoded `company_id = '1'` from the quality / QC / CAPA / complaint chain covered by `GAP-304`, and make these modules use the authenticated user's `companyId` consistently for writes, reads, updates, close/resolve/verification, analytics, and scoped sequence counting.

**Spec:** `docs/superpowers/specs/2026-05-01-gap-304-company-id-from-jwt-design.md`

**Architecture:** Add `User.company_id` as the authentication tenant source, include `companyId` in JWT and `req.user`, pass `companyId` from controllers into services, and enforce `company_id` filters in every service method that reads or mutates tenant-owned quality data. Existing single-tenant data remains under company `"1"`.

**Non-goals:** Do not implement `GAP-303`, `GAP-305`, `GAP-314`, `GAP-600`, a `Company` admin model, or a global cleanup of every hardcoded `company_id` in the repository.

---

## File Map

- Modify: `server/src/prisma/schema.prisma` — add `User.company_id String @default("1")`
- Add: `server/src/prisma/migrations/YYYYMMDDHHMMSS_add_user_company_id/migration.sql`
- Modify: `server/src/modules/auth/auth.service.ts` — include `companyId` in login token, profile payload, generated tokens
- Modify: `server/src/modules/auth/auth.strategy.ts` — expose `companyId` on `req.user`
- Modify: `server/src/modules/auth/sso.service.ts` — create SSO users with company `"1"` and sign `companyId`
- Optional Add: `server/src/modules/auth/authenticated-user.ts` — shared request-user type/helper if it reduces local duplication
- Modify: `server/src/modules/ccp/ccp.controller.ts`
- Modify: `server/src/modules/ccp/ccp.service.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.controller.ts`
- Modify: `server/src/modules/non-conformance/non-conformance.service.ts`
- Modify: `server/src/modules/workflow-triggers/workflow-triggers.service.ts` — scope automatic NonConformance numbering by payload `company_id`
- Modify: `server/src/modules/corrective-action/corrective-action.controller.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.service.ts`
- Modify: `server/src/modules/corrective-action/verification-record.service.ts`
- Modify: `server/src/modules/corrective-action/capa-analytics.service.ts`
- Modify: `server/src/modules/customer-complaint/customer-complaint.controller.ts`
- Modify: `server/src/modules/customer-complaint/customer-complaint.service.ts`
- Modify: `server/src/modules/statistics/statistics.controller.ts`
- Modify: `server/src/modules/statistics/management-dashboard.service.ts` — scope NC/CAPA dashboard data by `companyId`
- Modify tests or add focused tests beside the touched services/controllers.

Optional same-PR inclusion, only if implementation stays small:

- Modify: `server/src/modules/rework-record/rework-record.service.ts`

`rework-record` is referenced by `docs/module-usage/09-nonconformance-capa.md` as the same GAP-304 class, but it is not in the core `99-current-gap-register.md` evidence list. Include it only if doing so does not expand the PR into a broader quality-module cleanup.

---

## Task 1: Auth Tenant Context

**Files:**
- `server/src/prisma/schema.prisma`
- New migration under `server/src/prisma/migrations/`
- `server/src/modules/auth/auth.service.ts`
- `server/src/modules/auth/auth.strategy.ts`
- `server/src/modules/auth/sso.service.ts`

- [ ] Add `company_id String @default("1")` to `model User`.
- [ ] Create a Prisma migration that adds `company_id TEXT NOT NULL DEFAULT '1'` to `users`.
- [ ] Update `AuthService.login()` user query/token payload to include `companyId: user.company_id`.
- [ ] Update login response `user` object to include `companyId` if existing API shape allows it without breaking clients.
- [ ] Update `AuthService.validateUser()` and `generateToken()` types to include `companyId`.
- [ ] Update `JwtStrategy.validate()` to return:

```ts
{
  id: payload.sub,
  userId: payload.sub,
  username: payload.username,
  role: payload.role,
  name: payload.name,
  companyId: payload.companyId ?? '1',
}
```

- [ ] Update `SsoService` created users with `company_id: '1'` and token payload with `companyId`.
- [ ] Add or update auth tests so JWT payload / `req.user` includes `companyId`.

**Acceptance:**

- New login token includes `companyId`.
- `JwtStrategy.validate()` exposes `req.user.companyId`.
- Existing single-tenant users remain assigned to `"1"`.

---

## Task 2: CCP Tenant Isolation

**Files:**
- `server/src/modules/ccp/ccp.controller.ts`
- `server/src/modules/ccp/ccp.service.ts`
- Existing or new CCP service/controller tests.

- [ ] Controller passes `req.user.companyId` into `createRecord`, `findByBatch`, and `findMissingCCPs`.
- [ ] `createRecord(dto, operatorId, companyId)` writes `company_id: companyId`.
- [ ] `findByBatch(batchId, companyId)` filters `CCPRecord` by both `production_batch_id` and `company_id`.
- [ ] `findMissingCCPs(batchId, companyId)` may verify the `ProductionBatch` exists, but must not assert batch company ownership because `ProductionBatch` currently has no `company_id` field.
- [ ] `findMissingCCPs` filters `CCPRecord` and `CCPPoint` by `company_id: companyId`.
- [ ] Do not implement product/recipe CCP filtering here; that remains `GAP-303`.
- [ ] Do not add `company_id` to `ProductionBatch` in this PR; that is a separate production-batch tenant-boundary design.

**Acceptance:**

- A user from company `"2"` cannot see company `"1"` CCP records by guessing `batchId`; `findMissingCCPs` only considers company `"2"` CCP points and company `"2"` CCP records.
- Static search in `server/src/modules/ccp` no longer finds `company_id: '1'`.

---

## Task 3: NonConformance Tenant Isolation

**Files:**
- `server/src/modules/non-conformance/non-conformance.controller.ts`
- `server/src/modules/non-conformance/non-conformance.service.ts`
- Existing or new tests.

- [ ] Controller passes `req.user.companyId` into `create`, `findAll`, and `dispose`.
- [ ] `create(dto, userId, companyId)` counts existing records with `where: { company_id: companyId }`.
- [ ] `create` writes `company_id: companyId`.
- [ ] `findAll(companyId, status?)` always filters by `company_id`.
- [ ] `dispose(id, dto, userId, companyId)` first finds `NonConformance` by `id + company_id`; if missing, return existing not-found semantics.
- [ ] Update only the record belonging to the current company.
- [ ] `WorkflowTriggersService` automatic NonConformance creation counts existing records with `where: { company_id: payload.company_id }` before generating `nc_no`.

**Acceptance:**

- Company `"2"` cannot list or dispose company `"1"` nonconformance records.
- NC number sequence count is company-scoped.
- Auto-created NC number sequence is company-scoped.

---

## Task 4: CorrectiveAction And Verification Tenant Isolation

**Files:**
- `server/src/modules/corrective-action/corrective-action.controller.ts`
- `server/src/modules/corrective-action/corrective-action.service.ts`
- `server/src/modules/corrective-action/verification-record.service.ts`
- `server/src/modules/corrective-action/capa-analytics.service.ts`
- Existing or new tests.

- [ ] Controller passes `req.user.companyId` into create/list/detail/update/close/verification/trends.
- [ ] `CorrectiveActionService.create(dto, userId, companyId)` counts records scoped by `company_id` and writes `company_id: companyId`.
- [ ] `findAll(companyId, status?)` filters by `company_id`.
- [ ] `findById(id, companyId)` uses `findFirst({ where: { id, company_id: companyId } })`.
- [ ] `updateStatus(id, status, companyId)` verifies ownership before update.
- [ ] `close(id, verifiedBy, companyId)` verifies ownership before update.
- [ ] `VerificationRecordService.createVerification(capaId, dto, userId, companyId)` verifies the CAPA belongs to the company and writes verification `company_id: companyId`.
- [ ] `VerificationRecordService.listVerifications(capaId, companyId)` verifies the CAPA belongs to the company before listing.
- [ ] `CapaAnalyticsService.getTrends(companyId, months)` filters by `company_id`.

**Acceptance:**

- Company `"2"` cannot access, update, close, verify, or analyze company `"1"` CAPA data.
- CAPA number sequence count is company-scoped.

---

## Task 5: CustomerComplaint Tenant Isolation

**Files:**
- `server/src/modules/customer-complaint/customer-complaint.controller.ts`
- `server/src/modules/customer-complaint/customer-complaint.service.ts`
- Existing or new tests.

- [ ] Controller injects `@Request()` and passes `req.user.companyId` into create/list/resolve.
- [ ] `create(dto, companyId)` counts complaints scoped by `company_id` and writes `company_id: companyId`.
- [ ] `findAll(companyId, status?)` filters by `company_id`.
- [ ] `resolve(id, resolution, companyId)` verifies complaint ownership by `id + company_id` before update.

**Acceptance:**

- Company `"2"` cannot list or resolve company `"1"` complaints.
- Complaint number sequence count is company-scoped.

---

## Task 6: Optional ReworkRecord Check

**Files:**
- `server/src/modules/rework-record/rework-record.service.ts`
- Matching controller/tests if present.

- [ ] Inspect whether `rework-record` is exposed through a guarded controller.
- [ ] If it is part of the same authenticated quality chain, pass `companyId` through and remove `company_id: '1'`.
- [ ] If it cannot be safely included without broadening the PR, leave code unchanged and add a note to the final report that it remains a follow-up under GAP-304/GAP-315.

**Acceptance:**

- The final report explicitly says whether `rework-record` was included.

---

## Task 6.5: Management Dashboard Read Isolation

**Files:**
- `server/src/modules/statistics/statistics.controller.ts`
- `server/src/modules/statistics/management-dashboard.service.ts`

- [ ] Pass `req.user.companyId` from dashboard KPI and BRCGS readiness endpoints into `ManagementDashboardService`.
- [ ] Scope `NonConformance` counts by `company_id`.
- [ ] Scope `CorrectiveAction` counts and overdue CAPA lists by `company_id`.
- [ ] Do not add `company_id` filtering to `Document` in this PR because `Document` currently has no `company_id` field.

**Acceptance:**

- Dashboard NC/CAPA data does not include another company's quality records.

---

## Task 7: Tests And Static Checks

- [ ] Run Prisma generate after schema change:

```bash
cd server && npx prisma generate --schema=src/prisma/schema.prisma && cd ..
```

- [ ] Run focused server tests for touched modules. Prefer existing scripts if available; otherwise run Jest against touched specs:

```bash
npm run test -w server -- --runInBand auth ccp non-conformance corrective-action customer-complaint
```

- [ ] Run build:

```bash
npm run build:server
```

- [ ] Run docs validator:

```bash
node tools/check-module-usage-docs.mjs
```

- [ ] Run static tenant checks:

```bash
rg "company_id:\\s*['\\\"]1['\\\"]|where:\\s*\\{ company_id:\\s*['\\\"]1['\\\"]" \
  server/src/modules/ccp \
  server/src/modules/non-conformance \
  server/src/modules/corrective-action \
  server/src/modules/customer-complaint
```

Expected: no matches in the core GAP-304 scope.

If Task 6 includes `rework-record`, add it to the same static check.

---

## Task 8: Documentation Backfill

- [ ] Update `docs/module-usage/97-gap-triage.md` for `GAP-304` after implementation:
  - keep `spec 路径`
  - keep `plan 路径`
  - change status only if implementation is complete and verified
- [ ] Update `docs/module-usage/module-usage.manifest.json`:
  - keep `specPath`
  - keep `planPath`
  - remove roadmap ordering only after PR is completed, or leave as execution evidence per main-agent instruction
- [ ] Update `docs/module-usage/07-quality-qc-release.md` and `09-nonconformance-capa.md` current-state sections if code is changed.
- [ ] Run `node tools/check-module-usage-docs.mjs` after docs updates.

---

## Final Report Required From Executing Agent

The executing subagent must report:

- Files modified
- Whether `rework-record` was included
- Tests / checks run with pass/fail result
- Any remaining `company_id: '1'` occurrences in touched scope and why
- Whether `GAP-304` is fully closed or only partially closed

Do not merge this work with unrelated GAPs. If implementation reveals that auth company ownership needs a larger `Company` model design, stop and return control to the main agent.
