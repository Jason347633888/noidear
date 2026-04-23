# Noidear Form Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified form schema and validation path for `noidear`, then use it to fix the product-development Step1-8 validation gaps, DynamicForm complex-field gaps, mobile validator gaps, TemplateDesigner save-time gaps, and source-vault mapping traceability.

**Architecture:** Keep `04-记录表单` as the source of truth, use `SaaS产品构思` as the field/entity mapping reference, and land confirmed semantics in `noidear`. Add a small shared validation core first, then adapt existing Vue, mobile, and template-designer code without rewriting the whole form system.

**Tech Stack:** Vue 3, Element Plus, Vite/Vitest, uni-app mobile Vue, NestJS scripts, TypeScript, Node.js filesystem scripts.

---

## Critical Execution Rules

- Do not implement on `master`; create an isolated worktree before code changes.
- Do not change frameworks, directory structure, UI library, ORM, or Docker service assumptions.
- Preserve old templates and old submitted records; new validation must be additive and backward compatible.
- Use Element Plus validation UX on web and existing mobile field UX on mobile.
- Keep each task independently testable and commit after each completed task.
- `04-记录表单` is the source of truth. `SaaS产品构思` is the mapping reference. `noidear` is the implementation target.

## File Structure

### New Files

- `client/src/utils/formValidation/types.ts`
  - Shared web-side schema and validation types: field schema, rule schema, error shape, validation result.
- `client/src/utils/formValidation/value.ts`
  - Small value helpers: empty checks, primitive coercion, label helpers.
- `client/src/utils/formValidation/validators.ts`
  - Pure validation registry for primitive, table, checkbox-text, constrained-number, approval/signature rules.
- `client/src/utils/formValidation/index.ts`
  - Public exports for the validation package.
- `client/src/utils/processValidation.ts`
  - Product-development Step1-8 validation helpers. This keeps page components thin.
- `client/src/utils/templateConfigValidation.ts`
  - TemplateDesigner save-time configuration validator.
- `client/src/utils/vaultMappingAudit.ts`
  - Browser-safe types for audit rows if later rendered in UI.
- `client/src/utils/formValidation/__tests__/validators.spec.ts`
  - Unit tests for web validation core.
- `client/src/utils/__tests__/processValidation.spec.ts`
  - Unit tests for Step1-8 validation helpers.
- `client/src/utils/__tests__/templateConfigValidation.spec.ts`
  - Unit tests for TemplateDesigner config validation.
- `server/scripts/audit-vault-saas-form-mapping.ts`
  - Node script comparing `04-记录表单`, `SaaS产品构思`, and generated noidear schema coverage.
- `server/scripts/__tests__/audit-vault-saas-form-mapping.spec.ts`
  - Script-level tests using temp fixtures.
- `mobile/src/utils/formValidation.ts`
  - Mobile validation bridge mirroring shared rule semantics.
- `mobile/src/utils/__tests__/formValidation.spec.ts`
  - Mobile validator unit tests.
- `docs/superpowers/reports/form-validation-audit.md`
  - Generated or manually updated audit summary after the audit script runs.

### Modified Files

- `client/src/components/DynamicForm.vue`
  - Replace local ad hoc rule generation with validation core and support complex field errors.
- `client/src/components/fields/DynamicField.vue`
  - Forward validation-related events from complex field components.
- `client/src/components/fields/TableInputField.vue`
  - Show row/cell validation errors and emit changes predictably.
- `client/src/components/fields/ConstrainedNumberField.vue`
  - Route constrained-number failures into the unified validation model.
- `client/src/components/fields/CheckboxTextField.vue`
  - Support checked-then-text-required validation.
- `client/src/views/process/Step1.vue`
  - Add full submit validation for `新产品开发申请书` fields now present in the page.
- `client/src/views/process/Step2.vue`
  - Add raw-material row completeness and `standardOther` conditional validation.
- `client/src/views/process/Step4.vue`
  - Add ingredient row validation and process parameter presence checks.
- `client/src/views/process/Step5.vue`
  - Add production line, output, trial record, process parameter, conclusion validation.
- `client/src/views/process/Step6.vue`
  - Add required conclusion/radio/checklist validation before submit.
- `client/src/views/process/Step7.vue`
  - Add HACCP hazard, CCP checklist, verification date, approval submit validation.
- `client/src/views/process/Step8.vue`
  - Add final release checklist, confirmation radio, and conclusion validation.
- `client/src/views/templates/TemplateDesigner.vue`
  - Validate field names, labels, duplicate names, options, ranges, defaults before save.
- `mobile/src/types/index.ts`
  - Extend `FormField` and `FormRule` for table, constrained-number, checkbox-text, approval-step, visibility, row schema.
- `mobile/src/utils/validator.ts`
  - Delegate to `mobile/src/utils/formValidation.ts`.
- `mobile/src/components/FormField.vue`
  - Render table-like rows, checkbox-text, constrained-number, approval-step fallback states.
- `client/package.json`
  - Add no dependency unless tests reveal an existing command alias is needed.
- `server/package.json`
  - Add an audit script alias only if current scripts do not expose script execution cleanly.

### External Inputs

- `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单`
- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思`
- `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/产品开发部/新产品开发申请书.md`
- `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/产品开发部/产品配方以及工艺参数.md`
- `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/品质部/产品检验报告.md`

---

## Task 0: Prepare Isolated Worktree

**Files:**
- No code files changed in this task.

- [ ] **Step 1: Confirm current branch and dirty state**

Run:

```bash
git status --short --branch
```

Expected: output shows the current branch and any dirty files. Do not revert user changes.

- [ ] **Step 2: Create the implementation worktree**

Run:

```bash
git worktree add ../noidear-form-validation codex/noidear-form-validation
```

Expected: a new worktree exists at `/Users/jiashenglin/Desktop/好玩的项目/noidear-form-validation` on branch `codex/noidear-form-validation`.

- [ ] **Step 3: Move into the worktree**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear-form-validation
git status --short --branch
```

Expected: branch is `codex/noidear-form-validation`.

- [ ] **Step 4: Install or verify dependencies are present**

Run:

```bash
test -d client/node_modules && test -d server/node_modules && test -d mobile/node_modules
```

Expected: exit code `0`. If this fails, run the repo's existing install command used by the project owner; do not install Docker-managed services locally.

---

## Task 1: Add Field Schema Types

**Files:**
- Create: `client/src/utils/formValidation/types.ts`
- Create: `client/src/utils/formValidation/index.ts`
- Test: `client/src/utils/formValidation/__tests__/validators.spec.ts`

- [ ] **Step 1: Write the initial type import test**

Create `client/src/utils/formValidation/__tests__/validators.spec.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import type { FormValidationError, FormValidationField } from '../types';

describe('form validation types', () => {
  it('supports table row schema and validation metadata', () => {
    const field: FormValidationField = {
      name: 'ingredients',
      label: '配料表',
      type: 'table-input',
      required: true,
      rowSchema: [
        { name: 'name', label: '配料名称', type: 'text', required: true },
        { name: 'weight', label: '重量', type: 'text', required: true },
      ],
    };

    const error: FormValidationError = {
      fieldKey: 'ingredients',
      errorCode: 'ROW_REQUIRED',
      message: '第1行配料名称不能为空',
      severity: 'error',
      rowIndex: 0,
      childKey: 'name',
    };

    expect(field.rowSchema?.[0].name).toBe('name');
    expect(error.childKey).toBe('name');
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
cd client
npx vitest run src/utils/formValidation/__tests__/validators.spec.ts
```

Expected: FAIL because `../types` does not exist.

- [ ] **Step 3: Add schema and error types**

Create `client/src/utils/formValidation/types.ts` with:

```ts
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'file'
  | 'image'
  | 'signature'
  | 'table-input'
  | 'constrained-number'
  | 'checkbox-text'
  | 'approval-step'
  | 'section-header'
  | 'static-content'
  | string;

export type FormValidationSeverity = 'error' | 'warning';

export interface FormOption {
  label: string;
  value: string | number | boolean;
}

export interface FormValidationRule {
  type:
    | 'required'
    | 'min'
    | 'max'
    | 'pattern'
    | 'minLength'
    | 'maxLength'
    | 'rowRequired'
    | 'checkedTextRequired'
    | 'approvalRequired';
  value?: unknown;
  message?: string;
  when?: {
    field: string;
    equals: unknown;
  };
}

export interface FormValidationField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  options?: FormOption[];
  columns?: Array<{
    key: string;
    label: string;
    required?: boolean;
    readonly?: boolean;
    type?: FormFieldType;
  }>;
  rowSchema?: FormValidationField[];
  validation?: FormValidationRule[];
  visibility?: {
    field: string;
    equals: unknown;
  };
  children?: FormValidationField[];
  [key: string]: unknown;
}

export interface FormValidationError {
  fieldKey: string;
  errorCode: string;
  message: string;
  severity: FormValidationSeverity;
  rowIndex?: number;
  childKey?: string;
}

export interface FormValidationResult {
  valid: boolean;
  errors: FormValidationError[];
}
```

Create `client/src/utils/formValidation/index.ts` with:

```ts
export type {
  FormFieldType,
  FormOption,
  FormValidationError,
  FormValidationField,
  FormValidationResult,
  FormValidationRule,
  FormValidationSeverity,
} from './types';
```

- [ ] **Step 4: Run the type test**

Run:

```bash
cd client
npx vitest run src/utils/formValidation/__tests__/validators.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/formValidation
git commit -m "feat: 新增表单校验字段类型"
```

---

## Task 2: Add Pure Validation Core

**Files:**
- Create: `client/src/utils/formValidation/value.ts`
- Create: `client/src/utils/formValidation/validators.ts`
- Modify: `client/src/utils/formValidation/index.ts`
- Test: `client/src/utils/formValidation/__tests__/validators.spec.ts`

- [ ] **Step 1: Replace the test with validation behavior cases**

Update `client/src/utils/formValidation/__tests__/validators.spec.ts` to:

```ts
import { describe, expect, it } from 'vitest';
import { validateFields } from '../validators';
import type { FormValidationField } from '../types';

describe('validateFields', () => {
  it('validates required text fields', () => {
    const fields: FormValidationField[] = [
      { name: 'productName', label: '开发产品名称', type: 'text', required: true },
    ];

    const result = validateFields(fields, { productName: '' });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        fieldKey: 'productName',
        errorCode: 'REQUIRED',
        message: '开发产品名称不能为空',
        severity: 'error',
      },
    ]);
  });

  it('validates number min and max', () => {
    const fields: FormValidationField[] = [
      { name: 'output', label: '产量', type: 'number', min: 1, max: 100 },
    ];

    expect(validateFields(fields, { output: 0 }).errors[0].message).toBe('产量不能小于1');
    expect(validateFields(fields, { output: 101 }).errors[0].message).toBe('产量不能大于100');
    expect(validateFields(fields, { output: 50 }).valid).toBe(true);
  });

  it('validates table row required fields', () => {
    const fields: FormValidationField[] = [
      {
        name: 'ingredients',
        label: '配料表',
        type: 'table-input',
        required: true,
        rowSchema: [
          { name: 'name', label: '配料名称', type: 'text', required: true },
          { name: 'weight', label: '重量', type: 'text', required: true },
        ],
      },
    ];

    const result = validateFields(fields, {
      ingredients: [{ name: '鸡蛋', weight: '' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({
      fieldKey: 'ingredients',
      errorCode: 'ROW_REQUIRED',
      rowIndex: 0,
      childKey: 'weight',
      message: '第1行重量不能为空',
    });
  });

  it('validates checkbox text fields when checked', () => {
    const fields: FormValidationField[] = [
      {
        name: 'allergen',
        label: '引入的食品安全危害（含过敏源）',
        type: 'checkbox-text',
        validation: [{ type: 'checkedTextRequired', message: '勾选后必须填写危害说明' }],
      },
    ];

    const result = validateFields(fields, {
      allergen: { checked: true, text: '' },
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe('勾选后必须填写危害说明');
  });

  it('skips invisible conditional fields', () => {
    const fields: FormValidationField[] = [
      {
        name: 'standardOther',
        label: '标准编号',
        type: 'text',
        required: true,
        visibility: { field: 'standard', equals: '其他' },
      },
    ];

    expect(validateFields(fields, { standard: '国标 GB7099', standardOther: '' }).valid).toBe(true);
    expect(validateFields(fields, { standard: '其他', standardOther: '' }).valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing validation test**

Run:

```bash
cd client
npx vitest run src/utils/formValidation/__tests__/validators.spec.ts
```

Expected: FAIL because `validateFields` does not exist.

- [ ] **Step 3: Add value helpers**

Create `client/src/utils/formValidation/value.ts` with:

```ts
export const isEmptyValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

export const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getObjectText = (value: unknown, key: string): string => {
  if (!value || typeof value !== 'object') return '';
  const text = (value as Record<string, unknown>)[key];
  return typeof text === 'string' ? text.trim() : '';
};

export const getObjectBoolean = (value: unknown, key: string): boolean => {
  if (!value || typeof value !== 'object') return false;
  return Boolean((value as Record<string, unknown>)[key]);
};
```

- [ ] **Step 4: Add validation registry**

Create `client/src/utils/formValidation/validators.ts` with:

```ts
import type { FormValidationError, FormValidationField, FormValidationResult } from './types';
import { getObjectBoolean, getObjectText, isEmptyValue, toNumber } from './value';

const error = (
  field: FormValidationField,
  errorCode: string,
  message: string,
  extra: Partial<FormValidationError> = {},
): FormValidationError => ({
  fieldKey: field.name,
  errorCode,
  message,
  severity: 'error',
  ...extra,
});

const isVisible = (field: FormValidationField, values: Record<string, unknown>): boolean => {
  if (!field.visibility) return true;
  return values[field.visibility.field] === field.visibility.equals;
};

const validateRequired = (field: FormValidationField, value: unknown): FormValidationError[] => {
  if (!field.required || !isEmptyValue(value)) return [];
  return [error(field, 'REQUIRED', `${field.label}不能为空`)];
};

const validatePattern = (field: FormValidationField, value: unknown): FormValidationError[] => {
  if (!field.pattern || isEmptyValue(value) || typeof value !== 'string') return [];
  return new RegExp(field.pattern).test(value)
    ? []
    : [error(field, 'PATTERN', field.patternMessage || `${field.label}格式不正确`)];
};

const validateNumber = (field: FormValidationField, value: unknown): FormValidationError[] => {
  if (isEmptyValue(value)) return [];
  const numeric = toNumber(value);
  if (numeric === null) return [error(field, 'NUMBER', `${field.label}必须是数字`)];
  if (typeof field.min === 'number' && numeric < field.min) {
    return [error(field, 'MIN', `${field.label}不能小于${field.min}`)];
  }
  if (typeof field.max === 'number' && numeric > field.max) {
    return [error(field, 'MAX', `${field.label}不能大于${field.max}`)];
  }
  return [];
};

const validateTable = (field: FormValidationField, value: unknown): FormValidationError[] => {
  if (!Array.isArray(value)) {
    return field.required ? [error(field, 'REQUIRED', `${field.label}不能为空`)] : [];
  }
  if (field.required && value.length === 0) return [error(field, 'REQUIRED', `${field.label}不能为空`)];
  const rowFields = field.rowSchema || (field.columns || []).map((col) => ({
    name: col.key,
    label: col.label,
    type: col.type || 'text',
    required: col.required,
  }));
  const errors: FormValidationError[] = [];
  value.forEach((row, rowIndex) => {
    rowFields.forEach((child) => {
      if (!child.required) return;
      const childValue = row && typeof row === 'object'
        ? (row as Record<string, unknown>)[child.name]
        : undefined;
      if (isEmptyValue(childValue)) {
        errors.push(error(field, 'ROW_REQUIRED', `第${rowIndex + 1}行${child.label}不能为空`, {
          rowIndex,
          childKey: child.name,
        }));
      }
    });
  });
  return errors;
};

const validateCheckboxText = (field: FormValidationField, value: unknown): FormValidationError[] => {
  const needsText = field.validation?.some((rule) => rule.type === 'checkedTextRequired');
  if (!needsText || !getObjectBoolean(value, 'checked') || getObjectText(value, 'text')) return [];
  const message = field.validation?.find((rule) => rule.type === 'checkedTextRequired')?.message;
  return [error(field, 'CHECKED_TEXT_REQUIRED', message || `${field.label}说明不能为空`)];
};

export const validateFieldValue = (
  field: FormValidationField,
  value: unknown,
  values: Record<string, unknown>,
): FormValidationError[] => {
  if (field.disabled || field.readonly || !isVisible(field, values)) return [];
  if (field.type === 'table-input') return validateTable(field, value);
  if (field.type === 'checkbox-text') return validateCheckboxText(field, value);
  if (field.type === 'number' || field.type === 'constrained-number') {
    return [...validateRequired(field, value), ...validateNumber(field, value), ...validatePattern(field, value)];
  }
  return [...validateRequired(field, value), ...validatePattern(field, value)];
};

export const validateFields = (
  fields: FormValidationField[],
  values: Record<string, unknown>,
): FormValidationResult => {
  const errors = fields.flatMap((field) => validateFieldValue(field, values[field.name], values));
  return { valid: errors.length === 0, errors };
};
```

- [ ] **Step 5: Export validation helpers**

Update `client/src/utils/formValidation/index.ts`:

```ts
export { validateFields, validateFieldValue } from './validators';
export type {
  FormFieldType,
  FormOption,
  FormValidationError,
  FormValidationField,
  FormValidationResult,
  FormValidationRule,
  FormValidationSeverity,
} from './types';
```

- [ ] **Step 6: Run validation tests**

Run:

```bash
cd client
npx vitest run src/utils/formValidation/__tests__/validators.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add client/src/utils/formValidation
git commit -m "feat: 新增通用表单校验核心"
```

---

## Task 3: Add Product Step Validation Helpers

**Files:**
- Create: `client/src/utils/processValidation.ts`
- Test: `client/src/utils/__tests__/processValidation.spec.ts`

- [ ] **Step 1: Write failing Step validation tests**

Create `client/src/utils/__tests__/processValidation.spec.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import {
  validateStep1,
  validateStep2,
  validateStep4,
  validateStep5,
  validateStep6,
  validateStep7,
  validateStep8,
} from '../processValidation';

describe('process validation helpers', () => {
  it('Step1 requires the visible source-form fields used by the page', () => {
    const result = validateStep1({
      applicant: '',
      flavorRequirement: '',
      pesticideRequirement: '',
      heavyMetalRequirement: '',
      microbiologicalRequirement: '',
      standardRequirement: '',
      labelRequirement: '',
      nutritionRequirement: '',
      submitDate: '',
      productName: '',
      processType: '',
      shelfLife: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.fieldKey)).toContain('productName');
    expect(result.errors.map((e) => e.fieldKey)).toContain('submitDate');
    expect(result.errors.map((e) => e.fieldKey)).toContain('shelfLife');
  });

  it('Step2 requires raw material rows and standardOther when standard is other', () => {
    const result = validateStep2({
      rawMaterials: [{ materialCode: '', name: '鸡蛋', ingredientInfo: '' }],
      packagingForm: '',
      storageCondition: '',
      standard: '其他',
      standardOther: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.fieldKey)).toContain('rawMaterials');
    expect(result.errors.map((e) => e.fieldKey)).toContain('standardOther');
  });

  it('Step4 requires batch number and complete ingredient rows', () => {
    const result = validateStep4({
      trialDate: '2026-04-22',
      batchNumber: '',
      ingredients: [{ name: '', weight: '' }],
      processParams: {},
      trialConclusion: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.fieldKey)).toContain('batchNumber');
    expect(result.errors.some((e) => e.rowIndex === 0 && e.childKey === 'name')).toBe(true);
  });

  it('Step5 through Step8 reject incomplete submit data', () => {
    expect(validateStep5({ productionLine: '', output: 0, trialRecord: '', processParams: {}, verificationConclusion: '' }).valid).toBe(false);
    expect(validateStep6({ materialConclusion: '', physicoChemical: '', shelfLifeTest: '', finalInspection: '', inspectionMethod: '' }).valid).toBe(false);
    expect(validateStep7({ verificationDate: '', onSiteProcess: '', potentialHazard: '', bioHazard: '', chemHazard: '', physHazard: '', allergenHazard: '', controlMeasure: '' }).valid).toBe(false);
    expect(validateStep8({ formulaConfirm: '', processConfirm: '', standardConfirm: '', shelfLifeVerify: '', inspectionReport: '', hazardAssessment: '', labelConfirm: '', packagingConfirm: '', conclusion: '' }).valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
cd client
npx vitest run src/utils/__tests__/processValidation.spec.ts
```

Expected: FAIL because `processValidation.ts` does not exist.

- [ ] **Step 3: Implement process validation helpers**

Create `client/src/utils/processValidation.ts` with:

```ts
import { validateFields } from './formValidation';
import type { FormValidationField, FormValidationResult } from './formValidation';

const requiredText = (name: string, label: string): FormValidationField => ({
  name,
  label,
  type: 'text',
  required: true,
});

const requiredNumber = (name: string, label: string, min = 0): FormValidationField => ({
  name,
  label,
  type: 'number',
  required: true,
  min,
});

export const validateStep1 = (values: Record<string, unknown>): FormValidationResult => validateFields([
  requiredText('applicant', '申请人'),
  requiredText('flavorRequirement', '客户/风味需求或产品特性'),
  requiredText('pesticideRequirement', '农残要求'),
  requiredText('heavyMetalRequirement', '重金属要求'),
  requiredText('microbiologicalRequirement', '微生物要求'),
  requiredText('standardRequirement', '标准要求'),
  requiredText('labelRequirement', '标签要求'),
  requiredText('nutritionRequirement', '营养成分'),
  requiredText('submitDate', '申请日期'),
  requiredText('productName', '开发产品名称'),
  requiredText('processType', '工艺形式'),
  requiredText('shelfLife', '预期保质期'),
], values);

export const validateStep2 = (values: Record<string, unknown>): FormValidationResult => validateFields([
  {
    name: 'rawMaterials',
    label: '原料清单',
    type: 'table-input',
    required: true,
    rowSchema: [
      requiredText('materialCode', '物料编码'),
      requiredText('name', '物料名称'),
      requiredText('ingredientInfo', '配料信息'),
    ],
  },
  requiredText('packagingForm', '包装形式'),
  requiredText('storageCondition', '储存条件'),
  requiredText('standard', '适用标准'),
  {
    ...requiredText('standardOther', '标准编号'),
    visibility: { field: 'standard', equals: '其他' },
  },
], values);

export const validateStep4 = (values: Record<string, unknown>): FormValidationResult => validateFields([
  requiredText('trialDate', '试验日期'),
  requiredText('batchNumber', '生产批次'),
  {
    name: 'ingredients',
    label: '配料表',
    type: 'table-input',
    required: true,
    rowSchema: [
      requiredText('name', '配料名称'),
      requiredText('weight', '重量'),
    ],
  },
  requiredText('trialConclusion', '实验记录/结论'),
], values);

export const validateStep5 = (values: Record<string, unknown>): FormValidationResult => validateFields([
  requiredText('date', '日期'),
  requiredText('productionLine', '生产线'),
  requiredNumber('output', '产量', 0.001),
  requiredText('trialRecord', '试验记录'),
  requiredText('verificationConclusion', '验证结论'),
], values);

export const validateStep6 = (values: Record<string, unknown>): FormValidationResult => validateFields([
  requiredText('materialConclusion', '原辅料的质量与可靠性'),
  requiredText('physicoChemical', '产品理化及安全性检验'),
  requiredText('shelfLifeTest', '保质期测试'),
  requiredText('finalInspection', '成品检验'),
  requiredText('inspectionMethod', '检验方式'),
], values);

export const validateStep7 = (values: Record<string, unknown>): FormValidationResult => validateFields([
  requiredText('verificationDate', '验证时间'),
  requiredText('onSiteProcess', '现场工艺'),
  requiredText('potentialHazard', '潜在危害'),
  requiredText('bioHazard', '生物危害'),
  requiredText('chemHazard', '化学危害'),
  requiredText('physHazard', '物理危害'),
  requiredText('allergenHazard', '过敏原'),
  requiredText('controlMeasure', '控制措施'),
], values);

export const validateStep8 = (values: Record<string, unknown>): FormValidationResult => validateFields([
  requiredText('formulaConfirm', '配方确认'),
  requiredText('processConfirm', '工艺确认'),
  requiredText('standardConfirm', '标准确认'),
  requiredText('shelfLifeVerify', '保质期验证'),
  requiredText('inspectionReport', '检验报告'),
  requiredText('hazardAssessment', '危害评估'),
  requiredText('labelConfirm', '标签'),
  requiredText('packagingConfirm', '包装材料'),
  requiredText('conclusion', '结论'),
], values);

export const firstValidationMessage = (result: FormValidationResult): string => {
  return result.errors[0]?.message || '请完善表单后再提交';
};
```

- [ ] **Step 4: Run Step validation tests**

Run:

```bash
cd client
npx vitest run src/utils/__tests__/processValidation.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/processValidation.ts client/src/utils/__tests__/processValidation.spec.ts
git commit -m "feat: 新增产品研发流程校验规则"
```

---

## Task 4: Apply Step1, Step2, and Step4 Submit Validation

**Files:**
- Modify: `client/src/views/process/Step1.vue`
- Modify: `client/src/views/process/Step2.vue`
- Modify: `client/src/views/process/Step4.vue`
- Test: `client/src/utils/__tests__/processValidation.spec.ts`

- [ ] **Step 1: Import validators in Step1**

In `client/src/views/process/Step1.vue`, add:

```ts
import { firstValidationMessage, validateStep1 } from '@/utils/processValidation';
```

- [ ] **Step 2: Replace Step1 submit logic**

Replace `handleSubmit` in `Step1.vue` with:

```ts
const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  const result = validateStep1({ ...form });
  if (!result.valid) {
    ElMessage.warning(firstValidationMessage(result));
    return;
  }

  emit('submitted', { ...form });
};
```

- [ ] **Step 3: Import validators in Step2**

In `client/src/views/process/Step2.vue`, add:

```ts
import { firstValidationMessage, validateStep2 } from '@/utils/processValidation';
```

- [ ] **Step 4: Replace Step2 submit logic**

Replace `handleSubmit` in `Step2.vue` with:

```ts
const handleSubmit = () => {
  const result = validateStep2(getFormData());
  if (!result.valid) {
    ElMessage.warning(firstValidationMessage(result));
    return;
  }
  emit('submitted', getFormData());
};
```

- [ ] **Step 5: Import Element Plus message and validators in Step4**

In `client/src/views/process/Step4.vue`, add:

```ts
import { ElMessage } from 'element-plus';
import { firstValidationMessage, validateStep4 } from '@/utils/processValidation';
```

- [ ] **Step 6: Replace Step4 submit logic**

Replace `handleSubmit` in `Step4.vue` with:

```ts
const handleSubmit = () => {
  const result = validateStep4(getFormData());
  if (!result.valid) {
    ElMessage.warning(firstValidationMessage(result));
    return;
  }
  emit('submitted', getFormData());
};
```

- [ ] **Step 7: Run unit tests**

Run:

```bash
cd client
npx vitest run src/utils/formValidation/__tests__/validators.spec.ts src/utils/__tests__/processValidation.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Run client build check**

Run:

```bash
cd client
npm run build
```

Expected: build completes successfully.

- [ ] **Step 9: Commit**

```bash
git add client/src/views/process/Step1.vue client/src/views/process/Step2.vue client/src/views/process/Step4.vue
git commit -m "feat: 补齐研发流程前三个关键步骤校验"
```

---

## Task 5: Apply Step5 Through Step8 Submit Validation

**Files:**
- Modify: `client/src/views/process/Step5.vue`
- Modify: `client/src/views/process/Step6.vue`
- Modify: `client/src/views/process/Step7.vue`
- Modify: `client/src/views/process/Step8.vue`
- Test: `client/src/utils/__tests__/processValidation.spec.ts`

- [ ] **Step 1: Update Step5 imports**

In `client/src/views/process/Step5.vue`, change the script imports to include:

```ts
import { reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import ProcessParams from '@/components/process/ProcessParams.vue';
import { firstValidationMessage, validateStep5 } from '@/utils/processValidation';
```

- [ ] **Step 2: Add Step5 submit function**

Add below `getFormData` in `Step5.vue`:

```ts
const handleSubmit = () => {
  const result = validateStep5(getFormData());
  if (!result.valid) {
    ElMessage.warning(firstValidationMessage(result));
    return;
  }
  emit('submitted', getFormData());
};
```

Change the submit button to:

```vue
<el-button type="primary" @click="handleSubmit">提交</el-button>
```

- [ ] **Step 3: Update Step6 imports**

In `client/src/views/process/Step6.vue`, add:

```ts
import { ElMessage } from 'element-plus';
import { firstValidationMessage, validateStep6 } from '@/utils/processValidation';
```

- [ ] **Step 4: Add Step6 submit function**

Add below `onMounted` in `Step6.vue`:

```ts
const handleSubmit = () => {
  const result = validateStep6({ ...form });
  if (!result.valid) {
    ElMessage.warning(firstValidationMessage(result));
    return;
  }
  emit('submitted', { ...form });
};
```

Change the submit button to:

```vue
<el-button type="primary" @click="handleSubmit">提交</el-button>
```

- [ ] **Step 5: Update Step7 imports**

In `client/src/views/process/Step7.vue`, add:

```ts
import { ElMessage } from 'element-plus';
import { firstValidationMessage, validateStep7 } from '@/utils/processValidation';
```

- [ ] **Step 6: Add Step7 submit function**

Add below `handleReject` in `Step7.vue`:

```ts
const handleSubmit = () => {
  const result = validateStep7({ ...form });
  if (!result.valid) {
    ElMessage.warning(firstValidationMessage(result));
    return;
  }
  emit('submitted', { ...form });
};
```

Change the submit button to:

```vue
<el-button type="primary" @click="handleSubmit">提交审批</el-button>
```

- [ ] **Step 7: Update Step8 imports**

In `client/src/views/process/Step8.vue`, add:

```ts
import { ElMessage } from 'element-plus';
import { firstValidationMessage, validateStep8 } from '@/utils/processValidation';
```

- [ ] **Step 8: Add Step8 submit function**

Add below `onMounted` in `Step8.vue`:

```ts
const handleSubmit = () => {
  const result = validateStep8({ ...form });
  if (!result.valid) {
    ElMessage.warning(firstValidationMessage(result));
    return;
  }
  emit('submitted', { ...form });
};
```

Change the submit button to:

```vue
<el-button type="primary" @click="handleSubmit">提交审批</el-button>
```

- [ ] **Step 9: Run Step tests**

Run:

```bash
cd client
npx vitest run src/utils/__tests__/processValidation.spec.ts
```

Expected: PASS.

- [ ] **Step 10: Run client build**

Run:

```bash
cd client
npm run build
```

Expected: build completes successfully.

- [ ] **Step 11: Commit**

```bash
git add client/src/views/process/Step5.vue client/src/views/process/Step6.vue client/src/views/process/Step7.vue client/src/views/process/Step8.vue
git commit -m "feat: 补齐研发流程后续步骤提交校验"
```

---

## Task 6: Integrate Validation Core Into DynamicForm

**Files:**
- Modify: `client/src/components/DynamicForm.vue`
- Modify: `client/src/components/fields/DynamicField.vue`
- Test: `client/src/utils/formValidation/__tests__/validators.spec.ts`

- [ ] **Step 1: Add DynamicForm imports**

In `client/src/components/DynamicForm.vue`, add:

```ts
import { validateFieldValue, validateFields } from '@/utils/formValidation';
import type { FormValidationError, FormValidationField } from '@/utils/formValidation';
```

- [ ] **Step 2: Add field casting helper**

Add below `let isUpdating = false;`:

```ts
const toValidationField = (field: FieldConfig): FormValidationField => ({
  ...field,
  type: field.type,
  name: field.name,
  label: field.label,
});
```

- [ ] **Step 3: Replace buildFieldRules implementation**

Replace `buildFieldRules` with:

```ts
const buildFieldRules = (field: FieldConfig) => {
  if (isLayoutField(field.type)) return [];
  return [{
    validator: (_rule: any, value: any, callback: any) => {
      const errors = validateFieldValue(toValidationField(field), value, { ...formData });
      if (errors.length > 0) {
        callback(new Error(errors[0].message));
        return;
      }
      callback();
    },
    trigger: ['blur', 'change'],
  }];
};
```

- [ ] **Step 4: Replace validate implementation**

Replace `validate` with:

```ts
const validate = async (): Promise<boolean> => {
  if (!formRef.value) return false;
  const fields = (props.template?.fieldsJson?.fields ?? [])
    .filter((field) => field.name && !isLayoutField(field.type))
    .map(toValidationField);
  const result = validateFields(fields, { ...formData });
  if (!result.valid) {
    await formRef.value.validate().catch(() => false);
    return false;
  }
  try {
    await formRef.value.validate();
    return true;
  } catch {
    return false;
  }
};
```

- [ ] **Step 5: Forward validation events in DynamicField**

In `client/src/components/fields/DynamicField.vue`, change `defineEmits` to:

```ts
defineEmits<{
  (e: 'update:modelValue', value: any): void;
  (e: 'blur'): void;
  (e: 'change', value: any): void;
  (e: 'validation-error', value: any): void;
}>();
```

Add the event on the dynamic component:

```vue
@validation-error="$emit('validation-error', $event)"
```

- [ ] **Step 6: Run validation tests**

Run:

```bash
cd client
npx vitest run src/utils/formValidation/__tests__/validators.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Run client build**

Run:

```bash
cd client
npm run build
```

Expected: build completes successfully.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/DynamicForm.vue client/src/components/fields/DynamicField.vue
git commit -m "feat: 动态表单接入统一校验核心"
```

---

## Task 7: Add Complex Field Component Validation UX

**Files:**
- Modify: `client/src/components/fields/TableInputField.vue`
- Modify: `client/src/components/fields/ConstrainedNumberField.vue`
- Modify: `client/src/components/fields/CheckboxTextField.vue`
- Test: `client/src/utils/formValidation/__tests__/validators.spec.ts`

- [ ] **Step 1: Update TableInputField emits**

In `client/src/components/fields/TableInputField.vue`, change emits to:

```ts
const emit = defineEmits<{
  (e: 'update:modelValue', value: any[]): void;
  (e: 'change', value: any[]): void;
}>();
```

- [ ] **Step 2: Add TableInputField cell required helper**

Add below `const rows = ref<Record<string, any>[]>([]);`:

```ts
const isCellMissing = (row: Record<string, any>, key: string) => {
  const value = row[key];
  return value === undefined || value === null || String(value).trim() === '';
};
```

- [ ] **Step 3: Add TableInputField visual error state**

In the `el-input` inside `TableInputField.vue`, add:

```vue
:class="{ 'cell-error': col.required && isCellMissing(row, col.key) }"
```

Add below the input:

```vue
<div v-if="col.required && isCellMissing(row, col.key)" class="cell-error-text">
  {{ col.label }}不能为空
</div>
```

- [ ] **Step 4: Emit change from TableInputField**

Replace `emitUpdate` with:

```ts
const emitUpdate = () => {
  const nextRows = [...rows.value];
  emit('update:modelValue', nextRows);
  emit('change', nextRows);
};
```

Add styles:

```css
.cell-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

.cell-error-text {
  color: var(--el-color-danger);
  font-size: 12px;
  line-height: 18px;
  margin-top: 2px;
}
```

- [ ] **Step 5: Normalize ConstrainedNumberField validation event**

Open `client/src/components/fields/ConstrainedNumberField.vue`. Ensure its validation failure emits this shape:

```ts
emit('validation-error', {
  fieldKey: props.field.name,
  errorCode: 'CONSTRAINED_NUMBER',
  message,
  severity: 'error',
});
```

If it currently emits a string, replace that emit only and keep existing UI intact.

- [ ] **Step 6: Normalize CheckboxTextField change output**

Open `client/src/components/fields/CheckboxTextField.vue`. Ensure checked + text state is emitted as:

```ts
emit('update:modelValue', {
  checked: checked.value,
  text: text.value,
});
```

If the file uses different local names, keep the local names and emit the same object keys.

- [ ] **Step 7: Run core tests and build**

Run:

```bash
cd client
npx vitest run src/utils/formValidation/__tests__/validators.spec.ts
npm run build
```

Expected: tests pass and build completes successfully.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/fields/TableInputField.vue client/src/components/fields/ConstrainedNumberField.vue client/src/components/fields/CheckboxTextField.vue
git commit -m "feat: 复杂字段组件显示统一校验状态"
```

---

## Task 8: Add TemplateDesigner Save-Time Validation

**Files:**
- Create: `client/src/utils/templateConfigValidation.ts`
- Test: `client/src/utils/__tests__/templateConfigValidation.spec.ts`
- Modify: `client/src/views/templates/TemplateDesigner.vue`

- [ ] **Step 1: Write failing template config tests**

Create `client/src/utils/__tests__/templateConfigValidation.spec.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { validateTemplateFields } from '../templateConfigValidation';

describe('validateTemplateFields', () => {
  it('rejects empty field lists', () => {
    expect(validateTemplateFields([]).errors[0]).toBe('请至少添加一个字段');
  });

  it('rejects duplicate field names', () => {
    const result = validateTemplateFields([
      { name: 'productName', label: '产品名称', type: 'text', required: true },
      { name: 'productName', label: '产品名称2', type: 'text', required: false },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('字段名 productName 重复');
  });

  it('rejects invalid option fields', () => {
    const result = validateTemplateFields([
      { name: 'standard', label: '适用标准', type: 'radio', required: true, options: [] },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('适用标准 至少需要一个有效选项');
  });

  it('rejects invalid numeric ranges', () => {
    const result = validateTemplateFields([
      { name: 'output', label: '产量', type: 'number', required: true, min: 10, max: 1 },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('产量 的最小值不能大于最大值');
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
cd client
npx vitest run src/utils/__tests__/templateConfigValidation.spec.ts
```

Expected: FAIL because `templateConfigValidation.ts` does not exist.

- [ ] **Step 3: Implement template config validator**

Create `client/src/utils/templateConfigValidation.ts` with:

```ts
interface TemplateFieldLike {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: Array<{ label?: string; value?: string | number | boolean }>;
}

export interface TemplateConfigValidationResult {
  valid: boolean;
  errors: string[];
}

const optionTypes = new Set(['select', 'radio', 'checkbox']);

export const validateTemplateFields = (
  fields: TemplateFieldLike[],
): TemplateConfigValidationResult => {
  const errors: string[] = [];
  if (fields.length === 0) errors.push('请至少添加一个字段');

  const seen = new Set<string>();
  fields.forEach((field, index) => {
    const label = field.label || `第${index + 1}个字段`;
    const name = field.name?.trim();
    if (!name) errors.push(`${label} 缺少字段名`);
    if (!field.label?.trim()) errors.push(`${name || label} 缺少标签`);
    if (!field.type?.trim()) errors.push(`${name || label} 缺少字段类型`);
    if (name && seen.has(name)) errors.push(`字段名 ${name} 重复`);
    if (name) seen.add(name);

    if (optionTypes.has(field.type)) {
      const options = field.options || [];
      const validOptions = options.filter((opt) => String(opt.label || '').trim() && opt.value !== undefined && opt.value !== '');
      if (validOptions.length === 0) errors.push(`${label} 至少需要一个有效选项`);
    }

    if (typeof field.min === 'number' && typeof field.max === 'number' && field.min > field.max) {
      errors.push(`${label} 的最小值不能大于最大值`);
    }
  });

  return { valid: errors.length === 0, errors };
};
```

- [ ] **Step 4: Run template config tests**

Run:

```bash
cd client
npx vitest run src/utils/__tests__/templateConfigValidation.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Wire TemplateDesigner save validation**

In `client/src/views/templates/TemplateDesigner.vue`, add:

```ts
import { validateTemplateFields } from '@/utils/templateConfigValidation';
```

Replace the first guard in `handleSave` with:

```ts
const validation = validateTemplateFields([...formFields]);
if (!validation.valid) {
  ElMessage.warning(validation.errors[0]);
  return;
}
```

- [ ] **Step 6: Run tests and build**

Run:

```bash
cd client
npx vitest run src/utils/__tests__/templateConfigValidation.spec.ts
npm run build
```

Expected: tests pass and build completes successfully.

- [ ] **Step 7: Commit**

```bash
git add client/src/utils/templateConfigValidation.ts client/src/utils/__tests__/templateConfigValidation.spec.ts client/src/views/templates/TemplateDesigner.vue
git commit -m "feat: 表单设计器保存前校验配置"
```

---

## Task 9: Add Mobile Validation Bridge

**Files:**
- Modify: `mobile/src/types/index.ts`
- Create: `mobile/src/utils/formValidation.ts`
- Modify: `mobile/src/utils/validator.ts`
- Test: `mobile/src/utils/__tests__/formValidation.spec.ts`

- [ ] **Step 1: Write failing mobile validation tests**

Create `mobile/src/utils/__tests__/formValidation.spec.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { validateMobileField } from '../formValidation';
import type { FormField } from '@/types';

describe('validateMobileField', () => {
  it('validates table-input rows', () => {
    const field: FormField = {
      name: 'ingredients',
      label: '配料表',
      type: 'table-input',
      required: true,
      rowSchema: [
        { name: 'name', label: '配料名称', type: 'text', required: true },
        { name: 'weight', label: '重量', type: 'text', required: true },
      ],
    };

    expect(validateMobileField(field, [{ name: '', weight: '10kg' }])).toBe('第1行配料名称不能为空');
  });

  it('validates checkbox-text checked state', () => {
    const field: FormField = {
      name: 'allergen',
      label: '引入的食品安全危害（含过敏源）',
      type: 'checkbox-text',
      required: false,
      rules: [{ type: 'checkedTextRequired', message: '勾选后必须填写危害说明' }],
    };

    expect(validateMobileField(field, { checked: true, text: '' })).toBe('勾选后必须填写危害说明');
  });
});
```

- [ ] **Step 2: Run failing mobile tests**

Run:

```bash
cd mobile
npx vitest run src/utils/__tests__/formValidation.spec.ts
```

Expected: FAIL because `formValidation.ts` or extended types do not exist.

- [ ] **Step 3: Extend mobile field types**

In `mobile/src/types/index.ts`, update `FormField.type` union to include:

```ts
        'image' | 'signature' | 'scan' |
        'table-input' | 'constrained-number' | 'checkbox-text' | 'approval-step'
```

Add to `FormField`:

```ts
  columns?: { key: string; label: string; required?: boolean; type?: FormField['type'] }[]
  rowSchema?: FormField[]
  validation?: FormRule[]
  visibility?: { field: string; equals: unknown }
```

Update `FormRule.type` union to include:

```ts
  type: 'required' | 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength' | 'custom' | 'checkedTextRequired'
```

- [ ] **Step 4: Implement mobile validation bridge**

Create `mobile/src/utils/formValidation.ts` with:

```ts
import type { FormField, FormRule } from '@/types';

const isEmpty = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const validateRule = (rule: FormRule, value: unknown, label: string): string | null => {
  if (rule.type === 'checkedTextRequired') {
    const objectValue = value as { checked?: boolean; text?: string };
    if (objectValue?.checked && !objectValue.text?.trim()) return rule.message || `${label}说明不能为空`;
  }
  return null;
};

const validateTable = (field: FormField, value: unknown): string | null => {
  if (!Array.isArray(value)) return field.required ? `${field.label}不能为空` : null;
  if (field.required && value.length === 0) return `${field.label}不能为空`;
  const rowSchema = field.rowSchema || field.columns?.map((col) => ({
    name: col.key,
    label: col.label,
    type: col.type || 'text',
    required: col.required || false,
  } as FormField)) || [];

  for (let rowIndex = 0; rowIndex < value.length; rowIndex++) {
    const row = value[rowIndex] as Record<string, unknown>;
    for (const child of rowSchema) {
      if (child.required && isEmpty(row?.[child.name])) {
        return `第${rowIndex + 1}行${child.label}不能为空`;
      }
    }
  }
  return null;
};

export const validateMobileField = (field: FormField, value: unknown): string | null => {
  if (field.type === 'table-input') return validateTable(field, value);
  if (field.required && isEmpty(value)) return `${field.label}不能为空`;

  if (field.rules) {
    for (const rule of field.rules) {
      const error = validateRule(rule, value, field.label);
      if (error) return error;
    }
  }

  if ((field.type === 'number' || field.type === 'constrained-number') && typeof value === 'number') {
    if (field.min !== undefined && value < field.min) return `${field.label}不能小于${field.min}`;
    if (field.max !== undefined && value > field.max) return `${field.label}不能大于${field.max}`;
  }

  if (field.pattern && typeof value === 'string' && !new RegExp(field.pattern).test(value)) {
    return field.patternMessage || `${field.label}格式不正确`;
  }

  if (field.maxLength && typeof value === 'string' && value.length > field.maxLength) {
    return `${field.label}不能超过${field.maxLength}个字符`;
  }

  return null;
};
```

- [ ] **Step 5: Delegate existing mobile validator**

In `mobile/src/utils/validator.ts`, import:

```ts
import { validateMobileField } from './formValidation'
```

Replace the body of `validateField` with:

```ts
export function validateField(
  field: FormField,
  value: unknown,
): string | null {
  return validateMobileField(field, value)
}
```

Keep `validateForm`, `isEmail`, and `isPhone`.

- [ ] **Step 6: Run mobile validation tests**

Run:

```bash
cd mobile
npx vitest run src/utils/__tests__/formValidation.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Run mobile type check**

Run:

```bash
cd mobile
npm run type-check
```

Expected: type check completes successfully.

- [ ] **Step 8: Commit**

```bash
git add mobile/src/types/index.ts mobile/src/utils/formValidation.ts mobile/src/utils/validator.ts mobile/src/utils/__tests__/formValidation.spec.ts
git commit -m "feat: 移动端接入复杂字段校验"
```

---

## Task 10: Add Mobile Complex Field Rendering

**Files:**
- Modify: `mobile/src/components/FormField.vue`
- Test: `mobile/src/utils/__tests__/formValidation.spec.ts`

- [ ] **Step 1: Add table-input rendering block**

In `mobile/src/components/FormField.vue`, add before the image block:

```vue
    <view v-else-if="field.type === 'table-input'" class="form-field__table">
      <view
        v-for="(row, rowIndex) in ((modelValue as Record<string, unknown>[]) || [])"
        :key="rowIndex"
        class="form-field__table-row"
      >
        <view
          v-for="child in (field.rowSchema || [])"
          :key="child.name"
          class="form-field__table-cell"
        >
          <text class="form-field__table-label">{{ child.label }}</text>
          <input
            class="form-field__input"
            :value="String(row[child.name] || '')"
            :placeholder="child.placeholder || '请输入'"
            @input="onTableInput(rowIndex, child.name, $event)"
          />
        </view>
      </view>
    </view>
```

- [ ] **Step 2: Add checkbox-text rendering block**

Add after checkbox block:

```vue
    <view v-else-if="field.type === 'checkbox-text'" class="form-field__checkbox-text">
      <view class="form-field__checkbox-item" @tap="toggleCheckboxText">
        <view
          class="form-field__checkbox"
          :class="{ 'form-field__checkbox--checked': checkboxTextValue.checked }"
        >
          <text v-if="checkboxTextValue.checked" class="form-field__check-icon">&#x2713;</text>
        </view>
        <text class="form-field__checkbox-label">{{ field.placeholder || '确认' }}</text>
      </view>
      <textarea
        v-if="checkboxTextValue.checked"
        class="form-field__textarea"
        :value="checkboxTextValue.text"
        placeholder="请输入说明"
        @input="onCheckboxTextInput"
      />
    </view>
```

- [ ] **Step 3: Add approval-step fallback rendering block**

Add before the error message:

```vue
    <view v-else-if="field.type === 'approval-step'" class="form-field__approval">
      <text>{{ field.placeholder || '审批节点将在提交后处理' }}</text>
    </view>
```

- [ ] **Step 4: Add computed state and handlers**

In the script section, add:

```ts
const checkboxTextValue = computed(() => {
  const value = props.modelValue as { checked?: boolean; text?: string } | undefined
  return {
    checked: !!value?.checked,
    text: value?.text || '',
  }
})

function onTableInput(
  rowIndex: number,
  key: string,
  event: { detail: { value: string } },
): void {
  const rows = [...((props.modelValue as Record<string, unknown>[]) || [])]
  rows[rowIndex] = { ...(rows[rowIndex] || {}), [key]: event.detail.value }
  updateValue(rows)
}

function toggleCheckboxText(): void {
  updateValue({
    checked: !checkboxTextValue.value.checked,
    text: checkboxTextValue.value.text,
  })
}

function onCheckboxTextInput(event: { detail: { value: string } }): void {
  updateValue({
    checked: checkboxTextValue.value.checked,
    text: event.detail.value,
  })
}
```

- [ ] **Step 5: Add mobile styles**

Add scoped styles:

```css
.form-field__table {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.form-field__table-row {
  padding: 16rpx;
  border: 1rpx solid #e5e7eb;
  border-radius: 8rpx;
}

.form-field__table-cell + .form-field__table-cell {
  margin-top: 12rpx;
}

.form-field__table-label {
  display: block;
  margin-bottom: 8rpx;
  color: #606266;
  font-size: 24rpx;
}

.form-field__checkbox-text {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.form-field__approval {
  color: #606266;
  font-size: 28rpx;
  line-height: 40rpx;
}
```

- [ ] **Step 6: Run mobile tests and type check**

Run:

```bash
cd mobile
npx vitest run src/utils/__tests__/formValidation.spec.ts
npm run type-check
```

Expected: tests pass and type check completes successfully.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/components/FormField.vue
git commit -m "feat: 移动端支持复杂表单字段渲染"
```

---

## Task 11: Add Vault and SaaS Mapping Audit Script

**Files:**
- Create: `server/scripts/audit-vault-saas-form-mapping.ts`
- Test: `server/scripts/__tests__/audit-vault-saas-form-mapping.spec.ts`
- Modify: `server/package.json` only if adding a script alias is necessary.

- [ ] **Step 1: Write script tests with temp fixtures**

Create `server/scripts/__tests__/audit-vault-saas-form-mapping.spec.ts` with:

```ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { auditVaultSaasMapping } from '../audit-vault-saas-form-mapping';

describe('auditVaultSaasMapping', () => {
  it('reports forms missing from SaaS mapping', () => {
    const root = mkdtempSync(join(tmpdir(), 'noidear-audit-'));
    const vault = join(root, 'vault');
    const saas = join(root, 'saas');
    mkdirSync(join(vault, '产品开发部'), { recursive: true });
    mkdirSync(saas, { recursive: true });

    writeFileSync(join(vault, '产品开发部', '新产品开发申请书.md'), '# 新产品开发申请书\n\n编号：GRSS-KF-JL-09\n\n| 字段 | 要求 |\n| --- | --- |\n| 开发产品名称 | 必填 |\n');
    writeFileSync(join(saas, '03-字段映射表-产品开发部.md'), '| 表单 | 编号 | 字段 |\n| --- | --- | --- |\n| 新产品开发计划书 | GRSS-KF-JL-10 | 产品名称 |\n');

    const result = auditVaultSaasMapping(vault, saas);

    expect(result.totalVaultForms).toBe(1);
    expect(result.missingInSaas[0].formName).toBe('新产品开发申请书');
  });
});
```

- [ ] **Step 2: Run failing server test**

Run:

```bash
cd server
npm run test -- scripts/__tests__/audit-vault-saas-form-mapping.spec.ts
```

Expected: FAIL because `audit-vault-saas-form-mapping.ts` does not exist.

- [ ] **Step 3: Implement the audit script**

Create `server/scripts/audit-vault-saas-form-mapping.ts` with:

```ts
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface VaultFormRef {
  department: string;
  formName: string;
  code: string;
  path: string;
}

export interface MappingAuditResult {
  totalVaultForms: number;
  totalSaasMappingFiles: number;
  missingInSaas: VaultFormRef[];
  codeMismatches: Array<VaultFormRef & { mappedCode: string }>;
}

const walkMarkdown = (root: string): string[] => {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return walkMarkdown(path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
};

const extractCode = (content: string): string => {
  const match = content.match(/GRSS-[A-Z]+-JL-\d+/);
  return match?.[0] || '';
};

const parseVaultForms = (vaultRoot: string): VaultFormRef[] => {
  return walkMarkdown(vaultRoot).map((path) => {
    const rel = relative(vaultRoot, path);
    const parts = rel.split('/');
    const fileName = parts[parts.length - 1];
    const content = readFileSync(path, 'utf8');
    return {
      department: parts[0] || '',
      formName: fileName.replace(/\.md$/, ''),
      code: extractCode(content),
      path,
    };
  });
};

const readSaasContent = (saasRoot: string): string => {
  return walkMarkdown(saasRoot)
    .filter((path) => path.includes('03-字段映射表'))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
};

const countSaasMappingFiles = (saasRoot: string): number => {
  return walkMarkdown(saasRoot).filter((path) => path.includes('03-字段映射表')).length;
};

export const auditVaultSaasMapping = (vaultRoot: string, saasRoot: string): MappingAuditResult => {
  const vaultForms = parseVaultForms(vaultRoot);
  const saasContent = readSaasContent(saasRoot);
  const missingInSaas = vaultForms.filter((form) => !saasContent.includes(form.formName));
  const codeMismatches = vaultForms.flatMap((form) => {
    if (!form.code || !saasContent.includes(form.formName)) return [];
    const escapedName = form.formName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rowMatch = saasContent.match(new RegExp(`${escapedName}[^\\n]*?(GRSS-[A-Z]+-JL-\\d+)`));
    const mappedCode = rowMatch?.[1] || '';
    return mappedCode && mappedCode !== form.code ? [{ ...form, mappedCode }] : [];
  });

  return {
    totalVaultForms: vaultForms.length,
    totalSaasMappingFiles: countSaasMappingFiles(saasRoot),
    missingInSaas,
    codeMismatches,
  };
};

if (require.main === module) {
  const vaultRoot = process.argv[2] || '/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单';
  const saasRoot = process.argv[3] || '/Users/jiashenglin/Desktop/mybrain/SaaS产品构思';
  const output = process.argv[4] || 'docs/superpowers/reports/form-validation-audit.md';
  const result = auditVaultSaasMapping(vaultRoot, saasRoot);
  const markdown = [
    '# Form Validation Mapping Audit',
    '',
    `- Vault forms: ${result.totalVaultForms}`,
    `- SaaS mapping files: ${result.totalSaasMappingFiles}`,
    `- Missing in SaaS mapping: ${result.missingInSaas.length}`,
    `- Code mismatches: ${result.codeMismatches.length}`,
    '',
    '## Missing In SaaS Mapping',
    ...result.missingInSaas.map((item) => `- ${item.department} / ${item.formName} / ${item.code || 'NO_CODE'}`),
    '',
    '## Code Mismatches',
    ...result.codeMismatches.map((item) => `- ${item.department} / ${item.formName}: vault=${item.code}, saas=${item.mappedCode}`),
  ].join('\n');
  writeFileSync(output, markdown);
}
```

- [ ] **Step 4: Run script test**

Run:

```bash
cd server
npm run test -- scripts/__tests__/audit-vault-saas-form-mapping.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Run audit against real inputs**

Run from repo root:

```bash
npx ts-node server/scripts/audit-vault-saas-form-mapping.ts \
  "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单" \
  "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思" \
  "docs/superpowers/reports/form-validation-audit.md"
```

Expected: `docs/superpowers/reports/form-validation-audit.md` exists and includes counts for vault forms, mapping files, missing mappings, and code mismatches.

- [ ] **Step 6: Commit**

```bash
git add server/scripts/audit-vault-saas-form-mapping.ts server/scripts/__tests__/audit-vault-saas-form-mapping.spec.ts docs/superpowers/reports/form-validation-audit.md
git commit -m "feat: 新增源表单与字段映射审计脚本"
```

---

## Task 12: Final Verification

**Files:**
- All changed files from previous tasks.

- [ ] **Step 1: Run client unit tests for new validation**

Run:

```bash
cd client
npx vitest run \
  src/utils/formValidation/__tests__/validators.spec.ts \
  src/utils/__tests__/processValidation.spec.ts \
  src/utils/__tests__/templateConfigValidation.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run client build**

Run:

```bash
cd client
npm run build
```

Expected: build completes successfully.

- [ ] **Step 3: Run mobile validation tests and type check**

Run:

```bash
cd mobile
npx vitest run src/utils/__tests__/formValidation.spec.ts
npm run type-check
```

Expected: tests pass and type check completes successfully.

- [ ] **Step 4: Run server audit test**

Run:

```bash
cd server
npm run test -- scripts/__tests__/audit-vault-saas-form-mapping.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Run full repo status check**

Run:

```bash
git status --short
```

Expected: only intentional changed files are present before final commit or handoff.

- [ ] **Step 6: Commit verification notes if reports changed**

```bash
git add docs/superpowers/reports/form-validation-audit.md
git commit -m "docs: 更新表单校验审计报告"
```

Skip this commit only when the report was already committed in Task 11 and did not change.

---

## Self-Review Checklist

- Spec coverage:
  - `Step1` expanded beyond two-field validation: Task 3 and Task 4.
  - `Step2`, `Step4`, `Step5`, `Step6`, `Step7`, `Step8` submit validation: Task 3, Task 4, Task 5.
  - `DynamicForm` validation protocol and complex field errors: Task 1, Task 2, Task 6, Task 7.
  - `TableInputField`, `ConstrainedNumberField`, `CheckboxTextField`: Task 7.
  - Mobile type and validation gaps: Task 9 and Task 10.
  - TemplateDesigner save-time validation: Task 8.
  - `04-记录表单` and `SaaS产品构思` comparison: Task 11.
  - Full verification: Task 12.
- Placeholder scan:
  - No placeholder wording or unspecified validation steps remain.
- Type consistency:
  - Web validation uses `FormValidationField`, `FormValidationError`, `validateFields`, `validateFieldValue`.
  - Process validation returns `FormValidationResult`.
  - Mobile bridge uses `validateMobileField`.
  - TemplateDesigner uses `validateTemplateFields`.
