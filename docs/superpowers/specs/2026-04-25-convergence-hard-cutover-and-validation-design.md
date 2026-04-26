# Convergence Hard Cutover And Validation Design

## 1. Goal And Boundary

This spec defines the next-stage convergence work **after** the earlier traceability implementation plans have already been executed.

The purpose of this document is not to redesign traceability again. The purpose is to:

- lock the system onto one primary traceability surface
- validate that legacy entry points have truly stopped acting as primary paths
- define what may remain as local business functionality
- define what must be deleted, downgraded, or frozen
- define the acceptance gate for declaring convergence complete

This spec includes:

- hard-cutover rules
- surviving local-function boundaries
- legacy-surface classification
- validation matrix
- deletion-candidate rules
- final acceptance criteria

This spec does not include:

- redesigning the traceability business model
- redesigning the traceability query contract
- redoing the already completed implementation plans
- migration scripts beyond the cutover/cleanup scope

## 2. Upstream Dependencies

This spec depends on these existing frozen documents and completed implementation lines:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-25-contract-cleanup-and-system-convergence-design.md`
- all already-executed plans in `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/plans/`

## 3. Current Premise

`noidear` is still in test-stage operation and has not been formally launched.

That means:

- compatibility windows should be short
- validation evidence matters more than backward-compatibility ceremony
- any remaining legacy surface must justify its existence through tests, active imports, or local business value
- dead or duplicate surfaces should be removed aggressively once verified

## 4. Single Primary Traceability Surface

The system must converge onto one primary traceability surface.

That means one authoritative set of:

- primary route
- primary page
- primary client API adapter
- primary server endpoint family
- primary shared contract types
- primary test baseline

The intended primary surface is:

- route: `/traceability`
- page: `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/traceability/TraceabilityQuery.vue`
- client adapter: `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts`
- shared types: `/Users/jiashenglin/Desktop/好玩的项目/noidear/packages/types/traceability.ts`
- server domain: `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/`

## 5. What “Single Primary Traceability Surface” Does Not Mean

This does **not** mean deleting all other business capabilities.

The following may continue to exist if they stop acting like second primary traceability systems:

- batch management pages
- batch detail pages
- warehouse-local operational pages
- warehouse-local balance views
- complaint management pages
- deviation pages
- CAPA pages
- local export/report pages that no longer redefine traceability semantics

Rule:

- local business functionality may remain
- duplicate primary traceability semantics may not remain

## 6. Surviving Local Function Boundaries

A local function may remain only if all of these are true:

1. it does not provide a second primary trace query entry point
2. it does not define a second primary trace payload shape
3. it does not redefine graph or ledger semantics
4. it is not documented as the default traceability path
5. if it needs traceability results, it consumes the primary traceability contract

Examples of valid survivors:

- batch list
- batch detail
- warehouse requisition operations
- warehouse local balance operations
- complaint object management
- deviation object management
- corrective-action object management

## 7. Legacy Surface Classification

All remaining legacy surfaces must be classified into one of four buckets:

1. `Bridge`
2. `Frozen Local Function`
3. `Delete Candidate`
4. `Authority Conflict`

### 7.1 Bridge

A bridge may remain only if:

- tests still hit it
- routing still temporarily depends on it
- a thin redirect or payload-forwarding wrapper is still needed

A bridge may not take new features.

### 7.2 Frozen Local Function

A local function may remain if:

- it serves a valid non-primary business role
- it no longer redefines traceability semantics
- it does not expand into primary-trace authority again

### 7.3 Delete Candidate

An object is a delete candidate if:

- no route/menu needs it
- no tests depend on it
- no code imports need it
- no docs still point to it as primary
- no bridge responsibility remains

### 7.4 Authority Conflict

An object is in authority conflict if:

- it still acts as a primary traceability route, page, payload, or endpoint
- it still presents alternate field names or result shapes as if they were first-class
- it silently competes with the primary surface

Authority conflicts must be resolved first.

## 8. Hard Cutover Rules

The hard cutover is considered real only if all these rules hold:

1. navigation defaults to the primary route
2. new feature work lands only on the primary contract surface
3. tests default to the primary route and primary adapter
4. docs point to the primary route and primary contract
5. legacy routes are redirect-only, hidden, or removed
6. legacy DTO and local-type drift is reduced to thin compatibility wrappers or deleted

## 9. Validation Matrix

The convergence validation must cover all six layers:

1. route layer
2. page layer
3. adapter layer
4. type/DTO layer
5. server endpoint/service layer
6. test/docs layer

### 9.1 Route Validation

Verify:

- only one primary traceability route is exposed in navigation
- legacy trace routes are redirected, hidden, or removed
- route names and route titles no longer advertise legacy primary entry points

### 9.2 Page Validation

Verify:

- only one primary traceability page exists
- legacy trace pages either redirect or clearly indicate deprecated/local-only status
- no remaining legacy page presents itself as the default query UI

### 9.3 Adapter Validation

Verify:

- `client/src/api/traceability.ts` is the only primary traceability adapter
- batch and warehouse adapters do not expose duplicate primary trace query semantics
- legacy field names are absent from primary adapter flows

### 9.4 Type And DTO Validation

Verify:

- `packages/types/traceability.ts` remains the naming authority
- client-local and server-local layers no longer redefine contract names
- legacy fields like `sourceQueryHash` or `canInitiateAction` do not survive outside explicit short bridge wrappers

### 9.5 Server Validation

Verify:

- the `traceability` module is the primary endpoint family
- batch-trace and warehouse trace controllers no longer act as parallel primary authorities
- export and snapshot semantics bind back to the primary query context

### 9.6 Test And Docs Validation

Verify:

- e2e and client tests default to the primary route and contract
- docs describe only one primary traceability surface
- any remaining legacy docs are explicitly deprecated or local-scope only

## 10. Deletion Gate

Nothing should be deleted without evidence.

Before deletion, confirm:

- no route references
- no menu references
- no imports
- no unit/integration/e2e references
- no doc references as primary
- no remaining bridge responsibility

The deletion gate is passed only when all six checks are clean.

## 11. Acceptance Criteria

Convergence is complete only when all of the following are true:

1. one primary traceability route remains
2. one primary traceability page remains
3. one primary traceability adapter remains
4. one primary shared contract vocabulary remains
5. legacy routes/pages no longer act as alternate authorities
6. remaining local business functions no longer redefine traceability semantics
7. tests validate the primary surface by default
8. docs point to the primary surface by default
9. delete candidates have either been removed or entered a verified deletion queue

## 12. Output Artifacts

This phase should produce:

- a hard-cutover validation report
- an updated convergence register
- a delete-candidate register
- grep-based evidence for removed legacy vocabulary
- route/menu/test/docs evidence that the primary surface is unique

Recommended report path:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-25-convergence-hard-cutover-validation.md`

## 13. Appendix Structure

### Appendix A: Primary Surface Inventory

Fields:

- layer
- authoritative path
- authority reason
- verification command

### Appendix B: Surviving Local Functions

Fields:

- object
- business role
- why it remains
- why it is not a second primary traceability system

### Appendix C: Bridge Register

Fields:

- object
- bridge reason
- allowed lifetime
- removal trigger

### Appendix D: Delete Candidate Register

Fields:

- object
- evidence of no use
- deletion blockers
- deletion phase

### Appendix E: Validation Checklist

Checks:

- route
- page
- adapter
- type/DTO
- server
- tests/docs

## 14. Final Rule

This phase is not about broad refactoring for its own sake.

It is about proving, with evidence, that:

- the traceability system has one primary authority
- local business functions still exist where valid
- duplicate primary semantics no longer exist
- remaining legacy code is either justified as a bridge or ready for deletion
