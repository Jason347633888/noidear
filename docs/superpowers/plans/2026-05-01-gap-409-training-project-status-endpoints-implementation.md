# GAP-409 Training Project Status Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Do not redesign training project status transitions or add new schema fields. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Add backend endpoints used by existing frontend training project status actions.

**Architecture:** Add thin controller methods that delegate to the existing `TrainingService.updateProjectStatus()`. The service remains the single source for state transition validation.

**Tech Stack:** NestJS controller, Jest controller/service tests.

---

## Superpower 与 grill-me 校准记录

- **brainstorming：** 已核对前端调用 `POST /training/projects/:id/start|complete|cancel`，后端仅有 `PUT /projects/:id/status`。
- **grill-me：** 选择补后端语义化端点，避免多个页面改动，同时不复制状态机。
- **writing-plans：** 本计划只加 controller delegating endpoints 和测试。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。

## Files

- Modify: `server/src/modules/training/training.controller.ts`
- Test: `server/src/modules/training/training.controller.spec.ts`（如不存在则创建）

## Task 1: Add Semantic Status Endpoints

- [ ] **Step 1: Confirm current route mismatch**

Run:

```bash
rg -n "startTrainingProject|completeTrainingProject|cancelTrainingProject|projects/:id/status|projects/:id/start|projects/:id/complete|projects/:id/cancel" client/src/api/training.ts server/src/modules/training/training.controller.ts
```

Expected: frontend has three POST helper calls; backend only has `projects/:id/status`.

- [ ] **Step 2: Add controller methods**

In `server/src/modules/training/training.controller.ts`, after `updateProjectStatus()` add:

```ts
  @Post('projects/:id/start')
  @ApiOperation({ summary: '启动培训项目' })
  async startProject(@Param('id') id: string) {
    return this.trainingService.updateProjectStatus(id, 'ongoing');
  }

  @Post('projects/:id/complete')
  @ApiOperation({ summary: '完成培训项目' })
  async completeProject(@Param('id') id: string) {
    return this.trainingService.updateProjectStatus(id, 'completed');
  }

  @Post('projects/:id/cancel')
  @ApiOperation({ summary: '取消培训项目' })
  async cancelProject(@Param('id') id: string) {
    return this.trainingService.updateProjectStatus(id, 'cancelled');
  }
```

Do not persist cancel reason in this PR.

- [ ] **Step 3: Add controller tests**

If `server/src/modules/training/training.controller.spec.ts` does not exist, create it with:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

describe('TrainingController status endpoints', () => {
  let controller: TrainingController;
  const trainingService = {
    updateProjectStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingController],
      providers: [{ provide: TrainingService, useValue: trainingService }],
    }).compile();

    controller = module.get<TrainingController>(TrainingController);
  });

  it('starts a project by setting status to ongoing', async () => {
    trainingService.updateProjectStatus.mockResolvedValue({ id: 'project-1', status: 'ongoing' });
    await expect(controller.startProject('project-1')).resolves.toEqual({ id: 'project-1', status: 'ongoing' });
    expect(trainingService.updateProjectStatus).toHaveBeenCalledWith('project-1', 'ongoing');
  });

  it('completes a project by setting status to completed', async () => {
    trainingService.updateProjectStatus.mockResolvedValue({ id: 'project-1', status: 'completed' });
    await expect(controller.completeProject('project-1')).resolves.toEqual({ id: 'project-1', status: 'completed' });
    expect(trainingService.updateProjectStatus).toHaveBeenCalledWith('project-1', 'completed');
  });

  it('cancels a project by setting status to cancelled', async () => {
    trainingService.updateProjectStatus.mockResolvedValue({ id: 'project-1', status: 'cancelled' });
    await expect(controller.cancelProject('project-1')).resolves.toEqual({ id: 'project-1', status: 'cancelled' });
    expect(trainingService.updateProjectStatus).toHaveBeenCalledWith('project-1', 'cancelled');
  });
});
```

If existing controller constructor or dependencies require more providers, add minimal mocks only. Do not instantiate Prisma.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm --prefix server test -- training.controller --runInBand
```

Expected: PASS.

- [ ] **Step 5: Verify routes are present**

Run:

```bash
rg -n "projects/:id/start|projects/:id/complete|projects/:id/cancel|updateProjectStatus\\(id, 'ongoing'\\)|updateProjectStatus\\(id, 'completed'\\)|updateProjectStatus\\(id, 'cancelled'\\)" server/src/modules/training/training.controller.ts
```

Expected: all three semantic endpoints are present and delegate to `updateProjectStatus`.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/training/training.controller.ts server/src/modules/training/training.controller.spec.ts
git commit -m "fix: add training project status endpoints"
```

## Completion

- Push branch.
- Open PR.
- Include focused test output in PR description.
