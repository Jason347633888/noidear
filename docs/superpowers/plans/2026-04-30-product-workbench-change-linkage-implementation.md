# Product Workbench Change Linkage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the product information workbench so recipe/process/CCP/oven changes reuse existing ChangeEvent and unified approval, then auto-apply one validated product-process change per product.

**Architecture:** Reuse existing `Product`, `Recipe`, `RecipeLine`, `ProcessStep`, `CCPPoint`, `ChangeEvent`, and unified approval models. Add only the missing adapter layer: a product-process change plan table, execution artifact records, validation service, and approval callback integration. Keep official master data in existing business tables; the change plan payload is only the approval-stage proposal.

**Tech Stack:** Vue 3 + Element Plus + Vue Router + Vitest on client; NestJS + Prisma + Jest on server.

---

## File Map

- Modify: `client/src/views/documents/SystemFileLibrary.vue` - stop initial full-document loading and show folder-first empty state.
- Modify: `client/src/views/Layout.vue` - remove `配方管理` and `工序步骤管理` menu entries.
- Modify: `client/src/router/index.ts` - keep legacy recipe/process-step routes non-menu only and add product detail route.
- Modify: `client/src/views/product/ProductList.vue` - replace ambiguous edit entry with detail/status actions.
- Create: `client/src/views/product/ProductDetail.vue` - product workbench showing official data, current plan, and related changes.
- Modify: `client/src/api/product.ts`, `client/src/api/recipe.ts`, `client/src/api/process-step.ts`, `client/src/api/change-event.ts` - add detail/workbench API calls without duplicating data models.
- Modify: `server/src/prisma/schema.prisma` - add product-process change plan and execution artifact adapter tables; add `changeEventId` links where required.
- Add migration under `server/src/prisma/migrations/20260430000000_product_process_change_plan/`.
- Create: `server/src/modules/product-process-change/` - adapter module for plan draft, validation, submission, and auto-apply.
- Modify: `server/src/modules/change-event/change-event.service.ts` - align trigger key to existing `approve_change` and support scope-based default form generation.
- Modify: `server/src/modules/change-event/change-event.module.ts` - call product-process auto-apply from existing `changeEvent.approvalApproved`.
- Modify: `server/src/modules/change-event/change-event-default-form-rules.ts` - support merged form codes by scopes.
- Modify: `server/src/app.module.ts` - register the new adapter module following existing module patterns.

---

### Task 1: Folder-First Document Library And Menu Cleanup

**Files:**
- Modify: `client/src/views/documents/SystemFileLibrary.vue`
- Modify: `client/src/views/Layout.vue`
- Modify: `client/src/router/index.ts`
- Test: `client/src/views/documents/__tests__/SystemFileLibrary.spec.ts`
- Test: add `client/src/router/__tests__/product-rnd-menu.spec.ts`

- [ ] **Step 1: Write failing document library test**

Add this case to `client/src/views/documents/__tests__/SystemFileLibrary.spec.ts`:

```ts
it('does not load documents until a folder is selected', async () => {
  mount(SystemFileLibrary, { global: { stubs } });
  await flushPromises();
  expect(documentControlApi.listDocuments).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain('请选择左侧文件夹查看文件');
});
```

- [ ] **Step 2: Write failing menu test**

Create `client/src/router/__tests__/product-rnd-menu.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('product R&D menu', () => {
  it('keeps only product information and R&D process list in the visible menu source', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/views/Layout.vue'), 'utf8');
    const productSection = source.slice(source.indexOf("title: '产品研发'"), source.indexOf("title: '生产管理'"));
    expect(productSection).toContain("title: '产品信息'");
    expect(productSection).toContain("title: '研发流程列表'");
    expect(productSection).not.toContain('配方管理');
    expect(productSection).not.toContain('工序步骤管理');
  });
});
```

- [ ] **Step 3: Run tests and verify failures**

Run:

```bash
npm run test -w client -- SystemFileLibrary.spec.ts product-rnd-menu.spec.ts
```

Expected: document test fails because `fetchDocuments()` runs on mount; menu test fails because menu still contains `配方管理` and `工序步骤管理`.

- [ ] **Step 4: Implement folder-first state**

In `client/src/views/documents/SystemFileLibrary.vue`:

```vue
<el-empty
  v-if="!filters.sourceFolder"
  description="请选择左侧文件夹查看文件"
/>
<template v-else>
  <el-table :data="documents" v-loading="loading" stripe />
  <div class="pagination" />
</template>
```

Change handlers:

```ts
const searchDocuments = () => {
  if (!filters.sourceFolder) {
    ElMessage.warning('请先选择左侧文件夹');
    return;
  }
  pagination.page = 1;
  fetchDocuments();
};

const handlePageChange = (page: number) => {
  if (!filters.sourceFolder) return;
  pagination.page = page;
  fetchDocuments();
};

const handlePageSizeChange = (limit: number) => {
  if (!filters.sourceFolder) return;
  pagination.limit = limit;
  pagination.page = 1;
  fetchDocuments();
};

onMounted(() => {
  if (route.query.issue === 'expiringExternalFiles') {
    filters.documentType = 'EXTERNAL_FILE';
  }
  if (route.query.issue === 'dueForReview') {
    filters.status = 'effective';
    filters.dueWithinDays = 30;
  }
  if (route.query.issue === 'missingMetadata') {
    filters.issue = 'missingMetadata';
  }
});
```

- [ ] **Step 5: Remove product R&D menu entries**

In `client/src/views/Layout.vue`, make product R&D children:

```ts
children: [
  { path: '/products', title: '产品信息', icon: Goods },
  { path: '/process', title: '研发流程列表', icon: List },
],
```

In `client/src/router/index.ts`, remove direct business entry to `/recipes`, `/recipes/:id/edit`, and `/process-steps` by redirecting these paths to `/products`:

```ts
{
  path: 'recipes',
  redirect: '/products',
  meta: { hidden: true },
},
{
  path: 'recipes/:id/edit',
  redirect: '/products',
  meta: { hidden: true },
},
{
  path: 'process-steps',
  redirect: '/products',
  meta: { hidden: true },
},
```

The old page files may remain on disk during this phase, but users cannot reach them as product R&D editing surfaces.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm run test -w client -- SystemFileLibrary.spec.ts product-rnd-menu.spec.ts
npm run build -w client
```

Expected: tests pass and client build succeeds.

Commit:

```bash
git add client/src/views/documents/SystemFileLibrary.vue client/src/views/Layout.vue client/src/router/index.ts client/src/views/documents/__tests__/SystemFileLibrary.spec.ts client/src/router/__tests__/product-rnd-menu.spec.ts
git commit -m "feat: simplify product research entries"
```

---

### Task 2: Align ChangeEvent With Existing Unified Approval

**Files:**
- Modify: `server/src/modules/change-event/change-event.service.ts`
- Modify: `server/src/modules/change-event/change-event-default-form-rules.ts`
- Test: `server/src/modules/change-event/change-event.service.spec.ts`
- Test: `server/src/modules/change-event/change-event-form-task.service.spec.ts`

- [ ] **Step 1: Write failing trigger-key test**

In `server/src/modules/change-event/change-event.service.spec.ts`, assert:

```ts
expect(approvalEngine.startApproval).toHaveBeenCalledWith(
  expect.objectContaining({
    resourceType: 'change_event',
    triggerKey: 'approve_change',
  }),
);
```

- [ ] **Step 2: Write failing scope form merge test**

In `server/src/modules/change-event/change-event-form-task.service.spec.ts`, add a case that creates default tasks for scopes:

```ts
expect(getDefaultFormCodesForChangeScopes(['recipe', 'process', 'haccp'])).toEqual([
  'GRSS-KF-JL-07',
  'GRSS-KF-JL-08',
  'GRSS-PZ-JL-22',
]);
```

- [ ] **Step 3: Run tests and verify failures**

Run:

```bash
npm run test -w server -- change-event.service.spec.ts change-event-form-task.service.spec.ts --runInBand
```

Expected: trigger-key expectation fails because service uses `submit`; scope helper is missing.

- [ ] **Step 4: Implement trigger-key alignment**

In `server/src/modules/change-event/change-event.service.ts`, change:

```ts
resourceStep: 'submit',
triggerKey: 'approve_change',
```

Keep `resourceType: 'change_event'` and `resourceId: changeEvent.id`.

- [ ] **Step 5: Implement scope form merge helper**

In `server/src/modules/change-event/change-event-default-form-rules.ts`:

```ts
export function getDefaultFormCodesForChangeScopes(scopes: string[]): string[] {
  const normalized = scopes.map((scope) => {
    if (scope === 'process_step') return 'process';
    if (scope === 'oven_temperature' || scope === 'fan_parameter' || scope === 'other_process_parameter') return 'process';
    return scope;
  });

  return Array.from(
    new Set(
      normalized.flatMap((scope) => getDefaultFormCodesForChangeType(scope)),
    ),
  );
}
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm run test -w server -- change-event.service.spec.ts change-event-form-task.service.spec.ts --runInBand
npm run build -w server
```

Expected: tests pass and server build succeeds.

Commit:

```bash
git add server/src/modules/change-event/change-event.service.ts server/src/modules/change-event/change-event-default-form-rules.ts server/src/modules/change-event/*.spec.ts
git commit -m "fix: reuse change approval definition"
```

---

### Task 3: Add Product-Process Change Adapter Schema

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260430000000_product_process_change_plan/migration.sql`
- Test: `server/src/modules/product-process-change/product-process-change.schema.spec.ts`

- [ ] **Step 1: Add schema test**

Create `server/src/modules/product-process-change/product-process-change.schema.spec.ts`:

```ts
import { PrismaClient } from '@prisma/client';

describe('product process change schema', () => {
  it('exposes productProcessChangePlan and changeEventExecution delegates', () => {
    const prisma = new PrismaClient();
    expect(prisma.productProcessChangePlan).toBeDefined();
    expect(prisma.changeEventExecution).toBeDefined();
    expect(prisma.changeEventExecutionArtifact).toBeDefined();
  });
});
```

- [ ] **Step 2: Add Prisma models**

In `server/src/prisma/schema.prisma`, add:

```prisma
model ProductProcessChangePlan {
  id                String      @id @default(cuid())
  company_id        String
  changeEventId     String      @unique
  changeEvent       ChangeEvent @relation(fields: [changeEventId], references: [id], onDelete: Cascade)
  product_id        String
  product           Product     @relation(fields: [product_id], references: [id])
  scopes            Json
  baseRecipeId      String?
  baseRecipeVersion Int?
  status            String      @default("draft")
  payloadJson       Json
  validationResult  Json?
  executionError    String?
  lockedAt          DateTime?
  executedAt        DateTime?
  createdById       String?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@index([product_id, status])
  @@map("product_process_change_plans")
}

model ChangeEventExecution {
  id            String      @id @default(cuid())
  company_id    String
  changeEventId String      @unique
  changeEvent   ChangeEvent @relation(fields: [changeEventId], references: [id], onDelete: Cascade)
  status        String
  executedAt    DateTime?
  errorMessage  String?
  artifacts     ChangeEventExecutionArtifact[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@map("change_event_executions")
}

model ChangeEventExecutionArtifact {
  id            String               @id @default(cuid())
  executionId   String
  execution     ChangeEventExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  resourceType  String
  resourceId    String
  action        String
  beforeSnapshot Json?
  afterSnapshot  Json?
  createdAt     DateTime             @default(now())

  @@index([resourceType, resourceId])
  @@map("change_event_execution_artifacts")
}
```

Add back-relations to `ChangeEvent`:

```prisma
productProcessChangePlan ProductProcessChangePlan?
execution                ChangeEventExecution?
```

Add relation to `Product`:

```prisma
productProcessChangePlans ProductProcessChangePlan[]
```

Add optional source links:

```prisma
// Recipe
changeEventId String?

// ProcessStep
changeEventId String?
```

- [ ] **Step 3: Create migration and generate client**

Run:

```bash
cd server
npm run prisma:migrate -- --name product_process_change_plan
npm run prisma:generate
```

Expected: migration created and Prisma Client exposes new delegates.

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm run test -w server -- product-process-change.schema.spec.ts --runInBand
npm run build -w server
```

Expected: schema test passes and server build succeeds.

Commit:

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations server/src/modules/product-process-change/product-process-change.schema.spec.ts
git commit -m "feat: add product process change adapter schema"
```

---

### Task 4: Implement Product-Process Change Plan Service

**Files:**
- Create: `server/src/modules/product-process-change/product-process-change.module.ts`
- Create: `server/src/modules/product-process-change/product-process-change.controller.ts`
- Create: `server/src/modules/product-process-change/product-process-change.service.ts`
- Create: `server/src/modules/product-process-change/dto/product-process-change.dto.ts`
- Test: `server/src/modules/product-process-change/product-process-change.service.spec.ts`

- [ ] **Step 1: Write failing service tests**

Create tests covering:

```ts
it('rejects a second unfinished plan for the same product', async () => {
  prisma.productProcessChangePlan.findFirst.mockResolvedValue({ id: 'plan-1' });
  await expect(service.createDraft({ productId: 'prod-1', scopes: ['recipe'], payloadJson: {} }, 'u1'))
    .rejects.toThrow('该产品已有未完成的产品工艺变更');
});

it('rejects missing recipe line quantity before submit', async () => {
  await expect(service.submitForApproval('plan-1', 'u1')).rejects.toThrow('配方行用量不能为空');
});

it('starts existing approval only after validation passes', async () => {
  await service.submitForApproval('plan-1', 'u1');
  expect(approvalEngine.startApproval).toHaveBeenCalledWith(expect.objectContaining({
    resourceType: 'change_event',
    triggerKey: 'approve_change',
  }));
});
```

- [ ] **Step 2: Implement DTOs**

Use class-validator:

```ts
export class CreateProductProcessChangeDraftDto {
  @IsString()
  productId!: string;

  @IsArray()
  @ArrayNotEmpty()
  scopes!: string[];

  @IsObject()
  payloadJson!: Record<string, unknown>;
}
```

- [ ] **Step 3: Implement createDraft**

Service behavior:

```ts
const unfinishedStatuses = ['draft', 'pending_approval', 'approved_executing', 'execution_failed'];
const existing = await this.prisma.productProcessChangePlan.findFirst({
  where: { product_id: dto.productId, status: { in: unfinishedStatuses } },
});
if (existing) throw new BadRequestException('该产品已有未完成的产品工艺变更');
```

Then create `ChangeEvent` using existing `ChangeEventService.create()` and create `ProductProcessChangePlan` linked to that change event.

- [ ] **Step 4: Implement validation**

Validation must check:

```ts
if (scopeSet.has('recipe')) {
  for (const line of recipeLines) {
    if (!line.material_id) throw new BadRequestException('配方行物料不能为空');
    if (!line.qty_per_batch) throw new BadRequestException('配方行用量不能为空');
    if (!line.unit) throw new BadRequestException('配方行单位不能为空');
    if (!line.area_id) throw new BadRequestException('配方行配料区不能为空');
  }
}
```

Also validate `Material`, `WorkshopArea`, `Product`, current active `Recipe`, and duplicate `ProcessStep.step_no`.

- [ ] **Step 5: Implement submitForApproval**

After validation succeeds, update plan:

```ts
await tx.productProcessChangePlan.update({
  where: { id: plan.id },
  data: {
    status: 'pending_approval',
    lockedAt: new Date(),
    validationResult: { ok: true },
  },
});
```

Do not implement a new approval table. Refactor `ChangeEventService.create()` into two explicit service methods: `createDraftEvent()` creates `ChangeEvent`, relations, and form tasks without starting approval; `submitForApproval()` starts existing approval with `triggerKey = 'approve_change'`. Product-process draft creation must call `createDraftEvent()`, and product-process submit must call `submitForApproval()`.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm run test -w server -- product-process-change.service.spec.ts --runInBand
npm run build -w server
```

Expected: tests pass and server build succeeds.

Commit:

```bash
git add server/src/modules/product-process-change server/src/modules/change-event/change-event.service.ts server/src/app.module.ts
git commit -m "feat: validate product process change plans"
```

---

### Task 5: Auto-Apply Approved Product-Process Changes

**Files:**
- Modify: `server/src/modules/product-process-change/product-process-change.service.ts`
- Modify: `server/src/modules/change-event/change-event.module.ts`
- Test: `server/src/modules/product-process-change/product-process-change-apply.service.spec.ts`
- Test: `server/src/modules/change-event/change-event.module.spec.ts`

- [ ] **Step 1: Write failing auto-apply tests**

Add tests:

```ts
it('creates a new active recipe and archives previous active recipe in one transaction', async () => {
  await service.applyApprovedChange('change-1', 'approver-1', tx);
  expect(tx.recipe.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ product_id: 'prod-1', status: 'active' }),
    data: { status: 'archived' },
  }));
  expect(tx.recipe.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ product_id: 'prod-1', status: 'active', changeEventId: 'change-1' }),
  }));
});

it('marks plan execution_failed without partial official data when validation fails during apply', async () => {
  await expect(service.applyApprovedChange('change-1', 'approver-1', tx)).rejects.toThrow();
  expect(tx.productProcessChangePlan.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: 'execution_failed' }),
  }));
});
```

- [ ] **Step 2: Implement applyApprovedChange**

Behavior:

```ts
async applyApprovedChange(changeEventId: string, actorId: string, tx: Prisma.TransactionClient) {
  const plan = await tx.productProcessChangePlan.findUnique({ where: { changeEventId } });
  if (!plan) return;
  if (plan.status === 'executed') throw new BadRequestException('产品工艺变更已执行');
  await this.validatePlanPayload(plan, tx);
  // archive old recipe and create new recipe if scope includes recipe
  // update process steps if scope includes process_step / haccp / oven parameters
  // create ChangeEventExecution and artifacts
}
```

- [ ] **Step 3: Integrate existing approval callback**

In `server/src/modules/change-event/change-event.module.ts`, inject `ProductProcessChangeService` and extend the existing callback:

```ts
this.callbacks.register('changeEvent.approvalApproved', async (context: any) => {
  await (context.tx as any).changeApproval.updateMany({
    where: { change_event_id: context.resourceId },
    data: {
      approver_id: context.actorId,
      decision: 'approved',
      comments: context.comment,
      approved_at: new Date(),
    },
  });
  await this.productProcessChangeService.applyApprovedChange(
    context.resourceId,
    context.actorId,
    context.tx,
  );
});
```

This reuses existing approval callback infrastructure.

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm run test -w server -- product-process-change-apply.service.spec.ts change-event.module.spec.ts --runInBand
npm run build -w server
```

Expected: tests pass and server build succeeds.

Commit:

```bash
git add server/src/modules/product-process-change server/src/modules/change-event/change-event.module.ts
git commit -m "feat: auto apply approved product process changes"
```

---

### Task 6: Product Detail Workbench UI

**Files:**
- Create: `client/src/views/product/ProductDetail.vue`
- Modify: `client/src/views/product/ProductList.vue`
- Modify: `client/src/router/index.ts`
- Modify: `client/src/api/product.ts`
- Create: `client/src/api/product-process-change.ts`
- Test: `client/src/views/product/__tests__/ProductDetail.spec.ts`
- Test: `client/src/views/product/__tests__/ProductList.spec.ts`

- [ ] **Step 1: Write failing ProductList navigation test**

In `ProductList.spec.ts`:

```ts
it('opens product detail instead of editing recipe or process directly', async () => {
  const wrapper = mountProductList();
  await flushPromises();
  await wrapper.find('[data-test="product-detail"]').trigger('click');
  expect(router.push).toHaveBeenCalledWith('/products/prod-1');
});
```

- [ ] **Step 2: Write failing ProductDetail test**

Create `ProductDetail.spec.ts`:

```ts
it('shows official data and in-progress plan separately', async () => {
  mockProductApi.getWorkbench.mockResolvedValue({
    product: { id: 'prod-1', name: '椰丝咸蛋糕', status: 'active' },
    currentRecipe: { version: 3, lines: [] },
    processSteps: [],
    activePlan: { status: 'pending_approval', scopes: ['recipe'], payloadJson: {} },
    relatedChanges: [],
  });
  const wrapper = mount(ProductDetail, { global: { stubs } });
  await flushPromises();
  expect(wrapper.text()).toContain('当前正式数据');
  expect(wrapper.text()).toContain('进行中的产品工艺变更方案');
  expect(wrapper.text()).toContain('未生效，不能作为生产依据');
});
```

Add a second ProductDetail test for historical data and related changes:

```ts
it('shows archived recipes and related change events in history sections', async () => {
  mockProductApi.getWorkbench.mockResolvedValue({
    product: { id: 'prod-1', name: '椰丝咸蛋糕', status: 'active' },
    currentRecipe: { id: 'recipe-v4', version: 4, lines: [] },
    archivedRecipes: [{ id: 'recipe-v3', version: 3, status: 'archived', changeEventId: 'change-1' }],
    processSteps: [],
    archivedProcessSteps: [{ id: 'step-old', step_name: '旧烘烤参数', deleted_at: '2026-04-30T00:00:00.000Z' }],
    activePlan: null,
    relatedChanges: [{ id: 'change-1', change_no: 'CE-2026-0001', status: 'executed' }],
  });
  const wrapper = mount(ProductDetail, { global: { stubs } });
  await flushPromises();
  expect(wrapper.text()).toContain('历史版本');
  expect(wrapper.text()).toContain('v3');
  expect(wrapper.text()).toContain('CE-2026-0001');
});
```

- [ ] **Step 3: Add route**

In `client/src/router/index.ts`:

```ts
{
  path: 'products/:id',
  name: 'ProductDetail',
  component: () => import('@/views/product/ProductDetail.vue'),
  meta: { title: '产品详情' },
}
```

- [ ] **Step 4: Add API wrapper**

Create `client/src/api/product-process-change.ts`:

```ts
import request from './request';

export interface ProductProcessChangePlan {
  id: string;
  changeEventId: string;
  productId: string;
  scopes: string[];
  status: string;
  payloadJson: Record<string, unknown>;
}

export const productProcessChangeApi = {
  createDraft(productId: string, payload: { scopes: string[]; payloadJson: Record<string, unknown> }) {
    return request.post<ProductProcessChangePlan>(`/products/${productId}/process-changes`, payload);
  },
  submit(planId: string) {
    return request.post<ProductProcessChangePlan>(`/product-process-changes/${planId}/submit`);
  },
};
```

Extend `client/src/api/product.ts` with a workbench call:

```ts
export interface ProductWorkbench {
  product: Product;
  currentRecipe: unknown | null;
  archivedRecipes: unknown[];
  processSteps: unknown[];
  archivedProcessSteps: unknown[];
  activePlan: unknown | null;
  relatedChanges: unknown[];
}

getWorkbench(id: string) {
  return request.get<ProductWorkbench>(`/products/${id}/workbench`);
}
```

- [ ] **Step 5: Build ProductDetail skeleton**

`ProductDetail.vue` should render:

```vue
<section>
  <h2>当前正式数据</h2>
  <RecipeSummary :recipe="workbench.currentRecipe" />
  <ProcessStepSummary :steps="workbench.processSteps" />
</section>
<section v-if="workbench.activePlan">
  <h2>进行中的产品工艺变更方案</h2>
  <el-alert title="未生效，不能作为生产依据" type="warning" show-icon />
</section>
```

Use local simple tables first; extract child components only if the file becomes difficult to maintain.

Add a base information/status section:

```vue
<section>
  <h2>产品基础信息</h2>
  <el-descriptions :column="2" border>
    <el-descriptions-item label="产品编号">{{ workbench.product.code }}</el-descriptions-item>
    <el-descriptions-item label="产品名称">{{ workbench.product.name }}</el-descriptions-item>
    <el-descriptions-item label="状态">{{ getProductStatusText(workbench.product.status) }}</el-descriptions-item>
    <el-descriptions-item label="来源">{{ workbench.product.source }}</el-descriptions-item>
  </el-descriptions>
  <el-button @click="statusDialogVisible = true">编辑产品状态</el-button>
</section>
```

The status dialog must call the existing `productApi.update()` and only update product master status/name fields, not recipe or process data.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm run test -w client -- ProductList.spec.ts ProductDetail.spec.ts
npm run build -w client
```

Expected: tests pass and client build succeeds.

Commit:

```bash
git add client/src/views/product client/src/api/product-process-change.ts client/src/router/index.ts
git commit -m "feat: add product detail workbench"
```

---

### Task 7: Final Integration Verification

**Files:**
- Modify tests only if integration gaps are found.

- [ ] **Step 1: Run focused server tests**

```bash
npm run test -w server -- change-event.service.spec.ts product-process-change.service.spec.ts product-process-change-apply.service.spec.ts --runInBand
```

Expected: all focused server tests pass.

- [ ] **Step 2: Run focused client tests**

```bash
npm run test -w client -- SystemFileLibrary.spec.ts ProductList.spec.ts ProductDetail.spec.ts
```

Expected: all focused client tests pass.

- [ ] **Step 3: Run builds**

```bash
npm run build:server
npm run build:client
```

Expected: both builds succeed.

- [ ] **Step 4: Manual browser smoke**

Start services using existing project commands, then verify:

1. `/documents` shows folder-first empty state and does not show all documents.
2. Product R&D menu only shows `产品信息` and `研发流程列表`.
3. Product detail shows official recipe/process data and no independent recipe/process edit path.
4. Product detail shows archived recipes, archived/stopped process history, and related ChangeEvent records.
5. Product detail status edit updates only product master-data fields.
6. Directly opening `/recipes`, `/recipes/<id>/edit`, or `/process-steps` redirects to `/products`.
7. Creating a product-process change blocks a second unfinished change for the same product.
8. Submitting incomplete recipe payload is rejected before approval.
9. Approving a valid change auto-applies it and records execution artifacts.

- [ ] **Step 5: Commit final test fixes**

```bash
git status --short
git add <only-files-changed-for-this-plan>
git commit -m "test: verify product process change workflow"
```

---

## Self-Review

- Spec coverage: folder-first document center is covered by Task 1; menu cleanup by Task 1; existing approval reuse by Task 2 and Task 5; product-process plan and validation by Task 3 and Task 4; auto-apply by Task 5; product detail display by Task 6; final verification by Task 7.
- Placeholder scan: no `TBD`, open-ended validation, or unspecified test commands remain.
- Type consistency: plan consistently uses `ProductProcessChangePlan`, `ChangeEventExecution`, `ChangeEventExecutionArtifact`, `scopes`, `payloadJson`, and existing `changeEvent.approvalApproved`.
