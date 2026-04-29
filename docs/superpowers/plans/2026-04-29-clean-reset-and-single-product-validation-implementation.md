# Clean Reset And Single Product Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safe local/test-database reset workflow that preserves document-control data and equipment ledgers, then seeds one real product chain for manual validation.

**Architecture:** Add two focused server scripts: one reset script that snapshots counts and clears only approved business-flow tables, and one seed script that creates the single-product validation chain. Keep all destructive execution behind explicit `--execute` plus `ALLOW_DATA_RESET=yes`, and verify preservation through unit tests before any database run.

**Tech Stack:** Node.js 20, TypeScript, Prisma Client, Jest, npm workspace scripts.

---

## Scope And File Map

**Spec:** `docs/superpowers/specs/2026-04-29-clean-reset-and-single-product-validation-design.md`

**Files to create:**

- `server/scripts/clean-reset-config.ts`  
  Owns preserved delegate names, cleanable delegate names, delete order, snapshot labels, validation product constants.

- `server/scripts/clean-reset-preserve-control-data.ts`  
  CLI script for `snapshot`, `dry-run`, and guarded `execute` modes.

- `server/scripts/seed-single-product-validation.ts`  
  CLI script that seeds one real product chain for `香蕉蒸蛋糕（原味）`.

- `server/scripts/__tests__/clean-reset-config.spec.ts`  
  Static tests proving protected delegates are never included in cleanable delegates and delete order is valid.

- `server/scripts/__tests__/single-product-validation-data.spec.ts`  
  Static tests proving validation seed data has the required product, materials, suppliers, material lots, recipe lines, production batch, and traceability bridge rows.

- `docs/superpowers/runbooks/2026-04-29-clean-reset-and-single-product-validation-runbook.md`  
  Human-run checklist for backup, dry-run, execute, seed, and manual smoke validation.

**Files to modify:**

- `server/package.json`  
  Add npm scripts for snapshot, dry-run, execute, and single-product seed.

**Do not modify:**

- `server/src/prisma/schema.prisma`
- Any migration file
- Existing seed scripts unless a compile error proves an import boundary must move
- Document upload directories or file storage

---

## Task 1: Add Reset Configuration And Safety Tests

**Files:**

- Create: `server/scripts/clean-reset-config.ts`
- Create: `server/scripts/__tests__/clean-reset-config.spec.ts`

- [ ] **Step 1: Write the failing config test**

Create `server/scripts/__tests__/clean-reset-config.spec.ts`:

```ts
import {
  CLEAN_RESET_DELETE_ORDER,
  CLEAN_RESET_PRESERVED_DELEGATES,
  CLEAN_RESET_TARGET_DELEGATES,
  SINGLE_PRODUCT_VALIDATION_DATA,
} from '../clean-reset-config';

describe('clean reset config', () => {
  it('never includes preserved document, equipment, auth, template, or system delegates in clean targets', () => {
    const preserved = new Set(CLEAN_RESET_PRESERVED_DELEGATES);

    for (const delegateName of CLEAN_RESET_TARGET_DELEGATES) {
      expect(preserved.has(delegateName)).toBe(false);
    }

    expect(preserved.has('document')).toBe(true);
    expect(preserved.has('documentVersion')).toBe(true);
    expect(preserved.has('documentReference')).toBe(true);
    expect(preserved.has('equipment')).toBe(true);
    expect(preserved.has('measuringEquipment')).toBe(true);
    expect(preserved.has('recordTemplate')).toBe(true);
    expect(preserved.has('user')).toBe(true);
    expect(preserved.has('department')).toBe(true);
    expect(preserved.has('fineGrainedPermission')).toBe(true);
  });

  it('delete order contains every clean target exactly once', () => {
    expect(new Set(CLEAN_RESET_DELETE_ORDER)).toEqual(new Set(CLEAN_RESET_TARGET_DELEGATES));
    expect(CLEAN_RESET_DELETE_ORDER).toHaveLength(CLEAN_RESET_TARGET_DELEGATES.length);
  });

  it('deletes child rows before parent rows for core traceability relations', () => {
    const order = CLEAN_RESET_DELETE_ORDER;

    expect(order.indexOf('batchMaterialUsage')).toBeLessThan(order.indexOf('productionBatch'));
    expect(order.indexOf('recipeLine')).toBeLessThan(order.indexOf('recipe'));
    expect(order.indexOf('recipe')).toBeLessThan(order.indexOf('product'));
    expect(order.indexOf('materialBatch')).toBeLessThan(order.indexOf('material'));
    expect(order.indexOf('stockRecord')).toBeLessThan(order.indexOf('materialBatch'));
    expect(order.indexOf('supplierQualification')).toBeLessThan(order.indexOf('supplier'));
  });

  it('single product validation data uses one real product and enough materials', () => {
    expect(SINGLE_PRODUCT_VALIDATION_DATA.product.name).toBe('香蕉蒸蛋糕（原味）');
    expect(SINGLE_PRODUCT_VALIDATION_DATA.materials.length).toBeGreaterThanOrEqual(7);
    expect(SINGLE_PRODUCT_VALIDATION_DATA.materialLots).toHaveLength(
      SINGLE_PRODUCT_VALIDATION_DATA.materials.length,
    );
    expect(SINGLE_PRODUCT_VALIDATION_DATA.recipeLines).toHaveLength(
      SINGLE_PRODUCT_VALIDATION_DATA.materials.length,
    );
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- clean-reset-config.spec.ts --runInBand
```

Expected: `FAIL` because `server/scripts/clean-reset-config.ts` does not exist.

- [ ] **Step 3: Create the reset config**

Create `server/scripts/clean-reset-config.ts`:

```ts
export const CLEAN_RESET_PRESERVED_DELEGATES = [
  'user',
  'department',
  'role',
  'permission',
  'rolePermission',
  'fineGrainedPermission',
  'roleFineGrainedPermission',
  'departmentPermission',
  'userPermission',
  'numberRule',
  'systemConfig',
  'recordTemplate',
  'recordFormLandingEntry',
  'approvalDefinition',
  'processTemplate',
  'workflowTemplate',
  'document',
  'documentVersion',
  'documentReference',
  'businessDocumentLink',
  'documentReadRequirement',
  'documentReadConfirmation',
  'documentTrainingNeed',
  'documentCoverageReview',
  'documentViewLog',
  'documentRecommendation',
  'fulltextIndex',
  'equipment',
  'measuringEquipment',
] as const;

export const CLEAN_RESET_TARGET_DELEGATES = [
  'alertHistory',
  'approvalAction',
  'approvalTask',
  'approvalInstance',
  'assetLoanRecord',
  'batchMaterialUsage',
  'calibrationRecord',
  'cCPRecord',
  'changeApproval',
  'changeComplianceRecord',
  'changeEventFormTask',
  'changeEventRelation',
  'changeVerificationRecord',
  'documentImpactItem',
  'documentImpactReview',
  'changeEvent',
  'cleaningRecord',
  'correctiveAction',
  'customerComplaint',
  'deliveryNote',
  'deviationReport',
  'emergencyDrillRecord',
  'environmentRecord',
  'equipmentFault',
  'examRecord',
  'externalParty',
  'finishedGoodsBatch',
  'foodSafetyCultureRecord',
  'fragileItemInspection',
  'incomingInspectionResult',
  'incomingInspection',
  'inventoryMovement',
  'learningRecord',
  'lineChangeCheckRecord',
  'maintenanceRecord',
  'maintenancePlan',
  'materialBalance',
  'materialInboundItem',
  'materialInbound',
  'materialRequisitionItem',
  'materialRequisition',
  'materialReturnItem',
  'materialReturn',
  'materialScrapItem',
  'materialScrap',
  'metalDetectionLog',
  'nonConformance',
  'packagingMaterialUsage',
  'processMonitorRecord',
  'processStep',
  'recipeLine',
  'recipe',
  'productionRun',
  'productionBatch',
  'recordChangeLog',
  'recordTaskInstance',
  'recordTaskAssignment',
  'taskRecord',
  'task',
  'record',
  'reworkRecord',
  'sample',
  'shiftInstance',
  'stagingAreaRecord',
  'stagingAreaStock',
  'stagingAreaTransfer',
  'stockCount',
  'stockRecord',
  'supplierDocument',
  'supplierEvaluation',
  'supplierQualification',
  'materialBatch',
  'material',
  'supplier',
  'todoTask',
  'traceabilitySnapshot',
  'trainingArchive',
  'trainingQuestion',
  'trainingProject',
  'trainingPlan',
  'verificationRecord',
  'violationRecord',
  'wasteDisposalRecord',
  'wasteRecord',
  'workflowTask',
  'workflowInstance',
  'product',
] as const;

export const CLEAN_RESET_DELETE_ORDER = CLEAN_RESET_TARGET_DELEGATES;

export const CLEAN_RESET_SNAPSHOT_DELEGATES = [
  ...CLEAN_RESET_PRESERVED_DELEGATES,
  ...CLEAN_RESET_TARGET_DELEGATES,
] as const;

export const CLEAN_RESET_REQUIRED_ENV = 'ALLOW_DATA_RESET';
export const CLEAN_RESET_REQUIRED_ENV_VALUE = 'yes';

export const SINGLE_PRODUCT_VALIDATION_DATA = {
  companyId: '1',
  adminUserId: 'user_admin',
  product: {
    code: 'PROD-BANANA-CAKE-ORIGINAL',
    name: '香蕉蒸蛋糕（原味）',
    spec: '35g/枚，12枚/箱',
    netWeight: '35.0000',
    weightUnit: 'g',
    shelfLifeDays: 30,
    storageMethod: '常温阴凉干燥处保存',
    consumptionMethod: '开袋即食',
    standardCode: 'GB/T 20977',
    labelAllergens: '含小麦、鸡蛋及其制品',
    productType: '蒸蛋糕',
  },
  suppliers: [
    { code: 'SUP-EGG-001', name: '示范鸡蛋供应商', contact: '王经理', phone: '13800000001' },
    { code: 'SUP-FLOUR-001', name: '示范面粉供应商', contact: '李经理', phone: '13800000002' },
    { code: 'SUP-SUGAR-001', name: '示范白砂糖供应商', contact: '陈经理', phone: '13800000003' },
    { code: 'SUP-OIL-001', name: '示范食用油供应商', contact: '赵经理', phone: '13800000004' },
    { code: 'SUP-BANANA-001', name: '示范香蕉原料供应商', contact: '刘经理', phone: '13800000005' },
    { code: 'SUP-PACK-001', name: '示范包材供应商', contact: '周经理', phone: '13800000006' },
  ],
  materialCategory: { code: 'CAT-VALIDATION', name: '单产品实测物料' },
  materials: [
    { code: 'MAT-EGG-001', name: '鲜鸡蛋液', spec: '10kg/桶', unit: 'kg', supplierCode: 'SUP-EGG-001', shelfLifeDays: 7, allergen: true },
    { code: 'MAT-FLOUR-001', name: '小麦粉', spec: '25kg/袋', unit: 'kg', supplierCode: 'SUP-FLOUR-001', shelfLifeDays: 180, allergen: true },
    { code: 'MAT-SUGAR-001', name: '白砂糖', spec: '50kg/袋', unit: 'kg', supplierCode: 'SUP-SUGAR-001', shelfLifeDays: 365, allergen: false },
    { code: 'MAT-OIL-001', name: '食用植物油', spec: '20kg/桶', unit: 'kg', supplierCode: 'SUP-OIL-001', shelfLifeDays: 365, allergen: false },
    { code: 'MAT-BANANA-001', name: '香蕉浆', spec: '10kg/桶', unit: 'kg', supplierCode: 'SUP-BANANA-001', shelfLifeDays: 90, allergen: false },
    { code: 'MAT-FILM-001', name: '蒸蛋糕包装膜', spec: '卷膜', unit: 'roll', supplierCode: 'SUP-PACK-001', shelfLifeDays: 730, allergen: false },
    { code: 'MAT-OXY-001', name: '脱氧剂', spec: '1000包/袋', unit: 'bag', supplierCode: 'SUP-PACK-001', shelfLifeDays: 730, allergen: false },
  ],
  materialLots: [
    { materialCode: 'MAT-EGG-001', batchNumber: 'ML-BANANA-20260429-EGG', supplierBatchNo: 'EGG-20260426-A', quantity: 120 },
    { materialCode: 'MAT-FLOUR-001', batchNumber: 'ML-BANANA-20260429-FLOUR', supplierBatchNo: 'FL-20260420-A', quantity: 300 },
    { materialCode: 'MAT-SUGAR-001', batchNumber: 'ML-BANANA-20260429-SUGAR', supplierBatchNo: 'SG-20260418-A', quantity: 200 },
    { materialCode: 'MAT-OIL-001', batchNumber: 'ML-BANANA-20260429-OIL', supplierBatchNo: 'OIL-20260415-A', quantity: 100 },
    { materialCode: 'MAT-BANANA-001', batchNumber: 'ML-BANANA-20260429-BANANA', supplierBatchNo: 'BN-20260425-A', quantity: 80 },
    { materialCode: 'MAT-FILM-001', batchNumber: 'ML-BANANA-20260429-FILM', supplierBatchNo: 'PK-20260410-A', quantity: 10 },
    { materialCode: 'MAT-OXY-001', batchNumber: 'ML-BANANA-20260429-OXY', supplierBatchNo: 'OXY-20260410-A', quantity: 5 },
  ],
  recipeLines: [
    { materialCode: 'MAT-EGG-001', qtyPerBatch: '45.0000', unit: 'kg', critical: true },
    { materialCode: 'MAT-FLOUR-001', qtyPerBatch: '38.0000', unit: 'kg', critical: true },
    { materialCode: 'MAT-SUGAR-001', qtyPerBatch: '28.0000', unit: 'kg', critical: false },
    { materialCode: 'MAT-OIL-001', qtyPerBatch: '12.0000', unit: 'kg', critical: false },
    { materialCode: 'MAT-BANANA-001', qtyPerBatch: '18.0000', unit: 'kg', critical: true },
    { materialCode: 'MAT-FILM-001', qtyPerBatch: '1.0000', unit: 'roll', critical: true },
    { materialCode: 'MAT-OXY-001', qtyPerBatch: '1.0000', unit: 'bag', critical: true },
  ],
  productionBatch: {
    batchNumber: 'PB-BANANA-20260429-001',
    plannedQuantity: 1000,
    actualQuantity: 960,
    shift: '白班',
    productionLine: '蒸蛋糕一线',
  },
} as const;
```

- [ ] **Step 4: Run the config test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- clean-reset-config.spec.ts --runInBand
```

Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/scripts/clean-reset-config.ts server/scripts/__tests__/clean-reset-config.spec.ts
git commit -m "test: define clean reset safety config"
```

---

## Task 2: Add Snapshot And Guarded Reset Script

**Files:**

- Create: `server/scripts/clean-reset-preserve-control-data.ts`
- Modify: `server/scripts/__tests__/clean-reset-config.spec.ts`

- [ ] **Step 1: Extend config tests with mode and guard expectations**

Append to `server/scripts/__tests__/clean-reset-config.spec.ts`:

```ts
import {
  CLEAN_RESET_REQUIRED_ENV,
  CLEAN_RESET_REQUIRED_ENV_VALUE,
} from '../clean-reset-config';

describe('clean reset execution guard', () => {
  it('requires an explicit environment acknowledgement for destructive execution', () => {
    expect(CLEAN_RESET_REQUIRED_ENV).toBe('ALLOW_DATA_RESET');
    expect(CLEAN_RESET_REQUIRED_ENV_VALUE).toBe('yes');
  });
});
```

- [ ] **Step 2: Run test to verify import fails until implementation exists**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- clean-reset-config.spec.ts --runInBand
```

Expected: `PASS` if Task 1 already exported the guard constants. If it fails, add the constants exactly as shown in Task 1.

- [ ] **Step 3: Create guarded reset script**

Create `server/scripts/clean-reset-preserve-control-data.ts`:

```ts
import { PrismaClient } from '@prisma/client';
import {
  CLEAN_RESET_DELETE_ORDER,
  CLEAN_RESET_PRESERVED_DELEGATES,
  CLEAN_RESET_REQUIRED_ENV,
  CLEAN_RESET_REQUIRED_ENV_VALUE,
  CLEAN_RESET_SNAPSHOT_DELEGATES,
} from './clean-reset-config';

const prisma = new PrismaClient();

type ResetMode = 'snapshot' | 'dry-run' | 'execute';
type PrismaDelegateName = (typeof CLEAN_RESET_SNAPSHOT_DELEGATES)[number];

function parseMode(argv: string[]): ResetMode {
  if (argv.includes('--execute')) return 'execute';
  if (argv.includes('--dry-run')) return 'dry-run';
  return 'snapshot';
}

function delegateFor(name: PrismaDelegateName) {
  const delegate = (prisma as unknown as Record<string, { count: () => Promise<number>; deleteMany: () => Promise<{ count: number }> }>)[name];
  if (!delegate) {
    throw new Error(`Prisma delegate not found: ${name}`);
  }
  return delegate;
}

async function countDelegates(delegateNames: readonly PrismaDelegateName[]) {
  const rows: Array<{ delegate: string; count: number }> = [];

  for (const delegateName of delegateNames) {
    const count = await delegateFor(delegateName).count();
    rows.push({ delegate: delegateName, count });
  }

  return rows;
}

function printRows(title: string, rows: Array<{ delegate: string; count: number }>) {
  console.log(`\\n${title}`);
  console.table(rows);
}

async function run() {
  const mode = parseMode(process.argv.slice(2));

  const preservedBefore = await countDelegates(CLEAN_RESET_PRESERVED_DELEGATES);
  const targetBefore = await countDelegates(CLEAN_RESET_DELETE_ORDER);

  printRows('Preserved delegates before reset', preservedBefore);
  printRows('Clean target delegates before reset', targetBefore);

  if (mode === 'snapshot') {
    console.log('\\nSnapshot only. No data was deleted.');
    return;
  }

  if (mode === 'dry-run') {
    console.log('\\nDry run delete order:');
    CLEAN_RESET_DELETE_ORDER.forEach((delegateName, index) => {
      console.log(`${String(index + 1).padStart(2, '0')}. ${delegateName}`);
    });
    console.log('\\nDry run only. No data was deleted.');
    return;
  }

  if (process.env[CLEAN_RESET_REQUIRED_ENV] !== CLEAN_RESET_REQUIRED_ENV_VALUE) {
    throw new Error(
      `Refusing to delete data. Set ${CLEAN_RESET_REQUIRED_ENV}=${CLEAN_RESET_REQUIRED_ENV_VALUE} and pass --execute.`,
    );
  }

  console.log('\\nExecuting clean reset...');
  for (const delegateName of CLEAN_RESET_DELETE_ORDER) {
    const result = await delegateFor(delegateName).deleteMany();
    console.log(`${delegateName}: deleted ${result.count}`);
  }

  const preservedAfter = await countDelegates(CLEAN_RESET_PRESERVED_DELEGATES);
  const targetAfter = await countDelegates(CLEAN_RESET_DELETE_ORDER);

  printRows('Preserved delegates after reset', preservedAfter);
  printRows('Clean target delegates after reset', targetAfter);

  const changedPreserved = preservedAfter.filter((after) => {
    const before = preservedBefore.find((row) => row.delegate === after.delegate);
    return before && before.count !== after.count;
  });

  if (changedPreserved.length > 0) {
    printRows('Unexpected preserved count changes', changedPreserved);
    throw new Error('Clean reset changed preserved delegate counts');
  }

  console.log('\\nClean reset completed. Preserved delegate counts are unchanged.');
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 4: Type-check the script by running snapshot mode**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/clean-reset-preserve-control-data.ts
```

Expected:

- Prints preserved and clean target count tables.
- Ends with `Snapshot only. No data was deleted.`
- Does not delete anything.

- [ ] **Step 5: Run dry-run mode**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/clean-reset-preserve-control-data.ts --dry-run
```

Expected:

- Prints count tables.
- Prints delete order.
- Ends with `Dry run only. No data was deleted.`

- [ ] **Step 6: Verify execute is blocked without environment acknowledgement**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/clean-reset-preserve-control-data.ts --execute
```

Expected: command exits non-zero with:

```text
Refusing to delete data. Set ALLOW_DATA_RESET=yes and pass --execute.
```

- [ ] **Step 7: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/scripts/clean-reset-preserve-control-data.ts server/scripts/__tests__/clean-reset-config.spec.ts
git commit -m "feat: add guarded clean reset script"
```

---

## Task 3: Add Single Product Validation Seed

**Files:**

- Create: `server/scripts/seed-single-product-validation.ts`
- Create: `server/scripts/__tests__/single-product-validation-data.spec.ts`

- [ ] **Step 1: Write validation data tests**

Create `server/scripts/__tests__/single-product-validation-data.spec.ts`:

```ts
import { SINGLE_PRODUCT_VALIDATION_DATA } from '../clean-reset-config';

describe('single product validation seed data', () => {
  it('has one product with complete food-safety fields', () => {
    const product = SINGLE_PRODUCT_VALIDATION_DATA.product;

    expect(product.code).toBe('PROD-BANANA-CAKE-ORIGINAL');
    expect(product.name).toBe('香蕉蒸蛋糕（原味）');
    expect(product.shelfLifeDays).toBe(30);
    expect(product.standardCode).toBe('GB/T 20977');
    expect(product.labelAllergens).toContain('小麦');
    expect(product.labelAllergens).toContain('鸡蛋');
  });

  it('maps every material to an existing supplier and material lot', () => {
    const supplierCodes = new Set(SINGLE_PRODUCT_VALIDATION_DATA.suppliers.map((supplier) => supplier.code));
    const materialCodes = new Set(SINGLE_PRODUCT_VALIDATION_DATA.materials.map((material) => material.code));
    const lotMaterialCodes = new Set(SINGLE_PRODUCT_VALIDATION_DATA.materialLots.map((lot) => lot.materialCode));

    for (const material of SINGLE_PRODUCT_VALIDATION_DATA.materials) {
      expect(supplierCodes.has(material.supplierCode)).toBe(true);
      expect(lotMaterialCodes.has(material.code)).toBe(true);
    }

    for (const recipeLine of SINGLE_PRODUCT_VALIDATION_DATA.recipeLines) {
      expect(materialCodes.has(recipeLine.materialCode)).toBe(true);
    }
  });

  it('uses stable batch numbers for manual traceability testing', () => {
    expect(SINGLE_PRODUCT_VALIDATION_DATA.productionBatch.batchNumber).toBe('PB-BANANA-20260429-001');
    expect(SINGLE_PRODUCT_VALIDATION_DATA.materialLots.map((lot) => lot.batchNumber)).toEqual([
      'ML-BANANA-20260429-EGG',
      'ML-BANANA-20260429-FLOUR',
      'ML-BANANA-20260429-SUGAR',
      'ML-BANANA-20260429-OIL',
      'ML-BANANA-20260429-BANANA',
      'ML-BANANA-20260429-FILM',
      'ML-BANANA-20260429-OXY',
    ]);
  });
});
```

- [ ] **Step 2: Run tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- clean-reset-config.spec.ts single-product-validation-data.spec.ts --runInBand
```

Expected: `PASS`.

- [ ] **Step 3: Create seed script**

Create `server/scripts/seed-single-product-validation.ts`:

```ts
import { PrismaClient } from '@prisma/client';
import { SINGLE_PRODUCT_VALIDATION_DATA } from './clean-reset-config';

const prisma = new PrismaClient();
const data = SINGLE_PRODUCT_VALIDATION_DATA;

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function ensureMaterialCategory() {
  const existing = await prisma.materialCategory.findFirst({
    where: { code: data.materialCategory.code },
  });

  if (existing) return existing;

  return prisma.materialCategory.create({
    data: {
      code: data.materialCategory.code,
      name: data.materialCategory.name,
      description: '单产品真实实测专用分类',
    },
  });
}

async function seedSuppliers() {
  const suppliers = new Map<string, { id: string }>();

  for (const supplier of data.suppliers) {
    const created = await prisma.supplier.upsert({
      where: { supplierCode: supplier.code },
      update: {
        name: supplier.name,
        contact: supplier.contact,
        phone: supplier.phone,
        status: 'active',
        supplier_status: 'approved',
      },
      create: {
        supplierCode: supplier.code,
        name: supplier.name,
        contact: supplier.contact,
        phone: supplier.phone,
        status: 'active',
        supplier_status: 'approved',
      },
    });
    suppliers.set(supplier.code, created);
  }

  return suppliers;
}

async function seedMaterials(categoryId: string) {
  const materials = new Map<string, { id: string }>();

  for (const material of data.materials) {
    const created = await prisma.material.upsert({
      where: { materialCode: material.code },
      update: {
        name: material.name,
        specification: material.spec,
        unit: material.unit,
        categoryId,
        shelfLife: material.shelfLifeDays,
        shelf_life_days: material.shelfLifeDays,
        is_allergen: material.allergen,
        status: 'active',
      },
      create: {
        materialCode: material.code,
        name: material.name,
        specification: material.spec,
        unit: material.unit,
        categoryId,
        shelfLife: material.shelfLifeDays,
        shelf_life_days: material.shelfLifeDays,
        is_allergen: material.allergen,
        allergen_notes: material.allergen ? '标签需声明' : null,
        status: 'active',
      },
    });
    materials.set(material.code, created);
  }

  return materials;
}

async function seedMaterialLots(
  materials: Map<string, { id: string }>,
  suppliers: Map<string, { id: string }>,
) {
  const lots = new Map<string, { id: string }>();
  const supplierByMaterialCode = new Map(data.materials.map((material) => [material.code, material.supplierCode]));

  for (const lot of data.materialLots) {
    const material = materials.get(lot.materialCode);
    if (!material) throw new Error(`Missing material for lot: ${lot.materialCode}`);

    const supplierCode = supplierByMaterialCode.get(lot.materialCode);
    const supplier = supplierCode ? suppliers.get(supplierCode) : undefined;
    if (!supplier) throw new Error(`Missing supplier for lot: ${lot.batchNumber}`);

    const created = await prisma.materialBatch.upsert({
      where: { batchNumber: lot.batchNumber },
      update: {
        materialId: material.id,
        supplierId: supplier.id,
        supplierBatchNo: lot.supplierBatchNo,
        supplier_lot_no: lot.supplierBatchNo,
        quantity: lot.quantity,
        lot_status: 'in_stock',
        status: 'normal',
      },
      create: {
        batchNumber: lot.batchNumber,
        materialId: material.id,
        supplierId: supplier.id,
        supplierBatchNo: lot.supplierBatchNo,
        supplier_lot_no: lot.supplierBatchNo,
        productionDate: dateOnly('2026-04-20'),
        expiryDate: dateOnly('2026-12-31'),
        quantity: lot.quantity,
        warehouseLocation: 'A-01',
        lot_status: 'in_stock',
        status: 'normal',
      },
    });
    lots.set(lot.materialCode, created);
  }

  return lots;
}

async function seedProductAndRecipe(materials: Map<string, { id: string }>) {
  const product = await prisma.product.upsert({
    where: { company_id_code: { company_id: data.companyId, code: data.product.code } },
    update: {
      name: data.product.name,
      spec: data.product.spec,
      shelf_life_days: data.product.shelfLifeDays,
      standard_code: data.product.standardCode,
      storage_method: data.product.storageMethod,
      consumption_method: data.product.consumptionMethod,
      label_allergens: data.product.labelAllergens,
      status: 'active',
    },
    create: {
      company_id: data.companyId,
      code: data.product.code,
      name: data.product.name,
      spec: data.product.spec,
      net_weight: data.product.netWeight,
      weight_unit: data.product.weightUnit,
      shelf_life_days: data.product.shelfLifeDays,
      standard_code: data.product.standardCode,
      storage_method: data.product.storageMethod,
      consumption_method: data.product.consumptionMethod,
      label_allergens: data.product.labelAllergens,
      product_type: data.product.productType,
      status: 'active',
      source: 'single_product_validation',
    },
  });

  const recipe = await prisma.recipe.upsert({
    where: { company_id_product_id_version: { company_id: data.companyId, product_id: product.id, version: 1 } },
    update: { status: 'active', version_note: '单产品实测初始配方' },
    create: {
      company_id: data.companyId,
      product_id: product.id,
      version: 1,
      version_note: '单产品实测初始配方',
      status: 'active',
      approved_by: data.adminUserId,
      approved_at: new Date(),
    },
  });

  for (const line of data.recipeLines) {
    const material = materials.get(line.materialCode);
    if (!material) throw new Error(`Missing material for recipe line: ${line.materialCode}`);

    await prisma.recipeLine.upsert({
      where: { recipe_id_material_id: { recipe_id: recipe.id, material_id: material.id } },
      update: {
        qty_per_batch: line.qtyPerBatch,
        unit: line.unit,
        is_critical: line.critical,
      },
      create: {
        recipe_id: recipe.id,
        material_id: material.id,
        qty_per_batch: line.qtyPerBatch,
        unit: line.unit,
        is_critical: line.critical,
      },
    });
  }

  return { product, recipe };
}

async function seedProductionTraceability(
  product: { id: string; name: string },
  recipe: { id: string },
  materialLots: Map<string, { id: string }>,
) {
  const productionBatch = await prisma.productionBatch.upsert({
    where: { batchNumber: data.productionBatch.batchNumber },
    update: {
      productId: product.id,
      productName: product.name,
      recipeId: recipe.id,
      recipeName: '香蕉蒸蛋糕（原味）V1',
      plannedQuantity: data.productionBatch.plannedQuantity,
      actualQuantity: data.productionBatch.actualQuantity,
      status: 'completed',
    },
    create: {
      batchNumber: data.productionBatch.batchNumber,
      productId: product.id,
      productName: product.name,
      recipeId: recipe.id,
      recipeName: '香蕉蒸蛋糕（原味）V1',
      plannedQuantity: data.productionBatch.plannedQuantity,
      actualQuantity: data.productionBatch.actualQuantity,
      productionDate: dateOnly('2026-04-29'),
      status: 'completed',
      shift: data.productionBatch.shift,
      production_line: data.productionBatch.productionLine,
      output_qty: data.productionBatch.actualQuantity,
    },
  });

  for (const line of data.recipeLines) {
    const lot = materialLots.get(line.materialCode);
    if (!lot) throw new Error(`Missing material lot for usage: ${line.materialCode}`);

    await prisma.batchMaterialUsage.upsert({
      where: {
        productionBatchId_materialBatchId: {
          productionBatchId: productionBatch.id,
          materialBatchId: lot.id,
        },
      },
      update: {
        quantity: Number(line.qtyPerBatch),
      },
      create: {
        productionBatchId: productionBatch.id,
        materialBatchId: lot.id,
        quantity: Number(line.qtyPerBatch),
        usedAt: new Date(),
      },
    });
  }

  return productionBatch;
}

async function run() {
  const category = await ensureMaterialCategory();
  const suppliers = await seedSuppliers();
  const materials = await seedMaterials(category.id);
  const materialLots = await seedMaterialLots(materials, suppliers);
  const { product, recipe } = await seedProductAndRecipe(materials);
  const productionBatch = await seedProductionTraceability(product, recipe, materialLots);

  console.log('Single product validation data ready:');
  console.table([
    { label: 'product', value: data.product.code },
    { label: 'productionBatch', value: productionBatch.batchNumber },
    { label: 'materials', value: materials.size },
    { label: 'materialLots', value: materialLots.size },
  ]);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 4: Run the seed script**

Run after the clean reset is complete, not before:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-single-product-validation.ts
```

Expected:

- Prints `Single product validation data ready`.
- Shows product `PROD-BANANA-CAKE-ORIGINAL`.
- Shows production batch `PB-BANANA-20260429-001`.
- Shows `materials: 7`.
- Shows `materialLots: 7`.

- [ ] **Step 5: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/scripts/seed-single-product-validation.ts server/scripts/__tests__/single-product-validation-data.spec.ts
git commit -m "feat: seed single product validation chain"
```

---

## Task 4: Add Package Scripts

**Files:**

- Modify: `server/package.json`

- [ ] **Step 1: Add npm scripts**

Modify the `scripts` block in `server/package.json` by adding:

```json
"clean-reset:snapshot": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/clean-reset-preserve-control-data.ts",
"clean-reset:dry-run": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/clean-reset-preserve-control-data.ts --dry-run",
"clean-reset:execute": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/clean-reset-preserve-control-data.ts --execute",
"seed:single-product-validation": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/seed-single-product-validation.ts"
```

Place them after the existing `seed:templates` script so all data scripts remain grouped.

- [ ] **Step 2: Validate JSON**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log('package json ok')"
```

Expected:

```text
package json ok
```

- [ ] **Step 3: Run script entrypoints in safe modes**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run clean-reset:snapshot
npm run clean-reset:dry-run
```

Expected:

- Snapshot prints count tables and deletes nothing.
- Dry-run prints count tables plus delete order and deletes nothing.

- [ ] **Step 4: Verify destructive script remains blocked by default**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run clean-reset:execute
```

Expected: command exits non-zero with:

```text
Refusing to delete data. Set ALLOW_DATA_RESET=yes and pass --execute.
```

- [ ] **Step 5: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/package.json
git commit -m "chore: add clean reset npm scripts"
```

---

## Task 5: Add Operator Runbook

**Files:**

- Create: `docs/superpowers/runbooks/2026-04-29-clean-reset-and-single-product-validation-runbook.md`

- [ ] **Step 1: Create the runbook**

Create `docs/superpowers/runbooks/2026-04-29-clean-reset-and-single-product-validation-runbook.md`:

```md
# 清库保留与单产品实测运行手册

## 1. 执行边界

本手册只用于本地库或测试库。正式库必须先完成数据库备份和文件存储备份后再评估执行。

清理必须保留：

- 文控中心所有 Document、DocumentVersion、DocumentReference
- 文控治理配置
- RecordTemplate
- RecordFormLandingEntry
- Equipment
- MeasuringEquipment
- User、Department、Role、Permission、FineGrainedPermission

## 2. 清理前检查

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run clean-reset:snapshot
```

确认输出里以下 delegate 的 count 在清理前有记录：

- document
- documentVersion
- documentReference
- recordTemplate
- recordFormLandingEntry
- equipment
- measuringEquipment
- user
- department

## 3. Dry Run

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run clean-reset:dry-run
```

确认 delete order 中没有以下 delegate：

- document
- documentVersion
- documentReference
- recordTemplate
- recordFormLandingEntry
- equipment
- measuringEquipment
- user
- department

## 4. 执行清理

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
ALLOW_DATA_RESET=yes npm run clean-reset:execute
```

执行完成后确认输出包含：

```text
Clean reset completed. Preserved delegate counts are unchanged.
```

## 5. 种入一个真实产品链路

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run seed:single-product-validation
```

确认输出包含：

- PROD-BANANA-CAKE-ORIGINAL
- PB-BANANA-20260429-001
- materials: 7
- materialLots: 7

## 6. 手工实测

1. 登录系统。
2. 打开文控中心，确认体系文件仍可查看。
3. 打开设备台账，确认设备仍可查看。
4. 打开产品主数据，确认存在“香蕉蒸蛋糕（原味）”。
5. 打开物料主数据，确认 7 个关键物料存在。
6. 打开物料批次，确认 7 个物料批次存在。
7. 打开生产批次，确认 `PB-BANANA-20260429-001` 存在。
8. 打开追溯查询，以生产批次 `PB-BANANA-20260429-001` 查询。
9. 确认追溯结果能看到物料批次和供应商。
10. 打开文控工作台，确认文档和记录表单治理入口仍可用。

## 7. 回滚

如果清理结果不符合预期，停止继续录入数据，从清理前数据库备份恢复。
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add docs/superpowers/runbooks/2026-04-29-clean-reset-and-single-product-validation-runbook.md
git commit -m "docs: add clean reset validation runbook"
```

---

## Task 6: Verification Pass

**Files:**

- No new files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- clean-reset-config.spec.ts single-product-validation-data.spec.ts --runInBand
```

Expected: all tests pass.

- [ ] **Step 2: Verify safe commands**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run clean-reset:snapshot
npm run clean-reset:dry-run
```

Expected:

- Both commands exit `0`.
- Neither command deletes data.

- [ ] **Step 3: Verify destructive command is guarded**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run clean-reset:execute
```

Expected: exits non-zero with the guard error:

```text
Refusing to delete data. Set ALLOW_DATA_RESET=yes and pass --execute.
```

- [ ] **Step 4: Run type/build check if dependencies are installed**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run build
```

Expected: build succeeds.

If build fails because dependencies are missing, run from repo root:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm ci
cd server
npm run build
```

- [ ] **Step 5: Review changed files**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git status --short
git diff --stat HEAD
git diff --check
```

Expected:

- Only intended files are changed.
- `git diff --check` prints no whitespace errors.

- [ ] **Step 6: Final commit if verification changed docs or scripts**

If Task 6 causes any small documentation correction, commit it:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add docs/superpowers/runbooks/2026-04-29-clean-reset-and-single-product-validation-runbook.md server/scripts server/package.json
git commit -m "chore: verify clean reset workflow"
```

If there are no changes, skip this commit.

---

## Execution Notes

Do not run this command until the user explicitly approves real cleanup:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
ALLOW_DATA_RESET=yes npm run clean-reset:execute
```

After actual cleanup and seed, the first manual test should use:

- Product: `香蕉蒸蛋糕（原味）`
- Product code: `PROD-BANANA-CAKE-ORIGINAL`
- Production batch: `PB-BANANA-20260429-001`
- Material lots:
  - `ML-BANANA-20260429-EGG`
  - `ML-BANANA-20260429-FLOUR`
  - `ML-BANANA-20260429-SUGAR`
  - `ML-BANANA-20260429-OIL`
  - `ML-BANANA-20260429-BANANA`
  - `ML-BANANA-20260429-FILM`
  - `ML-BANANA-20260429-OXY`

---

## Self-Review

**Spec coverage:** The plan covers backup/snapshot behavior, preserved tables, clean target tables, guarded delete execution, single-product data, manual smoke validation, and rollback guidance.

**Placeholder scan:** The plan does not contain open placeholders. All scripts, tests, commands, expected outputs, and filenames are specified.

**Type consistency:** Config exports are reused consistently by tests and scripts. The reset script uses Prisma delegate names from config. The single-product script uses the same validation data constants as the tests.
