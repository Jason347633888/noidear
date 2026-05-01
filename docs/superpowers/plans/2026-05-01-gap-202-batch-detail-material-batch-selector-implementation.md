# GAP-202 BatchDetail Material Batch Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` only to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not use `subagent-driven-development` for this PR.

**Goal:** Replace the BatchDetail old material usage dialog's free-text `materialBatchId` field with a searchable MaterialBatch selector that only submits selected `MaterialBatch.id` values.

**Architecture:** Add a reusable `MaterialBatchSelect.vue` component backed by the existing batch-trace material batch endpoint, extend that endpoint with optional keyword/limit filtering, and wire BatchDetail so recipe line selection controls available material batches. Keep `BatchMaterialUsage` and all traceability schema unchanged.

**Tech Stack:** Vue 3, Element Plus, Vitest, NestJS, Prisma, Jest.

---

## Scope Guard

- This PR must not edit `server/src/prisma/schema.prisma`.
- This PR must not add a migration.
- This PR must not modify `MixingExecution`, `MixingExecutionLine`, or `BatchMixingAggregation` behavior.
- This PR must not change the `materialUsageApi.addUsage()` payload contract.
- If the current code no longer has `BatchDetail.vue` old material usage dialog or no longer exposes `GET /batch-trace/material-batches`, stop and report to the planning agent.

## Worktree Isolation

执行 agent 必须使用独立 worktree 或 Multica 隔离工作目录，禁止直接在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 修改、提交或 push。

Before editing, verify the execution directory:

```bash
git worktree list --porcelain
pwd
git branch --show-current
git status --short --branch
```

Expected:

- `pwd` is not `/Users/jiashenglin/Desktop/好玩的项目/noidear`.
- The branch is an execution branch or a Multica isolated branch.
- The status is clean except for files intentionally changed by the executing agent.

If `pwd` is the main checkout, stop and report. Do not edit, commit, or push from the main checkout.

## Superpower 与 grill-me 校准记录

- `brainstorming` used: yes. The selected design is a reusable `MaterialBatchSelect` plus BatchDetail integration.
- `grill-with-docs` used: yes. The design was checked against `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`.
- `grill-me` used: no. `grill-with-docs` was available and sufficient.
- `writing-plans` used: yes. This file is the handoff plan.
- Domain checks:
  - No new MaterialBatch/MaterialLot fact source is introduced.
  - No parallel traceability chain is introduced.
  - `ProductionBatch -> BatchMaterialUsage -> MaterialBatch` remains the old compatibility chain.
  - Historical data migration is not needed because stored IDs and schema do not change.
  - The PR is independently executable and testable.

## Files

- Modify: `server/src/modules/batch-trace/controllers/material-batch.controller.ts`
- Modify: `server/src/modules/batch-trace/services/material-batch.service.ts`
- Modify: `server/src/modules/batch-trace/services/material-batch.service.spec.ts`
- Modify: `client/src/api/batch.ts`
- Create: `client/src/components/master-data/MaterialBatchSelect.vue`
- Create: `client/src/components/master-data/__tests__/MaterialBatchSelect.spec.ts`
- Modify: `client/src/views/batch-trace/BatchDetail.vue`
- Create: `client/src/views/batch-trace/__tests__/BatchDetail.spec.ts`

## Task 1: Extend MaterialBatch Query For Selector Search

**Files:**

- Modify: `server/src/modules/batch-trace/controllers/material-batch.controller.ts`
- Modify: `server/src/modules/batch-trace/services/material-batch.service.ts`
- Modify: `server/src/modules/batch-trace/services/material-batch.service.spec.ts`

- [ ] **Step 1: Add failing Jest coverage for materialId + keyword + limit**

In `server/src/modules/batch-trace/services/material-batch.service.spec.ts`, add this test under `describe('findAll')`:

```ts
it('should filter by materialId and keyword for selector search', async () => {
  jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue([]);

  await service.findAll({ materialId: 'material-001', keyword: 'SUP-A', limit: 20 });

  expect(prisma.materialBatch.findMany).toHaveBeenCalledWith({
    where: {
      deletedAt: null,
      materialId: 'material-001',
      OR: [
        { batchNumber: { contains: 'SUP-A', mode: 'insensitive' } },
        { material: { is: { name: { contains: 'SUP-A', mode: 'insensitive' } } } },
        { supplier: { is: { name: { contains: 'SUP-A', mode: 'insensitive' } } } },
      ],
    },
    include: {
      material: true,
      supplier: true,
    },
    orderBy: [
      { expiryDate: 'asc' },
      { createdAt: 'asc' },
    ],
    take: 20,
  });
});
```

- [ ] **Step 2: Run the failing backend test**

Run:

```bash
npm run test -w server -- material-batch.service.spec.ts
```

Expected: fail because `MaterialBatchService.findAll()` still accepts only a string and does not build keyword/limit filters.

- [ ] **Step 3: Update the service signature and query**

Change `server/src/modules/batch-trace/services/material-batch.service.ts` `findAll` to:

```ts
interface FindMaterialBatchOptions {
  materialId?: string;
  keyword?: string;
  limit?: number;
}

async findAll(options: FindMaterialBatchOptions = {}) {
  const { materialId, keyword, limit = 20 } = options;
  const where: any = { deletedAt: null };

  if (materialId) {
    where.materialId = materialId;
  }

  const normalizedKeyword = keyword?.trim();
  if (normalizedKeyword) {
    where.OR = [
      { batchNumber: { contains: normalizedKeyword, mode: 'insensitive' } },
      { material: { is: { name: { contains: normalizedKeyword, mode: 'insensitive' } } } },
      { supplier: { is: { name: { contains: normalizedKeyword, mode: 'insensitive' } } } },
    ];
  }

  return this.prisma.materialBatch.findMany({
    where,
    include: {
      material: true,
      supplier: true,
    },
    orderBy: [
      { expiryDate: 'asc' },
      { createdAt: 'asc' },
    ],
    take: Math.min(Math.max(Number(limit) || 20, 1), 50),
  });
}
```

This preserves existing `materialId` filtering and adds deterministic selector ordering.

- [ ] **Step 4: Update the controller query parameters**

Change `server/src/modules/batch-trace/controllers/material-batch.controller.ts` `findAll` to:

```ts
@Get()
findAll(
  @Query('materialId') materialId?: string,
  @Query('keyword') keyword?: string,
  @Query('limit') limit?: string,
) {
  return this.materialBatchService.findAll({
    materialId,
    keyword,
    limit: limit ? Number(limit) : undefined,
  });
}
```

- [ ] **Step 5: Run backend test**

Run:

```bash
npm run test -w server -- material-batch.service.spec.ts
```

Expected: pass.

## Task 2: Add Frontend MaterialBatch API And Selector Component

**Files:**

- Modify: `client/src/api/batch.ts`
- Create: `client/src/components/master-data/MaterialBatchSelect.vue`
- Create: `client/src/components/master-data/__tests__/MaterialBatchSelect.spec.ts`

- [ ] **Step 1: Add failing component test**

Create `client/src/components/master-data/__tests__/MaterialBatchSelect.spec.ts`:

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MaterialBatchSelect from '../MaterialBatchSelect.vue';
import { materialBatchApi } from '@/api/batch';

vi.mock('@/api/batch', () => ({
  materialBatchApi: {
    getList: vi.fn().mockResolvedValue([
      {
        id: 'batch-1',
        batchNumber: 'MB-001',
        quantity: 12,
        expiryDate: '2026-06-30',
        status: 'normal',
        material: { name: '白砂糖' },
        supplier: { name: '供应商A' },
      },
    ]),
  },
}));

const stubs = {
  'el-select': {
    template: '<select :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'disabled', 'remoteMethod', 'loading'],
  },
  'el-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['value', 'label'],
  },
};

describe('MaterialBatchSelect', () => {
  it('loads batches by materialId and renders human-readable labels', async () => {
    const wrapper = mount(MaterialBatchSelect, {
      props: { modelValue: '', materialId: 'material-1' },
      global: { stubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(materialBatchApi.getList).toHaveBeenCalledWith({
      materialId: 'material-1',
      keyword: '',
      limit: 20,
    });
    expect(wrapper.text()).toContain('MB-001 / 白砂糖 / 供应商A / 剩余 12 / 有效期 2026-06-30');
  });

  it('does not load batches when materialId is missing', async () => {
    vi.mocked(materialBatchApi.getList).mockClear();

    mount(MaterialBatchSelect, {
      props: { modelValue: '', materialId: '' },
      global: { stubs },
    });

    await Promise.resolve();

    expect(materialBatchApi.getList).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the failing component test**

Run:

```bash
npm run test -w client -- client/src/components/master-data/__tests__/MaterialBatchSelect.spec.ts
```

Expected: fail because `MaterialBatchSelect.vue` and `materialBatchApi` do not exist.

- [ ] **Step 3: Add material batch API types and method**

Append to `client/src/api/batch.ts` before the Batch Mixing Aggregation section:

```ts
export interface MaterialBatchOption {
  id: string;
  materialId: string;
  batchNumber: string;
  quantity: number;
  expiryDate?: string;
  status: 'normal' | 'expired' | 'locked';
  material?: {
    id: string;
    code?: string;
    name: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
}

export const materialBatchApi = {
  getList(params: { materialId?: string; keyword?: string; limit?: number } = {}) {
    return request.get<MaterialBatchOption[]>('/batch-trace/material-batches', { params });
  },
};
```

- [ ] **Step 4: Create the selector component**

Create `client/src/components/master-data/MaterialBatchSelect.vue`:

```vue
<template>
  <el-select
    :model-value="modelValue"
    filterable
    remote
    clearable
    reserve-keyword
    :disabled="disabled || !materialId"
    placeholder="选择物料批次"
    style="width: 100%"
    :remote-method="search"
    :loading="loading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="batch in options"
      :key="batch.id"
      :label="formatLabel(batch)"
      :value="batch.id"
    />
  </el-select>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { materialBatchApi, type MaterialBatchOption } from '@/api/batch';

const props = defineProps<{
  modelValue?: string;
  materialId?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const loading = ref(false);
const options = ref<MaterialBatchOption[]>([]);

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '-';
}

function formatLabel(batch: MaterialBatchOption) {
  const materialName = batch.material?.name ?? '未知物料';
  const supplierName = batch.supplier?.name ?? '未知供应商';
  return `${batch.batchNumber} / ${materialName} / ${supplierName} / 剩余 ${batch.quantity} / 有效期 ${formatDate(batch.expiryDate)}`;
}

async function search(keyword = '') {
  if (!props.materialId) {
    options.value = [];
    return;
  }

  loading.value = true;
  try {
    const res = await materialBatchApi.getList({
      materialId: props.materialId,
      keyword,
      limit: 20,
    });
    options.value = Array.isArray(res) ? res : [];
  } catch {
    options.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.materialId,
  async (materialId, previousMaterialId) => {
    if (materialId !== previousMaterialId) {
      emit('update:modelValue', '');
    }
    await search();
  },
);

onMounted(() => search());
</script>
```

- [ ] **Step 5: Run component test**

Run:

```bash
npm run test -w client -- client/src/components/master-data/__tests__/MaterialBatchSelect.spec.ts
```

Expected: pass.

## Task 3: Wire The Selector Into BatchDetail

**Files:**

- Modify: `client/src/views/batch-trace/BatchDetail.vue`
- Create: `client/src/views/batch-trace/__tests__/BatchDetail.spec.ts`

- [ ] **Step 1: Add failing BatchDetail test for no free-text ID input**

Create `client/src/views/batch-trace/__tests__/BatchDetail.spec.ts`:

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import BatchDetail from '../BatchDetail.vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'prod-batch-1' } }),
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/api/batch', () => ({
  productionBatchApi: {
    getById: vi.fn().mockResolvedValue({
      id: 'prod-batch-1',
      batchNumber: 'PB-001',
      productName: '蛋糕',
      productCode: 'P001',
      quantity: 100,
      unit: 'kg',
      status: 'in_progress',
      recipeId: 'recipe-1',
      materialUsages: [],
      aggregations: [],
    }),
  },
  materialUsageApi: {
    getByBatch: vi.fn().mockResolvedValue([]),
    addUsage: vi.fn(),
  },
  batchMixingAggregationApi: {
    create: vi.fn(),
    confirm: vi.fn(),
  },
}));

vi.mock('@/api/recipe', () => ({
  recipeApi: {
    getOne: vi.fn().mockResolvedValue({
      lines: [
        {
          id: 'line-1',
          material_id: 'material-1',
          qty_per_batch: 5,
          unit: 'kg',
          area_name_snapshot: '配料区',
        },
      ],
    }),
  },
}));

vi.mock('@/api/request', () => ({
  default: {
    get: vi.fn().mockResolvedValue([]),
  },
}));

const stubs = {
  'el-page-header': { template: '<header />' },
  'el-card': { template: '<section><slot name="header" /><slot /></section>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-descriptions': { template: '<dl><slot /></dl>' },
  'el-descriptions-item': { template: '<dd><slot /></dd>' },
  'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'el-table': { template: '<table><slot /></table>', props: ['data'] },
  'el-table-column': { template: '<td />' },
  'el-empty': { template: '<div />' },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-select': { template: '<select><slot /></select>' },
  'el-option': { template: '<option :value="value">{{ label }}</option>', props: ['value', 'label'] },
  'el-input': { template: '<input :placeholder="placeholder" />', props: ['placeholder'] },
  'el-input-number': { template: '<input type="number" />' },
  MaterialBatchSelect: { template: '<select data-test="material-batch-select" />', props: ['materialId'] },
};

describe('BatchDetail GAP-202 material batch selector', () => {
  it('renders a MaterialBatchSelect instead of a free-text materialBatchId input', async () => {
    const wrapper = mount(BatchDetail, { global: { stubs } });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.find('input[placeholder="请输入物料批次 ID"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="material-batch-select"]').exists()).toBe(true);
  });
});
```

- [ ] **Step 2: Run the failing BatchDetail test**

Run:

```bash
npm run test -w client -- client/src/views/batch-trace/__tests__/BatchDetail.spec.ts
```

Expected: fail because the page still renders the free-text input and does not import `MaterialBatchSelect`.

- [ ] **Step 3: Import the selector and compute selected materialId**

In `client/src/views/batch-trace/BatchDetail.vue`, add imports:

```ts
import { watch } from 'vue';
import MaterialBatchSelect from '@/components/master-data/MaterialBatchSelect.vue';
```

If the existing Vue import line is `import { ref, reactive, computed, onMounted } from 'vue';`, change it to:

```ts
import { ref, reactive, computed, onMounted, watch } from 'vue';
```

Add this computed value after `usageForm`:

```ts
const selectedRecipeLineMaterialId = computed(() => {
  const line = recipeLines.value.find((item) => item.id === usageForm.recipeLineId);
  return line?.material_id ?? '';
});
```

Add this watcher after the computed value:

```ts
watch(
  () => usageForm.recipeLineId,
  () => {
    usageForm.materialBatchId = '';
  },
);
```

- [ ] **Step 4: Replace the text input with the selector**

In `client/src/views/batch-trace/BatchDetail.vue`, replace:

```vue
<el-form-item label="物料批次ID">
  <el-input v-model="usageForm.materialBatchId" placeholder="请输入物料批次 ID" />
</el-form-item>
```

with:

```vue
<el-form-item label="物料批次">
  <MaterialBatchSelect
    v-model="usageForm.materialBatchId"
    :material-id="selectedRecipeLineMaterialId"
    :disabled="!usageForm.recipeLineId"
  />
</el-form-item>
```

- [ ] **Step 5: Run BatchDetail test**

Run:

```bash
npm run test -w client -- client/src/views/batch-trace/__tests__/BatchDetail.spec.ts
```

Expected: pass.

## Task 4: Verification

**Files:**

- All changed files from Tasks 1-3.

- [ ] **Step 1: Run focused backend and frontend tests**

Run:

```bash
npm run test -w server -- material-batch.service.spec.ts
npm run test -w client -- client/src/components/master-data/__tests__/MaterialBatchSelect.spec.ts client/src/views/batch-trace/__tests__/BatchDetail.spec.ts
```

Expected: all focused tests pass.

- [ ] **Step 2: Run requested GAP e2e command**

Run:

```bash
pnpm test:e2e -- --grep GAP-202
```

Expected: GAP-202 e2e passes. If `pnpm` is unavailable in the execution environment, run the workspace equivalent:

```bash
npm run test:e2e -w client -- --grep GAP-202
```

Expected: GAP-202 e2e passes, or if no matching test exists, Playwright reports no matched tests. Report the exact output in the PR.

- [ ] **Step 3: Run static checks for the forbidden text input**

Run:

```bash
rg -n "请输入物料批次 ID|物料批次ID" client/src/views/batch-trace/BatchDetail.vue
```

Expected: no matches.

- [ ] **Step 4: Run diff hygiene**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git status --short
git add server/src/modules/batch-trace/controllers/material-batch.controller.ts server/src/modules/batch-trace/services/material-batch.service.ts server/src/modules/batch-trace/services/material-batch.service.spec.ts client/src/api/batch.ts client/src/components/master-data/MaterialBatchSelect.vue client/src/components/master-data/__tests__/MaterialBatchSelect.spec.ts client/src/views/batch-trace/BatchDetail.vue client/src/views/batch-trace/__tests__/BatchDetail.spec.ts
git commit -m "fix: replace batch detail material batch id input"
```

Expected: commit contains only GAP-202 implementation and tests.

## Stop Conditions

- Stop if `BatchDetail.vue` no longer contains the old material usage dialog, because this plan would be stale.
- Stop if `GET /batch-trace/material-batches` has been removed or replaced by a different authoritative API.
- Stop if implementing keyword search requires Prisma schema changes.
- Stop if the execution branch contains unrelated user changes in the same files and the merge path is unclear.
- Stop if the code facts conflict with this plan; report the conflict to the planning agent instead of improvising.
