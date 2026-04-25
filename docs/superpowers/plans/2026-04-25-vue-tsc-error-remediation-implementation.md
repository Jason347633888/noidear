# vue-tsc Type Error Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all vue-tsc type errors so `npx vue-tsc --noEmit` exits with 0 errors.

**Architecture:** Four independent groups, executed in order: (1) fix AxiosResponse unwrap type mismatch at source in `request.ts`, (2) add Vitest global types via tsconfig, (3) delete unused imports/vars, (4) fix component prop mismatches.

**Tech Stack:** Vue 3 + TypeScript 5.3, Vitest 1.x, axios 1.6, Element Plus 2.5

---

## Error Inventory (241 errors total)

| Code | Count | Category |
|------|-------|----------|
| TS2339 | 112 | `.property` on `AxiosResponse<T>` — interceptor unwraps but types don't |
| TS2322 | 34 | Prop/type mismatches (AxiosResponse + component props) |
| TS6133 | 33 | Declared but never read |
| TS2304 | 18 | Cannot find `vi`, `expect`, `describe`, `it` (Vitest globals) |
| TS2582 | 8 | Cannot find `describe`, `it` (test runner types) |
| TS2345 | 10 | Argument type incompatibility |
| TS7006 | 5 | Implicit `any` |
| TS2305 | 5 | Module has no exported member |
| others | 16 | Misc |

---

## File Map

### Group 1 — AxiosResponse unwrap (modifies `request.ts` and ~15 callsite files)
- Modify: `client/src/api/request.ts` — add typed wrapper methods that return `Promise<T>` directly
- Modify: `client/src/stores/user.ts` — remove `.token`/`.user` property access on raw response
- Modify: `client/src/components/document/DependencyGraph.vue`
- Modify: `client/src/components/document/DocumentLinkSelector.vue`
- Modify: `client/src/components/document/ReferenceBlock.vue`
- Modify: `client/src/components/ExcelViewer.vue`
- Modify: `client/src/components/WordViewer.vue`
- Modify: `client/src/components/FileUpload.vue`
- Modify: `client/src/components/permission/GrantPermissionDialog.vue`
- Modify: `client/src/components/role/RolePermissions.vue`
- Modify: `client/src/components/template/ExcelUpload.vue`
- Modify: `client/src/views/approvals/ApprovalList.vue`
- Modify: `client/src/views/audit/AuditSearchPage.vue`
- Modify: `client/src/views/audit/LoginLogList.vue`

### Group 2 — Vitest globals
- Create: `client/tsconfig.vitest.json`
- Modify: `client/vitest.config.ts` (add `typecheck.tsconfig`)

### Group 3 — Unused vars/imports (batch delete)
- Modify: `client/src/api/__tests__/traceability-contract.spec.ts`
- Modify: `client/src/api/request.ts` (remove unused `AxiosRequestConfig` import — done in Group 1)
- Modify: `client/src/components/__tests__/OfficePreview.spec.ts`
- Modify: `client/src/components/fields/TableInputField.vue`
- Modify: `client/src/components/RecommendedDocuments.vue`
- Modify: `client/src/components/training/__tests__/QuestionCard.spec.ts`
- Modify: `client/src/components/training/LearningRecordTable.vue`
- Modify: `client/src/components/training/QuestionForm.vue`
- Modify: `client/src/router/index.ts`

### Group 4 — Prop type mismatches
- Modify: `client/src/components/__tests__/FilePreviewDialog.spec.ts`
- Modify: `client/src/components/__tests__/OfficePreview.spec.ts`
- Modify: `client/src/components/audit/LogDetailDialog.vue`
- Modify: `client/src/components/FileUploader.vue`
- Modify: `client/src/components/FormBuilder.vue`
- Modify: `client/src/components/fields/TemplateContentField.vue`
- Modify: `client/src/components/training/__tests__/ExamResult.spec.ts`
- Modify: `client/src/components/training/__tests__/QuestionForm.spec.ts`
- Modify: `client/src/main.ts`

---

## Task 1: Fix AxiosResponse unwrap type in `request.ts`

**Files:**
- Modify: `client/src/api/request.ts`

The interceptor unwraps `response.data.data` and returns it. TypeScript still types the result as `AxiosResponse<T>` because axios's type system doesn't know about interceptor transforms. Fix: add typed wrapper methods that declare `Promise<T>` return types.

- [ ] **Step 1: Read current file**

Read `client/src/api/request.ts` fully before editing.

- [ ] **Step 2: Add typed wrapper export**

Replace the final `export default request;` with a typed wrapper. This preserves the underlying axios instance while giving callers correct types:

```typescript
// Typed wrapper so callers get Promise<T> instead of Promise<AxiosResponse<T>>
// The response interceptor already unwraps data, but TypeScript can't see that.
type RequestConfig = Parameters<typeof request.get>[1];

const typedRequest = {
  get<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return request.get(url, config) as unknown as Promise<T>;
  },
  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request.post(url, data, config) as unknown as Promise<T>;
  },
  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request.put(url, data, config) as unknown as Promise<T>;
  },
  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request.patch(url, data, config) as unknown as Promise<T>;
  },
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return request.delete(url, config) as unknown as Promise<T>;
  },
};

export { typedRequest as request };
export default typedRequest;
```

Also remove the unused `AxiosRequestConfig` from the import line:
```typescript
import axios, { AxiosError } from 'axios';
```

- [ ] **Step 3: Run vue-tsc to count remaining AxiosResponse errors**

```bash
cd client && npx vue-tsc --noEmit 2>&1 | grep "AxiosResponse" | wc -l
```

Expected: significantly fewer AxiosResponse errors. The typed wrapper eliminates the source. Callsites that use `import request from '@/api/request'` get the typed wrapper automatically.

- [ ] **Step 4: Fix `stores/user.ts` — `.token` / `.user` on raw response**

Read `client/src/stores/user.ts`. Around lines 33–46, change:
```typescript
// BEFORE (TS thinks loginRes is AxiosResponse)
const token = loginRes.token
const user = loginRes.user
// ...
currentUser.value = await authApi.getProfile()
```
to:
```typescript
// AFTER (loginRes is already LoginResponse after interceptor unwrap)
const token = (loginRes as any).token
const user = (loginRes as any).user
```

Wait — check the actual types first. The `authApi.login()` function likely returns `Promise<LoginResponse>`. If `LoginResponse` has `{ token, user }`, simply ensure `authApi.login()` return type is `Promise<LoginResponse>`. Read the actual file to determine the right fix.

The pattern is: if `authApi.login()` in `client/src/api/auth.ts` is typed as returning `Promise<LoginResponse>` (using the new `typedRequest`), then `loginRes.token` is correct. If it's still typed as `Promise<AxiosResponse<LoginResponse>>`, fix the API file's return annotation.

- [ ] **Step 5: Fix remaining AxiosResponse callsites**

Run:
```bash
cd client && npx vue-tsc --noEmit 2>&1 | grep "AxiosResponse" 2>&1 | head -30
```

For each remaining file, the pattern is the same: the API function returns `AxiosResponse<T>` in its type annotation even though the interceptor unwraps it. Fix by ensuring the API file uses the typed `request` (step 2 already exports it as default, so existing `import request from '@/api/request'` imports just work).

If a specific component still has `AxiosResponse<T>` type errors, it's because it explicitly typed a variable as `AxiosResponse<T>`. Remove that annotation:
```typescript
// BEFORE
const result: AxiosResponse<SomeType> = await someApi.get()
// AFTER
const result = await someApi.get()
```

- [ ] **Step 6: Verify Group 1 complete**

```bash
cd client && npx vue-tsc --noEmit 2>&1 | grep -c "AxiosResponse"
```

Expected: 0.

- [ ] **Step 7: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add client/src/api/request.ts client/src/stores/user.ts \
  client/src/components/document/ client/src/components/ExcelViewer.vue \
  client/src/components/WordViewer.vue client/src/components/FileUpload.vue \
  client/src/components/permission/ client/src/components/role/ \
  client/src/components/template/ client/src/views/approvals/ \
  client/src/views/audit/
git commit -m "fix: 修复AxiosResponse unwrap类型漂移，统一typed request wrapper"
```

---

## Task 2: Add Vitest global types via tsconfig

**Files:**
- Create: `client/tsconfig.vitest.json`
- Modify: `client/vitest.config.ts`

Errors: TS2304 (vi, expect), TS2582 (describe, it) — all in `*.spec.ts` files.

- [ ] **Step 1: Read current vitest config**

```bash
cat client/vitest.config.ts
cat client/tsconfig.app.json
```

- [ ] **Step 2: Create `client/tsconfig.vitest.json`**

```json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "types": ["vitest/globals", "node"],
    "lib": ["ES2021", "DOM"]
  },
  "include": [
    "src/**/__tests__/**/*.ts",
    "src/**/*.spec.ts",
    "src/**/*.test.ts"
  ]
}
```

Note: `"lib": ["ES2021", "DOM"]` fixes the `TS2550: replaceAll` error too — `replaceAll` was added in ES2021.

- [ ] **Step 3: Wire tsconfig into vitest.config.ts**

Add `typecheck` configuration:

```typescript
// In the defineConfig block, add:
test: {
  // ... existing config ...
  typecheck: {
    tsconfig: './tsconfig.vitest.json',
  },
}
```

- [ ] **Step 4: Verify Vitest global errors gone**

```bash
cd client && npx vue-tsc --noEmit -p tsconfig.vitest.json 2>&1 | grep "TS2304\|TS2582" | wc -l
```

Expected: 0 for test files.

Then verify the main app tsconfig still has no new errors:
```bash
cd client && npx vue-tsc --noEmit 2>&1 | grep "TS2304\|TS2582" | wc -l
```

Expected: 0 (spec files are now checked by vitest tsconfig, not app tsconfig).

- [ ] **Step 5: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add client/tsconfig.vitest.json client/vitest.config.ts
git commit -m "fix: 新增tsconfig.vitest.json，修复Vitest全局类型缺失"
```

---

## Task 3: Remove unused imports and variables (batch)

**Files:** See Group 3 file map above.

- [ ] **Step 1: Run vue-tsc and collect all TS6133 errors**

```bash
cd client && npx vue-tsc --noEmit 2>&1 | grep "TS6133\|TS6196"
```

Record each file:line:col and the symbol name.

- [ ] **Step 2: Fix `client/src/api/__tests__/traceability-contract.spec.ts`**

Line 15: `'_check' is declared but never used` — remove the `_check` variable declaration entirely. If it's a destructuring placeholder, prefix with `_` (it already has `_check` which should be recognized by TS, but TS6196 triggers when even `_` prefixed names are unused after assignment). Delete the line.

- [ ] **Step 3: Fix `client/src/components/__tests__/OfficePreview.spec.ts`**

Line 1: `'vi' is declared but never read` and `'beforeEach' is declared but never read`. Remove those named imports from the `import { vi, beforeEach } from 'vitest'` line. With `tsconfig.vitest.json` adding globals, these imports may now be redundant — remove the entire named import if all names are unused.

- [ ] **Step 4: Fix `client/src/components/fields/TableInputField.vue`**

Line 10: `'$index' is declared but never read` — in the template or script. If it's a slot prop, prefix: `_$index` or just remove the destructuring if unused.

- [ ] **Step 5: Fix `client/src/components/RecommendedDocuments.vue`**

Line 48: `'props' is declared but never read` — remove `const props = defineProps(...)` assignment or just use `defineProps(...)` without capturing the result if props are accessed via template directly.

- [ ] **Step 6: Fix `client/src/components/training/__tests__/QuestionCard.spec.ts`**

Line 1: `'beforeEach' is declared but never read` — remove from import.

- [ ] **Step 7: Fix `client/src/components/training/LearningRecordTable.vue`**

Line 70: `'props' is declared but never read` — same as step 5 pattern.

- [ ] **Step 8: Fix `client/src/components/training/QuestionForm.vue`**

Line 118: `'rule' is declared but never read` in a validator function parameter. Prefix: `_rule`.
```typescript
// BEFORE
validator: (rule, value, callback) => {
// AFTER
validator: (_rule, value, callback) => {
```

- [ ] **Step 9: Fix `client/src/router/index.ts`**

Line 848: `'from' is declared but never read` — in a navigation guard callback. Prefix: `_from`.
```typescript
// BEFORE
router.beforeEach((to, from) => {
// AFTER
router.beforeEach((to, _from) => {
```

- [ ] **Step 10: Verify Group 3 complete**

```bash
cd client && npx vue-tsc --noEmit 2>&1 | grep "TS6133\|TS6196" | wc -l
```

Expected: 0.

- [ ] **Step 11: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add client/src/api/__tests__/ client/src/components/__tests__/ \
  client/src/components/fields/ client/src/components/RecommendedDocuments.vue \
  client/src/components/training/ client/src/router/index.ts
git commit -m "fix: 批量清理未使用的import和变量声明"
```

---

## Task 4: Fix component prop type mismatches

**Files:** See Group 4 file map above.

- [ ] **Step 1: Fix `client/src/components/audit/LogDetailDialog.vue`**

Lines 12, 14, 17: `Argument of type 'string | number' is not assignable to parameter of type 'string'`. Read the file. The fix is to coerce to string at the call site:
```typescript
// BEFORE
someFunction(value)  // value is string | number
// AFTER
someFunction(String(value))
```

- [ ] **Step 2: Fix `client/src/components/FileUploader.vue`**

Line 175: missing `status` in `UploadFile`. The object literal needs `status`:
```typescript
// BEFORE
{ name: file.name, url: file.url, uid: file.uid }
// AFTER
{ name: file.name, url: file.url, uid: file.uid, status: 'success' as const }
```

- [ ] **Step 3: Fix `client/src/components/FormBuilder.vue`**

Line 301: `Type 'unknown[]' is not assignable to type 'Arrayable<FormItemRule>'`. Add type assertion:
```typescript
// BEFORE
rules: someArray
// AFTER
rules: someArray as FormItemRule[]
```

Import `FormItemRule` from `element-plus` if not already imported.

- [ ] **Step 4: Fix `client/src/components/fields/TemplateContentField.vue`**

Line 22: `TS2550: replaceAll does not exist`. This is fixed by `tsconfig.vitest.json` adding `"lib": ["ES2021"]`. But that only fixes test files. Check if `tsconfig.app.json` also needs `"lib"` update:

```bash
cat client/tsconfig.app.json | grep lib
```

If `lib` is missing ES2021, add it to `tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "lib": ["ES2021", "DOM", "DOM.Iterable"]
  }
}
```

- [ ] **Step 5: Fix `client/src/components/__tests__/OfficePreview.spec.ts`**

Line 17: `Property 'filename' is missing`. The component requires `filename: string`. Fix the test mount:
```typescript
// BEFORE
wrapper = mount(OfficePreview, { props: {} as any })
// AFTER
wrapper = mount(OfficePreview, { props: { filename: 'test.docx' } })
```

- [ ] **Step 6: Fix `client/src/components/__tests__/FilePreviewDialog.spec.ts`**

Line 126: `'wrapper' is declared but never read`. If wrapper is unused in that test, remove the assignment: `mount(...)` directly without assigning.

- [ ] **Step 7: Fix `client/src/components/training/__tests__/ExamResult.spec.ts`**

Line 17: `Property 'examRecord' is missing in type`. Read the `ExamResultResponse` type definition to see what `examRecord` looks like:

```bash
grep -r "ExamResultResponse" client/src/types/ client/src/components/training/
```

Add the missing field to the test fixture:
```typescript
const mockResult: ExamResultResponse = {
  passed: true,
  score: 90,
  correctCount: 9,
  totalCount: 10,
  remainingAttempts: 2,
  examRecord: {
    // fill required fields from type definition
  },
}
```

Lines 39, 45: `handleRetry`/`handleBack` don't exist on ComponentPublicInstance. These methods are likely `emits`, not exposed methods. Fix by triggering via `wrapper.trigger()` or by emitting:
```typescript
// BEFORE
wrapper.vm.handleRetry()
// AFTER
await wrapper.find('[data-testid="retry-btn"]').trigger('click')
// OR if testing the emit itself:
wrapper.vm.$emit('retry')
```

Read the component to determine the correct approach.

- [ ] **Step 8: Fix `client/src/components/training/__tests__/QuestionForm.spec.ts`**

Line 13: `Property 'modelValue' is missing`. The component uses `v-model` so `modelValue` is a required prop. Fix mount:
```typescript
// BEFORE
mount(QuestionForm, { props: { visible: false, projectId: 'p1', question: null } })
// AFTER
mount(QuestionForm, { props: { modelValue: false, projectId: 'p1', question: null } })
```

Lines 41–61: `Property 'form' does not exist`. Internal component state is not exposed via `defineExpose`. If the tests need internal state, either:
- Add `defineExpose({ form })` to the component (preferred if form is needed for testing)
- Or change the test to test behavior (submit the form) rather than internal state

Read `client/src/components/training/QuestionForm.vue` to decide. Prefer exposing `form` if the component doesn't already do it.

- [ ] **Step 9: Fix `client/src/main.ts`**

Line 5: `Could not find a declaration file for 'element-plus/dist/locale/zh-cn.mjs'`. Add a declaration file:

Create `client/src/types/element-plus-locale.d.ts`:
```typescript
declare module 'element-plus/dist/locale/zh-cn.mjs' {
  const locale: Record<string, unknown>;
  export default locale;
}
```

- [ ] **Step 10: Final vue-tsc verification**

```bash
cd client && npx vue-tsc --noEmit 2>&1
```

Expected: 0 errors. If any remain, read the error message and fix inline.

- [ ] **Step 11: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add client/src/components/ client/src/main.ts client/src/types/ \
  client/tsconfig.app.json
git commit -m "fix: 修复组件Prop类型不匹配、TemplateContentField replaceAll lib升级"
```

---

## Final Verification

- [ ] Run `cd client && npx vue-tsc --noEmit 2>&1 | wc -l`

Expected: 1 (just the empty line). Zero error output.

- [ ] Run `cd client && npm run build` 

Expected: build succeeds (it already did before, verify it still does).

