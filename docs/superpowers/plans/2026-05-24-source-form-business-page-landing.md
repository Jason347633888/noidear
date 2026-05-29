# Source Form Business Page Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Paused. Do not execute this plan as-is. It predates the 2026-05-24 business feedback that each retained source form needs a fillable entry first, with consolidation decided table-by-table.

**Goal:** Land retained source record forms as explicit fillable entries without restoring dynamic forms, while aligning every master-data and batch field to canonical models.

**Architecture:** Source forms are no longer dynamic runtime objects, but each retained form still needs a user-visible fillable entry. Repeated product/area variants should share form families driven by product, recipe, area, equipment, or supplier configuration. Existing modules and candidate domain modules may still be used behind the scenes, but consolidation happens only after table-by-table business review.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Vue 3, Vite, Element Plus, npm workspaces, shared TypeScript types in `packages/types`.

---

## 2026-05-24 Business Feedback Override

This plan must be rewritten before implementation. The following decisions override the task list below:

- Dynamic forms are being removed and must not be used as a runtime fallback.
- Every retained source form needs a fillable entry, even if several entries share one underlying page family.
- Do not force broad merges like "all cleaning forms" or "all inspections" before reviewing each table.
- Manufacturing feeding, batching, and process records may exist before a finished-goods batch number exists. Early records must use date/time, line, product, process step, shift, and production session; link to the packaging/inbound batch later.
- Product-specific feeding/recipe forms should use the product's recipe version to generate rows. Historical records must freeze the recipe snapshot used at fill time.
- First pass should save the original abnormal/handling/review fields. Escalation to NC/CAPA is a later per-form decision.
- Procurement plan, urgent procurement, procurement contract, customer satisfaction, key borrowing, employee outing, and package inspection are first-pass record forms, not full procurement/contract/customer-success/admin subsystems.
- Customer carriers may belong to the supplier system with a carrier type; do not assume they are separate `ExternalParty` records until reviewed.
- Management review and traceability drill are deferred unless table-by-table review explicitly pulls them into scope.

Until this plan is rewritten, implementation should start from:

`docs/superpowers/specs/2026-05-24-source-form-department-review-guide.md`

and the table-by-table audit:

`docs/superpowers/specs/2026-05-24-source-form-department-audit.md`

## Execution Preconditions

- Work in a new isolated worktree based on the current integration branch.
- Confirm `docs/superpowers/plans/2026-05-23-dynamic-form-retirement.md` has been executed in the target branch.
- Confirm `RecordTemplate / Record / RecordTaskAssignment / RecordTaskInstance / Task / TaskRecord / ChangeEventFormTask / RecordFormLandingEntry` are gone from `server/src/prisma/schema.prisma`.
- Confirm `client/src/navigation/menu.ts` has no `模板管理`, `记录表单索引`, `待填任务`, or `记录管理` dynamic-form entries.
- Read `docs/superpowers/specs/2026-05-24-source-form-department-audit.md` before creating any new domain model. Each department must be reviewed table-by-table against existing wheels first.

Run:

```bash
git fetch origin master
git worktree add /Users/jiashenglin/Desktop/好玩的项目/noidear-source-form-landing -b codex/source-form-landing origin/master
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-source-form-landing
pwd
git branch --show-current
rg -nE "RecordTemplate|RecordTaskAssignment|RecordTaskInstance|ChangeEventFormTask|RecordFormLandingEntry|model-landing|record-form-index" server/src/prisma/schema.prisma client/src/navigation/menu.ts server/src/modules client/src/views
```

Expected:

```text
/Users/jiashenglin/Desktop/好玩的项目/noidear-source-form-landing
codex/source-form-landing
```

The `rg` command must not find active runtime dynamic-form artifacts. Hits in archive or historical docs are acceptable only outside runtime code.

---

## File Structure

### Cross-cutting master-data UI

- Create `client/src/components/business-selectors/MaterialSelect.vue`
- Create `client/src/components/business-selectors/MaterialBatchSelect.vue`
- Create `client/src/components/business-selectors/ProductSelect.vue`
- Create `client/src/components/business-selectors/ProductionBatchSelect.vue`
- Create `client/src/components/business-selectors/SupplierSelect.vue`
- Create `client/src/components/business-selectors/ExternalPartySelect.vue`
- Create `client/src/components/business-selectors/EquipmentSelect.vue`
- Create `client/src/components/business-selectors/MeasuringEquipmentSelect.vue`
- Create `client/src/components/business-selectors/WorkshopAreaSelect.vue`
- Create `client/src/components/business-selectors/UserSelect.vue`
- Create `client/src/components/business-selectors/DocumentSelect.vue`
- Create `client/src/components/business-selectors/index.ts`

These components prevent each business page from reimplementing master-data lookup.

### Shared type contracts

- Create `packages/types/source-form-landing.ts`
- Modify existing `packages/types/*.ts` only where fields are added to existing business APIs.

### Existing module field alignment

- Modify `server/src/prisma/schema.prisma`
- Modify DTO/service/controller/page files for:
  - `server/src/modules/cleaning-record/`
  - `server/src/modules/waste/`
  - `server/src/modules/violation-record/`
  - `server/src/modules/medication-record/`
  - `server/src/modules/line-change-check-record/`
  - `server/src/modules/change-compliance-record/`
  - `server/src/modules/packaging-material-usage/`
  - `server/src/modules/product-recall/`
  - `server/src/modules/customer-complaint/`

### New domain modules

- Create `server/src/modules/quality-inspection/`
- Create `server/src/modules/compliance-inspection/`
- Create `server/src/modules/internal-audit/`
- Create `server/src/modules/management-review/`
- Create `server/src/modules/traceability-drill/`
- Create `server/src/modules/food-safety-objective/`
- Create `server/src/modules/regulation/`
- Create `server/src/modules/document-operation/`
- Create `server/src/modules/procurement/`
- Create `server/src/modules/external-party-evaluation/`

Each module owns controller, service, DTO, module registration, unit tests, and a matching Vue list/detail flow.

### Frontend pages

- Create `client/src/views/quality-inspection/QualityInspectionList.vue`
- Create `client/src/views/quality-inspection/QualityInspectionDetail.vue`
- Create `client/src/views/compliance-inspection/ComplianceInspectionList.vue`
- Create `client/src/views/compliance-inspection/ComplianceInspectionDetail.vue`
- Create list/detail views for every new domain module above.
- Modify `client/src/router/index.ts`
- Modify `client/src/navigation/menu.ts`

### Non-runtime source form matrix

- Create `docs/source-form-business-landing-matrix.md`
- Create `docs/source-form-master-data-field-rules.md`

These docs are development artifacts only and must not be imported by server or client runtime code.

---

## Task 1: Create Non-Runtime Source Form Landing Matrix

**Files:**
- Create: `docs/source-form-business-landing-matrix.md`
- Create: `docs/source-form-master-data-field-rules.md`
- Read first: `docs/superpowers/specs/2026-05-24-source-form-department-audit.md`

- [ ] **Step 1: Create the landing matrix skeleton**

Add this content to `docs/source-form-business-landing-matrix.md`:

```markdown
# Source Form Business Landing Matrix

This file maps source record forms to business modules. It is not a runtime catalog and must not be imported by server or client code.

## Rules

1. Source forms do not create dynamic form runtime records.
2. Master data fields must map to FK fields.
3. Batch fields must map to traceability-capable models.
4. Business fields belong to the target business module.
5. Audit snapshots are display-only and are never the source of truth.

## Columns

| Department | Source form | Target module | Target page | Master data fields | Batch fields | Business fields | Snapshot fields | Implementation status |
|---|---|---|---|---|---|---|---|---|
```

- [ ] **Step 2: Add existing-wheel review columns**

Update the matrix columns to include current implementation evidence:

```markdown
| Department | Source form | Existing model | Existing API/module | Existing page | Reuse decision | Required gap | Landing effect | Implementation status |
|---|---|---|---|---|---|---|---|---|
```

- [ ] **Step 3: Populate department sections**

Append department sections for:

```markdown
## Manufacturing

| Department | Source form | Existing model | Existing API/module | Existing page | Reuse decision | Required gap | Landing effect | Implementation status |
|---|---|---|---|---|---|---|---|---|
| 制造部 | 投料打料记录-* | ProductionBatch / BatchMaterialUsage / EnvironmentRecord / ProcessMonitorRecord / CalibrationRecord | warehouse / mixing / environment-record / process-record / measuring-equipment | /batch-trace, /mixing/workbench, /process-records, /environment-records | reuse and split | FK selectors, pot sequence, material property check, calibration linkage | 投料、环境、校准、人员责任全部结构化 | planned |
| 制造部 | 日常清洁记录表（*） | CleaningRecord | cleaning-record | /cleaning-records | reuse and add fields | cleaning item details, target FK, verification role | 多区域清洁不再创建专页，统一清洁台账 | planned |
| 制造部 | 金属探测机检测记录表 | MetalDetectionLog / CalibrationRecord / NonConformance / CorrectiveAction | metal-detection / measuring-equipment / non-conformance / corrective-action | /metal-detections | reuse and add fields | test block calibration, phase, exception linkage | 金检证据链完整，异常能闭环 | planned |
| 制造部 | 工艺、配料变更、复称、评估、验证记录 | ChangeEvent / ProductProcessChangePlan / ChangeVerificationRecord / ChangeComplianceRecord | change-event / product-process-change / change-verification-record / change-compliance-record | /change-events | reuse | detail sections and document links | 一个变更事件承载申请、审批、执行、验证 | planned |

## Quality

| Department | Source form | Target module | Target page | Master data fields | Batch fields | Business fields | Snapshot fields | Implementation status |
|---|---|---|---|---|---|---|---|---|
| 品质部 | *原辅料检验报告 | IncomingInspection / QualityInspection | /incoming-inspections, /quality-inspections | Material, Supplier, User | MaterialBatch | 检验项目、实测值、判定 | 物料名、供应商名、批号 | planned |
| 品质部 | 产品检验报告 / 半成品检验报告 / 保质期检验记录 | QualityInspection / Sample | /quality-inspections | Product, User | ProductionBatch | 检验项目、结论、留样状态 | 产品名、批号、人员名 | planned |
| 品质部 | 每日食品安全检查 / 卫生月检 / PRP 验证 / 虫鼠害检查 | ComplianceInspection | /compliance-inspections | WorkshopArea, Department, User | ProductionBatch when inspection is batch-specific | 检查项、发现项、整改要求 | 区域名、部门名、人员名 | planned |
| 品质部 | 内审* / 内部审核报告 | InternalAudit | /internal-audits | Department, User | none | 审核计划、发现项、结论 | 部门名、审核员名 | planned |
| 品质部 | 管理评审汇总/* | ManagementReview | /management-reviews | Department, User, Document | none | 输入材料、会议、决议、行动项 | 部门名、文件编号 | planned |
| 品质部 | 追溯演练/* | TraceabilityDrill | /traceability-drills | User | MaterialBatch, ProductionBatch, TraceabilitySnapshot | 演练类型、耗时、结论 | 批号、查询摘要 | planned |

## QC

| Department | Source form | Target module | Target page | Master data fields | Batch fields | Business fields | Snapshot fields | Implementation status |
|---|---|---|---|---|---|---|---|---|
| 质检组 | *首检* / *抽检* / *净含量* / *品评* | QualityInspection | /quality-inspections | Product, User | ProductionBatch | 检验项目、实测值、结论 | 产品名、批号、人员名 | planned |
| 质检组 | *温湿度* / *正负压* / *过程巡检* | EnvironmentRecord / ProcessMonitorRecord | /environment-records, /process-records | WorkshopArea, Equipment, User | ProductionBatch when applicable | 参数值、规格、异常 | 区域名、设备名 | planned |

## Warehouse

| Department | Source form | Target module | Target page | Master data fields | Batch fields | Business fields | Snapshot fields | Implementation status |
|---|---|---|---|---|---|---|---|---|
| 仓储组 | 原材料验收单 / 原料标识卡 | MaterialInbound / MaterialBatch / IncomingInspection | /warehouse/batches, /incoming-inspections | Material, Supplier, User | MaterialBatch | 入库数量、验收、标识 | 物料名、供应商名、批号 | planned |
| 仓储组 | 仓库领料单 / 成品入库单 / 上车单 | InventoryMovement / MaterialRequisition / DeliveryNote | /warehouse/requisitions, /warehouse/material-balance | Material, ExternalParty, User | MaterialBatch, ProductionBatch | 移动数量、去向 | 名称、批号、人员名 | planned |

## Procurement

| Department | Source form | Target module | Target page | Master data fields | Batch fields | Business fields | Snapshot fields | Implementation status |
|---|---|---|---|---|---|---|---|---|
| 采购部 | 供应商* | Supplier / SupplierEvaluation / SupplierDocument | /warehouse/suppliers, /supplier-evaluations | Supplier, Material, User, Document | none | 评价、资质、审核 | 供应商名、物料名 | planned |
| 采购部 | 物资采购计划单 / 采购合同 / 紧急采购申请单 | Procurement | /procurements | Supplier, Material, User, Document | MaterialBatch after receipt | 采购数量、合同、申请原因 | 供应商名、物料名 | planned |

## Product Development

| Department | Source form | Target module | Target page | Master data fields | Batch fields | Business fields | Snapshot fields | Implementation status |
|---|---|---|---|---|---|---|---|---|
| 产品开发部 | 新产品开发* / 研发实验记录 / 产品开发评审记录 | ProcessInstance / Product | /process | Product, User, Department | none | 研发步骤、实验、评审 | 产品名、人员名 | planned |
| 产品开发部 | 产品配方以及工艺参数 / 工艺流程图确认 | Recipe / ProcessStep / CCPPoint | /recipes, /process-steps | Product, Material, Recipe, User | none | 工艺参数、配方、流程确认 | 产品名、配方版本 | planned |

## Marketing

| Department | Source form | Target module | Target page | Master data fields | Batch fields | Business fields | Snapshot fields | Implementation status |
|---|---|---|---|---|---|---|---|---|
| 营销部 | 产品销售登记表 / 销售出库单 | DeliveryNote / ExternalParty | /traceability, /external-parties | Product, ExternalParty, User | ProductionBatch | 发货、签收、销售数量 | 客户名、产品名、批号 | planned |
| 营销部 | 顾客投诉处理报告单 | CustomerComplaint / CorrectiveAction | /customer-complaints | ExternalParty, User | ProductionBatch | 投诉、调查、处置 | 客户名、批号 | planned |
| 营销部 | 召回演练/* | ProductRecall / TraceabilityDrill | /product-recalls, /traceability-drills | Product, ExternalParty, User | ProductionBatch, TraceabilitySnapshot | 召回计划、通知、报告 | 客户名、产品名、批号 | planned |

## Administration And HR

| Department | Source form | Target module | Target page | Master data fields | Batch fields | Business fields | Snapshot fields | Implementation status |
|---|---|---|---|---|---|---|---|---|
| 行政人事部 | 培训* / 新员工入职培训记录档案 | Training | /training/projects | User, Department, Document | none | 培训、考核、档案 | 人员名、部门名 | planned |
| 行政人事部 | 文件* / 记录* / 外来文件清单 | DocumentOperation / Document | /document-operations, /documents | Document, User, Department | none | 发放、收发、借阅、销毁、归档 | 文件编号、版本、人员名 | planned |
| 行政人事部 | 来访* / 后门外来车辆人员* | VisitorRecord / ExternalParty | /visitor-records | ExternalParty, User, WorkshopArea | none | 来访、健康声明、区域 | 外部方名、区域名 | planned |
| 行政人事部 | 管理评审* / 内审会议签到 | ManagementReview / InternalAudit | /management-reviews, /internal-audits | Department, User, Document | none | 会议、签到、报告 | 部门名、人员名 | planned |

## Engineering

| Department | Source form | Target module | Target page | Master data fields | Batch fields | Business fields | Snapshot fields | Implementation status |
|---|---|---|---|---|---|---|---|---|
| 工程部 | 设备台账 / 年度维护保养计划 / 维护保养记录 / 维修申请单 | Equipment / MaintenancePlan / MaintenanceRecord / EquipmentFault | /equipment | Equipment, User, Department | none | 计划、维修、验收、巡检 | 设备名、人员名 | planned |
| 工程部 | 设备变更申请、评估记录 | ChangeEvent | /change-events | Equipment, User, Department | none | 变更原因、评估、结论 | 设备名、人员名 | planned |
```

- [ ] **Step 4: Create master-data field rules**

Add this content to `docs/source-form-master-data-field-rules.md`:

```markdown
# Source Form Master Data Field Rules

This file defines source-form field handling rules for implementation and review.

## Canonical Rules

| Source field pattern | Required FK | Required snapshot | Rejected storage |
|---|---|---|---|
| 供应商 / 供方 | Supplier.id | supplierNameSnapshot | string-only supplier name |
| 客户 / 购货单位 / 承运方 / 收运单位 / 外包方 | ExternalParty.id | externalPartyNameSnapshot | string-only external party |
| 原辅料 / 包材 / 化学品 / 易耗品 | Material.id | materialNameSnapshot, materialCodeSnapshot | string-only material |
| 原辅料批号 / 供应商批号 | MaterialBatch.id | batchNumberSnapshot, supplierLotSnapshot | string-only lot number |
| 产品 / 成品 / 半成品 | Product.id | productNameSnapshot | string-only product name |
| 生产批号 / 成品批号 | ProductionBatch.id | productionBatchNumberSnapshot | string-only production lot |
| 设备 / 仪器 | Equipment.id or MeasuringEquipment.id | equipmentNameSnapshot, equipmentCodeSnapshot | string-only equipment |
| 车间 / 区域 / 库位 | WorkshopArea.id when business area; warehouse location fields when inventory location | areaNameSnapshot | free text when controlled area exists |
| 操作人 / 审核人 / 复核人 / 验证人 / 评审人 | User.id | userNameSnapshot | handwritten name as source of truth |
| 文件 / 空白表单 / 外部报告 / 证书 | Document.id or BusinessDocumentLink | documentNoSnapshot, versionSnapshot | file name string only |

## Review Gate

Any implementation that stores the above fields only as text fails review.
```

- [ ] **Step 5: Verify docs are not runtime dependencies**

Run:

```bash
rg -n "source-form-business-landing-matrix|source-form-master-data-field-rules" server/src client/src packages
```

Expected: zero output.

- [ ] **Step 6: Commit**

```bash
git add docs/source-form-business-landing-matrix.md docs/source-form-master-data-field-rules.md
git commit -m "docs: map source forms to business modules"
```

---

## Task 2: Department-By-Department Existing Wheel Audit

**Files:**
- Read: `docs/superpowers/specs/2026-05-24-source-form-department-audit.md`
- Modify: `docs/source-form-business-landing-matrix.md`

- [ ] **Step 1: Audit Manufacturing**

Use the manufacturing section in `docs/superpowers/specs/2026-05-24-source-form-department-audit.md`. Mark each row as:

```text
direct_reuse
reuse_add_fields
reuse_add_page
reuse_split
new_domain_model
document_only
```

No implementation is allowed until all 74 manufacturing rows have one of these statuses.

- [ ] **Step 2: Audit Quality**

List every 品质部 source form and compare it against existing wheels:

```text
IncomingInspection
CCPRecord
NonConformance
CorrectiveAction
CustomerComplaint
ProductRecall
ReworkRecord
MeasuringEquipment
CalibrationRecord
EnvironmentRecord
Traceability
Document
Approval
```

Do not create `QualityInspection` until each table has been checked against these existing wheels.

- [ ] **Step 3: Audit QC**

Check whether each 质检组 form can reuse:

```text
ProcessMonitorRecord
EnvironmentRecord
CleaningRecord
MetalDetectionLog
IncomingInspection
CCPRecord
NonConformance
CorrectiveAction
```

- [ ] **Step 4: Audit Engineering, Warehouse, Procurement, Product Development, Marketing, Administration/HR**

For each department, fill the same columns: existing model, existing API/module, existing page, reuse decision, required gap, landing effect.

- [ ] **Step 5: Stop if duplicate model is proposed**

Before adding any new model, write one paragraph in `docs/source-form-business-landing-matrix.md` explaining why no existing wheel can own it.

- [ ] **Step 6: Commit**

```bash
git add docs/source-form-business-landing-matrix.md
git commit -m "docs: audit source forms against existing wheels"
```

---

## Task 3: Add Shared Master-Data Selector Components

**Files:**
- Create: `client/src/components/business-selectors/*.vue`
- Create: `client/src/components/business-selectors/index.ts`
- Test: `client/src/components/business-selectors/__tests__/BusinessSelectors.spec.ts`

- [ ] **Step 1: Write selector tests**

Create `client/src/components/business-selectors/__tests__/BusinessSelectors.spec.ts`:

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MaterialSelect from '../MaterialSelect.vue';

vi.mock('@/api/warehouse', () => ({
  getMaterials: vi.fn().mockResolvedValue({
    data: [
      { id: 'mat-1', materialCode: 'M-001', name: '面粉', specification: '25kg', unit: 'kg' },
    ],
  }),
}));

describe('business selectors', () => {
  it('emits selected master-data id instead of display text', async () => {
    const wrapper = mount(MaterialSelect, {
      props: { modelValue: '' },
    });

    await Promise.resolve();
    await wrapper.vm.$emit('update:modelValue', 'mat-1');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['mat-1']);
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -w client -- --run client/src/components/business-selectors/__tests__/BusinessSelectors.spec.ts
```

Expected: FAIL because `MaterialSelect.vue` does not exist.

- [ ] **Step 3: Implement `MaterialSelect.vue`**

Create `client/src/components/business-selectors/MaterialSelect.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getMaterials } from '@/api/warehouse';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

interface MaterialOption {
  id: string;
  materialCode: string;
  name: string;
  specification?: string;
  unit?: string;
}

const loading = ref(false);
const options = ref<MaterialOption[]>([]);

onMounted(async () => {
  loading.value = true;
  try {
    const response = await getMaterials({});
    options.value = response.data ?? response;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <el-select
    :model-value="props.modelValue"
    filterable
    clearable
    :loading="loading"
    placeholder="选择物料"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="item in options"
      :key="item.id"
      :label="`${item.materialCode} ${item.name}`"
      :value="item.id"
    >
      <span>{{ item.materialCode }} {{ item.name }}</span>
      <span class="selector-meta">{{ item.specification }} {{ item.unit }}</span>
    </el-option>
  </el-select>
</template>

<style scoped>
.selector-meta {
  float: right;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
```

- [ ] **Step 4: Implement the rest of the selectors**

Create the remaining selector components using the same pattern and existing API modules:

| Component | API module | Emits |
|---|---|---|
| `MaterialBatchSelect.vue` | `@/api/warehouse` batch list | `MaterialBatch.id` |
| `ProductSelect.vue` | `@/api/product` | `Product.id` |
| `ProductionBatchSelect.vue` | `@/api/batch` or `@/api/warehouse` existing batch API | `ProductionBatch.id` |
| `SupplierSelect.vue` | `@/api/warehouse` supplier API | `Supplier.id` |
| `ExternalPartySelect.vue` | `@/api/external-party` | `ExternalParty.id` |
| `EquipmentSelect.vue` | `@/api/equipment` | `Equipment.id` |
| `MeasuringEquipmentSelect.vue` | `@/api/measuring-equipment` | `MeasuringEquipment.id` |
| `WorkshopAreaSelect.vue` | `@/api/workshop-area` | `WorkshopArea.id` |
| `UserSelect.vue` | `@/api/auth` or user API | `User.id` |
| `DocumentSelect.vue` | `@/api/document-control` | `Document.id` |

All components must emit ids only. Labels can show snapshots.

- [ ] **Step 5: Export selectors**

Create `client/src/components/business-selectors/index.ts`:

```ts
export { default as MaterialSelect } from './MaterialSelect.vue';
export { default as MaterialBatchSelect } from './MaterialBatchSelect.vue';
export { default as ProductSelect } from './ProductSelect.vue';
export { default as ProductionBatchSelect } from './ProductionBatchSelect.vue';
export { default as SupplierSelect } from './SupplierSelect.vue';
export { default as ExternalPartySelect } from './ExternalPartySelect.vue';
export { default as EquipmentSelect } from './EquipmentSelect.vue';
export { default as MeasuringEquipmentSelect } from './MeasuringEquipmentSelect.vue';
export { default as WorkshopAreaSelect } from './WorkshopAreaSelect.vue';
export { default as UserSelect } from './UserSelect.vue';
export { default as DocumentSelect } from './DocumentSelect.vue';
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -w client -- --run client/src/components/business-selectors/__tests__/BusinessSelectors.spec.ts
npm run build:client
```

Expected: PASS and build succeeds.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/business-selectors
git commit -m "feat: add reusable business selectors"
```

---

## Task 4: Align Existing Business Models To Master Data

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Modify: existing DTO/service/controller files for affected modules
- Modify: matching frontend pages and API files
- Test: affected service specs

- [ ] **Step 1: Add failing schema expectation test**

Create `server/src/prisma/source-form-master-data-contract.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('source form master data contract', () => {
  const schema = readFileSync(join(__dirname, 'schema.prisma'), 'utf8');

  it('keeps source-form master data as foreign keys plus snapshots', () => {
    expect(schema).toContain('model QualityInspection');
    expect(schema).toContain('material_id');
    expect(schema).toContain('material_name_snapshot');
    expect(schema).toContain('production_batch_id');
    expect(schema).toContain('production_batch_number_snapshot');
    expect(schema).toContain('equipment_id');
    expect(schema).toContain('equipment_name_snapshot');
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -w server -- --run server/src/prisma/source-form-master-data-contract.spec.ts
```

Expected: FAIL because new models and fields do not exist yet.

- [ ] **Step 3: Update existing models with FK/snapshot fields**

Modify `server/src/prisma/schema.prisma` with these field groups:

```prisma
model CleaningRecord {
  id               String        @id @default(cuid())
  company_id       String
  target_type      String
  target_name      String
  workshop_area_id String?
  workshop_area    WorkshopArea? @relation("CleaningRecordWorkshopArea", fields: [workshop_area_id], references: [id], onDelete: SetNull)
  equipment_id     String?
  equipment        Equipment?    @relation("CleaningRecordEquipment", fields: [equipment_id], references: [id], onDelete: SetNull)
  target_snapshot  String?
  cleaning_method  String?
  disinfectant     String?
  concentration    String?
  cleaning_date    DateTime      @db.Date
  operator_id      String?
  verifier_id      String?
  is_pass          Boolean
  notes            String?
  created_at       DateTime      @default(now())

  @@index([workshop_area_id])
  @@index([equipment_id])
}

model WasteDisposalRecord {
  id                     String         @id @default(cuid())
  company_id             String
  material_id            String?
  material               Material?      @relation(fields: [material_id], references: [id], onDelete: SetNull)
  material_batch_id      String?
  material_batch         MaterialBatch? @relation(fields: [material_batch_id], references: [id], onDelete: SetNull)
  external_party_id      String?
  external_party         ExternalParty? @relation(fields: [external_party_id], references: [id], onDelete: SetNull)
  material_name          String
  material_name_snapshot String?
  lot_no                 String?
  batch_number_snapshot  String?
  disposal_reason        String
  qty                    Decimal        @db.Decimal(14, 4)
  unit                   String
  disposal_method        String
  disposal_date          DateTime       @db.Date
  operator_id            String?
  witness_id             String?
  notes                  String?
  created_at             DateTime       @default(now())

  @@index([material_id])
  @@index([material_batch_id])
  @@index([external_party_id])
}

model ChangeComplianceRecord {
  id               String      @id @default(cuid())
  company_id       String
  change_event_id  String
  change_event     ChangeEvent @relation(fields: [change_event_id], references: [id], onDelete: Cascade)
  assessor_id      String?
  legal_compliance Boolean     @default(true)
  safety_impact    String?
  risk_level       String?
  conclusion       String?
  assessed_at      DateTime    @default(now())
  notes            String?
  created_at       DateTime    @default(now())

  @@index([change_event_id])
}
```

Also add the corresponding reverse relations to `WorkshopArea`, `Equipment`, `Material`, `MaterialBatch`, `ExternalParty`, and `ChangeEvent`.

- [ ] **Step 4: Generate migration**

Run:

```bash
DATABASE_URL="postgresql://noidear:noidear123@localhost:5432/document_system" \
  npm run prisma:migrate -w server -- --name source_form_master_data_alignment --create-only
npm run prisma:generate -w server
```

Expected: migration created and Prisma client generated.

- [ ] **Step 5: Update DTOs and services**

For every changed module, enforce FK input and snapshot generation in services:

```ts
private async resolveMaterialSnapshot(materialId?: string) {
  if (!materialId) return null;
  const material = await this.prisma.material.findUniqueOrThrow({
    where: { id: materialId },
    select: { id: true, materialCode: true, name: true, specification: true, unit: true },
  });

  return {
    id: material.id,
    label: `${material.materialCode} ${material.name}`,
    name: material.name,
    code: material.materialCode,
    specification: material.specification,
    unit: material.unit,
  };
}
```

Use this pattern in each service; do not let clients submit snapshot strings.

- [ ] **Step 6: Update existing pages to use shared selectors**

Replace free-text master-data fields in affected forms with `business-selectors` components. Example for a material field:

```vue
<MaterialSelect v-model="form.material_id" />
```

Keep snapshot fields read-only in detail pages.

- [ ] **Step 7: Run verification**

```bash
npm test -w server -- --run server/src/prisma/source-form-master-data-contract.spec.ts
npm run prisma:generate -w server
npm run build:server
npm run build:client
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations server/src/modules client/src packages/types
git commit -m "feat: align source-form records to master data"
```

---

## Task 5: Implement QualityInspection Module Only If Audit Requires It

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/modules/quality-inspection/`
- Create: `client/src/api/quality-inspection.ts`
- Create: `client/src/views/quality-inspection/QualityInspectionList.vue`
- Create: `client/src/views/quality-inspection/QualityInspectionDetail.vue`
- Modify: `server/src/app.module.ts`
- Modify: `client/src/router/index.ts`
- Modify: `client/src/navigation/menu.ts`

- [ ] **Step 1: Write service test**

Create `server/src/modules/quality-inspection/quality-inspection.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { QualityInspectionService } from './quality-inspection.service';

describe('QualityInspectionService', () => {
  it('requires structured target references for batch-related inspections', async () => {
    const prisma = {
      product: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'prod-1', name: '蒸蛋糕', specification: '箱' }) },
      productionBatch: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'pb-1', batchNumber: 'PB-001', productName: '蒸蛋糕' }) },
      qualityInspection: { create: jest.fn().mockResolvedValue({ id: 'qi-1' }) },
    };
    const service = new QualityInspectionService(prisma as never);

    await service.create({
      company_id: 'demo',
      inspection_type: 'finished_product',
      product_id: 'prod-1',
      production_batch_id: 'pb-1',
      inspected_at: '2026-05-24T08:00:00.000Z',
      inspector_id: 'user-1',
      overall_result: 'pass',
      items: [{ item_name: '净含量', actual_value: '100g', is_pass: true }],
    });

    expect(prisma.qualityInspection.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        product_id: 'prod-1',
        product_name_snapshot: '蒸蛋糕',
        production_batch_id: 'pb-1',
        production_batch_number_snapshot: 'PB-001',
      }),
    }));
  });
});
```

- [ ] **Step 2: Add Prisma models**

Add to `server/src/prisma/schema.prisma`:

```prisma
model QualityInspection {
  id                               String                  @id @default(cuid())
  company_id                       String
  inspection_no                    String
  inspection_type                  String
  product_id                       String?
  product                          Product?                @relation(fields: [product_id], references: [id], onDelete: SetNull)
  product_name_snapshot            String?
  material_id                      String?
  material                         Material?               @relation(fields: [material_id], references: [id], onDelete: SetNull)
  material_name_snapshot           String?
  material_batch_id                String?
  material_batch                   MaterialBatch?          @relation(fields: [material_batch_id], references: [id], onDelete: SetNull)
  material_batch_number_snapshot   String?
  production_batch_id              String?
  production_batch                 ProductionBatch?        @relation(fields: [production_batch_id], references: [id], onDelete: SetNull)
  production_batch_number_snapshot String?
  supplier_id                      String?
  supplier                         Supplier?               @relation(fields: [supplier_id], references: [id], onDelete: SetNull)
  supplier_name_snapshot           String?
  sample_id                        String?
  inspected_at                     DateTime
  inspector_id                     String?
  reviewer_id                      String?
  overall_result                   String
  conclusion                       String?
  notes                            String?
  created_at                       DateTime                @default(now())
  updated_at                       DateTime                @updatedAt
  items                            QualityInspectionItem[]

  @@unique([company_id, inspection_no])
  @@index([company_id, inspection_type])
  @@index([product_id])
  @@index([material_id])
  @@index([material_batch_id])
  @@index([production_batch_id])
  @@map("quality_inspections")
}

model QualityInspectionItem {
  id             String            @id @default(cuid())
  inspection_id  String
  inspection     QualityInspection @relation(fields: [inspection_id], references: [id], onDelete: Cascade)
  item_name      String
  method         String?
  spec_text      String?
  spec_min       Decimal?          @db.Decimal(14, 4)
  spec_max       Decimal?          @db.Decimal(14, 4)
  actual_value   String?
  actual_numeric Decimal?          @db.Decimal(14, 4)
  unit           String?
  is_pass        Boolean
  notes          String?

  @@index([inspection_id])
  @@map("quality_inspection_items")
}
```

Add reverse relations to `Product`, `Material`, `MaterialBatch`, `ProductionBatch`, and `Supplier`.

- [ ] **Step 3: Implement module**

Create:

```text
server/src/modules/quality-inspection/quality-inspection.module.ts
server/src/modules/quality-inspection/quality-inspection.controller.ts
server/src/modules/quality-inspection/quality-inspection.service.ts
server/src/modules/quality-inspection/dto/create-quality-inspection.dto.ts
server/src/modules/quality-inspection/dto/query-quality-inspection.dto.ts
```

Controller routes:

```ts
@Controller('quality-inspections')
export class QualityInspectionController {
  constructor(private readonly service: QualityInspectionService) {}

  @Get()
  list(@Query() query: QueryQualityInspectionDto) {
    return this.service.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  create(@Body() dto: CreateQualityInspectionDto) {
    return this.service.create(dto);
  }
}
```

- [ ] **Step 4: Implement frontend API and pages**

Create `client/src/api/quality-inspection.ts` with list/detail/create functions using `request`.

Create list/detail pages with:

- Filters: date range, inspection type, result, product, material, production batch, material batch.
- Create dialog: uses business selectors.
- Detail view: shows master-data snapshots, line items, attachments, approval/todo links.

- [ ] **Step 5: Register route and menu**

Add route:

```ts
{
  path: 'quality-inspections',
  name: 'QualityInspectionList',
  component: () => import('@/views/quality-inspection/QualityInspectionList.vue'),
}
```

Add menu under `质量与合规`:

```ts
{ path: '/quality-inspections', title: '质量检验', icon: CircleCheck }
```

- [ ] **Step 6: Verify**

```bash
npm run prisma:generate -w server
npm test -w server -- --run server/src/modules/quality-inspection/quality-inspection.service.spec.ts
npm run build:server
npm run build:client
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations server/src/modules/quality-inspection client/src/api/quality-inspection.ts client/src/views/quality-inspection client/src/router/index.ts client/src/navigation/menu.ts
git commit -m "feat: land quality inspection source forms"
```

---

## Task 6: Implement ComplianceInspection Module Only If Audit Requires It

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/modules/compliance-inspection/`
- Create: `client/src/api/compliance-inspection.ts`
- Create: `client/src/views/compliance-inspection/`

- [ ] **Step 1: Add Prisma models**

Add:

```prisma
model ComplianceInspection {
  id                    String                     @id @default(cuid())
  company_id            String
  inspection_no         String
  inspection_type       String
  department_id         String?
  department            Department?                @relation(fields: [department_id], references: [id], onDelete: SetNull)
  department_snapshot   String?
  workshop_area_id      String?
  workshop_area         WorkshopArea?              @relation(fields: [workshop_area_id], references: [id], onDelete: SetNull)
  area_snapshot         String?
  equipment_id          String?
  equipment             Equipment?                 @relation(fields: [equipment_id], references: [id], onDelete: SetNull)
  equipment_snapshot    String?
  production_batch_id   String?
  production_batch      ProductionBatch?           @relation(fields: [production_batch_id], references: [id], onDelete: SetNull)
  batch_number_snapshot String?
  inspected_at          DateTime
  inspector_id          String?
  result                String
  issue_summary         String?
  corrective_action_id  String?
  created_at            DateTime                   @default(now())
  updated_at            DateTime                   @updatedAt
  items                 ComplianceInspectionItem[]

  @@unique([company_id, inspection_no])
  @@index([company_id, inspection_type])
  @@index([department_id])
  @@index([workshop_area_id])
  @@index([equipment_id])
  @@index([production_batch_id])
  @@map("compliance_inspections")
}

model ComplianceInspectionItem {
  id             String               @id @default(cuid())
  inspection_id  String
  inspection     ComplianceInspection @relation(fields: [inspection_id], references: [id], onDelete: Cascade)
  item_name      String
  expected_value String?
  actual_value   String?
  is_pass        Boolean
  issue_level    String?
  notes          String?

  @@index([inspection_id])
  @@map("compliance_inspection_items")
}
```

- [ ] **Step 2: Implement backend and frontend**

Implement the same list/detail/create pattern as `QualityInspection`, with inspection types:

```ts
export const COMPLIANCE_INSPECTION_TYPES = [
  'daily_food_safety',
  'monthly_hygiene',
  'prp_verification',
  'pest_control',
  'sanitation',
  'risk_zone',
  'allergen_control',
  'food_defense',
  'fraud_vulnerability',
  'external_service_risk',
] as const;
```

- [ ] **Step 3: Wire CAPA trigger**

When `result` is `fail` or an item has `issue_level` of `major`, create or allow linking a `CorrectiveAction`:

```ts
if (dto.result === 'fail' && dto.create_capa) {
  await this.prisma.correctiveAction.create({
    data: {
      company_id: dto.company_id,
      capa_no: await this.sequence.next('capa'),
      trigger_type: 'compliance_inspection',
      trigger_id: inspection.id,
      description: dto.issue_summary ?? '合规检查发现项',
      responsible_id: dto.responsible_id,
      status: 'open',
    },
  });
}
```

- [ ] **Step 4: Verify**

```bash
npm run prisma:generate -w server
npm run build:server
npm run build:client
```

- [ ] **Step 5: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations server/src/modules/compliance-inspection client/src/api/compliance-inspection.ts client/src/views/compliance-inspection client/src/router/index.ts client/src/navigation/menu.ts
git commit -m "feat: land compliance inspection source forms"
```

---

## Task 7: Implement Governance Modules

**Files:**
- Create: `server/src/modules/internal-audit/`
- Create: `server/src/modules/management-review/`
- Create: `server/src/modules/traceability-drill/`
- Create: `server/src/modules/food-safety-objective/`
- Create: `server/src/modules/regulation/`
- Create matching client API and views

- [ ] **Step 1: Add models**

Add these models to `schema.prisma`:

```prisma
model InternalAudit {
  id            String    @id @default(cuid())
  company_id    String
  audit_no      String
  title         String
  audit_type    String
  planned_at    DateTime?
  started_at    DateTime?
  completed_at  DateTime?
  lead_auditor_id String?
  status        String    @default("planned")
  conclusion    String?
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
  findings      InternalAuditFinding[]

  @@unique([company_id, audit_no])
  @@map("internal_audits")
}

model InternalAuditFinding {
  id                 String        @id @default(cuid())
  audit_id           String
  audit              InternalAudit @relation(fields: [audit_id], references: [id], onDelete: Cascade)
  department_id      String?
  clause_no          String?
  finding_type       String
  description        String
  corrective_action_id String?
  status             String        @default("open")
  created_at         DateTime      @default(now())

  @@index([audit_id])
  @@map("internal_audit_findings")
}

model ManagementReview {
  id            String    @id @default(cuid())
  company_id    String
  review_no     String
  title         String
  review_date   DateTime
  chair_id      String?
  scope         Json?
  participants  Json?
  conclusion    String?
  status        String    @default("draft")
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
  actions       ManagementReviewAction[]

  @@unique([company_id, review_no])
  @@map("management_reviews")
}

model ManagementReviewAction {
  id             String           @id @default(cuid())
  review_id      String
  review         ManagementReview @relation(fields: [review_id], references: [id], onDelete: Cascade)
  description    String
  responsible_id String?
  due_date       DateTime?
  status         String           @default("open")
  closed_at      DateTime?

  @@index([review_id])
  @@map("management_review_actions")
}

model TraceabilityDrill {
  id                       String                @id @default(cuid())
  company_id               String
  drill_no                 String
  drill_type               String
  source_material_batch_id String?
  source_material_batch    MaterialBatch?        @relation(fields: [source_material_batch_id], references: [id], onDelete: SetNull)
  source_production_batch_id String?
  source_production_batch  ProductionBatch?      @relation(fields: [source_production_batch_id], references: [id], onDelete: SetNull)
  snapshot_id              String?
  snapshot                 TraceabilitySnapshot? @relation(fields: [snapshot_id], references: [id], onDelete: SetNull)
  started_at               DateTime
  completed_at             DateTime?
  duration_minutes         Int?
  result                   String
  issues                   String?
  improvement              String?
  organizer_id             String?
  created_at               DateTime              @default(now())
  updated_at               DateTime              @updatedAt

  @@unique([company_id, drill_no])
  @@map("traceability_drills")
}

model FoodSafetyObjective {
  id              String    @id @default(cuid())
  company_id      String
  objective_no    String
  title           String
  metric_name     String
  target_value    Decimal?  @db.Decimal(14, 4)
  actual_value    Decimal?  @db.Decimal(14, 4)
  unit            String?
  period          String
  department_id   String?
  responsible_id  String?
  status          String    @default("open")
  evaluation      String?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  @@unique([company_id, objective_no])
  @@map("food_safety_objectives")
}

model Regulation {
  id            String    @id @default(cuid())
  company_id    String
  code          String
  title         String
  category      String
  source        String?
  effective_at  DateTime?
  expires_at    DateTime?
  document_id   String?
  status        String    @default("active")
  owner_id      String?
  review_note   String?
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  @@unique([company_id, code])
  @@map("regulations")
}
```

- [ ] **Step 2: Implement modules**

For each module:

```text
<module>.module.ts
<module>.controller.ts
<module>.service.ts
dto/create-<module>.dto.ts
dto/query-<module>.dto.ts
```

Use standard endpoints:

```text
GET /api/v1/<plural>
GET /api/v1/<plural>/:id
POST /api/v1/<plural>
PATCH /api/v1/<plural>/:id
```

- [ ] **Step 3: Implement frontend pages**

Create list/detail pages and menu entries:

| Module | Menu group | Route |
|---|---|---|
| InternalAudit | 质量与合规 | `/internal-audits` |
| ManagementReview | 质量与合规 | `/management-reviews` |
| TraceabilityDrill | 追溯与批次 | `/traceability-drills` |
| FoodSafetyObjective | 质量与合规 | `/food-safety-objectives` |
| Regulation | 文控与审批 | `/regulations` |

- [ ] **Step 4: Verify**

```bash
npm run prisma:generate -w server
npm run build:server
npm run build:client
npm run traceability:verify -w server
```

- [ ] **Step 5: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations server/src/modules/internal-audit server/src/modules/management-review server/src/modules/traceability-drill server/src/modules/food-safety-objective server/src/modules/regulation client/src
git commit -m "feat: land governance source forms"
```

---

## Task 8: Implement Procurement, DocumentOperation, And ExternalPartyEvaluation

**Files:**
- Create: `server/src/modules/procurement/`
- Create: `server/src/modules/document-operation/`
- Create: `server/src/modules/external-party-evaluation/`
- Create matching client API and views

- [ ] **Step 1: Add models**

Add:

```prisma
model ProcurementRequest {
  id                  String    @id @default(cuid())
  company_id          String
  request_no          String
  request_type        String
  supplier_id         String?
  supplier            Supplier? @relation(fields: [supplier_id], references: [id], onDelete: SetNull)
  supplier_snapshot   String?
  material_id         String?
  material            Material? @relation(fields: [material_id], references: [id], onDelete: SetNull)
  material_snapshot   String?
  qty                 Decimal?  @db.Decimal(14, 4)
  unit                String?
  reason              String?
  contract_document_id String?
  status              String    @default("draft")
  requested_by        String?
  requested_at        DateTime  @default(now())
  approvalInstanceId  String?
  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt

  @@unique([company_id, request_no])
  @@map("procurement_requests")
}

model DocumentOperation {
  id                  String    @id @default(cuid())
  company_id          String
  operation_no        String
  operation_type      String
  document_id         String?
  document            Document? @relation(fields: [document_id], references: [id], onDelete: SetNull)
  document_no_snapshot String?
  version_snapshot    String?
  quantity            Int?
  applicant_id        String?
  operator_id         String?
  department_id       String?
  reason              String?
  result              String?
  operated_at         DateTime  @default(now())
  status              String    @default("completed")
  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt

  @@unique([company_id, operation_no])
  @@index([document_id])
  @@map("document_operations")
}

model ExternalPartyEvaluation {
  id                    String        @id @default(cuid())
  company_id            String
  external_party_id     String
  external_party        ExternalParty @relation(fields: [external_party_id], references: [id], onDelete: Restrict)
  external_party_snapshot String?
  evaluation_type       String
  eval_period           String
  eval_date             DateTime      @db.Date
  quality_score         Decimal?      @db.Decimal(5, 2)
  service_score         Decimal?      @db.Decimal(5, 2)
  safety_score          Decimal?      @db.Decimal(5, 2)
  total_score           Decimal?      @db.Decimal(5, 2)
  verdict               String
  evaluator_id          String?
  notes                 String?
  created_at            DateTime      @default(now())

  @@index([external_party_id])
  @@map("external_party_evaluations")
}
```

- [ ] **Step 2: Implement modules and pages**

Routes:

```text
/procurements
/document-operations
/external-party-evaluations
```

Menu:

- `采购管理` under `仓库管理` or a new `供应链` group.
- `文件操作台账` under `文控与审批`.
- `外部方评价` under `质量与合规`.

- [ ] **Step 3: Verify**

```bash
npm run prisma:generate -w server
npm run build:server
npm run build:client
```

- [ ] **Step 4: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations server/src/modules/procurement server/src/modules/document-operation server/src/modules/external-party-evaluation client/src
git commit -m "feat: land procurement and document operation forms"
```

---

## Task 9: Wire Source Form Coverage Into Existing Pages

**Files:**
- Modify existing views under `client/src/views/**`
- Modify existing APIs under `client/src/api/**`
- Modify existing services under `server/src/modules/**`

- [ ] **Step 1: Manufacturing coverage**

Update these pages to expose form-origin workflows through business objects:

| Source forms | Page | Required UI change |
|---|---|---|
| 投料打料记录-* | Production batch detail or mixing workbench | Add batch material usage entry with MaterialBatchSelect |
| 日常清洁记录表（*） | `/cleaning-records` | Add target area/equipment selectors and area filters |
| 金属探测机检测记录表 | `/metal-detections` | Add production batch and equipment selectors |
| 生产线换产启动前检查 | `/line-change-check-records` | Add product-from/product-to selectors |
| 车间用药 / 违规 | `/medication-records`, `/violation-records` | Use UserSelect for employee fields |

- [ ] **Step 2: Quality and QC coverage**

Route quality inspection source forms into `QualityInspection` and `ComplianceInspection` with `inspection_type` presets. Add create buttons:

```ts
const qualityInspectionPresets = [
  { label: '原辅料检验', value: 'incoming_material' },
  { label: '产品检验', value: 'finished_product' },
  { label: '半成品检验', value: 'semi_finished_product' },
  { label: '净含量检验', value: 'net_content' },
  { label: '产品品评', value: 'sensory' },
  { label: '保质期检验', value: 'shelf_life' },
  { label: '环境微生物', value: 'environment_microbiology' },
];
```

- [ ] **Step 3: Supply chain coverage**

Update supplier, warehouse, incoming inspection, and external party pages:

- Supplier detail shows documents and evaluations.
- Material batch detail shows inbound, incoming inspection, stock movement, usage.
- External party detail shows customer complaints, recall notifications, carrier evaluations.

- [ ] **Step 4: Governance coverage**

Add quick links:

- `InternalAudit` finding to `CorrectiveAction`.
- `ManagementReviewAction` to `TodoTask`.
- `TraceabilityDrill` to `TraceabilitySnapshot`.
- `FoodSafetyObjective` to management review input.
- `Regulation` to `Document`.

- [ ] **Step 5: Verify menu and route coverage**

Run:

```bash
npm run build:client
rg -n "record-form-index|RecordFormLanding|model-landing|DynamicForm|FormBuilder|record-task" client/src server/src packages
```

Expected: build succeeds; `rg` has zero active runtime hits.

- [ ] **Step 6: Commit**

```bash
git add client/src server/src packages/types
git commit -m "feat: connect source form workflows to business pages"
```

---

## Task 10: Add Reporting, Search, And Traceability Links

**Files:**
- Modify: `server/src/modules/search/`
- Modify: `client/src/views/search/AdvancedSearch.vue`
- Modify: `server/src/modules/traceability/`
- Modify: `client/src/views/traceability/TraceabilityQuery.vue`

- [ ] **Step 1: Add searchable resources**

Index these new modules:

```ts
export const SOURCE_FORM_BUSINESS_SEARCH_RESOURCES = [
  'quality_inspection',
  'compliance_inspection',
  'internal_audit',
  'management_review',
  'traceability_drill',
  'food_safety_objective',
  'regulation',
  'document_operation',
  'procurement_request',
  'external_party_evaluation',
] as const;
```

- [ ] **Step 2: Add traceability links**

Traceability views must include only records with actual batch relations:

| Module | Link condition |
|---|---|
| `QualityInspection` | has `material_batch_id` or `production_batch_id` |
| `TraceabilityDrill` | has `source_material_batch_id`, `source_production_batch_id`, or `snapshot_id` |
| `ComplianceInspection` | has `production_batch_id` |
| `ProcurementRequest` | no traceability link until receipt creates batch |
| `DocumentOperation` | no traceability link |

- [ ] **Step 3: Verify traceability**

Run:

```bash
npm run traceability:test -w server
npm run traceability:verify -w server
npm run build:server
npm run build:client
```

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/search server/src/modules/traceability client/src/views/search client/src/views/traceability packages/types
git commit -m "feat: expose source-form business records in search and traceability"
```

---

## Task 11: Add Department Workbench Shortcuts Without New Facts

**Files:**
- Create: `client/src/views/workbench/ManufacturingWorkbench.vue`
- Create: `client/src/views/workbench/QualityWorkbench.vue`
- Create: `client/src/views/workbench/WarehouseWorkbench.vue`
- Create: `client/src/views/workbench/AdminHrWorkbench.vue`
- Modify: `client/src/router/index.ts`
- Modify: `client/src/navigation/menu.ts`

- [ ] **Step 1: Create workbench pages**

Each workbench page contains shortcut cards only. It must not call a custom write API.

Example shortcuts for manufacturing:

```ts
const shortcuts = [
  { title: '投料记录', route: '/batch-trace', query: { action: 'material-usage' } },
  { title: '清洁消毒', route: '/cleaning-records' },
  { title: '过程参数', route: '/process-records' },
  { title: '金属探测', route: '/metal-detections' },
  { title: '换产检查', route: '/line-change-check-records' },
  { title: '员工用药', route: '/medication-records' },
  { title: '员工违规', route: '/violation-records' },
];
```

- [ ] **Step 2: Register menu**

Add a `部门工作台` group with:

```ts
{ path: '/workbench/manufacturing', title: '制造工作台', icon: Grid },
{ path: '/workbench/quality', title: '品质工作台', icon: CircleCheck },
{ path: '/workbench/warehouse', title: '仓储工作台', icon: Goods },
{ path: '/workbench/admin-hr', title: '行政人事工作台', icon: UserFilled },
```

- [ ] **Step 3: Verify no duplicate facts**

Run:

```bash
rg -n "POST|create|save|submit" client/src/views/workbench
```

Expected: zero output. Workbenches navigate only.

- [ ] **Step 4: Commit**

```bash
git add client/src/views/workbench client/src/router/index.ts client/src/navigation/menu.ts
git commit -m "feat: add department workbench shortcuts"
```

---

## Task 12: Final Verification And Coverage Review

**Files:**
- Modify: `docs/source-form-business-landing-matrix.md`
- Modify: `docs/source-form-master-data-field-rules.md`

- [ ] **Step 1: Update matrix statuses**

Change implemented groups from `planned` to `implemented` only after their route, module, and build verification exist.

- [ ] **Step 2: Run full verification**

```bash
npm run prisma:generate -w server
npm run build:server
npm run build:client
npm run typecheck:types
npm run traceability:verify -w server
npm test -w client -- --run
```

If traceability service changed, also run:

```bash
npm run traceability:test -w server
```

- [ ] **Step 3: Run anti-regression scans**

```bash
rg -nE "RecordTemplate|RecordTaskAssignment|RecordTaskInstance|ChangeEventFormTask|RecordFormLandingEntry|model-landing|record-form-index|DynamicForm|FormBuilder|dataJson|fieldsJson" server/src client/src packages
```

Expected: zero active runtime hits. If a hit remains in historical migration names or comments, document why it is not runtime.

- [ ] **Step 4: Run master-data text-only scan**

```bash
rg -nE "supplierName|materialName|productName|batchNo|lotNo|equipmentName|operatorName|inspectorName" server/src/modules client/src/views
```

Review every hit. It is acceptable only if the same record also stores an FK or the field is explicitly named `*Snapshot`.

- [ ] **Step 5: Commit final docs**

```bash
git add docs/source-form-business-landing-matrix.md docs/source-form-master-data-field-rules.md
git commit -m "docs: mark source form landing coverage"
```

---

## Plan Self-Review

Spec coverage:

-方案 B business-object landing is implemented by matrix, master-data selectors, model alignment, new domain modules, existing page wiring, and department shortcuts.
- Dynamic form retirement boundary is preserved by anti-regression scans and preconditions.
- Master-data FK plus snapshot rules are implemented in docs, schema, services, selectors, and final scans.
- Most source forms are covered by department groups: manufacturing, quality, QC, warehouse, procurement, product development, marketing, administration/HR, and engineering.

No unresolved planning gaps are intentionally left. Any implementation that finds a missing source form must add it to the matrix and map it to a business module before coding.
- Gate: this task may run only after the 品质部 and 质检组 audit proves existing `IncomingInspection`, `CCPRecord`, `ProcessMonitorRecord`, `EnvironmentRecord`, `NonConformance`, and `CorrectiveAction` cannot cover the required quality inspection forms without becoming semantically overloaded.

- Gate: this task may run only after department audit proves the target forms are not better owned by `CleaningRecord`, `FragileItemInspection`, `FoodSafetyCultureRecord`, `InternalAudit`, `ManagementReview`, `NonConformance`, or `CorrectiveAction`.
