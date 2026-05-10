# GAP-100 Incoming Inspection Batch Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use `brainstorming`, `writing-plans`, or subagent dispatch while executing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the incoming-inspection create form's free-text material batch ID field with a searchable `MaterialBatch` selector backed by the existing warehouse batch API.

**Architecture:** Keep the change local to `IncomingInspectionList.vue`: load normal material batches through `batchApi.getList()`, render them in a remote-search Element Plus select, and continue submitting the selected `MaterialBatch.id` as `material_batch_id`. Add a focused Vue unit test so the UI contract is locked before implementation.

**Tech Stack:** Vue 3, Element Plus, TypeScript, Vitest, Vue Test Utils, npm workspaces, existing `/warehouse/batches` API.

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 形成 spec：`docs/superpowers/specs/2026-05-01-gap-100-incoming-inspection-batch-selector-design.md`。
- 已按 `grill-with-docs` 对照 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 校准：`MaterialBatch` 是业务口径 `MaterialLot` 的当前实现名；来料检验必须绑定已有批次主链，不能手填裸 ID。
- 本 plan 只允许执行 agent 使用 `superpowers:executing-plans`。
- 本 plan 不要求执行 agent 重新设计后端合同；如果代码事实与本 plan 冲突，停止并回报主 agent。
- 校准清单结论：
  - 不重复造主数据或批次事实源。
  - 不引入平行批次链路。
  - 不破坏 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链。
  - 不需要迁移历史数据。
  - 不需要用户业务确认。
  - 可拆成独立小 PR。

## Worktree 隔离要求

执行 agent 必须在独立 worktree 或 Multica 隔离工作目录中执行，禁止直接修改主 checkout：

`/Users/jiashenglin/Desktop/好玩的项目/noidear`

开始前必须运行：

```bash
git worktree list --porcelain
pwd
git branch --show-current
git status --short --branch
```

如果 `pwd` 是主 checkout，停止并回报。推荐分支：

```bash
git fetch origin master
git worktree add /Users/jiashenglin/Desktop/好玩的项目/noidear-gap-100-incoming-inspection-batch-selector -b codex/gap-100-incoming-inspection-batch-selector origin/master
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-gap-100-incoming-inspection-batch-selector
```

## 停止条件

- 如果发现仓库已有 `MaterialBatchSelector` 或等价批次选择组件，停止并回报复用方案，不要在页面内再造第二套选择器。
- 如果 `GET /warehouse/batches` 不再支持 `status` 或 `search` 查询参数，停止并回报 API 合同变化。
- 如果执行需要新增 schema、migration 或后端业务代码，停止；本 GAP 不允许这些改动。
- 如果业务要求允许选择 `expired` 或 `locked` 批次，停止并回报；本 plan 默认只选 `status: normal` 批次。
- 如果代码中 `MaterialBatch` 字段名已统一为 `lot_number` 而非 `batchNumber`，只在前端显示 helper 中兼容字段名；不要改后端合同。

## 文件结构

- Modify: `client/src/views/incoming-inspection/IncomingInspectionList.vue`
  - 将新建弹窗的 `material_batch_id` 文本框替换为远程搜索批次选择器。
  - 维护 `batchOptions`、`batchLoading`、`loadBatchOptions()` 和 label/status helper。
  - 保持提交 payload 字段 `material_batch_id` 不变。
- Create: `client/src/views/incoming-inspection/__tests__/IncomingInspectionList.spec.ts`
  - 覆盖批次选择器渲染、打开弹窗加载正常批次、选择批次后提交 `material_batch_id`。
- No change: server schema, migrations, incoming-inspection DTO, warehouse backend services.

## Task 1: Add the failing IncomingInspectionList UI test

**Files:**
- Create: `client/src/views/incoming-inspection/__tests__/IncomingInspectionList.spec.ts`

- [ ] **Step 1: Create the focused spec file**

Create `client/src/views/incoming-inspection/__tests__/IncomingInspectionList.spec.ts` with:

```ts
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import IncomingInspectionList from '../IncomingInspectionList.vue';
import incomingInspectionApi from '@/api/incoming-inspection';
import { batchApi } from '@/api/warehouse';

vi.mock('@/api/incoming-inspection', () => ({
  default: {
    getList: vi.fn(),
    create: vi.fn(),
    getReports: vi.fn(),
  },
  getOverallResultText: (value: string) => ({ pass: '合格', fail: '不合格', conditional_pass: '有条件合格' }[value] || value),
  getOverallResultTagType: (value: string) => (value === 'pass' ? 'success' : value === 'fail' ? 'danger' : 'warning'),
}));

vi.mock('@/api/warehouse', () => ({
  batchApi: {
    getList: vi.fn(),
  },
}));

vi.mock('@/api/file-preview', () => ({
  default: {
    getPreviewInfo: vi.fn(),
  },
}));

const message = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus');
  return {
    ...actual,
    ElMessage: message,
  };
});

const batchRows = [
  {
    id: 'batch-1',
    batchNumber: 'MB-2026-001',
    quantity: 120,
    status: 'normal',
    material: { id: 'mat-1', name: '白砂糖', code: 'M-SUGAR', category: 'raw', unit: 'kg', currentStock: 120, status: 'active', createdAt: '', updatedAt: '' },
    supplier: { id: 'sup-1', name: '合格供应商', code: 'S-001', status: 'active', createdAt: '' },
  },
];

const stubs = {
  'el-card': { template: '<section><slot name="header" /><slot /></section>' },
  'el-button': { template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>', props: ['type', 'loading', 'disabled'] },
  'el-icon': { template: '<i><slot /></i>' },
  'el-table': { template: '<table><slot /></table>', props: ['data', 'loading', 'stripe'] },
  'el-table-column': { template: '<td><slot name="default" :row="{}" /></td>', props: ['prop', 'label', 'width', 'minWidth', 'showOverflowTooltip', 'fixed'] },
  'el-tag': { template: '<span><slot /></span>', props: ['type', 'effect', 'size'] },
  'el-dialog': { template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>', props: ['modelValue', 'title', 'width', 'closeOnClickModal'] },
  'el-form': { template: '<form><slot /></form>', methods: { validate: () => Promise.resolve(true) }, props: ['model', 'rules', 'labelWidth'] },
  'el-form-item': { template: '<label><span>{{ label }}</span><slot /></label>', props: ['label', 'prop'] },
  'el-select': {
    template: '<select :data-placeholder="placeholder" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'placeholder', 'filterable', 'remote', 'remoteMethod', 'loading', 'clearable', 'reserveKeyword', 'style'],
  },
  'el-option': { template: '<option :value="value">{{ label }}</option>', props: ['label', 'value'] },
  'el-input': { template: '<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'type', 'rows', 'style'] },
  'el-input-number': { template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />', props: ['modelValue', 'min', 'placeholder', 'style'] },
  'el-divider': { template: '<hr />', props: ['contentPosition'] },
};

describe('IncomingInspectionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(incomingInspectionApi.getList).mockResolvedValue([]);
    vi.mocked(incomingInspectionApi.create).mockResolvedValue({} as any);
    vi.mocked(batchApi.getList).mockResolvedValue({ list: batchRows, total: 1, page: 1, limit: 20 } as any);
  });

  it('uses a searchable material batch selector instead of a free text batch id input', async () => {
    const wrapper = mount(IncomingInspectionList, { global: { stubs } });
    await flushPromises();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(batchApi.getList).toHaveBeenCalledWith({ page: 1, limit: 20, status: 'normal' });
    expect(wrapper.text()).toContain('物料批次');
    expect(wrapper.text()).not.toContain('物料批次ID');
    expect(wrapper.find('input[placeholder="请输入物料批次 ID"]').exists()).toBe(false);
    expect(wrapper.find('select[data-placeholder="请选择物料批次"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('MB-2026-001 / 白砂糖');
  });

  it('submits the selected MaterialBatch id as material_batch_id', async () => {
    const wrapper = mount(IncomingInspectionList, { global: { stubs } });
    await flushPromises();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    const selects = wrapper.findAll('select');
    await selects[0].setValue('batch-1');
    await selects[1].setValue('pass');

    const confirmButtons = wrapper.findAll('button');
    await confirmButtons[confirmButtons.length - 1].trigger('click');
    await flushPromises();

    expect(incomingInspectionApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        material_batch_id: 'batch-1',
        overall_result: 'pass',
      }),
    );
  });
});
```

- [ ] **Step 2: Run the focused test to confirm it fails**

Run:

```bash
npm run test -w client -- IncomingInspectionList.spec.ts
```

Expected: FAIL because the current component still renders `el-input` with placeholder `请输入物料批次 ID`, does not call `batchApi.getList()`, and does not show `MB-2026-001 / 白砂糖`.

## Task 2: Replace the text field with a searchable batch selector

**Files:**
- Modify: `client/src/views/incoming-inspection/IncomingInspectionList.vue`

- [ ] **Step 1: Import the warehouse batch API and type**

In `client/src/views/incoming-inspection/IncomingInspectionList.vue`, replace the import block around the existing API imports with:

```ts
import incomingInspectionApi, {
  type IncomingInspection,
  type InspectionResult,
  type InspectionReportDocument,
  getOverallResultText,
  getOverallResultTagType,
} from '@/api/incoming-inspection';
import { batchApi, type MaterialBatch } from '@/api/warehouse';
import filePreviewApi from '@/api/file-preview';
```

- [ ] **Step 2: Replace the template field**

Replace the current form item:

```vue
<el-form-item label="物料批次ID" prop="material_batch_id">
  <el-input v-model="createForm.material_batch_id" placeholder="请输入物料批次 ID" />
</el-form-item>
```

with:

```vue
<el-form-item label="物料批次" prop="material_batch_id">
  <el-select
    v-model="createForm.material_batch_id"
    filterable
    remote
    clearable
    reserve-keyword
    :remote-method="loadBatchOptions"
    :loading="batchLoading"
    placeholder="请选择物料批次"
    style="width: 100%"
  >
    <el-option
      v-for="batch in batchOptions"
      :key="batch.id"
      :label="formatBatchOptionLabel(batch)"
      :value="batch.id"
    />
  </el-select>
</el-form-item>
```

- [ ] **Step 3: Add batch selector state**

Below the existing create dialog refs:

```ts
const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();
```

add:

```ts
const batchOptions = ref<MaterialBatch[]>([]);
const batchLoading = ref(false);
```

- [ ] **Step 4: Update validation copy**

Replace:

```ts
const createRules: FormRules = {
  material_batch_id: [{ required: true, message: '请输入物料批次 ID', trigger: 'blur' }],
  overall_result: [{ required: true, message: '请选择总体结论', trigger: 'change' }],
};
```

with:

```ts
const createRules: FormRules = {
  material_batch_id: [{ required: true, message: '请选择物料批次', trigger: 'change' }],
  overall_result: [{ required: true, message: '请选择总体结论', trigger: 'change' }],
};
```

- [ ] **Step 5: Add display and response helpers**

Below `calcPassRate()` add:

```ts
function getBatchNumber(batch: MaterialBatch & { lot_number?: string }): string {
  return batch.batchNumber || batch.lot_number || batch.id;
}

function formatBatchOptionLabel(batch: MaterialBatch & { lot_number?: string }): string {
  const materialName = batch.material?.name || '未知物料';
  const supplierName = batch.supplier?.name || '未知供应商';
  const quantityText = batch.quantity != null ? `剩余 ${batch.quantity}` : '数量未知';
  return `${getBatchNumber(batch)} / ${materialName} / ${supplierName} / ${quantityText}`;
}

function normalizeBatchListResponse(response: unknown): MaterialBatch[] {
  if (Array.isArray(response)) {
    return response as MaterialBatch[];
  }

  const payload = response as { list?: MaterialBatch[]; data?: MaterialBatch[] };
  if (Array.isArray(payload.list)) {
    return payload.list;
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}
```

- [ ] **Step 6: Add batch loading function**

Below the existing `loadList()` function add:

```ts
async function loadBatchOptions(search = '') {
  batchLoading.value = true;
  try {
    const response = await batchApi.getList({
      page: 1,
      limit: 20,
      status: 'normal',
      search: search || undefined,
    } as Parameters<typeof batchApi.getList>[0] & { search?: string });
    batchOptions.value = normalizeBatchListResponse(response);
  } catch {
    ElMessage.error('加载物料批次失败');
  } finally {
    batchLoading.value = false;
  }
}
```

- [ ] **Step 7: Preload selector options when opening the dialog**

Replace:

```ts
function openCreateDialog() {
  createForm.material_batch_id = '';
  createForm.overall_result = '';
  createForm.sample_qty = undefined;
  createForm.sample_unit = '';
  createForm.disposition = '';
  createForm.notes = '';
  createForm.results = [defaultResultRow()];
  createDialogVisible.value = true;
}
```

with:

```ts
function openCreateDialog() {
  createForm.material_batch_id = '';
  createForm.overall_result = '';
  createForm.sample_qty = undefined;
  createForm.sample_unit = '';
  createForm.disposition = '';
  createForm.notes = '';
  createForm.results = [defaultResultRow()];
  createDialogVisible.value = true;
  void loadBatchOptions();
}
```

- [ ] **Step 8: Run the focused test**

Run:

```bash
npm run test -w client -- IncomingInspectionList.spec.ts
```

Expected: PASS. The test confirms `batchApi.getList()` is called with `status: 'normal'`, no free-text batch ID input remains, and submit still sends `material_batch_id`.

## Task 3: Verify contracts and full relevant checks

**Files:**
- Verify only.

- [ ] **Step 1: Run the client unit test file**

Run:

```bash
npm run test -w client -- IncomingInspectionList.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run the existing warehouse batch-management test**

Run:

```bash
npm run test -w client -- BatchManagement.spec.ts
```

Expected: PASS. This guards that the batch status enum remains `normal/expired/locked`.

- [ ] **Step 3: Run a client build check**

Run:

```bash
npm run build:client
```

Expected: PASS with no TypeScript or Vite build errors.

- [ ] **Step 4: Run the GAP-100 E2E command when available**

Run:

```bash
pnpm test:e2e -- --grep GAP-100
```

Expected: PASS if the repository has a GAP-100 E2E spec in the execution environment. If the command fails because `pnpm` is unavailable or no GAP-100 E2E test exists, record the exact failure in the PR and do not mask it as a product failure.

- [ ] **Step 5: Check the changed files**

Run:

```bash
git diff -- client/src/views/incoming-inspection/IncomingInspectionList.vue client/src/views/incoming-inspection/__tests__/IncomingInspectionList.spec.ts
git diff --check
```

Expected: only the incoming-inspection Vue file and its test changed; `git diff --check` reports no whitespace errors.

## Task 4: Commit and PR

**Files:**
- Commit only after Tasks 1-3 pass or documented environment-specific E2E absence is recorded.

- [ ] **Step 1: Confirm no forbidden files changed**

Run:

```bash
git status --short
```

Expected: only these implementation files are changed:

```text
M client/src/views/incoming-inspection/IncomingInspectionList.vue
A client/src/views/incoming-inspection/__tests__/IncomingInspectionList.spec.ts
```

There must be no schema, migration, backend service, or retired planning document changes in the execution PR.

- [ ] **Step 2: Commit the implementation**

Run:

```bash
git add client/src/views/incoming-inspection/IncomingInspectionList.vue client/src/views/incoming-inspection/__tests__/IncomingInspectionList.spec.ts
git commit -m "fix: use material batch selector for incoming inspections"
```

Expected: commit succeeds.

- [ ] **Step 3: Push and open PR**

Run:

```bash
git push -u origin HEAD
```

Expected: branch pushes successfully. Open a PR that references GAP-100 and this plan path:

`docs/superpowers/plans/2026-05-01-gap-100-incoming-inspection-batch-selector-implementation.md`
