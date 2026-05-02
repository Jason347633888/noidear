# GAP-410 Audit Finding to CAPA Linkage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the CAPA/internal-audit model during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Automatically create an idempotent CAPA record when an internal audit non-conformance is verified.

**Architecture:** Keep `AuditFinding` as the internal audit fact source and `CorrectiveAction` as the CAPA fact source. On the `verifyRectification()` success path, detect verified non-conforming findings and create a CAPA with `trigger_type='internal_audit'` and `trigger_id=AuditFinding.id`, skipping creation when the CAPA already exists.

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

- [ ] **Step 2: Add CAPA mock dependencies**

In `verification.service.spec.ts`, extend the local Prisma mock with `correctiveAction.findFirst` if it is missing:

```ts
correctiveAction: {
  findFirst: jest.fn(),
},
```

Add a `correctiveActionService` mock near the existing service mocks:

```ts
const correctiveActionService = {
  create: jest.fn(),
};
```

Construct `VerificationService` with the new dependency:

```ts
service = new VerificationService(
  prisma as any,
  operationLogService as any,
  correctiveActionService as any,
  approvalEngine as any,
);
```

If the current constructor does not include `approvalEngine` in the test, keep the existing optional approval argument position and insert `correctiveActionService` before it, matching the implementation in Task 2.

- [ ] **Step 3: Add a non-conformance CAPA creation test**

Add this test inside `describe('verifyRectification', () => {` after the existing successful verification test:

```ts
it('creates CAPA for verified non-conforming audit finding', async () => {
  prisma.auditFinding.findUnique.mockResolvedValue({
    ...mockFinding,
    auditResult: '不符合',
    issueType: '需要修改',
    description: '受控文件培训记录缺少签字确认',
    assigneeId: 'assignee-1',
    dueDate: new Date('2026-05-31T00:00:00.000Z'),
    document: { id: 'doc-1', title: '培训记录控制程序', number: 'DOC-001' },
    plan: { auditorId: 'auditor-1' },
  });
  prisma.auditFinding.update.mockResolvedValue({ ...mockFinding, status: 'verified' });
  prisma.correctiveAction.findFirst.mockResolvedValue(null);
  correctiveActionService.create.mockResolvedValue({ id: 'capa-1' });

  await service.verifyRectification(
    'finding-1',
    verifyDto,
    'auditor-1',
    'company-1',
  );

  expect(prisma.correctiveAction.findFirst).toHaveBeenCalledWith({
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
  );
});
```

- [ ] **Step 4: Add idempotency coverage**

Add this test after the CAPA creation test:

```ts
it('does not create duplicate CAPA when one already exists for the finding', async () => {
  prisma.auditFinding.findUnique.mockResolvedValue({
    ...mockFinding,
    auditResult: '不符合',
    description: '内审发现项已有关联 CAPA',
    document: { id: 'doc-1', title: '内审文件', number: 'DOC-002' },
    plan: { auditorId: 'auditor-1' },
  });
  prisma.auditFinding.update.mockResolvedValue({ ...mockFinding, status: 'verified' });
  prisma.correctiveAction.findFirst.mockResolvedValue({ id: 'existing-capa' });

  await service.verifyRectification(
    'finding-1',
    verifyDto,
    'auditor-1',
    'company-1',
  );

  expect(correctiveActionService.create).not.toHaveBeenCalled();
});
```

- [ ] **Step 5: Add skip and company guard coverage**

Add these tests after the idempotency test:

```ts
it('does not create CAPA for compliant audit finding', async () => {
  prisma.auditFinding.findUnique.mockResolvedValue({
    ...mockFinding,
    auditResult: '符合',
    document: { id: 'doc-1', title: '内审文件', number: 'DOC-003' },
    plan: { auditorId: 'auditor-1' },
  });
  prisma.auditFinding.update.mockResolvedValue({ ...mockFinding, status: 'verified' });

  await service.verifyRectification(
    'finding-1',
    verifyDto,
    'auditor-1',
    'company-1',
  );

  expect(prisma.correctiveAction.findFirst).not.toHaveBeenCalled();
  expect(correctiveActionService.create).not.toHaveBeenCalled();
});

it('requires companyId before creating audit-triggered CAPA', async () => {
  prisma.auditFinding.findUnique.mockResolvedValue({
    ...mockFinding,
    auditResult: '不符合',
    description: '缺少内审整改证据复核记录',
    document: { id: 'doc-1', title: '内审文件', number: 'DOC-004' },
    plan: { auditorId: 'auditor-1' },
  });
  prisma.auditFinding.update.mockResolvedValue({ ...mockFinding, status: 'verified' });

  await expect(
    service.verifyRectification('finding-1', verifyDto, 'auditor-1', undefined as any),
  ).rejects.toThrow('Missing companyId for audit CAPA creation');

  expect(correctiveActionService.create).not.toHaveBeenCalled();
});
```

- [ ] **Step 6: Run the focused test and confirm it fails**

Run:

```bash
cd server && npm test -- verification.service.spec.ts --runInBand
```

Expected: FAIL because `VerificationService` does not yet accept `companyId` or create CAPA.

## Task 2: Implement CAPA creation on verification

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

- [ ] **Step 5: Create CAPA after the finding is marked verified**

Immediately after the `updatedFinding` assignment and before updating `TodoTask`, insert:

```ts
    await this.createCapaForVerifiedFinding(finding, userId, companyId);
```

- [ ] **Step 6: Add the private CAPA helper**

Add this method inside `VerificationService`, before `rejectRectification()`:

```ts
  private async createCapaForVerifiedFinding(
    finding: any,
    userId: string,
    companyId: string,
  ) {
    if (finding.auditResult !== '不符合') {
      return;
    }

    if (!companyId) {
      throw new BadRequestException('Missing companyId for audit CAPA creation');
    }

    const existing = await this.prisma.correctiveAction.findFirst({
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
    );
  }
```

- [ ] **Step 7: Keep reject behavior unchanged**

Run:

```bash
git diff -- server/src/modules/internal-audit/verification/verification.service.ts
```

Expected: only `verifyRectification()` and the new private helper changed; `rejectRectification()` status behavior remains `rectifying`.

## Task 3: Pass companyId from the controller

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

## Task 4: Wire module dependency

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

## Task 5: Verify focused behavior and build

**Files:**
- No source edits unless tests or build reveal a mismatch with this plan.

- [ ] **Step 1: Run focused verification tests**

Run:

```bash
cd server && npm test -- verification.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run CAPA service tests**

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

Expected: only the four files listed in this plan changed unless a test-driven mismatch required a reported stop.

## Task 6: Commit

**Files:**
- Commit only files changed by this plan.

- [ ] **Step 1: Stage intended files explicitly**

Run:

```bash
git add \
  server/src/modules/internal-audit/verification/verification.service.spec.ts \
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
