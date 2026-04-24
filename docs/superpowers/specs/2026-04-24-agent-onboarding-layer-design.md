# Agent Onboarding Layer Design

Date: 2026-04-24
Project: `noidear`
Scope: Agent-only onboarding and protocol layer for food-safety SaaS continuation work
Status: Approved in conversation, written spec

## 1. Goal And Boundary

This spec defines the agent onboarding layer for `noidear`.

Its purpose is singular: make any AI agent entering the repository follow the same reading order, task identification flow, and data/traceability rules before continuing implementation work.

This spec exists to prevent the current failure modes:

- agents do not know which docs to read first
- agents do not know when food-safety domain docs become mandatory
- agents confuse master data, batches, forms, dynamic records, and independent business tables
- agents bypass existing unified data semantics and invent parallel relationships
- agent handoff quality degrades because there is no shared protocol

This spec includes:

- root vs detailed agent entry responsibilities
- mandatory reading order
- task triggers that require food-safety domain reading
- mandatory agent behavior constraints
- document priority and conflict resolution rules
- handoff boundary with the next two specs

This spec does not include:

- final landing strategy for all 283 forms
- traceability API design
- database field-level DDL changes
- page implementation details
- frontend or backend implementation tasks
- MCP implementation mechanics beyond onboarding references

This is an onboarding/protocol layer, not a business implementation layer.

## 2. Entry Structure

The onboarding structure is a three-layer model with two formal entry documents and one domain truth source.

### 2.1 Root Entry

Path:
`/Users/jiashenglin/Desktop/好玩的项目/noidear/AGENTS.md`

Responsibility:

- first project-level entry point for any agent
- contains only the shortest mandatory rules
- tells the agent what to read next
- does not carry detailed domain explanation
- does not become a long handbook

It answers one question only: what should an agent read first when entering the repo?

### 2.2 Operational Entry

Path:
`/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`

Responsibility:

- main operating protocol center for agents
- defines task classification, reading order, decision rules, and behavior constraints
- tells agents when they must read domain truth docs
- tells agents how to continue safely inside `noidear`

It answers: how should an agent classify work and enter the correct context before acting?

### 2.3 Domain Truth Source

Path:
`/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`

Responsibility:

- unified business/domain truth for food-safety SaaS
- master data, batches, bridge relations, cross-module relationships, and 283-form classification basis
- answers what the business relationships are
- does not act as the repo entry document
- does not own execution flow

### 2.4 Direction Of Flow

The entry chain is strictly one-way:

`AGENTS.md -> docs/AGENT_GUIDE.md -> docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`

Rules:

- `AGENTS.md` routes agents into `docs/AGENT_GUIDE.md`
- `docs/AGENT_GUIDE.md` decides whether food-safety domain reading becomes mandatory
- `MASTER_DATA_AND_TRACEABILITY_MODEL.md` must not be treated as the general entry point

This separation avoids entry documents competing for responsibility.

## 3. Mandatory Reading Protocol

The onboarding layer uses hard gates, not recommendations.

### 3.1 Universal Mandatory Reading

Before analysis, design changes, implementation, schema decisions, or behavior modification, every agent must read in order:

1. `AGENTS.md`
2. `docs/AGENT_GUIDE.md`

If these two steps are not complete, the agent must not proceed into implementation or structural analysis.

### 3.2 Food-Safety Domain Mandatory Reading

If a task matches any of the following topics, the agent must also read:

`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`

Trigger conditions include, but are not limited to:

- food-safety SaaS
- the 283 source forms / form templates / record forms
- master data
- product, material, supplier, customer, employee, location
- material lots, production batches, finished-good batches
- traceability, forward trace, backward trace, material balance
- recall, complaint, nonconformance, rework
- warehouse, manufacturing, QA, QC, R&D cross-module linkage
- connecting existing form data
- deciding between `RecordTemplate/Record` and independent business tables

### 3.3 Blocking Rule

If an agent identifies that a task hits the trigger set above but has not read `MASTER_DATA_AND_TRACEABILITY_MODEL.md`, the agent must stop before proceeding into design or implementation judgment.

Specifically, without reading the domain truth source, an agent must not:

- define new table relationships
- create parallel master data structures
- design a new traceability chain
- decide where a source form should land

### 3.4 Explicit Exceptions

The extra domain-reading requirement does not apply to:

- pure visual/frontend styling changes that do not affect business semantics
- generic login, auth, rate-limit, monitoring, or infra fixes unrelated to food-safety modeling
- generic engineering maintenance unrelated to forms, traceability, or cross-module business linkage

## 4. Agent Behavior Constraints

These are hard protocol rules that belong in high-priority agent guidance.

### 4.1 Classify The Object Type First

Before proposing schema, APIs, behavior changes, or data flow, the agent must first classify the target into one of these categories:

- master data
- batch data
- bridge relationship
- process/inspection record
- governance/evaluation record
- generic document/dynamic form

If object type is unclear, the agent must not proceed into structural design.

### 4.2 Do Not Duplicate Master Data

If the system already has unified master-data semantics for the following objects:

- Product
- Material
- Supplier
- Employee
- Location

then the agent must not create parallel fact sources for them in downstream modules.

Allowed:

- denormalized display fields for rendering or export
- cached display values that clearly do not become authoritative

Not allowed:

- a second product list owned by production
- a second material source owned by QA/QC
- module-local truth copies for supplier, location, or employee identity

### 4.3 Batch Problems Must Return To The Batch Chain

If a task involves any of the following:

- dosing / ingredient usage
- inbound receiving
- release / disposition
- sample retention
- shipment
- complaint
- recall
- forward trace
- backward trace
- material balance

then the agent must reason from the core batch chain:

`MaterialLot(MaterialBatch) <-> IngredientUsage(BatchMaterialUsage) <-> ProductionBatch`

Agents must not replace this chain with remarks, free text, or attachment-only explanations.

### 4.4 Forms Do Not Automatically Mean Independent Tables

The agent must not assume that every form should become an independent business table.

Instead, the agent must first determine whether the form is:

- a record surface for an existing core business object
- a key traceability or bridge record
- a governance/evaluation record
- a generic dynamic form

Therefore:

Form is a presentation artifact first, not automatically a data-model boundary.

### 4.5 Separate Business Names From Code Names

The project already contains mismatches between business-standard names and current code names, for example:

- `MaterialLot` vs `MaterialBatch`
- `IngredientUsage` vs `BatchMaterialUsage`

The agent must therefore follow this rule:

- use business-standard names when discussing domain relationships
- use current implementation names when inspecting code, schema, and APIs
- never mix the two in the same design without explicitly clarifying the mapping

### 4.6 Check Shared Entities Before Inventing New Ones

If a requirement spans R&D, warehouse, manufacturing, QA, QC, sales, or governance, the agent must check whether the relationship already belongs to existing shared entities such as:

- Product
- Material
- MaterialLot
- ProductionBatch
- Supplier
- InventoryMovement
- DeliveryNote
- CorrectiveAction
- SupplierEvaluation
- ManagementReview

Only if existing shared entities cannot express the requirement should a new entity be proposed.

## 5. Document Priority And Conflict Resolution

The onboarding layer defines explicit precedence so agents do not improvise conflict handling.

### 5.1 Priority 1: Source Form Facts

Highest priority:

`/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单`

This level determines:

- what fields actually exist
- what the business is truly recording
- which departments use which records
- which raw records support the actual traceability chain

If source forms conflict with lower-level artifacts, source forms win by default.

### 5.2 Priority 2: Unified Domain Summary

Second priority:

`/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`

This level determines:

- unified terminology
- cross-module relationships
- consolidated interpretation of source forms
- the normalized business meaning that agents should use

If a local design or implementation doc conflicts with this unified domain summary, the domain summary wins unless it is proven inconsistent with the source forms.

### 5.3 Priority 3: Product-Concept And Mapping Layer

Third priority:

`/Users/jiashenglin/Desktop/mybrain/SaaS产品构思`

This layer is valuable for:

- entity boundaries
- field mapping
- SaaS-oriented abstractions
- implementation hints

But it remains a reference layer, not the final fact source.

### 5.4 Priority 4: Current Code Implementation

Fourth priority:

`/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma`
and current module implementation.

This level represents what is currently implemented, not what is necessarily semantically correct.

If code conflicts with the higher business layers, it should be treated as implementation that still needs convergence.

Example:

- code currently uses `MaterialBatch`
- business-standard naming uses `MaterialLot`
- this should be interpreted as an implementation naming gap, not a domain change

### 5.5 Conflict Handling Action

When an agent detects conflict, it must not silently pick a side and continue.

Required handling sequence:

1. identify which levels are in conflict
2. classify the conflict as naming mismatch or semantic mismatch
3. if naming mismatch, preserve dual naming with explicit mapping
4. if semantic mismatch, defer to the higher-priority source
5. if the conflict changes design scope or implementation boundary, explicitly document it in the active design/spec

## 6. Relationship To The Next Two Specs

This onboarding-layer spec exists to constrain future work, not to solve every downstream design problem.

### 6.1 Relationship To Spec 2: Model Landing Layer

The second spec will decide:

- which of the 283 forms must become independent business models
- which should remain under `RecordTemplate/Record`
- where dual-track modeling is needed
- how current schema should converge with business truth

This onboarding spec only defines:

- what agents must read before making those decisions
- what bad decision patterns are prohibited
- how agents should think about “form does not equal entity boundary”

It does not make final landing decisions.

### 6.2 Relationship To Spec 3: Traceability Query Layer

The third spec will decide:

- forward trace API design
- backward trace API design
- material balance calculation strategy
- query entry points, result shapes, interaction model, and performance expectations
- which queries depend on independent business models vs dynamic records

This onboarding spec only defines:

- traceability tasks must use the core batch chain
- agents must not bypass the batch bridge relationship
- traceability tasks must use unified business semantics

It does not define query APIs or UI behavior.

### 6.3 Dependency Order

The three specs must proceed in this order:

`1 -> 2 -> 3`

Meaning:

- Spec 1: Agent onboarding layer
- Spec 2: Model landing layer
- Spec 3: Traceability query layer

This order is mandatory because:

- without onboarding protocol, agents continue inconsistently
- without model landing decisions, traceability design sits on unstable boundaries
- therefore query-layer design must come after model landing

### 6.4 Output Path

This written spec lives at:

`/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/specs/2026-04-24-agent-onboarding-layer-design.md`

## 7. Recommended Documentation Changes After Approval

Once implementation planning begins, the target change set should follow this structure:

- keep `AGENTS.md` minimal and routing-only
- upgrade `docs/AGENT_GUIDE.md` into the main agent protocol center
- keep `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` as the domain truth source
- do not move domain truth into the root entry doc
- do not split the onboarding layer into many protocol docs yet

## 8. Spec Self-Review

Checklist review completed inline:

- Placeholder scan: no TODO/TBD placeholders remain
- Internal consistency: scope, entry flow, and priority model are aligned
- Scope check: this spec is intentionally limited to onboarding/protocol only and is suitable as a standalone first spec
- Ambiguity check: trigger conditions, hard gates, and priority rules are explicit

No further inline fixes required.
