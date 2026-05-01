# GAP-005 Process Step Relation Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not redesign Product, Recipe, or ProcessStep modeling. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Prevent newly created `ProcessStep` records from being orphaned by requiring at least one of `product_id` or `recipe_id`.

**Architecture:** Keep Prisma fields nullable because product-level and recipe-level process steps are both valid. Add business validation in `ProcessStepService.create()` and focused unit tests around the service.

**Tech Stack:** NestJS service, class-validator DTOs, Prisma service mock, Jest.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-me -> writing-plans` 为 GAP-005 生成轻量 spec 和本 implementation plan。
- **grill-me 校准结论：** 已确认不应把 `product_id` / `recipe_id` 改成 schema 必填；本次只阻止新增孤立工序，不迁移历史数据，不改变产品级工序与配方级工序的合法性。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## File Map

- Modify: `server/src/modules/process-step/process-step.service.ts`
- Add: `server/src/modules/process-step/process-step.service.spec.ts`
- Do not modify: `server/src/prisma/schema.prisma`

## Task 1: Add service-level relation validation

**Files:**
- Modify: `server/src/modules/process-step/process-step.service.ts`

- [ ] **Step 1: Import BadRequestException**

Change the first import to include `BadRequestException`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
```

- [ ] **Step 2: Add a private helper below the constructor**

```ts
  private assertHasProductOrRecipe(productId?: string, recipeId?: string) {
    const hasProduct = typeof productId === 'string' && productId.trim().length > 0;
    const hasRecipe = typeof recipeId === 'string' && recipeId.trim().length > 0;

    if (!hasProduct && !hasRecipe) {
      throw new BadRequestException('工序必须关联产品或配方');
    }
  }
```

- [ ] **Step 3: Call the helper at the top of `create()`**

```ts
  async create(dto: CreateProcessStepDto) {
    this.assertHasProductOrRecipe(dto.product_id, dto.recipe_id);

    return this.prisma.processStep.create({
```

- [ ] **Step 4: Do not change `update()`**

Leave `update()` unchanged. This prevents historical data edits from being blocked by a new create-only rule.

## Task 2: Add focused service tests

**Files:**
- Add: `server/src/modules/process-step/process-step.service.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { BadRequestException } from '@nestjs/common';
import { ProcessStepService } from './process-step.service';

describe('ProcessStepService', () => {
  const prisma = {
    processStep: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: ProcessStepService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProcessStepService(prisma as any);
  });

  const baseDto = {
    step_no: 1,
    step_name: '配料',
    is_ccp: false,
  };

  it('rejects orphan process steps without product_id or recipe_id', async () => {
    await expect(service.create(baseDto as any)).rejects.toThrow(BadRequestException);
    expect(prisma.processStep.create).not.toHaveBeenCalled();
  });

  it('rejects blank product_id and recipe_id', async () => {
    await expect(service.create({ ...baseDto, product_id: ' ', recipe_id: '' } as any)).rejects.toThrow(BadRequestException);
    expect(prisma.processStep.create).not.toHaveBeenCalled();
  });

  it('allows product-level process steps', async () => {
    prisma.processStep.create.mockResolvedValue({ id: 'step-1' });

    await service.create({ ...baseDto, product_id: 'prod-1' } as any);

    expect(prisma.processStep.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ product_id: 'prod-1', recipe_id: undefined }),
      }),
    );
  });

  it('allows recipe-level process steps', async () => {
    prisma.processStep.create.mockResolvedValue({ id: 'step-2' });

    await service.create({ ...baseDto, recipe_id: 'recipe-1' } as any);

    expect(prisma.processStep.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ product_id: undefined, recipe_id: 'recipe-1' }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run the focused test**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- process-step.service.spec.ts
```

Expected: PASS.

## Task 3: Final verification

- [ ] **Step 1: Confirm no schema changes**

```bash
git diff -- server/src/prisma/schema.prisma
```

Expected: no diff.

- [ ] **Step 2: Run formatting/type check if available**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run build
```

Expected: build succeeds, or report the existing unrelated build blocker exactly.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/process-step/process-step.service.ts server/src/modules/process-step/process-step.service.spec.ts
git commit -m "fix: require product or recipe for process steps"
```
