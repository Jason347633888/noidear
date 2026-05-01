# GAP-108 Batch Status Enum Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution must happen in an 独立 worktree or Multica 隔离工作目录, never in the main checkout.

**Goal:** Align the warehouse batch management UI with the backend `BatchStatus` enum.

**Architecture:** Update the client API type and the batch management page status options/mappers. Add a focused component test that proves only backend enum values are rendered as filter options.

**Tech Stack:** Vue 3, TypeScript, Element Plus, Vitest.

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 形成 spec：`docs/superpowers/specs/2026-05-01-gap-108-batch-status-enum-sync-design.md`。
- 已按 `grill-with-docs` 对齐主数据文档：状态值必须跟实现事实源 `BatchStatus` 一致，不能在前端维护平行状态。
- 已按 `grill-me` 通过代码核对：schema 为 `normal/expired/locked`，前端仍为 `available/reserved/consumed/expired`。
- 执行 agent 只允许使用 `superpowers:executing-plans`。
- 执行前必须确认 `pwd` 不是 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，必须在独立 worktree 或 Multica 隔离工作目录。

## Files

- Modify: `client/src/api/warehouse.ts`
- Modify: `client/src/views/warehouse/BatchManagement.vue`
- Create: `client/src/views/warehouse/__tests__/BatchManagement.spec.ts`

## Task 1: Add failing UI enum test

- [ ] **Step 1: Create component test**

Create `client/src/views/warehouse/__tests__/BatchManagement.spec.ts`:

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import BatchManagement from '../BatchManagement.vue';

vi.mock('@/api/warehouse', () => ({
  batchApi: {
    getList: vi.fn().mockResolvedValue({ list: [], total: 0 }),
  },
}));

const stubs = {
  'el-card': { template: '<div><slot /><slot name="header" /></div>' },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-select': { template: '<select><slot /></select>', props: ['modelValue'] },
  'el-option': { template: '<option :value=\"value\">{{ label }}</option>', props: ['value', 'label'] },
  'el-button': { template: '<button><slot /></button>' },
  'el-table': { template: '<table><slot /></table>', props: ['data', 'loading', 'stripe'] },
  'el-table-column': { template: '<td><slot /></td>', props: ['prop', 'label', 'width', 'minWidth'] },
  'el-tag': { template: '<span><slot /></span>', props: ['type', 'size'] },
  'el-pagination': { template: '<nav />' },
};

describe('BatchManagement', () => {
  it('uses backend BatchStatus enum values in the status filter', () => {
    const wrapper = mount(BatchManagement, { global: { stubs } });

    const optionValues = wrapper.findAll('option').map((option) => option.attributes('value'));

    expect(optionValues).toEqual(['normal', 'expired', 'locked']);
    expect(optionValues).not.toContain('available');
    expect(optionValues).not.toContain('reserved');
    expect(optionValues).not.toContain('consumed');
  });
});
```

- [ ] **Step 2: Run test and confirm failure**

```bash
npm run test --workspace client -- BatchManagement
```

Expected: FAIL because current options include old values.

## Task 2: Sync frontend enum

- [ ] **Step 1: Update API type**

In `client/src/api/warehouse.ts`, change:

```ts
status: 'available' | 'reserved' | 'consumed' | 'expired';
```

to:

```ts
status: 'normal' | 'expired' | 'locked';
```

- [ ] **Step 2: Update status filter options**

In `client/src/views/warehouse/BatchManagement.vue`, replace the four status options with:

```vue
<el-option value="normal" label="正常" />
<el-option value="expired" label="已过期" />
<el-option value="locked" label="已锁定" />
```

- [ ] **Step 3: Update display mappers**

Replace mapper functions with:

```ts
const batchStatusText = (s: string) => ({ normal: '正常', expired: '已过期', locked: '已锁定' }[s] || s);
const batchStatusType = (s: string) => ({ normal: 'success', expired: 'danger', locked: 'warning' }[s] || 'info');
```

- [ ] **Step 4: Run targeted test**

```bash
npm run test --workspace client -- BatchManagement
```

Expected: PASS.

- [ ] **Step 5: Run type check if available**

```bash
npm run build --workspace client
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/api/warehouse.ts client/src/views/warehouse/BatchManagement.vue client/src/views/warehouse/__tests__/BatchManagement.spec.ts
git commit -m "fix: align batch status filter with backend enum"
```
