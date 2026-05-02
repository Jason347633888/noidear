# GAP-410 Audit Finding to CAPA Linkage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the CAPA/internal-audit model during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Automatically create an idempotent CAPA record when an internal audit non-conformance is verified.

**Architecture:** Keep `AuditFinding` as the internal audit fact source and `CorrectiveAction` as the CAPA fact source. On the `verifyRectification()` success path, detect verified non-conforming findings and create a CAPA with `trigger_type='internal_audit'` and `trigger_id=AuditFinding.id`, skipping creation when the CAPA already exists. CAPA creation, `AuditFinding.status='verified'`, and `audit_rectification` Todo completion must run in one Prisma transaction so missing `companyId` or CAPA creation failures cannot leave a verified finding without CAPA.

**Tech Stack:** NestJS, Prisma Client, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-410 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 `CorrectiveAction` 是 CAPA 事实源，`AuditFinding` 是内审发现事实源；本 GAP 复用 `trigger_type + trigger_id`，不得新增 `AuditFinding.correctiveActionId` 或任何平行 CAPA 字段。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`、GAP-316 spec 或 GAP-410 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 本计划不迁移历史 `verified` 内审发现项。若发现历史数据需要补 CAPA，不得自动补录；记录样例并回报主 agent。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/modules/internal-audit/verification/verification.service.spec.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.service.ts`
- Modify: `server/src/modules/internal-audit/verification/verification.service.ts`
- Modify: `server/src/modules/internal-audit/verification/verification.controller.ts`
- Modify: `server/src/modules/internal-audit/verification/verification.module.ts`
- Do not modify: `server/src/prisma/schema.prisma`
- Do not add: `server/src/prisma/migrations/**`
- Do not modify: `client/src/views/**`
- Do not modify: `docs/module-usage/**`

## Task 1: Add VerificationService coverage

**Files:**
- Modify: `server/src/modules/internal-audit/verification/verification.service.spec.ts`

- [ ] **Step 1: Inspect the current test setup**

Run:

```bash
sed -n '1,280p' server/src/modules/internal-audit/verification/verification.service.spec.ts
```

Expected: the file defines a Prisma mock, an `OperationLogService` mock, creates `VerificationService`, and already covers successful verify/reject paths.

- [ ] **Step 2: Add CAPA and transaction mock dependencies**

In `verification.service.spec.ts`, keep the existing Nest `Test.createTestingModule({ providers: [...] })` setup. Extend `mockPrismaService` with a `$transaction` callback mock and `correctiveAction.findFirst`:

```ts
    mockPrismaService = {
      $transaction: jest.fn(async (callback) => callback(mockPrismaService)),
      auditFinding: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      todoTask: {
        updateMany: jest.fn(),
      },
      correctiveAction: {
        findFirst: jest.fn(),
      },
    };
```

Add a `correctiveActionService` mock near the existing service mocks:

```ts
const correctiveActionService = {
  create: jest.fn(),
};
```

Register `CorrectiveActionService` in the TestingModule providers. Do not instantiate `VerificationService` with `new VerificationService(...)`; this spec currently uses Nest dependency injection.

```ts
import { CorrectiveActionService } from '../../corrective-action/corrective-action.service';

const module: TestingModule = await Test.createTestingModule({
  providers: [
    VerificationService,
    { provide: PrismaService, useValue: mockPrismaService },
    { provide: OperationLogService, useValue: mockOperationLogService },
    { provide: CorrectiveActionService, useValue: correctiveActionService },
  ],
}).compile();
```

The current test file does not provide `ApprovalEngineService`; keep that unchanged unless the implementation branch already added it before this plan is executed.

- [ ] **Step 3: Update the existing happy path to cover compliant findings and the new companyId argument**

In the existing `it('should verify rectification successfully', ...)` test, make the finding compliant so the original status/Todo behavior remains covered without forcing CAPA creation in that test:

```ts
const compliantFinding = { ...mockFinding, auditResult: '符合' };
const updatedFinding = { ...compliantFinding, status: 'verified' };
mockPrismaService.auditFinding.findUnique.mockResolvedValue(compliantFinding);
mockPrismaService.auditFinding.update.mockResolvedValue(updatedFinding);
mockPrismaService.todoTask.updateMany.mockResolvedValue({ count: 1 });

const result = await service.verifyRectification(
  'finding-1',
  verifyDto,
  'auditor-1',
  'company-1',
);
```

Add these assertions at the end of that same test:

```ts
expect(mockPrismaService.correctiveAction.findFirst).not.toHaveBeenCalled();
expect(correctiveActionService.create).not.toHaveBeenCalled();
```

Update every existing `verifyRectification(...)` call in `verification.service.spec.ts` to pass the fourth `companyId` argument:

```ts
service.verifyRectification('finding-1', verifyDto, 'auditor-1', 'company-1')
```

- [ ] **Step 4: Add a non-conformance CAPA creation test**

Add this test inside `describe('verifyRectification', () => {` after the existing successful verification test:

```ts
it('creates CAPA for verified non-conforming audit finding', async () => {
  mockPrismaService.auditFinding.findUnique.mockResolvedValue({
    ...mockFinding,
    auditResult: '不符合',
    issueType: '需要修改',
    description: '受控文件培训记录缺少签字确认',
    assigneeId: 'assignee-1',
    dueDate: new Date('2026-05-31T00:00:00.000Z'),
    document: { id: 'doc-1', title: '培训记录控制程序', number: 'DOC-001' },
    plan: { auditorId: 'auditor-1' },
  });
  mockPrismaService.auditFinding.update.mockResolvedValue({ ...mockFinding, status: 'verified' });
  mockPrismaService.correctiveAction.findFirst.mockResolvedValue(null);
  correctiveActionService.create.mockResolvedValue({ id: 'capa-1' });

  await service.verifyRectification(
    'finding-1',
    verifyDto,
    'auditor-1',
    'company-1',
  );

  expect(mockPrismaService.correctiveAction.findFirst).toHaveBeenCalledWith({
    where: {
      company_id: 'company-1',
      trigger_type: 'internal_audit',
      trigger_id: 'finding-1',
    },
    select: { id: true },
  });
  expect(correctiveActionService.create).toHaveBeenCalledWith(
    expect.objectContaining({
      trigger_type: 'internal_audit',
      trigger_id: 'finding-1',
      description: expect.stringContaining('受控文件培训记录缺少签字确认'),
      responsible_id: 'assignee-1',
      due_date: '2026-05-31',
    }),
    'auditor-1',
    'company-1',
    mockPrismaService,
  );
});
```

- [ ] **Step 5: Add idempotency coverage**

Add this test after the CAPA creation test:

```ts
it('does not create duplicate CAPA when one already exists for the finding', async () => {
  mockPrismaService.auditFinding.findUnique.mockResolvedValue({
    ...mockFinding,
    auditResult: '不符合',
    description: '内审发现项已有关联 CAPA',
    document: { id: 'doc-1', title: '内审文件', number: 'DOC-002' },
    plan: { auditorId: 'auditor-1' },
  });
  mockPrismaService.auditFinding.update.mockResolvedValue({ ...mockFinding, status: 'verified' });
  mockPrismaService.correctiveAction.findFirst.mockResolvedValue({ id: 'existing-capa' });

  await service.verifyRectification(
    'finding-1',
    verifyDto,
    'auditor-1',
    'company-1',
  );

  expect(correctiveActionService.create).not.toHaveBeenCalled();
});
```

- [ ] **Step 6: Add skip, company guard, and CAPA failure atomicity coverage**

Add these tests after the idempotency test:

```ts
it('does not create CAPA for compliant audit finding', async () => {
  mockPrismaService.auditFinding.findUnique.mockResolvedValue({
    ...mockFinding,
    auditResult: '符合',
    document: { id: 'doc-1', title: '内审文件', number: 'DOC-003' },
    plan: { auditorId: 'auditor-1' },
  });
  mockPrismaService.auditFinding.update.mockResolvedValue({ ...mockFinding, status: 'verified' });

  await service.verifyRectification(
    'finding-1',
    verifyDto,
    'auditor-1',
    'company-1',
  );

  expect(mockPrismaService.correctiveAction.findFirst).not.toHaveBeenCalled();
  expect(correctiveActionService.create).not.toHaveBeenCalled();
});

it('requires companyId before creating audit-triggered CAPA', async () => {
  mockPrismaService.auditFinding.findUnique.mockResolvedValue({
    ...mockFinding,
    auditResult: '不符合',
    description: '缺少内审整改证据复核记录',
    document: { id: 'doc-1', title: '内审文件', number: 'DOC-004' },
    plan: { auditorId: 'auditor-1' },
  });

  await expect(
    service.verifyRectification('finding-1', verifyDto, 'auditor-1', undefined as any),
  ).rejects.toThrow('Missing companyId for audit CAPA creation');

  expect(mockPrismaService.auditFinding.update).not.toHaveBeenCalled();
  expect(mockPrismaService.todoTask.updateMany).not.toHaveBeenCalled();
  expect(mockPrismaService.correctiveAction.findFirst).not.toHaveBeenCalled();
  expect(correctiveActionService.create).not.toHaveBeenCalled();
});

it('does not mark finding verified or complete todo when CAPA creation fails', async () => {
  mockPrismaService.auditFinding.findUnique.mockResolvedValue({
    ...mockFinding,
    auditResult: '不符合',
    description: 'CAPA 创建失败时不能完成内审验证',
    document: { id: 'doc-1', title: '内审文件', number: 'DOC-005' },
    plan: { auditorId: 'auditor-1' },
  });
  mockPrismaService.correctiveAction.findFirst.mockResolvedValue(null);
  correctiveActionService.create.mockRejectedValue(new BadRequestException('内审发现项不存在'));

  await expect(
    service.verifyRectification('finding-1', verifyDto, 'auditor-1', 'company-1'),
  ).rejects.toThrow('内审发现项不存在');

  expect(mockPrismaService.auditFinding.update).not.toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ status: 'verified' }),
    }),
  );
  expect(mockPrismaService.todoTask.updateMany).not.toHaveBeenCalled();
});
```

- [ ] **Step 7: Run the focused test and confirm it fails**

Run:

```bash
cd server && npm test -- verification.service.spec.ts --runInBand
```

Expected: FAIL because `VerificationService` does not yet accept `companyId` or create CAPA.

## Task 2: Allow CAPA creation inside caller transaction

**Files:**
- Modify: `server/src/modules/corrective-action/corrective-action.service.ts`

- [ ] **Step 1: Import Prisma types**

At the top of `corrective-action.service.ts`, add `Prisma` to the existing imports if it is not already imported:

```ts
import { Prisma } from '@prisma/client';
```

- [ ] **Step 2: Add an optional transaction client to create()**

Change the `create()` signature from:

```ts
  async create(dto: CreateCapaDto, userId: string, companyId: string) {
```

to:

```ts
  async create(
    dto: CreateCapaDto,
    userId: string,
    companyId: string,
    tx?: Prisma.TransactionClient,
  ) {
```

Replace the body with:

```ts
    const client = tx ?? this.prisma;
    await this.validateTriggerSource(dto, companyId, client);

    const capa_no = await this.numberSequence.generateCorrectiveActionNo(
      companyId,
      new Date(),
      tx,
    );
    return client.correctiveAction.create({
      data: { ...dto, company_id: companyId, capa_no },
    });
```

- [ ] **Step 3: Make trigger validation use the same client**

Change the helper signature from:

```ts
  private async validateTriggerSource(dto: CreateCapaDto, companyId: string) {
```

to:

```ts
  private async validateTriggerSource(
    dto: CreateCapaDto,
    companyId: string,
    client: PrismaService | Prisma.TransactionClient,
  ) {
```

Inside `validateTriggerSource()`, replace only these Prisma calls:

```ts
this.prisma.nonConformance.findFirst
this.prisma.customerComplaint.findFirst
this.prisma.auditFinding.findUnique
```

with:

```ts
client.nonConformance.findFirst
client.customerComplaint.findFirst
client.auditFinding.findUnique
```

Do not change the validation messages or supported trigger types.

- [ ] **Step 4: Run CAPA service tests**

Run:

```bash
cd server && npm test -- corrective-action.service.spec.ts --runInBand
```

Expected: PASS. The existing tests still call `create(dto, userId, companyId)` without a transaction client, and the optional fourth argument must not change that behavior.

## Task 3: Implement CAPA creation on verification

**Files:**
- Modify: `server/src/modules/internal-audit/verification/verification.service.ts`

- [ ] **Step 1: Import CorrectiveActionService**

At the top of `verification.service.ts`, add:

```ts
import { CorrectiveActionService } from '../../corrective-action/corrective-action.service';
```

- [ ] **Step 2: Inject CorrectiveActionService before the optional approval engine**

Replace the constructor with:

```ts
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLogService: OperationLogService,
    private readonly correctiveActionService: CorrectiveActionService,
    @Optional() private readonly approvalEngine?: ApprovalEngineService,
  ) {}
```

- [ ] **Step 3: Add companyId to verifyRectification**

Change the method signature from:

```ts
  async verifyRectification(
    findingId: string,
    dto: VerifyRectificationDto,
    userId: string,
  ) {
```

to:

```ts
  async verifyRectification(
    findingId: string,
    dto: VerifyRectificationDto,
    userId: string,
    companyId: string,
  ) {
```

- [ ] **Step 4: Include document details in the finding lookup**

Replace the `include` block in the `auditFinding.findUnique()` call with:

```ts
      include: {
        plan: { select: { auditorId: true } },
        document: { select: { id: true, title: true, number: true } },
      },
```

- [ ] **Step 5: Wrap CAPA creation, finding verification, and Todo completion in one transaction**

Replace the current `updatedFinding` assignment and following `todoTask.updateMany()` block with:

```ts
    const updatedFinding = await this.prisma.$transaction(async (tx) => {
      await this.createCapaForVerifiedFinding(finding, userId, companyId, tx);

      const verifiedFinding = await tx.auditFinding.update({
        where: { id: findingId },
        data: {
          status: 'verified',
          verifiedBy: userId,
          verifiedAt: new Date(),
        },
      });

      await tx.todoTask.updateMany({
        where: {
          type: 'audit_rectification',
          relatedId: findingId,
        },
        data: {
          status: 'completed',
        },
      });

      return verifiedFinding;
    });
```

This transaction is the required no-partial-write boundary. If `companyId` is missing or CAPA creation fails, neither `AuditFinding.status='verified'` nor `audit_rectification` Todo completion may be committed.

- [ ] **Step 6: Add the private CAPA helper**

Add this method inside `VerificationService`, before `rejectRectification()`:

```ts
  private async createCapaForVerifiedFinding(
    finding: any,
    userId: string,
    companyId: string,
    tx: Prisma.TransactionClient,
  ) {
    if (finding.auditResult !== '不符合') {
      return;
    }

    if (!companyId) {
      throw new BadRequestException('Missing companyId for audit CAPA creation');
    }

    const existing = await tx.correctiveAction.findFirst({
      where: {
        company_id: companyId,
        trigger_type: 'internal_audit',
        trigger_id: finding.id,
      },
      select: { id: true },
    });

    if (existing) {
      return;
    }

    const documentLabel = [finding.document?.number, finding.document?.title]
      .filter(Boolean)
      .join(' ');
    const descriptionParts = [
      '内审不符合项CAPA',
      finding.issueType ? `问题类型：${finding.issueType}` : undefined,
      documentLabel ? `文件：${documentLabel}` : undefined,
      finding.description ? `描述：${finding.description}` : undefined,
    ].filter(Boolean);

    await this.correctiveActionService.create(
      {
        trigger_type: 'internal_audit',
        trigger_id: finding.id,
        description: descriptionParts.join('；'),
        responsible_id: finding.assigneeId ?? undefined,
        due_date: finding.dueDate
          ? finding.dueDate.toISOString().slice(0, 10)
          : undefined,
      },
      userId,
      companyId,
      tx,
    );
  }
```

Also add this import near the top of `verification.service.ts`:

```ts
import { Prisma } from '@prisma/client';
```

- [ ] **Step 7: Keep reject behavior unchanged**

Run:

```bash
git diff -- server/src/modules/internal-audit/verification/verification.service.ts
```

Expected: only `verifyRectification()` and the new private helper changed; `rejectRectification()` status behavior remains `rectifying`, and the `AuditFinding` status update plus Todo completion are inside the same `$transaction` callback as CAPA creation.

## Task 4: Pass companyId from the controller

**Files:**
- Modify: `server/src/modules/internal-audit/verification/verification.controller.ts`

- [ ] **Step 1: Add companyId to the local authenticated request type**

Change the `AuthenticatedRequest` interface to include `companyId`:

```ts
  user: {
    userId: string;
    username: string;
    role: string;
    companyId: string;
  };
```

- [ ] **Step 2: Pass companyId into verifyRectification**

Change the service call in `verifyRectification()` from:

```ts
    const result = await this.verificationService.verifyRectification(
      id,
      verifyDto,
      req.user.userId,
    );
```

to:

```ts
    const result = await this.verificationService.verifyRectification(
      id,
      verifyDto,
      req.user.userId,
      req.user.companyId,
    );
```

- [ ] **Step 3: Confirm no response contract change**

Run:

```bash
git diff -- server/src/modules/internal-audit/verification/verification.controller.ts
```

Expected: only request typing and the added `companyId` argument changed.

## Task 5: Wire module dependency

**Files:**
- Modify: `server/src/modules/internal-audit/verification/verification.module.ts`

- [ ] **Step 1: Import CorrectiveActionModule**

Add:

```ts
import { CorrectiveActionModule } from '../../corrective-action/corrective-action.module';
```

- [ ] **Step 2: Add the module to imports**

Add `CorrectiveActionModule` to the `imports` array:

```ts
    CorrectiveActionModule,
```

Place it after `UnifiedApprovalModule` to keep infrastructure imports grouped before business module imports.

- [ ] **Step 3: Confirm no circular import**

Run:

```bash
rg -n "VerificationModule|CorrectiveActionModule" server/src/modules/internal-audit/verification/verification.module.ts server/src/modules/corrective-action/corrective-action.module.ts
```

Expected: `VerificationModule` imports `CorrectiveActionModule`; `CorrectiveActionModule` does not import `VerificationModule`.

## Task 6: Verify focused behavior and build

**Files:**
- No source edits unless tests or build reveal a mismatch with this plan.

- [ ] **Step 1: Run focused verification tests**

Run:

```bash
cd server && npm test -- verification.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Re-run CAPA service tests**

Run:

```bash
cd server && npm test -- corrective-action.service.spec.ts --runInBand
```

Expected: PASS. If this fails because GAP-316 has not been implemented on the branch, stop and report that GAP-410 depends on GAP-316 being executed first.

- [ ] **Step 3: Build server**

Run:

```bash
npm run build:server
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Run document consistency check if docs changed during execution**

Run only if the executing agent updates docs:

```bash
node tools/check-module-usage-docs.mjs
```

Expected: PASS.

- [ ] **Step 5: Inspect final diff scope**

Run:

```bash
git status --short
git diff --stat
```

Expected: only the five files listed in this plan changed unless a test-driven mismatch required a reported stop.

## Task 7: Commit

**Files:**
- Commit only files changed by this plan.

- [ ] **Step 1: Stage intended files explicitly**

Run:

```bash
git add \
  server/src/modules/internal-audit/verification/verification.service.spec.ts \
  server/src/modules/corrective-action/corrective-action.service.ts \
  server/src/modules/internal-audit/verification/verification.service.ts \
  server/src/modules/internal-audit/verification/verification.controller.ts \
  server/src/modules/internal-audit/verification/verification.module.ts
```

Expected: only these implementation files are staged.

- [ ] **Step 2: Commit**

Run:

```bash
git commit -m "feat: link verified audit findings to CAPA"
```

Expected: commit succeeds.
