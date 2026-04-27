# Document Governance Phase 4 Evidence Chain Implementation Plan

> **For implementers:** 按任务顺序执行。每个任务先写/更新测试，再改实现。不要把业务事实复制进 `Document`；证据链只做跨模块查询、聚合和导航。

## Goal

实现“合规证据链”查询与展示能力，让用户能从文件、表单模板、填写记录、变更事件、内审问题、整改动作追到相关证据。

第一版必须支持：

- 从文件追到记录表单模板、实际记录、阅读确认、培训需求、文控影响、审批、内审问题。
- 从变更事件追到默认表单任务、已填写记录、文控影响评审、验证记录、审批。
- 从内审问题追到整改动作和审批。
- 弱引用或缺失目标显示 warning，不让接口整体 500。

## Current Context

阶段 0-3 已完成，当前可依赖：

- 文档管理基础可用性已补齐。
- `RecordFormLandingEntry.targetTemplateId`、`DocumentTrainingNeed.linkedTrainingProjectId` 等强引用已收紧。
- `ChangeEvent`、`ChangeEventRelation`、`ChangeEventFormTask`、`Record.usageType/sourceType/sourceId/changeEventId` 已落地。
- 文控工作台问题卡片已能进入明细和处理入口。

已有但需要升级的能力：

- `DocumentAuditChainService` 目前偏文档引用链，不能覆盖表单、记录、审批、变更、内审、整改。
- `AuditChainExplorer.vue` 目前是“引用链/审核链路”视角，需要升级成“证据链”视角。

## Files

Create:

- `packages/types/document-evidence-chain.ts`
- `server/src/modules/document/services/document-evidence-chain.service.ts`
- `server/src/modules/document/services/document-evidence-chain.service.spec.ts`
- `client/src/components/document/EvidenceChainGraph.vue`
- `client/src/components/document/__tests__/EvidenceChainGraph.spec.ts`

Modify:

- `packages/types/index.ts`
- `server/src/modules/document/document.controller.ts`
- `server/src/modules/document/document.module.ts`
- `client/src/api/document-control.ts`
- `client/src/views/documents/AuditChainExplorer.vue`
- `client/src/views/documents/__tests__/AuditChainExplorer.spec.ts`
- `client/src/views/documents/DocumentDetail.vue`

Do not modify:

- Batch traceability modules.
- CAPA/internal-audit core business rules.
- Existing `DocumentAuditChainService` behavior unless you keep backward compatibility.

## Task 1: Shared Evidence Contract

### 1.1 Add failing contract usage

Create `packages/types/document-evidence-chain.ts` and export it from `packages/types/index.ts`.

Use these exact exported names so server and client share one contract:

```ts
export type EvidenceSourceType =
  | 'document'
  | 'record_template'
  | 'record'
  | 'change_event'
  | 'audit_finding'
  | 'corrective_action';

export type EvidenceNodeType =
  | EvidenceSourceType
  | 'approval_instance'
  | 'approval_task'
  | 'legacy_approval'
  | 'document_reference'
  | 'record_form_landing'
  | 'read_requirement'
  | 'read_confirmation'
  | 'training_need'
  | 'training_project'
  | 'change_event_relation'
  | 'change_event_form_task'
  | 'document_impact_review'
  | 'document_impact_item'
  | 'verification_record'
  | 'unknown';

export type EvidenceRelationStrength = 'strong' | 'validated' | 'weak' | 'missing';

export interface EvidenceNode {
  id: string;
  nodeId: string;
  type: EvidenceNodeType;
  label: string;
  status?: string | null;
  route?: string | null;
  depth: number;
  metadata?: Record<string, unknown>;
}

export interface EvidenceEdge {
  id: string;
  source: string;
  target: string;
  relationType: string;
  strength: EvidenceRelationStrength;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceWarning {
  id: string;
  severity: 'info' | 'warning' | 'danger';
  message: string;
  sourceNodeId?: string;
  targetType?: string;
  targetId?: string | null;
  relationType?: string;
}

export interface EvidenceChainMeta {
  sourceType: EvidenceSourceType;
  sourceId: string;
  maxDepth: number;
  generatedAt: string;
  truncated: boolean;
}

export interface EvidenceChainResult {
  root: EvidenceNode;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  warnings: EvidenceWarning[];
  meta: EvidenceChainMeta;
}

export interface EvidenceChainQuery {
  sourceType: EvidenceSourceType;
  sourceId: string;
  maxDepth?: number;
}
```

### 1.2 Implementation

Update `packages/types/index.ts`:

```ts
export * from './document-evidence-chain';
```

### 1.3 Verify

Run:

```bash
npm run build --workspace=client
npm run build --workspace=server
```

If this repo does not use npm workspaces for these commands, use the existing client/server build commands from `package.json`.

## Task 2: Backend Evidence Service Contract Tests

### 2.1 Create service spec

Create `server/src/modules/document/services/document-evidence-chain.service.spec.ts`.

Test cases:

1. `document` root returns:
   - root node `document:<id>`.
   - `record_template` node through `RecordFormLandingEntry.targetTemplateId`.
   - `record` nodes for that template.
   - warning when landing entry has no target template.
2. `change_event` root returns:
   - `change_event_form_task` nodes.
   - linked `record` nodes.
   - `document_impact_review` and `document_impact_item` nodes.
   - `verification_record` nodes.
3. missing weak targets do not throw:
   - response contains warning.
   - response still contains valid nodes.
4. invalid root id throws `NotFoundException`.
5. `maxDepth` clamps:
   - default is `4`.
   - values above `8` become `8`.
   - values below `1` become `1`.

Mock Prisma methods directly. Keep fixtures small and explicit.

### 2.2 Expected test shape

Use this structure:

```ts
describe('DocumentEvidenceChainService', () => {
  let service: DocumentEvidenceChainService;
  let prisma: Record<string, any>;

  beforeEach(() => {
    prisma = {
      document: { findUnique: jest.fn() },
      recordFormLandingEntry: { findMany: jest.fn() },
      recordTemplate: { findUnique: jest.fn(), findMany: jest.fn() },
      record: { findUnique: jest.fn(), findMany: jest.fn() },
      approvalInstance: { findMany: jest.fn() },
      approval: { findMany: jest.fn() },
      documentReadRequirement: { findMany: jest.fn() },
      documentReadConfirmation: { findMany: jest.fn() },
      documentTrainingNeed: { findMany: jest.fn() },
      trainingProject: { findUnique: jest.fn() },
      changeEvent: { findUnique: jest.fn() },
      changeEventFormTask: { findMany: jest.fn() },
      documentImpactReview: { findMany: jest.fn() },
      changeVerificationRecord: { findMany: jest.fn() },
      auditFinding: { findUnique: jest.fn(), findMany: jest.fn() },
      correctiveAction: { findUnique: jest.fn(), findMany: jest.fn() },
    };

    service = new DocumentEvidenceChainService(prisma as any);
  });
});
```

## Task 3: Backend Evidence Service Implementation

### 3.1 Create service

Create `server/src/modules/document/services/document-evidence-chain.service.ts`.

Constructor:

```ts
@Injectable()
export class DocumentEvidenceChainService {
  constructor(private readonly prisma: PrismaService) {}

  async getChain(query: EvidenceChainQuery): Promise<EvidenceChainResult> {
    const maxDepth = this.normalizeDepth(query.maxDepth);
    const builder = new EvidenceChainBuilder(query.sourceType, query.sourceId, maxDepth);

    switch (query.sourceType) {
      case 'document':
        await this.expandDocumentRoot(builder, query.sourceId);
        break;
      case 'record_template':
        await this.expandRecordTemplateRoot(builder, query.sourceId);
        break;
      case 'record':
        await this.expandRecordRoot(builder, query.sourceId);
        break;
      case 'change_event':
        await this.expandChangeEventRoot(builder, query.sourceId);
        break;
      case 'audit_finding':
        await this.expandAuditFindingRoot(builder, query.sourceId);
        break;
      case 'corrective_action':
        await this.expandCorrectiveActionRoot(builder, query.sourceId);
        break;
      default:
        throw new BadRequestException('Unsupported evidence source type');
    }

    return builder.result();
  }
}
```

Add a private `EvidenceChainBuilder` in the same file. It should:

- Deduplicate nodes by `nodeId`.
- Deduplicate edges by `source + target + relationType`.
- Track `root`.
- Store warnings.
- Expose `canExpand(depth: number): boolean`.
- Produce `generatedAt` with `new Date().toISOString()`.

Node id format must be stable:

```ts
private nodeId(type: string, id: string): string {
  return `${type}:${id}`;
}
```

### 3.2 Document root expansion

`expandDocumentRoot(builder, documentId)`:

- `document.findUnique({ where: { id: documentId } })`; throw `NotFoundException` if missing.
- Add root node:
  - type `document`
  - label from `doc.code ? `${doc.code} ${doc.title}` : doc.title`
  - route `/documents/${doc.id}`
- Find `RecordFormLandingEntry` by `relatedDocIds: { has: documentId }`.
  - Add `record_form_landing` node for each landing entry.
  - Add edge `document -> landing`, strength `validated`.
  - If `targetTemplateId` exists, resolve `RecordTemplate` and add `record_template`.
  - If `targetTemplateId` is null, add warning `记录表单入口未绑定表单模板`.
  - If `targetTemplateId` exists but template missing, add warning with strength `missing`.
- Find records for resolved templates when `maxDepth >= 2`.
- Find `DocumentReadRequirement` by `documentId`, then `DocumentReadConfirmation` by `requirementId`.
- Find `DocumentTrainingNeed` by `documentId`, and resolve `linkedTrainingProjectId` when present.
- Find legacy `Approval` rows by `documentId`.
- Find `AuditFinding` rows by `documentId`.
- Find `DocumentImpactReview` rows by `{ sourceType: 'document', sourceId: documentId }`, include `items`.

### 3.3 Record template root expansion

`expandRecordTemplateRoot(builder, templateId)`:

- Resolve `RecordTemplate`; throw if missing.
- Add records by `templateId`.
- Add `RecordFormLandingEntry` by `targetTemplateId`.
- Add `ChangeEventFormTask` by `templateId`, including `changeEvent` and `record`.

### 3.4 Record root expansion

`expandRecordRoot(builder, recordId)`:

- Resolve `Record`, include `template`, `changeEvent`.
- Add template edge `record -> record_template`.
- Add change event edge when `changeEventId` exists.
- Add approval instance edge when `approvalInstanceId` exists.
- Find `ChangeEventFormTask` by `recordId`.

### 3.5 Change event root expansion

`expandChangeEventRoot(builder, changeEventId)`:

- Resolve `ChangeEvent`; throw if missing.
- Add `ChangeEventRelation` rows.
  - For target types the service can resolve, add target node and `validated` edge.
  - For unsupported/legacy target types, add `unknown` node with `weak` edge.
- Add `ChangeEventFormTask` rows with template and record.
- Add `Record` rows by `changeEventId`.
- Add `DocumentImpactReview` rows by `changeEventId`, include `items`.
- Add `ChangeVerificationRecord` rows by `changeEventId`.
- Add `ApprovalInstance` rows by `resourceType: 'change_event', resourceId: changeEventId`.

### 3.6 Audit and corrective action expansion

`expandAuditFindingRoot(builder, auditFindingId)`:

- Resolve `AuditFinding`; throw if missing.
- Add document edge if `documentId` exists.
- Add approval instance edge if `approvalInstanceId` exists.
- Find corrective actions by:
  - `trigger_type: 'internal_audit'`
  - `trigger_id: auditFindingId`
- Add `audit_finding -> corrective_action`.

`expandCorrectiveActionRoot(builder, correctiveActionId)`:

- Resolve `CorrectiveAction`; throw if missing.
- Add approval instance edge if present.
- If `trigger_type === 'internal_audit'`, resolve `AuditFinding` by `trigger_id`.
- Add verification records owned by the corrective action if schema has that relation; if not, skip and add no warning.

### 3.7 Routes

Use route hints only when existing routes are known:

```ts
document: `/documents/${id}`
record_template: `/records/templates/${id}`
record: `/records/${id}`
change_event: `/change-events/${id}`
```

If a route is not known or not implemented, return `null`. Do not invent broken routes.

### 3.8 Verify

Run:

```bash
cd server
npm test -- document-evidence-chain.service.spec.ts
npm run build
```

## Task 4: Controller and Module Wiring

### 4.1 Module

Update `server/src/modules/document/document.module.ts`:

- import `DocumentEvidenceChainService`.
- add it to `providers`.

### 4.2 Controller

Update `server/src/modules/document/document.controller.ts`:

- inject `DocumentEvidenceChainService`.
- add this route before any `:id` route:

```ts
@Get('control/evidence-chain')
getEvidenceChain(
  @Query('sourceType') sourceType: EvidenceSourceType,
  @Query('sourceId') sourceId: string,
  @Query('maxDepth') maxDepth?: string,
) {
  return this.evidenceChainService.getChain({
    sourceType,
    sourceId,
    maxDepth: maxDepth ? Number(maxDepth) : undefined,
  });
}
```

Validation rules:

- Missing `sourceType` or `sourceId` returns `BadRequestException`.
- Unsupported `sourceType` returns `BadRequestException`.
- Keep existing `control/audit-chain` endpoint intact for compatibility.

### 4.3 Verify

Run:

```bash
cd server
npm test -- document-evidence-chain.service.spec.ts
npm run build
```

## Task 5: Client API

### 5.1 Add API method

Update `client/src/api/document-control.ts`.

Add:

```ts
import type {
  EvidenceChainQuery,
  EvidenceChainResult,
} from '@noidear/types';

export function getEvidenceChain(params: EvidenceChainQuery) {
  return request.get<EvidenceChainResult>('/documents/control/evidence-chain', { params });
}
```

If `document-control.ts` exports an object instead of functions, add `getEvidenceChain` to that object using the local file pattern.

### 5.2 Verify

Run:

```bash
cd client
npm run build
```

## Task 6: EvidenceChainGraph Component

### 6.1 Component test first

Create `client/src/components/document/__tests__/EvidenceChainGraph.spec.ts`.

Test:

- renders grouped nodes by depth/type.
- renders relation labels.
- renders warnings.
- emits or routes when clicking a node with `route`.
- does not render a navigation control for nodes without route.

### 6.2 Component implementation

Create `client/src/components/document/EvidenceChainGraph.vue`.

Behavior:

- Props:
  - `chain: EvidenceChainResult | null`
  - `loading?: boolean`
- Empty state: “暂无证据链数据”.
- Warning list shown above graph.
- Nodes grouped by `depth`, then by `type`.
- Each node shows:
  - label
  - type label
  - status if present
- Edges shown as compact relation rows below node groups.
- Clicking a routable node calls `router.push(node.route)`.

Do not add graph dependencies. Use existing CSS/classes and restrained layout.

### 6.3 Verify

Run:

```bash
cd client
npm test -- EvidenceChainGraph.spec.ts
npm run build
```

## Task 7: Explorer Page Integration

### 7.1 Test first

Update/create `client/src/views/documents/__tests__/AuditChainExplorer.spec.ts`.

Test:

- page title/copy uses “证据链”.
- query params `sourceType/sourceId` trigger `getEvidenceChain`.
- user can choose source type from:
  - `document`
  - `record_template`
  - `record`
  - `change_event`
  - `audit_finding`
  - `corrective_action`
- loading and error states render.
- JSON summary download/copy uses current chain result.

### 7.2 Implementation

Update `client/src/views/documents/AuditChainExplorer.vue`:

- Keep route path compatible: `documents/operations/audit-chain`.
- Change visible label to “证据链”.
- Use `documentControlApi.getEvidenceChain` or the local exported function.
- Read initial state from route query:
  - `sourceType`
  - `sourceId`
  - `maxDepth`
- Add source type selector and source id input.
- Render `EvidenceChainGraph`.
- Add “下载 JSON” action:

```ts
const blob = new Blob([JSON.stringify(chain.value, null, 2)], {
  type: 'application/json;charset=utf-8',
});
```

- Add “复制摘要” action:
  - copy node count, edge count, warning count, and root label.
  - do not require PDF/Excel in this phase.

### 7.3 Verify

Run:

```bash
cd client
npm test -- AuditChainExplorer.spec.ts
npm run build
```

## Task 8: Document Detail Entry

### 8.1 Test first

If `DocumentDetail.vue` has an existing test file, add a test:

- clicking “查看证据链” routes to:
  - `/documents/operations/audit-chain?sourceType=document&sourceId=<document.id>`

If no existing test exists, keep this as a manual verification step and avoid creating a large unrelated test harness.

### 8.2 Implementation

Update `client/src/views/documents/DocumentDetail.vue`:

- Add action button near existing document actions:

```vue
<button class="btn btn-secondary" type="button" @click="openEvidenceChain">
  查看证据链
</button>
```

- Add method:

```ts
function openEvidenceChain() {
  if (!document.value?.id) return;
  router.push({
    path: '/documents/operations/audit-chain',
    query: {
      sourceType: 'document',
      sourceId: document.value.id,
    },
  });
}
```

Use existing button/component styles in the file. Do not introduce a new visual system.

## Task 9: End-to-End Manual Smoke

Run local app with the repo’s normal command.

Manual checks:

1. Open a document detail page.
2. Click “查看证据链”.
3. Confirm explorer loads with `sourceType=document` and the correct `sourceId`.
4. Confirm at least the root document appears.
5. Confirm missing/weak links show warnings instead of blank failure.
6. Open a known change event by entering `sourceType=change_event`.
7. Confirm default form tasks and records appear when data exists.
8. Download JSON and open it to confirm it is valid JSON.

## Task 10: Final Verification

Run:

```bash
cd server
npm test -- document-evidence-chain.service.spec.ts
npm run build
```

Run:

```bash
cd client
npm test -- EvidenceChainGraph.spec.ts AuditChainExplorer.spec.ts
npm run build
```

Then from repo root:

```bash
git status --short
git diff --stat
```

## Self-Review Checklist

- `GET /documents/control/evidence-chain` is declared before dynamic `:id` document routes.
- API rejects missing or unsupported `sourceType`.
- Missing weak targets create warnings, not 500.
- Evidence chain does not duplicate batch traceability or CAPA business facts.
- Existing `control/audit-chain` remains compatible.
- Shared types compile from both client and server.
- UI uses list/grouped flow, not a heavy graph dependency.
- Routes are only returned when known to work.
- Tests cover document root and change event root.

## Execution Handoff

After implementation, open a PR titled:

```text
Implement document governance phase 4 evidence chain
```

PR description should include:

- Backend API added.
- Evidence source types supported.
- UI entry points added.
- Tests run.
- Known deferred work: PDF/Excel export and deeper traceability recall graph.
