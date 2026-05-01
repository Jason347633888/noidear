# GAP-312 Remove Deprecated Trace Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution must happen in an 独立 worktree or Multica 隔离工作目录, never in the main checkout.

**Goal:** Remove deprecated `POST /batch-trace/trace/backward` and `POST /batch-trace/trace/forward` while preserving trace PDF export endpoints.

**Architecture:** Delete `TraceController` and remove it from `BatchTraceModule.controllers`. Add/adjust module tests to assert the deprecated controller is not registered and export controller remains registered.

**Tech Stack:** NestJS, Jest.

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 形成 spec：`docs/superpowers/specs/2026-05-01-gap-312-remove-deprecated-trace-endpoints-design.md`。
- 已按 `grill-with-docs` 对齐追溯权威链：查询入口统一到 `/traceability/query`，旧 batch-trace backward/forward 不再作为公开查询入口。
- 已按 `grill-me` 通过代码核对：`TraceController` 只提供 deprecated backward/forward；`TraceExportController` 另行提供 PDF 导出，必须保留。
- 执行 agent 只允许使用 `superpowers:executing-plans`。
- 执行前必须确认 `pwd` 不是 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，必须在独立 worktree 或 Multica 隔离工作目录。

## Files

- Delete: `server/src/modules/batch-trace/controllers/trace.controller.ts`
- Modify: `server/src/modules/batch-trace/batch-trace.module.ts`
- Create: `server/src/modules/batch-trace/batch-trace.module.spec.ts`

## Task 1: Add module registration test

- [ ] **Step 1: Create module spec**

Create `server/src/modules/batch-trace/batch-trace.module.spec.ts`:

```ts
import { MODULE_METADATA } from '@nestjs/common/constants';
import { BatchTraceModule } from './batch-trace.module';
import { TraceExportController } from './controllers/trace-export.controller';

describe('BatchTraceModule', () => {
  it('keeps trace export controller registered', () => {
    const metadata = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, BatchTraceModule) ?? [];

    expect(metadata).toContain(TraceExportController);
  });

  it('does not register deprecated backward/forward trace controller', () => {
    const metadata = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, BatchTraceModule) ?? [];
    const controllerNames = metadata.map((controller: Function) => controller.name);

    expect(controllerNames).not.toContain('TraceController');
  });
});
```

- [ ] **Step 2: Run test and confirm failure**

```bash
npm run test --workspace server -- batch-trace.module --runInBand
```

Expected: FAIL because `TraceController` is still registered.

## Task 2: Remove deprecated controller

- [ ] **Step 1: Remove import and controller registration**

In `server/src/modules/batch-trace/batch-trace.module.ts`, delete:

```ts
import { TraceController } from './controllers/trace.controller';
```

and remove `TraceController` from the `controllers` array.

- [ ] **Step 2: Delete controller file**

Delete:

```text
server/src/modules/batch-trace/controllers/trace.controller.ts
```

- [ ] **Step 3: Verify no deprecated API calls remain**

```bash
rg "batch-trace/trace/(backward|forward)|TraceController" server/src client/src
```

Expected: no result for `TraceController` or backward/forward endpoint strings. Results for `TraceExportController` or export PDF paths are acceptable.

- [ ] **Step 4: Run targeted tests**

```bash
npm run test --workspace server -- batch-trace.module trace-export --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/batch-trace/batch-trace.module.ts server/src/modules/batch-trace/batch-trace.module.spec.ts
git rm server/src/modules/batch-trace/controllers/trace.controller.ts
git commit -m "chore: remove deprecated batch trace query endpoints"
```
