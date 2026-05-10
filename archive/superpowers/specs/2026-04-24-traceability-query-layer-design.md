# Traceability Query Layer Design

## 1. Goal And Boundary

This spec defines the unified traceability query layer for `noidear` after the model-landing layer is frozen. It covers traceability queries, material balance, anomaly linkage, complaint investigation, recall assessment, frontend interaction, export, permission, time-travel playback, and performance strategy.

It solves:

- how users enter traceability from batches, materials, products, and delivery objects
- how forward trace, backward trace, and inventory-assisted explanation work together
- how material balance becomes a formal analysis capability
- how anomaly, complaint, and recall workflows link back to query results
- how the system serves both operators and governance users
- how export, historical playback, permission, and degradation are standardized

This spec includes:

- query object model
- API and backend query service boundaries
- frontend entry structure and result pages
- ledger view and graph view
- current view and as-of playback
- simple export and full traceability package export
- graded anomaly, complaint, and recall linkage
- permission model
- performance goals and degradation rules

This spec does not include:

- redefining how 283 source forms land into models
- redefining the master data and traceability chain
- database migration scripts
- visual UI mockups
- project schedule or execution plan

Dependencies:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`

## 2. Query Entry Structure

The query layer uses dual entry:

- object-centered entry
- scenario-centered entry

Both entries share the same chain model, permission model, time model, export model, and linkage rules.

### 2.1 Object-Centered Entry

This entry serves users who start from a concrete object.

Supported first-class objects:

- `MaterialLot`
- `ProductionBatch`
- `FinishedGoodsBatch`
- `DeliveryNote`
- `Product`
- `Material`

Default behavior:

1. user enters or selects an object
2. system identifies object type
3. system enters the relevant traceability mode
4. system shows object summary and the most relevant chain slice first

Default query semantics:

- `MaterialLot`: backward-style downstream impact expansion
- `FinishedGoodsBatch`: forward-style upstream source expansion
- `ProductionBatch`: bi-directional chain mode
- `DeliveryNote`: downstream customer context plus upstream traceback

Default result layers:

1. object summary
2. key related nodes
3. expandable full chain

### 2.2 Scenario-Centered Entry

This entry serves users who start from a task.

Supported first-class scenarios:

- forward trace
- backward trace
- material balance analysis
- complaint investigation
- recall assessment
- traceability drill
- anomaly impact analysis

Default behavior:

1. user selects a work scenario
2. system opens a scenario-specific query form
3. results are organized around the scenario goal, not around one object only

### 2.3 Shared Rules

Both entry types must share:

- the same traceability main chain
- the same inventory explanation chain
- the same permission rules
- the same time mode rules
- the same export rules
- the same linkage rules

### 2.4 Page Layering

Frontend should separate:

- `Object Query Page`
- `Scenario Workbench`

### 2.5 Hard Rule

Different entries may organize interaction differently, but the same underlying object must resolve to the same result model.

## 3. Chain Model And Query Semantics

The query layer uses a dual-chain model:

- main traceability chain
- inventory-assisted explanation chain

### 3.1 Main Traceability Chain

Business-standard chain:

`MaterialLot -> IngredientUsage -> ProductionBatch -> FinishedGoodsBatch -> DeliveryNote`

Current implementation names:

- `MaterialLot -> MaterialBatch`
- `IngredientUsage -> BatchMaterialUsage`
- `ProductionBatch -> ProductionBatch`
- `FinishedGoodsBatch -> FinishedGoodsBatch`
- `DeliveryNote -> DeliveryNote`

This is the formal causal chain for traceability.

### 3.2 Inventory-Assisted Explanation Chain

`InventoryMovement` explains storage and flow transitions.

It answers:

- when a batch entered storage, moved, was issued, or shipped
- why a batch appears in a usage or delivery context
- whether quantity discrepancies come from stock movement history
- why current state differs from historical state

### 3.3 Forward Trace

Forward trace expands from upstream objects toward downstream impact.

Typical start objects:

- `MaterialLot`
- `ProductionBatch`
- `FinishedGoodsBatch`

Focus:

- downstream batches
- finished goods scope
- delivery scope
- customer impact
- key quality and release nodes

### 3.4 Backward Trace

Backward trace expands from downstream objects toward upstream sources.

Typical start objects:

- `FinishedGoodsBatch`
- `DeliveryNote`
- `ComplaintCase`
- `ProductRecall`

Focus:

- production batches
- ingredient usage
- material lots
- inspection, release, deviation, and evidence nodes

### 3.5 Bi-Directional Query

`ProductionBatch` should support bi-directional traversal by default.

### 3.6 Key Auxiliary Nodes

The query layer may attach but not replace the main chain with:

- `IncomingInspection`
- `ReleaseDecision`
- `CCPRecord`
- `ProcessRecord`
- `MetalDetectionLog`
- `EnvironmentRecord`
- `DeviationCase`
- `ReworkRecord`
- `Sample`
- `ComplaintCase`
- `ProductRecall`
- `TraceabilityDrill`

### 3.7 Hard Rule

Free text, notes, and attachments are evidence only, not formal chain relationships.

## 4. Result View Structure

The result layer uses dual views:

- default ledger view
- switchable graph view

Both views must share the same result dataset.

### 4.1 Ledger View

Default layers:

1. query summary
2. main chain table
3. key auxiliary node table
4. expandable evidence reference area

Requirements:

- sortable
- filterable
- collapsible by node type
- exportable
- anomaly highlighting

### 4.2 Graph View

Suggested node bands:

- upstream: `MaterialLot`, incoming inspection, inventory support nodes
- middle: `IngredientUsage`, `ProductionBatch`, process and control nodes
- downstream: `FinishedGoodsBatch`, `DeliveryNote`, customer and governance nodes

Requirements:

- clickable nodes
- drill-back to ledger details
- expand/collapse auxiliary nodes
- anomaly path highlight
- recall impact highlight
- time-mode redraw support

### 4.3 Shared View Rules

Both views must share:

- query condition set
- permission-trimmed result set
- time mode
- chain facts
- risk status

### 4.4 View Switching

Switching views must stay inside the same query session.

### 4.5 Risk Highlighting

At minimum, both views should highlight:

- release anomaly
- inspection failure
- deviation
- rework batch
- complaint-linked batch
- recall-linked batch
- material-balance anomaly batch

### 4.6 Hard Rule

The graph is an explanation layer only. Every node and edge must resolve back to structured ledger facts.

## 5. Time Modes And As-Of Playback

The query layer uses dual modes:

- `Current View`
- `As-Of View`

### 5.1 Current View

Displays the latest known state and latest closed-loop status.

### 5.2 As-Of View

Displays the chain and state as of a specified historical moment.

### 5.3 Minimum As-Of Coverage

At minimum, as-of playback should cover:

- `MaterialLot`
- `InventoryMovement`
- `ProductionBatch`
- `FinishedGoodsBatch`
- `DeliveryNote`
- `IncomingInspection`
- `ReleaseDecision`
- `DeviationCase`
- `ComplaintCase`
- `ProductRecall`

### 5.4 Playback Semantics

As-of playback means the system shows data that had happened, had taken effect, and was permission-visible at that time.

### 5.5 State Playback

At minimum, playback should cover:

- inspection status
- release status
- batch status
- inventory and shipment state
- recall state
- complaint investigation state
- deviation closure state

### 5.6 Playback Display Requirements

As-of results must clearly show:

- playback timestamp
- playback mode label
- interpretation scope
- presence of post-facto backfill or correction
- difference between historical and current state when relevant

### 5.7 Hard Rule

As-of playback is a formal mode. If an object cannot support historical playback, the system must surface the capability gap instead of silently falling back to current state.

## 6. Material Balance Analysis Subsystem

Material balance is a formal analysis subsystem, not a side report.

### 6.1 Goal

It determines whether input, output, loss, inventory change, and records reconcile around materials, batches, and production.

### 6.2 Core Inputs

First-class inputs:

- `MaterialLot`
- `InventoryMovement`
- `IngredientUsage`
- `ProductionBatch`
- `FinishedGoodsBatch`
- `ReworkRecord`
- `HoldDisposition`
- `DeliveryNote`

Optional support inputs:

- `ProcessRecord`
- `DeviationCase`

### 6.3 Core Analysis Scopes

At minimum:

1. material-lot-level balance
2. production-batch-level balance
3. period or scope-level balance

### 6.4 Result Layers

1. analysis summary
2. quantity main table
3. discrepancy explanation area
4. linkage recommendation area

### 6.5 Thresholds And Risk States

Suggested states:

- normal
- minor deviation
- significant deviation
- high-risk deviation

Risk grading should consider:

- percentage deviation
- absolute deviation
- material or product risk level
- whether shipped scope is involved
- whether complaint, recall, or quality failure already exists

### 6.6 Relationship With Traceability

The material balance subsystem should:

- be reachable from traceability results
- send anomaly signals back into traceability
- provide evidence for complaint and recall assessment
- mark high-risk batches in traceability views

### 6.7 Hard Rule

Balance calculations, thresholds, and anomaly rules must be unified. Different pages cannot each compute their own version.

## 7. Graded Linkage For Anomaly, Complaint, And Recall

The query layer uses graded linkage.

### 7.1 Linked Objects

At minimum:

- `DeviationCase`
- `ComplaintCase`
- `ProductRecall`
- `TraceabilityDrill`
- `CorrectiveAction`
- `ReleaseDecision`
- `HoldDisposition`

### 7.2 Three Linkage Levels

#### Level 1: Risk Hint

Use for:

- ordinary anomaly
- minor material-balance discrepancy
- single-point inspection issue
- issues without confirmed external impact

System behavior:

- highlight risk in results
- show recommendation text
- do not auto-create work item

#### Level 2: Suggested Action

Use for:

- medium-risk anomaly
- multi-node anomaly
- controllable multi-batch impact
- complaint-related but not yet recall-level issues

System behavior:

- suggest explicit follow-up
- support one-click creation of:
  - deviation investigation
  - complaint investigation
  - traceability drill
  - recall assessment
  - CAPA

#### Level 3: Forced Linkage

Use for:

- high-risk deviation
- major anomaly involving already-shipped scope
- multi-customer impact risk
- recall or regulatory signal
- unexplained high-risk material-balance anomaly

System behavior:

- auto-create alert or work item
- force entry into investigation or recall assessment flow
- raise priority in high-privilege workbenches
- do not auto-execute recall

### 7.3 Trigger Sources

Triggers may come from:

- traceability query results
- material-balance anomalies
- inspection or release anomalies
- deviation objects
- complaint objects
- recall assessment objects
- historical playback state conflicts

### 7.4 Suggested Action Matrix

Examples:

- inspection failure -> deviation investigation or disposition review
- release conflict -> release review or deviation investigation
- significant material-balance anomaly -> traceability investigation or deviation investigation
- complaint-linked chain -> complaint investigation or recall assessment
- multi-customer impact -> recall assessment
- chain data gap -> traceability drill or data verification task

### 7.5 Linkage Writeback

When linkage is initiated from a query, the system must record:

- source query
- hit objects
- time mode used
- related batch, delivery, and customer scope
- current linked workflow state

### 7.6 Hard Rule

The query layer may auto-generate recommendations and work items, but it must not bypass approvals to auto-execute high-risk business actions.

## 8. Permission Model

Permissions use two dimensions:

- department dimension
- scenario dimension

And a third operational layer:

- action level

### 8.1 Department Dimension

Suggested first-class departments:

- R&D
- Warehouse
- Manufacturing
- Quality
- Management

Suggested default ranges:

- `R&D`: product, recipe, process, version, related summaries
- `Warehouse`: material lots, inventory movements, storage locations, local traceability summaries
- `Manufacturing`: production batches, ingredient usage, process records, rework, local traceability summaries
- `Quality`: full chain, inspection, release, deviation, complaint, recall assessment
- `Management`: aggregate results, risk status, governance progress, drill-down when permitted

### 8.2 Scenario Dimension

Suggested first-class scenario permissions:

- forward trace
- backward trace
- material balance analysis
- complaint investigation
- recall assessment
- recall execution
- anomaly impact analysis
- historical playback
- full traceability package export

### 8.3 Action Levels

Suggested four levels:

1. view summary
2. view detail
3. initiate linkage
4. execute high-risk action

### 8.4 Trimming Rules

Permissions must trim:

- entry visibility
- result content visibility
- action availability

### 8.5 Original Evidence Permission

Structured result visibility and original evidence visibility are not identical. The system should distinguish:

- structured node visible
- original form visible
- attachment or external document visible

### 8.6 Hard Rule

Permission trimming must be enforced in backend results, not just hidden by frontend controls.

## 9. Export Model

Exports use layered export:

- simple export
- full traceability package export

### 9.1 Simple Export

Should include:

- query conditions
- query object
- query mode
- current or as-of label
- main result table
- key node summary
- risk summary
- export time
- operator

### 9.2 Full Traceability Package Export

Should include:

- query condition set and time mode
- main traceability chain result
- inventory explanation chain result
- key quality nodes
- risk summary and status explanation
- key evidence references
- export time
- operator
- permission or masking note

### 9.3 Evidence Reference Strategy

The default package should export:

- structured summary
- evidence references

It should not auto-bundle all raw forms and attachments.

Evidence layers:

1. structured result
2. original form reference
3. attachment or raw file reference

### 9.4 Export Masking And Permission

Export permission must additionally control:

- customer identity masking
- raw inspection record inclusion
- external-facing material inclusion
- full customer impact list inclusion

### 9.5 Suggested Formats

First wave:

- `CSV / Excel`
- `PDF`

Later optional:

- structured JSON export

### 9.6 Hard Rule

Every export must be bound to a query session and record:

- query conditions
- time mode
- permission-trimmed result basis
- export time
- operator

## 10. Performance Goals And Degradation Strategy

### 10.1 Query Classes

At minimum:

1. single-batch fast query
2. full single-chain trace query
3. material-balance analysis
4. recall or complaint impact analysis

### 10.2 Performance Goals

Guidance:

- single-batch fast query: synchronous, interactive
- full single-chain query: synchronous, slower than fast query but still interactive
- material balance: synchronous for small scope, async for large scope
- recall or complaint impact: async-first when scope expands widely

### 10.3 Degradation Order

When a query is heavy, degrade in this order:

1. keep query summary
2. keep main-chain key nodes
3. keep ledger table
4. defer auxiliary nodes
5. defer graph view
6. defer full export

### 10.4 Async Boundaries

Allow async by default for:

- large historical playback
- wide recall impact analysis
- long-window material balance
- full traceability package export

### 10.5 Snapshot Mechanism

Async queries and exports should generate snapshots containing:

- query conditions
- time mode
- requester
- generation time
- result summary
- result retrieval link

### 10.6 Hard Rule

Degradation may change return style and completeness timing, but not result semantics.

## 11. Dual Core Users And Product Layering

### 11.1 Operator Users

Typical users:

- warehouse
- manufacturing
- R&D
- frontline quality

Needs:

- fast batch lookup
- local chain slice
- current state
- local anomaly view

### 11.2 Governance Users

Typical users:

- quality management
- system owner
- management

Needs:

- full-chain view
- historical playback
- complaint, recall, and deviation linkage
- export and evidence retention

### 11.3 Product Layering

Frontend should present:

- `Object Query Page`
- `Scenario Workbench`

### 11.4 Default Entry Differences

- operators default to batch query, current mode, ledger view
- governance users default to scenario workbench, risk summary, playback, export, and linkage entry

### 11.5 Hard Rule

The same underlying object may be presented differently, but result semantics can only differ through permission trimming and UI defaults.

## 12. Backend Query Service Boundaries

### 12.1 Service Layers

Suggested services:

1. `Trace Query Service`
2. `Balance Analysis Service`
3. `Linkage Action Service`
4. `Export Service`

### 12.2 API Surface

Suggested endpoints:

- `trace/query`
- `trace/graph`
- `trace/balance`
- `trace/export`
- `trace/actions`

### 12.3 Backend Responsibilities

Backend services must own:

- permission trimming
- time mode handling
- main and auxiliary chain assembly
- risk marking
- async dispatch

### 12.4 Hard Rule

Frontend must not assemble the traceability chain itself.

## 13. Frontend Information Architecture

### 13.1 Page Set

Suggested first pages:

- object query page
- scenario workbench
- material balance analysis page
- export center or task page
- historical playback result page

### 13.2 Query Forms

Object-centered form should support:

- batch or object input
- object type auto-detect or manual selection
- current or as-of switch

Scenario workbench should support:

- scenario selection
- risk filters
- date range
- department, product, material filters

### 13.3 Result Layout

Suggested layout:

- top: query summary
- middle: ledger/graph switch
- side or lower area: risk and action area
- bottom: evidence references and export entry

### 13.4 Hard Rule

Pages must render against one unified result model. Object pages and scenario pages must not invent separate schemas.

## 14. Alerting And Taskification

### 14.1 Alert Sources

Alerts may come from:

- traceability chain anomalies
- material-balance anomalies
- release conflicts
- complaint-linked chains
- high-risk recall assessment results

### 14.2 Taskified Outputs

First-class outputs:

- deviation investigation
- complaint investigation
- recall assessment
- traceability drill
- data verification task
- CAPA

### 14.3 Priorities

Suggested priorities:

- normal
- important
- high risk

### 14.4 Writeback Requirements

Taskification must record:

- source query
- source object
- time mode
- risk grade
- current task state

### 14.5 Hard Rule

Taskification is a closed-loop entry, not a one-way jump. Query-originated tasks must be traceable back to the originating query context.

## 15. Mapping Boundaries To Existing Noidear Models

### 15.1 Directly Depended Structured Objects

At minimum:

- `MaterialBatch`
- `BatchMaterialUsage`
- `ProductionBatch`
- `FinishedGoodsBatch`
- `DeliveryNote`
- `InventoryMovement`
- `IncomingInspection`
- `ProcessMonitorRecord`
- `CCPRecord`
- `MetalDetectionLog`
- `EnvironmentRecord`
- `ReworkRecord`
- frozen governance objects added later

### 15.2 Dual-Track Objects In Query

At minimum:

- inspection
- process record
- release
- deviation
- complaint
- recall
- traceability drill
- CAPA

### 15.3 Attachment Boundaries

These may attach as evidence but cannot replace the main chain:

- original forms
- attachments
- meeting records
- free-text descriptions

### 15.4 Hard Rule

This spec does not redefine the traceability chain or create a parallel chain. Missing implementation remains an implementation gap.

## 16. Implementation Constraints

### 16.1 Do Not Bypass Frozen Upstream Specs

Implementation must follow:

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`

### 16.2 Do Not Use Notes Or Attachments As Chain Facts

### 16.3 Do Not Use Frontend Hiding As Permission Enforcement

### 16.4 Do Not Allow Multiple Calculation Dialects

Material balance, risk state, and recall impact scope must use one shared calculation contract.

### 16.5 Do Not Skip Writeback

Every linkage action, task creation, and export generation must preserve source context.

## 17. Final Deliverable Structure

### 17.1 Main Spec Body

1. goal and boundary
2. query entry structure
3. chain model and query semantics
4. result view structure
5. time modes and as-of playback
6. material balance analysis subsystem
7. graded linkage
8. permission model
9. export model
10. performance and degradation
11. dual core users and product layering
12. backend query service boundaries
13. frontend information architecture
14. alerting and taskification
15. mapping boundaries to existing models
16. implementation constraints

### 17.2 Suggested Appendices

- `Appendix A`: query object and entry matrix
- `Appendix B`: API and query contract draft
- `Appendix C`: page and component matrix
- `Appendix D`: linkage trigger matrix
- `Appendix E`: performance and degradation matrix

### 17.3 Document Goal

The final document must let other agents and implementers design the traceability query layer without redefining the business boundary.
