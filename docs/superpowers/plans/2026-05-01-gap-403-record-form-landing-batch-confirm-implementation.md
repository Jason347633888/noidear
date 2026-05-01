# GAP-403 Record Form Landing Batch Confirm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not redesign model-landing, RecordTemplate, or Record. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Add a controlled batch-confirm path for record form landing entries that already have model-landing suggestions, reducing manual one-by-one confirmation work.

**Architecture:** Reuse existing `RecordFormLandingService.getSuggestion()` and `confirm()` semantics. Add a backend batch method and a frontend button that applies suggestions only to selected rows; do not auto-confirm all 283 forms without user selection.

**Tech Stack:** NestJS document controller/service, Prisma, Vue 3, Element Plus.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按项目文档和 `writing-plans` 要求完成上下文核对、范围收敛和 implementation plan 编写。
- **grill-me 校准结论：** 已确认 04 记录表单索引是治理映射层，不是实际填写数据层；本次只加“选中后批量确认建议”，不自动替用户完成业务判断。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## File Map

- Modify: `server/src/modules/document/services/record-form-landing.service.ts`
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/dto/document-control.dto.ts`
- Modify: `client/src/api/document-control.ts`
- Modify: `client/src/views/documents/RecordFormLandingIndex.vue`
- Update focused tests near `server/src/modules/document/services/record-form-landing.service.spec.ts` and `client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts` if patterns are practical.

## Task 1: Add backend batch confirm DTO and service

**Files:**
- Modify: `server/src/modules/document/dto/document-control.dto.ts`
- Modify: `server/src/modules/document/services/record-form-landing.service.ts`

- [ ] **Step 1: Add DTO**

Add a DTO near existing record form landing DTOs:

```ts
export class BatchConfirmRecordFormLandingDto {
  @IsArray()
  @IsString({ each: true })
  codes!: string[];
}
```

If `IsArray` is not imported, add it from `class-validator`.

- [ ] **Step 2: Add service method**

Add to `RecordFormLandingService`:

```ts
  async batchConfirmSuggested(codes: string[], userId: string) {
    const uniqueCodes = [...new Set(codes.map(code => code.trim()).filter(Boolean))];
    const results = [];

    for (const code of uniqueCodes) {
      const suggestion = await this.getSuggestion(code);
      if (suggestion.landingStatus === 'unimplemented') {
        results.push({ code, status: 'skipped', reason: '没有可确认的落地建议' });
        continue;
      }

      const entry = await this.confirm(code, {
        landingStatus: suggestion.landingStatus,
        landingStrategy: suggestion.landingStatus,
        targetModule: suggestion.targetModule,
        targetModel: suggestion.targetModel,
        targetRoute: suggestion.targetRoute,
        targetTemplateId: suggestion.targetTemplateId,
        confirmationStatus: 'confirmed',
        fieldCoverageStatus: 'pending',
      }, userId);
      results.push({ code, status: 'confirmed', entry });
    }

    return {
      total: uniqueCodes.length,
      confirmed: results.filter(result => result.status === 'confirmed').length,
      skipped: results.filter(result => result.status === 'skipped').length,
      results,
    };
  }
```

If DTO property names differ from current `ConfirmRecordFormLandingDto`, adapt only to the existing DTO fields.

## Task 2: Expose backend endpoint

**Files:**
- Modify: `server/src/modules/document/document.controller.ts`

- [ ] **Step 1: Import DTO**

Add `BatchConfirmRecordFormLandingDto` to the existing DTO import.

- [ ] **Step 2: Add route near record-form-index routes**

```ts
  @Post('record-form-index/batch-confirm-suggested')
  batchConfirmRecordFormLanding(@Body() dto: BatchConfirmRecordFormLandingDto, @Req() req: any) {
    return this.recordFormLandingService.batchConfirmSuggested(dto.codes, req.user?.id || 'system');
  }
```

Keep existing single-confirm endpoint unchanged.

## Task 3: Add frontend API and selected-row action

**Files:**
- Modify: `client/src/api/document-control.ts`
- Modify: `client/src/views/documents/RecordFormLandingIndex.vue`

- [ ] **Step 1: Add API method**

```ts
  batchConfirmRecordFormLanding(codes: string[]) {
    return request.post('/documents/record-form-index/batch-confirm-suggested', { codes });
  },
```

- [ ] **Step 2: Add table selection**

Add selection column:

```vue
<el-table-column type="selection" width="48" />
```

Add selection handler to the table:

```vue
@selection-change="selectedRows = $event"
```

Add script state:

```ts
const selectedRows = ref<RecordFormLandingEntry[]>([]);
```

- [ ] **Step 3: Add batch confirm button**

Add near existing toolbar/filter area:

```vue
<el-button
  type="primary"
  :disabled="selectedRows.length === 0"
  @click="batchConfirmSelected"
>
  批量确认建议
</el-button>
```

Add method:

```ts
const batchConfirmSelected = async () => {
  const codes = selectedRows.value.map(row => row.code);
  const res: any = await documentControlApi.batchConfirmRecordFormLanding(codes);
  ElMessage.success(`已确认 ${res.confirmed || 0} 条，跳过 ${res.skipped || 0} 条`);
  selectedRows.value = [];
  loadData();
};
```

Use the existing reload function name if it is not `loadData()`.

## Task 4: Verify

- [ ] **Step 1: Run backend focused tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- record-form-landing.service.spec.ts
```

- [ ] **Step 2: Run frontend build**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/document/dto/document-control.dto.ts server/src/modules/document/services/record-form-landing.service.ts server/src/modules/document/document.controller.ts client/src/api/document-control.ts client/src/views/documents/RecordFormLandingIndex.vue
git add server/src/modules/document/services/record-form-landing.service.spec.ts client/src/views/documents/__tests__/RecordFormLandingIndex.spec.ts 2>/dev/null || true
git commit -m "feat: batch confirm record form landing suggestions"
```
