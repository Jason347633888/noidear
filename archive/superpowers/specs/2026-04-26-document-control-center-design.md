# 2026-04-26 Document Control Center Design

## 1. Goal

Upgrade the existing document management module into the food-safety system's complete document-control center.

The module must manage the current company's `01-06` file system:

- `01-管理手册`
- `02-程序文件`
- `03-作业指导书`
- `04-记录表单`
- `05-公司文件`
- `06-外来文件`

The product position is:

> The document module is the controlled food-safety system knowledge base and document-control center. It is not a generic file cabinet, and it is not a second database for level-4 records or business facts.

It should answer:

- where each system file lives
- which version is currently effective
- which documents reference each other
- which procedure or SOP connects to which business module, dynamic record template, external requirement, or evidence entry
- where each source record form landed after model-landing convergence
- which files are due for review, expiry, replacement, archive, or obsolescence

## 2. Current Project Context

The project already separates document control, dynamic records, and structured business facts:

- `Document` currently supports document upload, level, number, title, file metadata, version, status, approval, archive, obsolete, Markdown content, review date, supersession, read confirmation, full-text index, recommendation, and document references.
- `RecordTemplate/Record` is the dynamic form and record layer. It stores configurable fields, retention years, batch-link configuration, approval requirements, workflow configuration, record instances, generated record numbers, signatures, offline flags, and entity links.
- Independent business modules already own many structured facts: R&D process, product, material, supplier, recipe, production batch, CCP, cleaning, environment, process records, metal detection, rework, incoming inspection, supplier evaluation, CAPA, traceability, training, internal audit, and related modules.
- The model-landing layer already defines how the 283 source record forms should land. Future document-module work must not reopen those decisions unless new evidence requires a formal deviation.

## 3. Scope

### 3.1 In Scope

The document-control center includes all six source file groups, with different responsibilities by file type:

| Source folder | Document-control role |
| --- | --- |
| `01-管理手册` | Level-1 controlled manual and food-safety system top-level policy |
| `02-程序文件` | Level-2 controlled procedures, linked to processes, risks, standards, and record entrances |
| `03-作业指导书` | Level-3 controlled SOPs/work instructions, linked to departments, roles, areas, equipment, processes, products, and materials |
| `04-记录表单` | Source-form landing index and navigation layer only; it does not own completed records |
| `05-公司文件` | Company files such as internal rules, certificates, authorizations, announcements, and organizational files |
| `06-外来文件` | External files such as laws, standards, customer requirements, supplier files, and third-party documents |

### 3.2 Out Of Scope

The document module must not:

- copy completed business records into `Document`
- split business flows back into individual source forms after they have been consolidated into a business module
- recreate master data, batch data, inspection data, CAPA data, or traceability data
- create parallel fact sources for `Product`, `Material`, `Supplier`, `Employee`, `Location`, `MaterialLot`, `ProductionBatch`, `IngredientUsage`, `Inspection`, `CorrectiveAction`, or traceability relationships
- downgrade model-landing decisions back to dynamic-form-only or document-only storage
- implement full compliance-operation automation in the first phase

## 4. File Type Model

Use one controlled document core with a required `documentType` dimension.

Recommended document types:

| Type | Source | Meaning |
| --- | --- | --- |
| `MANUAL` | `01` | Management manual / system top-level document |
| `PROCEDURE` | `02` | Procedure file |
| `WORK_INSTRUCTION` | `03` | SOP / work instruction |
| `RECORD_FORM_INDEX` | `04` | Source record-form landing index entry |
| `COMPANY_FILE` | `05` | Company-controlled internal file |
| `EXTERNAL_FILE` | `06` | External controlled file |

Common fields:

- document number
- title
- document type
- source folder
- department or owner
- version
- status
- Markdown body
- original attachment metadata
- tags
- creator
- reviewer or approver
- approval timestamps
- effective date
- review due date
- retention years when applicable
- archive and obsolete reason
- supersedes and superseded-by relationship

Type-specific fields:

- `PROCEDURE`: system clause, process area, risk area, related business modules, related record entries, related external basis
- `WORK_INSTRUCTION`: department, role, location, equipment, process step, product, material, work area
- `RECORD_FORM_INDEX`: source form code, source form name, source path, source department, model-landing strategy, target module, target model, target route, related procedure/SOP
- `COMPANY_FILE`: organization scope, publish target, effective period, responsible department
- `EXTERNAL_FILE`: source organization, source category, customer/supplier/authority, applicable scope, effective date, expiry date, review owner

## 5. Core Product Surfaces

### 5.1 System File Library

The main library should provide:

- `01-06` classification tree
- list view by type, department, status, owner, tag, effective date, expiry date, and review due date
- keyword search across number, title, Markdown content, and metadata
- quick filters for effective, draft, pending approval, due soon, expired, archived, obsolete, and broken references

### 5.2 Document Detail

The detail page should show:

- Markdown body
- original attachment preview/download
- metadata by file type
- current lifecycle status
- version history
- approval and publication trace
- review information
- tags
- upstream and downstream references
- related business module entrances
- related record-form landing entries
- replacement relationship

The experience may feel like Obsidian for reading and linking, but it must retain controlled-document behavior.

### 5.3 Reference View

The first phase should implement bidirectional reference lists, not a complex graph.

Examples:

- a procedure references work instructions, external standards, and record entrances
- an SOP is referenced by one or more procedure files
- an external standard affects specific procedures and SOPs
- an obsolete document is still referenced by effective documents

### 5.4 Record Form Landing Index

The `04-记录表单` surface is an index and navigation layer.

Each source form entry should show:

- source form code
- source form name
- department
- original source path
- mapped entities
- chain position
- model-landing group
- landing strategy: independent model, dynamic form, or dual-track
- current target module
- target model when structured
- target dynamic template when dynamic
- target route or page
- related procedure and SOP

This solves "where did this form go in the system?" It does not let users fill or store records inside the document module.

### 5.5 Document-Control Workbench

The workbench should expose operational queues:

- draft files waiting for submission
- files pending approval
- files due for review
- external files near expiry
- obsolete or archived files still referenced by effective files
- broken business-module or record-template entrances
- source record forms without a target route
- documents missing owner, review date, or required metadata

The first phase should use lists and alerts. Automated scoring belongs to a later phase.

## 6. Obsidian-Like Capabilities

The module should include the useful parts of Obsidian, with document-control constraints:

- directory tree by `01-06`, department, and type
- Markdown body editing and reading
- wiki-style references or equivalent document-reference creation
- bidirectional reference lists
- tags and saved filters
- content search
- attachment support

Differences from Obsidian:

- effective files cannot be edited directly
- changes must create a draft or new version
- publication requires approval
- obsolete and archived versions remain traceable
- only the effective version should be used as current execution basis

## 7. Record Form Handling Rules

Level-4 record forms are not owned by the document module as business data.

Rules:

1. If source forms have been merged into an independent business module, the document module stores only the landing entry and route to that module.
2. If a source form remains dynamic, the document module links to the related `RecordTemplate` and record list.
3. If a form is dual-track, the document module must show both layers: the structured business model and the dynamic form or evidence layer.
4. A procedure or SOP may require a record, but the completed record remains in its owning module.
5. A document reference may point to a module, template, record list, or specific business object, but it must not duplicate the object's fields in `Document`.

Examples:

- R&D source forms consolidated into the R&D process module remain in that module. The document module links the procedure or SOP to the R&D process entrance.
- Cleaning records owned by a cleaning-record module remain there. A cleaning SOP can link to the cleaning-record route.
- Weakly structured low-frequency records owned by `RecordTemplate/Record` remain in the dynamic record layer.

## 8. Relationship To Existing Modules

Responsibility split:

| Layer | Owns |
| --- | --- |
| `Document` | Controlled files, Markdown knowledge, attachments, lifecycle, references, file metadata, file review |
| `RecordTemplate/Record` | Dynamic templates, completed dynamic records, dynamic approval and archival traces |
| Independent business modules | Structured system facts, business workflows, traceability joins, statistics, validation, and stable APIs |

The document module may reference:

- document
- record template
- record list
- business module
- business object
- external file
- company file

It must not replace the owning module.

## 9. Reference Model

Extend or reuse the existing `DocumentReference` concept as a generic relation table.

Recommended relation shape:

- `sourceDocId`
- `targetType`
- `targetId`
- `targetRoute`
- `targetLabel`
- `relationType`
- `snapshot`
- `createdBy`
- `createdAt`

Recommended `targetType` values:

- `document`
- `record_template`
- `record_list`
- `business_module`
- `business_object`
- `external_file`
- `company_file`

Recommended `relationType` values:

- `IMPLEMENTS`: lower-level file implements higher-level file
- `REQUIRES_RECORD`: procedure or SOP requires a record entry
- `EVIDENCE_FOR`: target provides evidence for a document requirement
- `BASED_ON`: file is based on a regulation, standard, customer requirement, or external file
- `REPLACES`: file replaces another file
- `RELATED_TO`: general relationship
- `CONTROLLED_BY`: file is controlled under a procedure such as document control or record control

Snapshots should preserve labels and routes for audit readability, but the owning target remains authoritative.

## 10. Lifecycle

Recommended lifecycle statuses:

- `draft`
- `pending_review`
- `approved`
- `effective`
- `under_review`
- `archived`
- `obsolete`

Rules:

- only `effective` documents are current execution basis
- an effective document cannot be edited in place
- revision creates a new draft or new version
- publication must ensure there is not more than one effective version for the same controlled document lineage
- obsolete files cannot be selected as new execution basis
- obsolete and archived files remain readable for history and audit evidence
- replacement must preserve `supersedes` and `supersededBy`
- external files must support expiry and review reminders
- procedures and SOPs must support review due dates
- broken references must be surfaced in the workbench

## 11. Permissions

Minimum roles:

- ordinary user: read effective files within permission scope and use allowed business entrances
- document maintainer: create drafts, edit drafts, submit review
- approver: approve or reject files
- document-control admin: archive, obsolete, restore, maintain references, maintain external files, repair broken entrances
- system admin: configure document types, metadata requirements, and permission rules

Permission checks should consider:

- department
- file type
- status
- target module access
- external/company-file visibility scope

Following a business-module entrance must still obey that target module's permission rules.

## 12. Error And Exception Handling

Required exception behavior:

- duplicate controlled number: reject creation or publication
- multiple effective versions in same lineage: reject publication
- missing required type metadata: block submission or publication
- target route no longer exists: show broken entrance and workbench item
- referenced document is obsolete: warn and suggest replacement
- external file expired: warn and require review action
- record-form landing target missing: mark as mapping gap, do not convert it into a document by default
- user lacks target-module permission: show restricted entrance, not raw data
- attachment missing: show file integrity warning

## 13. Data Flow

### 13.1 Creating Or Importing Controlled Files

1. User selects a file type from `01-06`.
2. System applies the metadata requirements for that type.
3. User writes Markdown body, uploads attachment, or both.
4. User adds tags and references.
5. User submits for review.
6. Approver approves.
7. System publishes an effective version and preserves prior versions.

### 13.2 Reading Execution Basis

1. User opens a procedure or SOP.
2. System shows current effective content.
3. System shows referenced documents, external basis, and required records.
4. User follows entrances to the owning business module or dynamic record layer.
5. Target module enforces its own data and permission rules.

### 13.3 Maintaining Record Form Landing Index

1. System imports or reads model-landing source form rows.
2. Each row maps to a landing-index entry.
3. The entry links to a target module, target model, dynamic template, or dual-track pair.
4. The entry is associated with related procedures and SOPs.
5. Broken or missing entries surface in the workbench.

## 14. Phase 1 Scope

Implement in the first phase:

- `01-06` file type model
- type-specific metadata
- system file library
- Markdown body plus original attachments
- tags and search
- version, approval, effective, archive, obsolete, and review due date
- bidirectional reference lists
- record-form landing index for `04`
- business module and dynamic template entrances
- basic document-control workbench
- broken-reference detection

Do not implement in the first phase:

- automatic compliance scoring
- automatic training task generation
- automatic internal-audit checklist generation
- automatic CAPA, change, or recall propagation
- complex graph visualization
- reclassification of the 283 forms

## 15. Future Phase

Future phases may evolve this into a full compliance-operation center:

- read confirmation by role or department
- training needs generated from new or revised effective files
- internal-audit coverage by procedure and SOP
- CAPA/change/recall impact analysis
- external regulation and customer-requirement change impact
- document relationship graph
- document-control health dashboard
- audit chain from clause to procedure to SOP to record evidence to business data

These features should build on the reference model, not create new parallel ownership of business data.

## 16. Testing Strategy

Implementation should include tests for:

- creating each document type
- validating required metadata by type
- filtering and searching by type, department, status, tag, and review date
- lifecycle transitions from draft to effective to archived or obsolete
- preventing multiple effective versions in one lineage
- maintaining supersession relationships
- creating and querying bidirectional references
- warning when effective documents reference obsolete targets
- building record-form landing index entries
- navigating from a landing entry to a business module or dynamic template
- detecting broken entrances
- enforcing department and role permissions
- ensuring business record data is not copied into `Document`

## 17. Success Criteria

The module is successful when users can:

- find files from `01-06` in one controlled system
- distinguish current effective files from draft, archived, and obsolete files
- open a procedure and understand related SOPs, record entrances, business modules, and external basis
- open an SOP and know which module or template is used to produce execution evidence
- locate where any level-4 source form landed in `noidear`
- explain why completed records remain in business modules or `RecordTemplate/Record`
- identify files due for review, external files near expiry, and obsolete files still referenced
- provide auditors with a clear chain between system files, execution records, and structured business data

## 18. Authoritative Inputs

This design is based on:

- `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/01-管理手册`
- `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/02-程序文件`
- `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/03-作业指导书`
- `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单`
- `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/05-公司文件`
- `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/06-外来文件`
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `docs/superpowers/specs/2026-04-24-model-landing-layer-design.md`
- `docs/superpowers/specs/2026-04-24-model-landing-layer-form-expansion.csv`
- `server/src/prisma/schema.prisma`

If these inputs conflict, follow the priority rules in `docs/AGENT_GUIDE.md`.
