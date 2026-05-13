# Post API Cleanup Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the post API-cleanup hardening pass by removing remaining independent approval routes, fixing deleted-scope residue, restoring Todo/front-end/test gates, and classifying high-risk dependencies.

**Architecture:** Treat `ApprovalDefinition` / `ApprovalInstance` / `ApprovalTask` / `ApprovalAction` as the only approval write path. Business modules submit to unified approval and receive callbacks; Todo remains a projection; system-map plus `rg` gates prevent deleted product surfaces and broken front-end/back-end contracts from returning.

**Tech Stack:** NestJS, Prisma, PostgreSQL migrations, Jest, Vue 3, Vite, Vitest, Playwright, Python system-map script, Node 20/npm 10.

---

## Execution Rules

- Implement in an isolated worktree or Multica workspace, not the root checkout.
- Use Node 20 explicitly for dependency, build, and test commands.
- Read `docs/AGENT_GUIDE.md`, `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`, `docs/superpowers/specs/2026-05-13-api-contract-gap-repair-design.md`, and `docs/superpowers/specs/2026-05-13-post-api-cleanup-hardening-design.md` before editing.
- If `tools/generate-system-map.py` is missing in the execution worktree, stop and sync the first cleanup implementation before continuing.
- Before editing a function, class, or method, run GitNexus impact analysis for that symbol and record the blast radius in the task notes.
- Use explicit GitNexus tool calls for code-symbol edits, for example `mcp__gitnexus__impact({ "target": "ApprovalEngineService", "direction": "upstream", "repo": "noidear" })`. If GitNexus reports a stale index, run `npx gitnexus analyze` before continuing. Before the final commit, run `mcp__gitnexus__detect_changes({ "scope": "all", "repo": "noidear" })`.
- Keep commits small: one task or one tightly coupled task group per commit.
- Do not restore deleted product surfaces to make tests pass.
- Do not commit login state, Playwright reports, build output, or local agent configuration.
- If a command in this plan reveals code facts that contradict the spec, stop and report the contradiction instead of silently changing the business boundary.
- If `npx -y -p node@20 -p npm@10 ...` repeatedly fails because the registry is unavailable, switch the shell to Node 20 with `nvm use 20` or `asdf shell nodejs 20`, then run the same `npm` commands directly. Do not continue under Node 25.

Worktree setup:

```bash
git fetch origin master
git worktree add /Users/jiashenglin/Desktop/project/noidear-post-api-hardening -b codex/post-api-hardening origin/master
cd /Users/jiashenglin/Desktop/project/noidear-post-api-hardening
git branch --show-current
```

Expected branch output:

```text
codex/post-api-hardening
```

This path is illustrative. For portability, validate the checkout by branch and repository basename rather than the absolute `/Users/...` prefix:

```bash
basename "$(git rev-parse --show-toplevel)"
git branch --show-current
```

Expected:

```text
noidear-post-api-hardening
codex/post-api-hardening
```

If execution is already inside a Multica isolated workspace, do not create another worktree. Instead run:

```bash
pwd
git branch --show-current
git status --short
```

Expected: path is a Multica/workspace path, not the root checkout, and branch is the execution branch.

Required Node wrapper for verification commands:

```bash
npx -y -p node@20 -p npm@10 npm --version
```

Expected: npm 10.x.

## Abort and Rollback Rules

- If a Prisma migration fails after editing `schema.prisma`, stop before further edits and restore the migration attempt with `git checkout HEAD -- server/src/prisma/schema.prisma server/src/prisma/migrations`.
- If `npm audit fix` introduces build or test regressions, revert only dependency files with `git checkout HEAD -- package.json package-lock.json server/package.json client/package.json tools/noidear-mcp/package.json`, then rerun `npx -y -p node@20 -p npm@10 npm ci`.
- If a task crosses a business boundary not covered by the spec, stop and report the missing decision instead of folding it into the implementation.
- After any abort, run `git status -sb` and list remaining modified files before handing back.

---

## File Structure

### Approval Infrastructure

- Modify `server/src/modules/unified-approval/dto/approval-task-action.dto.ts`: add controlled `metadata` to approve/reject action payloads.
- Modify `server/src/modules/unified-approval/types.ts`: add metadata to callback context and action input types.
- Modify `server/src/modules/unified-approval/approval-engine.service.ts`: persist metadata in `ApprovalAction.snapshot.businessDecision`, pass it to callbacks, and keep `act()` compatible.
- Create `server/src/modules/unified-approval/approval-action-metadata.validator.ts`: central validator for `resourceType + triggerKey + stepKey + action`.
- Modify `server/src/modules/unified-approval/unified-approval.module.ts`: register/export the metadata validator.
- Modify `server/src/modules/unified-approval/approval-task.controller.ts`: pass `metadata` to `ApprovalEngineService`.
- Modify `server/src/modules/unified-approval/approval-engine.service.spec.ts`: assert metadata persistence and callback propagation.
- Create `server/src/modules/unified-approval/approval-callback-coverage.spec.ts`: seed callback key coverage test.

### Business Approval Route Removal

- Modify `server/src/modules/deviation/deviation.controller.ts`, `deviation.service.ts`, `deviation.module.ts`.
- Modify `server/src/modules/equipment/record.controller.ts`, `record.service.ts`, `equipment.module.ts`.
- Modify `server/src/modules/task/task.controller.ts`, `task.service.ts`, `task.module.ts`, and `dto/approve-task.dto.ts`.
- Modify `server/src/modules/warehouse/requisition.controller.ts`, `requisition.service.ts`, `inbound.controller.ts`, `inbound.service.ts`, `controllers/return.controller.ts`, `controllers/scrap.controller.ts`, `services/return.service.ts`, `services/scrap.service.ts`, `warehouse.module.ts`.
- Modify `server/src/modules/product-recall/product-recall.controller.ts`, `product-recall.service.ts`.
- Modify `server/src/modules/product-recall/product-recall.module.ts`: register product recall approval callbacks and inject `ApprovalEngineService`.
- Modify `server/src/modules/training/training.controller.ts`, `training.service.ts`.
- Modify `server/src/modules/change-event/change-event.controller.ts`, `change-event.service.ts`, `change-event.module.ts`, `change-event.module.spec.ts`, `change-event.service.spec.ts`.
- Modify `server/src/prisma/seed.ts` and `server/src/prisma/seed-e2e.ts`.
- Modify front-end adapters that currently call business approval routes: `client/src/api/deviation.ts`, `client/src/api/equipment.ts`, `client/src/api/product-recall.ts`, `client/src/api/task.ts`, `client/src/api/warehouse.ts`.
- Modify active views that use those adapters, starting with `client/src/views/deviation/DeviationReportView.vue`.

### Todo and Schema

- Modify `server/src/prisma/schema.prisma`: remove `TodoType.audit_rectification`.
- Create Prisma migration `server/src/prisma/migrations/<timestamp>_post_api_cleanup_hardening/migration.sql`.
- Modify `server/src/modules/todo/todo.service.ts`, `server/src/modules/todo/dto/query-todo.dto.ts`, `server/src/modules/todo/todo.service.spec.ts`.
- Modify `server/src/modules/document/services/document-expiry.service.ts` and `document-expiry.service.spec.ts`.
- Modify `client/src/types/todo.ts`, `client/src/utils/todoPresentation.ts`, `client/src/views/my-todos/MyTodos.vue`, `client/src/views/my-todos/__tests__/MyTodos.spec.ts`, and any Todo table/dashboard assertions.

### Deleted Runtime Residue and Audit Dashboard

- Modify `server/src/modules/audit/audit.controller.ts`, `audit.service.ts`, `audit.service.spec.ts`.
- Modify `client/src/api/audit.ts`.
- Modify or delete audit dashboard assertions in `server/test/audit.e2e-spec.ts`.
- Delete or update default tests for workflow, monitoring/alert, SSO, and deleted user-side pages.

### Front-End Request Prefix Gate

- Modify `client/src/views/training/archives/ArchiveList.vue`.
- Create `tools/check-client-api-prefix.sh`: fail if `request.*('/api/v1/...')` appears under `client/src`.
- Modify `package.json`: add `lint:api-prefix` and include it in `verify:full`.

### Tests and Dependency Audit

- Modify server tests listed in the hardening spec.
- Modify client tests listed in the hardening spec.
- Do not mix dependency audit changes with approval/Todo/schema commits.
- If `npm audit` still reports high vulnerabilities after safe fixes, create `docs/superpowers/specs/2026-05-13-post-api-cleanup-audit-risk-register.md`.

---

## Task 1: Preflight and Contract Snapshot

**Files:**
- Read: `docs/AGENT_GUIDE.md`
- Read: `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- Read: `docs/superpowers/specs/2026-05-13-api-contract-gap-repair-design.md`
- Read: `docs/superpowers/specs/2026-05-13-post-api-cleanup-hardening-design.md`
- No code changes.

- [ ] **Step 1: Confirm isolated worktree**

Run:

```bash
pwd
basename "$(git rev-parse --show-toplevel)"
git branch --show-current
git status --short
```

Expected:

```text
noidear-post-api-hardening
codex/post-api-hardening
```

The `pwd` value may be a Multica path or a local worktree path. It must not be the root checkout `/Users/jiashenglin/Desktop/project/noidear`. `git status --short` should be empty before implementation. If it is not empty, record the files and do not overwrite unrelated work.

- [ ] **Step 2: Install with Node 20**

Run:

```bash
npx -y -p node@20 -p npm@10 npm ci
```

Expected: command exits 0. If `bcrypt` or native modules fail under Node 25, rerun only with the Node 20 wrapper above.

- [ ] **Step 3: Verify system-map prerequisite**

Run:

```bash
test -f tools/generate-system-map.py
python3 tools/generate-system-map.py
```

Expected output contains:

```text
api_adapter_missing: 0
direct_client_missing: 0
deleted_scope_frontend_residue: 0
deleted_scope_backend_residue: 0
```

If the script is missing or the four counters are not 0 on a clean branch that already includes the first cleanup implementation, stop and report the prerequisite mismatch.

- [ ] **Step 4: Capture approve/reject discovery baseline**

Run:

```bash
rg -n "@Post\\([^)]*(approve|reject)" server/src/modules --glob '!**/unified-approval/**'
```

Expected current hits to reconcile:

```text
server/src/modules/deviation/deviation.controller.ts
server/src/modules/equipment/record.controller.ts
server/src/modules/change-event/change-event.controller.ts
server/src/modules/task/task.controller.ts
server/src/modules/warehouse/controllers/return.controller.ts
server/src/modules/warehouse/controllers/scrap.controller.ts
server/src/modules/warehouse/requisition.controller.ts
server/src/modules/warehouse/inbound.controller.ts
server/src/modules/product-recall/product-recall.controller.ts
server/src/modules/training/training.controller.ts
```

If additional non-unified approval routes appear, add them to Task 4 before editing.

- [ ] **Step 5: Capture seed callback keys before changing callbacks**

Run:

```bash
rg -n "onApproved:|onRejected:" server/src/prisma/seed.ts server/src/prisma/seed-e2e.ts
```

Expected: every retained key has a corresponding business module callback by Task 4. Use the exact `resourceType`, `triggerKey`, and `stepKey` values from these seed definitions when writing metadata validator rules; do not assume `s1`.

- [ ] **Step 6: Capture current approval metadata payloads**

Run:

```bash
rg -n "metadata|approveTask\\(|rejectTask\\(" client/src/api/unified-approval.ts client/src/views client/src/components
```

Expected on the current snapshot: `client/src/api/unified-approval.ts` only sends `comment` for approve/reject and no active view sends business `metadata`. If any current caller sends metadata, add an explicit validator rule for that `resourceType + triggerKey + stepKey + action` before enabling strict metadata rejection.

- [ ] **Step 7: Confirm old approval and unified approval are physically isolated**

Run:

```bash
find server/src/modules -maxdepth 2 -type d -name approval -o -name unified-approval
rg -n "modules/approval|from ['\"].*approval" server/src/modules/unified-approval server/src/modules --glob '!**/unified-approval/**'
```

Expected: `server/src/modules/unified-approval` exists; old `server/src/modules/approval` is absent or has no import relationship with unified approval. If old approval files still exist and are imported, stop and split the dependency before deleting anything.

- [ ] **Step 8: Confirm `approval-step` field location**

Run:

```bash
rg -n "approval-step|ApprovalStepField|approvalStep" server/src/modules/record-template client/src server/src/prisma/schema.prisma
```

Expected: hits are record-template field-type code, DTO allowlists, front-end field components, or fixtures. If a Prisma enum/table field is found, add an explicit schema migration step before deleting the field type.

- [ ] **Step 9: Confirm DocumentReference is independent from audit/evidence chain fields**

Run:

```bash
rg -n "auditChain|audit_chain|evidenceChain|evidence_chain" server/src/modules/document server/src/prisma/schema.prisma
rg -n "DocumentReference|DocumentReferenceHealthService|MarkdownWikilinkService" server/src/modules/document
```

Expected: no `auditChain*` / `evidenceChain*` dependency inside `DocumentReference`, `MarkdownWikilinkService`, or `DocumentReferenceHealthService`. If shared fields exist, keep the reference-health fields and delete only audit/evidence presentation services.

- [ ] **Step 10: Capture backend-only high-risk sample**

Run:

```bash
python3 tools/generate-system-map.py
rg -n "backend_only|approve|reject|workflow|monitoring|alert|sso|internal-audit|management-review|asset-loan|change-approval" docs/system-map.html
```

Expected: no backend-only route from deleted product surfaces and no business approve/reject route outside unified approval. Health probes such as `/health` and `/liveness` may remain.

- [ ] **Step 11: Capture deleted-scope residue baseline**

Run:

```bash
rg -n "changeApproval|WorkflowInstanceService|src/modules/workflow|monitoring/alerts|alertRule|alertHistory|SsoService|internal-audit|management-review|asset-loan|audit/dashboard|getDashboardStats" server/src client/src --glob '!**/*.spec.ts'
rg -n "changeApproval|WorkflowInstanceService|src/modules/workflow|monitoring/alerts|alertRule|alertHistory|SsoService|internal-audit|management-review|asset-loan|audit/dashboard|getDashboardStats" server/test client/e2e client/src --glob '**/*.spec.ts'
```

Expected: the runtime scan may show audit/change-event/Todo residue that this plan fixes. The test scan is an allowlist baseline for Task 8/9; known current hits include workflow, monitoring/alert, SSO, audit dashboard, and change-event callback tests. By Task 11, both commands must be clean except retained generated model-landing source-form metadata.

- [ ] **Step 12: Capture `/api/v1` request-prefix baseline**

Run:

```bash
rg -n "request\\.(get|post|put|patch|delete|head|options)\\(\\s*['\\\"]/api/v1/" client/src
```

Expected current hit:

```text
client/src/views/training/archives/ArchiveList.vue
```

- [ ] **Step 13: Commit is not needed**

No files changed in this task.

---

## Task 2: Add Unified Approval Action Metadata

**Files:**
- Modify: `server/src/modules/unified-approval/dto/approval-task-action.dto.ts`
- Modify: `server/src/modules/unified-approval/types.ts`
- Create: `server/src/modules/unified-approval/approval-action-metadata.validator.ts`
- Modify: `server/src/modules/unified-approval/unified-approval.module.ts`
- Modify: `server/src/modules/unified-approval/approval-task.controller.ts`
- Modify: `server/src/modules/unified-approval/approval-engine.service.ts`
- Modify: `server/src/modules/unified-approval/approval-engine.service.spec.ts`

- [ ] **Step 1: Run impact analysis before editing approval engine symbols**

Run GitNexus impact analysis for:

```text
ApprovalEngineService
approveTask
rejectTask
completeTask
ApprovalTaskController
ApprovalTaskActionDto
RejectApprovalTaskDto
```

Expected: record the risk and direct callers in the task notes. If any result is HIGH or CRITICAL, warn before editing.

- [ ] **Step 2: Refactor the existing test helper and write failing metadata tests**

Patch the existing `makeDeps()` helper in `server/src/modules/unified-approval/approval-engine.service.spec.ts` first:

```ts
const metadataValidator: any = {
  validate: jest.fn((context) => context.metadata ?? {}),
};
return { tx, prisma, resolver, todo, notification, callbacks, metadataValidator };
```

Then update every existing `new ApprovalEngineService(...)` in that spec to pass the sixth constructor argument:

```ts
const service = new ApprovalEngineService(
  deps.prisma,
  deps.resolver,
  deps.todo,
  deps.notification,
  deps.callbacks,
  deps.metadataValidator,
);
```

Add these test cases to the same file:

```ts
it('stores approval metadata under ApprovalAction.snapshot.businessDecision', async () => {
  const deps = makeDeps();
  const service = new ApprovalEngineService(
    deps.prisma as any,
    deps.resolver as any,
    deps.todo as any,
    deps.notification as any,
    deps.callbacks as any,
    deps.metadataValidator as any,
  );

  deps.prisma.$transaction.mockImplementation(async (runner: any) => runner(deps.tx));
  deps.tx.approvalTask.findUnique.mockResolvedValue({
    id: 'task-1',
    status: 'PENDING',
    stepKey: 'product-recall-review',
    approvalMode: 'single',
    assignmentType: 'user',
    assigneeUserId: 'approver',
    assigneeRoleCode: null,
    assigneeDepartmentId: null,
    assigneePermissionCode: null,
    instanceId: 'inst-1',
    instance: {
      id: 'inst-1',
      resourceType: 'product_recall',
      resourceId: 'recall-1',
      resourceStep: 'submit',
      triggerKey: 'submit',
      createdById: 'requester',
      title: '召回审批',
      definition: { steps: [{ stepKey: 'product-recall-review', onApproved: 'productRecall.approvalApproved' }] },
    },
  });
  deps.tx.approvalTask.update.mockResolvedValue({ id: 'task-1', status: 'APPROVED' });
  deps.tx.approvalTask.findMany.mockResolvedValue([]);

  await service.approveTask('task-1', 'approver', '同意', { review_note: '风险可控' });

  expect(deps.metadataValidator.validate).toHaveBeenCalledWith(expect.objectContaining({
    resourceType: 'product_recall',
    triggerKey: 'submit',
    stepKey: 'product-recall-review',
    action: 'APPROVED',
    metadata: { review_note: '风险可控' },
  }));
  expect(deps.tx.approvalAction.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      snapshot: expect.objectContaining({
        businessDecision: { review_note: '风险可控' },
      }),
    }),
  });
  expect(deps.callbacks.invoke).toHaveBeenCalledWith(
    'productRecall.approvalApproved',
    expect.objectContaining({ metadata: { review_note: '风险可控' } }),
  );
});

it('passes reject metadata to onRejected callbacks', async () => {
  const deps = makeDeps();
  const service = new ApprovalEngineService(
    deps.prisma as any,
    deps.resolver as any,
    deps.todo as any,
    deps.notification as any,
    deps.callbacks as any,
    deps.metadataValidator as any,
  );

  deps.prisma.$transaction.mockImplementation(async (runner: any) => runner(deps.tx));
  deps.tx.approvalTask.findUnique.mockResolvedValue({
    id: 'task-1',
    status: 'PENDING',
    stepKey: 'maintenance-record',
    approvalMode: 'single',
    assignmentType: 'user',
    assigneeUserId: 'approver',
    assigneeRoleCode: null,
    assigneeDepartmentId: null,
    assigneePermissionCode: null,
    instanceId: 'inst-1',
    instance: {
      id: 'inst-1',
      resourceType: 'maintenance_record',
      resourceId: 'rec-1',
      resourceStep: 'submit',
      triggerKey: 'submit',
      createdById: 'requester',
      title: '维护记录审批',
      definition: { steps: [{ stepKey: 'maintenance-record', onApproved: 'equipment.maintenanceApproved', onRejected: 'equipment.maintenanceRejected' }] },
    },
  });
  deps.tx.approvalTask.update.mockResolvedValue({ id: 'task-1', status: 'REJECTED' });

  await service.rejectTask('task-1', 'approver', '资料不完整', { rejectReason: '缺少照片' });

  expect(deps.callbacks.invoke).toHaveBeenCalledWith(
    'equipment.maintenanceRejected',
    expect.objectContaining({ metadata: { rejectReason: '缺少照片' } }),
  );
});
```

Use the existing `makeDeps()` helper; do not introduce a second dependency factory.

- [ ] **Step 3: Run the focused test and verify it fails**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test -w server -- approval-engine.service.spec.ts --runInBand
```

Expected: FAIL before implementation. The first failure may be a TypeScript constructor-arity error because `ApprovalEngineService` still has five constructor parameters, or a missing metadata assertion after the constructor is updated. Both are valid red states for this task.

- [ ] **Step 4: Add DTO metadata fields**

Patch `server/src/modules/unified-approval/dto/approval-task-action.dto.ts` so both action DTOs support controlled plain-object metadata. Do not use `@IsObject()` alone; arrays must not pass validation.

```ts
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function IsPlainObject(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPlainObject',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return value === undefined || (
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            Object.getPrototypeOf(value) === Object.prototype
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a plain object`;
        },
      },
    });
  };
}

export class ApprovalTaskActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @IsOptional()
  @IsPlainObject()
  metadata?: Record<string, unknown>;
}

export class RejectApprovalTaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  comment!: string;

  @IsOptional()
  @IsPlainObject()
  metadata?: Record<string, unknown>;
}
```

Keep `TransferApprovalTaskDto` unchanged unless tests prove transfer also needs metadata.

- [ ] **Step 5: Add callback metadata type**

Patch `server/src/modules/unified-approval/types.ts`:

```ts
export type ApprovalActionMetadata = Record<string, unknown>;

export interface ApprovalActionValidationContext {
  resourceType: string;
  triggerKey: string;
  stepKey: string;
  action: 'APPROVED' | 'REJECTED';
  comment?: string;
  metadata?: ApprovalActionMetadata;
}
```

Add this field to `ApprovalCallbackContext`:

```ts
  metadata?: ApprovalActionMetadata;
```

- [ ] **Step 6: Scan seed step keys before adding metadata validator**

Run:

```bash
rg -n "resourceType:|triggerKey:|stepKey:|onApproved:|onRejected:" server/src/prisma/seed.ts server/src/prisma/seed-e2e.ts
```

Expected: identify the exact `resourceType`, `triggerKey`, and `stepKey` triples for deviation, maintenance record, product recall, task record, warehouse requisition/inbound/return/scrap, training plan, and change event. Current `seed.ts` uses keys such as `maintenance-record`, `deviation-submit`, `warehouse-requisition`, `task-record-submit`, and `change-approval`; do not use `s1` unless the seed actually says so.

- [ ] **Step 7: Add metadata validator**

Create `server/src/modules/unified-approval/approval-action-metadata.validator.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import type { ApprovalActionMetadata, ApprovalActionValidationContext } from './types';

type Rule = (context: ApprovalActionValidationContext) => ApprovalActionMetadata;

@Injectable()
export class ApprovalActionMetadataValidator {
  private readonly rules: Record<string, Rule> = {
    'maintenance_record:submit:maintenance-record:APPROVED': (context) =>
      this.optionalStringObject(context.metadata, 'reviewerSignature'),
    'maintenance_record:submit:maintenance-record:REJECTED': (context) => ({
      rejectReason: this.requireString(context.metadata, 'rejectReason', '驳回原因不能为空'),
    }),
    'product_recall:submit:product-recall-review:APPROVED': (context) =>
      this.optionalStringObject(context.metadata, 'review_note'),
    'product_recall:submit:product-recall-review:REJECTED': (context) =>
      this.optionalStringObject(context.metadata, 'review_note'),
    'deviation_report:submit:deviation-submit:REJECTED': (context) =>
      this.optionalStringObject(context.metadata, 'rejectReason'),
  };

  validate(context: ApprovalActionValidationContext): ApprovalActionMetadata {
    const key = `${context.resourceType}:${context.triggerKey}:${context.stepKey}:${context.action}`;
    const rule = this.rules[key];
    if (rule) return rule(context);
    if (context.metadata && Object.keys(context.metadata).length > 0) {
      throw new BadRequestException(`No approval action metadata rule registered for ${key}`);
    }
    return {};
  }

  private optionalStringObject(metadata: ApprovalActionMetadata | undefined, field: string): ApprovalActionMetadata {
    if (!metadata || metadata[field] == null || metadata[field] === '') return {};
    if (typeof metadata[field] !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }
    return { [field]: metadata[field] };
  }

  private requireString(metadata: ApprovalActionMetadata | undefined, field: string, message: string): string {
    const value = metadata?.[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(message);
    }
    return value.trim();
  }
}
```

For retained callbacks that do not require business metadata, leave them without a rule; the strict fallback allows empty metadata and rejects non-empty unvalidated metadata. Do not enable this strict fallback until Task 1's front-end metadata scan is clean or every current metadata payload has a rule.

- [ ] **Step 8: Register the validator**

Patch `server/src/modules/unified-approval/unified-approval.module.ts`:

```ts
import { ApprovalActionMetadataValidator } from './approval-action-metadata.validator';
```

Add it to providers and exports:

```ts
providers: [
  ApprovalEngineService,
  ApprovalAssignmentResolver,
  ApprovalTodoBridge,
  ApprovalNotificationBridge,
  ApprovalCallbackRegistry,
  ApprovalActionMetadataValidator,
],
exports: [
  ApprovalEngineService,
  ApprovalCallbackRegistry,
  ApprovalAssignmentResolver,
  ApprovalNotificationBridge,
  ApprovalActionMetadataValidator,
],
```

- [ ] **Step 9: Wire controller metadata**

Patch `server/src/modules/unified-approval/approval-task.controller.ts`:

```ts
approve(@Param('id') id: string, @Body() dto: ApprovalTaskActionDto, @Request() req: AuthenticatedRequest) {
  return this.engine.approveTask(id, req.user.id, dto.comment ?? '', dto.metadata);
}

reject(@Param('id') id: string, @Body() dto: RejectApprovalTaskDto, @Request() req: AuthenticatedRequest) {
  return this.engine.rejectTask(id, req.user.id, dto.comment, dto.metadata);
}
```

- [ ] **Step 10: Wire engine metadata**

Patch `server/src/modules/unified-approval/approval-engine.service.ts`:

```ts
import { ApprovalActionMetadataValidator } from './approval-action-metadata.validator';
import type { ApprovalActionMetadata, ApprovalStepDefinition, StartApprovalInput } from './types';
```

Inject the validator:

```ts
private readonly metadataValidator: ApprovalActionMetadataValidator,
```

Update method signatures:

```ts
async approveTask(taskId: string, actorId: string, comment = '', metadata?: ApprovalActionMetadata) {
  return this.completeTask(taskId, actorId, 'APPROVED', comment, metadata);
}

async rejectTask(taskId: string, actorId: string, comment: string, metadata?: ApprovalActionMetadata) {
  return this.completeTask(taskId, actorId, 'REJECTED', comment, metadata);
}

async act(
  instanceId: string,
  action: 'approve' | 'reject',
  actorId: string,
  comment = '',
  metadata?: ApprovalActionMetadata,
): Promise<void> {
```

Pass metadata through `act()`:

```ts
if (action === 'approve') {
  await this.approveTask(task.id, actorId, comment, metadata);
  return;
}
await this.rejectTask(task.id, actorId, comment, metadata);
```

Update `completeTask`:

```ts
private async completeTask(
  taskId: string,
  actorId: string,
  status: 'APPROVED' | 'REJECTED',
  comment: string,
  metadata?: ApprovalActionMetadata,
) {
```

After loading `task`, compute normalized metadata:

```ts
const normalizedMetadata = this.metadataValidator.validate({
  resourceType: task.instance.resourceType,
  triggerKey: task.instance.triggerKey,
  stepKey: task.stepKey,
  action: status,
  comment,
  metadata,
});
```

Include it in `ApprovalAction.snapshot`:

```ts
snapshot: {
  stepKey: task.stepKey,
  approvalMode: task.approvalMode,
  assignmentType: task.assignmentType,
  assigneeUserId: task.assigneeUserId,
  assigneeRoleCode: task.assigneeRoleCode,
  assigneeDepartmentId: task.assigneeDepartmentId,
  assigneePermissionCode: task.assigneePermissionCode,
  businessDecision: normalizedMetadata,
},
```

Pass it to reject callback:

```ts
metadata: normalizedMetadata,
```

Update `advanceIfStepComplete` signature and caller:

```ts
await this.advanceIfStepComplete(tx, task, actorId, comment, normalizedMetadata);

private async advanceIfStepComplete(
  tx: any,
  task: any,
  actorId: string,
  comment: string,
  metadata: ApprovalActionMetadata,
) {
```

Pass metadata to approved callback:

```ts
metadata,
```

- [ ] **Step 11: Run focused approval tests**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test -w server -- approval-engine.service.spec.ts approval-callback.registry.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 12: Commit approval metadata infrastructure**

Run:

```bash
git add server/src/modules/unified-approval
git commit -m "feat: support approval action metadata"
```

---

## Task 3: Add Callback Coverage Gate

**Files:**
- Create: `server/src/modules/unified-approval/approval-callback-coverage.spec.ts`
- Modify only if required: `server/src/modules/unified-approval/approval-callback.registry.ts`
- Read: `server/src/prisma/seed.ts`
- Read: `server/src/prisma/seed-e2e.ts`

- [ ] **Step 1: Run impact analysis for `ApprovalCallbackRegistry`**

Run GitNexus impact analysis for `ApprovalCallbackRegistry`.

Expected: record direct registration users before editing tests.

- [ ] **Step 2: Add registry inspection helper if absent**

If `server/src/modules/unified-approval/approval-callback.registry.ts` does not expose a read method, add:

```ts
has(key: string): boolean {
  return this.callbacks.has(key);
}
```

Keep `get()` only if it already exists. Do not expose the mutable map.

- [ ] **Step 3: Create seed callback coverage test**

Create `server/src/modules/unified-approval/approval-callback-coverage.spec.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';
import { ApprovalCallbackRegistry } from './approval-callback.registry';

const seedFiles = [
  path.resolve(__dirname, '../../prisma/seed.ts'),
  path.resolve(__dirname, '../../prisma/seed-e2e.ts'),
];

const retainedCallbackKeys = [
  'document.approvalApproved',
  'document.approvalRejected',
  'process.stepApproved',
  'record.submitApproved',
  'taskRecord.approvalApproved',
  'taskRecord.approvalRejected',
  'warehouse.requisitionApproved',
  'warehouse.requisitionRejected',
  'warehouse.inboundApproved',
  'warehouse.inboundRejected',
  'warehouse.returnApproved',
  'warehouse.returnRejected',
  'warehouse.scrapApproved',
  'warehouse.scrapRejected',
  'training.planApproved',
  'training.planRejected',
  'equipment.maintenanceApproved',
  'equipment.maintenanceRejected',
  'capa.verificationApproved',
  'deviation.approvalApproved',
  'deviation.approvalRejected',
  'productRecall.approvalApproved',
  'productRecall.approvalRejected',
  'changeEvent.approvalApproved',
  'changeEvent.approvalRejected',
];

function extractCallbackKeys(source: string): string[] {
  const matches = source.matchAll(/on(?:Approved|Rejected):\s*['"]([^'"]+)['"]/g);
  return [...matches].map((match) => match[1]);
}

describe('Approval callback seed coverage', () => {
  it('keeps every retained seed callback key registered', () => {
    const registry = new ApprovalCallbackRegistry();
    for (const key of retainedCallbackKeys) {
      registry.register(key, async () => undefined);
    }

    const seedKeys = new Set<string>();
    for (const file of seedFiles) {
      if (!fs.existsSync(file)) continue;
      for (const key of extractCallbackKeys(fs.readFileSync(file, 'utf8'))) {
        seedKeys.add(key);
      }
    }

    const deletedPrefixes = ['workflow.', 'changeApproval.', 'internalAudit.', 'managementReview.', 'assetLoan.'];
    const unexpectedDeletedKeys = [...seedKeys].filter((key) => deletedPrefixes.some((prefix) => key.startsWith(prefix)));
    expect(unexpectedDeletedKeys).toEqual([]);

    const missing = [...seedKeys].filter((key) => !registry.has(key));
    expect(missing).toEqual([]);
  });
});
```

If actual retained seed keys differ, update `retainedCallbackKeys` and the callback registrations in business modules in the same task. Do not weaken the test to ignore missing keys.

- [ ] **Step 4: Run the coverage test and verify expected failures**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test -w server -- approval-callback-coverage.spec.ts --runInBand
```

Expected before Task 4: failure may show missing rejected callbacks such as `taskRecord.approvalRejected`, `warehouse.*Rejected`, `productRecall.*`, or stale seed keys. Use this as the implementation checklist for Task 4. The test must pass by the end of Task 4 after seed and module callbacks are updated together.

- [ ] **Step 5: Commit coverage gate**

Run after the test compiles:

```bash
git add server/src/modules/unified-approval/approval-callback.registry.ts server/src/modules/unified-approval/approval-callback-coverage.spec.ts
git commit -m "test: cover approval callback seed keys"
```

If the test intentionally still fails pending Task 4, commit it together with Task 4 instead.

---

## Task 4: Remove Business Approval Routes and Move Effects to Callbacks

**Files:**
- Modify: all business controller/service/module files listed in File Structure.
- Modify: `server/src/prisma/schema.prisma` for `ProductRecall.approvalInstanceId`.
- Create/modify: Prisma migration for `ProductRecall.approvalInstanceId`.
- Modify: `server/src/prisma/seed.ts`
- Modify: `server/src/prisma/seed-e2e.ts`
- Modify: front-end approval adapters listed in File Structure.
- Modify: focused business service specs.

- [ ] **Step 1: Re-run approve/reject discovery**

Run:

```bash
rg -n "@Post\\([^)]*(approve|reject)" server/src/modules --glob '!**/unified-approval/**'
rg -n "onApproved:|onRejected:" server/src/prisma/seed.ts server/src/prisma/seed-e2e.ts
rg -n "\\.approve\\(|\\.reject\\(|approveDeviationReport|handleApprovalCompleted" server/src client/src --glob '!**/*.spec.ts'
```

Expected: same route baseline as Task 1 unless the branch changed, and an exact seed callback-key list for every approval definition. Before editing business modules, map each `resourceType + triggerKey + stepKey` to the callback key that the seed actually uses; if a key differs from this plan's sample names, update both the registration and metadata validator to match the seed. Add any new non-unified approval route to this task before editing.

Before Step 2, update `server/src/prisma/seed.ts` so retained business approvals that can be rejected have explicit rejected callbacks. Use this target matrix:

| resourceType | triggerKey | stepKey | onApproved | onRejected |
|---|---|---|---|---|
| `task_record` | `submit` | `task-record-submit` | `taskRecord.approvalApproved` | `taskRecord.approvalRejected` |
| `material_requisition` | `submit` | `warehouse-requisition` | `warehouse.requisitionApproved` | `warehouse.requisitionRejected` |
| `material_inbound` | `submit` | `warehouse-inbound` | `warehouse.inboundApproved` | `warehouse.inboundRejected` |
| `material_return` | `submit` | `warehouse-return` | `warehouse.returnApproved` | `warehouse.returnRejected` |
| `material_scrap` | `submit` | `warehouse-scrap` | `warehouse.scrapApproved` | `warehouse.scrapRejected` |
| `training_plan` | `submit` | `training-plan` | `training.planApproved` | `training.planRejected` |
| `maintenance_record` | `submit` | `maintenance-record` | `equipment.maintenanceApproved` | `equipment.maintenanceRejected` |
| `deviation_report` | `submit` | `deviation-submit` | `deviation.approvalApproved` | `deviation.approvalRejected` |
| `product_recall` | `submit` | `product-recall-review` | `productRecall.approvalApproved` | `productRecall.approvalRejected` |
| `change_event` | `approve_change` | `change-event-review` | `changeEvent.approvalApproved` | `changeEvent.approvalRejected` |

Do not add `onRejected` to definitions where rejection has no business-state effect unless the callback is also registered and tested.

- [ ] **Step 2: Remove deviation direct approval**

Patch `server/src/modules/deviation/deviation.controller.ts`: delete the `@Post(':id/approve') approve(...)` method and remove unused imports.

Patch `server/src/modules/deviation/deviation.service.ts`: delete deprecated `approveDeviationReport(...)` if no internal caller remains.

Patch `client/src/api/deviation.ts`: remove `approveDeviationReport(...)`.

Patch `client/src/views/deviation/DeviationReportView.vue`: replace direct report approval UI with either a link to the related approval task or a status-only display. If the view only had local approve buttons, remove those buttons and use existing unified approval inbox for decisions.

Run:

```bash
rg -n "approveDeviationReport|deviation-reports/.*/approve" server/src client/src server/test client/src
```

Expected: no output.

- [ ] **Step 3: Move equipment maintenance side effects into callbacks**

Patch `server/src/modules/equipment/equipment.module.ts` callback:

```ts
this.callbacks.register('equipment.maintenanceApproved', async (context: any) => {
  const record = await context.tx.maintenanceRecord.update({
    where: { id: context.resourceId },
    data: {
      status: 'approved',
      reviewerId: context.actorId,
      reviewerSignature: typeof context.metadata?.reviewerSignature === 'string'
        ? context.metadata.reviewerSignature
        : undefined,
      approvedAt: new Date(),
    },
  });
  await this.planService.generateNextPlan(
    record.equipmentId,
    record.maintenanceLevel,
    record.maintenanceDate,
  );
  const year = record.maintenanceDate.getFullYear();
  await this.statsService.clearCache(['maintenance', `cost-${year}`]).catch(() => {});
});

this.callbacks.register('equipment.maintenanceRejected', async (context: any) => {
  await context.tx.maintenanceRecord.update({
    where: { id: context.resourceId },
    data: {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectReason: String(context.metadata?.rejectReason ?? context.comment ?? ''),
      reviewerId: context.actorId,
    },
  });
});
```

Patch `server/src/modules/equipment/record.controller.ts`: delete `@Post(':id/approve')` and `@Post(':id/reject')`.

Patch `server/src/modules/equipment/record.service.ts`: remove public `approve()` and `reject()` methods after callbacks cover their side effects.

Patch `client/src/api/equipment.ts`: remove `approveRecord()` and `rejectRecord()` or rewrite any still-active buttons to call `client/src/api/unified-approval.ts`.

Run:

```bash
rg -n "maintenance-records/.*/(approve|reject)|recordService\\.(approve|reject)|approveRecord\\(|rejectRecord\\(" server/src client/src server/test client/src
```

Expected: no runtime output outside updated tests.

- [ ] **Step 4: Remove legacy task record approval route**

Patch `server/src/modules/task/task.module.ts`:

```ts
this.callbacks.register('taskRecord.approvalApproved', async (context: any) => {
  const record = await context.tx.taskRecord.update({
    where: { id: context.resourceId },
    data: { status: 'approved', approvedAt: new Date(), approverId: context.actorId, comment: context.comment },
  });
  await context.tx.task.update({
    where: { id: record.taskId },
    data: { status: 'approved' },
  });
});

this.callbacks.register('taskRecord.approvalRejected', async (context: any) => {
  const record = await context.tx.taskRecord.update({
    where: { id: context.resourceId },
    data: { status: 'rejected', approvedAt: new Date(), approverId: context.actorId, comment: context.comment },
  });
  await context.tx.task.update({
    where: { id: record.taskId },
    data: { status: 'rejected' },
  });
});
```

Patch `server/src/modules/task/task.controller.ts`: delete `@Post('approve') approve(...)`.

Delete `server/src/modules/task/dto/approve-task.dto.ts` if no import remains.

Patch `server/src/modules/task/task.service.ts`: remove public `approve(...)` after callback tests cover status writes.

Patch `client/src/api/task.ts`: remove `approveTask(payload)` that posts to `/tasks/approve`. Active approval UI should call `approvalTaskApi.approve()` or `approvalTaskApi.reject()`.

Run:

```bash
rg -n "tasks/approve|ApproveTaskDto|taskService\\.approve|approveTask\\(" server/src client/src server/test client/src
```

Expected: only unified approval API method names may remain.

- [ ] **Step 5: Move warehouse approval effects into callbacks**

Patch `server/src/modules/warehouse/warehouse.module.ts` to register approved and rejected callbacks:

```ts
const makeApprovedCallback = (modelName: string) => async (context: any) => {
  await (context.tx as any)[modelName].update({
    where: { id: context.resourceId },
    data: { status: 'approved', approvedBy: context.actorId, approvedAt: new Date() },
  });
};

const makeRejectedCallback = (modelName: string) => async (context: any) => {
  await (context.tx as any)[modelName].update({
    where: { id: context.resourceId },
    data: { status: 'rejected', approvedBy: context.actorId, approvedAt: new Date() },
  });
};

this.callbacks.register('warehouse.requisitionApproved', makeApprovedCallback('materialRequisition'));
this.callbacks.register('warehouse.requisitionRejected', makeRejectedCallback('materialRequisition'));
this.callbacks.register('warehouse.inboundApproved', makeApprovedCallback('materialInbound'));
this.callbacks.register('warehouse.inboundRejected', makeRejectedCallback('materialInbound'));
this.callbacks.register('warehouse.returnApproved', makeApprovedCallback('materialReturn'));
this.callbacks.register('warehouse.returnRejected', makeRejectedCallback('materialReturn'));
this.callbacks.register('warehouse.scrapApproved', makeApprovedCallback('materialScrap'));
this.callbacks.register('warehouse.scrapRejected', makeRejectedCallback('materialScrap'));
```

Patch controllers: delete `@Post(':id/approve')` from `requisition.controller.ts`, `inbound.controller.ts`, `controllers/return.controller.ts`, `controllers/scrap.controller.ts`.

Patch services: remove public `approve(...)` from `requisition.service.ts`, `inbound.service.ts`, `services/return.service.ts`, `services/scrap.service.ts` after callback coverage is in place. Keep `complete(...)` execution methods.

Patch `client/src/api/warehouse.ts`: remove `approve(...)` that posts to `/warehouse/requisitions/:id/approve`. If return/scrap/inbound adapters exist, remove their approve calls too.

Run:

```bash
rg -n "warehouse/requisitions/.*/approve|warehouse/inbound/.*/approve|returns/.*/approve|scraps/.*/approve|\\.approve\\(" server/src/modules/warehouse client/src/api/warehouse.ts server/src/modules/warehouse
```

Expected: no controller route or front-end business approval adapter remains; service test names may remain only if rewritten to callback tests in Task 8.

- [ ] **Step 6: Move product recall review into callbacks**

Patch `server/src/prisma/schema.prisma`: add `approvalInstanceId String?` and `@@index([approvalInstanceId])` to `model ProductRecall`.

Create a Prisma migration in the same branch. Because the project has no historical business data, no backfill is needed for existing recall records:

```bash
npx -y -p node@20 -p npm@10 npm run prisma:migrate -w server -- --name product_recall_unified_approval
```

Patch `server/src/prisma/seed.ts`: add an `ApprovalDefinition` row for product recall:

```ts
{
  module: 'product-recall',
  resourceType: 'product_recall',
  triggerKey: 'submit',
  name: '产品召回审批',
  version: 1,
  steps: [
    {
      stepKey: 'product-recall-review',
      stepName: '召回审批',
      mode: 'single',
      assignments: [{ type: 'permission', permissionCode: 'approve:product_recall', label: '召回审批人' }],
      rejectPolicy: 'reject_instance',
      onApproved: 'productRecall.approvalApproved',
      onRejected: 'productRecall.approvalRejected',
    },
  ],
}
```

Patch `server/src/modules/product-recall/product-recall.service.ts`: inject `ApprovalEngineService`; in `submit(id, currentUser)`, transition the recall to `pending_review`, call:

```ts
const approval = await this.approvalEngine.startApproval({
  resourceType: 'product_recall',
  resourceId: id,
  resourceStep: 'submit',
  triggerKey: 'submit',
  title: `产品召回审批：${recall.title}`,
  createdById: currentUser.id,
});
await this.prisma.productRecall.update({
  where: { id },
  data: { approvalInstanceId: approval.id },
});
```

Use the submitted recall record returned by the status transition as `recall`.

Patch `server/src/modules/product-recall/product-recall.controller.ts`: delete `@Post(':id/approve')` and `@Post(':id/reject')`.

Patch `server/src/modules/product-recall/product-recall.service.ts`: replace public `approve()` and `reject()` with callback-safe methods:

```ts
async markApprovalApproved(id: string, currentUser: CurrentUser, reviewNote?: string) {
  const recall = await this.findOne(id, currentUser.companyId);
  const result = await this.transition(id, currentUser, 'approved', {
    reviewed_by: currentUser.id,
    reviewed_at: new Date(),
    review_note: reviewNote,
  });
  if (recall.requested_by) {
    await this.notificationBridge.notifyRequester(recall.requested_by, 'approved', recall.title);
  }
  return result;
}

async markApprovalRejected(id: string, currentUser: CurrentUser, reviewNote?: string) {
  const recall = await this.findOne(id, currentUser.companyId);
  const result = await this.transition(id, currentUser, 'rejected', {
    reviewed_by: currentUser.id,
    reviewed_at: new Date(),
    review_note: reviewNote,
  });
  if (recall.requested_by) {
    await this.notificationBridge.notifyRequester(recall.requested_by, 'rejected', recall.title);
  }
  return result;
}
```

If callbacks cannot provide `companyId`, fetch it from the recall record inside callback instead of requiring `CurrentUser`.

Register callback keys in the product recall module if no module callback exists:

```ts
this.callbacks.register('productRecall.approvalApproved', async (context: any) => {
  await this.service.markApprovalApprovedFromCallback(context.resourceId, context.actorId, context.metadata?.review_note);
});
this.callbacks.register('productRecall.approvalRejected', async (context: any) => {
  await this.service.markApprovalRejectedFromCallback(context.resourceId, context.actorId, context.metadata?.review_note ?? context.comment);
});
```

Patch `server/src/prisma/seed.ts` and `seed-e2e.ts` to use those keys for product recall definitions if the definitions exist.

Patch `client/src/api/product-recall.ts`: remove `approve()` and `reject()`. Details pages should show approval state or link to unified approval tasks.

Run:

```bash
rg -n "product-recalls/.*/(approve|reject)|service\\.(approve|reject)\\(|productRecall\\.approval" server/src client/src server/test
```

Expected: no business route remains; retained callback keys are registered and seeded consistently.

- [ ] **Step 7: Remove training plan direct approval**

Patch `server/src/modules/training/training.controller.ts`: delete `@Post('plans/:id/approve')`.

Patch `server/src/modules/training/training.service.ts`: keep `handleApprovalCompleted(id)` only as callback-internal method or rename to `markPlanApprovedFromCallback(id)`. Do not expose it through a controller.

Ensure `training.planApproved` callback calls the internal status update and `training.planRejected` exists if the seed has an `onRejected`.

Run:

```bash
rg -n "plans/:id/approve|training/plans/.*/approve|handleApprovalCompleted" server/src client/src server/test
```

Expected: no controller/front-end route remains; internal callback method may remain with a callback-specific name.

- [ ] **Step 8: Remove ChangeEvent direct approval and stale changeApproval write**

Patch `server/src/modules/change-event/change-event.controller.ts`: delete `@Post(':id/approve') approve(...)`.

Patch `server/src/modules/change-event/change-event.service.ts`: delete public `approve(id, userId)` fallback. Approval status must be driven by callback only.

Patch `server/src/modules/change-event/change-event.module.ts`: remove the `changeApproval.updateMany` block. The callback should be:

```ts
this.callbacks.register('changeEvent.approvalApproved', async (context: any) => {
  await (context.tx as any).changeEvent.update({
    where: { id: context.resourceId },
    data: { status: 'approved', approved_by: context.actorId },
  });
  await this.productProcessChangeService.applyApprovedChange(
    context.resourceId,
    context.actorId,
    context.tx,
  );
});

this.callbacks.register('changeEvent.approvalRejected', async (context: any) => {
  await (context.tx as any).changeEvent.update({
    where: { id: context.resourceId },
    data: { status: 'rejected', approved_by: context.actorId },
  });
});
```

Patch `server/src/prisma/seed.ts`: change `stepKey: 'change-approval'` to `stepKey: 'change-event-review'` for change-event definitions. Add `onRejected: 'changeEvent.approvalRejected'` if the definition can be rejected.

Run:

```bash
rg -n "changeApproval|change-approval|change-events/.*/approve|service\\.approve\\(" server/src/modules/change-event server/src/prisma/seed.ts server/src/prisma/seed-e2e.ts server/test
```

Expected: no stale `changeApproval` delegate and no direct approval route.

- [ ] **Step 9: Re-run callback coverage**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test -w server -- approval-callback-coverage.spec.ts approval-engine.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 10: Re-run approve/reject route gate**

Run:

```bash
rg -n "@Post\\(':id/(approve|reject)'\\)|@Post\\('approve'\\)" server/src/modules
```

Expected: only `server/src/modules/unified-approval/approval-task.controller.ts` may match.

- [ ] **Step 11: Verify domain-sized commits**

Do not wait until the end of Task 4 to create a single approval mega-commit. After each domain step above passes its focused scan/test, immediately stage and commit that domain before moving to the next one. Use the following staging groups as the commit checklist, skipping a commit only when that group had no changes:

```bash
git add server/src/modules/deviation client/src/api/deviation.ts client/src/views/deviation
git commit -m "refactor: route deviation approval through unified tasks"

git add server/src/modules/equipment client/src/api/equipment.ts
git commit -m "refactor: route equipment record approval through unified tasks"

git add server/src/modules/task client/src/api/task.ts
git commit -m "refactor: route task record approval through unified tasks"

git add server/src/modules/warehouse client/src/api/warehouse.ts
git commit -m "refactor: route warehouse approvals through unified tasks"

git add server/src/modules/product-recall client/src/api/product-recall.ts server/src/prisma/schema.prisma server/src/prisma/migrations server/src/prisma/seed.ts server/src/prisma/seed-e2e.ts
git commit -m "refactor: route product recall review through unified tasks"

git add server/src/modules/training
git commit -m "refactor: route training plan approval through unified tasks"

git add server/src/modules/change-event server/src/prisma/seed.ts server/src/prisma/seed-e2e.ts
git commit -m "refactor: route change event approval through unified tasks"
```

Run after the checklist:

```bash
git status --short
```

Expected: no uncommitted approval-domain edits remain before starting Task 5.

---

## Task 5: Fix Todo Types, Routes, and Prisma Enum

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/<timestamp>_post_api_cleanup_hardening/migration.sql`
- Modify: `server/src/modules/todo/todo.service.ts`
- Modify: `server/src/modules/todo/dto/query-todo.dto.ts`
- Modify: `server/src/modules/todo/todo.service.spec.ts`
- Modify: `server/src/modules/document/services/document-expiry.service.ts`
- Modify: `server/src/modules/document/services/document-expiry.service.spec.ts`
- Modify: `client/src/types/todo.ts`
- Modify: `client/src/utils/todoPresentation.ts`
- Modify: `client/src/views/my-todos/MyTodos.vue`
- Modify: `client/src/views/my-todos/__tests__/MyTodos.spec.ts`

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact analysis for `TodoService`, `QueryTodoDto`, and `DocumentExpiryService`.

Expected: record affected callers and tests before editing.

- [ ] **Step 2: Verify Todo schema table and unique key**

Run:

```bash
rg -n "model TodoTask|@@map\\(\"todo_tasks\"\\)|@@unique\\(\\[userId, type, relatedId\\]\\)|userId_type_relatedId" server/src/prisma/schema.prisma server/src/prisma/migrations
npm pkg get scripts.prisma:migrate -w server
```

Expected:

```text
model TodoTask
@@map("todo_tasks")
@@unique([userId, type, relatedId])
"prisma migrate dev --schema=src/prisma/schema.prisma"
```

If the unique key is absent, add `@@unique([userId, type, relatedId])` in the same Prisma migration before using `todoTask.upsert({ where: { userId_type_relatedId: ... } })`.

- [ ] **Step 3: Update Todo enum in schema**

Patch `server/src/prisma/schema.prisma`:

```prisma
enum TodoType {
  training_organize
  training_attend
  approval
  approval_task
  equipment_maintain
  inventory
  change_request
  document_renewal
  change_execution_failed
}
```

Do not remove `document_renewal` or `change_execution_failed`.

- [ ] **Step 4: Generate Prisma migration**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run prisma:migrate -w server -- --name post_api_cleanup_hardening
```

If Prisma cannot drop a PostgreSQL enum value automatically, replace the generated migration SQL with this guarded enum rebuild. The project has no historical business data, but existing development/staging rows still need an explicit audit trail before enum removal:

```sql
-- Preserve any removed audit_rectification rows for audit review before dropping the enum value.
CREATE TABLE IF NOT EXISTS "todo_tasks_audit_rectification_backup" AS
SELECT *
FROM "todo_tasks"
WHERE "type" = 'audit_rectification';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "todo_tasks"
    WHERE "type" = 'audit_rectification'
      AND "status" = 'pending'
  ) THEN
    RAISE EXCEPTION 'Pending audit_rectification todo_tasks exist; archive or confirm deletion before removing TodoType.audit_rectification';
  END IF;
END $$;

DELETE FROM "todo_tasks" WHERE "type" = 'audit_rectification';

ALTER TYPE "TodoType" RENAME TO "TodoType_old";
CREATE TYPE "TodoType" AS ENUM (
  'training_organize',
  'training_attend',
  'approval',
  'approval_task',
  'equipment_maintain',
  'inventory',
  'change_request',
  'document_renewal',
  'change_execution_failed'
);
ALTER TABLE "todo_tasks"
  ALTER COLUMN "type" TYPE "TodoType"
  USING ("type"::text::"TodoType");
DROP TYPE "TodoType_old";
```

Run after editing migration:

```bash
npx -y -p node@20 -p npm@10 npm run prisma:generate
```

Expected: Prisma Client generation succeeds.

- [ ] **Step 5: Fix server Todo route map and filters**

Patch `server/src/modules/todo/todo.service.ts`:

```ts
const ACTION_ROUTE_MAP: Partial<Record<TodoType, (id: string) => string>> = {
  training_attend: (id) => `/training/projects/${id}`,
  training_organize: (id) => `/training/projects/${id}`,
  approval: (id) => `/approvals/detail/${id}`,
  approval_task: (id) => `/approvals/detail/${id}`,
  equipment_maintain: (id) => `/equipment/${id}`,
  document_renewal: (id) => `/documents/${id}`,
  change_execution_failed: (planId) => `/products/by-plan/${planId}`,
};

const ALL_TODO_TYPES: TodoType[] = [
  'training_attend',
  'training_organize',
  'approval',
  'approval_task',
  'equipment_maintain',
  'inventory',
  'change_request',
  'document_renewal',
  'change_execution_failed',
];
```

Patch `server/src/modules/todo/dto/query-todo.dto.ts`:

```ts
const TYPE_VALUES = [
  'all',
  'training_attend',
  'training_organize',
  'approval',
  'approval_task',
  'equipment_maintain',
  'inventory',
  'change_request',
  'document_renewal',
  'change_execution_failed',
] as const;
```

- [ ] **Step 6: Fix document renewal relatedId**

Patch `server/src/modules/document/services/document-expiry.service.ts` so `upsertRenewalTodo()` uses `link.document.id` as the Todo related id:

```ts
const relatedId = link.document.id;
const nextPriority = status === 'expired' ? 'high' : 'normal';
const description = `${link.businessType}/${link.businessId}/${link.documentKind} ${link.document.number}`;

const existing = await this.prisma.todoTask.findUnique({
  where: {
    userId_type_relatedId: {
      userId,
      type: 'document_renewal',
      relatedId,
    },
  },
});

const dueDate = existing?.dueDate && existing.dueDate < link.expiresAt
  ? existing.dueDate
  : link.expiresAt;
const priority = existing?.priority === 'high' || nextPriority === 'high'
  ? 'high'
  : 'normal';
const mergedDescription = existing?.description && !existing.description.includes(description)
  ? `${existing.description}; ${description}`
  : description;

await this.prisma.todoTask.upsert({
  where: {
    userId_type_relatedId: {
      userId,
      type: 'document_renewal',
      relatedId,
    },
  },
  create: {
    userId,
    type: 'document_renewal',
    relatedId,
    title,
    description: mergedDescription,
    status: 'pending',
    priority,
    dueDate,
  },
  update: {
    title,
    description: mergedDescription,
    status: 'pending',
    priority,
    dueDate,
  },
});
```

This deliberately collapses multiple expiring links on the same file/user into one pending renewal Todo while preserving the earliest due date and highest priority.

- [ ] **Step 7: Update server Todo tests**

Patch `server/src/modules/todo/todo.service.spec.ts` assertions:

```ts
it('sets actionRoute for document renewal todos to document detail', async () => {
  mockPrisma.todoTask.findMany.mockResolvedValue([makeTodo({ type: 'document_renewal', relatedId: 'doc1' })]);
  mockPrisma.todoTask.count.mockResolvedValue(1);

  const result = await service.findAll('user1', { status: 'all', type: 'all', page: 1, limit: 20 });
  expect(result.items[0].actionRoute).toBe('/documents/doc1');
});
```

Add these zero-fill assertions in the `getStatistics()` test, not the `findAll()` test:

```ts
expect(result.byType.audit_rectification).toBeUndefined();
expect(result.byType.document_renewal).toBe(0);
expect(result.byType.change_execution_failed).toBe(0);
```

Patch `server/src/modules/document/services/document-expiry.service.spec.ts`: expected `relatedId` values become `doc1` and `doc2`, not `expired-link` and `soon-link`.

- [ ] **Step 8: Update front-end Todo types and labels**

Patch `client/src/types/todo.ts`:

```ts
export type TodoType =
  | 'training_attend'
  | 'training_organize'
  | 'approval'
  | 'approval_task'
  | 'equipment_maintain'
  | 'inventory'
  | 'change_request'
  | 'document_renewal'
  | 'change_execution_failed';
```

Patch `client/src/utils/todoPresentation.ts`:

```ts
export const todoTypeLabels: Record<TodoType, string> = {
  training_attend: '培训参加',
  training_organize: '培训组织',
  approval: '审批',
  approval_task: '审批任务',
  equipment_maintain: '设备维护',
  inventory: '盘点',
  change_request: '变更请求',
  document_renewal: '文件复审/续期',
  change_execution_failed: '工艺变更执行异常',
};
```

Patch `client/src/views/my-todos/MyTodos.vue`: remove the `audit_rectification` option and add:

```vue
<el-option label="文件复审/续期" value="document_renewal" />
<el-option label="工艺变更执行异常" value="change_execution_failed" />
```

- [ ] **Step 9: Run focused Todo tests**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test -w server -- todo.service.spec.ts document-expiry.service.spec.ts --runInBand
npx -y -p node@20 -p npm@10 npm run test -w client -- MyTodos.spec.ts
```

Expected: PASS.

- [ ] **Step 10: Run Todo residue scan**

Run:

```bash
rg -n "audit_rectification|/internal-audit/rectifications|documents/business-links" server/src client/src server/test client/src
```

Expected: no output.

- [ ] **Step 11: Commit Todo/schema changes**

Run:

```bash
git status -sb
git add server/src/prisma server/src/modules/todo server/src/modules/document/services/document-expiry.service.ts server/src/modules/document/services/document-expiry.service.spec.ts client/src/types/todo.ts client/src/utils/todoPresentation.ts client/src/views/my-todos
git diff --cached --name-only
git commit -m "refactor: align todo types with retained surfaces"
```

---

## Task 6: Remove Audit Dashboard and Deleted Runtime Residue

**Files:**
- Modify: `server/src/modules/audit/audit.controller.ts`
- Modify: `server/src/modules/audit/audit.service.ts`
- Modify: `server/src/modules/audit/audit.service.spec.ts`
- Modify: `server/test/audit.e2e-spec.ts`
- Modify: `client/src/api/audit.ts`
- Delete or update: tests for `workflow`, `monitoring`, `alert`, and `sso`

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact analysis for `AuditController`, `AuditService`, and `getDashboard`.

Expected: record whether any retained detail routes call `AuditService.getDashboard()`.

- [ ] **Step 2: Remove `/audit/dashboard` route and adapter**

Patch `server/src/modules/audit/audit.controller.ts`: delete the `@Get('dashboard') getDashboard()` method.

Patch `client/src/api/audit.ts`: delete `getDashboardStats()`. If `DashboardStats` is only used by this adapter, delete the type too.

Run:

```bash
rg -n "audit/dashboard|getDashboardStats|DashboardStats" server/src client/src server/test client/e2e
```

Expected after service/test cleanup: no output.

- [ ] **Step 3: Remove dashboard-only service method**

Patch `server/src/modules/audit/audit.service.ts`: delete `getDashboard()` if no retained detail method calls it. If helper logic is shared, split the shared helper first:

```ts
private buildAuditTimeRange(startTime?: Date, endTime?: Date) {
  return {
    gte: startTime,
    lte: endTime,
  };
}
```

Keep retained detail methods such as login logs, permission logs, sensitive logs, search, user timeline, and BRCGS report.

- [ ] **Step 4: Remove dashboard tests**

Patch `server/src/modules/audit/audit.service.spec.ts`: delete the `describe('getDashboard', ...)` block.

Patch `server/test/audit.e2e-spec.ts`: delete the `describe('GET /api/v1/audit/dashboard', ...)` block.

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test -w server -- audit.service.spec.ts audit.e2e-spec.ts --runInBand
```

Expected: PASS or e2e explicitly skips only when required env is absent.

- [ ] **Step 5: Delete stale default tests for removed modules**

Remove these files from default server tests:

```bash
git rm --ignore-unmatch \
  server/test/condition-parser.spec.ts \
  server/test/workflow-advanced.e2e-spec.ts \
  server/test/alert.e2e-spec.ts \
  server/test/monitoring.e2e-spec.ts \
  server/test/monitoring.load.spec.ts \
  server/test/sso.service.spec.ts
```

Patch `server/test/training-service.e2e-spec.ts`: remove `WorkflowInstanceService` import/provider. If the test exists only to assert workflow-backed training approval, delete it. If it tests training service behavior, rewrite it to assert `ApprovalEngineService.startApproval(...)` is called by `submitPlanForApproval()`.

- [ ] **Step 6: Run deleted runtime residue gate**

Run:

```bash
rg -n "changeApproval|WorkflowInstanceService|src/modules/workflow|monitoring/alerts|alertRule|alertHistory|SsoService|internal-audit|management-review|asset-loan|audit/dashboard|getDashboardStats" server/src client/src server/test client/e2e
```

Expected: no output except `server/src/modules/model-landing/generated/model-landing.generated.ts` management-review source-form strings if that generated artifact is explicitly retained by model-landing freeze. If generated source-form strings remain, record them in the PR as retained source-form metadata, not runtime residue.

- [ ] **Step 7: Commit deleted residue cleanup**

Run:

```bash
git add server/src/modules/audit server/test client/src/api/audit.ts
git commit -m "refactor: remove deleted dashboard and runtime residue"
```

---

## Task 7: Fix Front-End `/api/v1` Request Prefix

**Files:**
- Modify: `client/src/views/training/archives/ArchiveList.vue`
- Create: `tools/check-client-api-prefix.sh`
- Modify: `package.json`

- [ ] **Step 1: Run impact scan for direct request**

Run:

```bash
rg -n "request\\.(get|post|put|patch|delete|head|options)\\(\\s*['\\\"]/api/v1/" client/src
```

Expected current hit: `client/src/views/training/archives/ArchiveList.vue`.

- [ ] **Step 2: Patch the request path**

Patch `client/src/views/training/archives/ArchiveList.vue`:

```ts
const departments = await request.get('/departments');
```

Use the existing variable names around the current `request.get('/api/v1/departments')` call. Do not change native `fetch`, upload `action`, `window.open`, or file download URLs in this task.

- [ ] **Step 3: Re-run prefix gate**

Run:

```bash
rg -n "request\\.(get|post|put|patch|delete|head|options)\\(\\s*['\\\"]/api/v1/" client/src
```

Expected: no output.

- [ ] **Step 4: Add mandatory verify gate**

Create `tools/check-client-api-prefix.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

if rg -n "request\\.(get|post|put|patch|delete|head|options)\\(\\s*['\\\"]/api/v1/" client/src; then
  echo "Do not pass /api/v1-prefixed paths to the configured request client." >&2
  exit 1
fi
```

Run:

```bash
chmod +x tools/check-client-api-prefix.sh
```

Patch root `package.json`:

```json
"lint:api-prefix": "bash tools/check-client-api-prefix.sh",
"verify:full": "npm run lint:api-prefix && npm run typecheck:types && npm run build:mcp && npm run build:server && npm run build:client"
```

- [ ] **Step 5: Run focused client build and prefix lint**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run lint:api-prefix
npx -y -p node@20 -p npm@10 npm run build:client
```

Expected: PASS.

- [ ] **Step 6: Commit front-end prefix fix**

Run:

```bash
git add client/src/views/training/archives/ArchiveList.vue tools/check-client-api-prefix.sh package.json
git commit -m "fix: remove duplicated api prefix from client request"
```

---

## Task 8: Repair Backend Tests for Current Product Boundary

**Files:**
- Modify: `server/test/statistics.service.spec.ts`
- Modify: `server/test/statistics.integration.spec.ts`
- Modify: `server/test/model-landing-freeze.spec.ts`
- Modify: `server/test/document.service.spec.ts`
- Modify: document service/module specs listed in hardening spec.
- Modify: `server/src/modules/corrective-action/corrective-action.service.spec.ts`
- Modify: business approval specs touched in Task 4.

- [ ] **Step 1: Run current backend test suite**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test:server -- --runInBand
```

Expected before this task: failures in stale workflow/monitoring/SSO/document/audit/statistics assertions. Save the failing file list.

- [ ] **Step 2: Rewrite statistics tests from workflow to approval**

Patch `server/test/statistics.service.spec.ts` and `server/test/statistics.integration.spec.ts`: replace `workflowInstance` mocks with `approvalInstance` mocks:

```ts
const prisma = {
  approvalInstance: {
    count: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
};
```

Assertions should mention approval instances, not workflow instances. Run:

```bash
npx -y -p node@20 -p npm@10 npm run test -w server -- statistics.service.spec.ts statistics.integration.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 3: Fix model-landing freeze path**

Patch `server/test/model-landing-freeze.spec.ts`: point the design file path to:

```ts
const designPath = path.resolve(
  process.cwd(),
  'archive/superpowers/specs/2026-04-24-model-landing-layer-design.md',
);
```

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test -w server -- model-landing-freeze.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 4: Fix DocumentService provider mocks**

Patch `server/test/document.service.spec.ts` or the affected document spec module so the testing module includes these mocks:

```ts
{
  provide: DocumentControlMetadataService,
  useValue: {
    buildCreateMetadata: jest.fn().mockResolvedValue({}),
    buildUpdateMetadata: jest.fn().mockResolvedValue({}),
  },
},
{
  provide: NumberRuleService,
  useValue: {
    generate: jest.fn().mockResolvedValue('DOC-20260513-001'),
  },
},
{
  provide: ApprovalEngineService,
  useValue: {
    startApproval: jest.fn().mockResolvedValue({ id: 'approval-1' }),
  },
},
```

Use actual imported class names from the current spec. Run:

```bash
npx -y -p node@20 -p npm@10 npm run test -w server -- document.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Remove stale document-control assertions**

For document tests that expect `obsolete`, `confirmRead`, workbench, health, rollback, or old document approval, update them to retained actions: submit unified approval, publish, revise, archive, preview, download, reference health, and record-form landing.

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test -w server -- document --runInBand
```

Expected: retained document tests pass; tests for deleted surfaces are removed.

- [ ] **Step 6: Fix corrective-action internal audit source test**

Patch `server/src/modules/corrective-action/corrective-action.service.spec.ts`: remove internal-audit finding source assertions or replace source with a retained source type used by current corrective-action code.

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test -w server -- corrective-action.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 7: Rewrite business approval tests to callback pattern**

For touched service specs such as equipment, warehouse, product recall, and change event, remove direct service `approve()` route tests and add callback tests. Canonical pattern:

```ts
await registered.get('equipment.maintenanceApproved')!({
  tx,
  instanceId: 'approval-1',
  resourceType: 'maintenance_record',
  resourceId: 'rec-1',
  triggerKey: 'submit',
  actorId: 'reviewer-1',
  taskId: 'task-1',
  comment: '同意',
  metadata: { reviewerSignature: 'sig-url' },
});

expect(tx.maintenanceRecord.update).toHaveBeenCalledWith({
  where: { id: 'rec-1' },
  data: expect.objectContaining({
    status: 'approved',
    reviewerId: 'reviewer-1',
    reviewerSignature: 'sig-url',
  }),
});
```

Run focused specs:

```bash
npx -y -p node@20 -p npm@10 npm run test -w server -- equipment/record.service.spec.ts warehouse/requisition.service.spec.ts warehouse/inbound.service.spec.ts warehouse/services/return.service.spec.ts warehouse/services/scrap.service.spec.ts product-recall.service.spec.ts change-event.module.spec.ts change-event.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 8: Run full backend test suite**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test:server -- --runInBand
```

Expected: PASS. If DB e2e still requires `DATABASE_URL` / `JWT_SECRET`, move those tests behind a separate script such as `test:e2e` and make default `test:server` run only unit tests.

- [ ] **Step 9: Commit backend test repairs**

Run:

```bash
git add server/src server/test server/package.json package.json package-lock.json
git commit -m "test: align backend tests with hardened product boundary"
```

Only include `package.json` / lockfile if scripts changed.

---

## Task 9: Repair Frontend and E2E Tests

**Files:**
- Modify: `client/src/api/__tests__/document-control.spec.ts`
- Modify: `client/src/router/__tests__/product-rnd-menu.spec.ts`
- Modify: `client/src/views/documents/__tests__/DocumentDetail.spec.ts`
- Modify: `client/src/views/incoming-inspection/__tests__/IncomingInspectionList.spec.ts`
- Modify: `client/src/views/templates/__tests__/TemplateEdit.spec.ts`
- Modify: `client/src/views/my-todos/__tests__/MyTodos.spec.ts`
- Delete or update: `client/e2e/health.spec.ts`
- Modify or delete: any E2E specs for removed monitoring, workflow, internal-audit, management-review, asset-loan-record, or SSO pages.

- [ ] **Step 1: Run current client tests**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test:client
```

Expected before this task: failures in document-control, product-rnd-menu, DocumentDetail, IncomingInspectionList, TemplateEdit, and Todo-related tests.

- [ ] **Step 2: Update document-control API tests**

Patch `client/src/api/__tests__/document-control.spec.ts`: remove expectations for `getWorkbench`, document health, read confirmation, rollback, obsolete, export, or deleted governance APIs. Keep tests for retained APIs: file list/detail, preview/download, lifecycle submit/publish/revise/archive, reference health, and record-form landing.

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test -w client -- client/src/api/__tests__/document-control.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Update menu test source**

Patch `client/src/router/__tests__/product-rnd-menu.spec.ts` to import `client/src/navigation/menu.ts` instead of reading `Layout.vue`:

```ts
import { menuItems } from '@/navigation/menu';

it('keeps product R&D menu entries in navigation config', () => {
  const serialized = JSON.stringify(menuItems);
  expect(serialized).toContain('/products');
  expect(serialized).toContain('/product-process-changes');
});
```

Use the actual exported menu variable name from `menu.ts`.

- [ ] **Step 4: Update DocumentDetail expectations**

Patch `client/src/views/documents/__tests__/DocumentDetail.spec.ts`: remove visible assertions for `作废`, `回滚`, and old admin-only branching. Assert current retained actions:

```ts
expect(wrapper.text()).toContain('发起修订');
expect(wrapper.text()).toContain('归档');
expect(wrapper.text()).toContain('预览');
expect(wrapper.text()).toContain('下载');
```

If the current UI labels differ, use the actual retained labels from `DocumentDetail.vue`; do not re-add deleted actions.

- [ ] **Step 5: Update Element Plus select test**

Patch `client/src/views/incoming-inspection/__tests__/IncomingInspectionList.spec.ts`: do not query a native `select`. Use component emitted events or Element Plus stubs:

```ts
await wrapper.findComponent({ name: 'ElSelect' }).vm.$emit('change', 'pending');
await nextTick();
expect(api.findIncomingInspections).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
```

- [ ] **Step 6: Update TemplateEdit import test**

Patch `client/src/views/templates/__tests__/TemplateEdit.spec.ts`: if `handleExcelImport` is no longer exposed, drive the current import interaction through the upload/input component. If import ability was deleted, remove the import assertion and assert save/field editing behavior instead:

```ts
expect(wrapper.text()).toContain('保存');
expect(wrapper.find('[data-test="template-field-list"]').exists()).toBe(true);
```

Add `data-test="template-field-list"` to the view only if no stable selector exists.

- [ ] **Step 7: Update Todo front-end tests**

Patch `client/src/views/my-todos/__tests__/MyTodos.spec.ts`: assert `document_renewal` and `change_execution_failed`, and assert `audit_rectification` is absent:

```ts
expect(wrapper.text()).toContain('文件复审/续期');
expect(wrapper.text()).toContain('工艺变更执行异常');
expect(wrapper.text()).not.toContain('内审整改');
```

- [ ] **Step 8: Remove deleted user-side E2E coverage**

If `client/e2e/health.spec.ts` asserts a user-side health page or health-to-monitoring navigation, delete it:

```bash
git rm --ignore-unmatch client/e2e/health.spec.ts
```

Keep only server-side health probe tests under server test scope.

Run:

```bash
rg -n "/health|monitoring|alert|workflow|internal-audit|management-review|asset-loan|sso" client/e2e
```

Expected: no user-side deleted page E2E remains.

- [ ] **Step 9: Run full client tests**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run test:client
npx -y -p node@20 -p npm@10 npm run build:client
```

Expected: both PASS.

- [ ] **Step 10: Commit frontend tests**

Run:

```bash
git add client/src client/e2e
git commit -m "test: align frontend tests with retained surfaces"
```

---

## Task 10: Dependency Audit Classification

**Files:**
- Modify: `package-lock.json` only if non-breaking audit fixes are applied.
- Modify: relevant `package.json` files only if a non-breaking dependency version is changed.
- Create if high items remain: `docs/superpowers/specs/2026-05-13-post-api-cleanup-audit-risk-register.md`

- [ ] **Step 1: Run audit JSON**

Run:

```bash
npx -y -p node@20 -p npm@10 npm audit --json > /tmp/noidear-audit.json
node -e "const a=require('/tmp/noidear-audit.json'); for (const [name,v] of Object.entries(a.vulnerabilities||{})) if (['high','critical'].includes(v.severity)) console.log(name, v.severity, 'direct=', !!v.isDirect, 'fix=', JSON.stringify(v.fixAvailable));"
```

Expected: list high/critical packages with `fixAvailable`.

- [ ] **Step 2: Apply only non-breaking audit fixes**

Run:

```bash
npx -y -p node@20 -p npm@10 npm audit fix
```

Do not run `npm audit fix --force`.

- [ ] **Step 3: Verify after audit fix**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run verify:full
npx -y -p node@20 -p npm@10 npm run test:server -- --runInBand
npx -y -p node@20 -p npm@10 npm run test:client
```

Expected: all PASS. If dependency changes break verification, revert only the audit-fix dependency changes from this task and proceed to Step 4 with classification:

```bash
git checkout HEAD -- package.json package-lock.json server/package.json client/package.json tools/noidear-mcp/package.json
npx -y -p node@20 -p npm@10 npm ci
```

- [ ] **Step 4: Create risk register if high items remain**

If `npm audit --json` still reports high items, create `docs/superpowers/specs/2026-05-13-post-api-cleanup-audit-risk-register.md`:

```markdown
# Post API Cleanup Audit Risk Register

**Date:** 2026-05-13
**Command:** `npx -y -p node@20 -p npm@10 npm audit --json`

| Package | Severity | Direct | Dependency chain / via | Production impact | Fix available | Decision |
|---------|----------|--------|------------------------|-------------------|---------------|----------|
| package-name | high | yes/no | parent -> package-name | production/dev-only | true/major-version | Classified; upgrade deferred because ... |
```

Fill every high item from `/tmp/noidear-audit.json`. A high item may remain only if the register explains why it is not safely fixable in this task.

- [ ] **Step 5: Commit dependency audit work**

Run:

```bash
git add package.json package-lock.json server/package.json client/package.json tools/noidear-mcp/package.json docs/superpowers/specs/2026-05-13-post-api-cleanup-audit-risk-register.md
git diff --cached --name-only
git commit -m "chore: classify dependency audit risks"
```

Only stage files that actually changed.

---

## Task 11: Final Gates and System Map Regeneration

**Files:**
- Modify: `docs/system-map.html` if regenerated output is expected to be committed.
- No business logic changes unless a gate fails and points to a specific missed file.

- [ ] **Step 1: Regenerate Prisma client**

Run:

```bash
npx gitnexus analyze
npx -y -p node@20 -p npm@10 npm run prisma:generate
```

Expected: GitNexus index refresh and Prisma generation both PASS.

- [ ] **Step 2: Run system map**

Run:

```bash
python3 tools/generate-system-map.py
```

Expected output contains:

```text
api_adapter_missing: 0
direct_client_missing: 0
deleted_scope_frontend_residue: 0
deleted_scope_backend_residue: 0
```

If `docs/system-map.html` changed, inspect it and commit it with final gate changes.

- [ ] **Step 3: Run approval route gate**

Run:

```bash
rg -n "@Post\\(':id/(approve|reject)'\\)|@Post\\('approve'\\)" server/src/modules
```

Expected: only unified approval task controller routes. If any business module route appears, return to Task 4.

- [ ] **Step 4: Run deleted residue gate**

Run:

```bash
rg -n "changeApproval|WorkflowInstanceService|src/modules/workflow|monitoring/alerts|alertRule|alertHistory|SsoService|internal-audit|management-review|asset-loan|audit/dashboard|getDashboardStats" server/src client/src server/test client/e2e
```

Expected: no runtime/default-test residue. Generated model-landing source-form strings may remain only if documented in the PR as retained generated metadata.

- [ ] **Step 5: Run front-end prefix gate**

Run:

```bash
rg -n "request\\.(get|post|put|patch|delete|head|options)\\(\\s*['\\\"]/api/v1/" client/src
```

Expected: no output.

- [ ] **Step 6: Run build and tests**

Run:

```bash
npx -y -p node@20 -p npm@10 npm run verify:full
npx -y -p node@20 -p npm@10 npm run test:server -- --runInBand
npx -y -p node@20 -p npm@10 npm run test:client
```

Expected: all PASS.

- [ ] **Step 7: Run GitNexus change detection before final commit**

Run:

```text
mcp__gitnexus__detect_changes({ "scope": "all", "repo": "noidear" })
```

Expected: affected modules match this plan: unified approval, business approval callbacks, Todo, audit dashboard deletion, tests, audit dependencies, system map. Unexpected modules must be investigated before commit.

- [ ] **Step 8: Check workspace hygiene**

Run:

```bash
git status -sb
git diff --stat
git diff --check
git ls-files --others --exclude-standard
```

Expected: no login state, Playwright report, `dist`, or personal agent config staged or listed as a planned commit.

- [ ] **Step 9: Final commit**

Run:

```bash
git add docs/system-map.html
git commit -m "chore: close post api cleanup hardening gates"
```

If `docs/system-map.html` did not change and all changes were already committed, skip this commit.

- [ ] **Step 10: Prepare branch push**

Run:

```bash
git push --dry-run -u origin codex/post-api-hardening
```

Expected: dry run succeeds. Only run the real push after the user or issue owner confirms the branch should be published:

```bash
git push -u origin codex/post-api-hardening
```

---

## Review Checkpoints

Use these checkpoints even if all work lands in one PR:

1. **Approval checkpoint:** after Tasks 2-4, reviewer checks metadata plumbing, callback coverage, and that no business approve/reject route remains.
2. **Todo/schema checkpoint:** after Task 5, reviewer checks Prisma migration, Todo type parity, and `document_renewal` route.
3. **Deleted residue checkpoint:** after Tasks 6-7, reviewer checks system-map gate, residue `rg`, audit dashboard deletion, and `/api/v1` prefix gate.
4. **Test/dependency checkpoint:** after Tasks 8-10, reviewer checks default test reliability and audit classification.
5. **Final checkpoint:** after Task 11, reviewer checks final verification output, GitNexus detect-changes output, and workspace hygiene.

---

## Self-Review Checklist

- Spec coverage:
  - Unified approval metadata, callback coverage, business route deletion: Tasks 2-4.
  - Todo enum/route/frontend parity and `document_renewal`: Task 5.
  - Audit dashboard and deleted runtime residue: Task 6.
  - `/api/v1` front-end request prefix: Task 7.
  - Backend, frontend, and E2E tests: Tasks 8-9.
  - Dependency audit classification: Task 10.
  - System-map and final gates: Task 11.
- Placeholder scan:
  - No unresolved placeholders and no deferred test task without command.
  - Conditional branches name the exact command and stopping condition.
- Type consistency:
  - `metadata` is `Record<string, unknown>` at DTO boundary.
  - Callback context receives normalized metadata.
  - `ApprovalAction.snapshot.businessDecision` is the persisted audit copy.
  - Todo type list matches server enum and front-end union.
