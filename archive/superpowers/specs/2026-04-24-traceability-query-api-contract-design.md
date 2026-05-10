# Traceability Query API Contract Design

## 1. Goal And Boundary

This spec defines the API contract for the traceability query layer in `noidear`. Its purpose is to freeze the request and response shapes used by object-centered traceability queries, scenario-centered workbench queries, material balance analysis, linkage actions, export tasks, and query snapshots.

It exists to solve the execution-phase problems that usually cause drift:

- different agents inventing different field names for the same meaning
- object query and scenario query returning different top-level shapes
- ledger and graph views consuming different data models
- `current` and `asOf` time modes drifting across endpoints
- export, linkage, and snapshot workflows losing their source query context
- frontend, backend, tests, and export handlers each deriving their own contract

This spec includes:

- domain object definitions
- REST endpoint surface
- request contracts
- response contracts
- error and status contracts
- permission and masking contract
- filtering, sorting, pagination, and stability rules
- cross-object reference rules for query, balance, linkage, export, and snapshot
- async contract
- versioning and compatibility rules
- consumer rules and hard constraints

This spec does not include:

- redefining the traceability business chain
- redefining how source forms land into models
- database migration details
- implementation plan or task breakdown
- UI visual design

Upstream dependencies:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-traceability-query-layer-design.md`

## 2. Design Style

This spec uses a dual-layer contract model:

1. define the domain objects first
2. map them to REST endpoints second

The outer API response wrapper should continue to follow the project-wide API envelope. The inner `data` payload for traceability must follow the strict object contracts defined here.

Hard rules:

- REST endpoints must not invent new business objects outside this spec
- page components must not invent their own result shape
- tests must not guess field names from implementation details
- export and async task handlers must consume the same frozen contracts as interactive queries

## 3. Domain Objects

### 3.1 Shared Request Fields

All request objects share these field semantics when present:

- `entryMode`
- `timeMode`
- `asOfAt`
- `viewMode`
- `departmentScope`
- `includeEvidence`
- `includeAuxiliaryNodes`
- `includeRiskDetails`

These fields do not imply that every endpoint accepts every field. They define shared meaning only.

### 3.2 Request Object Family

The formal request object family is:

- `TraceQueryRequest`
- `BalanceQueryRequest`
- `LinkageCreateRequest`
- `ExportCreateRequest`
- `SnapshotCreateRequest`
- `SnapshotQueryRequest`

Hard rules:

- query-type requests and action-type requests must remain separate
- there is no single super-DTO that covers all traceability operations

### 3.3 Unified Top-Level Query Result

The unified top-level result object is:

- `TraceQueryResult`

Its stable top-level sections are:

- `summary`
- `permission`
- `risk`
- `ledger`
- `graph`
- `evidence`
- `actions`
- `export`
- `meta`
- `extensions`

Rules:

- the first nine sections are the stable contract trunk
- `extensions` is the only place where scenario-specific sections may appear
- common data must not be hidden inside `extensions`

### 3.4 Shared Node Model

The shared node object is:

- `TraceNode`

Suggested stable fields:

- `nodeId`
- `nodeType`
- `businessObject`
- `label`
- `batchNo`
- `status`
- `riskLevel`
- `timeContext`
- `permission`
- `evidenceRefs`
- `attributes`

This is the shared fact source for both ledger and graph presentations.

### 3.5 Shared Edge Model

The shared edge object is:

- `TraceEdge`

Suggested stable fields:

- `edgeId`
- `sourceNodeId`
- `targetNodeId`
- `relationType`
- `direction`
- `isMainChain`
- `isAuxiliary`
- `riskLevel`
- `attributes`

### 3.6 Risk Model

Risk uses two layers:

1. fast risk fields
2. formal risk objects

Fast fields:

- `TraceNode.riskLevel`
- `TraceEdge.riskLevel`
- `TraceQueryResult.summary.riskLevel`

Formal risk object:

- `TraceRisk`

Suggested fields:

- `riskId`
- `riskCode`
- `riskLevel`
- `title`
- `message`
- `sourceType`
- `sourceRefId`
- `affectedNodeIds`
- `affectedEdgeIds`
- `recommendedActions`
- `linkedActionIds`
- `status`
- `permission`
- `createdAt`

Hard rule:

- any `high` or `important` risk visible in the result must resolve to at least one formal `TraceRisk`

### 3.7 Permission Model

Permission uses two layers:

1. top-level permission context
2. local permission override

Top-level object:

- `TracePermissionContext`

Suggested fields:

- `departmentScope`
- `scenarioPermissions`
- `canViewSummary`
- `canViewDetail`
- `canViewEvidence`
- `canInitiateLinkage`
- `canExportSimple`
- `canExportFullPackage`
- `canUseAsOfPlayback`
- `canExecuteHighRiskAction`

Local overrides may appear on:

- `TraceNode.permission`
- `TraceEvidenceRef.permission`
- `TraceAction.permission`
- `TraceRisk.permission`

Suggested local fields:

- `visible`
- `masked`
- `expandable`
- `actionable`

Hard rule:

- top-level permission is the default boundary
- local permission may only tighten or refine, never broaden the top-level allowance

### 3.8 Linkage / Export / Snapshot Object Family

Formal objects:

- `TraceAction`
- `TraceExport`
- `TraceSnapshot`

`TraceAction` suggested fields:

- `actionId`
- `actionType`
- `status`
- `riskLevel`
- `sourceQueryRef`
- `sourceNodeIds`
- `createdAt`
- `permission`
- `attributes`

`TraceExport` suggested fields:

- `exportId`
- `exportMode`
- `status`
- `sourceQueryRef`
- `createdAt`
- `downloadRef`
- `permission`
- `attributes`

`TraceSnapshot` suggested fields:

- `snapshotId`
- `sourceQueryRef`
- `snapshotType`
- `status`
- `createdAt`
- `expiresAt`
- `payloadRef`
- `meta`

## 4. REST API Surface

The API surface is fixed into five groups:

1. `query`
2. `balance`
3. `linkage`
4. `export`
5. `snapshot`

### 4.1 Query

- `POST /traceability/query`
- `POST /traceability/query/graph`

### 4.2 Balance

- `POST /traceability/balance`
- `GET /traceability/balance/:snapshotId`

### 4.3 Linkage

- `POST /traceability/actions`
- `GET /traceability/actions/:actionId`

### 4.4 Export

- `POST /traceability/export`
- `GET /traceability/export/:exportId`
- `GET /traceability/export/:exportId/download`

### 4.5 Snapshot

- `POST /traceability/snapshots`
- `GET /traceability/snapshots/:snapshotId`
- `GET /traceability/snapshots/:snapshotId/result`

Hard rule:

- endpoint grouping may differ by URL, but the payload objects must come from the domain objects defined in this spec

## 5. Request Contracts

### 5.1 TraceQueryRequest

Required fields:

- `entryMode`
- `traceMode`
- `viewMode`
- `timeMode`

Conditionally required fields:

- when `entryMode = object`
  - `objectType`
  - `objectId`
- when `entryMode = scenario`
  - `scenario`
- when `timeMode = asOf`
  - `asOfAt`

Optional fields:

- `departmentScope`
- `includeEvidence`
- `includeAuxiliaryNodes`
- `includeRiskDetails`
- `filters`

`filters` may support:

- `productIds`
- `materialIds`
- `batchNos`
- `customerIds`
- `riskLevels`
- `statuses`
- `dateRange`
- `nodeTypes`

Hard rules:

- filters may narrow result visibility only
- filters must not redefine main-chain semantics

### 5.2 BalanceQueryRequest

Suggested fields:

- `materialLotId`
- `productionBatchId`
- `from`
- `to`
- `timeMode`
- `asOfAt`
- `includeEvidence`
- `includeRecommendations`

### 5.3 LinkageCreateRequest

Suggested fields:

- `actionType`
- `sourceQueryRef`
- `sourceNodeIds`
- `sourceRiskIds`
- `note`

### 5.4 ExportCreateRequest

Suggested fields:

- `exportMode`
- `sourceQueryRef`
- `includeEvidence`
- `includeMaskedData`

### 5.5 SnapshotCreateRequest

Suggested fields:

- `sourceQueryRef`
- `snapshotType`
- `retentionPolicy`

## 6. Response Contracts

### 6.1 TraceQueryResult

Stable top-level fields:

- `summary`
- `permission`
- `risk`
- `ledger`
- `graph`
- `evidence`
- `actions`
- `export`
- `meta`
- `extensions`

#### `summary`

Suggested fields:

- `queryId`
- `entryMode`
- `objectType`
- `objectId`
- `scenario`
- `traceMode`
- `viewMode`
- `timeMode`
- `asOfAt`
- `riskLevel`
- `resultStatus`

#### `permission`

- `TracePermissionContext`

#### `risk`

Suggested fields:

- `summaryRiskLevel`
- `riskCount`
- `highRiskCount`
- `items: TraceRisk[]`

#### `ledger`

Suggested fields:

- `columns`
- `rows`
- `grouping`
- `totals`

#### `graph`

Suggested fields:

- `nodes: TraceNode[]`
- `edges: TraceEdge[]`
- `layout`
- `legend`

#### `evidence`

Suggested fields:

- `count`
- `items: TraceEvidenceRef[]`

#### `actions`

Suggested fields:

- `available`
- `recommended`
- `created`

#### `export`

Suggested fields:

- `simpleExportAvailable`
- `fullPackageAvailable`
- `latestExportId`

#### `meta`

Suggested fields:

- `generatedAt`
- `queryHash`
- `degraded`
- `snapshotId`
- `sourceVersion`

#### `extensions`

Scenario extension keys may include:

- `balance`
- `complaint`
- `recall`
- `drill`
- `impact`

Hard rule:

- shared semantics must not be moved into `extensions`

### 6.2 BalanceQueryResult

Stable fields:

- `summary`
- `rows`
- `discrepancies`
- `recommendations`
- `evidence`
- `meta`

`summary` suggested fields:

- `analysisId`
- `scopeType`
- `scopeRefId`
- `status`
- `totalInput`
- `totalOutput`
- `totalLoss`
- `diffQty`
- `riskLevel`

Each `rows` item may include:

- `materialId`
- `materialName`
- `inputQty`
- `outputQty`
- `lossQty`
- `diffQty`
- `riskLevel`

### 6.3 TraceActionResult

Suggested fields:

- `actionId`
- `actionType`
- `status`
- `sourceQueryRef`
- `createdAt`
- `requestedBy`
- `linkedObjectType`
- `linkedObjectId`
- `writeback`

### 6.4 TraceExportResult

Suggested fields:

- `exportId`
- `exportMode`
- `status`
- `sourceQueryRef`
- `createdAt`
- `requestedBy`
- `downloadRef`
- `snapshotId`
- `meta`

### 6.5 TraceSnapshotResult

Suggested fields:

- `snapshotId`
- `sourceQueryRef`
- `snapshotType`
- `status`
- `createdAt`
- `expiresAt`
- `payloadRef`
- `meta`

## 7. Error And Status Contracts

### 7.1 Error Object

The unified error object should include:

- `errorCode`
- `errorMessage`
- `errorDetails`
- `requestId`
- `retryable`

Hard rule:

- consumers must branch on `errorCode`, not on message text

### 7.2 Core Error Codes

Validation and request errors:

- `VALIDATION_ERROR`
- `UNSUPPORTED_OBJECT_TYPE`
- `UNSUPPORTED_SCENARIO`
- `UNSUPPORTED_TIME_MODE`
- `INVALID_AS_OF_TIMESTAMP`
- `INVALID_FILTER_COMBINATION`

Permission errors:

- `PERMISSION_DENIED`
- `DETAIL_ACCESS_DENIED`
- `EVIDENCE_ACCESS_DENIED`
- `EXPORT_ACCESS_DENIED`
- `HIGH_RISK_ACTION_DENIED`

Object and result errors:

- `OBJECT_NOT_FOUND`
- `QUERY_RESULT_EMPTY`
- `RESULT_PARTIALLY_AVAILABLE`
- `CHAIN_DATA_GAP`
- `SNAPSHOT_NOT_FOUND`
- `SNAPSHOT_NOT_READY`
- `EXPORT_NOT_FOUND`
- `EXPORT_NOT_READY`

System and scope errors:

- `QUERY_SCOPE_TOO_LARGE`
- `ASYNC_REQUIRED`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

### 7.3 Query Result Status

`summary.resultStatus` is frozen to:

- `ok`
- `partial`
- `empty`
- `degraded`
- `pending`

Meaning:

- `ok`: complete successful result
- `partial`: result exists but some nodes or evidence are unavailable due to permission or data gaps
- `empty`: successful query with no hits
- `degraded`: successful query returned a reduced view because of performance or async fallback
- `pending`: request accepted and still building asynchronously

Hard rule:

- `partial` and `degraded` must not be treated as synonyms

### 7.4 Risk Status

`TraceRisk.status` is frozen to:

- `open`
- `acknowledged`
- `linked`
- `closed`

### 7.5 Action Status

`TraceActionResult.status` is frozen to:

- `created`
- `pendingReview`
- `inProgress`
- `closed`
- `rejected`

### 7.6 Export Status

`TraceExportResult.status` is frozen to:

- `queued`
- `processing`
- `ready`
- `failed`
- `expired`

### 7.7 Snapshot Status

`TraceSnapshotResult.status` is frozen to:

- `queued`
- `building`
- `ready`
- `failed`
- `expired`

Hard rule:

- query, risk, action, export, and snapshot status families must not be mixed together or reused across object categories

## 8. Permission And Masking Contract

### 8.1 Top-Level Permission Context

Every formal result object must include:

- `permission: TracePermissionContext`

### 8.2 Local Permission Overrides

Local permission overrides may appear on:

- `TraceNode.permission`
- `TraceEvidenceRef.permission`
- `TraceAction.permission`
- `TraceRisk.permission`

Suggested local fields:

- `visible`
- `masked`
- `expandable`
- `actionable`

### 8.3 Top-Level And Local Relationship

Rules:

- top-level permission defines the default boundary
- local permission may only tighten or refine
- local permission may never widen beyond top-level permission

### 8.4 Masking Layers

Masking must support at least:

- field masking
- object masking
- evidence masking
- action masking

Suggested explicit masking metadata:

- `masked = true`
- `maskReason`
- `maskScope`

### 8.5 Structured Result And Evidence Split

The contract must allow this combination:

- structured node visible
- raw evidence not visible

### 8.6 Export Permission Split

The contract must distinguish:

- `canExportSimple`
- `canExportFullPackage`

### 8.7 As-Of Permission Split

The contract must distinguish:

- permission to use current mode
- permission to use as-of playback

Hard rule:

- permission trimming must be performed by the backend and reflected in the returned contract

## 9. Filtering, Sorting, Pagination, And Stability

### 9.1 Filtering Rule

Filtering may narrow visibility but may not redefine chain truth.

If filtering trims a chain such that the visible result is no longer a full chain, the result must explicitly indicate it, for example through:

- `summary.resultStatus = partial`
- `meta.chainTrimmed = true`

### 9.2 Sorting Rule

Sorting may be supported on ledger-oriented result sets, for example by:

- `createdAt`
- `batchNo`
- `nodeType`
- `riskLevel`
- `status`

Hard rule:

- sorting only affects presentation order
- sorting must not alter chain semantics or graph relationships

### 9.3 Pagination Rule

Pagination is appropriate for:

- `ledger.rows`
- `evidence.items`
- `risk.items`

Pagination should not directly split:

- `graph.nodes`
- `graph.edges`
- main-chain key summaries

Hard rule:

- main-chain understanding must remain intact even when detailed rows are paginated

### 9.4 Result Stability Rule

Given the same:

- normalized request
- permission context
- time mode
- data snapshot

The contract must return stable object sets for:

- `summary.queryHash`
- `ledger.rows`
- `graph.nodes`
- `graph.edges`
- `risk.items`

### 9.5 QueryHash Contract

All formal query results must include:

- `meta.queryHash`

The hash should bind:

- normalized request
- time mode
- permission context
- data snapshot identity

It exists to support:

- linkage references
- export references
- snapshot references
- async result lookups
- consistency validation across client and server

### 9.6 Degraded Result Contract

For oversized or deferred results, the contract should explicitly carry:

- `summary.resultStatus = degraded`
- `meta.degraded = true`
- `meta.omittedSections = [...]`
- `meta.nextAction = 'useSnapshot' | 'useAsyncExport' | 'refineFilter'`

Hard rule:

- paging, filtering, and sorting are presentation controls, not fact definitions

## 10. Cross-Object Reference Contract

### 10.1 Query To Linkage

`LinkageCreateRequest` must reference:

- `sourceQueryRef`
- optionally `sourceNodeIds`
- optionally `sourceRiskIds`

Hard rule:

- a traceability linkage action may not be created without a formal source query reference

### 10.2 Query To Export

`ExportCreateRequest` must reference:

- `sourceQueryRef`

Every export must be traceable back to:

- query conditions
- time mode
- permission-trimmed result basis
- result snapshot when applicable

### 10.3 Query To Snapshot

Snapshots may be created from:

- formal trace query results
- formal balance query results

They must include:

- `sourceQueryRef`
- `snapshotType`

### 10.4 Snapshot To Result

`GET /traceability/snapshots/:snapshotId/result` must return a formal result object, not an ad hoc cache payload.

### 10.5 Export To Snapshot

Full-package exports may reference:

- `snapshotId`

This allows page results and export results to share the same frozen basis.

### 10.6 Balance To Query

`BalanceQueryResult` should allow a back-reference to a formal query context through:

- `sourceQueryRef`
- or a stable derived `queryHash`

### 10.7 Risk To Linkage

`TraceRisk` should allow references to:

- `linkedActionIds`

Hard rule:

- query, balance, linkage, export, and snapshot may not become isolated information islands

## 11. Async Contract

### 11.1 Async Trigger Cases

Async processing is allowed for:

- large as-of playback
- large material-balance analysis
- multi-customer recall impact analysis
- full traceability package export

### 11.2 Async Response Rule

Async-capable endpoints must return:

- current status
- `snapshotId` or `exportId`
- summary context
- a formal result retrieval path

They must not return only a human message such as “try later”.

### 11.3 `ASYNC_REQUIRED` Rule

`ASYNC_REQUIRED` is a negotiation-style error code, not a generic failure. It means:

- the request cannot be completed synchronously
- the client must switch to async handling, or the server has already done so

### 11.4 Snapshot Retention Rule

Snapshots must carry:

- `createdAt`
- `expiresAt`
- `retentionPolicy`

Hard rule:

- async tasks must have formal state machines and formal references, not temporary cache keys only

## 12. Versioning And Compatibility

### 12.1 Contract Version

Every formal result should include:

- `meta.contractVersion`

Suggested format:

- `traceability-query-contract/v1`

### 12.2 Backward Compatibility

Within the same major version:

- optional fields may be added
- existing required fields may not be removed
- existing field semantics may not change

### 12.3 Breaking Changes

The following are breaking changes:

- removing fields
- changing enum meanings
- changing object nesting in incompatible ways
- changing reference semantics
- changing status semantics

### 12.4 Deprecation Rule

If a breaking evolution is needed, it must first be handled through:

- explicit deprecation markers
- migration notes
- a compatibility window

Hard rule:

- frontend, backend, tests, and export code must not silently adopt different contract versions

## 13. Consumer Rules

### 13.1 Backend Rule

Backend DTOs, services, and controllers must implement the contracts defined here directly. They must not add endpoint-specific hidden payload structures.

### 13.2 Frontend Rule

Frontend pages, API adapters, renderers, and type declarations must consume the formal contract objects:

- no `any`-based contract shortcuts
- no branching on message text for business logic
- no client-side chain assembly

### 13.3 Test Rule

Tests must mock and assert against the formal contracts:

- unit tests
- integration tests
- e2e tests
- export and async task tests

### 13.4 Export Rule

Export code must consume formal query results or snapshot results. It must not recompute an alternate traceability graph.

### 13.5 Linkage Rule

Linkage creation must be driven by:

- `sourceQueryRef`
- `sourceNodeIds`
- `sourceRiskIds`

It must not rely on temporary browser-only state.

## 14. Hard Constraints

- do not redefine the traceability main chain
- do not assemble the main chain in the frontend
- do not use notes or attachments as formal chain facts
- do not return different names for the same semantic field across endpoints
- do not allow different pages to compute different material-balance semantics
- do not let local permissions widen top-level permissions
- do not mix async task states with business states
- do not create linkage, export, or snapshot records without formal query context

## 15. Final Deliverable Structure

Recommended final document structure:

1. goal and boundary
2. design style
3. domain objects
4. REST API surface
5. request contracts
6. response contracts
7. error and status contracts
8. permission and masking contract
9. filtering, sorting, pagination, and stability
10. cross-object reference contract
11. async contract
12. versioning and compatibility
13. consumer rules
14. hard constraints

Suggested appendices:

- `Appendix A`: endpoint matrix
- `Appendix B`: field dictionary
- `Appendix C`: enum dictionary
- `Appendix D`: error code table
- `Appendix E`: queryHash, sourceQueryRef, and snapshot reference rules
