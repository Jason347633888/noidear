# Document Governance Phase 3 Actionable Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the document-control workbench from a count dashboard into clickable issue queues with concrete rows and remediation routes.

**Architecture:** Keep `DocumentControlWorkbenchService` as the only backend aggregation layer for workbench counts and issue details. Add a typed issue contract plus one paginated endpoint, then route all workbench cards to a single `DocumentControlIssueList.vue` page that sends users to existing source-of-truth pages for repair.

**Tech Stack:** NestJS, Prisma, PostgreSQL, class-validator, Vue 3, Vue Router, Element Plus, Vitest, Jest.

---

## Context

Read these before implementation:

- `AGENTS.md`
- `docs/AGENT_GUIDE.md`
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `docs/superpowers/specs/2026-04-27-document-change-governance-strong-link-design.md`
- `docs/superpowers/plans/2026-04-27-document-governance-phase3-actionable-workbench-plan.md`

Phase 2 is already implemented and merged. Do not rebuild `ChangeEvent`, `ChangeEventFormTask`, or `Record.usageType/sourceType/sourceId/changeEventId` in this phase.

## File Structure

- Modify: `server/src/modules/document/dto/document-control.dto.ts`
  - Add `WORKBENCH_ISSUE_TYPES`, `WorkbenchIssueType`, `WorkbenchIssueQueryDto`, and response interfaces.
- Modify: `server/src/modules/document/services/document-control-workbench.service.ts`
  - Extract shared issue predicates.
  - Add `listIssues(query)` with paginated issue rows.
  - Keep `getWorkbench(days)` response backward compatible.
- Modify: `server/src/modules/document/document.controller.ts`
  - Add `GET /documents/control/workbench/issues`.
  - Place this route before `GET /documents/control/workbench`.
- Test: `server/src/modules/document/services/document-control-workbench.service.spec.ts`
  - Cover issue row mapping, pagination, unknown issue types, and count compatibility.
- Modify: `client/src/api/document-control.ts`
  - Add issue types, issue row interfaces, and `listWorkbenchIssues`.
- Modify: `client/src/views/documents/DocumentControlWorkbench.vue`
  - Route every card to `/documents/control/workbench/issues?type=<issueType>`.
  - Keep count display compact.
- Create: `client/src/views/documents/DocumentControlIssueList.vue`
  - Show issue rows, severity, source, detected time, and action button.
  - Support pagination and refresh.
- Modify: `client/src/router/index.ts`
  - Add route `documents/control/workbench/issues`.
- Modify: `client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts`
  - Update route assertions for card clicks.
- Create: `client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts`
  - Cover loading, empty state, pagination, refresh, and action routing.

## Issue Types And Routes

Use these issue types exactly:

```ts
export const WORKBENCH_ISSUE_TYPES = [
  'pendingReview',
  'dueForReview',
  'expiringExternalFiles',
  'obsoleteReferences',
  'brokenReferences',
  'missingLandingTargets',
  'missingMetadata',
  'trainingNeeds',
  'openImpactItems',
] as const;
```

Issue action route mapping:

| Issue type | Action route |
| --- | --- |
| `pendingReview` | `/documents/pending-approvals` is not a client route, so use `/documents?status=pending` |
| `dueForReview` | `/documents/control/library?issue=dueForReview&documentId=<id>` |
| `expiringExternalFiles` | `/documents/control/library?issue=expiringExternalFiles&documentId=<id>` |
| `obsoleteReferences` | `/documents/<sourceDocId>?section=references&issue=obsoleteReferences` |
| `brokenReferences` | `/documents/<sourceDocId>?section=references&issue=brokenReferences` |
| `missingLandingTargets` | `/documents/control/record-form-index?issue=missingLandingTargets&code=<sourceCode>` |
| `missingMetadata` | `/documents/<documentId>?section=metadata&issue=missingMetadata` |
| `trainingNeeds` | `/documents/operations/training-needs?status=suggested` |
| `openImpactItems` | `/documents/operations/impact?status=open` |

## Task 1: Backend Issue Contract

**Files:**
- Modify: `server/src/modules/document/dto/document-control.dto.ts`
- Test: `server/src/modules/document/services/document-control-workbench.service.spec.ts`

- [ ] **Step 1: Write the failing DTO/contract test**

Append this test case to `server/src/modules/document/services/document-control-workbench.service.spec.ts`:

```ts
it('exposes stable issue type contract values', async () => {
  const dto = await import('../dto/document-control.dto');
  expect(dto.WORKBENCH_ISSUE_TYPES).toEqual([
    'pendingReview',
    'dueForReview',
    'expiringExternalFiles',
    'obsoleteReferences',
    'brokenReferences',
    'missingLandingTargets',
    'missingMetadata',
    'trainingNeeds',
    'openImpactItems',
  ]);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document-control-workbench.service.spec.ts --runInBand
```

Expected: FAIL because `WORKBENCH_ISSUE_TYPES` is not exported yet.

- [ ] **Step 3: Add the issue contract**

Add this code after `WorkbenchQueryDto` in `server/src/modules/document/dto/document-control.dto.ts`:

```ts
export const WORKBENCH_ISSUE_TYPES = [
  'pendingReview',
  'dueForReview',
  'expiringExternalFiles',
  'obsoleteReferences',
  'brokenReferences',
  'missingLandingTargets',
  'missingMetadata',
  'trainingNeeds',
  'openImpactItems',
] as const;

export type WorkbenchIssueType = typeof WORKBENCH_ISSUE_TYPES[number];

export class WorkbenchIssueQueryDto {
  @ApiPropertyOptional({ enum: WORKBENCH_ISSUE_TYPES })
  @IsIn(WORKBENCH_ISSUE_TYPES)
  type!: WorkbenchIssueType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  days?: number = 30;
}

export interface WorkbenchIssueItem {
  id: string;
  issueType: WorkbenchIssueType;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  sourceRoute: string;
  actionLabel: string;
  actionRoute: string;
  detectedAt: Date | string | null;
}

export interface WorkbenchIssueListResponse {
  type: WorkbenchIssueType;
  items: WorkbenchIssueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

- [ ] **Step 4: Run the contract test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document-control-workbench.service.spec.ts --runInBand
```

Expected: PASS for the new contract test. Existing workbench tests may still fail later if imports need path adjustment; fix only import paths, not behavior.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/document/dto/document-control.dto.ts server/src/modules/document/services/document-control-workbench.service.spec.ts
git commit -m "test: define document workbench issue contract"
```

## Task 2: Backend Issue Detail Service

**Files:**
- Modify: `server/src/modules/document/services/document-control-workbench.service.ts`
- Test: `server/src/modules/document/services/document-control-workbench.service.spec.ts`

- [ ] **Step 1: Extend the Prisma mock in the service spec**

In `server/src/modules/document/services/document-control-workbench.service.spec.ts`, replace the existing `prisma` mock with:

```ts
const prisma = {
  document: { findMany: jest.fn(), count: jest.fn() },
  documentReference: { findMany: jest.fn(), count: jest.fn() },
  recordFormLandingEntry: { findMany: jest.fn(), count: jest.fn() },
  documentTrainingNeed: { findMany: jest.fn(), count: jest.fn() },
  documentImpactItem: { findMany: jest.fn(), count: jest.fn() },
};
```

Update `beforeEach` to reset both `findMany` and `count`:

```ts
beforeEach(() => {
  jest.clearAllMocks();
  prisma.document.findMany.mockResolvedValue([]);
  prisma.document.count.mockResolvedValue(0);
  prisma.documentReference.findMany.mockResolvedValue([]);
  prisma.documentReference.count.mockResolvedValue(0);
  prisma.recordFormLandingEntry.findMany.mockResolvedValue([]);
  prisma.recordFormLandingEntry.count.mockResolvedValue(0);
  prisma.documentTrainingNeed.findMany.mockResolvedValue([]);
  prisma.documentTrainingNeed.count.mockResolvedValue(0);
  prisma.documentImpactItem.findMany.mockResolvedValue([]);
  prisma.documentImpactItem.count.mockResolvedValue(0);
});
```

- [ ] **Step 2: Write failing issue list tests**

Append these tests to `server/src/modules/document/services/document-control-workbench.service.spec.ts`:

```ts
it('returns paginated due-for-review issue rows with action routes', async () => {
  prisma.document.count.mockResolvedValueOnce(1);
  prisma.document.findMany.mockResolvedValueOnce([
    {
      id: 'doc-1',
      number: 'QM-001',
      title: '质量手册',
      review_due_date: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    },
  ]);

  const service = new DocumentControlWorkbenchService(prisma as any);
  const result = await service.listIssues({ type: 'dueForReview', page: 1, limit: 20, days: 30 });

  expect(result.total).toBe(1);
  expect(result.items[0]).toEqual(expect.objectContaining({
    id: 'doc-1',
    issueType: 'dueForReview',
    severity: 'medium',
    title: 'QM-001 质量手册',
    sourceType: 'document',
    sourceId: 'doc-1',
    actionLabel: '查看复审文件',
    actionRoute: '/documents/control/library?issue=dueForReview&documentId=doc-1',
  }));
});

it('returns missing landing target issue rows with record form action routes', async () => {
  prisma.recordFormLandingEntry.count.mockResolvedValueOnce(1);
  prisma.recordFormLandingEntry.findMany.mockResolvedValueOnce([
    {
      id: 'landing-1',
      sourceCode: 'GRSS-PZ-JL-01',
      targetRoute: null,
      targetModule: null,
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    },
  ]);

  const service = new DocumentControlWorkbenchService(prisma as any);
  const result = await service.listIssues({ type: 'missingLandingTargets', page: 1, limit: 20, days: 30 });

  expect(result.items[0]).toEqual(expect.objectContaining({
    id: 'landing-1',
    issueType: 'missingLandingTargets',
    severity: 'high',
    title: 'GRSS-PZ-JL-01 缺少落地入口',
    sourceType: 'record_form_landing',
    sourceId: 'GRSS-PZ-JL-01',
    actionRoute: '/documents/control/record-form-index?issue=missingLandingTargets&code=GRSS-PZ-JL-01',
  }));
});

it('clamps issue pagination to a safe range', async () => {
  prisma.document.count.mockResolvedValueOnce(0);
  prisma.document.findMany.mockResolvedValueOnce([]);

  const service = new DocumentControlWorkbenchService(prisma as any);
  await service.listIssues({ type: 'pendingReview', page: -10, limit: 999, days: 30 });

  expect(prisma.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
    skip: 0,
    take: 100,
  }));
});
```

- [ ] **Step 3: Run the failing service tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document-control-workbench.service.spec.ts --runInBand
```

Expected: FAIL because `listIssues` is not implemented.

- [ ] **Step 4: Implement backend helpers and `listIssues`**

Replace `server/src/modules/document/services/document-control-workbench.service.ts` with this structure, keeping the existing `getWorkbench` method compatible:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EFFECTIVE_COMPAT_STATUSES } from '../constants/document-control.constants';
import {
  WORKBENCH_ISSUE_TYPES,
  WorkbenchIssueItem,
  WorkbenchIssueListResponse,
  WorkbenchIssueQueryDto,
  WorkbenchIssueType,
} from '../dto/document-control.dto';

@Injectable()
export class DocumentControlWorkbenchService {
  constructor(private readonly prisma: PrismaService) {}

  private getDeadline(days = 30) {
    const safeDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + safeDays);
    return deadline;
  }

  private getPage(query: WorkbenchIssueQueryDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    return { page, limit, skip: (page - 1) * limit };
  }

  private assertIssueType(type: string): asserts type is WorkbenchIssueType {
    if (!WORKBENCH_ISSUE_TYPES.includes(type as WorkbenchIssueType)) {
      throw new BadRequestException(`Unsupported workbench issue type: ${type}`);
    }
  }

  async getWorkbench(days = 30) {
    const deadline = this.getDeadline(days);

    const [
      pendingReview,
      dueForReview,
      expiringExternalFiles,
      obsoleteReferences,
      brokenReferences,
      missingLandingTargets,
      missingMetadata,
      trainingNeeds,
      openImpactItems,
    ] = await Promise.all([
      this.prisma.document.findMany({
        where: { deletedAt: null, status: { in: ['pending_review', 'pending'] } },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      this.prisma.document.findMany({
        where: { deletedAt: null, status: { in: [...EFFECTIVE_COMPAT_STATUSES] }, review_due_date: { lte: deadline } },
        orderBy: { review_due_date: 'asc' },
        take: 100,
      }),
      this.prisma.document.findMany({
        where: {
          deletedAt: null,
          document_type: 'EXTERNAL_FILE',
          external_expires_at: { lte: deadline },
          status: { in: [...EFFECTIVE_COMPAT_STATUSES] },
        },
        orderBy: { external_expires_at: 'asc' },
        take: 100,
      }),
      this.prisma.documentReference.findMany({
        where: { targetDoc: { status: { in: ['obsolete', 'archived', 'superseded'] } } },
        include: {
          sourceDoc: { select: { id: true, title: true, status: true } },
          targetDoc: { select: { id: true, title: true, status: true } },
        },
        take: 100,
      }),
      this.prisma.documentReference.findMany({
        where: {
          targetType: { in: ['record_template', 'record_list', 'business_module', 'business_object'] },
          targetRoute: null,
        },
        include: { sourceDoc: { select: { id: true, title: true, status: true } } },
        take: 100,
      }),
      this.prisma.recordFormLandingEntry.findMany({
        where: { OR: [{ targetRoute: null }, { targetModule: null }] },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      this.prisma.document.findMany({
        where: {
          deletedAt: null,
          OR: [
            { document_type: null },
            { source_folder: null },
            { review_due_date: null },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      this.prisma.documentTrainingNeed.findMany({
        where: { status: { in: ['suggested', 'open', 'pending'] } },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      this.prisma.documentImpactItem.findMany({
        where: { status: { in: ['open', 'pending'] } },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      pendingReview,
      dueForReview,
      expiringExternalFiles,
      obsoleteReferences,
      brokenReferences,
      missingLandingTargets,
      missingMetadata,
      trainingNeeds,
      openImpactItems,
      counts: {
        pendingReview: pendingReview.length,
        dueForReview: dueForReview.length,
        expiringExternalFiles: expiringExternalFiles.length,
        obsoleteReferences: obsoleteReferences.length,
        brokenReferences: brokenReferences.length,
        missingLandingTargets: missingLandingTargets.length,
        missingMetadata: missingMetadata.length,
        trainingNeeds: trainingNeeds.length,
        openImpactItems: openImpactItems.length,
      },
    };
  }

  async listIssues(query: WorkbenchIssueQueryDto): Promise<WorkbenchIssueListResponse> {
    this.assertIssueType(query.type);
    const { page, limit, skip } = this.getPage(query);
    const deadline = this.getDeadline(query.days);
    const { total, rows } = await this.queryIssueRows(query.type, deadline, skip, limit);
    const items = rows.map((row: any) => this.toIssueItem(query.type, row));
    return {
      type: query.type,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async queryIssueRows(type: WorkbenchIssueType, deadline: Date, skip: number, take: number) {
    if (type === 'pendingReview') {
      const where = { deletedAt: null, status: { in: ['pending_review', 'pending'] } };
      const [total, rows] = await Promise.all([
        this.prisma.document.count({ where }),
        this.prisma.document.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
      ]);
      return { total, rows };
    }

    if (type === 'dueForReview') {
      const where = { deletedAt: null, status: { in: [...EFFECTIVE_COMPAT_STATUSES] }, review_due_date: { lte: deadline } };
      const [total, rows] = await Promise.all([
        this.prisma.document.count({ where }),
        this.prisma.document.findMany({ where, orderBy: { review_due_date: 'asc' }, skip, take }),
      ]);
      return { total, rows };
    }

    if (type === 'expiringExternalFiles') {
      const where = {
        deletedAt: null,
        document_type: 'EXTERNAL_FILE',
        external_expires_at: { lte: deadline },
        status: { in: [...EFFECTIVE_COMPAT_STATUSES] },
      };
      const [total, rows] = await Promise.all([
        this.prisma.document.count({ where }),
        this.prisma.document.findMany({ where, orderBy: { external_expires_at: 'asc' }, skip, take }),
      ]);
      return { total, rows };
    }

    if (type === 'obsoleteReferences') {
      const where = { targetDoc: { status: { in: ['obsolete', 'archived', 'superseded'] } } };
      const [total, rows] = await Promise.all([
        this.prisma.documentReference.count({ where }),
        this.prisma.documentReference.findMany({
          where,
          include: {
            sourceDoc: { select: { id: true, title: true, status: true } },
            targetDoc: { select: { id: true, title: true, status: true } },
          },
          skip,
          take,
        }),
      ]);
      return { total, rows };
    }

    if (type === 'brokenReferences') {
      const where = {
        targetType: { in: ['record_template', 'record_list', 'business_module', 'business_object'] },
        targetRoute: null,
      };
      const [total, rows] = await Promise.all([
        this.prisma.documentReference.count({ where }),
        this.prisma.documentReference.findMany({
          where,
          include: { sourceDoc: { select: { id: true, title: true, status: true } } },
          skip,
          take,
        }),
      ]);
      return { total, rows };
    }

    if (type === 'missingLandingTargets') {
      const where = { OR: [{ targetRoute: null }, { targetModule: null }] };
      const [total, rows] = await Promise.all([
        this.prisma.recordFormLandingEntry.count({ where }),
        this.prisma.recordFormLandingEntry.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
      ]);
      return { total, rows };
    }

    if (type === 'missingMetadata') {
      const where = {
        deletedAt: null,
        OR: [
          { document_type: null },
          { source_folder: null },
          { review_due_date: null },
        ],
      };
      const [total, rows] = await Promise.all([
        this.prisma.document.count({ where }),
        this.prisma.document.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }),
      ]);
      return { total, rows };
    }

    if (type === 'trainingNeeds') {
      const where = { status: { in: ['suggested', 'open', 'pending'] } };
      const [total, rows] = await Promise.all([
        this.prisma.documentTrainingNeed.count({ where }),
        this.prisma.documentTrainingNeed.findMany({
          where,
          include: { document: { select: { id: true, title: true, number: true } } },
          orderBy: { updatedAt: 'desc' },
          skip,
          take,
        }),
      ]);
      return { total, rows };
    }

    const where = { status: { in: ['open', 'pending'] } };
    const [total, rows] = await Promise.all([
      this.prisma.documentImpactItem.count({ where }),
      this.prisma.documentImpactItem.findMany({
        where,
        include: { review: { select: { id: true, title: true, sourceType: true, sourceId: true } } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
    ]);
    return { total, rows };
  }

  private toIssueItem(type: WorkbenchIssueType, row: any): WorkbenchIssueItem {
    if (type === 'missingLandingTargets') {
      const code = row.sourceCode;
      return {
        id: row.id,
        issueType: type,
        severity: 'high',
        title: `${code} 缺少落地入口`,
        description: '记录表单索引缺少目标模块或目标路由，无法从文控中心导航到实际填报入口。',
        sourceType: 'record_form_landing',
        sourceId: code,
        sourceLabel: code,
        sourceRoute: `/documents/control/record-form-index?code=${encodeURIComponent(code)}`,
        actionLabel: '维护表单入口',
        actionRoute: `/documents/control/record-form-index?issue=missingLandingTargets&code=${encodeURIComponent(code)}`,
        detectedAt: row.updatedAt ?? row.createdAt ?? null,
      };
    }

    if (type === 'obsoleteReferences' || type === 'brokenReferences') {
      const sourceDocId = row.sourceDocId ?? row.sourceDoc?.id;
      const label = row.targetLabel ?? row.targetDoc?.title ?? row.targetId ?? '未命名引用';
      return {
        id: row.id,
        issueType: type,
        severity: type === 'obsoleteReferences' ? 'high' : 'medium',
        title: `${row.sourceDoc?.title ?? '来源文件'} 引用异常`,
        description: type === 'obsoleteReferences'
          ? `引用目标 ${label} 已作废、归档或被替代。`
          : `引用目标 ${label} 缺少可用入口。`,
        sourceType: 'document_reference',
        sourceId: sourceDocId,
        sourceLabel: row.sourceDoc?.title ?? sourceDocId,
        sourceRoute: `/documents/${sourceDocId}`,
        actionLabel: '查看引用',
        actionRoute: `/documents/${sourceDocId}?section=references&issue=${type}`,
        detectedAt: row.updatedAt ?? row.createdAt ?? null,
      };
    }

    if (type === 'trainingNeeds') {
      return {
        id: row.id,
        issueType: type,
        severity: 'medium',
        title: row.document?.title ? `${row.document.title} 培训需求未处理` : '培训需求未处理',
        description: row.reason ?? '文档变更或阅读要求产生了培训需求，尚未接受、驳回或关联培训项目。',
        sourceType: 'document_training_need',
        sourceId: row.id,
        sourceLabel: row.document?.number ?? row.document?.title ?? row.id,
        sourceRoute: '/documents/operations/training-needs?status=suggested',
        actionLabel: '处理培训需求',
        actionRoute: '/documents/operations/training-needs?status=suggested',
        detectedAt: row.updatedAt ?? row.createdAt ?? null,
      };
    }

    if (type === 'openImpactItems') {
      return {
        id: row.id,
        issueType: type,
        severity: row.impactLevel === 'high' ? 'high' : 'medium',
        title: row.targetLabel ?? row.review?.title ?? '影响项未关闭',
        description: row.suggestedAction ?? '影响评审项仍处于打开状态，需要确认处理动作。',
        sourceType: 'document_impact_item',
        sourceId: row.id,
        sourceLabel: row.review?.title ?? row.id,
        sourceRoute: '/documents/operations/impact?status=open',
        actionLabel: '处理影响项',
        actionRoute: '/documents/operations/impact?status=open',
        detectedAt: row.updatedAt ?? row.createdAt ?? null,
      };
    }

    const documentId = row.id;
    const title = `${row.number ?? ''} ${row.title ?? '未命名文件'}`.trim();
    const base = {
      id: documentId,
      issueType: type,
      title,
      sourceType: 'document',
      sourceId: documentId,
      sourceLabel: title,
      sourceRoute: `/documents/${documentId}`,
      detectedAt: row.updatedAt ?? row.review_due_date ?? row.external_expires_at ?? row.createdAt ?? null,
    };

    if (type === 'pendingReview') {
      return { ...base, severity: 'medium', description: '文件处于待审核状态。', actionLabel: '查看审批文件', actionRoute: `/documents/${documentId}` };
    }
    if (type === 'dueForReview') {
      return { ...base, severity: 'medium', description: '文件已到或即将到达复审日期。', actionLabel: '查看复审文件', actionRoute: `/documents/control/library?issue=dueForReview&documentId=${documentId}` };
    }
    if (type === 'expiringExternalFiles') {
      return { ...base, severity: 'high', description: '外来文件已到或即将到达有效期。', actionLabel: '查看外来文件', actionRoute: `/documents/control/library?issue=expiringExternalFiles&documentId=${documentId}` };
    }
    return { ...base, severity: 'medium', description: '文件缺少文控元数据。', actionLabel: '补齐元数据', actionRoute: `/documents/${documentId}?section=metadata&issue=missingMetadata` };
  }
}
```

- [ ] **Step 5: Run backend service tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document-control-workbench.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/document/services/document-control-workbench.service.ts server/src/modules/document/services/document-control-workbench.service.spec.ts
git commit -m "feat: add document workbench issue detail service"
```

## Task 3: Backend Controller Endpoint

**Files:**
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/dto/index.ts` if `WorkbenchIssueQueryDto` is not exported there.

- [ ] **Step 1: Check DTO barrel export**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
rg -n "document-control" src/modules/document/dto/index.ts src/modules/document/dto
```

Expected: `document-control.dto.ts` is exported from `src/modules/document/dto/index.ts`. If it is not exported, add:

```ts
export * from './document-control.dto';
```

- [ ] **Step 2: Add the controller import**

In `server/src/modules/document/document.controller.ts`, extend the existing dto import so it includes `WorkbenchIssueQueryDto`:

```ts
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto, ArchiveDocumentDto, ObsoleteDocumentDto, ApproveDocumentDto, CreateGenericDocumentReferenceDto, WorkbenchQueryDto, WorkbenchIssueQueryDto, CreateReadRequirementDto, TrainingNeedActionDto, ImpactReviewCreateDto, ImpactItemUpdateDto, CoverageQueryDto, AuditChainQueryDto, UpdateMarkdownDto } from './dto';
```

- [ ] **Step 3: Add the issue endpoint before `getControlWorkbench`**

Insert this route immediately before the existing `@Get('control/workbench')` route in `server/src/modules/document/document.controller.ts`:

```ts
  @Get('control/workbench/issues')
  @ApiOperation({ summary: '文控工作台问题明细' })
  getControlWorkbenchIssues(@Query() query: WorkbenchIssueQueryDto) {
    return this.workbenchService.listIssues(query);
  }
```

This route must stay before `@Get('control/workbench')` so it is easy to scan and keeps all workbench routes together.

- [ ] **Step 4: Run a TypeScript compile check for touched backend files**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document-control-workbench.service.spec.ts --runInBand
```

Expected: PASS. Do not use full `npm run build` as the only gate because this repo currently has unrelated TypeScript debt in other modules.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/document/document.controller.ts server/src/modules/document/dto/index.ts
git commit -m "feat: expose document workbench issue endpoint"
```

## Task 4: Client API Contract

**Files:**
- Modify: `client/src/api/document-control.ts`
- Test: `client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts`

- [ ] **Step 1: Add client types and API method**

In `client/src/api/document-control.ts`, add these types after `WorkbenchResponse`:

```ts
export type WorkbenchIssueType =
  | 'pendingReview'
  | 'dueForReview'
  | 'expiringExternalFiles'
  | 'obsoleteReferences'
  | 'brokenReferences'
  | 'missingLandingTargets'
  | 'missingMetadata'
  | 'trainingNeeds'
  | 'openImpactItems';

export interface WorkbenchIssueItem {
  id: string;
  issueType: WorkbenchIssueType;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  sourceRoute: string;
  actionLabel: string;
  actionRoute: string;
  detectedAt: string | null;
}

export interface WorkbenchIssueListResponse {
  type: WorkbenchIssueType;
  items: WorkbenchIssueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Add this method to `documentControlApi`:

```ts
  listWorkbenchIssues(params: { type: WorkbenchIssueType; page?: number; limit?: number; days?: number }) {
    return request.get<WorkbenchIssueListResponse>('/documents/control/workbench/issues', { params });
  },
```

- [ ] **Step 2: Create a failing import smoke test for the future issue list**

Create `client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts` with:

```ts
import { describe, it, expect } from 'vitest';

describe('DocumentControlIssueList', () => {
  it('has a test file ready for the issue list component', () => {
    expect(true).toBe(true);
  });
});
```

This keeps the next task focused on component behavior.

- [ ] **Step 3: Run client tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentControlIssueList.spec.ts --run
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/api/document-control.ts client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts
git commit -m "feat: add document workbench issue api contract"
```

## Task 5: Workbench Card Routing

**Files:**
- Modify: `client/src/views/documents/DocumentControlWorkbench.vue`
- Modify: `client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts`

- [ ] **Step 1: Update the workbench route test first**

In `client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts`, replace the expected card route in the click test with:

```ts
expect(routerPush).toHaveBeenCalledWith({
  path: '/documents/control/workbench/issues',
  query: { type: 'missingMetadata' },
});
```

Replace both expected routes in the keyboard test with:

```ts
expect(routerPush).toHaveBeenNthCalledWith(1, {
  path: '/documents/control/workbench/issues',
  query: { type: 'missingMetadata' },
});
expect(routerPush).toHaveBeenNthCalledWith(2, {
  path: '/documents/control/workbench/issues',
  query: { type: 'missingMetadata' },
});
```

Also update the rendered title list to include the phase-three cards:

```ts
const titles = [
  '待审核',
  '即将复审',
  '外来文件到期',
  '作废仍被引用',
  '入口失效',
  '表单入口缺失',
  '元数据缺失',
  '培训需求未处理',
  '影响项未关闭',
];
```

- [ ] **Step 2: Run the failing workbench test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentControlWorkbench.spec.ts --run
```

Expected: FAIL because the component still routes cards to multiple old pages.

- [ ] **Step 3: Update `DocumentControlWorkbench.vue` cards**

Replace the `cards` computed block in `client/src/views/documents/DocumentControlWorkbench.vue` with:

```ts
const cards = computed(() => [
  { key: 'pendingReview', title: '待审核', severity: 'medium' },
  { key: 'dueForReview', title: '即将复审', severity: 'medium' },
  { key: 'expiringExternalFiles', title: '外来文件到期', severity: 'high' },
  { key: 'obsoleteReferences', title: '作废仍被引用', severity: 'high' },
  { key: 'brokenReferences', title: '入口失效', severity: 'medium' },
  { key: 'missingLandingTargets', title: '表单入口缺失', severity: 'high' },
  { key: 'missingMetadata', title: '元数据缺失', severity: 'medium' },
  { key: 'trainingNeeds', title: '培训需求未处理', severity: 'medium' },
  { key: 'openImpactItems', title: '影响项未关闭', severity: 'medium' },
]);
```

Replace `openCard` with:

```ts
const openCard = (card: { key: string }) => router.push({
  path: '/documents/control/workbench/issues',
  query: { type: card.key },
});
```

Add this small severity label inside each card, under the count:

```vue
<span class="severity" :class="`severity-${card.severity}`">
  {{ card.severity === 'high' ? '需优先处理' : '待处理' }}
</span>
```

Add styles:

```css
.severity {
  display: block;
  margin-top: 6px;
  font-size: 12px;
}
.severity-high {
  color: #c45656;
}
.severity-medium {
  color: #e6a23c;
}
```

- [ ] **Step 4: Run workbench tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentControlWorkbench.spec.ts --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/views/documents/DocumentControlWorkbench.vue client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts
git commit -m "feat: route document workbench cards to issue queues"
```

## Task 6: Issue List Page

**Files:**
- Create: `client/src/views/documents/DocumentControlIssueList.vue`
- Modify: `client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts`
- Modify: `client/src/router/index.ts`

- [ ] **Step 1: Write the issue list component tests**

Replace `client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts` with:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { computed, inject, provide, type Ref } from 'vue';

const mockListIssues = vi.fn();
const mockPush = vi.fn();
let mockRoute = { query: { type: 'missingMetadata' } as Record<string, string> };

vi.mock('@/api/document-control', () => ({
  documentControlApi: {
    listWorkbenchIssues: (...args: unknown[]) => mockListIssues(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
}));

const stubs = {
  'el-card': { template: '<div><slot name="header" /><slot /></div>' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>', props: ['type', 'size'] },
  'el-tag': { template: '<span><slot /></span>', props: ['type'] },
  'el-empty': { template: '<div class="empty">empty</div>' },
  'el-pagination': { template: '<div class="pagination" />', props: ['currentPage', 'pageSize', 'total'] },
  'el-table': {
    props: ['data'],
    setup(props: { data: unknown[] }) {
      provide('tableRows', computed(() => props.data));
    },
    template: '<div><slot /></div>',
  },
  'el-table-column': {
    props: ['label', 'prop'],
    setup(_, { slots }) {
      const rows = inject<Ref<unknown[]>>('tableRows');
      return { rows, slots };
    },
    template: '<div><template v-for="row in rows" :key="row.id"><slot :row="row" /></template></div>',
  },
};

import DocumentControlIssueList from '../DocumentControlIssueList.vue';

const mountOptions = { global: { stubs, directives: { loading: {} } } };

describe('DocumentControlIssueList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute = { query: { type: 'missingMetadata' } };
    mockListIssues.mockResolvedValue({
      type: 'missingMetadata',
      items: [
        {
          id: 'issue-1',
          issueType: 'missingMetadata',
          severity: 'medium',
          title: 'QM-001 质量手册',
          description: '文件缺少文控元数据。',
          sourceType: 'document',
          sourceId: 'doc-1',
          sourceLabel: 'QM-001 质量手册',
          sourceRoute: '/documents/doc-1',
          actionLabel: '补齐元数据',
          actionRoute: '/documents/doc-1?section=metadata&issue=missingMetadata',
          detectedAt: '2026-04-28T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('loads issue rows from route query type', async () => {
    const wrapper = mount(DocumentControlIssueList, mountOptions);
    await flushPromises();

    expect(mockListIssues).toHaveBeenCalledWith({ type: 'missingMetadata', page: 1, limit: 20, days: 30 });
    expect(wrapper.text()).toContain('QM-001 质量手册');
  });

  it('routes action button to the issue action route', async () => {
    const wrapper = mount(DocumentControlIssueList, mountOptions);
    await flushPromises();

    await wrapper.find('[data-test="issue-action-issue-1"]').trigger('click');
    expect(mockPush).toHaveBeenCalledWith('/documents/doc-1?section=metadata&issue=missingMetadata');
  });

  it('shows empty state when there are no rows', async () => {
    mockListIssues.mockResolvedValue({ type: 'missingMetadata', items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const wrapper = mount(DocumentControlIssueList, mountOptions);
    await flushPromises();

    expect(wrapper.find('.empty').exists()).toBe(true);
  });

  it('falls back to missingMetadata when route type is absent', async () => {
    mockRoute = { query: {} };
    mount(DocumentControlIssueList, mountOptions);
    await flushPromises();

    expect(mockListIssues).toHaveBeenCalledWith({ type: 'missingMetadata', page: 1, limit: 20, days: 30 });
  });
});
```

- [ ] **Step 2: Run the failing issue list tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentControlIssueList.spec.ts --run
```

Expected: FAIL because `DocumentControlIssueList.vue` does not exist.

- [ ] **Step 3: Create `DocumentControlIssueList.vue`**

Create `client/src/views/documents/DocumentControlIssueList.vue`:

```vue
<template>
  <div class="document-control-issue-list">
    <el-card>
      <template #header>
        <div class="header">
          <div>
            <strong>{{ issueTitle }}</strong>
            <span class="total">共 {{ total }} 条</span>
          </div>
          <el-button size="small" @click="fetchIssues">刷新</el-button>
        </div>
      </template>

      <el-empty v-if="!loading && items.length === 0" description="暂无问题" />

      <el-table v-else :data="items" v-loading="loading" stripe>
        <el-table-column label="严重度" width="100">
          <template #default="{ row }">
            <el-tag :type="severityType(row.severity)">{{ severityText(row.severity) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="问题" min-width="180" />
        <el-table-column prop="description" label="说明" min-width="260" show-overflow-tooltip />
        <el-table-column prop="sourceLabel" label="来源" min-width="160" />
        <el-table-column label="发现时间" width="140">
          <template #default="{ row }">{{ formatDate(row.detectedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button :data-test="`issue-action-${row.id}`" type="primary" size="small" @click="openAction(row.actionRoute)">
              {{ row.actionLabel }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 0"
        class="pagination"
        :current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  documentControlApi,
  type WorkbenchIssueItem,
  type WorkbenchIssueType,
} from '@/api/document-control';

const route = useRoute();
const router = useRouter();

const issueTitles: Record<WorkbenchIssueType, string> = {
  pendingReview: '待审核',
  dueForReview: '即将复审',
  expiringExternalFiles: '外来文件到期',
  obsoleteReferences: '作废仍被引用',
  brokenReferences: '入口失效',
  missingLandingTargets: '表单入口缺失',
  missingMetadata: '元数据缺失',
  trainingNeeds: '培训需求未处理',
  openImpactItems: '影响项未关闭',
};

const validTypes = Object.keys(issueTitles) as WorkbenchIssueType[];
const loading = ref(false);
const items = ref<WorkbenchIssueItem[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(20);

const issueType = computed<WorkbenchIssueType>(() => {
  const value = route.query.type as WorkbenchIssueType | undefined;
  return value && validTypes.includes(value) ? value : 'missingMetadata';
});

const issueTitle = computed(() => issueTitles[issueType.value]);

async function fetchIssues() {
  loading.value = true;
  try {
    const result = await documentControlApi.listWorkbenchIssues({
      type: issueType.value,
      page: page.value,
      limit: limit.value,
      days: 30,
    });
    items.value = result.items;
    total.value = result.total;
    page.value = result.page;
    limit.value = result.limit;
  } catch {
    ElMessage.error('加载问题列表失败');
  } finally {
    loading.value = false;
  }
}

function severityType(severity: string) {
  if (severity === 'high') return 'danger';
  if (severity === 'medium') return 'warning';
  return 'info';
}

function severityText(severity: string) {
  if (severity === 'high') return '高';
  if (severity === 'medium') return '中';
  return '低';
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('zh-CN');
}

function openAction(actionRoute: string) {
  router.push(actionRoute);
}

function handlePageChange(nextPage: number) {
  page.value = nextPage;
  fetchIssues();
}

watch(issueType, () => {
  page.value = 1;
  fetchIssues();
});

onMounted(fetchIssues);
</script>

<style scoped>
.document-control-issue-list {
  padding: 16px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.total {
  margin-left: 8px;
  color: #909399;
  font-size: 13px;
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
```

- [ ] **Step 4: Add the router entry**

In `client/src/router/index.ts`, add this route immediately after `documents/control/workbench`:

```ts
      {
        path: 'documents/control/workbench/issues',
        name: 'DocumentControlIssueList',
        component: () => import('@/views/documents/DocumentControlIssueList.vue'),
        meta: { title: '文控问题明细' },
      },
```

- [ ] **Step 5: Run issue list tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentControlIssueList.spec.ts --run
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/views/documents/DocumentControlIssueList.vue client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts client/src/router/index.ts
git commit -m "feat: add document workbench issue list page"
```

## Task 7: Full Verification

**Files:**
- All files touched in Tasks 1-6.

- [ ] **Step 1: Run backend workbench tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- document-control-workbench.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run frontend workbench tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- DocumentControlWorkbench.spec.ts DocumentControlIssueList.spec.ts --run
```

Expected: PASS.

- [ ] **Step 3: Run route and whitespace checks**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git diff --check
```

Expected:

- `git diff --check` prints no output.

- [ ] **Step 4: Manual smoke test**

Start the app if it is not already running:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run start:dev
```

In another terminal:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run dev -- --host 0.0.0.0
```

Open:

```text
http://localhost:5173/documents/control/workbench
```

Manual expectations:

- Each card is clickable.
- Clicking a card opens `/documents/control/workbench/issues?type=<issueType>`.
- The issue list shows rows or a clear empty state.
- Clicking an issue action opens the mapped repair page.
- Refresh reloads the current issue queue.

- [ ] **Step 5: Commit verification-only test updates if any**

If Task 7 required small test-only fixes, commit them:

```bash
git add server/src/modules/document/services/document-control-workbench.service.spec.ts client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts
git commit -m "test: verify actionable document workbench"
```

If no files changed, skip this commit.

## Self-Review

- Spec coverage:
  - Workbench issue counts remain available through `GET /documents/control/workbench`.
  - Every issue type gets a detail list through `GET /documents/control/workbench/issues`.
  - Every issue row has `actionRoute` and `actionLabel`.
  - Workbench cards route to detail queues instead of directly scattering to repair pages.
  - The issue list routes users to existing repair surfaces instead of duplicating edit forms.
- Placeholder scan:
  - This plan has no open placeholders.
  - All commands include expected outcomes.
  - All changed files have explicit paths.
- Type consistency:
  - Backend `WorkbenchIssueType` matches frontend `WorkbenchIssueType`.
  - Backend response `WorkbenchIssueListResponse` matches frontend response.
  - Workbench card keys match `WORKBENCH_ISSUE_TYPES`.

## Handoff

Implement this plan in a dedicated worktree, for example:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git fetch origin
git worktree add /Users/jiashenglin/Desktop/好玩的项目/noidear-document-governance-phase3-workbench -b codex/document-governance-phase3-workbench origin/master
```

Then execute tasks in order. Do not start Phase 4 until Phase 3 has been implemented, reviewed, merged, and the worktree is cleaned.
