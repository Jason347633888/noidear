# GAP-306 TraceabilityModule 服务注册 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution must happen in an 独立 worktree or Multica 隔离工作目录, never in the main checkout.

**Goal:** 注册并导出追溯查询、联动、导出、平衡四个子服务，修复 TraceabilityModule 的 DI 边界。

**Architecture:** 只修改 Nest module wiring 和 module compile test。`TraceabilityService` 当前接口不重写，GAP-307 再处理完整查询链路。

**Tech Stack:** NestJS, Jest, PrismaService mock, ModelLandingService mock。

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 工作流形成 spec：`docs/superpowers/specs/2026-05-01-gap-306-traceability-module-service-registration-design.md`。
- 已按 `grill-with-docs` 对齐追溯权威文档：本 GAP 是模块接线，不是追溯算法重写。
- 已按 `grill-me` 核对代码：四个服务文件存在，`traceability.module.ts` 未注册它们。
- 本 plan 只允许执行 agent 使用 `superpowers:executing-plans`；不得删除 legacy endpoint，不得实现 GAP-307。
- 执行前必须确认 `pwd` 不是 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，必须在独立 worktree 或 Multica 隔离工作目录。

## Files

- Modify: `server/src/modules/traceability/traceability.module.ts`
- Create: `server/src/modules/traceability/traceability.module.spec.ts`

## Task 1: Add failing module compile test

- [ ] **Step 1: Create `traceability.module.spec.ts`**

```ts
import { Test } from '@nestjs/testing';
import { TraceabilityModule } from './traceability.module';
import { TraceabilityQueryService } from './traceability-query.service';
import { TraceabilityLinkageService } from './traceability-linkage.service';
import { TraceabilityExportService } from './traceability-export.service';
import { TraceabilityBalanceService } from './traceability-balance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ModelLandingService } from '../model-landing/model-landing.service';

describe('TraceabilityModule', () => {
  it('registers traceability sub-services for DI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TraceabilityModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ModelLandingService)
      .useValue({})
      .compile();

    expect(moduleRef.get(TraceabilityQueryService)).toBeInstanceOf(TraceabilityQueryService);
    expect(moduleRef.get(TraceabilityLinkageService)).toBeInstanceOf(TraceabilityLinkageService);
    expect(moduleRef.get(TraceabilityExportService)).toBeInstanceOf(TraceabilityExportService);
    expect(moduleRef.get(TraceabilityBalanceService)).toBeInstanceOf(TraceabilityBalanceService);
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
npm --prefix server test -- traceability.module --runInBand
```

Expected: FAIL because services are not registered or dependencies are not imported.

## Task 2: Register module dependencies and providers

- [ ] **Step 1: Modify imports**

In `server/src/modules/traceability/traceability.module.ts`, add imports:

```ts
import { PrismaModule } from '../../prisma/prisma.module';
import { ModelLandingModule } from '../model-landing/model-landing.module';
import { TraceabilityQueryService } from './traceability-query.service';
import { TraceabilityLinkageService } from './traceability-linkage.service';
import { TraceabilityExportService } from './traceability-export.service';
import { TraceabilityBalanceService } from './traceability-balance.service';
```

- [ ] **Step 2: Update `@Module` metadata**

```ts
@Module({
  imports: [PrismaModule, ModelLandingModule],
  controllers: [TraceabilityController],
  providers: [
    TraceabilityService,
    TraceabilityQueryService,
    TraceabilityLinkageService,
    TraceabilityExportService,
    TraceabilityBalanceService,
  ],
  exports: [
    TraceabilityService,
    TraceabilityQueryService,
    TraceabilityExportService,
    TraceabilityBalanceService,
  ],
})
export class TraceabilityModule {}
```

Do not export `TraceabilityLinkageService` unless another module already needs it; if tests require it, export it too and explain in PR.

- [ ] **Step 3: Run module test**

```bash
npm --prefix server test -- traceability.module --runInBand
```

Expected: PASS.

## Task 3: Run existing traceability focused tests

- [ ] **Step 1: Run focused suite**

```bash
npm --prefix server test -- traceability --runInBand
```

Expected: PASS. If unrelated tests fail due old assertions, do not rewrite algorithms; report exact failing test and only fix module-registration-related issues.

- [ ] **Step 2: Check module wiring diff**

```bash
git diff -- server/src/modules/traceability/traceability.module.ts server/src/modules/traceability/traceability.module.spec.ts
git diff --check
```

Expected: only module wiring and test file changed.

## Task 4: Commit and PR

- [ ] **Step 1: Commit**

```bash
git add server/src/modules/traceability/traceability.module.ts server/src/modules/traceability/traceability.module.spec.ts
git commit -m "fix: register traceability sub-services"
```

- [ ] **Step 2: Push and open PR**

Use branch `codex/gap-306-traceability-module-service-registration`. PR title must include `GAP-306`.
