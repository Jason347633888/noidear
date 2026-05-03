# GAP-104 Warehouse Batch Management Menu Visibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the existing `/warehouse/batches` route in the sidebar navigation menu so users can access the BatchManagement page.

**Architecture:** Single-file UI change — add one menu entry to the `menuItems` array in `client/src/views/Layout.vue` under the '仓库管理' group. No backend, schema, or migration changes required.

**Tech Stack:** Vue 3, Element Plus (icon: `Goods` already imported), Vitest for unit tests.

---

## Superpower 与 grill-me 校准记录

- **任务类型：** ready_for_plan（纯前端菜单入口，不改 schema、不改后端）
- **分诊规则命中：** 只改页面展示、入口 → 直接写 implementation plan，使用 `writing-plans`
- **brainstorming：** 不需要（无 schema/追溯/历史数据影响）
- **grill-with-docs：** 不需要（无跨模块业务链影响）
- **是否影响 ProductionBatch / MaterialBatch 主链：** 否（仅导航入口可见性）
- **是否需要迁移历史数据：** 否
- **是否需要业务确认：** 否 — 代码已验证：路由已注册（`client/src/router/index.ts` 第 412 行），页面组件已存在（`client/src/views/warehouse/BatchManagement.vue`），只缺 Layout.vue 菜单入口
- **Worktree 隔离：** 执行 agent 必须在独立 worktree 或 Multica 隔离工作目录执行，禁止写主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear`

---

## 根因分析

`client/src/views/warehouse/BatchManagement.vue` 已实现，`client/src/router/index.ts` 也已注册路由：

```typescript
// client/src/router/index.ts, line 412-415
{
  path: 'warehouse/batches',
  name: 'WarehouseBatches',
  component: () => import('@/views/warehouse/BatchManagement.vue'),
},
```

但 `client/src/views/Layout.vue` 的 `menuItems` 数组中，'仓库管理' 组（约第 205-211 行）只有两个条目：

```typescript
{
  title: '仓库管理',
  icon: Goods,
  children: [
    { path: '/warehouse/materials', title: '物料管理', icon: Goods },
    { path: '/warehouse/suppliers', title: '供应商', icon: Goods },
    // ← /warehouse/batches 缺失
  ],
},
```

用户无法通过菜单导航到批次管理页面，只能通过手动输入 URL 访问。

---

## 文件变更范围

| 文件 | 操作 | 说明 |
|---|---|---|
| `client/src/views/Layout.vue` | 修改 | 在 '仓库管理' children 中新增 `/warehouse/batches` 菜单项 |
| `client/src/views/__tests__/Layout.spec.ts` | 新建（或修改已有） | 验证 '仓库管理' 下包含批次管理条目 |

---

## 执行前检查

执行 agent 必须先运行以下命令，确认不在主 checkout：

```bash
git worktree list --porcelain
pwd
git branch --show-current
git status --short --branch
```

如果 `pwd` 输出为 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，**必须停止并回报，禁止继续修改**。

---

## Tasks

### Task 1: 检查现有 Layout 测试文件

**Files:**
- Read: `client/src/views/__tests__/Layout.spec.ts`（如存在）
- Read: `client/src/views/Layout.vue`（第 150-215 行，确认当前 menuItems 结构）

- [ ] **Step 1: 确认 menuItems 数组中 '仓库管理' 的当前结构**

```bash
grep -n "仓库管理\|warehouse/batches\|warehouse/materials\|warehouse/suppliers" client/src/views/Layout.vue
```

预期输出（确认缺少 batches）：

```
205:    title: '仓库管理',
208:      { path: '/warehouse/materials', title: '物料管理', icon: Goods },
209:      { path: '/warehouse/suppliers', title: '供应商', icon: Goods },
```

- [ ] **Step 2: 确认路由已注册**

```bash
grep -n "warehouse/batches\|BatchManagement" client/src/router/index.ts
```

预期输出：

```
412:        path: 'warehouse/batches',
414:        component: () => import('@/views/warehouse/BatchManagement.vue'),
```

- [ ] **Step 3: 检查是否已有 Layout 单元测试**

```bash
ls client/src/views/__tests__/Layout.spec.ts 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

---

### Task 2: 写失败测试

**Files:**
- Create/Modify: `client/src/views/__tests__/Layout.spec.ts`

- [ ] **Step 1: 写断言 — '仓库管理' 菜单项包含批次管理**

如果 `Layout.spec.ts` 不存在，新建；如果已存在，追加到对应 describe 块。

```typescript
// client/src/views/__tests__/Layout.spec.ts
import { describe, it, expect } from 'vitest'

// 直接从 Layout.vue 导出的 menuItems 做静态验证，
// 无需 mount 完整组件（避免 Element Plus 依赖复杂度）
import Layout from '../Layout.vue'

describe('Layout menuItems', () => {
  // Layout.vue 中 menuItems 是模块级常量，通过组件选项暴露测试
  // 实际路径：从 Layout.vue script setup 中读取 menuItems
  // 注：如果 menuItems 未 export，改为通过 mount + 检查路由路径集合

  it('仓库管理菜单组包含 /warehouse/batches 入口', () => {
    // 从 Layout.vue 的 menuItems 静态数组中取仓库管理组
    // 使用 mount 方式检查 menuItems 中的路径集合
    const { menuItems } = (Layout as any).__setupContext?.exposed ??
      (Layout as any).setup?.() ?? {}

    // 如果 setup 未暴露，退而使用字符串检查（见 Step 2 备注）
    // 本测试通过 menuItems 对象树检验路径存在性
    const warehouseGroup = (menuItems as any[])?.find(
      (g: any) => g.title === '仓库管理'
    )
    expect(warehouseGroup).toBeDefined()
    const paths = warehouseGroup?.children?.map((c: any) => c.path) ?? []
    expect(paths).toContain('/warehouse/batches')
  })
})
```

> **备注：** 若 `menuItems` 在 `<script setup>` 中未通过 `defineExpose` 暴露，上面的 `__setupContext` 访问会返回 undefined。此时按 Step 2 使用更简单的快照测试替代方案。

- [ ] **Step 2: 如果 Step 1 方式无法访问 menuItems，改用以下方案**

检查 `client/src/views/Layout.vue` 是否使用 `<script setup>` 且未 expose：

```bash
grep -n "defineExpose\|menuItems\|<script setup" client/src/views/Layout.vue | head -20
```

如果 menuItems 未 expose，将测试改为：

```typescript
// client/src/views/__tests__/Layout.spec.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Layout.vue menuItems static check', () => {
  it('仓库管理菜单组包含 /warehouse/batches 入口', () => {
    const source = readFileSync(
      resolve(__dirname, '../Layout.vue'),
      'utf-8'
    )
    // 验证 /warehouse/batches 出现在仓库管理 group 内
    // 使用正则确认字符串 '/warehouse/batches' 存在
    expect(source).toContain("'/warehouse/batches'")
  })
})
```

- [ ] **Step 3: 运行测试，确认当前为 FAIL**

```bash
cd client && npx vitest run src/views/__tests__/Layout.spec.ts
```

预期：**FAIL** — `Expected: StringContaining "'/warehouse/batches'"` 或类似失败信息。

---

### Task 3: 实现修复 — 新增菜单入口

**Files:**
- Modify: `client/src/views/Layout.vue`

- [ ] **Step 1: 在 '仓库管理' children 数组中新增批次管理条目**

找到文件中的 '仓库管理' 组（约第 205-211 行），在 `/warehouse/suppliers` 条目之后添加：

修改前：
```typescript
{
  title: '仓库管理',
  icon: Goods,
  children: [
    { path: '/warehouse/materials', title: '物料管理', icon: Goods },
    { path: '/warehouse/suppliers', title: '供应商', icon: Goods },
  ],
},
```

修改后：
```typescript
{
  title: '仓库管理',
  icon: Goods,
  children: [
    { path: '/warehouse/materials', title: '物料管理', icon: Goods },
    { path: '/warehouse/suppliers', title: '供应商', icon: Goods },
    { path: '/warehouse/batches', title: '批次管理', icon: Goods },
  ],
},
```

- [ ] **Step 2: 确认 `Goods` icon 已在文件顶部 import（无需新增导入）**

```bash
grep -n "Goods" client/src/views/Layout.vue | head -5
```

预期：`import { ..., Goods, ... } from '@element-plus/icons-vue'` 已存在。

如果 `Goods` 未导入，在现有 import 行中追加：

```typescript
import { ..., Goods } from '@element-plus/icons-vue'
```

---

### Task 4: 运行测试，确认通过

- [ ] **Step 1: 运行 Layout 测试**

```bash
cd client && npx vitest run src/views/__tests__/Layout.spec.ts
```

预期：**PASS**

- [ ] **Step 2: 运行 BatchManagement 现有测试（回归）**

```bash
cd client && npx vitest run src/views/warehouse/__tests__/BatchManagement.spec.ts
```

预期：**PASS** — 1 test passed（状态枚举值 normal/expired/locked 正确）

- [ ] **Step 3: 运行全量前端单元测试（回归）**

```bash
cd client && npx vitest run --reporter=verbose 2>&1 | tail -20
```

预期：所有测试通过，无新增失败。

---

### Task 5: 类型检查

- [ ] **Step 1: TypeScript 类型检查**

```bash
cd client && npx tsc --noEmit
```

预期：**无 error 输出**（本次修改只添加字符串和对象字面量，不引入新类型）

---

### Task 6: 提交

- [ ] **Step 1: 暂存变更文件**

```bash
git add client/src/views/Layout.vue client/src/views/__tests__/Layout.spec.ts
git status
```

预期：只有这两个文件被暂存。

- [ ] **Step 2: 提交**

```bash
git commit -m "feat: expose /warehouse/batches in sidebar navigation (GAP-104)

Add missing '批次管理' menu entry to the '仓库管理' group in
Layout.vue. The route and BatchManagement component already exist;
only the sidebar entry was absent."
```

- [ ] **Step 3: Push**

```bash
git push origin HEAD
```

---

### Task 7: 创建 PR

- [ ] **Step 1: 创建 PR**

```bash
gh pr create \
  --title "feat: expose /warehouse/batches in sidebar nav (GAP-104)" \
  --body "$(cat <<'EOF'
## Summary

- Adds `{ path: '/warehouse/batches', title: '批次管理', icon: Goods }` to the '仓库管理' menu group in `client/src/views/Layout.vue`
- Route and `BatchManagement.vue` component already exist; this PR only fixes the missing sidebar entry

## GAP

GAP-104 — /warehouse/batches route and BatchManagement page exist but warehouse menu does not expose the route

## Files Changed

- `client/src/views/Layout.vue` — add menu entry
- `client/src/views/__tests__/Layout.spec.ts` — add test asserting entry presence

## Test Plan

- [ ] `npx vitest run src/views/__tests__/Layout.spec.ts` — PASS
- [ ] `npx vitest run src/views/warehouse/__tests__/BatchManagement.spec.ts` — PASS (regression)
- [ ] `npx tsc --noEmit` — no errors
- [ ] Manual: navigate to 仓库管理 → 批次管理 menu entry visible and routes to /warehouse/batches

## Notes

No backend, schema, or migration changes. Pure UI menu entry addition.
EOF
)"
```

- [ ] **Step 2: 记录 PR URL**

输出 PR URL，将其回写到 Multica issue 评论。

---

## 停止条件

如果执行过程中发现以下任一情况，执行 agent 必须**立即停止并回报主 agent**：

1. `pwd` 输出为主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear`
2. `Goods` icon 未在 Layout.vue 中导入，且导入行与其他已有图标行结构不一致（避免错误修改 import）
3. TypeScript 报错无法通过简单修改解决
4. 全量测试中出现与本次修改无关的新增失败（不得擅自修复其他测试）
