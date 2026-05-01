# GAP-205 FinishedGoodsBatch 残留清理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution must happen in an 独立 worktree or Multica 隔离工作目录, never in the main checkout.

**Goal:** 阻止新 RecordTemplate 继续写入 `finished_goods` 批次类型，同时保留历史兼容读取。

**Architecture:** 将 RecordTemplate create/update DTO 的 `batchLinkType` 枚举收敛为 `production`；`RecordService` 保留历史 `finished_goods` 映射但补注释；schema 注释改成 ProductionBatch 口径。

**Tech Stack:** NestJS, class-validator, Prisma schema comments, Jest。

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 工作流形成 spec：`docs/superpowers/specs/2026-05-01-gap-205-finished-goods-residual-cleanup-design.md`。
- 已按 `grill-with-docs` 对齐主数据文档：`ProductionBatch` 是终端批次节点，`FinishedGoodsBatch` 不再作为业务层概念。
- 已按 `grill-me` 核对代码：运行时代码残留主要在 RecordTemplate DTO、RecordService 兼容逻辑、schema 注释。
- 本 plan 只允许执行 agent 使用 `superpowers:executing-plans`，不得删除历史表或写 destructive migration。
- 执行前必须确认 `pwd` 不是 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，必须在独立 worktree 或 Multica 隔离工作目录。

## Files

- Modify: `server/src/modules/record-template/dto/create-record-template.dto.ts`
- Modify: `server/src/modules/record-template/dto/update-record-template.dto.ts`
- Modify: `server/src/modules/record-template/types/fields-json.types.ts`
- Modify: `server/src/modules/record/record.service.ts`
- Modify: `server/src/prisma/schema.prisma`
- Test: add or update nearest record-template DTO/service spec if one exists.

## Task 1: Stop accepting new `finished_goods` batchLinkType

- [ ] **Step 1: Update create DTO**

In `server/src/modules/record-template/dto/create-record-template.dto.ts`, change the API docs and validator:

```ts
@ApiPropertyOptional({ description: '批次关联类型', example: 'production', enum: ['production'] })
@IsOptional()
@IsIn(['production'])
batchLinkType?: string;
```

- [ ] **Step 2: Update update DTO**

In `server/src/modules/record-template/dto/update-record-template.dto.ts`, make the same change:

```ts
@ApiPropertyOptional({ description: '批次关联类型', example: 'production', enum: ['production'] })
@IsOptional()
@IsIn(['production'])
batchLinkType?: string;
```

- [ ] **Step 3: Update field type union**

In `server/src/modules/record-template/types/fields-json.types.ts`, remove `finished_goods_batch` from the active field type union only if no runtime code still uses it. If it is used by historical templates, keep it and add:

```ts
// Historical compatibility only. New batch-linked templates should use production_batch.
```

- [ ] **Step 4: Run TypeScript build**

```bash
npm --prefix server run build
```

Expected: no DTO/type compile errors.

## Task 2: Preserve and label historical compatibility

- [ ] **Step 1: Update `record.service.ts` comment near compatibility check**

Find:

```ts
if (batchType === 'production' || batchType === 'finished_goods') {
```

Keep the runtime branch for historical compatibility but add:

```ts
// GAP-205: `finished_goods` is accepted only for historical templates.
// New templates must use `production`; both values resolve to ProductionBatch.
if (batchType === 'production' || batchType === 'finished_goods') {
```

- [ ] **Step 2: Ensure no new write path sets `finished_goods`**

Run:

```bash
rg -n "batchLinkType.*finished_goods|IsIn\\(\\['production', 'finished_goods'\\]|enum: \\['production', 'finished_goods'\\]" server/src/modules
```

Expected: no output after DTO changes.

## Task 3: Update schema comments

- [ ] **Step 1: Update `Record.batchLinkType` comment**

In `server/src/prisma/schema.prisma`, change:

```prisma
batchLinkType    String? // "production" | "finished_goods"
```

to:

```prisma
batchLinkType    String? // "production"; legacy rows may contain "finished_goods"
```

- [ ] **Step 2: Update `Record.relatedBatchType` comment**

Change:

```prisma
relatedBatchType     String? // "production" | "finished_goods"
```

to:

```prisma
relatedBatchType     String? // "production"; legacy rows may contain "finished_goods"
```

- [ ] **Step 3: Update `InventoryMovement.movement_type` comment**

Change:

```prisma
movement_type String   // 'receive'|'issue_to_production'|'transfer'|'finished_goods_in'|'finished_goods_out'|'adjustment'
```

to:

```prisma
movement_type String   // 'receive'|'issue_to_production'|'transfer'|'production_in'|'production_out'|'adjustment'|'return_to_warehouse'|'scrap'
```

- [ ] **Step 4: Validate Prisma schema**

```bash
DATABASE_URL='postgresql://user:pass@localhost:5432/noidear' npm --prefix server exec -- prisma validate --schema src/prisma/schema.prisma
```

Expected: schema validates. Existing unrelated warnings are acceptable; new syntax errors are not.

## Task 4: Add focused DTO validation test

- [ ] **Step 1: Locate existing record-template tests**

Run:

```bash
rg -n "RecordTemplate|batchLinkType" server/src/modules/record-template server/src/modules/record
```

- [ ] **Step 2: If a DTO/service spec exists, add a test that rejects `finished_goods`**

Use `class-validator` directly if no controller E2E test exists:

```ts
import { validate } from 'class-validator';
import { CreateRecordTemplateDto } from './dto/create-record-template.dto';

it('rejects finished_goods for new record template batch links', async () => {
  const dto = Object.assign(new CreateRecordTemplateDto(), {
    name: '模板',
    code: 'TPL-001',
    category: 'test',
    batchLinkType: 'finished_goods',
  });

  const errors = await validate(dto);

  expect(errors.some((e) => e.property === 'batchLinkType')).toBe(true);
});
```

Adjust required DTO fields to match the actual class.

- [ ] **Step 3: Run focused test**

```bash
npm --prefix server test -- record-template --runInBand
```

Expected: PASS.

## Task 5: Final verification and PR

- [ ] **Step 1: Run verification**

```bash
npm --prefix server run build
npm --prefix server test -- record-template --runInBand
rg -n "batchLinkType.*finished_goods|IsIn\\(\\['production', 'finished_goods'\\]|enum: \\['production', 'finished_goods'\\]" server/src/modules || true
git diff --check
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/record-template server/src/modules/record/record.service.ts server/src/prisma/schema.prisma
git commit -m "fix: stop new finished goods batch link templates"
```

- [ ] **Step 3: Push and open PR**

Use branch `codex/gap-205-finished-goods-residual-cleanup`. PR title must include `GAP-205`.
