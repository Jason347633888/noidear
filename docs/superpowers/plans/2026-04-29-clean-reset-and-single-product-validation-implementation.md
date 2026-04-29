# Clean Reset And Real Product Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safe local/test-database reset workflow that preserves document-control data and equipment ledgers, then imports one user-provided real product data package for manual validation.

**Architecture:** Add a guarded reset script, a strict JSON import contract, a validation-only command, and an import command. The repo must not contain invented product seed data; the real product package is supplied by the user outside git and validated before database writes.

**Tech Stack:** Node.js 20, TypeScript, Prisma Client, Jest, npm workspace scripts.

---

## Scope And File Map

**Spec:** `docs/superpowers/specs/2026-04-29-clean-reset-and-single-product-validation-design.md`

**Files to create:**

- `server/scripts/clean-reset-config.ts`
  Owns preserved Prisma delegates, cleanable Prisma delegates, delete order, and import contract types.

- `server/scripts/clean-reset-preserve-control-data.ts`
  CLI script for `snapshot`, `dry-run`, and guarded `execute` modes.

- `server/scripts/validate-real-product-validation-data.ts`
  CLI script that reads a user-provided JSON file and validates the single-product data package without writing to the database.

- `server/scripts/import-real-product-validation-data.ts`
  CLI script that imports the already validated user-provided JSON file.

- `server/scripts/__tests__/clean-reset-config.spec.ts`
  Static safety tests for preserved delegates and delete order.

- `server/scripts/__tests__/real-product-validation-data.spec.ts`
  Contract tests for the JSON validation function using in-memory sample data.

- `docs/superpowers/runbooks/2026-04-29-clean-reset-and-real-product-validation-runbook.md`
  Human-run checklist for backup, dry-run, execute, data-file preparation, validation, import, and manual smoke testing.

- `docs/superpowers/templates/real-product-validation-data.example.json`
  Structure-only example with replacement values. It is not seed data and must not be imported as real business data.

**Files to modify:**

- `server/package.json`  
  Add npm scripts for snapshot, dry-run, execute, validate, and import.

**Do not modify:**

- `server/src/prisma/schema.prisma`
- Any migration file
- Existing seed scripts
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
  CLEAN_RESET_REQUIRED_ENV,
  CLEAN_RESET_REQUIRED_ENV_VALUE,
  CLEAN_RESET_TARGET_DELEGATES,
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

  it('requires an explicit environment acknowledgement for destructive execution', () => {
    expect(CLEAN_RESET_REQUIRED_ENV).toBe('ALLOW_DATA_RESET');
    expect(CLEAN_RESET_REQUIRED_ENV_VALUE).toBe('yes');
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

export type RealProductValidationData = {
  companyId: string;
  product: {
    code: string;
    name: string;
    spec?: string;
    netWeight?: string;
    weightUnit?: string;
    shelfLifeDays?: number;
    storageMethod?: string;
    consumptionMethod?: string;
    standardCode?: string;
    labelAllergens?: string;
    productType?: string;
  };
  suppliers: Array<{
    code: string;
    name: string;
    contact?: string;
    phone?: string;
    address?: string;
  }>;
  materialCategory: {
    code: string;
    name: string;
  };
  materials: Array<{
    code: string;
    name: string;
    spec?: string;
    unit: string;
    supplierCode: string;
    shelfLifeDays?: number;
    allergen?: boolean;
    materialType?: 'raw' | 'auxiliary' | 'packaging';
  }>;
  materialLots: Array<{
    materialCode: string;
    batchNumber: string;
    supplierBatchNo?: string;
    productionDate: string;
    expiryDate: string;
    quantity: number;
    warehouseLocation?: string;
  }>;
  recipe: {
    version: number;
    versionNote?: string;
    lines: Array<{
      materialCode: string;
      qtyPerBatch: string;
      unit: string;
      critical?: boolean;
    }>;
  };
  productionBatch: {
    batchNumber: string;
    plannedQuantity: number;
    actualQuantity?: number;
    productionDate: string;
    shift?: string;
    productionLine?: string;
  };
};
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

## Task 2: Add Guarded Reset Script

**Files:**

- Create: `server/scripts/clean-reset-preserve-control-data.ts`

- [ ] **Step 1: Create guarded reset script**

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
  console.log(`\n${title}`);
  console.table(rows);
}

async function run() {
  const mode = parseMode(process.argv.slice(2));

  const preservedBefore = await countDelegates(CLEAN_RESET_PRESERVED_DELEGATES);
  const targetBefore = await countDelegates(CLEAN_RESET_DELETE_ORDER);

  printRows('Preserved delegates before reset', preservedBefore);
  printRows('Clean target delegates before reset', targetBefore);

  if (mode === 'snapshot') {
    console.log('\nSnapshot only. No data was deleted.');
    return;
  }

  if (mode === 'dry-run') {
    console.log('\nDry run delete order:');
    CLEAN_RESET_DELETE_ORDER.forEach((delegateName, index) => {
      console.log(`${String(index + 1).padStart(2, '0')}. ${delegateName}`);
    });
    console.log('\nDry run only. No data was deleted.');
    return;
  }

  if (process.env[CLEAN_RESET_REQUIRED_ENV] !== CLEAN_RESET_REQUIRED_ENV_VALUE) {
    throw new Error(
      `Refusing to delete data. Set ${CLEAN_RESET_REQUIRED_ENV}=${CLEAN_RESET_REQUIRED_ENV_VALUE} and pass --execute.`,
    );
  }

  console.log('\nExecuting clean reset...');
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

  console.log('\nClean reset completed. Preserved delegate counts are unchanged.');
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

- [ ] **Step 2: Run snapshot mode**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/clean-reset-preserve-control-data.ts
```

Expected: prints count tables and ends with `Snapshot only. No data was deleted.`

- [ ] **Step 3: Run dry-run mode**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/clean-reset-preserve-control-data.ts --dry-run
```

Expected: prints count tables, delete order, and `Dry run only. No data was deleted.`

- [ ] **Step 4: Verify execute is blocked by default**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/clean-reset-preserve-control-data.ts --execute
```

Expected: exits non-zero with `Refusing to delete data. Set ALLOW_DATA_RESET=yes and pass --execute.`

- [ ] **Step 5: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/scripts/clean-reset-preserve-control-data.ts
git commit -m "feat: add guarded clean reset script"
```

---

## Task 3: Add Real Product Data Validation

**Files:**

- Create: `server/scripts/validate-real-product-validation-data.ts`
- Create: `server/scripts/__tests__/real-product-validation-data.spec.ts`
- Create: `docs/superpowers/templates/real-product-validation-data.example.json`

- [ ] **Step 1: Write validation tests**

Create `server/scripts/__tests__/real-product-validation-data.spec.ts`:

```ts
import { validateRealProductValidationData } from '../validate-real-product-validation-data';
import { RealProductValidationData } from '../clean-reset-config';

const validData: RealProductValidationData = {
  companyId: '1',
  product: {
    code: 'REAL-PRODUCT-001',
    name: '用户提供的真实产品',
    spec: '真实规格',
    shelfLifeDays: 30,
  },
  suppliers: [{ code: 'REAL-SUP-001', name: '真实供应商' }],
  materialCategory: { code: 'REAL-CAT-001', name: '真实物料分类' },
  materials: [
    {
      code: 'REAL-MAT-001',
      name: '真实物料',
      unit: 'kg',
      supplierCode: 'REAL-SUP-001',
      allergen: false,
    },
  ],
  materialLots: [
    {
      materialCode: 'REAL-MAT-001',
      batchNumber: 'REAL-LOT-001',
      supplierBatchNo: 'SUP-LOT-001',
      productionDate: '2026-04-01',
      expiryDate: '2026-12-31',
      quantity: 100,
    },
  ],
  recipe: {
    version: 1,
    versionNote: '真实配方',
    lines: [{ materialCode: 'REAL-MAT-001', qtyPerBatch: '10.0000', unit: 'kg', critical: true }],
  },
  productionBatch: {
    batchNumber: 'REAL-PB-001',
    plannedQuantity: 1000,
    actualQuantity: 980,
    productionDate: '2026-04-29',
  },
};

describe('validateRealProductValidationData', () => {
  it('accepts a complete single-product package', () => {
    expect(validateRealProductValidationData(validData)).toEqual([]);
  });

  it('rejects missing product identity', () => {
    const data = { ...validData, product: { ...validData.product, code: '' } };

    expect(validateRealProductValidationData(data)).toContain('product.code is required');
  });

  it('rejects material supplier references that do not exist', () => {
    const data: RealProductValidationData = {
      ...validData,
      materials: [{ ...validData.materials[0], supplierCode: 'MISSING-SUP' }],
    };

    expect(validateRealProductValidationData(data)).toContain(
      'materials[0].supplierCode references missing supplier: MISSING-SUP',
    );
  });

  it('rejects material lots that reference missing materials', () => {
    const data: RealProductValidationData = {
      ...validData,
      materialLots: [{ ...validData.materialLots[0], materialCode: 'MISSING-MAT' }],
    };

    expect(validateRealProductValidationData(data)).toContain(
      'materialLots[0].materialCode references missing material: MISSING-MAT',
    );
  });

  it('rejects recipe lines that reference missing materials', () => {
    const data: RealProductValidationData = {
      ...validData,
      recipe: {
        ...validData.recipe,
        lines: [{ ...validData.recipe.lines[0], materialCode: 'MISSING-MAT' }],
      },
    };

    expect(validateRealProductValidationData(data)).toContain(
      'recipe.lines[0].materialCode references missing material: MISSING-MAT',
    );
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- real-product-validation-data.spec.ts --runInBand
```

Expected: `FAIL` because `validate-real-product-validation-data.ts` does not exist.

- [ ] **Step 3: Create validation script**

Create `server/scripts/validate-real-product-validation-data.ts`:

```ts
import { readFileSync } from 'node:fs';
import { RealProductValidationData } from './clean-reset-config';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidDateString(value: unknown): boolean {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

export function validateRealProductValidationData(input: unknown): string[] {
  const errors: string[] = [];

  if (!isObject(input)) return ['root must be an object'];
  const data = input as RealProductValidationData;

  if (!isNonEmptyString(data.companyId)) errors.push('companyId is required');
  if (!isObject(data.product)) {
    errors.push('product is required');
  } else {
    if (!isNonEmptyString(data.product.code)) errors.push('product.code is required');
    if (!isNonEmptyString(data.product.name)) errors.push('product.name is required');
  }

  if (!Array.isArray(data.suppliers) || data.suppliers.length === 0) {
    errors.push('suppliers must contain at least one supplier');
  }
  if (!Array.isArray(data.materials) || data.materials.length === 0) {
    errors.push('materials must contain at least one material');
  }
  if (!Array.isArray(data.materialLots) || data.materialLots.length === 0) {
    errors.push('materialLots must contain at least one material lot');
  }
  if (!isObject(data.recipe) || !Array.isArray(data.recipe.lines) || data.recipe.lines.length === 0) {
    errors.push('recipe.lines must contain at least one recipe line');
  }
  if (!isObject(data.productionBatch)) {
    errors.push('productionBatch is required');
  }

  const supplierCodes = new Set<string>();
  data.suppliers?.forEach((supplier, index) => {
    if (!isNonEmptyString(supplier.code)) errors.push(`suppliers[${index}].code is required`);
    if (!isNonEmptyString(supplier.name)) errors.push(`suppliers[${index}].name is required`);
    if (isNonEmptyString(supplier.code)) supplierCodes.add(supplier.code);
  });

  const materialCodes = new Set<string>();
  data.materials?.forEach((material, index) => {
    if (!isNonEmptyString(material.code)) errors.push(`materials[${index}].code is required`);
    if (!isNonEmptyString(material.name)) errors.push(`materials[${index}].name is required`);
    if (!isNonEmptyString(material.unit)) errors.push(`materials[${index}].unit is required`);
    if (!isNonEmptyString(material.supplierCode)) {
      errors.push(`materials[${index}].supplierCode is required`);
    } else if (!supplierCodes.has(material.supplierCode)) {
      errors.push(`materials[${index}].supplierCode references missing supplier: ${material.supplierCode}`);
    }
    if (isNonEmptyString(material.code)) materialCodes.add(material.code);
  });

  data.materialLots?.forEach((lot, index) => {
    if (!isNonEmptyString(lot.materialCode)) {
      errors.push(`materialLots[${index}].materialCode is required`);
    } else if (!materialCodes.has(lot.materialCode)) {
      errors.push(`materialLots[${index}].materialCode references missing material: ${lot.materialCode}`);
    }
    if (!isNonEmptyString(lot.batchNumber)) errors.push(`materialLots[${index}].batchNumber is required`);
    if (!isValidDateString(lot.productionDate)) errors.push(`materialLots[${index}].productionDate must be YYYY-MM-DD`);
    if (!isValidDateString(lot.expiryDate)) errors.push(`materialLots[${index}].expiryDate must be YYYY-MM-DD`);
    if (!isPositiveNumber(lot.quantity)) errors.push(`materialLots[${index}].quantity must be positive`);
  });

  data.recipe?.lines?.forEach((line, index) => {
    if (!isNonEmptyString(line.materialCode)) {
      errors.push(`recipe.lines[${index}].materialCode is required`);
    } else if (!materialCodes.has(line.materialCode)) {
      errors.push(`recipe.lines[${index}].materialCode references missing material: ${line.materialCode}`);
    }
    if (!isNonEmptyString(line.qtyPerBatch)) errors.push(`recipe.lines[${index}].qtyPerBatch is required`);
    if (!isNonEmptyString(line.unit)) errors.push(`recipe.lines[${index}].unit is required`);
  });

  if (data.productionBatch) {
    if (!isNonEmptyString(data.productionBatch.batchNumber)) errors.push('productionBatch.batchNumber is required');
    if (!isPositiveNumber(data.productionBatch.plannedQuantity)) errors.push('productionBatch.plannedQuantity must be positive');
    if (!isValidDateString(data.productionBatch.productionDate)) errors.push('productionBatch.productionDate must be YYYY-MM-DD');
  }

  return errors;
}

export function readRealProductValidationData(filePath: string): RealProductValidationData {
  return JSON.parse(readFileSync(filePath, 'utf8')) as RealProductValidationData;
}

if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: ts-node scripts/validate-real-product-validation-data.ts <data-file.json>');
    process.exit(1);
  }

  const data = readRealProductValidationData(filePath);
  const errors = validateRealProductValidationData(data);

  if (errors.length > 0) {
    console.error('Real product validation data is invalid:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log('Real product validation data is valid.');
}
```

- [ ] **Step 4: Create structure-only JSON example**

Create `docs/superpowers/templates/real-product-validation-data.example.json`:

```json
{
  "companyId": "1",
  "product": {
    "code": "请替换为真实产品编号",
    "name": "请替换为真实产品名称",
    "spec": "请替换为真实规格",
    "netWeight": "0.0000",
    "weightUnit": "g",
    "shelfLifeDays": 0,
    "storageMethod": "请替换为真实储存方式",
    "consumptionMethod": "请替换为真实食用方式",
    "standardCode": "请替换为真实执行标准",
    "labelAllergens": "请替换为真实过敏原声明",
    "productType": "请替换为真实产品类型"
  },
  "suppliers": [
    {
      "code": "请替换为真实供应商编号",
      "name": "请替换为真实供应商名称",
      "contact": "联系人",
      "phone": "联系电话",
      "address": "地址"
    }
  ],
  "materialCategory": {
    "code": "请替换为真实物料分类编号",
    "name": "请替换为真实物料分类名称"
  },
  "materials": [
    {
      "code": "请替换为真实物料编号",
      "name": "请替换为真实物料名称",
      "spec": "请替换为真实规格",
      "unit": "kg",
      "supplierCode": "请替换为上方真实供应商编号",
      "shelfLifeDays": 0,
      "allergen": false,
      "materialType": "raw"
    }
  ],
  "materialLots": [
    {
      "materialCode": "请替换为上方真实物料编号",
      "batchNumber": "请替换为系统物料批次号",
      "supplierBatchNo": "请替换为供应商批号",
      "productionDate": "2026-04-01",
      "expiryDate": "2026-12-31",
      "quantity": 1,
      "warehouseLocation": "请替换为真实库位"
    }
  ],
  "recipe": {
    "version": 1,
    "versionNote": "请替换为真实配方说明",
    "lines": [
      {
        "materialCode": "请替换为上方真实物料编号",
        "qtyPerBatch": "1.0000",
        "unit": "kg",
        "critical": true
      }
    ]
  },
  "productionBatch": {
    "batchNumber": "请替换为真实生产批次号",
    "plannedQuantity": 1,
    "actualQuantity": 1,
    "productionDate": "2026-04-29",
    "shift": "请替换为真实班次",
    "productionLine": "请替换为真实生产线"
  }
}
```

- [ ] **Step 5: Run validation tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- real-product-validation-data.spec.ts --runInBand
```

Expected: `PASS`.

- [ ] **Step 6: Validate the example file**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/validate-real-product-validation-data.ts ../docs/superpowers/templates/real-product-validation-data.example.json
```

Expected: `Real product validation data is valid.`

- [ ] **Step 7: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/scripts/validate-real-product-validation-data.ts server/scripts/__tests__/real-product-validation-data.spec.ts docs/superpowers/templates/real-product-validation-data.example.json
git commit -m "feat: validate real product import data"
```

---

## Task 4: Add Real Product Import Script

**Files:**

- Create: `server/scripts/import-real-product-validation-data.ts`

- [ ] **Step 1: Create import script**

Create `server/scripts/import-real-product-validation-data.ts`:

```ts
import { PrismaClient } from '@prisma/client';
import {
  readRealProductValidationData,
  validateRealProductValidationData,
} from './validate-real-product-validation-data';

const prisma = new PrismaClient();

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error('Usage: ts-node scripts/import-real-product-validation-data.ts <data-file.json>');
  }

  const data = readRealProductValidationData(filePath);
  const errors = validateRealProductValidationData(data);
  if (errors.length > 0) {
    throw new Error(`Invalid real product validation data:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }

  const category = await prisma.materialCategory.upsert({
    where: { code: data.materialCategory.code },
    update: { name: data.materialCategory.name },
    create: {
      code: data.materialCategory.code,
      name: data.materialCategory.name,
      description: '真实单产品实测导入',
    },
  });

  const suppliers = new Map<string, { id: string }>();
  for (const supplier of data.suppliers) {
    const created = await prisma.supplier.upsert({
      where: { supplierCode: supplier.code },
      update: {
        name: supplier.name,
        contact: supplier.contact,
        phone: supplier.phone,
        address: supplier.address,
        status: 'active',
        supplier_status: 'approved',
      },
      create: {
        supplierCode: supplier.code,
        name: supplier.name,
        contact: supplier.contact,
        phone: supplier.phone,
        address: supplier.address,
        status: 'active',
        supplier_status: 'approved',
      },
    });
    suppliers.set(supplier.code, created);
  }

  const materials = new Map<string, { id: string }>();
  for (const material of data.materials) {
    const created = await prisma.material.upsert({
      where: { materialCode: material.code },
      update: {
        name: material.name,
        specification: material.spec,
        unit: material.unit,
        categoryId: category.id,
        shelfLife: material.shelfLifeDays,
        shelf_life_days: material.shelfLifeDays,
        is_allergen: material.allergen ?? false,
        material_type: material.materialType ?? 'raw',
        status: 'active',
      },
      create: {
        materialCode: material.code,
        name: material.name,
        specification: material.spec,
        unit: material.unit,
        categoryId: category.id,
        shelfLife: material.shelfLifeDays,
        shelf_life_days: material.shelfLifeDays,
        is_allergen: material.allergen ?? false,
        allergen_notes: material.allergen ? '标签需声明' : null,
        material_type: material.materialType ?? 'raw',
        status: 'active',
      },
    });
    materials.set(material.code, created);
  }

  const supplierByMaterialCode = new Map(data.materials.map((material) => [material.code, material.supplierCode]));
  const materialLots = new Map<string, { id: string }>();
  for (const lot of data.materialLots) {
    const material = materials.get(lot.materialCode);
    const supplierCode = supplierByMaterialCode.get(lot.materialCode);
    const supplier = supplierCode ? suppliers.get(supplierCode) : undefined;
    if (!material || !supplier) throw new Error(`Broken lot relation: ${lot.batchNumber}`);

    const created = await prisma.materialBatch.upsert({
      where: { batchNumber: lot.batchNumber },
      update: {
        materialId: material.id,
        supplierId: supplier.id,
        supplierBatchNo: lot.supplierBatchNo,
        supplier_lot_no: lot.supplierBatchNo,
        quantity: lot.quantity,
        warehouseLocation: lot.warehouseLocation,
        lot_status: 'in_stock',
        status: 'normal',
      },
      create: {
        batchNumber: lot.batchNumber,
        materialId: material.id,
        supplierId: supplier.id,
        supplierBatchNo: lot.supplierBatchNo,
        supplier_lot_no: lot.supplierBatchNo,
        productionDate: dateOnly(lot.productionDate),
        expiryDate: dateOnly(lot.expiryDate),
        quantity: lot.quantity,
        warehouseLocation: lot.warehouseLocation,
        lot_status: 'in_stock',
        status: 'normal',
      },
    });
    materialLots.set(lot.materialCode, created);
  }

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
      product_type: data.product.productType,
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
      source: 'real_product_validation_import',
    },
  });

  const recipe = await prisma.recipe.upsert({
    where: {
      company_id_product_id_version: {
        company_id: data.companyId,
        product_id: product.id,
        version: data.recipe.version,
      },
    },
    update: { status: 'active', version_note: data.recipe.versionNote },
    create: {
      company_id: data.companyId,
      product_id: product.id,
      version: data.recipe.version,
      version_note: data.recipe.versionNote,
      status: 'active',
      approved_at: new Date(),
    },
  });

  for (const line of data.recipe.lines) {
    const material = materials.get(line.materialCode);
    if (!material) throw new Error(`Missing material for recipe line: ${line.materialCode}`);

    await prisma.recipeLine.upsert({
      where: { recipe_id_material_id: { recipe_id: recipe.id, material_id: material.id } },
      update: {
        qty_per_batch: line.qtyPerBatch,
        unit: line.unit,
        is_critical: line.critical ?? false,
      },
      create: {
        recipe_id: recipe.id,
        material_id: material.id,
        qty_per_batch: line.qtyPerBatch,
        unit: line.unit,
        is_critical: line.critical ?? false,
      },
    });
  }

  const productionBatch = await prisma.productionBatch.upsert({
    where: { batchNumber: data.productionBatch.batchNumber },
    update: {
      productId: product.id,
      productName: product.name,
      recipeId: recipe.id,
      recipeName: `${product.name} V${recipe.version}`,
      plannedQuantity: data.productionBatch.plannedQuantity,
      actualQuantity: data.productionBatch.actualQuantity,
      status: 'completed',
    },
    create: {
      batchNumber: data.productionBatch.batchNumber,
      productId: product.id,
      productName: product.name,
      recipeId: recipe.id,
      recipeName: `${product.name} V${recipe.version}`,
      plannedQuantity: data.productionBatch.plannedQuantity,
      actualQuantity: data.productionBatch.actualQuantity,
      productionDate: dateOnly(data.productionBatch.productionDate),
      status: 'completed',
      shift: data.productionBatch.shift,
      production_line: data.productionBatch.productionLine,
      output_qty: data.productionBatch.actualQuantity,
    },
  });

  for (const line of data.recipe.lines) {
    const lot = materialLots.get(line.materialCode);
    if (!lot) throw new Error(`Missing material lot for usage: ${line.materialCode}`);

    await prisma.batchMaterialUsage.upsert({
      where: {
        productionBatchId_materialBatchId: {
          productionBatchId: productionBatch.id,
          materialBatchId: lot.id,
        },
      },
      update: { quantity: Number(line.qtyPerBatch) },
      create: {
        productionBatchId: productionBatch.id,
        materialBatchId: lot.id,
        quantity: Number(line.qtyPerBatch),
        usedAt: new Date(),
      },
    });
  }

  console.log('Real product validation data imported:');
  console.table([
    { label: 'product', value: `${product.code} ${product.name}` },
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

- [ ] **Step 2: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/scripts/import-real-product-validation-data.ts
git commit -m "feat: import real product validation data"
```

---

## Task 5: Add Package Scripts And Runbook

**Files:**

- Modify: `server/package.json`
- Create: `docs/superpowers/runbooks/2026-04-29-clean-reset-and-real-product-validation-runbook.md`

- [ ] **Step 1: Add npm scripts**

Modify the `scripts` block in `server/package.json` by adding these entries after `seed:templates`:

```json
"clean-reset:snapshot": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/clean-reset-preserve-control-data.ts",
"clean-reset:dry-run": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/clean-reset-preserve-control-data.ts --dry-run",
"clean-reset:execute": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/clean-reset-preserve-control-data.ts --execute",
"validate:real-product": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/validate-real-product-validation-data.ts",
"import:real-product": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/import-real-product-validation-data.ts"
```

- [ ] **Step 2: Create runbook**

Create `docs/superpowers/runbooks/2026-04-29-clean-reset-and-real-product-validation-runbook.md`:

```md
# 清库保留与真实单产品实测运行手册

## 1. 真实数据来源

系统不内置任何产品种子。真实产品数据由用户提供，保存为本地 JSON 文件，例如：

```bash
/Users/jiashenglin/Desktop/好玩的项目/noidear-local-data/real-product-validation-data.json
```

不要把真实业务数据 JSON 提交到 git。

## 2. 数据文件模板

结构参考：

```bash
/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/templates/real-product-validation-data.example.json
```

模板里的中文示例值必须替换成真实数据。

## 3. 清理前快照

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run clean-reset:snapshot
```

确认以下数据会保留：

- document
- documentVersion
- documentReference
- recordTemplate
- recordFormLandingEntry
- equipment
- measuringEquipment
- user
- department

## 4. Dry Run

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run clean-reset:dry-run
```

确认 delete order 中没有文控文档、记录模板、设备台账、账号权限相关 delegate。

## 5. 执行清理

只在确认备份完成后执行：

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
ALLOW_DATA_RESET=yes npm run clean-reset:execute
```

成功输出应包含：

```text
Clean reset completed. Preserved delegate counts are unchanged.
```

## 6. 校验真实产品数据

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run validate:real-product -- /Users/jiashenglin/Desktop/好玩的项目/noidear-local-data/real-product-validation-data.json
```

成功输出：

```text
Real product validation data is valid.
```

## 7. 导入真实产品数据

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run import:real-product -- /Users/jiashenglin/Desktop/好玩的项目/noidear-local-data/real-product-validation-data.json
```

## 8. 手工实测

1. 登录系统。
2. 打开文控中心，确认体系文件仍可查看。
3. 打开设备台账，确认设备仍可查看。
4. 打开产品主数据，确认用户提供的真实产品存在。
5. 打开物料主数据，确认用户提供的真实物料存在。
6. 打开物料批次，确认用户提供的真实物料批次存在。
7. 打开生产批次，确认用户提供的真实生产批次存在。
8. 打开追溯查询，以用户提供的真实生产批次查询。
9. 确认追溯结果能看到物料批次和供应商。
10. 打开文控工作台，确认文档和记录表单治理入口仍可用。
```

- [ ] **Step 3: Validate package JSON**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log('package json ok')"
```

Expected: `package json ok`

- [ ] **Step 4: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git add server/package.json docs/superpowers/runbooks/2026-04-29-clean-reset-and-real-product-validation-runbook.md
git commit -m "docs: add real product validation runbook"
```

---

## Task 6: Verification Pass

**Files:**

- No new files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- clean-reset-config.spec.ts real-product-validation-data.spec.ts --runInBand
```

Expected: all tests pass.

- [ ] **Step 2: Verify safe reset commands**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run clean-reset:snapshot
npm run clean-reset:dry-run
```

Expected:

- Both commands exit `0`.
- Neither command deletes data.

- [ ] **Step 3: Verify destructive script is blocked by default**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run clean-reset:execute
```

Expected: exits non-zero with:

```text
Refusing to delete data. Set ALLOW_DATA_RESET=yes and pass --execute.
```

- [ ] **Step 4: Verify data validator with template**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run validate:real-product -- ../docs/superpowers/templates/real-product-validation-data.example.json
```

Expected: `Real product validation data is valid.`

- [ ] **Step 5: Run build**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Review changed files**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git status --short
git diff --check
```

Expected:

- Only intended files are changed.
- `git diff --check` prints no whitespace errors.

---

## Execution Notes

Do not run this command until the user explicitly approves real cleanup:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
ALLOW_DATA_RESET=yes npm run clean-reset:execute
```

Do not commit the user-provided real product JSON file. Keep it outside git, for example:

```bash
/Users/jiashenglin/Desktop/好玩的项目/noidear-local-data/real-product-validation-data.json
```

---

## Self-Review

**Spec coverage:** The plan covers backup/snapshot behavior, preserved tables, clean target tables, guarded delete execution, user-provided product data, validation before import, manual smoke validation, and rollback guidance.

**Placeholder scan:** The plan has no built-in product seed data and no open implementation placeholders. The JSON example uses explicit replacement text and is marked as a structure-only template, not a seed.

**Type consistency:** `RealProductValidationData` is defined once in `clean-reset-config.ts` and reused by validation and import scripts.
