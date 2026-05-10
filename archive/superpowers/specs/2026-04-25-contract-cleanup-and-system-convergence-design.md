# Contract Cleanup And System Convergence Design

## 1. Goal And Boundary

This spec defines how `noidear` converges duplicated, superseded, or partially superseded system surfaces after the frozen traceability stack has been designed and implemented.

The goal is:

**Collapse the current mixed system into one authoritative test baseline and one authoritative development path.**

This spec solves:

- legacy traceability entry points coexisting with the new traceability entry point
- legacy payloads and field names coexisting with the frozen contract
- old pages, old routes, old adapters, and old DTOs staying alive after the new authority is already clear
- compatibility layers that have no exit rules
- repeated query, export, and graph semantics across multiple domains

This spec includes:

- convergence decision rules
- phased convergence strategy
- business-domain convergence map
- technical-layer convergence actions
- keep / bridge / deprecate / delete rules
- compatibility-window rules
- test-baseline convergence rules
- shared-contract naming convergence rules
- deletion preflight rules
- risk controls

This spec does not include:

- redefining the traceability business model
- redefining the frozen API contract
- detailed implementation steps
- migration scripts
- UI visual design

### 1.1 Upstream Authorities

This spec depends on these frozen upstream documents:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`

### 1.2 Testing-Stage Premise

`noidear` is still in testing and has not been formally launched.

That changes the convergence posture:

- compatibility windows should be short
- bridge layers are short-lived assets, not long-term architecture
- “active use” means test usage, route/navigation usage, or code consumption, not production traffic
- the priority is not protecting historical production users
- the priority is quickly establishing one test baseline and one development main path

### 1.3 Core Direction

This is not a “make old and new coexist forever” document.

It is a document for:

- identifying what is now authoritative
- identifying what is only transitional
- preventing old entry points from absorbing more work
- removing duplicated system surfaces as soon as test and development baselines are stable

## 2. Convergence Decision Framework

Every candidate object is evaluated across three dimensions:

1. duplicate capability
2. authority clarity
3. usage state

### 2.1 Candidate Object Scope

Objects in scope include:

- routes
- pages
- client API adapters
- shared types and local types
- DTOs
- controllers
- services
- export handlers
- snapshot handlers
- test helpers
- unit tests
- integration tests
- e2e tests
- bridge mappers
- deprecation wrappers
- docs that still present legacy entry points as primary

### 2.2 Dimension A: Duplicate Capability

This dimension answers:

**Is this object still doing work already covered by the new authoritative system?**

Levels:

- `R1 High Duplicate`
- `R2 Medium Duplicate`
- `R3 Low Duplicate`

Examples of high duplication:

- two pages both serving as primary traceability query entry points
- two adapters both representing the same traceability contract with different field names
- two controllers both assembling the same trace chain result
- two export paths both generating traceability output packages from different payload shapes

### 2.3 Dimension B: Authority Clarity

This dimension answers:

**Has the system already defined a new authority for this responsibility?**

Levels:

- `A1 Clear Authority`
- `A2 Partially Clear`
- `A3 Not Yet Clear`

For this project, authority is primarily established by:

- the frozen traceability query layer spec
- the frozen traceability query API contract spec
- the shared traceability types
- the new traceability module and its downstream consumers

### 2.4 Dimension C: Usage State

Because the system is not yet launched, usage state is interpreted as test/development usage.

This dimension answers:

**Does this object still have an actual consumer in tests, routes, imports, or active development flows?**

Levels:

- `U1 Active In Tests/Development`
- `U2 Limited Use`
- `U3 Mostly Idle`
- `U4 Transitional Only`

Signals to inspect:

- route exposure
- menu exposure
- import references
- controller/service usage
- unit/integration/e2e references
- docs still pointing to it as a primary path

### 2.5 Allowed Outcomes

Every evaluated object must end in one of these outcomes:

1. `Keep As Primary Implementation`
2. `Keep As Bridge Layer`
3. `Mark Deprecated`
4. `Plan Deletion`
5. `Observe`

No vague outcomes are allowed.

### 2.6 Default Decision Matrix

- `R1 + A1 + U3/U4` -> `Plan Deletion`
- `R1 + A1 + U1/U2` -> `Mark Deprecated`, then bridge, then delete
- `R1 + A2` -> `Keep As Bridge Layer`
- `R2 + A1` -> bridge or deprecate depending on boundary clarity
- `R3 + A1/A2` -> usually `Observe`
- `A3` -> do not force convergence yet; document and observe

### 2.7 Hard Rule

Once authority is clear, the old implementation may remain only as:

- a bridge
- a redirect
- an alias
- a compatibility wrapper

It may not continue to receive new features.

## 3. Phased Convergence Strategy

This spec uses three phases:

1. `Phase 1: Short Bridge Compatibility`
2. `Phase 2: Forced Cutover`
3. `Phase 3: Active Legacy Deletion`

These phases are state transitions, not calendar suggestions.

### 3.1 Phase 1: Short Bridge Compatibility

Goal:

- make the new authority operational
- prevent new work from landing on legacy paths
- keep only the minimum bridge surface needed for tests and ongoing development

Allowed in this phase:

- route aliases
- thin adapter wrappers
- field rename mappers
- legacy page redirects
- controller aliases that forward into the new authority

Not allowed in this phase:

- adding new features to deprecated pages
- adding new fields only to old DTOs
- adding new export semantics only to old endpoints
- continuing to treat old routes as first-class user paths

Exit criteria:

- the new authority is live
- tests and docs have a viable new default path
- no new work is landing on legacy paths

### 3.2 Phase 2: Forced Cutover

Goal:

- make the new path the only default path
- reclassify legacy objects as transitional only

Required actions:

- switch navigation to the new route/page
- switch default client adapters to the new contract
- switch tests to the new path and payloads
- reclassify old routes/pages as deprecated or redirect-only
- reclassify old controller surfaces as aliases only

Exit criteria:

- primary user-visible and test-visible flows use the new path
- docs point to the new path by default
- the old path is no longer the default anywhere

### 3.3 Phase 3: Active Legacy Deletion

Goal:

- remove duplicated implementation and dead bridges

Delete candidates:

- unreferenced legacy pages
- unreferenced legacy routes
- unreferenced legacy adapters
- duplicate local types
- bridge mappers with no remaining callers
- legacy docs sections that still describe removed primary paths

Exit criteria:

- one authoritative implementation remains per capability
- bridge layers are reduced to near zero
- legacy payload vocabulary is no longer spreading through the codebase

### 3.4 Phase Advance Rule

Not every object advances phases at the same time.

Permitted pattern:

- primary routes/pages move first
- adapters and tests follow
- legacy exports and edge-case wrappers lag slightly behind

Not permitted:

- moving a legacy object back from deprecated to active feature development

### 3.5 Hard Rule

Once an object is marked deprecated, it must not take new requirements.

## 4. Business-Domain Convergence Map

This section maps likely duplication and convergence pressure by business domain.

### 4.1 Traceability Domain

Primary paths:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/traceability/TraceabilityQuery.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/`

Default outcome:

- `Keep As Primary Implementation`

Reason:

- this is the intended authoritative traceability entry point and contract-consumption surface
- this is where new query, balance, linkage, export, and snapshot semantics belong

### 4.2 Batch Trace Domain

Legacy or overlapping paths:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/batch-trace/TraceQuery.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/batch-trace/TraceReport.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/batch-trace/TraceVisualization.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/batch.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/batch-trace/`

Default outcome:

- mostly `Mark Deprecated`
- some pieces may remain as `Keep As Bridge Layer`
- only true non-overlapping batch-management functionality should be preserved

Reason:

- this domain contains older batch-trace query/report surfaces that overlap heavily with the new traceability domain

### 4.3 Warehouse Trace / Material Balance Domain

Paths:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/warehouse/Traceability.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/warehouse/MaterialBalance.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/warehouse.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/warehouse/traceability.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/warehouse/material-balance.service.ts`

Default outcome:

- global traceability behavior -> `Keep As Bridge Layer`, then `Mark Deprecated`
- warehouse-local behavior -> `Observe` or split-preserve if truly local

Reason:

- warehouse-local material operations may remain domain-specific
- warehouse-level global traceability should not remain a parallel primary entry point

### 4.4 Complaint / Recall / Deviation Linkage Domain

Paths:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/customer-complaint/`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/deviation/`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/corrective-action/`

Default outcome:

- business objects stay
- custom traceability payload shaping enters convergence

Reason:

- linkage domains should consume the new traceability result objects and action references
- they should not continue inventing their own traceability payload shapes

### 4.5 Export / Snapshot Domain

Paths:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/export/`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/` export and snapshot services
- related client export entry points

Default outcome:

- new traceability export/snapshot path is primary
- old traceability export payloads are deprecated

Reason:

- export and snapshot must bind to `sourceQueryRef`, `queryHash`, and `snapshotId`
- they should not remain independent result-shaping islands

### 4.6 Shared Contract Consumption Domain

Paths:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/packages/types/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/types/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/*.dto.ts`

Default outcome:

- `packages/types/traceability.ts` is the sole authority
- local mirror types may remain only if they re-export or apply minimal boundary-safe wrapping

Reason:

- field-name and type drift is one of the main reasons systems fail to converge

## 5. Technical-Layer Convergence Action Matrix

This section maps convergence actions by technical layer.

### 5.1 Route Layer

Objects:

- legacy route entries
- route aliases
- legacy direct URLs
- hidden-but-still-mounted route definitions

Default actions:

- new authoritative route -> `Keep As Primary Implementation`
- still-tested legacy route -> `Keep As Bridge Layer`
- unreferenced legacy route -> `Plan Deletion`

Rule:

- legacy route surfaces should move quickly to redirect-only or alias-only behavior

### 5.2 Page Layer

Objects:

- old query pages
- old report pages
- old graph/visualization pages
- old export pages

Default actions:

- new page -> primary
- strongly overlapping old page -> deprecated or deleted
- genuinely local page not yet absorbed -> bridge or observe

Rule:

- once a page is deprecated, it cannot take new features

### 5.3 Client API Adapter Layer

Objects:

- `client/src/api/*.ts` wrappers
- field remap helpers
- transitional payload-normalization adapters

Default actions:

- new contract adapter -> primary
- old adapter -> bridge then delete

Rule:

- new pages must consume the new adapter, not the legacy one

### 5.4 DTO / Type Layer

Objects:

- shared types
- client-local mirror types
- server DTOs
- legacy alias types

Default actions:

- shared contract types -> authority
- duplicate local types -> deprecated or deleted
- local boundary-safe mirrors -> allowed only as re-exports or thin wrappers

Rule:

- field names, enums, and top-level object shapes must converge toward the shared contract

### 5.5 Service / Controller Layer

Objects:

- old trace endpoints
- batch-trace controllers
- warehouse trace controllers
- service-level result assemblers

Default actions:

- new traceability query/balance/linkage/export/snapshot services -> primary
- legacy endpoints -> bridge, deprecate, or delete

Rule:

- the service layer may not continue to maintain a second primary chain-assembly pipeline

### 5.6 Export / Snapshot Layer

Objects:

- export handlers
- export payload mappers
- snapshot builders
- legacy report-download adapters

Default actions:

- new export/snapshot contract -> primary
- old traceability export format -> deprecated

Rule:

- export and snapshot must reuse authoritative query context and must not recompute a different trace result model

### 5.7 Test Layer

Objects:

- unit tests
- integration tests
- e2e flows
- fixtures
- mocks
- test helpers

Default actions:

- tests around new route and contract -> primary test baseline
- tests around old entry points -> temporary bridge, then delete

Rule:

- in a test-stage system, tests are one of the strongest indicators of real usage

### 5.8 Docs Layer

Objects:

- route docs
- API docs
- feature docs
- operator docs
- testing notes

Default actions:

- new authority docs -> primary
- old entry docs -> deprecated or deleted

Rule:

- docs may not continue describing legacy entry points as primary once authority is clear

## 6. Keep / Bridge / Deprecate / Delete Rules

### 6.1 Keep As Primary Implementation

Criteria:

- aligned with the frozen authority
- intended future default entry point
- not dependent on legacy payload semantics

Examples:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/traceability/TraceabilityQuery.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/packages/types/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/`

### 6.2 Keep As Bridge Layer

Criteria:

- still referenced by tests, routes, or development flows
- new authority already exists
- continued existence is transitional only

Hard rule:

- bridge layers must have an exit target
- bridge layers must not absorb new features

### 6.3 Mark Deprecated

Criteria:

- new authority is clear
- some remaining callers still exist
- object should continue briefly only to support cutover

Hard rule:

- deprecated objects are frozen except for removal-safe bridge changes

### 6.4 Plan Deletion

Criteria:

- no route/menu role
- no test dependency
- no code consumer
- no active bridge role

### 6.5 Observe

Criteria:

- not fully duplicated
- authority boundary still ambiguous
- still has a potentially valid local role

Rule:

- observe is temporary and must be justified with a concrete reason

## 7. Compatibility Window And Forced Cutover Rules

Because the system is still in testing, compatibility windows should be short and explicit.

### 7.1 Purpose Of Compatibility

The compatibility window exists only to:

- allow tests to move
- allow active development branches to rebase onto the new authority
- prevent immediate breakage during cutover

It does not exist to preserve long-lived historical user behavior.

### 7.2 Forced Cutover Triggers

Forced cutover should begin once:

- the new route/page is functional
- the new contract adapter is available
- key tests have a viable new path
- the old path is no longer the only path for a required capability

### 7.3 Forced Cutover Actions

- move navigation to the new route
- move default adapter usage to the new contract
- move tests to the new route and payloads
- mark old routes/pages as deprecated, redirect-only, or alias-only
- mark old docs as deprecated or remove them

### 7.4 End Of Compatibility Window

At the end of the compatibility window, an object must become either:

- `Plan Deletion`
- or `Observe`

It may not remain indefinitely as an unowned bridge layer.

## 8. Test Baseline Convergence

In the current system state, the real active baseline is the test baseline.

### 8.1 Definition

The authoritative baseline for convergence is:

- primary route coverage
- adapter contract tests
- integration coverage against authoritative endpoints
- e2e paths that represent supported behavior

### 8.2 Main Test Authorities

Tests should converge around:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/traceability/TraceabilityQuery.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/packages/types/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability/`

### 8.3 Preferred Migration Order

1. move e2e default path to the new route
2. move client adapter tests to the new contract
3. move backend integration tests to the new endpoint family
4. delete legacy tests after proving replacement coverage

### 8.4 Hard Rule

Once the new baseline tests exist, no new tests should be added against deprecated primary flows unless they are explicitly bridge-lifetime tests.

## 9. Shared Contract And Naming Convergence

This section prevents “surface-level cutover but vocabulary drift underneath.”

### 9.1 Naming Authority

Field and contract naming authority comes from:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/packages/types/traceability.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-api-contract-design.md`

### 9.2 Typical Drift Patterns To Eliminate

Examples:

- `sourceQueryHash` vs `sourceQueryRef`
- `risks` vs `risk.items`
- `canInitiateAction` vs `canInitiateLinkage`
- legacy graph node keys vs `TraceNode` / `TraceEdge`

### 9.3 Convergence Rule

- new names are authoritative
- old names may survive only in short-lived bridge mappers
- old names may not continue into new pages, new tests, new exports, or new DTOs

### 9.4 Hard Rule

The frozen contract does not move backward to match legacy consumers.

Legacy consumers must move toward the frozen contract.

## 10. Deletion Preflight Rules

Deletion must be aggressive where safe, but still verified.

### 10.1 Minimum Checks Before Deletion

For each candidate deletion, verify:

- route references
- menu references
- imports and code references
- test references
- doc references
- bridge responsibilities

### 10.2 Required Evidence Before Deletion

A delete candidate should have explicit evidence for:

- no route/menu role
- no code consumer
- no test dependency
- no formal doc entry
- no remaining bridge role

### 10.3 Hard Rule

Do not delete just because something looks old.

Also do not preserve something indefinitely just because it might be useful someday.

## 11. Risk Control

### 11.1 Main Risks

The main convergence risks are:

- bridge layers becoming permanent layers
- pages switching while adapters silently continue using old payload shapes
- tests continuing to validate old primary paths
- deleting objects that still have hidden dependencies
- documentation, routing, typing, and tests switching out of sync

### 11.2 Required Control Registers

The convergence effort should maintain:

- a primary-authority register
- a deprecated-object register
- a bridge-layer register
- a deletion-candidate register
- a test-baseline migration register
- a deletion-preflight checklist

### 11.3 Hard Rule

Convergence is multi-layer work.

Do not delete or replace only one layer while keeping the rest silently diverged.

The route, page, adapter, type, test, and docs layers must converge together.

## 12. Final Deliverable Structure

The final spec should contain:

1. Goal And Boundary
2. Convergence Decision Framework
3. Phased Convergence Strategy
4. Business-Domain Convergence Map
5. Technical-Layer Convergence Action Matrix
6. Keep / Bridge / Deprecate / Delete Rules
7. Compatibility Window And Forced Cutover Rules
8. Test Baseline Convergence
9. Shared Contract And Naming Convergence
10. Deletion Preflight Rules
11. Risk Control
12. Final Deliverable Structure

### Appendix A: Domain Convergence Inventory

Recommended fields:

- domain
- object path
- layer
- authority status
- duplicate level
- usage state
- convergence outcome
- notes

### Appendix B: Technical-Layer Action Register

Recommended fields:

- layer
- object
- current role
- target role
- phase
- owner

### Appendix C: Deprecated / Bridge / Delete Register

Recommended fields:

- object
- deprecated at
- bridge owner
- delete condition
- delete blocker

### Appendix D: Test Baseline Migration Register

Recommended fields:

- test file
- current target
- target authority
- migration phase
- verification command

### Appendix E: Deletion Preflight Checklist

Recommended checks:

- route usage
- menu usage
- imports
- tests
- docs
- bridge responsibility
- final verification command

## 13. Final Conclusion

Under the current testing-stage premise, the system-convergence objective is not long-term coexistence.

It is:

- establish one authoritative implementation
- shrink bridge-layer lifetime aggressively
- converge tests onto one baseline
- stop legacy entry points from absorbing new work
- delete duplicated surfaces as soon as they are no longer needed

### Execution Register Rule

Implementation workers must treat `docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md` as the live execution register for keep, bridge, deprecate, and delete decisions. The spec defines the rules; the register records the actual object-by-object decisions.
