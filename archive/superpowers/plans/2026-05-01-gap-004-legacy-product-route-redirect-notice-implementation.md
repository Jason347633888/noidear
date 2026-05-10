# GAP-004 Legacy Product Route Redirect Notice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not redesign product routing or reintroduce standalone Recipe/ProcessStep pages. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Show a clear user notice when legacy recipe/process-step URLs redirect to the product workbench.

**Architecture:** Keep the existing redirects to `/products`. Replace silent redirect objects with route-level `beforeEnter` guards that show one Element Plus message and then redirect.

**Tech Stack:** Vue Router, Element Plus.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** GAP-004 属于低风险页面提示，不改 schema、不改业务链；按 `writing-plans` 直接生成小型 implementation plan。
- **grill-me 校准结论：** 已确认不要恢复独立配方/工序页面；只解决“旧 URL 静默跳转让用户无感”的体验问题。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md 或 docs/AGENT_GUIDE.md 冲突，必须停止并回报主 agent，不得猜测实现。

## File Map

- Modify: `client/src/router/index.ts`
- Do not create standalone recipe pages.
- Do not modify product detail or product workbench components.

## Task 1: Add redirect notice helper

**Files:**
- Modify: `client/src/router/index.ts`

- [ ] **Step 1: Import Element Plus message**

At the top of the file, add:

```ts
import { ElMessage } from 'element-plus';
```

- [ ] **Step 2: Add helper below imports**

```ts
const redirectToProductWorkbench = () => {
  ElMessage.info('配方和工序已合并到产品详情/产品工作台，请在产品目录中进入对应产品维护。');
  return '/products';
};
```

## Task 2: Replace silent redirects

**Files:**
- Modify: `client/src/router/index.ts`

- [ ] **Step 1: Replace `/recipes` route**

Replace:

```ts
      {
        path: 'recipes',
        redirect: '/products',
        meta: { hidden: true },
      },
```

with:

```ts
      {
        path: 'recipes',
        beforeEnter: redirectToProductWorkbench,
        meta: { hidden: true },
      },
```

- [ ] **Step 2: Replace `/recipes/:id/edit` route**

Replace:

```ts
      {
        path: 'recipes/:id/edit',
        redirect: '/products',
        meta: { hidden: true },
      },
```

with:

```ts
      {
        path: 'recipes/:id/edit',
        beforeEnter: redirectToProductWorkbench,
        meta: { hidden: true },
      },
```

- [ ] **Step 3: Replace `/process-steps` route**

Replace:

```ts
      {
        path: 'process-steps',
        redirect: '/products',
        meta: { hidden: true },
      },
```

with:

```ts
      {
        path: 'process-steps',
        beforeEnter: redirectToProductWorkbench,
        meta: { hidden: true },
      },
```

## Task 3: Verify and commit

- [ ] **Step 1: Build client**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run build:client
```

Expected: build succeeds, or report the existing unrelated blocker exactly.

- [ ] **Step 2: Confirm scope**

```bash
git diff -- client/src/router/index.ts
```

Expected: only import/helper plus three route redirects changed.

- [ ] **Step 3: Commit**

```bash
git add client/src/router/index.ts
git commit -m "chore: show notice for legacy product routes"
```
