# GAP-404 Record Template Fields Update Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the RecordTemplate model during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Close the contract gap between `RecordTemplateDesigner` (client) and `PUT /record-templates/:id/fields` (server) so that field data round-trips without silent corruption and the backend enforces shape with proper DTO validation.

**Architecture:** Introduce a `UpdateFieldsBodyDto` (with nested `FieldDefDto`) on the server to replace the untyped inline `{ fields: Array<Record<string, unknown>> }`. Align the three concrete mismatches: (1) `options` object-vs-string format, (2) `min/max` vs `validRange` nesting, (3) client-missing fields (`unit`, `entity`, `autoFill`, `inspectionRows`, `checklistItems`). The fix is additive on the server side and a non-breaking type alignment on the client side; no DB migration is required.

**Tech Stack:** NestJS (class-validator), Vue 3 (TypeScript), Prisma Client, npm workspaces.

---

## Gap Analysis

### Gap 1 — `options` format mismatch (DATA CORRUPTION RISK)

| Side | Shape |
|------|-------|
| Client (`RecordTemplateField`) | `options?: Array<{ label: string; value: string }>` |
| Server type (`FieldDef`) | `options?: string[]` |

The controller accepts `Record<string, unknown>` so the client's object array IS stored in the DB, but the server's own `FieldDef` type says `string[]`. Any future server-side code that tries to use the type will silently break. **Fix:** Update `FieldDef.options` to `Array<{ label: string; value: string }>` to match what is actually stored.

### Gap 2 — `min/max` vs `validRange` nesting

| Side | Shape |
|------|-------|
| Client (`RecordTemplateField`) | `min?: number; max?: number` (flat on field) |
| Server type (`FieldDef`) | `validRange?: { min?: number; max?: number }` (nested) |

The controller stores whatever the client sends, so `min`/`max` are stored flat, but `FieldDef.validRange` will never be populated. **Fix:** Remove `validRange` from `FieldDef`; add `min?: number; max?: number` to match the stored shape and client contract.

### Gap 3 — `tolerance` / `placeholder` / `pattern` / `patternMessage` on client only

These four fields exist in `RecordTemplateField` but not in server `FieldDef`. They are stored silently in the DB via the untyped `Record<string, unknown>` path. **Fix:** Add them to `FieldDef` so the type matches reality. They are form-rendering metadata and carry no business logic risk.

### Gap 4 — Server-only fields absent from client

`unit`, `entity`, `autoFill`, `inspectionRows`, `checklistItems` exist on `FieldDef` but are unknown to the client. The client sends data for fields it designs; server-only fields are only reachable via `create`/`update` DTO paths that use `fieldsJson` directly (not `updateFields`). **Fix:** Add these fields to client `RecordTemplateField` as optional so the designer can handle all field types.

### Gap 5 — No backend DTO validation

Controller uses raw inline type `{ fields: Array<Record<string, unknown>> }` — no class-validator decorators. `validateFieldsJson()` only checks that `fields` is an array; it does not validate individual field shapes. **Fix:** Create `UpdateFieldsBodyDto` and `FieldDefDto` with class-validator, wire in controller.

### Gap 6 — `FieldsJson` type inconsistency (sections vs flat fields)

Server canonical `FieldsJson` type uses `{ sections: SectionDef[] }` but `updateFields()` stores `{ fields: [...] }` (flat). The `validateFieldsJson()` method also checks for `fieldsJson.fields` (not `sections`). **Fix:** Keep the flat `{ fields }` structure for the `updateFields` path (the designer uses flat fields), and add a clarifying comment to `FieldsJson` that it is the `create`/`update` full-template path format, not the `updateFields` patch path.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-404 生成本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 `RecordTemplate.fieldsJson` 在 DB 中以 JSON 存储，`updateFields` 路径存 `{ fields: [...] }`（扁平），与 `FieldsJson.sections` 规范类型不同；本 GAP 仅对齐客户端与服务端现有约定，不重构模板版本模型。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、schema 或其他 GAP plan 冲突，必须停止并回报主 agent，不得猜测实现。

---

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

**Server — modify:**
- `server/src/modules/record-template/types/fields-json.types.ts`
- `server/src/modules/record-template/record-template.controller.ts`
- `server/src/modules/record-template/record-template.service.ts`

**Server — create:**
- `server/src/modules/record-template/dto/update-fields-body.dto.ts`

**Client — modify:**
- `client/src/api/record-template.ts`

**Do not modify:**
- `server/src/prisma/schema.prisma`
- `server/src/prisma/migrations/**`
- Any other module outside `record-template`

---

## Task 1: Align `FieldDef` server type with stored reality

**Files:**
- Modify: `server/src/modules/record-template/types/fields-json.types.ts`

- [ ] **Step 1: Read the current file**

Run:

```bash
cat server/src/modules/record-template/types/fields-json.types.ts
```

Expected: file exports `FieldType`, `EntityType`, `FieldDef`, `SectionDef`, `ConditionalRule`, `FieldsJson`.

- [ ] **Step 2: Update `FieldDef` to match client contract**

Replace the `FieldDef` interface:

**Before:**
```typescript
export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  unit?: string;
  defaultValue?: unknown;
  options?: string[];
  validRange?: { min?: number; max?: number };
  entity?: EntityType;
  autoFill?: boolean;
  inspectionRows?: Array<{ item: string; standard: string }>;
  checklistItems?: string[];
}
```

**After:**
```typescript
export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  unit?: string;
  defaultValue?: unknown;
  /** Enum / multi-enum options. Stored as label+value objects to support display labels distinct from values. */
  options?: Array<{ label: string; value: string }>;
  /** Numeric range validation. Stored flat on the field (not nested as validRange). */
  min?: number;
  max?: number;
  /** Tolerance band for numeric deviation checks. */
  tolerance?: { type: 'range' | 'percentage'; min: number; max: number };
  /** Form UI rendering hints — no business logic. */
  placeholder?: string;
  pattern?: string;
  patternMessage?: string;
  entity?: EntityType;
  autoFill?: boolean;
  inspectionRows?: Array<{ item: string; standard: string }>;
  checklistItems?: string[];
}
```

- [ ] **Step 3: Add clarifying comment to `FieldsJson` about path scope**

Add a JSDoc comment above `FieldsJson`:

```typescript
/**
 * Full-template fieldsJson shape used by the create/update template DTO paths.
 * The `updateFields` (designer patch) path stores `{ fields: FieldDef[] }` directly —
 * a flat structure without sections — and does NOT use this interface.
 */
export interface FieldsJson {
  sections: SectionDef[];
  conditionalRules?: ConditionalRule[];
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run:

```bash
npm run build:server
```

Expected: PASS. If there are type errors in other files that referenced the old `FieldDef.options: string[]` or `FieldDef.validRange`, fix them as reported — do not suppress errors.

---

## Task 2: Create `UpdateFieldsBodyDto` with class-validator

**Files:**
- Create: `server/src/modules/record-template/dto/update-fields-body.dto.ts`

- [ ] **Step 1: Check existing DTO imports to confirm class-validator is available**

Run:

```bash
head -5 server/src/modules/record-template/dto/create-record-template.dto.ts
```

Expected: imports from `class-validator` and/or `class-transformer`.

- [ ] **Step 2: Create the DTO file**

Create `server/src/modules/record-template/dto/update-fields-body.dto.ts` with this content:

```typescript
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FieldType } from '../types/fields-json.types';

const VALID_FIELD_TYPES: FieldType[] = [
  'text', 'number', 'date', 'datetime', 'boolean',
  'enum', 'multi-enum',
  'inspection-table',
  'checklist',
  'photo',
  'signature',
  'entity-link',
];

export class FieldOptionDto {
  @IsString()
  label: string;

  @IsString()
  value: string;
}

export class FieldDefDto {
  @IsString()
  name: string;

  @IsString()
  label: string;

  @IsString()
  @IsIn(VALID_FIELD_TYPES)
  type: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsString()
  patternMessage?: string;

  @IsOptional()
  @IsBoolean()
  autoFill?: boolean;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsArray()
  inspectionRows?: Array<{ item: string; standard: string }>;

  @IsOptional()
  @IsArray()
  checklistItems?: string[];

  /** tolerance is an object — validated loosely to avoid over-constraint on designer metadata */
  @IsOptional()
  @IsObject()
  tolerance?: { type: string; min: number; max: number };
}

export class UpdateFieldsBodyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefDto)
  fields: FieldDefDto[];
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:

```bash
npm run build:server
```

Expected: PASS.

---

## Task 3: Wire `UpdateFieldsBodyDto` in the controller

**Files:**
- Modify: `server/src/modules/record-template/record-template.controller.ts`

- [ ] **Step 1: Read the current controller `updateFields` handler**

Run:

```bash
grep -n "updateFields\|Put.*fields" server/src/modules/record-template/record-template.controller.ts
```

Expected: a `@Put(':id/fields')` handler with inline body type `{ fields: Array<Record<string, unknown>> }`.

- [ ] **Step 2: Add import for `UpdateFieldsBodyDto`**

Add this import near the top of the file, after existing DTO imports:

```typescript
import { UpdateFieldsBodyDto } from './dto/update-fields-body.dto';
```

- [ ] **Step 3: Replace the inline type with the DTO**

Change the handler from:

```typescript
  @Put(':id/fields')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新草稿模板字段' })
  updateFields(@Param('id') id: string, @Body() body: { fields: Array<Record<string, unknown>> }) {
    return this.templateService.updateFields(id, body.fields);
  }
```

To:

```typescript
  @Put(':id/fields')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新草稿模板字段' })
  updateFields(@Param('id') id: string, @Body() body: UpdateFieldsBodyDto) {
    return this.templateService.updateFields(id, body.fields);
  }
```

- [ ] **Step 4: Confirm NestJS ValidationPipe is globally registered**

Run:

```bash
grep -rn "ValidationPipe\|useGlobalPipes" server/src/main.ts server/src/app.module.ts 2>/dev/null | head -10
```

Expected: `useGlobalPipes(new ValidationPipe(...))` or equivalent in `main.ts`. If not found, check `app.module.ts`. If the global pipe is NOT registered, add it to `main.ts`:

```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

Do not add the global pipe if it already exists — only verify.

- [ ] **Step 5: Build server**

Run:

```bash
npm run build:server
```

Expected: PASS.

---

## Task 4: Update `validateFieldsJson` to remove dead check

**Files:**
- Modify: `server/src/modules/record-template/record-template.service.ts`

- [ ] **Step 1: Read the current `validateFieldsJson` and `updateFields` methods**

Run:

```bash
grep -n "validateFieldsJson\|updateFields" server/src/modules/record-template/record-template.service.ts
```

Expected: `validateFieldsJson` at ~line 305 checks `fieldsJson.fields` is an array.

- [ ] **Step 2: Update `updateFields` service method signature**

Change the method signature from:

```typescript
  async updateFields(id: string, fields: Array<Record<string, unknown>>) {
```

To (import `FieldDef` type from the types file first):

```typescript
  async updateFields(id: string, fields: FieldDef[]) {
```

Add import at the top of the service file if not already present:

```typescript
import { FieldDef } from './types/fields-json.types';
```

- [ ] **Step 3: Build and run existing service tests**

Run:

```bash
npm run build:server
```

Expected: PASS.

---

## Task 5: Align client `RecordTemplateField` type

**Files:**
- Modify: `client/src/api/record-template.ts`

- [ ] **Step 1: Read the current file**

Run:

```bash
cat client/src/api/record-template.ts
```

Expected: `RecordTemplateField` interface with `type: string`, `options?: Array<{ label: string; value: string }>`, `min?: number`, `max?: number`, `tolerance?`, `placeholder?`, `pattern?`, `patternMessage?`.

- [ ] **Step 2: Add missing server-supported field types and tighten `type`**

Replace `RecordTemplateField` interface:

**Before:**
```typescript
export interface RecordTemplateField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
  tolerance?: {
    type: 'range' | 'percentage';
    min: number;
    max: number;
  };
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  pattern?: string;
  patternMessage?: string;
}
```

**After:**
```typescript
export type RecordTemplateFieldType =
  | 'text' | 'number' | 'date' | 'datetime' | 'boolean'
  | 'enum' | 'multi-enum'
  | 'inspection-table'
  | 'checklist'
  | 'photo'
  | 'signature'
  | 'entity-link';

export interface RecordTemplateField {
  name: string;
  label: string;
  type: RecordTemplateFieldType;
  required?: boolean;
  unit?: string;
  min?: number;
  max?: number;
  tolerance?: {
    type: 'range' | 'percentage';
    min: number;
    max: number;
  };
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  pattern?: string;
  patternMessage?: string;
  entity?: string;
  autoFill?: boolean;
  inspectionRows?: Array<{ item: string; standard: string }>;
  checklistItems?: string[];
}
```

- [ ] **Step 3: Verify TypeScript compiles on client**

Run:

```bash
npm run build:client
```

If `TemplateDesigner.vue` or other files pass `type` as a plain string that is not in the union, they will need a cast or enum fix. Fix any type errors in client files that use `RecordTemplateField.type` — do not widen the type back to `string`.

Expected: PASS after any cast fixes.

---

## Task 6: Verify build and run unit tests

**Files:**
- No source edits unless tests or build reveal a mismatch with this plan.

- [ ] **Step 1: Full build**

Run:

```bash
npm run build:server && npm run build:client
```

Expected: PASS.

- [ ] **Step 2: Run record-template service tests if they exist**

Run:

```bash
cd server && npm test -- record-template --runInBand 2>&1 | tail -20
```

Expected: PASS (or "no tests found" if test files do not exist yet — do not create tests in this plan).

- [ ] **Step 3: Verify scope of changes**

Run:

```bash
git status --short
git diff --stat
```

Expected: only the files listed in File Map changed.

---

## Task 7: Commit

**Files:**
- Commit only files changed by this plan.

- [ ] **Step 1: Stage intended files explicitly**

Run:

```bash
git add \
  server/src/modules/record-template/types/fields-json.types.ts \
  server/src/modules/record-template/dto/update-fields-body.dto.ts \
  server/src/modules/record-template/record-template.controller.ts \
  server/src/modules/record-template/record-template.service.ts \
  client/src/api/record-template.ts
```

Expected: only these files staged.

- [ ] **Step 2: Commit**

Run:

```bash
git commit -m "fix: align record template fields update client-server contract (GAP-404)"
```

Expected: commit succeeds.
