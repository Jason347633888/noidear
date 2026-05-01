# GAP-501 Auth Profile Method Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Do not redesign auth, roles, guards, or token storage. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make the existing frontend `GET /auth/profile` call match the backend route.

**Architecture:** Keep `AuthController.getProfile()` as the single profile read endpoint. Change only the HTTP method from POST to GET and protect it with the existing `JwtAuthGuard`.

**Tech Stack:** NestJS, Jest, Pinia user store contract.

---

## Superpower 与 grill-me 校准记录

- **brainstorming：** 已核对 `client/src/stores/user.ts` 使用 `request.get('/auth/profile')`，后端当前为 `@Post('profile')`。
- **grill-me：** 不需要业务追问；读取当前登录用户是 GET 语义，前端合同合理。
- **writing-plans：** 本计划只修接口合同和测试，不扩展权限模型。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行补写 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。

## Files

- Modify: `server/src/modules/auth/auth.controller.ts`
- Test: `server/src/modules/auth/auth.controller.spec.ts`（如不存在则创建）

## Task 1: Backend Route Contract

- [ ] **Step 1: Inspect current controller**

Run:

```bash
sed -n '1,80p' server/src/modules/auth/auth.controller.ts
```

Expected: `getProfile()` currently uses `@Post('profile')`.

- [ ] **Step 2: Change profile to GET**

In `server/src/modules/auth/auth.controller.ts`, update the import and decorator:

```ts
import { Controller, Post, Get, Body, UseGuards, Request, Patch } from '@nestjs/common';
```

```ts
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }
```

- [ ] **Step 3: Add controller test**

If `server/src/modules/auth/auth.controller.spec.ts` does not exist, create it with:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            changePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('returns the authenticated user profile', async () => {
    const user = {
      userId: 'user-1',
      id: 'user-1',
      username: 'admin',
      role: 'admin',
      companyId: '1',
    };

    await expect(controller.getProfile({ user } as any)).resolves.toBe(user);
  });
});
```

- [ ] **Step 4: Verify focused tests**

Run:

```bash
npm --prefix server test -- auth.controller --runInBand
```

Expected: PASS.

- [ ] **Step 5: Verify no frontend contract change was needed**

Run:

```bash
rg -n "auth/profile|Post\\('profile'\\)|Get\\('profile'\\)" client/src/stores/user.ts server/src/modules/auth/auth.controller.ts
```

Expected: frontend still uses `request.get('/auth/profile')`; backend shows `@Get('profile')`.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/auth/auth.controller.ts server/src/modules/auth/auth.controller.spec.ts
git commit -m "fix: align auth profile route with frontend"
```

## Completion

- Push branch.
- Open PR.
- In PR description, include verification command output.
